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

Suggested commit when Phase 3 is committed:

```text
feat: add roles, user administration, and audit logging

Seed the five roles, manage users through the API, and record login, logout, and user changes.
```

Suggested commit when Phase 4 is committed:

```text
feat: add categories and products

Add the catalog API with nested categories, product images, and role-based write access.
```

Suggested commit when Phase 5 is committed:

```text
feat: add suppliers, warehouses, and warehouse assignments

Limit each user to assigned warehouses and let products record a preferred supplier.
```

Suggested commit when Phase 6 is committed:

```text
feat: add stock balances and receiving

Post warehouse receipts through a locked ledger so every stock change keeps a balance history.
```

Suggested commit when Phase 7 is committed:

```text
feat: add stock transfers and adjustments

Move available stock between warehouses and correct balances without dropping on-hand below reserved.
```

Suggested commit when Phase 8 is committed:

```text
feat: add purchase orders and receiving

Receive approved purchase orders into stock through the ledger, including partial receipts.
```

Suggested commit when Phase 9 is committed:

```text
feat: add sales orders, reservations, and returns

Reserve stock on confirm, deduct it on complete, and restock returns without selling more than is available.
```

Suggested commit when Phase 10 is committed:

```text
feat: add notifications and Celery tasks

Notify managers after stock documents commit, and scan low stock hourly without blocking the stock write.
```

Suggested commit when Phase 11 is committed:

```text
feat: add reports and dashboard API

Expose scoped inventory, purchasing, and sales reports, and cache the dashboard until stock changes.
```

Suggested commit when Phase 12 is committed:

```text
feat: scaffold React app and authentication UI

Add a Vite shell that logs in, restores the session, and logs out, and allow that origin through CORS.
```

Suggested commit when Phase 13 is committed:

```text
feat: add master-data screens

Add category, product, supplier, and warehouse screens with scoped stock on the detail pages.
```

Suggested commit when Phase 14 is committed:

```text
feat: add inventory screens

Add stock, receiving, transfers, and adjustments, and keep history in sync after each post.
```

Suggested commit when Phase 15 is committed:

```text
feat: add purchasing and sales screens

Add purchase-order and sales-order screens, and show notifications in the header.
```

Suggested commit when Phase 16 is committed:

```text
feat: add dashboard, reports, and admin screens

Show dashboard charts, scoped reports with export, and user and audit administration.
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

- [x] Add custom permissions `accounts.manage_users` and `audit.view_auditlog`
- [x] Write idempotent `seed_roles` for Super Admin, Warehouse Manager, Inventory Staff, Sales Staff, and Viewer
- [x] Attach the Phase 3 permissions; leave later permissions for their phases and re-run the same command
- [x] Put every superuser in Super Admin during seed
- [x] Build user list, create, update, deactivate, and replace-role endpoints
- [x] Create `AuditLog` and `log_audit`
- [x] Record login success, login failure, and logout without storing passwords
- [x] Record user and role changes
- [x] Add `GET /api/v1/audit-logs/` for Super Admin
- [x] Test 403 for a non-admin and idempotent seed

## Phase 4 — Catalog

- [x] Create `Category` with parent, slug, active flag, and sibling-unique name
- [x] Enforce depth of two and reject cycles
- [x] Create `Product` with SKU, barcode, prices, reorder level, unit, active flag, and image
- [x] Uppercase SKU on write
- [x] Validate image type and 2 MB limit
- [x] Add category and product CRUD endpoints with filters, search, and ordering
- [x] Deactivate instead of deleting
- [x] Audit create and update
- [x] Grant catalog model permissions in `seed_roles`
- [x] Test uniqueness, category depth, image rejection, and viewer write denial

## Phase 5 — Suppliers, warehouses, and scope

- [x] Create `Supplier` and `Warehouse` with unique codes and active flags
- [x] Add optional `preferred_supplier` on product
- [x] Create `UserWarehouse`
- [x] Add replace-assignments endpoint
- [x] Implement `visible_warehouses(user)` with superuser bypass and fail-closed default
- [x] Add supplier and warehouse endpoints
- [x] Audit writes and assignment changes
- [x] Grant permissions in `seed_roles`
- [x] Test unique codes, assignment replace, and empty visibility for a user with no warehouses

## Phase 6 — Inventory core and receiving

- [x] Create `StockLevel` with unique product/warehouse, non-negative checks, and reserved ≤ on-hand
- [x] Create append-only `InventoryTransaction`
- [x] Create `DocumentSequence`, `StockReceipt`, and `StockReceiptItem`
- [x] Implement locked get-or-create of a stock row
- [x] Implement `receive_stock` inside `transaction.atomic` with idempotency key
- [x] Write `RECEIPT` rows with `balance_after` and `created_by`
- [x] Add stock list with `available` annotation and status filter
- [x] Add receipt and transaction list endpoints
- [x] Enforce warehouse scope
- [x] Grant `receive_stock` to Super Admin, Warehouse Manager, and Inventory Staff
- [x] Audit receives
- [x] Test posting, idempotency, permissions, scope, and ledger sum equals on-hand

## Phase 7 — Adjustments and transfers

- [x] Create transfer and adjustment models
- [x] Implement `transfer_stock` with lock ordering, available check, and paired ledger rows
- [x] Implement `adjust_stock` with reason codes and required note for `OTHER`
- [x] Reject transfers that would consume reserved stock
- [x] Reject adjustments that would drop on-hand below reserved
- [x] Add endpoints and permissions (`transfer_stock`, `adjust_stock` for Super Admin and Warehouse Manager)
- [x] Audit both operations
- [x] Test insufficient stock, same warehouse, rollback, and permission denial

## Phase 8 — Purchase orders

- [x] Create PO, PO line, purchase receipt, and receipt line models
- [x] Store line totals and header total
- [x] Allow edits only in `DRAFT`
- [x] Implement submit, approve, and cancel rules
- [x] Implement receive: cap at remaining, update `quantity_received`, post `PURCHASE`, set partial or received status
- [x] Keep the whole receive in one database transaction
- [x] Record receiving history as receipt documents
- [x] Add list filters by status, supplier, warehouse, and date
- [x] Grant submit and approve to Super Admin and Warehouse Manager; grant receive also to Inventory Staff
- [x] Audit status changes and receives
- [x] Leave a single service function other apps can call after commit for later notifications
- [x] Test illegal transitions, over-receive, partial then complete, and failed receive leaving stock unchanged

## Phase 9 — Sales and returns

- [x] Create sales order, line, return, and return line models
- [x] Snapshot unit price and store subtotal, tax, and total
- [x] Edit lines only in `DRAFT`
- [x] Confirm: lock lines in product order and increase `reserved` or fail the whole order
- [x] Process: status only
- [x] Complete: decrease `on_hand` and `reserved`, write `SALE`
- [x] Cancel: release reservation when one exists; reject when completed
- [x] Return: only completed orders, cannot exceed remaining quantity, write `RETURN`
- [x] Payment status patch independent of stock
- [x] Enforce warehouse scope and available stock
- [x] Grant sales action permissions to Super Admin and Sales Staff
- [x] Audit status changes and returns
- [x] Test oversell, reservation conflict, complete, cancel, immutability, return cap, and concurrent complete

## Phase 10 — Notifications and background jobs

- [x] Add Redis, Celery, django-celery-beat, and django-redis to requirements and settings
- [x] Add `config/celery.py` and load it from the app config
- [x] Create `Notification` and `StockAlertState`
- [x] Create in-app notifications after successful PO submit, approve, receive, transfer, and adjustment
- [x] Enqueue `evaluate_stock_alert` after commit of balance changes
- [x] Send email from a Celery task using the console backend locally
- [x] Add the hourly low-stock scan
- [x] Suppress duplicate alerts until stock recovers
- [x] Add notification list, mark-read, and mark-all-read for the current user only
- [x] Prove a broker failure does not roll back a receipt
- [x] Document the worker and beat commands

## Phase 11 — Reports and dashboard

- [x] Add report permissions to `seed_roles`
- [x] Implement dashboard aggregates, including 30-day sales, purchases, movement, and value by warehouse
- [x] Cache the dashboard payload in Redis for 60 seconds and invalidate it when stock changes
- [x] Implement inventory, low-stock, movement, purchase, sales, warehouse, and product-performance reports
- [x] Require a date range up to 366 days on movement, purchase, and sales reports
- [x] Add CSV and xlsx export behind `export_reports`
- [x] Audit exports
- [x] Schedule the weekly movement report email for Super Admins
- [x] Test aggregates against a fixed fixture and test export permission denial

## Phase 12 — Frontend foundation and auth

- [x] Scaffold Vite, React, TypeScript, Tailwind, React Router, TanStack Query, Axios, Zod, and React Hook Form
- [x] Add the axios client with bearer access token and single refresh retry
- [x] Store the refresh token in localStorage and the access token in memory
- [x] Build login, profile, change password, auth layout, and app layout
- [x] Add protected routes, access-denied, and not-found
- [x] Add sidebar and header with logout
- [x] Enable CORS for the Vite origin
- [x] Add a loading state and an API error toast
- [x] Test logged-out redirect and login validation
- [ ] Manually verify login, reload, and logout

## Phase 13 — Frontend master data

- [x] Build shared table, pagination, modal, confirm dialog, empty state, and form field components
- [x] Build category list with create and edit
- [x] Build product list, create, edit, and detail
- [x] Support product image upload and active filter
- [x] Build supplier list, create, edit, and detail
- [x] Build warehouse list, create, edit, and detail
- [x] Show per-warehouse stock on product detail and warehouse detail
- [x] Map server validation errors onto forms
- [x] Hide write actions for Viewer and Sales Staff
- [x] Manually create one record of each type in the browser

## Phase 14 — Frontend inventory

- [x] Build the stock overview with warehouse, category, status, and search filters
- [x] Build receive, transfer, and adjustment forms with confirmation dialogs
- [x] Show available quantity on transfer and adjustment
- [x] Build transaction history with type and date filters
- [x] Build read-only receipt, transfer, and adjustment detail pages
- [x] Invalidate stock and transaction queries after a successful post
- [x] Display 409 business-rule messages
- [x] Manually receive, transfer, and adjust, then confirm history

## Phase 15 — Frontend purchasing and sales

- [x] Build PO list and draft create/edit with line items
- [x] Build PO detail with submit, approve, cancel, and receive
- [x] Show receipt history on the PO
- [x] Build sales list and draft create/edit with live available quantity
- [x] Build sales detail with confirm, process, complete, cancel, payment, and return
- [x] Gate each button on the permission list from `/auth/me/`
- [x] Surface the notification dropdown from `/notifications/`
- [x] Manually run a partial PO receive and a sale through completion
- [x] Manually attempt an oversell and confirm the balance does not change

## Phase 16 — Dashboard, reports, and admin UI

- [x] Build the dashboard cards and three Recharts visualizations
- [x] Build inventory, movement, purchase, and sales report pages with filters
- [x] Add export buttons that download CSV and xlsx
- [x] Build user management: create, role, warehouse assignment, deactivate
- [x] Build the audit log table with filters
- [x] Manually verify Super Admin, a one-warehouse manager, and a Viewer against the same data

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
