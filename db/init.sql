-- CareSync AI Database Schema
-- Preserves strict independence of:
-- 1. booking_status (confirmed | ready | pending | unknown)
-- 2. ownership_status (assigned | owner_requested | backup_requested)
-- 3. approval_status (pending | approved | rejected)
-- 4. calendar_status (not_created | created)
-- 5. verification_status (not_run | verified | failed)

CREATE DATABASE IF NOT EXISTS caresync CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE caresync;

-- 1. Family Members Table
CREATE TABLE IF NOT EXISTS family_members (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    role VARCHAR(64) NOT NULL,
    email VARCHAR(128),
    phone VARCHAR(64),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Sharing Permissions Table (Consent Management)
CREATE TABLE IF NOT EXISTS sharing_permissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    member_name VARCHAR(128) NOT NULL UNIQUE,
    consent_medical_details BOOLEAN NOT NULL DEFAULT FALSE,
    consent_scheduling BOOLEAN NOT NULL DEFAULT TRUE,
    notes VARCHAR(255),
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 3. Mock Portals Records (Synthetic Ground Truth)
CREATE TABLE IF NOT EXISTS portal_records (
    id VARCHAR(64) PRIMARY KEY,
    kind VARCHAR(32) NOT NULL, -- hospital | pharmacy | lab
    title VARCHAR(255) NOT NULL,
    status VARCHAR(32) NOT NULL, -- confirmed | ready | requested
    scheduled_date VARCHAR(64) NOT NULL,
    provider_name VARCHAR(128),
    location VARCHAR(255)
);

-- 4. Care Tasks Table
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

-- 5. Source Evidence Table (Independent Audit Trail)
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

-- 6. Approval Requests & Runs
CREATE TABLE IF NOT EXISTS approval_requests (
    id VARCHAR(64) PRIMARY KEY,
    scenario VARCHAR(64) NOT NULL,
    recipient_consented BOOLEAN NOT NULL DEFAULT TRUE,
    expected_outcome VARCHAR(255),
    actual_outcome TEXT,
    approval_status VARCHAR(32) NOT NULL DEFAULT 'pending', -- pending | approved | rejected
    calendar_status VARCHAR(32) NOT NULL DEFAULT 'not_created', -- not_created | created
    verification_status VARCHAR(32) NOT NULL DEFAULT 'not_run', -- not_run | verified | failed
    pass_status BOOLEAN NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    decided_at DATETIME NULL
);

-- 7. Calendar Events (Idempotent Execution Store)
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

-- 8. Action Logs (Audit Trail)
CREATE TABLE IF NOT EXISTS action_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    run_id VARCHAR(64) NOT NULL,
    log_time VARCHAR(64) NOT NULL,
    message TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Seed Initial Family Members
INSERT IGNORE INTO family_members (id, name, role, email, phone) VALUES
('FM-1', 'Arun', 'Primary Caregiver', 'arun@example.com', '+1-555-0101'),
('FM-2', 'Priya', 'Backup Caregiver & Sibling', 'priya@example.com', '+1-555-0102'),
('FM-3', 'Karthik', 'Sibling', 'karthik@example.com', '+1-555-0103'),
('FM-4', 'Ramesh (Father)', 'Elderly Care Recipient', 'ramesh@example.com', '+1-555-0100');

-- Seed Consent Permissions
INSERT IGNORE INTO sharing_permissions (member_name, consent_medical_details, consent_scheduling, notes) VALUES
('Arun', TRUE, TRUE, 'Authorized primary caregiver full clinical access'),
('Priya', TRUE, TRUE, 'Authorized healthcare proxy and backup'),
('Karthik', FALSE, TRUE, 'General schedule access only; medical details restricted');

-- Seed Mock Portals Ground Truth
INSERT IGNORE INTO portal_records (id, kind, title, status, scheduled_date, provider_name, location) VALUES
('APT-101', 'hospital', 'Cardiology follow-up, Dr. Rao', 'confirmed', '2026-10-26 10:00', 'Metro Heart Institute', 'Suite 400, Clinic Tower'),
('RX-201', 'pharmacy', 'Metformin 500mg refill', 'ready', '2026-10-25 17:00', 'Walgreens Care Pharmacy', 'Main St. Branch Drive-thru'),
('LAB-301', 'lab', 'HbA1c fasting blood test', 'confirmed', '2026-10-24 08:00', 'Quest Diagnostics Central', 'Lab Room B'),
('LAB-302', 'lab', 'Lipid profile', 'requested', '2026-10-27 09:00', 'Quest Diagnostics Central', 'Lab Room A');
