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
- `VITE_EDITOR_EMAIL`

The application reads its content from Supabase. The editor is unlocked by
clicking the map title ten times and entering the password for the configured
Supabase editor account. The browser session is persisted by Supabase Auth.
Catalog writes use authenticated, item-scoped Supabase RPCs directly; no
service-role key is needed by the app. Place edits save when the form is
completed, and tag changes save immediately. The editor never replaces the
entire catalog.

## Supabase setup and seed

Apply the migrations under `supabase/migrations/` to create the normalized
catalog tables, read policies, and authenticated editor write functions. Then
seed the current CSV backup:

```bash
pnpm seed:supabase
```

The seed command preserves the existing tag/place IDs and ordering. The CSV
files under `src/data` are backup/seed material, not the runtime source of
truth.

Catalog rows remain publicly readable from Supabase. Google Maps list importing
is not included in the production editor.

## Place images

Place images are stored in Supabase as complete base64 data URLs in the
`place_images` table. Image data is loaded lazily only for the currently
selected place. In the development editor, new images append to the list,
which can be reordered with the up/down controls or deleted; the first image
is displayed as the primary selected-place image. There are currently no
application-enforced file count or size limits.
