/**
 * /api/tickets
 *
 *   GET  /api/tickets                        -> the whole pool, newest first
 *   GET  /api/tickets?department=photo       -> tickets Photo raised
 *   GET  /api/tickets?openOnly=true          -> open only
 *   GET  /api/tickets?id=TKT-0001            -> one ticket, full audit trail
 *   GET  /api/tickets?summary=true           -> counts for dashboards
 *
 *   POST /api/tickets  { client, subject, description, origin_department, priority }
 *   POST /api/tickets  { id, changes: {...}, note }   -> update / close / escalate
 *
 * The pool is shared: every authenticated user can READ every ticket, because
 * a department cannot report on what it cannot see. Writes are narrower.
 *
 * Who can write to a ticket (agreed with Sean — either side can close):
 *   - the department that raised it
 *   - planning, which owns the client-facing side
 *   - management, which owns escalations
 */

import {
  getUser, json, unauthorized, forbidden, badRequest,
} from '../lib/auth.mjs';
import { DEPARTMENTS } from '../lib/schema.mjs';
import {
  createTicket, getTicket, listTickets, updateTicket, summarise,
  TICKET_PRIORITY, ESCALATION_DAYS,
} from '../lib/tickets.mjs';

function roles(user) {
  return user?.app_metadata?.roles || [];
}

function isManagement(user) {
  const r = roles(user);
  return r.includes('admin') || r.includes('management');
}

/** Departments this user may raise a ticket on behalf of. */
function writableDepartments(user) {
  if (isManagement(user)) return Object.keys(DEPARTMENTS);
  return roles(user).filter((r) => DEPARTMENTS[r]);
}

/** Either side can close: origin department, planning, or management. */
function canWriteTicket(user, ticket) {
  if (isManagement(user)) return true;
  const r = roles(user);
  if (r.includes('planning')) return true;
  return r.includes(ticket.origin_department);
}

export default async (req, context) => {
  const user = getUser(context);
  if (!user) return unauthorized();

  if (req.method === 'GET') return handleGet(req, user);
  if (req.method === 'POST') return handlePost(req, user);
  return json({ error: 'Method not allowed' }, 405);
};

/* ------------------------------------------------------------------ */

async function handleGet(req, user) {
  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  const department = url.searchParams.get('department');
  const status = url.searchParams.get('status');
  const openOnly = url.searchParams.get('openOnly') === 'true';
  const wantSummary = url.searchParams.get('summary') === 'true';

  if (id) {
    const ticket = await getTicket(id);
    if (!ticket) return json({ error: `No ticket ${id}.` }, 404);
    return json({ ticket });
  }

  if (department && !DEPARTMENTS[department]) {
    return badRequest('Unknown department.');
  }

  const tickets = await listTickets({ department, status, openOnly });

  if (wantSummary) {
    return json({
      summary: summarise(tickets),
      escalation_days: ESCALATION_DAYS,
    });
  }

  return json({
    tickets,
    summary: summarise(tickets),
    escalation_days: ESCALATION_DAYS,
  });
}

/* ------------------------------------------------------------------ */

async function handlePost(req, user) {
  let body;
  try {
    body = await req.json();
  } catch {
    return badRequest('Request body must be JSON.');
  }

  // An id present means "update an existing ticket".
  if (body.id) return handleUpdate(body, user);
  return handleCreate(body, user);
}

async function handleCreate(body, user) {
  const { client, subject, description, origin_department, priority } = body;

  if (!subject || !String(subject).trim()) {
    return badRequest('A ticket needs a subject.');
  }
  if (!origin_department || !DEPARTMENTS[origin_department]) {
    return badRequest('A ticket needs a valid originating department.');
  }

  const allowed = writableDepartments(user);
  if (!allowed.includes(origin_department)) {
    return forbidden();
  }
  if (priority && !TICKET_PRIORITY.includes(priority)) {
    return badRequest(`Priority must be one of: ${TICKET_PRIORITY.join(', ')}.`);
  }

  const ticket = await createTicket({
    client, subject, description, origin_department, priority, user,
  });
  return json({ ticket, ok: true }, 201);
}

async function handleUpdate(body, user) {
  const { id, changes = {}, note } = body;

  const existing = await getTicket(id);
  if (!existing) return json({ error: `No ticket ${id}.` }, 404);
  if (!canWriteTicket(user, existing)) return forbidden();

  if (!note && !Object.keys(changes).length) {
    return badRequest('Nothing to update — supply changes, a note, or both.');
  }

  // Only management may de-escalate. Anyone on the ticket may escalate.
  if (
    changes.escalation_level
    && existing.escalation_level === 'management'
    && changes.escalation_level !== 'management'
    && !isManagement(user)
  ) {
    return forbidden();
  }

  try {
    const ticket = await updateTicket({ id, changes, note, user });
    return json({ ticket, ok: true });
  } catch (err) {
    return badRequest(err.message);
  }
}

export const config = {
  path: '/api/tickets',
};
