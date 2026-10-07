// Static JSON import so the Netlify esbuild bundle inlines the catalog.
import org from "../../../data/org.json" with { type: "json" };

export function loadOrg() {
  return org;
}
