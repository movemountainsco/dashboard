// Static JSON import so the Netlify esbuild bundle inlines the catalog.
import types from "../../../data/types.json" with { type: "json" };
import { slug } from "./util.mjs";

export function loadTypes() {
  return types;
}

export function typeById(id, catalog = types) {
  const key = slug(id);
  return catalog.find((type) => type.id === key) || null;
}

export function labelForType(id, catalog = types) {
  const known = typeById(id, catalog);
  if (known) return known.label;
  return String(id || "")
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
