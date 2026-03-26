# Admin Dashboard Implementation Plan

## Overview

Build a comprehensive admin dashboard at `/admin/*` for the Happy Vibecode platform. The dashboard provides user management, role management, user settings editing, analytics, and audit logging. Uses the existing kumo design system, Recharts for charts, and follows established project patterns.

## Key Decisions (Confirmed by User)

- **Route**: Separate `/admin/*` routes (not replacing `/dashboard`)
- **Charts**: Recharts library
- **Roles**: Simplified RBAC — roles table with name + JSON permissions map
- **Navigation**: Collapsible sidebar for admin pages (replaces top nav in admin area)

---

## Phase 1: Database Schema Changes

### 1.1 Modify `users` table

Add columns to `packages/db/src/schema.ts`:

- `status`: `text('status', { enum: ['active', 'suspended', 'pending'] }).notNull().default('active')`
- `lastLogin`: `integer('last_login', { mode: 'timestamp_ms' })`

### 1.2 Create `roles` table

```ts
export const roles = sqliteTable('roles', {
	id: text('id').primaryKey(),
	name: text('name').notNull().unique(),
	description: text('description'),
	permissions: text('permissions').notNull(), // JSON: { users: 'read', sessions: 'read|write', ... }
	createdAt: integer('created_at', {mode: 'timestamp_ms'}).notNull(),
	updatedAt: integer('updated_at', {mode: 'timestamp_ms'}).notNull(),
})
```

Update `users.role` to be a text field referencing role name (keep backward compat with existing `user`/`admin` values).

### 1.3 Create `audit_logs` table

```ts
export const auditLogs = sqliteTable('audit_logs', {
	id: text('id').primaryKey(),
	actorId: text('actor_id')
		.notNull()
		.references(() => users.id),
	actorName: text('actor_name'),
	targetId: text('target_id'),
	targetName: text('target_name'),
	action: text('action').notNull(), // e.g., 'user.create', 'role.assign', 'user.suspend'
	details: text('details'), // JSON with change specifics
	createdAt: integer('created_at', {mode: 'timestamp_ms'}).notNull(),
})
```

### 1.4 Migration

- Run `bun run -F @happy-vibecode/db generate` to create migration
- Run `bun run -F @happy-vibecode/db migrate` to apply
- Seed default roles: `super_admin`, `admin`, `editor`, `viewer`

---

## Phase 2: API Routes

### 2.1 Admin Middleware

Add `packages/api/src/middleware/admin.ts`:

- Reuse `authMiddleware` to get userId + userRole
- Check `userRole === 'admin'` (or role lookup for new RBAC)
- Return 403 if not admin
- Optionally check granular permissions from role's JSON

### 2.2 Admin User Routes

`packages/api/src/routes/admin-users.ts` — All prefixed `/api/admin/users`:

| Method | Path                  | Description                                                   |
| ------ | --------------------- | ------------------------------------------------------------- |
| GET    | `/`                   | List users (paginated, searchable, filterable by status/role) |
| GET    | `/:id`                | Get single user details + settings                            |
| POST   | `/`                   | Create user account                                           |
| PUT    | `/:id`                | Update user (name, email, role)                               |
| PATCH  | `/:id/status`         | Change status (suspend/reactivate)                            |
| DELETE | `/:id`                | Delete user account                                           |
| PUT    | `/:id/settings`       | Override user preferences/settings                            |
| POST   | `/:id/reset-password` | Admin-triggered password reset                                |

### 2.3 Admin Role Routes

`packages/api/src/routes/admin-roles.ts` — All prefixed `/api/admin/roles`:

| Method | Path      | Description                          |
| ------ | --------- | ------------------------------------ |
| GET    | `/`       | List all roles                       |
| GET    | `/:id`    | Get role details + permissions       |
| POST   | `/`       | Create custom role                   |
| PUT    | `/:id`    | Update role (name, permissions)      |
| DELETE | `/:id`    | Delete role (cannot delete built-in) |
| POST   | `/assign` | Bulk assign role to multiple users   |

### 2.4 Admin Analytics Routes

`packages/api/src/routes/admin-analytics.ts` — All prefixed `/api/admin/analytics`:

| Method | Path        | Description                                     |
| ------ | ----------- | ----------------------------------------------- |
| GET    | `/overview` | KPIs: total users, active (DAU/WAU/MAU), growth |
| GET    | `/signups`  | Sign-up trends over time (with date range)      |
| GET    | `/roles`    | Role distribution breakdown                     |
| GET    | `/sessions` | Session metrics (frequency, duration)           |
| GET    | `/activity` | Login frequency data for heatmap                |

### 2.5 Admin Audit Log Routes

`packages/api/src/routes/admin-audit.ts` — All prefixed `/api/admin/audit`:

| Method | Path | Description                                             |
| ------ | ---- | ------------------------------------------------------- |
| GET    | `/`  | List audit logs (paginated, filterable by action/actor) |

### 2.6 Route Registration

Update `packages/api/src/index.ts` to mount new routers:

```ts
api.route('/admin/users', adminUsersRouter)
api.route('/admin/roles', adminRolesRouter)
api.route('/admin/analytics', adminAnalyticsRouter)
api.route('/admin/audit', adminAuditRouter)
```

---

## Phase 3: Shared Types & Schemas

Add to `packages/shared/src/schema/`:

### 3.1 `admin.ts`

- Zod schemas for admin API request/response types
- User management form schemas
- Role CRUD schemas
- Analytics response schemas
- Audit log schemas

### 3.2 Export from `packages/shared/src/index.ts`

---

## Phase 4: Frontend Components

### 4.1 Admin Layout & Sidebar

`apps/web/app/admin/layout.tsx` — Admin layout wrapper:

- Collapsible sidebar with navigation sections
- Sidebar items: Overview, Users, Roles, Analytics, Audit Log
- Collapse toggle button
- Responsive: sidebar collapses to icons on mobile, hidden on small screens
- Sidebar uses kumo design tokens (`bg-kumo-base`, `border-kumo-line`, etc.)
- Icons from `@phosphor-icons/react`

### 4.2 Reusable Components

Create in `apps/web/app/admin/components/`:

| Component             | Purpose                                        |
| --------------------- | ---------------------------------------------- |
| `AdminSidebar.tsx`    | Collapsible sidebar navigation                 |
| `AdminBreadcrumb.tsx` | Breadcrumb trail for current section           |
| `DataTable.tsx`       | Generic paginated, sortable, searchable table  |
| `ConfirmModal.tsx`    | Confirmation dialog for destructive actions    |
| `Toast.tsx`           | Toast notification system (success/error/info) |
| `SkeletonTable.tsx`   | Skeleton loading state for tables              |
| `SkeletonCards.tsx`   | Skeleton loading for KPI cards                 |
| `StatCard.tsx`        | KPI card with icon, label, value, trend        |
| `UserForm.tsx`        | Create/edit user form                          |
| `RoleForm.tsx`        | Create/edit role form with permissions matrix  |
| `DateRangePicker.tsx` | Date range filter for analytics                |
| `ExportButton.tsx`    | CSV/PDF export trigger                         |

---

## Phase 5: Admin Pages

### 5.1 Overview — `apps/web/app/admin/page.tsx`

- Admin-only access check (redirect non-admins)
- Summary KPI cards: total users, active users, new signups (today/week/month), active sessions
- Recent activity feed (last 10 audit log entries)
- Quick links to other admin sections
- Skeleton loading states

### 5.2 User Management — `apps/web/app/admin/users/page.tsx`

- `DataTable` with columns: Name, Email, Role, Status, Last Login, Join Date
- Search bar (search by name/email)
- Filter dropdowns: Status (active/suspended/pending), Role
- Pagination controls
- Row actions: Edit, Suspend/Reactivate, Delete, View Settings
- "Create User" button → modal with `UserForm`
- Edit button → modal with `UserForm` (pre-filled)
- Delete/Suspend → `ConfirmModal`
- Toast notifications on success/error
- Skeleton loading while fetching

### 5.3 Role Management — `apps/web/app/admin/roles/page.tsx`

- List of roles with name, description, user count
- "Create Role" button → modal with `RoleForm`
- Edit role → modal with `RoleForm`
- Delete role → `ConfirmModal` (cannot delete built-in roles)
- Permissions matrix in role form: rows = modules (users, sessions, workspaces, tickets, analytics), columns = actions (read, write, delete)
- Bulk assign: select users → choose role → assign

### 5.4 Analytics — `apps/web/app/admin/analytics/page.tsx`

- Date range picker at top
- KPI cards row: Total Users, DAU, WAU, MAU, Avg Session Duration
- Charts section:
  - **User Growth** — Line chart (signups over time)
  - **Role Distribution** — Pie/donut chart
  - **Login Frequency** — Bar chart or heatmap (by day of week)
  - **Session Metrics** — Bar chart (sessions per day)
  - **Sign-up Sources** — Pie chart (GitHub vs email)
- Export buttons (CSV/PDF) per section
- Skeleton loading for each chart area

### 5.5 Audit Log — `apps/web/app/admin/audit/page.tsx`

- Chronological feed/table: Timestamp, Actor, Action, Target, Details
- Filter by: Action type, Actor, Date range
- Pagination
- Color-coded action badges
- Expandable rows for JSON details

---

## Phase 6: Audit Logging Integration

- Create helper function `logAuditEvent(db, actorId, actorName, targetId, targetName, action, details)` in `packages/api/src/lib/audit.ts`
- Call from every admin mutation endpoint (create/edit/suspend/delete user, role changes, settings overrides)
- Include before/after values in details JSON

---

## Phase 7: RBAC Middleware

- `requirePermission(permission: string)` middleware factory in `packages/api/src/middleware/admin.ts`
- Looks up user's role → reads permissions JSON → checks if required permission is granted
- Applied to each admin route group
- Super admin role (`super_admin`) bypasses all checks

---

## File Structure (New Files)

```
packages/
  db/src/schema.ts                          # MODIFY: add tables + columns
  api/src/
    middleware/admin.ts                      # NEW: admin auth + RBAC middleware
    lib/audit.ts                            # NEW: audit logging helper
    routes/
      admin-users.ts                        # NEW: user management API
      admin-roles.ts                        # NEW: role management API
      admin-analytics.ts                    # NEW: analytics API
      admin-audit.ts                        # NEW: audit log API
    index.ts                                # MODIFY: mount new routers
  shared/src/
    schema/admin.ts                         # NEW: admin Zod schemas
    index.ts                                # MODIFY: export admin schemas

apps/web/app/admin/
  layout.tsx                                # NEW: admin layout with sidebar
  page.tsx                                  # NEW: admin overview/dashboard
  components/
    AdminSidebar.tsx                        # NEW: collapsible sidebar
    AdminBreadcrumb.tsx                     # NEW: breadcrumb
    DataTable.tsx                           # NEW: generic data table
    ConfirmModal.tsx                        # NEW: confirmation modal
    Toast.tsx                               # NEW: toast notifications
    SkeletonTable.tsx                       # NEW: table skeleton
    SkeletonCards.tsx                       # NEW: cards skeleton
    StatCard.tsx                            # NEW: KPI stat card
    UserForm.tsx                            # NEW: user create/edit form
    RoleForm.tsx                            # NEW: role create/edit form
    DateRangePicker.tsx                     # NEW: date range filter
    ExportButton.tsx                        # NEW: export CSV/PDF
  users/
    page.tsx                                # NEW: user management page
  roles/
    page.tsx                                # NEW: role management page
  analytics/
    page.tsx                                # NEW: analytics page
  audit/
    page.tsx                                # NEW: audit log page
```

---

## Implementation Order

1. **Schema + Migration** — Add tables/columns, generate migration, seed roles
2. **Shared Types** — Add Zod schemas in `packages/shared`
3. **Audit Helper** — Create audit logging utility
4. **Admin Middleware** — Auth + RBAC middleware
5. **Admin API Routes** — Users, roles, analytics, audit endpoints
6. **Route Registration** — Mount routers in `packages/api/src/index.ts`
7. **Frontend Components** — Sidebar, DataTable, modals, toasts, skeletons
8. **Admin Layout** — Layout with sidebar
9. **Admin Overview Page** — KPI cards + recent activity
10. **User Management Page** — Full CRUD with table
11. **Role Management Page** — CRUD + permissions matrix
12. **Analytics Page** — Charts with Recharts
13. **Audit Log Page** — Filterable log table
14. **Nav Update** — Add "Admin" link to main Nav (visible only to admins)
15. **Typecheck + Lint** — Verify all code passes

---

## Dependencies to Install

```bash
bun add recharts -F @happy-vibecode/web
```

---

## Verification

1. `bun run typecheck` — All packages pass type checking
2. `bun run lint:fix` — No lint errors
3. `bun run dev:web` — App starts, admin pages render
4. Manual test: Login as admin → /admin → verify all 5 sections load
5. Test CRUD operations: create/edit/delete users and roles
6. Test analytics charts render with data
7. Test audit log entries appear after mutations
8. Test non-admin users are redirected away from /admin
