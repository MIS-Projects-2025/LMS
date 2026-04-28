# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Stack

Laravel 11 + Inertia.js + React 18 + Vite + Tailwind CSS v3 + DaisyUI + Radix UI (shadcn-style components).

## Development Commands

```bash
# Frontend
npm run dev          # Vite dev server (HMR)
npm run build        # Production build

# Backend
php artisan serve    # Laravel dev server
php artisan migrate  # Run DB migrations

# Testing
php artisan test                        # Run all tests
php artisan test --filter TestName      # Run a single test
./vendor/bin/phpunit --filter TestName  # PHPUnit directly
```

Both `npm run dev` and `php artisan serve` must run concurrently during development.

## Architecture

### Backend: Controller → Service → Repository

All business logic follows a strict three-layer pattern:

- **Controllers** (`app/Http/Controllers/`) — validate requests, call services, return Inertia responses or redirects
- **Services** (`app/Services/`) — business logic, cross-cutting concerns (e.g. uniqueness checks before create)
- **Repositories** (`app/Repositories/`) — all DB queries; accept and return Eloquent models/collections

### Routing

Routes are split by feature domain and included from `routes/web.php`:
- `routes/auth.php` — login/logout
- `routes/general.php` — dashboard, profile, admin (all prefixed with `APP_NAME` env var, protected by `AuthMiddleware`)
- `routes/lockers.php` — locker CRUD + employee search API

All authenticated routes use `APP_NAME` as the URL prefix (e.g. `/lms/dashboard`).

### Authentication (SSO, not Laravel's default auth)

`AuthMiddleware` handles all auth — there is **no standard Laravel session login**. It validates tokens from an external `authify` database connection (table: `authify_sessions`). Token sources in priority order: `?key` query param → SSO cookie → session. On success, employee data is stored in `session('emp_data')`.

### Database Connections

Three DB connections configured in `config/database.php`:
- **default** — main app data (locker_codes, users, etc.)
- **masterlist** — read-only external employee DB (`employee_masterlist` table, columns use uppercase e.g. `EMPLOYID`, `EMPNAME`, `ACCSTATUS`)
- **authify** — SSO sessions (external, read-only from app perspective)

### Shared Inertia Props

`HandleInertiaRequests` shares these props to every page:
- `emp_data` — authenticated employee from session (name, id, job title, dept, etc.)
- `flash.success` / `flash.error` — session flash messages
- `auth.user` — Laravel auth user (if used)
- `appName` — from `config('app.name')`
- `display_name` — from `APP_DISPLAY_NAME` env var

### Frontend Structure

- `resources/js/Pages/` — Inertia page components (maps directly to `Inertia::render('Path/Name')`)
- `resources/js/Components/ui/` — shadcn-style Radix UI components (Button, Dialog, Select, Table, Badge, Combobox, etc.)
- `resources/js/Components/sidebar/` — sidebar/navigation components
- `resources/js/Layouts/AuthenticatedLayout.jsx` — wraps all authenticated pages
- `resources/js/lib/utils.js` — `cn()` utility (clsx + tailwind-merge)

### Toasts

Use `sonner` for all toast notifications (`import { toast } from "sonner"`). The `<Toaster>` is mounted globally in `app.jsx` with `richColors` and `theme` from `ThemeContext`.

### Locker Module (main feature)

`LockerCode` model has three statuses via `LockerCode::REMARKS` constant: `ACTIVE`, `VACANT`, `INACTIVE`. The locker module supports: CRUD, employee-to-locker transfer (moves employee from one locker to a vacant one), CSV bulk upload, and CSV export. Employee lookup uses a live-search `Combobox` backed by `GET /api/employees/search` (queries the `masterlist` DB connection, no auth middleware on this route).
