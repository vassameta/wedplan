# WedPlan — Wedding Budget Planner

A responsive wedding budget planning app starter. The first delivery is a client-side MVP with persistent browser storage; the repository is structured for a later PostgreSQL/Prisma multi-server deployment.

## Features
- Create, edit, duplicate, and delete wedding plans
- Plan-level budget and wedding date
- Budget items grouped by category
- Planned amount, actual amount, payment status, vendor, and notes
- Dashboard totals, remaining budget, utilization, and category breakdown
- Responsive layout with search and category filtering
- JSON export/import for moving a plan between browsers

## Run locally
Requires Node.js 20.9+.

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Production build
```bash
npm run build
npm start
```

## Notes
- Current MVP stores data in the browser's localStorage. It is not yet multi-user and data is browser/device scoped.
- Do not store sensitive information in this prototype.
- The Google Sheets reference workbook could not be read through the available connection. The initial categories are sensible defaults and should be reconciled against the workbook once an .xlsx export is supplied.
- PostgreSQL, Prisma migrations, authentication, Docker Compose, and deployment documentation are planned for the server-backed release.

## Project structure
- `app/`: Next.js App Router pages and global styles
- `components/`: dashboard and planning UI
- `lib/`: types, defaults, and browser persistence helpers
