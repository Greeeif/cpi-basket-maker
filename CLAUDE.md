# CPI Basket Maker

## Project Overview
A "build your own inflation basket" tool that pulls real CPI data from the Bank of England 
and other public datasets, allowing users to see how inflation personally affects them based 
on their own spending habits.

## Stack
- **Framework:** Next.js (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Database:** PostgreSQL via Prisma ORM
- **Auth:** NextAuth with Prisma adapter
- **Validation:** Zod
- **CSV Parsing:** Papaparse

## Data Sources
- Bank of England (primary)
- https://www.ons.gov.uk

## Project Structure
src/
├── app/                  # Routes & pages
│   ├── api/              # API routes
│   └── basket/           # Basket builder UI
├── components/           # Reusable UI components
├── lib/
│   ├── db.ts             # Prisma client
│   └── data/             # Data fetching & cleaning logic
└── types/                # Shared TypeScript types

## Conventions
- Use server components by default, client components only when necessary
- Zod schemas for all external data (especially BoE dataset parsing)
- All database access goes through Prisma — no raw SQL unless necessary