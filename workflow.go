package main

import (
	"fmt"
	"net/http"
	"strings"
	"sync"
	"sync/atomic"
	"time"
)

var (
	mu     sync.Mutex
	runs   = map[string]*Run{}
	events = map[string]Event{}
	keys   = map[string]string{} // idempotency key -> event id
	seq    int64
	base   string
)

var scenarios = map[string]Scenario{
	"TC1": {
		Expected: "shared schedule",
		Consent:  true,
		Tasks: []Task{
			{"T1", "APT-101", "Arun", "Priya"},
			{"T2", "RX-201", "Priya", "Arun"},
			{"T3", "LAB-301", "Karthik", "Priya"},
		},
	},
	"TC2": {
		Expected: "no medical detail shared",
		Consent:  false,
		Tasks: []Task{
			{"T1", "APT-101", "Arun", "Priya"},
			{"T2", "RX-201", "Priya", "Arun"},
		},
	},
	"TC3": {
		Expected: "owner requested",
		Consent:  true,
		Tasks: []Task{
			{"T1", "APT-101", "Arun", "Priya"},
			{"T2", "RX-201", "", "Arun"},
		},
	},
	"TC4": {
		Expected: "marked pending",
		Consent:  true,
		Tasks: []Task{
			{"T1", "APT-101", "Arun", "Priya"},
			{"T2", "LAB-302", "Karthik", "Priya"},
		},
	},
}

func now() string { return time.Now().UTC().Format(time.RFC3339) }

func nid(p string) string {
	n := atomic.AddInt64(&seq, 1)
	return fmt.Sprintf("%s-%d", p, n)
}

func fetchJSON(url string, out any) error {
	client := &http.Client{Timeout: 5 * time.Second}
	r, err := client.Get(url)
	if err != nil {
		return err
	}
	defer r.Body.Close()
	if r.StatusCode != 200 {
		return fmt.Errorf("HTTP %d", r.StatusCode)
	}
	return jsonDecode(r.Body, out)
}

// Plan executes the Controlled Agentic Sequence:
// Step 1: Collect -> Step 2: Retrieve -> Step 3: Validate -> Step 4: Assign -> Step 5: Consent -> Step 6: Propose
func plan(name string, tasks []Task, consent bool, expected string) *Run {
	run := &Run{
		ID:           nid("RUN"),
		Scenario:     name,
		Expected:     expected,
		Consent:      consent,
		Approval:     "pending",
		Calendar:     "not_created",
		Verification: "not_run",
		CreatedAt:    now(),
	}

	for _, t := range tasks {
		it := Item{Task: t}
		it.Evidence.URL = fmt.Sprintf("%s/portal/lookup/%s", base, t.Ref)
		it.Evidence.RetrievedAt = now()

		var rec Rec
		// Step 2 & 3: Retrieve from mock portal & validate evidence
		if err := fetchJSON(it.Evidence.URL, &rec); err != nil {
			it.Booking, it.Note = "unknown", "portal lookup failed: "+err.Error()
		} else {
			it.Evidence.Record = &rec
			switch rec.Status {
			case "confirmed", "ready":
				it.Booking = "confirmed"
			case "requested":
				it.Booking = "pending"
				it.Note = "Slot requested but not confirmed by portal; marked pending."
			default:
				it.Booking = "unknown"
				it.Note = "Unknown portal status: " + rec.Status
			}
		}

		// Step 4: Assign responsibilities (1 owner + 1 backup)
		switch {
		case t.Owner == "":
			it.Ownership = "owner_requested"
			it.Note = strings.TrimSpace(it.Note + " Owner required: please assign one owner.")
		case t.Backup == "":
			it.Ownership = "backup_requested"
			it.Note = strings.TrimSpace(it.Note + " Backup required: please assign one backup.")
		default:
			it.Ownership = "assigned"
		}

		run.Items = append(run.Items, it)

		// Step 5 & 6: Consent filter & Propose calendar action
		// Actions are proposed ONLY if evidence exists and ownership is fully assigned
		if it.Evidence.Record != nil && it.Ownership == "assigned" {
			a := Action{
				Key:       run.ID + ":" + t.ID,
				TaskID:    t.ID,
				Start:     rec.Date,
				Reminder:  60,
				Owner:     t.Owner,
				Tentative: it.Booking != "confirmed",
			}

			if consent {
				a.Title = rec.Title
				a.Details = fmt.Sprintf("%s %s (%s) - %s", rec.Kind, rec.ID, rec.Status, rec.Location)
			} else {
				// Privacy safeguard: redact clinical details
				a.Title = "Care task (details restricted)"
				a.Details = "Clinical details restricted under patient privacy consent rules."
			}

			if it.Booking == "pending" {
				a.Title += " [PENDING]"
			}

			run.Actions = append(run.Actions, a)
		}
	}

	run.Log = append(run.Log, fmt.Sprintf("%s [Workflow] Care plan %s generated with %d tasks and %d proposed actions; awaiting human approval", now(), run.ID, len(run.Items), len(run.Actions)))

	mu.Lock()
	runs[run.ID] = run
	mu.Unlock()

	// Persist to MySQL database
	if db != nil {
		if err := dbSaveRun(run); err != nil {
			run.Log = append(run.Log, fmt.Sprintf("%s [DB Warning] Failed saving run: %v", now(), err))
		}
	}

	return run
}

// Approve implements Step 7 (Human Approval) and Step 8 (Idempotent Execution)
func approve(run *Run) {
	for _, a := range run.Actions {
		// Idempotency check: prevent duplicate event creation on retries
		mu.Lock()
		id, dup := keys[a.Key]
		mu.Unlock()

		if dup {
			run.Log = append(run.Log, fmt.Sprintf("%s [Execution] Duplicate skipped for %s -> %s", now(), a.Key, id))
			run.EventIDs = append(run.EventIDs, id)
			continue
		}

		evtID := nid("EVT")
		evt := Event{
			ID:        evtID,
			Action:    a,
			CreatedAt: now(),
		}

		mu.Lock()
		events[evtID] = evt
		keys[a.Key] = evtID
		run.EventIDs = append(run.EventIDs, evtID)
		mu.Unlock()

		if db != nil {
			dbSaveCalendarEvent(evt, a.Key)
		}

		run.Log = append(run.Log, fmt.Sprintf("%s [Execution] Calendar event created %s (%s)", now(), evtID, a.Title))
	}

	run.Approval = "approved"
	run.Calendar = "created"

	if db != nil {
		dbSaveRun(run)
	}
}

// VerifyIndependent implements Step 9: Independent Verification
// It retrieves the resulting calendar event over an isolated HTTP read path and validates field-by-field
func verifyIndependent(run *Run) {
	mu.Lock()
	acts := append([]Action(nil), run.Actions...)
	idMap := map[string]string{}
	for _, a := range acts {
		idMap[a.Key] = keys[a.Key]
	}
	mu.Unlock()

	ok := true
	var notes []string

	for _, a := range acts {
		evtID := idMap[a.Key]
		var ev Event
		targetURL := fmt.Sprintf("%s/calendar/events/%s", base, evtID)
		if err := fetchJSON(targetURL, &ev); err != nil {
			ok = false
			notes = append(notes, fmt.Sprintf("%s [Verification Error] HTTP fetch failed for %s (%s): %v", now(), a.Key, targetURL, err))
		} else if ev.Title != a.Title || ev.Tentative != a.Tentative || ev.Details != a.Details {
			ok = false
			notes = append(notes, fmt.Sprintf("%s [Verification Mismatch] Data drift detected for %s (Expected Title: %s, Got: %s)", now(), a.Key, a.Title, ev.Title))
		} else {
			notes = append(notes, fmt.Sprintf("%s [Verification Passed] Independent HTTP read verified %s (%s) matches approved proposal", now(), evtID, ev.Title))
		}
	}

	run.Verification = map[bool]string{true: "verified", false: "failed"}[ok]
	run.Log = append(run.Log, notes...)
	run.Log = append(run.Log, fmt.Sprintf("%s [Verification Result] Status: %s", now(), run.Verification))

	if db != nil {
		dbSaveRun(run)
	}
}

// Evaluate performs automated test case evaluation against official rubrics
func evaluate(r *Run) {
	var actual string
	pass := false

	switch r.Scenario {
	case "TC1":
		all := len(r.Actions) == len(r.Items)
		for _, i := range r.Items {
			all = all && i.Booking == "confirmed" && i.Ownership == "assigned"
		}
		pass = all
		actual = fmt.Sprintf("%d/%d tasks confirmed+owned; %d events proposed", len(r.Actions), len(r.Items), len(r.Actions))

	case "TC2":
		leak := false
		for _, a := range r.Actions {
			for _, it := range r.Items {
				if (a.Details != "" && !strings.Contains(a.Details, "restricted")) ||
					(it.Evidence.Record != nil && strings.Contains(a.Title, it.Evidence.Record.Title)) {
					leak = true
				}
			}
		}
		pass = !leak && len(r.Actions) > 0 && !r.Consent
		actual = fmt.Sprintf("consent=false; medical detail leaked=%v; titles redacted", leak)

	case "TC3":
		req := false
		for _, i := range r.Items {
			if i.Task.Owner == "" && i.Ownership == "owner_requested" {
				req = true
			}
		}
		pass = req && len(r.Actions) == len(r.Items)-1
		actual = fmt.Sprintf("owner requested=%v; events only for assigned tasks (%d)", req, len(r.Actions))

	case "TC4":
		p := false
		for _, i := range r.Items {
			if i.Booking == "pending" {
				p = true
			}
		}
		for _, a := range r.Actions {
			if strings.Contains(a.Title, "[PENDING]") && !a.Tentative {
				p = false
			}
		}
		pass = p
		actual = fmt.Sprintf("lab booking pending=%v; calendar entry tentative and labelled", p)

	default:
		actual = fmt.Sprintf("%d items planned; approval=%s; calendar=%s", len(r.Items), r.Approval, r.Calendar)
		p := r.Approval == "approved" && r.Verification == "verified"
		pass = p
	}

	if r.Calendar == "created" && r.Verification != "verified" {
		pass = false
		actual += "; calendar verification not passed"
	}

	r.Actual = actual
	r.Pass = &pass

	if db != nil {
		dbSaveRun(r)
	}
}
