# WedPlan — Wedding Budget Planner

WedPlan is a responsive wedding budget planner built with Next.js, TypeScript, Prisma, and PostgreSQL.

## Current features
- Private workspace login using an environment-configured password
- Create, edit, duplicate, and delete multiple wedding plans
- Wedding date, location, guest estimate, and total budget
- Budget items grouped by category
- Planned amount, actual amount, vendor, payment status, due date, and notes
- Dashboard totals, remaining budget, utilization, and category allocation
- Search and category filtering for budget items
- JSON export/import for moving a plan between WedPlan deployments
- PostgreSQL persistence and Prisma migrations
- Docker Compose deployment with a persistent database volume

## Stack
- Next.js 15 / React 19 / TypeScript
- PostgreSQL 16
- Prisma 7 with PostgreSQL driver adapter
- Docker Compose
- Nginx reverse proxy (optional, recommended for public access)

## Deploy with Docker Compose

```bash
git clone https://github.com/vassameta/wedplan.git
cd wedplan
cp .env.example .env
nano .env
docker compose up -d --build
docker compose ps
docker compose logs -f app
```

Set unique strong values for `POSTGRES_PASSWORD`, `ADMIN_PASSWORD`, and `AUTH_SECRET` before starting. Keep the app bound to `127.0.0.1` when using Nginx on the host. Do not expose PostgreSQL publicly.

The app runs on `http://127.0.0.1:3000` by default. Configure Nginx to proxy to that address and enable HTTPS before exposing it to the internet.

Database migrations are applied automatically by the app container on startup using `prisma migrate deploy`.

## Local development

Requires Node.js 20.9+ and PostgreSQL.

```bash
npm install
cp .env.example .env
# Edit DATABASE_URL, ADMIN_PASSWORD, and AUTH_SECRET for your local environment
npx prisma migrate dev --name init
npm run dev
```

Open http://localhost:3000 and sign in using `ADMIN_PASSWORD`.

## Backup and restore

Create a logical backup:

```bash
docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' > wedplan-backup.sql
```

Restore into an empty or intentionally replaced database:

```bash
cat wedplan-backup.sql | docker compose exec -T db sh -c 'psql -U "$POSTGRES_USER" "$POSTGRES_DB"'
```

Keep backups outside the container and test restores regularly. The named Docker volume `wedplan_db_data` stores the live PostgreSQL data.

## Security notes
- The initial release has one shared workspace password, not individual user accounts or role-based permissions.
- Use HTTPS, strong unique secrets, and network restrictions.
- Do not commit `.env` or production credentials.
- Use a separate PostgreSQL database/volume for each deployment unless you intentionally configure a shared database.

## Template alignment
The Google Sheets reference link was provided, but its workbook content was not readable through the connected Google/Drive integrations during initial implementation. The current categories are starter defaults and must be reconciled against the workbook once an `.xlsx` export is attached.

## Roadmap
- Reconcile category names, rows, formulas, and calculations against the user's workbook
- Vendor contact and contract management
- Guest list and RSVP tracking
- Checklist and timeline
- Individual user accounts and shared planning collaborators
- PDF and spreadsheet reporting
