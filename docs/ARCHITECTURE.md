# LMS – System Architecture Documentation

> **System:** Locker Management System (LMS)
> **Stack:** Laravel 11 · Inertia.js · React 18 · Vite · Tailwind CSS v3 · DaisyUI · Radix UI (shadcn-style)
> **Last Updated:** 2026-05-18

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Technology Stack](#2-technology-stack)
3. [Application Architecture](#3-application-architecture)
4. [Directory Structure](#4-directory-structure)
5. [Database Architecture](#5-database-architecture)
6. [Authentication & SSO](#6-authentication--sso)
7. [Backend Layer Detail](#7-backend-layer-detail)
8. [Frontend Layer Detail](#8-frontend-layer-detail)
9. [External Integrations](#9-external-integrations)
10. [Environment Configuration](#10-environment-configuration)
11. [Key Design Decisions](#11-key-design-decisions)
12. [Data Flow Diagrams](#12-data-flow-diagrams)

---

## 1. System Overview

LMS is an internal web application for managing locker assignments within the organization. It handles two separate locker pools (regular employee lockers and admin lockers), enforces SSO-based access control, and provides full audit logging on all changes.

**Core capabilities:**
- Assign, transfer, update, and delete lockers for employees
- Bulk import via Excel upload
- Export locker data to Excel
- Full audit history per locker
- Admin user management
- Maintenance mode toggle
- System access restricted to registered locker users only

---

## 2. Technology Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| Backend Framework | Laravel | 11.x | HTTP handling, routing, ORM, middleware |
| Frontend Bridge | Inertia.js | Latest | SPA-like navigation without API overhead |
| Frontend Framework | React | 18.x | UI components and state management |
| Build Tool | Vite | Latest | Hot module replacement, asset bundling |
| CSS Framework | Tailwind CSS | v3 | Utility-first styling |
| UI Components | DaisyUI | Latest | Tailwind component layer (theme variables) |
| UI Primitives | Radix UI (shadcn-style) | Latest | Accessible headless components |
| Toast Notifications | Sonner | Latest | Non-blocking notification system |
| Excel Processing | PhpSpreadsheet | Latest | Parse and generate XLSX files |
| ORM | Eloquent | (Laravel built-in) | Database abstraction |
| Session Driver | File | – | Session persistence (12-hour lifetime) |

---

## 3. Application Architecture

### 3.1 Three-Layer Backend Pattern

All business logic strictly follows Controller → Service → Repository:

```
HTTP Request
    │
    ▼
┌─────────────────────────────────────┐
│           CONTROLLER                │  app/Http/Controllers/
│  - Validates incoming HTTP requests │
│  - Calls one service                │
│  - Returns Inertia page or redirect │
└──────────────────┬──────────────────┘
                   │
                   ▼
┌─────────────────────────────────────┐
│             SERVICE                 │  app/Services/
│  - All business logic               │
│  - Cross-cutting concerns           │
│  - Orchestrates repositories        │
│  - Throws ValidationException       │
└──────────────────┬──────────────────┘
                   │
                   ▼
┌─────────────────────────────────────┐
│           REPOSITORY                │  app/Repositories/
│  - All database queries             │
│  - Accepts / returns Eloquent models│
│  - No business logic                │
└──────────────────┬──────────────────┘
                   │
                   ▼
              Database(s)
```

### 3.2 Frontend Architecture

```
app.jsx (Inertia boot + ThemeProvider + Toaster)
    │
    ▼
AuthenticatedLayout.jsx
    ├── SideBar.jsx (navigation + admin system-status toggle)
    ├── NavBar.jsx  (user info + theme toggle + logout)
    └── [Page Component]  (resources/js/Pages/...)
            └── [UI Components]  (resources/js/Components/ui/...)
```

### 3.3 Route Architecture

```
routes/web.php  (main router — includes sub-files)
    ├── routes/auth.php       → logout, unauthorized
    ├── routes/general.php    → dashboard, profile, admin management  [AuthMiddleware]
    ├── routes/lockers.php    → locker CRUD + API endpoints           [AuthMiddleware]
    └── Fallback              → 404 Inertia page
```

All authenticated routes are prefixed with the `APP_NAME` environment variable (e.g., `/lms/dashboard`).

---

## 4. Directory Structure

```
LMS/
├── app/
│   ├── Http/
│   │   ├── Controllers/
│   │   │   ├── AuthenticationController.php     SSO logout
│   │   │   ├── DashboardController.php           Dashboard render
│   │   │   ├── EmployeeSearchController.php      Live employee search API
│   │   │   ├── LockerCodeController.php           Regular locker CRUD
│   │   │   ├── AdminLockerCodeController.php      Admin locker CRUD
│   │   │   ├── LockerUsersController.php          Authorized users management
│   │   │   └── General/
│   │   │       ├── AdminController.php            Admin role management
│   │   │       └── ProfileController.php          Profile & password
│   │   └── Middleware/
│   │       ├── AuthMiddleware.php                 SSO token validation
│   │       ├── AdminMiddleware.php                Admin-only route guard
│   │       └── HandleInertiaRequests.php          Shared Inertia props
│   ├── Models/
│   │   ├── LockerCode.php                         Regular lockers (locker_codes)
│   │   ├── AdminLockerCode.php                    Admin lockers (admin_locker_codes)
│   │   ├── LockerLogs.php                         Audit log (polymorphic)
│   │   ├── LockerUsers.php                        Authorized app users
│   │   ├── User.php                               Masterlist (HR DB read-only)
│   │   ├── Masterlist.php                         HR DB alternate model
│   │   └── SystemStatus.php                       Maintenance mode state
│   ├── Services/
│   │   ├── LockerCodeService.php
│   │   ├── AdminLockerCodeService.php
│   │   ├── EmployeeService.php
│   │   ├── LockerUsersService.php
│   │   ├── SystemStatusService.php
│   │   └── DataTableService.php                   Generic table/search/export
│   ├── Repositories/
│   │   ├── LockerCodeRepository.php
│   │   ├── AdminLockerCodeRepository.php
│   │   ├── EmployeeRepository.php
│   │   ├── LockerUsersRepository.php
│   │   └── SystemStatusRepository.php
│   └── Traits/
│       └── Loggable.php                           Auto-audit-log on model events
├── config/
│   ├── database.php                               3 DB connections defined
│   └── app.php
├── routes/
│   ├── web.php, auth.php, general.php, lockers.php
├── resources/js/
│   ├── app.jsx                                    Inertia boot + ThemeProvider
│   ├── Pages/
│   │   ├── Dashboard.jsx
│   │   ├── Profile.jsx
│   │   ├── Lockers/
│   │   │   ├── Index.jsx                          Regular locker page
│   │   │   ├── AdminIndex.jsx                     Admin locker page
│   │   │   ├── LockerPageLayout.jsx               Shared table UI (both)
│   │   │   └── components/                        Dialogs (form, delete, transfer, etc.)
│   │   └── Admin/
│   │       ├── Admin.jsx                          Admin user list
│   │       └── NewAdmin.jsx                       Add new admin
│   ├── Components/
│   │   ├── NavBar.jsx
│   │   ├── ThemeContext.jsx
│   │   ├── sidebar/
│   │   │   ├── SideBar.jsx
│   │   │   └── Navigation.jsx
│   │   └── ui/                                    shadcn/Radix UI components
│   ├── Layouts/
│   │   ├── AuthenticatedLayout.jsx
│   │   └── GuestLayout.jsx
│   └── lib/utils.js                               cn() utility
└── docs/
    ├── ARCHITECTURE.md                            (this file)
    └── TURNOVER.md
```

---

## 5. Database Architecture

### 5.1 Three Database Connections

The application connects to three separate databases. These are configured in `config/database.php` and referenced via Laravel's `DB::connection()` or Eloquent's `$connection` property.

```
┌─────────────────────────────────────────────────────────┐
│                     LMS Application                     │
└──────────┬──────────────────┬──────────────────┬────────┘
           │                  │                  │
           ▼                  ▼                  ▼
   ┌──────────────┐  ┌──────────────────┐  ┌──────────────┐
   │   default    │  │   masterlist     │  │   authify    │
   │  (main app)  │  │  (HR database)   │  │    (SSO)     │
   │  localhost   │  │ 192.168.1.28     │  │ 192.168.2.221│
   │   lms DB     │  │ tspi_hr_db       │  │   authify DB │
   │  READ/WRITE  │  │   READ ONLY      │  │  READ ONLY   │
   └──────────────┘  └──────────────────┘  └──────────────┘
```

### 5.2 Main Database Tables (default connection)

#### `locker_codes`
Stores regular employee locker assignments.

| Column | Type | Notes |
|--------|------|-------|
| id | INT PK | Auto-increment |
| locker_no | VARCHAR(100) | Unique locker identifier |
| employ_id | VARCHAR(50) | Employee ID (nullable = vacant) |
| passcode | VARCHAR(50) | Locker passcode (nullable) |
| remarks | TINYINT | 1=Active, 2=Vacant, 3=Inactive, 4=Temporary |
| notes | VARCHAR(255) | Optional notes |
| created_by | VARCHAR(100) | Employee ID who created |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

#### `admin_locker_codes`
Identical structure to `locker_codes` — used for admin personnel lockers.

#### `locker_logs`
Polymorphic audit log for all changes to lockers and locker users.

| Column | Type | Notes |
|--------|------|-------|
| id | INT PK | |
| loggable_type | VARCHAR | Model class (e.g., App\Models\LockerCode) |
| loggable_id | VARCHAR | Model PK (id or locker_no) |
| action_type | VARCHAR | CREATE / UPDATE / DELETE / RESTORE |
| action_by | VARCHAR | Employee ID who performed action |
| action_at | DATETIME | When action occurred |
| remarks | TEXT | Optional remark |
| metadata | JSON | Extra context |
| old_values | JSON | Values before UPDATE |
| new_values | JSON | Values after CREATE/UPDATE |
| related_type | VARCHAR | Related model (for linked records) |
| related_id | VARCHAR | Related model ID |

#### `locker_users`
Authorized users allowed to access the LMS application.

| Column | Type | Notes |
|--------|------|-------|
| id | INT PK | |
| employid | VARCHAR | Employee ID from masterlist |
| empname | VARCHAR | Employee full name |
| department | VARCHAR | Department |
| prodline | VARCHAR | Production line |
| station | VARCHAR | Work station |
| created_by / updated_by | VARCHAR | Audit fields |
| created_at / updated_at | TIMESTAMP | |

#### `admin`
Users with elevated system administration privileges.

| Column | Type | Notes |
|--------|------|-------|
| id | INT PK | |
| emp_id | VARCHAR | Employee ID |
| emp_name | VARCHAR | Employee name |
| emp_role | VARCHAR | Role (e.g., superadmin, admin) |
| last_updated_by | VARCHAR | Who last changed this record |
| created_at | TIMESTAMP | |

#### `system_status`
Single-row table controlling maintenance mode.

| Column | Type | Notes |
|--------|------|-------|
| id | INT PK | Always ID = 1 |
| status | ENUM | 'online' or 'maintenance' |
| message | TEXT | Maintenance message shown to users |
| updated_at | TIMESTAMP | |

### 5.3 Masterlist Database (read-only, 192.168.1.28)

#### `employee_masterlist`
Source of truth for all employee data. All columns are UPPERCASE.

| Column | Type | Notes |
|--------|------|-------|
| EMPID | PK | Internal HR ID |
| EMPLOYID | VARCHAR | Employee number used in LMS |
| EMPNAME | VARCHAR | Full name |
| JOB_TITLE | VARCHAR | Job title / position |
| DEPARTMENT | VARCHAR | Department |
| PRODLINE | VARCHAR | Production line |
| STATION | VARCHAR | Station |
| DATEHIRED | DATE | Hire date |
| EMAIL | VARCHAR | Work email |
| PASSWRD | VARCHAR | Password (hashed or plain) |
| ACCSTATUS | TINYINT | 1 = Active, 2 = Inactive |

### 5.4 Authify Database (read-only, 192.168.2.221:3307)

#### `authify_sessions`
SSO session tokens managed by the external Authify system.

| Column | Type | Notes |
|--------|------|-------|
| token | VARCHAR PK | Unique session token |
| emp_id | VARCHAR | Employee number |
| emp_name | VARCHAR | Full name |
| emp_firstname | VARCHAR | First name only |
| emp_jobtitle | VARCHAR | Job title |
| emp_dept | VARCHAR | Department |
| emp_prodline | VARCHAR | Production line |
| emp_station | VARCHAR | Station |
| emp_position | VARCHAR | Position |
| emp_from | VARCHAR | Source system (NULL = direct login) |
| generated_at | DATETIME | When token was created |

---

## 6. Authentication & SSO

### 6.1 How It Works

LMS does **not** use Laravel's built-in authentication. All auth is handled by `AuthMiddleware`, which validates tokens issued by an external Authify SSO system.

```
Token Resolution Priority:
  1. ?key={token}  (query parameter — first login redirect from SSO)
  2. Cookie: sso_token  (subsequent requests)
  3. session('emp_data.token')  (server-side session)
```

### 6.2 AuthMiddleware Logic

```
Request arrives
    │
    ├─ Has token? ─── NO ──→ Redirect to Authify login page
    │                         http://192.168.2.221:8200/login?redirect={encoded_callback}
    │
    ├─ Token in session already? ──→ Skip DB lookup, proceed
    │
    ├─ Look up token in authify_sessions table
    │       │
    │       ├─ Not found ──→ Redirect to Authify login
    │       │
    │       ├─ emp_from NOT NULL ──→ Unauthorized (cross-system token)
    │       │
    │       └─ emp_id NOT IN locker_users ──→ Unauthorized 403
    │
    ├─ Maintenance mode ON? ──→ Show maintenance page (bypass: logout + system-status routes)
    │
    ├─ Store session('emp_data') with all employee fields
    ├─ Set sso_token cookie (7-day expiry)
    └─ If ?key in URL → redirect to clean URL (strip query param)
```

### 6.3 Session Data Structure

```javascript
session('emp_data') = {
    token:          string,   // SSO token
    emp_id:         string,   // Employee number
    emp_name:       string,   // Full name
    emp_firstname:  string,   // First name
    emp_jobtitle:   string,   // Job title
    emp_dept:       string,   // Department
    emp_prodline:   string,   // Production line
    emp_station:    string,   // Station
    emp_position:   string,   // Position
    generated_at:   string,   // Token creation time
}
```

### 6.4 AdminMiddleware

Sits on top of AuthMiddleware for admin-only routes.

```
Request (already auth'd)
    │
    └─ emp_id in admin table? ──── NO ──→ Redirect to dashboard
                              ──── YES──→ Proceed
```

---

## 7. Backend Layer Detail

### 7.1 Controllers

| Controller | File | Responsibility |
|-----------|------|---------------|
| AuthenticationController | Controllers/ | SSO logout — clears session, redirects to Authify logout URL |
| DashboardController | Controllers/ | Renders Dashboard Inertia page |
| EmployeeSearchController | Controllers/ | `GET /api/employees/search` — paginated live search returning Combobox-compatible options |
| LockerCodeController | Controllers/ | Full CRUD for regular lockers + upload/export/transfer/history |
| AdminLockerCodeController | Controllers/ | Identical to above, operates on admin_locker_codes table |
| LockerUsersController | Controllers/ | Manage who is allowed to access the LMS app |
| AdminController | Controllers/General/ | Admin role management (add/remove/change role) |
| ProfileController | Controllers/General/ | Profile display + password change |

### 7.2 Services (Business Logic)

#### LockerCodeService / AdminLockerCodeService

**Status auto-computation** — `computeRemarks(?string $employId)`:
```
employ_id is null/empty  →  VACANT (2)
employ_id = "Others"     →  TEMPORARY (4)
ACCSTATUS = 2 (inactive) →  INACTIVE (3)
ACCSTATUS = 1 (active)   →  ACTIVE (1)
```

Key validations before create/update:
- Locker number must be unique (`ensureLockerNotTaken`)
- Employee must not already have a locker (`ensureEmployeeNotAssigned`)

Bulk upload optimization: fetches ALL employee ACCSTATUS values in a single query before processing rows (avoids N+1).

#### DataTableService

Generic utility used by AdminController and DemoController. Supports:
- Multi-column fuzzy search
- Date range filtering
- Custom WHERE conditions
- JOIN support
- CSV export (streamed response)
- Pagination

### 7.3 Repositories

Repositories own all SQL queries. They accept raw data, call Eloquent, and return models or collections. They contain zero business logic.

### 7.4 Loggable Trait

Applied to: `LockerCode`, `AdminLockerCode`, `LockerUsers`

Hooks into Eloquent model events automatically:
```
Model::created  →  writeLog('CREATE')   records new_values
Model::updated  →  writeLog('UPDATE')   records old_values + new_values
Model::deleted  →  writeLog('DELETE')   records old_values
```

All log entries capture:
- `action_by` → current logged-in employee ID from session
- `action_at` → current timestamp (Asia/Manila)
- Full before/after values as JSON

---

## 8. Frontend Layer Detail

### 8.1 Inertia.js Bridge

Inertia eliminates the need for a REST API between Laravel and React. Controllers return `Inertia::render('Page/Name', $props)` which React receives as component props. Navigation uses `router.get()` / `router.post()` from the `@inertiajs/react` package — no full page reloads.

### 8.2 Shared Props (HandleInertiaRequests)

Available on every page via `usePage().props`:

| Prop | Source | Usage |
|------|--------|-------|
| `emp_data` | `session('emp_data')` | Current user info in all pages |
| `flash.success` | Session flash | Show success toasts |
| `flash.error` | Session flash | Show error toasts |
| `appName` | `config('app.name')` | URL prefix, branding |
| `display_name` | `APP_DISPLAY_NAME` env | Sidebar title |
| `auth.user` | `request->user()` | Laravel auth user (if used) |

### 8.3 Key Pages

#### LockerPageLayout (`resources/js/Pages/Lockers/LockerPageLayout.jsx`)

Shared component used by both `Index.jsx` (regular lockers) and `AdminIndex.jsx` (admin lockers). Accepts a `config` prop with route names and API endpoints so the same layout serves both pools.

**State managed:**
- Search text + remark filter (persisted via Inertia router.get on apply)
- Dialog open states: formDialog, deleteRow, transferRow, historyRow, showUpload
- Upload errors (shown in AlertDialog)
- Fullscreen mode (browser Fullscreen API)

**Locker Status Count Display:**
- Badges above the filter bar showing count per status (Active N, Vacant N, etc.)
- Data comes from `statusCounts` prop (backend `countByRemarks()`)

#### LockerFormDialog (`components/LockerFormDialog.jsx`)
- Create or Edit mode based on `row` prop
- Employee Combobox with live search (calls `/api/employees/search`)
- Fields: Locker No, Employee (combobox), Passcode, Notes
- Submits via `router.post` / `router.put`

#### TransferDialog (`components/TransferDialog.jsx`)
- Shows current locker info
- Destination combobox (calls `/api/lockers/available` or `/api/admin-lockers/available`)
- Only vacant or inactive lockers appear as options
- Submits via `router.post` to transfer route

#### HistoryDialog (`components/HistoryDialog.jsx`)
- Fetches audit log for a locker via `GET /{id}/history` (JSON)
- Paginated, shows action type, who, when, old→new values

### 8.4 Theme System

- `ThemeContext.jsx` manages light/dark preference
- Stored in `localStorage` as `'light'` or `'dark'`
- Applies `class="dark"` on `document.documentElement` (shadcn compatibility)
- Applies `data-theme="..."` attribute (DaisyUI compatibility)

### 8.5 Toast Notifications

Sonner is mounted globally in `app.jsx`:
```jsx
<Toaster richColors theme={theme} position="top-center" />
```

Used with `toast.success()`, `toast.error()` throughout the app. Flash messages from Laravel redirects are also converted to toasts.

---

## 9. External Integrations

### 9.1 Authify SSO (192.168.2.221:8200)

| Direction | URL | Purpose |
|-----------|-----|---------|
| Outbound (redirect) | `http://192.168.2.221:8200/login?redirect={url}` | Send unauthenticated users to login |
| Inbound (redirect) | `/{APP_NAME}/?key={token}` | Authify redirects back with token |
| Outbound (redirect) | `http://192.168.2.221:8200/logout?token={t}&redirect={url}` | Logout from SSO session |
| DB (read) | authify DB → authify_sessions table | Validate token, get employee info |

### 9.2 HR Masterlist (192.168.1.28)

| Usage | Query | Purpose |
|-------|-------|---------|
| Employee search | `EMPLOYID LIKE %search% OR EMPNAME LIKE %search%` | Populate employee combobox |
| Employee names | `WHERE EMPLOYID IN (...)` bulk | Join names to locker list |
| ACCSTATUS lookup | `WHERE EMPLOYID IN (...)` bulk | Determine Active/Inactive status |
| Password change | `UPDATE employee_masterlist SET PASSWRD` | Profile password update |

---

## 10. Environment Configuration

### Required `.env` Variables

```dotenv
# Application
APP_NAME=LMS                          # Used as URL prefix (e.g. /lms/dashboard)
APP_DISPLAY_NAME="LMS"                # Shown in the sidebar header
APP_ENV=production
APP_DEBUG=false
APP_URL=http://your-server-ip
APP_TIMEZONE=Asia/Manila

# Main Application Database
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=lms
DB_USERNAME=your_db_user
DB_PASSWORD=your_db_password

# HR Masterlist Database (read-only)
MDB_HOST=192.168.1.28
MDB_PORT=3306
MDB_DATABASE=tspi_hr_db
MDB_USERNAME=masterlist_user
MDB_PASSWORD=masterlist_password

# Authify SSO Database (read-only)
ADB_HOST=192.168.2.221
ADB_PORT=3307
ADB_DATABASE=authify
ADB_USERNAME=authify_user
ADB_PASSWORD=authify_password

# Session
SESSION_DRIVER=file
SESSION_LIFETIME=720       # 12 hours in minutes

# Vite (passed to frontend)
VITE_APP_NAME="${APP_NAME}"
```

---

## 11. Key Design Decisions

### Why SSO instead of Laravel Auth?
The organization uses a centralized Authify SSO system. LMS integrates as a client, reading session tokens from the shared authify database. This means user accounts and passwords are managed externally.

### Why three separate DB connections?
- **default** — LMS owns this. Full read/write.
- **masterlist** — Owned by HR. LMS reads employee data but must not write (except PASSWRD for password change).
- **authify** — Owned by the SSO system. LMS reads tokens to validate sessions.

### Why Loggable trait instead of manual logging?
Attaching to Eloquent model events ensures no change goes unlogged, even if a developer forgets to call a log method. It captures before/after values automatically.

### Why LockerPageLayout shared between regular and admin lockers?
Both locker pools have identical UI and behavior. The only differences are route names and the underlying table. Passing a `config` object lets one component serve both, eliminating duplication.

### Why status (remarks) is auto-computed?
Users should not manually set a locker to "Active" or "Inactive" — that must reflect the actual state of the assigned employee in the HR system. Auto-computation via `computeRemarks()` prevents data inconsistency.

---

## 12. Data Flow Diagrams

### Login Flow
```
Browser                    LMS App                 Authify           HR Masterlist DB
   │                          │                       │                      │
   │ GET /lms/dashboard        │                       │                      │
   │──────────────────────────▶│                       │                      │
   │                          │ No token → redirect    │                      │
   │◀─────────────────────────│                       │                      │
   │                                                   │                      │
   │ GET http://authify/login?redirect={url}            │                      │
   │──────────────────────────────────────────────────▶│                      │
   │ Enter credentials                                 │                      │
   │──────────────────────────────────────────────────▶│                      │
   │                                                   │ Create authify_session│
   │                                                   │───────────────────────▶ (authify DB)
   │ GET /lms/?key={token}                             │                      │
   │──────────────────────────▶│                       │                      │
   │                          │ Look up token in authify_sessions             │
   │                          │───────────────────────▶│                      │
   │                          │ Check employee in locker_users (main DB)      │
   │                          │ Store session('emp_data')                     │
   │                          │ Set sso_token cookie                          │
   │                          │ Redirect to clean URL                         │
   │◀─────────────────────────│                       │                      │
   │ GET /lms/dashboard (with cookie)                  │                      │
   │──────────────────────────▶│                       │                      │
   │                          │ Token in session → proceed                    │
   │ Dashboard Page            │                       │                      │
   │◀─────────────────────────│                       │                      │
```

### Create Locker Flow
```
Browser (React)               Controller          Service             Repository       DBs
   │                              │                  │                    │              │
   │ Fill form → Submit           │                  │                    │              │
   │─────────────────────────────▶│                  │                    │              │
   │                              │ Validate request │                    │              │
   │                              │─────────────────▶│                    │              │
   │                              │                  │ ensureLockerNotTaken              │
   │                              │                  │───────────────────▶│              │
   │                              │                  │                    │ SELECT locker_codes WHERE locker_no
   │                              │                  │◀───────────────────│              │
   │                              │                  │ ensureEmployeeNotAssigned         │
   │                              │                  │───────────────────▶│              │
   │                              │                  │                    │ SELECT locker_codes WHERE employ_id
   │                              │                  │◀───────────────────│              │
   │                              │                  │ getAccStatusById(employ_id)       │
   │                              │                  │──────────────────────────────────▶│ masterlist DB
   │                              │                  │◀──────────────────────────────────│
   │                              │                  │ computeRemarks()   │              │
   │                              │                  │ (ACCSTATUS → remarks)             │
   │                              │                  │───────────────────▶│              │
   │                              │                  │                    │ INSERT locker_codes
   │                              │                  │◀───────────────────│              │
   │                              │                  │                    │ Loggable: INSERT locker_logs
   │                              │ back()->with(success)                 │              │
   │◀─────────────────────────────│                  │                    │              │
   │ Toast: "Locker created"       │                  │                    │              │
```

### Bulk Upload Flow
```
User           UploadDialog       Controller           Service            Repository
  │               │                   │                   │                   │
  │ Select file   │                   │                   │                   │
  │──────────────▶│                   │                   │                   │
  │ Submit        │                   │                   │                   │
  │──────────────────────────────────▶│                   │                   │
  │               │                   │ Parse XLSX (PhpSpreadsheet)           │
  │               │                   │ Call service.upload(rows)             │
  │               │                   │──────────────────▶│                   │
  │               │                   │                   │ Bulk fetch ACCSTATUS for all emp IDs
  │               │                   │                   │──────────────────▶│ masterlist DB
  │               │                   │                   │◀──────────────────│
  │               │                   │                   │ For each row:     │
  │               │                   │                   │   validate,       │
  │               │                   │                   │   computeRemarks, │
  │               │                   │                   │   create/update   │
  │               │                   │                   │──────────────────▶│ main DB
  │               │                   │ redirect with upload_result session   │
  │◀──────────────────────────────────│                   │                   │
  │ Toast: "X rows imported"          │                   │                   │
  │ (if errors: show error dialog)    │                   │                   │
```
