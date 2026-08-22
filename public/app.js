/* Move Mountains Co. — reporting app frontend.
 *
 * Flow: Netlify Identity signs the user in -> /api/session tells us what they
 * may see -> we render only those departments. Nothing is hidden with CSS
 * alone; the server refuses data the user isn't entitled to, so the UI is a
 * convenience, not the security boundary.
 */

const identity = window.netlifyIdentity;

const state = {
  session: null,
  compliance: null,
  route: { name: 'home' },
};

/* ------------------------------------------------------------------ */
/* Period helpers (mirrors netlify/lib/periods.mjs)                     */
/* ------------------------------------------------------------------ */

const MS_PER_DAY = 86400000;

function isoWeekParts(date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const isoYear = d.getUTCFullYear();
  const yearStart = new Date(Date.UTC(isoYear, 0, 1));
  return { year: isoYear, week: Math.ceil(((d - yearStart) / MS_PER_DAY + 1) / 7) };
}

function weekKey(date) {
  const p = isoWeekParts(date);
  return `${p.year}-W${String(p.week).padStart(2, '0')}`;
}

function monthKey(date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function weekKeyToStart(key) {
  const m = /^(\d{4})-W(\d{2})$/.exec(key);
  if (!m) return null;
  const jan4 = new Date(Date.UTC(Number(m[1]), 0, 4));
  const jan4Day = jan4.getUTCDay() || 7;
  const week1Monday = new Date(jan4.getTime() - (jan4Day - 1) * MS_PER_DAY);
  return new Date(week1Monday.getTime() + (Number(m[2]) - 1) * 7 * MS_PER_DAY);
}

function periodLabel(key) {
  if (!key) return '';
  if (key.includes('W')) {
    const start = weekKeyToStart(key);
    if (!start) return key;
    const end = new Date(start.getTime() + 6 * MS_PER_DAY);
    const fmt = (d, withYear) => d.toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', ...(withYear ? { year: 'numeric' } : {}), timeZone: 'UTC',
    });
    return `${fmt(start, false)} – ${fmt(end, true)}`;
  }
  const [y, m] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-US', {
    month: 'long', year: 'numeric', timeZone: 'UTC',
  });
}

function shiftPeriod(cadence, key, n) {
  if (cadence === 'monthly') {
    const [y, m] = key.split('-').map(Number);
    return monthKey(new Date(Date.UTC(y, m - 1 + n, 1)));
  }
  const start = weekKeyToStart(key);
  if (!start) return null;
  return weekKey(new Date(start.getTime() + n * 7 * MS_PER_DAY));
}

function currentDuePeriod(cadence) {
  const now = new Date();
  return cadence === 'monthly'
    ? shiftPeriod('monthly', monthKey(now), -1)
    : shiftPeriod('weekly', weekKey(now), -1);
}

function recentPeriods(cadence, count) {
  const out = [];
  let key = currentDuePeriod(cadence);
  for (let i = 0; i < count; i += 1) {
    out.push(key);
    key = shiftPeriod(cadence, key, -1);
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Formatting                                                          */
/* ------------------------------------------------------------------ */

function fmtValue(value, type) {
  if (value === null || value === undefined || value === '') return '—';
  switch (type) {
    case 'currency': {
      const n = Number(value);
      if (!Number.isFinite(n)) return String(value);
      return n.toLocaleString('en-US', {
        style: 'currency', currency: 'USD', maximumFractionDigits: n % 1 === 0 ? 0 : 2,
      });
    }
    case 'percent': {
      const n = Number(value);
      return Number.isFinite(n) ? `${n.toFixed(1)}%` : String(value);
    }
    case 'number': {
      const n = Number(value);
      return Number.isFinite(n) ? n.toLocaleString('en-US') : String(value);
    }
    case 'date': {
      const d = new Date(value);
      return Number.isNaN(d.getTime())
        ? String(value)
        : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
    }
    default:
      return String(value);
  }
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function relTime(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / MS_PER_DAY);
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? 'a month ago' : `${months} months ago`;
}

/* ------------------------------------------------------------------ */
/* API                                                                 */
/* ------------------------------------------------------------------ */

async function api(path, options = {}) {
  // Refresh the JWT if it's close to expiry so a long-open tab doesn't
  // start silently failing with 401s mid-session.
  const user = identity.currentUser();
  if (!user) throw new Error('Not signed in');
  const token = await user.jwt();

  const res = await fetch(path, {
    ...options,
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });

  let body = null;
  try { body = await res.json(); } catch { /* non-JSON error page */ }

  if (!res.ok) {
    throw new Error(body?.error || `Request failed (${res.status})`);
  }
  return body;
}

/* ------------------------------------------------------------------ */
/* Toast                                                               */
/* ------------------------------------------------------------------ */

let toastTimer;
function toast(message, kind = '') {
  const el = document.getElementById('toast');
  el.textContent = message;
  el.className = `toast ${kind}`;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 4000);
}

/* ------------------------------------------------------------------ */
/* Rendering — shell                                                   */
/* ------------------------------------------------------------------ */

function renderNav() {
  const { session } = state;
  const nav = document.getElementById('nav');
  const parts = [];

  if (session.isManagement) {
    parts.push('<div class="nav-label">Overview</div>');
    parts.push(navItem('home', 'All departments', '#6366f1'));
  }

  parts.push('<div class="nav-label">Reports</div>');
  for (const key of session.readable) {
    const dept = session.schema[key];
    const flag = state.compliance?.departments.find((d) => d.department === key);
    const late = flag && !flag.currentOnTime;
    parts.push(navItem(`dept:${key}`, dept.label, dept.accent, late ? 'due' : ''));
  }

  nav.innerHTML = parts.join('');

  nav.querySelectorAll('.nav-item').forEach((btn) => {
    btn.addEventListener('click', () => go(btn.dataset.route));
  });
}

function navItem(route, label, color, flag = '') {
  const active = routeKey(state.route) === route ? ' active' : '';
  return `
    <button class="nav-item${active}" data-route="${esc(route)}">
      <span class="nav-dot" style="background:${esc(color)}"></span>
      <span>${esc(label)}</span>
      ${flag ? `<span class="nav-flag">${esc(flag)}</span>` : ''}
    </button>`;
}

function routeKey(route) {
  if (route.name === 'home') return 'home';
  if (route.name === 'dept') return `dept:${route.department}`;
  if (route.name === 'submit') return `dept:${route.department}`;
  return route.name;
}

function go(route) {
  if (typeof route === 'string') {
    if (route === 'home') state.route = { name: 'home' };
    else if (route.startsWith('dept:')) state.route = { name: 'dept', department: route.slice(5) };
  } else {
    state.route = route;
  }
  renderNav();
  renderView();
  window.scrollTo(0, 0);
}

/* ------------------------------------------------------------------ */
/* Rendering — views                                                   */
/* ------------------------------------------------------------------ */

function setView(html) {
  document.getElementById('view').innerHTML = html;
}

function loading(msg = 'Loading…') {
  setView(`<div class="loading">${esc(msg)}</div>`);
}

async function renderView() {
  const { route } = state;
  if (route.name === 'home') return renderHome();
  if (route.name === 'dept') return renderDepartment(route.department);
  if (route.name === 'submit') return renderForm(route.department, route.period);
  return renderHome();
}

/* ---------- Home / management overview ---------- */

async function renderHome() {
  loading();
  const data = await api('/api/compliance?weeks=12');
  state.compliance = data;
  renderNav();

  const { summary, departments } = data;
  const late = departments.filter((d) => !d.currentOnTime);

  const cards = departments.map((d) => {
    const headline = d.latest?.headline;
    return `
      <div class="dept-card" data-dept="${esc(d.department)}" style="border-left-color:${esc(d.accent)}">
        <div class="dept-card-top">
          <span class="dept-card-name">${esc(d.label)}</span>
          <span class="badge ${d.currentOnTime ? 'good' : 'bad'}">
            ${d.currentOnTime ? 'On time' : 'Missing'}
          </span>
        </div>
        <div class="dept-card-headline">
          ${headline ? esc(fmtValue(headline.value, headline.type)) : '—'}
        </div>
        <div class="dept-card-meta">
          ${headline ? `${esc(headline.label)} · ` : ''}${d.latest ? esc(d.latest.label) : 'No reports yet'}
          ${d.latest?.submittedBy ? `<br>Filed by ${esc(d.latest.submittedBy)}` : ''}
          ${d.missingCount ? `<br><strong style="color:#fca5a5">${d.missingCount} missing</strong> in last ${d.periods.length}` : ''}
        </div>
      </div>`;
  }).join('');

  setView(`
    <div class="header">
      <div class="header-row">
        <div>
          <h1>All departments</h1>
          <p>Reporting status across Move Mountains Co.</p>
        </div>
        <span class="badge ${summary.late ? 'bad' : 'good'}">
          ${summary.late ? `${summary.late} of ${summary.total} outstanding` : 'Everyone reported'}
        </span>
      </div>
    </div>

    ${late.length ? `
      <div class="notice">
        <strong>Waiting on:</strong>
        ${late.map((d) => `${esc(d.label)} (${esc(d.dueLabel)})`).join(' · ')}
      </div>` : ''}

    <div class="grid grid-3" style="margin-bottom:22px">${cards}</div>

    <div class="card">
      <h2 class="card-title">Submission history</h2>
      ${renderComplianceGrid(departments)}
      <div class="legend">
        <div class="legend-item">
          <span class="legend-swatch" style="background:rgba(16,185,129,.35)"></span> Submitted
        </div>
        <div class="legend-item">
          <span class="legend-swatch" style="background:rgba(239,68,68,.3)"></span> Missing
        </div>
        <div class="legend-item">Newest on the right · click any square to open that report</div>
      </div>
    </div>
  `);

  document.querySelectorAll('.dept-card').forEach((el) => {
    el.addEventListener('click', () => go(`dept:${el.dataset.dept}`));
  });
  bindCells();
}

function renderComplianceGrid(departments) {
  return departments.map((d) => {
    // Oldest first reads more naturally as a timeline.
    const cells = [...d.periods].reverse().map((p) => `
      <div class="cell ${p.submitted ? 'filled' : ''}"
           data-dept="${esc(d.department)}"
           data-period="${esc(p.period)}"
           title="${esc(d.label)} — ${esc(p.label)}: ${p.submitted ? 'submitted' : 'missing'}"></div>
    `).join('');

    return `
      <div class="compliance-row">
        <div class="compliance-name">${esc(d.label)}</div>
        <div class="compliance-cells">${cells}</div>
        <div class="compliance-count">${d.periods.length - d.missingCount}/${d.periods.length}</div>
      </div>`;
  }).join('');
}

function bindCells() {
  document.querySelectorAll('.cell').forEach((cell) => {
    cell.addEventListener('click', () => {
      const { dept, period } = cell.dataset;
      if (!state.session.writable.includes(dept)) {
        go(`dept:${dept}`);
        return;
      }
      go({ name: 'submit', department: dept, period });
    });
  });
}

/* ---------- Department view ---------- */

async function renderDepartment(key) {
  loading();
  const dept = state.session.schema[key];
  const [{ reports }, compliance] = await Promise.all([
    api(`/api/reports?department=${encodeURIComponent(key)}`),
    state.compliance ? Promise.resolve(state.compliance) : api('/api/compliance?weeks=12'),
  ]);
  state.compliance = compliance;

  const status = compliance.departments.find((d) => d.department === key);
  const canWrite = state.session.writable.includes(key);
  const latest = reports[0] || null;

  const fields = [...dept.fields, ...dept.derived];
  const summaryFields = fields.filter((f) => f.type !== 'longtext' && f.type !== 'text').slice(0, 8);

  const missing = status ? status.missing : [];

  setView(`
    <div class="header">
      <div class="header-row">
        <div>
          <h1>${esc(dept.label)}</h1>
          <p>${dept.cadence === 'monthly' ? 'Monthly' : 'Weekly'} report · ${reports.length} on record</p>
        </div>
        <div style="display:flex;gap:10px;align-items:center">
          ${status ? `<span class="badge ${status.currentOnTime ? 'good' : 'bad'}">
            ${status.currentOnTime ? 'Up to date' : `${esc(status.dueLabel)} missing`}
          </span>` : ''}
          ${canWrite ? `<button class="btn btn-primary" data-new>New report</button>` : ''}
        </div>
      </div>
    </div>

    ${missing.length && canWrite ? `
      <div class="notice">
        <strong>${missing.length} ${missing.length === 1 ? 'period is' : 'periods are'} missing.</strong>
        You can still fill ${missing.length === 1 ? 'it' : 'them'} in:
        ${missing.slice(0, 8).map((p) => `<a href="#" data-fill="${esc(p)}">${esc(periodLabel(p))}</a>`).join(' · ')}
      </div>` : ''}

    ${latest ? `
      <div class="card">
        <h2 class="card-title">
          Latest — ${esc(periodLabel(latest.period))}
          ${latest.source === 'jotform' ? '<span class="pill">imported</span>' : ''}
        </h2>
        <div class="grid grid-4">
          ${summaryFields.map((f) => `
            <div class="stat">
              <div class="stat-label">${esc(f.label)}</div>
              <div class="stat-value">${esc(fmtValue(latest.data[f.key], f.type))}</div>
            </div>`).join('')}
        </div>
      </div>` : `
      <div class="card"><div class="empty">
        <div class="empty-title">No reports yet</div>
        <div>${canWrite ? 'Use “New report” to file the first one.' : 'Nothing has been submitted for this department.'}</div>
      </div></div>`}

    ${reports.length ? `
      <div class="card">
        <h2 class="card-title">History</h2>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Period</th>
                ${summaryFields.map((f) => `<th class="num">${esc(f.label)}</th>`).join('')}
                <th>Filed by</th>
                ${canWrite ? '<th></th>' : ''}
              </tr>
            </thead>
            <tbody>
              ${reports.map((r) => `
                <tr>
                  <td><strong>${esc(periodLabel(r.period))}</strong></td>
                  ${summaryFields.map((f) => `<td class="num">${esc(fmtValue(r.data[f.key], f.type))}</td>`).join('')}
                  <td>
                    ${esc(r.submittedByName || r.submittedBy || 'Imported')}
                    ${r.source === 'jotform' ? '<span class="pill">Jotform</span>' : ''}
                    ${r.submittedAt ? `<br><span style="color:var(--text-faint);font-size:11.5px">${esc(relTime(r.submittedAt))}</span>` : ''}
                  </td>
                  ${canWrite ? `<td><button class="btn btn-sm" data-edit="${esc(r.period)}">Edit</button></td>` : ''}
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>` : ''}
  `);

  const newBtn = document.querySelector('[data-new]');
  if (newBtn) {
    newBtn.addEventListener('click', () => go({
      name: 'submit', department: key, period: status?.due || currentDuePeriod(dept.cadence),
    }));
  }
  document.querySelectorAll('[data-edit]').forEach((btn) => {
    btn.addEventListener('click', () => go({ name: 'submit', department: key, period: btn.dataset.edit }));
  });
  document.querySelectorAll('[data-fill]').forEach((a) => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      go({ name: 'submit', department: key, period: a.dataset.fill });
    });
  });
}

/* ---------- Submission form ---------- */

async function renderForm(key, period) {
  loading();
  const dept = state.session.schema[key];
  const { report } = await api(
    `/api/reports?department=${encodeURIComponent(key)}&period=${encodeURIComponent(period)}`,
  );
  const existing = report?.data || {};

  // Offer the last 2 years of periods so any gap can be backfilled.
  const options = recentPeriods(dept.cadence, dept.cadence === 'monthly' ? 24 : 104);
  if (!options.includes(period)) options.unshift(period);

  const groups = [];
  for (const field of dept.fields) {
    const name = field.group || 'Details';
    let g = groups.find((x) => x.name === name);
    if (!g) { g = { name, fields: [] }; groups.push(g); }
    g.fields.push(field);
  }

  setView(`
    <div class="header">
      <div class="header-row">
        <div>
          <h1>${esc(dept.label)} report</h1>
          <p>${report ? 'Editing an existing report' : 'Filing a new report'}</p>
        </div>
        <button class="btn btn-ghost" data-back>Back</button>
      </div>
    </div>

    ${report ? `
      <div class="notice info">
        A report already exists for this period${report.submittedByName ? ` (filed by ${esc(report.submittedByName)})` : ''}.
        Saving will overwrite it.
      </div>` : ''}

    <form id="report-form">
      <div class="card" style="margin-bottom:16px">
        <div class="field">
          <label for="period-select">Reporting period</label>
          <select id="period-select" name="__period">
            ${options.map((p) => `
              <option value="${esc(p)}" ${p === period ? 'selected' : ''}>${esc(periodLabel(p))}</option>
            `).join('')}
          </select>
          <div class="field-help">
            Filing late? Pick the period this report covers, not today's date.
          </div>
        </div>
      </div>

      <div class="card">
        ${groups.map((g) => `
          <div class="form-group">
            <div class="form-group-title">${esc(g.name)}</div>
            ${g.fields.map((f) => renderField(f, existing[f.key])).join('')}
          </div>`).join('')}

        <div class="form-actions">
          <button type="submit" class="btn btn-primary">Save report</button>
          <button type="button" class="btn btn-ghost" data-back>Cancel</button>
          <span id="form-status" style="color:var(--text-faint);font-size:12.5px"></span>
        </div>
      </div>
    </form>
  `);

  document.querySelectorAll('[data-back]').forEach((b) => {
    b.addEventListener('click', () => go(`dept:${key}`));
  });

  // Changing the period reloads the form so existing data for that period
  // shows up rather than being silently overwritten by whatever is on screen.
  document.getElementById('period-select').addEventListener('change', (e) => {
    go({ name: 'submit', department: key, period: e.target.value });
  });

  document.getElementById('report-form').addEventListener('submit', (e) => {
    e.preventDefault();
    submitForm(key);
  });
}

function renderField(field, value) {
  const id = `f_${field.key}`;
  const val = value === null || value === undefined ? '' : value;
  const req = field.required ? '<span class="req">*</span>' : '';
  const help = field.help ? `<div class="field-help">${esc(field.help)}</div>` : '';

  let input;
  if (field.type === 'longtext') {
    input = `<textarea id="${id}" name="${esc(field.key)}">${esc(val)}</textarea>`;
  } else if (field.type === 'date') {
    input = `<input id="${id}" name="${esc(field.key)}" type="date" value="${esc(String(val).slice(0, 10))}">`;
  } else if (field.type === 'currency') {
    input = `<div class="field-prefix"><input id="${id}" name="${esc(field.key)}" type="number" step="0.01" inputmode="decimal" value="${esc(val)}"></div>`;
  } else if (field.type === 'percent') {
    input = `<div class="field-suffix"><input id="${id}" name="${esc(field.key)}" type="number" step="0.1" min="0" max="100" inputmode="decimal" value="${esc(val)}"></div>`;
  } else if (field.type === 'number') {
    input = `<input id="${id}" name="${esc(field.key)}" type="number" step="any" inputmode="decimal" value="${esc(val)}">`;
  } else {
    input = `<input id="${id}" name="${esc(field.key)}" type="text" value="${esc(val)}">`;
  }

  return `
    <div class="field">
      <label for="${id}">${esc(field.label)}${req}</label>
      ${input}
      ${help}
    </div>`;
}

async function submitForm(key) {
  const form = document.getElementById('report-form');
  const status = document.getElementById('form-status');
  const btn = form.querySelector('button[type="submit"]');
  const dept = state.session.schema[key];

  const fd = new FormData(form);
  const period = fd.get('__period');
  const data = {};
  for (const field of dept.fields) {
    const raw = fd.get(field.key);
    if (raw === null) continue;
    const trimmed = String(raw).trim();
    if (trimmed === '') {
      data[field.key] = '';
    } else if (['currency', 'number', 'percent'].includes(field.type)) {
      const n = Number(trimmed);
      data[field.key] = Number.isFinite(n) ? n : trimmed;
    } else {
      data[field.key] = trimmed;
    }
  }

  btn.disabled = true;
  status.textContent = 'Saving…';

  try {
    await api('/api/reports', {
      method: 'POST',
      body: JSON.stringify({ department: key, period, data }),
    });
    // Compliance is now stale — drop it so the next screen refetches.
    state.compliance = null;
    toast(`${dept.label} report saved for ${periodLabel(period)}`, 'good');
    go(`dept:${key}`);
  } catch (err) {
    status.textContent = '';
    toast(err.message, 'bad');
    btn.disabled = false;
  }
}

/* ------------------------------------------------------------------ */
/* Boot                                                                */
/* ------------------------------------------------------------------ */

function show(id) {
  ['gate', 'noaccess', 'app'].forEach((k) => {
    document.getElementById(k).hidden = k !== id;
  });
}

async function boot() {
  const user = identity.currentUser();
  if (!user) {
    show('gate');
    return;
  }

  try {
    state.session = await api('/api/session');
  } catch (err) {
    // A stale or revoked token lands here — send them back to sign-in
    // rather than leaving a dead screen.
    console.error(err);
    show('gate');
    toast('Your session expired. Please sign in again.', 'bad');
    return;
  }

  if (state.session.hasNoAccess) {
    show('noaccess');
    return;
  }

  show('app');
  document.getElementById('who-name').textContent = state.session.user.name;
  document.getElementById('who-role').textContent = state.session.user.roles.join(', ') || 'no role';

  state.route = state.session.isManagement
    ? { name: 'home' }
    : { name: 'dept', department: state.session.readable[0] };

  renderNav();
  try {
    await renderView();
  } catch (err) {
    setView(`<div class="empty"><div class="empty-title">Something went wrong</div><div>${esc(err.message)}</div></div>`);
  }
}

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action="logout"]');
  if (el) identity.logout();
});

document.getElementById('login-btn').addEventListener('click', () => identity.open('login'));

identity.on('init', () => { boot(); });
identity.on('login', () => { identity.close(); boot(); });
identity.on('logout', () => { state.session = null; state.compliance = null; show('gate'); });
identity.on('error', (err) => toast(err?.message || 'Sign-in failed', 'bad'));

identity.init({ locale: 'en' });
