# Django Inventory & Warehouse Management System

Portfolio project for multi-warehouse inventory: stock balances, an immutable ledger, purchase and sales workflows, JWT roles, Celery alerts, reports, and a React admin UI.

![Dashboard](docs/screenshots/01-dashboard.png)

## Screenshots

| Products | Product detail |
| --- | --- |
| ![Products](docs/screenshots/02-products.png) | ![Product detail](docs/screenshots/03-product-detail.png) |
| **Stock levels** | **Transaction ledger** |
| ![Stock levels](docs/screenshots/10-stock-levels.png) | ![Transaction ledger](docs/screenshots/11-transactions-ledger.png) |
| **Purchase order** | **Sales order** |
| ![Purchase order detail](docs/screenshots/16-purchase-order-detail.png) | ![Sales order detail](docs/screenshots/19-sales-order-detail.png) |
| **Inventory report** | **Audit log** |
| ![Inventory report](docs/screenshots/20-report-inventory.png) | ![Audit log](docs/screenshots/25-audit-logs.png) |

<details>
<summary>More screenshots</summary>

| Sign in | New product |
| --- | --- |
| ![Sign in](docs/screenshots/00-login.png) | ![New product](docs/screenshots/04-product-form.png) |
| **Categories** | **Suppliers** |
| ![Categories](docs/screenshots/05-categories.png) | ![Suppliers](docs/screenshots/06-suppliers.png) |
| **Supplier detail** | **Warehouses** |
| ![Supplier detail](docs/screenshots/07-supplier-detail.png) | ![Warehouses](docs/screenshots/08-warehouses.png) |
| **Warehouse detail** | **Receive stock** |
| ![Warehouse detail](docs/screenshots/09-warehouse-detail.png) | ![Receive stock](docs/screenshots/12-receive-stock.png) |
| **Transfer stock** | **Adjust stock** |
| ![Transfer stock](docs/screenshots/13-transfer-stock.png) | ![Adjust stock](docs/screenshots/14-adjust-stock.png) |
| **Purchase orders** | **New purchase order** |
| ![Purchase orders](docs/screenshots/15-purchase-orders.png) | ![New purchase order](docs/screenshots/17-purchase-order-form.png) |
| **Sales orders** | **Movement report** |
| ![Sales orders](docs/screenshots/18-sales-orders.png) | ![Movement report](docs/screenshots/21-report-movements.png) |
| **Purchase report** | **Sales report** |
| ![Purchase report](docs/screenshots/22-report-purchases.png) | ![Sales report](docs/screenshots/23-report-sales.png) |
| **New supplier** | **New sales order** |
| ![New supplier](docs/screenshots/27-supplier-form.png) | ![New sales order](docs/screenshots/28-sales-order-form.png) |
| **Users** | **New user** |
| ![Users](docs/screenshots/24-users.png) | ![New user](docs/screenshots/29-user-form.png) |
| **Profile** | |
| ![Profile](docs/screenshots/26-profile.png) | |

</details>

## Stack

| Layer | Choice |
| --- | --- |
| API | Django 5.2 LTS, Django REST Framework, SimpleJWT, drf-spectacular |
| Database | MySQL 8 (InnoDB, `utf8mb4`) |
| Cache / broker | Redis |
| Jobs | Celery worker + one Celery beat process |
| App server | Gunicorn |
| Frontend | Vite, React 19, TypeScript, TanStack Query, Tailwind, Recharts |

## Architecture

```text
Browser (Vite SPA)
  → API `/api/v1/` (JWT)
       → MySQL stock balances + ledger
       → Redis (cache, Celery broker)
  → Celery worker (stock alerts, email)
  → Celery beat (hourly low-stock scan)
```

**Stock ledger.** `StockLevel` holds `on_hand` and `reserved`. Physical movements write `InventoryTransaction` rows with `quantity_change` and `balance_after` inside the same database transaction as the balance update. Reservations are not ledger rows; they live on the sales order until complete or cancel. For every product and warehouse, `sum(quantity_change)` equals `on_hand`.

**Warehouse scope.** Super Admin sees every warehouse. Everyone else only sees warehouses assigned on their user. Missing assignment means no warehouse access.

**Roles.** Django groups seeded by `seed_roles`: Super Admin, Warehouse Manager, Inventory Staff, Sales Staff, Viewer.

## Local setup

### 1. Prerequisites

- Python 3.12+
- MySQL 8 listening locally
- Redis (login throttle, dashboard cache, Celery)
- Node.js 20+ for the frontend

### 2. Backend

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
```

Edit `.env`: set `SECRET_KEY`, `DB_NAME`, `DB_USER`, and `DB_PASSWORD`. Create the MySQL database, then:

```powershell
python manage.py migrate
python manage.py seed_roles
python manage.py createsuperuser
python manage.py seed_demo
```

`seed_demo` is **local-only**. It creates demo warehouses (`DEMO-MAIN`, `DEMO-STORE`), products (`DEMO-BOLT`, `DEMO-BOX`), and opening stock. It is safe to re-run.

Start Redis, then in three terminals from the repo root:

```powershell
redis-server --bind 127.0.0.1 --port 6379 --protected-mode yes
.\.venv\Scripts\python.exe manage.py runserver 127.0.0.1:8000
celery -A config worker -l info
```

Optional beat process (one instance only):

```powershell
celery -A config beat -l info
```

### 3. Frontend

```powershell
cd frontend
copy .env.example .env
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) and sign in with the superuser. The dashboard should show demo inventory value after `seed_demo`.

Production frontend build:

```powershell
cd frontend
npm run build
```

Serve `frontend/dist` behind Nginx (see Production below). Set `VITE_API_URL` to the public API base, for example `https://inventory.example.com/api/v1`.

### 4. API docs and health

| URL | Purpose |
| --- | --- |
| [http://127.0.0.1:8000/api/docs/](http://127.0.0.1:8000/api/docs/) | Swagger UI |
| [http://127.0.0.1:8000/api/schema/](http://127.0.0.1:8000/api/schema/) | OpenAPI schema |
| [http://127.0.0.1:8000/api/v1/health/](http://127.0.0.1:8000/api/v1/health/) | Health check |

### 5. Tests

```powershell
.\.venv\Scripts\python.exe -m pytest
cd frontend
npm test
npm run lint
```

## Environment variables

Root `.env` (from `.env.example`):

| Variable | Notes |
| --- | --- |
| `SECRET_KEY` | Required. No default. |
| `DEBUG` | Local `True`. Production settings refuse `True`. |
| `ALLOWED_HOSTS` | Comma-separated hosts. |
| `CORS_ALLOWED_ORIGINS` | Vite origins in development. |
| `DB_NAME` / `DB_USER` / `DB_PASSWORD` | Required. |
| `DB_HOST` / `DB_PORT` | Defaults `127.0.0.1` / `3306`. |
| `REDIS_URL` | Django cache (db 1). |
| `CELERY_BROKER_URL` | Celery broker (db 0). |
| `JWT_SIGNING_KEY` | Required only with `config.settings.prod`. |

Frontend `frontend/.env`:

| Variable | Notes |
| --- | --- |
| `VITE_API_URL` | Default `http://127.0.0.1:8000/api/v1`. |

## Docker Compose

Compose starts MySQL, Redis, a one-shot migrate, Gunicorn, one worker, and one beat. Docker Desktop is required.

```powershell
docker compose up --build
```

The committed `.env.docker` uses obvious local passwords for Compose only. Point the Vite app at `http://127.0.0.1:8000/api/v1` while Compose publishes port `8000`. MySQL is published on host port `3307`.

## Production layout

Use `DJANGO_SETTINGS_MODULE=config.settings.prod`. Production refuses empty `SECRET_KEY`, database credentials, or `ALLOWED_HOSTS`, requires `JWT_SIGNING_KEY`, and forces `DEBUG=False` with SSL and HSTS flags.

```text
Browser
  → Nginx (TLS, SPA, /media/)
       → Gunicorn (Django API)
            → MySQL 8
            → Redis
       → Celery worker
       → Celery beat (exactly one)
```

Suggested Nginx shape:

- Serve `frontend/dist` for the SPA.
- Proxy `/api/` and `/admin/` to Gunicorn (`127.0.0.1:8000`).
- Alias `/media/` to the media volume; do not let Django serve media in production.
- Collect static with `python manage.py collectstatic` if you expose Django admin assets from the same host.

Process supervision (systemd or Compose restart policies): one Gunicorn unit, one worker, **one** beat. Two beat processes would duplicate the hourly scan and weekly emails.

Backups: nightly `mysqldump` of the inventory database and a copy of the media directory. Keep secrets in the process environment, not in the image.

Example Gunicorn command:

```text
gunicorn config.wsgi:application --bind 127.0.0.1:8000 --workers 3
```

Set `DJANGO_SETTINGS_MODULE=config.settings.prod` in that environment.

## Demo walkthrough

1. Sign in as the superuser created above.
2. Open Dashboard — inventory value and warehouse cards should reflect `DEMO-*` stock.
3. Inventory → Receive more stock, or Purchasing → create a PO, submit, approve, and receive.
4. Sales → draft an order against `DEMO-MAIN`, confirm (reserves), complete (deducts and writes a SALE ledger row).
5. Reports → Inventory / Movements; export CSV if the role allows `reports.export_reports`.
6. Admin → users, roles, warehouse assignments, audit log.

## Project layout

```text
apps/           Django domains (accounts, inventory, purchasing, sales, …)
config/         settings (dev / prod), WSGI, Celery
frontend/       Vite React SPA
docs/           README screenshots
requirements/   base, dev, prod
docker-compose.yml
Dockerfile
manage.py
```
