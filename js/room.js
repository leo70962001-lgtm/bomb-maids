/* 炸彈女僕 BOMB MAIDS — 育成: the master's room, the maid who lives there, and the opening */
(function (G) {
  'use strict';
  const E = G.E;
  const A = E.audio;
  const SC = G.SCENES;
  const UI = G.UI;
  const C = UI.C;
  const B = G.BOND;
  const T = 16;
  const WALL_H = 24;
  let decorLayout = false; // while decorating, the room moves up above the item tray
  const DIRV = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

  const save = () => G.getSave();
  const maidKey = () => save().maid;
  const bond = (k) => B.getBond(k || maidKey());
  const lines = (k) => G.LINES[k || maidKey()];
  const trait = (k) => G.traitOf(k || maidKey());
  const name = (k) => G.MAID_DATA[k || maidKey()].name;
  const clamp = E.clamp;

  // ------------------------------------------------------------------ the sky in the window (real time of day + weather)
  const SKY = {
    morning: { top: '#ffd9a8', body: '#a8dcff' },
    noon: { top: '#c9ecff', body: '#8fd3ff' },
    evening: { top: '#ffb27a', body: '#ff93a8' },
    night: { top: '#2b2f62', body: '#1b1f46' },
  };
  const SKY_WEATHER = {
    cloud: { top: '#c8d2de', body: '#aab6c6' },
    rain: { top: '#9aa6b8', body: '#7c8a9e' },
    snow: { top: '#dfe8f2', body: '#c3d0de' },
    storm: { top: '#7d8598', body: '#5d667a' },
  };
  // the window sprite's glass sits at (3,3)-(14,10); paint it, then put the white mullions back on top
  function drawSky(x, y, w, t) {
    const night = w.phase === 'night';
    const over = !night && SKY_WEATHER[w.weather];
    const base = SKY[w.phase];
    E.rect(x + 3, y + 3, 12, 8, over ? over.body : base.body);
    E.rect(x + 3, y + 3, 12, 3, over ? over.top : base.top);
    if (night) {
      E.rect(x + 11, y + 4, 2, 2, '#ffeaa0');
      E.rect(x + 12, y + 4, 1, 1, '#fff6d0');
      if (w.weather !== 'rain' && w.weather !== 'snow' && w.weather !== 'storm') {
        for (let i = 0; i < 3; i++) E.rect(x + 4 + ((i * 5 + (t >> 6)) % 9), y + 4 + i * 2, 1, 1, '#fff6d0');
      }
    } else if (w.weather === 'sun' || w.weather === 'petal') {
      E.rect(x + 11, y + 4, 2, 2, '#fff2a0');
    }
    if (w.weather === 'rain' || w.weather === 'storm') {
      for (let i = 0; i < 4; i++) E.rect(x + 4 + ((i * 3 + (t >> 3)) % 10), y + 3 + ((i * 3 + (t >> 1)) % 7), 1, 2, '#cfe8ff');
      if (w.weather === 'storm' && t % 200 < 4) { E.ctx.fillStyle = 'rgba(255,255,220,0.75)'; E.ctx.fillRect(x + 3, y + 3, 12, 8); }
    } else if (w.weather === 'snow') {
      for (let i = 0; i < 4; i++) E.rect(x + 4 + ((i * 4 + (t >> 5)) % 10), y + 3 + ((i * 3 + (t >> 3)) % 8), 1, 1, '#ffffff');
    } else if (w.weather === 'petal') {
      for (let i = 0; i < 3; i++) E.rect(x + 4 + ((i * 5 + (t >> 5)) % 10), y + 3 + ((i * 4 + (t >> 3)) % 8), 1, 1, '#ffc0d8');
    } else if (w.weather === 'cloud') {
      E.rect(x + 4, y + 5, 5, 2, '#eef2f8');
      E.rect(x + 9, y + 7, 4, 2, '#e2e8f2');
    }
    E.rect(x + 8, y + 3, 1, 8, '#ffffff');
    E.rect(x + 3, y + 6, 12, 1, '#ffffff');
  }

  // ------------------------------------------------------------------ room geometry + furniture helpers
  function geom() {
    const room = B.getRoom();
    const S = G.ROOM_SIZES[room.size];
    const top = decorLayout ? 40 : 60, areaH = decorLayout ? 140 : 162;
    const total = WALL_H + S.h * T + 14;
    const wallY = top + Math.floor((areaH - total) / 2);
    // beside the portrait panel the room sits left of centre, closer to her
    const x0 = Math.floor((E.sideW > 0 ? 124 : E.W / 2) - (S.w * T) / 2);
    const floorY = wallY + WALL_H;
    return { w: S.w, h: S.h, x0, wallY, floorY, doorX: x0 + Math.floor(S.w / 2) * T - 12, doorY: floorY + S.h * T };
  }
  // tiles in front of the door stay free so the maid can always walk out
  function reserved(c, r, g) {
    return r === g.h - 1 && (c === Math.floor(g.w / 2) || c === Math.floor(g.w / 2) - 1);
  }
  function occupancy(skip) {
    const g = geom();
    const grid = new Array(g.w * g.h).fill(null);
    const floor = new Array(g.w * g.h).fill(null);
    for (const p of B.getRoom().placed) {
      if (p === skip) continue;
      const F = G.FURNITURE[p.id];
      for (let dy = 0; dy < F.h; dy++)
        for (let dx = 0; dx < F.w; dx++) {
          const c = p.c + dx, r = p.r + dy;
          if (c >= g.w || r >= g.h) continue;
          (F.layer === 'floor' ? floor : grid)[r * g.w + c] = p;
        }
    }
    return { grid, floor, g };
  }
  function connected(grid, g) {
    const start = (g.h - 1) * g.w + Math.floor(g.w / 2);
    if (grid[start]) return false;
    const seen = new Set([start]);
    const q = [start];
    while (q.length) {
      const k = q.shift();
      const c = k % g.w, r = (k / g.w) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nc = c + dx, nr = r + dy;
        if (nc < 0 || nr < 0 || nc >= g.w || nr >= g.h) continue;
        const nk = nr * g.w + nc;
        if (grid[nk] || seen.has(nk)) continue;
        seen.add(nk);
        q.push(nk);
      }
    }
    const free = grid.filter((v) => !v).length;
    return seen.size === free;
  }
  function canPlace(id, c, r, skip) {
    const F = G.FURNITURE[id];
    const { grid, floor, g } = occupancy(skip);
    if (c < 0 || r < 0 || c + F.w > g.w || r + F.h > g.h) return false;
    const test = grid.slice();
    for (let dy = 0; dy < F.h; dy++)
      for (let dx = 0; dx < F.w; dx++) {
        const k = (r + dy) * g.w + (c + dx);
        if (F.layer === 'floor') { if (floor[k]) return false; continue; }
        if (grid[k] || reserved(c + dx, r + dy, g)) return false;
        test[k] = true;
      }
    return F.layer === 'floor' || connected(test, g);
  }
  function storageCount(id) {
    const room = B.getRoom();
    return (room.owned[id] || 0) - room.placed.filter((p) => p.id === id).length;
  }
  function autoPlace(id) {
    const g = geom();
    for (let r = 0; r < g.h; r++)
      for (let c = 0; c < g.w; c++)
        if (canPlace(id, c, r)) {
          B.getRoom().placed.push({ id, c, r });
          return true;
        }
    return false;
  }
  G.ROOMAPI = { autoPlace };

  function affInfo(k) {
    const b = bond(k);
    const lv = B.affLevel(b.aff);
    const L = G.AFF_LEVELS;
    const next = L[lv + 1];
    return { lv, name: L[lv].name, t: next ? (b.aff - L[lv].at) / (next.at - L[lv].at) : 1, next };
  }
  // draw the first 'shown' characters of text, wrapped to maxW
  function typewriter(text, shown, x, y, maxW, color) {
    const visible = Math.floor(shown);
    let pos = 0;
    E.wrap(text, maxW).forEach((line, i) => {
      const start = text.indexOf(line, pos);
      pos = start + line.length;
      const n = Math.max(0, Math.min(line.length, visible - start));
      if (n > 0) E.text(line.slice(0, n), x, y + i * 14, { color });
    });
  }
  function moodName(m) { return G.t(m >= 80 ? '開心' : m >= 45 ? '普通' : m >= 25 ? '低落' : '很沮喪'); }
  function faceFor(k) {
    const b = bond(k);
    if (b.stamina < 20) return 'tired';
    if (b.mood >= 80) return 'happy';
    if (b.mood < 30) return 'tired';
    return 'normal';
  }

  // ------------------------------------------------------------------ opening narration
  // ------------------------------------------------------------------ opening
  // A short animated opening across the whole screen (the portrait panel steps aside while it plays): one shot per
  // narration line, cross-fading between letterbox bars — the dusty town where dust monsters sit on the roofs, the
  // mansion on the hill where one small window lights up, the empty little room where the last coins drop, and the
  // hiring poster with the first maid popping in. Lines type out and move on by themselves; Z or a tap moves on
  // sooner, START or the skip button jumps to the end.
  const OP_FADE = 24; // frames of cross-fade between shots
  const opHash = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  function opSky(L, FW, bands) {
    const h = Math.ceil((E.H - 10) / bands.length);
    bands.forEach((c, i) => {
      E.rect(L, i * h, FW, h + 1, c);
      // a two-row checker into the next band, so the sky has no hard stripes
      if (i + 1 < bands.length) for (let y = (i + 1) * h - 2; y < (i + 1) * h; y++) for (let x = L + ((y + i) % 2); x < L + FW; x += 2) E.rect(x, y, 1, 1, bands[i + 1]);
    });
  }
  // a crescent: the lit disc minus a second, offset disc
  function opCrescent(cx, cy, r, ox, oy, col) {
    for (let dy = -r; dy <= r; dy++) {
      const w = Math.round(Math.sqrt(r * r - dy * dy));
      for (let dx = -w; dx <= w; dx++) {
        const ex = dx - ox, ey = dy - oy;
        if (ex * ex + ey * ey > r * r) E.rect(cx + dx, cy + dy, 1, 1, col);
      }
    }
  }
  function opDisc(cx, cy, r, col) {
    for (let dy = -r; dy <= r; dy++) {
      const w = Math.round(Math.sqrt(r * r - dy * dy));
      E.rect(Math.round(cx - w), Math.round(cy + dy), w * 2 + 1, 1, col);
    }
  }
  function opCloud(cx, cy, s, col) {
    for (const [dx, dy, r] of [[-13, 3, 7], [-4, -1, 9], [7, 0, 8], [16, 4, 6], [-21, 6, 5], [2, 6, 8]]) opDisc(cx + dx * s, cy + dy * s, Math.max(2, Math.round(r * s)), col);
  }
  function opStars(L, FW, t, maxY, seed) {
    for (let k = 0; k < 48; k++) {
      const x = L + Math.floor(opHash(k + seed) * FW), y = 20 + Math.floor(opHash(k + seed + 50) * maxY);
      if (Math.sin(t * 0.05 + k * 1.7) > -0.4) E.rect(x, y, 1, 1, k % 6 ? '#8e7fb0' : '#fff4d6');
    }
  }
  // a townhouse: body, stepped gable, chimney and two windows; some are lit, some have a dust monster on the ridge
  function opHouse(x, base, k, t) {
    const ctx = E.ctx;
    const w = 42 + Math.floor(opHash(k + 3) * 16), h = 28 + Math.floor(opHash(k + 5) * 20);
    const top = base - h, rh = Math.floor(w / 2.6);
    E.rect(x + Math.floor(w * 0.68), top - rh - 3, 5, rh + 3, '#1a1126');
    E.rect(x + Math.floor(w * 0.68) - 1, top - rh - 4, 7, 2, '#2c1f3c');
    for (let r = 0; r < rh; r++) {
      const half = Math.round(((r + 1) * (w / 2 + 3)) / rh);
      E.rect(x + Math.floor(w / 2) - half, top - rh + r, half * 2, 1, '#241834');
      E.rect(x + Math.floor(w / 2) - half, top - rh + r, 1, 1, '#3d2b52');
    }
    E.rect(x, top, w, h, '#1d1329');
    E.rect(x, top, w, 1, '#2c1f3c');
    for (let i = 0; i < 2; i++) {
      const wx = x + 7 + i * (w - 20), wy = top + 8;
      const lit = opHash(k * 7 + i) > 0.62 && Math.sin(t * 0.03 + k + i) > -0.7;
      E.rect(wx - 1, wy - 1, 8, 9, '#130c1c');
      E.rect(wx, wy, 6, 7, lit ? '#ffc66b' : '#2f2342');
      if (lit) E.rect(wx + 1, wy + 1, 2, 3, '#fff0c0');
    }
    E.rect(x + Math.floor(w / 2) - 4, base - 11, 8, 11, '#120b1a');
    if (k % 3 === 0) {
      const f = E.spr.monsters.dustcat.frames[((t >> 4) + k) % 2];
      const bob = Math.round(Math.abs(Math.sin(t * 0.09 + k)) * 2);
      ctx.drawImage(f, x + Math.floor(w / 2) - 8, top - rh - f.height + 3 - bob);
    }
  }

  SC.intro = {
    wide: true, // the whole screen: the panel steps aside
    enter() {
      this.t = 0;
      this.i = 0;
      this.chars = 0;
      this.hold = 0;
      this.shotT = 0;
      this.prev = null; // the shot fading out: { i, t, at }
      this.leaving = false;
      A.playMusic('room');
    },
    // the band the opening draws in: the whole screen beside the portrait panel, else the game's width
    band() { const L = -E.sideW; return { L, FW: E.W - L }; },
    skipRect() { const { L, FW } = this.band(); return { x: L + FW - 64, y: 2, w: 60, h: 15 }; },
    next() {
      if (this.i >= G.INTRO_LINES.length - 1) return this.finish();
      this.prev = { i: this.i, t: this.shotT, at: this.t };
      this.i++;
      this.chars = 0;
      this.hold = 0;
      this.shotT = 0;
      A.sfx('select');
    },
    finish() {
      if (this.leaving) return;
      this.leaving = true;
      A.sfx('confirm');
      E.go(SC.select, { mode: 'first' });
    },
    update() {
      this.t++;
      this.shotT++;
      const line = G.INTRO_LINES[this.i];
      if (this.chars < line.length) {
        this.chars = Math.min(line.length, this.chars + 0.5);
        if (Math.floor(this.chars) % 3 === 0 && this.chars % 1 === 0) A.sfx('blip');
      } else this.hold++;
      // sound cues inside the shots
      if (this.i === 1 && this.shotT === 72) A.sfx('door');
      if (this.i === 2 && this.shotT >= 56 && this.shotT <= 56 + 34 * 4 && (this.shotT - 56) % 34 === 0) A.sfx('coin'); // as each coin lands
      if (this.i === 3 && this.shotT === 16) A.sfx('drop');
      if (this.i === 3 && this.shotT === 46) A.sfx('levelup');
      if (this.leaving) return;
      const p = E.pointer, r = this.skipRect();
      if (E.menuPressed('start') || (p.pressed && p.x >= r.x && p.x < r.x + r.w && p.y >= r.y && p.y < r.y + r.h)) return this.finish();
      if (E.menuPressed('a') || E.menuPressed('b') || p.pressed) {
        if (this.chars < line.length) this.chars = line.length;
        else this.next();
      } else if (this.hold > (this.i === G.INTRO_LINES.length - 1 ? 220 : 150)) this.next();
    },
    draw() {
      const ctx = E.ctx;
      const { L, FW } = this.band();
      // the shot fading out underneath, the current one on top
      const fadeIn = this.prev ? Math.min(1, (this.t - this.prev.at) / OP_FADE) : 1;
      if (this.prev && fadeIn < 1) this.shot(this.prev.i, this.prev.t + (this.t - this.prev.at), L, FW, 1 - fadeIn);
      else this.prev = null;
      ctx.globalAlpha = fadeIn;
      this.shot(this.i, this.shotT, L, FW, fadeIn);
      ctx.globalAlpha = 1;
      // letterbox bars slide in, the narration types out in the bottom one
      const open = E.ease.outCubic(Math.min(1, this.t / 30));
      const topH = Math.round(18 * open), botH = Math.round(42 * open);
      E.rect(L, 0, FW, topH, '#000000');
      E.rect(L, E.H - botH, FW, botH, '#000000');
      if (open < 1) return;
      E.rect(L, E.H - 43, FW, 1, '#f8b000');
      const line = G.INTRO_LINES[this.i];
      typewriter(line, this.chars, L + 22, E.H - 36, FW - 64, C.paper);
      if (this.chars >= line.length && (this.t >> 5) % 2 === 0) E.text('▼', L + FW - 22, E.H - 16, { color: C.pink });
      for (let k = 0; k < G.INTRO_LINES.length; k++) E.rect(L + 8 + k * 9, 7, 6, 3, k === this.i ? C.pink : k < this.i ? C.ink : '#2e2640');
      const r = this.skipRect();
      E.text(G.t('跳過 ▶▶'), r.x + r.w, 3, { color: C.gray, align: 'right' });
    },
    shot(i, t, L, FW, alpha) {
      if (i === 0) this.shotTown(t, L, FW);
      else if (i === 1) this.shotMansion(t, L, FW);
      else if (i === 2) this.shotRoom(t, L, FW);
      else this.shotHire(t, L, FW, alpha);
    },
    // 「蕾絲町」: a dusky town under drifting dust, dust monsters on the roofs; the camera drifts along the street
    shotTown(t, L, FW) {
      const ctx = E.ctx;
      opSky(L, FW, ['#140c1e', '#1b1128', '#241632', '#301c3e', '#40254a', '#553152']);
      opStars(L, FW, t, 90, 0);
      const mx = L + Math.round(FW * 0.74), my = 52;
      opDisc(mx, my, 18, '#efdcb2');
      opDisc(mx - 3, my - 3, 14, '#fff4d8');
      E.rect(mx + 5, my + 5, 4, 3, '#e3cc9c'); E.rect(mx - 9, my + 8, 3, 2, '#e3cc9c'); E.rect(mx + 1, my - 10, 3, 2, '#e3cc9c');
      const a0 = ctx.globalAlpha;
      // dust haze crossing the moon
      ctx.globalAlpha = a0 * 0.45;
      for (let k = 0; k < 4; k++) {
        const cx = L + ((k * 140 + t * (0.22 + k * 0.05)) % (FW + 120)) - 60;
        opCloud(cx, 44 + k * 17, 1.3 + (k % 2) * 0.5, k % 2 ? '#7c6c8e' : '#9a8aa8');
      }
      ctx.globalAlpha = a0;
      // far skyline
      const P1 = 26 * 40, far = t * 0.12;
      for (let k = 0; k < 40; k++) {
        const bw = 14 + Math.floor(opHash(k + 7) * 18), bh = 22 + Math.floor(opHash(k + 9) * 38);
        const x = Math.round(L + ((((k * 26 - far) % P1) + P1) % P1) - 30);
        if (x > L + FW || x + bw < L) continue;
        E.rect(x, 152 - bh, bw, bh + 30, '#261a36');
        for (let wy = 156 - bh; wy < 146; wy += 8) if (opHash(k * 13 + wy) > 0.74) E.rect(x + 3 + ((wy >> 3) % 2) * 5, wy, 2, 3, '#4d3c66');
      }
      // near houses with the dust monsters
      const P2 = 62 * 12, near = t * 0.35;
      for (let k = 0; k < 12; k++) {
        const x = Math.round(L + ((((k * 62 - near) % P2) + P2) % P2) - 62);
        if (x > L + FW + 4 || x < L - 64) continue;
        opHouse(x, 180, k, t);
      }
      // a dust monster riding a cloud across the sky
      const fx = L + ((t * 0.7) % (FW + 80)) - 40, fy = 96 + Math.round(Math.sin(t * 0.05) * 5);
      ctx.globalAlpha = a0 * 0.8;
      opCloud(fx, fy + 12, 0.8, '#a898b6');
      ctx.globalAlpha = a0;
      ctx.drawImage(E.spr.monsters.dustcat.frames[(t >> 5) % 2], Math.round(fx - 8), fy - 10);
      // street
      E.rect(L, 180, FW, 60, '#140d1d');
      for (let x = L - ((near | 0) % 14); x < L + FW; x += 14) E.rect(x, 186, 9, 1, '#261b33');
      ctx.globalAlpha = a0 * 0.3;
      for (let k = 0; k < 4; k++) {
        const px = L + ((k * 113 + t * 0.9) % (FW + 30)) - 15;
        ctx.drawImage(E.spr.fx.puff[((t >> 4) + k) % 4], Math.round(px), 178 + (k % 3) * 5);
      }
      ctx.globalAlpha = a0;
    },
    // the mansion on the hill: the camera climbs the path and one small window lights up
    shotMansion(t, L, FW) {
      const ctx = E.ctx;
      opSky(L, FW, ['#110a19', '#180e23', '#20132d', '#2a1938', '#372143', '#472a4f']);
      opStars(L, FW, t, 110, 90);
      const mx = L + Math.round(FW * 0.22);
      opCrescent(mx, 42, 12, 6, -4, '#fff2cc');
      const rise = Math.round(E.ease.inOut(Math.min(1, t / 160)) * 56);
      ctx.save();
      ctx.translate(0, 56 - rise);
      const cx = L + Math.round(FW / 2);
      // hill and the winding path with its lamps
      for (let y = 150; y < 320; y++) {
        const hw = Math.round(Math.sqrt((y - 150) * 900));
        E.rect(cx - hw, y, hw * 2, 1, y < 153 ? '#2c1f3c' : '#1a1026');
      }
      for (let y = 154; y < 300; y += 2) {
        const px = cx + Math.round(Math.sin((y - 150) * 0.045) * (y - 150) * 0.35);
        E.rect(px - 3, y, 7, 2, '#33264a');
      }
      [[0, 176], [1, 206], [2, 238], [3, 270]].forEach(([k, y]) => {
        const px = cx + Math.round(Math.sin((y - 150) * 0.045) * (y - 150) * 0.35) + (k % 2 ? 12 : -13);
        const on = t > 24 + k * 16;
        E.rect(px, y - 12, 1, 12, '#0f0916');
        E.rect(px - 1, y - 14, 3, 3, on ? '#ffd27a' : '#3b2f52');
        if (on) { const a1 = ctx.globalAlpha; ctx.globalAlpha = a1 * 0.25; opDisc(px, y - 13, 5, '#ffcf70'); ctx.globalAlpha = a1; }
      });
      // the mansion: two wings, a tower, rows of windows, lace along the eaves
      const base = 152;
      E.rect(cx - 58, base - 40, 116, 40, '#140c1d');
      for (const side of [-1, 1]) {
        const wx = cx + side * 36;
        for (let r = 0; r < 14; r++) {
          E.rect(wx - 24 + r, base - 54 + r, 48 - r * 2, 1, '#120a1a');
          E.rect(wx - 24 + r, base - 54 + r, 1, 1, '#5a4474');
          E.rect(wx + 23 - r, base - 54 + r, 1, 1, '#2e2242');
        }
      }
      E.rect(cx - 13, base - 74, 26, 74, '#170e21');
      E.rect(cx - 13, base - 74, 1, 74, '#3a2c50');
      for (let r = 0; r < 20; r++) {
        const inset = Math.floor(r * 0.65);
        E.rect(cx - 13 + inset, base - 94 + r, 26 - inset * 2, 1, '#120a1a');
        E.rect(cx - 13 + inset, base - 94 + r, 1, 1, '#5a4474');
      }
      E.rect(cx, base - 100, 1, 6, '#7a6494');
      E.rect(cx - 58, base - 40, 116, 1, '#3a2c50');
      for (let x = cx - 58; x < cx + 58; x += 4) E.rect(x, base - 39, 2, 1, '#5a4474');
      for (const row of [base - 32, base - 18]) for (let k = 0; k < 8; k++) {
        const wx = cx - 52 + k * 14 + (k >= 4 ? 8 : 0);
        if (Math.abs(wx + 3 - cx) < 16) continue;
        E.rect(wx - 1, row - 1, 8, 10, '#140d1d');
        E.rect(wx, row, 6, 8, '#2f2346');
      }
      E.rect(cx - 7, base - 16, 14, 16, '#130b1b');
      E.rect(cx - 6, base - 15, 12, 15, t > 90 ? '#6b4a2a' : '#1c1228');
      // her window: the little one high in the tower lights up
      const lit = t > 70;
      E.rect(cx - 5, base - 64, 10, 12, '#140d1d');
      E.rect(cx - 4, base - 63, 8, 10, lit ? '#ffd23f' : '#2f2346');
      if (lit) {
        E.rect(cx - 3, base - 62, 6, 4, '#fff0a0');
        E.rect(cx - 4, base - 58, 8, 1, '#c98f24');
        const a1 = ctx.globalAlpha;
        const glow = 0.18 + Math.sin(t * 0.08) * 0.05;
        ctx.globalAlpha = a1 * glow;
        opDisc(cx, base - 58, 18, '#ffcf70');
        ctx.globalAlpha = a1 * glow * 0.6;
        opDisc(cx, base - 58, 30, '#ffb347');
        ctx.globalAlpha = a1;
      }
      // her suitcase cart rolls up the path
      const p = Math.min(1, t / 130);
      const cy = 292 - p * 138, ccx = cx + Math.round(Math.sin((cy - 150) * 0.045) * (cy - 150) * 0.35);
      if (p < 1) {
        E.rect(ccx - 7, cy - 8, 14, 6, '#8a5a36'); E.rect(ccx - 6, cy - 7, 12, 1, '#b07a4a');
        E.rect(ccx - 4, cy - 13, 9, 5, '#d64a6a'); E.rect(ccx - 1, cy - 15, 3, 2, '#1a1026');
        E.rect(ccx - 6, cy - 2, 3, 3, '#0f0916'); E.rect(ccx + 4, cy - 2, 3, 3, '#0f0916');
      }
      ctx.restore();
    },
    // the empty little room: dust bunnies, a broom, moonlight — and the last few coins dropping onto the floor
    shotRoom(t, L, FW) {
      const ctx = E.ctx;
      const S = E.spr;
      const wall = S.room.walls.night, floor = S.room.floors.wood;
      // the wallpaper strip is 17 rows of starry paper over a wooden wainscot: tile the paper, then run the wainscot once
      for (let x = L; x < L + FW; x += 16) {
        const strip = wall[((x - L) >> 4) % 2];
        for (let y = 10; y < 125; y += 16) ctx.drawImage(strip, 0, 0, 16, 16, x, y, 16, 16);
        ctx.drawImage(strip, 0, 16, 16, 8, x, 124, 16, 8);
      }
      E.rect(L, 18, FW, 4, '#5a3a22');
      E.rect(L, 22, FW, 1, '#2e1c10');
      for (let x = L; x < L + FW; x += 16) for (let y = 132; y < E.H; y += 16) ctx.drawImage(floor[(((x - L) >> 4) + (y >> 4)) % 2], x, y);
      E.rect(L, 130, FW, 3, '#3a2415');
      E.rect(L, 133, FW, 1, '#1d120a');
      const cx = L + Math.round(FW / 2);
      const a0 = ctx.globalAlpha;
      // a dim room: shade, then the moonlit window and its beam on the floor
      ctx.globalAlpha = a0 * 0.45;
      E.rect(L, 10, FW, E.H - 10, '#140c20');
      ctx.globalAlpha = a0;
      ctx.drawImage(S.room.window, cx + 30, 44, 36, 28);
      ctx.globalAlpha = a0 * 0.14;
      ctx.fillStyle = '#dfe8ff';
      ctx.beginPath(); ctx.moveTo(cx + 32, 72); ctx.lineTo(cx + 64, 72); ctx.lineTo(cx + 40, 200); ctx.lineTo(cx - 10, 200); ctx.closePath(); ctx.fill();
      ctx.globalAlpha = a0;
      // cobweb in the corner, a broom against the wall
      for (let k = 0; k < 14; k++) E.rect(L + k, 10 + Math.floor(k * 0.8), 1, 1, '#b8b0c8');
      for (let k = 0; k < 10; k++) E.rect(L + k * 2, 10 + k, 1, 1, '#8d86a8');
      ctx.drawImage(S.room.broom, L + 30, 114, 8, 18);
      // dust bunnies hopping about
      for (let k = 0; k < 7; k++) {
        const x = Math.round(L + 16 + opHash(k + 20) * (FW - 40));
        const y = 150 + (k % 3) * 14;
        const hop = Math.round(Math.max(0, Math.sin(t * 0.09 + k * 1.3)) * 5);
        ctx.drawImage(S.items.dust[((t >> 5) + k) % 3], x, y - hop);
      }
      // the last coins drop onto the floor, one after another
      for (let c = 0; c < 5; c++) {
        const t0 = 38 + c * 34;
        if (t < t0) continue;
        const f = Math.min(1, (t - t0) / 18);
        const px = cx - 12 + ((c * 7) % 5) * 5, py = 158 - (c % 3) * 3;
        const y = Math.round(18 + (py - 18) * f * f);
        ctx.drawImage(S.items.coin[f < 1 ? (t >> 2) % 4 : 0], px, y);
        if (f >= 1 && t - t0 < 30) ctx.drawImage(S.fx.sparkle[((t - t0) >> 3) % 3], px + 12, py - 2);
      }
      // a bare bulb swaying from the ceiling
      const sway = Math.sin(t * 0.04) * 6;
      ctx.strokeStyle = '#1a1026';
      ctx.beginPath(); ctx.moveTo(cx - 40, 10); ctx.lineTo(cx - 40 + sway, 44); ctx.stroke();
      ctx.globalAlpha = a0 * 0.2;
      opDisc(cx - 40 + sway, 48, 16, '#ffe2a0');
      ctx.globalAlpha = a0;
      opDisc(cx - 40 + sway, 48, 3, '#ffe9b8');
    },
    // "hire a maid!": a bright burst, the hiring poster slaps down and the first maid pops in beside it
    shotHire(t, L, FW, alpha) {
      const ctx = E.ctx;
      const tile = E.spr.bgTile;
      const off = Math.floor(t * 0.5) % 32;
      for (let y = off - 32; y < E.H; y += 32) for (let x = L + off - 32; x < L + FW; x += 32) ctx.drawImage(tile, x, y);
      const cx = L + Math.round(FW * 0.34), cy = 104;
      const a0 = ctx.globalAlpha;
      ctx.globalAlpha = a0 * 0.4;
      ctx.fillStyle = '#ffffff';
      for (let k = 0; k < 12; k++) {
        const a = t * 0.008 + (k * Math.PI) / 6;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(a) * 420, cy + Math.sin(a) * 420);
        ctx.lineTo(cx + Math.cos(a + 0.2) * 420, cy + Math.sin(a + 0.2) * 420);
        ctx.closePath();
        ctx.fill();
      }
      ctx.globalAlpha = a0;
      // the poster drops in with a bounce
      const land = 16;
      const py = t < land ? cy - Math.pow(1 - t / land, 2) * 170 : cy - Math.abs(Math.sin((t - land) * 0.45)) * Math.max(0, 8 - (t - land) * 0.5);
      ctx.save();
      ctx.translate(cx, Math.round(py));
      ctx.rotate(-0.07);
      E.rect(-50, -38, 100, 76, '#000000');
      E.rect(-49, -37, 98, 74, '#fff6e6');
      E.rect(-49, -37, 98, 16, '#e8305a');
      E.rect(-49, -21, 98, 1, '#a51f40');
      E.text('MAID WANTED', 0, -36, { color: '#ffffff', align: 'center' });
      // an apron with a frill, and a few lines of small print
      E.rect(-30, -16, 1, 8, '#1a1020'); E.rect(-11, -16, 1, 8, '#1a1020');
      E.rect(-27, -12, 14, 12, '#1a1020'); E.rect(-26, -11, 12, 11, '#ffffff');
      E.rect(-33, 0, 26, 4, '#1a1020'); E.rect(-32, 1, 24, 2, '#ff9fbb');
      E.rect(-37, 4, 34, 16, '#1a1020'); E.rect(-36, 4, 32, 15, '#ffffff'); E.rect(-36, 4, 32, 3, '#e8e2f0');
      for (let x = -37; x < -3; x += 4) { E.rect(x, 19, 4, 3, '#1a1020'); E.rect(x + 1, 19, 2, 2, '#ffe0ea'); }
      E.rect(-23, -2, 6, 8, '#1a1020'); E.rect(-22, -1, 4, 6, '#ec3d5f');
      for (let k = 0; k < 4; k++) E.rect(2, -8 + k * 8, 36 - (k % 2) * 8, 3, '#d8c8b4');
      E.rect(14, 22, 22, 11, '#ec3d5f'); E.rect(15, 23, 20, 9, '#ffe0ea');
      ctx.drawImage(E.spr.fx.heart, 22, 25);
      ctx.drawImage(E.spr.fx.heart, -3, -44);
      ctx.restore();
      // the first maid pops in with her happiest picture
      const first = G.MAID_ORDER.find((k) => !UI.isLocked(k)) || G.MAID_ORDER[0];
      if (t >= 40) {
        const P = UI.portraitPicture(first, 'joy');
        const k = Math.min(1, (t - 40) / 18);
        const h = 186, w = (P.w * h) / P.h;
        const x = L + FW - w - 8 + (1 - E.ease.outBack(k)) * 70;
        E.art('opening-maid', P.src, x, 14, w, h, [0, 0, P.w, P.h, P.w, P.h], null, { opacity: Math.min(1, (t - 40) / 10) * alpha, fadeBottom: [0.86, 1] });
        // a burst of sparkles and hearts around her
        for (let s = 0; s < 10; s++) {
          const life = (t - 40 - s * 3) / 40;
          if (life <= 0 || life >= 1) continue;
          const ang = s * 2.4;
          const sx = L + FW - w / 2 - 8 + Math.cos(ang) * (20 + life * 70), sy = 90 + Math.sin(ang) * (16 + life * 54) - life * 10;
          ctx.drawImage(s % 3 ? E.spr.fx.sparkle[(t >> 3) % 3] : E.spr.fx.heart, Math.round(sx), Math.round(sy));
        }
      }
    },
  };

  // ------------------------------------------------------------------ the room
  const TABS = [
    { id: 'diary', label: '日記' },
    { id: 'sleep', label: '休息' },
    { id: 'out', label: '出門' },
    { id: 'wardrobe', label: '衣櫃' },
    { id: 'system', label: '系統' },
    { id: 'decor', label: '佈置' },
  ];
  // tool buttons under the status bar; 「佈置」 is the yellow quarter circle in the bottom-right corner
  const CORNER_R = 60;
  function tabRect(i) {
    if (i === 5) return { x: E.W - CORNER_R, y: E.H - CORNER_R, w: CORNER_R, h: CORNER_R };
    return { x: 4 + i * 25, y: 39, w: 23, h: 21 };
  }
  function drawCornerButton(label, hot) {
    for (let dy = 0; dy < CORNER_R; dy++) {
      const y = E.H - 1 - dy;
      const hw = Math.round(Math.sqrt(CORNER_R * CORNER_R - dy * dy));
      E.rect(E.W - hw, y, hw, 1, '#000000');
      if (hw > 2) E.rect(E.W - hw + 1, y, hw - 1, 1, '#c88a00');
      if (hw > 4) E.rect(E.W - hw + 3, y, hw - 3, 1, hot ? '#ffe27a' : '#ffc400');
    }
    E.text(label, E.W - 4, E.H - 17, { color: '#1a1020', align: 'right', fit: 54 });
  }

  SC.room = {
    wideTop: 38, // the status bar runs across the whole screen
    enter(arg) {
      arg = arg || {};
      decorLayout = false;
      const S = save();
      B.getRoom();
      bond();
      this.t = 0;
      this.mode = 'free';
      this.tab = 0;
      this.menu = null;
      this.dialog = null;
      this.anim = null;
      this.panel = null;
      this.decor = null;
      this.toasts = [];
      this.particles = [];
      // the real world: the clock and sky the room follows, and the rest the maids got while the game was closed
      this.world = G.world();
      const rested = G.restTick();
      if (rested >= 1) {
        G.persist();
        this.toast(G.t('休息中體力恢復了 +{n}', { n: Math.round(rested) }), C.mint);
      }
      const g = geom();
      this.glove = { x: 160, y: g.floorY + g.h * 8, pat: 0, usingPointer: false };
      this.spawnMaid();
      A.playMusic('room');
      const k = maidKey();
      const L = lines(k);
      if (arg.intro && !S.intro) {
        S.intro = true;
        G.persist();
        this.say([
          { who: k, face: 'happy', text: L.intro },
          { who: k, face: 'normal', text: G.t('這裡就是主人的房間嗎？我會每天打掃得亮晶晶的！') },
          { who: null, text: G.t('在房間裡照顧女僕、陪她說話，她就會越來越信賴你，出任務時也會更強喔。') },
        ]);
      } else if (S.lastJob) {
        const job = S.lastJob;
        S.lastJob = null;
        G.persist();
        if (job.result === 'clear') {
          const q = [{ who: k, face: 'happy', text: L.jobBack }];
          if (job.levelUp) q.push({ who: k, face: 'blush', text: L.levelUp, levelUp: true });
          if (job.newMaid && G.MAID_DATA[job.newMaid]) {
            q.push({ who: job.newMaid, face: 'happy', text: lines(job.newMaid).intro });
            q.push({ who: null, text: G.t('{name}成為新的夥伴了！打開衣櫃就能換她值班。', { name: name(job.newMaid) }) });
          }
          this.say(q);
        } else this.say([{ who: k, face: 'tired', text: L.jobFail }]);
      } else {
        // she greets by the hour, and sometimes by the weekday or the sky outside
        const ctx = G.contextLines(k, this.world);
        const r = Math.random();
        const line = (r < 0.45 ? ctx.time : r < 0.7 ? ctx.week : r < 0.9 ? ctx.sky : null) || E.pick(L.greet);
        this.speak(line, this.world.phase === 'night' ? 'normal' : 'happy');
      }
    },

    // ---------------------------------------------------------------- maid actor
    spawnMaid() {
      const g = geom();
      const { grid } = occupancy();
      let c = Math.floor(g.w / 2), r = g.h - 1;
      if (grid[r * g.w + c]) {
        const free = grid.map((v, i) => (v ? -1 : i)).filter((i) => i >= 0);
        const k = free[free.length - 1];
        c = k % g.w; r = (k / g.w) | 0;
      }
      this.maid = { c, r, x: c * T, y: r * T, dir: 'down', path: [], state: 'idle', idle: 90, walkT: 0, face: null, faceT: 0, emote: null, emoteT: 0, hop: 0, speech: null, speechT: 0, prop: null, useT: 0 };
    },
    maidTile() { return [this.maid.c, this.maid.r]; },
    pathTo(tc, tr) {
      const { grid, g } = occupancy();
      const m = this.maid;
      const start = m.r * g.w + m.c, goal = tr * g.w + tc;
      if (grid[goal]) return null;
      const prev = new Map([[start, -1]]);
      const q = [start];
      while (q.length) {
        const k = q.shift();
        if (k === goal) break;
        const c = k % g.w, r = (k / g.w) | 0;
        for (const d of ['up', 'down', 'left', 'right']) {
          const nc = c + DIRV[d][0], nr = r + DIRV[d][1];
          if (nc < 0 || nr < 0 || nc >= g.w || nr >= g.h) continue;
          const nk = nr * g.w + nc;
          if (grid[nk] || prev.has(nk)) continue;
          prev.set(nk, k);
          q.push(nk);
        }
      }
      if (!prev.has(goal)) return null;
      const path = [];
      let cur = goal;
      while (cur !== start) { path.unshift([cur % g.w, (cur / g.w) | 0]); cur = prev.get(cur); }
      return path;
    },
    walkTo(tc, tr, then) {
      const path = this.pathTo(tc, tr);
      if (!path) return false;
      const m = this.maid;
      m.path = path;
      m.state = 'walk';
      m.then = then || null;
      return true;
    },
    useSpot(p) {
      const F = G.FURNITURE[p.id];
      const { grid, g } = occupancy();
      const cands = [];
      for (let dx = 0; dx < F.w; dx++) cands.push([p.c + dx, p.r + F.h, 'up']);
      for (let dy = 0; dy < F.h; dy++) { cands.push([p.c - 1, p.r + dy, 'right']); cands.push([p.c + F.w, p.r + dy, 'left']); }
      for (let dx = 0; dx < F.w; dx++) cands.push([p.c + dx, p.r - 1, 'down']);
      for (const [c, r, face] of cands) {
        if (c < 0 || r < 0 || c >= g.w || r >= g.h || grid[r * g.w + c]) continue;
        if (c === this.maid.c && r === this.maid.r) return { c, r, face };
        if (this.pathTo(c, r)) return { c, r, face };
      }
      return null;
    },
    setFace(face, frames) { this.maid.face = face; this.maid.faceT = frames || 90; },
    emote(kind, frames) { this.maid.emote = kind; this.maid.emoteT = frames || 90; },
    speak(text, face) {
      this.maid.speech = text;
      this.maid.speechT = 170;
      if (face) this.setFace(face, 150);
    },
    updateMaid() {
      const m = this.maid;
      if (m.faceT > 0 && --m.faceT === 0) m.face = null;
      if (m.emoteT > 0 && --m.emoteT === 0) m.emote = null;
      if (m.speechT > 0 && --m.speechT === 0) m.speech = null;
      if (m.hop > 0) m.hop = Math.max(0, m.hop - 0.6);
      if (m.state === 'walk') {
        const next = m.path[0];
        if (!next) {
          m.state = 'idle';
          m.idle = E.randi(100, 240);
          if (m.then) { const f = m.then; m.then = null; f(); }
          return;
        }
        const tx = next[0] * T, ty = next[1] * T;
        const dx = tx - m.x, dy = ty - m.y;
        if (Math.abs(dx) > 0.01) m.dir = dx > 0 ? 'right' : 'left';
        else if (Math.abs(dy) > 0.01) m.dir = dy > 0 ? 'down' : 'up';
        const sp = 0.9;
        m.x += Math.sign(dx) * Math.min(Math.abs(dx), sp);
        m.y += Math.sign(dy) * Math.min(Math.abs(dy), sp);
        m.walkT++;
        if (Math.abs(m.x - tx) < 0.01 && Math.abs(m.y - ty) < 0.01) {
          m.c = next[0]; m.r = next[1];
          m.path.shift();
        }
        return;
      }
      if (m.state === 'use') {
        if (--m.useT <= 0) { m.state = 'idle'; m.prop = null; m.idle = E.randi(120, 260); }
        if (m.prop === 'broom' && this.t % 20 === 0) this.sparkle(this.maidScreen().x + E.randi(-4, 18), this.maidScreen().y + 14);
        return;
      }
      // her own little moves: each maid has her own (see G.TRAITS)
      if (m.state === 'pose') {
        const ms = this.maidScreen();
        const t = m.poseT;
        switch (m.pose) {
          case 'punch': // Berry shadow-boxes, one jab at a time
            m.dir = 'down';
            m.walkT++;
            if (t % 14 === 0) { m.hop = 3; this.sparkle(ms.x + (t % 28 === 0 ? -2 : 18), ms.y - 2); }
            if (t === 104) this.emote('exclaim', 40);
            break;
          case 'trip': // Honey trips over nothing and catches herself
            if (t === 96) { m.hop = 5; this.emote('sweat', 50); this.setFace('surprise', 60); }
            if (t === 50) this.emote('note', 40);
            break;
          case 'dream': // Honey drifts off in the middle of a thought
            if (t === 108) this.emote('dots', 80);
            if (t === 46) { this.emote('question', 50); m.dir = E.pick(['left', 'right']); }
            break;
          case 'tidy': // Yukino straightens the room as she goes
            m.walkT++;
            if (t % 30 === 0) { m.dir = m.dir === 'left' ? 'right' : 'left'; this.sparkle(ms.x + E.randi(0, 16), ms.y + 10); }
            if (t === 100) this.emote('note', 60);
            break;
          case 'read':
            if (t === 100) this.emote('dots', 80);
            break;
          case 'stare': // Yoru simply watches you
            m.dir = 'down';
            if (t === 90) this.emote('dots', 70);
            break;
          case 'blade': // Yoru practises a single cut
            if (t === 40) {
              this.emote('sparkle', 40);
              for (let i = 0; i < 5; i++) this.sparkle(ms.x + 2 + i * 3, ms.y + 4 - i * 2);
              A.sfx('slash');
            }
            break;
        }
        if (--m.poseT <= 0) { m.state = 'idle'; m.prop = null; m.idle = E.randi(90, 200); }
        return;
      }
      if (m.state === 'sleep' || m.state === 'hold') return;
      // idle: look at the glove when it hovers nearby, otherwise live a little
      if (this.hover && this.hover.kind === 'maid') { m.dir = 'down'; return; }
      if (--m.idle > 0) return;
      this.idleBehavior();
    },
    // her own move: shadow-boxing, a stumble, tidying, a cut — whatever suits her (G.TRAITS)
    startPose(kind) {
      const m = this.maid;
      m.state = 'pose';
      m.pose = kind;
      m.poseT = kind === 'blade' ? 70 : 120;
      m.prop = kind === 'read' ? 'book' : null;
      if (kind === 'stare' || kind === 'punch') m.dir = 'down';
      if (kind === 'blade') { m.dir = 'left'; this.setFace('angry', 60); }
      if (kind === 'dream') this.setFace('tired', 90);
    },
    idleBehavior() {
      const m = this.maid;
      const room = B.getRoom();
      const roll = Math.random();
      const b = bond();
      const tr = trait();
      // a word about the weather when it is worth mentioning
      const w = this.world || (this.world = G.world());
      if (!m.speech && Math.random() < 0.12 && ['rain', 'snow', 'storm', 'petal'].includes(w.weather)) {
        const say = G.contextLines(maidKey(), w);
        if (say.sky) { this.speak(say.sky, w.weather === 'storm' ? 'surprise' : 'normal'); m.idle = E.randi(120, 220); return; }
      }
      if (Math.random() < 0.34) {
        const kind = E.pick(tr.idle);
        if (kind === 'clean') { m.state = 'use'; m.prop = 'broom'; m.useT = 160; m.dir = 'down'; return; }
        this.startPose(kind);
        return;
      }
      if (roll < 0.35) {
        const { grid, g } = occupancy();
        const free = [];
        for (let r = 0; r < g.h; r++) for (let c = 0; c < g.w; c++) if (!grid[r * g.w + c] && Math.abs(c - m.c) + Math.abs(r - m.r) <= 5) free.push([c, r]);
        const pick = E.pick(free);
        if (pick && this.walkTo(pick[0], pick[1])) return;
      } else if (roll < 0.7 && room.placed.length) {
        const p = E.pick(room.placed.filter((q) => G.FURNITURE[q.id].use));
        const spot = p && this.useSpot(p);
        if (spot) {
          const done = () => {
            m.dir = spot.face;
            m.state = 'use';
            m.useT = 150;
            const flavor = { desk: ['book', 'dots'], bed: [null, b.stamina < 50 ? 'zzz' : 'note'], wardrobe: [null, 'sparkle'], teatable: ['cup', 'heart'], bookshelf: ['book', 'question'], plant: [null, 'sparkle'], plush: [null, 'heart'], piano: [null, 'note'], lamp: [null, 'sparkle'], princess: [null, 'heart'] }[p.id] || [null, 'note'];
            m.prop = flavor[0];
            this.emote(flavor[1], 120);
          };
          if (spot.c === m.c && spot.r === m.r) done();
          else this.walkTo(spot.c, spot.r, done);
          return;
        }
      } else if (roll < 0.85) {
        m.state = 'use';
        m.prop = 'broom';
        m.useT = 160;
        m.dir = 'down';
        return;
      }
      m.dir = E.pick(['down', 'left', 'right', 'up']);
      if (b.stamina < 30 && Math.random() < 0.5) this.emote('sweat', 90);
      else if (b.mood >= 80 && Math.random() < 0.4) this.emote('note', 90);
      m.idle = E.randi(90, 200);
    },
    maidScreen() {
      const g = geom();
      return { x: Math.round(g.x0 + this.maid.x), y: Math.round(g.floorY + this.maid.y) };
    },
    sparkle(x, y) { this.particles.push({ kind: 'sparkle', x, y, t: 0, life: 24, vy: -0.4 }); },
    hearts(x, y, n) {
      for (let i = 0; i < n; i++) this.particles.push({ kind: 'heart', x: x + E.rand(-6, 6), y: y + E.rand(-2, 4), vx: E.rand(-0.5, 0.5), vy: E.rand(-1.2, -0.5), t: 0, life: 40 });
    },
    toast(text, col) { this.toasts.push({ text, col: col || C.gold, t: 0 }); },

    // ---------------------------------------------------------------- raising actions
    gain(field, amount) {
      const b = bond();
      if (field === 'aff') {
        const before = B.affLevel(b.aff);
        b.aff = Math.max(0, b.aff + amount);
        if (B.affLevel(b.aff) > before) { A.sfx('levelup'); this.pendingLevelUp = true; }
      } else if (field === 'mood') {
        const rugGuard = amount < 0 && B.roomHas('rug') ? 0.5 : 1;
        b.mood = clamp(b.mood + amount * rugGuard, 0, 100);
      } else if (field === 'stamina') b.stamina = clamp(b.stamina + amount, 0, 100);
    },
    daily(key) { const b = bond(); b.daily = b.daily || {}; return b.daily[key] || 0; },
    bumpDaily(key) { const b = bond(); b.daily[key] = (b.daily[key] || 0) + 1; },
    guideDone(key) {
      const S = save();
      const step = G.guideStep(key);
      if (!step) return;
      if (step.reward) { S.coins += step.reward; this.toast(G.t('小任務完成！+{n}G', { n: step.reward })); }
      G.persist();
    },

    pat() {
      const m = this.maid;
      const L = lines();
      const n = this.daily('pat');
      this.glove.pat = 34;
      m.state = m.state === 'walk' ? 'idle' : m.state;
      m.path = [];
      m.dir = 'down';
      this.bumpDaily('pat');
      const tr = trait();
      if (n < 3) {
        this.gain('aff', 3 + (B.roomHas('plush') ? 1 : 0));
        this.gain('mood', 3);
        m.hop = tr.pat.hop;
        this.emote(tr.pat.emote, 80);
        this.speak(E.pick(L.pat), n === 0 ? 'blush' : tr.pat.face);
        this.hearts(this.maidScreen().x + 8, this.maidScreen().y - 10, 4);
        A.sfx('pat');
      } else if (n < 6) {
        this.gain('aff', 1);
        this.gain('mood', 1);
        this.emote(tr.mood, 70);
        this.speak(E.pick(L.pat), tr.pat.face);
        A.sfx('pat');
      } else {
        this.gain('mood', -3);
        this.emote(tr.cross.emote, 90);
        this.speak(E.pick(L.patMany), tr.cross.face);
        A.sfx('angry');
      }
      this.guideDone('pat');
      G.persist();
    },
    // a poke on the cheek: a surprise at first, puffed-up cheeks if it keeps happening
    poke() {
      const m = this.maid;
      const L = lines();
      const n = this.daily('poke');
      this.bumpDaily('poke');
      this.touchStart('poke', 40);
      const tr = trait();
      if (n < 2) {
        this.gain('aff', 2);
        this.gain('mood', 2);
        this.emote(tr.poke.emote, 60);
        this.speak(E.pick(L.poke), tr.poke.face);
        A.sfx('pat');
      } else if (n < 5) {
        this.gain('mood', 1);
        this.emote(tr.mood, 60);
        this.speak(E.pick(L.poke), tr.pat.face);
        A.sfx('pat');
      } else {
        this.gain('mood', -2);
        this.emote(tr.cross.emote, 80);
        this.speak(L.pokeMany, tr.cross.face);
        A.sfx('angry');
      }
      G.persist();
    },
    // a high five: the open glove comes down and she jumps up to meet it
    highFive() {
      this.touchStart('highfive', 56);
      G.persist();
    },
    // tickling her side: she squirms and laughs, and runs out of breath if it goes on too long
    tickle() {
      this.touchStart('tickle', 100);
      G.persist();
    },
    // start a glove animation on her: she stops where she is and faces the glove
    touchStart(kind, dur) {
      const m = this.maid;
      m.state = m.state === 'walk' ? 'idle' : m.state;
      m.path = [];
      m.dir = 'down';
      this.glove.pat = 0;
      this.glove.act = { kind, t: 0, dur, n: this.daily(kind) };
      if (kind !== 'poke') this.bumpDaily(kind);
    },
    // what happens during a glove animation: the clap of a high five, the giggles of a tickle
    updateTouch() {
      const a = this.glove.act;
      if (!a) return;
      a.t++;
      const m = this.maid;
      const L = lines();
      const ms = this.maidScreen();
      if (a.kind === 'highfive') {
        if (a.t === 16) {
          m.hop = trait().five.hop;
          A.sfx('kick');
          for (let i = 0; i < 8; i++) {
            const ang = (i / 8) * Math.PI * 2;
            this.particles.push({ kind: 'sparkle', x: ms.x + 15, y: ms.y - 13, vx: Math.cos(ang) * 1.3, vy: Math.sin(ang) * 1.3 - 0.4, t: 0, life: 26 });
          }
          if (a.n < 3) { this.gain('aff', 2); this.gain('mood', 4); }
          this.emote(trait().five.emote, 80);
          this.speak(E.pick(L.highFive), trait().five.face);
        }
      } else if (a.kind === 'tickle') {
        if (a.t % 14 === 0) m.hop = 2;
        if (a.t % 22 === 0) this.particles.push({ kind: 'note', x: ms.x + E.rand(-4, 14), y: ms.y - 12, vy: -0.6, t: 0, life: 36 });
        if (a.t === 10) {
          if (a.n < 3) {
            this.emote(trait().tickle.emote, 90);
            this.speak(E.pick(L.tickle), trait().tickle.face);
          } else {
            this.emote('sweat', 90);
            this.speak(L.tickleMany, 'tired');
          }
          A.sfx('pat');
        }
        if (a.t === a.dur - 1 && a.n < 3) { this.gain('aff', 2); this.gain('mood', 5); }
      }
      if (a.t >= a.dur) this.glove.act = null;
    },
    talk() {
      const k = maidKey();
      const L = lines(k);
      if (this.daily('talk') >= 3) { this.say([{ who: k, face: 'normal', text: L.talkMany }]); return; }
      this.bumpDaily('talk');
      const lv = B.affLevel(bond().aff);
      const pool = Math.random() < 0.65 ? L.talk[lv] : L.talk[E.randi(0, lv)];
      const face = lv >= 3 ? 'blush' : E.pick(['normal', 'happy']);
      // now and then she talks about the day itself: the hour, the weekday or the weather
      const say = G.contextLines(k, this.world);
      const about = [say.time, say.week, say.sky].filter(Boolean);
      const text = Math.random() < 0.3 && about.length ? E.pick(about) : E.pick(pool);
      this.say([{ who: k, face, text }], () => {
        this.gain('aff', 3);
        this.gain('mood', 2);
        this.guideDone('talk');
        G.persist();
      });
    },
    giftMenu() {
      const S = save();
      const owned = G.GIFTS.filter((g) => S.gifts[g.id] > 0);
      if (!owned.length) {
        this.say([{ who: null, text: G.t('沒有可以送的禮物……到女僕咖啡廳的「禮物專櫃」買一點吧！') }]);
        return;
      }
      this.openMenu(G.t('送什麼禮物？'), owned.map((g) => ({
        label: g.name + ' ×' + S.gifts[g.id],
        icon: E.spr.room.gifts[g.id],
        action: () => this.giveGift(g),
      })));
    },
    giveGift(g) {
      const S = save();
      const k = maidKey();
      const L = lines(k);
      if (this.daily('gift') >= 2) { this.say([{ who: k, face: 'normal', text: L.giftMany }]); return; }
      S.gifts[g.id]--;
      this.bumpDaily('gift');
      const fav = g.fav === k;
      const amount = fav ? 20 : g.aff;
      this.emote(fav || g.fav === 'all' ? 'heart' : 'sparkle', 120);
      this.hearts(this.maidScreen().x + 8, this.maidScreen().y - 8, fav ? 10 : 5);
      A.sfx('gift');
      this.say([{ who: k, face: fav ? 'surprise' : 'happy', text: fav ? L.giftLike : L.giftNormal }], () => {
        this.gain('aff', amount);
        this.gain('mood', 10);
        this.toast(G.t('好感度 +{n}', { n: amount }), C.pink);
        G.persist();
      });
    },
    trainMenu() {
      const b = bond();
      this.openMenu(G.t('要進行哪種特訓？（體力 {n}）', { n: Math.round(b.stamina) }), G.TRAININGS.map((tr) => {
        const lv = B.trainLevel(b.exp[tr.id]);
        return {
          label: tr.name + '  Lv' + lv,
          note: G.t('體力-{n}', { n: tr.stamina }),
          icon: E.spr.ui[tr.icon],
          disabled: b.stamina < tr.stamina,
          action: () => this.startTraining(tr),
        };
      }));
    },
    startTraining(tr) {
      const b = bond();
      const k = maidKey();
      if (b.stamina < tr.stamina) { this.say([{ who: k, face: 'tired', text: lines(k).tired }]); return; }
      const m = this.maid;
      m.path = [];
      m.state = 'hold';
      m.dir = 'down';
      this.speak(lines(k).train, 'happy');
      this.anim = { kind: 'train', tr, t: 0, dur: 150 };
      this.mode = 'anim';
      A.sfx('train');
    },
    finishTraining(tr) {
      const b = bond();
      const k = maidKey();
      const moodMul = b.mood >= 80 ? 1.5 : b.mood <= 30 ? 0.5 : 1;
      const shelf = B.roomHas('bookshelf') ? 1.2 : 1;
      const gainExp = Math.round(tr.exp * moodMul * shelf);
      const before = B.trainLevel(b.exp[tr.id]);
      const statsBefore = B.maidStats(k);
      b.exp[tr.id] += gainExp;
      this.gain('stamina', -tr.stamina);
      this.gain('mood', tr.mood);
      this.gain('aff', 1);
      const after = B.trainLevel(b.exp[tr.id]);
      const statsAfter = B.maidStats(k);
      const ups = [];
      for (const [key, label] of [['hearts', G.t('愛心上限')], ['speed', G.t('速度')], ['fire', G.t('火力')], ['bombs', G.t('炸彈')]]) {
        if (statsAfter[key] > statsBefore[key]) ups.push(label + ' +' + (statsAfter[key] - statsBefore[key]));
      }
      this.maid.state = 'idle';
      this.maid.prop = null;
      this.panel = { kind: 'train', tr, gainExp, before, after, ups, moodMul, t: 0 };
      this.mode = 'panel';
      if (after > before) A.sfx('levelup'); else A.sfx('item');
      this.guideDone('train');
      G.persist();
    },
    teaTime() {
      const k = maidKey();
      const S = save();
      if (this.daily('tea') >= 1) { this.say([{ who: k, face: 'normal', text: G.t('今天已經喝過下午茶了，明天再一起喝吧！') }]); return; }
      if (S.coins < 30) { this.say([{ who: null, text: G.t('茶葉要 30G……金幣不夠。') }]); return; }
      S.coins -= 30;
      this.bumpDaily('tea');
      const p = B.getRoom().placed.find((q) => q.id === 'teatable');
      const spot = p && this.useSpot(p);
      const begin = () => {
        if (spot) this.maid.dir = spot.face;
        this.maid.state = 'hold';
        this.maid.prop = 'cup';
        this.anim = { kind: 'tea', t: 0, dur: 110 };
        this.mode = 'anim';
      };
      if (spot && !(spot.c === this.maid.c && spot.r === this.maid.r) && this.walkTo(spot.c, spot.r, begin)) this.mode = 'wait';
      else begin();
    },
    playPiano() {
      if (this.daily('piano') >= 1) { this.speak(G.t('今天已經彈過囉～'), 'happy'); return; }
      this.bumpDaily('piano');
      const p = B.getRoom().placed.find((q) => q.id === 'piano');
      const spot = this.useSpot(p);
      const begin = () => {
        if (spot) this.maid.dir = spot.face;
        this.maid.state = 'hold';
        this.anim = { kind: 'piano', t: 0, dur: 160 };
        this.mode = 'anim';
      };
      if (spot && !(spot.c === this.maid.c && spot.r === this.maid.r) && this.walkTo(spot.c, spot.r, begin)) this.mode = 'wait';
      else begin();
    },
    sleepConfirm() {
      this.openMenu(G.t('要休息到明天嗎？'), [
        { label: G.t('休息（進入第 {n} 天）', { n: save().day + 1 }), action: () => this.startSleep() },
        { label: G.t('還不要'), action: () => {} },
      ]);
    },
    startSleep() {
      const k = maidKey();
      this.speak(lines(k).sleep, 'sleep');
      this.maid.path = [];
      this.anim = { kind: 'sleep', t: 0, dur: 230 };
      this.mode = 'anim';
      A.playMusic('lullaby');
    },
    wakeUp() {
      const S = save();
      const k = maidKey();
      S.day++;
      const princess = B.roomHas('princess');
      for (const key of Object.keys(S.hired)) {
        const b = B.getBond(key);
        b.stamina = 100;
        b.daily = {};
        b.mood = clamp(b.mood + 8 + (princess ? 15 : 0) + (B.roomHas('plant') ? 5 : 0), 0, 100);
      }
      let event = null;
      if (Math.random() < 0.4) {
        event = E.pick(G.MORNING_EVENTS);
        if (event.gift) {
          const g = G.GIFTS.find((x) => x.fav === k) || G.GIFTS[0];
          S.gifts[g.id] = (S.gifts[g.id] || 0) + 1;
          event = Object.assign({}, event, { extra: G.t('獲得「{name}」', { name: g.name }) });
        }
        if (event.coins) S.coins += event.coins;
        if (event.mood) this.gain('mood', event.mood);
        if (event.aff) this.gain('aff', event.aff);
      }
      G.persist();
      this.maid.state = 'idle';
      this.maid.face = null;
      this.panel = { kind: 'morning', day: S.day, event, t: 0 };
      this.mode = 'panel';
      A.playMusic('room');
    },
    outMenu() {
      this.openMenu(G.t('要去哪裡？'), [
        { label: G.t('委託看板'), note: G.t('體力-{n}', { n: G.JOB_STAMINA }), action: () => this.goJobs() },
        { label: G.t('女僕咖啡廳'), action: () => { A.sfx('door'); E.go(SC.cafe); } },
        { label: G.t('取消'), action: () => {} },
      ]);
    },
    goJobs() {
      const k = maidKey();
      if (bond(k).stamina < G.JOB_STAMINA) {
        this.say([{ who: k, face: 'tired', text: lines(k).tired }, { who: null, text: G.t('體力不夠出任務了。先讓她休息到明天吧。') }]);
        return;
      }
      this.guideDone('out');
      A.sfx('door');
      this.speak(lines(k).jobGo, 'happy');
      E.go(SC.map);
    },
    systemMenu() {
      const S = save();
      this.openMenu(G.t('系統'), [
        { label: G.t('音效：{v}', { v: G.t(S.sound ? '開' : '關') }), keep: true, action: () => { S.sound = !S.sound; A.setSound(S.sound); G.persist(); this.systemMenu(); } },
        { label: G.t('音樂：{v}', { v: G.t(S.music ? '開' : '關') }), keep: true, action: () => { S.music = !S.music; A.setMusic(S.music); G.persist(); this.systemMenu(); } },
        { label: 'Language: ' + G.LANG_NAMES[G.LANG], keep: true, action: () => { G.cycleLang(1); this.systemMenu(); } },
        { label: G.t('卡片圖鑑'), action: () => E.go(SC.album, { back: SC.room }) },
        { label: G.t('回到標題'), action: () => E.go(SC.title) },
        { label: G.t('關閉'), action: () => {} },
      ]);
    },
    wardrobeMenu() {
      this.openMenu(G.t('衣櫃'), [
        { label: G.t('換衣服'), action: () => this.outfitMenu() },
        { label: G.t('女僕換班'), action: () => E.go(SC.select, { mode: 'switch', back: 'room' }) },
        { label: G.t('取消'), action: () => {} },
      ]);
    },
    outfitMenu() {
      const S = save();
      const cur = G.outfitOf(maidKey());
      this.openMenu(G.t('要讓{name}穿哪件？', { name: name() }), G.OUTFITS.map((o) => ({
        label: o.name,
        note: cur === o.id ? G.t('穿著中') : S.closet[o.id] ? '' : o.price + 'G',
        action: () => this.pickOutfit(o),
      })).concat([{ label: G.t('取消'), action: () => {} }]));
    },
    pickOutfit(o) {
      const S = save();
      if (!S.closet[o.id]) {
        this.openMenu(G.t('要買{name}嗎？', { name: o.name }), [
          { label: G.t('購買（{price}G）', { price: o.price }), action: () => {
            if (S.coins < o.price) { this.toast(G.t('金幣不夠……還差 {n}G', { n: o.price - S.coins }), C.pink); A.sfx('denied'); return; }
            S.coins -= o.price;
            S.closet[o.id] = true;
            A.sfx('buy');
            this.wearOutfit(o);
          } },
          { label: G.t('取消'), action: () => {} },
        ]);
        return;
      }
      if (G.outfitOf(maidKey()) === o.id) { this.speak(G.t('現在就穿著這件喔！'), 'happy'); return; }
      this.wearOutfit(o);
    },
    wearOutfit(o) {
      const S = save();
      S.outfits[maidKey()] = o.id;
      A.sfx('gift');
      this.emote('sparkle', 100);
      this.hearts(this.maidScreen().x + 8, this.maidScreen().y - 6, 4);
      // the first change of the day cheers her up
      if (!this.daily('outfit')) { this.bumpDaily('outfit'); this.gain('mood', 5); }
      this.speak(G.t('換好了！主人，好看嗎？'), 'blush');
      G.persist();
    },
    maidMenu() {
      const items = [
        { label: G.t('聊天'), action: () => this.talk() },
        { label: G.t('擊掌'), action: () => this.highFive() },
        { label: G.t('搔癢'), action: () => this.tickle() },
        { label: G.t('送禮物'), action: () => this.giftMenu() },
        { label: G.t('特訓'), action: () => this.trainMenu() },
      ];
      if (B.roomHas('teatable')) items.push({ label: G.t('一起喝茶（30G）'), action: () => this.teaTime() });
      items.push({ label: G.t('查看成長日記'), action: () => this.openDiary() });
      items.push({ label: G.t('取消'), action: () => {} });
      this.openMenu(G.t('{name}　好感 Lv{lv}', { name: name(), lv: affInfo().lv + 1 }), items);
    },
    furnitureAction(p) {
      const F = G.FURNITURE[p.id];
      const k = maidKey();
      switch (F.use) {
        case 'sleep': return this.sleepConfirm();
        case 'train': return this.trainMenu();
        case 'wardrobe': return this.wardrobeMenu();
        case 'tea': return this.teaTime();
        case 'diary': return this.openDiary();
        case 'piano': return this.playPiano();
        case 'water':
          if (this.daily('water') >= 1) { this.speak(G.t('今天已經澆過水了！'), 'normal'); return; }
          this.bumpDaily('water');
          this.gain('mood', 4);
          this.emote('sparkle', 90);
          A.sfx('water');
          this.speak(G.t('盆栽今天也要長高高喔♪'), 'happy');
          G.persist();
          return;
        case 'hug':
          if (this.daily('hug') >= 1) { this.speak(G.t('兔兔抱枕軟綿綿的～'), 'happy'); return; }
          this.bumpDaily('hug');
          this.gain('mood', 5);
          this.emote('heart', 90);
          this.hearts(this.maidScreen().x + 8, this.maidScreen().y - 6, 3);
          A.sfx('pat');
          this.speak(G.t('借我抱一下兔兔嘛～'), 'blush');
          G.persist();
          return;
        case 'lamp':
          this.emote('sparkle', 60);
          this.speak(G.t('燈光好溫暖呢。'), 'normal');
          return;
        case 'fish':
          if (this.daily('fish') >= 1) { this.speak(G.t('金魚已經吃飽囉～'), 'happy'); return; }
          this.bumpDaily('fish');
          this.gain('mood', 4);
          this.emote('note', 90);
          A.sfx('water');
          this.speak(G.t('小金魚，開飯囉～'), 'happy');
          G.persist();
          return;
        case 'dresser':
          if (this.daily('dress') >= 1) { this.speak(G.t('今天已經打扮好了！'), 'happy'); return; }
          this.bumpDaily('dress');
          this.gain('mood', 6);
          this.emote('sparkle', 90);
          A.sfx('gift');
          this.speak(G.t('緞帶綁好了……主人，好看嗎？'), 'blush');
          G.persist();
          return;
        case 'sofa':
          if (this.daily('sofa') >= 1) { this.speak(G.t('沙發好舒服……不過今天已經休息夠了。'), 'normal'); return; }
          this.bumpDaily('sofa');
          this.gain('stamina', 15);
          this.emote('zzz', 90);
          A.sfx('pat');
          this.speak(G.t('呼～坐一下，體力恢復了！'), 'happy');
          this.toast(G.t('體力 +{n}', { n: 15 }), C.mint);
          G.persist();
          return;
        case 'music':
          A.playMusic('lullaby');
          this.emote('note', 120);
          if (this.daily('music') >= 1) { this.speak(G.t('再聽一次這張唱片吧♪'), 'happy'); return; }
          this.bumpDaily('music');
          this.gain('mood', 5);
          this.speak(G.t('放一張唱片吧♪'), 'happy');
          G.persist();
          return;
      }
      this.speak(F.name, 'normal');
      void k;
    },

    // ---------------------------------------------------------------- dialog / menu / panels
    say(queue, onDone) {
      this.dialog = { queue, i: 0, chars: 0, onDone: onDone || null };
      this.mode = 'dialog';
      const first = queue[0];
      if (first && first.who) this.setFace(first.face || 'normal', 9999);
      if (first && first.levelUp) this.hearts(this.maidScreen().x + 8, this.maidScreen().y - 8, 8);
    },
    updateDialog() {
      const d = this.dialog;
      const cur = d.queue[d.i];
      if (d.chars < cur.text.length) {
        d.chars = Math.min(cur.text.length, d.chars + 0.6);
        if (this.t % 4 === 0) A.sfx('blip');
      }
      if (E.menuPressed('a') || E.menuPressed('b') || E.pointer.pressed) {
        if (d.chars < cur.text.length) d.chars = cur.text.length;
        else if (d.i < d.queue.length - 1) {
          d.i++;
          d.chars = 0;
          const nx = d.queue[d.i];
          if (nx.who) this.setFace(nx.face || 'normal', 9999);
          if (nx.levelUp) this.hearts(this.maidScreen().x + 8, this.maidScreen().y - 8, 8);
          A.sfx('select');
        } else {
          this.dialog = null;
          this.mode = 'free';
          this.maid.face = null;
          this.maid.faceT = 0;
          if (d.onDone) d.onDone();
        }
      }
    },
    openMenu(title, items, anchor) {
      const W = Math.max(E.textWidth(title) + 16, ...items.map((it) => E.textWidth(it.label) + (it.icon ? 22 : 12) + (it.note ? E.textWidth(it.note) + 10 : 0))) + 12;
      const H = 22 + items.length * 16;
      const ax = anchor ? anchor.x : this.glove.x + 10;
      const ay = anchor ? anchor.y : this.glove.y - H / 2;
      this.menu = { title, items, sel: Math.max(0, items.findIndex((it) => !it.disabled)), x: clamp(Math.round(ax), 4, E.W - W - 4), y: clamp(Math.round(ay), 60, E.H - H - 18), w: W, h: H };
      this.mode = 'menu';
    },
    updateMenu() {
      const mn = this.menu;
      const d = E.menuDir();
      const n = mn.items.length;
      if (d === 'up') { mn.sel = (mn.sel + n - 1) % n; A.sfx('select'); }
      if (d === 'down') { mn.sel = (mn.sel + 1) % n; A.sfx('select'); }
      const P = E.pointer;
      let clicked = false;
      if (P.inside && P.x >= mn.x && P.x < mn.x + mn.w && P.y >= mn.y + 20 && P.y < mn.y + 20 + n * 16) {
        const row = Math.floor((P.y - mn.y - 20) / 16);
        if (P.moved && row !== mn.sel) mn.sel = row;
        if (P.pressed) clicked = true;
      } else if (P.pressed) {
        this.menu = null; this.mode = this.decor ? 'decor' : 'free'; A.sfx('cancel'); return;
      }
      if (E.menuPressed('b') || E.menuPressed('start')) { this.menu = null; this.mode = this.decor ? 'decor' : 'free'; A.sfx('cancel'); return; }
      if (E.menuPressed('a') || clicked) {
        const it = mn.items[mn.sel];
        if (it.disabled) { A.sfx('denied'); this.menu = null; this.say([{ who: maidKey(), face: 'tired', text: lines().tired }]); return; }
        A.sfx('confirm');
        this.menu = null;
        this.mode = this.decor ? 'decor' : 'free';
        it.action();
      }
    },
    openDiary(k) {
      const hired = G.MAID_ORDER.filter((x) => save().hired[x]);
      this.panel = { kind: 'diary', list: hired, i: Math.max(0, hired.indexOf(k || maidKey())), t: 0, page: 0 };
      this.mode = 'panel';
      A.sfx('confirm');
    },
    updatePanel() {
      const p = this.panel;
      p.t++;
      if (p.kind === 'diary') {
        const d = E.menuDir();
        if (d === 'left') { p.i = (p.i + p.list.length - 1) % p.list.length; A.sfx('select'); }
        if (d === 'right') { p.i = (p.i + 1) % p.list.length; A.sfx('select'); }
        // up/down turns between her growth page and her skills page
        if (d === 'up' || d === 'down') { p.page = 1 - (p.page || 0); p.demoT = 0; A.sfx('select'); }
      }
      if (p.t > 20 && (E.menuPressed('a') || E.menuPressed('b') || E.menuPressed('start') || E.pointer.pressed)) {
        this.panel = null;
        this.mode = 'free';
        A.sfx('cancel');
        const k = maidKey();
        if (p.kind === 'train') this.say([{ who: k, face: p.after > p.before ? 'happy' : 'normal', text: lines(k).trainDone }]);
        if (p.kind === 'morning') this.say([{ who: k, face: 'happy', text: E.pick(lines(k).greet) }]);
      }
    },

    // ---------------------------------------------------------------- decorating
    enterDecor() {
      decorLayout = true;
      this.maid.speech = null; // a speech bubble would cover the room while placing furniture
      this.decor = { phase: 'tray', sel: 0, item: null, from: null, c: 0, r: 0 };
      this.mode = 'decor';
      A.sfx('confirm');
    },
    trayItems() {
      const room = B.getRoom();
      const items = [{ kind: 'move', label: G.t('移動家具'), desc: G.t('選擇房間裡的家具，搬到別的位置。') }];
      for (const id of Object.keys(G.FURNITURE)) {
        const n = storageCount(id);
        if (n > 0) items.push({ kind: 'item', id, label: G.FURNITURE[id].name + ' ×' + n, desc: G.t('從倉庫擺進房間。') + G.FURNITURE[id].desc });
      }
      for (const id of G.FURNITURE_SHOP) {
        const F = G.FURNITURE[id];
        if (F.unique && (room.owned[id] || 0) > 0) continue;
        items.push({ kind: 'shop', id, price: F.price, label: G.t('{name}（{price}G）', { name: F.name, price: F.price }), desc: F.desc + G.t('　Z 購買') });
      }
      items.push({ kind: 'wall', label: G.t('壁紙'), desc: G.t('更換房間的壁紙。') });
      items.push({ kind: 'floor', label: G.t('地板'), desc: G.t('更換房間的地板。') });
      const next = G.ROOM_SIZES[room.size + 1];
      items.push({ kind: 'expand', label: G.t(next ? '擴建' : '已最大'), desc: next ? G.t('擴建成{name}（{w}×{h}）：{price}G', { name: next.name, w: next.w, h: next.h, price: next.price }) : G.t('房間已經是最大了。') });
      items.push({ kind: 'done', label: G.t('完成'), desc: G.t('結束佈置。') });
      return items;
    },
    updateDecor() {
      const dc = this.decor;
      const g = geom();
      const P = E.pointer;
      if (dc.phase === 'tray') {
        const items = this.trayItems();
        dc.sel = clamp(dc.sel, 0, items.length - 1);
        const d = E.menuDir();
        if (d === 'left') { dc.sel = (dc.sel + items.length - 1) % items.length; A.sfx('select'); }
        if (d === 'right') { dc.sel = (dc.sel + 1) % items.length; A.sfx('select'); }
        let clicked = false;
        if (P.inside && P.y >= 200 && P.y < 232) {
          const slot = Math.floor((P.x - 8) / 34) + (dc.scroll || 0);
          if (slot >= 0 && slot < items.length) { if (P.moved) dc.sel = slot; if (P.pressed) clicked = true; }
        }
        if (E.menuPressed('b') || E.menuPressed('start')) { this.decor = null; decorLayout = false; this.mode = 'free'; A.sfx('cancel'); G.persist(); return; }
        if (E.menuPressed('a') || clicked) this.trayActivate(items[dc.sel]);
        return;
      }
      // tile cursor phases: 'place' and 'move'
      const d = E.menuDir();
      if (d) { dc.c += DIRV[d][0]; dc.r += DIRV[d][1]; A.sfx('select'); }
      if (P.inside && P.moved && P.y < 198) {
        const c = Math.floor((P.x - g.x0) / T), r = Math.floor((P.y - g.floorY) / T);
        if (c >= 0 && r >= 0 && c < g.w && r < g.h) {
          if (dc.phase === 'place') {
            const F = G.FURNITURE[dc.item];
            dc.c = c - Math.floor((F.w - 1) / 2);
            dc.r = r - (F.h - 1);
          } else { dc.c = c; dc.r = r; }
        }
      }
      if (dc.phase === 'place') {
        const F = G.FURNITURE[dc.item];
        dc.c = clamp(dc.c, 0, g.w - F.w);
        dc.r = clamp(dc.r, 0, g.h - F.h);
      } else {
        dc.c = clamp(dc.c, 0, g.w - 1);
        dc.r = clamp(dc.r, 0, g.h - 1);
      }
      const confirm = E.menuPressed('a') || (P.pressed && P.y < 198);
      if (E.menuPressed('b') || E.menuPressed('start') || (P.pressed && P.y >= 198)) {
        if (dc.phase === 'place' && dc.from) B.getRoom().placed.push(dc.from);
        dc.phase = 'tray';
        dc.item = null;
        dc.from = null;
        A.sfx('cancel');
        return;
      }
      if (!confirm) return;
      if (dc.phase === 'move') {
        const { grid, floor } = occupancy();
        const p = grid[dc.r * g.w + dc.c] || floor[dc.r * g.w + dc.c];
        if (!p) { A.sfx('denied'); return; }
        const room = B.getRoom();
        room.placed.splice(room.placed.indexOf(p), 1);
        dc.from = p;
        dc.item = p.id;
        dc.c = p.c; dc.r = p.r;
        dc.phase = 'place';
        A.sfx('select');
        return;
      }
      if (canPlace(dc.item, dc.c, dc.r)) {
        const room = B.getRoom();
        room.placed.push({ id: dc.item, c: dc.c, r: dc.r });
        A.sfx('place');
        dc.phase = 'tray';
        dc.item = null;
        dc.from = null;
        this.fixMaidPosition();
        G.persist();
      } else A.sfx('denied');
    },
    trayActivate(it) {
      const dc = this.decor;
      const S = save();
      const room = B.getRoom();
      const g = geom();
      switch (it.kind) {
        case 'move': dc.phase = 'move'; dc.c = Math.floor(g.w / 2); dc.r = Math.floor(g.h / 2); A.sfx('confirm'); return;
        case 'item': dc.phase = 'place'; dc.item = it.id; dc.from = null; dc.c = 0; dc.r = 0; A.sfx('confirm'); return;
        case 'shop': {
          const F = G.FURNITURE[it.id];
          this.openMenu(G.t('要買{name}嗎？', { name: F.name }), [
            { label: G.t('購買（{price}G）', { price: F.price }), action: () => {
              if (S.coins < F.price) { this.toast(G.t('金幣不夠……還差 {n}G', { n: F.price - S.coins }), C.pink); A.sfx('denied'); return; }
              S.coins -= F.price;
              room.owned[it.id] = (room.owned[it.id] || 0) + 1;
              A.sfx('buy');
              this.toast(G.t('買了{name}！選個位置擺放吧', { name: F.name }), C.mint);
              this.guideDone('shop');
              G.persist();
              // straight into placing it, starting from the first free spot
              dc.phase = 'place'; dc.item = it.id; dc.from = null; dc.c = 0; dc.r = 0;
              let found = false;
              for (let r = 0; r < g.h && !found; r++) for (let c = 0; c < g.w && !found; c++) if (canPlace(it.id, c, r)) { dc.c = c; dc.r = r; found = true; }
            } },
            { label: G.t('取消'), action: () => {} },
          ], { x: 80, y: 100 });
          return;
        }
        case 'done': this.decor = null; decorLayout = false; this.mode = 'free'; A.sfx('confirm'); G.persist(); return;
        case 'expand': {
          const next = G.ROOM_SIZES[room.size + 1];
          if (!next) { A.sfx('denied'); return; }
          this.openMenu(G.t('擴建成{name}？', { name: next.name }), [
            { label: G.t('擴建（{price}G）', { price: next.price }), action: () => {
              if (S.coins < next.price) { this.toast(G.t('金幣不夠……'), C.pink); A.sfx('denied'); }
              else { S.coins -= next.price; room.size++; A.sfx('levelup'); this.toast(G.t('房間變大了！'), C.mint); this.spawnMaid(); G.persist(); }
              this.mode = 'decor';
            } },
            { label: G.t('取消'), action: () => { this.mode = 'decor'; } },
          ], { x: 90, y: 110 });
          return;
        }
        case 'wall':
        case 'floor': {
          const list = it.kind === 'wall' ? G.WALLPAPERS : G.FLOORS;
          const owned = it.kind === 'wall' ? room.walls : room.floors;
          const current = it.kind === 'wall' ? room.wall : room.floor;
          this.openMenu(it.label, list.map((opt) => ({
            label: opt.name + (current === opt.id ? G.t('（使用中）') : owned[opt.id] ? '' : '　' + opt.price + 'G'),
            action: () => {
              if (!owned[opt.id]) {
                if (S.coins < opt.price) { this.toast(G.t('金幣不夠……'), C.pink); A.sfx('denied'); this.mode = 'decor'; return; }
                S.coins -= opt.price;
                owned[opt.id] = true;
                A.sfx('buy');
              } else A.sfx('place');
              if (it.kind === 'wall') room.wall = opt.id; else room.floor = opt.id;
              G.persist();
              this.mode = 'decor';
            },
          })).concat([{ label: G.t('取消'), action: () => { this.mode = 'decor'; } }]), { x: 90, y: 90 });
          return;
        }
      }
    },
    fixMaidPosition() {
      const { grid, g } = occupancy();
      const m = this.maid;
      if (!grid[m.r * g.w + m.c]) return;
      let best = null, bd = 1e9;
      for (let r = 0; r < g.h; r++)
        for (let c = 0; c < g.w; c++) {
          if (grid[r * g.w + c]) continue;
          const dd = Math.abs(c - m.c) + Math.abs(r - m.r);
          if (dd < bd) { bd = dd; best = [c, r]; }
        }
      if (best) { m.c = best[0]; m.r = best[1]; m.x = m.c * T; m.y = m.r * T; m.path = []; m.state = 'idle'; }
    },

    // ---------------------------------------------------------------- hit testing & free mode
    hitTest(x, y) {
      for (let i = 0; i < TABS.length; i++) {
        const r = tabRect(i);
        if (x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) return { kind: 'tab', i };
      }
      const g = geom();
      const ms = this.maidScreen();
      const mhop = Math.round(this.maid.hop);
      // her hair is for patting, her face for a poke on the cheek, the rest opens her menu
      if (this.maid.state !== 'sleep' && x >= ms.x + 1 && x < ms.x + 15 && y >= ms.y - 8 - mhop && y < ms.y + 16) {
        return { kind: 'maid', head: y < ms.y + 1 - mhop, face: y >= ms.y + 1 - mhop && y < ms.y + 6 - mhop };
      }
      const room = B.getRoom();
      const objs = room.placed.slice().sort((a, b) => {
        const fa = G.FURNITURE[a.id], fb = G.FURNITURE[b.id];
        if ((fa.layer === 'floor') !== (fb.layer === 'floor')) return fa.layer === 'floor' ? 1 : -1;
        return (b.r + fb.h) - (a.r + fa.h);
      });
      for (const p of objs) {
        const F = G.FURNITURE[p.id];
        const fx = g.x0 + p.c * T, fy = g.floorY + p.r * T;
        if (x >= fx && x < fx + F.w * T && y >= fy - F.over && y < fy + F.h * T) return { kind: 'furniture', p };
      }
      if (x >= g.doorX && x < g.doorX + 24 && y >= g.doorY - 2 && y < g.doorY + 14) return { kind: 'door' };
      if (x >= g.x0 && x < g.x0 + g.w * T && y >= g.floorY && y < g.floorY + g.h * T) return { kind: 'floor', c: Math.floor((x - g.x0) / T), r: Math.floor((y - g.floorY) / T) };
      if (x >= g.x0 && x < g.x0 + g.w * T && y >= g.wallY && y < g.floorY) return { kind: 'wall' };
      return null;
    },
    hoverLabel(h) {
      if (!h) return null;
      switch (h.kind) {
        case 'tab': return G.t(TABS[h.i].label);
        case 'maid': return h.head ? G.t('摸摸頭') : h.face ? G.t('戳戳臉頰') : G.t('和{name}互動', { name: name() });
        case 'furniture': {
          const F = G.FURNITURE[h.p.id];
          const verb = { sleep: '休息', train: '特訓', wardrobe: '換班', tea: '喝茶', diary: '日記', piano: '彈琴', water: '澆水', hug: '抱抱', lamp: '看看' }[F.use];
          return F.name + (verb ? '：' + G.t(verb) : '');
        }
        case 'door': return G.t('出門');
        case 'floor': return G.t('叫她過來');
        case 'wall': return G.t('窗外天氣真好');
      }
      return null;
    },
    activate(h) {
      if (!h) return;
      switch (h.kind) {
        case 'tab': return this.activateTab(h.i);
        case 'maid': return h.head ? this.pat() : h.face ? this.poke() : this.maidMenu();
        case 'furniture': return this.furnitureAction(h.p);
        case 'door': return this.outMenu();
        case 'floor':
          if (this.maid.state === 'idle' || this.maid.state === 'walk' || this.maid.state === 'use') {
            this.maid.state = 'idle';
            this.maid.prop = null;
            if (this.walkTo(h.c, h.r)) { this.emote('exclaim', 40); A.sfx('select'); }
          }
          return;
        case 'wall': this.speak(G.t('今天天氣很好呢～'), 'happy'); return;
      }
    },
    activateTab(i) {
      A.sfx('confirm');
      switch (TABS[i].id) {
        case 'diary': return this.openDiary();
        case 'sleep': return this.sleepConfirm();
        case 'out': return this.outMenu();
        case 'wardrobe': return this.wardrobeMenu();
        case 'system': return this.systemMenu();
        case 'decor': return this.enterDecor();
      }
    },
    updateFree() {
      const gl = this.glove;
      const P = E.pointer;
      let dx = 0, dy = 0;
      if (E.menuHeld('left')) dx -= 1;
      if (E.menuHeld('right')) dx += 1;
      if (E.menuHeld('up')) dy -= 1;
      if (E.menuHeld('down')) dy += 1;
      if (dx || dy) {
        gl.speed = Math.min(3.2, (gl.speed || 1.4) + 0.08);
        gl.x = clamp(gl.x + dx * gl.speed, 2, E.W - 2);
        gl.y = clamp(gl.y + dy * gl.speed, 2, E.H - 18);
        gl.usingPointer = false;
      } else gl.speed = 1.4;
      if (P.moved && P.inside) { gl.x = P.x; gl.y = P.y; gl.usingPointer = true; }
      this.hover = this.hitTest(gl.x, gl.y);
      if (this.mode === 'tabs') {
        const d = E.menuDir();
        if (d === 'left') { this.tab = (this.tab + TABS.length - 1) % TABS.length; A.sfx('select'); }
        if (d === 'right') { this.tab = (this.tab + 1) % TABS.length; A.sfx('select'); }
        if (E.menuPressed('a')) { this.mode = 'free'; this.activateTab(this.tab); }
        if (E.menuPressed('b')) { this.mode = 'free'; A.sfx('cancel'); }
        if (P.pressed) { this.mode = 'free'; this.activate(this.hover); }
        return;
      }
      // holding the button (or a finger) on her hair keeps stroking it: hearts now and then, a little mood
      const onHair = this.hover && this.hover.kind === 'maid' && this.hover.head;
      if (onHair && gl.pat > 0 && (P.down || E.menuHeld('a'))) {
        if (gl.pat < 14) gl.pat = 26;
        gl.stroke = (gl.stroke || 0) + 1;
        if (gl.stroke % 48 === 0) {
          const ms = this.maidScreen();
          this.hearts(ms.x + 8, ms.y - 12, 2);
          this.setFace('happy', 60);
          if (this.daily('stroke') < 6) { this.bumpDaily('stroke'); this.gain('mood', 1); }
        }
      } else if (gl.pat <= 0) gl.stroke = 0;
      if (E.menuPressed('a') || P.pressed) this.activate(this.hover);
      else if (E.menuPressed('b')) { this.mode = 'tabs'; A.sfx('select'); }
      else if (E.menuPressed('start')) this.systemMenu();
    },

    // ---------------------------------------------------------------- main update
    update() {
      this.t++;
      // follow the real clock; the maids also keep resting while the room is open
      if (this.t % 60 === 0) {
        this.world = G.world();
        if (this.t % 1800 === 0 && G.restTick() >= 1) G.persist();
      }
      if (this.glove.pat > 0) this.glove.pat--;
      this.updateTouch();
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.t++;
        p.x += p.vx || 0;
        p.y += p.vy || 0;
        if (p.t >= p.life) this.particles.splice(i, 1);
      }
      for (let i = this.toasts.length - 1; i >= 0; i--) if (++this.toasts[i].t > 110) this.toasts.splice(i, 1);
      this.updateMaid();
      if (this.pendingLevelUp && this.mode === 'free' && !this.anim) {
        this.pendingLevelUp = false;
        this.say([{ who: maidKey(), face: 'blush', text: lines().levelUp, levelUp: true }]);
        return;
      }
      switch (this.mode) {
        case 'free':
        case 'tabs': return this.updateFree();
        case 'menu': return this.updateMenu();
        case 'dialog': return this.updateDialog();
        case 'panel': return this.updatePanel();
        case 'decor': return this.updateDecor();
        case 'wait':
          if (this.maid.state !== 'walk') { if (this.mode === 'wait') this.mode = 'free'; }
          return;
        case 'anim': return this.updateAnim();
      }
    },
    updateAnim() {
      const an = this.anim;
      an.t++;
      const m = this.maid;
      const ms = this.maidScreen();
      if (an.kind === 'train') {
        const kind = an.tr.anim;
        if (kind === 'jump') { if (an.t % 20 === 0) m.hop = 7; if (an.t % 30 === 0) this.emote('sweat', 25); }
        if (kind === 'run') { m.dir = (an.t >> 5) % 2 ? 'left' : 'right'; m.walkT += 2; }
        if (kind === 'study') { m.prop = 'book'; if (an.t % 40 === 0) this.emote(E.pick(['dots', 'question', 'exclaim']), 35); }
        if (kind === 'sweep') { m.prop = 'broom'; if (an.t % 10 === 0) this.sparkle(ms.x + E.randi(-6, 20), ms.y + E.randi(4, 16)); }
        if (an.t % 24 === 0) A.sfx(kind === 'study' ? 'tick' : 'train');
        if (an.t >= an.dur) { this.anim = null; this.finishTraining(an.tr); }
        return;
      }
      if (an.kind === 'tea') {
        if (an.t % 18 === 0) this.particles.push({ kind: 'steam', x: ms.x + 12, y: ms.y + 2, vx: 0, vy: -0.4, t: 0, life: 30 });
        if (an.t === 40) { this.emote('heart', 60); this.hearts(ms.x + 8, ms.y - 8, 3); }
        if (an.t >= an.dur) {
          this.anim = null;
          this.maid.state = 'idle';
          this.maid.prop = null;
          const k = maidKey();
          this.say([{ who: k, face: 'happy', text: lines(k).tea }], () => { this.gain('mood', 20); this.gain('stamina', 10); this.gain('aff', 5); this.toast(G.t('心情 +20　體力 +10'), C.mint); G.persist(); });
        }
        return;
      }
      if (an.kind === 'piano') {
        const melody = [784, 659, 698, 784, 880, 784, 659, 523];
        if (an.t % 20 === 0) {
          const f = melody[(an.t / 20) % melody.length];
          if (A.ctx && A.sound) { A.sfx('tick'); }
          this.emote('note', 18);
          this.particles.push({ kind: 'note', x: ms.x + E.randi(0, 16), y: ms.y - 12, vx: E.rand(-0.3, 0.3), vy: -0.6, t: 0, life: 40, f });
        }
        if (an.t >= an.dur) {
          this.anim = null;
          this.maid.state = 'idle';
          const k = maidKey();
          this.say([{ who: k, face: 'happy', text: lines(k).piano }], () => { this.gain('mood', 10); this.gain('aff', 2); G.persist(); });
        }
        return;
      }
      if (an.kind === 'sleep') {
        if (an.t === 60) {
          const bed = B.getRoom().placed.find((q) => q.id === 'princess') || B.getRoom().placed.find((q) => q.id === 'bed');
          if (bed) { m.state = 'sleep'; m.bed = bed; } else m.state = 'hold';
          m.emote = 'zzz';
          m.emoteT = 9999;
          m.speech = null;
        }
        if (an.t === 160) { m.emote = null; m.emoteT = 0; }
        if (an.t >= an.dur) {
          this.anim = null;
          m.state = 'idle';
          m.bed = null;
          this.fixMaidPosition();
          this.wakeUp();
        }
      }
    },

    // ---------------------------------------------------------------- drawing
    draw() {
      const ctx = E.ctx;
      UI.bg(this.t);
      this.drawRoom();
      for (const p of this.particles) this.drawParticle(p);
      this.drawMaidOverlay();
      if (this.anim && this.anim.kind === 'train') {
        const an = this.anim;
        const g = geom();
        E.panel(g.x0 + g.w * 8 - 50, g.wallY - 14, 100, 14, C.panel, C.panel2, {});
        E.bar(g.x0 + g.w * 8 - 46, g.wallY - 10, 92, 6, an.t / an.dur, C.mint);
      }
      if (this.anim && this.anim.kind === 'sleep') {
        const t = this.anim.t;
        const a = t < 60 ? t / 60 : t > 170 ? Math.max(0, (this.anim.dur - t) / 60) : 1;
        ctx.fillStyle = 'rgba(20,14,40,' + (0.62 * a) + ')';
        ctx.fillRect(0, 0, E.W, E.H);
        if (t > 60 && t < 180) for (let i = 0; i < 14; i++) E.rect((i * 53 + (t >> 3)) % 320, (i * 37) % 150 + 10, 1, 1, '#fff0a0');
      }
      this.drawHUD();
      for (const [i, tt] of this.toasts.entries()) {
        const y = 66 + i * 16 - Math.min(8, tt.t * 0.3);
        const tw = Math.min(304, Math.max(120, E.textWidth(tt.text) + 12));
        E.panel(Math.round(160 - tw / 2), y, tw, 15, C.plum, C.panel2, {});
        E.text(tt.text, 160, y + 2, { color: tt.col, align: 'center' });
      }
      if (this.decor) this.drawDecor();
      if (this.menu) this.drawMenu();
      if (this.dialog) this.drawDialog();
      if (this.panel) this.drawPanel();
      if (!this.dialog && !this.panel && !this.decor) this.drawHint();
      this.drawGlove();
    },
    drawRoom() {
      const ctx = E.ctx;
      const g = geom();
      const room = B.getRoom();
      const W = g.w * T;
      // frame + drop shadow
      E.rect(g.x0 - 2, g.wallY + 4, W + 8, WALL_H + g.h * T + 2, 'rgba(42,27,48,0.25)');
      E.rect(g.x0 - 4, g.wallY - 4, W + 8, WALL_H + g.h * T + 8, C.plum);
      E.rect(g.x0 - 3, g.wallY - 3, W + 6, 2, '#6b5a8e');
      for (let c = 0; c < g.w; c++) ctx.drawImage(E.spr.room.walls[room.wall][c % 2], g.x0 + c * T, g.wallY);
      const wins = g.w >= 8 ? [Math.floor(g.w * 0.25), Math.floor(g.w * 0.75) - 1] : [Math.floor(g.w / 2) - 1];
      const world = this.world || (this.world = G.world());
      for (const c of wins) {
        const wx = g.x0 + c * T + 7, wy = g.wallY + 1;
        ctx.drawImage(E.spr.room.window, wx, wy);
        drawSky(wx, wy, world, this.t);
      }
      for (let r = 0; r < g.h; r++) for (let c = 0; c < g.w; c++) ctx.drawImage(E.spr.room.floors[room.floor][(c + r) % 2], g.x0 + c * T, g.floorY + r * T);
      ctx.fillStyle = 'rgba(42,27,48,0.18)';
      ctx.fillRect(g.x0, g.floorY, W, 3);
      // door gap + mat
      E.rect(g.doorX, g.doorY, 24, 4, room.floor === 'wood' ? '#c98a4e' : '#d8c3cf');
      ctx.drawImage(E.spr.room.mat, g.doorX, g.doorY + 1);
      // floor-layer furniture
      for (const p of room.placed) {
        const F = G.FURNITURE[p.id];
        if (F.layer !== 'floor') continue;
        if (this.decor && this.decor.from === p) continue;
        ctx.drawImage(E.spr.room.furniture[p.id], g.x0 + p.c * T, g.floorY + p.r * T);
      }
      // objects and the maid, back to front
      const drawables = [];
      for (const p of room.placed) {
        const F = G.FURNITURE[p.id];
        if (F.layer === 'floor') continue;
        drawables.push({ bottom: (p.r + F.h) * T, kind: 'f', p });
      }
      drawables.push({ bottom: this.maid.y + T + 0.5, kind: 'm' });
      drawables.sort((a, b) => a.bottom - b.bottom);
      for (const d of drawables) {
        if (d.kind === 'f') {
          const F = G.FURNITURE[d.p.id];
          const img = E.spr.room.furniture[d.p.id];
          const x = g.x0 + d.p.c * T, y = g.floorY + (d.p.r + F.h) * T - img.height;
          ctx.fillStyle = 'rgba(42,27,48,0.2)';
          ctx.fillRect(x + 1, g.floorY + (d.p.r + F.h) * T - 2, F.w * T - 2, 3);
          ctx.drawImage(img, x, y);
          if (this.maid.state === 'sleep' && this.maid.bed === d.p) this.drawSleeper(d.p, x, y);
          const hv = this.hover && this.hover.kind === 'furniture' && this.hover.p === d.p && (this.mode === 'free');
          if (hv && (this.t >> 4) % 2 === 0) { ctx.strokeStyle = C.gold; ctx.lineWidth = 1; ctx.strokeRect(x - 0.5, y - 0.5, img.width + 1, img.height + 1); }
        } else if (this.maid.state !== 'sleep') this.drawMaid();
      }
      // the light in the room follows the hour; a lamp keeps the night warm
      const lamp = B.roomHas('lamp');
      const tint = world.phase === 'night' ? (lamp ? 'rgba(52,44,110,0.16)' : 'rgba(26,30,86,0.30)')
        : world.phase === 'evening' ? 'rgba(255,146,86,0.13)'
          : world.phase === 'morning' ? 'rgba(255,214,150,0.09)' : null;
      if (tint) {
        ctx.fillStyle = tint;
        ctx.fillRect(g.x0, g.wallY, W, WALL_H + g.h * T);
      }
    },
    drawSleeper(p, x, y) {
      const ctx = E.ctx;
      const face = E.spr.maids[maidKey()].faces.sleep;
      const img = E.spr.room.furniture[p.id];
      const hx = p.id === 'princess' ? x + 8 : x;
      const hy = p.id === 'princess' ? y + 8 : y + 3;
      ctx.drawImage(face, 0, 0, 16, 14, hx, hy, 16, 14);
      const cut = p.id === 'princess' ? 19 : 16;
      ctx.drawImage(img, 0, cut, img.width, img.height - cut, x, y + cut, img.width, img.height - cut);
    },
    drawMaid() {
      const ctx = E.ctx;
      const m = this.maid;
      const ms = this.maidScreen();
      const S = E.spr.maids[maidKey()];
      const hop = Math.round(m.hop);
      E.groundShadow(ms.x + 2, ms.y + 13, 12, 3, 0.25);
      let img;
      // idle, she turns to look at the glove when it comes close (her mood face waits until it goes)
      const look = this.lookDir();
      const face = m.face || (!look && m.dir === 'down' && m.state !== 'walk' ? faceFor() : null);
      const busy = m.state === 'pose' && (m.pose === 'punch' || m.pose === 'tidy');
      if (m.state === 'walk' || busy || (this.anim && this.anim.kind === 'train' && this.anim.tr.anim === 'run')) {
        img = S[m.dir][[1, 0, 2, 0][(m.walkT >> 3) % 4]];
      } else if (face && face !== 'normal' && (m.dir === 'down')) img = S.faces[face];
      else img = S[look || m.dir][0];
      // Berry cleans with her vacuum cleaner instead of a broom; Honey's pet bunny hops around after her
      const broom = maidKey() === 'berry' ? E.spr.room.vacuum : E.spr.room.broom;
      const by = maidKey() === 'berry' ? ms.y - 6 - hop : ms.y - 2 - hop + ((this.t >> 3) % 2);
      if (maidKey() === 'honey' && m.state !== 'sleep') {
        const side = m.dir === 'left' ? 15 : -9;
        const air = Math.round(Math.abs(Math.sin(this.t * 0.1)) * 3);
        const bunny = E.spr.room.bunny[air > 1 ? 1 : 0];
        ctx.drawImage(bunny, ms.x + side, ms.y + 16 - bunny.height - air);
      }
      if (m.prop === 'broom' && m.dir !== 'right') ctx.drawImage(broom, ms.x + 12, by);
      const act = this.glove.act;
      const sx = act && act.kind === 'poke' && act.t >= 8 && act.t < 22 ? -1 : act && act.kind === 'tickle' ? ((act.t >> 2) % 2 ? 1 : -1) : 0;
      ctx.drawImage(img, ms.x + sx, ms.y - 8 - hop);
      if (act && act.kind === 'highfive' && act.t >= 10 && act.t < 40) {
        // her hand up to meet the glove
        E.rect(ms.x + 12 + sx, ms.y - 4 - hop, 3, 5, '#000000');
        E.rect(ms.x + 13 + sx, ms.y - 3 - hop, 1, 3, '#ffe3ce');
      }
      if (m.prop === 'broom' && m.dir === 'right') ctx.drawImage(broom, ms.x - 6, by);
      if (m.prop === 'book') ctx.drawImage(E.spr.room.book, ms.x + 3, ms.y + 2 - hop);
      if (m.prop === 'cup') ctx.drawImage(E.spr.room.cup, ms.x + 9, ms.y + 3 - hop);
      if (face === 'blush' || m.face === 'blush') { E.rect(ms.x + 3, ms.y + 4 - hop, 2, 1, '#ff6f91'); E.rect(ms.x + 11, ms.y + 4 - hop, 2, 1, '#ff6f91'); }
      const hv = this.hover && this.hover.kind === 'maid' && this.mode === 'free';
      if (hv && this.hover.head && this.glove.pat <= 0) {
        ctx.drawImage(E.spr.fx.sparkle[(this.t >> 4) % 3], ms.x - 3, ms.y - 12 - hop);
      }
    },
    // idle and awake, she turns towards the glove when it comes close (not while it is on her)
    lookDir() {
      const m = this.maid;
      if (m.state !== 'idle' || m.face || this.glove.act || this.glove.pat > 0 || this.mode !== 'free') return null;
      if (this.hover && this.hover.kind === 'maid') return 'down';
      const ms = this.maidScreen();
      const dx = this.glove.x - (ms.x + 8), dy = this.glove.y - ms.y;
      if (dx * dx + dy * dy > 56 * 56) return null;
      if (Math.abs(dx) < 10) return 'down';
      return dx < 0 ? 'left' : 'right';
    },
    drawMaidOverlay() {
      const ctx = E.ctx;
      const m = this.maid;
      const ms = this.maidScreen();
      const hop = Math.round(m.hop);
      let headY = ms.y - 8 - hop;
      if (m.state === 'sleep' && m.bed) {
        const g = geom();
        const F = G.FURNITURE[m.bed.id];
        headY = g.floorY + (m.bed.r + F.h) * T - E.spr.room.furniture[m.bed.id].height;
        ms.x = g.x0 + m.bed.c * T + (m.bed.id === 'princess' ? 8 : 0);
      }
      if (m.emote) {
        const bob = Math.round(Math.sin(this.t * 0.2));
        ctx.drawImage(E.spr.room.emotes[m.emote], ms.x + 9, headY - 11 + bob);
      }
      if (m.speech && !this.dialog) {
        const lines = E.wrap(m.speech, 104);
        const w = Math.max(...lines.map((l) => E.textWidth(l))) + 10;
        const h = lines.length * 14 + 6;
        const bx = clamp(ms.x + 8 - w / 2, 4, E.W - w - 4);
        const by = Math.max(60, headY - h - 6);
        E.panel(Math.round(bx), by, Math.round(w), h, '#ffffff', C.plum, {});
        E.rect(ms.x + 6, by + h - 1, 4, 3, '#ffffff');
        E.rect(ms.x + 7, by + h + 2, 2, 2, C.plum);
        lines.forEach((l, i) => E.text(l, Math.round(bx) + 5, by + 4 + i * 14, { color: C.plum }));
      }
    },
    drawParticle(p) {
      const ctx = E.ctx;
      if (p.kind === 'heart') ctx.drawImage(E.spr.fx.heart, Math.round(p.x - 2), Math.round(p.y - 2));
      else if (p.kind === 'sparkle') ctx.drawImage(E.spr.fx.sparkle[(p.t >> 3) % 3], Math.round(p.x - 2), Math.round(p.y - 2));
      else if (p.kind === 'steam') { ctx.fillStyle = 'rgba(255,255,255,' + (1 - p.t / p.life) + ')'; ctx.fillRect(Math.round(p.x + Math.sin(p.t * 0.3) * 2), Math.round(p.y), 2, 2); }
      else if (p.kind === 'note') E.text('♪', Math.round(p.x), Math.round(p.y), { color: '#6b5a8e' });
    },
    drawHUD() {
      const ctx = E.ctx;
      const S = save();
      const k = maidKey();
      const b = bond(k);
      const D = G.MAID_DATA[k];
      // status bar in the original's style: emblem and bunny badge, her CG face strip, readings on the right. Beside the
      // portrait panel it runs across the whole screen (from x = -E.sideW, see wideTop) and the bars get longer.
      const L = -E.sideW, wide = E.sideW > 0;
      const barW = wide ? 56 : 30;
      UI.goldBar(L, 0, E.W - L, 38);
      ctx.drawImage(E.spr.ui.emblem, L + 5, 5);
      ctx.drawImage(E.spr.ui.bunny, L + 6, 23);
      if (!(this.panel && this.panel.kind === 'diary')) E.art('hud-portrait', UI.CG_ART, L + 18, 3, 112, 32, UI.CG_CROP.face[k]);
      E.rect(L + 130, 3, 1, 32, '#f8b000');
      const sx = L + 135;
      const ai = affInfo(k);
      // affection: one heart per level, the next level filling in beside them
      for (let i = 0; i < 5; i++) ctx.drawImage(i <= ai.lv ? E.spr.ui.heart : E.spr.ui.heartEmpty, sx + i * 8, 6);
      E.bar(sx + 41, 7, wide ? 62 : 26, 5, ai.t, C.pink);
      ctx.drawImage(E.spr.ui.coin, 314 - E.textWidth(String(S.coins)) - 9, 6);
      E.text(String(S.coins), 314, 5, { color: C.text, align: 'right' });
      // the real clock and today's sky; the weekday turns red at the weekend
      const w = this.world || (this.world = G.world());
      let wx = 314 - E.textWidth(String(S.coins)) - 20;
      wx -= E.text(w.hhmm, wx, 5, { color: C.text, align: 'right' }) + 5;
      wx -= E.text(G.t(w.weekName), wx, 5, { color: w.weekend ? C.red : C.text, align: 'right' }) + 4;
      const sky = E.spr.ui.weather[w.weather];
      if (sky) ctx.drawImage(sky, wx - 9, 5);
      E.text(G.t('體力'), sx, 21, { color: C.text });
      E.bar(sx + 25, 24, barW, 7, b.stamina / 100, b.stamina < G.JOB_STAMINA ? C.red : C.mint);
      const mx = sx + 25 + barW + 6;
      E.text(G.t('心情'), mx, 21, { color: C.text });
      E.bar(mx + 25, 24, barW, 7, b.mood / 100, b.mood >= 80 ? C.gold : b.mood < 30 ? '#8fc6ff' : '#ffb45c');
      E.text(G.t('第 {n} 天', { n: S.day }), 314, 21, { color: C.red, align: 'right', fit: 56 });
      // tabs (hidden while decorating, the room uses that space)
      if (this.decor) return;
      TABS.forEach((tb, i) => {
        const r = tabRect(i);
        const hv = (this.mode === 'tabs' && this.tab === i) || (this.hover && this.hover.kind === 'tab' && this.hover.i === i && this.mode === 'free');
        if (tb.id === 'decor') { drawCornerButton(G.t('佈置'), hv); return; }
        // square tool button: white face in a gold rim, red when picked (the original's selected tool)
        E.panel(r.x, r.y, r.w, r.h, hv ? '#ff6a6a' : '#ffffff', '#f8b000', { outline: '#000000' });
        const cx = r.x + r.w / 2;
        switch (tb.id) {
          case 'diary': ctx.drawImage(E.spr.room.book, cx - 5, r.y + 6); break;
          case 'sleep': ctx.drawImage(E.spr.room.emotes.zzz, cx - 5, r.y + 5); break;
          case 'out': ctx.drawImage(E.spr.room.mat, 4, 0, 16, 13, cx - 8, r.y + 4, 16, 13); break;
          case 'wardrobe': ctx.drawImage(E.spr.room.furniture.wardrobe, 0, 0, 16, 28, cx - 4, r.y + 3, 8, 14); break;
          case 'system':
            E.rect(cx - 4, r.y + 6, 8, 8, C.ink); E.rect(cx - 2, r.y + 4, 4, 12, C.ink); E.rect(cx - 6, r.y + 8, 12, 4, C.ink);
            E.rect(cx - 2, r.y + 8, 4, 4, hv ? '#fff' : C.paper);
            break;
        }
      });
      if (this.mode === 'tabs' && this.tab !== 5) {
        const r = tabRect(this.tab);
        // a white name label with a black rim, like the original's tags
        const label = G.t(TABS[this.tab].label);
        const lw = E.textWidth(label) + 10;
        const lx = Math.max(2, Math.min(E.W - lw - 2, Math.round(r.x + r.w / 2 - lw / 2)));
        E.panel(lx, r.y + 21, lw, 16, '#ffffff', '#000000', { outline: '#000000' });
        E.text(label, lx + lw / 2, r.y + 23, { color: C.text, align: 'center' });
      }
    },
    drawHint() {
      const S = save();
      const step = G.GUIDE[S.guide];
      // the bottom strip stops short of the 「佈置」 corner button
      const hintW = E.W - CORNER_R;
      E.rect(0, E.H - 16, hintW, 16, '#000000');
      E.rect(0, E.H - 16, hintW, 1, '#f8b000');
      UI.edgeBar({ y: E.H - 16, h: 16, rule: E.H - 16 });
      const hx = E.sideW > 0 ? 14 : 0; // beside the portrait panel her skirt covers the strip's left end
      if (step) {
        const pulse = (this.t >> 5) % 2 === 0;
        E.text('★', 6 + hx, E.H - 13, { color: pulse ? C.gold : C.pink });
        UI.marquee(step.text, 18 + hx, E.H - 13, hintW - 22 - hx, C.gold);
      } else {
        const touch = E.input.lastDevice === 'touch';
        UI.marquee(G.t(touch ? '拖曳手套、點一下互動　B 功能列' : 'Z 互動　X 功能列　ESC 系統　滑鼠也可以直接點'), 4 + hx, E.H - 13, hintW - 8 - hx, C.paper);
      }
    },
    drawGlove() {
      const ctx = E.ctx;
      const gl = this.glove;
      if (this.mode === 'dialog' || this.mode === 'panel' || (this.decor && this.decor.phase !== 'tray')) return;
      const G2 = E.spr.room.glove;
      const ms = this.maidScreen();
      const hop = Math.round(this.maid.hop);
      if (gl.pat > 0) {
        // patting: pressed down on her hair, lifted, pressed again
        const up = (gl.pat % 16) < 7;
        const wiggle = Math.round(Math.sin(gl.pat * 0.35) * 2);
        ctx.drawImage(G2.pat[up ? 1 : 0], ms.x - 5 + wiggle, ms.y - 22 - hop - (up ? 2 : 0));
        return;
      }
      const act = gl.act;
      if (act && act.kind === 'poke') {
        // reach in, press her cheek, draw back
        const reach = act.t < 8 ? 8 - act.t : act.t < 22 ? 0 : Math.min(10, act.t - 22);
        ctx.drawImage(G2.poke, ms.x + 11 + reach, ms.y - 6 - hop);
        return;
      }
      if (act && act.kind === 'highfive') {
        // the palm comes down to meet her raised hand, then lifts away
        const down = act.t < 16 ? E.ease.outCubic(act.t / 16) : 1 - Math.max(0, (act.t - 30) / 26);
        ctx.drawImage(G2.open, ms.x + 10, Math.round(ms.y - 46 + down * 14) - (act.t >= 16 && act.t < 22 ? 1 : 0));
        return;
      }
      if (act && act.kind === 'tickle') {
        ctx.drawImage(G2.tickle[(act.t >> 3) % 2], ms.x + 6 + ((act.t >> 2) % 2), ms.y - 1 - hop);
        return;
      }
      ctx.drawImage(G2.point, Math.round(gl.x) - 6, Math.round(gl.y));
      if (this.mode === 'free' && this.hover && !this.menu) {
        const label = this.hoverLabel(this.hover);
        if (label && this.hover.kind !== 'tab') {
          const w = E.textWidth(label) + 8;
          const x = clamp(Math.round(gl.x + 10), 2, E.W - w - 2);
          const y = clamp(Math.round(gl.y + 14), 40, E.H - 34);
          E.panel(x, y, w, 15, C.plum, C.panel2, {});
          E.text(label, x + 4, y + 2, { color: C.white });
        } else if (label) {
          const r = tabRect(this.hover.i);
          E.text(label, r.x + r.w / 2, r.y + 22, { color: C.white, outline: C.plum, align: 'center' });
        }
      }
    },
    drawMenu() {
      const mn = this.menu;
      E.panel(mn.x, mn.y, mn.w, mn.h, C.paper, C.red, { shine: '#fff' });
      E.rect(mn.x + 2, mn.y + 2, mn.w - 4, 16, C.red);
      E.text(mn.title, mn.x + 6, mn.y + 4, { color: C.white });
      mn.items.forEach((it, i) => {
        const y = mn.y + 21 + i * 16;
        const on = i === mn.sel;
        if (on) E.rect(mn.x + 3, y - 1, mn.w - 6, 15, '#ffe0ea');
        let x = mn.x + 14;
        if (it.icon) { E.ctx.drawImage(it.icon, x, y + (it.icon.height > 10 ? -2 : 3)); x += it.icon.width + 3; }
        E.text(it.label, x, y + 1, { color: it.disabled ? C.gray : on ? C.red : C.plum });
        if (it.note) E.text(it.note, mn.x + mn.w - 6, y + 1, { color: it.disabled ? C.red : C.dim, align: 'right' });
        if (on) UI.heartCursor(mn.x + 4, y + 4);
      });
    },
    drawDialog() {
      const d = this.dialog;
      const cur = d.queue[d.i];
      const ctx = E.ctx;
      E.panel(4, 170, 312, 66, C.paper, C.plum, { shine: '#fff' });
      UI.lace(8, 168, 304, C.plum);
      let tx = 14;
      if (cur.who) {
        // her portrait in the line's feeling (joy / anger / sorrow / fun), and a little bubble beside the name plate
        E.panel(10, 176, 54, 54, '#ffe0ea', G.MAID_DATA[cur.who].color, {});
        const face = UI.portraitFace(cur.who, UI.FACE_EMOTION[cur.face] || 'normal');
        E.art('dialog-portrait', face.src, 12, 178, 50, 50, face.crop);
        const nameW = E.textWidth(G.MAID_DATA[cur.who].name);
        E.rect(66, 174, nameW + 10, 15, G.MAID_DATA[cur.who].color);
        E.text(G.MAID_DATA[cur.who].name, 71, 175, { color: C.white });
        const badge = { tired: 'sweat', angry: 'anger', blush: 'heart', surprise: 'exclaim', happy: 'note' }[cur.face];
        if (badge) ctx.drawImage(E.spr.room.emotes[badge], 80 + nameW, 173 + Math.round(Math.sin(this.t * 0.2)));
        tx = 70;
      }
      typewriter(cur.text, d.chars, tx, cur.who ? 194 : 180, 312 - tx - 10, C.plum);
      if (cur.levelUp && (this.t >> 4) % 2 === 0) E.text(G.t('好感度提升！'), 306, 175, { color: C.red, align: 'right' });
      if (d.chars >= cur.text.length && (this.t >> 5) % 2 === 0) E.text('▼', 304, 222, { color: C.red });
    },
    drawPanel() {
      const p = this.panel;
      if (p.kind === 'diary') return this.drawDiary(p);
      E.rect(0, 0, E.W, E.H, 'rgba(42,27,48,0.55)');
      E.artShade(0.45);
      if (p.kind === 'train') {
        UI.paper(60, 66, 200, 110);
        E.text(G.t('{name} 完成！', { name: p.tr.name }), 160, 74, { color: C.red, align: 'center', size: 14 });
        E.text(G.t('經驗值 +{n}', { n: p.gainExp }) + (p.moodMul > 1 ? G.t('（心情加成）') : p.moodMul < 1 ? G.t('（心情低落）') : ''), 160, 96, { color: C.plum, align: 'center' });
        const b = bond();
        const lv = B.trainLevel(b.exp[p.tr.id]);
        const cur = G.TRAIN_LV[lv], nxt = G.TRAIN_LV[lv + 1];
        E.bar(98, 114, 140, 8, nxt ? (b.exp[p.tr.id] - cur) / (nxt - cur) : 1, C.mint);
        E.text('Lv' + lv, 92, 112, { color: C.ink, align: 'right' });
        if (p.after > p.before) {
          E.text('LEVEL UP!  Lv' + p.before + ' → Lv' + p.after, 160, 128, { color: (this.t >> 3) % 2 ? C.gold : C.red, outline: C.plum, align: 'center' });
          E.text(p.ups.length ? p.ups.join('  ') + '!' : G.t('能力提升了！'), 160, 146, { color: C.red, align: 'center' });
        } else {
          E.wrap(p.tr.desc, 184).slice(0, 2).forEach((ln, i, arr) => E.text(ln, 160, (arr.length > 1 ? 125 : 132) + i * 14, { color: C.ink, align: 'center' }));
        }
        E.text(G.t('體力 -{n}', { n: p.tr.stamina }), 160, 160, { color: C.dim, align: 'center' });
      } else if (p.kind === 'morning') {
        UI.paper(20, 70, 280, 100);
        E.text(G.t('第 {n} 天', { n: p.day }), 160, 80, { color: C.red, align: 'center', scale: 2, size: 12 });
        E.text(G.t('早安！大家的體力都恢復了。'), 160, 110, { color: C.plum, align: 'center' });
        if (p.event) {
          E.text(G.t(p.event.text, { maid: name() }), 160, 130, { color: C.ink, align: 'center', fit: 268 });
          if (p.event.extra) E.text(p.event.extra, 160, 146, { color: C.red, align: 'center' });
        }
      }
    },
    drawDiary(p) {
      if (p.page === 1) return this.drawDiarySkills(p);
      const k = p.list[p.i];
      const b = bond(k);
      const D = G.MAID_DATA[k];
      const ctx = E.ctx;
      UI.paper(6, 4, 308, 232);
      // her CG portrait from the character illustration
      E.panel(12, 8, 56, 76, '#ffe0ea', D.color, {});
      E.art('diary-portrait', UI.CG_ART, 14, 10, 52, 72, UI.CG_CROP.diary[k]);
      E.text(G.t('{name}的成長日記', { name: D.name }), 74, 10, { color: C.red, size: 14, fit: 170 });
      E.text(G.t('第 {day} 天　出任務 {jobs} 次', { day: save().day, jobs: b.jobs }), 74, 28, { color: C.ink });
      if (p.list.length > 1) E.text('◀ ' + (p.i + 1) + '/' + p.list.length + ' ▶', 306, 10, { color: C.dim, align: 'right' });
      this.drawDiaryTabs(p);
      const ai = affInfo(k);
      E.ctx.drawImage(E.spr.ui.heart, 74, 47);
      E.text(G.t('好感度 Lv{lv}「{name}」', { lv: ai.lv + 1, name: ai.name }), 84, 44, { color: C.plum, fit: 124 });
      E.bar(212, 48, 94, 7, ai.t, C.pink);
      E.text(G.t('體力'), 74, 68, { color: C.ink }); E.bar(102, 72, 46, 7, b.stamina / 100, C.mint);
      E.text(G.t('心情'), 156, 68, { color: C.ink }); E.bar(184, 72, 46, 7, b.mood / 100, C.gold);
      E.text(moodName(b.mood), 236, 68, { color: C.dim, fit: 70 });
      // training
      E.rect(12, 86, 296, 1, C.pink);
      G.TRAININGS.forEach((tr, i) => {
        const y = 92 + i * 17;
        const lv = B.trainLevel(b.exp[tr.id]);
        const cur = G.TRAIN_LV[lv], nxt = G.TRAIN_LV[lv + 1];
        ctx.drawImage(E.spr.ui[tr.icon], 16, y + 3);
        E.text(tr.name, 28, y, { color: C.plum, fit: 64 });
        E.text('Lv' + lv, 94, E.textImage(tr.name).cjk ? y + 2 : y, { color: C.red });
        E.bar(118, y + 4, 54, 6, nxt ? (b.exp[tr.id] - cur) / (nxt - cur) : 1, C.mint);
        E.text(tr.short, 306, y, { color: C.ink, align: 'right', fit: 130 });
      });
      // perks
      E.rect(12, 162, 296, 1, C.pink);
      G.AFF_LEVELS.forEach((L, i) => {
        if (i === 0) return;
        const y = 164 + (i - 1) * 14;
        const on = ai.lv >= i;
        E.text((on ? '♥ ' : '◇ ') + 'Lv' + (i + 1) + ' ' + L.perk, 16, y, { color: on ? C.red : C.gray });
      });
      const st = B.maidStats(k);
      const pk = B.perks(k);
      E.rect(12, 220, 296, 13, C.plum);
      E.text(G.t('出任務時　炸彈{b}　火力{f}　速度{s}　愛心{h}　SP消耗{sp}', { b: st.bombs, f: st.fire, s: st.speed, h: st.hearts + pk.heartBonus, sp: Math.round(G.MAID_DATA[k].cost * pk.skillCostMul) }), 160, 221, { color: C.paper, align: 'center' });
    },
    // growth / skills tabs under the page counter, so players find the skills page
    drawDiaryTabs(p) {
      const tabs = [G.t('成長'), G.t('特技')];
      let x = 306;
      for (let i = tabs.length - 1; i >= 0; i--) {
        const w = E.textWidth(tabs[i]) + 8;
        x -= w;
        const on = (p.page || 0) === i;
        E.panel(x, 24, w, 15, on ? C.red : '#fff4f7', on ? '#8e1f3a' : C.pink, { outline: '#000000' });
        E.text(tabs[i], x + w / 2, 26, { color: on ? C.white : C.dim, align: 'center' });
        x -= 3;
      }
    },
    // her skills page: role, SP skill and cost, passive, a looping demo of the skill, and a battle tip
    drawDiarySkills(p) {
      const k = p.list[p.i];
      const D = G.MAID_DATA[k];
      p.demoT = (p.demoT || 0) + 1;
      UI.paper(6, 4, 308, 232);
      E.panel(12, 8, 56, 76, '#ffe0ea', D.color, {});
      E.art('diary-portrait', UI.CG_ART, 14, 10, 52, 72, UI.CG_CROP.diary[k]);
      E.text(G.t('{name}的特技', { name: D.name }), 74, 10, { color: C.red, size: 14, fit: 130 });
      if (p.list.length > 1) E.text('◀ ' + (p.i + 1) + '/' + p.list.length + ' ▶', 306, 10, { color: C.dim, align: 'right' });
      this.drawDiaryTabs(p);
      // role badge and her stats as pips
      const rw = E.textWidth(D.role) + 16;
      E.panel(74, 28, rw, 15, D.color, '#000000', {});
      E.text(D.role, 74 + rw / 2, 30, { color: C.white, align: 'center' });
      const st = B.maidStats(k);
      [['bomb', st.bombs, C.red], ['fire', st.fire, '#ff8a2e'], ['speed', st.speed, '#3d86f0']].forEach(([icon, n, col], i) => {
        const y = 48 + i * 12;
        E.ctx.drawImage(E.spr.ui[icon], 74, y);
        for (let j = 0; j < 6; j++) E.rect(86 + j * 6, y + 2, 5, 5, j < n ? col : '#e8d8e0');
      });
      // looping demo of the skill
      this.drawSkillDemo(k, 128, 44, p.demoT);
      // active skill
      E.rect(12, 88, 296, 1, C.pink);
      E.text(G.t('主動特技') + '「' + D.skill + '」', 16, 92, { color: C.plum, fit: 200 });
      E.text(G.t('消耗 SP {n}', { n: Math.round(D.cost * B.perks(k).skillCostMul) }), 306, 92, { color: C.red, align: 'right' });
      UI.wrapLines([G.joinLines(D.skillDesc)], 16, 107, C.ink, 13, 290);
      // passive
      E.rect(12, 138, 296, 1, C.pink);
      E.text(G.t('被動特性') + '「' + D.passive + '」', 16, 142, { color: C.plum, fit: 290 });
      UI.wrapLines([G.joinLines(D.passiveDesc)], 16, 157, C.ink, 13, 290);
      // battle tip
      E.rect(12, 186, 296, 1, C.pink);
      E.text(G.t('對戰小技巧') + '　' + G.t('▲▼ 翻頁'), 16, 190, { color: C.plum });
      UI.wrapLines([D.tip], 16, 205, C.dim, 13, 290);
    },
    // a tiny looping scene of each maid's skill, built from the game's own sprites
    drawSkillDemo(k, x0, y0, t) {
      const ctx = E.ctx;
      const W = 178, Hh = 40;
      E.rect(x0, y0, W, Hh, '#000000');
      E.rect(x0 + 1, y0 + 1, W - 2, Hh - 2, '#f4e8d8');
      // keep rings and sparks inside the little stage
      ctx.save();
      ctx.beginPath();
      ctx.rect(x0 + 1, y0 + 1, W - 2, Hh - 2);
      ctx.clip();
      for (let c = 0; c < 11; c++) E.rect(x0 + 1 + c * 16, y0 + 34, 16, 5, c % 2 ? '#e0cbb0' : '#ead8c0');
      const S = E.spr;
      const ground = y0 + 34;
      const maidX = x0 + 6;
      const crate = S.themes.cafe.soft[0];
      const cyc = t % 150;
      const drawMaid = (dir, f) => ctx.drawImage(S.maids[k][dir][f || 0], maidX, ground - 24);
      const ring = (x, y, rad, col) => G.pixelRing(x, y, rad, col);
      if (k === 'berry') {
        // she kicks a bomb; it streaks along and bursts against a crate
        const kickAt = 30, crateX = x0 + 150;
        drawMaid('right', cyc > kickAt && cyc < kickAt + 10 ? 1 : 0);
        if (cyc < 96) ctx.drawImage(crate, crateX, ground - 20);
        if (cyc < kickAt) ctx.drawImage(S.bomb[(t >> 4) % 3], maidX + 17, ground - 16);
        else if (cyc < 84) {
          const bx = Math.min(crateX - 16, maidX + 17 + (cyc - kickAt) * 3.2);
          ctx.drawImage(S.bomb[0], Math.round(bx), ground - 16);
          for (let i = 1; i < 4; i++) E.rect(Math.round(bx - i * 5), ground - 8, 3, 1, i < 2 ? '#ffffff' : '#ffe14d');
          if (cyc < kickAt + 8) ctx.drawImage(S.fx.star[(t >> 2) % 2], maidX + 16, ground - 14);
        } else if (cyc < 100) {
          const st = cyc < 87 ? 1 : cyc < 94 ? 2 : 3;
          for (const dx of [-16, 0, 16]) ctx.drawImage(S.flame[0][st], crateX - 16 + dx, ground - 16);
        }
      } else if (k === 'yoru') {
        // one stroke splits the two crates in front of her
        const cut = 40;
        drawMaid('right', 0);
        if (cyc < cut + 6) { ctx.drawImage(crate, x0 + 24, ground - 20); ctx.drawImage(crate, x0 + 40, ground - 20); }
        else if (cyc < cut + 30) {
          ctx.save(); ctx.globalAlpha = 1 - (cyc - cut - 6) / 24;
          ctx.drawImage(crate, x0 + 22, ground - 18); ctx.drawImage(crate, x0 + 42, ground - 22);
          ctx.restore();
        }
        if (cyc >= cut && cyc < cut + 14) {
          for (let n = 0; n < 2; n++) {
            const age = cyc - cut - n * 3;
            if (age >= 0) ctx.drawImage(S.fx.slash[Math.min(2, age >> 2)], x0 + 20 + n * 16, ground - 24);
          }
          for (let i = 0; i < 36; i += 3) E.rect(x0 + 22 + i, ground - 10, 2, 1, '#ffffff');
        }
      } else if (k === 'honey') {
        // a monster wanders up; her magic rings out and leaves it dizzy, her shield shimmering
        const magic = 70;
        drawMaid('down', 0);
        ring(maidX + 8, ground - 21, 11, (t >> 3) % 3 === 0 ? '#ffffff' : '#ffb0d0');
        const cat = S.monsters.dustcat.frames[(t >> 5) % 2];
        const catX = x0 + 44 + (cyc < magic ? Math.max(0, 60 - cyc) : 0);
        ctx.drawImage(cat, Math.round(catX), ground - cat.height);
        if (cyc >= magic && cyc < magic + 22) ring(maidX + 8, ground - 18, 4 + (cyc - magic) * 2.2, '#ff9fbb');
        if (cyc >= magic + 8) for (let i = 0; i < 3; i++) { const a = t * 0.15 + (i * Math.PI * 2) / 3; ctx.drawImage(S.fx.star[(t >> 3) % 2], Math.round(catX + 5 + Math.cos(a) * 6), Math.round(ground - cat.height - 4 + Math.sin(a) * 2)); }
        if (cyc >= magic && cyc < magic + 30) ctx.drawImage(S.fx.heart, maidX + 6, ground - 34 - ((cyc - magic) >> 2));
      } else if (k === 'yukino') {
        // two bombs wait; her remote signal sets them off together, frost glinting at the edges
        const go = 60;
        const bombs = [x0 + 52, x0 + 116];
        drawMaid('right', 0);
        if (cyc < go + 16) bombs.forEach((bx) => ctx.drawImage(S.bomb[(t >> 4) % 3], bx, ground - 16));
        if (cyc >= go && cyc < go + 16 && (cyc >> 2) % 2) {
          for (let i = -2; i <= 2; i++) E.rect(maidX + 8 + i, ground - 34, 1, 1, '#9ff3ff');
          bombs.forEach((bx) => ring(bx + 8, ground - 8, 9 - (cyc - go) * 0.4, '#9ff3ff'));
        }
        if (cyc >= go + 16 && cyc < go + 40) {
          const st = cyc < go + 20 ? 1 : cyc < go + 34 ? 2 : 3;
          bombs.forEach((bx) => { for (const dx of [-16, 0, 16]) ctx.drawImage(S.flame[0][st], bx + dx, ground - 16); });
          for (const fx of [x0 + 30, x0 + 150]) { E.rect(fx, ground - 8, 3, 1, '#9ff3ff'); E.rect(fx + 1, ground - 9, 1, 3, '#9ff3ff'); E.rect(fx + 1, ground - 8, 1, 1, '#ffffff'); }
        }
      }
      ctx.restore();
    },
    drawDecor() {
      const dc = this.decor;
      const g = geom();
      const ctx = E.ctx;
      if (dc.phase !== 'tray') {
        // grid + ghost
        ctx.strokeStyle = 'rgba(255,255,255,0.35)';
        ctx.lineWidth = 1;
        for (let c = 0; c <= g.w; c++) { ctx.beginPath(); ctx.moveTo(g.x0 + c * T + 0.5, g.floorY); ctx.lineTo(g.x0 + c * T + 0.5, g.floorY + g.h * T); ctx.stroke(); }
        for (let r = 0; r <= g.h; r++) { ctx.beginPath(); ctx.moveTo(g.x0, g.floorY + r * T + 0.5); ctx.lineTo(g.x0 + g.w * T, g.floorY + r * T + 0.5); ctx.stroke(); }
        if (dc.phase === 'place') {
          const F = G.FURNITURE[dc.item];
          const ok = canPlace(dc.item, dc.c, dc.r);
          const img = E.spr.room.furniture[dc.item];
          const x = g.x0 + dc.c * T, y = g.floorY + (dc.r + F.h) * T - img.height;
          E.rect(g.x0 + dc.c * T, g.floorY + dc.r * T, F.w * T, F.h * T, ok ? 'rgba(184,242,138,0.45)' : 'rgba(236,61,95,0.45)');
          ctx.save();
          ctx.globalAlpha = 0.8;
          ctx.drawImage(img, x, y);
          ctx.restore();
        } else {
          const x = g.x0 + dc.c * T, y = g.floorY + dc.r * T;
          ctx.strokeStyle = (this.t >> 3) % 2 ? C.gold : C.red;
          ctx.lineWidth = 2;
          ctx.strokeRect(x + 1, y + 1, T - 2, T - 2);
        }
      }
      // tray
      E.panel(2, 178, 316, 60, C.panel, C.panel2, {});
      const items = this.trayItems();
      const it = items[dc.sel] || items[0];
      const title = dc.phase === 'tray' ? it.label : dc.phase === 'place' ? G.t('擺放：{name}', { name: G.FURNITURE[dc.item].name }) : G.t('選擇要移動的家具');
      const titleW = E.text(title, 8, 182, { color: C.gold, fit: 160 });
      const mx = Math.max(96, 8 + titleW + 8);
      UI.marquee(dc.phase === 'tray' ? it.desc + G.t('　（←→ 選擇　Z 決定　X 結束）') : G.t(dc.phase === 'place' ? '方向鍵移動　Z 放下　X 取消（綠色可以放）' : '方向鍵選格子　Z 拿起　X 返回'), mx, 182, 312 - mx, C.paper);
      const per = 9;
      dc.scroll = clamp(dc.sel - per + 1, 0, Math.max(0, items.length - per));
      if (dc.sel < dc.scroll) dc.scroll = dc.sel;
      for (let i = dc.scroll; i < Math.min(items.length, dc.scroll + per); i++) {
        const s = items[i];
        const x = 8 + (i - dc.scroll) * 34, y = 200;
        const on = i === dc.sel && dc.phase === 'tray';
        E.panel(x, y, 32, 32, on ? '#fff' : C.paper, on ? C.red : C.pink, {});
        const cx = x + 16, cy = y + 16;
        if (s.kind === 'item' || s.kind === 'shop') {
          const img = E.spr.room.furniture[s.id];
          const sc = Math.min(1, 26 / img.width, 26 / img.height);
          const sc2 = sc < 1 ? 0.5 : 1;
          ctx.drawImage(img, Math.round(cx - (img.width * sc2) / 2), Math.round(cy - (img.height * sc2) / 2), img.width * sc2, img.height * sc2);
          if (s.kind === 'shop') {
            // price tag, gold when affordable
            E.rect(x + 3, y + 24, 26, 7, C.plum);
            E.text(String(s.price), x + 16, y + 25, { color: save().coins >= s.price ? C.gold : C.pink, small: true, align: 'center' });
          }
        } else {
          const glyph = G.t({ move: '移', wall: '壁', floor: '地', expand: '擴', done: '完' }[s.kind]);
          E.text(glyph, cx, y + 9, { color: on ? C.red : C.ink, align: 'center', size: 14 });
        }
      }
    },
  };
})(window);
