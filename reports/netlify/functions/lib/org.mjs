import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const org = require("../../../data/org.json");

export function loadOrg() {
  return org;
}
