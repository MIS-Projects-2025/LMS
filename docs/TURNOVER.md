# LMS – Turnover & Process Documentation

> **System:** Locker Management System (LMS)
> **Stack:** Laravel 11 · Inertia.js · React 18
> **Last Updated:** 2026-05-18

---

## Table of Contents

1. [System Purpose & Scope](#1-system-purpose--scope)
2. [User Roles & Access Levels](#2-user-roles--access-levels)
3. [How to Access the System](#3-how-to-access-the-system)
4. [Role-Based Feature Matrix](#4-role-based-feature-matrix)
5. [Process Flows — End User (Locker User)](#5-process-flows--end-user-locker-user)
6. [Process Flows — Admin / Superadmin](#6-process-flows--admin--superadmin)
7. [Process Flows — System Administrator (Developer/IT)](#7-process-flows--system-administrator-developerit)
8. [Locker Status Reference](#8-locker-status-reference)
9. [Audit Log Reference](#9-audit-log-reference)
10. [Common Troubleshooting](#10-common-troubleshooting)
11. [Developer Onboarding Checklist](#11-developer-onboarding-checklist)
12. [Deployment Notes](#12-deployment-notes)

---

## 1. System Purpose & Scope

The **Locker Management System (LMS)** is an internal web application that manages locker assignments for employees across the organization.

**What it manages:**

- **Regular Lockers** — assigned to rank-and-file employees (table: `locker_codes`)
- **Admin Lockers** — assigned to administrative/management personnel (table: `admin_locker_codes`)

**What it does NOT manage:**

- Physical locker hardware
- Employee master data (owned by HR's `tspi_hr_db`)
- User authentication credentials (owned by Authify SSO)

**Core processes:**

1. Assign a locker to an employee
2. Transfer an employee from one locker to another
3. Bulk-import locker data via Excel
4. Export locker data to Excel
5. View full change history per locker
6. Manage who can access the LMS app (Locker Users)
7. Manage who has admin privileges
8. Toggle system maintenance mode

---

## 2. User Roles & Access Levels

The system has **three distinct roles**. Roles are determined by two separate database tables and the SSO authorization check.

```
┌──────────────────────────────────────────────────────────────────┐
│                        ACCESS HIERARCHY                          │
│                                                                  │
│  Superadmin  ──────  Full access to everything                   │
│      ▲                                                           │
│  Admin       ──────  Locker management + admin user mgmt         │
│      ▲               (cannot manage other admins' roles)         │
│  Locker User ──────  Locker management only                      │
│      ▲               (no admin panel access)                     │
│  (blocked)   ──────  Anyone NOT in locker_users → Unauthorized   │
└──────────────────────────────────────────────────────────────────┘
```

### Role Definitions

#### Locker User (Regular)

- **Who:** Any employee registered in the `locker_users` table
- **Authenticated by:** Authify SSO + presence in `locker_users`
- **Can:** Access Lockers page, Admin Lockers page, Profile, change password
- **Cannot:** Access Admin panel, manage system roles, add/remove locker users, toggle maintenance mode

#### Admin

- **Who:** Locker Users who are also in the `admin` table with `emp_role = 'admin'`
- **Can:** Everything a Locker User can + access Admin panel, add/remove admins, manage locker users, toggle maintenance mode
- **Cannot:** Change another admin's role to superadmin, remove a superadmin

#### Superadmin

- **Who:** In the `admin` table with `emp_role = 'superadmin'`
- **Can:** Everything — full system access, change any admin's role, remove any admin
- **Note:** There should always be at least one active superadmin

#### Unauthenticated / Unauthorized

- **Not in SSO:** Redirected to Authify login page
- **In SSO but not in `locker_users`:** Shown Unauthorized page (403)

---

## 3. How to Access the System

### 3.1 First-Time Login (Any User)

1. Open a browser and navigate to the LMS URL (e.g., `http://[server-ip]/lms/`)
2. Since you have no session, you are automatically redirected to the Authify SSO login page
3. Enter your **employee credentials** (Employee ID + Password)
4. Authify validates and redirects back to LMS with a session token in the URL (`?key=...`)
5. LMS validates the token:
    - If your Employee ID is **not** in `locker_users` → you see the **Unauthorized** page; contact your system admin to be added
    - If your Employee ID **is** in `locker_users` → you are logged in and land on the Dashboard
6. A session cookie (`sso_token`) is set for 7 days. You will not need to log in again until it expires or you explicitly log out

### 3.2 Subsequent Visits

1. Navigate to the LMS URL
2. Your browser sends the `sso_token` cookie automatically
3. LMS validates the cookie against the Authify database
4. If valid → go directly to Dashboard
5. If expired or invalid → redirected to Authify login

### 3.3 Logging Out

1. Click your avatar in the top-right corner of the navigation bar
2. Click **Logout**
3. Your LMS session is cleared
4. You are redirected to Authify's logout page, which invalidates the token across all Authify-connected systems
5. You are returned to the Authify login page

---

## 4. Role-Based Feature Matrix

| Feature                             | Locker User |    Admin     | Superadmin |
| ----------------------------------- | :---------: | :----------: | :--------: |
| View Regular Lockers                |     ✅      |      ✅      |     ✅     |
| Add / Edit / Delete Regular Locker  |     ✅      |      ✅      |     ✅     |
| Transfer Regular Locker             |     ✅      |      ✅      |     ✅     |
| Bulk Upload Regular Lockers (Excel) |     ✅      |      ✅      |     ✅     |
| Export Regular Lockers (Excel)      |     ✅      |      ✅      |     ✅     |
| View Regular Locker History         |     ✅      |      ✅      |     ✅     |
| View Admin Lockers                  |     ✅      |      ✅      |     ✅     |
| Add / Edit / Delete Admin Locker    |     ✅      |      ✅      |     ✅     |
| Transfer Admin Locker               |     ✅      |      ✅      |     ✅     |
| Bulk Upload Admin Lockers (Excel)   |     ✅      |      ✅      |     ✅     |
| Export Admin Lockers (Excel)        |     ✅      |      ✅      |     ✅     |
| View Profile                        |     ✅      |      ✅      |     ✅     |
| Change Password                     |     ✅      |      ✅      |     ✅     |
| View Admin Panel                    |     ❌      |      ✅      |     ✅     |
| Add / Remove Admins                 |     ❌      |      ✅      |     ✅     |
| Change Admin Roles                  |     ❌      | ✅ (limited) | ✅ (full)  |
| Manage Locker Users (add/remove)    |     ❌      |      ✅      |     ✅     |
| Toggle Maintenance Mode             |     ❌      |      ✅      |     ✅     |
| Download Excel Template             |     ✅      |      ✅      |     ✅     |

---

## 5. Process Flows — End User (Locker User)

### 5.1 View Lockers

**Entry point:** Sidebar → "Lockers" (or "Admin Lockers")

**Steps:**

1. Page loads showing the locker table with all records
2. Status count badges are displayed at the top (Active N, Vacant N, Inactive N, Temporary N)
3. Default sort: by Locker Number ascending
4. Default page size: 10 rows

**Filtering:**

1. Type in the **Search** box to filter by Locker Number or Employee ID
2. Press **Enter** or click the **Search** button to apply
3. Use the **Status** dropdown to filter by a specific status (Active, Vacant, Inactive, Temporary) or leave as "All Status"
4. Use the **Rows per page** dropdown (10/15/25/50/100) to control how many rows show at once
5. Use the **Fullscreen** button (↗ icon) to expand the table to fill the browser window

**Pagination:**

- Click numbered page buttons at the bottom to navigate
- The footer shows "Showing X–Y of Z records"

---

### 5.2 Add a New Locker

**When to use:** A new physical locker exists and needs to be registered in the system, with or without an employee already assigned.

**Steps:**

1. Click the **+ (Plus)** button in the top-right toolbar
2. The **Add Locker** dialog opens
3. Fill in the fields:
    - **Locker No** _(required)_ — unique identifier for the locker (e.g., "L-001", "A-042")
    - **Employee** _(optional)_ — type 3+ characters to search; select from dropdown
        - If left blank → locker status will be **Vacant**
    - **Passcode** _(optional)_ — the locker's combination or code
    - **Notes** _(optional)_ — any additional information (max 255 characters)
4. Click **Save**

**What happens automatically:**

- Status is computed from the employee's `ACCSTATUS` in the HR database:
    - No employee assigned → **Vacant**
    - Employee assigned, ACCSTATUS = 1 → **Active**
    - Employee assigned, ACCSTATUS = 2 → **Inactive**
    - Employee ID = "Others" → **Temporary**
- The action is logged to the audit trail (locker_logs)

**Possible errors:**

- `Locker number [X] is already in use` — the locker number already exists in the system
- `Employee [X] is already assigned to a locker` — the chosen employee already has a locker

---

### 5.3 Edit a Locker

**When to use:** Update employee assignment, passcode, notes, or locker number.

**Steps:**

1. Find the locker row in the table
2. Click the **Pencil** (edit) icon in the Actions column
3. The **Edit Locker** dialog opens with current values pre-filled
4. Modify the fields as needed
5. Click **Save**

**Notes:**

- Status is automatically recomputed based on the new employee assignment
- Changing the employee: old employee's locker becomes vacant; new employee is assigned
- Locker number can be changed only if the new number is not already in use
- All changes are logged with before/after values

---

### 5.4 Transfer a Locker

**When to use:** An employee needs to move from their current locker to a different one (e.g., physical location change, locker repair).

**Steps:**

1. Find the **source** locker row (the employee's current locker)
2. Click the **Transfer** (arrows) icon in the Actions column
3. The **Transfer** dialog shows the current locker and employee details
4. In the **Destination Locker** field, type to search available lockers
    - Only **Vacant** and **Inactive** lockers appear as options
5. Select the destination locker
6. Click **Transfer**

**What happens automatically:**

- Employee, passcode are moved from the source locker to the destination
- Source locker status becomes **Vacant** (employee cleared)
- Destination locker status becomes **Active** (or **Inactive** if employee is inactive in HR)
- Both lockers' changes are logged to the audit trail

**Possible errors:**

- Destination locker is not vacant/inactive → will not appear in the dropdown
- Source locker not found → validation error

---

### 5.5 Delete a Locker

**When to use:** The physical locker no longer exists and should be removed from the system entirely.

**Steps:**

1. Find the locker row in the table
2. Click the **Trash** icon in the Actions column
3. A confirmation dialog appears: "Are you sure you want to delete locker [X]?"
4. Click **Delete** to confirm, or **Cancel** to abort

**Important:** This is a **hard delete** — the locker record is permanently removed. The audit log entry for this deletion remains in `locker_logs`.

---

### 5.6 View Locker History

**When to use:** You need to see who made changes to a locker and when.

**Steps:**

1. Find the locker row in the table
2. Click the **History** (clock) icon in the Actions column
3. The **History** dialog opens, showing a paginated list of all changes:
    - Action type (Created, Updated, Deleted)
    - Who performed the action (Employee ID)
    - When it happened (date and time)
    - What changed (old values → new values)
4. Use pagination controls in the dialog to see older entries

---

### 5.7 Bulk Upload via Excel

**When to use:** You have many lockers to add or update at once (e.g., initial data entry, mass reassignment).

**Steps:**

**Download the template first:**

1. Click the **Download** (arrow-down) icon in the toolbar
2. An Excel file (`lockers_template.xlsx`) is downloaded
3. Open it — it has headers: `Locker Number | Emp No | Passcode | Notes`

**Fill in the template:**

| Locker Number | Emp No | Passcode | Notes         |
| ------------- | ------ | -------- | ------------- |
| L-001         | EMP001 | 1234     | Near entrance |
| L-002         | Others | 5678     | Temp user     |
| L-003         |        |          |               |

- `Locker Number` — required
- `Emp No` — employee number (must exist in HR masterlist), or "Others" for temporary, or leave blank for vacant
- `Passcode` — optional
- `Notes` — optional

**Upload:**

1. Click the **Upload** (arrow-up) icon in the toolbar
2. The Upload dialog opens
3. Click **Choose File** and select your filled-in Excel file
4. Click **Upload**

**Results:**

- A toast notification shows: "Upload complete — X row(s) imported (Y created, Z updated)"
- If any rows had errors, an **Error Report** dialog appears listing which rows failed and why
- Rows with errors are **skipped** — all other valid rows are still imported

**Common upload errors:**

- `Locker Number is required` — empty locker number column
- `Employee No [X] is duplicated in the file` — same employee appears more than once in the uploaded file
- `Locker for this employee already exists` — employee already has a locker in the system (not from this upload)

---

### 5.8 Export to Excel

**When to use:** Generate a report of all lockers or lockers of a specific status.

**Steps:**

1. Click the **Spreadsheet** (grid) icon in the toolbar
2. A dropdown menu appears with options:
    - **All** — export every locker regardless of status
    - **Active** — export only Active lockers
    - **Vacant** — export only Vacant lockers
    - **Inactive** — export only Inactive lockers
    - **Temporary** — export only Temporary lockers
3. Click your desired option
4. An Excel file downloads immediately

**Export columns:** Locker Number, Emp No, Passcode, Status, Notes

---

### 5.9 Change Password (Profile)

**When to use:** You want to update your login password.

**Steps:**

1. Click your avatar in the top-right navigation bar
2. Click **Profile**
3. On the Profile page, click **Change Password**
4. A form appears with three fields:
    - **Current Password** — your existing password
    - **New Password** — the password you want to set
    - **Confirm New Password** — repeat the new password
5. Click **Update Password**

**Important warnings:**

- Changing your password **logs you out of all systems** connected to Authify (not just LMS)
- After a successful password change, you are automatically redirected to the SSO logout page and must log in again with the new password
- The password is stored in the HR masterlist database (`PASSWRD` column)

---

## 6. Process Flows — Admin / Superadmin

Admins have all capabilities of a Locker User, plus the following.

### 6.1 Access the Admin Panel

**Steps:**

1. In the sidebar, click **Admin**
2. The Admin panel shows a list of current admin users with their names, employee IDs, and roles
3. From here you can: view admins, add new admins, remove admins, change roles

---

### 6.2 Add a New Admin

**When to use:** An employee should be given admin access to the LMS.

**Steps:**

1. In the Admin panel, click **Add New Admin**
2. A searchable table of all active employees from the HR masterlist is shown
3. Find the employee you want to promote
4. Click **Add as Admin** next to their name
5. The employee is added to the `admin` table with role `admin` by default
6. They now have access to the Admin panel on their next login (or after their session refreshes)

**Note:** The employee must already be in `locker_users` to access the system. Adding them to `admin` gives elevated privileges but does not grant initial system access.

---

### 6.3 Remove an Admin

**When to use:** An employee no longer needs admin access.

**Steps:**

1. In the Admin panel, find the admin user in the table
2. Click the **Remove** action next to their name
3. Confirm the removal
4. The record is deleted from the `admin` table
5. They retain access as a regular Locker User (if still in `locker_users`)

**Restriction:** A regular Admin cannot remove a Superadmin. Only a Superadmin can remove another Superadmin.

---

### 6.4 Change an Admin's Role

**When to use:** You need to promote an admin to superadmin, or demote a superadmin to admin.

**Steps:**

1. In the Admin panel, find the admin user
2. Click the **Change Role** action
3. A dialog or dropdown appears with role options (admin / superadmin)
4. Select the new role and confirm
5. The `emp_role` column in the `admin` table is updated
6. If you changed your **own** role, your session is updated immediately — you do not need to log out

---

### 6.5 Manage Locker Users (Grant / Revoke System Access)

**When to use:** An employee needs to be given or removed from LMS access entirely.

**Add a Locker User:**

1. Navigate to the Locker Users section in the Admin panel
2. Search for the employee by name or ID
3. Select them and click **Add**
4. They are inserted into the `locker_users` table
5. They can now log in to LMS via Authify SSO

**Remove a Locker User:**

1. In the Locker Users table, find the employee
2. Click **Remove**
3. Confirm the removal
4. Their record is deleted from `locker_users`
5. On their next request, they will see the **Unauthorized** page (existing sessions may still work until the session expires or they refresh)

---

### 6.6 Toggle Maintenance Mode

**When to use:** You need to take LMS offline for maintenance, migration, or updates.

**Enable Maintenance Mode:**

1. In the sidebar, find the **System Status** section (visible to admins only)
2. Click **Set Maintenance**
3. A dialog appears asking for a **maintenance message** to display to users
4. Enter a descriptive message (e.g., "System is under maintenance. Please try again after 3:00 PM.")
5. Click **Confirm**
6. The `system_status` table is updated to `maintenance`
7. All regular users who visit any page will see the maintenance message instead of the app
8. **Admins and superadmins are not blocked** — they can still use the system during maintenance

**Disable Maintenance Mode:**

1. In the sidebar, click **Set System Online**
2. The `system_status` table is updated to `online`
3. All users can access the system normally again

---

## 7. Process Flows — System Administrator (Developer/IT)

### 7.1 Initial Server Setup

**Prerequisites:**

- PHP 8.2+ with extensions: PDO, PDO_MySQL, mbstring, xml, zip, bcmath, gd
- Composer 2.x
- Node.js 18+ and npm
- MySQL 8.x server for the main LMS database
- Access to the masterlist and authify databases (credentials from HR/IT team)

**Steps:**

```bash
# 1. Clone the repository
git clone [repo-url] /var/www/lms
cd /var/www/lms

# 2. Install PHP dependencies
composer install --optimize-autoloader --no-dev

# 3. Install Node dependencies and build assets
npm install
npm run build

# 4. Set up environment file
cp .env.example .env
php artisan key:generate

# 5. Edit .env with all required values (see Section 10 in ARCHITECTURE.md)
nano .env

# 6. Run database migrations (main LMS DB only)
php artisan migrate

# 7. Set storage permissions
chmod -R 775 storage bootstrap/cache
chown -R www-data:www-data storage bootstrap/cache

# 8. Configure web server (Nginx/Apache) to point to /public
#    Ensure APP_URL matches the actual server URL

# 9. Optimize for production
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

---

### 7.2 Register the First Locker User and Superadmin

Since LMS has no built-in registration UI for the very first user, the initial setup must be done via the database directly.

**Step 1 — Add the first locker user:**

```sql
INSERT INTO locker_users (employid, empname, department, created_by, created_at, updated_at)
VALUES ('EMP001', 'Juan Dela Cruz', 'IT', 'system', NOW(), NOW());
```

**Step 2 — Add them as superadmin:**

```sql
INSERT INTO admin (emp_id, emp_name, emp_role, last_updated_by, created_at)
VALUES ('EMP001', 'Juan Dela Cruz', 'superadmin', 'system', NOW());
```

**Step 3 — Log in via Authify SSO**
The employee can now log in and use the Admin panel to add additional locker users and admins through the UI.

---

### 7.3 Database Migrations

```bash
# Run all pending migrations
php artisan migrate

# Check migration status
php artisan migrate:status

# Rollback the last batch
php artisan migrate:rollback

# NEVER run migrate:fresh on production — it drops all tables
```

Migration files are in `database/migrations/`. Each migration corresponds to a table. When adding new features, always create a new migration — never modify existing ones in production.

---

### 7.4 Adding or Updating Environment Variables

1. Edit `.env` on the server
2. Clear all caches:

```bash
php artisan config:clear
php artisan config:cache
php artisan route:clear
php artisan route:cache
```

3. If the variable is used on the frontend (prefixed with `VITE_`), you must rebuild assets:

```bash
npm run build
```

---

### 7.5 Deploying Code Updates

```bash
# 1. Pull latest code
git pull origin main

# 2. Install any new PHP dependencies
composer install --optimize-autoloader --no-dev

# 3. Install any new Node dependencies and rebuild
npm install
npm run build

# 4. Run new migrations
php artisan migrate

# 5. Rebuild caches
php artisan config:cache
php artisan route:cache
php artisan view:cache

# 6. If using PHP-FPM, restart to clear OPcache
sudo systemctl restart php8.2-fpm
```

**Recommended:** Enable Maintenance Mode in the LMS admin panel before deploying, then disable it after deployment is complete.

---

### 7.6 Clearing Sessions (Force Logout All Users)

If you need to invalidate all active sessions (e.g., after a security incident):

```bash
# Delete all file-based sessions
php artisan session:flush

# Or manually:
rm storage/framework/sessions/*
```

All users will be redirected to Authify login on their next request.

---

### 7.7 Checking Audit Logs

All locker changes are stored in `locker_logs`. To query recent activity:

```sql
-- See all changes in the last 7 days
SELECT loggable_type, loggable_id, action_type, action_by, action_at
FROM locker_logs
WHERE action_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
ORDER BY action_at DESC;

-- See full history of a specific locker
SELECT * FROM locker_logs
WHERE loggable_id = 'L-001'
ORDER BY action_at DESC;

-- See all changes by a specific employee
SELECT * FROM locker_logs
WHERE action_by = 'EMP001'
ORDER BY action_at DESC;
```

---

### 7.8 Database Backup Procedure

**What to back up:**

- The main LMS database (`lms`) — contains all locker data, audit logs, users, admin records
- The `.env` file — contains all credentials

**What NOT to back up** (not owned by LMS):

- `tspi_hr_db` (HR's responsibility)
- `authify` database (SSO team's responsibility)

**Backup command:**

```bash
mysqldump -u [user] -p lms > lms_backup_$(date +%Y%m%d_%H%M%S).sql
```

---

## 8. Locker Status Reference

| Status        | Integer Value | When Assigned                             | Description                                                   |
| ------------- | :-----------: | ----------------------------------------- | ------------------------------------------------------------- |
| **Active**    |       1       | Employee assigned, ACCSTATUS = 1 in HR DB | Locker is occupied by an active employee                      |
| **Vacant**    |       2       | No employee assigned                      | Locker is free and available for assignment                   |
| **Inactive**  |       3       | Employee assigned, ACCSTATUS = 2 in HR DB | Locker assigned to an employee who has been deactivated in HR |
| **Temporary** |       4       | Employ ID = "Others"                      | Locker assigned to a temporary or non-masterlist user         |

**Important:** Status is **never set manually by users**. The system computes it automatically based on:

1. Whether an `employ_id` is present
2. If yes, the employee's `ACCSTATUS` value in the HR masterlist database

This ensures the locker status always reflects actual employee status.

**Transfer rules:**

- You can only transfer **to** a locker that is **Vacant** or **Inactive**
- You cannot transfer to an Active or Temporary locker

---

## 9. Audit Log Reference

Every create, update, and delete action on lockers and locker users is automatically recorded in the `locker_logs` table via the `Loggable` trait.

### Log Entry Fields

| Field           | Description                                  | Example                                 |
| --------------- | -------------------------------------------- | --------------------------------------- |
| `loggable_type` | Which model was changed                      | `App\Models\LockerCode`                 |
| `loggable_id`   | The record's ID                              | `42`                                    |
| `action_type`   | What was done                                | `CREATE`, `UPDATE`, `DELETE`            |
| `action_by`     | Who did it (Employee ID)                     | `EMP001`                                |
| `action_at`     | When it happened                             | `2026-05-18 10:30:00`                   |
| `old_values`    | JSON of values before change (UPDATE/DELETE) | `{"employ_id": "EMP002", "remarks": 1}` |
| `new_values`    | JSON of values after change (CREATE/UPDATE)  | `{"employ_id": "EMP003", "remarks": 1}` |
| `remarks`       | Optional textual note                        | —                                       |
| `metadata`      | Extra context (e.g., transfer info)          | —                                       |

### View History in the UI

1. On any locker row, click the **History (clock)** icon
2. The History dialog shows all log entries for that locker, newest first
3. Paginated — scroll through older entries with the pagination controls

---

## 10. Common Troubleshooting

### User sees "Unauthorized" page after logging in via SSO

**Cause:** The employee's ID is not in the `locker_users` table.

**Fix:**

1. An Admin logs into LMS
2. Goes to Admin panel → Locker Users
3. Adds the employee
4. The employee refreshes their browser — they should now have access

---

### User is redirected to SSO login on every page refresh

**Cause:** The `sso_token` cookie is not being persisted, OR the authify session has expired/been invalidated.

**Fix:**

1. Check if the browser allows cookies from the LMS domain
2. Check if the token exists in `authify_sessions` and has not expired
3. Check `SESSION_LIFETIME` in `.env` — default is 720 minutes (12 hours)
4. Ask the user to log in again; if the problem persists, check the authify system

---

### Employee search not returning results in the Add Locker dialog

**Cause:** The `masterlist` DB connection is not reachable, or employee has `ACCSTATUS != 1`.

**Fix:**

1. Check `MDB_HOST`, `MDB_DATABASE`, `MDB_USERNAME`, `MDB_PASSWORD` in `.env`
2. Test the connection: `php artisan tinker` → `DB::connection('masterlist')->select('SELECT 1')`
3. Confirm the employee is active (`ACCSTATUS = 1`) in the masterlist

---

### Bulk upload errors for all rows

**Cause:** The Excel file columns don't match expected headers, OR the file format is wrong.

**Fix:**

1. Re-download the template from the **Download Template** button
2. Ensure the file is `.xlsx` or `.xls` (not `.csv`, not `.ods`)
3. Confirm column headers are exactly: `Locker Number | Emp No | Passcode | Notes`
4. Check that no rows have the same `Emp No` value (duplicates within the file are rejected)

---

### "Locker number already in use" when trying to create

**Cause:** A locker with that number already exists (even if its status is Vacant or Inactive).

**Fix:**

1. Search for the locker number in the table
2. Either edit the existing record, or use a different locker number

---

### Password change fails with "Current password is incorrect"

**Cause:** The entered current password does not match `PASSWRD` in the HR masterlist.

**Fix:**

1. Make sure you're typing the current password correctly (case-sensitive)
2. If forgotten, contact HR to reset the password directly in the masterlist database

---

### Admin panel not visible in the sidebar

**Cause:** The logged-in user is not in the `admin` table.

**Fix:** A superadmin must add the user via the Admin panel → Add New Admin.

---

### Maintenance mode cannot be turned off

**Cause:** The admin forgot the URL or got locked out.

**Fix (database):**

```sql
UPDATE system_status SET status = 'online', message = NULL WHERE id = 1;
```

---

## 11. Developer Onboarding Checklist

For any new developer joining the LMS project, complete the following:

### Environment Setup

- [ ] Clone the repository
- [ ] Copy `.env.example` to `.env` and fill in all credentials (get DB credentials from IT/team lead)
- [ ] Run `composer install`
- [ ] Run `npm install`
- [ ] Run `php artisan key:generate`
- [ ] Run `php artisan migrate`
- [ ] Start both servers: `php artisan serve` and `npm run dev` (must run concurrently)
- [ ] Visit `http://localhost:8000/[APP_NAME]/` and confirm the SSO redirect happens

### Understanding the Codebase

- [ ] Read `CLAUDE.md` (project conventions and architecture summary)
- [ ] Read `docs/ARCHITECTURE.md` (full technical architecture)
- [ ] Read `docs/TURNOVER.md` (this document — processes and roles)
- [ ] Review the three-layer pattern: one controller, one service, one repository per domain
- [ ] Understand the three database connections (default, masterlist, authify)
- [ ] Understand how `AuthMiddleware` works (SSO, not Laravel auth)
- [ ] Understand the `Loggable` trait (automatic audit logging)
- [ ] Understand `LockerPageLayout.jsx` (shared component for both locker tables)

### Development Conventions

- [ ] Use `cn()` from `resources/js/lib/utils.js` for all className composition
- [ ] Use `toast` from `sonner` for all notifications (do not use `alert()`)
- [ ] All authenticated routes must go through `AuthMiddleware`
- [ ] Status (remarks) must never be hardcoded — always use `LockerCode::REMARK_*` constants
- [ ] All DB queries must live in repositories — no raw queries in controllers or services
- [ ] Run `php artisan test` before submitting any PR

### Access Setup

- [ ] Request to be added to `locker_users` table for local/dev system access
- [ ] Request superadmin role if you need to test admin features
- [ ] Confirm you can log in via SSO and reach the Dashboard

---

## 12. Deployment Notes

### Production Checklist

Before going live or after any significant update:

- [ ] `APP_ENV=production` and `APP_DEBUG=false` in `.env`
- [ ] `npm run build` completed successfully (check `public/build/` for asset files)
- [ ] `php artisan migrate` run on the production database
- [ ] `php artisan config:cache`, `route:cache`, `view:cache` executed
- [ ] Storage directory is writable by the web server user
- [ ] Maintenance mode disabled after deployment (if it was enabled)
- [ ] Test login flow end-to-end (SSO redirect → token validation → dashboard)
- [ ] Test one locker create, edit, transfer, delete
- [ ] Test bulk upload with the template
- [ ] Verify audit logs are being written (`locker_logs` table has entries)
- [ ] Confirm all three DB connections are reachable from the production server

### Server Requirements

| Requirement    | Minimum                                                               |
| -------------- | --------------------------------------------------------------------- |
| PHP            | 8.2+                                                                  |
| MySQL          | 8.0+                                                                  |
| Node.js        | 18+ (build only, not needed at runtime)                               |
| PHP Extensions | PDO, PDO_MySQL, mbstring, xml, zip, bcmath, gd                        |
| Disk           | 500 MB for app + logs                                                 |
| RAM            | 512 MB minimum, 1 GB recommended                                      |
| Network        | Must reach 192.168.1.28 (masterlist) and 192.168.2.221:3307 (authify) |

### Network Dependencies

| Service       | Host          | Port | Purpose                | If Down                                                      |
| ------------- | ------------- | ---- | ---------------------- | ------------------------------------------------------------ |
| Authify SSO   | 192.168.2.221 | 8200 | Login/logout redirects | Users cannot log in                                          |
| Authify DB    | 192.168.2.221 | 3307 | Token validation       | Users cannot log in                                          |
| HR Masterlist | 192.168.1.28  | 3306 | Employee data          | Employee search fails, uploads may fail, names won't display |
| Main LMS DB   | localhost     | 3306 | All app data           | App completely down                                          |

> If the masterlist DB is unreachable, existing locker records still display (without employee names). New locker creation and bulk uploads will fail for any employee-assigned lockers.

> If the Authify DB is unreachable, no user can log in. Users with active file sessions may still be able to browse for the duration of their session lifetime (720 minutes).
