# MMC Reports

One library for every Move Mountains Co. report. Autopsies, delivery summaries, department and person reports, speed-to-lead, weekday lead alerts, travel checks, and venue conversion all live here, in the studio’s brand.

Report bots send **one batch email per run** (Reply-To `management@movemountains.co`) that links to this site, instead of one email per report. This app does not send mail. `POST /api/batches/<id>/complete` returns the batch URL and a branded HTML + text body. The caller sends it.

The site is separate from the department dashboard. It deploys as its own Netlify site at `reports.movemountains.co`, with base directory `reports`. Nothing outside this folder is part of the app.

## Stack

Plain HTML, CSS, and JavaScript. One Netlify Function. Netlify Blobs (`reports-records`, strong consistency), one key per report. Google sign-in for `@movemountains.co`, with an HMAC session cookie.

## Local

```bash
cd reports
npm install
npm test
npm run dev
```

The dev server listens on `http://127.0.0.1:8787`, turns on dev sign-in, and loads a sample library (the September 2026 samples plus a few shorter reports) into memory. That seed does not run on Netlify.

Dev sign-in accepts any verified-looking `@movemountains.co` address. It is refused when `CONTEXT` is `production`, `deploy-preview`, or `branch-deploy`.

## Environment

Set these on the Netlify site (Site configuration → Environment variables):

| Name | Required | Purpose |
|---|---|---|
| `SESSION_SECRET` | yes | HMAC key for the session cookie. At least 16 characters. |
| `GOOGLE_CLIENT_ID` | yes, for Google sign-in | OAuth client id. Authorized JavaScript origin: `https://reports.movemountains.co`. |
| `REPORTS_INGEST_TOKEN` | yes | Bearer token for `POST /api/ingest` and batch complete. |
| `REPORTS_ADMIN_EMAILS` | no | Comma-separated extra admins. `sean@movemountains.co` is always an admin. |
| `REPORTS_PUBLIC_URL` | no | Origin used in email links. Falls back to Netlify’s `URL`, then `https://reports.movemountains.co`. |
| `URL` | set by Netlify | Primary site URL. |

Do not set `REPORTS_DEV` or `NETLIFY_DEV` on the hosted site. Dev sign-in stays off there even if those are present, because `CONTEXT` is set.

## Netlify

Create a **new** site from `movemountainsco/dashboard`. Do not reuse the department dashboard site, and do not deploy this app from a dashboard build.

- Base directory: `reports`
- The `netlify.toml` in this folder records the site paths from the repository root: `base = reports`, `publish = reports/public`, `functions = reports/netlify/functions`
- Build command: none (the toml echoes a static-site line)
- Node 22
- Custom domain: `reports.movemountains.co`

The live site is [mmc-reports.netlify.app](https://mmc-reports.netlify.app). The primary domain is `reports.movemountains.co`.

`/api/*` rewrites to the `api` function. Every other path serves `public/index.html`, and the browser routes `/`, `/report/<id>`, and `/batch/<id>`.

If the Netlify UI base directory is already `reports` and a build looks for `reports/reports/public`, set the UI publish directory to `public` and functions to `netlify/functions`. Those are the same folders once the base is applied. The toml keeps the repository-root paths above so the site settings match this folder.

From inside `reports/`, the CLI deploy uses those local paths:

```bash
netlify deploy --prod --dir public --functions netlify/functions
```

Blobs are created on first write. No manual store setup.

## Who sees what

Signed-in `@movemountains.co` accounts only.

- **Admins** (`sean@movemountains.co`, plus `REPORTS_ADMIN_EMAILS`) see every report.
- **Department heads** see their department, any department listed under `rollsUp`, child departments, and reports about people in those departments.
- **Everyone else** sees reports addressed to them (email, name, or alias).

Production (Yan Ortiz, `yan@movemountains.co`) rolls up Data (Roane Purificacion), Photo Editing (Ali Sherin), Video Editing (Komiljon Sayfiev, `koyla@movemountains.co`), Gear, and Orders (both Kenneth Barrios). Photo Editing and Video Editing are separate departments. Each has its own head report. The roster and the rollup live in `data/org.json`. Change that file to change access. No code change.

## Report types

`data/types.json` is the catalog: weekly Tuesday 6:59 AM ET autopsies and the delivery summary, Monday speed-to-lead, weekday lead alerts, the travel deadline check, the venue conversion report, and the monthly shooter, editor, department-head, department, and internal-staff roll-up.

Ingest accepts any `type` string. A type that is not in the catalog is stored and labeled from its id. Add an entry to `data/types.json` when you want a proper label, cadence, and menu group. No code change.

Dates on the site are `MM/DD/YYYY` in Eastern Time. A month period such as `2026-09` is shown as `09/2026`. A range `2026-09-29..2026-10-04` is shown as `09/29/2026 – 10/04/2026`.

Filters (type, period, department, person, batch) are custom tan/cream menus. The page does not use a native select.

The report viewer puts the HTML in an iframe (`sandbox`, `srcdoc`) so the report’s own markup cannot script the library. Print view opens that HTML without the library chrome.

## Ingest

`Authorization: Bearer $REPORTS_INGEST_TOKEN`

A report is `{ batch_id, type, period, title, audience, department?, person?, html }`. Send one object or an array (or `{ "reports": [ ... ] }`).

The same `batch_id` + `type` + `period` + `person` + `department` overwrites. Ids are a hash of that key. `batch_id` and emails are lowercased. `type` and `department` are slugs (`Photo Editing` and `photo-editing` are the same department). Use a stable `person` value, preferably the email.

`audience` is who the report is for, besides the department and person fields:

- `"admins"` — management only, unless a department or person is also set
- `"company"` — every signed-in `@movemountains.co` account
- an email, a department id or name, or a person name
- an array of those
- `{ "emails": [], "departments": [], "names": [], "scope": "admins" }`

```bash
curl -s -X POST https://reports.movemountains.co/api/ingest \
  -H "Authorization: Bearer $REPORTS_INGEST_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "batch_id": "2026-09-monthly",
    "type": "monthly-shooter",
    "period": "2026-09",
    "title": "Joshua Ortiz · September 2026",
    "audience": "ortiz@movemountains.co",
    "department": "production",
    "person": "ortiz@movemountains.co",
    "html": "<!doctype html><title>Joshua Ortiz</title><p>September</p>"
  }'
```

Several at once:

```bash
curl -s -X POST https://reports.movemountains.co/api/ingest \
  -H "Authorization: Bearer $REPORTS_INGEST_TOKEN" \
  -H "Content-Type: application/json" \
  -d '[
    {
      "batch_id": "2026-10-06-tuesday",
      "type": "weekly-autopsy",
      "period": "2026-09-29..2026-10-05",
      "title": "Weekly autopsies · Sep 29 – Oct 5",
      "audience": "admins",
      "html": "<!doctype html><title>Week</title><p>Four autopsies.</p>"
    },
    {
      "batch_id": "2026-10-06-tuesday",
      "type": "delivery-summary",
      "period": "2026-09-29..2026-10-05",
      "title": "Delivery summary · Sep 29 – Oct 5",
      "audience": "admins",
      "html": "<!doctype html><title>Delivery</title><p>Galleries and films.</p>"
    }
  ]'
```

When the run is finished, ask for the summary email. Nothing is sent.

```bash
curl -s -X POST https://reports.movemountains.co/api/batches/2026-10-06-tuesday/complete \
  -H "Authorization: Bearer $REPORTS_INGEST_TOKEN"
```

The JSON has `url` (the batch page), `email.to`, `email.reply_to` (`management@movemountains.co`), `email.subject`, `email.html`, `email.text`, and `delivery.sent: false`. Posting again returns the same body and does not move `completed_at`.

Against the local server, the same curls work with `http://127.0.0.1:8787` and token `local-dev-ingest-token`.

## Tests

```bash
npm test
```

`tests/auth.test.mjs` covers the HMAC cookie, admin list, company-domain gate, dev-login lockout, and Google ID tokens. `tests/access.test.mjs` covers who can see which report, including Production’s rollup. `tests/ingest.test.mjs` covers idempotent overwrite, the bearer token, and batch complete.
