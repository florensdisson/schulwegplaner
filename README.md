# Schulwege Wannweil

Private test site for digitally drawing actual school routes or submitting completed paper surveys.

## Features

- Same cropped OpenStreetMap map as the paper survey, with explicit georeferencing in `lib/map.json`.
- Point-by-point or freehand drawing, two route colors, direction labels, pan and zoom, undo.
- Up to three numbered locations with descriptions.
- Paper survey upload: JPEG, PNG, WEBP, HEIC/HEIF and PDF. Six files, 10 MB per file, 25 MB total.
- D1 response records, R2 original attachments, account-scoped reads and deletes; the verified coordinator has access to all responses and attachments.
- JSON export and annotated map image download. Scans are retained for manual analysis; no automatic OCR/digitization.
- Local draft autosave. Incomplete point lines must be finished before review.

## Access

The existing Sites audience is public; submitting and reading records require ChatGPT sign-in. Parents can only read or delete their own responses and attachments. The verified Site owner's authenticated email is checked server-side to grant coordinator access to the full collection, file downloads and deletion. The inbox labels its scope and exports the accessible collection as JSON. Anonymous requests are rejected. Before inviting parents, agree responsibility and retention with the school. No external AI service or API key is used.

## Development

Use the Sites build helper and source workflow. D1 migrations are generated from `db/schema.ts`. Do not create tables at request time. Keep schema-only migrations in `drizzle/`.

## Map attribution

© OpenStreetMap contributors. Data: ODbL. https://www.openstreetmap.org/copyright
Map retrieved 2026-10-21. Source image is stored locally to avoid third-party map requests during drawing.

## GitHub source export

Exported from the existing Schulwege Wannweil Sites source repository at commit
`0a48791e4d1a5a26a2259af8189d7b00b36f7dda`.
The original Site remains at https://schulwege-wannweil.s6x4hkht6k.chatgpt.site.

Included: application source, schema-only D1 migrations, dependency lockfile,
`public/wannweil-karte.png`, map georeferencing in `lib/map.json`, and the blank
`public/erhebungsbogen.pdf` survey template.

Excluded: database records, submitted parent surveys, uploaded attachments,
runtime state, credentials, environment files, and original Git history.
The source's fixed coordinator email has been replaced with the server-side
`COORDINATOR_EMAIL` environment variable. Configure it privately in the hosting
environment before deploying this export; without it, coordinator access is disabled.
ChatGPT authentication headers require the trusted Sites hosting proxy.
This export does not deploy or modify the existing Site.
