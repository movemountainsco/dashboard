import { getStore } from "@netlify/blobs";

// One strongly consistent store. Each report is its own key.
export function records() {
  return getStore({ name: "reports-records", consistency: "strong" });
}
