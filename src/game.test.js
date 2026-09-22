import assert from "node:assert/strict";
import { test } from "node:test";
import {
  cellDamage,
  chooseImprove,
  createRun,
  findPath,
  placeExpand,
  placeTrap,
  placeTreasure,
  runInvadeToEnd,
  startInvade,
  waveRoster,
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
  assert.equal(state.phase, "clear");
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
  assert.equal(state.phase, "clear");
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

test("trap improve then wave 2 clear", () => {
  const state = attractOn(createRun());
  runInvadeToEnd(state);
  assert.equal(chooseImprove(state, "chip"), true);
  assert.equal(placeTrap(state, 0, 0), true);
  assert.equal(placeTreasure(state, 0, 0), true);
  runInvadeToEnd(state);
  assert.equal(state.result, "win");
  assert.equal(state.phase, "clear");
});
