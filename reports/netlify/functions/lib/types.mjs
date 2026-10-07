import { createRequire } from "node:module";
import { slug } from "./util.mjs";

const require = createRequire(import.meta.url);
const types = require("../../../data/types.json");

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
