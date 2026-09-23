/** 自作 16×16 ピクセル。公式素材の模写ではない。 */

const P = {
  ".": null,
  k: "#100c0a",
  d: "#241c16",
  s: "#3a3026",
  m: "#6a5340",
  l: "#a88868",
  b: "#e4d0a8",
  w: "#fff4d8",
  g: "#f0b429",
  y: "#ffe27a",
  r: "#e24a38",
  o: "#ff7a32",
  p: "#7d5cff",
  v: "#d8c6ff",
  t: "#2f6f62",
  c: "#5ee0c8",
  n: "#4d7a22",
  e: "#a6e04a",
  u: "#5a6a80",
  i: "#e4eef8",
  x: "#9a3412",
  h: "#1a1430",
  z: "#3b1d12",
};

const cache = new Map();

function pixelIcon(id, rows) {
  const hit = cache.get(id);
  if (hit) return hit;
  const height = rows.length;
  const width = rows[0]?.length ?? 0;
  const rects = [];
  for (let y = 0; y < height; y += 1) {
    const row = rows[y];
    for (let x = 0; x < width; x += 1) {
      const fill = P[row[x]];
      if (!fill) continue;
      rects.push(`<rect x="${x}" y="${y}" width="1" height="1" fill="${fill}"/>`);
    }
  }
  const svg = `<svg class="pix" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges" aria-hidden="true">${rects.join("")}</svg>`;
  cache.set(id, svg);
  return svg;
}

const SPRITES = {
  copper: [
    "................",
    "......mmmm......",
    ".....mllllm.....",
    "....mlbbbblm....",
    "....mlbgygblm...",
    "...mlbgygyblm...",
    "...mlbbbbbblm...",
    "...mlbgygyblm...",
    "...mlbbbbbblm...",
    "....mllllllm....",
    ".....mmmmmm.....",
    "......ggyg......",
    ".......gg.......",
    "................",
    "................",
    "................",
  ],
  sword: [
    "................",
    "...........ii...",
    "..........iiu...",
    ".........iiu....",
    "........iiu.....",
    ".......iiu......",
    "......iiu.......",
    ".....iiu........",
    "...yyiu.........",
    "..ygggi.........",
    "...yyg..........",
    "...x.x..........",
    "..xxx...........",
    "................",
    "................",
    "................",
  ],
  grimoire: [
    "................",
    "....hhhhhhhh....",
    "...hppppppph....",
    "...hpvvvvvph....",
    "...hpvgggvph....",
    "...hpvgwgvph....",
    "...hpvgggvph....",
    "...hpvvvvvph....",
    "...hpvyyyvph....",
    "...hpvvvvvph....",
    "...hppppppph....",
    "....hhhhhhhh....",
    ".....d....d.....",
    "................",
    "................",
    "................",
  ],
  crown: [
    "................",
    "................",
    "..y.y......y.y..",
    "..ygy......ygy..",
    "..yyyyyyyyyyyy..",
    "..yggyyyyyggyg..",
    "..yyyyryyyyyyy..",
    "..ygyyyyyyyygy..",
    "..yyyyyyyyyyyy..",
    "...gggggggggg...",
    "....yyyyyyyy....",
    "................",
    "................",
    "................",
    "................",
    "................",
  ],
  thief: [
    "................",
    "......dddd......",
    ".....dnnnnd.....",
    "....dnwwwnd.....",
    "....dnwewnd.....",
    ".....nwwwwn.....",
    "......nnnn......",
    ".....nllln......",
    "....nllddln.....",
    "....nllllln.....",
    ".....nllln......",
    ".....d..d.......",
    "....dd..dd......",
    "................",
    "................",
    "................",
  ],
  warrior: [
    "................",
    ".....uuuuuu.....",
    "....uiiiiiiu....",
    "....uiriiiru....",
    "....uiiiiiiu....",
    ".....urrrru.....",
    "......llll......",
    "....rrllllrr....",
    "....rllllllr....",
    "....rllrrllr....",
    ".....rllllr.....",
    ".....u....u.....",
    "....uu....uu....",
    "................",
    "................",
    "................",
  ],
  mage: [
    "................",
    ".......pp.......",
    "......pvp.......",
    ".....pvvp.......",
    "....pvvvvp......",
    "...pvvvvvvp.....",
    "...pppppppp.....",
    "....owwwwo......",
    "....owewwo......",
    ".....oooo.......",
    "....oppppo......",
    "....opvvpo......",
    "....oppppo......",
    ".....p..p.......",
    "................",
    "................",
  ],
  chip: [
    "................",
    "................",
    "..r...r...r.....",
    "..rr..rr..rr....",
    "...r...r...r....",
    "...oo..oo..oo...",
    "...xx..xx..xx...",
    "..xxxx.xxxx.xx..",
    "..xxxxxxxxxxxxx.",
    "...mmmmmmmmm....",
    "....sssssss.....",
    "................",
    "................",
    "................",
    "................",
    "................",
  ],
  stall: [
    "................",
    "....y......y....",
    "....yy....yy....",
    ".....y....y.....",
    "......yyyy......",
    ".....yooooy.....",
    ".....yogoy......",
    ".....yooooy.....",
    "......yyyy......",
    ".....y....y.....",
    "....yy....yy....",
    "....y......y....",
    "................",
    "................",
    "................",
    "................",
  ],
  minion: [
    "................",
    "...c........c...",
    "...tc......ct...",
    "....tcccccct....",
    "....tcwwwwct....",
    "....tcweewct....",
    ".....tcccct.....",
    "....tttttttt....",
    "...tcttttttct...",
    "...tc.tttt.ct...",
    "....t......t....",
    "....t......t....",
    "...tt......tt...",
    "................",
    "................",
    "................",
  ],
  core: [
    "................",
    ".......vv.......",
    "......vppv......",
    ".....vppppv.....",
    "....vpvwwvpv....",
    "....vpwwwwpv....",
    "...vvpwwwwpvv...",
    "....vpwwwwpv....",
    "....vpvwwvpv....",
    ".....vppppv.....",
    "......vppv......",
    ".......vv.......",
    "................",
    "................",
    "................",
    "................",
  ],
  path: [
    "................",
    "....mmmmmmmm....",
    "...mllllllllm...",
    "...mlbbbbbblm...",
    "...mlbwwbbblm...",
    "...mlbbbbbblm...",
    "...mlbbbwbblm...",
    "...mllllllllm...",
    "....mmmmmmmm....",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
  ],
  lock: [
    "................",
    ".....uuuuu......",
    "....u.....u.....",
    "....u.....u.....",
    "....u.....u.....",
    "...mmmmmmmmm....",
    "...mlllllllm....",
    "...mllwwlllm....",
    "...mllwwlllm....",
    "...mlllllllm....",
    "...mmmmmmmmm....",
    "................",
    "................",
    "................",
    "................",
    "................",
  ],
  wall: [
    "ssssssssssssssss",
    "smmmmmmmmmmmmmms",
    "smmmmmmmmmmmmmms",
    "dddddddddddddddd",
    "mmmmmssssmmmmmss",
    "mmmmmssssmmmmmss",
    "dddddddddddddddd",
    "ssssmmmmmmmmssss",
    "ssssmmmmmmmmssss",
    "dddddddddddddddd",
    "mmmmmmssssmmmmmm",
    "mmmmmmssssmmmmmm",
    "dddddddddddddddd",
    "ssssssssssssssss",
    "smmmmmmmmmmmmmms",
    "ssssssssssssssss",
  ],
  torch: [
    "................",
    ".......yy.......",
    "......yoyo......",
    "......yogy......",
    ".......oo.......",
    ".......mm.......",
    ".......mm.......",
    ".......mm.......",
    ".......mm.......",
    "......mmmm......",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
  ],
};

export function icon(name) {
  const rows = SPRITES[name];
  if (!rows) return "";
  return pixelIcon(name, rows);
}

export function treasureIcon(id) {
  switch (id) {
    case "copper":
      return icon("copper");
    case "sword":
      return icon("sword");
    case "grimoire":
      return icon("grimoire");
    case "crown":
      return icon("crown");
    default: {
      const _never = id;
      void _never;
      return icon("copper");
    }
  }
}

export function invaderIcon(kind) {
  switch (kind) {
    case "thief":
      return icon("thief");
    case "warrior":
      return icon("warrior");
    case "mage":
      return icon("mage");
    default: {
      const _never = kind;
      void _never;
      return icon("thief");
    }
  }
}

export function partIcon(id) {
  switch (id) {
    case "expand":
      return icon("path");
    case "chip":
      return icon("chip");
    case "stall":
      return icon("stall");
    case "minion":
      return icon("minion");
    default: {
      const _never = id;
      void _never;
      return icon("path");
    }
  }
}

export function logIcon(tone) {
  switch (tone) {
    case "wave":
      return icon("torch");
    case "stall":
      return icon("stall");
    case "ko":
      return icon("minion");
    case "win":
      return icon("crown");
    case "lose":
      return icon("thief");
    case "step":
      return icon("warrior");
    case "note":
      return icon("path");
    default: {
      const _never = tone;
      void _never;
      return icon("path");
    }
  }
}

export function invaderKindFromTreasure(treasureId) {
  switch (treasureId) {
    case "copper":
      return "thief";
    case "sword":
      return "warrior";
    case "grimoire":
      return "mage";
    case "crown":
      return "warrior";
    default: {
      const _never = treasureId;
      void _never;
      return "thief";
    }
  }
}
