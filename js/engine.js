/* 炸彈女僕 BOMB MAIDS — engine: screen, sprites, text, input, audio, save, scenes */
(function (G) {
  'use strict';

  const W = 320, H = 240;
  // the screen is 16:9 — a 107px portrait panel down the left, then the 320x240 game (E.W x E.H) scenes draw into
  const PANEL_W = 107;
  const E = (G.E = { W, H, frame: 0, sideW: PANEL_W, SW: W + PANEL_W });

  // ------------------------------------------------------------------ utils
  E.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  E.lerp = (a, b, t) => a + (b - a) * t;
  E.rand = (a, b) => a + Math.random() * (b - a);
  E.randi = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
  E.pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  E.shuffle = (arr) => {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  };
  E.ease = {
    outBack: (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
    outCubic: (t) => 1 - Math.pow(1 - t, 3),
    inOut: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  };

  // ------------------------------------------------------------------ screen
  E.init = function (canvas) {
    E.canvas = canvas;
    canvas.width = E.SW;
    canvas.height = H;
    E.ctx = canvas.getContext('2d');
    E.ctx.imageSmoothingEnabled = false;
    artLayer.el = document.getElementById('art');
    E.fit();
    window.addEventListener('resize', E.fit);
    // a phone turning: some browsers still report the old size when the event fires, so fit again once it settles
    window.addEventListener('orientationchange', () => { E.fit(); setTimeout(E.fit, 150); setTimeout(E.fit, 600); });
    if (window.visualViewport) window.visualViewport.addEventListener('resize', E.fit);
  };
  // show or fold away the portrait panel (the canvas widens to 16:9 or narrows to the 4:3 game)
  E.setWide = function (on) {
    const panel = on ? PANEL_W : 0;
    if (panel === E.sideW && E.canvas.width === W + panel) return;
    E.sideW = panel;
    E.SW = W + panel;
    E.canvas.width = E.SW;
    E.ctx.imageSmoothingEnabled = false;
  };

  // ------------------------------------------------------------------ illustration layer
  // The canvas is 320x240 pixel art, so full-resolution illustrations are shown as DOM elements laid over it.
  // A scene calls E.art() from draw() every frame it wants a picture; pictures not drawn in a frame are hidden.
  const artLayer = { el: null, items: new Map(), used: new Map() };
  // crop: [sx, sy, sw, sh, imageWidth, imageHeight] in source pixels; x/y/w/h in screen pixels.
  // Pictures are never stretched: a crop shaped differently from its box is trimmed to fit
  // (evenly from the sides, or more from the bottom than the top so faces stay in frame).
  // screen: place the picture in screen coordinates (the portrait panel) instead of game coordinates
  // opts: true for screen coordinates, or { screen, opacity, fadeRight: [from, to], fadeBottom: [from, to] } where the
  // fades take the picture out between two points given as fractions of its width / height
  E.art = function (id, src, x, y, w, h, crop, filter, opts) {
    if (!artLayer.el || w <= 0 || h <= 0) return;
    const o = opts && typeof opts === 'object' ? opts : { screen: !!opts };
    const screen = !!o.screen;
    let it = artLayer.items.get(id);
    if (!it) {
      it = document.createElement('div');
      it.className = 'art';
      artLayer.el.appendChild(it);
      artLayer.items.set(id, it);
    }
    artLayer.used.set(id, { filter: filter || 'none', shade: 1, screen, opacity: o.opacity == null ? 1 : o.opacity });
    let [sx, sy, sw, sh] = crop;
    const iw = crop[4], ih = crop[5];
    if (sw / sh > w / h) { const nw = (sh * w) / h; sx += (sw - nw) / 2; sw = nw; }
    else if (sw / sh < w / h) { const nh = (sw * h) / w; sy += (sh - nh) / 3; sh = nh; }
    const css = {
      left: ((x + (screen ? 0 : E.sideW)) / E.SW) * 100 + '%', top: (y / H) * 100 + '%', width: (w / E.SW) * 100 + '%', height: (h / H) * 100 + '%',
      backgroundImage: 'url("' + src + '")',
      zIndex: screen ? '2' : '1',
      backgroundSize: (iw / sw) * 100 + '% ' + (ih / sh) * 100 + '%',
      backgroundPosition: (iw > sw ? (sx / (iw - sw)) * 100 : 0) + '% ' + (ih > sh ? (sy / (ih - sh)) * 100 : 0) + '%',
    };
    for (const k of Object.keys(css)) if (it.style[k] !== css[k]) it.style[k] = css[k];
    const grad = (dir, f) => 'linear-gradient(to ' + dir + ', #000 ' + (f[0] * 100).toFixed(1) + '%, transparent ' + (f[1] * 100).toFixed(1) + '%)';
    const masks = [o.fadeRight && grad('right', o.fadeRight), o.fadeBottom && grad('bottom', o.fadeBottom)].filter(Boolean);
    const mask = masks.length ? masks.join(', ') : 'none';
    if (it._mask !== mask) {
      it._mask = mask;
      it.style.webkitMaskImage = mask;
      it.style.maskImage = mask;
      // two fades keep only what both leave
      it.style.webkitMaskComposite = masks.length > 1 ? 'source-in' : '';
      it.style.maskComposite = masks.length > 1 ? 'intersect' : '';
    }
  };
  // Overlays drawn on the canvas (pause menus, pop-ups) cannot cover the pictures, so an overlay shades the pictures
  // already drawn this frame: 1 leaves them as they are, 0.4 darkens them like a 60% dim, 0 hides them.
  // Pictures drawn after the call (a card shown on the pop-up itself) are not affected.
  E.artShade = function (v) { for (const u of artLayer.used.values()) u.shade = Math.min(u.shade, v); };
  function endArt() {
    if (!artLayer.el) return;
    // game pictures fade with the diamond wipe between scenes; the portrait panel stays put
    const o = fade.t > 0 ? String(Math.max(0, 1 - (fade.t / fade.dur) * 1.5).toFixed(2)) : '1';
    for (const [id, it] of artLayer.items) {
      const u = artLayer.used.get(id);
      const display = u && u.shade > 0 ? 'block' : 'none';
      if (it.style.display !== display) it.style.display = display;
      if (display === 'none') continue;
      const filter = u.shade < 1 ? (u.filter === 'none' ? '' : u.filter + ' ') + 'brightness(' + u.shade + ')' : u.filter;
      if (it.style.filter !== filter) it.style.filter = filter;
      const op = ((u.screen ? 1 : +o) * u.opacity).toFixed(2);
      if (it._op !== op) { it._op = op; it.style.opacity = op; }
    }
    artLayer.used.clear();
  }
  // what the fit depends on: the window's size and whether the game is turned sideways (see E.rotated)
  const fitKey = () => window.innerWidth + 'x' + window.innerHeight + (E.rotated ? 'r' : '');
  E.fit = function () {
    const c = E.canvas;
    const holder = E.holder || c.parentElement;
    const pad = E.holderPad || 0;
    E.fitKey = fitKey();
    // measure with the canvas collapsed: the holder grows around its content, so a wide canvas would otherwise keep
    // it (and the next fit) wider than a phone held upright
    c.style.width = '0px';
    c.style.height = '0px';
    const aw = holder.clientWidth - pad, ah = holder.clientHeight - pad;
    // phones held upright have no room beside the game, so the portrait panel folds away there
    E.setWide(!(aw < ah && aw < 560));
    let s = Math.min(aw / E.SW, ah / H);
    if (s >= 2) s = Math.floor(s); // whole-number scaling keeps pixels square when there is room
    s = Math.max(0.5, s);
    c.style.width = Math.round(E.SW * s) + 'px';
    c.style.height = Math.round(H * s) + 'px';
  };

  // ------------------------------------------------------------------ sprites (Pix -> canvas)
  function pixToCanvas(p) {
    const c = document.createElement('canvas');
    c.width = p.w; c.height = p.h;
    const cx = c.getContext('2d');
    const img = cx.createImageData(p.w, p.h);
    img.data.set(p.d);
    cx.putImageData(img, 0, 0);
    return c;
  }
  function convert(node) {
    if (!node || typeof node !== 'object') return node;
    if (node instanceof G.PX.Pix) return pixToCanvas(node);
    if (Array.isArray(node)) return node.map(convert);
    const out = {};
    for (const k of Object.keys(node)) out[k] = convert(node[k]);
    return out;
  }
  E.loadArt = function () {
    const raw = G.ART.build();
    E.raw = raw;
    const { maids, ...rest } = raw;
    E.spr = convert(rest);
    E.pixToCanvas = pixToCanvas;
    // E.spr.maids[key] hands back the sprite set for the outfit that maid is wearing
    E.spr.maids = {};
    for (const k of Object.keys(maids)) {
      Object.defineProperty(E.spr.maids, k, {
        enumerable: true,
        get: () => E.spr.outfits[k][(G.outfitOf && G.outfitOf(k)) || 'maid'] || E.spr.outfits[k].maid,
      });
    }
  };

  // ------------------------------------------------------------------ text
  // Japanese text needs Japanese glyph shapes for kanji; Chinese uses Traditional Chinese fonts.
  const FONT_STACKS = {
    ja: '"Meiryo", "Yu Gothic UI", "Yu Gothic", "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Noto Sans JP", "MS Gothic", sans-serif',
    zh: '"Microsoft JhengHei", "PingFang TC", "Heiti TC", "Noto Sans TC", "Noto Sans CJK TC", "Source Han Sans TC", sans-serif',
    en: '"Meiryo", "Yu Gothic UI", "Hiragino Sans", "Noto Sans JP", "Microsoft JhengHei", sans-serif',
  };
  const lang = () => G.LANG || 'ja';
  const textCache = new Map();
  let measureCtx = null;

  // characters drawn with the pixel font even though they are not ASCII
  const ALIAS = { '…': '…', '×': 'x', '’': "'", '‘': "'", '“': '"', '”': '"', '—': '-', '–': '-', '！': '!', '？': '?' };
  function glyphRows(ch, small) {
    const F = small ? G.ART.FONT3 : G.ART.FONT5;
    const c = ALIAS[ch] || ch;
    return F[c] || F[c.toUpperCase()] || null;
  }
  function bitmapReady(str, small) {
    for (const ch of str) if (!glyphRows(ch, small)) return false;
    return true;
  }

  function renderBitmapText(str, color, small) {
    const h = small ? 5 : 9;
    let w = 0;
    const glyphs = [];
    for (const ch of str) {
      const g = glyphRows(ch, small) || glyphRows('?', small);
      glyphs.push(g);
      w += g[0].length + 1;
    }
    w = Math.max(1, w - 1);
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const cx = c.getContext('2d');
    cx.fillStyle = color;
    let x = 0;
    for (const g of glyphs) {
      for (let y = 0; y < g.length; y++)
        for (let i = 0; i < g[y].length; i++) if (g[y][i] === '#') cx.fillRect(x + i, y, 1, 1);
      x += g[0].length + 1;
    }
    return c;
  }

  // spacing < 0 packs the glyphs closer (used to fit long labels); box keeps the line height of the requested size
  function renderSystemText(str, color, size, spacing, box) {
    if (!measureCtx) measureCtx = document.createElement('canvas').getContext('2d');
    const font = size + 'px ' + FONT_STACKS[lang()];
    measureCtx.font = font;
    const chars = spacing ? [...str] : null;
    let tw = 0;
    if (chars) {
      for (const ch of chars) tw += Math.round(measureCtx.measureText(ch).width) + spacing;
      tw -= spacing;
    } else tw = measureCtx.measureText(str).width;
    const w = Math.max(1, Math.ceil(tw) + 2);
    const h = (box || size) + 4;
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const cx = c.getContext('2d');
    cx.font = font;
    cx.textBaseline = 'middle';
    cx.fillStyle = '#fff';
    if (chars) {
      let x = 1;
      for (const ch of chars) {
        cx.fillText(ch, x, h / 2 + 1);
        x += Math.round(measureCtx.measureText(ch).width) + spacing;
      }
    } else cx.fillText(str, 1, h / 2 + 1);
    const img = cx.getImageData(0, 0, w, h);
    const d = img.data;
    const col = G.PX.rgba(color);
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] > 118) { d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = 255; }
      else d[i + 3] = 0;
    }
    cx.putImageData(img, 0, 0);
    return c;
  }
  // outline/shadow composited version
  function decorate(base, outline, shadow) {
    const pad = outline ? 1 : 0;
    const c = document.createElement('canvas');
    c.width = base.width + pad * 2 + (shadow ? 1 : 0);
    c.height = base.height + pad * 2 + (shadow ? 1 : 0);
    const cx = c.getContext('2d');
    if (outline || shadow) {
      const tint = (col) => {
        const t = document.createElement('canvas');
        t.width = base.width; t.height = base.height;
        const tx = t.getContext('2d');
        tx.drawImage(base, 0, 0);
        tx.globalCompositeOperation = 'source-in';
        tx.fillStyle = col;
        tx.fillRect(0, 0, t.width, t.height);
        return t;
      };
      if (shadow) cx.drawImage(tint(shadow), pad + 1, pad + 1);
      if (outline) {
        const o = tint(outline);
        for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]]) cx.drawImage(o, pad + dx, pad + dy);
      }
    }
    cx.drawImage(base, pad, pad);
    return c;
  }

  const isCJK = (s) => /[^\x00-\x7F]/.test(s);

  // Returns a cached canvas for the string with the given style.
  E.textImage = function (str, o) {
    o = o || {};
    str = String(str);
    const color = o.color || '#ffffff';
    const key = lang() + '|' + str + '|' + color + '|' + (o.outline || '') + '|' + (o.shadow || '') + '|' + (o.small ? 1 : 0) + '|' + (o.size || 12) + '|' + (o.fit || 0);
    let c = textCache.get(key);
    if (c) return c;
    const cjk = o.cjk || !bitmapReady(str, o.small);
    const size = o.size || 12;
    let base = cjk ? renderSystemText(str, color, size) : renderBitmapText(str, color, o.small);
    // o.fit: pixel budget — pack the glyphs tighter, then one size smaller (smaller CJK stops being legible)
    if (cjk && o.fit) {
      for (const [sz, sp] of [[size, -1], [size - 1, -1]]) {
        if (base.width - 2 <= o.fit) break;
        base = renderSystemText(str, color, sz, sp, size);
      }
    }
    c = o.outline || o.shadow ? decorate(base, o.outline, o.shadow) : base;
    c.cjk = cjk;
    if (textCache.size > 800) textCache.clear();
    textCache.set(key, c);
    return c;
  };

  // draw text; align: left|center|right; valign: top|middle
  E.text = function (str, x, y, o) {
    o = o || {};
    const img = E.textImage(str, o);
    const s = o.scale || 1;
    let dx = x;
    if (o.align === 'center') dx = x - Math.floor((img.width * s) / 2);
    else if (o.align === 'right') dx = x - img.width * s;
    let dy = y;
    if (img.cjk) dy = y - 3 * s; // CJK canvases carry padding
    if (o.valign === 'middle') dy = y - Math.floor((img.height * s) / 2);
    E.ctx.drawImage(img, Math.round(dx), Math.round(dy), img.width * s, img.height * s);
    return img.width * s;
  };
  E.textWidth = function (str, o) {
    return E.textImage(str, o || {}).width * ((o && o.scale) || 1);
  };
  // split a string into lines that fit maxW pixels (CJK breaks anywhere, ASCII keeps words)
  const wrapCache = new Map();
  E.wrap = function (str, maxW, o) {
    o = o || {};
    const key = lang() + '|' + str + '|' + maxW + '|' + (o.size || 12);
    if (wrapCache.has(key)) return wrapCache.get(key);
    const lines = [];
    let line = '';
    const tokens = str.match(/[\x21-\x7E]+|\s|[^\x00-\x7F]/g) || [];
    for (const tok of tokens) {
      const next = line + tok;
      if (line && E.textWidth(next, o) > maxW) {
        // closing punctuation hangs on the previous line
        if (/^[，。！？、：」』）…]$/.test(tok)) { lines.push(line.trimEnd() + tok); line = ''; continue; }
        // CJK has no spaces: rather than splitting a word, break after a comma or full stop in the back half of the line
        let cut = -1;
        if (tok.trim()) for (let i = line.length - 1; i >= Math.ceil(line.length * 0.45); i--) if (/[、，。！？；）」』]/.test(line[i])) { cut = i + 1; break; }
        if (cut > 0) {
          lines.push(line.slice(0, cut));
          line = line.slice(cut) + tok;
        } else if (/^[ーっゃゅょッャュョ♪～]$/.test(tok)) {
          lines.push(line.trimEnd() + tok);
          line = '';
        } else {
          // an opening bracket never ends a line
          const open = line.length > 1 && /[（「『]$/.test(line) ? line.slice(-1) : '';
          lines.push((open ? line.slice(0, -1) : line).trimEnd());
          line = open + (tok.trim() ? tok : '');
        }
      } else line = next;
    }
    if (line) lines.push(line);
    wrapCache.set(key, lines);
    return lines;
  };

  // ------------------------------------------------------------------ drawing helpers
  E.draw = function (img, x, y, o) {
    if (!img) return;
    const ctx = E.ctx;
    if (o && (o.flip || o.scale || o.alpha != null)) {
      ctx.save();
      if (o.alpha != null) ctx.globalAlpha = o.alpha;
      const s = o.scale || 1;
      if (o.flip) {
        ctx.translate(Math.round(x) + img.width * s, Math.round(y));
        ctx.scale(-1, 1);
        ctx.drawImage(img, 0, 0, img.width * s, img.height * s);
      } else ctx.drawImage(img, Math.round(x), Math.round(y), img.width * s, img.height * s);
      ctx.restore();
    } else ctx.drawImage(img, Math.round(x), Math.round(y));
  };
  E.rect = function (x, y, w, h, col) {
    E.ctx.fillStyle = col;
    E.ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  };
  // the oval shadow an actor casts on the ground, in whole pixels (rows narrow toward the top and bottom)
  E.groundShadow = function (x, y, w, h, alpha) {
    const ctx = E.ctx;
    ctx.fillStyle = 'rgba(42,27,48,' + (alpha == null ? 0.3 : alpha) + ')';
    x = Math.round(x); y = Math.round(y);
    for (let j = 0; j < h; j++) {
      const t = ((j + 0.5) / h) * 2 - 1;
      const inset = Math.round((1 - Math.sqrt(1 - t * t)) * (w / 2));
      ctx.fillRect(x + inset, y + j, w - inset * 2, 1);
    }
  };
  // pixel-styled panel: dark outline, fill, top highlight
  E.panel = function (x, y, w, h, fill, edge, o) {
    o = o || {};
    const ctx = E.ctx;
    const k = o.outline || '#2a1b30';
    ctx.fillStyle = k;
    ctx.fillRect(x + 1, y, w - 2, h);
    ctx.fillRect(x, y + 1, w, h - 2);
    ctx.fillStyle = edge;
    ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
    ctx.fillStyle = fill;
    ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
    if (o.shine) {
      ctx.fillStyle = o.shine;
      ctx.fillRect(x + 2, y + 2, w - 4, 1);
    }
  };
  E.bar = function (x, y, w, h, t, col, back) {
    E.rect(x, y, w, h, '#2a1b30');
    E.rect(x + 1, y + 1, w - 2, h - 2, back || '#4a3d66');
    const fw = Math.round((w - 2) * E.clamp(t, 0, 1));
    if (fw > 0) {
      E.rect(x + 1, y + 1, fw, h - 2, col);
      E.rect(x + 1, y + 1, fw, 1, 'rgba(255,255,255,0.45)');
    }
  };

  // ------------------------------------------------------------------ input
  const BTN = ['up', 'down', 'left', 'right', 'a', 'b', 'start'];
  const KEYMAP_SOLO = {
    up: ['ArrowUp', 'KeyW'], down: ['ArrowDown', 'KeyS'], left: ['ArrowLeft', 'KeyA'], right: ['ArrowRight', 'KeyD'],
    a: ['KeyZ', 'Space', 'KeyJ', 'Enter', 'NumpadEnter'], b: ['KeyX', 'KeyK', 'ShiftLeft', 'ShiftRight'], start: ['Escape', 'KeyP', 'Backspace'],
  };
  const KEYMAP_DUO = [
    { up: ['KeyW'], down: ['KeyS'], left: ['KeyA'], right: ['KeyD'], a: ['KeyF', 'Space'], b: ['KeyG', 'ShiftLeft'], start: ['Escape', 'KeyP'] },
    { up: ['ArrowUp'], down: ['ArrowDown'], left: ['ArrowLeft'], right: ['ArrowRight'], a: ['Period', 'Numpad0', 'KeyK', 'Enter'], b: ['Slash', 'Numpad1', 'KeyL', 'ShiftRight'], start: ['Backspace'] },
  ];
  const Input = (E.input = {
    duo: false,
    keys: new Set(),
    touch: {},
    state: [{}, {}],
    prev: [{}, {}],
    any: false,
    lastDevice: 'keyboard',
  });
  function onKey(e, down) {
    const code = e.code;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(code)) e.preventDefault();
    if (down) Input.keys.add(code); else Input.keys.delete(code);
    if (down) { Input.lastDevice = 'keyboard'; E.audio.unlock(); }
  }
  E.bindInput = function () {
    window.addEventListener('keydown', (e) => onKey(e, true));
    window.addEventListener('keyup', (e) => onKey(e, false));
    window.addEventListener('blur', () => Input.keys.clear());
  };
  // pointer (mouse / touch) in screen pixels, used by the room
  const Pointer = (E.pointer = { x: -100, y: -100, inside: false, down: false, pressed: false, moved: false });
  E.bindPointer = function (canvas) {
    const pos = (e) => {
      const r = canvas.getBoundingClientRect();
      // how far across and down the canvas, in its own orientation; turned sideways it runs down the screen
      const u = E.rotated ? (e.clientY - r.top) / r.height : (e.clientX - r.left) / r.width;
      const v = E.rotated ? (r.right - e.clientX) / r.width : (e.clientY - r.top) / r.height;
      Pointer.x = u * E.SW - E.sideW;
      Pointer.y = v * H;
    };
    canvas.addEventListener('pointermove', (e) => { pos(e); Pointer.moved = true; Pointer.inside = true; });
    canvas.addEventListener('pointerdown', (e) => { pos(e); Pointer.down = true; Pointer.pressed = true; Pointer.moved = true; Pointer.inside = true; });
    window.addEventListener('pointerup', () => { Pointer.down = false; });
    canvas.addEventListener('pointerleave', () => { Pointer.inside = false; });
  };
  E.setTouch = function (btn, on) {
    Input.touch[btn] = on;
    Input.lastDevice = 'touch';
    E.audio.unlock();
  };
  Input.poll = function () {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (let p = 0; p < 2; p++) {
      Input.prev[p] = Input.state[p];
      const s = {};
      const map = Input.duo ? KEYMAP_DUO[p] : p === 0 ? KEYMAP_SOLO : null;
      for (const b of BTN) {
        let on = false;
        if (map) for (const code of map[b]) if (Input.keys.has(code)) { on = true; break; }
        if (p === 0 && Input.touch[b]) on = true;
        s[b] = on;
      }
      const padIndex = Input.duo ? p : 0;
      const gp = pads && pads[padIndex];
      if (gp && gp.connected && (Input.duo || p === 0)) {
        const bt = (i) => gp.buttons[i] && gp.buttons[i].pressed;
        const ax = gp.axes || [];
        if (bt(12) || ax[1] < -0.5) s.up = true;
        if (bt(13) || ax[1] > 0.5) s.down = true;
        if (bt(14) || ax[0] < -0.5) s.left = true;
        if (bt(15) || ax[0] > 0.5) s.right = true;
        if (bt(0)) s.a = true;
        if (bt(1) || bt(2)) s.b = true;
        if (bt(9) || bt(8)) s.start = true;
        if (gp.buttons.some((b) => b.pressed)) Input.lastDevice = 'pad';
      }
      Input.state[p] = s;
    }
  };
  E.held = (p, b) => !!Input.state[p][b];
  E.pressed = (p, b) => !!Input.state[p][b] && !Input.prev[p][b];
  // menu helpers: any player
  E.menuPressed = (b) => E.pressed(0, b) || E.pressed(1, b);
  E.menuHeld = (b) => E.held(0, b) || E.held(1, b);
  // auto-repeat for menus
  const repeat = { up: 0, down: 0, left: 0, right: 0 };
  E.menuDir = function () {
    for (const d of ['up', 'down', 'left', 'right']) {
      if (E.menuHeld(d)) {
        repeat[d]++;
        if (repeat[d] === 1 || (repeat[d] > 18 && repeat[d] % 5 === 0)) return d;
      } else repeat[d] = 0;
    }
    return null;
  };

  // ------------------------------------------------------------------ audio (WebAudio chiptune synth)
  const NOTE = { C: -9, D: -7, E: -5, F: -4, G: -2, A: 0, B: 2 };
  function noteFreq(n) {
    // e.g. 'C5', 'F#4', 'Bb3'
    const m = /^([A-G])([#b]?)(\d)$/.exec(n);
    if (!m) return 0;
    let semi = NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (parseInt(m[3], 10) - 4) * 12;
    return 440 * Math.pow(2, semi / 12);
  }
  const A = (E.audio = {
    ctx: null, master: null, sfxBus: null, musicBus: null, noiseBuf: null,
    sound: true, music: true, track: null, trackName: null,
  });
  A.unlock = function () {
    if (!A.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      A.ctx = new AC();
      A.master = A.ctx.createGain();
      A.master.gain.value = 0.55;
      A.master.connect(A.ctx.destination);
      A.sfxBus = A.ctx.createGain(); A.sfxBus.gain.value = A.sound ? 0.9 : 0; A.sfxBus.connect(A.master);
      A.musicBus = A.ctx.createGain(); A.musicBus.gain.value = A.music ? 0.32 : 0; A.musicBus.connect(A.master);
      const len = A.ctx.sampleRate;
      A.noiseBuf = A.ctx.createBuffer(1, len, A.ctx.sampleRate);
      const ch = A.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) ch[i] = Math.random() * 2 - 1;
      if (A.pendingTrack) { const t = A.pendingTrack; A.pendingTrack = null; A.playMusic(t); }
    }
    if (A.ctx.state === 'suspended') A.ctx.resume();
  };
  A.setSound = function (on) { A.sound = on; if (A.sfxBus) A.sfxBus.gain.value = on ? 0.9 : 0; };
  A.setMusic = function (on) { A.music = on; if (A.musicBus) A.musicBus.gain.value = on ? 0.32 : 0; };

  function tone(o, bus) {
    if (!A.ctx) return;
    const t0 = A.ctx.currentTime + (o.delay || 0);
    const osc = A.ctx.createOscillator();
    const g = A.ctx.createGain();
    osc.type = o.type || 'square';
    osc.frequency.setValueAtTime(o.f, t0);
    if (o.f2) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.f2), t0 + (o.slide || o.d));
    const v = o.v == null ? 0.3 : o.v;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(v, t0 + (o.a || 0.005));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.d);
    osc.connect(g); g.connect(bus || A.sfxBus);
    osc.start(t0); osc.stop(t0 + o.d + 0.02);
  }
  function noise(o, bus) {
    if (!A.ctx) return;
    const t0 = A.ctx.currentTime + (o.delay || 0);
    const src = A.ctx.createBufferSource();
    src.buffer = A.noiseBuf;
    const f = A.ctx.createBiquadFilter();
    f.type = o.filter || 'lowpass';
    f.frequency.setValueAtTime(o.f || 2000, t0);
    if (o.f2) f.frequency.exponentialRampToValueAtTime(o.f2, t0 + o.d);
    const g = A.ctx.createGain();
    const v = o.v == null ? 0.4 : o.v;
    g.gain.setValueAtTime(v, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.d);
    src.connect(f); f.connect(g); g.connect(bus || A.sfxBus);
    src.start(t0, Math.random() * 0.5); src.stop(t0 + o.d + 0.02);
  }
  const SFX = {
    select: () => tone({ f: 880, d: 0.05, v: 0.12 }),
    confirm: () => { tone({ f: 660, d: 0.06, v: 0.14 }); tone({ f: 990, d: 0.09, v: 0.14, delay: 0.06 }); },
    cancel: () => tone({ f: 440, f2: 220, d: 0.12, v: 0.14 }),
    place: () => { tone({ f: 300, f2: 120, d: 0.09, v: 0.22, type: 'triangle' }); noise({ f: 1200, d: 0.05, v: 0.12 }); },
    boom: () => { noise({ f: 1800, f2: 120, d: 0.55, v: 0.55 }); tone({ f: 120, f2: 40, d: 0.35, v: 0.35, type: 'triangle' }); },
    crumble: () => noise({ f: 900, f2: 300, d: 0.18, v: 0.18, filter: 'bandpass' }),
    item: () => { [784, 988, 1175, 1568].forEach((f, i) => tone({ f, d: 0.08, v: 0.13, delay: i * 0.045 })); },
    coin: () => { tone({ f: 1318, d: 0.05, v: 0.1 }); tone({ f: 1760, d: 0.12, v: 0.1, delay: 0.05 }); },
    sweep: () => { noise({ f: 5000, f2: 2000, d: 0.12, v: 0.12, filter: 'highpass' }); tone({ f: 1480, d: 0.07, v: 0.08, delay: 0.05, type: 'triangle' }); },
    hurt: () => { tone({ f: 600, f2: 150, d: 0.3, v: 0.25 }); noise({ f: 3000, f2: 400, d: 0.2, v: 0.2 }); },
    kill: () => { tone({ f: 900, f2: 1800, d: 0.07, v: 0.14 }); tone({ f: 500, f2: 80, d: 0.2, v: 0.18, delay: 0.07, type: 'triangle' }); },
    kick: () => { tone({ f: 200, f2: 90, d: 0.08, v: 0.3, type: 'triangle' }); noise({ f: 800, d: 0.06, v: 0.2 }); },
    slash: () => { noise({ f: 7000, f2: 1500, d: 0.18, v: 0.3, filter: 'highpass' }); tone({ f: 1800, f2: 900, d: 0.1, v: 0.08 }); },
    magic: () => { [1046, 1318, 1568, 2093, 1568, 2093].forEach((f, i) => tone({ f, d: 0.1, v: 0.09, delay: i * 0.05, type: 'triangle' })); },
    remote: () => { tone({ f: 1200, d: 0.04, v: 0.12 }); tone({ f: 1600, d: 0.04, v: 0.12, delay: 0.06 }); },
    power: () => { [523, 659, 784, 1046, 1318].forEach((f, i) => tone({ f, d: 0.1, v: 0.12, delay: i * 0.04, type: 'square' })); },
    freeze: () => { [2093, 1760, 2349, 1976].forEach((f, i) => tone({ f, d: 0.12, v: 0.08, delay: i * 0.05, type: 'triangle' })); },
    heal: () => { [659, 784, 1046].forEach((f, i) => tone({ f, d: 0.14, v: 0.12, delay: i * 0.07, type: 'triangle' })); },
    denied: () => { tone({ f: 180, d: 0.08, v: 0.2 }); tone({ f: 150, d: 0.12, v: 0.2, delay: 0.09 }); },
    drop: () => { tone({ f: 500, f2: 90, d: 0.16, v: 0.2, type: 'triangle' }); noise({ f: 700, f2: 150, d: 0.12, v: 0.25, delay: 0.1 }); },
    missile: () => tone({ f: 1400, f2: 300, d: 0.35, v: 0.1, type: 'sawtooth' }),
    gacha: () => { [392, 523, 659, 784, 1046].forEach((f, i) => tone({ f, d: 0.06, v: 0.11, delay: i * 0.08 })); },
    rare: () => { [1046, 1318, 1568, 2093].forEach((f, i) => tone({ f, d: 0.25, v: 0.11, delay: i * 0.09, type: 'triangle' })); },
    tick: () => tone({ f: 1760, d: 0.03, v: 0.08 }),
    start: () => { [523, 523, 784].forEach((f, i) => tone({ f, d: i === 2 ? 0.3 : 0.1, v: 0.16, delay: i * 0.14 })); },
    pat: () => { tone({ f: 620, f2: 880, d: 0.08, v: 0.1, type: 'triangle' }); tone({ f: 990, f2: 1320, d: 0.1, v: 0.08, type: 'triangle', delay: 0.07 }); },
    blip: () => tone({ f: 700 + Math.random() * 120, d: 0.025, v: 0.05, type: 'square' }),
    gift: () => { [784, 988, 1175, 1568, 1976].forEach((f, i) => tone({ f, d: 0.12, v: 0.09, delay: i * 0.06, type: 'triangle' })); },
    levelup: () => { [523, 659, 784, 1046, 784, 1046, 1318].forEach((f, i) => tone({ f, d: i === 6 ? 0.35 : 0.1, v: 0.12, delay: i * 0.08 })); },
    door: () => { tone({ f: 220, f2: 330, d: 0.12, v: 0.12, type: 'triangle' }); noise({ f: 1200, f2: 500, d: 0.15, v: 0.08, delay: 0.05 }); },
    place: () => { tone({ f: 180, f2: 90, d: 0.1, v: 0.2, type: 'triangle' }); noise({ f: 600, d: 0.06, v: 0.12 }); },
    buy: () => { tone({ f: 1046, d: 0.06, v: 0.1 }); tone({ f: 1568, d: 0.14, v: 0.1, delay: 0.06 }); },
    train: () => { noise({ f: 3000, f2: 900, d: 0.14, v: 0.12, filter: 'bandpass' }); tone({ f: 440, f2: 660, d: 0.08, v: 0.08, delay: 0.05 }); },
    water: () => { [1760, 1397, 1175].forEach((f, i) => tone({ f, f2: f * 0.8, d: 0.08, v: 0.06, delay: i * 0.07, type: 'triangle' })); },
    angry: () => { tone({ f: 300, f2: 200, d: 0.12, v: 0.14 }); tone({ f: 280, f2: 180, d: 0.12, v: 0.14, delay: 0.12 }); },
    // the maids' voices as their lines type on: Berry bright and quick, Honey soft, Yoru low
    blipHi: () => tone({ f: 980 + Math.random() * 140, d: 0.022, v: 0.05, type: 'square' }),
    blipSoft: () => tone({ f: 640 + Math.random() * 90, d: 0.03, v: 0.05, type: 'triangle' }),
    blipLo: () => tone({ f: 400 + Math.random() * 60, d: 0.035, v: 0.055, type: 'triangle' }),
    punch: () => { tone({ f: 160, f2: 60, d: 0.14, v: 0.32, type: 'triangle' }); noise({ f: 1400, f2: 300, d: 0.12, v: 0.25 }); },
    pop: () => { noise({ f: 2400, f2: 600, d: 0.08, v: 0.18, filter: 'bandpass' }); tone({ f: 520, f2: 1040, d: 0.1, v: 0.12, type: 'triangle' }); },
    love: () => { [1046, 1318, 1568, 2093, 1568, 2093, 2637].forEach((f, i) => tone({ f, d: 0.12, v: 0.08, delay: i * 0.055, type: 'triangle' })); },
    meh: () => { tone({ f: 392, f2: 330, d: 0.18, v: 0.1, type: 'triangle' }); tone({ f: 330, f2: 262, d: 0.22, v: 0.1, type: 'triangle', delay: 0.16 }); },
  };
  A.sfx = function (name) {
    if (!A.ctx || !A.sound) return;
    const f = SFX[name];
    if (f) f();
  };

  // --- music: step sequencer with lookahead scheduling
  A.playMusic = function (name) {
    if (A.trackName === name && A.track) return;
    A.stopMusic();
    A.trackName = name;
    if (!A.ctx) { A.pendingTrack = name; return; }
    const song = G.MUSIC && G.MUSIC[name];
    if (!song) return;
    const tr = { song, step: 0, next: A.ctx.currentTime + 0.08, loop: song.loop !== false };
    A.track = tr;
    tr.timer = setInterval(() => schedule(tr), 25);
  };
  A.stopMusic = function () {
    if (A.track) clearInterval(A.track.timer);
    A.track = null;
    A.trackName = null;
    A.pendingTrack = null;
  };
  A.tempoScale = 1;
  function schedule(tr) {
    if (!A.ctx || A.track !== tr) return;
    const song = tr.song;
    const stepDur = 60 / song.bpm / 4 / A.tempoScale;
    while (tr.next < A.ctx.currentTime + 0.12) {
      const len = song.len;
      if (tr.step >= len) {
        if (!tr.loop) { clearInterval(tr.timer); if (A.track === tr) { A.track = null; } return; }
        tr.step = 0;
      }
      const s = tr.step;
      const delay = tr.next - A.ctx.currentTime;
      for (const ch of song.ch) {
        const n = ch.notes[s % ch.notes.length];
        if (!n || n === '.' || n === '-') continue;
        let dur = stepDur * 0.9;
        let k = 1;
        while (ch.notes[(s + k) % ch.notes.length] === '-' && k < 16) { dur += stepDur; k++; }
        if (ch.drum) {
          if (n === 'k') { tone({ f: 150, f2: 45, d: 0.12, v: ch.v * 1.6, type: 'triangle', delay }, A.musicBus); }
          else if (n === 's') noise({ f: 2500, f2: 800, d: 0.09, v: ch.v, delay, filter: 'bandpass' }, A.musicBus);
          else if (n === 'h') noise({ f: 8000, d: 0.03, v: ch.v * 0.5, delay, filter: 'highpass' }, A.musicBus);
          continue;
        }
        tone({ f: noteFreq(n), d: Math.max(0.05, dur), v: ch.v, type: ch.type, delay, a: 0.004 }, A.musicBus);
      }
      tr.step++;
      tr.next += stepDur;
    }
  }

  // ------------------------------------------------------------------ save
  const SAVE_KEY = 'bomb-maids-save-v1';
  E.loadSave = function (defaults) {
    let data = null;
    try {
      const raw = window.localStorage.getItem(SAVE_KEY);
      if (raw) data = JSON.parse(raw);
    } catch (e) { data = null; }
    return Object.assign(JSON.parse(JSON.stringify(defaults)), data || {});
  };
  E.writeSave = function (data) {
    try { window.localStorage.setItem(SAVE_KEY, JSON.stringify(data)); return true; } catch (e) { return false; }
  };
  E.clearSave = function () {
    try { window.localStorage.removeItem(SAVE_KEY); } catch (e) { /* storage unavailable */ }
  };

  // ------------------------------------------------------------------ scenes + loop
  E.scene = null;
  let pending = null;
  let fade = { t: 0, dir: 0, dur: 14 };
  E.go = function (scene, arg, instant) {
    if (instant || !E.scene) {
      if (E.scene && E.scene.exit) E.scene.exit();
      E.scene = scene;
      if (scene.enter) scene.enter(arg);
      fade = { t: 14, dir: -1, dur: 14 };
      return;
    }
    if (pending) return;
    pending = { scene, arg };
    fade = { t: 0, dir: 1, dur: 12 };
  };
  E.transitioning = () => !!pending;

  function update() {
    Input.poll();
    E.frame++;
    if (fade.dir === 1) {
      fade.t++;
      if (fade.t >= fade.dur) {
        if (E.scene && E.scene.exit) E.scene.exit();
        E.scene = pending.scene;
        const arg = pending.arg;
        pending = null;
        if (E.scene.enter) E.scene.enter(arg);
        fade = { t: fade.dur, dir: -1, dur: fade.dur };
      }
      return;
    }
    if (fade.dir === -1) { fade.t--; if (fade.t <= 0) fade.dir = 0; }
    if (E.scene && E.scene.update) E.scene.update();
    Input.tapped = false;
    Pointer.pressed = false;
    Pointer.moved = false;
  }

  function drawFade() {
    if (fade.t <= 0) return;
    const t = fade.t / fade.dur;
    // diamond wipe in plum (over the whole screen for a scene that draws there)
    const ctx = E.ctx;
    ctx.fillStyle = '#2a1b30';
    const size = 20;
    const x0 = E.scene && E.scene.wide ? -E.sideW : 0;
    for (let y = 0; y < H + size; y += size)
      for (let x = x0; x < W + size; x += size) {
        const local = E.clamp(t * 2.2 - ((x - x0 + y) / (W - x0 + H)) * 1.2, 0, 1);
        const r = Math.ceil(local * size * 0.75);
        if (r <= 0) continue;
        ctx.beginPath();
        ctx.moveTo(x, y - r); ctx.lineTo(x + r, y); ctx.lineTo(x, y + r); ctx.lineTo(x - r, y);
        ctx.closePath();
        ctx.fill();
      }
  }

  // advance the simulation without requestAnimationFrame (used for automated checks)
  // one frame: the portrait panel in screen coordinates, then the scene translated and clipped to the game area
  function drawFrame() {
    const ctx = E.ctx;
    E.draws = (E.draws || 0) + 1; // counts drawn frames (a fast screen can draw the same update twice)
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;
    // a wide scene (the opening) draws across the whole screen, at x from -E.sideW, and the portrait panel steps aside
    const wideScene = E.sideW > 0 && E.scene && E.scene.wide;
    ctx.save();
    ctx.beginPath();
    ctx.rect(wideScene ? 0 : E.sideW, 0, wideScene ? E.SW : W, H);
    // a scene with wideTop draws a band that far down across the whole screen, over the portrait panel (the room's
    // status bar); it draws it at x from -E.sideW
    if (E.sideW > 0 && !wideScene && E.scene && E.scene.wideTop) ctx.rect(0, 0, E.sideW, E.scene.wideTop);
    ctx.clip();
    ctx.translate(E.sideW, 0);
    if (E.scene && E.scene.draw) E.scene.draw(ctx);
    drawFade();
    ctx.restore();
    // the panel comes after the scene so it can carry on the wallpaper and bars the scene just drew
    if (E.sideW > 0 && !wideScene) {
      const band = (E.scene && E.scene.wideTop) || 0; // left as the scene drew it
      ctx.fillStyle = '#2a1b30';
      ctx.fillRect(0, band, E.sideW, H - band);
      if (E.sidePanel) E.sidePanel(ctx);
    }
    endArt();
  }
  E.step = function (n) {
    for (let i = 0; i < (n || 1); i++) update();
    drawFrame();
  };

  E.run = function () {
    const STEP = 1000 / 60;
    let last = performance.now();
    let acc = 0;
    function loop(now) {
      acc += Math.min(250, now - last);
      last = now;
      let n = 0;
      if (E.hold) acc = 0; // automated checks drive the simulation with E.step instead
      while (acc >= STEP && n < 5) { update(); acc -= STEP; n++; }
      // in case a resize went unannounced (it happens on phones turning), check the size now and then
      if ((E.frame & 15) === 0 && E.fitKey !== fitKey()) E.fit();
      if (n === 5) acc = 0;
      drawFrame();
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  };
})(window);
