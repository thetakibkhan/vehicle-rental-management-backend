# Vehicle Rental Management API

A REST API for authenticated staff to manage a vehicle fleet, record rentals, prevent double-booking, and review monthly rental activity. It uses Node.js, TypeScript, Express, Knex, PostgreSQL, Joi, JWT, and local Multer-based photo storage.

## Overview

This backend was built for a vehicle-rental take-home assignment. After logging in, staff can manage vehicles and their photos, create and update customer rentals, and generate per-vehicle monthly reports with correctly clipped rental days and revenue.

The implementation uses a feature-first, layered structure so HTTP handling, business rules, persistence, and infrastructure concerns remain separate and easy to review.

## Key Features

- Staff login with bcrypt password verification and one-hour JWT access tokens
- JWT protection for every vehicle, rental, and report route
- Vehicle creation, retrieval, update, filtering, search, pagination, and soft deletion
- Required vehicle photo on creation and optional photo replacement on update
- Local JPEG, PNG, and WebP storage with a 5 MB upload limit
- Rental creation, retrieval, update, deletion, filtering, search, and pagination
- Inclusive active-rental overlap detection on both create and update
- Server-side rental amount calculation using exact two-decimal arithmetic
- Transaction and row-lock protection around availability checks and writes
- Monthly per-vehicle bookings, rented days, revenue, and highest-revenue vehicle
- Joi validation, typed API handlers, and centralized error responses
- Reproducible PostgreSQL migrations and development seeds
- Strict TypeScript, ESLint, Prettier, Vitest, and Supertest setup

## Tech Stack

| Area                      | Technology                              |
| ------------------------- | --------------------------------------- |
| Runtime                   | Node.js 24+, native ESM                 |
| Language                  | TypeScript with strict compiler options |
| HTTP framework            | Express 5                               |
| Database                  | PostgreSQL 18                           |
| Query and migration layer | Knex 3 with the `pg` driver             |
| Validation                | Joi                                     |
| Authentication            | JSON Web Tokens via `jose`              |
| Password hashing          | bcrypt                                  |
| File uploads              | Multer with local filesystem storage    |
| Testing                   | Vitest and Supertest                    |
| Code quality              | ESLint and Prettier                     |
| Development tooling       | tsx and Docker Compose                  |

## Architecture

### Project Structure

```text
.
├── src/
│   ├── auth/                  # Login, JWT, password hashing, staff access, rate limiting
│   ├── vehicles/              # Vehicle router/controller, service, repository, photo storage
│   ├── rentals/               # Rental router/controller, service, SQL repository, calculations
│   ├── reports/               # Report router/controller, service, response mapping, aggregate SQL
│   ├── common/errors/         # Application errors and centralized error handling
│   ├── config/                # Application and seed environment validation
│   ├── db/
│   │   ├── migrations/        # staff, vehicles, and rentals schema
│   │   ├── seeds/             # Demo staff, fleet, and representative rentals
│   │   └── scripts/           # Connection, migration, rollback, and seed commands
│   ├── app.ts                 # Express application composition
│   └── server.ts              # Dependency wiring, startup, and shutdown
├── tests/                     # Focused unit and HTTP-boundary tests
├── uploads/                   # Gitignored local vehicle photos
├── compose.yaml               # Local PostgreSQL service
├── .env.example               # Safe configuration template
└── package.json               # Scripts and dependencies
```

Controller classes are co-located with their feature routers. Dependencies are connected manually in `src/server.ts`, keeping services and repositories independently testable without introducing a dependency-injection framework.

### Request Flow

```text
Route → JWT / Multer / Joi → Controller → Service → Repository → Knex or parameterized SQL → PostgreSQL
```

- **Routes and middleware** select the endpoint, authenticate staff, and handle multipart uploads.
- **Controllers** validate HTTP input, map public request fields to application input, and send responses.
- **Services** enforce business rules, calculate amounts, and own transaction boundaries.
- **Repositories** contain Knex queries and the parameterized SQL used for overlap detection and reporting.

This keeps non-trivial business logic out of route handlers, as required by the assignment.

## Getting Started

### Prerequisites

- Git
- Node.js `>=24`
- npm (the repository records npm `11.6.2`)
- Docker with Docker Compose, or an accessible PostgreSQL database

The included Compose configuration uses PostgreSQL `18-alpine`.

### Installation

```bash
git clone https://github.com/thetakibkhan/vehicle-rental-management-backend.git
cd vehicle-rental-management-backend
npm install
```

### Environment Variables

Copy the committed template and replace its placeholder secrets:

```bash
cp .env.example .env
```

| Variable              | Required  | Description                                                                   |
| --------------------- | --------- | ----------------------------------------------------------------------------- |
| `NODE_ENV`            | No        | `development`, `test`, or `production`; defaults to `development`             |
| `PORT`                | No        | HTTP server port; defaults to `3000`                                          |
| `DB_HOST`             | Yes       | PostgreSQL host                                                               |
| `DB_PORT`             | No        | PostgreSQL port; defaults to `5432`                                           |
| `DB_NAME`             | Yes       | PostgreSQL database name                                                      |
| `DB_USER`             | Yes       | PostgreSQL user                                                               |
| `DB_PASSWORD`         | Yes       | PostgreSQL password                                                           |
| `DB_POOL_MIN`         | No        | Minimum Knex pool size; defaults to `2`                                       |
| `DB_POOL_MAX`         | No        | Maximum Knex pool size; defaults to `10` and cannot be lower than the minimum |
| `JWT_SECRET`          | Yes       | HS256 signing secret with at least 32 characters                              |
| `UPLOAD_PATH`         | Yes       | Writable local directory for vehicle photos, such as `./uploads`              |
| `SEED_STAFF_NAME`     | For seeds | Name for the demo staff account                                               |
| `SEED_STAFF_EMAIL`    | For seeds | Valid email for the demo staff account                                        |
| `SEED_STAFF_PASSWORD` | For seeds | Demo staff password with at least 12 characters                               |

Environment values are validated with Joi before the server or database scripts continue. Secret values are not included in validation error messages.

Vehicle photos intentionally use local storage, following the assignment. A deployed instance therefore needs a persistent, writable filesystem mounted at `UPLOAD_PATH` if photos must survive restarts or redeployments.

### Database Setup

The simplest local setup uses the included Compose service. Its database name, user, password, and exposed host port come from `.env`.

```bash
docker compose up -d
docker compose ps
npm run db:check
npm run db:migrate
npm run db:seed
```

Wait until `docker compose ps` reports PostgreSQL as healthy before running the database scripts. If port `5432` is already occupied, set `DB_PORT=5433` in `.env` before starting Compose.

For an existing PostgreSQL server, create a database and user matching the `DB_*` values, then run the same `db:check`, `db:migrate`, and `db:seed` commands.

The seed command is development-only and refuses to run when `NODE_ENV=production`. It reloads the demo staff, vehicles, and rentals, so it should not be used against data that must be preserved.

### Running the Application

Development mode with automatic restart:

```bash
npm run dev
```

Build and run the compiled application:

```bash
npm run build
npm start
```

Verify the running process:

```bash
curl http://localhost:3000/health
```

Expected response:

```json
{
  "success": true,
  "data": {
    "status": "ok"
  }
}
```

## API Documentation

Except for login and the health check, all endpoints require:

```text
Authorization: Bearer <token>
```

### Authentication

| Method | Endpoint      | Description                                                 | Auth |
| ------ | ------------- | ----------------------------------------------------------- | ---- |
| `POST` | `/auth/login` | Validate `email` and `password`, then return a one-hour JWT | No   |

Successful login returns `token`, `tokenType: "Bearer"`, and `expiresIn: 3600`.

### Vehicles

| Method   | Endpoint              | Description                                                               | Auth |
| -------- | --------------------- | ------------------------------------------------------------------------- | ---- |
| `GET`    | `/vehicles`           | List active vehicles with pagination, category filtering, and name search | Yes  |
| `GET`    | `/vehicles/:id`       | Get one active vehicle                                                    | Yes  |
| `GET`    | `/vehicles/:id/photo` | Download the stored vehicle photo                                         | Yes  |
| `POST`   | `/vehicles`           | Create a vehicle from multipart form-data with a required photo           | Yes  |
| `PUT`    | `/vehicles/:id`       | Fully update vehicle fields and optionally replace its photo              | Yes  |
| `DELETE` | `/vehicles/:id`       | Soft-delete a vehicle by setting `deleted_at`                             | Yes  |

`GET /vehicles` accepts `page` (default 1), `limit` (default 20, maximum 100), `category`, and `search`. Create and update use the multipart fields `name`, `plateNumber`, `category`, `dailyRate`, and `photo`; `photo` is required only for creation.

### Rentals

| Method   | Endpoint       | Description                                                | Auth |
| -------- | -------------- | ---------------------------------------------------------- | ---- |
| `GET`    | `/rentals`     | List rentals with filters, customer search, and pagination | Yes  |
| `GET`    | `/rentals/:id` | Get one rental                                             | Yes  |
| `POST`   | `/rentals`     | Create a rental after availability and amount checks       | Yes  |
| `PUT`    | `/rentals/:id` | Update a rental and re-run relevant booking rules          | Yes  |
| `DELETE` | `/rentals/:id` | Permanently delete a rental                                | Yes  |

`GET /rentals` accepts:

- `page` (default 1) and `limit` (default 20, maximum 100)
- `vehicle_id`
- `status`: `booked`, `ongoing`, `completed`, or `cancelled`
- `date_from` and `date_to`, which select rentals intersecting the requested range
- `search`, which matches customer names case-insensitively

Create and update bodies use `vehicle_id`, `customer_name`, `customer_phone`, `start_date`, `end_date`, and optional `status`. The default status is `booked`; clients cannot provide `total_amount`.

### Reports

| Method | Endpoint                         | Description                                | Auth |
| ------ | -------------------------------- | ------------------------------------------ | ---- |
| `GET`  | `/reports/rentals?month=YYYY-MM` | Return monthly rental activity per vehicle | Yes  |

`month` is required. The optional `vehicle_id` query parameter limits the report to one vehicle:

```text
GET /reports/rentals?month=2026-08&vehicle_id=1
```

The response contains `id`, `name`, `total_bookings`, `days_rented`, and `revenue` for each qualifying vehicle, plus `highest_revenue_vehicle`.

## Core Business Logic

### Rental Overlap Prevention

Only rentals with `booked` or `ongoing` status block availability. `completed` and `cancelled` rentals do not block a new active booking.

The repository uses a parameterized PostgreSQL query to detect any active rental for the same vehicle where:

```text
existing.start_date <= requested.end_date
AND
existing.end_date >= requested.start_date
```

Dates are inclusive, so these comparisons catch every overlap shape: a shared boundary day, partial overlap, complete containment, or a requested range surrounding an existing rental. Non-overlapping ranges fail at least one comparison.

The check runs during creation. Updates lock the existing rental, run the same check against the requested vehicle and dates, and exclude the rental being updated with `id <> current_rental_id`; otherwise, a rental would conflict with itself.

Creation and update execute inside a Knex transaction. The service locks the affected vehicle row with PostgreSQL `FOR UPDATE` before checking and writing. Every concurrent booking for that vehicle must acquire the same lock, so a second transaction checks availability only after the first transaction commits. When an update changes vehicles, both vehicle rows are locked in ascending ID order to keep lock acquisition consistent.

An overlap returns `409 Conflict` with the error code `RENTAL_OVERLAP`.

### Rental Amount Calculation

The API calculates `total_amount` and rejects unknown request fields, so pricing is not trusted to the client.

```text
rental_days = UTC(end_date - start_date) + 1 inclusive day
total_amount = daily_rate × rental_days
```

A rental from `2026-08-15` through `2026-08-15` therefore counts as one day. Daily rates are converted to integer minor units with `BigInt`, multiplied by the inclusive day count, and formatted back to a two-decimal string to avoid floating-point money errors.

### Monthly Rental Reporting

The report repository uses one parameterized PostgreSQL aggregate query. It selects non-cancelled rentals that intersect the requested month and clips every rental to that month's boundaries:

```text
effective_start = max(rental_start, month_start)
effective_end   = min(rental_end, month_end)
days_in_month  = effective_end - effective_start + 1
```

For each vehicle:

- **`total_bookings`** counts non-cancelled rentals that overlap the month.
- **`days_rented`** sums each rental's inclusive `days_in_month`.
- **`revenue`** prorates the stored historical `total_amount` by the rental's total inclusive days, then multiplies it by `days_in_month`.
- **`highest_revenue_vehicle`** is selected from the aggregated rows; equal revenue is resolved by the lowest vehicle ID.

Using stored `total_amount` preserves the price agreed when the rental was created instead of recalculating old revenue from a vehicle's current daily rate. Cancelled rentals are excluded, while completed, booked, and ongoing rentals contribute. Soft-deleted vehicles remain visible when they have historical rental activity.

For example, a six-day rental from July 29 through August 3 contributes only August 1–3 to the August report: 3 rented days and 3/6 of its stored total amount.

## Database Design

```text
staff
  id PK
  email UNIQUE

vehicles
  id PK
  plate_number UNIQUE
  deleted_at nullable
       │
       │ 1
       └────────< rentals
                    vehicle_id FK
                    status
                    start_date
                    end_date
```

- **`staff`** stores a unique email, bcrypt password hash, name, and timestamps.
- **`vehicles`** stores fleet details, a unique plate number, optional photo filename, timestamps, and nullable `deleted_at` for soft deletion.
- **`rentals`** belongs to one vehicle and stores customer details, inclusive dates, historical total amount, status, and timestamps.
- The rental foreign key restricts deletion of referenced vehicles and cascades vehicle ID updates.
- Database checks enforce non-negative rates and totals, valid date ranges, and the four allowed rental statuses.
- Indexes support vehicle category/soft-delete lookups and rental vehicle, status, and date-range queries.

The development seed creates one bcrypt-hashed staff member, two vehicles, a July 29–August 3 month-boundary rental, and a same-day rental.

## Authentication

`POST /auth/login` normalizes the submitted email, looks up the staff account, and compares the password with bcrypt. Missing accounts still trigger a comparison against a fixed dummy bcrypt hash, reducing timing differences that could reveal whether an email exists.

Successful authentication returns an HS256 JWT with the staff ID in `sub`, along with issuer, audience, issued-at, and one-hour expiration claims. The authentication middleware verifies these values, adds the decoded staff ID to Express's typed `Request`, and protects every route under `/vehicles`, `/rentals`, and `/reports`.

```text
Authorization: Bearer <token>
```

Missing, malformed, expired, or invalid tokens return the same generic `401` response.

## Validation & Error Handling

- Joi validates environment configuration, login bodies, vehicle input, rental input, path parameters, filters, and report queries.
- Unknown body/query fields are rejected by the relevant schemas.
- Date calculations verify real ISO calendar dates and reject end dates before start dates.
- Multer accepts one `photo` field, limits it to 5 MB, and permits only JPEG, PNG, or WebP MIME types.
- A centralized Express error handler prevents internal stack traces from reaching clients.

Representative responses include:

| Status                      | Use                                                     |
| --------------------------- | ------------------------------------------------------- |
| `401 Unauthorized`          | Invalid credentials or missing/invalid JWT              |
| `404 Not Found`             | Unknown route, vehicle, rental, or photo                |
| `409 Conflict`              | Duplicate plate number or overlapping active rental     |
| `422 Unprocessable Entity`  | Invalid body, query, ID, date range, or upload          |
| `429 Too Many Requests`     | Login failure limit reached                             |
| `500 Internal Server Error` | Unexpected server failure with a generic public message |

Application errors use a consistent shape:

```json
{
  "success": false,
  "error": {
    "code": "RENTAL_OVERLAP",
    "message": "Vehicle is unavailable for the selected dates"
  }
}
```

## Testing

Run the focused automated suite with:

```bash
npm test
```

The current tests cover:

- Same-day rental amount calculation
- Exact amount calculation for a rental spanning two months
- Monthly report service output and highest-revenue selection
- Successful authentication, email normalization, and unknown-account handling
- JWT middleware rejection and authenticated-request enrichment
- Active-vehicle pagination and soft-deleted/missing vehicle behavior
- Absolute path resolution for locally stored photos
- Health and standardized not-found responses
- Environment defaults, secret-safe validation errors, and Knex pool mapping

The suite is intentionally focused. It does not currently run database-backed integration tests against the overlap SQL or monthly aggregate SQL. The migrations and representative seed data make those queries straightforward to verify manually.

## Design Decisions

- **Feature-first layered architecture:** Each domain keeps its controller/router, service, and repository close together, while business decisions remain in services and SQL remains in repositories.
- **Manual dependency injection:** `server.ts` wires concrete adapters into interfaces, keeping the design explicit and testable without a container or framework.
- **Parameterized real SQL:** Overlap detection and monthly aggregation use readable SQL because these rules are easier to review directly and the assignment explicitly asks for SQL competency.
- **Transaction-safe availability:** A vehicle row lock surrounds the overlap check and rental write, closing the race where two concurrent requests could both observe availability.
- **Server-owned money calculations:** Clients never provide totals; inclusive day counts and integer minor-unit arithmetic keep rental pricing deterministic.
- **Historical reporting:** Monthly revenue is prorated from each stored rental total, so later vehicle-rate changes do not rewrite historical revenue.
- **Vehicle soft deletion:** `deleted_at` hides vehicles from normal fleet operations without removing records needed by existing rentals and historical reports.
- **Local generated photo names:** UUID filenames avoid trusting user filenames, and the storage layer prevents path traversal by accepting basename-only stored names.

## Bonus Features

All three optional items listed in the assignment are implemented:

- **Transaction-safe booking:** Availability checking and rental creation/update run in a transaction with PostgreSQL row locks.
- **Rental pagination and search:** `GET /rentals` supports `page`, `limit`, and case-insensitive customer-name `search`, in addition to required filters.
- **Login rate limiting:** After five failed attempts per IP within 15 minutes, subsequent attempts return `429` with a `Retry-After` header. A successful login clears that IP's failure window.

The limiter is intentionally in-memory for this single-process assignment and is not presented as distributed rate-limiting infrastructure.

## Available Scripts

| Command                | Purpose                                            |
| ---------------------- | -------------------------------------------------- |
| `npm run dev`          | Run the TypeScript server in watch mode            |
| `npm run build`        | Compile application source to `dist/`              |
| `npm start`            | Run the compiled `dist/server.js` application      |
| `npm run typecheck`    | Type-check source and tests without emitting files |
| `npm run lint`         | Run ESLint                                         |
| `npm run format`       | Format supported files with Prettier               |
| `npm run format:check` | Check formatting without changing files            |
| `npm test`             | Run the Vitest suite once                          |
| `npm run test:watch`   | Run Vitest in watch mode                           |
| `npm run db:check`     | Verify PostgreSQL connectivity                     |
| `npm run db:migrate`   | Apply all pending Knex migrations                  |
| `npm run db:rollback`  | Roll back the latest migration batch               |
| `npm run db:seed`      | Reload non-production demo data                    |
