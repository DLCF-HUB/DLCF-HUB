# DLCF Buea Fellowship Hub

A Next.js application prepared for GitHub source control, Vercel hosting and Supabase Auth, PostgreSQL and Storage. No ChatGPT login is required.

Start with [DEPLOYMENT.md](DEPLOYMENT.md). Copy `.env.example` to `.env.local` and configure your own Supabase project. Provider accounts and secrets are not included.

## Available

- Administrator setup protected by a one-time code.
- Supabase email/password login and private account invitations.
- Dirty South and Bonduma campus records, campus roles and audit history.
- Member profiles, academic information and parental/residential details.
- Koinonia groups with a database-enforced 10-member limit.
- Service scheduling, assigned ushers and unique English/French attendance.
- Treasury ledger, cash/bank transfers, vows and payment limits.
- Campus/department announcements and private PDF/image uploads.
- CSV exports, printable monthly summaries and an installable app manifest.

## Development

Use Node.js 24 and pnpm 11.25.0.

```sh
pnpm install --frozen-lockfile
pnpm dev
pnpm typecheck
pnpm test
pnpm build
```

The test suite executes the actual application routes against embedded PostgreSQL. Supabase Auth and Storage responses are simulated. Live provider integration and browser checks require your configured project.

The migration enables RLS and revokes browser-role access to all application tables. Server routes verify Supabase identity and campus permissions before SQL access. The private storage bucket uses scoped upload tokens and short-lived download links. Secrets stay on the server. Records are not cached for offline use.

## Project status

This is a new deployment package, not an already deployed Vercel project. The previous live site has not been changed. This package contains no records exported from that site. Data transfer and re-inviting existing accounts require a separate migration.

Campus separation is logical within one PostgreSQL database. Physical databases per campus are not implemented. Full DAS workflows, lessons, named Koinonia attendance, follow-up cases, official bilingual reports, approvals, letters, notifications, AI, bank reconciliation and automatic account recovery remain in the development stages shown inside the app.
