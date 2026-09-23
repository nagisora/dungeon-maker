import "./style.css";
import {
  MAX_SPAN,
  PARTS,
  TREASURES,
  canAttract,
  chooseImprove,
  createRun,
  expandCandidates,
  loseHint,
  nestSize,
  openMeta,
  phaseTitle,
  placeExpand,
  placeMinion,
  placeTrap,
  placeTreasure,
  selectTreasure,
  startInvade,
  stepInvade,
  trapKind,
} from "./game.js";
import { applyOutcome, catalogParts, catalogTreasures } from "./meta.js";
import { bump, loadMeta } from "./storage.js";

const app = document.querySelector("#app");

/** @type {ReturnType<typeof createRun>} */
let state;
let meta = loadMeta();
let invadeTimer = 0;

bootRun();

function closeRun(kind) {
  if (state.persisted) return;
  if (kind === "abandon" && state.defensesThisRun === 0 && state.result == null) {
    state.persisted = true;
    return;
  }
  state.persisted = true;
  const result =
    kind === "clear" || state.phase === "clear" || (kind === "abandon" && state.result !== "lose" && state.defensesThisRun > 0)
      ? "win"
      : "lose";
  meta = bump(
    meta,
    applyOutcome(meta, {
      result,
      defensesThisRun: state.defensesThisRun,
      usedTreasures: state.usedTreasures,
      usedParts: state.usedParts,
      cleared: kind === "clear" || state.phase === "clear",
    }),
  );
}

function bootRun() {
  window.clearTimeout(invadeTimer);
  state = createRun(meta);
  render();
}

function retry() {
  window.clearTimeout(invadeTimer);
  closeRun(state.phase === "clear" ? "clear" : state.result === "lose" ? "lose" : "abandon");
  bootRun();
}

function showMeta() {
  window.clearTimeout(invadeTimer);
  closeRun(state.phase === "clear" ? "clear" : state.result === "lose" ? "lose" : "abandon");
  openMeta(state);
  render();
}

function scheduleInvade() {
  window.clearTimeout(invadeTimer);
  if (state.phase !== "invade") return;
  const delay = state.fastForward ? 70 : 480;
  invadeTimer = window.setTimeout(() => {
    stepInvade(state);
    if (state.phase === "clear") closeRun("clear");
    else if (state.result === "lose") closeRun("lose");
    render();
    if (state.phase === "invade") scheduleInvade();
  }, delay);
}

function onCellClick(x, y, ghost) {
  if (state.phase === "attract" && !ghost) {
    placeTreasure(state, x, y);
    render();
    return;
  }
  if (state.phase === "improve" && state.improveKind === "expand" && ghost) {
    placeExpand(state, x, y);
    render();
    return;
  }
  if (state.phase === "improve" && state.improveKind === "chip" && !ghost) {
    placeTrap(state, x, y, "chip");
    render();
    return;
  }
  if (state.phase === "improve" && state.improveKind === "stall" && !ghost) {
    placeTrap(state, x, y, "stall");
    render();
    return;
  }
  if (state.phase === "improve" && state.improveKind === "minion" && !ghost) {
    placeMinion(state, x, y);
    render();
  }
}

function attract() {
  if (!startInvade(state)) return;
  if (!state.runCounted) {
    state.runCounted = true;
    meta = bump(meta, { runsStarted: meta.runsStarted + 1 });
  }
  render();
  scheduleInvade();
}

function pickItem(kind) {
  chooseImprove(state, kind);
  render();
}

function currentInvader() {
  if (state.phase !== "invade") return null;
  return state.invaders[state.invaderIndex] ?? null;
}

function boardModel() {
  const ghosts =
    state.phase === "improve" && state.improveKind === "expand"
      ? expandCandidates(state.cells)
      : [];
  const all = [...state.cells, ...ghosts];
  const xs = all.map((c) => c.x);
  const ys = all.map((c) => c.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const cols = maxX - minX + 1;
  const rows = maxY - minY + 1;
  const tiles = [];
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const cell = state.cells.find((c) => c.x === x && c.y === y) ?? null;
      const ghost = !cell && ghosts.some((g) => g.x === x && g.y === y);
      tiles.push({ x, y, cell, ghost });
    }
  }
  return { cols, rows, tiles };
}

function glyphFor(cell, hasTreasure, hasInvader) {
  if (hasInvader) return TREASURES[state.treasureId]?.invaderGlyph ?? "賊";
  if (hasTreasure) return TREASURES[state.treasureId]?.glyph ?? "袋";
  if (!cell) return "＋";
  if (cell.minion) return "配";
  const trap = trapKind(cell);
  if (trap === "stall") return "止";
  if (trap === "chip") return "罠";
  if (cell.kind === "core") return "核";
  return "道";
}

function cellCaption(cell, hasTreasure) {
  if (hasTreasure) return TREASURES[state.treasureId]?.name ?? "宝";
  if (!cell) return "拡張";
  return cellLabelShort(cell);
}

function cellLabelShort(cell) {
  if (cell.minion) return "配下";
  const trap = trapKind(cell);
  if (trap === "stall") return "足止め";
  if (trap === "chip") return "削り";
  return cell.kind === "core" ? "コア" : "通路";
}

function hintText() {
  switch (state.phase) {
    case "attract":
      return state.treasure
        ? `${TREASURES[state.treasureId].name}を置いた。誘引すると侵入が自動で進む。`
        : `${TREASURES[state.treasureId].hint} マスをクリックして宝を置く。`;
    case "invade":
      return "侵入は自動進行。ログの色で波・削り・足止め・撃退を追える。";
    case "settle":
      return state.result === "lose"
        ? loseHint(state)
        : "落とし物は1つ。通路・罠・配下から選ぶ。";
    case "improve":
      return improveHint(state.improveKind);
    case "clear":
      return "周回クリア。メタに戻るか、即もう一周。";
    case "meta":
      return "周回のあいだに解放が残る。ガチャもスタミナもない。";
    default: {
      const _never = state.phase;
      return String(_never);
    }
  }
}

function improveHint(kind) {
  switch (kind) {
    case "expand":
      return "接する破線マスをクリックして通路を伸ばす。上限はおおよそ 5×5。";
    case "chip":
      return "既存のマスをクリックして削り罠を置く。コアに重ねてもよい。";
    case "stall":
      return "既存のマスをクリックして足止め罠を置く。";
    case "minion":
      return "既存のマスをクリックして配下を置く。罠と重ねられる。";
    default: {
      const _never = kind;
      return String(_never ?? "置くマスをクリック。");
    }
  }
}

function improveButtons() {
  const canExpand = expandCandidates(state.cells).length > 0;
  const kinds = state.runUnlocks.parts;
  return kinds
    .map((kind) => {
      const part = PARTS[kind];
      const disabled = kind === "expand" && !canExpand ? "disabled" : "";
      const label =
        kind === "expand" && !canExpand ? "上限まで広がった" : part.name;
      return `<button class="btn ok" data-act="${kind}" ${disabled}>${label}</button>`;
    })
    .join("");
}

function renderActions() {
  if (state.phase === "attract") {
    return `
      <div class="actions">
        <button class="btn ${canAttract(state) ? "primary" : ""}" data-act="attract" ${canAttract(state) ? "" : "disabled"}>誘引する</button>
        <button class="btn" data-act="retry">最初から</button>
        <button class="btn" data-act="meta">メタ</button>
      </div>`;
  }
  if (state.phase === "invade") {
    return `
      <div class="actions">
        <button class="btn" data-act="fast">${state.fastForward ? "通常速度" : "早送り"}</button>
        <button class="btn" data-act="retry">最初から</button>
      </div>`;
  }
  if (state.phase === "settle" && state.result === "win") {
    return `
      <p class="result win">防衛成功 — 落とし物を1つ使う</p>
      <div class="actions">${improveButtons()}</div>`;
  }
  if (state.phase === "settle" && state.result === "lose") {
    return `
      <div class="lose-box" data-lose>
        <p class="result lose">防衛失敗 — 宝を奪われた</p>
        <p class="lose-hint">${loseHint(state)}</p>
        <div class="actions">
          <button class="btn danger" data-act="retry">即再挑戦</button>
          <button class="btn" data-act="meta">メタを見る</button>
        </div>
      </div>`;
  }
  if (state.phase === "improve") {
    return `
      <div class="actions">
        <button class="btn" data-act="retry">最初から</button>
      </div>`;
  }
  if (state.phase === "clear") {
    return `
      <p class="result win">周回クリア</p>
      <div class="actions">
        <button class="btn primary" data-act="retry">もう一周</button>
        <button class="btn" data-act="meta">メタを見る</button>
      </div>`;
  }
  if (state.phase === "meta") {
    return "";
  }
  return "";
}

function bindCommonActions() {
  app.querySelector("[data-act=attract]")?.addEventListener("click", attract);
  app.querySelector("[data-act=retry]")?.addEventListener("click", retry);
  app.querySelector("[data-act=meta]")?.addEventListener("click", showMeta);
  app.querySelector("[data-act=fast]")?.addEventListener("click", () => {
    state.fastForward = !state.fastForward;
    render();
    scheduleInvade();
  });
  for (const kind of ["expand", "chip", "stall", "minion"]) {
    app.querySelector(`[data-act=${kind}]`)?.addEventListener("click", () => pickItem(kind));
  }
}

function renderMetaScreen() {
  const treasures = catalogTreasures(meta)
    .map(
      (t) => `
        <li class="catalog-item ${t.unlocked ? "on" : "off"}">
          <span class="name">${t.name}</span>
          <span class="mark">${t.unlocked ? "解放" : "未解放"}</span>
          <span class="hint">${t.hint}</span>
        </li>`,
    )
    .join("");
  const parts = catalogParts(meta)
    .map(
      (p) => `
        <li class="catalog-item ${p.unlocked ? "on" : "off"}">
          <span class="name">${p.name}</span>
          <span class="mark">${p.unlocked ? "解放" : "未解放"}</span>
          <span class="hint">${p.hint}</span>
        </li>`,
    )
    .join("");

  app.innerHTML = `
    <header class="top">
      <div>
        <span class="tag">ダンジョンメーカー直球 · v1 / v2</span>
        <h1>周回のあいだ</h1>
        <p class="sub">解放は localStorage に残る。ガチャ・スタミナ・マルチはなし。</p>
      </div>
      <div class="meta" data-meta>
        <span>周回 <b>${meta.runsStarted}</b></span>
        <span>防衛成功 <b>${meta.defensesWon}</b></span>
        <span>見識 <b>${meta.insight}</b></span>
        <span>初期拡張 <b>${meta.startingExpand}</b></span>
      </div>
    </header>
    <section class="panel meta-screen" data-phase="meta">
      <p class="hint">${hintText()}</p>
      <div class="catalog-grid">
        <div>
          <h2>宝図鑑</h2>
          <ul class="catalog">${treasures}</ul>
        </div>
        <div>
          <h2>パーツ図鑑</h2>
          <ul class="catalog">${parts}</ul>
        </div>
      </div>
      <div class="actions">
        <button class="btn primary" data-act="retry">ランを始める</button>
      </div>
    </section>
  `;
  bindCommonActions();
}

function render() {
  if (state.phase === "meta") {
    renderMetaScreen();
    return;
  }

  const board = boardModel();
  const inv = currentInvader();
  const size = nestSize(state.cells);
  const treasures = Object.values(TREASURES)
    .map((t) => {
      const selected = t.id === state.treasureId;
      const locked = !state.runUnlocks.treasures.includes(t.id);
      const disabled = locked || state.phase !== "attract";
      return `
        <button class="treasure" type="button"
          ${disabled ? "disabled" : ""}
          aria-pressed="${selected}"
          data-treasure="${t.id}">
          <span class="name">${t.name}</span>
          <span class="mark">${locked ? "未解放" : "使用可"}</span>
        </button>`;
    })
    .join("");

  const tiles = board.tiles
    .map(({ x, y, cell, ghost }) => {
      if (!cell && !ghost) {
        return `<div class="cell spacer" aria-hidden="true"></div>`;
      }
      const hasTreasure = state.treasure?.x === x && state.treasure?.y === y;
      const hasInvader = inv?.pos?.x === x && inv?.pos?.y === y;
      const trap = trapKind(cell);
      const classes = [
        "cell",
        cell?.kind ?? "",
        trap ? `trap ${trap}` : "",
        cell?.minion ? "minion" : "",
        ghost ? "ghost" : "",
        hasTreasure ? "has-treasure" : "",
        hasInvader ? "has-invader" : "",
      ]
        .filter(Boolean)
        .join(" ");
      const clickable =
        (state.phase === "attract" && cell) ||
        (state.phase === "improve" && state.improveKind === "expand" && ghost) ||
        (state.phase === "improve" && state.improveKind !== "expand" && cell);
      const label = ghost ? "拡張" : cell ? cellLabelShort(cell) : "";
      return `
        <button class="${classes}" type="button"
          data-cell="${x},${y}" ${ghost ? "data-ghost=1" : ""}
          ${clickable ? "" : "disabled"}
          aria-label="${x},${y} ${label}">
          <span class="glyph">${glyphFor(cell, hasTreasure, hasInvader)}</span>
          <span class="label">${cellCaption(cell, hasTreasure)}</span>
        </button>`;
    })
    .join("");

  const logs =
    state.log.length === 0
      ? `<li class="tone-note">まだ侵入はない。宝を置いて誘引しよう。</li>`
      : state.log
          .map((line) => `<li class="tone-${line.tone}">${line.text}</li>`)
          .join("");

  const invaderNow = inv
    ? `<div class="invader-now" data-invader>${inv.name}　残HP <b>${Math.max(0, inv.hp)}</b>/${inv.maxHp}${inv.stalled ? "　足止め中" : ""}</div>`
    : "";

  app.innerHTML = `
    <header class="top">
      <div>
        <span class="tag">ダンジョンメーカー直球 · v1 / v2</span>
        <h1>自分がダンジョン側</h1>
        <p class="sub">宝を置いて侵入を迎える。道中イベントなし。失敗したら即リトライ。</p>
      </div>
      <div class="meta" data-meta>
        <span>周回 <b>${meta.runsStarted}</b></span>
        <span>防衛成功 <b>${meta.defensesWon}</b></span>
        <span>見識 <b>${meta.insight}</b></span>
        <span>初期拡張 <b>${meta.startingExpand}</b></span>
      </div>
    </header>
    <div class="layout">
      <section class="panel" data-phase="${state.phase}">
        <div class="phase-row">
          <h2>巣穴 ${size.w}×${size.h}（${size.count}マス）／上限 ${MAX_SPAN}×${MAX_SPAN}</h2>
          <span class="phase-pill">フェーズ：${phaseTitle(state.phase)} · 第${state.wave}波</span>
        </div>
        <p class="hint">${hintText()}</p>
        <div class="treasures">${treasures}</div>
        <div class="board-wrap">
          <div class="board" style="grid-template-columns: repeat(${board.cols}, 76px)">${tiles}</div>
        </div>
        ${renderActions()}
        <div class="howto">
          <strong>まわり方</strong>
          <ol>
            <li>宝を選んで置き、誘引する。宝の種類で侵入者が変わる。</li>
            <li>守り切ったら通路・足止め・削り・配下のどれかを1つ置く。巣穴はおよそ 5×5 まで。</li>
            <li>王冠を守り切るか第6波まで持つと周回クリア。失敗は即再挑戦。解放はメタに残る。</li>
          </ol>
        </div>
      </section>
      <aside class="panel">
        <h2>侵入ログ</h2>
        ${invaderNow}
        <ul class="log" data-log>${logs}</ul>
      </aside>
    </div>
  `;

  bindCommonActions();
  app.querySelectorAll("[data-treasure]").forEach((btn) => {
    btn.addEventListener("click", () => {
      selectTreasure(state, btn.getAttribute("data-treasure"));
      render();
    });
  });
  app.querySelectorAll("[data-cell]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const [x, y] = btn.getAttribute("data-cell").split(",").map(Number);
      onCellClick(x, y, btn.hasAttribute("data-ghost"));
    });
  });

  const logEl = app.querySelector("[data-log]");
  if (logEl) logEl.scrollTop = logEl.scrollHeight;
}
