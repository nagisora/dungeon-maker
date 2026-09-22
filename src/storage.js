const KEY = "dungeon-maker-v0-meta";

export function defaultMeta() {
  return {
    runsStarted: 0,
    defensesWon: 0,
    v0Cleared: false,
  };
}

export function loadMeta() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultMeta();
    const parsed = JSON.parse(raw);
    return { ...defaultMeta(), ...parsed };
  } catch {
    return defaultMeta();
  }
}

export function saveMeta(meta) {
  localStorage.setItem(KEY, JSON.stringify(meta));
}

export function bump(meta, patch) {
  const next = { ...meta, ...patch };
  saveMeta(next);
  return next;
}
