const main = document.getElementById("main");
const account = document.getElementById("account");

const state = {
  config: null,
  user: null,
  reports: [],
  options: emptyOptions(),
  filters: filtersFromLocation(),
  openMenu: null,
  report: null,
  batch: null,
  error: "",
  loading: true,
};

function emptyOptions() {
  return { types: [], periods: [], departments: [], people: [], batches: [] };
}

function filtersFromLocation() {
  const params = new URLSearchParams(location.search);
  return {
    type: params.get("type") || "",
    period: params.get("period") || "",
    department: params.get("department") || "",
    person: params.get("person") || "",
    batch: params.get("batch") || "",
  };
}

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[ch]));
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    credentials: "same-origin",
    headers: { "content-type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!response.ok) {
    const error = new Error(data?.error || "Something went wrong.");
    error.status = response.status;
    throw error;
  }
  return data;
}

function route() {
  const path = location.pathname.replace(/\/+$/, "") || "/";
  const report = path.match(/^\/report\/([^/]+)$/);
  if (report) return { name: "report", id: decodeURIComponent(report[1]) };
  const batch = path.match(/^\/batch\/([^/]+)$/);
  if (batch) return { name: "batch", id: decodeURIComponent(batch[1]) };
  return { name: "home" };
}

function writeFilters() {
  const params = new URLSearchParams();
  for (const key of ["type", "period", "department", "person", "batch"]) {
    if (state.filters[key]) params.set(key, state.filters[key]);
  }
  const search = params.toString();
  history.replaceState(null, "", search ? `/?${search}` : "/");
}

async function boot() {
  try {
    state.config = await api("/api/config");
    const session = await api("/api/session");
    state.user = session.user;
    if (state.user) await loadLibrary();
  } catch (error) {
    state.error = error.message;
  } finally {
    state.loading = false;
    await show();
  }
}

async function loadLibrary() {
  const data = await api("/api/reports");
  state.reports = data.reports || [];
  state.options = data.options || emptyOptions();
}

async function show() {
  const where = route();
  state.error = state.error || "";
  renderAccount();
  if (!state.user) {
    renderSignIn();
    return;
  }
  if (state.loading) {
    main.innerHTML = `<p class="eyebrow">Library</p><p>Loading reports…</p>`;
    return;
  }
  try {
    if (where.name === "report") {
      const data = await api(`/api/reports/${encodeURIComponent(where.id)}`);
      state.report = data.report;
      renderReport();
      return;
    }
    if (where.name === "batch") {
      const data = await api(`/api/batches/${encodeURIComponent(where.id)}`);
      state.batch = data.batch;
      renderBatch();
      return;
    }
    state.filters = filtersFromLocation();
    renderHome();
  } catch (error) {
    if (error.status === 401) {
      state.user = null;
      renderSignIn();
      return;
    }
    main.innerHTML = `<p class="banner">${esc(error.message)}</p><p><a href="/">Back to reports</a></p>`;
  }
}

function renderAccount() {
  if (!state.user) {
    account.innerHTML = "";
    return;
  }
  const role = state.user.role === "admin" ? "Admin" : "Signed in";
  account.innerHTML = `<span class="who">${esc(state.user.name || state.user.email)} · ${esc(role)}</span><button type="button" class="text-btn" id="sign-out">Sign out</button>`;
}

function scopeLine(user) {
  if (user.role === "admin") return "You see every report.";
  const names = (user.sees || []).map((dept) => dept.name);
  if (!names.length) return "You see reports addressed to you.";
  return `You see ${joinNames(names)}, and reports addressed to you.`;
}

function joinNames(items) {
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

function renderSignIn() {
  const dev = state.config?.devLogin;
  const accounts = state.config?.devAccounts || [];
  main.innerHTML = `
    <section class="signin">
      ${state.error ? `<p class="banner">${esc(state.error)}</p>` : ""}
      <p class="eyebrow">Internal</p>
      <h1 class="page-title">Reports</h1>
      <p class="page-sub">Every autopsy, delivery note, and alert in one place. A bot files the batch. One email links here.</p>
      <div id="google-slot" style="margin-top:22px"></div>
      ${state.config && !state.config.googleClientId ? `<p class="note">Google sign-in needs GOOGLE_CLIENT_ID on this site.</p>` : ""}
      ${dev ? `
        <div class="dev-panel">
          <p class="eyebrow">Local sign-in</p>
          <p class="note">This form exists only on your machine. It is off on Netlify.</p>
          <div class="dev-people">
            ${accounts.map((person) => `<button type="button" data-dev="${esc(person.email)}" data-name="${esc(person.name)}">${esc(person.label)}</button>`).join("")}
          </div>
          <form class="dev-form" id="dev-form">
            <input type="email" name="email" required placeholder="name@movemountains.co" autocomplete="username">
            <button class="solid-btn" type="submit">Continue</button>
          </form>
        </div>` : ""}
    </section>`;
  mountGoogle();
}

function mountGoogle() {
  const host = document.getElementById("google-slot");
  const clientId = state.config?.googleClientId;
  if (!host || !clientId || !window.google?.accounts?.id) return;
  window.google.accounts.id.initialize({
    client_id: clientId,
    callback: onGoogle,
  });
  window.google.accounts.id.renderButton(host, {
    theme: "outline",
    size: "large",
    shape: "rectangular",
    text: "signin_with",
    width: 280,
  });
}

async function onGoogle(response) {
  try {
    const data = await api("/api/session", {
      method: "POST",
      body: JSON.stringify({ credential: response.credential }),
    });
    state.user = data.user;
    state.error = "";
    await loadLibrary();
    if (location.pathname !== "/") history.pushState(null, "", "/");
    await show();
  } catch (error) {
    state.error = error.message;
    renderSignIn();
  }
}

async function signInDev(email, name) {
  try {
    const data = await api("/api/session/dev", {
      method: "POST",
      body: JSON.stringify({ email, name }),
    });
    state.user = data.user;
    state.error = "";
    state.loading = true;
    renderAccount();
    main.innerHTML = `<p class="eyebrow">Library</p><p>Loading reports…</p>`;
    await loadLibrary();
    state.loading = false;
    if (location.pathname !== "/") history.pushState(null, "", "/");
    await show();
  } catch (error) {
    state.error = error.message;
    renderSignIn();
  }
}

function filteredReports() {
  return state.reports.filter((report) => {
    if (state.filters.type && report.type !== state.filters.type) return false;
    if (state.filters.period && report.period !== state.filters.period) return false;
    if (state.filters.department && report.department !== state.filters.department) return false;
    if (state.filters.person && report.person_id !== state.filters.person) return false;
    if (state.filters.batch && report.batch_id !== state.filters.batch) return false;
    return true;
  });
}

function menu({ id, label, value, options, grouped = false }) {
  const current = options.find((option) => option.id === value);
  const open = state.openMenu === id;
  let lastGroup = "";
  const items = [`<li><button type="button" role="option" data-pick="" class="${value === "" ? "is-selected" : ""}" aria-selected="${value === ""}"><span class="menu-opt">All</span></button></li>`];
  for (const option of options) {
    if (grouped && option.group && option.group !== lastGroup) {
      items.push(`<li class="menu-group" role="presentation">${esc(option.group)}</li>`);
      lastGroup = option.group;
    }
    const selected = option.id === value;
    items.push(`<li><button type="button" role="option" data-pick="${esc(option.id)}" class="${selected ? "is-selected" : ""}" aria-selected="${selected}"><span class="menu-opt">${esc(option.label)}</span>${option.cadence ? `<span class="menu-cadence">${esc(option.cadence)}</span>` : ""}</button></li>`);
  }
  return `
    <div class="menu${open ? " is-open" : ""}" data-menu="${id}">
      <button type="button" class="menu-trigger" aria-haspopup="listbox" aria-expanded="${open}">
        <span class="menu-kicker">${esc(label)}</span>
        <span class="menu-value">${esc(current ? current.label : "All")}</span>
        <span class="menu-caret" aria-hidden="true"></span>
      </button>
      <ul class="menu-list" role="listbox" ${open ? "" : "hidden"}>${items.join("")}</ul>
    </div>`;
}

function reportCard(report) {
  const bits = [report.department_name, report.person_name, report.updated_label ? `Updated ${report.updated_label}` : ""]
    .filter(Boolean)
    .join(" · ");
  return `
    <article class="report-card">
      <a class="report-card-link" href="/report/${encodeURIComponent(report.id)}" style="display:block;text-decoration:none;color:inherit">
        <div class="card-top">
          <div class="card-kicker">${esc(report.type_label)}</div>
          <div class="card-kicker">${esc(report.period_label)}</div>
        </div>
        <h2 class="card-title">${esc(report.title)}</h2>
        <p class="card-meta">${esc(bits)}</p>
      </a>
      <div class="card-links"><a href="/batch/${encodeURIComponent(report.batch_id)}">Batch ${esc(report.batch_id)}</a></div>
    </article>`;
}

function renderHome() {
  const reports = filteredReports();
  const active = Object.values(state.filters).some(Boolean);
  const count = reports.length === 1 ? "1 report" : `${reports.length} reports`;
  main.innerHTML = `
    <p class="eyebrow">Library</p>
    <h1 class="page-title">Reports</h1>
    <p class="page-sub">${esc(scopeLine(state.user))}</p>
    <div class="filters">
      ${menu({ id: "type", label: "Type", value: state.filters.type, options: state.options.types, grouped: true })}
      ${menu({ id: "period", label: "Period", value: state.filters.period, options: state.options.periods })}
      ${menu({ id: "department", label: "Department", value: state.filters.department, options: state.options.departments })}
      ${menu({ id: "person", label: "Person", value: state.filters.person, options: state.options.people })}
      ${menu({ id: "batch", label: "Batch", value: state.filters.batch, options: state.options.batches })}
    </div>
    <div class="list-bar">
      <p class="meta">${state.reports.length ? count : "No reports yet"}</p>
      ${active ? `<button type="button" class="text-btn" id="clear-filters">Clear filters</button>` : ""}
    </div>
    ${reports.length ? `<div class="list">${reports.map(reportCard).join("")}</div>` : `<div class="empty"><p class="eyebrow">Nothing here</p><p>${state.reports.length ? "No reports match these filters." : "When a bot finishes a run, the batch shows up here."}</p></div>`}
    <p class="foot">Move Mountains Co. · Internal</p>`;
}

function renderReport() {
  const report = state.report;
  document.title = `${report.title} · Reports`;
  main.innerHTML = `
    <div class="viewer-head">
      <p class="eyebrow">${esc(report.type_label)} · ${esc(report.period_label)}</p>
      <h1 class="page-title">${esc(report.title)}</h1>
      <p class="page-sub meta">${esc([report.department_name, report.person_name, report.updated_label ? `Updated ${report.updated_label}` : ""].filter(Boolean).join(" · "))}</p>
      <div class="viewer-toolbar no-print">
        <a class="text-btn" href="/">All reports</a>
        <a class="text-btn" href="/batch/${encodeURIComponent(report.batch_id)}">Batch ${esc(report.batch_id)}</a>
        <button type="button" class="solid-btn" id="print-view">Print view</button>
      </div>
    </div>
    <div class="sheet"><iframe id="report-frame" title="${esc(report.title)}" sandbox="allow-popups allow-popups-to-escape-sandbox"></iframe></div>`;
  const frame = document.getElementById("report-frame");
  frame.srcdoc = report.html || "";
}

function renderBatch() {
  const batch = state.batch;
  document.title = `${batch.id} · Reports`;
  const status = batch.completed_label
    ? `Completed ${batch.completed_label}. The summary email is the caller’s to send.`
    : "This batch is still open. The summary email is built when the run calls complete.";
  main.innerHTML = `
    <p class="eyebrow">Batch</p>
    <h1 class="page-title">${esc(batch.id)}</h1>
    <p class="page-sub">${esc(status)}</p>
    <div class="viewer-toolbar no-print"><a class="text-btn" href="/">All reports</a></div>
    <p class="meta">${batch.reports.length === 1 ? "1 report" : `${batch.reports.length} reports`} you can open</p>
    <div class="list" style="margin-top:14px">${batch.reports.map(reportCard).join("")}</div>
    <p class="foot">Move Mountains Co. · Internal</p>`;
}

function openPrintView(html) {
  const bar = `<div class="mmc-printbar" style="position:sticky;top:0;z-index:5;background:#F1EEE9;border-bottom:1px solid #DBD4C9;padding:10px 16px;font-family:Archivo,Arial,sans-serif;font-stretch:125%;font-weight:500;letter-spacing:.14em;text-transform:uppercase;font-size:11px;display:flex;justify-content:space-between;gap:12px;align-items:center;">
    <span>Print view</span>
    <button type="button" id="mmc-print" style="appearance:none;border:0;background:#000;color:#fff;font:inherit;letter-spacing:.14em;text-transform:uppercase;font-size:11px;padding:10px 14px;cursor:pointer;">Print</button>
  </div>
  <style>@media print { .mmc-printbar { display: none !important; } }</style>
  <script src="/print-bar.js"></script>`;
  const source = String(html || "");
  let doc = source;
  if (/<body[^>]*>/i.test(source)) {
    doc = source.replace(/<body([^>]*)>/i, `<body$1>${bar}`);
  } else {
    doc = `${bar}${source}`;
  }
  // window.open(..., "noopener") returns null, so the new tab stays about:blank.
  // Write first, then drop the opener so the report cannot reach this session.
  const popup = window.open("", "_blank");
  if (!popup) return;
  popup.document.open();
  popup.document.write(doc);
  popup.document.close();
  try {
    popup.opener = null;
  } catch {
    /* already severed */
  }
}

document.addEventListener("click", async (event) => {
  if (event.target.closest("#sign-out")) {
    await api("/api/session", { method: "DELETE" });
    state.user = null;
    state.reports = [];
    state.openMenu = null;
    history.pushState(null, "", "/");
    renderAccount();
    renderSignIn();
    return;
  }

  const dev = event.target.closest("[data-dev]");
  if (dev) {
    await signInDev(dev.dataset.dev, dev.dataset.name);
    return;
  }

  if (event.target.closest("#clear-filters")) {
    state.filters = { type: "", period: "", department: "", person: "", batch: "" };
    state.openMenu = null;
    writeFilters();
    renderHome();
    return;
  }

  if (event.target.closest("#print-view")) {
    openPrintView(state.report?.html || "");
    return;
  }

  const trigger = event.target.closest(".menu-trigger");
  if (trigger) {
    const id = trigger.closest(".menu").dataset.menu;
    state.openMenu = state.openMenu === id ? null : id;
    renderHome();
    return;
  }

  const option = event.target.closest("[data-pick]");
  if (option && option.closest(".menu")) {
    const id = option.closest(".menu").dataset.menu;
    state.filters[id] = option.dataset.pick || "";
    state.openMenu = null;
    writeFilters();
    renderHome();
    return;
  }

  const link = event.target.closest("a[href]");
  if (link) {
    const url = new URL(link.href, location.origin);
    if (url.origin !== location.origin) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.target === "_blank") return;
    event.preventDefault();
    state.openMenu = null;
    history.pushState(null, "", url.pathname + url.search);
    document.title = "Reports · Move Mountains Co.";
    await show();
    window.scrollTo(0, 0);
    return;
  }

  if (state.openMenu && !event.target.closest(".menu")) {
    state.openMenu = null;
    renderHome();
  }
});

document.addEventListener("submit", async (event) => {
  const form = event.target.closest("#dev-form");
  if (!form) return;
  event.preventDefault();
  const email = new FormData(form).get("email");
  await signInDev(String(email || ""), "");
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && state.openMenu) {
    state.openMenu = null;
    renderHome();
  }
});

window.addEventListener("popstate", () => {
  state.openMenu = null;
  document.title = "Reports · Move Mountains Co.";
  show();
});

window.addEventListener("load", () => mountGoogle());

boot();
