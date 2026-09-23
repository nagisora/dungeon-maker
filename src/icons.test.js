import assert from "node:assert/strict";
import { test } from "node:test";
import {
  icon,
  invaderIcon,
  invaderKindFromTreasure,
  logIcon,
  partIcon,
  treasureIcon,
} from "./icons.js";

test("pixel icons render as original SVG sprites", () => {
  for (const name of ["copper", "chip", "minion", "thief", "core", "lock"]) {
    const svg = icon(name);
    assert.match(svg, /^<svg /);
    assert.match(svg, /shape-rendering="crispEdges"/);
  }
});

test("treasure, part, invader, and log icons cover the catalog", () => {
  assert.match(treasureIcon("crown"), /<svg /);
  assert.match(partIcon("stall"), /<svg /);
  assert.match(invaderIcon("mage"), /<svg /);
  assert.match(logIcon("lose"), /<svg /);
  assert.equal(invaderKindFromTreasure("grimoire"), "mage");
  assert.equal(invaderKindFromTreasure("copper"), "thief");
});
