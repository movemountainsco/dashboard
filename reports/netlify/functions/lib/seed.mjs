import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { completeBatch, ingestReports } from "./library.mjs";
import { loadOrg } from "./org.mjs";
import { loadTypes } from "./types.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");

function sample(name) {
  return readFileSync(join(root, "samples", name), "utf8");
}

function page({ kicker, title, dek, body }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;500&family=Archivo:wdth,wght@125,500&family=Cormorant+Garamond:ital,wght@0,300;1,300&display=swap" rel="stylesheet">
<style>
  body { margin: 0; background: #fff; color: #000; font-family: Poppins, Arial, sans-serif; font-weight: 300; font-size: 15px; line-height: 1.65; }
  .wrap { max-width: 640px; margin: 0 auto; padding: 36px 22px 64px; }
  img { width: 64px; height: auto; }
  .kicker { font-family: Archivo, Arial, sans-serif; font-stretch: 125%; font-weight: 500; text-transform: uppercase; letter-spacing: 0.22em; font-size: 11px; color: #6E6A64; margin: 28px 0 12px; }
  h1 { font-family: "Cormorant Garamond", Georgia, serif; font-weight: 300; font-style: italic; font-size: 40px; line-height: 1.1; margin: 0 0 18px; border-bottom: 1px solid #D1D1D1; padding-bottom: 16px; }
  .dek { color: #6E6A64; margin: 0 0 8px; }
  p { margin: 16px 0; }
  .card { background: #F1EEE9; padding: 22px 24px; margin: 22px 0; }
  .badge { display: inline-block; background: #DBD4C9; font-family: Archivo, Arial, sans-serif; font-stretch: 125%; font-weight: 500; text-transform: uppercase; letter-spacing: 0.18em; font-size: 10px; padding: 6px 10px; }
  .stat { font-family: "Cormorant Garamond", Georgia, serif; font-style: italic; font-weight: 300; font-size: 32px; line-height: 1; margin-top: 8px; }
  .sign { font-family: "Cormorant Garamond", Georgia, serif; font-style: italic; font-size: 28px; margin: 28px 0 0; }
  .foot { margin-top: 28px; border-top: 1px solid #E0E0E0; padding-top: 14px; font-family: Archivo, Arial, sans-serif; font-stretch: 125%; font-weight: 500; text-transform: uppercase; letter-spacing: 0.18em; font-size: 10px; color: #6E6A64; }
</style>
</head>
<body>
<div class="wrap">
  <img src="/logo.png" alt="Move Mountains Co.">
  <div class="kicker">${kicker}</div>
  <h1>${title}</h1>
  <p class="dek">${dek}</p>
  ${body}
  <p class="sign">MMC Team</p>
  <div class="foot">movemountains.co · Internal &amp; confidential</div>
</div>
</body>
</html>`;
}

function card(label, html) {
  return `<section class="card"><div class="badge">${label}</div>${html}</section>`;
}

const extras = {
  weekly: page({
    kicker: "Autospy · Weekly autopsy · Internal",
    title: "Week of Sep 29 – Oct 5",
    dek: "Tuesday run · 6:59 AM ET · Filed 10/06/2026",
    body: `
      <p>Four event autopsies closed this week. Scores sit in the ochre band: wedding-day coverage held, and the same three handoffs slipped again — intake after midnight, gear still out on Monday, and a film with no editor named on the sheet.</p>
      ${card("This week", `<p class="stat" style="color:#96671A">6.4</p><p>Mean of the four scored autopsies. One project was left N/A on albums and dropped from the mean.</p>`)}
      ${card("Still open", `<p><strong>Intake after the couple leaves.</strong> Two Saturday weddings had no intake until Sunday afternoon.</p><p><strong>Gear named on the notice.</strong> One camera case from 10/3 was still out when the Tuesday run started.</p>`)}
    `,
  }),
  delivery: page({
    kicker: "Autospy · Delivery summary · Internal",
    title: "Delivery · Sep 29 – Oct 5",
    dek: "Galleries against +14 · Films against +28 · Filed with the Tuesday autopsies",
    body: `
      <p>No deliverable missed its contract date. Internal speed is the gap: galleries clearing +14, and films still stacked past +28.</p>
      ${card("Snapshot", `<p class="stat" style="color:#96671A">18 / 35</p><p>Galleries inside +14 days. Films inside +28: 1 of 22. Survey average on delivered weddings stayed high.</p>`)}
      ${card("Owners", `<p>Photo editing — Ali Sherin. Video editing — Komiljon Sayfiev. Production lead — Yan Ortiz, on the weekly board.</p>`)}
    `,
  }),
  leads: page({
    kicker: "Autospy · Weekday leads · Internal",
    title: "Tuesday leads",
    dek: "10/06/2026 · Unanswered past one hour · Sales",
    body: `
      <p>Three inquiries from Monday night were still waiting when the weekday check ran. Sunday’s bot replies are not the pattern on a weeknight.</p>
      ${card("Waiting", `<p><strong>One WeddingWire form</strong> has no first reply. Owner: Raul / Sales. The other two sat between three and six hours.</p>`)}
      ${card("Fix", `<p>Keep the same one-hour alert for forms and for info@. Weekday nights stay on the bot queue.</p>`)}
    `,
  }),
  travel: page({
    kicker: "Autospy · Travel deadline · Internal",
    title: "Travel booked?",
    dek: "Events inside 21 days · Scheduling and Production · 10/07/2026",
    body: `
      <p>Two October weddings outside Rhode Island still have no travel on the sheet. The deadline for booking is 21 days out.</p>
      ${card("Open", `<p><strong>10/18 · out of state.</strong> No flights, no hotel. Scheduling owns the hold. Production needs the names before gear goes out.</p><p><strong>10/25 · second shooter travel.</strong> Lead is booked. The second seat is not.</p>`)}
    `,
  }),
  venue: page({
    kicker: "Autospy · Venue conversion · Internal",
    title: "Venues · September 2026",
    dek: "Inquiries that named a venue · Sales",
    body: `
      <p>September inquiries that named a venue converted below the summer rate. Repeat venues still book. First-time rooms, and anything without a date, stall after the first reply.</p>
      ${card("Snapshot", `<p class="stat" style="color:#96671A">14</p><p>Named-venue inquiries. Booked in the month: 4. The rest are open, lost, or waiting on a date.</p>`)}
      ${card("Note", `<p>This is a sales report. Planning sees a booked venue only after the contract is in.</p>`)}
    `,
  }),
};

/**
 * Local library only. Production stays empty until a bot posts to /api/ingest.
 */
export async function seedIfEmpty(store, env = process.env) {
  const existing = await store.get("index:reports", { type: "json" });
  if (Array.isArray(existing) && existing.length) return { seeded: false };

  const org = loadOrg();
  const types = loadTypes();
  const origin = String(env.URL || "http://127.0.0.1:8787").replace(/\/$/, "");

  const filings = [
    {
      at: "2026-10-07T14:05:00.000Z",
      report: {
        batch_id: "2026-10-07-leads",
        type: "weekday-leads",
        period: "2026-10-06",
        title: "Weekday leads · 10/06/2026",
        audience: { departments: ["sales"] },
        department: "sales",
        html: extras.leads,
      },
    },
    {
      at: "2026-10-07T13:10:00.000Z",
      report: {
        batch_id: "2026-10-07-travel",
        type: "travel-deadline",
        period: "2026-10-07",
        title: "Travel deadline check · 10/07/2026",
        audience: { departments: ["scheduling", "production"] },
        department: "scheduling",
        html: extras.travel,
      },
    },
    {
      at: "2026-10-06T10:59:00.000Z",
      report: {
        batch_id: "2026-10-06-tuesday",
        type: "weekly-autopsy",
        period: "2026-09-29..2026-10-05",
        title: "Weekly autopsies · Sep 29 – Oct 5",
        audience: "admins",
        html: extras.weekly,
      },
    },
    {
      at: "2026-10-06T10:59:00.000Z",
      report: {
        batch_id: "2026-10-06-tuesday",
        type: "delivery-summary",
        period: "2026-09-29..2026-10-05",
        title: "Delivery summary · Sep 29 – Oct 5",
        audience: "admins",
        html: extras.delivery,
      },
    },
    {
      at: "2026-10-05T14:00:00.000Z",
      report: {
        batch_id: "2026-10-05-speed",
        type: "speed-to-lead",
        period: "2026-09-29..2026-10-04",
        title: "Speed to lead · Sep 29 – Oct 4",
        audience: { departments: ["sales"], emails: ["raul@movemountains.co"] },
        department: "sales",
        person: "raul@movemountains.co",
        html: sample("speed_to_lead_2026-10-05.html"),
      },
    },
    {
      at: "2026-10-06T16:00:00.000Z",
      report: {
        batch_id: "2026-09-monthly",
        type: "monthly-shooter",
        period: "2026-09",
        title: "Joshua Ortiz · September 2026",
        audience: "ortiz@movemountains.co",
        department: "production",
        person: "ortiz@movemountains.co",
        html: sample("sample_shooter_2026-09.html"),
      },
    },
    {
      at: "2026-10-06T16:00:00.000Z",
      report: {
        batch_id: "2026-09-monthly",
        type: "monthly-editor",
        period: "2026-09",
        title: "Ali Sherin · September 2026",
        audience: "ali@movemountains.co",
        department: "photo-editing",
        person: "ali@movemountains.co",
        html: sample("sample_editor_2026-09.html"),
      },
    },
    {
      at: "2026-10-06T16:00:00.000Z",
      report: {
        batch_id: "2026-09-monthly",
        type: "monthly-editor",
        period: "2026-09",
        title: "Julia Vieira · September 2026",
        audience: "julia@movemountains.co",
        department: "video-editing",
        person: "julia@movemountains.co",
        html: page({
          kicker: "Autospy · Editor report · Internal",
          title: "Julia Vieira · September 2026",
          dek: "Video editor · julia@movemountains.co",
          body: `<p>Julia cut highlight films for six September weddings. Two cleared the +28 day mark. The other four are inside contract and still open on the board.</p>${card("Snapshot", `<p class="stat" style="color:#96671A">2 / 6</p><p>Films inside +28 days. No client revision came back on the ones that delivered.</p>`)}`,
        }),
      },
    },
    {
      at: "2026-10-06T16:00:00.000Z",
      report: {
        batch_id: "2026-09-monthly",
        type: "monthly-dept-head",
        period: "2026-09",
        title: "Yan Ortiz · September 2026",
        audience: "yan@movemountains.co",
        department: "production",
        person: "yan@movemountains.co",
        html: sample("sample_depthead_2026-09.html"),
      },
    },
    {
      at: "2026-10-06T16:00:00.000Z",
      report: {
        batch_id: "2026-09-monthly",
        type: "monthly-department",
        period: "2026-09",
        title: "Production · September 2026",
        audience: { departments: ["production"], emails: ["yan@movemountains.co"] },
        department: "production",
        html: sample("sample_department_2026-09.html"),
      },
    },
    {
      at: "2026-10-06T16:00:00.000Z",
      report: {
        batch_id: "2026-09-monthly",
        type: "monthly-department",
        period: "2026-09",
        title: "Photo Editing · September 2026",
        audience: { departments: ["photo-editing"] },
        department: "photo-editing",
        html: page({
          kicker: "Autospy · Department report · Internal",
          title: "Photo Editing · September 2026",
          dek: "Head: Ali Sherin · Separate from Video Editing",
          body: `<p>Photo editing carried the gallery load. Ali’s own book was the largest. Sessions and sneak peeks are the soft spot; contract dates held.</p>${card("Snapshot", `<p class="stat" style="color:#4F6F45">8.0</p><p>Lead editor score. Department galleries inside +14 were mixed once the rest of the bench is included.</p>`)}`,
        }),
      },
    },
    {
      at: "2026-10-06T16:00:00.000Z",
      report: {
        batch_id: "2026-09-monthly",
        type: "monthly-department",
        period: "2026-09",
        title: "Data · September 2026",
        audience: { departments: ["data"] },
        department: "data",
        html: page({
          kicker: "Autospy · Department report · Internal",
          title: "Data · September 2026",
          dek: "Roane Purificacion · Under Production",
          body: `<p>Sheets used by the Tuesday autopsies were current. Two name variants (Ali / Ali Sherin, Sumit / Sumit Bisht) are still unmerged, so editor totals in Production double-count if someone adds them by hand.</p>${card("Fix", `<p>One canonical name per person on the delivery tabs before the October close.</p>`)}`,
        }),
      },
    },
    {
      at: "2026-10-06T16:00:00.000Z",
      report: {
        batch_id: "2026-09-monthly",
        type: "monthly-department",
        period: "2026-09",
        title: "Gear · September 2026",
        audience: { departments: ["gear"] },
        department: "gear",
        html: page({
          kicker: "Autospy · Department report · Internal",
          title: "Gear · September 2026",
          dek: "Kenneth (Kenny) Barrios · Head from 10/03/2026",
          body: `<p>The 9/30 inventory produced notices for gear still out. Kenny took the department on 10/3. September filings before that were Aryel’s.</p>${card("Still out", `<p>Camera 27 and Case 12 are the items named most often. Same-night check-in is the fix on the shooter reports.</p>`)}`,
        }),
      },
    },
    {
      at: "2026-10-06T16:00:00.000Z",
      report: {
        batch_id: "2026-09-monthly",
        type: "monthly-department",
        period: "2026-09",
        title: "Orders · September 2026",
        audience: { departments: ["orders"] },
        department: "orders",
        html: page({
          kicker: "Autospy · Department report · Internal",
          title: "Orders · September 2026",
          dek: "Kenneth (Kenny) Barrios · With Gear, under Production",
          body: `<p>Album and print orders that were due in September left the building. Two rush orders sat with the lab past the date on the form.</p>${card("Note", `<p>Orders is its own department. It is not folded into Gear, even though Kenny heads both.</p>`)}`,
        }),
      },
    },
    {
      at: "2026-10-06T16:00:00.000Z",
      report: {
        batch_id: "2026-09-monthly",
        type: "monthly-rollup",
        period: "2026-09",
        title: "Internal staff · September 2026",
        audience: "admins",
        html: sample("sample_rollup_2026-09.html"),
      },
    },
    {
      at: "2026-10-01T15:00:00.000Z",
      report: {
        batch_id: "2026-09-venues",
        type: "venue-conversion",
        period: "2026-09",
        title: "Venue conversion · September 2026",
        audience: { departments: ["sales"] },
        department: "sales",
        html: extras.venue,
      },
    },
  ];

  for (const filing of filings) {
    await ingestReports(filing.report, { store, org, now: () => filing.at });
  }
  await completeBatch({
    store,
    org,
    types,
    id: "2026-09-monthly",
    origin,
    now: () => "2026-10-06T18:00:00.000Z",
  });
  await completeBatch({
    store,
    org,
    types,
    id: "2026-10-06-tuesday",
    origin,
    now: () => "2026-10-06T11:05:00.000Z",
  });
  return { seeded: true, count: filings.length };
}
