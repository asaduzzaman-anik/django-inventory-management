# Implementation TODO

Track implementation against the plan. Check an item only after it is implemented and verified.

Suggested commit when Phase 1 is committed:

```text
chore: establish project foundation and custom user

Split settings, add the accounts user before other app migrations, and expose a health check with tests.
```

Suggested commit when Phase 2 is committed:

```text
feat: add JWT authentication

Add login, rotating refresh tokens, logout blacklist, profile, and password change, with OpenAPI docs.
```

## Phase 1 — Foundation

- [x] Add `requirements/base.txt`, `dev.txt`, and `prod.txt`, and point the root `requirements.txt` at dev
- [x] Add pytest, pytest-django, and factory-boy to dev requirements
- [x] Split settings into `config/settings/base.py` and `dev.py`; point `manage.py` and WSGI/ASGI at `config.settings.dev`
- [x] Move the existing MySQL and `SECRET_KEY` configuration into the new settings without changing the env var names
- [x] Set `DEBUG` from the environment and keep `ALLOWED_HOSTS` explicit
- [x] Replace `MAILERS` with Django `EMAIL_BACKEND` console backend
- [x] Correct the stale Django 6.1 comment so the project documents Django 5.2
- [x] Create `apps.common` with `TimeStampedModel`, pagination, and the standard error payload
- [x] Create `apps.accounts.User` extending `AbstractUser` with unique email and phone
- [x] Set `AUTH_USER_MODEL` before the first migration
- [x] Add DRF settings: authentication class placeholder, pagination, filter backends, exception handler
- [x] Register `django_filters` and the new apps
- [x] Add `GET /api/v1/health/`
- [x] Add `pytest.ini` and a health-check test
- [x] Add `.env.example` with empty values for the existing keys
- [x] Run the first MySQL migration and restore the existing superuser
- [x] Confirm Django admin login works

## Phase 2 — Authentication

- [x] Add `djangorestframework-simplejwt` and the token blacklist app
- [x] Configure access lifetime, refresh lifetime, and rotation
- [x] Implement login, refresh, logout, me, and change-password
- [x] Omit password hashes and tokens from profile responses
- [x] Throttle login attempts
- [x] Mount routes under `/api/v1/auth/`
- [x] Add drf-spectacular and serve schema plus Swagger UI
- [x] Test login, bad password, refresh rotation, logout blacklist, password change, and 401 on me

## Phase 3 — Roles, users, and audit

- [ ] Add custom permissions `accounts.manage_users` and `audit.view_auditlog`
- [ ] Write idempotent `seed_roles` for Super Admin, Warehouse Manager, Inventory Staff, Sales Staff, and Viewer
- [ ] Attach the Phase 3 permissions; leave later permissions for their phases and re-run the same command
- [ ] Put every superuser in Super Admin during seed
- [ ] Build user list, create, update, deactivate, and replace-role endpoints
- [ ] Create `AuditLog` and `log_audit`
- [ ] Record login success, login failure, and logout without storing passwords
- [ ] Record user and role changes
- [ ] Add `GET /api/v1/audit-logs/` for Super Admin
- [ ] Test 403 for a non-admin and idempotent seed

## Phase 4 — Catalog

- [ ] Create `Category` with parent, slug, active flag, and sibling-unique name
- [ ] Enforce depth of two and reject cycles
- [ ] Create `Product` with SKU, barcode, prices, reorder level, unit, active flag, and image
- [ ] Uppercase SKU on write
- [ ] Validate image type and 2 MB limit
- [ ] Add category and product CRUD endpoints with filters, search, and ordering
- [ ] Deactivate instead of deleting
- [ ] Audit create and update
- [ ] Grant catalog model permissions in `seed_roles`
- [ ] Test uniqueness, category depth, image rejection, and viewer write denial

## Phase 5 — Suppliers, warehouses, and scope

- [ ] Create `Supplier` and `Warehouse` with unique codes and active flags
- [ ] Add optional `preferred_supplier` on product
- [ ] Create `UserWarehouse`
- [ ] Add replace-assignments endpoint
- [ ] Implement `visible_warehouses(user)` with superuser bypass and fail-closed default
- [ ] Add supplier and warehouse endpoints
- [ ] Audit writes and assignment changes
- [ ] Grant permissions in `seed_roles`
- [ ] Test unique codes, assignment replace, and empty visibility for a user with no warehouses

## Phase 6 — Inventory core and receiving

- [ ] Create `StockLevel` with unique product/warehouse, non-negative checks, and reserved ≤ on-hand
- [ ] Create append-only `InventoryTransaction`
- [ ] Create `DocumentSequence`, `StockReceipt`, and `StockReceiptItem`
- [ ] Implement locked get-or-create of a stock row
- [ ] Implement `receive_stock` inside `transaction.atomic` with idempotency key
- [ ] Write `RECEIPT` rows with `balance_after` and `created_by`
- [ ] Add stock list with `available` annotation and status filter
- [ ] Add receipt and transaction list endpoints
- [ ] Enforce warehouse scope
- [ ] Grant `receive_stock` to Super Admin, Warehouse Manager, and Inventory Staff
- [ ] Audit receives
- [ ] Test posting, idempotency, permissions, scope, and ledger sum equals on-hand

## Phase 7 — Adjustments and transfers

- [ ] Create transfer and adjustment models
- [ ] Implement `transfer_stock` with lock ordering, available check, and paired ledger rows
- [ ] Implement `adjust_stock` with reason codes and required note for `OTHER`
- [ ] Reject transfers that would consume reserved stock
- [ ] Reject adjustments that would drop on-hand below reserved
- [ ] Add endpoints and permissions (`transfer_stock`, `adjust_stock` for Super Admin and Warehouse Manager)
- [ ] Audit both operations
- [ ] Test insufficient stock, same warehouse, rollback, and permission denial

## Phase 8 — Purchase orders

- [ ] Create PO, PO line, purchase receipt, and receipt line models
- [ ] Store line totals and header total
- [ ] Allow edits only in `DRAFT`
- [ ] Implement submit, approve, and cancel rules
- [ ] Implement receive: cap at remaining, update `quantity_received`, post `PURCHASE`, set partial or received status
- [ ] Keep the whole receive in one database transaction
- [ ] Record receiving history as receipt documents
- [ ] Add list filters by status, supplier, warehouse, and date
- [ ] Grant submit and approve to Super Admin and Warehouse Manager; grant receive also to Inventory Staff
- [ ] Audit status changes and receives
- [ ] Leave a single service function other apps can call after commit for later notifications
- [ ] Test illegal transitions, over-receive, partial then complete, and failed receive leaving stock unchanged

## Phase 9 — Sales and returns

- [ ] Create sales order, line, return, and return line models
- [ ] Snapshot unit price and store subtotal, tax, and total
- [ ] Edit lines only in `DRAFT`
- [ ] Confirm: lock lines in product order and increase `reserved` or fail the whole order
- [ ] Process: status only
- [ ] Complete: decrease `on_hand` and `reserved`, write `SALE`
- [ ] Cancel: release reservation when one exists; reject when completed
- [ ] Return: only completed orders, cannot exceed remaining quantity, write `RETURN`
- [ ] Payment status patch independent of stock
- [ ] Enforce warehouse scope and available stock
- [ ] Grant sales action permissions to Super Admin and Sales Staff
- [ ] Audit status changes and returns
- [ ] Test oversell, reservation conflict, complete, cancel, immutability, return cap, and concurrent complete

## Phase 10 — Notifications and background jobs

- [ ] Add Redis, Celery, django-celery-beat, and django-redis to requirements and settings
- [ ] Add `config/celery.py` and load it from the app config
- [ ] Create `Notification` and `StockAlertState`
- [ ] Create in-app notifications after successful PO submit, approve, receive, transfer, and adjustment
- [ ] Enqueue `evaluate_stock_alert` after commit of balance changes
- [ ] Send email from a Celery task using the console backend locally
- [ ] Add the hourly low-stock scan
- [ ] Suppress duplicate alerts until stock recovers
- [ ] Add notification list, mark-read, and mark-all-read for the current user only
- [ ] Prove a broker failure does not roll back a receipt
- [ ] Document the worker and beat commands

## Phase 11 — Reports and dashboard

- [ ] Add report permissions to `seed_roles`
- [ ] Implement dashboard aggregates, including 30-day sales, purchases, movement, and value by warehouse
- [ ] Cache the dashboard payload in Redis for 60 seconds and invalidate it when stock changes
- [ ] Implement inventory, low-stock, movement, purchase, sales, warehouse, and product-performance reports
- [ ] Require a date range up to 366 days on movement, purchase, and sales reports
- [ ] Add CSV and xlsx export behind `export_reports`
- [ ] Audit exports
- [ ] Schedule the weekly movement report email for Super Admins
- [ ] Test aggregates against a fixed fixture and test export permission denial

## Phase 12 — Frontend foundation and auth

- [ ] Scaffold Vite, React, TypeScript, Tailwind, React Router, TanStack Query, Axios, Zod, and React Hook Form
- [ ] Add the axios client with bearer access token and single refresh retry
- [ ] Store the refresh token in localStorage and the access token in memory
- [ ] Build login, profile, change password, auth layout, and app layout
- [ ] Add protected routes, access-denied, and not-found
- [ ] Add sidebar and header with logout
- [ ] Enable CORS for the Vite origin
- [ ] Add a loading state and an API error toast
- [ ] Test logged-out redirect and login validation
- [ ] Manually verify login, reload, and logout

## Phase 13 — Frontend master data

- [ ] Build shared table, pagination, modal, confirm dialog, empty state, and form field components
- [ ] Build category list with create and edit
- [ ] Build product list, create, edit, and detail
- [ ] Support product image upload and active filter
- [ ] Build supplier list, create, edit, and detail
- [ ] Build warehouse list, create, edit, and detail
- [ ] Show per-warehouse stock on product detail and warehouse detail
- [ ] Map server validation errors onto forms
- [ ] Hide write actions for Viewer and Sales Staff
- [ ] Manually create one record of each type in the browser

## Phase 14 — Frontend inventory

- [ ] Build the stock overview with warehouse, category, status, and search filters
- [ ] Build receive, transfer, and adjustment forms with confirmation dialogs
- [ ] Show available quantity on transfer and adjustment
- [ ] Build transaction history with type and date filters
- [ ] Build read-only receipt, transfer, and adjustment detail pages
- [ ] Invalidate stock and transaction queries after a successful post
- [ ] Display 409 business-rule messages
- [ ] Manually receive, transfer, and adjust, then confirm history

## Phase 15 — Frontend purchasing and sales

- [ ] Build PO list and draft create/edit with line items
- [ ] Build PO detail with submit, approve, cancel, and receive
- [ ] Show receipt history on the PO
- [ ] Build sales list and draft create/edit with live available quantity
- [ ] Build sales detail with confirm, process, complete, cancel, payment, and return
- [ ] Gate each button on the permission list from `/auth/me/`
- [ ] Surface the notification dropdown from `/notifications/`
- [ ] Manually run a partial PO receive and a sale through completion
- [ ] Manually attempt an oversell and confirm the balance does not change

## Phase 16 — Dashboard, reports, and admin UI

- [ ] Build the dashboard cards and three Recharts visualizations
- [ ] Build inventory, movement, purchase, and sales report pages with filters
- [ ] Add export buttons that download CSV and xlsx
- [ ] Build user management: create, role, warehouse assignment, deactivate
- [ ] Build the audit log table with filters
- [ ] Manually verify Super Admin, a one-warehouse manager, and a Viewer against the same data

## Phase 17 — Hardening

- [ ] Add the concurrent confirm and concurrent complete tests
- [ ] Add a role-matrix smoke test for the five roles
- [ ] Check stock and dashboard endpoints for N+1 queries and fix them with `select_related` or `prefetch_related`
- [ ] Add any missing indexes from the design as a migration
- [ ] Add `config/settings/prod.py` with `DEBUG` off, allowed hosts, SSL flags, and a separate JWT signing key setting
- [ ] Confirm production refuses to start when `SECRET_KEY` or database settings are missing
- [ ] Review throttles on login and refresh
- [ ] Run the full backend suite and the frontend unit tests
- [ ] Click through the main flows on a desktop width and a narrow width

## Phase 18 — Documentation and deployment

- [ ] Write the README: purpose, architecture, stack, setup, MySQL, Redis, env vars, seed, tests, and demo walkthrough
- [ ] Document API docs URL, roles, and the stock ledger approach
- [ ] Add Dockerfiles and `docker-compose.yml` for MySQL, Redis, Gunicorn, worker, and beat
- [ ] Add Gunicorn to `requirements/prod.txt`
- [ ] Add an optional local-only `seed_demo` command
- [ ] Document production process layout: Nginx, Gunicorn, one beat process, media, and backups
- [ ] Follow the README against a clean database and reach a logged-in dashboard
