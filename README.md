# Vehicle Rental Management Backend

A complete Node.js and TypeScript REST API for the company-provided vehicle rental assignment. It uses Express, Knex, PostgreSQL, Joi, JWT authentication, and local photo storage.

The company instructions and private planning documents are intentionally excluded from this public repository.

## Requirements

- Node.js 24 LTS
- npm
- PostgreSQL 18, installed locally or started through Docker Compose

## Quick start

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create local configuration:

   ```bash
   cp .env.example .env
   ```

   Set a local database password, a JWT secret of at least 32 characters, and a seed password of at least 12 characters.

3. Start PostgreSQL:

   ```bash
   docker compose up -d
   ```

4. Build the schema and load demo data:

   ```bash
   npm run db:check
   npm run db:migrate
   npm run db:seed
   ```

5. Start the API:

   ```bash
   npm run dev
   ```

   `GET http://localhost:3000/health` confirms the API is running.

## Authentication

`POST /auth/login` accepts the seeded staff email and password and returns a one-hour JWT. Send it on every vehicle, rental, and report request:

```text
Authorization: Bearer <token>
```

## API endpoints

| Method           | Endpoint                                     | Notes                                                                        |
| ---------------- | -------------------------------------------- | ---------------------------------------------------------------------------- |
| POST             | `/auth/login`                                | Staff login                                                                  |
| GET, POST        | `/vehicles`                                  | List or create a vehicle; POST uses multipart form-data and optional `photo` |
| GET, PUT, DELETE | `/vehicles/:id`                              | Retrieve, update, or soft-delete a vehicle                                   |
| GET              | `/vehicles/:id/photo`                        | Authenticated photo download                                                 |
| GET, POST        | `/rentals`                                   | List or create a rental                                                      |
| GET, PUT, DELETE | `/rentals/:id`                               | Retrieve, update, or hard-delete a rental                                    |
| GET              | `/reports/rentals?month=YYYY-MM&vehicle_id=` | Monthly report; `vehicle_id` is optional                                     |

Rental create/update bodies use `vehicle_id`, `customer_name`, `customer_phone`, `start_date`, `end_date`, and optional `status`. The backend always calculates `total_amount`.

## Configuration

| Variable                                                     | Required  | Purpose                                                           |
| ------------------------------------------------------------ | --------- | ----------------------------------------------------------------- |
| `NODE_ENV`                                                   | No        | `development`, `test`, or `production`; defaults to `development` |
| `PORT`                                                       | No        | HTTP port; defaults to `3000`                                     |
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`    | Yes       | PostgreSQL connection values                                      |
| `DB_POOL_MIN`, `DB_POOL_MAX`                                 | No        | Knex connection-pool bounds                                       |
| `JWT_SECRET`                                                 | Yes       | HS256 JWT signing secret, at least 32 characters                  |
| `UPLOAD_PATH`                                                | Yes       | Local vehicle-photo directory                                     |
| `SEED_STAFF_NAME`, `SEED_STAFF_EMAIL`, `SEED_STAFF_PASSWORD` | For seeds | Demo staff account values                                         |

Environment values are validated at startup without printing secret values.

## Database and reporting

Migrations create `staff`, `vehicles`, and `rentals` in dependency order. The repeatable seed creates a staff account, two vehicles, a month-boundary rental (July 29 to August 3), and a same-day rental.

The monthly report clips each rental to the selected month and prorates its stored historical total. Cancelled rentals do not contribute to totals.

## Commands

| Command                | Purpose                               |
| ---------------------- | ------------------------------------- |
| `npm run dev`          | Run the TypeScript development server |
| `npm run build`        | Compile to `dist/`                    |
| `npm start`            | Run compiled code                     |
| `npm run typecheck`    | Run strict TypeScript checks          |
| `npm run lint`         | Run ESLint                            |
| `npm run format:check` | Check Prettier formatting             |
| `npm test`             | Run tests                             |
| `npm run db:check`     | Verify PostgreSQL connectivity        |
| `npm run db:migrate`   | Apply migrations                      |
| `npm run db:rollback`  | Roll back the latest migration batch  |
| `npm run db:seed`      | Reload non-production demo data       |

To verify a fresh database, point `.env` to an empty database and run `npm run db:migrate` followed by `npm run db:seed`.
