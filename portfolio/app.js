let CONFIG = null;

let FONT = "";
let ICON_BASE = "";
const SVG_NS = "http://www.w3.org/2000/svg";
const XLINK_NS = "http://www.w3.org/1999/xlink";
let M = 64;
let EDGE = 8;
let MIN_W = 360;
let MIN_H = 300;
let MEDIA_GAP = 12;
let MEDIA_MIN_COL = 150;
let COLORS = {};
let PAGES = [];



const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => Math.min(Math.max(v, a), b);
const defs = $("defs");
const toastEl = $("toast");
const island = $("island");
const win = $("win");
const lens = $("lens");
const lensItems = $("lensItems");
const boxes = new Set();
const depthEls = [...document.querySelectorAll(".depth")];
const pointer = { x: innerWidth / 2, y: innerHeight / 2, nx: 0, ny: 0, cx: 0, cy: 0, moved: true };
const state = {
  page: "sobre", open: false, rect: null, prevRect: null, custom: false, max: false,
};
let bg = { w: 1920, h: 1080 };
let uid = 0;
let toastTimer = 0;
let clockBox = null;
let lastTime = "";

const icon = (name, cls = "") => `<img class="i${cls ? " " + cls : ""}" src="${ICON_BASE}${name}.svg?color=%23fff" alt="" draggable="false">`;
const hydrateIcons = () => document.querySelectorAll("[data-i]").forEach((el) => { el.outerHTML = icon(el.dataset.i, el.className); });

const E = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const colorOf = (c, fallback) => {
  if (!c) return fallback;
  c = c.trim().toLowerCase();
  return COLORS[c] || (/^#[0-9a-f]{3,8}$/.test(c) ? c : fallback);
};

function inline(text, full) {
  text = E(text).replace(/\{\{([\s\S]*?)\|([a-zA-Z#0-9]+)\}\}/g, (m, a, c) => `<span style="color:${colorOf(c, "inherit")}">${a}</span>`);
  if (!full) return text;
  return text
    .replace(/==([^=\n][^\n]*?)(?:\|([a-zA-Z#0-9]+))?==/g, (m, a, c) => `<mark style="--hl:${colorOf(c, "#ffd60a")}">${a}</mark>`)
    .replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>");
}

function rich(src) {
  src = String(src || "").replace(/\r/g, "").trim();
  const paragraphs = (t) => t.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean).map((p) => `<p>${inline(p, true).replace(/\n/g, "<br>")}</p>`).join("");
  const re = /^:::[^\n]*\n([\s\S]*?)\n:::[ \t]*$/gm;
  let html = "", last = 0, m;
  while ((m = re.exec(src))) {
    html += paragraphs(src.slice(last, m.index)) + `<pre class="ascii">${inline(m[1], false)}</pre>`;
    last = re.lastIndex;
  }
  return html + paragraphs(src.slice(last));
}

const money = (cur, v) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: cur }).format(v);
const svgEl = (tag, attrs) => {
  const el = document.createElementNS(SVG_NS, tag);
  for (const k in attrs) el.setAttribute(k, attrs[k]);
  return el;
};

function toast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2000);
}

function copyText(text, okMsg = "Copiado") {
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(() => toast(okMsg), () => toast(text));
  else toast(text);
}

const loadSize = (src) => new Promise((resolve) => {
  const im = new Image();
  im.onload = () => resolve({ w: im.naturalWidth, h: im.naturalHeight });
  im.onerror = () => resolve({ w: 1920, h: 1080 });
  im.src = src;
});

async function prepareMedia() {
  const cache = new Map();
  const sizeOf = (src) => {
    if (!cache.has(src)) cache.set(src, loadSize(src));
    return cache.get(src);
  };
  bg = await sizeOf(CONFIG.background);
  await Promise.all(CONFIG.media.map(async (m) => {
    const s = await sizeOf(m.src || CONFIG.background);
    const [, , w = 1, h = 1] = m.crop || [];
    m.size = { w: s.w * w, h: s.h * h };
  }));
}

function photoStyle(m) {
  const [x, y, w, h] = m.crop || [0, 0, 1, 1];
  const pos = (o, s) => (s >= 1 ? 0 : (o / (1 - s)) * 100);
  return `background-image:url("${m.src || CONFIG.background}");background-size:${100 / w}% ${100 / h}%;background-position:${pos(x, w)}% ${pos(y, h)}%`;
}

function bgGeom() {
  const vw = innerWidth, vh = innerHeight;
  const s = Math.max(vw / bg.w, vh / bg.h);
  return { vw, vh, dw: bg.w * s, dh: bg.h * s };
}

const fieldCache = new Map();

function fieldTiles(radius, bezel) {
  const key = radius + "|" + bezel;
  if (fieldCache.has(key)) return fieldCache.get(key);
  const mag = (d) => (d >= 0 && d < bezel ? Math.pow(1 - d / bezel, 2.2) : 0);
  const encode = (v) => Math.round(128 + v * 127);
  const make = (w, h, fn) => {
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    const img = ctx.createImageData(w, h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const [nx, ny, m] = fn(x + 0.5, y + 0.5);
        const i = (y * w + x) * 4;
        img.data[i] = encode(nx * m);
        img.data[i + 1] = encode(ny * m);
        img.data[i + 2] = 128;
        img.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    return canvas.toDataURL("image/png");
  };
  const corner = (ox, oy) => make(radius, radius, (x, y) => {
    const px = x + ox - radius, py = y + oy - radius;
    const len = Math.hypot(px, py) || 1;
    return [px / len, py / len, mag(radius - len)];
  });
  const tiles = {
    tl: corner(0, 0),
    tr: corner(radius, 0),
    bl: corner(0, radius),
    br: corner(radius, radius),
    el: make(bezel, 1, (x) => [-1, 0, mag(x)]),
    er: make(bezel, 1, (x) => [1, 0, mag(bezel - x)]),
    et: make(1, bezel, (x, y) => [0, -1, mag(y)]),
    eb: make(1, bezel, (x, y) => [0, 1, mag(bezel - y)])
  };
  fieldCache.set(key, tiles);
  return tiles;
}

function makeGlass(gw, gh, radius, bezel, opts = {}) {
  const id = "lg" + (++uid);
  const strength = Math.min(opts.strength || bezel * 2.2, (M - 4) * 2);
  const filter = svgEl("filter", { id, filterUnits: "userSpaceOnUse", primitiveUnits: "userSpaceOnUse", "color-interpolation-filters": "sRGB", x: 0, y: 0, width: gw + M * 2, height: gh + M * 2 });
  const addImage = (result, href) => {
    const fi = svgEl("feImage", { result, preserveAspectRatio: "none", href });
    fi.setAttributeNS(XLINK_NS, "xlink:href", href);
    filter.appendChild(fi);
    return fi;
  };
  const setBox = (el, x, y, w, h) => {
    el.setAttribute("x", x);
    el.setAttribute("y", y);
    el.setAttribute("width", Math.max(0, w));
    el.setAttribute("height", Math.max(0, h));
  };

  let slices = null;
  if (opts.mapUrl) {
    setBox(addImage("map", opts.mapUrl), 0, 0, gw + M * 2, gh + M * 2);
  } else {
    filter.appendChild(svgEl("feFlood", { "flood-color": "rgb(128,128,128)", result: "flat" }));
    const tiles = fieldTiles(radius, bezel);
    slices = Object.keys(tiles).map((k) => [k, addImage("s_" + k, tiles[k])]);
    const merge = svgEl("feMerge", { result: "map" });
    ["flat", ...slices.map(([k]) => "s_" + k)].forEach((n) => merge.appendChild(svgEl("feMergeNode", { in: n })));
    filter.appendChild(merge);
  }

  [
    ["1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0", 1],
    ["0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0", 0.92],
    ["0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0", 0.84]
  ].forEach(([values, k], i) => {
    filter.appendChild(svgEl("feDisplacementMap", { in: "SourceGraphic", in2: "map", scale: strength * k, xChannelSelector: "R", yChannelSelector: "G", result: "d" + i }));
    filter.appendChild(svgEl("feColorMatrix", { in: "d" + i, type: "matrix", values, result: "c" + i }));
  });
  filter.appendChild(svgEl("feBlend", { in: "c0", in2: "c1", mode: "screen", result: "rg" }));
  filter.appendChild(svgEl("feBlend", { in: "rg", in2: "c2", mode: "screen", result: "rgb" }));
  filter.appendChild(svgEl("feGaussianBlur", { in: "rgb", stdDeviation: 0.5 }));
  defs.appendChild(filter);

  const pane = document.createElement("div");
  pane.className = "pane" + (opts.mask ? " masked" : "");
  pane.style.borderRadius = radius + "px";
  if (opts.mask) {
    pane.style.webkitMaskImage = `url(${opts.mask})`;
    pane.style.maskImage = `url(${opts.mask})`;
  }

  const glass = document.createElement("div");
  glass.className = "glass";
  glass.style.cssText = `left:${-M}px;top:${-M}px;filter:url(#${id}) saturate(1.5) brightness(1.1)`;
  pane.appendChild(glass);

  if (!opts.mask) {
    const tint = document.createElement("div");
    tint.className = "tint";
    tint.style.background = opts.tint || "rgba(255,255,255,.07)";
    const shine = document.createElement("div");
    shine.className = "shine";
    pane.append(tint, shine);
  }

  const resize = (w, h) => {
    const W = w + M * 2, H = h + M * 2;
    pane.style.width = w + "px";
    pane.style.height = h + "px";
    glass.style.width = W + "px";
    glass.style.height = H + "px";
    filter.setAttribute("width", W);
    filter.setAttribute("height", H);
    if (!slices) return;
    const r = radius, b = bezel, ex = w - 2 * r, ey = h - 2 * r;
    const rects = {
      tl: [M, M, r, r],
      tr: [M + w - r, M, r, r],
      bl: [M, M + h - r, r, r],
      br: [M + w - r, M + h - r, r, r],
      el: [M, M + r, b, ey],
      er: [M + w - b, M + r, b, ey],
      et: [M + r, M, ex, b],
      eb: [M + r, M + h - b, ex, b]
    };
    slices.forEach(([k, el]) => setBox(el, ...rects[k]));
  };
  resize(gw, gh);

  const sync = (x, y) => {
    const g = bgGeom();
    glass.style.backgroundSize = `100% 100%, ${g.dw}px ${g.dh}px`;
    glass.style.backgroundPosition = `0 0, ${(g.vw - g.dw) / 2 - (x - M)}px ${(g.vh - g.dh) / 2 - (y - M)}px`;
  };
  return { id, pane, sync, resize: opts.mapUrl ? null : resize };
}

const radiusOf = (el) => Math.floor(Math.min(+el.dataset.radius, el.offsetHeight / 2, el.offsetWidth / 2));

function mountGlass(el) {
  const prev = el._box;
  if (prev) {
    const old = $(prev.glass.id);
    if (old) old.remove();
    prev.glass.pane.remove();
    boxes.delete(prev);
  }
  const w = el.offsetWidth, h = el.offsetHeight;
  if (!w || !h) {
    el._box = null;
    return;
  }
  const radius = radiusOf(el);
  el.style.borderRadius = radius + "px";
  const bezel = Math.min(+el.dataset.bezel, radius);
  const glass = makeGlass(w, h, radius, bezel, { tint: el.dataset.tint, strength: bezel * (+el.dataset.power || 2.2) });
  el.insertBefore(glass.pane, el.firstChild);
  const box = { el, glass, radius, lx: NaN, ly: NaN, size: w + "x" + h };
  el._box = box;
  boxes.add(box);
  pointer.moved = true;
}

const rebuildTimers = new Map();
const observer = new ResizeObserver((entries) => {
  for (const { target: el } of entries) {
    const box = el._box, w = el.offsetWidth, h = el.offsetHeight;
    if (box && box.size === w + "x" + h) continue;
    if (box && w && h && box.glass.resize && radiusOf(el) === box.radius) {
      box.glass.resize(w, h);
      box.size = w + "x" + h;
      continue;
    }
    clearTimeout(rebuildTimers.get(el));
    rebuildTimers.set(el, setTimeout(() => mountGlass(el), 120));
  }
});

const lensGlasses = new Map();
let lensBox = null;

function setLens(w, h) {
  const key = w + "x" + h;
  if (lens._key === key) return;
  lens._key = key;
  const radius = Math.floor(h / 2);
  let glass = lensGlasses.get(key);
  if (!glass) {
    const bezel = Math.min(18, radius);
    glass = makeGlass(w, h, radius, bezel, { strength: bezel * 4.2, tint: "rgba(255,255,255,.12)" });
    lensGlasses.set(key, glass);
  }
  if (lensBox) lensBox.glass.pane.remove();
  lens.insertBefore(glass.pane, lens.firstChild);
  lens.style.width = w + "px";
  lens.style.height = h + "px";
  lens.style.borderRadius = radius + "px";
  if (lensBox) {
    lensBox.glass = glass;
    lensBox.lx = NaN;
  } else {
    lensBox = { el: lens, glass, lx: NaN, ly: NaN };
    boxes.add(lensBox);
  }
}

const timeString = () => new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

function buildClock() {
  const host = $("timebox");
  if (clockBox) {
    const old = $(clockBox.glass.id);
    if (old) old.remove();
    boxes.delete(clockBox);
    clockBox = null;
  }
  host.innerHTML = "";
  const text = timeString();
  lastTime = text;
  host.setAttribute("aria-label", text);

  const fs = innerWidth < 700 ? 92 : Math.round(clamp(innerHeight * 0.17, 100, 168));
  const font = `700 ${fs}px ${FONT}`;
  const meas = document.createElement("canvas").getContext("2d");
  meas.font = font;
  const gw = Math.ceil(meas.measureText(text).width) + 24;
  const gh = Math.ceil(fs * 1.1);
  host.style.width = gw + "px";
  host.style.height = gh + "px";
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const baseY = Math.round(gh / 2 + fs * 0.36);

  const drawText = (ctx, fn) => {
    ctx.font = font;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.lineJoin = "round";
    fn(ctx, gw / 2, baseY);
  };

  const maskC = document.createElement("canvas");
  maskC.width = gw * dpr;
  maskC.height = gh * dpr;
  const mctx = maskC.getContext("2d");
  mctx.scale(dpr, dpr);
  drawText(mctx, (c, x, y) => { c.fillStyle = "#000"; c.fillText(text, x, y); });

  const W = gw + M * 2, H = gh + M * 2;
  const rawC = document.createElement("canvas");
  rawC.width = W;
  rawC.height = H;
  const rctx = rawC.getContext("2d", { willReadFrequently: true });
  rctx.drawImage(maskC, M, M, gw, gh);
  const blurC = document.createElement("canvas");
  blurC.width = W;
  blurC.height = H;
  const bctx = blurC.getContext("2d", { willReadFrequently: true });
  bctx.filter = "blur(4.5px)";
  bctx.drawImage(rawC, 0, 0);
  const raw = rctx.getImageData(0, 0, W, H).data;
  const bl = bctx.getImageData(0, 0, W, H).data;

  const out = document.createElement("canvas");
  out.width = W;
  out.height = H;
  const octx = out.getContext("2d");
  const img = octx.createImageData(W, H);
  const A = (x, y) => bl[(clamp(y, 0, H - 1) * W + clamp(x, 0, W - 1)) * 4 + 3] / 255;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      let r = 128, g = 128;
      if (raw[i + 3] > 8) {
        const h = A(x, y);
        const gx = (A(x + 1, y) - A(x - 1, y)) * 0.5;
        const gy = (A(x, y + 1) - A(x, y - 1)) * 0.5;
        const gl = Math.hypot(gx, gy);
        if (gl > 0.002) {
          const t = clamp((1 - h) * 2.1, 0, 1);
          const mag = Math.pow(t, 1.4);
          r = 128 + (-gx / gl) * mag * 127;
          g = 128 + (-gy / gl) * mag * 127;
        }
      }
      img.data[i] = r;
      img.data[i + 1] = g;
      img.data[i + 2] = 128;
      img.data[i + 3] = 255;
    }
  }
  octx.putImageData(img, 0, 0);

  const glass = makeGlass(gw, gh, 0, 0, { mapUrl: out.toDataURL("image/png"), strength: 12, mask: maskC.toDataURL("image/png") });
  host.appendChild(glass.pane);

  const hl = document.createElement("canvas");
  hl.className = "hl";
  hl.width = gw * dpr;
  hl.height = gh * dpr;
  hl.style.width = gw + "px";
  hl.style.height = gh + "px";
  const hctx = hl.getContext("2d");
  hctx.scale(dpr, dpr);
  drawText(hctx, (c, x, y) => {
    c.fillStyle = "rgba(255,255,255,.15)";
    c.fillText(text, x, y);
    const grad = c.createLinearGradient(0, 0, gw, gh);
    grad.addColorStop(0, "rgba(255,255,255,.62)");
    grad.addColorStop(0.5, "rgba(255,255,255,.24)");
    grad.addColorStop(1, "rgba(255,255,255,.48)");
    c.strokeStyle = grad;
    c.lineWidth = 1.2;
    c.strokeText(text, x, y);
  });
  host.appendChild(hl);

  clockBox = { el: host, glass, lx: NaN, ly: NaN, size: "" };
  boxes.add(clockBox);
}

function tick() {
  const ds = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
  $("date").textContent = ds.charAt(0).toUpperCase() + ds.slice(1);
  if (clockBox && timeString() !== lastTime) buildClock();
}

function renderProfile() {
  $("avatar").innerHTML = CONFIG.avatar ? `<img src="${E(CONFIG.avatar)}" alt="">` : icon("person-fill");
  $("pname").textContent = CONFIG.name;
  $("links").innerHTML =
    `<a class="lk" href="${E(CONFIG.profile.github)}" target="_blank" rel="noopener" aria-label="GitHub">${icon("code-slash")}GitHub</a>` +
    `<button class="lk" id="lkDc" aria-label="Discord">${icon("discord")}Discord</button>` +
    `<a class="lk" href="mailto:${E(CONFIG.profile.email)}" aria-label="E-mail">${icon("envelope")}E-mail</a>`;
  $("lkDc").addEventListener("click", () => copyText(CONFIG.profile.discord, "Discord copiado: " + CONFIG.profile.discord));
}

function renderNav() {
  const label = (p) => `${icon(p.icon)}<span>${p.label}</span>`;
  $("navItems").insertAdjacentHTML("beforeend", PAGES.map((p) => `<button class="nb" data-page="${p.id}">${label(p)}</button>`).join(""));
  lensItems.innerHTML = PAGES.map((p) => `<span class="nb">${label(p)}</span>`).join("");
  $("navItems").addEventListener("click", (e) => {
    const b = e.target.closest(".nb[data-page]");
    if (b) go(b.dataset.page);
  });
}

function moveHl() {
  const b = document.querySelector(`.nb[data-page="${state.page}"]`);
  if (!b || !state.open) {
    lens.style.opacity = "0";
    return;
  }
  const x = b.offsetLeft, y = b.offsetTop, w = b.offsetWidth, h = b.offsetHeight;
  const items = $("navItems");
  setLens(w, h);
  lens.style.transform = `translate(${x}px, ${y}px)`;
  lens.style.opacity = "1";
  lensItems.style.width = items.offsetWidth + "px";
  lensItems.style.height = items.offsetHeight + "px";
  lensItems.style.transformOrigin = `${x + w / 2}px ${y + h / 2}px`;
  lensItems.style.transform = `translate(${-x}px, ${-y}px) scale(1.14)`;
}

function navActive() {
  document.querySelectorAll(".nb[data-page]").forEach((b) => b.classList.toggle("on", state.open && b.dataset.page === state.page));
  moveHl();
}

function defaultRect() {
  const vw = innerWidth, vh = innerHeight;
  const mobile = vw <= 700;
  const top = mobile ? CONFIG.window.mobileTop : CONFIG.window.desktopTop, bottom = mobile ? CONFIG.window.mobileBottom : CONFIG.window.desktopBottom;
  const w = Math.min(CONFIG.window.defaultMaxWidth, vw - 24);
  return { x: (vw - w) / 2, y: top, w, h: Math.max(MIN_H, vh - top - bottom) };
}

function applyRect() {
  const s = win.style, r = state.rect;
  s.left = r.x + "px";
  s.top = r.y + "px";
  s.width = r.w + "px";
  s.height = r.h + "px";
}

function fitRect() {
  const r = state.custom ? { ...state.rect } : defaultRect();
  r.w = Math.min(r.w, innerWidth - EDGE * 2);
  r.h = Math.min(r.h, innerHeight - EDGE * 2);
  r.x = clamp(r.x, EDGE, innerWidth - r.w - EDGE);
  r.y = clamp(r.y, EDGE, innerHeight - r.h - EDGE);
  state.rect = r;
  applyRect();
}

function toggleMax() {
  if (state.max) {
    state.rect = state.prevRect;
  } else {
    state.prevRect = { ...state.rect };
    const w = Math.min(CONFIG.window.fullscreenMaxWidth, innerWidth - 24);
    state.rect = { ...state.rect, x: (innerWidth - w) / 2, w };
  }
  state.max = !state.max;
  state.custom = true;
  win.classList.add("animrect");
  applyRect();
  setTimeout(() => win.classList.remove("animrect"), 500);
}

function closeWin() {
  state.open = false;
  win.classList.remove("open", "animrect", "launching", "content-visible");
  win.setAttribute("aria-hidden", "true");
  $("clockin").classList.remove("hide");
  navActive();
  try { history.replaceState(null, "", location.pathname + location.search); } catch (e) {}
}

function launchWindowFromLens() {
  const button = document.querySelector(`.nb[data-page="${state.page}"]`);
  if (!button) return false;
  const from = button.getBoundingClientRect(), r = state.rect;
  if (!from.width || !from.height) return false;

  win.classList.remove("open", "animrect", "launching", "content-visible");
  win.style.left = from.left + "px";
  win.style.top = from.top + "px";
  win.style.width = from.width + "px";
  win.style.height = from.height + "px";
  win.style.borderRadius = Math.min(from.width, from.height) / 2 + "px";
  win.offsetWidth;
  win.classList.add("animrect", "launching");
  requestAnimationFrame(() => {
    if (!state.open) return;
    applyRect();
    win.style.borderRadius = win.dataset.radius + "px";
    win.classList.add("open");
    win.setAttribute("aria-hidden", "false");
    setTimeout(() => win.classList.add("content-visible"), 150);
    setTimeout(() => win.classList.remove("animrect", "launching", "content-visible"), 720);
  });
  return true;
}

function go(id) {
  const to = PAGES.findIndex((p) => p.id === id);
  if (to < 0) return;
  if (state.open && state.page === id) return closeWin();
  const from = PAGES.findIndex((p) => p.id === state.page);
  const wasOpen = state.open;
  state.page = id;
  state.open = true;
  $("wTitle").textContent = PAGES[to].label;
  $("pg").style.setProperty("--dx", (wasOpen ? (to >= from ? 26 : -26) : 0) + "px");
  renderPage(true);
  $("clockin").classList.add("hide");
  navActive();
  if (!wasOpen && !launchWindowFromLens()) {
    win.classList.add("open");
    win.setAttribute("aria-hidden", "false");
  }
  if (wasOpen) {
    win.classList.add("open");
    win.setAttribute("aria-hidden", "false");
  }
  try { history.replaceState(null, "", "#" + id); } catch (e) {}
}

function setupWindow() {
  ["n", "s", "e", "w", "ne", "nw", "se", "sw"].forEach((d) => {
    const h = document.createElement("i");
    h.className = "rz rz-" + d;
    h.dataset.d = d;
    win.appendChild(h);
  });

  let drag = null;
  const begin = (e, dir, el) => {
    el.setPointerCapture(e.pointerId);
    drag = { dir, x: e.clientX, y: e.clientY, r: { ...state.rect } };
  };

  win.addEventListener("pointerdown", (e) => {
    const handle = e.target.closest(".rz");
    if (handle) return begin(e, handle.dataset.d, handle);
    if (e.target.closest(".wbar") && !e.target.closest(".dt")) begin(e, "move", $("wbar"));
  });

  win.addEventListener("pointermove", (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y, o = drag.r, r = { ...o };
    const vw = innerWidth, vh = innerHeight, d = drag.dir;
    if (d === "move") {
      r.x = clamp(o.x + dx, EDGE, Math.max(EDGE, vw - o.w - EDGE));
      r.y = clamp(o.y + dy, EDGE, Math.max(EDGE, vh - o.h - EDGE));
    } else {
      if (d.includes("e")) r.w = clamp(o.w + dx, MIN_W, vw - EDGE - o.x);
      if (d.includes("w")) {
        r.w = clamp(o.w - dx, MIN_W, o.x + o.w - EDGE);
        r.x = o.x + o.w - r.w;
      }
      if (d.includes("s")) r.h = clamp(o.h + dy, MIN_H, vh - EDGE - o.y);
      if (d.includes("n")) {
        r.h = clamp(o.h - dy, MIN_H, o.y + o.h - EDGE);
        r.y = o.y + o.h - r.h;
      }
    }
    state.rect = r;
    state.custom = true;
    state.max = false;
    applyRect();
  });

  const end = () => { drag = null; };
  win.addEventListener("pointerup", end);
  win.addEventListener("pointercancel", end);

  $("wClose").addEventListener("click", closeWin);
  $("wMin").addEventListener("click", closeWin);
  $("wMax").addEventListener("click", toggleMax);
  $("wbar").addEventListener("dblclick", (e) => {
    if (!e.target.closest(".dt")) toggleMax();
  });
}

const experienceTimeline = () => `<div class="tl">${CONFIG.experiences.map((e) =>
  `<article class="tli"><span class="dot"></span><div class="tlh"><h3>${E(e.title)}</h3><span class="per">${E(e.period)}</span></div>${e.place ? `<div class="plc">${E(e.place)}</div>` : ""}<div class="rich">${rich(e.description)}</div></article>`).join("")}</div>`;
const pageAbout = () => `<div class="rich">${rich(CONFIG.about)}</div><h2 class="section-title">Experiências</h2>${experienceTimeline()}`;

const pageMedia = () => `<div class="mgrid" id="mgrid"></div>`;

const pageLinks = () => `<div class="link-folders">${CONFIG.links.map((folder, i) => `<details class="link-folder" ${i === 0 ? "open" : ""}><summary>${icon(folder.icon)}<span>${E(folder.title)}</span>${icon("chevron-down", "folder-chevron")}</summary><div class="folder-items">${folder.items.map((item) => `<a class="resource-link" href="${E(item.url)}" target="_blank" rel="noopener noreferrer"><span><b>${E(item.label)}</b><small>${E(item.detail)}</small></span>${icon("box-arrow-up-right")}</a>`).join("")}</div></details>`).join("")}</div>`;

const mediaItem = (m, i) =>
  `<button class="mth" data-act="lb" data-i="${i}" aria-label="${E(m.title)}" style="aspect-ratio:${m.size.w / m.size.h}"><span class="photo" style="${photoStyle(m)}"></span><span class="cap">${E(m.title)}</span></button>`;

function layoutMedia() {
  const grid = $("mgrid");
  if (!grid) return;
  const n = Math.max(2, Math.floor((grid.clientWidth + MEDIA_GAP) / (MEDIA_MIN_COL + MEDIA_GAP)));
  if (+grid.dataset.cols === n) return;
  grid.dataset.cols = n;
  const cols = Array.from({ length: n }, () => ({ h: 0, html: "" }));
  CONFIG.media.forEach((m, i) => {
    const col = cols.reduce((a, b) => (b.h < a.h ? b : a));
    col.h += m.size.h / m.size.w;
    col.html += mediaItem(m, i);
  });
  grid.innerHTML = cols.map((c) => `<div class="mcol">${c.html}</div>`).join("");
}

const PAGE_RENDERERS = { sobre: pageAbout, midias: pageMedia, links: pageLinks };

function renderPage(animate) {
  const pg = $("pg");
  const keep = animate ? 0 : pg.scrollTop;
  pg.innerHTML = `<div class="${animate ? "pgin" : ""}">${PAGE_RENDERERS[state.page]()}</div>`;
  pg.scrollTop = keep;
  if (state.page === "midias") layoutMedia();
}

$("pg").addEventListener("click", (e) => {
  const t = e.target.closest("[data-act]");
  if (t?.dataset.act === "lb") lbOpen(CONFIG.media, +t.dataset.i);
});

new ResizeObserver(() => {
  if (state.page === "midias") layoutMedia();
}).observe($("pg"));

const lb = { items: [], i: 0, s: 1, tx: 0, ty: 0, bw: 0, bh: 0, cx: 0, cy: 0, W: 0, H: 0, open: false, ptrs: new Map(), pinch: null, drag: null, lastTap: 0, moved: false, onImg: false };
const lbEl = $("lb"), lbStage = $("lbStage"), lbImg = $("lbImg");

function lbFit(size) {
  lb.W = lbStage.clientWidth;
  lb.H = lbStage.clientHeight;
  const top = 70, bottom = innerWidth < 700 ? 150 : 130, pad = innerWidth < 700 ? 14 : 56;
  const f = Math.min((lb.W - pad * 2) / size.w, (lb.H - top - bottom) / size.h);
  lb.bw = size.w * f;
  lb.bh = size.h * f;
  lb.cx = lb.W / 2;
  lb.cy = top + (lb.H - top - bottom) / 2;
  lbImg.style.width = lb.bw + "px";
  lbImg.style.height = lb.bh + "px";
  lbImg.style.left = lb.cx - lb.bw / 2 + "px";
  lbImg.style.top = lb.cy - lb.bh / 2 + "px";
}

function lbClamp() {
  const hw = lb.bw * lb.s / 2, hh = lb.bh * lb.s / 2;
  lb.tx = lb.bw * lb.s <= lb.W ? 0 : clamp(lb.tx, lb.W - lb.cx - hw, hw - lb.cx);
  lb.ty = lb.bh * lb.s <= lb.H ? 0 : clamp(lb.ty, lb.H - lb.cy - hh, hh - lb.cy);
}

function lbApply(anim) {
  lbClamp();
  lbImg.classList.toggle("anim", !!anim);
  lbImg.style.transform = `translate(${lb.tx}px, ${lb.ty}px) scale(${lb.s})`;
  $("lbZv").textContent = Math.round(lb.s * 100) + "%";
  lbStage.classList.toggle("zoomed", lb.s > 1.01);
  $("lbCap").classList.toggle("hide", lb.s > 1.3);
}

function lbZoomAt(ns, px, py, anim) {
  ns = clamp(ns, 1, 8);
  const k = ns / lb.s;
  lb.tx = px + (lb.cx + lb.tx - px) * k - lb.cx;
  lb.ty = py + (lb.cy + lb.ty - py) * k - lb.cy;
  lb.s = ns;
  if (ns === 1) lb.tx = lb.ty = 0;
  lbApply(anim);
}

function lbShow(i) {
  const n = lb.items.length;
  lb.i = (i + n) % n;
  const it = lb.items[lb.i];
  lb.s = 1;
  lb.tx = lb.ty = 0;
  $("lbT").textContent = it.title || "";
  $("lbD").textContent = it.desc || "";
  $("lbC").textContent = n > 1 ? `${lb.i + 1} de ${n}` : "";
  $("lbP").style.display = $("lbN").style.display = n > 1 ? "" : "none";
  lbImg.style.cssText = photoStyle(it);
  lbFit(it.size);
  lbApply(false);
}

function lbOpen(items, i) {
  lb.items = items;
  lb.open = true;
  lbEl.classList.add("open");
  lbEl.setAttribute("aria-hidden", "false");
  lbShow(i);
}

function lbClose() {
  lb.open = false;
  lbEl.classList.remove("open");
  lbEl.setAttribute("aria-hidden", "true");
}

lbStage.addEventListener("wheel", (e) => {
  e.preventDefault();
  const r = lbStage.getBoundingClientRect();
  lbZoomAt(lb.s * Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0018)), e.clientX - r.left, e.clientY - r.top, false);
}, { passive: false });

lbStage.addEventListener("pointerdown", (e) => {
  lbStage.setPointerCapture(e.pointerId);
  lb.ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
  lb.moved = false;
  lb.onImg = e.target === lbImg;
  if (lb.ptrs.size === 1) {
    lb.drag = { x: e.clientX, y: e.clientY, tx: lb.tx, ty: lb.ty };
  } else if (lb.ptrs.size === 2) {
    const [a, b] = [...lb.ptrs.values()];
    const r = lbStage.getBoundingClientRect();
    lb.pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), s: lb.s, tx: lb.tx, ty: lb.ty, mx: (a.x + b.x) / 2 - r.left, my: (a.y + b.y) / 2 - r.top };
    lb.drag = null;
  }
});

lbStage.addEventListener("pointermove", (e) => {
  if (!lb.ptrs.has(e.pointerId)) return;
  lb.ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (lb.pinch && lb.ptrs.size >= 2) {
    const [a, b] = [...lb.ptrs.values()];
    const r = lbStage.getBoundingClientRect();
    const ns = clamp(lb.pinch.s * Math.hypot(a.x - b.x, a.y - b.y) / lb.pinch.d, 1, 8);
    const mx = (a.x + b.x) / 2 - r.left, my = (a.y + b.y) / 2 - r.top;
    const k = ns / lb.pinch.s;
    lb.tx = mx + (lb.cx + lb.pinch.tx - lb.pinch.mx) * k - lb.cx;
    lb.ty = my + (lb.cy + lb.pinch.ty - lb.pinch.my) * k - lb.cy;
    lb.s = ns;
    lb.moved = true;
    lbApply(false);
  } else if (lb.drag) {
    const dx = e.clientX - lb.drag.x, dy = e.clientY - lb.drag.y;
    if (Math.hypot(dx, dy) > 5) lb.moved = true;
    if (lb.s > 1.01) {
      lb.tx = lb.drag.tx + dx;
      lb.ty = lb.drag.ty + dy;
      lbStage.classList.add("grabbing");
      lbApply(false);
    }
  }
});

function lbPointerUp(e) {
  const had = lb.ptrs.delete(e.pointerId);
  lbStage.classList.remove("grabbing");
  if (lb.ptrs.size < 2) lb.pinch = null;
  if (!had) return;
  if (lb.ptrs.size === 0 && lb.drag && !lb.moved && e.type === "pointerup") {
    const now = performance.now();
    const r = lbStage.getBoundingClientRect();
    const px = e.clientX - r.left, py = e.clientY - r.top;
    if (now - lb.lastTap < 320) {
      lb.lastTap = 0;
      lbZoomAt(lb.s > 1.05 ? 1 : 2.6, px, py, true);
    } else {
      lb.lastTap = now;
      if (!lb.onImg && lb.s <= 1.01) setTimeout(() => { if (lb.lastTap === now && lb.open) lbClose(); }, 330);
    }
  }
  if (lb.ptrs.size === 0) lb.drag = null;
  else if (lb.ptrs.size === 1) {
    const [p] = [...lb.ptrs.values()];
    lb.drag = { x: p.x, y: p.y, tx: lb.tx, ty: lb.ty };
  }
}
lbStage.addEventListener("pointerup", lbPointerUp);
lbStage.addEventListener("pointercancel", lbPointerUp);

$("lbX").addEventListener("click", lbClose);
$("lbP").addEventListener("click", () => lbShow(lb.i - 1));
$("lbN").addEventListener("click", () => lbShow(lb.i + 1));
$("lbIn").addEventListener("click", () => lbZoomAt(lb.s * 1.5, lb.cx, lb.cy, true));
$("lbOut").addEventListener("click", () => lbZoomAt(lb.s / 1.5, lb.cx, lb.cy, true));
$("lbZv").addEventListener("click", () => lbZoomAt(1, lb.cx, lb.cy, true));
addEventListener("resize", () => {
  if (!lb.open) return;
  lbFit(lb.items[lb.i].size);
  lbApply(false);
});

addEventListener("keydown", (e) => {
  if (lb.open) {
    const keys = {
      Escape: lbClose,
      ArrowLeft: () => lbShow(lb.i - 1),
      ArrowRight: () => lbShow(lb.i + 1),
      "+": () => lbZoomAt(lb.s * 1.4, lb.cx, lb.cy, true),
      "=": () => lbZoomAt(lb.s * 1.4, lb.cx, lb.cy, true),
      "-": () => lbZoomAt(lb.s / 1.4, lb.cx, lb.cy, true),
      "0": () => lbZoomAt(1, lb.cx, lb.cy, true)
    };
    if (keys[e.key]) keys[e.key]();
  } else if (e.key === "Escape" && state.open) closeWin();
});

const player = { idx: 0, playing: false, elapsed: 0, last: 0, audio: null };
let actx = null, bus = null, trackBus = null, schedTimer = 0, step = 0, nextTime = 0;
const fmt = (s) => {
  s = Math.max(0, Math.floor(s));
  return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
};
const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

function ensureCtx() {
  if (!actx) {
    actx = new (window.AudioContext || window.webkitAudioContext)();
    bus = actx.createGain();
    bus.gain.value = 0.6;
    const lp = actx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 2200;
    const delay = actx.createDelay(1);
    delay.delayTime.value = 0.42;
    const feedback = actx.createGain();
    feedback.gain.value = 0.38;
    bus.connect(lp);
    lp.connect(actx.destination);
    lp.connect(delay);
    delay.connect(feedback);
    feedback.connect(delay);
    delay.connect(actx.destination);
  }
  if (actx.state === "suspended") actx.resume();
}

function note(freq, t, dur, vol, type) {
  const osc = actx.createOscillator(), gain = actx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.linearRampToValueAtTime(vol, t + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain);
  gain.connect(trackBus);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

function playStep(t, s, time, sd) {
  const bar = Math.floor(s / 16) % t.prog.length, pos = s % 16;
  const root = t.root + t.prog[bar];
  if (pos === 0) {
    [0, t.minor ? 3 : 4, 7, 12].forEach((iv) => note(midi(root + iv), time, sd * 15, 0.05, "sine"));
    note(midi(root - 12), time, sd * 8, 0.13, "triangle");
  }
  if (pos === 8) note(midi(root - 5), time, sd * 4, 0.08, "triangle");
  if (pos % 2 === 0 && Math.random() < 0.72) note(midi(root + 12 + t.scale[Math.floor(Math.random() * t.scale.length)]), time, sd * 3.2, 0.065, "sine");
}

function schedule() {
  const t = CONFIG.tracks[player.idx];
  const sd = 60 / t.bpm / 2;
  while (nextTime < actx.currentTime + 0.25) {
    playStep(t, step, nextTime, sd);
    nextTime += sd;
    step++;
  }
}

function stopSynth() {
  clearInterval(schedTimer);
  if (trackBus && actx) {
    const old = trackBus;
    old.gain.cancelScheduledValues(actx.currentTime);
    old.gain.setTargetAtTime(0, actx.currentTime, 0.08);
    setTimeout(() => old.disconnect(), 600);
  }
  trackBus = null;
}

function loadTrack(i, autoplay) {
  const wasPlaying = player.playing;
  pauseAll(true);
  player.idx = (i + CONFIG.tracks.length) % CONFIG.tracks.length;
  player.elapsed = 0;
  const t = CONFIG.tracks[player.idx];
  $("ttl").textContent = t.title;
  $("sub").textContent = t.artist;
  $("dur").textContent = fmt(t.length);
  $("art").style.setProperty("--art", t.art);
  $("miniArt").style.setProperty("--art", t.art);
  $("art").innerHTML = $("miniArt").innerHTML = icon("music-note-beamed");
  if (autoplay || wasPlaying) playAll();
  updateProgress();
}

function playAll() {
  const t = CONFIG.tracks[player.idx];
  if (t.src) {
    if (!player.audio) {
      player.audio = new Audio(t.src);
      player.audio.addEventListener("ended", () => loadTrack(player.idx + 1, true));
    }
    player.audio.play().catch(() => {});
  } else {
    ensureCtx();
    trackBus = actx.createGain();
    trackBus.connect(bus);
    step = 0;
    nextTime = actx.currentTime + 0.06;
    clearInterval(schedTimer);
    schedTimer = setInterval(schedule, 80);
  }
  player.playing = true;
  player.last = performance.now();
  island.classList.add("playing");
}

function pauseAll(silent) {
  if (player.audio) {
    player.audio.pause();
    if (silent) player.audio = null;
  }
  stopSynth();
  player.playing = false;
  island.classList.remove("playing");
}

function updateProgress() {
  let len = CONFIG.tracks[player.idx].length;
  if (player.audio && isFinite(player.audio.duration)) {
    len = player.audio.duration;
    player.elapsed = player.audio.currentTime;
    $("dur").textContent = fmt(len);
  }
  $("fill").style.width = Math.min(100, (player.elapsed / len) * 100) + "%";
  $("cur").textContent = fmt(player.elapsed);
}

function setupPlayer() {
  const on = (el, fn) => el.addEventListener("click", (e) => {
    e.stopPropagation();
    fn(e);
  });
  on($("play"), () => (player.playing ? pauseAll(false) : playAll()));
  on($("prev"), () => loadTrack(player.elapsed > 3 ? player.idx : player.idx - 1, player.playing));
  on($("next"), () => loadTrack(player.idx + 1, player.playing));
  on($("prog"), (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const ratio = clamp((e.clientX - r.left) / r.width, 0, 1);
    if (player.audio && isFinite(player.audio.duration)) player.audio.currentTime = ratio * player.audio.duration;
    player.elapsed = ratio * CONFIG.tracks[player.idx].length;
    updateProgress();
  });
  loadTrack(0, false);
}

addEventListener("pointermove", (e) => {
  pointer.x = e.clientX;
  pointer.y = e.clientY;
  pointer.nx = (e.clientX / innerWidth - 0.5) * 2;
  pointer.ny = (e.clientY / innerHeight - 0.5) * 2;
  pointer.moved = true;
});

function frame(now) {
  if (player.playing) {
    const dt = (now - player.last) / 1000;
    player.last = now;
    if (!player.audio) {
      player.elapsed += dt;
      if (player.elapsed >= CONFIG.tracks[player.idx].length) loadTrack(player.idx + 1, true);
    }
    updateProgress();
  }
  const ax = pointer.nx - pointer.cx, ay = pointer.ny - pointer.cy;
  if (Math.abs(ax) > 0.0004 || Math.abs(ay) > 0.0004) {
    pointer.cx += ax * 0.09;
    pointer.cy += ay * 0.09;
    for (const el of depthEls) {
      const d = +el.dataset.depth;
      el.style.transform = `translate3d(${-pointer.cx * d}px, ${-pointer.cy * d}px, 0)`;
    }
  }
  for (const b of boxes) {
    if (b.el === win && !state.open) continue;
    const r = b.el.getBoundingClientRect();
    if (r.left !== b.lx || r.top !== b.ly) {
      b.glass.sync(r.left, r.top);
      b.lx = r.left;
      b.ly = r.top;
    }
    if (pointer.moved && !b.glass.pane.classList.contains("masked")) {
      b.el.style.setProperty("--mx", pointer.x - r.left + "px");
      b.el.style.setProperty("--my", pointer.y - r.top + "px");
    }
  }
  pointer.moved = false;
  requestAnimationFrame(frame);
}

island.addEventListener("click", () => island.classList.toggle("open"));
document.addEventListener("click", (e) => {
  if (!island.contains(e.target)) island.classList.remove("open");
});
addEventListener("hashchange", () => {
  const h = location.hash.slice(1);
  if (!h) {
    if (state.open) closeWin();
  } else if (!(state.open && state.page === h)) go(h);
});

let resizeTimer = 0;
addEventListener("resize", () => {
  fitRect();
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    buildClock();
    moveHl();
  }, 150);
});

async function start() {
  CONFIG = JSON.parse($("site-config").textContent);
  document.documentElement.lang = CONFIG.language;
  document.title = CONFIG.title;
  document.documentElement.style.setProperty("--bg", `url("${CONFIG.background}")`);
  document.documentElement.style.setProperty("--font", CONFIG.theme.fontStack);
  document.documentElement.style.setProperty("--scrim", CONFIG.theme.scrim);
  document.documentElement.style.setProperty("--blue", CONFIG.theme.blue);
  document.documentElement.style.setProperty("--spring", CONFIG.theme.spring);
  FONT = CONFIG.theme.fontStack;
  ICON_BASE = CONFIG.theme.iconBase;
  M = CONFIG.theme.liquidGlassMargin;
  EDGE = CONFIG.window.edge;
  MIN_W = CONFIG.window.minWidth;
  MIN_H = CONFIG.window.minHeight;
  MEDIA_GAP = CONFIG.galleryLayout.gap;
  MEDIA_MIN_COL = CONFIG.galleryLayout.minColumnWidth;
  COLORS = CONFIG.theme.textColors;
  PAGES = CONFIG.pages;
  $("win").dataset.radius = CONFIG.window.glassRadius;
  hydrateIcons();
  try {
    await Promise.all([document.fonts.load(`700 100px ${FONT}`), prepareMedia()]);
    await document.fonts.ready;
  } catch (e) {}
  renderProfile();
  renderNav();
  state.rect = defaultRect();
  applyRect();
  setupWindow();
  const first = location.hash.slice(1);
  tick();
  setInterval(tick, 1000);
  document.querySelectorAll(".glassbox").forEach((el) => {
    mountGlass(el);
    observer.observe(el);
  });
  buildClock();
  moveHl();
  setupPlayer();
  requestAnimationFrame(frame);
  if (PAGES.some((p) => p.id === first)) setTimeout(() => go(first), 900);
  setTimeout(() => island.classList.add("open"), 1400);
  setTimeout(() => island.classList.remove("open"), 4800);
}

start();
