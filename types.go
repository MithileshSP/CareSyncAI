package main

// Rec represents a mock portal record (synthetic ground truth)
type Rec struct {
	ID            string `json:"id"`
	Kind          string `json:"kind"` // hospital | pharmacy | lab
	Title         string `json:"title"`
	Status        string `json:"status"` // confirmed | ready | requested
	Date          string `json:"date"`
	ProviderName  string `json:"providerName,omitempty"`
	Location      string `json:"location,omitempty"`
}

// FamilyMember represents a family participant in care coordination
type FamilyMember struct {
	ID                     string `json:"id"`
	Name                   string `json:"name"`
	Role                   string `json:"role"`
	Email                  string `json:"email"`
	Phone                  string `json:"phone"`
	ConsentMedicalDetails  bool   `json:"consentMedicalDetails"`
	ConsentScheduling      bool   `json:"consentScheduling"`
	Notes                  string `json:"notes"`
}

// Task defines an assigned or requested responsibility
type Task struct {
	ID     string `json:"id"`
	Ref    string `json:"ref"`
	Owner  string `json:"owner"`
	Backup string `json:"backup"`
}

// Evidence captures source portal verification details
type Evidence struct {
	URL         string `json:"url"`
	RetrievedAt string `json:"retrievedAt"`
	Record      *Rec   `json:"record"`
}

// Item links a Task with its verified evidence and states
type Item struct {
	Task      Task     `json:"task"`
	Evidence  Evidence `json:"evidence"`
	Booking   string   `json:"booking"`   // confirmed | ready | pending | unknown
	Ownership string   `json:"ownership"` // assigned | owner_requested | backup_requested
	Note      string   `json:"note"`
}

// Action describes a calendar event or reminder proposed by the agent
type Action struct {
	Key       string `json:"key"`
	TaskID    string `json:"taskId"`
	Title     string `json:"title"`
	Details   string `json:"details"`
	Start     string `json:"start"`
	Tentative bool   `json:"tentative"`
	Reminder  int    `json:"reminderMinutes"`
	Owner     string `json:"owner"`
}

// Event represents an executed, confirmed calendar entry
type Event struct {
	ID        string `json:"id"`
	Action
	CreatedAt string `json:"createdAt"`
}

// Run encapsulates an entire care plan generation, review, and verification session
// Notice the 5 strictly separated states:
// 1. Items[i].Booking (booking status)
// 2. Items[i].Ownership (ownership status)
// 3. Approval (approval status: pending | approved | rejected)
// 4. Calendar (calendar status: not_created | created)
// 5. Verification (verification status: not_run | verified | failed)
type Run struct {
	ID           string   `json:"id"`
	Scenario     string   `json:"scenario"`
	Expected     string   `json:"expected"`
	Consent      bool     `json:"recipientConsented"`
	Items        []Item   `json:"items"`
	Actions      []Action `json:"actions"`
	Approval     string   `json:"approval"`     // pending | approved | rejected
	Calendar     string   `json:"calendar"`     // not_created | created
	Verification string   `json:"verification"` // not_run | verified | failed
	EventIDs     []string `json:"eventIds"`
	Log          []string `json:"log"`
	Actual       string   `json:"actual"`
	Pass         *bool    `json:"pass"`
	CreatedAt    string   `json:"createdAt"`
}

// Scenario represents predefined evaluation test cases
type Scenario struct {
	Expected string
	Consent  bool
	Tasks    []Task
}

// DashboardStats provides overview metrics for Screen 1
type DashboardStats struct {
	UpcomingAppointments int `json:"upcomingAppointments"`
	PendingLabBookings   int `json:"pendingLabBookings"`
	RefillsReady         int `json:"refillsReady"`
	TasksNeedingOwners   int `json:"tasksNeedingOwners"`
	ActionsPendingReview int `json:"actionsPendingReview"`
	TotalEvents          int `json:"totalEvents"`
}
