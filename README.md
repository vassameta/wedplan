# WedPlan — Wedding Planning Workspace

WedPlan is a private wedding-planning workspace built with Next.js, TypeScript, Prisma, PostgreSQL, and Docker Compose.

## Implemented modules

- Workspace login using an environment-configured password and signed, HTTP-only session cookie.
- Multiple wedding plans with date, venue/location, guest estimate, and total budget.
- Budget and expense tracking by category, including planned amount, actual amount, payment status, due date, vendor, and notes.
- Payment ledger for deposits, installments, and final payments. Payment records linked to a budget item automatically recalculate its actual paid amount and payment status.
- Vendor directory with category, contact details, quote, negotiation/contract status, and notes.
- Guest list with group, contact, guest count, invitation status, RSVP, meal preferences, seating/table, and notes.
- Wedding checklist with category, deadline, priority, status, assignee, and notes.
- Reports overview across budget, vendors, guests, checklist, and payment records.
- CSV export for Excel/Google Sheets and browser print-to-PDF.
- Per-plan JSON import/export for portability.
- PostgreSQL persistence and Prisma migrations.
- Docker Compose deployment, persistent database volume, and GitHub Actions build checks.

## Stack

- Next.js 15 / React 19 / TypeScript
- PostgreSQL 16
- Prisma 7 with PostgreSQL driver adapter
- Docker Compose
- Nginx reverse proxy (recommended for public deployment)

## Deploy / update

Set unique values for `POSTGRES_PASSWORD`, `ADMIN_PASSWORD`, and `AUTH_SECRET` in `.env`. Keep the app bound to `127.0.0.1` when Nginx runs on the host. Do not expose PostgreSQL or the app port publicly.

For an existing deployment, back up the database before updating:

```bash
docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' > wedplan-before-update.sql
```

Then pull the intended branch and rebuild:

```bash
git pull origin main
docker compose up -d --build
docker compose ps
docker compose logs --tail=100 app
```

The app container runs `prisma migrate deploy` at startup. The new planner modules require the `PlannerRecord` migration to be applied before use. The app listens on `http://127.0.0.1:3000` by default.

## Database backup and restore

Create a logical backup:

```bash
docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' > wedplan-backup.sql
```

Restore only into an empty or intentionally replaced database:

```bash
cat wedplan-backup.sql | docker compose exec -T db sh -c 'psql -U "$POSTGRES_USER" "$POSTGRES_DB"'
```

Keep database backups outside the container and test restores regularly. The named Docker volume `wedplan_db_data` contains the live PostgreSQL data.

## Security notes and current limitations

- The current authentication model is one shared workspace password (`ADMIN_PASSWORD`), not individual user accounts or role-based access. Anyone with that password has the same workspace permissions.
- Use HTTPS so the production session cookie marked `Secure` works correctly.
- Keep `.env` out of Git and use unique production secrets. Rotate credentials if they have been exposed.
- Restrict SSH access and expose only ports 80/443 publicly; keep port 3000 and PostgreSQL private.
- The repository should be private before entering real personal wedding information.
- CSV export opens in Excel/Google Sheets. PDF is generated through the browser's Print → Save as PDF flow; this is not a server-side PDF report.

## Spreadsheet alignment status

The Google Sheets reference URL was provided, but its workbook contents were not accessible during implementation and no exported `.xlsx` was available. Therefore the current budget categories and default values are generic starter values, not a verified copy of the workbook's sheets, formulas, or calculation rules. Importing/aligning the exact workbook remains a required final validation step once the workbook is supplied.

## Local development

Requires Node.js 22+ and PostgreSQL.

```bash
npm install
cp .env.example .env
# Set DATABASE_URL, ADMIN_PASSWORD, and AUTH_SECRET
npx prisma migrate dev
npm run dev
```
