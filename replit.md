# E.Q.U.I.P. 360 Assessment Tool

## Project Overview
A React + TypeScript SPA for leadership assessment (E.Q.U.I.P. 360). It supports individual and team-based assessments, results visualization, PDF export, and invitation workflows.

## Architecture
- **Frontend**: React 18, TypeScript, Vite
- **Auth & Database**: Supabase (auth, teams, invitations, assessments)
- **Routing**: React Router v6
- **State/Data**: TanStack React Query
- **PDF Export**: jsPDF + html2canvas
- **Email**: Resend (via Vercel serverless functions in `api/`)

## Key Structure
- `src/pages/` — All page components (HomePage, LoginPage, Dashboard, AssessmentPage, ResultsPage, etc.)
- `src/components/` — Shared UI components (modals, protected routes)
- `src/context/` — React context (AuthContext, AssessmentContext)
- `src/services/` — API service layers (assessments, invitations, hubspot)
- `src/lib/supabase.ts` — Supabase client setup
- `src/data/scenarios.ts` — Assessment scenario data
- `src/utils/` — Helpers, scoring, insights, PDF generation
- `api/` — Vercel serverless functions (send-invite, hubspot-upload)

## Environment Variables
Copy `.env.example` to `.env.local` and fill in:
- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — Supabase anonymous key
- `VITE_APP_URL` — App base URL (http://localhost:5000 in dev)
- `RESEND_API_KEY` — Resend API key (server-side only)

## Dev Server
- Runs on port 5000, host 0.0.0.0
- `npm run dev` — starts Vite dev server
- `npm run build` — TypeScript compile + Vite build to `dist/`

## Deployment
- Configured as static site deployment
- Build: `npm run build`
- Public dir: `dist`
