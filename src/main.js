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
import {
  icon,
  invaderIcon,
  invaderKindFromTreasure,
  logIcon,
  partIcon,
  treasureIcon,
} from "./icons.js";
import { applyOutcome, catalogParts, catalogTreasures } from "./meta.js";
import { bump, loadMeta } from "./storage.js";

const PAGE_TITLE = "ダンジョンメーカー風フォロワー";
const app = document.querySelector("#app");
document.title = PAGE_TITLE;

let meta = loadMeta();
/** @type {ReturnType<typeof createRun>} */
let state = createRun(meta);
let invadeTimer = 0;
/** @type {'title' | 'play'} */
let view = "title";

render();

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

function startPlay() {
  view = "play";
  bootRun();
}

function retry() {
  window.clearTimeout(invadeTimer);
  closeRun(state.phase === "clear" ? "clear" : state.result === "lose" ? "lose" : "abandon");
  view = "play";
  bootRun();
}

function showMeta() {
  window.clearTimeout(invadeTimer);
  closeRun(state.phase === "clear" ? "clear" : state.result === "lose" ? "lose" : "abandon");
  view = "play";
  openMeta(state);
  render();
}

function showTitle() {
  window.clearTimeout(invadeTimer);
  closeRun(state.phase === "clear" ? "clear" : state.result === "lose" ? "lose" : "abandon");
  view = "title";
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
  const minX = Math.min(...xs) - 1;
  const maxX = Math.max(...xs) + 1;
  const minY = Math.min(...ys) - 1;
  const maxY = Math.max(...ys) + 1;
  const cols = maxX - minX + 1;
  const rows = maxY - minY + 1;
  const tiles = [];
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const cell = state.cells.find((c) => c.x === x && c.y === y) ?? null;
      const ghost = !cell && ghosts.some((g) => g.x === x && g.y === y);
      tiles.push({ x, y, cell, ghost, wall: !cell && !ghost });
    }
  }
  return { cols, rows, tiles };
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
        : `${TREASURES[state.treasureId].hint} マスを押して宝を置く。`;
    case "invade":
      return "侵入は自動進行。ログの色と形で波・削り・足止め・撃退を追える。";
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
      return "接する破線マスを押して通路を伸ばす。上限はおおよそ 5×5。";
    case "chip":
      return "既存のマスを押して削り罠を置く。コアに重ねてもよい。";
    case "stall":
      return "既存のマスを押して足止め罠を置く。";
    case "minion":
      return "既存のマスを押して配下を置く。罠と重ねられる。";
    default: {
      const _never = kind;
      return String(_never ?? "置くマスを押す。");
    }
  }
}

function metaBar() {
  return `
    <div class="meta" data-meta>
      <div class="stat">周回 <b>${meta.runsStarted}</b></div>
      <div class="stat">防衛 <b>${meta.defensesWon}</b></div>
      <div class="stat">見識 <b>${meta.insight}</b></div>
      <div class="stat">初期拡張 <b>${meta.startingExpand}</b></div>
    </div>`;
}

function headerBlock(title, sub) {
  return `
    <header class="top">
      <div>
        <span class="tag">非公式ファン作品 · v1 / v2</span>
        <h1>${title}</h1>
        <p class="sub">${sub}</p>
      </div>
      ${metaBar()}
    </header>`;
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
      <div class="result-banner win">
        <p class="result win">防衛成功</p>
        <p class="hint">落とし物を1つ選んで、巣穴に置く。</p>
        <div class="loot-grid">${lootCards()}</div>
      </div>`;
  }
  if (state.phase === "settle" && state.result === "lose") {
    return `
      <div class="lose-box" data-lose>
        <p class="result lose">防衛失敗</p>
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
      <div class="clear-box">
        <p class="result win">周回クリア</p>
        <p class="hint">王冠を守り切ったか、第6波まで持ちこたえた。</p>
        <div class="actions">
          <button class="btn primary" data-act="retry">もう一周</button>
          <button class="btn" data-act="meta">メタを見る</button>
        </div>
      </div>`;
  }
  if (state.phase === "meta") {
    return "";
  }
  return "";
}

function lootCards() {
  const canExpand = expandCandidates(state.cells).length > 0;
  return state.runUnlocks.parts
    .map((kind) => {
      const part = PARTS[kind];
      const disabled = kind === "expand" && !canExpand;
      return `
        <button class="loot-card" data-act="${kind}" ${disabled ? "disabled" : ""}>
          ${partIcon(kind)}
          <span class="name">${disabled ? "上限まで広がった" : part.name}</span>
          <span class="mark">${part.hint}</span>
        </button>`;
    })
    .join("");
}

function bindCommonActions() {
  app.querySelector("[data-act=attract]")?.addEventListener("click", attract);
  app.querySelector("[data-act=retry]")?.addEventListener("click", retry);
  app.querySelector("[data-act=meta]")?.addEventListener("click", showMeta);
  app.querySelector("[data-act=title]")?.addEventListener("click", showTitle);
  app.querySelector("[data-act=start]")?.addEventListener("click", startPlay);
  app.querySelector("[data-act=fast]")?.addEventListener("click", () => {
    state.fastForward = !state.fastForward;
    render();
    scheduleInvade();
  });
  for (const kind of ["expand", "chip", "stall", "minion"]) {
    app.querySelector(`[data-act=${kind}]`)?.addEventListener("click", () => pickItem(kind));
  }
}

function showcaseTile(kind) {
  const art =
    kind === "core"
      ? icon("core")
      : kind === "treasure"
        ? treasureIcon("copper")
        : kind === "invader"
          ? invaderIcon("thief")
          : kind === "chip"
            ? icon("chip")
            : kind === "stall"
              ? icon("stall")
              : kind === "minion"
                ? icon("minion")
                : kind === "path"
                  ? ""
                  : "";
  const extra =
    kind === "core"
      ? "core has-treasure"
      : kind === "invader"
        ? "path has-invader"
        : kind === "chip"
          ? "path chip"
          : kind === "stall"
            ? "path stall"
            : kind === "minion"
              ? "path minion"
              : kind === "path"
                ? "path"
                : "wall";
  return `<div class="tile ${extra}" aria-hidden="true">${art}</div>`;
}

function renderTitle() {
  app.innerHTML = `
    <section class="screen-title" data-phase="title">
      <div class="title-card app-title">
        <span class="tag">非公式ファン作品 · 薄いフォロワー</span>
        <h1>ダンジョンメーカー風フォロワー</h1>
        <p class="sub">自分がダンジョン側。宝を置いて侵入を迎え、落とし物で巣穴を整える。</p>
        <div class="title-loop" aria-label="周回ループ">
          <span>誘引</span><span class="arrow">→</span>
          <span>防衛</span><span class="arrow">→</span>
          <span>落とし物</span><span class="arrow">→</span>
          <span>整備</span><span class="arrow">→</span>
          <span>誘引</span>
        </div>
        <div class="showcase" aria-hidden="true">
          ${showcaseTile("wall")}${showcaseTile("chip")}${showcaseTile("core")}${showcaseTile("stall")}${showcaseTile("wall")}
          ${showcaseTile("wall")}${showcaseTile("path")}${showcaseTile("invader")}${showcaseTile("minion")}${showcaseTile("wall")}
        </div>
        <div class="legend">
          <i>${treasureIcon("copper")}宝</i>
          <i>${icon("chip")}削り罠</i>
          <i>${icon("stall")}足止め</i>
          <i>${icon("minion")}配下</i>
          <i>${invaderIcon("thief")}侵入者</i>
        </div>
        <div class="actions">
          <button class="btn primary" data-act="start">巣穴を開く</button>
          <button class="btn" data-act="meta">周回のあいだ</button>
        </div>
      </div>
    </section>
  `;
  bindCommonActions();
}

function renderMetaScreen() {
  const treasures = catalogTreasures(meta)
    .map(
      (t) => `
        <li class="catalog-item ${t.unlocked ? "on" : "off"}">
          ${t.unlocked ? treasureIcon(t.id) : icon("lock")}
          <div>
            <span class="name">${t.name}</span>
            <span class="mark">${t.unlocked ? "解放" : "未解放"}</span>
            <span class="hint">${t.hint}</span>
          </div>
        </li>`,
    )
    .join("");
  const parts = catalogParts(meta)
    .map(
      (p) => `
        <li class="catalog-item ${p.unlocked ? "on" : "off"}">
          ${p.unlocked ? partIcon(p.id) : icon("lock")}
          <div>
            <span class="name">${p.name}</span>
            <span class="mark">${p.unlocked ? "解放" : "未解放"}</span>
            <span class="hint">${p.hint}</span>
          </div>
        </li>`,
    )
    .join("");

  app.innerHTML = `
    ${headerBlock("周回のあいだ", "解放は localStorage に残る。ガチャ・スタミナ・マルチはなし。")}
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
        <button class="btn" data-act="title">タイトルへ</button>
      </div>
    </section>
  `;
  bindCommonActions();
}

function tileArt(cell, ghost, hasTreasure, hasInvader, inv) {
  if (hasInvader) {
    return invaderIcon(inv?.kind ?? invaderKindFromTreasure(state.treasureId));
  }
  if (hasTreasure) return treasureIcon(state.treasureId);
  if (ghost) return icon("path");
  if (!cell) return "";
  if (cell.minion) return icon("minion");
  const trap = trapKind(cell);
  if (trap === "stall") return icon("stall");
  if (trap === "chip") return icon("chip");
  if (cell.kind === "core") return icon("core");
  return "";
}

function tileBadges(cell, hasTreasure, hasInvader) {
  if (!cell || (!hasInvader && !hasTreasure && !cell.minion && !trapKind(cell))) return "";
  const bits = [];
  if (hasInvader && hasTreasure) bits.push(`<span class="badge tr">${treasureIcon(state.treasureId)}</span>`);
  if ((hasInvader || hasTreasure) && trapKind(cell) === "chip") bits.push(`<span class="badge">${icon("chip")}</span>`);
  if ((hasInvader || hasTreasure) && trapKind(cell) === "stall") bits.push(`<span class="badge">${icon("stall")}</span>`);
  if ((hasInvader || hasTreasure) && cell.minion) bits.push(`<span class="badge tr">${icon("minion")}</span>`);
  return bits.join("");
}

function tileCaption(cell, ghost, hasTreasure, hasInvader) {
  if (hasInvader) return "侵入";
  if (hasTreasure) return TREASURES[state.treasureId]?.name ?? "宝";
  if (ghost) return "拡張";
  if (!cell) return "壁";
  return cellLabelShort(cell);
}

function isPlaceable(cell, ghost) {
  if (state.phase === "attract") return Boolean(cell) && !state.treasure;
  if (state.phase !== "improve") return false;
  if (state.improveKind === "expand") return ghost;
  if (!cell) return false;
  if (state.improveKind === "chip" || state.improveKind === "stall") return !trapKind(cell);
  if (state.improveKind === "minion") return !cell.minion;
  return false;
}

function isBlocked(cell, ghost) {
  if (state.phase !== "improve" || !cell || ghost) return false;
  if (state.improveKind === "chip" || state.improveKind === "stall") return Boolean(trapKind(cell));
  if (state.improveKind === "minion") return Boolean(cell.minion);
  return false;
}

function renderPlay() {
  const board = boardModel();
  const inv = currentInvader();
  const size = nestSize(state.cells);
  const pathKeys = new Set((inv?.path ?? []).map((p) => `${p.x},${p.y}`));
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
          ${locked ? icon("lock") : treasureIcon(t.id)}
          <span class="name">${t.name}</span>
          <span class="mark">${locked ? "未解放" : TREASURES[t.id].hint}</span>
        </button>`;
    })
    .join("");

  const tiles = board.tiles
    .map(({ x, y, cell, ghost, wall }) => {
      const hasTreasure = state.treasure?.x === x && state.treasure?.y === y;
      const hasInvader = inv?.pos?.x === x && inv?.pos?.y === y;
      const trap = trapKind(cell);
      const placeable = isPlaceable(cell, ghost);
      const blocked = isBlocked(cell, ghost);
      const classes = [
        "tile",
        wall ? "wall" : cell?.kind ?? "",
        trap ? trap : "",
        cell?.minion ? "minion" : "",
        ghost ? "ghost" : "",
        hasTreasure ? "has-treasure" : "",
        hasInvader ? "has-invader" : "",
        pathKeys.has(`${x},${y}`) && state.phase === "invade" ? "on-path" : "",
        placeable ? "is-placeable" : "",
        blocked ? "is-blocked" : "",
      ]
        .filter(Boolean)
        .join(" ");
      const clickable =
        (state.phase === "attract" && cell) ||
        (state.phase === "improve" && state.improveKind === "expand" && ghost) ||
        (state.phase === "improve" && state.improveKind !== "expand" && cell && !blocked);
      const label = tileCaption(cell, ghost, hasTreasure, hasInvader);
      if (wall) {
        return `<div class="tile wall" aria-hidden="true"></div>`;
      }
      return `
        <button class="${classes}" type="button"
          data-cell="${x},${y}" ${ghost ? "data-ghost=1" : ""}
          ${clickable ? "" : "disabled"}
          aria-label="${x},${y} ${label}">
          <span class="tile-label">${label}</span>
          ${tileArt(cell, ghost, hasTreasure, hasInvader, inv)}
          ${tileBadges(cell, hasTreasure, hasInvader)}
        </button>`;
    })
    .join("");

  const logs =
    state.log.length === 0
      ? `<li class="tone-note">${icon("torch")}<span>まだ侵入はない。宝を置いて誘引しよう。</span></li>`
      : state.log
          .map((line) => `<li class="tone-${line.tone}">${logIcon(line.tone)}<span>${line.text}</span></li>`)
          .join("");

  const hpPct = inv ? Math.max(0, Math.round((inv.hp / inv.maxHp) * 100)) : 0;
  const invaderNow = inv
    ? `<div class="invader-now" data-invader>
        ${invaderIcon(inv.kind)}
        <div>
          <strong>${inv.name}</strong>
          ${inv.stalled ? " · 足止め中" : ""}
          <span>残HP ${Math.max(0, inv.hp)}/${inv.maxHp}</span>
          <span class="hp" aria-hidden="true"><i style="width:${hpPct}%"></i></span>
        </div>
      </div>`
    : "";

  app.innerHTML = `
    ${headerBlock("自分がダンジョン側", "宝を置いて侵入を迎える。道中イベントなし。失敗したら即リトライ。")}
    <div class="layout">
      <section class="panel" data-phase="${state.phase}">
        <div class="hud">
          <h2 class="hud-title">巣穴</h2>
          <div class="pills">
            <span class="hud-pill wave">第${state.wave}/${state.maxWave}波</span>
            <span class="phase-pill">${phaseTitle(state.phase)}</span>
            <span class="hud-pill">${size.w}×${size.h} / ${MAX_SPAN}×${MAX_SPAN}</span>
          </div>
        </div>
        <p class="hint">${hintText()}</p>
        <div class="treasures">${treasures}</div>
        <div class="board-wrap">
          <div class="board" style="--cols: ${board.cols}">${tiles}</div>
        </div>
        <div class="legend">
          <i>${icon("core")}コア</i>
          <i>${treasureIcon(state.treasureId)}宝</i>
          <i>${icon("chip")}削り</i>
          <i>${icon("stall")}足止め</i>
          <i>${icon("minion")}配下</i>
          <i>${invaderIcon(invaderKindFromTreasure(state.treasureId))}侵入者</i>
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
        <h2>侵入の記録</h2>
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

function render() {
  if (view === "title") {
    renderTitle();
    return;
  }
  if (state.phase === "meta") {
    renderMetaScreen();
    return;
  }
  renderPlay();
}
