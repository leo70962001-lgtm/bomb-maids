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
  const name = (k) => G.MAID_DATA[k || maidKey()].name;
  const clamp = E.clamp;

  // ------------------------------------------------------------------ room geometry + furniture helpers
  function geom() {
    const room = B.getRoom();
    const S = G.ROOM_SIZES[room.size];
    const top = decorLayout ? 40 : 60, areaH = decorLayout ? 140 : 162;
    const total = WALL_H + S.h * T + 14;
    const wallY = top + Math.floor((areaH - total) / 2);
    const x0 = Math.floor((E.W - S.w * T) / 2);
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
  SC.intro = {
    enter() {
      this.t = 0;
      this.i = 0;
      this.chars = 0;
      this.motes = Array.from({ length: 36 }, (_, i) => ({ x: (i * 67) % 320, y: (i * 41) % 240, s: 0.2 + ((i * 7) % 5) * 0.1 }));
      A.playMusic('room');
    },
    update() {
      this.t++;
      const line = G.INTRO_LINES[this.i];
      if (this.chars < line.length) {
        this.chars += 0.5;
        if (Math.floor(this.chars) % 3 === 0 && this.chars % 1 === 0) A.sfx('blip');
      }
      const go = E.menuPressed('a') || E.pointer.pressed || E.menuPressed('b');
      if (go) {
        if (this.chars < line.length) this.chars = line.length;
        else if (this.i < G.INTRO_LINES.length - 1) { this.i++; this.chars = 0; A.sfx('select'); }
        else { A.sfx('confirm'); E.go(SC.select, { mode: 'first' }); }
      }
      if (E.menuPressed('start')) E.go(SC.select, { mode: 'first' });
    },
    draw() {
      const ctx = E.ctx;
      E.rect(0, 0, E.W, E.H, '#1f1426');
      for (const m of this.motes) {
        const y = (m.y + this.t * m.s) % 240;
        E.rect((m.x + Math.sin((this.t + m.x) * 0.02) * 6 + 320) % 320, y, 1, 1, '#6b5a8e');
      }
      // little mansion silhouette with one warm window
      E.rect(96, 128, 128, 60, '#2a1b30');
      for (let i = 0; i < 64; i++) E.rect(160 - i, 128 - Math.floor(i / 2), 1, Math.floor(i / 2) + 1, '#2a1b30');
      for (let i = 0; i < 64; i++) E.rect(160 + i, 128 - Math.floor((63 - i) / 2) - 1, 1, Math.floor((63 - i) / 2) + 2, '#2a1b30');
      E.rect(0, 188, 320, 52, '#2a1b30');
      for (const [x, y, on] of [[112, 140, 0], [136, 140, 1], [176, 140, 0], [200, 140, 0], [148, 104, 0]]) {
        E.rect(x, y, 10, 12, on ? '#ffd23f' : '#3b2f52');
        if (on) E.rect(x + 1, y + 1, 8, 4, '#fff0a0');
      }
      if (this.i >= 3) {
        const hop = Math.abs(Math.sin(this.t * 0.1)) * 4;
        // maids who have not joined yet stay out of the opening
        const shown = G.MAID_ORDER.filter((k) => !UI.isLocked(k));
        const left = 160 - ((shown.length - 1) * 28 + 16) / 2;
        shown.forEach((k, i) => ctx.drawImage(E.spr.maids[k].down[0], Math.round(left + i * 28), 168 - hop * (i % 2)));
      }
      const line = G.INTRO_LINES[this.i];
      E.panel(16, 194, 288, 42, C.panel, C.panel2, {});
      typewriter(line, this.chars, 26, 201, 268, C.paper);
      if (this.chars >= line.length && (this.t >> 5) % 2 === 0) E.text('▼', 292, 224, { color: C.pink });
      E.text((this.i + 1) + '/' + G.INTRO_LINES.length, 312, 6, { color: C.dim, align: 'right' });
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
        this.speak(E.pick(L.greet), 'happy');
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
      if (m.state === 'sleep' || m.state === 'hold') return;
      // idle: look at the glove when it hovers nearby, otherwise live a little
      if (this.hover && this.hover.kind === 'maid') { m.dir = 'down'; return; }
      if (--m.idle > 0) return;
      this.idleBehavior();
    },
    idleBehavior() {
      const m = this.maid;
      const room = B.getRoom();
      const roll = Math.random();
      const b = bond();
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
      if (n < 3) {
        this.gain('aff', 3 + (B.roomHas('plush') ? 1 : 0));
        this.gain('mood', 3);
        m.hop = 4;
        this.emote('heart', 80);
        this.speak(E.pick(L.pat), n === 0 ? 'blush' : 'happy');
        this.hearts(this.maidScreen().x + 8, this.maidScreen().y - 10, 4);
        A.sfx('pat');
      } else if (n < 6) {
        this.gain('aff', 1);
        this.gain('mood', 1);
        this.emote('note', 70);
        this.speak(E.pick(L.pat), 'happy');
        A.sfx('pat');
      } else {
        this.gain('mood', -3);
        this.emote('anger', 90);
        this.speak(E.pick(L.patMany), 'angry');
        A.sfx('angry');
      }
      this.guideDone('pat');
      G.persist();
    },
    talk() {
      const k = maidKey();
      const L = lines(k);
      if (this.daily('talk') >= 3) { this.say([{ who: k, face: 'normal', text: L.talkMany }]); return; }
      this.bumpDaily('talk');
      const lv = B.affLevel(bond().aff);
      const pool = Math.random() < 0.65 ? L.talk[lv] : L.talk[E.randi(0, lv)];
      const face = lv >= 3 ? 'blush' : E.pick(['normal', 'happy']);
      this.say([{ who: k, face, text: E.pick(pool) }], () => {
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
      this.panel = { kind: 'diary', list: hired, i: Math.max(0, hired.indexOf(k || maidKey())), t: 0 };
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
      if (this.maid.state !== 'sleep' && x >= ms.x + 1 && x < ms.x + 15 && y >= ms.y - 8 - mhop && y < ms.y + 16) return { kind: 'maid', head: y < ms.y + 5 - mhop };
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
        case 'maid': return h.head ? G.t('摸摸頭') : G.t('和{name}互動', { name: name() });
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
        case 'maid': return h.head ? this.pat() : this.maidMenu();
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
      if (E.menuPressed('a') || P.pressed) this.activate(this.hover);
      else if (E.menuPressed('b')) { this.mode = 'tabs'; A.sfx('select'); }
      else if (E.menuPressed('start')) this.systemMenu();
    },

    // ---------------------------------------------------------------- main update
    update() {
      this.t++;
      if (this.glove.pat > 0) this.glove.pat--;
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
      for (const c of wins) ctx.drawImage(E.spr.room.window, g.x0 + c * T + 7, g.wallY + 1);
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
      ctx.fillStyle = 'rgba(42,27,48,0.25)';
      ctx.fillRect(ms.x + 3, ms.y + 13, 10, 3);
      let img;
      const face = m.face || (m.dir === 'down' && m.state !== 'walk' ? faceFor() : null);
      if (m.state === 'walk' || (this.anim && this.anim.kind === 'train' && this.anim.tr.anim === 'run')) {
        img = S[m.dir][[1, 0, 2, 0][(m.walkT >> 3) % 4]];
      } else if (face && face !== 'normal' && (m.dir === 'down')) img = S.faces[face];
      else img = S[m.dir][0];
      // Berry cleans with her vacuum cleaner instead of a broom; Honey's pet slime follows her around
      const broom = maidKey() === 'berry' ? E.spr.room.vacuum : E.spr.room.broom;
      const by = maidKey() === 'berry' ? ms.y - 6 - hop : ms.y - 2 - hop + ((this.t >> 3) % 2);
      if (maidKey() === 'honey' && m.state !== 'sleep') {
        const side = m.dir === 'left' ? 14 : -12;
        const slime = E.spr.monsters.jelly.frames[(this.t >> 5) % 2];
        ctx.drawImage(slime, ms.x + side, ms.y + 16 - slime.height - Math.round(Math.abs(Math.sin(this.t * 0.1)) * 2));
      }
      if (m.prop === 'broom' && m.dir !== 'right') ctx.drawImage(broom, ms.x + 12, by);
      ctx.drawImage(img, ms.x, ms.y - 8 - hop);
      if (m.prop === 'broom' && m.dir === 'right') ctx.drawImage(broom, ms.x - 6, by);
      if (m.prop === 'book') ctx.drawImage(E.spr.room.book, ms.x + 3, ms.y + 2 - hop);
      if (m.prop === 'cup') ctx.drawImage(E.spr.room.cup, ms.x + 9, ms.y + 3 - hop);
      if (face === 'blush' || m.face === 'blush') { E.rect(ms.x + 3, ms.y + 4 - hop, 2, 1, '#ff6f91'); E.rect(ms.x + 11, ms.y + 4 - hop, 2, 1, '#ff6f91'); }
      const hv = this.hover && this.hover.kind === 'maid' && this.mode === 'free';
      if (hv && this.hover.head && this.glove.pat <= 0) {
        ctx.drawImage(E.spr.fx.sparkle[(this.t >> 4) % 3], ms.x - 3, ms.y - 12 - hop);
      }
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
      // status bar in the original's style: emblem and bunny badge, her CG face strip, readings on the right
      UI.goldBar(0, 0, E.W, 38);
      ctx.drawImage(E.spr.ui.emblem, 5, 5);
      ctx.drawImage(E.spr.ui.bunny, 6, 23);
      if (!(this.panel && this.panel.kind === 'diary')) E.art('hud-portrait', UI.CG_ART, 18, 3, 112, 32, UI.CG_CROP.face[k]);
      E.rect(130, 3, 1, 32, '#f8b000');
      const ai = affInfo(k);
      // affection: one heart per level, the next level filling in beside them
      for (let i = 0; i < 5; i++) ctx.drawImage(i <= ai.lv ? E.spr.ui.heart : E.spr.ui.heartEmpty, 135 + i * 8, 6);
      E.bar(176, 7, 26, 5, ai.t, C.pink);
      ctx.drawImage(E.spr.ui.coin, 314 - E.textWidth(String(S.coins)) - 9, 6);
      E.text(String(S.coins), 314, 5, { color: C.text, align: 'right' });
      E.text(G.t('體力'), 135, 21, { color: C.text });
      E.bar(160, 24, 30, 7, b.stamina / 100, b.stamina < G.JOB_STAMINA ? C.red : C.mint);
      E.text(G.t('心情'), 196, 21, { color: C.text });
      E.bar(221, 24, 30, 7, b.mood / 100, b.mood >= 80 ? C.gold : b.mood < 30 ? '#8fc6ff' : '#ffb45c');
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
      if (step) {
        const pulse = (this.t >> 5) % 2 === 0;
        E.text('★', 6, E.H - 13, { color: pulse ? C.gold : C.pink });
        UI.marquee(step.text, 18, E.H - 13, hintW - 22, C.gold);
      } else {
        const touch = E.input.lastDevice === 'touch';
        UI.marquee(G.t(touch ? '拖曳手套、點一下互動　B 功能列' : 'Z 互動　X 功能列　ESC 系統　滑鼠也可以直接點'), 4, E.H - 13, hintW - 8, C.paper);
      }
    },
    drawGlove() {
      const ctx = E.ctx;
      const gl = this.glove;
      if (this.mode === 'dialog' || this.mode === 'panel' || (this.decor && this.decor.phase !== 'tray')) return;
      if (gl.pat > 0) {
        const ms = this.maidScreen();
        const wiggle = Math.round(Math.sin(gl.pat * 0.6) * 3);
        ctx.drawImage(E.spr.room.glove.pat, ms.x + wiggle, ms.y - 20 - Math.round(this.maid.hop) + (gl.pat % 10 < 5 ? 1 : 0));
        return;
      }
      ctx.drawImage(E.spr.room.glove.point, Math.round(gl.x) - 4, Math.round(gl.y));
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
        // CG portrait; the expression shows as a little bubble beside the name plate
        E.panel(10, 176, 54, 54, '#ffe0ea', G.MAID_DATA[cur.who].color, {});
        E.art('dialog-portrait', UI.CG_ART, 12, 178, 50, 50, UI.CG_CROP.face[cur.who]);
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
