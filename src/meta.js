import { COPPER, PARTS, TREASURES } from "./game.js";

export const TREASURE_ORDER = /** @type {const} */ (["copper", "sword", "grimoire", "crown"]);
export const PART_ORDER = /** @type {const} */ (["expand", "chip", "stall", "minion"]);

export function defaultMeta() {
  return {
    runsStarted: 0,
    runsFinished: 0,
    defensesWon: 0,
    insight: 0,
    v0Cleared: false,
    v1Cleared: false,
    unlockedTreasures: [COPPER],
    unlockedParts: ["expand", "chip"],
    startingExpand: 0,
    seenTreasures: [COPPER],
    seenParts: ["expand", "chip"],
  };
}

function unique(ids) {
  return [...new Set(ids)];
}

/**
 * 見識と防衛成功数から永続解放を再計算する。
 * 失敗でも insight は増えるので、負け続きでも少し進む。
 */
export function evaluateUnlocks(meta) {
  const next = { ...meta };
  const treasures = new Set(next.unlockedTreasures ?? [COPPER]);
  const parts = new Set(next.unlockedParts ?? ["expand", "chip"]);
  treasures.add(COPPER);
  parts.add("expand");
  parts.add("chip");

  const wins = next.defensesWon ?? 0;
  const insight = next.insight ?? 0;

  if (wins >= 1 || insight >= 2 || next.v0Cleared) {
    treasures.add("sword");
    parts.add("stall");
  }
  if (wins >= 2 || insight >= 5 || next.v1Cleared) {
    treasures.add("grimoire");
    parts.add("minion");
  }
  if (wins >= 4 || insight >= 8 || next.v1Cleared) {
    treasures.add("crown");
  }

  let starting = next.startingExpand ?? 0;
  if (wins >= 2) starting = Math.max(starting, 1);
  if (wins >= 5) starting = Math.max(starting, 2);
  next.startingExpand = starting;

  next.unlockedTreasures = TREASURE_ORDER.filter((id) => treasures.has(id));
  next.unlockedParts = PART_ORDER.filter((id) => parts.has(id));
  next.seenTreasures = unique([...(next.seenTreasures ?? []), ...next.unlockedTreasures]);
  next.seenParts = unique([...(next.seenParts ?? []), ...next.unlockedParts]);
  return next;
}

export function normalizeMeta(raw) {
  const base = defaultMeta();
  if (!raw || typeof raw !== "object") return evaluateUnlocks(base);

  const merged = {
    ...base,
    ...raw,
    unlockedTreasures: unique([COPPER, ...(raw.unlockedTreasures ?? [])]),
    unlockedParts: unique(["expand", "chip", ...(raw.unlockedParts ?? [])]),
    seenTreasures: unique([COPPER, ...(raw.seenTreasures ?? [])]),
    seenParts: unique(["expand", "chip", ...(raw.seenParts ?? [])]),
  };

  if (merged.v0Cleared) {
    merged.defensesWon = Math.max(merged.defensesWon, 2);
  }
  return evaluateUnlocks(merged);
}

/**
 * @param {ReturnType<typeof defaultMeta>} meta
 * @param {{
 *   result: 'win' | 'lose' | null,
 *   defensesThisRun: number,
 *   usedTreasures?: string[],
 *   usedParts?: string[],
 *   cleared?: boolean,
 * }} outcome
 */
export function applyOutcome(meta, outcome) {
  const next = { ...normalizeMeta(meta) };
  next.runsFinished += 1;
  next.defensesWon += outcome.defensesThisRun ?? 0;
  next.insight += (outcome.result === "win" ? 2 : 1) + (outcome.defensesThisRun ?? 0);
  if (outcome.cleared) next.v1Cleared = true;
  if ((outcome.defensesThisRun ?? 0) >= 2) next.v0Cleared = true;
  next.seenTreasures = unique([
    ...next.seenTreasures,
    ...(outcome.usedTreasures ?? []),
  ]);
  next.seenParts = unique([
    ...next.seenParts,
    ...(outcome.usedParts ?? []),
  ]);
  return evaluateUnlocks(next);
}

export function catalogTreasures(meta) {
  return TREASURE_ORDER.map((id) => ({
    ...TREASURES[id],
    unlocked: meta.unlockedTreasures.includes(id),
    seen: meta.seenTreasures.includes(id),
  }));
}

export function catalogParts(meta) {
  return PART_ORDER.map((id) => ({
    ...PARTS[id],
    unlocked: meta.unlockedParts.includes(id),
    seen: meta.seenParts.includes(id),
  }));
}
