import { records } from "./lib/blobs.mjs";
import { createApp } from "./lib/http.mjs";

export default function handler(request) {
  return createApp({ store: records() }).handle(request);
}
