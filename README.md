# Custom Employee Portal with Zoho One Integration

A custom-auth employee portal with role-based access control (RBAC) that gates access to
Zoho One applications (People, CRM, Desk, Books) — employees never see Zoho credentials;
the backend talks to Zoho through one shared service account.

## Stack

- **Backend:** Node.js, Express, TypeScript, Prisma (SQLite for local dev — swap the
  `datasource` in `backend/prisma/schema.prisma` to `postgresql`/`mysql` for production),
  JWT auth, bcrypt.
- **Frontend:** Next.js 14 (App Router), React, Tailwind CSS.

## Project layout

```
backend/    Express API — auth, RBAC engine, Zoho OAuth + proxying, audit logs
frontend/   Next.js app — login, employee dashboard, admin console
```

## 1. Run the backend

```bash
cd backend
cp .env.example .env      # edit JWT_SECRET at minimum
npm install
npm run prisma:migrate    # creates dev.db and applies the schema
npm run seed               # seeds roles, permissions, Zoho app catalog, demo users
npm run dev                 # http://localhost:4000
```

### Seeded roles & permissions

| Role    | Permissions granted             | Zoho app access |
|---------|----------------------------------|------------------|
| Admin   | all permissions                  | all apps |
| Manager | (none by default — assign via Admin UI) | — |
| HR      | `zoho:people:access`             | Zoho People |
| Sales   | `zoho:crm:access`                | Zoho CRM |
| Support | `zoho:desk:access`               | Zoho Desk |
| Finance | `zoho:books:access`              | Zoho Books |

Admin-only portal permissions: `admin:manage_users`, `admin:manage_roles`, `admin:view_audit_logs`.

### Demo accounts (password for all non-admin demo users: `Demo@12345`)

- `admin@zohoportal.local` / `Admin@12345`
- `manager.demo@zohoportal.local`
- `hr.demo@zohoportal.local`
- `sales.demo@zohoportal.local`
- `support.demo@zohoportal.local`
- `finance.demo@zohoportal.local`

**Change/remove these before any real deployment.**

## 2. Run the frontend

```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev    # http://localhost:3000
```

Log in at `http://localhost:3000` with any demo account above. Non-admin roles land on
`/dashboard` and see only their authorized Zoho app tile(s); the Admin account also gets
an `/admin` link for managing users, roles/permissions, audit logs, and the Zoho connection.

## 3. Connect the real Zoho One service account (required for real Zoho API calls)

The doc's brief says "create a free trial account anywhere required" — this step needs to
happen in your browser since it's tied to your Zoho identity; nothing here can do it for you.

1. Sign up for a Zoho One free trial (or any Zoho account) at zoho.com.
2. Go to the [Zoho API Console](https://api-console.zoho.com/) → **Add Client** → **Self Client**
   (or **Server-based Application** if you want a persistent redirect URI).
3. Set the redirect URI to `http://localhost:4000/api/zoho/oauth/callback` (must match
   `ZOHO_REDIRECT_URI` in `backend/.env` exactly).
4. Copy the **Client ID** and **Client Secret** into `backend/.env`:
   ```
   ZOHO_CLIENT_ID=...
   ZOHO_CLIENT_SECRET=...
   ZOHO_REDIRECT_URI=http://localhost:4000/api/zoho/oauth/callback
   ```
5. Restart the backend, log into the portal as `admin@zohoportal.local`, open
   **Admin → Zoho Connection → Connect Zoho account**, and approve the consent screen once.
   The backend stores and auto-refreshes the resulting OAuth token — this is the single
   shared credential every employee's Zoho access is proxied through.

### A note on "silent login" to Zoho apps

The current `launchApp` endpoint (`POST /api/zoho/apps/:key/launch`) validates the caller's
RBAC permission, logs the access, and returns the target app's URL — that's what the doc's
"clicking on it should navigate them to the Zoho ... portal" describes, and it's honest about
what a plain OAuth service-account token can do. Zoho does not offer a public API to mint a
one-click authenticated browser session into `people.zoho.com` etc. from a backend token —
that requires Zoho's own SSO/SAML setup (Zoho Directory) on your organization's Zoho account.
If true single-sign-on into the Zoho web UI itself is a hard requirement, that's a separate
Zoho-side configuration step (outside what any backend code can do), and `launchApp` is the
right integration point to extend once it's set up.

## 4. RBAC data model

`Users` ↔ `UserRoles` ↔ `Roles` ↔ `RolePermissions` ↔ `Permissions` (optionally linked to a
`ZohoApp`), plus `AuditLogs`. Every API request re-loads the caller's roles/permissions from
the database (see `backend/src/middleware/auth.ts`) rather than trusting the JWT's claims —
so a permission revoked by an admin takes effect on the user's very next request, not after
their token expires.

## 5. Known trade-offs (documented, not hidden)

- SQLite is used for zero-setup local dev. Prisma makes swapping to Postgres/MySQL a one-line
  `datasource` change plus a fresh `prisma migrate dev`.
- Two Next.js/postcss advisories (`npm audit` in `frontend/`) are only fully patched in the
  Next.js 16 major release, which has breaking changes out of scope for this build; harmless
  for local/demo use.
- There is no self-service signup — matching the brief ("Admin manages users... from an admin
  dashboard"), only an Admin can create accounts.
