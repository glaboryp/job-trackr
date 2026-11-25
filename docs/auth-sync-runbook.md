# Supabase Auth + Sync Runbook

## Project

- Supabase project ref: `xnefxiopfclrunkjwqzj`
- Vercel project: `job-trackr`
- Supabase schema and policies: `supabase/migrations/`
- Frontend configuration: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_AUTH_ENABLED`

The publishable key is intended for browser use. Never put a Supabase secret/service-role key in a `VITE_` variable or in frontend code.

## Apply migrations

The project is linked with `pnpm dlx supabase link`. Apply future migrations with:

```bash
pnpm dlx supabase db push
```

The authenticated `applications` table uses RLS policies scoped to `auth.uid()`. Conflict reconciliation runs transactionally in `public.reconcile_applications`. Legacy InsForge records are staged in the non-exposed `private` schema and claimed by a verified Supabase account whose email matches the legacy account.

## InsForge backup import

The import utility reads only `auth.users` IDs/emails and `public.applications` from the PostgreSQL dump. It does not import password hashes or InsForge platform schemas.

```bash
node scripts/prepare-insforge-import.js /path/to/insforge.sql.gz
pnpm dlx supabase db query --remote --file supabase/.temp/import-insforge.sql --yes
```

Generated SQL is written under ignored `supabase/.temp/` because it contains account emails and application notes. Users create and verify a new Supabase account with their existing email; the app claims their staged applications on first login. Their InsForge passwords are not migrated.

## Session and data flow

- On startup, Supabase Auth restores the session.
- Without a session, the app remains anonymous and stores data in browser `localStorage`.
- On login, the app claims any matching legacy records, loads the user's remote applications, and reconciles local and remote snapshots when both exist.
- RLS keeps every remote read and write scoped to the signed-in user.

## Redirect and email settings

The linked Supabase project is configured with `https://job-trackr-wine.vercel.app` as its Site URL, localhost for development, and the project's Vercel preview URL pattern in the redirect allowlist. Email confirmation is enabled. Registration asks the user to confirm their address before logging in.

Before allowing signups for users outside the Supabase organization, configure custom SMTP in Supabase Auth. The built-in SMTP service only delivers to organization team members and is limited to two emails per hour; see [Supabase custom SMTP setup](https://supabase.com/docs/guides/auth/auth-smtp). Keep the SMTP password in Supabase Auth settings, never in the frontend or a `VITE_` variable.

## Rollback

The InsForge backup remains the source snapshot. Legacy rows are held in private staging tables; they are not deleted after being claimed. Application edits after migration are stored in `public.applications` and should be exported before any schema rollback.
