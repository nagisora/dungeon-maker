/** @typedef {'attract' | 'invade' | 'settle' | 'improve' | 'clear' | 'meta'} Phase */
/** @typedef {'expand' | 'chip' | 'stall' | 'minion'} ImproveKind */
/** @typedef {'core' | 'path'} CellKind */
/** @typedef {'copper' | 'sword' | 'grimoire' | 'crown'} TreasureId */
/** @typedef {'wave' | 'step' | 'stall' | 'ko' | 'win' | 'lose' | 'note'} LogTone */

export const COPPER = "copper";
export const MAX_SPAN = 5;
export const MAX_CELLS = MAX_SPAN * MAX_SPAN;
export const MAX_WAVES = 6;

export const PARTS = {
  expand: { id: "expand", name: "通路", hint: "隣接マスを広げ、歩数で消耗させる。" },
  chip: { id: "chip", name: "削り罠", hint: "踏んだ侵入者の体力を削る。" },
  stall: { id: "stall", name: "足止め罠", hint: "そのマスに一拍留め、もう一度削る。" },
  minion: { id: "minion", name: "配下", hint: "番人。踏んだ侵入者に追加ダメージ。" },
};

export const TREASURES = {
  copper: {
    id: COPPER,
    name: "銅貨袋",
    hint: "弱い盗賊が寄ってくる。安全、報酬少。",
    glyph: "袋",
    invaderGlyph: "賊",
  },
  sword: {
    id: "sword",
    name: "魔剣",
    hint: "戦士が寄る。通路と削りが欲しい。",
    glyph: "剣",
    invaderGlyph: "戦",
  },
  grimoire: {
    id: "grimoire",
    name: "呪文書",
    hint: "魔法使い。罠を解きがち。",
    glyph: "書",
    invaderGlyph: "術",
  },
  crown: {
    id: "crown",
    name: "王冠",
    hint: "精鋭パーティ。高報酬・高圧。",
    glyph: "冠",
    invaderGlyph: "精",
  },
};

const DIRS = [
  [0, 1],
  [0, -1],
  [1, 0],
  [-1, 0],
];

const START_PARTS = /** @type {ImproveKind[]} */ (["expand", "chip"]);
const START_TREASURES = /** @type {TreasureId[]} */ ([COPPER]);

export function cellKey(x, y) {
  return `${x},${y}`;
}

function same(a, b) {
  return a != null && b != null && a.x === b.x && a.y === b.y;
}

function unique(ids) {
  return [...new Set(ids)];
}

function emptyCell(x, y, kind) {
  return { x, y, kind, trap: /** @type {null | 'chip' | 'stall'} */ (null), minion: false };
}

export function createRun(meta = null) {
  const treasures = unique([
    ...START_TREASURES,
    ...((meta?.unlockedTreasures ?? [])),
  ]);
  const parts = unique([
    ...START_PARTS,
    ...((meta?.unlockedParts ?? [])),
  ]);

  const state = {
    wave: 1,
    maxWave: MAX_WAVES,
    cells: [emptyCell(0, 0, "core")],
    treasure: null,
    treasureId: /** @type {TreasureId} */ (COPPER),
    phase: /** @type {Phase} */ ("attract"),
    improveKind: /** @type {ImproveKind | null} */ (null),
    log: /** @type {{ text: string, tone: LogTone }[]} */ ([]),
    invaders: [],
    invaderIndex: 0,
    result: /** @type {'win' | 'lose' | null} */ (null),
    fastForward: false,
    runUnlocks: { treasures, parts },
    defensesThisRun: 0,
    usedTreasures: /** @type {TreasureId[]} */ ([]),
    usedParts: /** @type {ImproveKind[]} */ ([]),
    persisted: false,
    runCounted: false,
  };

  const starting = meta?.startingExpand ?? 0;
  if (starting > 0) applyStartingExpand(state, starting);
  return state;
}

export function applyStartingExpand(state, count) {
  let placed = 0;
  for (let i = 0; i < count; i += 1) {
    const next = expandCandidates(state.cells)[0];
    if (!next) break;
    state.cells.push(emptyCell(next.x, next.y, "path"));
    placed += 1;
  }
  return placed;
}

export function getCell(state, pos) {
  return state.cells.find((c) => c.x === pos.x && c.y === pos.y) ?? null;
}

export function ownedSet(cells) {
  return new Set(cells.map((c) => cellKey(c.x, c.y)));
}

export function nestSize(cells) {
  const xs = cells.map((c) => c.x);
  const ys = cells.map((c) => c.y);
  return {
    w: Math.max(...xs) - Math.min(...xs) + 1,
    h: Math.max(...ys) - Math.min(...ys) + 1,
    count: cells.length,
  };
}

export function wouldFit(cells, x, y) {
  if (cells.length >= MAX_CELLS) return false;
  const xs = cells.map((c) => c.x);
  const ys = cells.map((c) => c.y);
  const w = Math.max(...xs, x) - Math.min(...xs, x) + 1;
  const h = Math.max(...ys, y) - Math.min(...ys, y) + 1;
  return w <= MAX_SPAN && h <= MAX_SPAN;
}

export function expandCandidates(cells) {
  const owned = ownedSet(cells);
  const seen = new Set();
  const out = [];
  for (const cell of cells) {
    for (const [dx, dy] of DIRS) {
      const x = cell.x + dx;
      const y = cell.y + dy;
      const k = cellKey(x, y);
      if (owned.has(k) || seen.has(k)) continue;
      if (!wouldFit(cells, x, y)) continue;
      seen.add(k);
      out.push({ x, y });
    }
  }
  return out;
}

export function placeTreasure(state, x, y) {
  if (state.phase !== "attract") return false;
  if (!getCell(state, { x, y })) return false;
  state.treasure = { x, y };
  return true;
}

export function selectTreasure(state, id) {
  if (state.phase !== "attract") return false;
  if (!state.runUnlocks.treasures.includes(id)) return false;
  if (!(id in TREASURES)) return false;
  state.treasureId = id;
  return true;
}

export function isPartUnlocked(state, kind) {
  return state.runUnlocks.parts.includes(kind);
}

export function placeExpand(state, x, y) {
  if (state.phase !== "improve" || state.improveKind !== "expand") return false;
  const allowed = expandCandidates(state.cells);
  if (!allowed.some((c) => c.x === x && c.y === y)) return false;
  state.cells.push(emptyCell(x, y, "path"));
  state.usedParts = unique([...state.usedParts, "expand"]);
  finishImprove(state);
  return true;
}

export function placeTrap(state, x, y, kind = "chip") {
  if (kind !== "chip" && kind !== "stall") return false;
  if (state.phase !== "improve" || state.improveKind !== kind) return false;
  const cell = getCell(state, { x, y });
  if (!cell || trapKind(cell)) return false;
  cell.trap = kind;
  state.usedParts = unique([...state.usedParts, kind]);
  finishImprove(state);
  return true;
}

export function placeMinion(state, x, y) {
  if (state.phase !== "improve" || state.improveKind !== "minion") return false;
  const cell = getCell(state, { x, y });
  if (!cell || cell.minion) return false;
  cell.minion = true;
  state.usedParts = unique([...state.usedParts, "minion"]);
  finishImprove(state);
  return true;
}

function finishImprove(state) {
  state.improveKind = null;
  state.treasure = null;
  state.wave += 1;
  state.phase = "attract";
  pushLog(state, "巣穴を整えた。次の宝を置いて、もう一度誘引しよう。");
}

export function chooseImprove(state, kind) {
  if (state.phase !== "settle" || state.result !== "win") return false;
  if (!isPartUnlocked(state, kind)) return false;
  if (kind === "expand" && expandCandidates(state.cells).length === 0) return false;

  switch (kind) {
    case "expand":
      state.improveKind = kind;
      state.treasure = null;
      state.phase = "improve";
      pushLog(state, "通路を伸ばす。コアに接する空マスをクリック。");
      return true;
    case "chip":
      state.improveKind = kind;
      state.treasure = null;
      state.phase = "improve";
      pushLog(state, "削り罠を手に入れた。置くマスをクリック。");
      return true;
    case "stall":
      state.improveKind = kind;
      state.treasure = null;
      state.phase = "improve";
      pushLog(state, "足止め罠を手に入れた。置くマスをクリック。");
      return true;
    case "minion":
      state.improveKind = kind;
      state.treasure = null;
      state.phase = "improve";
      pushLog(state, "配下を置ける。番人にするマスをクリック。");
      return true;
    default: {
      const _never = kind;
      void _never;
      return false;
    }
  }
}

export function trapKind(cell) {
  if (!cell) return null;
  if (cell.trap === true || cell.trap === "chip") return "chip";
  if (cell.trap === "stall") return "stall";
  return null;
}

export function cellDamage(cell, invader = null) {
  if (!cell) return 0;
  let damage = cell.kind === "core" ? 3 : 1;
  const resist = invader?.trapResist ?? 0;
  if (trapKind(cell) === "chip") {
    damage += Math.round(3 * (1 - resist));
  }
  if (cell.minion) damage += 4;
  return damage;
}

export function cellLabel(cell) {
  if (!cell) return "虚空";
  const bits = [];
  bits.push(cell.kind === "core" ? "コア" : "通路");
  const trap = trapKind(cell);
  if (trap === "chip") bits.push("削り罠");
  if (trap === "stall") bits.push("足止め罠");
  if (cell.minion) bits.push("配下");
  return bits.join("＋");
}

export function skipsStall(invader) {
  return (invader?.trapResist ?? 0) >= 0.5;
}

function copperRoster(wave) {
  if (wave <= 1) {
    return [{ name: "盗賊", maxHp: 2, trapResist: 0, kind: "thief" }];
  }
  if (wave === 2) {
    return [
      { name: "盗賊A", maxHp: 4, trapResist: 0, kind: "thief" },
      { name: "盗賊B", maxHp: 4, trapResist: 0, kind: "thief" },
    ];
  }
  return [
    { name: "盗賊頭", maxHp: 3 + wave, trapResist: 0, kind: "thief" },
    { name: "盗賊", maxHp: 3 + wave, trapResist: 0, kind: "thief" },
  ];
}

function swordRoster(wave) {
  const unit = { name: "戦士", maxHp: 6 + wave * 2, trapResist: 0, kind: "warrior" };
  if (wave >= 4) {
    return [
      { ...unit, name: "戦士A" },
      { ...unit, name: "戦士B", maxHp: unit.maxHp - 2 },
    ];
  }
  return [unit];
}

function grimoireRoster(wave) {
  return [{ name: "魔法使い", maxHp: 4 + wave, trapResist: 0.7, kind: "mage" }];
}

function crownRoster(wave) {
  return [
    { name: "精鋭戦士", maxHp: 7 + wave, trapResist: 0, kind: "warrior" },
    { name: "精鋭術師", maxHp: 5 + wave, trapResist: 0.5, kind: "mage" },
    { name: "精鋭斥候", maxHp: 4 + wave, trapResist: 0, kind: "thief" },
  ];
}

export function waveRoster(wave, treasureId = COPPER) {
  switch (treasureId) {
    case "copper":
      return copperRoster(wave);
    case "sword":
      return swordRoster(wave);
    case "grimoire":
      return grimoireRoster(wave);
    case "crown":
      return crownRoster(wave);
    default: {
      const _never = treasureId;
      void _never;
      return copperRoster(wave);
    }
  }
}

export function pickEntrance(cells, treasure) {
  const others = cells.filter((c) => !same(c, treasure));
  const pool = others.length > 0 ? others : cells;
  return [...pool].sort((a, b) => {
    const da = Math.abs(a.x - treasure.x) + Math.abs(a.y - treasure.y);
    const db = Math.abs(b.x - treasure.x) + Math.abs(b.y - treasure.y);
    if (db !== da) return db - da;
    if (a.y !== b.y) return a.y - b.y;
    return a.x - b.x;
  })[0];
}

export function findPath(cells, start, goal) {
  const owned = ownedSet(cells);
  const startKey = cellKey(start.x, start.y);
  const goalKey = cellKey(goal.x, goal.y);
  if (!owned.has(startKey) || !owned.has(goalKey)) return [];
  if (startKey === goalKey) return [{ x: start.x, y: start.y }];

  const q = [{ x: start.x, y: start.y }];
  const prev = new Map([[startKey, null]]);

  while (q.length > 0) {
    const cur = q.shift();
    if (!cur) break;
    if (cellKey(cur.x, cur.y) === goalKey) break;
    for (const [dx, dy] of DIRS) {
      const nx = cur.x + dx;
      const ny = cur.y + dy;
      const k = cellKey(nx, ny);
      if (!owned.has(k) || prev.has(k)) continue;
      prev.set(k, cur);
      q.push({ x: nx, y: ny });
    }
  }

  if (!prev.has(goalKey)) return [];
  const path = [{ x: goal.x, y: goal.y }];
  let cursor = prev.get(goalKey);
  while (cursor) {
    path.push({ x: cursor.x, y: cursor.y });
    cursor = prev.get(cellKey(cursor.x, cursor.y));
  }
  path.reverse();
  return path;
}

export function pushLog(state, text, tone = "note") {
  state.log.push({ text, tone });
}

export function logTexts(state) {
  return state.log.map((line) => line.text);
}

export function canAttract(state) {
  return state.phase === "attract" && state.treasure != null;
}

export function startInvade(state) {
  if (!canAttract(state) || state.treasure == null) return false;
  const entrance = pickEntrance(state.cells, state.treasure);
  const path = findPath(state.cells, entrance, state.treasure);
  if (path.length === 0) return false;

  const roster = waveRoster(state.wave, state.treasureId);
  state.invaders = roster.map((unit) => ({
    name: unit.name,
    maxHp: unit.maxHp,
    hp: unit.maxHp,
    kind: unit.kind,
    trapResist: unit.trapResist,
    path,
    pathIndex: -1,
    pos: null,
    stalled: false,
  }));
  state.invaderIndex = 0;
  state.result = null;
  state.phase = "invade";
  state.usedTreasures = unique([...state.usedTreasures, state.treasureId]);
  const treasureName = TREASURES[state.treasureId]?.name ?? "宝";
  pushLog(
    state,
    `—— 第${state.wave}波 —— ${roster.map((u) => u.name).join("・")}が${treasureName}を狙って侵入する`,
    "wave",
  );
  return true;
}

function currentInvader(state) {
  return state.invaders[state.invaderIndex] ?? null;
}

function grantWaveUnlocks(state) {
  const treasures = new Set(state.runUnlocks.treasures);
  const parts = new Set(state.runUnlocks.parts);
  if (state.wave >= 1) {
    treasures.add("sword");
    parts.add("stall");
  }
  if (state.wave >= 2) {
    treasures.add("grimoire");
    parts.add("minion");
  }
  if (state.wave >= 3) {
    treasures.add("crown");
  }
  state.runUnlocks = {
    treasures: [...treasures],
    parts: [...parts],
  };
}

function isRunClear(state) {
  return state.treasureId === "crown" || state.wave >= state.maxWave;
}

function defeatCurrent(state, inv) {
  pushLog(state, `${inv.name}を撃退した。`, "ko");
  state.invaderIndex += 1;
  if (state.invaderIndex >= state.invaders.length) {
    finishWin(state);
  } else {
    pushLog(state, `次の侵入者、${state.invaders[state.invaderIndex].name}が続く。`);
  }
}

function finishWin(state) {
  state.result = "win";
  state.defensesThisRun += 1;
  grantWaveUnlocks(state);
  if (isRunClear(state)) {
    state.phase = "clear";
    pushLog(state, "防衛成功。この周回の宝を守り切った。", "win");
  } else {
    state.phase = "settle";
    pushLog(state, "防衛成功。落とし物で巣穴を整えられる。", "win");
  }
}

function finishLose(state, inv) {
  state.result = "lose";
  state.phase = "settle";
  const treasureName = TREASURES[state.treasureId]?.name ?? "宝";
  pushLog(state, `${inv.name}が${treasureName}を掴んで逃げた。防衛失敗。`, "lose");
}

export function loseHint(state) {
  switch (state.treasureId) {
    case "sword":
      return "戦士は厚い。通路と削り罠を足して、即再挑戦。";
    case "grimoire":
      return "魔法使いは罠を解く。通路と配下で削って再挑戦。";
    case "crown":
      return "精鋭は人数が多い。5×5まで広げ、罠と配下を足して再挑戦。";
    case "copper":
      return "何も足さないと次の波に奪われやすい。拡張か罠を置いて再挑戦。";
    default: {
      const _never = state.treasureId;
      return String(_never);
    }
  }
}

function applyStepDamage(state, inv, cell, verb, tone) {
  const dmg = cellDamage(cell, inv);
  inv.hp -= dmg;
  const where = cellLabel(cell);
  pushLog(
    state,
    `${inv.name}が${where}へ${verb}。${dmg}ダメージ（残HP ${Math.max(0, inv.hp)}/${inv.maxHp}）`,
    tone,
  );
  if (inv.hp <= 0) {
    defeatCurrent(state, inv);
    return true;
  }
  return false;
}

export function stepInvade(state) {
  if (state.phase !== "invade") return false;
  const inv = currentInvader(state);
  if (!inv) {
    finishWin(state);
    return true;
  }

  if (inv.stalled && inv.pos) {
    inv.stalled = false;
    applyStepDamage(state, inv, getCell(state, inv.pos), "足止めされた", "stall");
    return true;
  }

  const path = inv.path;
  if (inv.pathIndex < path.length - 1) {
    inv.pathIndex += 1;
    inv.pos = path[inv.pathIndex];
    const cell = getCell(state, inv.pos);
    const justEntered = inv.pathIndex === 0;
    const verb = justEntered ? "踏み入った" : "進んだ";
    const dead = applyStepDamage(state, inv, cell, verb, "step");
    if (!dead && trapKind(cell) === "stall" && !skipsStall(inv)) {
      inv.stalled = true;
      pushLog(state, `${inv.name}は足止め罠にかかった。次の一歩が遅れる。`, "stall");
    }
    return true;
  }

  finishLose(state, inv);
  return true;
}

export function runInvadeToEnd(state) {
  if (state.phase === "attract") startInvade(state);
  let guard = 0;
  while (state.phase === "invade" && guard < 400) {
    stepInvade(state);
    guard += 1;
  }
  return state;
}

export function openMeta(state) {
  state.phase = "meta";
  return true;
}

export function phaseTitle(phase) {
  switch (phase) {
    case "attract":
      return "誘引";
    case "invade":
      return "侵入";
    case "settle":
      return "精算";
    case "improve":
      return "整備";
    case "clear":
      return "精算";
    case "meta":
      return "メタ";
    default: {
      const _never = phase;
      return String(_never);
    }
  }
}
