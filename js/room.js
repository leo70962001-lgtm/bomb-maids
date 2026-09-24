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
  // how far a line types on in one frame: her own pace (G.TRAITS talk), slower through silences and after a pause mark
  function talkStep(text, at, pace) {
    const ch = text[Math.floor(at)];
    return ch === '…' ? pace * 0.3 : ch === '。' || ch === '、' || ch === '，' || ch === '！' || ch === '？' ? pace * 0.5 : pace;
  }

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

  // Berry's skipping rope, one turn every 20 frames of her pose clock (which counts down): over her head at the start,
  // down in front of her, under her feet (angle 0) as she jumps, up behind her
  const ropeAngle = (poseT) => (((200 - poseT) % 20) / 20) * Math.PI * 2;
  // how she poses for a photo, by how close you are: [the picture's feeling, her face in the room, where she looks, hop]
  const PHOTO_POSE = {
    berry: { mid: ['fun', 'happy', null, 4], high: ['joy', 'happy', null, 6] },
    honey: { mid: ['fun', 'surprise', null, 1], high: ['joy', 'blush', null, 2] },
    yukino: { mid: ['normal', 'happy', null, 0], high: ['joy', 'blush', null, 1] },
    yoru: { mid: ['anger', 'angry', 'left', 0], high: ['joy', 'blush', null, 0] },
  };
  // how each comes into a hug: Berry leaps in, Honey stumbles in, Yukino opens her arms, Yoru freezes first
  const HUG = {
    berry: { hop: 8, first: 'heart', face: 'happy' },
    honey: { hop: 4, first: 'sweat', face: 'surprise' },
    yukino: { hop: 2, first: 'heart', face: 'happy' },
    yoru: { hop: 0, first: 'exclaim', face: 'surprise' },
  };

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
      this.shakeT = 0;
      this.flashFx = null;
      this.hoverCD = 0;
      this.seekCD = 900; // until she may come over by herself (seek)
      this.seekT = 0; // while she waits for the pat she asked for
      this.wasOnMaid = false;
      this.furn = new Map(); // what each placed piece is doing: { kind, t, dur }
      this.timers = []; // { t, fn }: a beat later, without taking the controls away
      this.lights = [];
      this.fish = null;
      this.recordOn = false;
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
          if (job.levelUp) q.push({ who: k, face: 'blush', text: L.levelUp, levelUp: true, feel: 'love' });
          if (job.newMaid && G.MAID_DATA[job.newMaid]) {
            q.push({ who: job.newMaid, face: 'happy', text: lines(job.newMaid).intro });
            q.push({ who: null, text: G.t('{name}成為新的夥伴了！打開衣櫃就能換她值班。', { name: name(job.newMaid) }) });
          }
          this.say(q);
        } else this.say([{ who: k, face: 'tired', text: L.jobFail, feel: 'sad' }]);
      } else {
        // she greets by the hour, and sometimes by the weekday or the sky outside
        const ctx = G.contextLines(k, this.world);
        const r = Math.random();
        const line = (r < 0.45 ? ctx.time : r < 0.7 ? ctx.week : r < 0.9 ? ctx.sky : null) || E.pick(L.greet);
        if (this.bondTier() === 'high' && L.greetHigh && Math.random() < 0.5) this.speak(E.pick(L.greetHigh), 'blush');
        else this.speak(line, this.world.phase === 'night' ? 'normal' : 'happy');
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
      this.maid = { c, r, x: c * T, y: r * T, dir: 'down', path: [], state: 'idle', idle: 90, walkT: 0, face: null, faceT: 0, emote: null, emoteT: 0, hop: 0, speech: null, speechT: 0, speechChars: 0, pauseT: 0, prop: null, useT: 0 };
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
    // feel: what she feels as she says it (G.UI.feelPic turns it into her picture beside the game)
    speak(text, face, feel) {
      this.maid.speech = text;
      this.maid.speechChars = 0;
      this.maid.speechT = Math.max(170, Math.round(text.length / trait().talk) + 110);
      if (face) this.setFace(face, 150);
      this.maid.feel = feel || null;
      this.maid.feelT = feel ? this.maid.speechT : 0;
    },
    updateMaid() {
      const m = this.maid;
      if (m.faceT > 0 && --m.faceT === 0) m.face = null;
      if (m.feelT > 0 && --m.feelT === 0) m.feel = null;
      if (m.emoteT > 0 && --m.emoteT === 0) m.emote = null;
      if (m.speechT > 0 && --m.speechT === 0) m.speech = null;
      if (m.speech && m.speechChars < m.speech.length) m.speechChars += talkStep(m.speech, m.speechChars, trait().talk);
      if (m.hop > 0) m.hop = Math.max(0, m.hop - 0.6);
      if (m.state === 'walk') {
        const next = m.path[0];
        if (!next) {
          m.state = 'idle';
          m.idle = E.randi(100, 240);
          if (m.then) { const f = m.then; m.then = null; f(); }
          return;
        }
        // each walks her own way (G.TRAITS walk): Berry runs and kicks up dust, Honey sometimes stops to wonder where she
        // was going, Yukino glides with a glint now and then, Yoru takes her time
        const w = trait().walk;
        if (m.pauseT > 0) {
          if (--m.pauseT % 22 === 0) m.dir = m.dir === 'left' ? 'right' : 'left';
          return;
        }
        if (w.wobble && this.mode === 'free' && !m.then && m.path.length > 1 && Math.random() < 0.006) {
          m.pauseT = 66;
          this.emote('question', 60);
          return;
        }
        const tx = next[0] * T, ty = next[1] * T;
        const dx = tx - m.x, dy = ty - m.y;
        if (Math.abs(dx) > 0.01) m.dir = dx > 0 ? 'right' : 'left';
        else if (Math.abs(dy) > 0.01) m.dir = dy > 0 ? 'down' : 'up';
        const sp = 0.9 * w.speed;
        m.x += Math.sign(dx) * Math.min(Math.abs(dx), sp);
        m.y += Math.sign(dy) * Math.min(Math.abs(dy), sp);
        m.walkT += w.speed > 1.2 ? 2 : 1;
        const ws = this.maidScreen();
        if (w.dust && m.walkT % 10 === 0) {
          const back = m.dir === 'left' ? 1 : m.dir === 'right' ? -1 : 0;
          this.fx({ kind: 'dust', x: ws.x + 8 + back * 5, y: ws.y + 14, vx: back * 0.3, vy: -0.25, life: 18 });
        }
        if (w.glide && m.walkT % 48 === 0) this.fx({ kind: 'glint', x: ws.x + E.randi(1, 15), y: ws.y + E.randi(-6, 10), life: 16 });
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
          case 'punch': { // Berry shadow-boxes, one jab at a time, and ends on a big one
            m.dir = 'down';
            m.walkT++;
            if (t === 104) this.emote('exclaim', 40);
            if (t % 14 === 0 && t > 20) {
              m.hop = 3;
              const left = t % 28 === 0;
              const fx = ms.x + (left ? -3 : 19), fy = ms.y + 2;
              this.ring(fx, fy, 1, 7, '#ffb45c', 10);
              this.fx({ kind: 'star', x: fx, y: fy, vx: left ? -0.8 : 0.8, vy: -0.7, g: 0.05, life: 18 });
              this.fx({ kind: 'flame', x: fx, y: fy - 2, vx: 0, vy: -0.6, life: 14 });
              A.sfx('kick');
            }
            if (t === 20) {
              m.hop = 7;
              this.ring(ms.x + 8, ms.y + 2, 2, 18, '#ffe14d', 14);
              this.burst(ms.x + 8, ms.y + 2, 'flame', 8, 1.3, { vyAdd: -0.4 });
              this.shake(4);
              this.emote('exclaim', 40);
              A.sfx('punch');
            }
            break;
          }
          case 'trip': // Honey trips over nothing, sees stars, and laughs it off
            if (t === 96) {
              m.hop = 5;
              this.emote('sweat', 50);
              this.setFace('surprise', 60);
              for (let i = 0; i < 4; i++) this.fx({ kind: 'dust', x: ms.x + 8 + E.rand(-6, 6), y: ms.y + 14, vx: E.rand(-0.6, 0.6), vy: -0.3, life: 20 });
              for (let i = 0; i < 3; i++) this.fx({ kind: 'orbit', cx: ms.x + 8, cy: ms.y - 10, ph: i * 2.1, life: 56 });
              A.sfx('drop');
            }
            if (t === 50) { this.emote('note', 40); this.aura(ms.x + 8, ms.y - 4, 5); }
            break;
          case 'dream': // Honey drifts off: daydream bubbles float up, and the last one pops
            if (t === 108) this.emote('dots', 80);
            if (t > 50 && t % 16 === 0) this.fx({ kind: 'bubble', x: ms.x + 12 + E.rand(-2, 2), y: ms.y - 10, vx: 0, vy: -0.35, sway: 0.25, ph: t, big: t % 32 === 0, life: 48 });
            if (t === 46) { this.emote('question', 50); m.dir = E.pick(['left', 'right']); this.ring(ms.x + 12, ms.y - 22, 1, 7, '#ffb8d8', 10); }
            break;
          case 'tidy': // Yukino straightens the room as she goes, and it gleams
            m.walkT++;
            if (t % 30 === 0) { m.dir = m.dir === 'left' ? 'right' : 'left'; this.fx({ kind: 'glint', x: ms.x + E.randi(0, 16), y: ms.y + E.randi(0, 12), life: 18 }); }
            if (t % 12 === 0) this.fx({ kind: 'dust', x: ms.x + (m.dir === 'left' ? -2 : 18), y: ms.y + 13, vx: m.dir === 'left' ? -0.5 : 0.5, vy: -0.1, life: 14 });
            if (t === 100) this.emote('note', 60);
            if (t === 10) this.aura(ms.x + 8, ms.y + 2, 6);
            break;
          case 'read':
            if (t === 100) this.emote('dots', 80);
            if (t % 34 === 0) this.fx({ kind: 'glint', x: ms.x + 8 + E.randi(-4, 4), y: ms.y - 2, vy: -0.2, life: 16 });
            break;
          case 'stare': // Yoru simply watches you, and the air goes quiet
            m.dir = 'down';
            if (t === 90) this.emote('dots', 70);
            if (t % 18 === 0) this.fx({ kind: 'petal', pal: 'night', x: ms.x + E.randi(-8, 24), y: ms.y - 16, vx: E.rand(-0.2, 0.2), vy: 0.35, sway: 0.3, ph: t, life: 60 });
            break;
          case 'blade': // Yoru practises a single cut: a flash, and the petals in the air fall in halves
            if (t === 40) {
              this.emote('sparkle', 40);
              this.fx({ kind: 'slash', x: ms.x - 16, y: ms.y - 8, life: 12 });
              this.flash('#ffffff', 4);
              this.shake(3);
              this.ring(ms.x - 4, ms.y + 4, 2, 12, '#c8b0ff', 12);
              this.burst(ms.x - 6, ms.y + 2, 'petal', 8, 1.2, { pal: 'night', g: 0.03, sway: 0.2 });
              A.sfx('slash');
            }
            if (t > 40 && t % 10 === 0) this.fx({ kind: 'petal', pal: 'night', x: ms.x + E.randi(-12, 20), y: ms.y - 14, vx: 0, vy: 0.3, sway: 0.3, ph: t, life: 50 });
            break;
          // (the four below join her moves once she knows you: G.TRAITS idleMore)
          case 'rope': { // Berry skips rope and counts her jumps; drawRope() swings it round her
            const a = ropeAngle(t);
            m.hop = Math.max(0, Math.cos(a)) * 5;
            if (t % 20 === 0 && t >= 20) { m.ropeN = (m.ropeN || 0) + 1; this.fx({ kind: 'text', x: ms.x + 8, y: ms.y - 22, text: String(m.ropeN), col: '#ffd23f', vy: -0.6, drag: 0.94, life: 24 }); }
            if (t % 20 === 15) this.fx({ kind: 'dust', x: ms.x + 8 + E.rand(-5, 5), y: ms.y + 14, vx: E.rand(-0.4, 0.4), vy: -0.2, life: 14 });
            if (t === 8) { this.emote('note', 60); this.setFace('happy', 50); m.ropeN = 0; }
            break;
          }
          case 'hum': // Honey hums a little tune, swaying from side to side
            if (t % 24 === 0 && t > 20) m.dir = m.dir === 'left' ? 'right' : 'left';
            if (t % 16 === 8) this.fx({ kind: 'note', x: ms.x + 8 + E.rand(-6, 6), y: ms.y - 10, vx: E.rand(-0.3, 0.3), vy: -0.5, col: '#ff8ab4', life: 40 });
            if (t === 20) { m.dir = 'down'; this.emote('heart', 60); this.setFace('happy', 60); }
            break;
          case 'tea': // Yukino takes a quiet cup of tea
            if (t % 10 === 0) this.fx({ kind: 'steam', x: ms.x + 11 + E.rand(-1, 1), y: ms.y + 1, vy: -0.35, life: 30 });
            if (t === 90) this.emote('note', 50);
            if (t === 40) { this.emote('heart', 60); this.setFace('blush', 50); }
            break;
          case 'nap': // Yoru dozes off on her feet, jolts awake, and insists she did not
            if (t > 44 && t % 28 === 0) this.fx({ kind: 'z', x: ms.x + 11, y: ms.y - 12, vx: 0.25, vy: -0.4, big: t % 56 === 0, life: 50 });
            if (t === 40) { m.hop = 4; this.emote('exclaim', 40); this.setFace('surprise', 24); A.sfx('pop'); }
            if (t === 24) this.speak(lines().napWake, 'blush', 'shy');
            break;
        }
        if (--m.poseT <= 0) { m.state = 'idle'; m.prop = null; m.idle = E.randi(90, 200); }
        return;
      }
      if (m.state === 'sleep' || m.state === 'hold') return;
      if (this.glove.act) return; // busy with you
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
      m.poseT = { blade: 70, rope: 150, hum: 140, tea: 150, nap: 170 }[kind] || 120;
      m.prop = kind === 'read' ? 'book' : kind === 'tea' ? 'cup' : null;
      if (['stare', 'punch', 'rope', 'tea', 'nap'].includes(kind)) m.dir = 'down';
      if (kind === 'hum') { m.dir = 'left'; this.setFace('happy', 130); }
      if (kind === 'blade') { m.dir = 'left'; this.setFace('angry', 60); }
      if (kind === 'dream') this.setFace('tired', 90);
      if (kind === 'nap') this.setFace('tired', 128);
      if (kind === 'tea') this.setFace('happy', 80);
      if (kind === 'rope') m.ropeN = 0;
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
      // once she loves you, now and then she comes over by herself and asks for a little attention
      if (this.bondTier() === 'high' && this.seekCD <= 0 && Math.random() < 0.2 && this.seek()) return;
      if (Math.random() < 0.34) {
        const kind = E.pick(this.bondTier() === 'low' ? tr.idle : tr.idle.concat(tr.idleMore || []));
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
            const life = { desk: ['study', 150], wardrobe: ['open', 150], teatable: ['steam', 150], plant: ['water', 48], plush: ['squish', 40], piano: ['keys', 150], fishbowl: ['watch', 150], dresser: ['mirror', 60], sofa: ['squish', 40], bed: ['bounce', 24], princess: ['bounce', 24], bookshelf: ['book', 34] }[p.id];
            if (life) this.furnStart(p, life[0], life[1]);
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
    // she walks to the free spot nearest the glove, looks up at you and asks (G.LINES seek); a pat soon after gets her
    // own answer (seekPat)
    seek() {
      const m = this.maid;
      const g = geom();
      const { grid } = occupancy();
      this.seekCD = 2400;
      const gc = clamp(Math.floor((this.glove.x - g.x0) / T), 0, g.w - 1), gr = clamp(Math.floor((this.glove.y + 8 - g.floorY) / T), 0, g.h - 1);
      const cands = [];
      for (let r = 0; r < g.h; r++) for (let c = 0; c < g.w; c++) if (!grid[r * g.w + c]) cands.push([c, r, Math.abs(c - gc) + Math.abs(r - gr)]);
      cands.sort((p, q) => p[2] - q[2]);
      const arrive = () => {
        m.dir = 'down';
        m.hop = 3;
        this.emote('heart', 90);
        this.speak(E.pick(lines().seek), 'happy', 'excited');
        this.seekT = 420;
      };
      for (const [c, r] of cands.slice(0, 8)) {
        if (c === m.c && r === m.r) { arrive(); return true; }
        if (this.walkTo(c, r, arrive)) return true;
      }
      return false;
    },
    // Berry's skipping rope, a curve through her hands: behind her going up, over her head, down in front, under her
    // feet at the top of her jump
    drawRope(ms, hop, a) {
      const x0 = ms.x + 1, x1 = ms.x + 14, hy = ms.y + 5 - hop;
      const c = Math.cos(a);
      const mid = c > 0 ? hy + (ms.y + 16 - hy) * c : hy + (hy - (ms.y - 13 - hop)) * c;
      let ly = null;
      for (let i = 0; i <= 26; i++) {
        const u = i / 26;
        const px = Math.round(x0 + (x1 - x0) * u), py = Math.round(hy + (mid - hy) * 4 * u * (1 - u));
        if (ly == null) E.rect(px, py, 1, 1, '#ff6f91');
        else E.rect(px, Math.min(py, ly + (py > ly ? 1 : -1)), 1, Math.max(1, Math.abs(py - ly)), '#ff6f91');
        ly = py;
      }
    },
    maidScreen() {
      const g = geom();
      return { x: Math.round(g.x0 + this.maid.x), y: Math.round(g.floorY + this.maid.y) };
    },
    sparkle(x, y) { this.particles.push({ kind: 'sparkle', x, y, t: 0, life: 24, vy: -0.4 }); },
    // ---- effects: particles keep kind, position, speed (vx, vy), gravity (g), drag, sway and a life in frames; a
    // negative t holds one back that long. shake() jolts the room, flash() washes it in a colour for a few frames.
    fx(p) {
      if (p.t == null) p.t = 0;
      this.particles.push(p);
      return p;
    },
    ring(x, y, r0, r1, col, life) { this.fx({ kind: 'ring', x, y, r0, r1, col, life: life || 16 }); },
    burst(x, y, kind, n, speed, extra) {
      const o = extra || {};
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + E.rand(-0.2, 0.2);
        const v = speed * E.rand(0.6, 1.1);
        this.fx(Object.assign({ kind, x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v + (o.vyAdd || -0.3), life: E.randi(24, 36), ph: i * 7 }, o));
      }
    },
    // her own particles (G.TRAITS aura): sparks and flames for Berry, bubbles and blossoms for Honey, snow and glints
    // for Yukino, dark petals for Yoru
    aura(x, y, n) {
      const kind = trait().aura;
      for (let i = 0; i < n; i++) {
        const ox = x + E.rand(-9, 9), oy = y + E.rand(-6, 6), ph = i * 9;
        if (kind === 'flame') {
          this.fx(i % 3 === 2
            ? { kind: 'star', x: ox, y: oy, vx: E.rand(-0.8, 0.8), vy: E.rand(-1.4, -0.6), g: 0.04, life: 24 }
            : { kind: 'flame', x: ox, y: oy, vx: E.rand(-0.3, 0.3), vy: E.rand(-1, -0.5), life: E.randi(16, 26) });
        } else if (kind === 'bubble') {
          this.fx(i % 3 === 2
            ? { kind: 'blossom', x: ox, y: oy, vx: E.rand(-0.4, 0.4), vy: E.rand(-0.8, -0.3), g: 0.02, sway: 0.2, ph, life: 40 }
            : { kind: 'bubble', x: ox, y: oy, vx: E.rand(-0.2, 0.2), vy: E.rand(-0.7, -0.35), sway: 0.3, ph, big: Math.random() < 0.3, life: E.randi(34, 50) });
        } else if (kind === 'snow') {
          this.fx(i % 3 === 2
            ? { kind: 'glint', x: ox, y: oy, life: 18 }
            : { kind: 'snow', x: ox, y: oy - 8, vx: E.rand(-0.3, 0.3), vy: E.rand(0.15, 0.4), sway: 0.3, ph, small: Math.random() < 0.4, life: E.randi(36, 52) });
        } else {
          this.fx({ kind: 'petal', pal: 'night', x: ox, y: oy - 6, vx: E.rand(-0.6, 0.6), vy: E.rand(-0.6, 0.1), g: 0.025, sway: 0.25, ph, life: E.randi(40, 56) });
        }
      }
    },
    auraColor() { return { flame: '#ffb45c', bubble: '#ffb8d8', snow: '#9fd8ff', night: '#b08ae0' }[trait().aura]; },
    confetti(x, y, n) {
      const cols = ['#ff6f91', '#ffd23f', '#6ad0ff', '#8ee07a', '#ffffff', '#c89aff'];
      for (let i = 0; i < n; i++) this.fx({ kind: 'confetti', x: x + E.rand(-4, 4), y, vx: E.rand(-1.6, 1.6), vy: E.rand(-2.4, -0.8), g: 0.06, drag: 0.98, sway: 0.2, ph: i * 5, col: E.pick(cols), life: E.randi(44, 70) });
    },
    floatText(x, y, text, col, delay) { this.fx({ kind: 'text', x, y, text, col, vy: -0.45, drag: 0.97, life: 72, t: -(delay || 0) }); },
    shake(n) { this.shakeT = Math.max(this.shakeT, n); },
    flash(col, frames) { this.flashFx = { col, t: 0, life: frames || 8 }; },
    // a big moment (her affection goes up a level): hearts, confetti, rings and a pink flash
    celebrate() {
      const ms = this.maidScreen();
      const x = ms.x + 8, y = ms.y - 6;
      this.hearts(x, y - 2, 10);
      this.confetti(x, y - 20, 36);
      this.ring(x, y, 3, 30, '#ff9fbb', 22);
      this.ring(x, y, 2, 18, '#ffffff', 16);
      this.aura(x, y, 10);
      this.fx({ kind: 'bigheart', tier: 'love', x, y: y - 16, vy: -0.4, life: 50 });
      this.flash('#ffc8e0', 12);
      this.shake(4);
    },
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

    // how close she is to you: 'low' while she barely knows you (Lv1-2), 'mid' once she trusts you (Lv3), 'high' when
    // she loves you (Lv4-5); touches answer in that key (lines in G.LINES *Low / *High, looks in G.TRAITS shy)
    bondTier() {
      const lv = B.affLevel(bond().aff);
      return lv <= 1 ? 'low' : lv >= 3 ? 'high' : 'mid';
    },
    tierLine(L, key, midKey) {
      const tier = this.bondTier();
      const pool = (tier === 'low' && L[key + 'Low']) || (tier === 'high' && L[key + 'High']) || L[midKey || key];
      return E.pick(pool);
    },
    // the look and the flourish that go with a touch: shy and small at first, glowing once she loves you
    tierReact(base) {
      const tier = this.bondTier();
      const tr = trait();
      const ms = this.maidScreen();
      const x = ms.x + 8, y = ms.y - 6;
      if (tier === 'low') return { face: tr.shy.face, emote: tr.shy.emote, hop: Math.min(2, base.hop || 0), hearts: 1, feel: 'shy' };
      if (tier === 'high') {
        this.fx({ kind: 'bigheart', tier: 'like', x, y: y - 16, vy: -0.35, life: 46 });
        this.aura(x, y, 6);
        return { face: 'blush', emote: 'heart', hop: (base.hop || 0) + 2, hearts: 7, love: true, feel: 'love' };
      }
      return { face: base.face, emote: base.emote, hop: base.hop || 0, hearts: 4, feel: base.feel || 'happy' };
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
        const re = this.tierReact(tr.pat);
        const asked = this.seekT > 0 && L.seekPat; // she came over asking for this
        this.seekT = 0;
        m.hop = re.hop;
        this.emote(re.emote, 80);
        this.speak(asked || this.tierLine(L, 'pat'), re.face, asked ? 'love' : re.feel);
        const ms = this.maidScreen();
        this.hearts(ms.x + 8, ms.y - 10, re.hearts + (asked ? 4 : 0));
        if (asked) this.gain('aff', 1);
        if (re.hearts > 1) this.aura(ms.x + 8, ms.y - 6, 5);
        this.ring(ms.x + 8, ms.y - 8, 2, 11, this.auraColor(), 12);
        A.sfx(re.love ? 'love' : 'pat');
      } else if (n < 6) {
        this.gain('aff', 1);
        this.gain('mood', 1);
        this.emote(tr.mood, 70);
        this.speak(this.tierLine(L, 'pat'), this.bondTier() === 'low' ? tr.shy.face : tr.pat.face, this.bondTier() === 'low' ? 'shy' : 'happy');
        this.aura(this.maidScreen().x + 8, this.maidScreen().y - 6, 2);
        A.sfx('pat');
      } else {
        this.gain('mood', -3);
        this.emote(tr.cross.emote, 90);
        this.speak(E.pick(L.patMany), tr.cross.face, 'angry');
        this.crossFx();
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
        const re = this.tierReact({ face: tr.poke.face, emote: tr.poke.emote, hop: 0 });
        this.emote(re.emote, 60);
        this.speak(this.tierLine(L, 'poke'), re.face, re.love ? 'tease' : 'surprise');
        if (re.love) A.sfx('love');
        const ms = this.maidScreen();
        this.ring(ms.x + 11, ms.y + 3, 1, 6, '#ffffff', 8);
        this.fx({ kind: 'star', x: ms.x + 13, y: ms.y + 2, vx: 0.6, vy: -0.8, g: 0.05, life: 16 });
        A.sfx('pat');
      } else if (n < 5) {
        this.gain('mood', 1);
        this.emote(tr.mood, 60);
        this.speak(this.tierLine(L, 'poke'), tr.pat.face, 'tease');
        A.sfx('pat');
      } else {
        this.gain('mood', -2);
        this.emote(tr.cross.emote, 80);
        this.speak(L.pokeMany, tr.cross.face, 'angry');
        this.crossFx();
        A.sfx('angry');
      }
      G.persist();
    },
    // ---- furniture that comes alive. One activity per placed piece ({ kind, t, dur }): drawFurniture() bounces,
    // squashes or dresses the piece up while it lasts, and furnitureTick() sends out what it gives off. Some things move
    // by themselves: the goldfish swims, a lit lamp glows once evening comes, a record turns while it plays.
    furnStart(p, kind, dur, extra) { if (p) this.furn.set(p, Object.assign({ kind, t: 0, dur: dur || 40 }, extra)); },
    placedOf(id) { return B.getRoom().placed.find((q) => q.id === id); },
    // where a piece is drawn on screen (its sprite's top-left and size)
    furnBox(p) {
      const g = geom();
      const F = G.FURNITURE[p.id];
      const img = E.spr.room.furniture[p.id];
      const x = g.x0 + p.c * T;
      const y = F.layer === 'floor' ? g.floorY + p.r * T : g.floorY + (p.r + F.h) * T - img.height;
      return { x, y, w: img.width, h: img.height };
    },
    // walk over to a piece and face it, then do fn (at once if she is already there, or cannot get there)
    goUse(p, fn) {
      const m = this.maid;
      if (m.state === 'pose' || m.state === 'use') { m.state = 'idle'; m.prop = null; }
      m.pauseT = 0;
      const spot = this.useSpot(p);
      const begin = () => { if (spot) m.dir = spot.face; fn(); };
      if (spot && !(spot.c === m.c && spot.r === m.r) && this.walkTo(spot.c, spot.r, begin)) this.mode = 'wait';
      else begin();
    },
    lampLit() { return B.roomHas('lamp') && !B.getRoom().lampOff; },
    // the glove flips the lamp's switch
    toggleLamp(p) {
      const room = B.getRoom();
      room.lampOff = !room.lampOff;
      this.furnStart(p, 'flicker', 14);
      A.sfx('remote');
      const b = this.furnBox(p);
      if (!room.lampOff) {
        this.ring(b.x + 8, b.y + 5, 2, 14, '#ffe6a0', 14);
        this.fx({ kind: 'glint', x: b.x + 8, y: b.y + 5, life: 16 });
      }
      this.emote(room.lampOff ? 'dots' : 'sparkle', 60);
      if (!this.furnSay('lamp')) this.speak(G.t(room.lampOff ? '關燈了。……房間暗下來了呢。' : '燈光好溫暖呢。'), 'normal');
      G.persist();
    },
    // a book slides out of the shelf, glowing, before the diary opens
    openShelf(p) {
      this.furnStart(p, 'book', 34);
      A.sfx('select');
      this.anim = { kind: 'wait', t: 0, dur: 24, then: () => this.openDiary() };
      this.mode = 'anim';
    },
    furnitureTick() {
      for (const [p, a] of this.furn) if (++a.t >= a.dur) this.furn.delete(p);
      if (this.recordOn && A.trackName !== 'lullaby') this.recordOn = false;
      for (const p of B.getRoom().placed) {
        const a = this.furn.get(p);
        const b = this.furnBox(p);
        if (p.id === 'fishbowl') this.fishTick(b, a);
        if (p.id === 'gramophone' && this.recordOn && this.t % 36 === 0) {
          this.fx({ kind: 'note', x: b.x + 8 + E.rand(-3, 3), y: b.y + 2, vx: E.rand(-0.4, 0.4), vy: -0.5, sway: 0.2, ph: this.t, life: 50, col: E.pick(['#ec3d5f', '#e0a010', '#3d86f0', '#8a6ac0']) });
        }
        if (!a) continue;
        const t = a.t;
        switch (a.kind) {
          case 'steam': // tea on the table
            if (t % 10 === 0) this.fx({ kind: 'steam', x: b.x + 6 + E.rand(0, 2), y: b.y + 3, vx: 0, vy: -0.35, life: 30 });
            if (t === 1) this.fx({ kind: 'glint', x: b.x + 7, y: b.y + 3, life: 14 });
            break;
          case 'sleep': // z's rising from the bed
            if (t % 44 === 10) this.fx({ kind: 'z', x: b.x + b.w / 2 + 2, y: b.y + 4, vx: 0.25, vy: -0.35, sway: 0.3, ph: t, big: t % 88 === 10, life: 60 });
            break;
          case 'study': // papers fly off the desk under the lamp
            if (t % 18 === 0) this.fx({ kind: 'paper', x: b.x + 4 + E.rand(0, 3), y: b.y + 8, vx: E.rand(-0.4, 0.4), vy: -0.7, g: 0.03, sway: 0.4, ph: t, life: 36 });
            if (t % 30 === 15) this.fx({ kind: 'glint', x: b.x + 12, y: b.y + 2, life: 14 });
            break;
          case 'water': // drops rain on the leaves, then a flower pops open
            if (t < 30 && t % 3 === 0) this.fx({ kind: 'drop', x: b.x + E.rand(2, 13), y: b.y - 14, vx: 0, vy: 1.1, g: 0.06, life: 14 });
            if (t === 32) {
              for (let i = 0; i < 3; i++) this.fx({ kind: 'glint', x: b.x + E.rand(2, 14), y: b.y + E.rand(1, 11), life: 16 + i * 4 });
              this.fx({ kind: 'blossom', x: b.x + 8, y: b.y + 2, vy: -0.5, g: 0.01, sway: 0.2, ph: t, life: 40 });
            }
            break;
          case 'squish': // the plush gives out hearts, the sofa a puff of dust
            if (t === 1) {
              if (p.id === 'plush') this.hearts(b.x + 8, b.y + 6, 3);
              else for (const dx of [6, b.w - 6]) this.fx({ kind: 'dust', x: b.x + dx, y: b.y + b.h - 8, vx: dx < 10 ? -0.5 : 0.5, vy: -0.3, life: 16 });
            }
            break;
          case 'glow': // hearts rise off the rug
            if (t % 6 === 0 && t < 30) this.fx({ kind: 'heart', x: b.x + E.rand(4, b.w - 4), y: b.y + E.rand(4, b.h - 4), vy: -0.6, life: 30 });
            break;
          case 'mirror':
            if (t === 12 || t === 30) this.fx({ kind: 'glint', x: b.x + E.rand(5, 10), y: b.y + E.rand(2, 8), life: 16 });
            break;
          case 'open':
            if (t === 9) this.fx({ kind: 'glint', x: b.x + 8, y: b.y + 10, life: 16 });
            break;
          case 'book':
            if (t % 5 === 0 && t < 24) this.fx({ kind: 'glint', x: b.x + 8 + E.rand(-5, 5), y: b.y + 12 - t * 0.8, life: 12 });
            break;
          case 'bounce':
            if (t === 1) for (const dx of [3, b.w - 3]) this.fx({ kind: 'dust', x: b.x + dx, y: b.y + b.h - 1, vx: dx < 10 ? -0.4 : 0.4, vy: -0.2, life: 14 });
            break;
        }
      }
    },
    // the goldfish swims to and fro, blowing a bubble now and then; fed, it darts up for the flakes; watched, it comes
    // to the glass
    fishTick(b, a) {
      const f = this.fish || (this.fish = { x: 3, y: 8, dir: -1, t: 0, tail: 0 });
      f.t++;
      const feeding = a && a.kind === 'feed';
      let tx, ty;
      if (feeding && a.t > 6) { tx = a.fx != null ? a.fx : 3; ty = 6; }
      else if (a && a.kind === 'watch') { tx = 3; ty = 8 + Math.round(Math.sin(f.t * 0.2)); }
      else { tx = 3.5 + 2.6 * Math.sin(f.t * 0.017); ty = 8 + Math.sin(f.t * 0.045) * 1.2; }
      tx = Math.max(1, Math.min(6, tx));
      const sp = feeding ? 0.25 : 0.12;
      const dx = tx - f.x;
      f.x += Math.max(-sp, Math.min(sp, dx));
      f.y += Math.max(-sp, Math.min(sp, ty - f.y));
      if (Math.abs(dx) > 0.05) f.dir = dx < 0 ? -1 : 1;
      f.tail = (f.t >> (feeding ? 2 : 3)) % 2;
      if (f.t % (feeding ? 12 : 80) === 0) {
        const mx = f.dir < 0 ? f.x : f.x + 8;
        this.fx({ kind: 'fbubble', x: b.x + mx, y: b.y + f.y, vy: -0.25, sway: 0.15, ph: f.t, life: Math.max(6, Math.round((f.y - 5) / 0.25)) });
      }
      if (feeding) {
        if (a.t < 18 && a.t % 3 === 0) {
          const x = E.rand(3, 12);
          a.fx = x - 4;
          this.fx({ kind: 'flake', x: b.x + x, y: b.y + 6, vy: 0.08, sway: 0.2, ph: a.t, life: 40 });
        }
        if (a.t === 40) { this.ring(b.x + f.x + 4, b.y + 6, 1, 6, '#ffffff', 10); A.sfx('water'); }
      }
    },
    // enough is enough: each one shows it her own way
    crossFx() {
      const ms = this.maidScreen();
      const x = ms.x + 8, y = ms.y - 6;
      const kind = trait().aura;
      if (kind === 'flame') { this.burst(x, y, 'flame', 6, 1, {}); this.shake(2); } // Berry flares up
      else if (kind === 'bubble') this.burst(x, y - 4, 'bubble', 4, 0.6, { sway: 0.2 }); // Honey fizzles
      else if (kind === 'snow') this.ring(x, y, 14, 4, '#9fd8ff', 14); // Yukino goes cool
      else { this.ring(x, y, 16, 3, '#6a3a90', 14); this.fx({ kind: 'petal', pal: 'night', x, y: y - 8, vy: 0.3, sway: 0.3, life: 40 }); } // Yoru goes cold
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
          const re = this.tierReact(trait().five);
          m.hop = re.hop;
          A.sfx(re.love ? 'love' : 'kick');
          for (let i = 0; i < 8; i++) {
            const ang = (i / 8) * Math.PI * 2;
            this.particles.push({ kind: 'sparkle', x: ms.x + 15, y: ms.y - 13, vx: Math.cos(ang) * 1.3, vy: Math.sin(ang) * 1.3 - 0.4, t: 0, life: 26 });
          }
          this.ring(ms.x + 15, ms.y - 13, 2, 14, '#ffe14d', 12);
          this.fx({ kind: 'glint', x: ms.x + 15, y: ms.y - 13, life: 14 });
          this.aura(ms.x + 8, ms.y - 4, 6);
          this.shake(3);
          if (a.n < 3) { this.gain('aff', 2); this.gain('mood', 4); }
          this.emote(re.emote, 80);
          this.speak(this.tierLine(L, 'five', 'highFive'), re.face, re.feel === 'shy' ? 'shy' : 'excited');
        }
      } else if (a.kind === 'tickle') {
        if (a.t % 14 === 0) m.hop = 2;
        if (a.t % 22 === 0) this.particles.push({ kind: 'note', x: ms.x + E.rand(-4, 14), y: ms.y - 12, vy: -0.6, t: 0, life: 36 });
        if (a.t % 18 === 9) this.aura(ms.x + 8, ms.y - 2, 1);
        if (a.t === 10) {
          if (a.n < 3) {
            const re = this.tierReact(trait().tickle);
            this.emote(re.emote, 90);
            this.speak(this.tierLine(L, 'tickle'), re.face, re.feel === 'shy' ? 'panic' : 'happy');
          } else {
            this.emote('sweat', 90);
            this.speak(L.tickleMany, 'tired', 'tired');
          }
          A.sfx('pat');
        }
        if (a.t === a.dur - 1 && a.n < 3) { this.gain('aff', 2); this.gain('mood', 5); }
      } else if (a.kind === 'hand') {
        if (!a.ending) {
          // she follows the glove from tile to tile
          const g = geom();
          const gl = this.glove;
          if (a.t % 6 === 0) {
            // she walks to the spot just left of the glove, so it holds her right hand instead of covering her
            const c = clamp(Math.floor((gl.x - 23 - g.x0) / T), 0, g.w - 1), r = Math.floor((gl.y + 13 - g.floorY) / T);
            const key = c + ',' + r;
            if (c >= 0 && r >= 0 && c < g.w && r < g.h && key !== a.goal) {
              a.goal = key;
              if (c === m.c && r === m.r) { if (m.state === 'walk') m.path = [[c, r]]; }
              else if (!this.walkTo(c, r)) a.goal = null;
            }
          }
          if (a.t % 40 === 20) this.hearts(ms.x + 8, ms.y - 10, 1);
          if (a.t % 56 === 0) this.fx({ kind: 'note', x: ms.x + E.rand(0, 12), y: ms.y - 12, vy: -0.5, col: this.auraColor(), life: 34 });
          if (a.t >= a.dur - 1) this.letGo(a);
        } else if (m.state !== 'walk') m.dir = 'down';
      } else if (a.kind === 'photo') {
        const P = PHOTO_POSE[maidKey()] || PHOTO_POSE.berry;
        const high = this.bondTier() === 'high';
        if (a.t === 24) {
          const pose = high ? P.high : P.mid;
          A.sfx('shutter');
          this.flash('#ffffff', 10);
          a.emo = UI.feelPic(maidKey(), high ? 'photoHigh' : 'photo');
          this.setFace(pose[1], a.dur - 50);
          if (pose[2]) m.dir = pose[2];
          m.hop = pose[3];
          if (high) this.hearts(ms.x + 8, ms.y - 10, 3);
        }
        if (a.t === a.dur - 30) {
          m.dir = 'down';
          this.speak(this.tierLine(L, 'photo'), high ? 'blush' : P.mid[1], high ? 'photoHigh' : 'photo');
          this.emote(high ? 'heart' : trait().mood, 70);
          if (a.n < 2) { this.gain('aff', 3); this.gain('mood', 2); }
          G.persist();
        }
      } else if (a.kind === 'hug') {
        const H = HUG[maidKey()] || HUG.berry;
        if (a.t === 4) { m.hop = H.hop; this.emote(H.first, 40); this.setFace(H.face, 30); }
        if (a.t === 14) {
          A.sfx('love');
          this.flash('#ffc8e0', 14);
          this.fx({ kind: 'bigheart', tier: 'love', x: ms.x + 8, y: ms.y - 26, vy: -0.3, life: 60 });
          this.hearts(ms.x + 8, ms.y - 6, 8);
          this.ring(ms.x + 8, ms.y + 2, 3, 22, '#ff9fbb', 18);
          this.aura(ms.x + 8, ms.y - 4, 6);
          this.shake(2);
        }
        if (a.t === 30) {
          this.emote('heart', 90);
          this.speak(E.pick(L.hug), 'blush', 'hug');
          if (a.n < 2) { this.gain('aff', 4); this.gain('mood', 4); }
          G.persist();
        }
        if (a.t > 30 && a.t < 100 && a.t % 22 === 0) this.hearts(ms.x + 8, ms.y - 12, 1);
      }
      if (a.t >= a.dur) this.glove.act = null;
    },
    talk() {
      const k = maidKey();
      const L = lines(k);
      if (this.daily('talk') >= 3) { this.say([{ who: k, face: 'normal', text: L.talkMany }]); return; }
      this.bumpDaily('talk');
      // now and then she asks you something and waits for your answer
      if (L.ask && L.ask.length && Math.random() < 0.4) return this.ask(k, L);
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
      // what you already know of her taste shows beside each gift; the line at the bottom says what the gift does
      const known = (S.tastes && S.tastes[maidKey()]) || {};
      this.openMenu(G.t('送什麼禮物？'), owned.map((g) => ({
        label: g.name + ' ×' + S.gifts[g.id],
        icon: E.spr.room.gifts[g.id],
        badge: E.spr.ui.taste[known[g.id] || 'unknown'],
        desc: g.desc,
        action: () => this.giveGift(g),
      })));
    },
    // the present comes down to her wrapped, pops open, and she reacts the way her taste says (G.TRAITS taste):
    // her favourite gets hearts, confetti and a pink flash; a gift she likes, hearts; the one that does not land, a
    // little grey cloud. Then she says so, and the gift does what it does (applyGift).
    giveGift(g) {
      const S = save();
      const k = maidKey();
      const L = lines(k);
      if (this.daily('gift') >= 2) { this.say([{ who: k, face: 'normal', text: L.giftMany }]); return; }
      S.gifts[g.id]--;
      this.bumpDaily('gift');
      const m = this.maid;
      if (m.state === 'walk' || m.state === 'pose' || m.state === 'use') { m.state = 'idle'; m.prop = null; }
      m.path = [];
      m.pauseT = 0;
      m.dir = 'down';
      m.speech = null;
      this.anim = { kind: 'gift', g, taste: G.tasteOf(k, g.id), t: 0, dur: 92 };
      this.mode = 'anim';
      A.sfx('select');
      G.persist();
    },
    updateGiftAnim(an) {
      const m = this.maid;
      const ms = this.maidScreen();
      const x = ms.x + 8, top = ms.y - 30;
      m.dir = 'down';
      if (an.t === 24) { A.sfx('place'); this.fx({ kind: 'dust', x: x - 6, y: top + 13, vx: -0.4, vy: -0.2, life: 12 }); this.fx({ kind: 'dust', x: x + 6, y: top + 13, vx: 0.4, vy: -0.2, life: 12 }); }
      if (an.t === 36) { // it pops open
        this.fx({ kind: 'lid', x, y: top + 3, vx: E.pick([-0.7, 0.7]), vy: -1.8, g: 0.1, life: 30 });
        this.ring(x, top + 6, 2, 16, '#ffffff', 12);
        this.burst(x, top + 6, 'glint', 6, 1.1, { life: 18 });
        this.confetti(x, top + 4, 10);
        this.flash('#ffffff', 4);
        A.sfx('pop');
      }
      if (an.t === 52) {
        this.giftReaction(an.taste);
        const S = save();
        S.tastes = S.tastes || {};
        const k = maidKey();
        S.tastes[k] = S.tastes[k] || {};
        S.tastes[k][an.g.id] = an.taste === 'secret' ? 'like' : an.taste;
      }
      if (an.t > 52 && an.t < 76 && an.t % 8 === 0) this.fx({ kind: 'glint', x: x + E.randi(-10, 10), y: top - 12 + E.randi(-6, 6), life: 14 });
      if (an.t >= an.dur) {
        this.anim = null;
        m.state = 'idle';
        const k = maidKey();
        const L = lines(k);
        const g = an.g;
        const taste = an.taste;
        const text = taste === 'love' ? L.giftLike
          : taste === 'like' ? L.giftFond.replace('{gift}', g.name)
          : taste === 'meh' ? L.giftMeh
          : taste === 'secret' ? L.giftSecret[0]
          : L.giftNormal;
        const face = { love: 'blush', like: 'happy', normal: 'happy', meh: 'tired', secret: 'normal' }[taste];
        const feel = { love: 'gift', like: 'happy', normal: 'happy', meh: 'meh', secret: 'calm' }[taste];
        this.say([{ who: k, face, text, feel }], () => this.applyGift(g, taste));
      }
    },
    giftReaction(taste) {
      const m = this.maid;
      const ms = this.maidScreen();
      const x = ms.x + 8, y = ms.y - 6;
      if (taste === 'love') {
        m.hop = 8;
        this.setFace('surprise', 40);
        this.emote('heart', 120);
        this.fx({ kind: 'bigheart', tier: 'love', x, y: y - 28, vy: -0.25, life: 60 });
        this.hearts(x, y, 10);
        this.aura(x, y, 12);
        this.confetti(x, y - 26, 28);
        this.ring(x, y, 3, 26, '#ff9fbb', 20);
        this.ring(x, y, 2, 14, '#ffffff', 14);
        this.flash('#ffc8e0', 12);
        this.shake(5);
        A.sfx('love');
      } else if (taste === 'like') {
        m.hop = 5;
        this.setFace('happy', 60);
        this.emote('heart', 100);
        this.fx({ kind: 'bigheart', tier: 'like', x, y: y - 28, vy: -0.3, life: 50 });
        this.hearts(x, y, 5);
        this.aura(x, y, 8);
        this.ring(x, y, 2, 16, this.auraColor(), 16);
        A.sfx('gift');
      } else if (taste === 'normal') {
        m.hop = 2;
        this.setFace('happy', 60);
        this.emote('sparkle', 90);
        this.aura(x, y, 4);
        this.burst(x, y - 10, 'sparkle', 6, 1, {});
        A.sfx('pat');
      } else if (taste === 'meh') {
        this.setFace('tired', 90);
        this.emote('sweat', 100);
        this.fx({ kind: 'gloom', x: x - 7, y: y - 12, vy: -0.03, life: 80 });
        A.sfx('meh');
      } else { // Yoru's secret: she acts as if it were nothing
        this.emote('dots', 100);
        A.sfx('tick');
      }
    },
    // what the gift does: her affection (by taste), then whatever the shop promised, each shown floating up over her
    applyGift(g, taste) {
      const S = save();
      const b = bond();
      const k = maidKey();
      const L = lines(k);
      const TS = G.GIFT_TASTE[taste];
      const ms = this.maidScreen();
      const x = ms.x + 8, y = ms.y - 14;
      const pops = [];
      const aff = Math.max(1, Math.round(g.aff * TS.aff));
      this.gain('aff', aff);
      pops.push([G.t('好感度 +{n}', { n: aff }), '#ff9fbb']);
      const mood = Math.min(100, (g.mood || 0) + TS.mood);
      if (mood) { this.gain('mood', mood); pops.push([G.t('心情 +{n}', { n: mood }), '#ffe14d']); }
      if (g.stamina) { this.gain('stamina', g.stamina); pops.push([G.t('體力 +{n}', { n: g.stamina }), '#8ee07a']); }
      if (g.exp) {
        for (const id of Object.keys(g.exp)) {
          const tr = G.TRAININGS.find((q) => q.id === id);
          const before = B.trainLevel(b.exp[id]);
          b.exp[id] += g.exp[id];
          pops.push([G.t('{name} +{n}', { name: tr.name, n: g.exp[id] }), '#9fd8ff']);
          if (B.trainLevel(b.exp[id]) > before) { this.toast(G.t('{name} 升到 Lv{n}！', { name: tr.name, n: B.trainLevel(b.exp[id]) }), C.mint); A.sfx('levelup'); }
        }
      }
      if (g.buff) {
        S.buffs[g.buff] = true;
        this.toast(G.t('御守：下次委託撐住一次致命傷'), C.gold);
      }
      pops.forEach(([text, col], i) => this.floatText(x, y - i * 2, text, col, i * 14));
      if (taste === 'secret') {
        this.speak(L.giftSecret[1], 'blush', 'shy');
        this.emote('heart', 90);
        this.fx({ kind: 'bigheart', tier: 'like', x, y: y - 16, vy: -0.3, life: 44 });
      } else {
        const use = g.stamina ? 'stamina' : g.exp ? 'study' : g.buff ? 'charm' : g.mood ? 'mood' : null;
        if (use) this.speak(L.giftUse[use], taste === 'meh' ? 'normal' : 'happy');
      }
      if (g.stamina) this.aura(x, y + 8, 5);
      G.persist();
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
      // bomb research happens at the desk: its lamp comes on and papers fly while she works
      const desk = tr.anim === 'study' ? this.placedOf('desk') : null;
      if (desk) this.goUse(desk, () => { this.beginTraining(tr, true); this.furnStart(desk, 'study', 150); });
      else this.beginTraining(tr, false);
    },
    beginTraining(tr, atDesk) {
      const k = maidKey();
      const m = this.maid;
      m.path = [];
      m.state = 'hold';
      if (!atDesk) m.dir = 'down';
      this.speak(lines(k).train, 'happy');
      this.anim = { kind: 'train', tr, t: 0, dur: 150, atDesk };
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
      const ms = this.maidScreen();
      this.ring(ms.x + 8, ms.y + 2, 2, after > before ? 22 : 14, this.auraColor(), 16);
      this.aura(ms.x + 8, ms.y - 2, after > before ? 10 : 5);
      if (after > before) this.confetti(ms.x + 8, ms.y - 20, 24);
      if (after > before) A.sfx('levelup'); else A.sfx('item');
      this.guideDone('train');
      G.persist();
    },
    teaTime() {
      const k = maidKey();
      const S = save();
      if (this.daily('tea') >= 1) { this.furnSay('tea', true); return; }
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
        this.furnSay('tea');
        this.furnStart(p, 'steam', 120);
      };
      if (spot && !(spot.c === this.maid.c && spot.r === this.maid.r) && this.walkTo(spot.c, spot.r, begin)) this.mode = 'wait';
      else begin();
    },
    playPiano() {
      if (this.daily('piano') >= 1) { this.furnSay('piano', true); return; }
      this.bumpDaily('piano');
      const p = B.getRoom().placed.find((q) => q.id === 'piano');
      const spot = this.useSpot(p);
      const begin = () => {
        if (spot) this.maid.dir = spot.face;
        this.maid.state = 'hold';
        this.anim = { kind: 'piano', t: 0, dur: 160 };
        this.mode = 'anim';
        this.furnSay('piano');
        this.furnStart(p, 'keys', 160, { step: (trait().furn && trait().furn.pianoStep) || 20 });
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
        this.lockItem(4, G.t('悄悄話'), () => this.whisper()),
        { label: G.t('互動'), note: '▶', action: () => this.touchMenu() },
        { label: G.t('送禮物'), action: () => this.giftMenu() },
        { label: G.t('特訓'), action: () => this.trainMenu() },
      ];
      if (B.roomHas('teatable')) items.push({ label: G.t('一起喝茶（30G）'), action: () => this.teaTime() });
      items.push({ label: G.t('查看成長日記'), action: () => this.openDiary() });
      items.push({ label: G.t('取消'), action: () => {} });
      this.openMenu(G.t('{name}　好感 Lv{lv}', { name: name(), lv: affInfo().lv + 1 }), items);
    },
    // What she lets you do grows with her affection (G.AFF_LEVELS unlock): until then the item shows the level it opens
    // at, and choosing it she tells you it is too soon.
    lockItem(need, label, action) {
      if (affInfo().lv >= need) return { label, action };
      return { label, note: 'Lv' + (need + 1), disabled: true, deny: () => this.say([{ who: maidKey(), face: maidKey() === 'yoru' ? 'normal' : 'blush', text: lines().locked, feel: 'locked' }]) };
    },
    touchMenu() {
      this.openMenu(G.t('和{name}互動', { name: name() }), [
        { label: G.t('擊掌'), action: () => this.highFive() },
        { label: G.t('搔癢'), action: () => this.tickle() },
        this.lockItem(1, G.t('牽手散步'), () => this.holdHands()),
        this.lockItem(2, G.t('拍照'), () => this.photo()),
        this.lockItem(3, G.t('抱抱'), () => this.hug()),
        { label: G.t('取消'), action: () => {} },
      ]);
    },
    // she stops whatever she was doing (sweeping, a little move, a walk) and gives you her attention
    stopMaid() {
      const m = this.maid;
      if (m.state === 'sleep') return;
      m.state = 'idle';
      m.prop = null;
      m.pose = null;
      m.path = [];
      m.dir = 'down';
    },
    // hand in hand (Lv2): she takes the glove's hand and follows wherever you lead it, until you let go
    holdHands() {
      this.stopMaid();
      this.touchStart('hand', 900);
      const re = this.tierReact(trait().pat);
      this.emote(re.emote, 70);
      this.maid.hop = 2;
      A.sfx(re.love ? 'love' : 'pat');
      G.persist();
    },
    letGo(a) {
      const m = this.maid;
      a.ending = true;
      a.dur = a.t + 60;
      if (m.path.length > 1) m.path = m.path.slice(0, 1); // she finishes the step she is on
      const re = this.tierReact(trait().pat);
      this.emote(re.emote, 80);
      this.speak(this.tierLine(lines(), 'hand'), re.face, re.feel);
      const ms = this.maidScreen();
      this.hearts(ms.x + 8, ms.y - 10, re.hearts);
      if (a.n < 2) { this.gain('aff', 3); this.gain('mood', 3); }
      G.persist();
    },
    // a photo (Lv3): the viewfinder closes on her, the shutter flashes, and the print develops in front of you; how she
    // poses depends on how close you are (PHOTO_POSE)
    photo() {
      this.stopMaid();
      this.touchStart('photo', 250);
      A.sfx('select');
    },
    // a hug (Lv4): she comes into the glove's arms and it holds her close; each takes it her own way (HUG)
    hug() {
      this.stopMaid();
      this.touchStart('hug', 130);
    },
    // a whisper (Lv5): she leans in and tells you something she tells no one else, a different secret each time
    whisper() {
      const k = maidKey();
      const L = lines(k);
      const b = bond();
      this.stopMaid();
      this.maid.hop = 3;
      const first = this.daily('whisper') < 1;
      this.bumpDaily('whisper');
      const secret = L.whisper[(b.whispers || 0) % L.whisper.length];
      b.whispers = (b.whispers || 0) + 1;
      this.say([{ who: k, face: 'blush', text: L.whisperIn, feel: 'whisper' }, { who: k, face: 'blush', text: secret, feel: 'love' }], () => {
        const ms = this.maidScreen();
        this.hearts(ms.x + 8, ms.y - 10, 6);
        this.aura(ms.x + 8, ms.y - 4, 6);
        this.emote('heart', 90);
        A.sfx('love');
        if (first) { this.gain('aff', 4); this.gain('mood', 3); }
        G.persist();
      });
    },
    // one of her questions (in turn, so she does not repeat herself); your answer gets her reply
    ask(k, L) {
      const b = bond();
      b.asked = (b.asked || 0) + 1;
      const Q = L.ask[b.asked % L.ask.length];
      this.say([{ who: k, face: 'normal', text: Q.q, feel: 'ask' }], () => {
        this.openMenu(G.t('怎麼回答？'), Q.a.map(([label, reply, good]) => ({
          label,
          action: () => this.say([{ who: k, face: good ? 'happy' : 'surprise', text: reply, feel: good ? 'happy' : 'miss' }], () => {
            const ms = this.maidScreen();
            if (good) { this.hearts(ms.x + 8, ms.y - 10, 4); this.aura(ms.x + 8, ms.y - 4, 4); A.sfx('pat'); }
            else this.emote(trait().mood, 70);
            this.gain('aff', good ? 3 : 1);
            this.gain('mood', 2);
            this.guideDone('talk');
            G.persist();
          }),
        })), { x: 176, y: 110 });
      });
    },
    // A click on furniture: the piece answers at once (a bounce, a squash, the lamp's switch), and for the things she
    // does with it she walks over first; done for the day, the piece still answers.
    // what she says at a piece of furniture (G.LINES[maid].furn), or when there is nothing left to do there today
    furnSay(kind, done) {
      const L = lines();
      const tr = trait().furn || {};
      const text = done ? L.furnDone : L.furn && L.furn[kind];
      if (!text) return false;
      this.speak(text, done ? 'normal' : tr.face || 'happy', done ? null : tr.feel || 'happy');
      return true;
    },
    later(frames, fn) { this.timers.push({ t: frames, fn }); },
    // and how she moves: her emote and particles, then her own flair — Berry throws herself at it and the room shakes,
    // Honey only notices a beat later, Yukino finishes with a glint and a curtsy, Yoru waits, looks, and lets it go.
    // At the pieces she stays at, she then falls into a pose of her own (G.TRAITS[maid].furn.pose).
    furnFlair(kind, pose, piece) {
      const tr = trait().furn || {};
      const ms = this.maidScreen();
      const x = ms.x + 8, y = ms.y - 2;
      if (tr.emote) this.emote(tr.emote, 80);
      if (tr.hop) this.maid.hop = tr.hop;
      this.aura(x, y, tr.aura || 4);
      const pose2 = () => { const p = pose && tr.pose && tr.pose[kind]; if (p) this.startPose(p); };
      switch (tr.flair) {
        case 'burst': // Berry: a whack, stars, and the piece rocks with her
          this.shake(3);
          this.burst(x, y - 6, 'star', 5, 1.2);
          if (piece) this.furnStart(piece, 'bounce', 26);
          this.later(16, () => { this.maid.hop = 4; this.emote('exclaim', 40); });
          pose2();
          break;
        case 'late': // Honey: a blank moment, then it dawns on her
          this.later(38, () => {
            this.emote('question', 46);
            this.setFace('surprise', 46);
            this.fx({ kind: 'blossom', x: x + E.rand(-6, 6), y: y - 4, vx: E.rand(-0.3, 0.3), vy: -0.4, sway: 0.25, life: 44 });
            this.later(26, pose2);
          });
          break;
        case 'glint': // Yukino: a last tidy, a glint, a small curtsy
          this.fx({ kind: 'glint', x: x + 6, y: y - 8, life: 20 });
          this.ring(x, y + 8, 3, 16, '#dceaff', 18);
          this.later(20, () => { this.maid.hop = 2; this.emote('heart', 40); pose2(); });
          break;
        case 'pause': // Yoru: she waits, looks, and a petal falls
          this.later(24, () => {
            this.emote('dots', 52);
            for (let i = 0; i < 4; i++) this.fx({ kind: 'petal', pal: 'night', x: x + E.rand(-10, 10), y: y - 12, vx: E.rand(-0.2, 0.2), vy: 0.32, sway: 0.3, ph: i * 9, life: 60 });
            this.later(18, pose2);
          });
          break;
        default: pose2();
      }
    },
    furnitureAction(p) {
      const F = G.FURNITURE[p.id];
      const b = this.furnBox(p);
      switch (F.use) {
        case 'sleep': this.furnStart(p, 'bounce', 24); this.furnSay('sleep'); return this.sleepConfirm();
        case 'train': this.furnStart(p, 'bounce', 20); this.furnSay('train'); return this.trainMenu();
        case 'wardrobe': this.furnStart(p, 'open', 120); A.sfx('door'); this.furnSay('wardrobe'); return this.wardrobeMenu();
        case 'tea': return this.teaTime();
        case 'diary': this.furnSay('diary'); return this.openShelf(p);
        case 'piano': return this.playPiano();
        case 'lamp': this.furnFlair('lamp', true, p); return this.toggleLamp(p); // toggleLamp says her line
        case 'water':
          if (this.daily('water') >= 1) { this.furnStart(p, 'bounce', 20); this.furnSay('water', true); return; }
          return this.goUse(p, () => {
            this.bumpDaily('water');
            this.gain('mood', 4);
            this.emote('sparkle', 90);
            A.sfx('water');
            this.furnStart(p, 'water', 48);
            this.furnSay('water');
            this.furnFlair('plant', true, p);
            G.persist();
          });
        case 'hug':
          if (this.daily('hug') >= 1) { this.furnStart(p, 'squish', 30); this.furnSay('hug', true); return; }
          return this.goUse(p, () => {
            this.bumpDaily('hug');
            this.gain('mood', 5);
            this.emote('heart', 90);
            this.furnStart(p, 'squish', 44);
            this.hearts(b.x + 8, b.y + 4, 3);
            A.sfx('pat');
            this.furnSay('hug');
            this.furnFlair('plush', true, p);
            G.persist();
          });
        case 'fish':
          if (this.daily('fish') >= 1) { this.furnStart(p, 'watch', 60); this.furnSay('fish', true); return; }
          return this.goUse(p, () => {
            this.bumpDaily('fish');
            this.gain('mood', 4);
            this.emote('note', 90);
            A.sfx('water');
            this.furnStart(p, 'feed', 90);
            this.furnSay('fish');
            this.furnFlair('fish', true, p);
            G.persist();
          });
        case 'dresser':
          if (this.daily('dress') >= 1) { this.furnStart(p, 'mirror', 50); this.furnSay('dresser', true); return; }
          return this.goUse(p, () => {
            this.bumpDaily('dress');
            this.gain('mood', 6);
            this.emote('sparkle', 90);
            A.sfx('gift');
            this.furnStart(p, 'mirror', 60);
            this.furnSay('dresser');
            this.furnFlair('dresser', true, p);
            G.persist();
          });
        case 'sofa':
          if (this.daily('sofa') >= 1) { this.furnStart(p, 'squish', 30); this.furnSay('sofa', true); return; }
          return this.goUse(p, () => {
            this.bumpDaily('sofa');
            this.gain('stamina', 15);
            this.emote('zzz', 90);
            A.sfx('pat');
            this.furnStart(p, 'squish', 44);
            this.furnSay('sofa');
            this.furnFlair('sofa', true, p);
            this.toast(G.t('體力 +{n}', { n: 15 }), C.mint);
            G.persist();
          });
        case 'punch': // Berry's bag
          if (this.daily('punch') >= 1) { this.furnStart(p, 'bounce', 20); this.furnSay('sandbag', true); return; }
          return this.goUse(p, () => {
            this.bumpDaily('punch');
            this.gain('mood', 5);
            const b = bond(); b.exp.str = (b.exp.str || 0) + 4;
            A.sfx('kick');
            this.furnStart(p, 'squish', 44);
            this.shake(4);
            this.furnSay('sandbag');
            this.furnFlair('sandbag', true, p);
            G.persist();
          });
        case 'toy': // Honey's toy chest
          if (this.daily('toy') >= 1) { this.furnStart(p, 'bounce', 20); this.furnSay('toybox', true); return; }
          return this.goUse(p, () => {
            this.bumpDaily('toy');
            this.gain('mood', 6);
            A.sfx('gift');
            this.furnStart(p, 'open', 90);
            this.furnSay('toybox');
            this.furnFlair('toybox', true, p);
            G.persist();
          });
        case 'flower': // Yukino's roses
          if (this.daily('flower') >= 1) { this.furnStart(p, 'bounce', 20); this.furnSay('vase', true); return; }
          return this.goUse(p, () => {
            this.bumpDaily('flower');
            this.gain('mood', 5);
            this.gain('aff', 1);
            A.sfx('item');
            this.furnStart(p, 'glow', 60);
            this.furnSay('vase');
            this.furnFlair('vase', true, p);
            G.persist();
          });
        case 'screen': // Yoru's folding screen
          if (this.daily('screen') >= 1) { this.furnStart(p, 'bounce', 20); this.furnSay('screen', true); return; }
          return this.goUse(p, () => {
            this.bumpDaily('screen');
            this.gain('mood', 5);
            A.sfx('door');
            this.furnStart(p, 'open', 80);
            this.furnSay('screen');
            this.furnFlair('screen', true, p);
            G.persist();
          });
        case 'music':
          return this.goUse(p, () => {
            A.playMusic('lullaby');
            this.recordOn = true;
            this.furnStart(p, 'bounce', 20);
            this.emote('note', 120);
            A.sfx('tick');
            if (this.daily('music') >= 1) { this.furnSay('music', true); return; }
            this.bumpDaily('music');
            this.gain('mood', 5);
            this.furnSay('music');
            this.furnFlair('music', true, p);
            G.persist();
          });
      }
      // anything else (the rug): a little flourish of its own
      this.furnStart(p, 'glow', 36);
      if (!this.furnSay('rug')) this.speak(F.name, 'normal');
      this.furnFlair('rug', true, p);
    },

    // ---------------------------------------------------------------- dialog / menu / panels
    say(queue, onDone) {
      this.dialog = { queue, i: 0, chars: 0, onDone: onDone || null };
      this.mode = 'dialog';
      const first = queue[0];
      if (first && first.who) this.setFace(first.face || 'normal', 9999);
      if (first && first.levelUp) this.celebrate();
    },
    updateDialog() {
      const d = this.dialog;
      const cur = d.queue[d.i];
      if (d.chars < cur.text.length) {
        const tr = cur.who && G.traitOf(cur.who);
        d.chars = Math.min(cur.text.length, d.chars + talkStep(cur.text, d.chars, tr ? tr.talk : 0.7));
        const voice = tr ? tr.voice : ['blip', 4];
        if (this.t % voice[1] === 0 && cur.text[Math.floor(d.chars)] !== '…') A.sfx(voice[0]);
      }
      if (E.menuPressed('a') || E.menuPressed('b') || E.pointer.pressed) {
        if (d.chars < cur.text.length) d.chars = cur.text.length;
        else if (d.i < d.queue.length - 1) {
          d.i++;
          d.chars = 0;
          const nx = d.queue[d.i];
          if (nx.who) this.setFace(nx.face || 'normal', 9999);
          if (nx.levelUp) this.celebrate();
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
      const W = Math.max(E.textWidth(title) + 16, ...items.map((it) => (it.desc ? E.textWidth(it.desc) + 2 : 0)), ...items.map((it) => E.textWidth(it.label) + (it.icon ? Math.max(22, it.icon.width + 12) : 12) + (it.note ? E.textWidth(it.note) + 10 : 0) + (it.badge ? 16 : 0))) + 12;
      const H = 22 + items.length * 16 + (items.some((it) => it.desc) ? 19 : 0);
      const ax = anchor ? anchor.x : this.glove.x + 10;
      const ay = anchor ? anchor.y : this.glove.y - H / 2;
      // a long list may cover the tool buttons, but never runs under the hint bar
      this.menu = { title, items, sel: Math.max(0, items.findIndex((it) => !it.disabled)), x: clamp(Math.round(ax), 4, E.W - W - 4), y: clamp(Math.round(ay), Math.min(60, E.H - H - 18), E.H - H - 18), w: W, h: H };
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
        if (it.disabled) { A.sfx('denied'); this.menu = null; if (it.deny) it.deny(); else this.say([{ who: maidKey(), face: 'tired', text: lines().tired }]); return; }
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
          const verb = { sleep: '休息', train: '特訓', wardrobe: '換班', tea: '喝茶', diary: '日記', piano: '彈琴', water: '澆水', hug: '抱抱', lamp: B.getRoom().lampOff ? '開燈' : '關燈', fish: '餵魚', dresser: '打扮', sofa: '坐坐', music: '放唱片' }[F.use];
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
      const onMaid = !!(this.hover && this.hover.kind === 'maid');
      if (onMaid && !this.wasOnMaid && this.hoverCD <= 0 && !this.glove.act && this.maid.state !== 'sleep' && !this.maid.emote) {
        const hv = trait().hover;
        const tier = this.bondTier();
        this.emote(tier === 'high' ? 'heart' : tier === 'low' ? trait().shy.emote : hv.emote, 50);
        if (hv.hop || tier === 'high') this.maid.hop = (hv.hop || 0) + (tier === 'high' ? 2 : 0);
        this.hoverCD = 300;
      }
      this.wasOnMaid = onMaid;
      const act = this.glove.act;
      if (act && !act.ending && (act.kind === 'hand' || act.kind === 'photo')) {
        if (E.menuPressed('a') || E.menuPressed('b') || P.pressed) {
          if (act.kind === 'hand' && act.t > 20) this.letGo(act);
          if (act.kind === 'photo' && act.t > 44 && act.t < act.dur - 31) act.t = act.dur - 31;
        }
        return;
      }
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
        if (++p.t <= 0) continue;
        if (p.g) p.vy = (p.vy || 0) + p.g;
        if (p.drag) { p.vx = (p.vx || 0) * p.drag; p.vy = (p.vy || 0) * p.drag; }
        p.x += (p.vx || 0) + (p.sway ? Math.sin((p.t + (p.ph || 0)) * 0.12) * p.sway : 0);
        p.y += p.vy || 0;
        if (p.t >= p.life) this.particles.splice(i, 1);
      }
      if (this.shakeT > 0) this.shakeT--;
      for (let i = this.timers.length - 1; i >= 0; i--) if (--this.timers[i].t <= 0) { const f = this.timers[i].fn; this.timers.splice(i, 1); f(); }
      if (this.hoverCD > 0) this.hoverCD--;
      if (this.seekCD > 0) this.seekCD--;
      if (this.seekT > 0) this.seekT--;
      if (this.flashFx && ++this.flashFx.t >= this.flashFx.life) this.flashFx = null;
      this.furnitureTick();
      for (let i = this.toasts.length - 1; i >= 0; i--) if (++this.toasts[i].t > 110) this.toasts.splice(i, 1);
      this.updateMaid();
      if (this.pendingLevelUp && this.mode === 'free' && !this.anim) {
        this.pendingLevelUp = false;
        this.say([{ who: maidKey(), face: 'blush', text: lines().levelUp, levelUp: true, feel: 'love' }]);
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
      if (an.kind === 'gift') return this.updateGiftAnim(an);
      if (an.kind === 'wait') { // a moment for a piece of furniture to do its thing before what comes next
        if (an.t >= an.dur) { this.anim = null; this.mode = 'free'; an.then(); }
        return;
      }
      if (an.kind === 'train') {
        const kind = an.tr.anim;
        if (kind === 'jump') { if (an.t % 20 === 0) m.hop = 7; if (an.t % 30 === 0) this.emote('sweat', 25); }
        if (kind === 'run') { m.dir = (an.t >> 5) % 2 ? 'left' : 'right'; m.walkT += 2; }
        if (kind === 'study') { m.prop = an.atDesk ? null : 'book'; if (an.t % 40 === 0) this.emote(E.pick(['dots', 'question', 'exclaim']), 35); }
        if (kind === 'sweep') { m.prop = 'broom'; if (an.t % 10 === 0) this.sparkle(ms.x + E.randi(-6, 20), ms.y + E.randi(4, 16)); }
        if (an.t % 24 === 0) A.sfx(kind === 'study' ? 'tick' : 'train');
        if (an.t >= an.dur) { this.anim = null; this.finishTraining(an.tr); }
        return;
      }
      if (an.kind === 'tea') {
        if (an.t % 18 === 0) this.particles.push({ kind: 'steam', x: ms.x + 12, y: ms.y + 2, vx: 0, vy: -0.4, t: 0, life: 30 });
        if (an.t === 40) { this.emote('heart', 60); this.hearts(ms.x + 8, ms.y - 8, 3); this.aura(ms.x + 8, ms.y - 4, 4); }
        if (an.t >= an.dur) {
          this.anim = null;
          this.maid.state = 'idle';
          this.maid.prop = null;
          const k = maidKey();
          this.say([{ who: k, face: 'happy', text: lines(k).tea, feel: 'tea' }], () => { this.gain('mood', 20); this.gain('stamina', 10); this.gain('aff', 5); this.toast(G.t('心情 +20　體力 +10'), C.mint); G.persist(); });
        }
        return;
      }
      if (an.kind === 'piano') {
        const melody = [784, 659, 698, 784, 880, 784, 659, 523];
        // Berry hammers away, Yukino keeps time, Yoru plays sparely — and Honey fumbles a note halfway through
        const step = (trait().furn && trait().furn.pianoStep) || 20;
        if (an.t % step === 0) {
          const f = melody[((an.t / step) | 0) % melody.length];
          if (A.ctx && A.sound) { A.sfx('tick'); }
          this.emote('note', 18);
          this.particles.push({ kind: 'note', x: ms.x + E.randi(0, 16), y: ms.y - 12, vx: E.rand(-0.3, 0.3), vy: -0.6, t: 0, life: 40, f });
          if (step <= 14) this.shake(2);
        }
        if (maidKey() === 'honey' && an.t === 84) {
          A.sfx('denied');
          this.emote('sweat', 46);
          this.setFace('surprise', 46);
          this.fx({ kind: 'gloom', x: ms.x + 8, y: ms.y - 10, vy: -0.2, life: 40 });
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
          if (bed) { m.state = 'sleep'; m.bed = bed; this.furnStart(bed, 'sleep', 170); } else m.state = 'hold';
          m.emote = 'zzz';
          m.emoteT = 9999;
          m.speech = null;
        }
        if (an.t === 160) { m.emote = null; m.emoteT = 0; }
        if (an.t >= an.dur) {
          this.anim = null;
          m.state = 'idle';
          if (m.bed) {
            // up she gets: the bed bounces and the morning sparkles
            this.furnStart(m.bed, 'bounce', 24);
            const bb = this.furnBox(m.bed);
            this.burst(bb.x + bb.w / 2, bb.y + 10, 'sparkle', 6, 1, {});
          }
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
      const shook = this.shakeT > 0;
      if (shook) { ctx.save(); ctx.translate(E.randi(-1, 1) * Math.min(2, Math.ceil(this.shakeT / 3)), E.randi(-1, 1)); }
      this.drawRoom();
      this.drawGiftAnim();
      for (const p of this.particles) this.drawParticle(p);
      if (this.flashFx) {
        const f = this.flashFx;
        const g = geom();
        ctx.globalAlpha = 0.55 * (1 - f.t / f.life);
        E.rect(g.x0 - 4, g.wallY - 4, g.w * T + 8, WALL_H + g.h * T + 8, f.col);
        ctx.globalAlpha = 1;
      }
      this.drawMaidOverlay();
      if (shook) ctx.restore();
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
      if (this.glove.act && this.glove.act.kind === 'photo') this.drawPhoto(this.glove.act);
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
      this.lights = [];
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
        this.drawFurniture(p, E.spr.room.furniture[p.id], g.x0 + p.c * T, g.floorY + p.r * T);
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
          this.drawFurniture(d.p, img, x, y);
          if (this.maid.state === 'sleep' && this.maid.bed === d.p) this.drawSleeper(d.p, x, y);
          const hv = this.hover && this.hover.kind === 'furniture' && this.hover.p === d.p && (this.mode === 'free');
          if (hv && (this.t >> 4) % 2 === 0) { ctx.strokeStyle = C.gold; ctx.lineWidth = 1; ctx.strokeRect(x - 0.5, y - 0.5, img.width + 1, img.height + 1); }
        } else if (this.maid.state !== 'sleep') this.drawMaid();
      }
      // the light in the room follows the hour; a lamp keeps the night warm
      const lamp = this.lampLit();
      const tint = world.phase === 'night' ? (lamp ? 'rgba(52,44,110,0.16)' : 'rgba(26,30,86,0.30)')
        : world.phase === 'evening' ? 'rgba(255,146,86,0.13)'
          : world.phase === 'morning' ? 'rgba(255,214,150,0.09)' : null;
      if (tint) {
        ctx.fillStyle = tint;
        ctx.fillRect(g.x0, g.wallY, W, WALL_H + g.h * T);
      }
      // lit lamps (and the desk lamp while she studies) glow over the evening, so they read as light
      if (this.lights.length) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(g.x0, g.wallY, W, WALL_H + g.h * T);
        ctx.clip();
        for (const L of this.lights) {
          const grd = ctx.createRadialGradient(L.x, L.y, 1, L.x, L.y, L.r);
          grd.addColorStop(0, 'rgba(255,228,150,' + L.a + ')');
          grd.addColorStop(1, 'rgba(255,228,150,0)');
          ctx.fillStyle = grd;
          ctx.fillRect(L.x - L.r, L.y - L.r, L.r * 2, L.r * 2);
        }
        ctx.restore();
      }
    },
    // one piece of furniture, with whatever it is doing: bounced, squashed, lit, opened, its fish swimming
    drawFurniture(p, img, x, y) {
      const ctx = E.ctx;
      const a = this.furn.get(p);
      const P = E.spr.room.furnParts;
      let base = img;
      let lampOn = false;
      if (p.id === 'lamp') {
        // switching it, the lamp flickers a few times before it settles
        const off = !!B.getRoom().lampOff !== !!(a && a.kind === 'flicker' && a.t < 10 && (a.t >> 1) % 2);
        if (off) base = P.lampOff; else lampOn = true;
      }
      if (p.id === 'fishbowl') base = P.fishbowlEmpty;
      let sx = 1, sy = 1, oy = 0;
      if (a) {
        const k = a.t / a.dur;
        if (a.kind === 'bounce') oy = -Math.round(Math.abs(Math.sin(k * Math.PI * 2)) * 2 * (1 - k));
        if (a.kind === 'squish') { const q = Math.sin(a.t * 0.45) * 0.14 * (1 - k); sy = 1 - q; sx = 1 + q * 0.6; }
        if (a.kind === 'water' && a.t > 6 && a.t < 40) { const q = Math.sin(a.t * 0.6) * 0.05; sy = 1 - q; sx = 1 + q * 0.5; }
      }
      if (sx !== 1 || sy !== 1) {
        const w = Math.round(img.width * sx), h = Math.round(img.height * sy);
        ctx.drawImage(base, Math.round(x + (img.width - w) / 2), y + img.height - h + oy, w, h);
      } else ctx.drawImage(base, x, y + oy);
      y += oy;
      const phase = (this.world || G.world()).phase;
      switch (p.id) {
        case 'fishbowl': {
          const f = this.fish;
          if (!f) break;
          ctx.save();
          ctx.beginPath();
          ctx.rect(x + 1, y + 6, 14, 8);
          ctx.clip();
          ctx.drawImage((f.dir < 0 ? P.fish : P.fishFlip)[f.tail], Math.round(x + f.x), Math.round(y + f.y));
          ctx.restore();
          break;
        }
        case 'lamp':
          if (lampOn) {
            const glow = phase === 'night' ? 0.36 : phase === 'evening' ? 0.26 : 0.1;
            this.lights.push({ x: x + 8, y: y + 6, r: 30, a: glow }, { x: x + 8, y: y + img.height - 2, r: 16, a: glow * 0.6 });
          }
          break;
        case 'desk':
          if (a && a.kind === 'study') this.lights.push({ x: x + 12, y: y + 3, r: 13, a: 0.34 + Math.sin(this.t * 0.2) * 0.04 });
          break;
        case 'gramophone':
          // the record turns while it plays: a glint going round it
          if (this.recordOn) {
            const ang = this.t * 0.3;
            for (const o of [0, Math.PI]) E.rect(Math.round(x + 7 + Math.cos(ang + o) * 2.6), Math.round(y + 15.5 + Math.sin(ang + o) * 1.2), 1, 1, '#c8b8d8');
          }
          break;
        case 'piano':
          // a key goes down with each note
          if (a && a.kind === 'keys') {
            const step = a.step || 12;
            if (a.t % step < step * 0.6) {
              const KEYS = [3, 6, 9, 11, 14, 17, 20, 22, 25, 28];
              const kx = KEYS[(Math.floor(a.t / step) * 7 + 3) % KEYS.length];
              E.rect(x + kx, y + 14, 1, 2, '#ffe14d');
              E.rect(x + kx - 1, y + 16, 3, 1, '#ffe14d');
            }
          }
          break;
        case 'wardrobe':
          if (a && a.kind === 'open') this.drawWardrobeOpen(x, y, Math.min(1, a.t / 8, (a.dur - a.t) / 8));
          break;
        case 'bookshelf':
          // a book slides up out of the middle shelf, glowing
          if (a && a.kind === 'book' && (a.t < a.dur - 6 || a.t % 2)) {
            const bx = x + 3, by = Math.round(y + 12 - 20 * E.ease.outCubic(Math.min(1, a.t / 16)));
            G.pixelRing(bx + 5, by + 4, 7, '#fff3a0');
            ctx.drawImage(E.spr.room.book, bx, by);
          }
          break;
        case 'dresser':
          // a glint sweeps across the mirror
          if (a && a.kind === 'mirror') {
            const g0 = Math.floor(a.t * 0.5) - 6;
            for (let yy = 2; yy <= 8; yy++) {
              for (const off of [0, 2]) {
                const xx = 4 + g0 + (8 - yy) + off;
                if (xx >= 5 && xx <= 10) E.rect(x + xx, y + yy, 1, 1, off ? '#dff4ff' : '#ffffff');
              }
            }
          }
          break;
        case 'rug':
          if (a && a.kind === 'glow' && (a.t >> 2) % 2) E.rect(x + 2, y + 2, img.width - 4, img.height - 4, 'rgba(255,200,220,0.22)');
          break;
      }
    },
    // the wardrobe's doors swing open on the dresses inside (f: 0 shut .. 1 wide open)
    drawWardrobeOpen(x, y, f) {
      if (f <= 0) return;
      E.ctx.drawImage(E.spr.room.furnParts.wardrobeInside, x + 3, y + 4);
      const wood = '#d8843e', edge = '#a05a26', lite = '#f4ac62';
      const w = Math.round(5 * (1 - f));
      if (w > 0) {
        E.rect(x + 3, y + 4, w, 18, wood);
        E.rect(x + 2 + w, y + 4, 1, 18, edge);
        E.rect(x + 13 - w, y + 4, w, 18, wood);
        E.rect(x + 13 - w, y + 4, 1, 18, lite);
      }
      if (f >= 0.6) { // and stand out on either side
        const sw = f >= 1 ? 3 : 2;
        E.rect(x + 1 - sw - 1, y + 4, sw + 1, 18, '#000000');
        E.rect(x + 1 - sw, y + 5, sw, 16, wood);
        E.rect(x + 1 - sw, y + 5, 1, 16, lite);
        E.rect(x - 1, y + 12, 1, 1, '#ffe666');
        E.rect(x + 15, y + 4, sw + 1, 18, '#000000');
        E.rect(x + 15, y + 5, sw, 16, wood);
        E.rect(x + 14 + sw, y + 5, 1, 16, edge);
        E.rect(x + 16, y + 12, 1, 1, '#ffe666');
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
      const close = this.hugClose();
      if (close) E.groundShadow(ms.x - 4, ms.y + 14, 24, 4, 0.3);
      else E.groundShadow(ms.x + 2, ms.y + 13, 12, 3, 0.25);
      let img;
      // idle, she turns to look at the glove when it comes close (her mood face waits until it goes)
      const look = this.lookDir();
      const face = m.face || (!look && m.dir === 'down' && m.state !== 'walk' ? faceFor() : null);
      const busy = m.state === 'pose' && (m.pose === 'punch' || m.pose === 'tidy');
      // standing still she breathes: every so often her head and hair sink a pixel for a moment
      const breath = m.state !== 'walk' && !busy && !this.glove.act && (this.t + 23) % 96 >= 78;
      if (m.state === 'walk' || busy || (this.anim && this.anim.kind === 'train' && this.anim.tr.anim === 'run')) {
        img = S[m.dir][[1, 0, 2, 0][(m.walkT >> 3) % 4]];
      } else if (face && face !== 'normal' && (m.dir === 'down')) img = (breath ? S.facesBreath : S.faces)[face];
      else img = breath ? S.breath[look || m.dir] : S[look || m.dir][0];
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
      // hugging: she has come right up to you, so she is drawn close up (twice her size) in a warm glow
      if (close) {
        const cx = ms.x + 8, cy = ms.y - 6;
        const grd = ctx.createRadialGradient(cx, cy, 4, cx, cy, 42);
        grd.addColorStop(0, 'rgba(255,200,224,0.6)');
        grd.addColorStop(1, 'rgba(255,200,224,0)');
        ctx.fillStyle = grd;
        ctx.fillRect(cx - 42, cy - 42, 84, 84);
      }
      const rope = m.state === 'pose' && m.pose === 'rope' ? ropeAngle(m.poseT) : null;
      if (rope != null && Math.sin(rope) > 0) this.drawRope(ms, hop, rope); // behind her
      if (close) ctx.drawImage(img, ms.x - 8, ms.y - 30 - hop + close.dy, 32, 48);
      else ctx.drawImage(img, ms.x + sx, ms.y - 8 - hop);
      if (rope != null) {
        if (Math.sin(rope) <= 0) this.drawRope(ms, hop, rope); // in front of her
        E.rect(ms.x, ms.y + 4 - hop, 2, 3, '#ffd23f');
        E.rect(ms.x + 14, ms.y + 4 - hop, 2, 3, '#ffd23f');
      }
      if (act && act.kind === 'highfive' && act.t >= 10 && act.t < 40) {
        // her hand up to meet the glove
        E.rect(ms.x + 12 + sx, ms.y - 4 - hop, 3, 5, '#000000');
        E.rect(ms.x + 13 + sx, ms.y - 3 - hop, 1, 3, '#ffe3ce');
      }
      if (m.prop === 'broom' && m.dir === 'right') ctx.drawImage(broom, ms.x - 6, by);
      if (m.prop === 'book') ctx.drawImage(E.spr.room.book, ms.x + 3, ms.y + 2 - hop);
      if (m.prop === 'cup') ctx.drawImage(E.spr.room.cup, ms.x + 9, ms.y + 3 - hop);
      if ((face === 'blush' || m.face === 'blush') && close) { const by2 = ms.y - 6 - hop + close.dy + (breath ? 2 : 0); E.rect(ms.x - 2, by2, 4, 2, '#ff6f91'); E.rect(ms.x + 14, by2, 4, 2, '#ff6f91'); }
      else if (face === 'blush' || m.face === 'blush') { const by2 = ms.y + 4 - hop + (breath ? 1 : 0); E.rect(ms.x + 3, by2, 2, 1, '#ff6f91'); E.rect(ms.x + 11, by2, 2, 1, '#ff6f91'); }
      const hv = this.hover && this.hover.kind === 'maid' && this.mode === 'free';
      if (hv && this.hover.head && this.glove.pat <= 0) {
        ctx.drawImage(E.spr.fx.sparkle[(this.t >> 4) % 3], ms.x - 3, ms.y - 12 - hop);
      }
    },
    // during a hug she is drawn close up (drawMaid), bobbing a little as she snuggles in
    hugClose() {
      const a = this.glove.act;
      if (!a || a.kind !== 'hug' || a.t < 12 || a.t >= 100) return null;
      return { dy: Math.round(Math.sin(a.t * 0.12)) };
    },
    // idle and awake, she turns towards the glove when it comes close (not while it is on her)
    // How she looks depends on the bond: while she barely knows you she steals a glance and looks away again; once she
    // loves you she follows the glove from across the room.
    lookDir() {
      const m = this.maid;
      if (m.state !== 'idle' || m.face || this.glove.act || this.glove.pat > 0 || this.mode !== 'free') return null;
      const tier = this.bondTier();
      const ms = this.maidScreen();
      const dx = this.glove.x - (ms.x + 8), dy = this.glove.y - ms.y;
      const shyNow = tier === 'low' && (this.t >> 6) % 2 === 1;
      const away = dx < 0 ? 'right' : 'left';
      if (this.hover && this.hover.kind === 'maid') return shyNow ? away : 'down';
      const reach = tier === 'high' ? 120 : 56;
      if (dx * dx + dy * dy > reach * reach) return null;
      if (shyNow) return away;
      if (Math.abs(dx) < 10) return 'down';
      return dx < 0 ? 'left' : 'right';
    },
    // the photo: the viewfinder closing on her, then the print rising in and developing from dark to full colour, her
    // name and today's date under it, a heart sticker on the corner once she loves you
    drawPhoto(a) {
      const t = a.t;
      const ms = this.maidScreen();
      if (t < 24) {
        const h = Math.round(20 - 7 * Math.min(1, t / 16));
        const cx = ms.x + 8, cy = ms.y + 2;
        if (!(t > 16 && t % 4 < 2)) for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
          const x = cx + sx * h, y = cy + sy * (h + 3);
          E.rect(sx < 0 ? x : x - 4, y, 5, 1, '#ffffff');
          E.rect(x, sy < 0 ? y : y - 4, 1, 5, '#ffffff');
        }
        if ((t >> 3) % 2 === 0) E.rect(cx + h - 5, cy - h - 1, 2, 2, '#ff3b5c');
        return;
      }
      const inT = t - 30, outT = a.dur - 30 - t;
      if (!a.emo || inT < 0 || outT < 0) return;
      const W = 96, H = 116;
      const k = Math.min(E.ease.outCubic(Math.min(1, inT / 14)), E.ease.outCubic(Math.min(1, outT / 12)));
      const x = Math.round(160 - W / 2), y = Math.round(E.H + 4 - (E.H + 4 - 50) * k);
      E.rect(x + 3, y + 3, W, H, 'rgba(40,20,50,0.35)');
      E.rect(x, y, W, H, '#d8ccb8');
      E.rect(x + 1, y + 1, W - 2, H - 2, '#fffdf6');
      E.rect(x + 6, y + 6, W - 12, W - 12, '#3a3048');
      const pic = UI.portraitFace(maidKey(), a.emo, 5.2);
      E.art('photo', pic.src, x + 6, y + 6, W - 12, W - 12, pic.crop, null, { opacity: Math.min(1, inT / 40) });
      E.text(name(), x + 8, y + W, { color: C.ink, fit: 54 });
      const d = new Date();
      E.text((d.getMonth() + 1) + '/' + d.getDate(), x + W - 8, y + W, { color: C.dim, align: 'right' });
      if (this.bondTier() === 'high') E.ctx.drawImage(E.spr.fx.bigHeart.love, x - 4, y - 4);
    },
    drawMaidOverlay() {
      const ctx = E.ctx;
      const m = this.maid;
      const ms = this.maidScreen();
      const hop = Math.round(m.hop);
      const close = this.hugClose();
      let headY = close ? ms.y - 30 - hop + close.dy : ms.y - 8 - hop;
      if (m.state === 'sleep' && m.bed) {
        const g = geom();
        const F = G.FURNITURE[m.bed.id];
        headY = g.floorY + (m.bed.r + F.h) * T - E.spr.room.furniture[m.bed.id].height;
        ms.x = g.x0 + m.bed.c * T + (m.bed.id === 'princess' ? 8 : 0);
      }
      if (m.emote) {
        const bob = Math.round(Math.sin(this.t * 0.2));
        ctx.drawImage(E.spr.room.emotes[m.emote], ms.x + (close ? 20 : 9), headY - 11 + bob);
      }
      if (m.speech && !this.dialog) {
        // her own bubble (G.TRAITS bubble): Berry's warm and loud, Honey's buttery, Yukino's cool blue, Yoru's dark
        const tb = trait().bubble;
        const lines = E.wrap(m.speech, 104);
        const w = Math.max(...lines.map((l) => E.textWidth(l))) + 10;
        const h = lines.length * 14 + 6;
        const bx = clamp(ms.x + 8 - w / 2, 4, E.W - w - 4);
        const since = Math.floor(m.speechChars / Math.max(0.1, trait().talk));
        const by = Math.max(60, headY - h - 6) + (since < 6 ? [3, 2, 1, 0, -1, 0][since] : 0);
        E.panel(Math.round(bx), by, Math.round(w), h, tb.bg, tb.edge, {});
        E.rect(ms.x + 6, by + h - 1, 4, 3, tb.bg);
        E.rect(ms.x + 7, by + h + 2, 2, 2, tb.edge);
        let left = Math.floor(m.speechChars);
        lines.forEach((l, i) => {
          if (left <= 0) return;
          E.text(l.slice(0, left), Math.round(bx) + 5, by + 4 + i * 14, { color: tb.ink });
          left -= l.length;
        });
      }
    },
    // the wrapped present: down it comes, wiggles, pops, and the gift rises out of it and settles into her arms
    drawGiftAnim() {
      const an = this.anim;
      if (!an || an.kind !== 'gift') return;
      const ctx = E.ctx;
      const FX = E.spr.fx;
      const ms = this.maidScreen();
      const t = an.t;
      const bx = ms.x + 1, top = ms.y - 30;
      if (t < 24) ctx.drawImage(FX.giftbox.closed, bx, Math.round(top - 44 + 44 * E.ease.outCubic(t / 24)));
      else if (t < 36) ctx.drawImage(FX.giftbox.closed, bx + (t > 28 ? ((t >> 1) % 2 ? 1 : -1) : 0), top + (t < 27 ? 1 : 0));
      else if (t < 60 && !(t > 52 && t % 2)) ctx.drawImage(FX.giftbox.open, bx, top);
      if (t >= 36) {
        const rise = E.ease.outCubic(Math.min(1, (t - 36) / 16));
        const settle = t > 74 ? Math.min(1, (t - 74) / 12) : 0;
        const gy = Math.round(top + 2 - 16 * rise + (30 * settle) + Math.sin(t * 0.15) * (1 - settle));
        if (settle < 1) {
          if (t < 74 && (t >> 2) % 2) { G.pixelRing(bx + 7, gy + 7, 11, '#fff3a0'); }
          ctx.drawImage(E.spr.room.gifts[an.g.id], bx - 1, gy);
        }
      }
    },
    drawParticle(p) {
      if (p.t <= 0) return;
      const ctx = E.ctx;
      const FX = E.spr.fx;
      const x = Math.round(p.x), y = Math.round(p.y);
      // most things blink out over their last frames
      if (p.t > p.life - 8 && (p.t & 1) && !'text ring steam drop flake fbubble'.includes(p.kind)) return;
      switch (p.kind) {
        case 'heart': ctx.drawImage(FX.heart, x - 2, y - 2); break;
        case 'sparkle': ctx.drawImage(FX.sparkle[(p.t >> 3) % 3], x - 2, y - 2); break;
        case 'steam': ctx.fillStyle = 'rgba(255,255,255,' + (1 - p.t / p.life) + ')'; ctx.fillRect(Math.round(p.x + Math.sin(p.t * 0.3) * 2), y, 2, 2); break;
        case 'note': E.text('♪', x, y, { color: p.col || '#6b5a8e' }); break;
        case 'ring': {
          const k = p.t / p.life;
          if (k > 0.7 && p.t % 2) break;
          G.pixelRing(p.x, p.y, p.r0 + (p.r1 - p.r0) * E.ease.outCubic(k), p.col);
          break;
        }
        case 'flame': ctx.drawImage(FX.flame[(p.t >> 2) % 3], x - 2, y - 3); break;
        case 'bubble': {
          const b = FX.bubble[p.big ? 1 : 0];
          if (p.t > p.life - 3) { ctx.drawImage(FX.sparkle[2], x - 2, y - 2); break; } // pop
          ctx.drawImage(b, x - (b.width >> 1), y - (b.height >> 1));
          break;
        }
        case 'snow': ctx.drawImage(FX.snow[p.small ? 1 : 0], x - 2, y - 2); break;
        case 'petal': ctx.drawImage(FX.petal[p.pal || 'rose'][(p.t >> 3) % 3], x - 1, y - 1); break;
        case 'blossom': ctx.drawImage(FX.blossom, x - 2, y - 2); break;
        case 'glint': ctx.drawImage(FX.glint[p.t < p.life * 0.3 || p.t > p.life * 0.7 ? 1 : 0], x - 3, y - 3); break;
        case 'star': ctx.drawImage(FX.star[(p.t >> 3) % 2], x - 2, y - 2); break;
        case 'orbit': { // dizzy stars going round her head
          const a = p.t * 0.18 + p.ph;
          ctx.drawImage(FX.star[(p.t >> 3) % 2], Math.round(p.cx + Math.cos(a) * 7) - 2, Math.round(p.cy + Math.sin(a) * 2.5) - 2);
          break;
        }
        case 'confetti': { const f = (p.t >> 2) % 2; E.rect(x, y, f ? 2 : 1, f ? 1 : 2, p.col); break; }
        case 'dust': { const r = p.t < 6 ? 1 : 2; E.rect(x - r, y - r, r * 2, r * 2, p.t < p.life / 2 ? '#f4e8d8' : '#d8c8b4'); break; }
        case 'bigheart': {
          const bob = p.t < 8 ? [0, -3, -4, -3, -1, 0, 1, 0][p.t] : 0;
          ctx.drawImage(FX.bigHeart[p.tier || 'love'], x - 5, y - 5 + bob);
          break;
        }
        case 'gloom': {
          ctx.drawImage(FX.gloom, x - 5, y - 3);
          if ((p.t >> 3) % 2) { E.rect(x - 2, y + 5, 1, 2, '#6a8ad0'); E.rect(x + 2, y + 7, 1, 2, '#6a8ad0'); }
          break;
        }
        case 'slash': ctx.drawImage(FX.slashL[Math.min(2, p.t >> 2)], x, y); break;
        case 'lid': ctx.drawImage(FX.giftbox.lid, x - 7, y - 3); break;
        case 'drop': E.rect(x, y, 2, 3, '#4c9ae8'); E.rect(x, y, 1, 2, '#bfe6ff'); break; // watering the plant
        case 'flake': E.rect(x, y, 1, 1, (p.t >> 2) % 2 ? '#ffd23f' : '#e8a41a'); break; // fish food
        case 'fbubble': E.rect(x, y, 1, 1, '#ffffff'); break; // the goldfish's bubbles
        case 'z': E.text('z', x, y, { color: '#9fb4ff', outline: '#2a1b30', size: p.big ? 12 : 10 }); break;
        case 'paper': { const f = (p.t >> 3) % 2; E.rect(x, y, f ? 3 : 2, f ? 2 : 3, '#ffffff'); E.rect(x, y, 1, 1, '#c8c8d8'); break; }
        case 'text': E.text(p.text, x, y, { color: p.col, outline: '#2a1b30', align: 'center' }); break;
      }
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
      const act = this.glove.act;
      if (act && act.kind === 'hand' && !act.ending) {
        const touch = E.input.lastDevice === 'touch';
        UI.marquee(G.t(touch ? '拖曳手套帶她散步　點一下放開手' : '移動手套帶她散步　Z 放開手'), 4 + hx, E.H - 13, hintW - 8 - hx, C.gold);
      } else if (step) {
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
      if (act && act.kind === 'hug') {
        // stroking her hair while she is close, and one last pat once she steps back
        const up = act.t % 18 < 8;
        if (act.t >= 30 && act.t < 100) ctx.drawImage(G2.pat[up ? 1 : 0], ms.x - 6, ms.y - 41 - hop - (up ? 2 : 0));
        if (act.t >= 104) ctx.drawImage(G2.pat[up ? 1 : 0], ms.x - 5, ms.y - 22 - hop - (up ? 2 : 0));
        return;
      }
      if (act && act.kind === 'photo') return; // the glove is the camera
      if (act && act.kind === 'hand' && !act.ending) {
        const gx = Math.round(gl.x), gy = Math.round(gl.y);
        const hx = ms.x + 14, hy = ms.y + 5 - hop;
        const vx = gx - hx, vy = gy + 8 - hy, len = Math.hypot(vx, vy);
        for (let s = 2; s < len - 8; s += 2) E.rect(Math.round(hx + (vx * s) / len), Math.round(hy + (vy * s) / len), 1, 1, s % 4 ? '#ff6f91' : '#ffb0c4');
        if (len > 24) ctx.drawImage(E.spr.fx.heart, Math.round(hx + vx / 2) - 2, Math.round(hy + vy / 2) - 2 + Math.round(Math.sin(this.t * 0.15)));
        ctx.drawImage(G2.open, gx - 11, gy - 4);
        return;
      }
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
        if (it.badge) E.ctx.drawImage(it.badge, mn.x + mn.w - 13, y + 4);
        if (on) UI.heartCursor(mn.x + 4, y + 4);
      });
      const sel = mn.items[mn.sel];
      if (sel && sel.desc) {
        E.rect(mn.x + 4, mn.y + mn.h - 20, mn.w - 8, 1, C.pink);
        E.text(sel.desc, mn.x + 7, mn.y + mn.h - 17, { color: C.dim, fit: mn.w - 14 });
      }
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
        const face = UI.portraitFace(cur.who, UI.feelPic(cur.who, cur.feel || UI.FACE_FEEL[cur.face]));
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
        const text = (on ? '♥ ' : '◇ ') + 'Lv' + (i + 1) + ' ' + L.perk;
        if (!L.unlock) { E.text(text, 16, y, { color: on ? C.red : C.gray, fit: 290 }); return; }
        // what the level opens up in the room, on the right; a long row gives up a little of each
        const u = G.t('解鎖：{what}', { what: L.unlock });
        const uw = Math.min(E.textWidth(u), Math.max(64, 282 - E.textWidth(text)));
        E.text(text, 16, y, { color: on ? C.red : C.gray, fit: 282 - uw });
        E.text(u, 306, y, { color: on ? C.plum : C.gray, align: 'right', fit: uw });
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
      const BM = (S.bombs && S.bombs[k]) || S.bomb; // her own bomb
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
        const fx = G.drawFx;
        if (cyc < 96) ctx.drawImage(crate, crateX, ground - 20);
        if (cyc < kickAt) ctx.drawImage(BM[(t >> 4) % 3], maidX + 17, ground - 16);
        else if (cyc < 84) {
          const bx = Math.min(crateX - 16, maidX + 17 + (cyc - kickAt) * 3.2);
          ctx.drawImage(BM[0], Math.round(bx), ground - 16);
          for (let i = 1; i < 4; i++) E.rect(Math.round(bx - i * 5), ground - 8, 3, 1, i < 2 ? '#ffffff' : '#ffe14d');
          for (let i = 1; i <= 3; i++) fx({ kind: 'flick', t: (cyc * 2 + i * 5) % 12, life: 12 }, Math.round(bx - i * 5 + 2), ground - 5 - (i % 2));
          if (cyc < kickAt + 8) ctx.drawImage(S.fx.star[(t >> 2) % 2], maidX + 16, ground - 14);
          if (cyc < kickAt + 10) fx({ kind: 'impact', t: cyc - kickAt, life: 10, col: '#ffb13d' }, maidX + 19, ground - 8);
        } else if (cyc < 100) {
          const st = cyc < 87 ? 1 : cyc < 94 ? 2 : 3;
          for (const dx of [-16, 0, 16]) ctx.drawImage(S.flame[0][st], crateX - 16 + dx, ground - 16);
          if (cyc < 96) fx({ kind: 'impact', t: cyc - 84, life: 12, col: '#ff9a2a', big: true }, crateX - 8, ground - 8);
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
        // a beat later the cut shows, and petals scatter from it
        if (cyc >= cut + 7 && cyc < cut + 19) G.drawFx({ kind: 'cut', t: cyc - cut - 7, life: 12, dx: 1, dy: 0, len: 36 }, x0 + 22, ground - 10);
        if (cyc >= cut + 8 && cyc < cut + 48) for (let j = 0; j < 8; j++) {
          const a = cyc - cut - 8;
          G.drawFx({ kind: 'petal', pal: j % 2 ? 'night' : 'rose', f: j % 3, ph: j, t: a, life: 40 }, x0 + 22 + j * 4.5 + Math.sin(j * 1.7) * a * 0.3, ground - 10 + (j % 2 ? 1 : -1) * a * 0.22 + a * 0.12);
        }
      } else if (k === 'honey') {
        // a monster wanders up; her magic rings out and leaves it dizzy, her shield shimmering
        const magic = 70;
        if (cyc >= magic && cyc < magic + 32) G.drawFx({ kind: 'glow', t: cyc - magic, life: 32, r0: 4, r1: 22, rgb: '255,159,187' }, maidX + 8, ground - 16);
        drawMaid('down', 0);
        ring(maidX + 8, ground - 21, 11, (t >> 3) % 3 === 0 ? '#ffffff' : '#ffb0d0');
        const cat = S.monsters.dustcat.frames[(t >> 5) % 2];
        const catX = x0 + 44 + (cyc < magic ? Math.max(0, 60 - cyc) : 0);
        ctx.drawImage(cat, Math.round(catX), ground - cat.height);
        if (cyc >= magic && cyc < magic + 22) ring(maidX + 8, ground - 18, 4 + (cyc - magic) * 2.2, '#ff9fbb');
        if (cyc >= magic + 8) for (let i = 0; i < 3; i++) { const a = t * 0.15 + (i * Math.PI * 2) / 3; ctx.drawImage(S.fx.star[(t >> 3) % 2], Math.round(catX + 5 + Math.cos(a) * 6), Math.round(ground - cat.height - 4 + Math.sin(a) * 2)); }
        if (cyc >= magic && cyc < magic + 30) ctx.drawImage(S.fx.heart, maidX + 6, ground - 34 - ((cyc - magic) >> 2));
        for (let j = 0; j < 5; j++) { const a = cyc - magic - j * 4; if (a >= 0 && a < 30) G.drawFx({ kind: 'bubble', t: a, life: 30, ph: j, big: j % 2 === 0 }, maidX + j * 4, ground - 12 - a * 0.6); }
      } else if (k === 'yukino') {
        // two bombs wait; her remote signal sets them off together, frost glinting at the edges
        const go = 60;
        const bombs = [x0 + 52, x0 + 116];
        drawMaid('right', 0);
        if (cyc < go + 16) bombs.forEach((bx) => ctx.drawImage(BM[(t >> 4) % 3], bx, ground - 16));
        bombs.forEach((bx, i) => {
          const a = cyc - go - i * 3;
          if (a >= 0 && a < 14) G.drawFx({ kind: 'beam', t: a, life: 14, x: maidX + 8, y: ground - 30, tx: bx + 8, ty: ground - 8 }, maidX + 8, ground - 30);
          if (a >= 3 && a < 19) G.drawFx({ kind: 'lock', t: a - 3, life: 16 }, bx + 8, ground - 8);
        });
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
