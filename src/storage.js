import { defaultMeta, normalizeMeta } from "./meta.js";

export { defaultMeta };

const KEY = "dungeon-maker-v2-meta";
const LEGACY_KEY = "dungeon-maker-v0-meta";

export function loadMeta() {
  try {
    const raw = localStorage.getItem(KEY) ?? localStorage.getItem(LEGACY_KEY);
    if (!raw) return defaultMeta();
    return normalizeMeta(JSON.parse(raw));
  } catch {
    return defaultMeta();
  }
}

export function saveMeta(meta) {
  localStorage.setItem(KEY, JSON.stringify(meta));
}

export function bump(meta, patch) {
  const next = normalizeMeta({ ...meta, ...patch });
  saveMeta(next);
  return next;
}
