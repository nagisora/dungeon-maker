/** @typedef {'attract' | 'invade' | 'settle' | 'improve' | 'clear'} Phase */
/** @typedef {'expand' | 'chip'} ImproveKind */
/** @typedef {'core' | 'path'} CellKind */

export const COPPER = "copper";

export const TREASURES = {
  copper: { id: COPPER, name: "銅貨袋", hint: "弱い盗賊が寄ってくる。v0の唯一の宝。" },
  sword: { id: "sword", name: "魔剣", locked: true },
  grimoire: { id: "grimoire", name: "呪文書", locked: true },
  crown: { id: "crown", name: "王冠", locked: true },
};

const DIRS = [
  [0, 1],
  [0, -1],
  [1, 0],
  [-1, 0],
];

export function cellKey(x, y) {
  return `${x},${y}`;
}

function same(a, b) {
  return a != null && b != null && a.x === b.x && a.y === b.y;
}

export function createRun() {
  return {
    wave: 1,
    maxWave: 2,
    cells: [{ x: 0, y: 0, kind: "core", trap: false }],
    treasure: null,
    treasureId: COPPER,
    phase: /** @type {Phase} */ ("attract"),
    improveKind: /** @type {ImproveKind | null} */ (null),
    log: [],
    invaders: [],
    invaderIndex: 0,
    result: /** @type {'win' | 'lose' | null} */ (null),
    fastForward: false,
  };
}

export function getCell(state, pos) {
  return state.cells.find((c) => c.x === pos.x && c.y === pos.y) ?? null;
}

export function ownedSet(cells) {
  return new Set(cells.map((c) => cellKey(c.x, c.y)));
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

export function placeExpand(state, x, y) {
  if (state.phase !== "improve" || state.improveKind !== "expand") return false;
  const allowed = expandCandidates(state.cells);
  if (!allowed.some((c) => c.x === x && c.y === y)) return false;
  state.cells.push({ x, y, kind: "path", trap: false });
  finishImprove(state);
  return true;
}

export function placeTrap(state, x, y) {
  if (state.phase !== "improve" || state.improveKind !== "chip") return false;
  const cell = getCell(state, { x, y });
  if (!cell) return false;
  cell.trap = true;
  finishImprove(state);
  return true;
}

function finishImprove(state) {
  state.improveKind = null;
  state.treasure = null;
  state.wave += 1;
  state.phase = "attract";
  pushLog(state, "巣穴を整えた。次の銅貨袋を置いて、もう一度誘引しよう。");
}

export function chooseImprove(state, kind) {
  if (state.phase !== "settle" || state.result !== "win") return false;
  if (kind !== "expand" && kind !== "chip") {
    const _exhaustive = kind;
    void _exhaustive;
    return false;
  }
  state.improveKind = kind;
  state.phase = "improve";
  if (kind === "expand") {
    pushLog(state, "拡張の石を使った。コアに接する空マスをクリック。");
  } else {
    pushLog(state, "削り罠を手に入れた。置くマスをクリック。");
  }
  return true;
}

export function cellDamage(cell) {
  if (!cell) return 0;
  let damage = cell.kind === "core" ? 3 : 1;
  if (cell.trap) damage += 3;
  return damage;
}

export function cellLabel(cell) {
  if (!cell) return "虚空";
  const bits = [];
  bits.push(cell.kind === "core" ? "コア" : "通路");
  if (cell.trap) bits.push("削り罠");
  return bits.join("＋");
}

export function waveRoster(wave) {
  if (wave <= 1) {
    return [{ name: "盗賊", maxHp: 2 }];
  }
  return [
    { name: "盗賊A", maxHp: 4 },
    { name: "盗賊B", maxHp: 4 },
  ];
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

export function pushLog(state, text) {
  state.log.push(text);
}

export function canAttract(state) {
  return state.phase === "attract" && state.treasure != null;
}

export function startInvade(state) {
  if (!canAttract(state) || state.treasure == null) return false;
  const entrance = pickEntrance(state.cells, state.treasure);
  const path = findPath(state.cells, entrance, state.treasure);
  if (path.length === 0) return false;

  const roster = waveRoster(state.wave);
  state.invaders = roster.map((unit) => ({
    name: unit.name,
    maxHp: unit.maxHp,
    hp: unit.maxHp,
    path,
    pathIndex: -1,
    pos: null,
  }));
  state.invaderIndex = 0;
  state.result = null;
  state.phase = "invade";
  const treasureName = TREASURES[state.treasureId]?.name ?? "宝";
  pushLog(
    state,
    `—— 第${state.wave}波 —— ${roster.map((u) => u.name).join("・")}が${treasureName}を狙って侵入する`,
  );
  return true;
}

function currentInvader(state) {
  return state.invaders[state.invaderIndex] ?? null;
}

function defeatCurrent(state, inv) {
  pushLog(state, `${inv.name}を撃退した。`);
  state.invaderIndex += 1;
  if (state.invaderIndex >= state.invaders.length) {
    finishWin(state);
  } else {
    pushLog(state, `次の侵入者、${state.invaders[state.invaderIndex].name}が続く。`);
  }
}

function finishWin(state) {
  state.result = "win";
  if (state.wave >= state.maxWave) {
    state.phase = "clear";
    pushLog(state, "防衛成功。v0の周回を守り切った。");
  } else {
    state.phase = "settle";
    pushLog(state, "防衛成功。落とし物で巣穴を整えられる。");
  }
}

function finishLose(state, inv) {
  state.result = "lose";
  state.phase = "settle";
  const treasureName = TREASURES[state.treasureId]?.name ?? "宝";
  pushLog(state, `${inv.name}が${treasureName}を掴んで逃げた。防衛失敗。`);
}

export function stepInvade(state) {
  if (state.phase !== "invade") return false;
  const inv = currentInvader(state);
  if (!inv) {
    finishWin(state);
    return true;
  }

  const path = inv.path;
  if (inv.pathIndex < path.length - 1) {
    inv.pathIndex += 1;
    inv.pos = path[inv.pathIndex];
    const cell = getCell(state, inv.pos);
    const dmg = cellDamage(cell);
    inv.hp -= dmg;
    const where = cellLabel(cell);
    const justEntered = inv.pathIndex === 0;
    const verb = justEntered ? "踏み入った" : "進んだ";
    pushLog(
      state,
      `${inv.name}が${where}へ${verb}。${dmg}ダメージ（残HP ${Math.max(0, inv.hp)}/${inv.maxHp}）`,
    );
    if (inv.hp <= 0) {
      defeatCurrent(state, inv);
    }
    return true;
  }

  finishLose(state, inv);
  return true;
}

export function runInvadeToEnd(state) {
  if (state.phase === "attract") startInvade(state);
  let guard = 0;
  while (state.phase === "invade" && guard < 200) {
    stepInvade(state);
    guard += 1;
  }
  return state;
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
    default: {
      const _never = phase;
      return String(_never);
    }
  }
}
