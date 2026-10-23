package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"time"
)

func jsonDecode(r io.Reader, v any) error {
	return json.NewDecoder(r).Decode(v)
}

func js(w http.ResponseWriter, v any, code int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(v)
}

func loadEnv() {
	b, err := os.ReadFile(".env")
	if err != nil {
		return
	}
	for _, l := range strings.Split(string(b), "\n") {
		l = strings.TrimSpace(l)
		if l == "" || strings.HasPrefix(l, "#") {
			continue
		}
		if k, v, ok := strings.Cut(l, "="); ok && os.Getenv(k) == "" {
			os.Setenv(k, strings.Trim(v, `"'`))
		}
	}
}

var idRe = regexp.MustCompile(`(?i)\b(APT|RX|LAB)-\d+\b`)

// Natural language -> structured tasks
// Uses Gemini 2.0 Flash if GEMINI_API_KEY is configured; otherwise uses intelligent NLP entity matching.
func parseNL(text string) []Task {
	var tasks []Task

	if key := os.Getenv("GEMINI_API_KEY"); key != "" {
		model := os.Getenv("GEMINI_MODEL")
		if model == "" {
			model = "gemini-2.0-flash"
		}
		prompt := fmt.Sprintf(`You are CareSync AI's clinical coordination extractor.
Extract care tasks from the request as a JSON array of objects with keys "ref", "owner", "backup".
Rules:
1. "ref" MUST ONLY be one of: "APT-101", "RX-201", "LAB-301", "LAB-302" based on what the user mentions:
   - APT-101: Cardiology appointment / doctor visit / Monday appointment
   - RX-201: Metformin / medication refill / pharmacy
   - LAB-301: Fasting blood test / HbA1c
   - LAB-302: Lipid profile / lab test before appointment
2. "owner" is the person responsible (e.g. Arun, Priya, Karthik). Leave empty "" if not explicitly stated.
3. "backup" is the secondary person. Leave empty "" if not explicitly stated.
4. Return ONLY the valid JSON array without markdown formatting.

Request: %s`, text)

		body, _ := json.Marshal(map[string]any{
			"contents": []any{
				map[string]any{"parts": []any{map[string]string{"text": prompt}}},
			},
			"generationConfig": map[string]string{
				"responseMimeType": "application/json",
			},
		})

		url := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s", model, key)
		client := &http.Client{Timeout: 10 * time.Second}
		resp, err := client.Post(url, "application/json", bytes.NewReader(body))
		if err == nil {
			defer resp.Body.Close()
			var out struct {
				Candidates []struct {
					Content struct {
						Parts []struct {
							Text string `json:"text"`
						} `json:"parts"`
					} `json:"content"`
				} `json:"candidates"`
			}
			if jsonDecode(resp.Body, &out) == nil && len(out.Candidates) > 0 && len(out.Candidates[0].Content.Parts) > 0 {
				json.Unmarshal([]byte(out.Candidates[0].Content.Parts[0].Text), &tasks)
			}
		}
	}

	// Resilient Fallback: rule-based entity extractor
	if len(tasks) == 0 {
		lower := strings.ToLower(text)
		refs := idRe.FindAllString(text, -1)

		// Contextual keyword inferencing if explicit ID not typed
		if len(refs) == 0 {
			if strings.Contains(lower, "appointment") || strings.Contains(lower, "doctor") || strings.Contains(lower, "cardiolog") {
				refs = append(refs, "APT-101")
			}
			if strings.Contains(lower, "lab") || strings.Contains(lower, "blood") || strings.Contains(lower, "lipid") {
				refs = append(refs, "LAB-302")
			}
			if strings.Contains(lower, "refill") || strings.Contains(lower, "pharmacy") || strings.Contains(lower, "medication") || strings.Contains(lower, "metformin") {
				refs = append(refs, "RX-201")
			}
		}

		// Extract names mentioned
		extractPerson := func(rolePattern string) string {
			for _, name := range []string{"Arun", "Priya", "Karthik"} {
				if strings.Contains(lower, strings.ToLower(name)) {
					return name
				}
			}
			return ""
		}

		defaultOwner := extractPerson("owner")
		defaultBackup := "Priya"
		if defaultOwner == "Priya" {
			defaultBackup = "Arun"
		}

		seen := map[string]bool{}
		for _, r := range refs {
			u := strings.ToUpper(r)
			if seen[u] {
				continue
			}
			seen[u] = true

			owner := ""
			backup := ""
			// Contextual assignment extraction
			if strings.Contains(lower, "arun") && (strings.Contains(lower, "collect") || strings.Contains(lower, "refill")) && u == "RX-201" {
				owner = "Arun"
				backup = "Priya"
			} else if strings.Contains(lower, "priya") && strings.Contains(lower, "schedule") {
				owner = "Arun"
				backup = "Priya"
			} else {
				owner = defaultOwner
				backup = defaultBackup
			}

			tasks = append(tasks, Task{
				Ref:    u,
				Owner:  owner,
				Backup: backup,
			})
		}
	}

	// Strict Backend Validation: Filter against active portal records
	var valid []Task
	for i, t := range tasks {
		t.Ref = strings.ToUpper(t.Ref)
		var exists bool
		if db != nil {
			rec, _ := dbGetPortalRecord(t.Ref)
			exists = rec != nil
		} else {
			// In-memory fallback
			exists = (t.Ref == "APT-101" || t.Ref == "RX-201" || t.Ref == "LAB-301" || t.Ref == "LAB-302")
		}
		if exists {
			t.ID = fmt.Sprintf("T%d", i+1)
			valid = append(valid, t)
		}
	}

	return valid
}

func main() {
	loadEnv()
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	base = "http://127.0.0.1:" + port

	// Initialize MySQL Connection
	dsn := os.Getenv("MYSQL_DSN")
	if dsn == "" {
		dsn = "caresync_user:caresync_password@tcp(127.0.0.1:3306)/caresync?parseTime=true"
	}
	if err := initDB(dsn); err != nil {
		log.Fatalf("Fatal: Database initialization failed: %v", err)
	}

	mux := http.NewServeMux()

	// 1. Mock Portal Lookups
	mux.HandleFunc("GET /portal/lookup/{id}", func(w http.ResponseWriter, r *http.Request) {
		id := r.PathValue("id")
		rec, err := dbGetPortalRecord(id)
		if err != nil {
			js(w, map[string]string{"error": err.Error()}, 500)
			return
		}
		if rec != nil {
			js(w, rec, 200)
			return
		}
		js(w, map[string]string{"error": "record not found in mock portal"}, 404)
	})

	// 2. HTML Scrapeable Mock Portals (for Browserbase cloud agents)
	mux.HandleFunc("GET /portal/{kind}", func(w http.ResponseWriter, r *http.Request) {
		kind := r.PathValue("kind")
		records, err := dbGetPortals()
		if err != nil {
			http.Error(w, err.Error(), 500)
			return
		}
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		fmt.Fprintf(w, "<!doctype html><html><head><title>Mock %s Portal</title>", kind)
		fmt.Fprint(w, "<style>body{font-family:sans-serif;padding:24px;} table{border-collapse:collapse;width:100%;} th,td{border:1px solid #ccc;padding:8px 12px;text-align:left;}</style></head><body>")
		fmt.Fprintf(w, "<h1>CareSync Mock %s Portal</h1>", strings.Title(kind))
		fmt.Fprint(w, "<table id='records-table'><thead><tr><th>ID</th><th>Title</th><th>Status</th><th>Date</th><th>Provider / Location</th></tr></thead><tbody>")
		for _, p := range records {
			if p.Kind == kind {
				fmt.Fprintf(w, `<tr data-id="%s"><td class="id">%s</td><td class="title">%s</td><td class="status">%s</td><td class="date">%s</td><td>%s (%s)</td></tr>`,
					p.ID, p.ID, p.Title, p.Status, p.Date, p.ProviderName, p.Location)
			}
		}
		fmt.Fprint(w, "</tbody></table></body></html>")
	})

	// 3. Portals REST API (For Screen 5: Mock Healthcare Portals)
	mux.HandleFunc("GET /api/portals", func(w http.ResponseWriter, r *http.Request) {
		records, err := dbGetPortals()
		if err != nil {
			js(w, map[string]string{"error": err.Error()}, 500)
			return
		}
		js(w, records, 200)
	})

	mux.HandleFunc("POST /api/portals/{id}/status", func(w http.ResponseWriter, r *http.Request) {
		id := r.PathValue("id")
		var in struct {
			Status string `json:"status"`
		}
		if err := jsonDecode(r.Body, &in); err != nil {
			js(w, map[string]string{"error": "invalid payload"}, 400)
			return
		}
		if err := dbUpdatePortalStatus(id, in.Status); err != nil {
			js(w, map[string]string{"error": err.Error()}, 500)
			return
		}
		rec, _ := dbGetPortalRecord(id)
		js(w, rec, 200)
	})

	// 4. Family & Consent API
	mux.HandleFunc("GET /api/family", func(w http.ResponseWriter, r *http.Request) {
		members, err := dbGetFamilyMembers()
		if err != nil {
			js(w, map[string]string{"error": err.Error()}, 500)
			return
		}
		js(w, members, 200)
	})

	mux.HandleFunc("POST /api/family/consent", func(w http.ResponseWriter, r *http.Request) {
		var in struct {
			MemberName            string `json:"memberName"`
			ConsentMedicalDetails bool   `json:"consentMedicalDetails"`
			ConsentScheduling     bool   `json:"consentScheduling"`
		}
		if err := jsonDecode(r.Body, &in); err != nil {
			js(w, map[string]string{"error": "invalid body"}, 400)
			return
		}
		if err := dbUpdateConsent(in.MemberName, in.ConsentMedicalDetails, in.ConsentScheduling); err != nil {
			js(w, map[string]string{"error": err.Error()}, 500)
			return
		}
		members, _ := dbGetFamilyMembers()
		js(w, members, 200)
	})

	// 5. Dashboard Summary API (For Screen 1)
	mux.HandleFunc("GET /api/dashboard/stats", func(w http.ResponseWriter, r *http.Request) {
		stats, err := dbGetDashboardStats()
		if err != nil {
			js(w, map[string]string{"error": err.Error()}, 500)
			return
		}
		js(w, stats, 200)
	})

	// 6. Calendar API
	mux.HandleFunc("GET /calendar/events/{id}", func(w http.ResponseWriter, r *http.Request) {
		id := r.PathValue("id")
		evt, err := dbGetCalendarEventByID(id)
		if err != nil {
			js(w, map[string]string{"error": err.Error()}, 500)
			return
		}
		if evt != nil {
			js(w, evt, 200)
			return
		}
		// Fallback check in memory
		mu.Lock()
		e, ok := events[id]
		mu.Unlock()
		if ok {
			js(w, e, 200)
			return
		}
		js(w, map[string]string{"error": "calendar event not found"}, 404)
	})

	mux.HandleFunc("GET /api/calendar", func(w http.ResponseWriter, r *http.Request) {
		evts, err := dbGetCalendarEvents()
		if err != nil {
			js(w, map[string]string{"error": err.Error()}, 500)
			return
		}
		js(w, evts, 200)
	})

	// 7. Workflow Run API
	mux.HandleFunc("POST /api/run", func(w http.ResponseWriter, r *http.Request) {
		var in struct {
			Scenario string `json:"scenario"`
			Text     string `json:"text"`
			Consent  *bool  `json:"consent"`
		}
		jsonDecode(r.Body, &in)

		if sc, ok := scenarios[in.Scenario]; ok {
			c := sc.Consent
			if in.Consent != nil {
				c = *in.Consent
			}
			run := plan(in.Scenario, sc.Tasks, c, sc.Expected)
			js(w, run, 200)
			return
		}

		tasks := parseNL(in.Text)
		if len(tasks) == 0 {
			js(w, map[string]string{"error": "No verified mock portal appointments or labs found in request."}, 400)
			return
		}
		c := true
		if in.Consent != nil {
			c = *in.Consent
		}
		run := plan("CUSTOM", tasks, c, "Custom care plan coordinated")
		js(w, run, 200)
	})

	mux.HandleFunc("GET /api/runs", func(w http.ResponseWriter, r *http.Request) {
		mu.Lock()
		defer mu.Unlock()
		out := []*Run{}
		for _, r := range runs {
			out = append(out, r)
		}
		js(w, out, 200)
	})

	mux.HandleFunc("GET /api/runs/{id}", func(w http.ResponseWriter, r *http.Request) {
		id := r.PathValue("id")
		mu.Lock()
		run, ok := runs[id]
		mu.Unlock()
		if !ok {
			js(w, map[string]string{"error": "run not found"}, 404)
			return
		}
		evaluate(run)
		js(w, run, 200)
	})

	mux.HandleFunc("POST /api/runs/{id}/reject", func(w http.ResponseWriter, r *http.Request) {
		id := r.PathValue("id")
		mu.Lock()
		run, ok := runs[id]
		mu.Unlock()

		if !ok {
			js(w, map[string]string{"error": "run not found"}, 404)
			return
		}
		run.Approval = "rejected"
		run.Log = append(run.Log, fmt.Sprintf("%s [Approval Center] Proposal rejected by caregiver authorization", now()))
		evaluate(run)
		if db != nil {
			dbSaveRun(run)
		}
		js(w, run, 200)
	})

	mux.HandleFunc("POST /api/runs/{id}/approve", func(w http.ResponseWriter, r *http.Request) {
		id := r.PathValue("id")
		mu.Lock()
		run, ok := runs[id]
		mu.Unlock()

		if !ok || run.Approval == "rejected" {
			js(w, map[string]string{"error": "run missing or already rejected"}, 400)
			return
		}
		approve(run)
		verifyIndependent(run)
		evaluate(run)
		js(w, run, 200)
	})

	// 8. Browserbase Cloud Browser Integration
	mux.HandleFunc("POST /api/browserbase/session", func(w http.ResponseWriter, r *http.Request) {
		apiKey := os.Getenv("BROWSERBASE_API_KEY")
		projectID := os.Getenv("BROWSERBASE_PROJECT_ID")

		if apiKey == "" || projectID == "" {
			js(w, map[string]string{"error": "Browserbase credentials not configured in environment"}, 400)
			return
		}

		body, _ := json.Marshal(map[string]string{"projectId": projectID})
		req, _ := http.NewRequest("POST", "https://api.browserbase.com/v1/sessions", bytes.NewReader(body))
		req.Header.Set("X-BB-API-Key", apiKey)
		req.Header.Set("Content-Type", "application/json")

		client := &http.Client{Timeout: 15 * time.Second}
		resp, err := client.Do(req)
		if err != nil {
			js(w, map[string]string{"error": err.Error()}, 502)
			return
		}
		defer resp.Body.Close()

		b, _ := io.ReadAll(resp.Body)
		var s map[string]any
		json.Unmarshal(b, &s)

		out := map[string]any{
			"httpStatus": resp.StatusCode,
			"id":         s["id"],
			"status":     s["status"],
		}
		if id, ok := s["id"].(string); ok {
			out["replayUrl"] = "https://www.browserbase.com/sessions/" + id
		} else {
			out["raw"] = string(b)
		}
		js(w, out, 200)
	})

	// 9. Static Web Application (React App / SPA Fallback)
	staticDir := "frontend/dist"
	if _, err := os.Stat(staticDir); os.IsNotExist(err) {
		staticDir = "web"
	}

	fileServer := http.FileServer(http.Dir(staticDir))
	mux.HandleFunc("GET /", func(w http.ResponseWriter, r *http.Request) {
		path := filepath.Join(staticDir, r.URL.Path)
		if _, err := os.Stat(path); os.IsNotExist(err) {
			// SPA fallback to index.html
			http.ServeFile(w, r, filepath.Join(staticDir, "index.html"))
			return
		}
		fileServer.ServeHTTP(w, r)
	})

	log.Printf("==================================================")
	log.Printf("CareSync AI Server running on http://localhost:%s", port)
	log.Printf("Static frontend served from: ./%s", staticDir)
	log.Printf("==================================================")
	log.Fatal(http.ListenAndServe(":"+port, mux))
}
