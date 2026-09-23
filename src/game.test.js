import assert from "node:assert/strict";
import { test } from "node:test";
import {
  MAX_SPAN,
  applyStartingExpand,
  cellDamage,
  chooseImprove,
  createRun,
  expandCandidates,
  findPath,
  loseHint,
  nestSize,
  openMeta,
  placeExpand,
  placeMinion,
  placeTrap,
  placeTreasure,
  runInvadeToEnd,
  selectTreasure,
  skipsStall,
  startInvade,
  trapKind,
  waveRoster,
  wouldFit,
} from "./game.js";

function attractOn(state, x = 0, y = 0) {
  assert.equal(placeTreasure(state, x, y), true);
  return state;
}

test("wave 1 copper thieves die on the 1x1 core", () => {
  const state = attractOn(createRun());
  runInvadeToEnd(state);
  assert.equal(state.result, "win");
  assert.equal(state.phase, "settle");
  assert.equal(state.invaders[0].hp <= 0, true);
});

test("wave 2 steals on an unimproved 1x1 core", () => {
  const state = attractOn(createRun());
  state.wave = 2;
  runInvadeToEnd(state);
  assert.equal(state.result, "lose");
  assert.equal(state.phase, "settle");
});

test("chip trap on the core beats wave 2", () => {
  const state = attractOn(createRun());
  state.cells[0].trap = true;
  state.wave = 2;
  runInvadeToEnd(state);
  assert.equal(state.result, "win");
  assert.equal(state.phase, "settle");
});

test("one expand then treasure on core beats wave 2", () => {
  const state = createRun();
  state.phase = "settle";
  state.result = "win";
  chooseImprove(state, "expand");
  assert.equal(placeExpand(state, 0, 1), true);
  assert.equal(state.wave, 2);
  assert.equal(placeTreasure(state, 0, 0), true);
  runInvadeToEnd(state);
  assert.equal(state.result, "win");
  assert.equal(state.phase, "settle");
});

test("pathfinding walks the expanded tile then the core", () => {
  const cells = [
    { x: 0, y: 0, kind: "core", trap: false },
    { x: 1, y: 0, kind: "path", trap: false },
  ];
  const path = findPath(cells, { x: 1, y: 0 }, { x: 0, y: 0 });
  assert.deepEqual(path, [
    { x: 1, y: 0 },
    { x: 0, y: 0 },
  ]);
});

test("core damage is 3, chip trap adds 3", () => {
  assert.equal(cellDamage({ kind: "core", trap: false }), 3);
  assert.equal(cellDamage({ kind: "path", trap: false }), 1);
  assert.equal(cellDamage({ kind: "core", trap: true }), 6);
  assert.equal(cellDamage({ kind: "path", trap: true }), 4);
  assert.equal(cellDamage({ kind: "path", trap: "chip", minion: true }), 8);
});

test("wave 1 is a single weak thief; wave 2 is a pair", () => {
  assert.equal(waveRoster(1).length, 1);
  assert.equal(waveRoster(1)[0].maxHp, 2);
  assert.equal(waveRoster(2).length, 2);
  assert.equal(waveRoster(2)[0].maxHp, 4);
});

test("cannot attract without placing treasure", () => {
  const state = createRun();
  assert.equal(startInvade(state), false);
  assert.equal(state.phase, "attract");
});

test("choosing improve clears the previous treasure marker", () => {
  const state = attractOn(createRun());
  runInvadeToEnd(state);
  assert.equal(state.treasure != null, true);
  chooseImprove(state, "expand");
  assert.equal(state.treasure, null);
  assert.equal(state.phase, "improve");
});

test("trap improve then wave 2 continues the run", () => {
  const state = attractOn(createRun());
  runInvadeToEnd(state);
  assert.equal(chooseImprove(state, "chip"), true);
  assert.equal(placeTrap(state, 0, 0), true);
  assert.equal(placeTreasure(state, 0, 0), true);
  runInvadeToEnd(state);
  assert.equal(state.result, "win");
  assert.equal(state.phase, "settle");
  assert.equal(state.runUnlocks.treasures.includes("grimoire"), true);
  assert.equal(state.runUnlocks.parts.includes("minion"), true);
});

test("sword warriors are tanky; copper thieves are not", () => {
  const sword = waveRoster(2, "sword");
  assert.equal(sword.length, 1);
  assert.equal(sword[0].name, "戦士");
  assert.equal(sword[0].maxHp > 8, true);
  const mage = waveRoster(2, "grimoire")[0];
  assert.equal(mage.trapResist >= 0.5, true);
  assert.equal(skipsStall(mage), true);
  const crown = waveRoster(3, "crown");
  assert.equal(crown.length, 3);
});

test("sword on an unimproved 1x1 core is stolen", () => {
  const state = attractOn(createRun());
  assert.equal(selectTreasure(state, "sword"), false);
  state.runUnlocks.treasures.push("sword");
  assert.equal(selectTreasure(state, "sword"), true);
  runInvadeToEnd(state);
  assert.equal(state.result, "lose");
  assert.match(loseHint(state), /戦士/);
});

test("mage chip resist cuts trap damage", () => {
  const mage = { trapResist: 0.7 };
  assert.equal(cellDamage({ kind: "core", trap: "chip" }, mage), 4);
  assert.equal(cellDamage({ kind: "core", trap: "chip" }), 6);
});

test("stall trap holds an invader for an extra tick", () => {
  const state = createRun();
  state.cells[0].trap = "stall";
  state.wave = 2;
  attractOn(state);
  runInvadeToEnd(state);
  assert.equal(trapKind(state.cells[0]), "stall");
  assert.equal(state.result, "win");
  assert.equal(
    state.log.some((line) => line.tone === "stall"),
    true,
  );
});

test("minion on the core beats wave 2 copper", () => {
  const state = attractOn(createRun());
  state.cells[0].minion = true;
  state.wave = 2;
  runInvadeToEnd(state);
  assert.equal(state.result, "win");
});

test("expand rejects tiles that would exceed the 5x5 cap", () => {
  const cells = [];
  for (let y = 0; y < MAX_SPAN; y += 1) {
    cells.push({ x: 0, y, kind: y === 0 ? "core" : "path", trap: null, minion: false });
  }
  assert.equal(wouldFit(cells, 0, 5), false);
  assert.equal(wouldFit(cells, 1, 0), true);
  assert.equal(
    expandCandidates(cells).some((c) => c.x === 0 && c.y === 5),
    false,
  );
  assert.equal(
    expandCandidates(cells).some((c) => c.x === 1 && c.y === 0),
    true,
  );
});

test("starting expand places a south path and nest stays 1x2", () => {
  const state = createRun();
  assert.equal(applyStartingExpand(state, 1), 1);
  assert.deepEqual(nestSize(state.cells), { w: 1, h: 2, count: 2 });
});

test("createRun applies persisted starting expand", () => {
  const state = createRun({
    unlockedTreasures: ["copper", "sword"],
    unlockedParts: ["expand", "chip", "stall"],
    startingExpand: 2,
  });
  assert.equal(state.cells.length, 3);
  assert.equal(state.runUnlocks.treasures.includes("sword"), true);
  assert.equal(state.runUnlocks.parts.includes("stall"), true);
});

test("wave 1 win unlocks sword and stall for the rest of the run", () => {
  const state = attractOn(createRun());
  runInvadeToEnd(state);
  assert.equal(state.runUnlocks.treasures.includes("sword"), true);
  assert.equal(state.runUnlocks.parts.includes("stall"), true);
  assert.equal(chooseImprove(state, "stall"), true);
  assert.equal(placeTrap(state, 0, 0, "stall"), true);
  assert.equal(state.cells[0].trap, "stall");
});

test("cannot place a second trap on the same cell", () => {
  const state = createRun();
  state.phase = "settle";
  state.result = "win";
  state.runUnlocks.parts.push("stall");
  chooseImprove(state, "chip");
  assert.equal(placeTrap(state, 0, 0, "chip"), true);
  state.phase = "settle";
  state.result = "win";
  chooseImprove(state, "stall");
  assert.equal(placeTrap(state, 0, 0, "stall"), false);
});

test("minion improve then wave 2 clear path", () => {
  const state = attractOn(createRun());
  runInvadeToEnd(state);
  state.runUnlocks.parts.push("minion");
  assert.equal(chooseImprove(state, "minion"), true);
  assert.equal(placeMinion(state, 0, 0), true);
  assert.equal(state.cells[0].minion, true);
});

test("defending the crown ends the run", () => {
  const state = createRun();
  state.runUnlocks.treasures.push("crown");
  state.cells[0].trap = "chip";
  state.cells[0].minion = true;
  applyStartingExpand(state, 4);
  for (const cell of state.cells) {
    cell.trap = "chip";
    cell.minion = true;
  }
  state.treasureId = "crown";
  attractOn(state, 0, 0);
  runInvadeToEnd(state);
  assert.equal(state.result, "win");
  assert.equal(state.phase, "clear");
});

test("wave 6 win also clears even on copper", () => {
  const state = attractOn(createRun());
  state.wave = 6;
  state.cells[0].trap = "chip";
  state.cells[0].minion = true;
  applyStartingExpand(state, 4);
  for (const cell of state.cells) {
    cell.minion = true;
    cell.trap = "chip";
  }
  runInvadeToEnd(state);
  assert.equal(state.result, "win");
  assert.equal(state.phase, "clear");
});

test("openMeta switches to the between-run screen", () => {
  const state = createRun();
  openMeta(state);
  assert.equal(state.phase, "meta");
});

test("invade log is structured with tones", () => {
  const state = attractOn(createRun());
  runInvadeToEnd(state);
  assert.equal(state.log[0].tone, "wave");
  assert.equal(
    state.log.some((line) => line.tone === "step" || line.tone === "ko"),
    true,
  );
});
