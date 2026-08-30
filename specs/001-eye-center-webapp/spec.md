# Feature Specification: Eye Medical Center Web Application

**Feature Branch**: `001-eye-center-webapp`
**Created**: 2026-04-19
**Status**: Draft
**Input**: User description: "build a web app for an medical center for eye health"

## Clarifications

### Session 2026-04-19

- Q: Is a patient-facing self-service portal in scope for v1? → A: Staff-only in v1 (no patient login).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Clinician records an eye examination (Priority: P1)

An ophthalmologist or optometrist opens the web app, selects a waiting patient,
and captures a complete eye examination — chief complaint, visual acuity,
intraocular pressure, refraction, slit-lamp and fundus findings, diagnosis, and
plan — then issues the follow-up instructions and any prescriptions or
referrals.

**Why this priority**: Recording the exam is the core clinical act of an eye
medical center. Without it, no other workflow (reporting, billing,
follow-ups) has inputs. This is the MVP.

**Independent Test**: A clinician can log in, open a test patient, complete
every exam field, save, and reopen the patient to see the saved exam
rendered identically. Delivers end-to-end clinical value even if no other
story is implemented.

**Acceptance Scenarios**:

1. **Given** a clinician is logged in and a patient is on today's list,
   **When** they open the patient and submit a completed exam form,
   **Then** the exam is persisted and appears in the patient's history with
   timestamp and clinician name.
2. **Given** an exam is in progress, **When** the network drops briefly,
   **Then** the clinician's in-progress entries are not lost when connectivity
   returns.
3. **Given** a saved exam, **When** the clinician reopens the patient on a
   different device, **Then** the exam data is identical to what was saved.

---

### User Story 2 - Front desk registers a patient and books a visit (Priority: P1)

A receptionist registers a new or returning patient, captures demographics
and contact information, assigns them to a doctor and service for today's
visit, and places them on the clinician's queue.

**Why this priority**: Without registration, there is no patient record for
the clinician to examine. Registration and the exam together form the
minimum viable loop of a clinic day.

**Independent Test**: A receptionist creates a patient, books a visit, and
confirms the patient appears on the selected clinician's queue within the
same session.

**Acceptance Scenarios**:

1. **Given** a new walk-in, **When** the receptionist enters the patient's
   identity and phone number and books a visit, **Then** the patient is
   searchable and the visit appears in the clinician's queue.
2. **Given** a returning patient identified by national ID or phone,
   **When** the receptionist searches, **Then** the existing record is
   returned without creating a duplicate.
3. **Given** a booked visit, **When** the receptionist cancels it,
   **Then** the clinician's queue reflects the cancellation immediately.

---

### User Story 3 - Clinician issues a medical report, prescription, or referral (Priority: P2)

After an exam, the clinician produces a printable medical report, a
prescription for glasses or medication, or a referral (e.g., to surgery or
to an external specialist). The output is downloadable as a PDF and
printable on standard clinic hardware.

**Why this priority**: Reports and prescriptions are the primary tangible
deliverable to the patient. Required soon after the exam is working but not
strictly needed for the first clinical capture.

**Independent Test**: From a saved exam, the clinician generates each
document type and confirms the PDF renders correctly with patient, clinic,
clinician, and clinical data, and can be printed.

**Acceptance Scenarios**:

1. **Given** a completed exam, **When** the clinician issues a glasses
   prescription, **Then** the generated document shows the correct
   refraction values, patient identity, clinic letterhead, and clinician
   signature block.
2. **Given** a patient needs surgery, **When** the clinician creates a
   referral, **Then** the referral is stored on the patient's record and
   produces a printable document.

---

### User Story 4 - Administrator manages users, roles, branches, and services (Priority: P2)

A system administrator creates staff accounts, assigns roles (receptionist,
clinician, admin, etc.), scopes users to specific branches, and configures
the catalog of services the center offers.

**Why this priority**: Required to operate the system with more than a
single user or branch, but the clinical flow can begin with a minimal
seeded admin.

**Independent Test**: An admin creates a receptionist account restricted to
one branch, logs in as that user, and confirms they can only see and act on
that branch's patients and visits.

**Acceptance Scenarios**:

1. **Given** an admin is logged in, **When** they create a user with a
   specific role and branch, **Then** the new user can log in and only
   access resources permitted by that role and branch.
2. **Given** an existing user, **When** the admin revokes their role,
   **Then** the user immediately loses access to protected areas.

---

### User Story 5 - Operations and surgery scheduling (Priority: P3)

Surgical coordinators schedule eye procedures (e.g., cataract, LASIK,
retinal) for patients, track pre-op requirements, and capture post-op
notes.

**Why this priority**: A valuable extension once outpatient clinic flow is
stable; not required for opening day.

**Independent Test**: A coordinator schedules an operation for a patient,
assigns it to a surgeon and room, and the operation appears on that day's
operations list with status transitions (scheduled → in progress → done).

**Acceptance Scenarios**:

1. **Given** a patient referred for surgery, **When** the coordinator books
   an operation, **Then** it appears on the surgeon's list and on the
   patient's record.

---

### User Story 6 - Dashboards and reporting for management (Priority: P3)

Managers view dashboards showing daily patient volume, doctor load, service
mix, and operational KPIs, and export these figures for review.

**Why this priority**: Strategic value for the business, not on the
critical path to serving patients.

**Independent Test**: A manager opens the dashboard on a day with recorded
visits and confirms the counts match a manual reconciliation against the
visits list.

**Acceptance Scenarios**:

1. **Given** recorded visits and exams for a date range, **When** the
   manager opens the dashboard, **Then** totals by doctor, service, and
   branch match the underlying records.

---

### Edge Cases

- What happens when two receptionists try to register the same walk-in
  patient simultaneously? The system MUST detect the duplicate by national
  ID or phone and present a merge/confirm prompt rather than creating two
  records.
- What happens when a clinician saves an exam while offline? Data MUST be
  retained locally and synchronized on reconnection without silent loss.
- What happens when a user's role is revoked mid-session? The next
  protected action MUST be denied and the session redirected to login.
- What happens when a prescription is edited after printing? The prior
  printed version MUST remain retrievable for audit.
- What happens on mixed Arabic/English data entry (patient names written in
  either script)? Search MUST match regardless of script where the record
  stores the alternative.
- What happens when a patient has no national ID (tourist, minor)? The
  system MUST allow registration with alternative identification.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST allow authenticated staff to register, search,
  and view patients, deduplicating by national ID and phone at entry time.
- **FR-002**: The system MUST allow receptionists to book, reschedule, and
  cancel patient visits against a named doctor, service, and branch for a
  given date.
- **FR-003**: The system MUST present each clinician with their current
  queue of waiting patients for the active day and branch.
- **FR-004**: The system MUST allow clinicians to record a complete eye
  examination covering at minimum: chief complaint, history, visual acuity
  (uncorrected and corrected), intraocular pressure, refraction (auto and
  manual), anterior segment findings, posterior segment findings,
  diagnosis, and plan.
- **FR-005**: The system MUST persist every exam, visit, prescription,
  referral, and operation with an immutable audit trail (who, what, when).
- **FR-006**: The system MUST produce printable and downloadable PDF
  documents for medical reports, glasses/medication prescriptions, and
  referrals, bearing clinic identity, clinician identity, and patient
  identity.
- **FR-007**: The system MUST enforce role-based access so that each user
  can perform only the actions permitted by their role and scope (branch,
  service).
- **FR-008**: The system MUST allow administrators to create, edit,
  suspend, and delete user accounts and to assign/revoke roles and branch
  scopes.
- **FR-009**: The system MUST support a Services catalog (e.g., General
  Eye, LASIK, Retina, Pediatric) that can be assigned to visits and
  operations.
- **FR-010**: The system MUST support multi-branch operation: a single
  deployment serves multiple physical clinic locations, and records are
  scoped to their branch of origin.
- **FR-011**: The system MUST provide search across patients by name (in
  any script stored), national ID, phone number, and file number, and
  return results within 2 seconds for the 95th percentile query.
- **FR-012**: The system MUST preserve a user's in-progress exam data
  across brief network interruptions without requiring manual re-entry.
- **FR-013**: The system MUST log every access to, and modification of,
  patient records in a way that supports after-the-fact audit by
  administrators.
- **FR-014**: The system MUST support Arabic and English user interfaces,
  with Arabic primary for clinic-facing screens and both available for
  printed documents, without mixing languages within a single saved
  record's clinical fields.
- **FR-015**: The system MUST allow scheduling of operations/surgeries
  with status transitions (scheduled, in progress, completed, cancelled)
  and link each operation to the originating patient and referring exam.
- **FR-016**: The system MUST provide an operations/management dashboard
  showing patient volume, doctor load, and service mix per day, week, and
  month, filterable by branch.
- **FR-017**: The system MUST authenticate users via username/password
  with session management, account lockout on repeated failed attempts,
  and password reset by administrators.
- **FR-018**: The system MUST retain patient medical records for at least
  the retention period required by the jurisdiction's medical
  record-keeping regulations, with no silent deletion.
- **FR-019**: The system is staff-only in v1. Patients MUST NOT have
  login credentials or a self-service portal; all interactions with
  patients are mediated by clinic staff. A patient portal is explicitly
  deferred to a later release.
- **FR-020** [NEEDS CLARIFICATION: which regulatory regime governs patient
  data and audit requirements — Saudi PDPL, HIPAA, GDPR, or another —
  since this materially affects consent, export, and retention rules?]
- **FR-021** [NEEDS CLARIFICATION: must the app integrate with an existing
  Hospital/Clinic Information System or laboratory/imaging equipment
  (e.g., Pentacam, auto-refractor) as a launch requirement, or are those
  follow-on features?]

### Key Entities *(include if feature involves data)*

- **Patient**: A person receiving care. Attributes: identity (name in
  Arabic and/or English, national ID or alternative), demographics, contact
  information, branch of first registration, file number. Related to
  Visits, Exams, Prescriptions, Operations, Reports.
- **Visit**: A scheduled or walk-in appointment. Attributes: date, doctor,
  service, branch, status (waiting, in progress, done, cancelled). Belongs
  to a Patient; may have zero or one Exam.
- **Exam**: A clinical encounter record capturing eye-health findings.
  Attributes: chief complaint, visual acuity, intraocular pressure,
  refraction, anterior/posterior findings, diagnosis, plan, clinician,
  timestamp. Belongs to a Visit (and therefore a Patient).
- **Prescription**: A document ordering glasses or medication. Attributes:
  refraction or drug details, validity, issuing clinician. Derived from an
  Exam.
- **Referral**: A document directing the patient to another service,
  surgeon, or external provider. Derived from an Exam.
- **Operation**: A scheduled or completed surgical procedure. Attributes:
  procedure type, surgeon, date, room, pre-op notes, post-op notes, status.
  Belongs to a Patient.
- **User**: A staff member with credentials. Attributes: identity, role
  (receptionist, clinician, surgeon, admin, manager, etc.), branch
  scope(s), service scope(s), activation status.
- **Role**: A named permission set governing what a user may see and do.
- **Branch**: A physical clinic location. Scopes visits, users, and
  dashboards.
- **Service**: A clinical offering (e.g., General Eye, LASIK, Retina) that
  categorizes visits and operations.
- **Audit Event**: A record of who accessed or modified what, when.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A receptionist can register a new walk-in patient and place
  them on a clinician's queue in under 90 seconds from first keystroke.
- **SC-002**: A clinician can complete and save a routine eye exam in
  under 4 minutes for the 75th-percentile patient encounter.
- **SC-003**: At least 95% of patient searches return results in under 2
  seconds under a live load of 100 concurrent staff users.
- **SC-004**: Zero loss of saved exam, visit, or prescription data
  attributable to the application over any rolling 90-day period.
- **SC-005**: 99% of generated medical reports, prescriptions, and
  referrals print correctly on standard clinic printers without manual
  re-formatting.
- **SC-006**: Unauthorized attempts to access patient records (wrong role
  or out-of-scope branch) are blocked 100% of the time and recorded for
  audit.
- **SC-007**: The system serves at least 3 concurrent branches and 300
  concurrent active users at peak without observable slowdown in the
  clinician exam screen.
- **SC-008**: Management dashboards reconcile to underlying records with
  zero discrepancy for any selected day or date range.
- **SC-009**: New clinical staff can record their first independent exam
  after no more than 30 minutes of orientation.

## Assumptions

- The app is a browser-based web application accessed from clinic desktops
  and tablets; native mobile apps are out of scope for v1 unless a
  subsequent story adds them.
- Arabic is the primary clinic-facing language; English is available for
  documents and admin screens. The UI follows the SELRS convention of
  bilingual labels already established on similar screens.
- Staff authenticate with username and password over HTTPS; single sign-on
  is out of scope for v1.
- The center operates one or more physical branches; all branches share a
  single central database.
- Clinic network is generally reliable but may experience brief outages;
  the app is resilient to short interruptions but is not fully offline.
- Printing targets are standard office printers; no specialty label or
  thermal printers are required for v1.
- Existing SELRS patterns for permissions, tRPC-style APIs, and database
  handling (including legacy mojibake decoding) apply and MUST be
  preserved when extending the current codebase.
- Standard medical record retention (minimum 10 years for adult records,
  longer for minors) is assumed unless the jurisdiction mandates otherwise
  once FR-020 is clarified.
- Billing/finance is treated as an adjacent system; fine-grained billing
  workflows are out of scope for this spec.
