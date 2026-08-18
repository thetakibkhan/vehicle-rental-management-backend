# Vehicle Rental Management Backend

Epic 0 foundation and Epic 1 staff authentication for the company-provided vehicle rental REST API assignment. The project uses Node.js, TypeScript, Express, Knex, and PostgreSQL with strict environment validation, reproducible migrations, and representative development seeds.
The company-provided instructions and private planning materials are intentionally excluded from this public repository.

## Requirements

- Node.js 24 LTS
- npm
- PostgreSQL 18, either installed locally or started through Docker Compose

## Quick start

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create local configuration:

   ```bash
   cp .env.example .env
   ```

   Replace the example database password, JWT secret, and seed password before continuing. The JWT secret must contain at least 32 characters and the seed password at least 12.

3. Start PostgreSQL using either an existing local server or the optional container:

   ```bash
   docker compose up -d
   ```

4. Verify the database connection, build the schema, and load demo data:

   ```bash
   npm run db:check
   npm run db:migrate
   npm run db:seed
   ```

5. Start the API in development mode:

   ```bash
   npm run dev
   ```

   `GET http://localhost:3000/health` should return:

   ```json
   {
     "success": true,
     "data": { "status": "ok" }
   }
   ```

POST http://localhost:3000/auth/login accepts the seeded staff email and password and returns a one-hour Bearer JWT. Vehicle, rental, and report endpoints belong to later epics.

## Configuration

| Variable              | Required  | Purpose                                                                  |
| --------------------- | --------- | ------------------------------------------------------------------------ |
| `NODE_ENV`            | No        | `development`, `test`, or `production`; defaults to `development`        |
| `PORT`                | No        | HTTP port; defaults to `3000`                                            |
| `DB_HOST`             | Yes       | PostgreSQL hostname                                                      |
| `DB_PORT`             | No        | PostgreSQL port; defaults to `5432`                                      |
| `DB_NAME`             | Yes       | Database name                                                            |
| `DB_USER`             | Yes       | Database user                                                            |
| `DB_PASSWORD`         | Yes       | Database password                                                        |
| `DB_POOL_MIN`         | No        | Minimum Knex pool size; defaults to `2`                                  |
| `DB_POOL_MAX`         | No        | Maximum Knex pool size; defaults to `10` and cannot be below the minimum |
| `JWT_SECRET`          | Yes       | HS256 JWT signing secret for staff authentication; minimum 32 characters |
| `UPLOAD_PATH`         | Yes       | Local vehicle-photo directory reserved for Epic 2                        |
| `SEED_STAFF_NAME`     | For seeds | Demo staff name                                                          |
| `SEED_STAFF_EMAIL`    | For seeds | Demo staff login email                                                   |
| `SEED_STAFF_PASSWORD` | For seeds | Demo staff password, hashed with bcrypt before insertion                 |

Environment values are validated with Joi at startup. Invalid configuration fails immediately without printing secret values.

## Database

Migrations create the required tables in dependency order:

1. `staff`
2. `vehicles`
3. `rentals`

The schema enforces required and unique fields, rental status values, non-negative monetary values, valid date ordering, and vehicle foreign-key integrity. Vehicles are intended to be removed through the `deleted_at` soft-delete field; physical deletion is restricted when rental history exists.

The development seeds are repeatable and create:

- one bcrypt-hashed staff account using the `SEED_STAFF_*` variables;
- a sedan and a microbus;
- a completed rental from July 29 through August 3 for month-boundary reporting;
- a same-day booked rental.

The seed command refuses to run when `NODE_ENV=production`.

## Project structure

```text
src/
  common/errors/       Central application errors and Express error handling
  config/              Validated application and seed configuration
  auth/                Login, JWT, authentication middleware, and rate limiting
  db/
    migrations/        Ordered Knex schema migrations
    scripts/           Connection, migration, rollback, and seed commands
    seeds/             Repeatable development seed data
  app.ts               Express application composition
  server.ts            Database-aware process entry point
tests/                 Unit and database integration tests
```

Vehicle, rental, and report modules will be added in their respective epics.

## Commands

| Command                | Purpose                                             |
| ---------------------- | --------------------------------------------------- |
| `npm run dev`          | Run the server with TypeScript watch mode           |
| `npm run build`        | Compile production JavaScript to `dist/`            |
| `npm start`            | Run the compiled server                             |
| `npm run typecheck`    | Run strict TypeScript checks without emitting files |
| `npm run lint`         | Run ESLint                                          |
| `npm run format`       | Format project files with Prettier                  |
| `npm run format:check` | Check formatting without changes                    |
| `npm test`             | Run the test suite once                             |
| `npm run db:check`     | Verify PostgreSQL connectivity                      |
| `npm run db:migrate`   | Apply pending migrations                            |
| `npm run db:rollback`  | Roll back the latest migration batch                |
| `npm run db:seed`      | Reload non-production demo data                     |

## Fresh database verification

To demonstrate that the schema builds cleanly from nothing, point `.env` at an empty database and run:

```bash
npm run db:migrate
npm run db:seed
```

Rollback support is available through `npm run db:rollback`.
