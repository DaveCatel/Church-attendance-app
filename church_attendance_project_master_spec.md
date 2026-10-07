# Church Attendance Management System — Master Project Specification & Roadmap

> **Document purpose:** Master reference for the entire church attendance management project. This document combines the current implementation, agreed architecture, database design, attendance rules, offline roadmap, security, admin dashboard, testing, deployment, and future features.
>
> **Status:** Active development — Version 1 foundation
>
> **Last updated:** 2026-10-06

---

## 1. Project Vision

Build a reliable church attendance management platform for church leaders and workers that makes attendance simple while remaining robust enough to grow into a complete church operations platform.

The first major capability is **service-based attendance**:

- Users register and authenticate.
- Users belong to a church and may belong to multiple departments.
- Church administrators create recurring and special services.
- Users can clock in and clock out for a specific service.
- Attendance is stored against a specific service occurrence.
- The mobile application will continue working when the internet is unavailable.
- Offline attendance is synchronized reliably when connectivity returns.
- Administrators can inspect attendance and later generate reports and analytics.

The architecture is intentionally designed for future expansion rather than building a disposable prototype.

---

# 2. Product Scope

## 2.1 Version 1 — Core system

The first production-capable version should provide:

- Church setup.
- User registration/login.
- Role-based access.
- Department management.
- Service templates.
- Service occurrences.
- Special services.
- Service participation restrictions.
- Online clock-in/out.
- Attendance history.
- Admin attendance monitoring.
- Mobile offline attendance.
- Reliable synchronization.
- Audit logging.
- Basic reporting.

## 2.2 Later versions

Possible additions:

- Member management.
- Visitor management.
- QR-code attendance.
- Geolocation/geofencing.
- Push notifications.
- Attendance reminders.
- Advanced analytics.
- Department dashboards.
- Multiple campuses.
- Excel/PDF exports.
- Automated service generation.
- Fine-grained permissions.
- Data retention/archiving.
- Backup/disaster recovery.
- Attendance fraud/clock manipulation detection.
- More complete church management functionality.

These should not complicate Version 1 unnecessarily.

---

# 3. Technology Stack

## Backend

- Python
- FastAPI
- SQLAlchemy 2.x
- Alembic
- PostgreSQL
- Psycopg
- Argon2 password hashing

## Database

- Supabase PostgreSQL
- Supabase Storage may later be used for profile photos/files.

## Web application

- React
- Vite
- CSS / CSS-like styling

## Mobile application

- React Native
- SQLite for local offline storage

## API

- REST API
- FastAPI owns authentication and business logic.

---

# 4. Core Architectural Principle

FastAPI owns authentication and application business logic.

Supabase PostgreSQL is the **central source of truth**.

SQLite is the **local mobile working database and synchronization queue**.

```text
                    INTERNET AVAILABLE
                           |
                           v
                  +-------------------+
                  |    FastAPI API    |
                  |-------------------|
                  | Authentication    |
                  | Business Logic    |
                  | Attendance        |
                  | Services          |
                  | Synchronization   |
                  +---------+---------+
                            |
                            v
                  +-------------------+
                  | Supabase Postgres |
                  | Central Database   |
                  +-------------------+

 MOBILE APPLICATION
 +--------------------------------+
 | React Native                   |
 |                                |
 | Login / Dashboard              |
 | Services                       |
 | Clock In / Clock Out           |
 |                                |
 | SQLite                         |
 | Offline Data + Sync Queue      |
 +--------------------------------+
```

---

# 5. Current Project State

The uploaded project already contains a working web-based foundation.

## Current repository structure

```text
church-attendance/
├── backend/
│   ├── .env.example
│   ├── requirements.txt
│   ├── app/
│   │   ├── core/
│   │   │   ├── config.py
│   │   │   └── security.py
│   │   ├── db/
│   │   │   ├── base.py
│   │   │   └── database.py
│   │   ├── models/
│   │   │   ├── attendance.py
│   │   │   ├── audit.py
│   │   │   ├── audit_log.py
│   │   │   ├── auth.py
│   │   │   ├── base.py
│   │   │   ├── church.py
│   │   │   ├── departments.py
│   │   │   ├── device.py
│   │   │   ├── refresh_token.py
│   │   │   ├── role.py
│   │   │   ├── service.py
│   │   │   ├── sync.py
│   │   │   └── user.py
│   │   ├── routers/
│   │   │   ├── attendance.py
│   │   │   ├── auth.py
│   │   │   ├── services.py
│   │   │   └── users.py
│   │   ├── services/
│   │   │   └── scheduling.py
│   │   ├── schemas/
│   │   ├── deps.py
│   │   └── main.py
│   └── scripts/
│       └── init_db.py
│
└── web/
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── App.jsx
        ├── api.js
        ├── auth.jsx
        ├── components/
        ├── pages/
        │   ├── Admin.jsx
        │   ├── Home.jsx
        │   ├── Login.jsx
        │   ├── Profile.jsx
        │   └── Signup.jsx
        └── styles.css
```

## Current attendance implementation

The current backend already provides:

- `GET /api/attendance/today`
- `POST /api/attendance/clock-in`
- `POST /api/attendance/clock-out`
- `GET /api/attendance/me`

The current web application already provides:

- Dashboard service cards.
- Upcoming services.
- Clock-in button.
- Clock-out button.
- Attendance state badges.
- Attendance history.
- Admin service management.
- Admin attendance view.

### Current attendance state model

```text
upcoming
open
clocked_in
completed
missed
```

### Current online attendance flow

```text
React Web
   |
   | POST /attendance/clock-in
   v
FastAPI
   |
   +-- authenticate user
   +-- locate service occurrence
   +-- check current attendance
   +-- check attendance window
   +-- create AttendanceRecord
   v
PostgreSQL
```

### Current strengths

- Duplicate attendance is prevented at the database level.
- Server time is recorded.
- Device timestamp is also captured.
- Clock-out requires a clock-in.
- Service occurrence is the attendance target.
- Admin can inspect attendance per service.
- Service occurrence generation is already present.

### Current gaps to resolve

1. Service participant restrictions are not yet enforced by the attendance clock-in endpoint.
2. Offline attendance is not yet implemented in the actual application.
3. Current source value is `WEB`; final design should use `ONLINE` / `OFFLINE` or another explicitly agreed source model.
4. Attendance validation should explicitly respect service status.
5. Mobile SQLite and synchronization endpoints still need to be built.
6. Device registration needs to be connected to the attendance workflow.
7. Sync idempotency needs to be implemented.
8. Attendance reporting needs to be expanded.

---

# 6. Users and Roles

Initial roles:

- `SUPER_ADMIN`
- `ADMIN`
- `LEADER`
- `WORKER`

Suggested responsibility model:

### SUPER_ADMIN

System-level management and future multi-church administration.

### ADMIN

Manage church users, departments, services and attendance/reporting.

### LEADER

Normal church leader access, subject to assigned permissions.

### WORKER

Normal worker attendance and profile functionality.

The role system can later evolve into granular permissions without changing the core user architecture.

---

# 7. Database Design

The planned central database contains 13 core tables.

```text
1.  churches
2.  roles
3.  users
4.  departments
5.  user_departments
6.  service_templates
7.  service_occurrences
8.  service_participants
9.  attendance_records
10. user_devices
11. auth_sessions
12. sync_events
13. audit_logs
```

---

## 7.1 churches

Stores churches/organizations using the system.

| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| name | VARCHAR(150) | NOT NULL |
| address | TEXT | NULL |
| phone | VARCHAR(30) | NULL |
| email | VARCHAR(255) | NULL |
| timezone | VARCHAR(100) | NOT NULL, default `Africa/Douala` |
| is_active | BOOLEAN | NOT NULL, default TRUE |
| created_at | TIMESTAMPTZ | NOT NULL |
| updated_at | TIMESTAMPTZ | NOT NULL |

---

## 7.2 roles

| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| name | VARCHAR(50) | UNIQUE, NOT NULL |
| description | TEXT | NULL |
| created_at | TIMESTAMPTZ | NOT NULL |
| updated_at | TIMESTAMPTZ | NOT NULL |

Initial values:

```text
SUPER_ADMIN
ADMIN
LEADER
WORKER
```

---

## 7.3 users

| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| church_id | UUID | FK → churches.id, CASCADE |
| role_id | UUID | FK → roles.id, RESTRICT |
| full_name | VARCHAR(150) | NOT NULL |
| email | VARCHAR(255) | NULL |
| phone | VARCHAR(30) | NULL |
| password_hash | TEXT | NOT NULL |
| profile_photo_url | TEXT | NULL |
| is_active | BOOLEAN | NOT NULL, default TRUE |
| email_verified | BOOLEAN | NOT NULL, default FALSE |
| phone_verified | BOOLEAN | NOT NULL, default FALSE |
| last_login_at | TIMESTAMPTZ | NULL |
| created_at | TIMESTAMPTZ | NOT NULL |
| updated_at | TIMESTAMPTZ | NOT NULL |

Unique constraints:

```text
UNIQUE(church_id, email)
UNIQUE(church_id, phone)
```

Never store plaintext passwords.

---

## 7.4 departments

| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| church_id | UUID | FK → churches.id, CASCADE |
| name | VARCHAR(100) | NOT NULL |
| description | TEXT | NULL |
| is_active | BOOLEAN | NOT NULL, default TRUE |
| created_at | TIMESTAMPTZ | NOT NULL |
| updated_at | TIMESTAMPTZ | NOT NULL |

Constraint:

```text
UNIQUE(church_id, name)
```

---

## 7.5 user_departments

Many-to-many relationship between users and departments.

| Column | Type | Constraints |
|---|---|---|
| user_id | UUID | FK → users.id, CASCADE |
| department_id | UUID | FK → departments.id, CASCADE |
| is_primary | BOOLEAN | NOT NULL, default FALSE |
| joined_at | TIMESTAMPTZ | NOT NULL |

Primary key:

```text
PRIMARY KEY(user_id, department_id)
```

Users can belong to multiple departments.

---

## 7.6 service_templates

Defines reusable/recurring services.

| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| church_id | UUID | FK → churches.id, CASCADE |
| name | VARCHAR(150) | NOT NULL |
| description | TEXT | NULL |
| service_type | VARCHAR(30) | NOT NULL |
| day_of_week | SMALLINT | NULL |
| default_start_time | TIME | NULL |
| default_end_time | TIME | NULL |
| is_recurring | BOOLEAN | NOT NULL, default FALSE |
| is_active | BOOLEAN | NOT NULL, default TRUE |
| created_by | UUID | FK → users.id, SET NULL |
| created_at | TIMESTAMPTZ | NOT NULL |
| updated_at | TIMESTAMPTZ | NOT NULL |

Recommended service types:

```text
SUNDAY
WEEKLY
SPECIAL
```

`day_of_week` should be NULL or constrained to `0–6`.

---

## 7.7 service_occurrences

Represents an actual scheduled instance of a service.

| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| service_template_id | UUID | FK → service_templates.id, CASCADE |
| service_date | DATE | NOT NULL |
| start_time | TIMESTAMPTZ | NOT NULL |
| end_time | TIMESTAMPTZ | NULL |
| status | VARCHAR(30) | NOT NULL, default `SCHEDULED` |
| created_at | TIMESTAMPTZ | NOT NULL |
| updated_at | TIMESTAMPTZ | NOT NULL |

Constraint:

```text
UNIQUE(service_template_id, service_date)
```

Statuses:

```text
SCHEDULED
ONGOING
COMPLETED
CANCELLED
```

Template default times use `TIME`; actual occurrence times use `TIMESTAMPTZ`.

---

## 7.8 service_participants

Defines who may attend a restricted service.

| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| service_template_id | UUID | FK → service_templates.id, CASCADE |
| user_id | UUID | FK → users.id, CASCADE, NULL |
| department_id | UUID | FK → departments.id, CASCADE, NULL |
| created_at | TIMESTAMPTZ | NOT NULL |
| updated_at | TIMESTAMPTZ | NOT NULL |

Constraint:

```text
CHECK(user_id IS NOT NULL OR department_id IS NOT NULL)
```

Access interpretation:

- No participant rows → available to all eligible users.
- Participant rows exist → restricted to listed users/departments.

For a one-off special service, use a dedicated template so its participant list only applies to that event.

Version 1 keeps participation rules at template level.

---

## 7.9 attendance_records

| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| user_id | UUID | FK → users.id, CASCADE |
| service_occurrence_id | UUID | FK → service_occurrences.id, CASCADE |
| device_id | UUID | FK → user_devices.id, SET NULL |
| clock_in | TIMESTAMPTZ | NOT NULL |
| clock_out | TIMESTAMPTZ | NULL |
| clock_in_source | VARCHAR(20) | NOT NULL |
| clock_out_source | VARCHAR(20) | NULL |
| clock_in_device_time | TIMESTAMPTZ | NULL |
| clock_out_device_time | TIMESTAMPTZ | NULL |
| clock_in_server_time | TIMESTAMPTZ | NULL |
| clock_out_server_time | TIMESTAMPTZ | NULL |
| sync_status | VARCHAR(20) | NOT NULL, default `SYNCED` |
| created_at | TIMESTAMPTZ | NOT NULL |
| updated_at | TIMESTAMPTZ | NOT NULL |

Constraint:

```text
UNIQUE(user_id, service_occurrence_id)
```

Recommended source values:

```text
ONLINE
OFFLINE
```

Recommended sync values:

```text
PENDING
SYNCED
REJECTED
```

Recommended database check:

```text
clock_out IS NULL OR clock_out >= clock_in
```

Do not store attendance duration; calculate it from clock-in and clock-out.

---

## 7.10 user_devices

Tracks mobile devices.

| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| user_id | UUID | FK → users.id, CASCADE |
| device_identifier | VARCHAR(255) | NOT NULL |
| device_name | VARCHAR(150) | NULL |
| platform | VARCHAR(30) | NOT NULL |
| app_version | VARCHAR(30) | NULL |
| is_active | BOOLEAN | NOT NULL, default TRUE |
| last_sync_at | TIMESTAMPTZ | NULL |
| last_seen_at | TIMESTAMPTZ | NULL |
| created_at | TIMESTAMPTZ | NOT NULL |
| updated_at | TIMESTAMPTZ | NOT NULL |

Used for device management, offline synchronization and session control.

---

## 7.11 auth_sessions

| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| user_id | UUID | FK → users.id, CASCADE |
| refresh_token_hash | VARCHAR(255) | NOT NULL |
| device_id | UUID | FK → user_devices.id, SET NULL |
| ip_address | INET | NULL |
| user_agent | VARCHAR(500) | NULL |
| expires_at | TIMESTAMPTZ | NOT NULL |
| revoked_at | TIMESTAMPTZ | NULL |
| created_at | TIMESTAMPTZ | NOT NULL |
| last_used_at | TIMESTAMPTZ | NULL |

Only token hashes are stored.

Supports:

- Logout.
- Logout all devices.
- Session expiration.
- Device/session revocation.
- Session auditing.

---

## 7.12 sync_events

Reliable offline synchronization and idempotency.

| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| device_id | UUID | FK → user_devices.id, CASCADE |
| user_id | UUID | FK → users.id, CASCADE |
| event_type | VARCHAR(50) | NOT NULL |
| entity_type | VARCHAR(50) | NOT NULL |
| entity_id | UUID | NULL |
| client_event_id | UUID | NOT NULL |
| payload | JSONB | NOT NULL |
| client_created_at | TIMESTAMPTZ | NOT NULL |
| server_received_at | TIMESTAMPTZ | NOT NULL |
| status | VARCHAR(30) | NOT NULL, default `PENDING` |
| error_message | TEXT | NULL |
| created_at | TIMESTAMPTZ | NOT NULL |
| processed_at | TIMESTAMPTZ | NULL |

Constraint:

```text
UNIQUE(client_event_id)
```

Example event types:

```text
CLOCK_IN
CLOCK_OUT
```

Recommended event statuses:

```text
PENDING
PROCESSED
REJECTED
```

The `client_event_id` is essential for retry-safe synchronization.

---

## 7.13 audit_logs

Tracks important system changes.

| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| church_id | UUID | FK → churches.id, CASCADE |
| user_id | UUID | FK → users.id, SET NULL |
| action | VARCHAR(100) | NOT NULL |
| entity_type | VARCHAR(100) | NULL |
| entity_id | UUID | NULL |
| old_data | JSONB | NULL |
| new_data | JSONB | NULL |
| ip_address | INET | NULL |
| user_agent | VARCHAR(500) | NULL |
| created_at | TIMESTAMPTZ | NOT NULL |

Possible actions:

```text
USER_CREATED
USER_UPDATED
USER_DEACTIVATED
SERVICE_CREATED
SERVICE_UPDATED
SERVICE_CANCELLED
ATTENDANCE_MODIFIED
DEVICE_REVOKED
ROLE_CHANGED
```

---

# 8. Database Relationships

```text
CHURCH
  |
  +---- USERS
  |      |
  |      +---- AUTH_SESSIONS
  |      |
  |      +---- USER_DEVICES
  |      |         |
  |      |         +---- SYNC_EVENTS
  |      |
  |      +---- USER_DEPARTMENTS ---- DEPARTMENTS
  |      |
  |      +---- ATTENDANCE_RECORDS
  |
  +---- DEPARTMENTS
  |
  +---- SERVICE_TEMPLATES
  |          |
  |          +---- SERVICE_OCCURRENCES
  |          |          |
  |          |          +---- ATTENDANCE_RECORDS
  |          |
  |          +---- SERVICE_PARTICIPANTS
  |
  +---- AUDIT_LOGS

ROLES
  |
  +---- USERS
```

---

# 9. Recommended Indexes

```text
users(church_id)
users(role_id)

departments(church_id)
user_departments(department_id)
service_templates(church_id)
service_occurrences(service_date)
attendance_records(user_id)
attendance_records(service_occurrence_id)
attendance_records(clock_in)
user_devices(user_id)
auth_sessions(user_id)
sync_events(device_id)
sync_events(user_id)
audit_logs(church_id)
audit_logs(user_id)
```

Unique constraints:

```text
users(church_id, email)
users(church_id, phone)
departments(church_id, name)
service_occurrences(service_template_id, service_date)
attendance_records(user_id, service_occurrence_id)
sync_events(client_event_id)
```

---

# 10. Delete Rules

Initial design:

```text
church
 ├── users → CASCADE
 ├── departments → CASCADE
 ├── service_templates → CASCADE
 └── audit_logs → CASCADE

user
 ├── auth_sessions → CASCADE
 ├── user_devices → CASCADE
 ├── user_departments → CASCADE
 └── attendance_records → CASCADE

audit_logs.user_id → SET NULL

service_template
 ├── service_occurrences → CASCADE
 └── service_participants → CASCADE

device
 ├── attendance_records → SET NULL
 └── sync_events → CASCADE
```

For production, consider replacing hard deletion of important attendance/audit data with archival or soft-delete policies.

---

# 11. Attendance Business Rules

## 11.1 One attendance record per user/service

A user may only have one attendance record for a specific occurrence.

Enforced by:

```text
UNIQUE(user_id, service_occurrence_id)
```

## 11.2 Clock-in window

The application determines when clock-in becomes available based on the occurrence and configured attendance window.

The user should not be able to clock in before the opening time.

## 11.3 Service ended

A user cannot clock in after the allowed attendance period/service has ended.

## 11.4 Clock-out

Clock-out requires an existing attendance record.

A second clock-out is rejected.

## 11.5 Participation

Before clock-in, FastAPI must verify that the user is eligible for the service.

Logic:

```text
No participant rows
    → service available to eligible church users

Participant rows exist
    → user must match directly OR belong to a listed department
```

This is a required backend authorization check, not merely a frontend restriction.

## 11.6 Service status

Clock-in/out logic should explicitly account for:

```text
SCHEDULED
ONGOING
COMPLETED
CANCELLED
```

Cancelled services must never accept attendance.

---

# 12. Time and Attendance Integrity

The system distinguishes three concepts:

1. Device time.
2. Server receipt time.
3. Accepted/effective attendance time.

Recommended fields:

```text
clock_in
clock_in_device_time
clock_in_server_time

clock_out
clock_out_device_time
clock_out_server_time
```

When online:

```text
Server time = authoritative
```

When offline:

```text
Device time = temporary effective time
Server receipt time = audit/provenance time
```

Future enhancement:

- Maintain a server/device time offset.
- Detect suspicious clock manipulation.
- Flag unusually large device/server time differences.

---

# 13. Offline-First Mobile Architecture

Offline operation is a first-class requirement.

## 13.1 Requirement

A user must be able to clock in/out even when there is no internet connection, provided the device has previously synchronized enough data to operate safely.

## 13.2 Local SQLite responsibilities

SQLite should contain enough information for the current user to operate offline, including:

- User/session state.
- User's device identity.
- Upcoming service occurrences.
- Service eligibility information.
- Local attendance records.
- Pending synchronization events.

## 13.3 Online clock-in

```text
React Native
     |
     | POST /attendance/clock-in
     v
FastAPI
     |
     +-- Authenticate
     +-- Validate service
     +-- Validate participation
     +-- Check duplicate
     +-- Generate server timestamp
     |
     v
PostgreSQL
```

## 13.4 Offline clock-in

```text
React Native
     |
     v
SQLite
     |
     +-- Create local attendance
     +-- Record device timestamp
     +-- Create client_event_id
     +-- Add sync event
     |
     v
Internet returns
     |
     v
Sync Manager
     |
     v
FastAPI
     |
     +-- Authenticate
     +-- Validate
     +-- Check client_event_id
     +-- Process event
     |
     v
PostgreSQL
     |
     v
SQLite event → SYNCED
```

---

# 14. Offline Authentication

A user must authenticate online successfully at least once before offline operation is available.

The app must:

- Never store plaintext passwords.
- Store session/credential information securely.
- Use a controlled offline session lifetime.
- Require online reauthentication when the session policy requires it.
- Allow the user to continue attendance operations offline only within the allowed policy.

For React Native, sensitive credentials should use the platform's secure storage mechanism rather than plain SQLite.

---

# 15. Offline Service Availability

Before connectivity disappears, the mobile application should synchronize upcoming service occurrences.

The local database needs enough information to answer:

- What service is active?
- What date is it?
- What time does it start/end?
- Is it cancelled?
- Is the user eligible?
- Does the user already have attendance for this occurrence?

This prevents the app from depending on a live API call just to decide whether a user can clock in.

---

# 16. Synchronization Design

## 16.1 Sync event identity

Every locally generated event gets a unique `client_event_id`.

Example:

```text
client_event_id = UUID
```

The same ID must be reused for retries.

## 16.2 Why this matters

Suppose:

```text
Mobile → FastAPI → Database
                   |
                   +-- event saved
                   |
                   X response lost
```

The mobile app does not know whether the server processed the request.

It retries.

FastAPI sees the same `client_event_id` and knows it has already been processed.

This prevents duplicate attendance.

## 16.3 Suggested sync endpoint

```text
POST /api/v1/sync
```

or, initially:

```text
POST /api/attendance/sync
```

The endpoint should accept a batch of events where practical.

## 16.4 Sync statuses

Local/server event states:

```text
PENDING
PROCESSED
REJECTED
```

Attendance record state:

```text
PENDING
SYNCED
REJECTED
```

## 16.5 Retry strategy

The mobile app should retry transient failures automatically.

Suggested approach:

```text
Immediate retry
↓
Short delay
↓
Longer delay
↓
Exponential backoff
↓
Retry later when connectivity returns
```

Permanent validation errors should not be retried indefinitely.

---

# 17. Mobile SQLite Conceptual Schema

The mobile database does not need to mirror every server table.

Suggested local tables:

```text
local_user
local_device
local_service_occurrences
local_service_participants
local_attendance
sync_queue
local_sync_metadata
```

The local database is a working cache and queue, not the central source of truth.

---

# 18. API Roadmap

## Authentication

```text
POST /api/auth/register
POST /api/auth/login
POST /api/auth/refresh
POST /api/auth/logout
POST /api/auth/logout-all
GET  /api/auth/me
```

## Users

```text
GET    /api/users
GET    /api/users/{id}
POST   /api/users
PATCH  /api/users/{id}
DELETE /api/users/{id}
```

## Departments

```text
GET    /api/departments
POST   /api/departments
PATCH  /api/departments/{id}
DELETE /api/departments/{id}
```

## Services

```text
GET    /api/services
POST   /api/services
PATCH  /api/services/{id}
GET    /api/services/occurrences
GET    /api/services/occurrences/{id}
GET    /api/services/occurrences/{id}/attendance
POST   /api/services/occurrences/{id}/cancel
```

## Attendance

```text
GET  /api/attendance/today
POST /api/attendance/clock-in
POST /api/attendance/clock-out
GET  /api/attendance/me
```

Future sync endpoints:

```text
POST /api/sync
GET  /api/sync/status
```

---

# 19. Admin Dashboard

Current admin dashboard already has:

- Services tab.
- Attendance tab.
- Service creation.
- Service activation/deactivation.
- Occurrence selection.
- Attendance list.

Future dashboard should contain:

## Dashboard

- Today's services.
- Total expected attendees.
- Total checked in.
- Currently present.
- Completed attendance.
- Attendance percentage.
- Recent activity.

## Users

- Create user.
- Edit user.
- Activate/deactivate user.
- Assign role.
- Assign departments.
- View attendance history.

## Departments

- Create department.
- Edit department.
- Assign users.
- Department attendance statistics.

## Services

- Create recurring service.
- Create special service.
- Configure attendance window.
- Configure participants.
- Generate occurrences.
- Cancel occurrence.

## Attendance

- View attendance by service.
- View by date.
- Filter by department.
- Search user.
- View clock-in/out times.
- View offline/online source.
- View synchronization status.

## Reports

- Daily report.
- Weekly report.
- Monthly report.
- User attendance report.
- Department report.
- Service report.
- Attendance percentage.
- Export.

---

# 20. Reporting Model

Attendance reports should be derived from:

```text
users
service_occurrences
attendance_records
user_departments
service_participants
```

Do not duplicate calculated statistics unnecessarily in the database.

Examples:

### Attendance duration

```text
clock_out - clock_in
```

### Attendance rate

```text
attended eligible services
--------------------------
expected eligible services
```

The exact definition of "expected" should be finalized when reporting is implemented.

---

# 21. Security Architecture

Security is a major part of this project because attendance and user data are personal data.

## Authentication

- Argon2 password hashing.
- Short-lived access tokens.
- Refresh token/session management.
- Store refresh token hashes, not raw refresh tokens.
- Revoke sessions on logout.
- Support logout from all devices.

## Authorization

Every sensitive endpoint must verify:

1. Authentication.
2. User active status.
3. Church ownership/tenant boundary.
4. Role/permission.
5. Resource access.

Do not trust IDs supplied by the client.

Example:

```text
occurrence_id = valid UUID
```

is not sufficient.

The server must also verify:

```text
occurrence belongs to user's church
service is active/valid
user is eligible for service
```

## Passwords

Never store plaintext passwords.

## Input validation

Use Pydantic schemas and database constraints.

## Audit

Log important administrative actions.

---

# 22. Multi-Tenant Security

Because `church_id` exists across the architecture, every church's data must be isolated.

A request from Church A must never be able to access:

- Church B users.
- Church B services.
- Church B attendance.
- Church B departments.
- Church B audit logs.

The backend must always derive the user's church from the authenticated identity rather than accepting arbitrary `church_id` values from the client for normal operations.

---

# 23. Data Integrity Constraints

Recommended database checks:

```text
clock_out IS NULL OR clock_out >= clock_in
```

```text
day_of_week IS NULL OR day_of_week BETWEEN 0 AND 6
```

```text
user_id IS NOT NULL OR department_id IS NOT NULL
```

Recommended controlled string values:

```text
service_type:
  SUNDAY
  WEEKLY
  SPECIAL

occurrence status:
  SCHEDULED
  ONGOING
  COMPLETED
  CANCELLED

attendance source:
  ONLINE
  OFFLINE

attendance sync:
  PENDING
  SYNCED
  REJECTED

sync event status:
  PENDING
  PROCESSED
  REJECTED
```

Version 1 should use VARCHAR + CHECK constraints rather than PostgreSQL ENUMs to keep future migrations simpler.

---

# 24. SQLAlchemy Implementation Standards

Use Python types in `Mapped[...]` annotations.

Correct:

```python
Mapped[datetime]
Mapped[date]
Mapped[time]
```

Use SQLAlchemy types inside `mapped_column()`.

Example:

```python
created_at: Mapped[datetime] = mapped_column(
    DateTime(timezone=True),
    server_default=func.now(),
    nullable=False,
)
```

Critical UUID/timestamp defaults should use appropriate server-side PostgreSQL defaults where needed, particularly in production migrations.

Avoid circular imports between model modules. Centralize model imports through the model package where appropriate.

---

# 25. Alembic Migration Strategy

Migration process:

```text
SQLAlchemy models
       |
       v
Alembic revision --autogenerate
       |
       v
Review migration manually
       |
       v
Apply migration to Supabase
       |
       v
Verify schema
```

Never blindly apply an autogenerated migration to production.

Review:

- Foreign keys.
- Cascades.
- Unique constraints.
- Indexes.
- Check constraints.
- Server defaults.
- Nullable fields.
- Timestamp types.

---

# 26. Recommended Development Sequence

## Phase 1 — Foundation

- [x] FastAPI project exists.
- [x] React web project exists.
- [x] Authentication foundation exists.
- [x] Service scheduling foundation exists.
- [x] Attendance endpoints exist.
- [x] Admin attendance view exists.

## Phase 2 — Database hardening

- [ ] Review all SQLAlchemy models against this specification.
- [ ] Add/verify all constraints.
- [ ] Add/verify indexes.
- [ ] Add service participant model and relationships.
- [ ] Add attendance checks.
- [ ] Normalize attendance source values.
- [ ] Verify migration structure.
- [ ] Create initial Alembic migration.
- [ ] Apply and verify in Supabase.

## Phase 3 — Attendance authorization

- [ ] Implement service eligibility checking.
- [ ] Direct-user participant matching.
- [ ] Department participant matching.
- [ ] Reject unauthorized clock-in.
- [ ] Validate service status.
- [ ] Validate church ownership.
- [ ] Add audit events where appropriate.

## Phase 4 — Online attendance hardening

- [ ] Finalize clock-in window.
- [ ] Finalize clock-out rules.
- [ ] Normalize timestamps.
- [ ] Add database check for clock-out >= clock-in.
- [ ] Add device information where applicable.
- [ ] Test duplicate requests.
- [ ] Test concurrent clock-in requests.

## Phase 5 — React Native mobile app

- [ ] Create React Native project.
- [ ] Implement authentication.
- [ ] Secure local session storage.
- [ ] Build dashboard.
- [ ] Build service list.
- [ ] Build clock-in/out UI.
- [ ] Add device registration.
- [ ] Add SQLite.

## Phase 6 — Offline attendance

- [ ] Local service cache.
- [ ] Local attendance table.
- [ ] Sync queue.
- [ ] Generate client event IDs.
- [ ] Offline clock-in.
- [ ] Offline clock-out.
- [ ] Connectivity detection.
- [ ] Background/manual sync.
- [ ] Retry strategy.
- [ ] Sync status UI.

## Phase 7 — Synchronization backend

- [ ] Sync endpoint.
- [ ] Idempotency checks.
- [ ] Event validation.
- [ ] Server timestamps.
- [ ] Conflict handling.
- [ ] Rejected-event handling.
- [ ] Device last-sync tracking.

## Phase 8 — Admin platform

- [ ] User management.
- [ ] Department management.
- [ ] Service participant management.
- [ ] Attendance analytics.
- [ ] Reports.
- [ ] Search/filtering.
- [ ] Exports.

## Phase 9 — Security/testing

- [ ] Authentication tests.
- [ ] Authorization tests.
- [ ] Tenant isolation tests.
- [ ] Attendance tests.
- [ ] Offline sync tests.
- [ ] Duplicate event tests.
- [ ] Device revocation tests.
- [ ] Input validation tests.
- [ ] Rate limiting.
- [ ] Logging/monitoring.

## Phase 10 — Production deployment

- [ ] Production environment variables.
- [ ] HTTPS.
- [ ] Database backups.
- [ ] Migration process.
- [ ] API deployment.
- [ ] Web deployment.
- [ ] Mobile release build.
- [ ] Monitoring.
- [ ] Disaster recovery plan.

---

# 27. Testing Strategy

Testing should be built alongside features, not only at the end.

## Unit tests

Test:

- Attendance state calculation.
- Clock-in window calculation.
- Service eligibility.
- Scheduling.
- Token/session behavior.
- Sync event processing.

## API tests

Test:

- Login.
- Registration.
- Unauthorized access.
- Cross-church access.
- Clock-in.
- Clock-out.
- Duplicate clock-in.
- Duplicate clock-out.
- Cancelled service.
- Service restriction.
- Offline event synchronization.

## Integration tests

Test:

```text
Mobile/local event
        ↓
Sync API
        ↓
Database
        ↓
Attendance record
```

## Concurrency tests

Two clock-in requests sent at almost the same time must still produce only one attendance record.

The database unique constraint is the final protection.

---

# 28. Important Edge Cases

The implementation should eventually handle:

- User clocks in twice.
- User clocks out twice.
- User clocks out without clocking in.
- Service is cancelled after local data was synchronized.
- User is removed from a department after service data was cached.
- User loses internet immediately after clock-in.
- Internet returns but server response was lost.
- User's device clock is wrong.
- User's session expires while offline.
- Same account uses multiple devices.
- Device is revoked.
- User is deactivated while offline.
- Service occurrence is changed after local synchronization.
- Two devices attempt attendance for the same user/service.
- Server receives the same sync event multiple times.

These cases should influence the final synchronization and security design.

---

# 29. Device and Session Management

Future device management should allow administrators to see:

```text
Device name
Platform
App version
Last seen
Last sync
Active/revoked status
```

A compromised/lost device should be revocable.

When revoked:

- Existing sessions should be invalidated where appropriate.
- Offline access should eventually expire.
- New synchronization requests should be rejected.

---

# 30. Audit and Observability

Important events should be auditable.

At minimum track:

- Authentication events.
- User creation/modification.
- Role changes.
- Department changes.
- Service creation/modification/cancellation.
- Attendance administrative modifications.
- Device registration/revocation.
- Synchronization failures.

Production should also have application logs for:

- Errors.
- Slow requests.
- Database failures.
- Authentication failures.
- Sync failures.

Do not log passwords, raw refresh tokens or other sensitive credentials.

---

# 31. Backup and Recovery

Because attendance is historical business data, database backup is essential.

Production plan should include:

- Automated PostgreSQL backups.
- Recovery testing.
- Migration backups.
- Disaster recovery documentation.
- Clear retention policy.

Audit and attendance records should not be casually deleted in production.

---

# 32. Performance and Scaling

The first version can run comfortably with a standard FastAPI/PostgreSQL architecture.

As usage grows:

- Index high-frequency query columns.
- Paginate attendance history.
- Paginate admin tables.
- Cache appropriate service data.
- Batch sync events.
- Avoid N+1 ORM queries.
- Add background jobs for heavy reporting.
- Consider read replicas only when actual load requires them.

Do not prematurely introduce distributed architecture.

---

# 33. Future Architecture Evolution

The core model is deliberately flexible enough to grow into:

```text
Church
  |
  +-- Campuses
  |
  +-- Members
  |
  +-- Visitors
  |
  +-- Departments
  |
  +-- Services
  |
  +-- Attendance
  |
  +-- Events
  |
  +-- Notifications
  |
  +-- Reports
```

The attendance system should remain a clean domain within the larger platform.

---

# 34. Suggested Future Modules

When the attendance platform is stable, possible modules include:

## Members

- Member profiles.
- Membership status.
- Contact information.
- Department membership.
- Join date.

## Visitors

- Visitor registration.
- First-time visitor tracking.
- Follow-up workflow.

## Events

- Conferences.
- Meetings.
- Trainings.
- Special programs.

## Notifications

- Service reminders.
- Missed attendance reminders.
- Admin alerts.

## Analytics

- Attendance trends.
- Department performance.
- Service popularity.
- Retention patterns.

---

# 35. Project Definition of Done

The core project should not be considered complete until all of the following are true:

### Authentication

- [ ] Secure registration.
- [ ] Secure login.
- [ ] Secure token/session management.
- [ ] Logout.
- [ ] Session revocation.

### Services

- [ ] Recurring services.
- [ ] One-off special services.
- [ ] Service occurrences.
- [ ] Service status.
- [ ] Participant restrictions.

### Attendance

- [ ] Online clock-in.
- [ ] Online clock-out.
- [ ] Offline clock-in.
- [ ] Offline clock-out.
- [ ] Reliable synchronization.
- [ ] Duplicate protection.
- [ ] Time integrity.

### Administration

- [ ] User management.
- [ ] Department management.
- [ ] Service management.
- [ ] Attendance monitoring.
- [ ] Reports.

### Security

- [ ] Password hashing.
- [ ] Authorization.
- [ ] Tenant isolation.
- [ ] Audit logs.
- [ ] Device/session control.

### Reliability

- [ ] Database constraints.
- [ ] Error handling.
- [ ] Offline queue.
- [ ] Retry handling.
- [ ] Backups.
- [ ] Automated tests.

---

# 36. Immediate Next Steps

Based on the current uploaded implementation, the recommended immediate development order is:

```text
1. Review/clean current SQLAlchemy models
        ↓
2. Implement service participant relationships
        ↓
3. Enforce participant eligibility in attendance.py
        ↓
4. Enforce service status and attendance rules
        ↓
5. Normalize ONLINE/OFFLINE attendance source
        ↓
6. Add device registration
        ↓
7. Build React Native mobile app
        ↓
8. Add SQLite local database
        ↓
9. Build offline clock-in/out
        ↓
10. Build sync queue
        ↓
11. Build FastAPI synchronization endpoint
        ↓
12. Add idempotency/conflict handling
        ↓
13. Expand admin dashboard
        ↓
14. Add reports
        ↓
15. Security + automated testing
        ↓
16. Production deployment
```

---

# 37. Final Architecture Summary

The intended final system is:

```text
                         CHURCH
                            |
          +-----------------+------------------+
          |                 |                  |
        USERS          DEPARTMENTS         SERVICES
          |                 |                  |
          |                 |          +-------+-------+
          |                 |          |               |
          +-------- USER_DEPARTMENTS  TEMPLATES    OCCURRENCES
          |                                      |
          |                                      |
          +---------------- ATTENDANCE ----------+
          |
          +---- DEVICES ---- SYNC EVENTS
          |
          +---- AUTH SESSIONS
          |
          +---- AUDIT LOGS

                  CENTRAL DATABASE
                 SUPABASE POSTGRES
                         ^
                         |
                    FastAPI API
                         ^
                         |
               +---------+---------+
               |                   |
          React Web          React Native
                                   |
                                SQLite
                                   |
                              Sync Queue
```

The guiding principle is:

> **Build the core correctly first, then add complexity only when it solves a real requirement.**

The most important architectural decision is that **attendance is tied to a service occurrence**, while **offline mobile operation is handled through local SQLite plus an idempotent synchronization layer**.

This gives the project a clean foundation for becoming a much larger church management platform later without having to rebuild the attendance core.
