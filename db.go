package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"strings"
	"time"

	_ "github.com/go-sql-driver/mysql"
)

var db *sql.DB

func initDB(dsn string) error {
	var err error
	log.Printf("Connecting to MySQL at %s ...", maskDSN(dsn))

	// Retry connection for up to 60 seconds to allow MySQL container initialization
	for i := 1; i <= 30; i++ {
		db, err = sql.Open("mysql", dsn)
		if err == nil {
			err = db.Ping()
			if err == nil {
				log.Printf("Connected successfully to MySQL on attempt %d", i)
				break
			}
		}
		log.Printf("MySQL not ready yet (attempt %d/30): %v. Retrying in 2s...", i, err)
		time.Sleep(2 * time.Second)
	}

	if err != nil {
		return fmt.Errorf("could not connect to MySQL after retries: %w", err)
	}

	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(10)
	db.SetConnMaxLifetime(5 * time.Minute)

	if err := runMigrations(); err != nil {
		return fmt.Errorf("failed running database migrations: %w", err)
	}

	return nil
}

func maskDSN(dsn string) string {
	if at := strings.Index(dsn, "@"); at != -1 {
		return "mysql://..." + dsn[at:]
	}
	return dsn
}

func runMigrations() error {
	schema := `
	CREATE TABLE IF NOT EXISTS family_members (
		id VARCHAR(64) PRIMARY KEY,
		name VARCHAR(128) NOT NULL,
		role VARCHAR(64) NOT NULL,
		email VARCHAR(128),
		phone VARCHAR(64),
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS sharing_permissions (
		id INT AUTO_INCREMENT PRIMARY KEY,
		member_name VARCHAR(128) NOT NULL UNIQUE,
		consent_medical_details BOOLEAN NOT NULL DEFAULT FALSE,
		consent_scheduling BOOLEAN NOT NULL DEFAULT TRUE,
		notes VARCHAR(255),
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS portal_records (
		id VARCHAR(64) PRIMARY KEY,
		kind VARCHAR(32) NOT NULL,
		title VARCHAR(255) NOT NULL,
		status VARCHAR(32) NOT NULL,
		scheduled_date VARCHAR(64) NOT NULL,
		provider_name VARCHAR(128),
		location VARCHAR(255)
	);

	CREATE TABLE IF NOT EXISTS care_tasks (
		id VARCHAR(64) PRIMARY KEY,
		run_id VARCHAR(64) NOT NULL,
		task_ref VARCHAR(64) NOT NULL,
		owner VARCHAR(128) DEFAULT '',
		backup VARCHAR(128) DEFAULT '',
		booking_status VARCHAR(32) NOT NULL DEFAULT 'unknown',
		ownership_status VARCHAR(32) NOT NULL DEFAULT 'owner_requested',
		note TEXT,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS source_evidence (
		id VARCHAR(64) PRIMARY KEY,
		run_id VARCHAR(64) NOT NULL,
		task_ref VARCHAR(64) NOT NULL,
		source_url VARCHAR(255) NOT NULL,
		retrieved_at VARCHAR(64) NOT NULL,
		booking_status VARCHAR(32) NOT NULL,
		payload_json TEXT,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS approval_requests (
		id VARCHAR(64) PRIMARY KEY,
		scenario VARCHAR(64) NOT NULL,
		recipient_consented BOOLEAN NOT NULL DEFAULT TRUE,
		expected_outcome VARCHAR(255),
		actual_outcome TEXT,
		approval_status VARCHAR(32) NOT NULL DEFAULT 'pending',
		calendar_status VARCHAR(32) NOT NULL DEFAULT 'not_created',
		verification_status VARCHAR(32) NOT NULL DEFAULT 'not_run',
		pass_status BOOLEAN NULL,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		decided_at DATETIME NULL
	);

	CREATE TABLE IF NOT EXISTS calendar_events (
		id VARCHAR(64) PRIMARY KEY,
		idempotency_key VARCHAR(128) UNIQUE NOT NULL,
		run_id VARCHAR(64) NOT NULL,
		task_id VARCHAR(64) NOT NULL,
		title VARCHAR(255) NOT NULL,
		details TEXT,
		start_time VARCHAR(64) NOT NULL,
		is_tentative BOOLEAN NOT NULL DEFAULT FALSE,
		reminder_minutes INT NOT NULL DEFAULT 60,
		owner VARCHAR(128) NOT NULL,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS action_logs (
		id INT AUTO_INCREMENT PRIMARY KEY,
		run_id VARCHAR(64) NOT NULL,
		log_time VARCHAR(64) NOT NULL,
		message TEXT NOT NULL,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);
	`
	queries := strings.Split(schema, ";")
	for _, q := range queries {
		q = strings.TrimSpace(q)
		if q == "" {
			continue
		}
		if _, err := db.Exec(q); err != nil {
			return fmt.Errorf("migration query error: %v (query: %s)", err, q)
		}
	}

	// Seed portal records if empty
	var count int
	db.QueryRow("SELECT COUNT(*) FROM portal_records").Scan(&count)
	if count == 0 {
		seeds := []Rec{
			{"APT-101", "hospital", "Cardiology follow-up, Dr. Rao", "confirmed", "2026-10-26 10:00", "Metro Heart Institute", "Suite 400, Clinic Tower"},
			{"RX-201", "pharmacy", "Metformin 500mg refill", "ready", "2026-10-25 17:00", "Walgreens Care Pharmacy", "Main St. Branch Drive-thru"},
			{"LAB-301", "lab", "HbA1c fasting blood test", "confirmed", "2026-10-24 08:00", "Quest Diagnostics Central", "Lab Room B"},
			{"LAB-302", "lab", "Lipid profile", "requested", "2026-10-27 09:00", "Quest Diagnostics Central", "Lab Room A"},
		}
		for _, s := range seeds {
			db.Exec("INSERT IGNORE INTO portal_records (id, kind, title, status, scheduled_date, provider_name, location) VALUES (?, ?, ?, ?, ?, ?, ?)",
				s.ID, s.Kind, s.Title, s.Status, s.Date, s.ProviderName, s.Location)
		}
	}

	// Seed family members if empty
	db.QueryRow("SELECT COUNT(*) FROM family_members").Scan(&count)
	if count == 0 {
		members := []struct {
			id, name, role, email, phone string
		}{
			{"FM-1", "Arun", "Primary Caregiver", "arun@example.com", "+1-555-0101"},
			{"FM-2", "Priya", "Backup Caregiver & Sibling", "priya@example.com", "+1-555-0102"},
			{"FM-3", "Karthik", "Sibling", "karthik@example.com", "+1-555-0103"},
			{"FM-4", "Ramesh (Father)", "Elderly Care Recipient", "ramesh@example.com", "+1-555-0100"},
		}
		for _, m := range members {
			db.Exec("INSERT IGNORE INTO family_members (id, name, role, email, phone) VALUES (?, ?, ?, ?, ?)", m.id, m.name, m.role, m.email, m.phone)
		}
	}

	// Seed permissions if empty
	db.QueryRow("SELECT COUNT(*) FROM sharing_permissions").Scan(&count)
	if count == 0 {
		perms := []struct {
			name    string
			med     bool
			sched   bool
			notes   string
		}{
			{"Arun", true, true, "Authorized primary caregiver full clinical access"},
			{"Priya", true, true, "Authorized healthcare proxy and backup"},
			{"Karthik", false, true, "General schedule access only; medical details restricted"},
		}
		for _, p := range perms {
			db.Exec("INSERT IGNORE INTO sharing_permissions (member_name, consent_medical_details, consent_scheduling, notes) VALUES (?, ?, ?, ?)",
				p.name, p.med, p.sched, p.notes)
		}
	}

	return nil
}

// ---------------- Database Queries ----------------

func dbGetPortals() ([]Rec, error) {
	rows, err := db.Query("SELECT id, kind, title, status, scheduled_date, COALESCE(provider_name,''), COALESCE(location,'') FROM portal_records ORDER BY id ASC")
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Rec
	for rows.Next() {
		var r Rec
		if err := rows.Scan(&r.ID, &r.Kind, &r.Title, &r.Status, &r.Date, &r.ProviderName, &r.Location); err != nil {
			return nil, err
		}
		out = append(out, r)
	}
	return out, nil
}

func dbGetPortalRecord(id string) (*Rec, error) {
	var r Rec
	err := db.QueryRow("SELECT id, kind, title, status, scheduled_date, COALESCE(provider_name,''), COALESCE(location,'') FROM portal_records WHERE id = ?", id).
		Scan(&r.ID, &r.Kind, &r.Title, &r.Status, &r.Date, &r.ProviderName, &r.Location)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return &r, nil
}

func dbUpdatePortalStatus(id, status string) error {
	_, err := db.Exec("UPDATE portal_records SET status = ? WHERE id = ?", status, id)
	return err
}

func dbGetFamilyMembers() ([]FamilyMember, error) {
	rows, err := db.Query(`
		SELECT fm.id, fm.name, fm.role, COALESCE(fm.email,''), COALESCE(fm.phone,''),
		       COALESCE(sp.consent_medical_details, FALSE), COALESCE(sp.consent_scheduling, TRUE), COALESCE(sp.notes,'')
		FROM family_members fm
		LEFT JOIN sharing_permissions sp ON fm.name = sp.member_name
		ORDER BY fm.id ASC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []FamilyMember
	for rows.Next() {
		var m FamilyMember
		if err := rows.Scan(&m.ID, &m.Name, &m.Role, &m.Email, &m.Phone, &m.ConsentMedicalDetails, &m.ConsentScheduling, &m.Notes); err != nil {
			return nil, err
		}
		list = append(list, m)
	}
	return list, nil
}

func dbUpdateConsent(name string, medicalDetails, scheduling bool) error {
	_, err := db.Exec(`
		INSERT INTO sharing_permissions (member_name, consent_medical_details, consent_scheduling)
		VALUES (?, ?, ?)
		ON DUPLICATE KEY UPDATE
		consent_medical_details = VALUES(consent_medical_details),
		consent_scheduling = VALUES(consent_scheduling)
	`, name, medicalDetails, scheduling)
	return err
}

func dbSaveRun(run *Run) error {
	_, err := db.Exec(`
		INSERT INTO approval_requests (id, scenario, recipient_consented, expected_outcome, actual_outcome, approval_status, calendar_status, verification_status, pass_status)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON DUPLICATE KEY UPDATE
		actual_outcome = VALUES(actual_outcome),
		approval_status = VALUES(approval_status),
		calendar_status = VALUES(calendar_status),
		verification_status = VALUES(verification_status),
		pass_status = VALUES(pass_status),
		decided_at = IF(VALUES(approval_status) != 'pending', NOW(), decided_at)
	`, run.ID, run.Scenario, run.Consent, run.Expected, run.Actual, run.Approval, run.Calendar, run.Verification, run.Pass)
	if err != nil {
		return err
	}

	for _, it := range run.Items {
		db.Exec(`
			INSERT INTO care_tasks (id, run_id, task_ref, owner, backup, booking_status, ownership_status, note)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?)
			ON DUPLICATE KEY UPDATE
			owner = VALUES(owner), backup = VALUES(backup),
			booking_status = VALUES(booking_status), ownership_status = VALUES(ownership_status),
			note = VALUES(note)
		`, it.Task.ID, run.ID, it.Task.Ref, it.Task.Owner, it.Task.Backup, it.Booking, it.Ownership, it.Note)

		if it.Evidence.Record != nil {
			recJSON, _ := json.Marshal(it.Evidence.Record)
			db.Exec(`
				INSERT INTO source_evidence (id, run_id, task_ref, source_url, retrieved_at, booking_status, payload_json)
				VALUES (?, ?, ?, ?, ?, ?, ?)
				ON DUPLICATE KEY UPDATE
				source_url = VALUES(source_url), retrieved_at = VALUES(retrieved_at),
				booking_status = VALUES(booking_status), payload_json = VALUES(payload_json)
			`, fmt.Sprintf("%s-%s", run.ID, it.Task.Ref), run.ID, it.Task.Ref, it.Evidence.URL, it.Evidence.RetrievedAt, it.Booking, string(recJSON))
		}
	}

	for _, logMsg := range run.Log {
		db.Exec("INSERT INTO action_logs (run_id, log_time, message) VALUES (?, NOW(), ?)", run.ID, logMsg)
	}

	return nil
}

func dbSaveCalendarEvent(evt Event, idempotencyKey string) (bool, error) {
	res, err := db.Exec(`
		INSERT IGNORE INTO calendar_events (id, idempotency_key, run_id, task_id, title, details, start_time, is_tentative, reminder_minutes, owner)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, evt.ID, idempotencyKey, evt.Key, evt.TaskID, evt.Title, evt.Details, evt.Start, evt.Tentative, evt.Reminder, evt.Owner)
	if err != nil {
		return false, err
	}
	affected, _ := res.RowsAffected()
	return affected > 0, nil
}

func dbGetCalendarEvents() ([]Event, error) {
	rows, err := db.Query("SELECT id, idempotency_key, task_id, title, COALESCE(details,''), start_time, is_tentative, reminder_minutes, owner, created_at FROM calendar_events ORDER BY start_time ASC")
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Event
	for rows.Next() {
		var e Event
		var created time.Time
		if err := rows.Scan(&e.ID, &e.Key, &e.TaskID, &e.Title, &e.Details, &e.Start, &e.Tentative, &e.Reminder, &e.Owner, &created); err != nil {
			return nil, err
		}
		e.CreatedAt = created.Format(time.RFC3339)
		out = append(out, e)
	}
	return out, nil
}

func dbGetCalendarEventByID(id string) (*Event, error) {
	var e Event
	var created time.Time
	err := db.QueryRow("SELECT id, idempotency_key, task_id, title, COALESCE(details,''), start_time, is_tentative, reminder_minutes, owner, created_at FROM calendar_events WHERE id = ?", id).
		Scan(&e.ID, &e.Key, &e.TaskID, &e.Title, &e.Details, &e.Start, &e.Tentative, &e.Reminder, &e.Owner, &created)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	e.CreatedAt = created.Format(time.RFC3339)
	return &e, nil
}

func dbGetDashboardStats() (*DashboardStats, error) {
	stats := &DashboardStats{}
	db.QueryRow("SELECT COUNT(*) FROM portal_records WHERE kind = 'hospital'").Scan(&stats.UpcomingAppointments)
	db.QueryRow("SELECT COUNT(*) FROM portal_records WHERE kind = 'lab' AND status = 'requested'").Scan(&stats.PendingLabBookings)
	db.QueryRow("SELECT COUNT(*) FROM portal_records WHERE kind = 'pharmacy' AND status = 'ready'").Scan(&stats.RefillsReady)
	db.QueryRow("SELECT COUNT(*) FROM care_tasks WHERE ownership_status IN ('owner_requested', 'backup_requested')").Scan(&stats.TasksNeedingOwners)
	db.QueryRow("SELECT COUNT(*) FROM approval_requests WHERE approval_status = 'pending'").Scan(&stats.ActionsPendingReview)
	db.QueryRow("SELECT COUNT(*) FROM calendar_events").Scan(&stats.TotalEvents)
	return stats, nil
}
