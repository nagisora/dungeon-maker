import assert from "node:assert/strict";
import { test } from "node:test";
import { applyOutcome, catalogParts, catalogTreasures, defaultMeta, evaluateUnlocks, normalizeMeta } from "./meta.js";

test("fresh meta only has copper, expand, and chip", () => {
  const meta = defaultMeta();
  assert.deepEqual(meta.unlockedTreasures, ["copper"]);
  assert.deepEqual(meta.unlockedParts, ["expand", "chip"]);
  assert.equal(meta.startingExpand, 0);
});

test("one defense win unlocks sword and stall", () => {
  const meta = evaluateUnlocks({ ...defaultMeta(), defensesWon: 1, insight: 3 });
  assert.equal(meta.unlockedTreasures.includes("sword"), true);
  assert.equal(meta.unlockedParts.includes("stall"), true);
  assert.equal(meta.unlockedTreasures.includes("crown"), false);
});

test("two wins add grimoire, minion, and a starting expand", () => {
  const meta = evaluateUnlocks({ ...defaultMeta(), defensesWon: 2, insight: 6 });
  assert.equal(meta.unlockedTreasures.includes("grimoire"), true);
  assert.equal(meta.unlockedParts.includes("minion"), true);
  assert.equal(meta.startingExpand, 1);
});

test("four wins unlock the crown; five wins raise starting expand", () => {
  const four = evaluateUnlocks({ ...defaultMeta(), defensesWon: 4, insight: 10 });
  assert.equal(four.unlockedTreasures.includes("crown"), true);
  assert.equal(four.startingExpand, 1);
  const five = evaluateUnlocks({ ...defaultMeta(), defensesWon: 5, insight: 12 });
  assert.equal(five.startingExpand, 2);
});

test("losing still grants insight and can unlock slowly", () => {
  let meta = defaultMeta();
  meta = applyOutcome(meta, { result: "lose", defensesThisRun: 0 });
  assert.equal(meta.insight, 1);
  assert.equal(meta.runsFinished, 1);
  meta = applyOutcome(meta, { result: "lose", defensesThisRun: 0 });
  assert.equal(meta.unlockedTreasures.includes("sword"), true);
});

test("a winning run persists used catalog entries and v1 clear", () => {
  const meta = applyOutcome(defaultMeta(), {
    result: "win",
    defensesThisRun: 4,
    usedTreasures: ["copper", "crown"],
    usedParts: ["expand", "minion"],
    cleared: true,
  });
  assert.equal(meta.v1Cleared, true);
  assert.equal(meta.v0Cleared, true);
  assert.equal(meta.seenTreasures.includes("crown"), true);
  assert.equal(meta.unlockedTreasures.includes("crown"), true);
});

test("v0 localStorage payload migrates into unlocks", () => {
  const meta = normalizeMeta({
    runsStarted: 3,
    defensesWon: 2,
    v0Cleared: true,
  });
  assert.equal(meta.runsStarted, 3);
  assert.equal(meta.unlockedTreasures.includes("sword"), true);
  assert.equal(meta.unlockedParts.includes("stall"), true);
  assert.equal(meta.startingExpand >= 1, true);
});

test("catalog lists every treasure and part with lock flags", () => {
  const meta = defaultMeta();
  const treasures = catalogTreasures(meta);
  assert.equal(treasures.length, 4);
  assert.equal(treasures[0].unlocked, true);
  assert.equal(treasures[3].unlocked, false);
  const parts = catalogParts(meta);
  assert.equal(parts.length, 4);
  assert.equal(parts.find((p) => p.id === "minion")?.unlocked, false);
});
