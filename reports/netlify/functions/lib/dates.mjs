const DAY = /^(\d{4})-(\d{2})-(\d{2})$/;
const MONTH = /^(\d{4})-(\d{2})$/;

/** Calendar dates are MM/DD/YYYY. A month period is MM/YYYY. A `..` range uses both. */
export function formatPeriod(period) {
  const value = String(period || "").trim();
  const day = value.match(DAY);
  if (day) return `${day[2]}/${day[3]}/${day[1]}`;
  const month = value.match(MONTH);
  if (month) return `${month[2]}/${month[1]}`;
  const parts = value.split(/\.\.|\/(?=\d{4}-)/).map((part) => part.trim());
  if (parts.length === 2 && parts.every((part) => DAY.test(part))) {
    return `${formatPeriod(parts[0])} – ${formatPeriod(parts[1])}`;
  }
  return value;
}

/** Instant rendered in Eastern Time as MM/DD/YYYY. */
export function formatStamp(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type) => parts.find((part) => part.type === type)?.value || "";
  return `${get("month")}/${get("day")}/${get("year")}`;
}
