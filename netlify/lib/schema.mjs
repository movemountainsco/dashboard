/**
 * Move Mountains Co. — Department report schemas.
 *
 * THIS IS THE ONE FILE TO EDIT when a department's questions change.
 * Add/remove/rename a field here and both the submission form and the
 * dashboards pick it up automatically. Nothing else needs to change.
 *
 * Field types:
 *   currency  - dollar amount, rendered with $ and thousands separators
 *   number    - plain number
 *   percent   - 0-100, rendered with %
 *   text      - single line
 *   longtext  - multi-line textarea
 *   date      - ISO date
 *
 * Field options:
 *   key       - stable identifier. NEVER change once data exists (renaming
 *               orphans historical values). Change `label` instead.
 *   label     - what the submitter sees
 *   required  - blocks submit if empty
 *   help      - hint text under the input
 *   group     - optional grouping header on the form
 */

export const CADENCE = {
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
};

/** Marketing lead-source channels. Edit this list to add/remove a channel. */
export const MARKETING_CHANNELS = [
  { key: 'facebook', label: 'Facebook' },
  { key: 'google', label: 'Google' },
  { key: 'instagram', label: 'Instagram' },
  { key: 'pinterest', label: 'Pinterest' },
  { key: 'the_knot', label: 'The Knot' },
  { key: 'wedding_wire', label: 'Wedding Wire' },
  { key: 'tiktok', label: 'TikTok' },
  { key: 'youtube', label: 'YouTube' },
  { key: 'client_referral', label: 'Client Referral' },
  { key: 'vendor_referral', label: 'Vendor Referral' },
];

/** Build the per-channel marketing fields (spend / leads / bookings each). */
function marketingChannelFields() {
  const fields = [];
  for (const ch of MARKETING_CHANNELS) {
    fields.push(
      { key: `${ch.key}_spend`, label: `${ch.label} — Ad Spend`, type: 'currency', group: ch.label },
      { key: `${ch.key}_leads`, label: `${ch.label} — Leads`, type: 'number', group: ch.label },
      { key: `${ch.key}_bookings`, label: `${ch.label} — Bookings`, type: 'number', group: ch.label },
    );
  }
  return fields;
}

export const DEPARTMENTS = {
  payroll: {
    key: 'payroll',
    label: 'Payroll',
    cadence: CADENCE.WEEKLY,
    role: 'payroll',
    accent: '#6366f1',
    // Headline number shown on the management dashboard card.
    headline: { key: 'total', label: 'Total Paid Out', type: 'currency' },
    fields: [
      { key: 'w2_salary', label: 'W2 Salary', type: 'currency', required: true, group: 'W2' },
      { key: 'w2_hourly', label: 'W2 Hourly', type: 'currency', required: true, group: 'W2' },
      { key: 'overtime', label: 'Total Paid Out In Overtime', type: 'currency', group: 'W2' },
      { key: 'shooters', label: 'Shooters', type: 'currency', required: true, group: 'Contractors' },
      { key: 'editors', label: 'Editors', type: 'currency', required: true, group: 'Contractors' },
      { key: 'vas', label: "VA's (Admins)", type: 'currency', required: true, group: 'Contractors' },
      { key: 'bonuses', label: 'Bonuses', type: 'currency', group: 'Other Pay' },
      { key: 'commissions', label: 'Commissions', type: 'currency', group: 'Other Pay' },
      { key: 'other', label: 'Other', type: 'currency', group: 'Other Pay' },
      {
        key: 'galleries_count', label: 'Galleries Delivered', type: 'number', group: 'Production',
        help: 'Number of galleries paid out this week',
      },
      { key: 'galleries_total', label: 'Galleries — Total $', type: 'currency', group: 'Production' },
      { key: 'highlights_count', label: 'Highlights Delivered', type: 'number', group: 'Production' },
      { key: 'highlights_total', label: 'Highlights — Total $', type: 'currency', group: 'Production' },
      { key: 'notes', label: 'Notes', type: 'longtext', group: 'Notes' },
    ],
    /**
     * Derived values. Computed from the entered fields — the submitter never
     * types these, which removes the arithmetic errors the old form allowed.
     */
    derived: [
      {
        key: 'total', label: 'Weekly Total', type: 'currency',
        compute: (d) => sum(d, ['w2_salary', 'w2_hourly', 'shooters', 'editors', 'vas', 'bonuses', 'commissions', 'other']),
      },
      {
        key: 'w2_total', label: 'W2 Total', type: 'currency',
        compute: (d) => sum(d, ['w2_salary', 'w2_hourly']),
      },
      {
        key: 'contractor_total', label: 'Contractor Total', type: 'currency',
        compute: (d) => sum(d, ['shooters', 'editors', 'vas']),
      },
      {
        key: 'avg_per_gallery', label: 'Avg $/Gallery', type: 'currency',
        compute: (d) => safeDiv(num(d.galleries_total), num(d.galleries_count)),
      },
      {
        key: 'avg_per_highlight', label: 'Avg $/Highlight', type: 'currency',
        compute: (d) => safeDiv(num(d.highlights_total), num(d.highlights_count)),
      },
    ],
  },

  marketing: {
    key: 'marketing',
    label: 'Marketing',
    cadence: CADENCE.MONTHLY,
    role: 'marketing',
    accent: '#ec4899',
    headline: { key: 'total_leads', label: 'Total Leads', type: 'number' },
    fields: [
      ...marketingChannelFields(),
      {
        key: 'strategy', label: "Current Month's Strategy", type: 'longtext', group: 'Strategy',
        help: 'What you focused on this month and why',
      },
    ],
    derived: [
      {
        key: 'total_spend', label: 'Total Ad Spend', type: 'currency',
        compute: (d) => sumKeys(d, MARKETING_CHANNELS.map((c) => `${c.key}_spend`)),
      },
      {
        key: 'total_leads', label: 'Total Leads', type: 'number',
        compute: (d) => sumKeys(d, MARKETING_CHANNELS.map((c) => `${c.key}_leads`)),
      },
      {
        key: 'total_bookings', label: 'Total Bookings', type: 'number',
        compute: (d) => sumKeys(d, MARKETING_CHANNELS.map((c) => `${c.key}_bookings`)),
      },
      {
        key: 'total_cpl', label: 'Cost Per Lead', type: 'currency',
        compute: (d) => safeDiv(
          sumKeys(d, MARKETING_CHANNELS.map((c) => `${c.key}_spend`)),
          sumKeys(d, MARKETING_CHANNELS.map((c) => `${c.key}_leads`)),
        ),
      },
      {
        key: 'total_cpa', label: 'Cost Per Acquisition', type: 'currency',
        compute: (d) => safeDiv(
          sumKeys(d, MARKETING_CHANNELS.map((c) => `${c.key}_spend`)),
          sumKeys(d, MARKETING_CHANNELS.map((c) => `${c.key}_bookings`)),
        ),
      },
      {
        key: 'closing_rate', label: 'Closing Rate', type: 'percent',
        compute: (d) => pct(
          sumKeys(d, MARKETING_CHANNELS.map((c) => `${c.key}_bookings`)),
          sumKeys(d, MARKETING_CHANNELS.map((c) => `${c.key}_leads`)),
        ),
      },
    ],
  },

  photo: {
    key: 'photo',
    label: 'Photo',
    cadence: CADENCE.WEEKLY,
    role: 'photo',
    accent: '#0ea5e9',
    headline: { key: 'pending_wedding_galleries', label: 'Pending Galleries', type: 'number' },
    fields: [
      { key: 'total_wedding_galleries', label: 'Total Wedding Galleries', type: 'number', required: true, group: 'Galleries' },
      { key: 'completed_ytd', label: 'Completed YTD', type: 'number', required: true, group: 'Galleries' },
      { key: 'avg_turnaround', label: 'Average Turnaround Time (days)', type: 'number', group: 'Galleries' },
      { key: 'total_editors', label: 'Total Editors', type: 'number', group: 'Team' },
      { key: 'delivery_sessions', label: 'Weekly Delivery — Sessions', type: 'number', group: 'Weekly Delivery' },
      { key: 'delivery_weddings', label: 'Weekly Delivery — Weddings', type: 'number', group: 'Weekly Delivery' },
      { key: 'avg_weddings_per_week_ytd', label: 'Average Weddings Per Week YTD', type: 'number', group: 'Weekly Delivery' },
      { key: 'est_completion_date', label: 'Estimated Date of Completion', type: 'date', group: 'Weekly Delivery' },
      { key: 'pending_sessions', label: 'Pending Sessions', type: 'number', group: 'Pipeline' },
      { key: 'pending_wedding_galleries', label: 'Pending Wedding Galleries', type: 'number', group: 'Pipeline' },
      { key: 'pending_commercial', label: 'Pending Commercial Projects', type: 'number', group: 'Pipeline' },
      { key: 'open_look_throughs', label: 'Open Look Throughs', type: 'number', group: 'Open Items' },
      { key: 'overdue_projects', label: 'Overdue Projects', type: 'number', group: 'Open Items' },
      { key: 'open_venue_albums', label: 'Open Venue Albums', type: 'number', group: 'Open Items' },
      { key: 'client_revisions_ytd', label: 'Client Revisions YTD', type: 'number', group: 'Client' },
      { key: 'open_client_revisions', label: 'Open Client Revisions', type: 'number', group: 'Client' },
      {
        key: 'client_success_rate', label: 'Client Success Rate', type: 'percent', group: 'Client',
        help: 'Percentage, 0-100',
      },
      { key: 'notes', label: 'Notes', type: 'longtext', group: 'Notes' },
    ],
    derived: [
      {
        key: 'completion_pct', label: 'Completion %', type: 'percent',
        compute: (d) => pct(num(d.completed_ytd), num(d.total_wedding_galleries)),
      },
      {
        key: 'left', label: 'Galleries Left', type: 'number',
        compute: (d) => num(d.total_wedding_galleries) - num(d.completed_ytd),
      },
      {
        key: 'total_projects', label: 'Total Projects', type: 'number',
        compute: (d) => sum(d, ['pending_sessions', 'pending_wedding_galleries', 'pending_commercial']),
      },
      {
        key: 'avg_galleries_per_editor', label: 'Average Galleries Per Editor', type: 'number',
        compute: (d) => safeDiv(sum(d, ['delivery_sessions', 'delivery_weddings']), num(d.total_editors)),
      },
    ],
  },

  video: {
    key: 'video',
    label: 'Video',
    cadence: CADENCE.WEEKLY,
    role: 'video',
    accent: '#ef4444',
    headline: { key: 'total_deliverables', label: 'Deliverables This Week', type: 'number' },
    fields: [
      { key: 'highlights_delivered', label: 'Highlights Delivered', type: 'number', required: true, group: 'Deliveries' },
      { key: 'weddings_shot', label: 'Weddings Shot Last Weekend', type: 'number', group: 'Deliveries' },
      { key: 'doc_cuts_delivered', label: 'Doc Cuts Delivered', type: 'number', group: 'Deliveries' },
      { key: 'teasers_delivered', label: 'Teasers Delivered', type: 'number', group: 'Deliveries' },
      { key: 'stationaries_delivered', label: 'Stationaries Delivered', type: 'number', group: 'Deliveries' },
      { key: 'total_editors', label: 'Current Editors', type: 'number', required: true, group: 'Team' },
      { key: 'avg_turnaround', label: 'Average Turnaround Time (days)', type: 'number', group: 'Team' },
      { key: 'highlights_delivered_ytd', label: 'Highlights Delivered YTD', type: 'number', required: true, group: 'Backlog' },
      { key: 'highlights_target_year', label: 'Highlights Target For The Year', type: 'number', required: true, group: 'Backlog' },
      { key: 'weeks_elapsed', label: 'Weeks Elapsed This Year', type: 'number', required: true, group: 'Backlog', help: 'Used to work out the pace needed to clear the backlog' },
      { key: 'open_highlights', label: 'Total Open Highlights / Projects', type: 'number', group: 'Open Work' },
      { key: 'open_client_revisions', label: 'Open Client Revisions', type: 'number', group: 'Open Work' },
      { key: 'open_commercial', label: 'Open Commercial Projects', type: 'number', group: 'Open Work' },
      { key: 'open_podcasts', label: 'Open Podcasts', type: 'number', group: 'Open Work' },
      { key: 'notes', label: 'Notes', type: 'longtext', group: 'Notes' },
    ],
    derived: [
      {
        key: 'total_deliverables', label: 'Deliverables This Week', type: 'number',
        compute: (d) => sum(d, ['highlights_delivered', 'doc_cuts_delivered', 'teasers_delivered', 'stationaries_delivered']),
      },
      {
        key: 'highlights_left', label: 'Highlights Left', type: 'number',
        compute: (d) => num(d.highlights_target_year) - num(d.highlights_delivered_ytd),
      },
      {
        key: 'completion_pct', label: 'Completion %', type: 'percent',
        compute: (d) => pct(num(d.highlights_delivered_ytd), num(d.highlights_target_year)),
      },
      {
        key: 'avg_videos_per_editor', label: 'Avg Videos Per Editor This Week', type: 'number',
        compute: (d) => safeDiv(num(d.highlights_delivered), num(d.total_editors)),
      },
      {
        key: 'avg_videos_per_week_ytd', label: 'Avg Videos Per Week (YTD)', type: 'number',
        compute: (d) => safeDiv(num(d.highlights_delivered_ytd), num(d.weeks_elapsed)),
      },
      {
        key: 'pace_needed', label: 'Pace Needed To Finish By Year End', type: 'number',
        compute: (d) => safeDiv(
          num(d.highlights_target_year) - num(d.highlights_delivered_ytd),
          Math.max(52 - num(d.weeks_elapsed), 0),
        ),
      },
    ],
  },

  gear: {
    key: 'gear',
    label: 'Gear',
    cadence: CADENCE.WEEKLY,
    role: 'gear',
    accent: '#f59e0b',
    headline: { key: 'rentals', label: 'Rentals This Week', type: 'number' },
    fields: [
      { key: 'rentals', label: 'Number of Rentals This Week', type: 'number', required: true, group: 'Rentals' },
      { key: 'what_rented', label: 'What Was Rented', type: 'longtext', group: 'Rentals' },
      { key: 'cases_out', label: 'Cases Out for This Week', type: 'number', group: 'Rentals' },
      { key: 'issues', label: 'Issues or Concerns', type: 'longtext', group: 'Condition' },
      { key: 'new_damages', label: 'Newly Reported Damages', type: 'longtext', group: 'Condition' },
      { key: 'repairs_needed', label: 'Repairs Needed', type: 'longtext', group: 'Condition' },
      { key: 'missing_gear', label: 'Missing Gear Info', type: 'longtext', group: 'Condition' },
      { key: 'recurring_issues', label: 'List of Recurring Issues', type: 'longtext', group: 'Condition' },
      { key: 'shooter_ratings', label: 'Shooter Ratings', type: 'longtext', group: 'Team' },
      { key: 'new_gear', label: 'New Gear Purchased This Week', type: 'longtext', group: 'Purchasing' },
      { key: 'new_gear_cost', label: 'Total Cost of New Gear', type: 'currency', group: 'Purchasing' },
      { key: 'gear_pending_purchase', label: 'Gear Pending Purchase', type: 'longtext', group: 'Purchasing' },
      { key: 'upcoming_needs', label: 'Upcoming Needs', type: 'longtext', group: 'Purchasing' },
      { key: 'feedback', label: 'Feedback and Suggestions', type: 'longtext', group: 'Notes' },
    ],
    derived: [],
  },

  sales: {
    key: 'sales',
    label: 'Sales',
    cadence: CADENCE.WEEKLY,
    role: 'sales',
    accent: '#10b981',
    headline: { key: 'revenue_booked', label: 'Revenue Booked', type: 'currency' },
    // NOTE: Sales had no existing Jotform, so these are starter fields.
    // Edit freely — Hannah/Raul should sanity-check them before week one.
    fields: [
      { key: 'inquiries', label: 'New Inquiries', type: 'number', required: true, group: 'Top of Funnel' },
      { key: 'consultations_booked', label: 'Consultations Booked', type: 'number', group: 'Top of Funnel' },
      { key: 'consultations_held', label: 'Consultations Held', type: 'number', group: 'Top of Funnel' },
      { key: 'proposals_sent', label: 'Proposals Sent', type: 'number', group: 'Pipeline' },
      { key: 'contracts_signed', label: 'Contracts Signed', type: 'number', required: true, group: 'Pipeline' },
      { key: 'revenue_booked', label: 'Revenue Booked', type: 'currency', required: true, group: 'Pipeline' },
      { key: 'lost_deals', label: 'Lost / Declined', type: 'number', group: 'Pipeline' },
      { key: 'lost_reasons', label: 'Why did we lose them?', type: 'longtext', group: 'Pipeline' },
      { key: 'notes', label: 'Notes', type: 'longtext', group: 'Notes' },
    ],
    derived: [
      {
        key: 'close_rate', label: 'Close Rate', type: 'percent',
        compute: (d) => pct(num(d.contracts_signed), num(d.inquiries)),
      },
      {
        key: 'avg_contract_value', label: 'Avg Contract Value', type: 'currency',
        compute: (d) => safeDiv(num(d.revenue_booked), num(d.contracts_signed)),
      },
      {
        key: 'consult_show_rate', label: 'Consult Show Rate', type: 'percent',
        compute: (d) => pct(num(d.consultations_held), num(d.consultations_booked)),
      },
    ],
  },

  planning: {
    key: 'planning',
    label: 'Planning',
    cadence: CADENCE.WEEKLY,
    role: 'planning',
    accent: '#8b5cf6',
    headline: { key: 'active_events', label: 'Active Events', type: 'number' },
    // NOTE: Planning had no existing Jotform — starter fields, edit freely.
    fields: [
      { key: 'active_events', label: 'Active Events', type: 'number', required: true, group: 'Workload' },
      { key: 'events_this_week', label: 'Events Executed This Week', type: 'number', group: 'Workload' },
      { key: 'upcoming_30_days', label: 'Events in Next 30 Days', type: 'number', group: 'Workload' },
      { key: 'client_meetings', label: 'Client Meetings Held', type: 'number', group: 'Client' },
      { key: 'site_visits', label: 'Site Visits Completed', type: 'number', group: 'Client' },
      { key: 'vendor_confirmations_outstanding', label: 'Vendor Confirmations Outstanding', type: 'number', group: 'Vendors' },
      { key: 'timelines_outstanding', label: 'Timelines Outstanding', type: 'number', group: 'Vendors' },
      { key: 'blockers', label: 'Issues / Blockers', type: 'longtext', group: 'Notes' },
      { key: 'notes', label: 'Notes', type: 'longtext', group: 'Notes' },
    ],
    derived: [],
  },
};

export const DEPARTMENT_KEYS = Object.keys(DEPARTMENTS);

/* ------------------------------------------------------------------ */
/* Compute helpers                                                     */
/* ------------------------------------------------------------------ */

export function num(v) {
  if (v === null || v === undefined || v === '') return 0;
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/[$,%\s,]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function sum(d, keys) {
  return keys.reduce((acc, k) => acc + num(d[k]), 0);
}

function sumKeys(d, keys) {
  return keys.reduce((acc, k) => acc + num(d[k]), 0);
}

function safeDiv(a, b) {
  return b ? a / b : 0;
}

function pct(a, b) {
  return b ? (a / b) * 100 : 0;
}

/** Apply a department's derived fields to a raw data object. */
export function withDerived(departmentKey, data) {
  const dept = DEPARTMENTS[departmentKey];
  if (!dept) return data;
  const out = { ...data };
  for (const d of dept.derived || []) {
    try {
      out[d.key] = d.compute(data);
    } catch {
      out[d.key] = null;
    }
  }
  return out;
}

/** All displayable fields (entered + derived) for a department. */
export function allFields(departmentKey) {
  const dept = DEPARTMENTS[departmentKey];
  if (!dept) return [];
  return [...dept.fields, ...(dept.derived || [])];
}

/**
 * Serializable schema for the browser. Strips the compute functions,
 * which cannot cross the network, but keeps labels/types so the frontend
 * can render derived values it receives from the API.
 */
export function serializableSchema() {
  const out = {};
  for (const [key, dept] of Object.entries(DEPARTMENTS)) {
    out[key] = {
      key: dept.key,
      label: dept.label,
      cadence: dept.cadence,
      role: dept.role,
      accent: dept.accent,
      headline: dept.headline,
      fields: dept.fields,
      derived: (dept.derived || []).map(({ key: k, label, type }) => ({ key: k, label, type })),
    };
  }
  return out;
}
