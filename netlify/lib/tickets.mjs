/**
 * Move Mountains Co. — Client tickets.
 *
 * Tickets are NOT a departmental weekly report. They are a single shared pool
 * that every department writes into, with two owners at once:
 *
 *   origin_department  - who raised it and owns the underlying work
 *   client-facing      - Planning, always, until escalated to management
 *
 * A ticket raised by Photo in week 1, communicated by Planning in week 2 and
 * escalated in week 3 is ONE record with a lifecycle, not three weekly rows.
 * Each department's weekly form surfaces its open tickets and asks for an
 * update rather than asking anyone to retype them.
 *
 * Rules agreed with Sean:
 *   - Either side can close: the origin department OR Planning OR management.
 *   - Escalation is manual, AND automatic once a ticket has been open past
 *     TICKET_ESCALATION_DAYS. The automatic path exists because the real
 *     failure mode here is a ticket everyone quietly stopped looking at.
 */

import { getStore } from '@netlify/blobs';

export const TICKET_STATUS = ['open', 'in_progress', 'awaiting_client', 'resolved', 'closed'];
export const OPEN_STATUSES = ['open', 'in_progress', 'awaiting_client'];
export const TICKET_PRIORITY = ['low', 'normal', 'high', 'urgent'];

/** department -> Planning owns the client conversation -> management. */
export const ESCALATION_LEVELS = ['department', 'planning', 'management'];

export const ESCALATION_DAYS = Number(process.env.TICKET_ESCALATION_DAYS || 14);

function store() {
  return getStore({ name: 'tickets', consistency: 'strong' });
}

export function ticketStore() {
  return store();
}

/* ------------------------------------------------------------------ */
/* IDs                                                                 */
/* ------------------------------------------------------------------ */

/**
 * Human-referenceable sequential ids (TKT-0001). Volume here is low enough
 * that a counter blob is safe; if the counter is ever unreadable we fall back
 * to a timestamp id rather than risk overwriting an existing ticket.
 */
async function nextId(blobs) {
  try {
    const cur = await blobs.get('_counter', { type: 'json' }).catch(() => null);
    const n = (cur?.value || 0) + 1;
    await blobs.setJSON('_counter', { value: n });
    return `TKT-${String(n).padStart(4, '0')}`;
  } catch {
    return `TKT-T${Date.now().toString(36).toUpperCase()}`;
  }
}

/* ------------------------------------------------------------------ */
/* Escalation                                                          */
/* ------------------------------------------------------------------ */

export function daysOpen(ticket, now = Date.now()) {
  if (!ticket?.opened_at) return 0;
  return Math.floor((now - new Date(ticket.opened_at).getTime()) / 86400000);
}

export function isOpen(ticket) {
  return OPEN_STATUSES.includes(ticket?.status);
}

/**
 * Who currently owns the client-facing side. Derived, never stored, so it can
 * never drift out of step with the escalation level.
 */
export function clientFacingOwner(ticket) {
  return ticket?.escalation_level === 'management' ? 'management' : 'planning';
}

/**
 * Apply age-based auto-escalation. Returns { ticket, changed } so the caller
 * can persist only when something actually flipped.
 */
export function applyAutoEscalation(ticket, now = Date.now()) {
  if (!isOpen(ticket)) return { ticket, changed: false };
  if (ticket.escalation_level === 'management') return { ticket, changed: false };

  const age = daysOpen(ticket, now);
  if (age < ESCALATION_DAYS) return { ticket, changed: false };

  const updated = {
    ...ticket,
    escalation_level: 'management',
    escalated_at: new Date(now).toISOString(),
    escalated_by: 'system',
    escalation_reason: `Open ${age} days, past the ${ESCALATION_DAYS}-day threshold`,
    updates: [
      ...(ticket.updates || []),
      {
        at: new Date(now).toISOString(),
        by: 'system',
        type: 'escalated',
        note: `Auto-escalated to management after ${age} days open.`,
        from: ticket.escalation_level,
        to: 'management',
      },
    ],
  };
  return { ticket: updated, changed: true };
}

/* ------------------------------------------------------------------ */
/* CRUD                                                                */
/* ------------------------------------------------------------------ */

export async function createTicket({ client, subject, description, origin_department, priority, user }) {
  const blobs = store();
  const id = await nextId(blobs);
  const nowIso = new Date().toISOString();

  const ticket = {
    id,
    client: client || null,
    subject,
    description: description || null,
    origin_department,
    priority: TICKET_PRIORITY.includes(priority) ? priority : 'normal',
    status: 'open',
    escalation_level: 'department',
    escalated_at: null,
    escalated_by: null,
    escalation_reason: null,
    opened_at: nowIso,
    opened_by: user?.email || 'unknown',
    closed_at: null,
    closed_by: null,
    updates: [{
      at: nowIso,
      by: user?.email || 'unknown',
      type: 'opened',
      note: `Raised by ${origin_department}.`,
    }],
  };

  await blobs.setJSON(`tickets/${id}.json`, ticket);
  return ticket;
}

export async function getTicket(id) {
  const blobs = store();
  const t = await blobs.get(`tickets/${id}.json`, { type: 'json' }).catch(() => null);
  if (!t) return null;

  const { ticket, changed } = applyAutoEscalation(t);
  if (changed) await blobs.setJSON(`tickets/${id}.json`, ticket);
  return ticket;
}

/**
 * Every ticket, newest first. Auto-escalation is evaluated on read and
 * persisted when it flips, so no scheduled job is needed.
 */
export async function listTickets({ department, status, openOnly } = {}) {
  const blobs = store();
  const { blobs: entries } = await blobs.list({ prefix: 'tickets/' });

  const out = [];
  for (const e of entries) {
    const t = await blobs.get(e.key, { type: 'json' }).catch(() => null);
    if (!t) continue;

    const { ticket, changed } = applyAutoEscalation(t);
    if (changed) await blobs.setJSON(e.key, ticket);

    if (department && ticket.origin_department !== department) continue;
    if (status && ticket.status !== status) continue;
    if (openOnly && !isOpen(ticket)) continue;

    out.push(ticket);
  }

  out.sort((a, b) => (a.opened_at < b.opened_at ? 1 : -1));
  return out;
}

/**
 * Append an update. `changes` may set status, priority, escalation_level or
 * assignment; everything is recorded in the audit trail.
 */
export async function updateTicket({ id, changes, note, user }) {
  const blobs = store();
  const existing = await getTicket(id);
  if (!existing) return null;

  const nowIso = new Date().toISOString();
  const updates = [...(existing.updates || [])];
  const next = { ...existing };

  if (changes.status && changes.status !== existing.status) {
    if (!TICKET_STATUS.includes(changes.status)) {
      throw new Error(`Unknown status "${changes.status}".`);
    }
    updates.push({
      at: nowIso, by: user?.email || 'unknown', type: 'status',
      from: existing.status, to: changes.status, note: note || null,
    });
    next.status = changes.status;

    if (changes.status === 'closed') {
      next.closed_at = nowIso;
      next.closed_by = user?.email || 'unknown';
    } else {
      next.closed_at = null;
      next.closed_by = null;
    }
  }

  if (changes.priority && changes.priority !== existing.priority) {
    if (!TICKET_PRIORITY.includes(changes.priority)) {
      throw new Error(`Unknown priority "${changes.priority}".`);
    }
    updates.push({
      at: nowIso, by: user?.email || 'unknown', type: 'priority',
      from: existing.priority, to: changes.priority,
    });
    next.priority = changes.priority;
  }

  if (changes.escalation_level && changes.escalation_level !== existing.escalation_level) {
    if (!ESCALATION_LEVELS.includes(changes.escalation_level)) {
      throw new Error(`Unknown escalation level "${changes.escalation_level}".`);
    }
    updates.push({
      at: nowIso, by: user?.email || 'unknown', type: 'escalated',
      from: existing.escalation_level, to: changes.escalation_level,
      note: note || 'Manually escalated.',
    });
    next.escalation_level = changes.escalation_level;
    next.escalated_at = nowIso;
    next.escalated_by = user?.email || 'unknown';
    next.escalation_reason = note || 'Manual escalation';
  }

  // A plain note with no field changes is still worth recording.
  if (note && !changes.status && !changes.priority && !changes.escalation_level) {
    updates.push({ at: nowIso, by: user?.email || 'unknown', type: 'note', note });
  }

  next.updates = updates;
  await blobs.setJSON(`tickets/${id}.json`, next);
  return next;
}

/* ------------------------------------------------------------------ */
/* Rollups                                                             */
/* ------------------------------------------------------------------ */

/** Counts for the dashboard and for the management AI summary. */
export function summarise(tickets) {
  const open = tickets.filter(isOpen);
  const byDept = {};
  for (const t of open) {
    byDept[t.origin_department] = (byDept[t.origin_department] || 0) + 1;
  }

  const escalated = open.filter((t) => t.escalation_level === 'management');
  const ages = open.map((t) => daysOpen(t));

  return {
    total: tickets.length,
    open: open.length,
    closed: tickets.filter((t) => t.status === 'closed').length,
    resolved: tickets.filter((t) => t.status === 'resolved').length,
    awaiting_client: tickets.filter((t) => t.status === 'awaiting_client').length,
    escalated_to_management: escalated.length,
    open_by_department: byDept,
    oldest_open_days: ages.length ? Math.max(...ages) : 0,
    avg_open_days: ages.length
      ? Math.round((ages.reduce((a, b) => a + b, 0) / ages.length) * 10) / 10
      : 0,
    approaching_escalation: open.filter(
      (t) => t.escalation_level !== 'management'
        && daysOpen(t) >= ESCALATION_DAYS - 3
        && daysOpen(t) < ESCALATION_DAYS,
    ).length,
  };
}
