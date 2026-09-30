/**
 * Street Racing (from Ryan's Rift Kart)
 * Top-down race with Mario Kart-style items, drifting, and one big twist:
 * a rift orbits the track and periodically opens. Driving through it skips
 * you forward. The worse your position, the longer the jump.
 *
 * Tweak the constants below if you want a faster race, more laps, or a wider track.
 */

const LAPS = 3;
const TRACK_HALF = 156;
const BASE_MAX = 390;
const ACCEL = 460;
const BRAKE = 720;
const COAST = 140;
const RIFT_PERIOD = 14;
const RIFT_OPEN_FOR = 6.5;

// Long twisty circuit: a long start straight, a loop, a hairpin, an S, a second loop, then a far return.
let WAYPOINTS = [];
let CORNER_RADIUS = [];
let LOOP_MARKS = [];

function ring(cx, cy, r, a0, sweep, n) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = a0 + sweep * (i / n);
    pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r, loop: true });
  }
  return pts;
}

function defineCircuit() {
  const r1 = 320;
  const right = { x: 1180, y: 980 + r1 };
  const r2 = 380;
  const upper = { x: -360, y: -980 - r2 };
  LOOP_MARKS = [
    { x: right.x, y: right.y, r: r1 },
    { x: upper.x, y: upper.y, r: r2 },
  ];
  const rightLoop = ring(right.x, right.y, r1, -Math.PI / 2, Math.PI * 2, 28);
  const upperLoop = ring(upper.x, upper.y, r2, Math.PI / 2, Math.PI * 2, 32);
  WAYPOINTS = [
    { x: -1680, y: 980, r: 300 },
    { x: -900, y: 780, r: 220 },
    { x: -180, y: 1140, r: 200 },
    { x: 480, y: 860, r: 220 },
    { x: 820, y: 980, r: 240 },
    ...rightLoop,
    { x: 1880, y: 980, r: 200 },
    { x: 2280, y: 620, r: 160 },
    { x: 2100, y: 140, r: 150 },
    { x: 1640, y: -120, r: 160 },
    { x: 1080, y: 260, r: 140 },
    { x: 560, y: -80, r: 140 },
    { x: 120, y: 300, r: 150 },
    { x: -40, y: -160, r: 160 },
    { x: 280, y: -980, r: 200 },
    ...upperLoop,
    { x: -1320, y: -980, r: 240 },
    { x: -2060, y: -980, r: 220 },
    { x: -2280, y: -460, r: 200 },
    { x: -2040, y: 80, r: 190 },
    { x: -1680, y: 520, r: 220 },
  ];
  CORNER_RADIUS = WAYPOINTS.map((p) => (p.loop ? 28 : (p.r || 180)));
}

const ITEM_TABLE = [
  { id: "mushroom", w: [50, 28, 14, 6] },
  { id: "banana", w: [28, 18, 10, 6] },
  { id: "green", w: [16, 22, 16, 10] },
  { id: "red", w: [4, 16, 22, 18] },
  { id: "phase", w: [2, 8, 12, 12] },
  { id: "lightning", w: [0, 4, 12, 18] },
  { id: "star", w: [0, 2, 6, 14] },
  { id: "swap", w: [0, 2, 8, 16] },
];

const ITEM_INFO = {
  mushroom: { name: "BOOST", glyph: "▲", color: "#ff5a6a" },
  banana: { name: "BANANA", glyph: "●", color: "#ffe14a" },
  green: { name: "SHELL", glyph: "◉", color: "#7dff6b" },
  red: { name: "HOMING", glyph: "◉", color: "#ff4d4d" },
  lightning: { name: "BOLT", glyph: "↯", color: "#ffe56a" },
  star: { name: "STAR", glyph: "★", color: "#fff6c2" },
  phase: { name: "PHASE", glyph: "◇", color: "#d7b3ff" },
  swap: { name: "SWAP", glyph: "⇄", color: "#7af0ff" },
};

const GRID = [
  { name: "VEE", color: "#ff4d6d", style: "speed", s: 300, lat: -62, player: false, speedMul: 1.07, gripMul: 0.96, accelMul: 1.02 },
  { name: "JUNO", color: "#3dfff3", style: "corner", s: 300, lat: 62, player: false, speedMul: 1.01, gripMul: 1.22, accelMul: 1.04 },
  { name: "YOU", color: "#ffd84a", style: "player", s: 110, lat: -62, player: true, speedMul: 1.03, gripMul: 1.05, accelMul: 1.08 },
  { name: "PIX", color: "#c6ff4a", style: "chaos", s: 110, lat: 62, player: false, speedMul: 1.02, gripMul: 1, accelMul: 1.05 },
];

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const ui = {
  title: document.getElementById("title"),
  hud: document.getElementById("hud"),
  pause: document.getElementById("pause"),
  results: document.getElementById("results"),
  count: document.getElementById("count"),
  banner: document.getElementById("banner"),
  wrong: document.getElementById("wrong"),
  place: document.getElementById("place"),
  lap: document.getElementById("lap"),
  clock: document.getElementById("clock"),
  speed: document.getElementById("speed"),
  board: document.getElementById("board"),
  rift: document.getElementById("riftStatus"),
  driftBar: document.getElementById("driftBar"),
  driftFill: document.getElementById("driftFill"),
  glyph: document.getElementById("itemGlyph"),
  itemName: document.getElementById("itemName"),
  itemSlot: document.getElementById("itemSlot"),
  itemHint: document.getElementById("itemHint"),
  resultTitle: document.getElementById("resultTitle"),
  resultSub: document.getElementById("resultSub"),
  resultList: document.getElementById("resultList"),
};

const keys = new Set();
let itemQueued = false;
let cssW = 1;
let cssH = 1;
let dpr = 1;

const audio = { ctx: null, muted: false, engine: null };
let state = "title";
let raceTime = 0;
let countLeft = 3;
let countShown = 3;
let bannerText = "";
let bannerT = 0;
let flash = 0;
let shakeMag = 0;
let finishDelay = 0;
let resultSnap = null;
let cam = { x: 0, y: 0 };
let cineS = 0;
let riftS = 0;
let riftWasOpen = false;
let track, specks, boostS, boxes, karts, player;
let shells = [];
let bananas = [];
let particles = [];
let skids = [];

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function mod(v, m) { return ((v % m) + m) % m; }
function lerp(a, b, t) { return a + (b - a) * t; }
function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
function wrapAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}
function placeLabel(i) {
  return ["1st", "2nd", "3rd", "4th"][i] || `${i + 1}th`;
}
function formatTime(t) {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  const cs = Math.floor((t % 1) * 100);
  return `${m}:${String(s).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
}

function circuitCorners() {
  const n = WAYPOINTS.length;
  return WAYPOINTS.map((curr, i) => {
    const prev = WAYPOINTS[(i - 1 + n) % n];
    const next = WAYPOINTS[(i + 1) % n];
    const lenIn = Math.hypot(curr.x - prev.x, curr.y - prev.y);
    const lenOut = Math.hypot(next.x - curr.x, next.y - curr.y);
    const inV = { x: (curr.x - prev.x) / lenIn, y: (curr.y - prev.y) / lenIn };
    const outV = { x: (next.x - curr.x) / lenOut, y: (next.y - curr.y) / lenOut };
    const cross = inV.x * outV.y - inV.y * outV.x;
    const dot = inV.x * outV.x + inV.y * outV.y;
    const delta = Math.atan2(cross, dot);
    const absD = Math.abs(delta);
    let pIn = { x: curr.x, y: curr.y };
    let pOut = { x: curr.x, y: curr.y };
    let cx = curr.x;
    let cy = curr.y;
    let r = 0;
    if (absD > 0.05) {
      const tanHalf = Math.tan(absD / 2);
      const maxT = Math.min(lenIn, lenOut) * 0.46;
      const t = Math.min((CORNER_RADIUS[i] || 220) * tanHalf, maxT);
      r = t / tanHalf;
      pIn = { x: curr.x - inV.x * t, y: curr.y - inV.y * t };
      pOut = { x: curr.x + outV.x * t, y: curr.y + outV.y * t };
      const sgn = Math.sign(delta) || 1;
      cx = pIn.x + (-inV.y * sgn) * r;
      cy = pIn.y + (inV.x * sgn) * r;
    }
    return { pIn, pOut, cx, cy, r, delta };
  });
}

function traceCircuit() {
  const corners = circuitCorners();
  const n = corners.length;
  const raw = [];
  const step = 10;
  for (let i = 0; i < n; i++) {
    const c = corners[i];
    const next = corners[(i + 1) % n];
    if (c.r > 2 && Math.abs(c.delta) > 0.05) {
      const a0 = Math.atan2(c.pIn.y - c.cy, c.pIn.x - c.cx);
      const arcLen = c.r * Math.abs(c.delta);
      const steps = Math.max(2, Math.ceil(arcLen / step));
      for (let s = 0; s < steps; s++) {
        const a = a0 + c.delta * (s / steps);
        raw.push({
          x: c.cx + c.r * Math.cos(a),
          y: c.cy + c.r * Math.sin(a),
        });
      }
    }
    const len = Math.hypot(next.pIn.x - c.pOut.x, next.pIn.y - c.pOut.y);
    const steps = Math.max(1, Math.ceil(len / step));
    for (let s = 0; s < steps; s++) {
      const u = s / steps;
      raw.push({
        x: c.pOut.x + (next.pIn.x - c.pOut.x) * u,
        y: c.pOut.y + (next.pIn.y - c.pOut.y) * u,
      });
    }
  }
  return raw;
}

function buildTrack() {
  defineCircuit();
  const raw = traceCircuit();
  const seg = raw.map((p, i) => {
    const q = raw[(i + 1) % raw.length];
    return Math.hypot(q.x - p.x, q.y - p.y);
  });
  const total = seg.reduce((sum, d) => sum + d, 0);
  const N = Math.max(140, Math.round(total / 12));
  const spacing = total / N;
  const pts = [];
  for (let i = 0; i < N; i++) {
    let target = i * spacing;
    let acc = 0;
    let si = 0;
    let guard = 0;
    while (acc + seg[si] < target && guard < raw.length * 2) {
      acc += seg[si];
      si = (si + 1) % raw.length;
      guard += 1;
    }
    const span = seg[si] || 1;
    const u = clamp((target - acc) / span, 0, 1);
    const a = raw[si];
    const b = raw[(si + 1) % raw.length];
    pts.push({
      x: lerp(a.x, b.x, u),
      y: lerp(a.y, b.y, u),
      s: target,
      ang: 0,
    });
  }
  let straightAt = 0;
  let straightScore = Infinity;
  for (let i = 0; i < N; i++) {
    const a = pts[i];
    const b = pts[(i + 36) % N];
    const chord = Math.hypot(b.x - a.x, b.y - a.y);
    const score = Math.abs(chord - 36 * spacing);
    if (score < straightScore && chord > 36 * spacing * 0.92) {
      straightScore = score;
      straightAt = i;
    }
  }
  const rotated = pts.slice(straightAt).concat(pts.slice(0, straightAt));
  rotated.forEach((p, i) => {
    const q = rotated[(i + 1) % N];
    p.s = i * spacing;
    p.ang = Math.atan2(q.y - p.y, q.x - p.x);
  });
  pts.length = 0;
  pts.push(...rotated);
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of pts) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }
  boostS = Math.min(spacing * 40, total * 0.18);
  let minGap = Infinity;
  for (let i = 0; i < N; i += 2) {
    for (let j = i + 18; j < N; j += 2) {
      if (Math.min(j - i, N - (j - i)) < 18) continue;
      const d = Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y);
      if (d < minGap) minGap = d;
    }
  }
  track = { pts, len: total, spacing, bounds: { minX, maxX, minY, maxY }, minGap, loops: LOOP_MARKS };

  specks = [];
  for (let i = 0; i < 420; i++) {
    const s = Math.random() * track.len;
    const lat = (Math.random() * 2 - 1) * (TRACK_HALF - 20);
    specks.push(edgePoint(s, lat));
  }

  const fractions = [0.15, 0.32, 0.5, 0.68, 0.86];
  boxes = fractions.map((f, i) => {
    let s = f * track.len;
    if (loopDist(s, boostS) < 240 || loopDist(s, boostS + 460) < 80) s = mod(s + 380, track.len);
    const p = edgePoint(s, i % 2 === 0 ? -34 : 34);
    return { x: p.x, y: p.y, s, respawn: 0, bob: Math.random() * 6 };
  });
  riftS = track.len * 0.48;
}

function sampleAt(s) {
  const N = track.pts.length;
  const f = mod(s, track.len) / track.spacing;
  const i = Math.floor(f) % N;
  const j = (i + 1) % N;
  const t = f - Math.floor(f);
  const a = track.pts[i];
  const b = track.pts[j];
  return {
    x: lerp(a.x, b.x, t),
    y: lerp(a.y, b.y, t),
    ang: a.ang + wrapAngle(b.ang - a.ang) * t,
  };
}

function edgePoint(s, lateral) {
  const p = sampleAt(s);
  const nx = -Math.sin(p.ang);
  const ny = Math.cos(p.ang);
  return { x: p.x + nx * lateral, y: p.y + ny * lateral, ang: p.ang };
}

function closest(x, y, hintS = null) {
  const pts = track.pts;
  const N = pts.length;
  let start = 0;
  let count = N;
  if (hintS != null) {
    start = Math.round(hintS / track.spacing) - 40;
    count = 80;
  }
  let best = null;
  for (let k = 0; k < count; k++) {
    const i = mod(start + k, N);
    const j = (i + 1) % N;
    const a = pts[i];
    const b = pts[j];
    const abx = b.x - a.x;
    const aby = b.y - a.y;
    const len2 = abx * abx + aby * aby || 1;
    let t = ((x - a.x) * abx + (y - a.y) * aby) / len2;
    t = clamp(t, 0, 1);
    const px = a.x + abx * t;
    const py = a.y + aby * t;
    const d = Math.hypot(x - px, y - py);
    if (!best || d < best.d) {
      best = {
        d,
        x: px,
        y: py,
        s: mod(a.s + t * track.spacing, track.len),
        ang: a.ang,
      };
    }
  }
  if (hintS != null && best.d > TRACK_HALF * 2.4) return closest(x, y, null);
  return best;
}

function loopDist(a, b) {
  const d = Math.abs(mod(a, track.len) - mod(b, track.len));
  return Math.min(d, track.len - d);
}

function forwardDist(from, to) {
  return mod(to - from, track.len);
}

function makeKart(def) {
  const p = edgePoint(def.s, def.lat);
  return {
    ...def,
    x: p.x,
    y: p.y,
    angle: p.ang,
    vx: 0,
    vy: 0,
    s: def.s,
    lap: 0,
    checkpoint: false,
    item: null,
    pending: null,
    rolling: 0,
    rollVis: 0,
    rollTick: 0,
    spin: 0,
    iframe: 0,
    small: 0,
    star: 0,
    phase: 0,
    phaseAnchor: null,
    offTrack: false,
    suppressLap: false,
    boost: 0,
    boostExtra: 0,
    driftCharge: 0,
    wasDrift: false,
    visualSteer: 0,
    riftCd: 0,
    riftInside: false,
    finished: false,
    finishTime: null,
    stuckT: 0,
    itemWait: 0.4,
    wrong: false,
  };
}

function resetRace() {
  shells = [];
  bananas = [];
  particles = [];
  skids = [];
  karts = GRID.map(makeKart);
  player = karts.find((k) => k.player);
  boxes.forEach((b) => { b.respawn = 0; });
  riftS = track.len * 0.48;
  riftWasOpen = false;
  raceTime = 0;
  countLeft = 3;
  countShown = 3;
  finishDelay = 0;
  resultSnap = null;
  bannerT = 0;
  flash = 0;
  shakeMag = 0;
  itemQueued = false;
  cam.x = player.x;
  cam.y = player.y;
}

function begin() {
  ensureAudio();
  resetRace();
  state = "countdown";
  if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur();
  canvas.focus();
}

function raceProgress(k) {
  return k.lap * track.len + k.s;
}

function standings() {
  return [...karts].sort((a, b) => {
    if (a.finished && b.finished) return a.finishTime - b.finishTime;
    if (a.finished) return -1;
    if (b.finished) return 1;
    return raceProgress(b) - raceProgress(a);
  });
}

function rankOf(k) {
  return standings().indexOf(k);
}

function currentMax(k) {
  let max = BASE_MAX * k.speedMul;
  if (k.boost > 0) max += k.boostExtra;
  if (k.star > 0) max += 90;
  if (k.phase > 0) max += 30;
  if (k.small > 0) max *= 0.7;
  if (!k.player && !k.finished) {
    const behind = raceProgress(standings()[0]) - raceProgress(k);
    max *= 1 + clamp(behind / 2400, 0, 1) * 0.1;
  }
  return max;
}

function scaleOf(k) {
  return k.small > 0 ? 0.62 : 1;
}

function giveBoost(k, time, extra) {
  k.boostExtra = Math.max(k.boost > 0 ? k.boostExtra : 0, extra);
  k.boost = Math.max(k.boost, time);
}

function banner(text) {
  bannerText = text;
  bannerT = 1.7;
}

function pickItem(rank) {
  const r = clamp(rank, 0, 3);
  let total = ITEM_TABLE.reduce((sum, it) => sum + it.w[r], 0);
  let roll = Math.random() * total;
  for (const it of ITEM_TABLE) {
    roll -= it.w[r];
    if (roll <= 0) return it.id;
  }
  return "mushroom";
}

function burst(x, y, color, n, speed) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = speed * (0.35 + Math.random());
    particles.push({
      x, y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      life: 0.35 + Math.random() * 0.45,
      max: 0.8,
      color,
      size: 2 + Math.random() * 3,
    });
  }
  if (particles.length > 380) particles.splice(0, particles.length - 380);
}

function onLapCross(k) {
  if (k.finished) return;
  if (k.lap >= LAPS) {
    k.finished = true;
    k.finishTime = raceTime;
    k.lap = LAPS;
    burst(k.x, k.y, k.color, 24, 180);
    tone(k.player ? 660 : 440, 0.18, "triangle", 0.08, 880);
    if (k.player) {
      resultSnap = standings().map((r, i) => ({
        name: r.name,
        player: r.player,
        color: r.color,
        place: i,
        finished: r.finished,
        finishTime: r.finishTime,
      }));
      finishDelay = 1.45;
      banner("FINISH!");
      shakeMag = Math.max(shakeMag, 7);
    } else {
      banner(`${k.name} FINISHED`);
    }
  } else if (k.player) {
    banner(`LAP ${k.lap + 1} / ${LAPS}`);
    tone(520, 0.12, "square", 0.05, 740);
  }
}

function awardJump(k, newS, travel) {
  if (k.finished) {
    k.s = newS;
    k.suppressLap = true;
    return;
  }
  const oldS = k.s;
  const mid = track.len * 0.5;
  const crossed = oldS + travel >= track.len;
  let crossedMid = false;
  if (!crossed) crossedMid = oldS < mid && oldS + travel >= mid;
  else if (oldS < mid || newS >= mid) crossedMid = true;
  if (!k.checkpoint && crossedMid) k.checkpoint = true;
  k.s = newS;
  if (crossed && k.checkpoint) {
    k.lap += 1;
    k.checkpoint = false;
    onLapCross(k);
  }
  k.suppressLap = true;
}

function followTrack(k) {
  if (k.suppressLap) {
    k.suppressLap = false;
    if (k.phase > 0) k.phaseAnchor = { x: k.x, y: k.y, s: k.s };
    return;
  }
  const hit = closest(k.x, k.y, k.offTrack ? null : k.s);
  if (k.phase > 0 && hit.d > TRACK_HALF + 28) {
    k.offTrack = true;
    return;
  }
  if (k.offTrack) {
    k.offTrack = false;
    const fwd = forwardDist(k.s, hit.s);
    const back = mod(k.s - hit.s, track.len);
    if (fwd <= back && fwd < 800) awardJump(k, hit.s, fwd);
    else {
      k.s = hit.s;
      k.suppressLap = true;
    }
    return;
  }
  const newS = hit.s;
  let delta = newS - k.s;
  if (delta < -track.len * 0.5) delta += track.len;
  else if (delta > track.len * 0.5) delta -= track.len;
  if (Math.abs(delta) > 380) return;
  const mid = track.len * 0.5;
  if (!k.finished) {
    if (delta > 0 && k.s < mid && newS >= mid) k.checkpoint = true;
    if (delta > 0 && k.checkpoint && k.s > track.len - 280 && newS < 280) {
      k.lap += 1;
      k.checkpoint = false;
      onLapCross(k);
    } else if (delta < 0 && k.s < 280 && newS > track.len - 280 && k.lap > 0 && !k.finished) {
      k.lap -= 1;
      k.checkpoint = true;
    }
  }
  k.s = newS;
  if (k.phase > 0) k.phaseAnchor = { x: k.x, y: k.y, s: k.s };
}

function endPhase(k) {
  const hit = closest(k.x, k.y, null);
  const fwd = forwardDist(k.s, hit.s);
  const back = mod(k.s - hit.s, track.len);
  if (hit.d <= TRACK_HALF + 6) {
    if (Math.min(fwd, back) > 420) {
      k.s = hit.s;
      k.suppressLap = true;
    }
    k.offTrack = false;
    return;
  }
  if (fwd < back && fwd < 720 && hit.d < 250) {
    awardJump(k, hit.s, fwd);
    k.x = hit.x;
    k.y = hit.y;
    const sp = Math.hypot(k.vx, k.vy) * 0.94;
    k.angle = hit.ang;
    k.vx = Math.cos(hit.ang) * sp;
    k.vy = Math.sin(hit.ang) * sp;
    k.offTrack = false;
    if (k.player) banner("CORNER CUT");
    return;
  }
  if (k.phaseAnchor) {
    k.x = k.phaseAnchor.x;
    k.y = k.phaseAnchor.y;
    k.s = k.phaseAnchor.s;
    k.vx *= 0.35;
    k.vy *= 0.35;
    k.offTrack = false;
    k.suppressLap = true;
    if (k.player) banner("PHASE FIZZLED");
  }
}

function smack(k) {
  if (k.iframe > 0 || k.star > 0 || k.phase > 0 || k.finished) return false;
  k.spin = 1.05;
  k.iframe = 1.3;
  k.item = null;
  k.pending = null;
  k.rolling = 0;
  k.driftCharge = 0;
  const sp = Math.hypot(k.vx, k.vy);
  if (sp > 1) {
    k.vx = (k.vx / sp) * 50;
    k.vy = (k.vy / sp) * 50;
  }
  burst(k.x, k.y, "#ffd0d0", 12, 140);
  if (k.player) shakeMag = Math.max(shakeMag, 8);
  tone(90, 0.18, "square", 0.07, 40);
  return true;
}

function useItem(k) {
  if (!k.item || k.rolling > 0 || k.spin > 0) return;
  const item = k.item;
  k.item = null;
  if (item === "mushroom") {
    giveBoost(k, 0.62, 170);
    tone(220, 0.12, "sawtooth", 0.05, 520);
  } else if (item === "banana") {
    const c = Math.cos(k.angle);
    const s = Math.sin(k.angle);
    bananas.push({ x: k.x - c * 28, y: k.y - s * 28, life: 18, owner: k, grace: 0.35 });
    tone(180, 0.08, "triangle", 0.04, 120);
  } else if (item === "green") {
    const c = Math.cos(k.angle);
    const s = Math.sin(k.angle);
    shells.push({
      kind: "green",
      x: k.x + c * 30,
      y: k.y + s * 30,
      vx: c * 560,
      vy: s * 560,
      life: 4.2,
      bounces: 0,
      owner: k,
      grace: 0.25,
    });
    tone(340, 0.08, "square", 0.05, 180);
  } else if (item === "red") {
    shells.push({
      kind: "red",
      s: mod(k.s + 70, track.len),
      life: 5,
      owner: k,
      grace: 0.3,
    });
    tone(420, 0.1, "sawtooth", 0.05, 220);
  } else if (item === "lightning") {
    flash = 1;
    shakeMag = 12;
    for (const o of karts) {
      if (o !== k && o.star <= 0 && o.phase <= 0 && !o.finished) {
        o.small = 3.1;
        o.iframe = 0.45;
        o.vx *= 0.55;
        o.vy *= 0.55;
      }
    }
    banner(k.player ? "LIGHTNING" : `${k.name} BOLT`);
    tone(800, 0.2, "sawtooth", 0.06, 80);
  } else if (item === "star") {
    k.star = 4.3;
    k.iframe = 4.3;
    tone(523, 0.1, "square", 0.05, 784);
  } else if (item === "phase") {
    k.phase = 1.85;
    k.offTrack = false;
    k.phaseAnchor = { x: k.x, y: k.y, s: k.s };
    if (k.player) banner("PHASE");
    tone(300, 0.16, "sine", 0.05, 700);
  } else if (item === "swap") {
    doSwap(k);
  }
}

function doSwap(user) {
  const board = standings().filter((k) => !k.finished);
  const idx = board.indexOf(user);
  if (idx < 0 || board.length < 2) return;
  const target = idx === 0 ? board[board.length - 1] : board[idx - 1];
  if (!target || target === user) return;
  const fields = ["x", "y", "vx", "vy", "angle", "s", "lap", "checkpoint"];
  for (const f of fields) {
    const tmp = user[f];
    user[f] = target[f];
    target[f] = tmp;
  }
  user.suppressLap = true;
  target.suppressLap = true;
  user.iframe = Math.max(user.iframe, 0.7);
  target.iframe = Math.max(target.iframe, 0.7);
  burst(user.x, user.y, "#7af0ff", 16, 160);
  burst(target.x, target.y, "#7af0ff", 16, 160);
  banner(`${user.name} ⇄ ${target.name}`);
  shakeMag = Math.max(shakeMag, 6);
  tone(250, 0.15, "triangle", 0.06, 640);
}

function jumpFraction(k) {
  const t = rankOf(k) / (karts.length - 1);
  return 0.09 + t * 0.15;
}

function riftOpenNow() {
  if (state === "title") return (performance.now() / 1000) % RIFT_PERIOD < RIFT_OPEN_FOR;
  return raceTime % RIFT_PERIOD < RIFT_OPEN_FOR;
}

function takeRift(k) {
  const travel = track.len * jumpFraction(k);
  const newS = mod(k.s + travel, track.len);
  awardJump(k, newS, travel);
  const p = sampleAt(k.s);
  k.x = p.x;
  k.y = p.y;
  k.angle = p.ang;
  const sp = Math.max(280, Math.hypot(k.vx, k.vy));
  k.vx = Math.cos(p.ang) * sp;
  k.vy = Math.sin(p.ang) * sp;
  k.riftCd = 6;
  k.iframe = Math.max(k.iframe, 0.7);
  giveBoost(k, 0.4, 80);
  burst(k.x, k.y, "#c084fc", 18, 200);
  if (k.player) {
    banner(`RIFT +${Math.round(jumpFraction(k) * 100)}%`);
    shakeMag = Math.max(shakeMag, 5);
  }
  tone(280, 0.18, "sine", 0.06, 720);
}

function stepKart(k, input, dt) {
  k.visualSteer = input.steer || 0;
  if (k.phase > 0) {
    k.phase -= dt;
    if (k.phase <= 0) {
      k.phase = 0;
      endPhase(k);
    }
  }
  k.iframe = Math.max(0, k.iframe - dt);
  k.small = Math.max(0, k.small - dt);
  k.star = Math.max(0, k.star - dt);
  k.riftCd = Math.max(0, k.riftCd - dt);
  if (k.boost > 0) {
    k.boost -= dt;
    if (k.boost <= 0) {
      k.boost = 0;
      k.boostExtra = 0;
    }
  }
  if (k.rolling > 0) {
    k.rolling -= dt;
    k.rollTick += dt;
    if (k.rollTick > 0.06) {
      k.rollTick = 0;
      k.rollVis = (k.rollVis + 1) % ITEM_TABLE.length;
    }
    if (k.rolling <= 0) {
      k.item = k.pending;
      k.pending = null;
      k.itemWait = k.style === "chaos" ? 0.2 : 0.5;
    }
  }

  const speed = Math.hypot(k.vx, k.vy);
  const drifting = k.spin <= 0 && input.drift && speed > 125 && input.throttle >= 0;
  if (k.wasDrift && !drifting) {
    if (k.driftCharge >= 1.15) {
      giveBoost(k, 0.75, 155);
      tone(480, 0.12, "square", 0.04, 720);
    } else if (k.driftCharge >= 0.48) {
      giveBoost(k, 0.42, 95);
      tone(360, 0.08, "square", 0.035, 540);
    }
    k.driftCharge = 0;
  }
  k.wasDrift = drifting;
    if (drifting && Math.abs(input.steer) > 0.25) {
    k.driftCharge = Math.min(1.5, k.driftCharge + dt);
    if (Math.random() < 0.55) {
      const color = k.driftCharge > 1.15 ? "#ff9a3c" : "#9fd7ff";
      const nx = -Math.sin(k.angle);
      const ny = Math.cos(k.angle);
      const bx = -Math.cos(k.angle) * 18;
      const by = -Math.sin(k.angle) * 18;
      skids.push({ x: k.x + bx + nx * 14, y: k.y + by + ny * 14, ang: k.angle, life: 1, color });
      skids.push({ x: k.x + bx - nx * 14, y: k.y + by - ny * 14, ang: k.angle, life: 1, color });
    }
  }

  if (k.spin > 0) {
    k.spin -= dt;
    k.angle += dt * 11;
  } else {
    const c = Math.cos(k.angle);
    const sn = Math.sin(k.angle);
    const fwdSpeed = k.vx * c + k.vy * sn;
    const turnRate = (drifting ? 3.15 : 2.45) * clamp(speed / 80, 0.4, 1);
    if (fwdSpeed < -15) k.angle -= input.steer * turnRate * dt;
    else k.angle += input.steer * turnRate * dt;

    const accel = (ACCEL * k.accelMul + (k.boost > 0 ? 240 : 0) + (k.star > 0 ? 70 : 0)) * (k.small > 0 ? 0.75 : 1);
    if (input.throttle > 0) {
      k.vx += c * accel * dt;
      k.vy += sn * accel * dt;
    } else if (input.throttle < 0) {
      if (fwdSpeed > 25) {
        k.vx -= c * BRAKE * dt;
        k.vy -= sn * BRAKE * dt;
      } else {
        k.vx -= c * 240 * dt;
        k.vy -= sn * 240 * dt;
      }
    }

    const grip = (drifting ? 2.05 : 9) * k.gripMul;
    const fwd = k.vx * c + k.vy * sn;
    const lx = k.vx - c * fwd;
    const ly = k.vy - sn * fwd;
    const keep = Math.exp(-grip * dt);
    k.vx = c * fwd + lx * keep;
    k.vy = sn * fwd + ly * keep;

    if (input.throttle < 0 && fwdSpeed <= 25) {
      const rsp = Math.hypot(k.vx, k.vy);
      if (rsp > 130) {
        k.vx *= 130 / rsp;
        k.vy *= 130 / rsp;
      }
    } else if (input.throttle === 0 && k.boost <= 0 && k.star <= 0) {
      const sp2 = Math.hypot(k.vx, k.vy);
      const ns = Math.max(0, sp2 - COAST * dt);
      if (sp2 > 0) {
        k.vx *= ns / sp2;
        k.vy *= ns / sp2;
      }
    }
  }

  k.x += k.vx * dt;
  k.y += k.vy * dt;

  if (k.phase <= 0) {
    const hit = closest(k.x, k.y, k.s);
    const limit = TRACK_HALF - 16 * scaleOf(k);
    if (hit.d > limit) {
      const nx = (k.x - hit.x) / (hit.d || 1);
      const ny = (k.y - hit.y) / (hit.d || 1);
      k.x = hit.x + nx * limit;
      k.y = hit.y + ny * limit;
      const outward = k.vx * nx + k.vy * ny;
      if (outward > 0) {
        k.vx -= nx * outward * 1.25;
        k.vy -= ny * outward * 1.25;
      }
      k.vx *= 0.9;
      k.vy *= 0.9;
      if (k.player && outward > 80) shakeMag = Math.max(shakeMag, 3);
    }
  }

  const sp = Math.hypot(k.vx, k.vy);
  const max = currentMax(k);
  const c2 = Math.cos(k.angle);
  const s2 = Math.sin(k.angle);
  const forward = k.vx * c2 + k.vy * s2;
  if (forward > 0 && sp > max) {
    k.vx *= max / sp;
    k.vy *= max / sp;
  }

  followTrack(k);

  const tan = sampleAt(k.s);
  const along = k.vx * Math.cos(tan.ang) + k.vy * Math.sin(tan.ang);
  k.wrong = along < -50 && sp > 60;

  if (state === "race" && !k.finished && onBoost(k.s) && k.spin <= 0) giveBoost(k, 0.16, 110);

  if (k.player && itemQueued && k.rolling <= 0) {
    itemQueued = false;
    if (k.item && k.spin <= 0) useItem(k);
  }
}

function onBoost(s) {
  const end = boostS + 480;
  if (end <= track.len) return s >= boostS && s <= end;
  return s >= boostS || s <= end - track.len;
}

function upcomingTurn(k) {
  const a = sampleAt(k.s).ang;
  const b = sampleAt(k.s + 180).ang;
  return Math.abs(wrapAngle(b - a));
}

function aiInput(k) {
  const speed = Math.hypot(k.vx, k.vy);
  const sharp = upcomingTurn(k);
  const here = sampleAt(k.s);
  const far = sampleAt(k.s + 260);
  const turn = wrapAngle(far.ang - here.ang);
  const lookDist = sharp > 0.85 ? 110 : sharp > 0.4 ? 180 : 340;
  let look = sampleAt(k.s + lookDist);
  const nx = -Math.sin(look.ang);
  const ny = Math.cos(look.ang);
  const inside = clamp(-turn * 90, -64, 64);
  look = { x: look.x + nx * inside, y: look.y + ny * inside };

  if (!k.item && k.rolling <= 0 && !k.finished) {
    let box = null;
    let bestAhead = 220;
    for (const candidate of boxes) {
      if (candidate.respawn > 0) continue;
      const ahead = forwardDist(k.s, candidate.s);
      if (ahead > 40 && ahead < bestAhead) {
        bestAhead = ahead;
        box = candidate;
      }
    }
    if (box) look = box;
  }

  if (riftOpenNow() && k.riftCd <= 0 && !k.finished && rankOf(k) > 0) {
    const ahead = forwardDist(k.s, riftS);
    if (ahead > 24 && ahead < 360) look = sampleAt(riftS);
  }

  const desired = Math.atan2(look.y - k.y, look.x - k.x);
  let steer = clamp(wrapAngle(desired - k.angle) / 0.42, -1, 1);
  for (const other of karts) {
    if (other === k || other.finished) continue;
    const dx = other.x - k.x;
    const dy = other.y - k.y;
    const d = Math.hypot(dx, dy);
    if (d > 78 || d < 6) continue;
    const fwd = dx * Math.cos(k.angle) + dy * Math.sin(k.angle);
    if (fwd < 12) continue;
    const side = dx * -Math.sin(k.angle) + dy * Math.cos(k.angle);
    steer = clamp(steer - clamp(side / 36, -0.7, 0.7), -1, 1);
  }

  let throttle = 1;
  let drift = false;
  if (k.style === "corner") {
    if (sharp > 0.42 && speed > 180 && Math.abs(steer) > 0.28) drift = true;
    if (sharp > 1.05) throttle = 0.82;
  } else if (k.style === "speed") {
    if (sharp > 0.95 && speed > 240) {
      throttle = 0.72;
      drift = Math.abs(steer) > 0.4;
    }
  } else if (sharp > 0.7 && speed > 200) {
    throttle = 0.88;
    drift = Math.abs(steer) > 0.35;
  }

  if (Math.abs(wrapAngle(here.ang - k.angle)) > 1.15) throttle = 0.35;
  k.stuckT = speed < 36 ? k.stuckT + 0.016 : 0;
  if (k.stuckT > 0.45) {
    throttle = -1;
    steer = k.stuckT % 1.1 < 0.55 ? 1 : -1;
    drift = false;
  }
  return { throttle, steer, drift };
}

function aiItems(k, dt) {
  if (k.finished || k.spin > 0 || k.rolling > 0 || !k.item) return;
  k.itemWait -= dt;
  if (k.itemWait > 0) return;
  const myRank = rankOf(k);
  const nearBehind = karts.some((o) => o !== k && !o.finished && dist(o, k) < 210 && raceProgress(k) - raceProgress(o) > 20);
  const nearAhead = karts.some((o) => {
    if (o === k || o.finished || raceProgress(o) <= raceProgress(k)) return false;
    const ahead = forwardDist(k.s, o.s);
    return ahead > 36 && ahead < 560;
  });
  const sharp = upcomingTurn(k);
  const speed = Math.hypot(k.vx, k.vy);
  let use = false;
  if (k.item === "banana") use = nearBehind;
  else if (k.item === "mushroom") use = sharp < 0.28 || speed < currentMax(k) * 0.75;
  else if (k.item === "phase") use = sharp > 0.55 || k.stuckT > 0.3;
  else if (k.item === "green" || k.item === "red") use = nearAhead;
  else if (k.item === "star") use = myRank > 0 || nearAhead || nearBehind;
  else use = myRank > 0;
  if (k.style === "chaos" && k.item !== "mushroom") use = k.item === "banana" ? nearBehind : true;
  if (use) useItem(k);
  else k.itemWait = 0.22;
}

function collideKarts() {
  for (let i = 0; i < karts.length; i++) {
    for (let j = i + 1; j < karts.length; j++) {
      const a = karts[i];
      const b = karts[j];
      const min = (16 * scaleOf(a) + 16 * scaleOf(b));
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.hypot(dx, dy) || 0.001;
      if (d >= min) continue;
      const nx = dx / d;
      const ny = dy / d;
      const overlap = min - d;
      if (a.star > 0 && b.star <= 0) {
        smack(b);
        b.x += nx * overlap;
        b.y += ny * overlap;
        continue;
      }
      if (b.star > 0 && a.star <= 0) {
        smack(a);
        a.x -= nx * overlap;
        a.y -= ny * overlap;
        continue;
      }
      a.x -= nx * overlap * 0.5;
      a.y -= ny * overlap * 0.5;
      b.x += nx * overlap * 0.5;
      b.y += ny * overlap * 0.5;
      const rel = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
      if (rel < 0) {
        const impulse = rel * 0.85;
        a.vx -= impulse * nx;
        a.vy -= impulse * ny;
        b.vx += impulse * nx;
        b.vy += impulse * ny;
      }
    }
  }
}

function checkBoxes(k) {
  if (k.item || k.rolling > 0 || k.finished || k.spin > 0) return;
  for (const box of boxes) {
    if (box.respawn > 0) continue;
    if (Math.hypot(k.x - box.x, k.y - box.y) < 38) {
      k.pending = pickItem(rankOf(k));
      k.rolling = 0.85;
      k.rollVis = 0;
      box.respawn = 5.5;
      burst(box.x, box.y, "#ffe14a", 10, 120);
      tone(720, 0.07, "square", 0.04, 980);
      break;
    }
  }
}

function checkRift(k) {
  const gate = sampleAt(riftS);
  const inside = Math.hypot(k.x - gate.x, k.y - gate.y) < 40;
  const open = riftOpenNow();
  if (inside && !k.riftInside && open && k.riftCd <= 0 && Math.hypot(k.vx, k.vy) > 80 && !k.finished) {
    takeRift(k);
  }
  k.riftInside = inside;
}

function updateShells(dt) {
  for (const shell of shells) {
    shell.life -= dt;
    shell.grace = Math.max(0, shell.grace - dt);
    if (shell.kind === "green") {
      shell.x += shell.vx * dt;
      shell.y += shell.vy * dt;
      const hit = closest(shell.x, shell.y, null);
      if (hit.d > TRACK_HALF - 8) {
        const nx = (shell.x - hit.x) / (hit.d || 1);
        const ny = (shell.y - hit.y) / (hit.d || 1);
        const dot = shell.vx * nx + shell.vy * ny;
        if (dot > 0) {
          shell.vx -= 2 * dot * nx;
          shell.vy -= 2 * dot * ny;
          shell.bounces += 1;
        }
        shell.x = hit.x + nx * (TRACK_HALF - 12);
        shell.y = hit.y + ny * (TRACK_HALF - 12);
      }
      if (shell.bounces > 6) shell.life = 0;
    } else {
      shell.s = mod(shell.s + 620 * dt, track.len);
      const p = sampleAt(shell.s);
      shell.x = p.x;
      shell.y = p.y;
    }
  }
  for (const shell of shells) {
    if (shell.life <= 0 || shell.grace > 0) continue;
    for (const k of karts) {
      if (k === shell.owner || k.finished) continue;
      if (Math.hypot(k.x - shell.x, k.y - shell.y) < 18 + 14 * scaleOf(k)) {
        if (k.star > 0) burst(shell.x, shell.y, k.color, 8, 100);
        else smack(k);
        shell.life = 0;
        break;
      }
    }
  }
  for (let i = 0; i < shells.length; i++) {
    for (let j = i + 1; j < shells.length; j++) {
      if (shells[i].life <= 0 || shells[j].life <= 0) continue;
      if (Math.hypot(shells[i].x - shells[j].x, shells[i].y - shells[j].y) < 20) {
        shells[i].life = 0;
        shells[j].life = 0;
        burst(shells[i].x, shells[i].y, "#fff", 8, 80);
      }
    }
  }
  shells = shells.filter((s) => s.life > 0);
}

function updateBananas(dt) {
  for (const b of bananas) {
    b.life -= dt;
    b.grace = Math.max(0, b.grace - dt);
    if (b.grace > 0) continue;
    for (const k of karts) {
      if (k.finished) continue;
      if (Math.hypot(k.x - b.x, k.y - b.y) < 16 + 14 * scaleOf(k)) {
        if (k.star <= 0) smack(k);
        b.life = 0;
        break;
      }
    }
    for (const shell of shells) {
      if (Math.hypot(shell.x - b.x, shell.y - b.y) < 18) {
        b.life = 0;
        shell.life = 0;
      }
    }
  }
  bananas = bananas.filter((b) => b.life > 0);
}

function update(dt) {
  if (state === "title") {
    cineS = mod(cineS + dt * 140, track.len || 1);
    const p = track ? sampleAt(cineS) : { x: 0, y: 0 };
    cam.x += (p.x - cam.x) * (1 - Math.exp(-1.4 * dt));
    cam.y += (p.y - cam.y) * (1 - Math.exp(-1.4 * dt));
    riftS = mod(riftS + dt * (track.len / 24), track.len);
    return;
  }
  if (state === "paused" || state === "results") return;

  if (state === "countdown") {
    const prev = Math.ceil(countLeft);
    countLeft -= dt;
    const next = Math.ceil(countLeft);
    if (countLeft > 0 && next !== prev && next > 0) tone(520, 0.1, "square", 0.06);
    if (prev > 0 && countLeft <= 0) tone(780, 0.18, "square", 0.07, 1040);
    if (countLeft <= -0.55) state = "race";
  } else {
    raceTime += dt;
    riftS = mod(riftS + dt * (track.len / 22), track.len);
    const open = riftOpenNow();
    if (open && !riftWasOpen) banner("RIFT OPEN");
    riftWasOpen = open;

    for (const k of karts) {
      const input = k.player && !k.finished ? playerInput() : aiInput(k);
      stepKart(k, input, dt);
      if (!k.player) aiItems(k, dt);
    }
    collideKarts();
    for (const k of karts) {
      checkBoxes(k);
      checkRift(k);
    }
    for (const box of boxes) if (box.respawn > 0) box.respawn -= dt;
    updateShells(dt);
    updateBananas(dt);
    if (finishDelay > 0) {
      finishDelay -= dt;
      if (finishDelay <= 0) state = "results";
    }
  }

  for (const p of particles) {
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.96;
    p.vy *= 0.96;
  }
  particles = particles.filter((p) => p.life > 0);
  for (const s of skids) s.life -= dt * 0.22;
  if (skids.length > 700) skids.splice(0, skids.length - 700);
  skids = skids.filter((s) => s.life > 0);

  const look = 78;
  const tx = player.x + Math.cos(player.angle) * look;
  const ty = player.y + Math.sin(player.angle) * look;
  const follow = 1 - Math.exp(-5 * dt);
  cam.x += (tx - cam.x) * follow;
  cam.y += (ty - cam.y) * follow;
  shakeMag *= Math.exp(-3.5 * dt);
  bannerT = Math.max(0, bannerT - dt);
  flash = Math.max(0, flash - dt * 1.4);
  updateEngine();
}

function playerInput() {
  const throttle = (keys.has("w") || keys.has("arrowup") ? 1 : 0) - (keys.has("s") || keys.has("arrowdown") ? 1 : 0);
  const steer = (keys.has("d") || keys.has("arrowright") ? 1 : 0) - (keys.has("a") || keys.has("arrowleft") ? 1 : 0);
  return { throttle, steer, drift: keys.has("shift") };
}

function zoomNow() {
  return clamp(Math.min(cssW / 980, cssH / 640), 0.85, 1.35);
}

function render() {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssW, cssH);
  const g = ctx.createRadialGradient(cssW / 2, cssH / 2, 40, cssW / 2, cssH / 2, cssW * 0.7);
  g.addColorStop(0, "#12182a");
  g.addColorStop(1, "#070910");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, cssW, cssH);

  const zoom = zoomNow();
  const shakeX = (Math.random() - 0.5) * shakeMag;
  const shakeY = (Math.random() - 0.5) * shakeMag;
  ctx.save();
  ctx.translate(cssW / 2, cssH / 2);
  ctx.scale(zoom, zoom);
  ctx.translate(-cam.x + shakeX, -cam.y + shakeY);

  drawGrass();
  strokeRoad(TRACK_HALF * 2 + 18, "#10281c");
  strokeRoad(TRACK_HALF * 2, "#343b48");
  ctx.fillStyle = "rgba(0,0,0,0.12)";
  for (const speck of specks) ctx.fillRect(speck.x, speck.y, 2, 2);
  drawRumble(1);
  drawRumble(-1);
  strokeEdge(1, "rgba(255,255,255,0.92)");
  strokeEdge(-1, "rgba(255,255,255,0.92)");
  drawCenterLine();
  drawLoopMarks();
  drawStartLine();
  drawBoostPad();
  drawRift();
  for (const box of boxes) drawBox(box);
  for (const skid of skids) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, skid.life) * 0.55;
    ctx.translate(skid.x, skid.y);
    ctx.rotate(skid.ang || 0);
    ctx.fillStyle = skid.color;
    ctx.fillRect(-8, -2.2, 16, 4.4);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
  for (const b of bananas) drawBanana(b);
  for (const shell of shells) drawShell(shell);
  for (const p of particles) {
    ctx.globalAlpha = clamp(p.life / 0.4, 0, 1);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  [...karts].sort((a, b) => a.y - b.y).forEach(drawKart);
  ctx.restore();

  drawMinimap(shakeX, shakeY, zoom);
  drawRiftMarker(shakeX, shakeY, zoom);
  if (flash > 0) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = `rgba(255,255,255,${flash * 0.55})`;
    ctx.fillRect(0, 0, cssW, cssH);
  }
}

function drawGrass() {
  const b = track.bounds;
  const pad = 480;
  const x = b.minX - pad;
  const y = b.minY - pad;
  const w = b.maxX - b.minX + pad * 2;
  const h = b.maxY - b.minY + pad * 2;
  ctx.fillStyle = "#14392a";
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = "rgba(8, 32, 22, 0.18)";
  for (let row = 0; row < h; row += 36) {
    if ((row / 36) % 2 === 0) ctx.fillRect(x, y + row, w, 18);
  }
}

function strokeRoad(width, color) {
  ctx.beginPath();
  track.pts.forEach((p, i) => {
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  });
  ctx.closePath();
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.lineWidth = width;
  ctx.strokeStyle = color;
  ctx.stroke();
}

function drawLoopMarks() {
  if (!track.loops) return;
  for (const loop of track.loops) {
    ctx.beginPath();
    ctx.arc(loop.x, loop.y, Math.max(28, loop.r - TRACK_HALF - 22), 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255,255,255,0.16)";
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 10]);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

function traceOffset(dist) {
  ctx.beginPath();
  track.pts.forEach((p, i) => {
    const x = p.x - Math.sin(p.ang) * dist;
    const y = p.y + Math.cos(p.ang) * dist;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.closePath();
}

function drawGrid() {
  const zoom = zoomNow();
  const left = cam.x - cssW / zoom;
  const right = cam.x + cssW / zoom;
  const top = cam.y - cssH / zoom;
  const bottom = cam.y + cssH / zoom;
  ctx.strokeStyle = "rgba(255,255,255,0.035)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = Math.floor(left / 90) * 90; x < right; x += 90) {
    ctx.moveTo(x, top);
    ctx.lineTo(x, bottom);
  }
  for (let y = Math.floor(top / 90) * 90; y < bottom; y += 90) {
    ctx.moveTo(left, y);
    ctx.lineTo(right, y);
  }
  ctx.stroke();
}

function drawRibbon(half, color) {
  const pts = track.pts;
  ctx.beginPath();
  for (let i = 0; i <= pts.length; i++) {
    const p = pts[i % pts.length];
    const nx = -Math.sin(p.ang);
    const ny = Math.cos(p.ang);
    const x = p.x + nx * half;
    const y = p.y + ny * half;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  for (let i = pts.length; i >= 0; i--) {
    const p = pts[i % pts.length];
    const nx = -Math.sin(p.ang);
    const ny = Math.cos(p.ang);
    ctx.lineTo(p.x - nx * half, p.y - ny * half);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function fillInfield() {
  ctx.beginPath();
  track.pts.forEach((p, i) => {
    const nx = -Math.sin(p.ang);
    const ny = Math.cos(p.ang);
    const x = p.x - nx * (TRACK_HALF + 6);
    const y = p.y - ny * (TRACK_HALF + 6);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.closePath();
  const b = track.bounds;
  const gx = (b.minX + b.maxX) / 2;
  const gy = (b.minY + b.maxY) / 2;
  const gr = Math.max(b.maxX - b.minX, b.maxY - b.minY) * 0.55;
  const g = ctx.createRadialGradient(gx, gy, 80, gx, gy, gr);
  g.addColorStop(0, "#1d4a32");
  g.addColorStop(1, "#143324");
  ctx.fillStyle = g;
  ctx.fill();
}

function drawRumble(side) {
  const dist = side * (TRACK_HALF + 8);
  traceOffset(dist);
  ctx.lineJoin = "round";
  ctx.lineWidth = 12;
  ctx.strokeStyle = "#f4f5f7";
  ctx.stroke();
  traceOffset(dist);
  ctx.setLineDash([16, 16]);
  ctx.lineDashOffset = side < 0 ? 16 : 0;
  ctx.strokeStyle = "#e10600";
  ctx.stroke();
  ctx.setLineDash([]);
}

function strokeEdge(side, color) {
  traceOffset(side * (TRACK_HALF - 12));
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.lineJoin = "round";
  ctx.stroke();
}

function drawCenterLine() {
  ctx.beginPath();
  track.pts.forEach((p, i) => {
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  });
  ctx.closePath();
  ctx.strokeStyle = "rgba(255,255,255,0.55)";
  ctx.lineWidth = 3;
  ctx.setLineDash([22, 26]);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawStartLine() {
  const cols = 14;
  const rows = 2;
  const cellW = (TRACK_HALF * 2) / cols;
  const cellH = 16;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const lat = -TRACK_HALF + (c + 0.5) * cellW;
      const p = edgePoint(6 + r * cellH, lat);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.ang);
      ctx.fillStyle = (c + r) % 2 === 0 ? "#f7f7f7" : "#17191f";
      ctx.fillRect(-cellH / 2, -cellW / 2 - 0.4, cellH, cellW + 0.8);
      ctx.restore();
    }
  }
}

function drawBoostPad() {
  const len = 300;
  for (let s = boostS; s < boostS + len; s += 14) {
    const p = sampleAt(s);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.ang);
    ctx.fillStyle = "rgba(255, 196, 60, 0.14)";
    ctx.fillRect(-7, -(TRACK_HALF - 28), 14, (TRACK_HALF - 28) * 2);
    ctx.restore();
  }
  for (let s = boostS + 24; s < boostS + len - 16; s += 76) {
    const p = sampleAt(s);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.ang);
    ctx.fillStyle = "rgba(255, 214, 80, 0.92)";
    ctx.beginPath();
    ctx.moveTo(12, 0);
    ctx.lineTo(-8, -18);
    ctx.lineTo(-2, -18);
    ctx.lineTo(16, 0);
    ctx.lineTo(-2, 18);
    ctx.lineTo(-8, 18);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

function drawRift() {
  const open = riftOpenNow();
  const entry = sampleAt(riftS);
  const exit = sampleAt(riftS + track.len * jumpFraction(player));
  drawPortal(entry.x, entry.y, open, "#c084fc");
  drawPortal(exit.x, exit.y, open, "#7af0ff");
}

function drawPortal(x, y, open, color) {
  ctx.save();
  ctx.globalAlpha = open ? 1 : 0.35;
  ctx.strokeStyle = color;
  ctx.lineWidth = 4;
  ctx.shadowColor = color;
  ctx.shadowBlur = 16;
  const t = performance.now() / 280;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    const spin = t * (i % 2 === 0 ? 1 : -1) + i;
    ctx.arc(x, y, 16 + i * 11, spin, spin + Math.PI * 1.25);
    ctx.stroke();
  }
  ctx.shadowBlur = 0;
  ctx.fillStyle = open ? "rgba(192,132,252,0.18)" : "rgba(80,70,110,0.15)";
  ctx.beginPath();
  ctx.arc(x, y, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawBox(box) {
  if (box.respawn > 0 && box.respawn < 1.2) ctx.globalAlpha = 1 - box.respawn / 1.2;
  else if (box.respawn > 0) return;
  const bob = Math.sin(performance.now() / 220 + box.bob) * 4;
  ctx.save();
  ctx.translate(box.x, box.y + bob);
  ctx.rotate(performance.now() / 700);
  ctx.fillStyle = "#ffd84a";
  ctx.strokeStyle = "#fff4c2";
  ctx.lineWidth = 3;
  ctx.shadowColor = "#ffd84a";
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.moveTo(0, -16);
  ctx.lineTo(16, 0);
  ctx.lineTo(0, 16);
  ctx.lineTo(-16, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.rotate(-performance.now() / 700);
  ctx.fillStyle = "#2a2110";
  ctx.font = "bold 16px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("?", 0, 1);
  ctx.restore();
  ctx.globalAlpha = 1;
}

function drawBanana(b) {
  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.rotate(performance.now() / 180);
  ctx.fillStyle = "#ffe14a";
  ctx.beginPath();
  ctx.ellipse(0, 0, 10, 5, 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawShell(shell) {
  ctx.save();
  ctx.translate(shell.x, shell.y);
  ctx.fillStyle = shell.kind === "red" ? "#ff3b3b" : "#39e07a";
  ctx.shadowColor = ctx.fillStyle;
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.arc(0, 0, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(255,255,255,0.7)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, 4, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function shadeColor(hex, amt) {
  if (!hex || hex[0] !== "#") return hex;
  const n = parseInt(hex.slice(1), 16);
  const ch = (c) => clamp((c + amt) | 0, 0, 255);
  return `rgb(${ch(n >> 16)},${ch((n >> 8) & 255)},${ch(n & 255)})`;
}

function kartSilhouette() {
  ctx.beginPath();
  ctx.moveTo(42, 0);
  ctx.lineTo(26, -7);
  ctx.lineTo(14, -9);
  ctx.lineTo(2, -10);
  ctx.lineTo(-18, -11);
  ctx.lineTo(-30, -13);
  ctx.lineTo(-32, -8);
  ctx.lineTo(-32, 8);
  ctx.lineTo(-30, 13);
  ctx.lineTo(-18, 11);
  ctx.lineTo(2, 10);
  ctx.lineTo(14, 9);
  ctx.lineTo(26, 7);
  ctx.closePath();
}

function drawWheel(x, y, w, h, turn) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(turn);
  ctx.fillStyle = "#12141a";
  roundRect(-w / 2, -h / 2, w, h, 2.5);
  ctx.fill();
  ctx.fillStyle = "#3a4150";
  roundRect(-w / 2 + 1.5, -h / 2 + 1.2, w - 3, h - 2.4, 2);
  ctx.fill();
  ctx.fillStyle = "#d5dbe8";
  ctx.beginPath();
  ctx.arc(0, 0, Math.min(w, h) * 0.28, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawFlame(hot) {
  const flick = 10 + Math.random() * 16;
  ctx.fillStyle = hot ? "#ff6a1a" : "#49d7ff";
  ctx.beginPath();
  ctx.moveTo(-24, -7);
  ctx.quadraticCurveTo(-36 - flick, 0, -24, 7);
  ctx.quadraticCurveTo(-30, 0, -24, -7);
  ctx.fill();
  ctx.fillStyle = "#fff6d0";
  ctx.beginPath();
  ctx.moveTo(-24, -3.5);
  ctx.quadraticCurveTo(-30 - flick * 0.55, 0, -24, 3.5);
  ctx.fill();
}

function drawKart(k) {
  const sc = scaleOf(k) * 1.45;
  const starred = k.star > 0;
  const body = starred ? `hsl(${(performance.now() / 4) % 360} 92% 58%)` : k.color;
  const paint = starred ? body : shadeColor(k.color, 36);
  const paintDark = starred ? body : shadeColor(k.color, -46);
  const turn = (k.visualSteer || 0) * 0.5;

  ctx.save();
  ctx.translate(k.x + 3, k.y + 8);
  ctx.rotate(k.angle);
  ctx.scale(sc, sc * 0.9);
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.beginPath();
  ctx.ellipse(2, 0, 36, 18, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(k.x, k.y);
  ctx.rotate(k.angle);
  ctx.scale(sc, sc);
  ctx.globalAlpha = k.phase > 0 ? 0.48 : k.iframe > 0 && Math.sin(performance.now() / 40) > 0.2 ? 0.62 : 1;

  if (k.boost > 0 || starred) drawFlame(k.boostExtra > 120 || starred);

  drawWheel(-18, -22, 22, 12, 0);
  drawWheel(-18, 22, 22, 12, 0);
  drawWheel(16, -20, 16, 10, turn);
  drawWheel(16, 20, 16, 10, turn);

  ctx.fillStyle = paintDark;
  roundRect(-6, -16, 16, 8, 3);
  ctx.fill();
  roundRect(-6, 8, 16, 8, 3);
  ctx.fill();

  const grad = ctx.createLinearGradient(0, -14, 0, 14);
  grad.addColorStop(0, paint);
  grad.addColorStop(0.5, body);
  grad.addColorStop(1, paintDark);
  kartSilhouette();
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = "#12151c";
  ctx.stroke();

  ctx.fillStyle = "rgba(255,255,255,0.28)";
  ctx.beginPath();
  ctx.moveTo(30, 0);
  ctx.lineTo(-20, -2.2);
  ctx.lineTo(-20, 2.2);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#10141c";
  roundRect(-10, -7, 18, 14, 5);
  ctx.fill();
  ctx.fillStyle = starred ? "#fff" : (k.player ? "#ffe39a" : "#f4f7ff");
  ctx.beginPath();
  ctx.arc(-2, 0, 5.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#1c2430";
  ctx.fillRect(-6.2, -1.3, 8.4, 2.6);
  ctx.fillStyle = "rgba(190, 225, 255, 0.95)";
  ctx.beginPath();
  ctx.moveTo(8, 0);
  ctx.lineTo(1, -4.5);
  ctx.lineTo(1, 4.5);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#141820";
  ctx.fillRect(-36, -20, 7, 40);
  ctx.fillStyle = paintDark;
  ctx.fillRect(-34, -24, 5, 8);
  ctx.fillRect(-34, 16, 5, 8);
  ctx.fillRect(-30, -18, 10, 3);
  ctx.fillRect(-30, 15, 10, 3);

  ctx.fillStyle = paint;
  ctx.beginPath();
  ctx.moveTo(36, 0);
  ctx.lineTo(24, -6);
  ctx.lineTo(24, 6);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#fff6cc";
  ctx.shadowColor = "#ffe28a";
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.ellipse(28, -4.5, 3.2, 1.8, 0.2, 0, Math.PI * 2);
  ctx.ellipse(28, 4.5, 3.2, 1.8, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#ff2a4a";
  ctx.fillRect(-31, -9, 5, 3.4);
  ctx.fillRect(-31, 5.6, 5, 3.4);

  ctx.restore();

  ctx.save();
  ctx.translate(k.x, k.y);
  ctx.globalAlpha = k.phase > 0 ? 0.75 : 1;
  ctx.font = "700 11px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const labelW = ctx.measureText(k.name).width;
  ctx.fillStyle = "rgba(6, 8, 14, 0.78)";
  roundRect(-labelW / 2 - 7, -62, labelW + 14, 16, 8);
  ctx.fill();
  ctx.fillStyle = k.player ? "#ffd84a" : "#f4f7ff";
  ctx.fillText(k.name, 0, -54);
  ctx.restore();
}

function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawMinimap() {
  const w = 168;
  const h = 112;
  const x = cssW - w - 16;
  const y = cssH - h - 16;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = "rgba(6,8,16,0.72)";
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 1;
  roundRect(x, y, w, h, 12);
  ctx.fill();
  ctx.stroke();
  const b = track.bounds;
  const sc = Math.min((w - 24) / (b.maxX - b.minX), (h - 24) / (b.maxY - b.minY));
  const ox = x + w / 2 - ((b.minX + b.maxX) / 2) * sc;
  const oy = y + h / 2 - ((b.minY + b.maxY) / 2) * sc;
  ctx.beginPath();
  track.pts.forEach((p, i) => {
    const px = ox + p.x * sc;
    const py = oy + p.y * sc;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.closePath();
  ctx.strokeStyle = "rgba(90, 210, 255, 0.9)";
  ctx.lineWidth = 3;
  ctx.stroke();
  const entry = sampleAt(riftS);
  ctx.fillStyle = riftOpenNow() ? "#c084fc" : "#4b3a63";
  ctx.beginPath();
  ctx.arc(ox + entry.x * sc, oy + entry.y * sc, 4, 0, Math.PI * 2);
  ctx.fill();
  for (const k of karts) {
    ctx.fillStyle = k.color;
    ctx.beginPath();
    ctx.arc(ox + k.x * sc, oy + k.y * sc, k.player ? 4.5 : 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawRiftMarker(shakeX, shakeY, zoom) {
  if (!riftOpenNow() || state === "title") return;
  const entry = sampleAt(riftS);
  const sx = (entry.x - cam.x + shakeX) * zoom + cssW / 2;
  const sy = (entry.y - cam.y + shakeY) * zoom + cssH / 2;
  if (sx > 40 && sx < cssW - 40 && sy > 40 && sy < cssH - 40) return;
  const cx = cssW / 2;
  const cy = cssH / 2;
  const ang = Math.atan2(sy - cy, sx - cx);
  let px = clamp(cx + Math.cos(ang) * (cssW * 0.42), 28, cssW - 28);
  let py = clamp(cy + Math.sin(ang) * (cssH * 0.38), 28, cssH - 28);
  if (px > cssW - 210 && py < 220) py = 228;
  if (px > cssW - 210 && py > cssH - 150) py = cssH - 158;
  if (py > cssH - 120 && px > cssW * 0.35 && px < cssW * 0.65) py = cssH - 130;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = "#c084fc";
  ctx.font = "bold 12px sans-serif";
  ctx.textAlign = "center";
  ctx.beginPath();
  ctx.arc(px, py, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#1a1028";
  ctx.fillText("R", px, py + 4);
}

function syncUI() {
  ui.title.classList.toggle("show", state === "title");
  ui.hud.classList.toggle("show", state === "race" || state === "countdown" || state === "paused");
  ui.pause.classList.toggle("show", state === "paused");
  ui.results.classList.toggle("show", state === "results");

  const showCount = state === "countdown" && countLeft > -0.55;
  ui.count.hidden = !showCount;
  if (showCount) ui.count.textContent = countLeft > 0 ? String(Math.ceil(countLeft)) : "GO";

  ui.banner.hidden = bannerT <= 0 || state === "title" || state === "results";
  ui.banner.textContent = bannerText;
  ui.wrong.hidden = !(state === "race" && player && player.wrong);

  if ((state === "race" || state === "countdown" || state === "paused") && player) {
    const rank = rankOf(player);
    ui.place.textContent = placeLabel(rank);
    ui.lap.textContent = player.finished ? "FINISH" : `LAP ${Math.min(player.lap + 1, LAPS)}/${LAPS}`;
    ui.clock.textContent = formatTime(raceTime);
    ui.speed.textContent = String(Math.round(Math.hypot(player.vx, player.vy) * 0.36));
    const open = riftOpenNow();
    const cycle = (state === "countdown" ? 0 : raceTime) % RIFT_PERIOD;
    const left = open ? RIFT_OPEN_FOR - cycle : RIFT_PERIOD - cycle;
    const pct = Math.round(jumpFraction(player) * 100);
    ui.rift.classList.toggle("closed", !open);
    ui.rift.textContent = open ? `RIFT OPEN · +${pct}%` : `RIFT IN ${Math.ceil(left)}s · +${pct}%`;
    ui.board.innerHTML = standings().map((k, i) =>
      `<li class="${k.player ? "me" : ""}"><b>${i + 1}</b><span style="color:${k.color}">●</span>${k.name}</li>`
    ).join("");

    const rolling = player.rolling > 0;
    const info = player.item ? ITEM_INFO[player.item] : rolling ? ITEM_INFO[ITEM_TABLE[player.rollVis].id] : null;
    ui.glyph.textContent = info ? info.glyph : "·";
    ui.itemName.textContent = rolling ? "..." : info ? info.name : "EMPTY";
    ui.itemSlot.style.borderColor = info ? info.color : "#31405f";
    ui.itemSlot.style.color = info ? info.color : "#f4f7ff";
    ui.itemHint.hidden = !info || rolling;

    const charging = player.driftCharge > 0.02;
    ui.driftBar.hidden = !charging;
    const amount = player.boost > 0 ? 1 : player.driftCharge / 1.5;
    ui.driftFill.style.width = `${amount * 100}%`;
    ui.driftFill.style.background = player.driftCharge >= 1.15 || player.boostExtra > 130 ? "#ff9a3c" : player.driftCharge >= 0.48 ? "#3dfff3" : "#fff";
  }

  if (state === "results" && resultSnap && !ui.results.dataset.filled) {
    ui.results.dataset.filled = "1";
    const mine = resultSnap.find((r) => r.player);
    const headlines = ["YOU WIN", "SECOND PLACE", "THIRD PLACE", "LAST PLACE"];
    const subs = [
      "The rift never stood a chance.",
      "One cleaner drift and that was yours.",
      "The rift pays the people behind you. Use it.",
      "Dead last. Next time, wait for the purple gate.",
    ];
    ui.resultTitle.textContent = headlines[mine.place] || "FINISH";
    ui.resultSub.textContent = subs[mine.place] || "";
    ui.resultList.innerHTML = resultSnap.map((r) =>
      `<li class="${r.player ? "me" : ""}"><span>${placeLabel(r.place)}  ${r.name}</span><span>${r.finished ? formatTime(r.finishTime) : "out on track"}</span></li>`
    ).join("");
  }
  if (state !== "results") delete ui.results.dataset.filled;
}

function ensureAudio() {
  if (!audio.ctx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    audio.ctx = new Ctx();
  }
  if (audio.ctx.state === "suspended") audio.ctx.resume();
  if (!audio.engine && audio.ctx) {
    const osc = audio.ctx.createOscillator();
    const filter = audio.ctx.createBiquadFilter();
    const gain = audio.ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.value = 50;
    filter.type = "lowpass";
    filter.frequency.value = 420;
    gain.gain.value = 0;
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(audio.ctx.destination);
    osc.start();
    audio.engine = { osc, gain };
  }
}

function tone(freq, dur, type, vol, freq2) {
  if (!audio.ctx || audio.muted) return;
  const t = audio.ctx.currentTime;
  const o = audio.ctx.createOscillator();
  const g = audio.ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (freq2) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq2), t + dur);
  g.gain.setValueAtTime(Math.max(0.001, vol), t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g);
  g.connect(audio.ctx.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function updateEngine() {
  if (!audio.engine || !audio.ctx) return;
  const speed = player ? Math.hypot(player.vx, player.vy) : 0;
  const throttle = keys.has("w") || keys.has("arrowup");
  const targetF = 46 + speed * 0.2 + (throttle ? 24 : 0) + (player && player.boost > 0 ? 30 : 0);
  audio.engine.osc.frequency.setTargetAtTime(targetF, audio.ctx.currentTime, 0.08);
  const vol = audio.muted || state === "title" || state === "results" || state === "paused" ? 0 : 0.012 + Math.min(0.02, speed / 25000);
  audio.engine.gain.gain.setTargetAtTime(vol, audio.ctx.currentTime, 0.05);
}

function togglePause() {
  if (state === "race" || state === "countdown") state = "paused";
  else if (state === "paused") state = countLeft > -0.55 && raceTime === 0 ? "countdown" : "race";
}

function onKeyDown(e) {
  const key = e.key.toLowerCase();
  keys.add(key);
  if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(key)) e.preventDefault();
  if (key === " " && !e.repeat) itemQueued = true;
  if (key === "p" && !e.repeat) togglePause();
  if (key === "escape" && !e.repeat) togglePause();
  if (key === "m" && !e.repeat) {
    audio.muted = !audio.muted;
    banner(audio.muted ? "MUTED" : "SOUND ON");
  }
  if (key === "r" && !e.repeat && state !== "title") begin();
  if (key === "enter" && state === "title") begin();
}

function onKeyUp(e) {
  keys.delete(e.key.toLowerCase());
}

function resize() {
  dpr = Math.min(2, window.devicePixelRatio || 1);
  cssW = window.innerWidth;
  cssH = window.innerHeight;
  canvas.width = Math.floor(cssW * dpr);
  canvas.height = Math.floor(cssH * dpr);
}

function frame(now) {
  if (!frame.last) frame.last = now;
  const dt = Math.min(0.033, (now - frame.last) / 1000);
  frame.last = now;
  update(dt);
  render();
  syncUI();
  requestAnimationFrame(frame);
}

document.getElementById("start").addEventListener("click", begin);
document.getElementById("again").addEventListener("click", begin);
document.getElementById("resume").addEventListener("click", togglePause);
window.addEventListener("keydown", onKeyDown);
window.addEventListener("keyup", onKeyUp);
window.addEventListener("resize", resize);
window.addEventListener("blur", () => keys.clear());

resize();
buildTrack();
resetRace();
state = "title";
cam.x = 0;
cam.y = 0;
requestAnimationFrame(frame);
