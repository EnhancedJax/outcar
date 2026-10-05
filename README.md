# Outcar

## Development

Install dependencies and start the Vite server:

```bash
pnpm install
pnpm dev
```

Copy `.env.example` to `.env.local` and set:

- `VITE_MAPBOX_ACCESS_TOKEN`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` for the development editor save endpoint

The application reads its content from Supabase. The editor is enabled only in
development and writes through the Vite middleware using the service-role key.
Do not expose that key through a `VITE_` variable or commit it.

## Supabase setup and seed

Apply the migration in
`supabase/migrations/20261005000000_content_catalog.sql` to create the
normalized catalog tables, read policies, and the protected replacement
function. Then seed the current CSV backup:

```bash
pnpm seed:supabase
```

The seed command preserves the existing tag/place IDs and ordering. The CSV
files under `src/data` are backup/seed material, not the runtime source of
truth.

Production reads publicly readable catalog rows from Supabase and does not
expose editor writes. User submissions, authentication, and password-based
editing are intentionally deferred to a future change.
