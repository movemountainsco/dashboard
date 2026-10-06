/* Move Mountains — design study.
   The hero number is the open book: work contracted and not yet delivered.
   It is sample data. Nothing here writes to department reporting. */

const BOOK = 1842600.48;
const TODAY_ADD = 18400;
const WEEK_CANCEL = 66080;
const TODAY_ISO = '2026-10-01';
const TZ = 'America/New_York';

const RANGE_WHEN = {
  '1D': 'Today',
  '1W': 'Past week',
  '1M': 'Past month',
  '3M': 'Past 3 months',
  YTD: 'Year to date',
  ALL: 'All time',
};

const TONES = [
  ['#243328', '#d5eadc'],
  ['#33281f', '#f3dccb'],
  ['#242c3d', '#d9e2f7'],
  ['#352430', '#f6d7e6'],
  ['#203236', '#d0ebed'],
  ['#332c1e', '#f3e6c8'],
  ['#2c2438', '#e3d9f7'],
  ['#1e2c28', '#d4ebe3'],
  ['#382424', '#f6d6d6'],
  ['#243028', '#d8eed2'],
  ['#2a261c', '#f0e6cc'],
  ['#1f2936', '#d6e4f8'],
  ['#342436', '#f3d8f1'],
  ['#2a241f', '#f3e2d4'],
];

const JOBS = [
  {
    id: 'moretti', couple: 'Moretti & Bianchi', mark: 'MB', tone: 0,
    date: '2026-10-03', venue: 'Greystone Hall', city: 'Los Angeles',
    package: 'Photo + Film', value: 19800, collected: 19800, margin: 0.072, guests: 140,
    bookedOn: '2026-03-12',
    payments: [
      { date: '2026-03-12', amount: 9900, label: 'Deposit' },
      { date: '2026-08-14', amount: 9900, label: 'Balance' },
    ],
    crew: [
      { name: 'Ali Sherin', role: 'Photo' },
      { name: 'Komiljon Sayfiev', role: 'Video' },
      { name: 'Hannah', role: 'Planning' },
      { name: 'Aryel Fernandes', role: 'Gear' },
    ],
    about: 'Saturday wedding at Greystone Hall. First look at 2:10, ceremony at 5:00, and a short sparkler exit.',
  },
  {
    id: 'field', couple: 'Field & Pine', mark: 'FP', tone: 1,
    date: '2026-10-08', venue: 'Studio B', city: 'Los Angeles',
    package: 'Commercial', value: 5400, collected: 2700, margin: 0.028, guests: 0,
    bookedOn: '2026-09-02',
    payments: [{ date: '2026-09-02', amount: 2700, label: 'Deposit' }],
    crew: [
      { name: 'Ali Sherin', role: 'Photo' },
      { name: 'Lauren', role: 'Marketing' },
    ],
    about: 'Half-day lookbook for a fall apparel drop. Four setups, delivery promised in ten days.',
  },
  {
    id: 'voss', couple: 'Voss & Lane', mark: 'VL', tone: 2,
    date: '2026-10-10', venue: 'Malibu Bluff', city: 'Malibu',
    package: 'Photo + Film', value: 15200, collected: 7600, margin: 0.051, guests: 90,
    bookedOn: '2026-03-18',
    payments: [{ date: '2026-03-18', amount: 7600, label: 'Deposit' }],
    crew: [
      { name: 'Ali Sherin', role: 'Photo' },
      { name: 'Komiljon Sayfiev', role: 'Video' },
      { name: 'Hannah', role: 'Planning' },
    ],
    about: 'Cliff ceremony at 4:40 if the wind allows, with portraits on the lower lawn before guests arrive.',
  },
  {
    id: 'ellis', couple: 'Ellis & Harper', mark: 'EH', tone: 3,
    date: '2026-10-17', venue: 'The Crawford', city: 'Los Angeles',
    package: 'Photo + Film', value: 18400, collected: 9200, margin: 0.064, guests: 120,
    bookedOn: '2026-05-01',
    payments: [{ date: '2026-05-06', amount: 9200, label: 'Deposit' }],
    crew: [
      { name: 'Ali Sherin', role: 'Photo' },
      { name: 'Komiljon Sayfiev', role: 'Video' },
      { name: 'Raul', role: 'Planning' },
    ],
    about: 'Film coverage was added this morning. Lawn ceremony at 5:10, and a private vow reading before guests sit.',
  },
  {
    id: 'nguyen', couple: 'Nguyen & Park', mark: 'NP', tone: 4,
    date: '2026-10-24', venue: 'Harbor House', city: 'Long Beach',
    package: 'Photo', value: 9200, collected: 3200, margin: 0.044, guests: 80,
    bookedOn: '2026-08-20',
    payments: [{ date: '2026-09-30', amount: 3200, label: 'Deposit' }],
    crew: [
      { name: 'Ali Sherin', role: 'Photo' },
      { name: 'Raul', role: 'Planning' },
    ],
    about: 'Photo-only day. Family formals are the priority, then a short reception on the dock.',
  },
  {
    id: 'brooks', couple: 'Brooks & Hale', mark: 'BH', tone: 5,
    date: '2026-10-31', venue: 'The Glasshouse', city: 'Brooklyn',
    package: 'Film', value: 10400, collected: 5200, margin: 0.011, guests: 110,
    bookedOn: '2026-06-01',
    payments: [{ date: '2026-06-20', amount: 5200, label: 'Deposit' }],
    crew: [
      { name: 'Komiljon Sayfiev', role: 'Video' },
      { name: 'Hannah', role: 'Planning' },
      { name: 'Aryel Fernandes', role: 'Gear' },
    ],
    about: 'Film-only Halloween wedding. They want speeches covered clean and the rest left loose.',
  },
  {
    id: 'solis', couple: 'Solis & Hart', mark: 'SH', tone: 6,
    date: '2026-11-07', venue: 'Malibu Bluff', city: 'Malibu',
    package: 'Film', value: 11600, collected: 0, margin: -0.018, guests: 70,
    bookedOn: '2026-08-01',
    payments: [],
    crew: [
      { name: 'Komiljon Sayfiev', role: 'Video' },
      { name: 'Raul', role: 'Planning' },
    ],
    about: 'The deposit was due in August and has not landed. Travel out to Malibu is why the margin sits under target.',
  },
  {
    id: 'okonkwo', couple: 'Okonkwo & Adeyemi', mark: 'OA', tone: 7,
    date: '2026-11-14', venue: 'Brooklyn Glasshouse', city: 'Brooklyn',
    package: 'Photo + Film', value: 16800, collected: 8400, margin: 0.022, guests: 160,
    bookedOn: '2026-01-20',
    payments: [
      { date: '2026-02-11', amount: 4200, label: 'Deposit' },
      { date: '2026-06-02', amount: 4200, label: 'Retainer' },
    ],
    crew: [
      { name: 'Ali Sherin', role: 'Photo' },
      { name: 'Komiljon Sayfiev', role: 'Video' },
      { name: 'Hannah', role: 'Planning' },
    ],
    about: 'Full day for 160 guests. Two changing looks, and a reception that runs long on purpose.',
  },
  {
    id: 'berg', couple: 'Berg & Cho', mark: 'BC', tone: 8,
    date: '2026-11-21', venue: 'Hudson House', city: 'Jersey City',
    package: 'Photo', value: 7400, collected: 3700, margin: 0.019, guests: 60,
    bookedOn: '2026-06-15',
    payments: [{ date: '2026-07-08', amount: 3700, label: 'Deposit' }],
    crew: [
      { name: 'Ali Sherin', role: 'Photo' },
      { name: 'Aryel Fernandes', role: 'Gear' },
      { name: 'Hannah', role: 'Planning' },
    ],
    about: 'Small room, early sunset. Portraits need to happen before the ceremony, not after.',
  },
  {
    id: 'reed', couple: 'Reed & Alvarez', mark: 'RA', tone: 9,
    date: '2026-11-28', venue: 'Palm Canyon Estate', city: 'Palm Springs',
    package: 'Film', value: 12100, collected: 4000, margin: 0.008, guests: 100,
    bookedOn: '2026-09-01',
    payments: [{ date: '2026-09-12', amount: 4000, label: 'Deposit' }],
    crew: [
      { name: 'Hannah', role: 'Planning' },
      { name: 'Aryel Fernandes', role: 'Gear' },
    ],
    about: 'Film-only weekend in Palm Springs. Gear is held. The video lead is still open.',
  },
  {
    id: 'iyer', couple: 'Iyer & Raman', mark: 'IR', tone: 10,
    date: '2026-12-05', venue: 'The Plaza Conservatory', city: 'New York',
    package: 'Photo + Film', value: 14250, collected: 5000, margin: 0.036, guests: 150,
    bookedOn: '2026-07-22',
    payments: [{ date: '2026-09-20', amount: 5000, label: 'Deposit' }],
    crew: [
      { name: 'Ali Sherin', role: 'Photo' },
      { name: 'Komiljon Sayfiev', role: 'Video' },
      { name: 'Raul', role: 'Planning' },
    ],
    about: 'Conservatory ceremony with a long baraat beforehand. Both teams need to be on the street by 1:30.',
  },
  {
    id: 'kapoor', couple: 'Kapoor & Shah', mark: 'KS', tone: 11,
    date: '2026-12-12', venue: 'The Plaza Conservatory', city: 'New York',
    package: 'Photo + Film', value: 24500, collected: 8000, margin: 0.031, guests: 180,
    bookedOn: '2026-01-08',
    payments: [{ date: '2026-01-15', amount: 8000, label: 'Deposit' }],
    crew: [
      { name: 'Ali Sherin', role: 'Photo' },
      { name: 'Komiljon Sayfiev', role: 'Video' },
      { name: 'Hannah', role: 'Planning' },
      { name: 'Aryel Fernandes', role: 'Gear' },
    ],
    about: 'Largest contract in this sample. Terrace reception, and a first look they want finished before anyone else is in the building.',
  },
  {
    id: 'walsh', couple: 'Walsh & Byrne', mark: 'WB', tone: 12,
    date: '2026-12-19', venue: 'Newport Lawn', city: 'Newport',
    package: 'Photo', value: 8900, collected: 8900, margin: -0.006, guests: 85,
    bookedOn: '2026-04-10',
    payments: [
      { date: '2026-04-28', amount: 4450, label: 'Deposit' },
      { date: '2026-09-01', amount: 4450, label: 'Balance' },
    ],
    crew: [
      { name: 'Ali Sherin', role: 'Photo' },
      { name: 'Raul', role: 'Planning' },
    ],
    about: 'Paid in full. A small courtesy discount is why this one sits just under the target margin.',
  },
  {
    id: 'duarte', couple: 'Duarte & Mendes', mark: 'DM', tone: 13,
    date: '2027-01-16', venue: 'The Crawford', city: 'Los Angeles',
    package: 'Photo', value: 6800, collected: 2000, margin: -0.034, guests: 50,
    bookedOn: '2026-10-01',
    payments: [{ date: '2026-10-01', amount: 2000, label: 'Deposit' }],
    crew: [
      { name: 'Ali Sherin', role: 'Photo' },
      { name: 'Hannah', role: 'Planning' },
    ],
    about: 'Off-season date signed today. The rate is under the usual package, which is the whole of the red margin.',
  },
];

const INITIAL_FEED = [
  { group: 'Today', title: 'Ellis & Harper', sub: 'Film coverage added', amount: 8600, book: true, job: 'ellis' },
  { group: 'Today', title: 'Duarte & Mendes', sub: 'Contract signed', amount: 6800, book: true, job: 'duarte' },
  { group: 'Today', title: 'Field & Pine', sub: 'Commercial add-on', amount: 3000, book: true, job: 'field' },
  { group: 'Today', title: 'Duarte & Mendes', sub: 'Deposit collected', amount: 2000, book: false, job: 'duarte' },
  { group: 'Yesterday', title: 'Nguyen & Park', sub: 'Deposit collected', amount: 3200, book: false, job: 'nguyen' },
  { group: 'Yesterday', title: 'Stein & Cole', sub: 'Gallery delivered · Photo', amount: null, book: false },
  { group: 'Tuesday', title: 'Instagram', sub: 'Ad spend', amount: -640, book: false },
  { group: 'Monday', title: 'Patel & Shah', sub: 'Removed from the book', amount: -66080, book: true },
];

const ASSIGNABLE = [
  { name: 'Ali Sherin', role: 'Photo' },
  { name: 'Komiljon Sayfiev', role: 'Video' },
  { name: 'Hannah', role: 'Planning' },
  { name: 'Raul', role: 'Planning' },
  { name: 'Aryel Fernandes', role: 'Gear' },
];

const CREW = [
  { name: 'Sean', role: 'Management' },
  { name: 'Yan', role: 'Management' },
  { name: 'Hannah', role: 'Sales and planning' },
  { name: 'Raul', role: 'Sales and planning' },
  { name: 'Ali Sherin', role: 'Photo' },
  { name: 'Komiljon Sayfiev', role: 'Video' },
  { name: 'Jackie Sahagian', role: 'Vendor relations' },
  { name: 'Kevin', role: 'Payroll' },
  { name: 'Lauren', role: 'Marketing' },
  { name: 'Chiradee', role: 'Marketing' },
  { name: 'Aryel Fernandes', role: 'Gear' },
];

const DEPARTMENTS = [
  {
    id: 'photo', name: 'Photo', person: 'Ali Sherin', sub: '42 pending galleries', note: '6 overdue', bad: true,
    body: 'Sample snapshot of the photo desk. The overdue count is the kind of number that shows up on the weekly report.',
    stats: [['Pending galleries', '42', false], ['Overdue', '6', true], ['Avg turnaround', '18 days', false], ['Client success', '97%', false]],
  },
  {
    id: 'video', name: 'Video', person: 'Komiljon Sayfiev', sub: '11 highlights in edit', note: 'On track', bad: false,
    body: 'Highlights in edit are the queue. Nothing in this sample is past the promised week.',
    stats: [['In edit', '11', false], ['Delivered this week', '4', false], ['Avg turnaround', '12 days', false], ['Open revisions', '1', false]],
  },
  {
    id: 'sales', name: 'Sales', person: 'Hannah and Raul', sub: '7 proposals out', note: '3 this week', bad: false,
    body: 'Proposals sitting with couples. Three of them went out this week.',
    stats: [['Proposals out', '7', false], ['Sent this week', '3', false], ['Booked this week', '2', false], ['Close rate', '38%', false]],
  },
  {
    id: 'planning', name: 'Planning', person: 'Hannah and Raul', sub: '18 weddings this month', note: 'On track', bad: false,
    body: 'October is the heavy month. This is the count of weddings on the calendar, not a forecast.',
    stats: [['This month', '18', false], ['Missing a lead', '1', true], ['Venues confirmed', '16', false], ['Next open Saturday', 'Jan 23', false]],
  },
  {
    id: 'marketing', name: 'Marketing', person: 'Lauren and Chiradee', sub: 'September spend', note: '$4,280', bad: false,
    body: 'Sample of last month. The Knot and Instagram are most of the spend.',
    stats: [['Ad spend', '$4,280', false], ['Leads', '146', false], ['Bookings', '11', false], ['Cost per lead', '$29', false]],
  },
  {
    id: 'gear', name: 'Gear', person: 'Aryel Fernandes', sub: '3 kits checked out', note: 'Kit 2 due', bad: false,
    body: 'Kit 2 is out for the Brooklyn weekend and due back Monday.',
    stats: [['Kits out', '3', false], ['Due back', 'Kit 2', false], ['In the cage', '5', false], ['Flags', 'None', false]],
  },
  {
    id: 'vendors', name: 'Vendor relations', person: 'Jackie Sahagian', sub: '12 venues active', note: 'On track', bad: false,
    body: 'Venues the studio is in regular contact with this season.',
    stats: [['Active venues', '12', false], ['New this month', '1', false], ['Albums open', '4', false], ['Waiting on venue', '2', false]],
  },
  {
    id: 'payroll', name: 'Payroll', person: 'Kevin', sub: 'Week of Sep 28', note: 'Filed', bad: false,
    body: 'The weekly payroll report for September 28 is in. This screen does not show the figures.',
    stats: [['Latest week', 'Sep 28', false], ['Status', 'Filed', false], ['Shooters', 'On the report', false], ['Editors', 'On the report', false]],
  },
  {
    id: 'scheduling', name: 'Scheduling', person: 'Unassigned', sub: 'No owner on the report', note: 'Open role', bad: true,
    body: 'Scheduling still has no owner in the reporting app. It is listed here so the gap stays visible.',
    stats: [['Owner', 'None', true], ['Weekends open', '3', false], ['Holds', '6', false], ['Conflicts', '0', false]],
  },
];

const state = {
  tab: 'home',
  range: '1D',
  stack: [],
  sheet: null,
  query: '',
  chip: 'All',
  pins: new Set(),
  collectible: 614220,
  jobRange: 'ALL',
};

let feed = INITIAL_FEED.map((item) => ({ ...item }));
const seriesCache = new Map();
let disconnectHome = () => {};
let disconnectJob = () => {};
let toastTimer = 0;
let gradId = 0;

function audit() {
  const today = feed.filter((item) => item.group === 'Today' && item.book).reduce((sum, item) => sum + item.amount, 0);
  if (today !== TODAY_ADD) throw new Error('Today book adds sum to ' + today);
  const week = feed.filter((item) => item.book).reduce((sum, item) => sum + item.amount, 0);
  if (week !== TODAY_ADD - WEEK_CANCEL) throw new Error('Week net ' + week);
  const ids = new Set();
  for (const job of JOBS) {
    if (ids.has(job.id)) throw new Error('Duplicate ' + job.id);
    ids.add(job.id);
    const paid = job.payments.reduce((sum, payment) => sum + payment.amount, 0);
    if (paid !== job.collected) throw new Error(job.id + ' payments ' + paid);
    if (job.collected > job.value) throw new Error(job.id + ' over collected');
  }
  const past = JOBS.filter(isPastDue).map((job) => job.id).join(',');
  if (past !== 'solis') throw new Error('Past due: ' + past);
  const openVideo = JOBS.filter((job) => missingVideo(job)).map((job) => job.id).join(',');
  if (openVideo !== 'reed') throw new Error('Missing video: ' + openVideo);
}

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[ch]));
}

function moneyPlain(n, signed = false) {
  const body = Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const sign = n < 0 || (signed && n < 0) ? '-' : signed && n > 0 ? '+' : '';
  return `${sign}$${body}`;
}

function moneyHTML(n) {
  const neg = n < 0;
  const [dollars, cents] = Math.abs(n).toFixed(2).split('.');
  return `${neg ? '-' : ''}$${Number(dollars).toLocaleString('en-US')}<span class="cents">.${cents}</span>`;
}

function pct(n) {
  const sign = n > 0 ? '+' : n < 0 ? '-' : '';
  return `${sign}${Math.abs(n * 100).toFixed(2)}%`;
}

function pct1(n) {
  const sign = n > 0 ? '+' : n < 0 ? '-' : '';
  return `${sign}${Math.abs(n * 100).toFixed(1)}%`;
}

function formatDay(iso, withWeekday = false) {
  return new Intl.DateTimeFormat('en-US', {
    weekday: withWeekday ? 'short' : undefined,
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${iso}T00:00:00Z`));
}

function formatWhen(date, range) {
  if (range === '1D') {
    return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone: TZ }).format(date);
  }
  if (range === 'ALL') {
    return new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric', timeZone: TZ }).format(date);
  }
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: TZ }).format(date);
}

function daysUntil(iso) {
  const a = Date.parse(`${iso}T00:00:00Z`);
  const b = Date.parse(`${TODAY_ISO}T00:00:00Z`);
  return Math.round((a - b) / 86400000);
}

function isPastDue(job) {
  return job.collected <= 0 && daysUntil(job.date) >= 0 && daysUntil(job.date) < 45;
}

function missingVideo(job) {
  return job.package.includes('Film') && !job.crew.some((person) => person.role === 'Video');
}

function jobById(id) {
  return JOBS.find((job) => job.id === id);
}

function topJob() {
  const item = [...state.stack].reverse().find((entry) => entry.type === 'job');
  return item ? jobById(item.id) : null;
}

function toneFor(name) {
  let hash = 0;
  for (const ch of name) hash = (hash + ch.charCodeAt(0)) % TONES.length;
  return TONES[hash];
}

function mono(name) {
  const parts = name.replace(/&/g, ' ').split(/\s+/).filter(Boolean);
  if (parts.length < 2) return (parts[0] || '?').slice(0, 1).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function markHTML(label, tone) {
  const [bg, fg] = tone;
  return `<span class="mark" style="background:${bg};color:${fg}">${esc(label)}</span>`;
}

function icon(name) {
  const common = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';
  const paths = {
    home: '<path d="M4 10.8 12 4l8 6.8V20a1 1 0 0 1-1 1h-5.2v-6.2H10.2V21H5a1 1 0 0 1-1-1v-9.2z"/>',
    search: '<circle cx="11" cy="11" r="6.25"/><path d="m16 16 4 4"/>',
    clock: '<circle cx="12" cy="12" r="8"/><path d="M12 8v4.5l3 2"/>',
    person: '<circle cx="12" cy="9" r="3.1"/><path d="M5.6 19.2c1.15-2.8 3.2-4.2 6.4-4.2s5.25 1.4 6.4 4.2"/>',
    bell: '<path d="M6 16V11a6 6 0 1 1 12 0v5l1.4 2H4.6L6 16z"/><path d="M10 19a2 2 0 0 0 4 0"/>',
    back: '<path d="M15 5 8 12l7 7"/>',
    chev: '<path d="m9 6 6 6-6 6"/>',
    star: '<path d="m12 3.6 2.2 5.3 5.7.5-4.4 3.7 1.4 5.6L12 16.2 7.1 18.7l1.4-5.6L4.1 9.4l5.7-.5L12 3.6z"/>',
    check: '<path d="m5 12.5 4.2 4.2L19 7.5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    card: '<rect x="3.5" y="6" width="17" height="12" rx="2"/><path d="M3.5 10h17"/>',
    box: '<path d="m4 8.5 8-4.5 8 4.5v7L12 20l-8-4.5v-7z"/><path d="m12 12.2 8-3.7M12 12.2V20M12 12.2 4 8.5"/>',
  };
  return `<svg ${common}>${paths[name]}</svg>`;
}

function triangle(up) {
  const d = up ? 'M6 1.4 11 10.6H1L6 1.4Z' : 'M6 10.6 1 1.4h10L6 10.6Z';
  return `<svg class="tri" viewBox="0 0 12 12" aria-hidden="true"><path d="${d}" fill="currentColor"/></svg>`;
}

function rangeStart(key) {
  if (key === '1D') return BOOK - TODAY_ADD;
  if (key === '1W') return BOOK - (TODAY_ADD - WEEK_CANCEL);
  if (key === '1M') return 1705400;
  if (key === '3M') return 1510000;
  if (key === 'YTD') return 1308400;
  return 982000;
}

function rangeChange(key) {
  const start = rangeStart(key);
  const delta = BOOK - start;
  return { delta, pct: delta / start };
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function rand() {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function smooth(values, passes, pinStart, pinEnd) {
  let cur = values.slice();
  for (let pass = 0; pass < passes; pass += 1) {
    const next = cur.slice();
    for (let i = 1; i < cur.length - 1; i += 1) {
      next[i] = cur[i - 1] * 0.22 + cur[i] * 0.56 + cur[i + 1] * 0.22;
    }
    cur = next;
  }
  cur[0] = pinStart;
  cur[cur.length - 1] = pinEnd;
  return cur;
}

function easedSeries(count, anchors, seed) {
  const rand = mulberry32(seed);
  const span = Math.abs(anchors[anchors.length - 1][1] - anchors[0][1]) || 1;
  const values = [];
  for (let i = 0; i < count; i += 1) {
    const t = i / (count - 1);
    let value = anchors[anchors.length - 1][1];
    for (let a = 0; a < anchors.length - 1; a += 1) {
      const [t0, v0] = anchors[a];
      const [t1, v1] = anchors[a + 1];
      if (t <= t1) {
        const u = t <= t0 ? 0 : (t - t0) / (t1 - t0 || 1);
        const s = u <= 0 ? 0 : u >= 1 ? 1 : (1 - Math.cos(Math.PI * Math.min(1, u))) / 2;
        value = v0 + (v1 - v0) * s;
        break;
      }
    }
    const noise = i === 0 || i === count - 1 ? 0 : (rand() - 0.5) * span * 0.045;
    values.push(value + noise);
  }
  return smooth(values, 1, anchors[0][1], anchors[anchors.length - 1][1]);
}

function shaped(start, end, count, fn, seed) {
  const raw = [];
  for (let i = 0; i < count; i += 1) raw.push(fn(i / (count - 1)));
  const a = raw[0];
  const b = raw[count - 1] - a || 1;
  const rand = mulberry32(seed);
  const span = end - start;
  const values = raw.map((value, i) => {
    const t = (value - a) / b;
    const noise = i === 0 || i === count - 1 ? 0 : (rand() - 0.5) * span * 0.035;
    return start + t * span + noise;
  });
  return smooth(values, 2, start, end);
}

function allYears(start, end, count) {
  const cum = [];
  let total = 0;
  for (let i = 0; i < count; i += 1) {
    const t = i / (count - 1);
    const yearPos = (t * 3.75) % 1;
    const season = 0.32 + 0.68 * Math.sin(Math.PI * yearPos) ** 2;
    total += season * (0.72 + t * 0.55);
    cum.push(total);
  }
  const a = cum[0];
  const b = cum[count - 1] - a || 1;
  const rand = mulberry32(99);
  const span = end - start;
  const values = cum.map((value, i) => {
    const noise = i === 0 || i === count - 1 ? 0 : (rand() - 0.5) * span * 0.018;
    return start + ((value - a) / b) * span + noise;
  });
  return smooth(values, 1, start, end);
}

function rangeTimes(key, count) {
  const end = Date.UTC(2026, 9, 1, 22, 0);
  let start = Date.UTC(2023, 0, 1);
  if (key === '1D') start = Date.UTC(2026, 9, 1, 13, 30);
  else if (key === '1W') start = Date.UTC(2026, 8, 24, 13, 0);
  else if (key === '1M') start = Date.UTC(2026, 8, 1);
  else if (key === '3M') start = Date.UTC(2026, 6, 1);
  else if (key === 'YTD') start = Date.UTC(2026, 0, 1);
  const times = [];
  for (let i = 0; i < count; i += 1) {
    times.push(new Date(start + ((end - start) * i) / (count - 1)));
  }
  return times;
}

function buildRange(key) {
  const start = rangeStart(key);
  const end = BOOK;
  const count = key === '1D' ? 64 : key === '1W' ? 84 : key === 'ALL' ? 180 : 110;
  let values;
  if (key === '1D') {
    values = easedSeries(count, [
      [0, start],
      [0.22, start],
      [0.38, start + 8600],
      [0.5, start + 8600],
      [0.66, start + 15400],
      [0.78, start + 15400],
      [0.92, end],
      [1, end],
    ], 7);
  } else if (key === '1W') {
    values = easedSeries(count, [
      [0, start],
      [0.36, start],
      [0.58, start - WEEK_CANCEL],
      [0.84, start - WEEK_CANCEL + 4200],
      [1, end],
    ], 8);
  } else if (key === '1M') {
    values = shaped(start, end, count, (t) => {
      const valley = Math.exp(-((t - 0.38) ** 2) * 22) * 0.22;
      return t * 1.05 - valley;
    }, 11);
  } else if (key === '3M') {
    values = shaped(start, end, count, (t) => {
      const valley = Math.exp(-((t - 0.4) ** 2) * 12) * 0.62;
      return t * 1.2 - valley;
    }, 21);
  } else if (key === 'YTD') {
    values = shaped(start, end, count, (t) => {
      if (t < 0.22) return (t / 0.22) * 0.16;
      if (t < 0.55) return 0.16 + ((t - 0.22) / 0.33) * 0.46;
      if (t < 0.78) {
        const u = (t - 0.55) / 0.23;
        return 0.62 + u * 0.1 - Math.exp(-((u - 0.5) ** 2) * 16) * 0.07;
      }
      return 0.7 + ((t - 0.78) / 0.22) * 0.3;
    }, 31);
  } else {
    values = allYears(start, end, count);
  }
  values[0] = start;
  values[values.length - 1] = end;
  return { values, times: rangeTimes(key, count), up: end >= start, baseline: key === '1D' };
}

function seriesFor(key) {
  if (!seriesCache.has(key)) seriesCache.set(key, buildRange(key));
  return seriesCache.get(key);
}

function collectionModel(job, range) {
  const booked = Date.parse(`${job.bookedOn}T00:00:00Z`);
  const today = Date.parse(`${TODAY_ISO}T00:00:00Z`);
  let from = booked;
  if (range === '1M') from = Math.max(booked, Date.UTC(2026, 8, 1));
  if (range === '3M') from = Math.max(booked, Date.UTC(2026, 6, 1));
  const events = [...job.payments].sort((a, b) => a.date.localeCompare(b.date));
  let index = 0;
  let cum = 0;
  const fromIso = new Date(from).toISOString().slice(0, 10);
  while (index < events.length && events[index].date < fromIso) {
    cum += events[index].amount;
    index += 1;
  }
  const days = Math.max(1, Math.round((today - from) / 86400000));
  const stride = Math.max(1, Math.ceil((days + 1) / 90));
  const values = [];
  const times = [];
  const notes = [];
  for (let day = 0; day <= days; day += stride) {
    const time = from + day * 86400000;
    const iso = new Date(time).toISOString().slice(0, 10);
    let note = null;
    while (index < events.length && events[index].date <= iso) {
      cum += events[index].amount;
      note = events[index].label;
      index += 1;
    }
    values.push(cum);
    times.push(new Date(time));
    notes.push(note);
  }
  if (times[times.length - 1].getTime() !== today) {
    let note = null;
    while (index < events.length && events[index].date <= TODAY_ISO) {
      cum += events[index].amount;
      note = events[index].label;
      index += 1;
    }
    values.push(cum);
    times.push(new Date(today));
    notes.push(note);
  }
  return {
    values,
    times,
    notes,
    up: job.collected > 0,
    baseline: false,
    domain: [0, Math.max(job.value, 1)],
    linear: true,
  };
}

function buildPath(values, width, height, domain, linear) {
  const min = domain ? domain[0] : Math.min(...values);
  const max = domain ? domain[1] : Math.max(...values);
  const span = max - min;
  const padX = 8;
  const padY = 18;
  const innerW = Math.max(1, width - padX * 2);
  const innerH = Math.max(1, height - padY * 2);
  const flat = !domain && span < 0.5;
  const pts = values.map((value, i) => {
    const x = padX + (i / Math.max(1, values.length - 1)) * innerW;
    const y = flat ? height * 0.72 : padY + (1 - (value - min) / (span || 1)) * innerH;
    return [x, y];
  });
  let d = `M${pts[0][0].toFixed(2)} ${pts[0][1].toFixed(2)}`;
  if (linear) {
    for (let i = 1; i < pts.length; i += 1) {
      d += ` L${pts[i][0].toFixed(2)} ${pts[i][1].toFixed(2)}`;
    }
  } else {
  for (let i = 0; i < pts.length - 1; i += 1) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
    const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
    const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
    const cp2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2[0].toFixed(2)} ${p2[1].toFixed(2)}`;
  }
  }
  const area = `${d} L${pts[pts.length - 1][0].toFixed(2)} ${height} L${pts[0][0].toFixed(2)} ${height} Z`;
  const baseY = flat ? height * 0.72 : padY + (1 - (values[0] - min) / (span || 1)) * innerH;
  return { d, area, pts, baseY };
}

function mountChart(container, model, hooks) {
  const width = Math.round(container.clientWidth);
  const height = Math.round(container.clientHeight || 208);
  const color = model.up ? '#00C805' : '#FF5000';
  const path = buildPath(model.values, width, height, model.domain, model.linear);
  const id = `grad${gradId += 1}`;
  const last = path.pts[path.pts.length - 1];
  const baseline = model.baseline
    ? `<line x1="0" x2="${width}" y1="${path.baseY.toFixed(2)}" y2="${path.baseY.toFixed(2)}" stroke="#3a3a3c" stroke-dasharray="1 6" stroke-width="1"></line>`
    : '';
  const ceiling = model.domain
    ? `<line x1="8" x2="${width - 8}" y1="18" y2="18" stroke="#2c2c2e" stroke-dasharray="1 6" stroke-width="1"></line>`
    : '';
  container.innerHTML = `<svg viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="${esc(hooks.label)}">
    <defs>
      <linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${color}" stop-opacity="0.34"/>
        <stop offset="72%" stop-color="${color}" stop-opacity="0.03"/>
        <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
      </linearGradient>
    </defs>
    ${baseline}
    ${ceiling}
    <path d="${path.area}" fill="url(#${id})"></path>
    <path d="${path.d}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"></path>
    <line class="cursor" x1="0" x2="0" y1="8" y2="${height - 8}" stroke="rgba(255,255,255,0.55)" stroke-width="1" visibility="hidden"></line>
    <circle class="halo" r="8" fill="${color}" fill-opacity="0.22" cx="${last[0]}" cy="${last[1]}"></circle>
    <circle class="dot" r="4" fill="${color}" cx="${last[0]}" cy="${last[1]}"></circle>
  </svg>`;
  const svg = container.querySelector('svg');
  const cursor = svg.querySelector('.cursor');
  const dot = svg.querySelector('.dot');
  const halo = svg.querySelector('.halo');
  const move = (clientX) => {
    const rect = svg.getBoundingClientRect();
    const x = Math.min(Math.max(clientX - rect.left, 0), rect.width);
    const i = Math.round((x / Math.max(1, rect.width)) * (path.pts.length - 1));
    const [cx, cy] = path.pts[i];
    cursor.setAttribute('x1', cx);
    cursor.setAttribute('x2', cx);
    cursor.setAttribute('visibility', 'visible');
    dot.setAttribute('cx', cx);
    dot.setAttribute('cy', cy);
    halo.setAttribute('cx', cx);
    halo.setAttribute('cy', cy);
    hooks.onIndex(i);
  };
  const clear = () => {
    cursor.setAttribute('visibility', 'hidden');
    dot.setAttribute('cx', last[0]);
    dot.setAttribute('cy', last[1]);
    halo.setAttribute('cx', last[0]);
    halo.setAttribute('cy', last[1]);
    hooks.onClear();
  };
  let drag = false;
  const onDown = (event) => {
    drag = true;
    svg.setPointerCapture?.(event.pointerId);
    move(event.clientX);
  };
  const onMove = (event) => {
    if (event.pointerType === 'mouse' || drag) move(event.clientX);
  };
  const onUp = (event) => {
    const rect = svg.getBoundingClientRect();
    const inside = event.clientX >= rect.left && event.clientX <= rect.right
      && event.clientY >= rect.top && event.clientY <= rect.bottom;
    drag = false;
    if (event.pointerType !== 'mouse' || !inside) clear();
  };
  const onLeave = () => { if (!drag) clear(); };
  svg.addEventListener('pointerdown', onDown);
  svg.addEventListener('pointermove', onMove);
  svg.addEventListener('pointerup', onUp);
  svg.addEventListener('pointercancel', onUp);
  svg.addEventListener('pointerleave', onLeave);
  return () => {
    svg.removeEventListener('pointerdown', onDown);
    svg.removeEventListener('pointermove', onMove);
    svg.removeEventListener('pointerup', onUp);
    svg.removeEventListener('pointercancel', onUp);
    svg.removeEventListener('pointerleave', onLeave);
  };
}

function watchChart(container, model, hooks, slot) {
  let unlisten = () => {};
  let lastW = -1;
  const draw = () => {
    const width = Math.round(container.clientWidth);
    if (!width || width === lastW) return;
    lastW = width;
    unlisten();
    unlisten = mountChart(container, model, hooks);
  };
  draw();
  const observer = new ResizeObserver(draw);
  observer.observe(container);
  const stop = () => { observer.disconnect(); unlisten(); };
  if (slot === 'home') disconnectHome = stop;
  else disconnectJob = stop;
}

function alerts() {
  const items = [];
  for (const job of JOBS) {
    if (isPastDue(job)) {
      items.push({
        kind: 'job', id: job.id, title: job.couple,
        sub: `Deposit not in · ${moneyPlain(job.value - job.collected)}`,
      });
    }
    if (missingVideo(job)) {
      items.push({ kind: 'job', id: job.id, title: job.couple, sub: 'No video lead assigned' });
    }
  }
  items.push({ kind: 'dept', id: 'photo', title: 'Photo', sub: '6 galleries overdue' });
  return items;
}

function statusOf(job) {
  const when = formatDay(job.date, true);
  if (isPastDue(job)) return { text: `Deposit past due · ${when}`, tone: 'down' };
  if (job.collected >= job.value - 0.001) return { text: `Paid in full · ${when}`, tone: 'up' };
  return { text: `${moneyPlain(job.value - job.collected)} due · ${when}`, tone: 'flat' };
}

function rowFlags(job) {
  if (isPastDue(job)) return ' · <span class="down">Past due</span>';
  if (missingVideo(job)) return ' · <span class="down">No video lead</span>';
  return '';
}

function rowHTML(job) {
  const tone = pct1(job.margin).startsWith('-') ? 'down' : 'up';
  return `<button class="row" type="button" data-act="job" data-id="${job.id}">
    ${markHTML(job.mark, TONES[job.tone])}
    <span class="row-main">
      <span class="row-title">${esc(job.couple)}</span>
      <span class="row-sub">${esc(formatDay(job.date))} · ${esc(job.package)}${rowFlags(job)}</span>
    </span>
    <span class="row-side">
      <span class="row-price">${esc(moneyPlain(job.value))}</span>
      <span class="row-delta ${tone}">${esc(pct1(job.margin))}</span>
    </span>
  </button>`;
}

function homeJobs() {
  return [...JOBS].sort((a, b) => {
    const pin = Number(state.pins.has(b.id)) - Number(state.pins.has(a.id));
    if (pin) return pin;
    return b.value - a.value;
  }).slice(0, 6);
}

function upcomingJobs() {
  return [...JOBS].sort((a, b) => a.date.localeCompare(b.date)).slice(0, 6);
}

function filteredJobs() {
  const query = state.query.trim().toLowerCase();
  return JOBS.filter((job) => {
    if (state.chip === 'Photo' && !job.package.includes('Photo')) return false;
    if (state.chip === 'Film' && !job.package.includes('Film')) return false;
    if (state.chip === 'Commercial' && job.package !== 'Commercial') return false;
    if (state.chip === 'Balance due' && job.collected >= job.value - 0.001) return false;
    if (!query) return true;
    return `${job.couple} ${job.venue} ${job.city} ${job.package}`.toLowerCase().includes(query);
  }).sort((a, b) => a.date.localeCompare(b.date));
}

function paintHero() {
  const hero = document.getElementById('hero');
  const delta = document.getElementById('delta');
  if (!hero || !delta) return;
  const change = rangeChange(state.range);
  hero.innerHTML = moneyHTML(BOOK);
  delta.className = `delta ${change.delta >= 0 ? 'up' : 'down'}`;
  delta.innerHTML = `${triangle(change.delta >= 0)}<span>${esc(moneyPlain(change.delta, true))} (${pct(change.pct)}) ${esc(RANGE_WHEN[state.range])}</span>`;
}

function showHomeScrub(index) {
  const model = seriesFor(state.range);
  const hero = document.getElementById('hero');
  const delta = document.getElementById('delta');
  if (!hero || !delta) return;
  hero.innerHTML = moneyHTML(model.values[index]);
  delta.className = 'delta flat';
  delta.innerHTML = `<span class="when">${esc(formatWhen(model.times[index], state.range))}</span>`;
}

function paintHomeChart() {
  disconnectHome();
  disconnectHome = () => {};
  const container = document.getElementById('chart');
  if (!container) return;
  watchChart(container, seriesFor(state.range), {
    label: 'Open book, drag to see a point in time',
    onIndex: showHomeScrub,
    onClear: paintHero,
  }, 'home');
}

function paintJobHero(job) {
  const kicker = document.getElementById('job-kicker');
  const hero = document.getElementById('job-hero');
  const delta = document.getElementById('job-delta');
  if (!kicker || !hero || !delta) return;
  const status = statusOf(job);
  kicker.textContent = 'Contract';
  hero.innerHTML = moneyHTML(job.value);
  delta.className = `delta ${status.tone}`;
  delta.textContent = status.text;
}

function paintJobChart() {
  disconnectJob();
  disconnectJob = () => {};
  const job = topJob();
  const container = document.getElementById('job-chart');
  if (!job || !container) return;
  const model = collectionModel(job, state.jobRange);
  watchChart(container, model, {
    label: 'Collected over the life of the contract',
    onIndex: (index) => {
      const kicker = document.getElementById('job-kicker');
      const hero = document.getElementById('job-hero');
      const delta = document.getElementById('job-delta');
      if (!kicker || !hero || !delta) return;
      kicker.textContent = 'Collected';
      hero.innerHTML = moneyHTML(model.values[index]);
      delta.className = 'delta flat';
      const when = formatWhen(model.times[index], '1M');
      delta.textContent = model.notes[index] ? `${when} · ${model.notes[index]}` : when;
    },
    onClear: () => paintJobHero(job),
  }, 'job');
}

function rangeButtons(active, act, extraClass = '') {
  const keys = act === 'job-range' ? ['1M', '3M', 'ALL'] : ['1D', '1W', '1M', '3M', 'YTD', 'ALL'];
  return `<div class="ranges">${keys.map((key) => (
    `<button class="range ${extraClass}" type="button" data-act="${act}" data-range="${key}" aria-pressed="${key === active ? 'true' : 'false'}">${key}</button>`
  )).join('')}</div>`;
}

function renderHome() {
  const open = alerts().length;
  const cards = upcomingJobs().map((job) => {
    const flag = isPastDue(job) ? ' · <span class="down">Past due</span>' : '';
    return `<button class="cal" type="button" data-act="job" data-id="${job.id}">
      <span class="cal-date">${esc(formatDay(job.date, true))}</span>
      <span class="cal-name">${esc(job.couple)}</span>
      <span class="cal-meta">${esc(job.venue)}${flag}</span>
    </button>`;
  }).join('');
  return `
    <div class="top">
      <button class="avatar" type="button" data-act="tab" data-tab="account" aria-label="Account">S</button>
      <button class="iconbtn" type="button" data-act="sheet" data-sheet="alerts" aria-label="Alerts">
        ${icon('bell')}
        ${open ? '<span class="dotbad"></span>' : ''}
      </button>
    </div>
    <div class="hero-block">
      <p class="kicker">Open book</p>
      <div class="hero-value" id="hero"></div>
      <div class="delta" id="delta"></div>
    </div>
    <div class="chart" id="chart"></div>
    ${rangeButtons(state.range, 'range')}
    <button class="power" type="button" data-act="sheet" data-sheet="collect">
      <span class="label">To collect</span>
      <span class="val">${esc(moneyPlain(state.collectible))}${icon('chev')}</span>
    </button>
    <div class="block-label">On the calendar</div>
    <div class="scroller">${cards}</div>
    <div class="section-head">
      <h2>Weddings</h2>
      <button class="linkish" type="button" data-act="tab" data-tab="search">See all</button>
    </div>
    <p class="section-sub">A sample of what is still ahead. Margin versus the studio target.</p>
    ${homeJobs().map(rowHTML).join('')}
  `;
}

function renderSearch() {
  const list = filteredJobs();
  const chips = ['All', 'Photo', 'Film', 'Commercial', 'Balance due'].map((chip) => (
    `<button class="chip" type="button" data-act="chip" data-chip="${esc(chip)}" aria-pressed="${state.chip === chip ? 'true' : 'false'}">${esc(chip)}</button>`
  )).join('');
  const results = list.length
    ? `<div class="group-label">${list.length} on this sample</div>${list.map(rowHTML).join('')}`
    : '<div class="empty">Nothing matches.</div>';
  return `
    <div class="searchwrap">
      <div class="searchbox">
        ${icon('search')}
        <input id="q" placeholder="Search couples, venues" value="${esc(state.query)}" autocomplete="off" enterkeyhint="search" aria-label="Search the book">
      </div>
    </div>
    <div class="chips">${chips}</div>
    <div id="results">${results}</div>
  `;
}

function feedIcon(item) {
  if (String(item.sub).startsWith('Gallery')) return icon('box');
  if (item.amount != null && item.amount < 0) return icon('minus');
  if (item.book) return icon('plus');
  return icon('card');
}

function renderActivity() {
  const groups = [];
  for (const item of feed) {
    let group = groups.find((entry) => entry.name === item.group);
    if (!group) {
      group = { name: item.group, items: [] };
      groups.push(group);
    }
    group.items.push(item);
  }
  return `<h1 class="page-title">Activity</h1>${groups.map((group) => `
    <div class="group-label">${esc(group.name)}</div>
    ${group.items.map((item) => {
      const amount = item.amount == null
        ? '<span class="act-amt flat">Done</span>'
        : `<span class="act-amt ${item.amount > 0 ? 'up' : 'down'}">${esc(moneyPlain(item.amount, true))}</span>`;
      const act = item.job ? `data-act="job" data-id="${item.job}"` : '';
      return `<button class="act" type="button" ${act}>
        <span class="act-ico">${feedIcon(item)}</span>
        <span class="act-main">
          <span class="act-title">${esc(item.title)}</span>
          <span class="act-sub">${esc(item.sub)}</span>
        </span>
        ${amount}
      </button>`;
    }).join('')}
  `).join('')}`;
}

function renderAccount() {
  const open = alerts();
  return `
    <div class="acct">
      <h1 class="acct-name">Sean</h1>
      <div class="acct-sub">Management · Move Mountains Co.</div>
      <div class="acct-money">${moneyHTML(BOOK)}</div>
      <div class="acct-kicker">Open book · contracted, not yet delivered</div>
    </div>
    <div class="menu-list">
      <button class="menu" type="button" data-act="tab" data-tab="search">Weddings <span class="right">${icon('chev')}</span></button>
      <button class="menu" type="button" data-act="push" data-type="departments">Departments <span class="right">${icon('chev')}</span></button>
      <button class="menu" type="button" data-act="push" data-type="crew">Crew <span class="right">${icon('chev')}</span></button>
      <button class="menu" type="button" data-act="sheet" data-sheet="alerts">Alerts <span class="right">${open.length ? `<span class="count">${open.length}</span>` : ''}${icon('chev')}</span></button>
      <a class="menu" href="/">Department reporting <span class="right">${icon('chev')}</span></a>
    </div>
    <p class="disclaimer">Design study. These figures are sample data so the interface can be judged on its own. Nothing here is connected to department reporting, and a payment marked on a wedding stays in this browser only.</p>
  `;
}

function renderTab() {
  if (state.tab === 'search') return renderSearch();
  if (state.tab === 'activity') return renderActivity();
  if (state.tab === 'account') return renderAccount();
  return renderHome();
}

function renderTabbar() {
  const tabs = [
    ['home', 'Home', 'home'],
    ['search', 'Search', 'search'],
    ['activity', 'Activity', 'clock'],
    ['account', 'Account', 'person'],
  ];
  return tabs.map(([id, label, glyph]) => (
    `<button class="tab" type="button" data-act="tab" data-tab="${id}" aria-current="${state.tab === id ? 'page' : 'false'}">${icon(glyph)}<span>${label}</span></button>`
  )).join('');
}

function navHTML(title, subtitle, trailing) {
  return `<div class="nav">
    <button class="iconbtn" type="button" data-act="back" aria-label="Back">${icon('back')}</button>
    <div class="nav-title"><strong>${esc(title)}</strong>${subtitle ? `<span>${esc(subtitle)}</span>` : ''}</div>
    ${trailing || '<span></span>'}
  </div>`;
}

function jobPanel(job) {
  const ratio = Math.max(0, Math.min(1, job.collected / job.value));
  const paid = job.collected >= job.value - 0.001;
  const pills = job.crew.length
    ? job.crew.map((person) => `<span class="pill">${markHTML(mono(person.name), toneFor(person.name))}<span>${esc(person.name)} · ${esc(person.role)}</span></span>`).join('')
    : '<span class="row-sub">Nobody assigned yet.</span>';
  const guest = job.guests ? String(job.guests) : 'In studio';
  const pinned = state.pins.has(job.id);
  return `
    ${navHTML(job.couple, job.mark, `<button class="iconbtn star ${pinned ? 'filled' : ''}" type="button" data-act="pin" data-id="${job.id}" aria-label="${pinned ? 'Unpin' : 'Pin'}" aria-pressed="${pinned}">${icon('star')}</button>`)}
    <div class="panel-scroll">
      <div class="hero-block">
        <p class="kicker" id="job-kicker">Contract</p>
        <div class="hero-value" id="job-hero"></div>
        <div class="delta" id="job-delta"></div>
      </div>
      <div class="track ${isPastDue(job) ? 'down' : ''}"><span style="width:${(ratio * 100).toFixed(1)}%"></span></div>
      <div class="chart" id="job-chart"></div>
      ${rangeButtons(state.jobRange, 'job-range', 'jrange')}
      <dl class="stats">
        <div class="stat"><dt>Date</dt><dd>${esc(formatDay(job.date, true))}</dd></div>
        <div class="stat"><dt>Package</dt><dd>${esc(job.package)}</dd></div>
        <div class="stat"><dt>Venue</dt><dd>${esc(job.venue)}</dd></div>
        <div class="stat"><dt>City</dt><dd>${esc(job.city)}</dd></div>
        <div class="stat"><dt>Collected</dt><dd>${esc(moneyPlain(job.collected))}</dd></div>
        <div class="stat"><dt>Balance</dt><dd class="${isPastDue(job) ? 'down' : ''}">${esc(moneyPlain(job.value - job.collected))}</dd></div>
        <div class="stat"><dt>Guests</dt><dd>${esc(guest)}</dd></div>
        <div class="stat"><dt>Vs target margin</dt><dd class="${job.margin < 0 ? 'down' : 'up'}">${esc(pct1(job.margin))}</dd></div>
      </dl>
      <div class="about">
        <h2>Crew</h2>
        <div class="pills">${pills}</div>
        <h2>About</h2>
        <p>${esc(job.about)}</p>
      </div>
    </div>
    <div class="actions">
      <button class="btn primary" type="button" data-act="sheet" data-sheet="deposit" ${paid ? 'disabled' : ''}>${paid ? 'Paid in full' : 'Collect'}</button>
      <button class="btn secondary" type="button" data-act="sheet" data-sheet="crew">Crew</button>
    </div>
  `;
}

function departmentsPanel() {
  return `
    ${navHTML('Departments')}
    <div class="panel-scroll">
      <p class="note">Sample snapshot. Not the weekly report.</p>
      ${DEPARTMENTS.map((dept) => `<button class="row" type="button" data-act="push" data-type="department" data-id="${dept.id}">
        ${markHTML(({ photo: 'Ph', video: 'Vi', sales: 'Sa', planning: 'Pn', marketing: 'Mk', gear: 'Ge', vendors: 'VR', payroll: 'Pa', scheduling: 'Sc' })[dept.id] || mono(dept.name), toneFor(dept.name))}
        <span class="row-main">
          <span class="row-title">${esc(dept.name)}</span>
          <span class="row-sub">${esc(dept.person)} · ${esc(dept.sub)}</span>
        </span>
        <span class="row-side"><span class="row-delta ${dept.bad ? 'down' : ''}">${esc(dept.note)}</span></span>
      </button>`).join('')}
    </div>
  `;
}

function departmentPanel(id) {
  const dept = DEPARTMENTS.find((item) => item.id === id) || DEPARTMENTS[0];
  return `
    ${navHTML(dept.name, dept.person)}
    <div class="panel-scroll">
      <p class="note">${esc(dept.body)}</p>
      <dl class="stats">
        ${dept.stats.map(([label, value, bad]) => `<div class="stat"><dt>${esc(label)}</dt><dd class="${bad ? 'down' : ''}">${esc(value)}</dd></div>`).join('')}
      </dl>
    </div>
  `;
}

function crewPanel() {
  return `
    ${navHTML('Crew')}
    <div class="panel-scroll">
      <p class="note">The people behind the departments.</p>
      ${CREW.map((person) => `<div class="row">
        ${markHTML(mono(person.name), toneFor(person.name))}
        <span class="row-main">
          <span class="row-title">${esc(person.name)}</span>
          <span class="row-sub">${esc(person.role)}</span>
        </span>
      </div>`).join('')}
    </div>
  `;
}

function panelHTML(item) {
  if (item.type === 'job') return jobPanel(jobById(item.id));
  if (item.type === 'departments') return departmentsPanel();
  if (item.type === 'department') return departmentPanel(item.id);
  if (item.type === 'crew') return crewPanel();
  return '';
}

function breakdown() {
  const past = JOBS.filter(isPastDue).reduce((sum, job) => sum + (job.value - job.collected), 0);
  const total = state.collectible;
  const rest = Math.max(0, total - past);
  const week = Math.round(rest * 0.09);
  const month = Math.round(rest * 0.34);
  const later = Math.round((rest - week - month) * 100) / 100;
  return {
    total,
    lines: [
      ['Due this week', week, ''],
      ['Due this month', month, ''],
      ['Past due', past, past > 0 ? 'down' : ''],
      ['Later in the book', later, ''],
    ],
  };
}

function sheetHTML() {
  if (state.sheet === 'collect') {
    const data = breakdown();
    return `<div class="backdrop" data-act="close-sheet"></div>
      <div class="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title">
        <div class="handle"></div>
        <h3 id="sheet-title">To collect</h3>
        <p class="sub">Cash still out on contracted work. Sample split.</p>
        <div class="sheet-total">${moneyHTML(data.total)}</div>
        ${data.lines.map(([label, amount, tone]) => `<div class="line ${tone}"><span>${esc(label)}</span><span class="amt-line">${esc(moneyPlain(amount))}</span></div>`).join('')}
      </div>`;
  }
  if (state.sheet === 'alerts') {
    const items = alerts();
    return `<div class="backdrop" data-act="close-sheet"></div>
      <div class="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title">
        <div class="handle"></div>
        <h3 id="sheet-title">Alerts</h3>
        <p class="sub">${items.length ? 'Things that need a person.' : 'Nothing open.'}</p>
        ${items.map((item) => `<button class="alert" type="button" data-act="alert" data-kind="${item.kind}" data-id="${item.id}"><strong>${esc(item.title)}</strong><span>${esc(item.sub)}</span></button>`).join('')}
      </div>`;
  }
  if (state.sheet === 'deposit') {
    const job = topJob();
    if (!job) return '';
    const due = Math.max(0, Math.round((job.value - job.collected) * 100) / 100);
    return `<div class="backdrop" data-act="close-sheet"></div>
      <form class="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title" data-deposit>
        <div class="handle"></div>
        <h3 id="sheet-title">Collect</h3>
        <p class="sub">${esc(job.couple)}</p>
        <div class="amt-row"><span>$</span><input class="amt" inputmode="decimal" autocomplete="off" aria-label="Amount" value="${due.toLocaleString('en-US')}"></div>
        <p class="duehint">Balance ${esc(moneyPlain(due))}. This stays in the preview.</p>
        <button class="btn primary" type="submit">Mark collected</button>
      </form>`;
  }
  if (state.sheet === 'crew') {
    const job = topJob();
    if (!job) return '';
    return `<div class="backdrop" data-act="close-sheet"></div>
      <div class="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title">
        <div class="handle"></div>
        <h3 id="sheet-title">Crew</h3>
        <p class="sub">${esc(job.couple)}. Sample assignment only.</p>
        ${ASSIGNABLE.map((person) => {
          const on = job.crew.some((member) => member.name === person.name);
          return `<button class="check" type="button" data-act="assign" data-name="${esc(person.name)}" aria-pressed="${on}">
            <span class="who">${esc(person.name)}<span class="role">${esc(person.role)}</span></span>
            <span class="box">${on ? icon('check') : ''}</span>
          </button>`;
        }).join('')}
      </div>`;
  }
  return '';
}

function renderOverlay(animateTop) {
  const root = document.getElementById('overlay');
  disconnectJob();
  disconnectJob = () => {};
  if (!state.stack.length) {
    root.innerHTML = '';
    return;
  }
  root.innerHTML = state.stack.map((item) => `<div class="panel">${panelHTML(item)}</div>`).join('');
  const panels = [...root.children];
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  panels.forEach((panel, index) => {
    const top = index === panels.length - 1;
    if (animateTop && top && !reduce) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => panel.classList.add('in'));
      });
    } else {
      panel.classList.add('in');
    }
  });
  if (state.stack[state.stack.length - 1].type === 'job') {
    paintJobHero(topJob());
    paintJobChart();
  }
}

function renderSheet(animate) {
  const root = document.getElementById('sheetroot');
  if (!state.sheet) {
    root.className = 'sheetroot';
    root.innerHTML = '';
    return;
  }
  root.innerHTML = sheetHTML();
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!animate || reduce) {
    root.classList.add('open');
    return;
  }
  root.classList.remove('open');
  requestAnimationFrame(() => {
    requestAnimationFrame(() => root.classList.add('open'));
  });
}

function render(options = {}) {
  const scroller = document.getElementById('scroll');
  const y = options.keepScroll ? scroller.scrollTop : 0;
  const panel = document.querySelector('#overlay .panel:last-child .panel-scroll');
  const panelY = options.keepScroll && panel ? panel.scrollTop : 0;
  disconnectHome();
  disconnectHome = () => {};
  scroller.innerHTML = renderTab();
  scroller.scrollTop = y;
  document.getElementById('tabbar').innerHTML = renderTabbar();
  renderOverlay(!!options.animateTop);
  renderSheet(!!options.animateSheet);
  if (state.tab === 'home') {
    paintHero();
    paintHomeChart();
  }
  const nextPanel = document.querySelector('#overlay .panel:last-child .panel-scroll');
  if (nextPanel && options.keepScroll) nextPanel.scrollTop = panelY;
  if (state.sheet === 'deposit') {
    setTimeout(() => {
      const input = document.querySelector('.amt');
      if (input && state.sheet === 'deposit') input.focus();
    }, options.animateSheet ? 360 : 0);
  }
}

function toast(message) {
  const el = document.getElementById('toaster');
  el.hidden = false;
  el.textContent = message;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 2200);
}

function pushOverlay(item) {
  state.stack.push(item);
  renderOverlay(true);
}

function popOverlay() {
  if (!state.stack.length) return;
  const panel = document.querySelector('#overlay .panel:last-child');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!panel || reduce) {
    state.stack.pop();
    render({ keepScroll: true });
    return;
  }
  panel.classList.remove('in');
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    state.stack.pop();
    render({ keepScroll: true });
  };
  panel.addEventListener('transitionend', (event) => {
    if (event.propertyName === 'transform') finish();
  });
  setTimeout(finish, 450);
}

function closeSheet() {
  state.sheet = null;
  const root = document.getElementById('sheetroot');
  root.classList.remove('open');
  setTimeout(() => {
    if (!state.sheet) root.innerHTML = '';
  }, 300);
}

function openSheet(name) {
  state.sheet = name;
  renderSheet(true);
  if (name === 'deposit') {
    setTimeout(() => {
      const input = document.querySelector('.amt');
      input?.focus();
    }, 360);
  }
}

function setRange(key) {
  if (state.range === key) return;
  state.range = key;
  document.querySelectorAll('.range:not(.jrange)').forEach((button) => {
    button.setAttribute('aria-pressed', button.dataset.range === key ? 'true' : 'false');
  });
  paintHero();
  paintHomeChart();
}

function setJobRange(key) {
  state.jobRange = key;
  document.querySelectorAll('.jrange').forEach((button) => {
    button.setAttribute('aria-pressed', button.dataset.range === key ? 'true' : 'false');
  });
  paintJobChart();
}

function paintResults() {
  const el = document.getElementById('results');
  if (!el) return;
  const list = filteredJobs();
  el.innerHTML = list.length
    ? `<div class="group-label">${list.length} on this sample</div>${list.map(rowHTML).join('')}`
    : '<div class="empty">Nothing matches.</div>';
}

function markCollected(job, raw) {
  const due = Math.round((job.value - job.collected) * 100) / 100;
  const amount = Math.round(Number(String(raw).replace(/[^0-9.]/g, '')) * 100) / 100;
  if (!Number.isFinite(amount) || amount <= 0) {
    toast('Enter an amount');
    return;
  }
  const pay = Math.min(due, amount);
  if (pay <= 0) {
    toast('Nothing left to collect');
    return;
  }
  job.collected = Math.round((job.collected + pay) * 100) / 100;
  job.payments.push({ date: TODAY_ISO, amount: pay, label: 'Payment' });
  state.collectible = Math.max(0, Math.round((state.collectible - pay) * 100) / 100);
  feed.unshift({
    group: 'Today',
    title: job.couple,
    sub: 'Payment marked · sample',
    amount: pay,
    book: false,
    job: job.id,
  });
  state.sheet = null;
  toast('Sample payment marked');
  render({ keepScroll: true });
}

function toggleCrew(name) {
  const job = topJob();
  const person = ASSIGNABLE.find((item) => item.name === name);
  if (!job || !person) return;
  const index = job.crew.findIndex((member) => member.name === name);
  if (index >= 0) job.crew.splice(index, 1);
  else job.crew.push({ name: person.name, role: person.role });
  render({ keepScroll: true });
}

function togglePin(id) {
  if (state.pins.has(id)) {
    state.pins.delete(id);
    toast('Unpinned');
  } else {
    state.pins.add(id);
    toast('Pinned to the top');
  }
  render({ keepScroll: true });
}

function openJob(id) {
  state.jobRange = 'ALL';
  pushOverlay({ type: 'job', id });
}

function onClick(event) {
  const el = event.target.closest('[data-act]');
  if (!el || !document.getElementById('device').contains(el)) return;
  const act = el.dataset.act;
  if (act === 'tab') {
    state.tab = el.dataset.tab;
    state.stack = [];
    state.sheet = null;
    render();
    return;
  }
  if (act === 'range') {
    setRange(el.dataset.range);
    return;
  }
  if (act === 'job-range') {
    setJobRange(el.dataset.range);
    return;
  }
  if (act === 'job') {
    openJob(el.dataset.id);
    return;
  }
  if (act === 'sheet') {
    openSheet(el.dataset.sheet);
    return;
  }
  if (act === 'close-sheet') {
    closeSheet();
    return;
  }
  if (act === 'back') {
    popOverlay();
    return;
  }
  if (act === 'pin') {
    togglePin(el.dataset.id);
    return;
  }
  if (act === 'chip') {
    state.chip = el.dataset.chip;
    document.querySelectorAll('.chip').forEach((button) => {
      button.setAttribute('aria-pressed', button.dataset.chip === state.chip ? 'true' : 'false');
    });
    paintResults();
    return;
  }
  if (act === 'push') {
    pushOverlay({ type: el.dataset.type, id: el.dataset.id });
    return;
  }
  if (act === 'alert') {
    const kind = el.dataset.kind;
    const id = el.dataset.id;
    state.sheet = null;
    renderSheet(false);
    if (kind === 'dept') pushOverlay({ type: 'department', id });
    else openJob(id);
    return;
  }
  if (act === 'assign') {
    toggleCrew(el.dataset.name);
  }
}

function onInput(event) {
  if (event.target.id !== 'q') return;
  state.query = event.target.value;
  paintResults();
}

function onSubmit(event) {
  const form = event.target;
  if (!form.dataset || form.dataset.deposit == null) return;
  event.preventDefault();
  const job = topJob();
  if (job) markCollected(job, form.querySelector('.amt').value);
}

function showError(error) {
  const scroller = document.getElementById('scroll');
  if (scroller) scroller.innerHTML = `<pre class="boom">${esc(error && error.stack ? error.stack : error)}</pre>`;
}

const device = document.getElementById('device');
device.addEventListener('click', onClick);
device.addEventListener('input', onInput);
device.addEventListener('submit', onSubmit);
document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  if (state.sheet) closeSheet();
  else if (state.stack.length) popOverlay();
});

try {
  audit();
  render();
} catch (error) {
  showError(error);
}
