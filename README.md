# CareSync AI — Caregiver Task Coordinator

> **Industry:** Healthcare & Wellness AI  
> **Core Innovation:** Evidence-backed agentic care coordination with strict status separation, consent enforcement, human approvals, and independent verification over HTTP.

---

## 1. System Overview

Siblings coordinating an elderly parent’s health face recurring challenges:
* Hospital appointments and follow-up schedules.
* Medication refills across pharmacies.
* Laboratory test bookings and fasting requirements.
* Strict task ownership and secondary backup allocations.
* Privacy-preserving medical detail sharing.

**CareSync AI** automates this through a controlled, 9-step agentic pipeline:
1. **Collect:** Ingest natural language caregiver requests.
2. **Retrieve:** Look up ground-truth booking records from Mock Healthcare Portals.
3. **Validate Evidence:** Determine if each booking is `confirmed`, `ready`, `pending`, or `unknown`.
4. **Assign Responsibilities:** Enforce exactly 1 owner and 1 backup per task (prompts if missing).
5. **Check Permissions:** Redact clinical details if recipient consent is withheld (TC2 constraint).
6. **Generate Care Plan:** Propose structured actions with tentative flags.
7. **Human Approval:** Require caregiver approval before executing any calendar changes.
8. **Execute Idempotently:** Create events protected by deduplication keys.
9. **Verify Independently:** Re-read created calendar records over an isolated HTTP path.

---

## 2. Technology Stack

* **Frontend:** React 19 + Vite + Tailwind CSS (Glassmorphism, dark palette, responsive design)
* **Backend:** Go + HTTP router + MySQL connection pool
* **Database:** MySQL 8.0 with 7 normalized tables and strict state domain separation
* **Browser Automation:** Browserbase Developer Pack integration
* **AI Layer:** Google Gemini 2.0 Flash + resilient local NLP entity extraction fallback
* **Packaging & Orchestration:** Docker & Docker Compose

---

## 3. Database Architecture (Strict Status Domain Separation)

CareSync maintains strict independence between status types:
* `booking_status`: `confirmed` | `ready` | `pending` | `unknown`
* `ownership_status`: `assigned` | `owner_requested` | `backup_requested`
* `approval_status`: `pending` | `approved` | `rejected`
* `calendar_status`: `not_created` | `created`
* `verification_status`: `not_run` | `verified` | `failed`

### Tables:
1. `family_members`: Caregivers, siblings, care recipient profiles.
2. `sharing_permissions`: Consent preferences for clinical vs scheduling details.
3. `portal_records`: Synthetic ground truth for Hospital, Pharmacy, and Lab systems.
4. `care_tasks`: Extracted tasks per run with owner/backup allocations.
5. `source_evidence`: Audit trail of portal URLs, timestamps, and payloads.
6. `approval_requests`: Execution proposals, decisions, and outcomes.
7. `calendar_events`: Idempotent event store with start times and tentative flags.
8. `action_logs`: Chronological audit trail.

---

## 4. The 7 Application Screens

* **Screen 1: Family Dashboard** — Status counters, family consent matrix, quick scenario runners.
* **Screen 2: AI Care Coordinator** — Natural language prompt parser, consent toggles, live trace preview.
* **Screen 3: Weekly Care Plan** — Interactive table of tasks, owners, backups, and confirmation badges.
* **Screen 4: Shared Calendar** — Weekly calendar view with consent-based privacy title masking.
* **Screen 5: Mock Healthcare Portals** — Interactive Hospital, Pharmacy, and Lab portals with dynamic status toggles.
* **Screen 6: Approval Center** — Side-by-side proposal review, idempotent approve, and reject actions.
* **Screen 7: Test Center** — Official rubric test suite (TC1–TC4) with 1-click execution and JSON evidence export.

---

## 5. Quick Start (Single Command)

### Via Docker Compose (Recommended)
```bash
docker compose up --build -d
```
Access the application at [http://localhost:8080](http://localhost:8080).

### Run Official Test Suite (TC1–TC4)
```bash
./test.sh
```
All test outputs and cryptographic evidence are saved directly to `evidence/`:
* `evidence/TC1.json`
* `evidence/TC2.json`
* `evidence/TC3.json`
* `evidence/TC4.json`
