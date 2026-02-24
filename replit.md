# E.Q.U.I.P. 360 Assessment Tool

## Project Overview
A React + TypeScript SPA for leadership assessment (E.Q.U.I.P. 360). It supports individual and team-based assessments, results visualization, PDF export, and invitation workflows.

## Architecture
- **Frontend**: React 18, TypeScript, Vite — port 5000
- **Backend**: Express.js server — port 3000
- **Auth**: Replit Auth (OIDC via openid-client + passport)
- **Database**: Replit PostgreSQL via Drizzle ORM
- **Routing**: React Router v6
- **State/Data**: TanStack React Query
- **PDF Export**: jsPDF + html2canvas
- **Email**: Resend (via Express `/api/send-invite` route)

## Key Structure
- `src/pages/` — All page components (HomePage, LoginPage, Dashboard, AssessmentPage, ResultsPage, etc.)
- `src/components/` — Shared UI components (modals, protected routes)
- `src/context/` — React context (AuthContext, AssessmentContext)
- `src/services/` — API service layers (assessments.ts, invitations.ts)
- `src/lib/apiClient.ts` — Typed fetch wrapper for all backend API calls
- `src/hooks/use-auth.ts` — useReplitAuth hook (TanStack Query over /api/auth/user)
- `src/data/scenarios.ts` — Assessment scenario data
- `src/utils/` — Helpers, scoring, insights, PDF generation
- `server/` — Express backend (index.ts, db.ts, routes/)
- `shared/schema.ts` — Drizzle schema (users, sessions, organizations, organization_members, invitations, assessments)

## Auth Flow
- Login: redirect to `/api/login` (Replit OIDC)
- Logout: redirect to `/api/logout`
- Session: express-session with PostgreSQL store
- User record upserted in `users` table on every login
- `GET /api/auth/user` returns current user or 401

## API Routes (Express, port 3000)
- `GET /api/health` — health check
- `GET /api/auth/user` — current user (401 if not logged in)
- `GET/PATCH /api/profile` — get/update user profile
- `GET/POST /api/organizations` — list orgs / create org
- `DELETE /api/organizations/:id` — delete org (cascade)
- `GET /api/organizations/:id/stats` — member/assessment/invite counts
- `GET /api/organizations/:id/members` — list members with profiles
- `DELETE /api/organizations/:id/members/:memberId` — remove member
- `POST /api/invitations` — create invitation
- `GET /api/invitations/org/:orgId` — list org invitations
- `GET /api/invitations/token/:token` — get invitation by token (public)
- `POST /api/invitations/token/:token/accept` — accept invitation
- `PATCH /api/invitations/:id/revoke` — revoke invitation
- `POST /api/invitations/:id/resend` — resend invitation
- `POST /api/assessments` — save assessment
- `GET /api/assessments/mine` — user's own assessments
- `GET /api/assessments/org/:orgId` — org's assessments
- `POST /api/send-invite` — send invitation email via Resend

## Environment Variables (Replit Secrets)
- `DATABASE_URL` — PostgreSQL connection string (auto-set by Replit)
- `SESSION_SECRET` — Secret for express-session
- `RESEND_API_KEY` — Resend API key for invitation emails

## Dev Server
- `npm run dev` — starts both Express (port 3000) and Vite (port 5000) concurrently
- Vite proxies `/api/*` to Express at port 3000
- `npm run db:push` — sync Drizzle schema to database

## Deployment
- Must use **autoscale** deployment (has Express backend)
- Build: `npm run build`
- Run: `node dist/server/index.js` (or `tsx server/index.ts`)
