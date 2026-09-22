import "./style.css";
import {
  TREASURES,
  canAttract,
  chooseImprove,
  createRun,
  expandCandidates,
  phaseTitle,
  placeExpand,
  placeTrap,
  placeTreasure,
  startInvade,
  stepInvade,
} from "./game.js";
import { bump, loadMeta } from "./storage.js";

const app = document.querySelector("#app");

/** @type {ReturnType<typeof createRun>} */
let state;
let meta = loadMeta();
let invadeTimer = 0;

bootRun();

function bootRun() {
  state = createRun();
  meta = bump(meta, { runsStarted: meta.runsStarted + 1 });
  render();
}

function retry() {
  window.clearTimeout(invadeTimer);
  bootRun();
}

function scheduleInvade() {
  window.clearTimeout(invadeTimer);
  if (state.phase !== "invade") return;
  const delay = state.fastForward ? 70 : 480;
  invadeTimer = window.setTimeout(() => {
    stepInvade(state);
    if (state.phase !== "invade") {
      if (state.result === "win" || state.phase === "clear") {
        meta = bump(meta, {
          defensesWon: meta.defensesWon + 1,
          v0Cleared: meta.v0Cleared || state.phase === "clear",
        });
      }
    }
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
    placeTrap(state, x, y);
    render();
  }
}

function attract() {
  if (!startInvade(state)) return;
  render();
  scheduleInvade();
}

function pickItem(kind) {
  chooseImprove(state, kind);
  render();
}

function currentInvaderPos() {
  if (state.phase !== "invade") return null;
  return state.invaders[state.invaderIndex]?.pos ?? null;
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
  if (hasInvader) return "賊";
  if (hasTreasure) return "袋";
  if (!cell) return "＋";
  if (cell.trap) return "罠";
  if (cell.kind === "core") return "核";
  return "道";
}

function hintText() {
  switch (state.phase) {
    case "attract":
      return state.treasure
        ? "宝を置いた。誘引すると盗賊が自動で踏み入る。"
        : "銅貨袋を選んだまま、マスをクリックして宝を置く。";
    case "invade":
      return "侵入は自動進行。ログを見て処理していく。";
    case "settle":
      return state.result === "lose"
        ? "失敗しても即リトライ。メタ回数だけ残る。"
        : "落とし物は1つ。拡張するか、削り罠を置くか。";
    case "improve":
      return state.improveKind === "expand"
        ? "コアに接する破線マスをクリックして巣穴を広げる。"
        : "既存のマスをクリックして削り罠を置く。コアに重ねてもよい。";
    case "clear":
      return "v0クリア。魔剣や5×5はこれから。";
    default: {
      const _never = state.phase;
      return String(_never);
    }
  }
}

function renderActions() {
  if (state.phase === "attract") {
    return `
      <div class="actions">
        <button class="btn ${canAttract(state) ? "primary" : ""}" data-act="attract" ${canAttract(state) ? "" : "disabled"}>誘引する</button>
        <button class="btn" data-act="retry">最初から</button>
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
      <div class="actions">
        <button class="btn ok" data-act="expand">巣穴を拡張する</button>
        <button class="btn ok" data-act="chip">削り罠を置く</button>
      </div>`;
  }
  if (state.phase === "settle" && state.result === "lose") {
    return `
      <p class="result lose">防衛失敗 — 宝を奪われた</p>
      <div class="actions">
        <button class="btn danger" data-act="retry">最初から</button>
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
      <p class="result win">v0 クリア</p>
      <div class="actions">
        <button class="btn primary" data-act="retry">もう一周</button>
      </div>`;
  }
  return "";
}

function render() {
  const board = boardModel();
  const invPos = currentInvaderPos();
  const treasures = Object.values(TREASURES)
    .map((t) => {
      const selected = t.id === state.treasureId;
      return `
        <button class="treasure" type="button"
          ${t.locked ? "disabled" : ""}
          aria-pressed="${selected}"
          data-treasure="${t.id}">
          <span class="name">${t.name}</span>
          <span class="mark">${t.locked ? "v1" : "v0"}</span>
        </button>`;
    })
    .join("");

  const tiles = board.tiles
    .map(({ x, y, cell, ghost }) => {
      if (!cell && !ghost) {
        return `<div class="cell spacer" aria-hidden="true"></div>`;
      }
      const hasTreasure = state.treasure?.x === x && state.treasure?.y === y;
      const hasInvader = invPos?.x === x && invPos?.y === y;
      const classes = [
        "cell",
        cell?.kind ?? "",
        cell?.trap ? "trap" : "",
        ghost ? "ghost" : "",
        hasTreasure ? "has-treasure" : "",
        hasInvader ? "has-invader" : "",
      ]
        .filter(Boolean)
        .join(" ");
      const clickable =
        (state.phase === "attract" && cell) ||
        (state.phase === "improve" && state.improveKind === "expand" && ghost) ||
        (state.phase === "improve" && state.improveKind === "chip" && cell);
      const label = ghost ? "拡張" : cell?.trap ? "罠" : cell?.kind === "core" ? "コア" : cell ? "通路" : "";
      return `
        <button class="${classes}" type="button"
          data-cell="${x},${y}" ${ghost ? "data-ghost=1" : ""}
          ${clickable ? "" : "disabled"}
          aria-label="${x},${y} ${label}">
          <span class="glyph">${glyphFor(cell, hasTreasure, hasInvader)}</span>
          <span class="label">${hasTreasure ? "銅貨袋" : label}</span>
        </button>`;
    })
    .join("");

  const logs =
    state.log.length === 0
      ? "<li>まだ侵入はない。宝を置いて誘引しよう。</li>"
      : state.log.map((line) => `<li>${line}</li>`).join("");

  app.innerHTML = `
    <header class="top">
      <div>
        <span class="tag">ダンジョンメーカー直球 · v0</span>
        <h1>自分がダンジョン側</h1>
        <p class="sub">宝を置いて侵入を迎える。道中イベントなし。失敗したら即リトライ。</p>
      </div>
      <div class="meta" data-meta>
        <span>周回 <b>${meta.runsStarted}</b></span>
        <span>防衛成功 <b>${meta.defensesWon}</b></span>
        <span>v0達成 <b>${meta.v0Cleared ? "済" : "未"}</b></span>
      </div>
    </header>
    <div class="layout">
      <section class="panel" data-phase="${state.phase}">
        <div class="phase-row">
          <h2>巣穴</h2>
          <span class="phase-pill">フェーズ：${phaseTitle(state.phase)} · 第${state.wave}波</span>
        </div>
        <p class="hint">${hintText()}</p>
        <div class="treasures">${treasures}</div>
        <div class="board-wrap">
          <div class="board" style="grid-template-columns: repeat(${board.cols}, 76px)">${tiles}</div>
        </div>
        ${renderActions()}
        <div class="howto">
          <strong>v0のまわり方</strong>
          <ol>
            <li>1×1コアに銅貨袋を置いて誘引する（弱い盗賊）。</li>
            <li>防衛できたら、拡張か削り罠を1つ置く。</li>
            <li>もう一度誘引する。何も足さないと第2波に宝を奪われる。</li>
          </ol>
        </div>
      </section>
      <aside class="panel">
        <h2>侵入ログ</h2>
        <ul class="log" data-log>${logs}</ul>
      </aside>
    </div>
  `;

  app.querySelector("[data-act=attract]")?.addEventListener("click", attract);
  app.querySelector("[data-act=retry]")?.addEventListener("click", retry);
  app.querySelector("[data-act=fast]")?.addEventListener("click", () => {
    state.fastForward = !state.fastForward;
    render();
    scheduleInvade();
  });
  app.querySelector("[data-act=expand]")?.addEventListener("click", () => pickItem("expand"));
  app.querySelector("[data-act=chip]")?.addEventListener("click", () => pickItem("chip"));
  app.querySelectorAll("[data-cell]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const [x, y] = btn.getAttribute("data-cell").split(",").map(Number);
      onCellClick(x, y, btn.hasAttribute("data-ghost"));
    });
  });

  const logEl = app.querySelector("[data-log]");
  if (logEl) logEl.scrollTop = logEl.scrollHeight;
}
