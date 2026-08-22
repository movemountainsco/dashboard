# Move Mountains Co. — Department Reporting

Self-serve reporting app. Each department head files their own report; management
sees every department and who's behind.

Replaces the old flow where reports lived in Jotform and a scheduled job rebuilt a
static `index.html` once a week.

---

## Setup (one-time, ~10 minutes)

### 1. Enable Netlify Identity

Netlify → **movemountainsco-dashboard** → **Identity** → **Enable Identity**.

Then under **Identity → Registration**, set registration to **Invite only**.
This is important — without it, anyone who finds the URL can create an account.

### 2. Invite people

**Identity → Invite users**, one at a time:

| Person | Email | Roles to assign |
|---|---|---|
| Sean | sean@movemountains.co | `management` |
| Yan | *(their email)* | `management` |
| Kevin | *(their email)* | `payroll` |
| Raul | *(their email)* | `sales`, `planning` |
| Hannah | *(their email)* | `sales`, `planning` |
| Ali Sherin | ali@movemountains.co | `photo` |
| Gear owner | gear@movemountains.co | `gear` |
| Marketing owner | *(their email)* | `marketing` |

### 3. Assign roles

Roles are **not** set during the invite. After someone accepts:

Identity → click the user → **Edit Settings** → **Roles** → add the role(s) above → Save.

Valid roles: `management`, `payroll`, `marketing`, `photo`, `gear`, `sales`, `planning`.

A user with no role sees a "your account isn't assigned to a department yet"
screen rather than an empty app.

---

## Who sees what

| Role | Can see & submit |
|---|---|
| `management` | Every department, plus the compliance overview |
| `payroll` | Payroll |
| `marketing` | Marketing |
| `photo` | Photo |
| `gear` | Gear |
| `sales` | Sales |
| `planning` | Planning |

Management can also **submit on someone's behalf** — useful when a department
head is out and the week still needs filing.

Access is enforced server-side in `netlify/lib/auth.mjs`, reading roles from the
Netlify Identity JWT. Hiding a nav item is not what keeps payroll private; the
API refusing the request is.

---

## Changing what a report asks

Edit **`netlify/lib/schema.mjs`** — that's the only file you need. Add, remove or
relabel a field and both the form and the dashboards update on the next deploy.

```js
{ key: 'new_field', label: 'New Field', type: 'currency', required: true, group: 'W2' }
```

Types: `currency`, `number`, `percent`, `text`, `longtext`, `date`.

**One rule:** never change a field's `key` once data exists — that orphans every
historical value for it. Change the `label` instead; it's what people actually see.

### Derived fields

Totals, rates and averages are computed from what's entered rather than typed in
by hand — the old Payroll form asked people to key in YTD and projection figures,
which is exactly where arithmetic errors creep in. Add them under `derived`:

```js
derived: [
  { key: 'total', label: 'Weekly Total', type: 'currency',
    compute: (d) => num(d.w2_salary) + num(d.w2_hourly) },
]
```

> **Sales and Planning had no existing Jotform**, so their fields are a starter
> set based on a normal photography-business funnel. Hannah and Raul should
> review them before week one and tell you what to change.

---

## Periods and backfilling

Reports are keyed to the period they cover, not the day they were filed:

- Weekly → ISO week, `2026-W34` (weeks start Monday)
- Monthly → `2026-08`

The period that's "due" is always the **last completed one** — on any day in week
34 the app asks for week 33. Filing Monday morning for the week that just ended
lands in the right bucket.

To fill in a missed week: open the department, click any missing period in the
amber banner (or any red square on the management grid) and submit it. There's no
deadline lockout — a gap from three months ago can still be filled.

---

## Importing history

`POST /api/import` (management only) bulk-loads past reports.

```json
{
  "department": "payroll",
  "dryRun": true,
  "rows": [
    { "date": "2026-08-21", "data": { "w2_salary": 12000, "w2_hourly": 4300 } },
    { "period": "2026-W32",  "data": { "w2_salary": 11800 } }
  ]
}
```

Supply either `period` or a `date` to derive it from. Always run with
`"dryRun": true` first — it validates and reports what *would* happen without
writing. Unknown field keys are reported back, not silently dropped, so a
mismatched CSV column shows up immediately.

Existing periods are skipped unless you pass `"overwrite": true`.

---

## Architecture

```
public/            static frontend (no build step)
  index.html       shell + Identity widget
  app.js           router, forms, dashboards
  styles.css
netlify/
  functions/
    session.mjs    who am I / what can I see
    reports.mjs    GET history, POST a report
    compliance.mjs who's missing which periods
    import.mjs     bulk history import (management only)
  lib/
    schema.mjs     ** department fields — edit this one **
    periods.mjs    ISO week / month maths
    auth.mjs       Identity roles → permissions
    store.mjs      Netlify Blobs + seed merge
    seed.mjs       migrated Jotform history (read-only)
```

**Storage:** Netlify Blobs, store `mmc-reports`, key `<department>/<period>`.
Reads use strong consistency so a report appears the instant it's saved rather
than up to a minute later — otherwise someone files a report and the grid still
shows them as missing, which erodes trust in the whole screen fast.

**No build step.** `npm install` runs for the functions; the frontend ships as-is.

---

## Local development

```bash
npm install
npx netlify dev
```

Identity and Blobs are emulated locally. To test role behaviour, sign in with a
real invited account — the local emulator reads the same Identity instance.
