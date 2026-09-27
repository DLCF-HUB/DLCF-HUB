# Deploy DLCF Buea with GitHub, Vercel and Supabase

This is the portable deployment version. The existing demonstration site stays available separately. This package does not contain live records, passwords or provider credentials.

## 1. Create your Supabase project

1. Create a Supabase project and save its database password in your password manager.
2. Open SQL Editor. Paste and run `supabase/migrations/202609270001_fellowship.sql` once in a new project. This creates the tables, integrity checks, campus records, RLS restrictions and private document bucket.
3. In Authentication, enable the Email provider. Disable public user sign-ups. The app creates invited accounts through the server admin API.
4. In Authentication > URL Configuration, set Site URL to your final Vercel URL after deployment. The current password and invitation flows do not depend on email callbacks.
5. From the project Connect dialog, copy the Project URL, publishable key and Transaction pooler connection string, using port 6543. Use the exact host shown by Supabase. Encode special characters in the database password before placing the password in the connection URL.
6. Copy the server secret key from Project Settings > API Keys. A legacy service_role key also works. This key belongs only in server environment variables.

The database connection uses parameterized PostgreSQL queries without named prepared statements. Private tables have RLS enabled and deny direct access from browser roles. Server routes check the signed-in identity, campus and role before executing queries. Storage uploads and downloads use scoped, temporary signed URLs.

## 2. Prepare the project locally

Install Node.js 24 and pnpm 11.25.0. Unzip the project and open a terminal in its folder.

```sh
pnpm install --frozen-lockfile
cp .env.example .env.local
pnpm setup:code
```

The final command prints a new one-time administrator code and its hash. Save the code privately. Put the hash in `ADMIN_SETUP_HASH`. The setup code for the older demonstration site does not apply to this deployment.

Fill these values in `.env.local`, and later in Vercel:

| Variable | Value |
| --- | --- |
| NEXT_PUBLIC_SUPABASE_URL | Supabase project URL |
| NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY | Publishable key |
| SUPABASE_SECRET_KEY | Server secret or legacy service_role key |
| DATABASE_URL | Supabase Transaction pooler URL, port 6543 |
| APP_URL | Final production URL, or http://localhost:3000 for local development |
| ADMIN_SETUP_HASH | Hash printed by pnpm setup:code |

Never commit `.env.local`. The included `.env.example` contains placeholders only. Keep `SUPABASE_SECRET_KEY`, `DATABASE_URL` and `ADMIN_SETUP_HASH` server-only; do not add a `NEXT_PUBLIC_` prefix.

```sh
pnpm test
pnpm build
pnpm dev
```

Without environment values, the app renders a deployment setup message. Tests run against an embedded PostgreSQL engine and simulated Supabase identity responses. They do not contact your live project.

## 3. Add the source to GitHub

Create an empty private GitHub repository. Upload the extracted project files, including `.github`, `.env.example` and the Supabase migration. Exclude `.env.local`, `node_modules` and `.next`.

Or run these commands in the extracted folder, replacing the repository URL:

```sh
git init -b main
git add .
git commit -m "Prepare DLCF Buea for Vercel and Supabase"
git remote add origin https://github.com/YOUR_ACCOUNT/YOUR_REPOSITORY.git
git push -u origin main
```

The included GitHub workflow checks TypeScript, database and route tests, then the production build on each main-branch push or pull request.

## 4. Deploy through Vercel

1. Choose Add New Project and import the GitHub repository.
2. Select Next.js, the repository root, and Node.js 24.
3. Add all six environment variables from the table above. Use the production Supabase project for the production deployment. Use a separate Supabase project for development previews containing test data.
4. Deploy. `vercel.json` sets the install and build commands.
5. Set `APP_URL` to the resulting production URL and redeploy if the domain was unknown initially. Update Supabase Site URL to match.
6. Keep the production login page publicly reachable. If Vercel Deployment Protection is enabled, configure the production deployment according to your intended audience so members reach the fellowship login page.

Future pushes to the connected production branch trigger Vercel deployments. Database migration changes require a separate reviewed Supabase migration; GitHub pushes do not apply schema changes automatically.

## 5. Create the administrator account

Open the Vercel URL, choose Admin setup, and enter your name, email, a password of at least 12 characters and the private code generated in step 2. Only one owner account is allowed.

Open Administration > Access & campuses > Create account invitation to invite members. Share each code privately with its intended email owner. Codes expire after seven days and work once. Assign campus responsibilities separately after approval.

Supabase handles passwords and session refresh. The app never reads or stores password hashes. Automatic recovery emails and recovery pages are not included yet. Supabase revokes other refresh sessions after a password change; already issued access tokens follow the project's token expiration settings.

## 6. Verify the connected deployment

Before moving real records, check the actual connected services:

- Create the administrator, sign out, sign back in, and change the password.
- Invite a member, activate the account and confirm the member has no finance or administration access.
- Create a member, group, service, attendance entry, vow and payment. Switch campuses and confirm separation.
- Upload and download a PDF or image, including a file larger than 4.5 MB but below 10 MB. Uploads go directly to Supabase rather than through Vercel's request-body limit.
- Confirm private records and files reject unauthenticated requests.
- Check the mobile layout in your browser.

## 7. Existing records and remaining features

This migration creates an empty database with the two campus names. Records entered on the earlier site are not automatically copied. A separate authorized export/import is required for member records, files and links between records. Existing passwords and sessions are not portable to Supabase Auth; users need new invitations. Do not delete the earlier site until any required transfer is complete and checked.

Full DAS workflows, lessons and named Koinonia attendance, official bilingual reports, approval workflows, notifications, AI and automated password recovery remain separate implementation stages. The current app lists these stages under Administration.

## References

- Supabase SSR: https://supabase.com/docs/guides/auth/server-side/creating-a-client?framework=nextjs
- Supabase PostgreSQL connections: https://supabase.com/docs/guides/database/connecting-to-postgres
- Vercel Next.js deployment: https://vercel.com/docs/frameworks/full-stack/nextjs
