/** In-memory stand-in for the Netlify Blobs store used by tests and the local server. */
export function createMemoryStore() {
  const map = new Map();
  return {
    async get(key, opts = {}) {
      if (!map.has(key)) return null;
      const raw = map.get(key);
      if (opts.type === "json") return JSON.parse(raw);
      return raw;
    },
    async set(key, value) {
      map.set(key, typeof value === "string" ? value : JSON.stringify(value));
    },
    async setJSON(key, value) {
      map.set(key, JSON.stringify(value));
    },
    async delete(key) {
      map.delete(key);
    },
    async list({ prefix } = {}) {
      const blobs = [];
      for (const key of map.keys()) {
        if (prefix && !key.startsWith(prefix)) continue;
        blobs.push({ key });
      }
      return { blobs };
    },
  };
}
