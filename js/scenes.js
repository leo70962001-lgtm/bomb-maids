/* 炸彈女僕 BOMB MAIDS — scenes */
(function (G) {
  'use strict';
  const E = G.E;
  const A = E.audio;
  const C = {
    plum: '#2a1b30', panel: '#1e3a78', panel2: '#2c4f94', paper: '#fffaf0', text: '#1a1020', paper2: '#ffe0ea', pink: '#ff9fbb', red: '#ec3d5f',
    gold: '#ffd23f', white: '#ffffff', mint: '#b8f28a', sky: '#8fc6ff', gray: '#a9a2c2', dim: '#8d86a8', ink: '#5a4470',
  };
  const SC = (G.SCENES = {});
  // the character illustration: the four maids in a 2x2 grid (Berry TL, Yoru TR, Honey BL, Yukino BR;
  // dividers at x 477-482 and y 557-562 of the 960x1113 image)
  const CG_ART = 'img/maids-cg2.jpg';
  // crops of it as [sx, sy, sw, sh, imageWidth, imageHeight] (see E.art), one set per frame shape.
  // The illustration shows each maid's personality: Berry pumping her fists, Yoru carrying tea, Honey flustered with
  // a wobbling cake, Yukino adjusting her glasses with a broom.
  const CG_CROP = {
    // head to waist: character select cards
    select: {
      berry: [32, 10, 400, 500, 928, 1152],
      yoru: [518, 0, 400, 500, 928, 1152],
      honey: [55, 585, 400, 500, 928, 1152],
      yukino: [490, 578, 400, 500, 928, 1152],
    },
    // head and shoulders, tall: growth diary
    diary: {
      berry: [104, 35, 256, 354, 928, 1152],
      yoru: [590, 20, 256, 354, 928, 1152],
      honey: [127, 610, 256, 354, 928, 1152],
      yukino: [562, 585, 256, 354, 928, 1152],
    },
    // head and shoulders: job results, café counter
    bust: {
      berry: [82, 45, 300, 318, 928, 1152],
      yoru: [568, 30, 300, 318, 928, 1152],
      honey: [105, 620, 300, 318, 928, 1152],
      yukino: [540, 595, 300, 318, 928, 1152],
    },
    // face, a little wide: maid-battle lineup
    lineup: {
      berry: [79, 40, 306, 274, 928, 1152],
      yoru: [565, 25, 306, 274, 928, 1152],
      honey: [102, 615, 306, 274, 928, 1152],
      yukino: [537, 590, 306, 274, 928, 1152],
    },
    // face: room dialog boxes
    face: {
      berry: [92, 25, 280, 280, 928, 1152],
      yoru: [578, 10, 280, 280, 928, 1152],
      honey: [115, 600, 280, 280, 928, 1152],
      yukino: [550, 578, 280, 280, 928, 1152],
    },
    // tight face: status panels and small badges
    head: {
      berry: [122, 57, 220, 220, 928, 1152],
      yoru: [608, 42, 220, 220, 928, 1152],
      honey: [145, 632, 220, 220, 928, 1152],
      yukino: [580, 607, 220, 220, 928, 1152],
    },
  };
  let SAVE = null;
  const persist = () => E.writeSave(SAVE);
  G.initSave = function () {
    const keepLang = SAVE ? G.LANG : null;
    SAVE = E.loadSave(G.SAVE_DEFAULT);
    if (keepLang) SAVE.lang = keepLang;
    A.setSound(SAVE.sound);
    A.setMusic(SAVE.music);
    G.setLang(SAVE.lang || 'ja');
    if (SAVE.maid && !SAVE.first) SAVE.first = G.MAID_ORDER.find((k) => SAVE.hired[k]) || SAVE.maid;
    // the single boss of older versions is now BOSS3
    if (SAVE.cleared.BOSS) { SAVE.cleared.BOSS3 = SAVE.cleared.BOSS3 || SAVE.cleared.BOSS; delete SAVE.cleared.BOSS; }
    syncUnlocks();
  };
  function cycleLang(step) {
    const L = G.LANGS;
    const next = L[(L.indexOf(G.LANG) + step + L.length) % L.length];
    SAVE.lang = next;
    G.setLang(next);
    persist();
    A.sfx('select');
  }
  G.cycleLang = cycleLang;

  // ------------------------------------------------------------------ shared drawing
  const lastBg = { frame: -1, off: 0, tint: null };
  function bg(t, tint) {
    const tile = E.spr.bgTile;
    const off = Math.floor(t * 0.25) % 32;
    for (let y = -32; y < E.H + 32; y += 32) for (let x = -32; x < E.W + 32; x += 32) E.ctx.drawImage(tile, x + off, y + off);
    if (tint) E.rect(0, 0, E.W, E.H, tint);
    // the portrait panel carries the same wallpaper on across the screen
    lastBg.frame = E.draws; lastBg.off = off; lastBg.tint = tint || null;
  }
  function lace(x, y, w, col) {
    const ctx = E.ctx;
    ctx.fillStyle = col || C.white;
    for (let i = 0; i < w; i += 6) {
      ctx.fillRect(x + i + 1, y, 4, 2);
      ctx.fillRect(x + i + 2, y + 2, 2, 1);
    }
  }
  // menu pointer: the original's red triangle (kept under its old name)
  function heartCursor(x, y) {
    const bob = Math.round(Math.sin(E.frame * 0.25) * 1.5);
    const ctx = E.ctx;
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = '#000000';
      ctx.fillRect(x + bob + i - 1, y - 2 + i, 1, 10 - i * 2);
      if (i < 4) { ctx.fillStyle = '#e8203c'; ctx.fillRect(x + bob + i, y - 1 + i, 1, 8 - i * 2); }
    }
  }
  // the original's status-bar frame: black outline, gold rim, cream inside
  function goldBar(x, y, w, h) {
    E.rect(x, y, w, h, '#000000');
    E.rect(x + 1, y + 1, w - 2, h - 2, '#f8b000');
    E.rect(x + 1, y + 1, w - 2, 1, '#ffe27a');
    E.rect(x + 3, y + 3, w - 6, h - 6, '#fffaf0');
  }
  // bottom strip: black with a thin gold rule, like the original's soft-key bar
  // Bars along the top or bottom of a scene run on across the portrait panel. Whatever draws one says so each frame:
  // { y, h } a strip (colour, default black; rule: the row of its gold rule) or { gold: true, y, h } a gold bar that
  // starts at the game's left edge.
  const edgeBars = { frame: -1, list: [] };
  function edgeBar(bar) {
    if (edgeBars.frame !== E.draws) { edgeBars.frame = E.draws; edgeBars.list.length = 0; }
    edgeBars.list.push(bar);
  }
  function hint(text) {
    E.rect(0, E.H - 16, E.W, 16, '#000000');
    E.rect(0, E.H - 16, E.W, 1, '#f8b000');
    edgeBar({ y: E.H - 16, h: 16, rule: E.H - 16 });
    E.text(text, E.W / 2, E.H - 13, { color: C.white, align: 'center' });
  }
  function header(title, right) {
    goldBar(0, 0, E.W, 20);
    edgeBar({ gold: true, y: 0, h: 20 });
    E.text(title, 8, 4, { color: C.text });
    if (right) E.text(right, E.W - 8, 4, { color: C.red, align: 'right' });
  }
  function coinLabel(x, y, n, align) {
    const s = String(n);
    const w = E.textWidth(s) + 9;
    const dx = align === 'right' ? x - w : x;
    E.ctx.drawImage(E.spr.ui.coin, dx, y);
    E.text(s, dx + 9, y, { color: C.gold, outline: '#000000' });
  }
  // maids who have not joined yet are only shown as silhouettes (a new save starts with the first maid in MAID_ORDER)
  function isLocked(key) {
    return !!SAVE && !SAVE.hired[key] && !(key === G.MAID_ORDER[0] && !Object.keys(SAVE.hired).length);
  }
  const shadowCache = new Map();
  function silhouette(img, col) {
    col = col || '#3b2f52';
    let byCol = shadowCache.get(img);
    if (!byCol) { byCol = {}; shadowCache.set(img, byCol); }
    if (!byCol[col]) {
      const c = document.createElement('canvas');
      c.width = img.width; c.height = img.height;
      const x = c.getContext('2d');
      x.drawImage(img, 0, 0);
      x.globalCompositeOperation = 'source-in';
      x.fillStyle = col;
      x.fillRect(0, 0, c.width, c.height);
      byCol[col] = c;
    }
    return byCol[col];
  }
  // outfit: a specific outfit (battle copies of the same maid), otherwise whatever she is wearing
  function maidImg(key, dir, f, outfit) {
    const set = outfit ? E.spr.outfits[key][outfit] : E.spr.maids[key];
    const img = set[dir || 'down'][f || 0];
    return isLocked(key) ? silhouette(img) : img;
  }
  const maidName = (key) => (isLocked(key) ? '？？？' : G.MAID_DATA[key].name);
  // a standing maid at scale s with the signature prop from her design sheet:
  // Berry carries her giant vacuum cleaner, Honey's pet bunny peeks out from behind her
  function drawMaidFigure(key, x, y, s, f) {
    const ctx = E.ctx;
    const locked = isLocked(key);
    const ps = Math.max(1, s - 1);
    if (!locked && key === 'honey') {
      const bunny = E.spr.room.bunny[(E.frame >> 5) % 8 === 7 ? 1 : 0];
      ctx.drawImage(bunny, Math.round(x + 7 * s), Math.round(y + 24 * s - bunny.height * s), bunny.width * s, bunny.height * s);
    }
    ctx.drawImage(maidImg(key, 'down', f), Math.round(x), Math.round(y), 16 * s, 24 * s);
    if (!locked && key === 'berry') ctx.drawImage(E.spr.room.vacuum, Math.round(x + 11 * s), Math.round(y + 7 * s), 12 * ps, 22 * ps);
  }
  // draw a sprite as large as fits a box, keeping its shape, standing on the box's bottom edge
  function fitImage(img, x, y, w, h) {
    const s = Math.min(w / img.width, h / img.height);
    const dw = Math.round(img.width * s), dh = Math.round(img.height * s);
    E.ctx.drawImage(img, Math.round(x + (w - dw) / 2), Math.round(y + h - dh), dw, dh);
  }
  function drawHead(key, x, y, scale) {
    const img = maidImg(key, 'down', 0);
    E.ctx.drawImage(img, 0, 0, 16, 16, x, y, 16 * scale, 16 * scale);
  }
  function rankColor(r) { return { S: C.gold, A: C.pink, B: C.sky, C: C.gray }[r] || C.gray; }
  // cream sheet in an orange-red frame (the original's menu card)
  function paper(x, y, w, h) { E.panel(x, y, w, h, C.paper, '#e8602c', { shine: '#ffb07a', outline: '#000000' }); }
  // the original's blue clipboard, kept dark inside so light text stays readable
  function darkPanel(x, y, w, h) { E.panel(x, y, w, h, C.panel, '#3a78e0', { shine: '#9ad0ff', outline: '#000000' }); }
  function statPips(x, y, icon, n, max, col) {
    E.ctx.drawImage(E.spr.ui[icon], x, y);
    for (let i = 0; i < max; i++) E.rect(x + 10 + i * 5, y + 2, 4, 4, i < n ? col : '#d9c9dd');
  }
  function wrapLines(lines, x, y, col, gap, maxW) {
    const out = [];
    for (const l of lines) {
      if (!maxW || !l) out.push(l);
      else for (const w of E.wrap(l, maxW)) out.push(w);
    }
    out.forEach((l, i) => { if (l) E.text(l, x, y + i * (gap || 15), { color: col || C.ink }); });
    return out.length;
  }
  function marquee(text, x, y, w, col) {
    const ctx = E.ctx;
    const tw = E.textWidth(text);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y - 2, w, 16);
    ctx.clip();
    if (tw <= w) E.text(text, x + w / 2, y, { color: col, align: 'center' });
    else {
      const span = tw + 40;
      const off = (E.frame * 0.5) % span;
      E.text(text, x + w - off, y, { color: col });
      E.text(text, x + w - off + span, y, { color: col });
    }
    ctx.restore();
  }

  // ------------------------------------------------------------------ raising (育成) state per maid
  function getBond(key) {
    if (!SAVE.bond[key]) SAVE.bond[key] = { aff: 0, mood: 70, stamina: 100, exp: { str: 0, agi: 0, bom: 0, hou: 0 }, daily: {}, jobs: 0 };
    return SAVE.bond[key];
  }
  function affLevel(aff) {
    let lv = 0;
    G.AFF_LEVELS.forEach((L, i) => { if (aff >= L.at) lv = i; });
    return lv;
  }
  function trainLevel(exp) {
    let lv = 0;
    G.TRAIN_LV.forEach((t, i) => { if (exp >= t) lv = i; });
    return lv;
  }
  function getRoom() {
    if (!SAVE.room) SAVE.room = JSON.parse(JSON.stringify(G.ROOM_DEFAULT));
    return SAVE.room;
  }
  function roomHas(id) { return getRoom().placed.some((p) => p.id === id); }
  // what the maid's affection and training add to a job
  function perks(key) {
    const b = getBond(key);
    const al = affLevel(b.aff);
    const hou = trainLevel(b.exp.hou);
    return {
      spStart: al >= 1 ? 20 : 0,
      heartBonus: al >= 2 ? 1 : 0,
      rewardMul: (al >= 3 ? 1.2 : 1) * (b.mood >= 80 ? 1.1 : 1),
      guard: al >= 4,
      dustCoin: hou * 2,
      dustSp: hou * 3,
      skillCostMul: hou >= 5 ? 0.65 : hou >= 3 ? 0.8 : 1,
      invBonus: trainLevel(b.exp.agi) * 10,
      lowMood: b.mood <= 30,
    };
  }
  function maidStats(key) {
    const base = G.MAID_DATA[key].stats;
    const up = SAVE.upgrades;
    const b = getBond(key);
    const L = (id) => trainLevel(b.exp[id]);
    return {
      speed: base.speed + up.speed + (L('agi') >= 2 ? 1 : 0) + (L('agi') >= 5 ? 1 : 0),
      bombs: base.bombs + up.bombs + (L('bom') >= 4 ? 1 : 0),
      fire: base.fire + up.fire + (L('bom') >= 2 ? 1 : 0),
      hearts: base.hearts + up.hearts + (L('str') >= 2 ? 1 : 0) + (L('str') >= 4 ? 1 : 0),
    };
  }
  function stageUnlocked(i) { return i === 0 || !!SAVE.cleared[G.STAGES[i - 1].id] || !!SAVE.cleared[G.STAGES[i].id]; }
  // maids join through the jobs: the ones not picked first arrive with G.MAID_UNLOCK_STAGES, in order
  function unlockPlan() {
    const first = SAVE.first || G.MAID_ORDER.find((k) => SAVE.hired[k]) || 'berry';
    const plan = {};
    G.MAID_ORDER.filter((k) => k !== first).forEach((k, i) => { plan[k] = G.MAID_UNLOCK_STAGES[i]; });
    return plan;
  }
  // hire every maid whose job is cleared; returns the ones who just joined
  function syncUnlocks() {
    if (!SAVE || !SAVE.maid) return [];
    const plan = unlockPlan();
    const joined = G.MAID_ORDER.filter((k) => plan[k] && !SAVE.hired[k] && SAVE.cleared[plan[k]]);
    for (const k of joined) { SAVE.hired[k] = true; getBond(k); }
    return joined;
  }
  const stageById = (id) => G.STAGES.find((s) => s.id === id);
  // tutorial steps can be finished outside the room too (buying furniture in the café)
  G.guideStep = function (key) {
    const step = G.GUIDE[SAVE.guide];
    if (!step || step.key !== key) return null;
    SAVE.guide++;
    return step;
  };

  G.getSave = () => SAVE;
  G.outfitOf = (k) => (SAVE && SAVE.outfits && SAVE.outfits[k]) || 'maid';
  G.persist = persist;
  G.BOND = { getBond, affLevel, trainLevel, perks, maidStats, getRoom, roomHas, unlockPlan, syncUnlocks };
  G.UI = { C, CG_ART, CG_CROP, goldBar, edgeBar, bg, lace, heartCursor, hint, header, coinLabel, maidImg, drawHead, isLocked, silhouette, maidName, rankColor, paper, darkPanel, statPips, wrapLines, marquee };

  // ------------------------------------------------------------------ Portrait panel (16:9 screen, left of the game)
  // The maid who matters on this screen stands beside the game with no frame and no caption: cut out of the
  // illustration, on the scene's own wallpaper carried across, between the scene's top and bottom bars, which run on
  // across the panel in front of her. Each moves in her own way (Berry bounces, Yoru breathes calmly, Honey fidgets,
  // Yukino sways) and a newly shown maid rises up into place.
  // cut-outs of the plain-background illustration: pixel size, her face centre in it (she is placed by her face) and
  // the right-most pixel of her that shows on screen (the cake plate, a lock of hair), which decides how far she leans
  const STAND = {
    berry: { src: 'img/stand-berry.webp', w: 369, h: 560, face: [175, 163], right: 368 },
    yoru: { src: 'img/stand-yoru.webp', w: 430, h: 550, face: [250, 138], right: 424 },
    honey: { src: 'img/stand-honey.webp', w: 401, h: 549, face: [200, 147], right: 400 },
    yukino: { src: 'img/stand-yukino.webp', w: 403, h: 552, face: [222, 125], right: 402 },
  };
  const STAND_SCALE = 0.33;
  const STAND_TOP = 44; // where the top of her head sits, just under the tallest top bar (the room's status bar)
  const STAND_LEAN = 6; // she may reach this far into the game area; past that she steps left and the screen edge crops her
  // load them all up front so switching maids never shows an empty panel
  if (typeof Image !== 'undefined') for (const k in STAND) new Image().src = STAND[k].src;
  function portraitFor(sc) {
    const hired = G.MAID_ORDER.filter((k) => SAVE && SAVE.hired[k]);
    const home = (SAVE && SAVE.maid) || hired[0] || 'berry';
    if (sc === SC.select && sc.sel != null) { const k = G.MAID_ORDER[sc.sel]; return { key: k, locked: isLocked(k) }; }
    if (sc === SC.play && sc.world && sc.world.maids[0]) { const m = sc.world.maids[0]; return { key: m.maidKey, hurt: m.burnT > 0 || !m.alive }; }
    if (sc === SC.battle && sc.lineup && sc.lineup[0]) return { key: sc.lineup[0].maid };
    if (sc === SC.battleSetup && sc.cfg) return { key: sc.cfg.p1 || home };
    if (sc === SC.title && hired.length) return { key: hired[Math.floor(E.frame / 360) % hired.length] };
    return { key: home };
  }
  const MOTION = {
    berry: (t) => [0, -Math.abs(Math.sin(t * 0.11)) * 7],
    yoru: (t) => [0, Math.sin(t * 0.03) * 3],
    honey: (t) => [(t % 140) < 24 ? Math.sin(t * 1.3) * 5 : 0, Math.sin(t * 0.06) * 3],
    yukino: (t) => [Math.sin(t * 0.025) * 4, Math.sin(t * 0.05) * 2],
  };
  const shown = { key: null, since: 0 };
  function drawSidePanel(ctx) {
    const PW = E.sideW;
    if (!SAVE || PW <= 0) return;
    const p = portraitFor(E.scene);
    const k = STAND[p.key] ? p.key : 'berry';
    // the wallpaper, lined up with the scene's (same scroll, same tint); scenes without one get it dimmed
    const drew = lastBg.frame === E.draws;
    const off = drew ? lastBg.off : Math.floor(E.frame * 0.25) % 32;
    const tile = E.spr.bgTile;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, PW, E.H);
    ctx.clip();
    for (let y = off - 32; y < E.H; y += 32) for (let x = PW + off - 32 * Math.ceil((PW + off) / 32); x < PW; x += 32) ctx.drawImage(tile, x, y);
    if (!drew) E.rect(0, 0, PW, E.H, 'rgba(42,27,48,0.62)');
    else if (lastBg.tint) E.rect(0, 0, PW, E.H, lastBg.tint);
    ctx.restore();
    // the scene's top and bottom bars, carried on across; a gold bar's run covers its own left end so the join is seamless
    const bars = edgeBars.frame === E.draws ? edgeBars.list : [];
    let top = 0, bottom = E.H;
    for (const bar of bars) {
      if (bar.gold) {
        const x1 = PW + 3;
        E.rect(0, bar.y, x1, bar.h, '#000000');
        E.rect(1, bar.y + 1, x1 - 1, bar.h - 2, '#f8b000');
        E.rect(1, bar.y + 1, x1 - 1, 1, '#ffe27a');
        E.rect(3, bar.y + 3, x1 - 3, bar.h - 6, '#fffaf0');
      } else {
        E.rect(0, bar.y, PW, bar.h, bar.color || '#000000');
        if (bar.rule != null) E.rect(0, bar.rule, PW, 1, '#f8b000');
      }
      if (bar.y + bar.h / 2 < E.H / 2) top = Math.max(top, bar.y + bar.h);
      else bottom = Math.min(bottom, bar.y);
    }
    // her figure, shown only between the bars
    if (shown.key !== k) { shown.key = k; shown.since = E.frame; }
    const S = STAND[k];
    const w = S.w * STAND_SCALE, h = S.h * STAND_SCALE;
    const rise = Math.max(0, 1 - (E.frame - shown.since) / 16);
    const [mx, my] = p.locked ? [0, 0] : (MOTION[k] || MOTION.yoru)(E.frame);
    const faceX = Math.min(PW / 2, PW + STAND_LEAN - (S.right - S.face[0]) * STAND_SCALE);
    const x = faceX - S.face[0] * STAND_SCALE + mx;
    const y = STAND_TOP + my + rise * rise * 48; // the cut-outs fade out at the bottom, so she needs no bar to stand on
    const y0 = Math.max(y, top), y1 = Math.min(y + h, bottom);
    if (y1 - y0 < 1) return;
    const filter = p.locked ? 'brightness(0) opacity(0.6)' : p.hurt ? 'sepia(0.6) brightness(0.55) contrast(1.2)' : null;
    E.art('side-portrait', S.src, x, y0, w, y1 - y0, [0, (y0 - y) / STAND_SCALE, S.w, (y1 - y0) / STAND_SCALE, S.w, S.h], filter, true);
  }
  E.sidePanel = drawSidePanel;

  // ------------------------------------------------------------------ Title cast
  // The maids who have joined live on the title screen. Each one picks something to do: sweep up a dust bunny,
  // sip tea, nap on a cushion, nibble her favourite sweet, dance, read, pet the bunny, wave at you, or pair up
  // with another maid to chat or hold a little tea party. A maid who joined since the last visit walks in and
  // the others greet her.
  const CAST_TOP = 146, CAST_BOTTOM = 178; // the band their feet move in
  const CHAT_EMOTES = ['note', 'heart', 'dots', 'exclaim', 'question'];
  const FAVORITE_SWEET = { berry: 'daifuku', yoru: 'matcha', honey: 'honeycake', yukino: 'icecream' };
  const WALKING = new Set(['walk', 'enter', 'toDust', 'toPair']);
  const SEATED = new Set(['nap', 'party']);
  function castMember(key, delay) {
    const entering = delay != null;
    const fromLeft = Math.random() < 0.5;
    return {
      key, x: entering ? (fromLeft ? -24 : E.W + 24) : E.rand(40, 280), y: E.rand(CAST_TOP, CAST_BOTTOM),
      dir: entering ? (fromLeft ? 'right' : 'left') : 'down', state: entering ? 'wait' : 'idle', t: 0, walkT: 0, hop: 0,
      tx: 0, ty: 0, next: entering ? delay : E.randi(20, 120), emote: null, emoteT: 0, partner: null, plan: null, ready: false,
      dust: null, sipT: 0, table: null, petX: 0, petY: 0, petJig: 0,
    };
  }
  const Cast = {
    build() {
      const known = SAVE.titleCast || (SAVE.titleCast = []);
      let order = 0;
      this.members = G.MAID_ORDER.filter((k) => !isLocked(k)).map((k) => (known.includes(k) ? castMember(k) : castMember(k, 30 + 110 * order++)));
      this.dusts = [];
      this.fx = [];
      this.tables = [];
      this.dustT = 90;
      for (const m of this.members) {
        if (m.state === 'idle') { const [sx, sy] = this.openSpot(m, 40, E.W - 40); m.x = sx; m.y = sy; }
        m.petX = m.x - 28; m.petY = m.y;
      }
    },
    say(m, emote, time) { m.emote = emote; m.emoteT = time || 50; },
    burst(kind, x, y, n, spread) {
      for (let i = 0; i < n; i++) this.fx.push({ kind, x: x + E.rand(-spread, spread), y: y - E.rand(0, spread), t: E.randi(-8, 0) });
    },
    // a free spot: the best of a few random tries, measured against where the others stand or are heading
    openSpot(m, minX, maxX, also) {
      let best = null, bestD = -1;
      for (let i = 0; i < 10; i++) {
        const x = E.rand(minX || 24, maxX || E.W - 24), y = E.rand(CAST_TOP, CAST_BOTTOM);
        let d = 999;
        for (const o of this.members) {
          if (o === m || o === also || o.state === 'wait') continue;
          const ox = WALKING.has(o.state) ? o.tx : o.x, oy = WALKING.has(o.state) ? o.ty : o.y;
          d = Math.min(d, Math.abs(ox - x) + Math.abs(oy - y) * 0.5);
        }
        for (const tb of this.tables) d = Math.min(d, Math.abs(tb.x - x) + 10);
        if (d > bestD) { bestD = d; best = [x, y]; }
      }
      return best;
    },
    walkTo(m, x, y, state) { m.tx = E.clamp(x, 16, E.W - 16); m.ty = E.clamp(y, CAST_TOP, CAST_BOTTOM); m.state = state; m.t = 0; },
    step(m, speed) {
      const dx = m.tx - m.x, dy = m.ty - m.y, d = Math.hypot(dx, dy);
      if (d < 1.2) { m.x = m.tx; m.y = m.ty; return true; }
      m.x += (dx / d) * speed;
      m.y += (dy / d) * speed;
      m.walkT++;
      if (Math.abs(dx) > Math.abs(dy) * 0.6) m.dir = dx < 0 ? 'left' : 'right';
      else m.dir = dy < 0 ? 'up' : 'down';
      return false;
    },
    idle(m, min, max) {
      m.state = 'idle'; m.t = 0; m.next = E.randi(min || 60, max || 180);
      m.partner = null; m.plan = null; m.ready = false; m.sipT = 0; m.table = null;
    },
    update() {
      if (!this.members) this.build();
      const members = this.members;
      // dust bunnies drift in now and then
      if (--this.dustT <= 0) {
        this.dustT = E.randi(200, 360);
        if (this.dusts.length < 3) { const [dx, dy] = this.openSpot(null, 30, E.W - 30); this.dusts.push({ x: dx, y: Math.max(CAST_TOP + 4, dy), life: 1, taken: null, t: 0 }); }
      }
      for (const d of this.dusts) d.t++;
      const LIFE = { spark: 18, steam: 34, z: 70, heart: 44, puff: 14, crumb: 16 };
      for (let i = this.fx.length - 1; i >= 0; i--) if (++this.fx[i].t > LIFE[this.fx[i].kind]) this.fx.splice(i, 1);
      for (const tb of this.tables) tb.t++;
      for (const m of members) {
        m.t++;
        if (m.emoteT > 0 && --m.emoteT === 0) m.emote = null;
        if (m.hop > 0) m.hop = Math.max(0, m.hop - 0.35);
        if (m.sipT > 0) m.sipT--;
        if (m.petJig > 0) m.petJig--;
        this.act(m, members);
        // standing maids drift apart instead of piling on top of each other
        if (!WALKING.has(m.state) && !SEATED.has(m.state) && m.state !== 'wait' && m.state !== 'clean') {
          for (const o of members) {
            if (o === m || o.state === 'wait' || o.state === 'enter') continue;
            const dx = m.x - o.x, dy = m.y - o.y;
            if (Math.abs(dx) < 30 && Math.abs(dy) < 12) m.x = E.clamp(m.x + (dx === 0 ? 0.5 : Math.sign(dx) * 0.5), 16, E.W - 16);
          }
        }
        // Honey's pet bunny hops along behind her (and sits still to be petted)
        if (m.state !== 'petBunny') {
          const want = m.dir === 'left' ? m.x + 28 : m.x - 28;
          m.petX += (want - m.petX) * 0.06;
          m.petY += (m.y - m.petY) * 0.06;
        }
      }
    },
    act(m, members) {
      switch (m.state) {
        case 'wait':
          if (--m.next <= 0) { const [ex, ey] = this.openSpot(m, 50, E.W - 50); this.walkTo(m, ex, ey, 'enter'); this.say(m, 'exclaim', 70); A.sfx('blip'); }
          return;
        case 'enter':
          if (!this.step(m, 1.1)) return;
          m.state = 'wave'; m.t = 0; m.dir = 'down'; this.say(m, 'heart', 70);
          for (const o of members) {
            if (o === m || o.state === 'wait' || o.state === 'enter' || SEATED.has(o.state)) continue;
            if (o.state === 'idle' || o.state === 'walk') { o.dir = o.x < m.x ? 'right' : 'left'; o.hop = 4; this.say(o, 'note', 60); }
          }
          if (!SAVE.titleCast.includes(m.key)) { SAVE.titleCast.push(m.key); persist(); }
          return;
        case 'wave':
          m.hop = Math.abs(Math.sin(m.t * 0.25)) * 4;
          if (m.t > 70) this.idle(m, 40, 100);
          return;
        case 'idle':
          if (--m.next <= 0) this.chooseActivity(m);
          return;
        case 'walk':
          if (this.step(m, 0.6)) this.idle(m);
          return;
        case 'toDust':
          if (!this.dusts.includes(m.dust)) { this.idle(m, 20, 60); return; }
          if (this.step(m, 0.8)) { m.state = 'clean'; m.t = 0; m.dir = m.dust.x > m.x ? 'right' : 'left'; m.sneezy = Math.random() < 0.3; }
          return;
        case 'clean': {
          const d = m.dust;
          d.life = Math.max(0, 1 - m.t / 110);
          if (m.t % 8 === 0) this.burst('spark', d.x, d.y - 4, 1, 8);
          // the dust tickles her nose
          if (m.sneezy && m.t === 58) { this.say(m, 'exclaim', 30); m.hop = 6; this.burst('puff', d.x, d.y, 2, 6); }
          if (m.t >= 110) {
            this.dusts.splice(this.dusts.indexOf(d), 1);
            this.burst('spark', d.x, d.y, 5, 10);
            this.say(m, 'sparkle', 50);
            m.hop = 4;
            m.dust = null;
            this.idle(m, 40, 120);
          }
          return;
        }
        case 'toPair': {
          const p = m.partner;
          if (!p || p.partner !== m || m.t > 320) { this.idle(m, 30, 90); if (p && p.partner === m) this.idle(p, 30, 90); return; }
          if (this.step(m, 0.7)) m.ready = true;
          if (!(m.ready && p.ready)) return;
          const next = m.plan === 'tea' ? 'party' : 'chat';
          for (const [a, b] of [[m, p], [p, m]]) { a.state = next; a.t = 0; a.dir = a.x < b.x ? 'right' : 'left'; }
          m.lead = true; p.lead = false;
          if (next === 'party') {
            const tb = { x: (m.x + p.x) / 2, y: Math.max(m.y, p.y) + 1, t: 0 };
            this.tables.push(tb);
            m.table = tb; p.table = tb;
            this.burst('puff', tb.x, tb.y - 10, 3, 8);
          }
          return;
        }
        case 'chat': {
          const p = m.partner;
          if (!p || p.state !== 'chat') { this.idle(m, 30, 90); return; }
          if (!m.lead) return;
          if (m.t % 45 === 1) {
            const speaker = ((m.t / 45) | 0) % 2 === 0 ? m : p;
            this.say(speaker, E.pick(CHAT_EMOTES), 40);
            speaker.hop = 3;
          }
          if (m.t >= 190) {
            // finish with a little high five
            m.hop = 5; p.hop = 5;
            this.burst('spark', (m.x + p.x) / 2, m.y - 30, 6, 8);
            this.say(m, 'heart', 40); this.say(p, 'heart', 40);
            this.idle(m, 90, 220); this.idle(p, 90, 220);
          }
          return;
        }
        case 'party': {
          const p = m.partner;
          if (!p || p.state !== 'party') { this.endParty(m, null); return; }
          if (!m.lead) return;
          if (m.t % 70 === 12) { const sipper = ((m.t / 70) | 0) % 2 === 0 ? m : p; sipper.sipT = 26; }
          if (m.t % 70 === 44 && Math.random() < 0.5) this.say(((m.t / 70) | 0) % 2 === 0 ? m : p, E.pick(['heart', 'note', 'sparkle']), 40);
          if (m.t % 16 === 0) this.fx.push({ kind: 'steam', x: m.table.x + E.rand(-4, 4), y: m.table.y - 34, t: 0 });
          if (m.t >= 340) this.endParty(m, p);
          return;
        }
        case 'tea':
          m.dir = 'down';
          if (m.t % 80 === 20) m.sipT = 26;
          if (m.sipT === 0 && m.t % 14 === 0) this.fx.push({ kind: 'steam', x: m.x + 1, y: m.y - 24, t: 0 });
          if (m.t === 150) this.say(m, 'heart', 50);
          if (m.t >= 240) this.idle(m, 60, 160);
          return;
        case 'nap':
          m.dir = 'down';
          if (m.t < 380 && m.t % 46 === 10) this.fx.push({ kind: 'z', x: m.x + 10, y: m.y - 40, t: 0 });
          if (m.t === 380) { this.say(m, 'exclaim', 40); m.hop = 5; }
          if (m.t >= 420) { m.hop = 3; this.idle(m, 60, 140); }
          return;
        case 'snack':
          m.dir = 'down';
          if (m.t % 50 === 30 && m.t < 170) { m.hop = 2; this.burst('crumb', m.x, m.y - 22, 2, 4); }
          if (m.t === 170) this.say(m, 'heart', 50);
          if (m.t >= 210) this.idle(m, 60, 160);
          return;
        case 'dance':
          m.hop = Math.abs(Math.sin(m.t * 0.2)) * 5;
          if (m.t % 30 === 0) m.dir = m.dir === 'left' ? 'right' : 'left';
          if (m.t > 120) { m.dir = 'down'; this.idle(m); }
          return;
        case 'read':
          m.dir = 'down';
          if (m.t === 120) this.say(m, 'dots', 50);
          if (m.t > 220) this.idle(m);
          return;
        case 'petBunny':
          m.dir = m.petX < m.x ? 'left' : 'right';
          if (m.t % 26 === 0) { m.petJig = 10; this.fx.push({ kind: 'heart', x: m.petX, y: m.petY - 38, t: 0 }); }
          if (m.t === 140) this.say(m, 'heart', 50);
          if (m.t >= 180) this.idle(m, 60, 160);
          return;
      }
    },
    endParty(m, p) {
      const tb = m.table || (p && p.table);
      if (tb) {
        this.tables.splice(this.tables.indexOf(tb), 1);
        this.burst('puff', tb.x, tb.y - 10, 3, 8);
      }
      for (const a of [m, p]) if (a) { a.hop = 4; this.say(a, 'heart', 40); this.idle(a, 80, 200); }
    },
    chooseActivity(m) {
      const free = this.dusts.filter((d) => !d.taken);
      const others = this.members.filter((o) => o !== m && o.state === 'idle');
      const options = [['walk', 14], ['tea', 10], ['nap', 7], ['snack', 9], ['dance', 7], ['greet', 5]];
      if (free.length) options.push(['clean', 30]);
      if (others.length) options.push(['chat', 16], ['party', 12]);
      if (m.key === 'yukino') options.push(['read', 8]);
      if (m.key === 'honey') options.push(['petBunny', 9]);
      let roll = Math.random() * options.reduce((s, o) => s + o[1], 0);
      let pick = options[0][0];
      for (const [name, w] of options) { if ((roll -= w) < 0) { pick = name; break; } }
      switch (pick) {
        case 'clean': {
          const d = free.reduce((a, b) => (Math.abs(a.x - m.x) < Math.abs(b.x - m.x) ? a : b));
          d.taken = m;
          m.dust = d;
          this.walkTo(m, d.x + (m.x < d.x ? -20 : 20), d.y, 'toDust');
          return;
        }
        case 'chat':
        case 'party': {
          const p = E.pick(others);
          const [mx, my] = this.openSpot(m, 50, E.W - 50, p);
          const [l, r] = m.x < p.x ? [m, p] : [p, m];
          const gap = pick === 'party' ? 23 : 19;
          l.partner = r; r.partner = l;
          l.plan = r.plan = pick === 'party' ? 'tea' : 'chat';
          this.walkTo(l, mx - gap, my, 'toPair');
          this.walkTo(r, mx + gap, my, 'toPair');
          return;
        }
        case 'tea': m.state = 'tea'; m.t = 0; this.say(m, 'note', 40); return;
        case 'nap': m.state = 'nap'; m.t = 0; this.say(m, 'zzz', 60); return;
        case 'snack': m.state = 'snack'; m.t = 0; this.say(m, 'exclaim', 30); return;
        case 'dance': m.state = 'dance'; m.t = 0; this.say(m, 'note', 60); return;
        case 'read': m.state = 'read'; m.t = 0; return;
        case 'petBunny': m.state = 'petBunny'; m.t = 0; return;
        case 'greet': m.state = 'wave'; m.t = 0; m.dir = 'down'; this.say(m, 'heart', 60); return;
        default: {
          const [wx, wy] = this.openSpot(m);
          this.walkTo(m, wx, wy, 'walk');
        }
      }
    },
    draw(t) {
      const ctx = E.ctx;
      for (const d of this.dusts) {
        const s = 0.6 + d.life * 0.4;
        const img = E.spr.items.dust[(d.t >> 8) % 3];
        const w = Math.round(16 * s), h = Math.round(16 * s);
        ctx.drawImage(img, Math.round(d.x - w / 2), Math.round(d.y - h + 2), w, h);
      }
      const list = this.members.filter((m) => m.state !== 'wait').map((m) => ({ y: m.y, m }));
      for (const tb of this.tables) list.push({ y: tb.y, tb });
      list.sort((a, b) => a.y - b.y);
      for (const it of list) {
        if (it.m) this.drawMember(it.m, t);
        else {
          const img = E.spr.room.furniture.teatable;
          ctx.fillStyle = 'rgba(42,27,48,0.18)';
          ctx.fillRect(Math.round(it.tb.x - 12), Math.round(it.tb.y - 3), 24, 4);
          ctx.drawImage(img, Math.round(it.tb.x - img.width), Math.round(it.tb.y - img.height * 2 + 2), img.width * 2, img.height * 2);
        }
      }
      for (const f of this.fx) {
        if (f.t < 0) continue;
        if (f.kind === 'spark') ctx.drawImage(E.spr.fx.sparkle[(f.t >> 3) % 3], Math.round(f.x - 2), Math.round(f.y - 2 - f.t * 0.4));
        else if (f.kind === 'heart') ctx.drawImage(E.spr.fx.heart, Math.round(f.x - 5 + Math.sin(f.t * 0.2) * 3), Math.round(f.y - f.t * 0.5), 10, 10);
        else if (f.kind === 'steam') { ctx.fillStyle = 'rgba(255,255,255,' + (1 - f.t / 34).toFixed(2) + ')'; ctx.fillRect(Math.round(f.x + Math.sin(f.t * 0.25) * 2), Math.round(f.y - f.t * 0.45), 2, 2); }
        else if (f.kind === 'z') E.text(f.t < 30 ? 'z' : 'Z', Math.round(f.x + Math.sin(f.t * 0.12) * 4), Math.round(f.y - f.t * 0.35), { color: C.ink });
        else if (f.kind === 'puff') ctx.drawImage(E.spr.fx.puff[Math.min(3, f.t >> 2)], Math.round(f.x - 8), Math.round(f.y - 8));
        else if (f.kind === 'crumb') { ctx.fillStyle = '#c98a5a'; ctx.fillRect(Math.round(f.x + (f.t * 0.3) * (f.x % 2 ? 1 : -1)), Math.round(f.y + f.t * 0.6), 2, 2); }
      }
    },
    drawMember(m, t) {
      const ctx = E.ctx;
      const set = E.spr.maids[m.key];
      const seated = SEATED.has(m.state);
      const moving = WALKING.has(m.state) && !(m.state === 'toPair' && m.ready);
      let img = set[m.dir][moving ? [1, 0, 2, 0][(m.walkT >> 3) % 4] : 0];
      if (m.dir === 'down') {
        if (m.state === 'nap' && m.t < 380) img = set.faces.sleep;
        else if (m.state === 'wave' || m.state === 'dance' || m.emote === 'heart' || m.emote === 'sparkle') img = set.faces.happy;
      }
      const hop = Math.round(m.hop);
      const x = Math.round(m.x - 16), y = Math.round(m.y - 48 - hop);
      ctx.fillStyle = 'rgba(42,27,48,0.18)';
      ctx.fillRect(Math.round(m.x - 10), Math.round(m.y - 3), 20, 4);
      if (m.key === 'honey') {
        const jig = m.petJig > 0 ? Math.round(Math.sin(m.petJig) * 2) : 0;
        // the bunny (drawn at the maids' 2x scale) hops while it follows her and sits still for petting
        const moving = m.state !== 'petBunny' && Math.abs(m.petX - (m.dir === 'left' ? m.x + 28 : m.x - 28)) > 3;
        const air = moving ? Math.abs(Math.sin(t * 0.2)) * 6 : 0;
        const bunny = E.spr.room.bunny[air > 2 ? 1 : 0];
        const px = Math.round(m.petX - bunny.width), py = Math.round(m.petY - bunny.height * 2 - air - Math.abs(jig));
        ctx.drawImage(bunny, px, py, bunny.width * 2, bunny.height * 2);
      }
      const cleaning = m.state === 'clean';
      const sway = cleaning ? Math.round(Math.sin(m.t * 0.35) * 3) : 0;
      // Berry always has her giant vacuum (set down beside her while she sits); others fetch a broom to sweep
      const tool = m.key === 'berry' ? E.spr.room.vacuum : cleaning ? E.spr.room.broom : null;
      const toolW = tool ? tool.width * 2 : 0, toolH = tool ? tool.height * 2 : 0;
      const front = !seated && (m.dir === 'down' || (cleaning && m.dir !== 'up'));
      let toolX = cleaning ? (m.dir === 'left' ? x - toolW + 10 + sway : x + 22 + sway) : m.dir === 'left' ? x + 18 : m.dir === 'right' ? x - toolW + 14 : x + 22;
      if (seated) toolX = m.dir === 'left' ? x + 24 : x - toolW + 8;
      const toolY = Math.round(m.y - toolH + 2 - (cleaning || seated ? 0 : hop));
      if (tool && !front) ctx.drawImage(tool, toolX, toolY, toolW, toolH);
      if (seated) {
        // sitting on a cushion: legs tucked away, cushion in front
        ctx.drawImage(img, 0, 0, 16, 20, x, y + 10, 32, 40);
        ctx.drawImage(E.spr.room.cushion, Math.round(m.x - 16), Math.round(m.y - 12), 32, 16);
      } else ctx.drawImage(img, x, y, 32, 48);
      if (tool && front) ctx.drawImage(tool, toolX, toolY, toolW, toolH);
      const cup = E.spr.room.cup;
      if (m.state === 'tea') ctx.drawImage(cup, x + 8, m.sipT > 0 ? y + 17 : y + 27, 16, 16);
      if (m.state === 'party') {
        const cx = m.dir === 'right' ? x + 18 : x - 2;
        ctx.drawImage(cup, cx, m.sipT > 0 ? y + 24 : y + 32, 16, 16);
      }
      if (m.state === 'snack') {
        const sweet = E.spr.room.gifts[FAVORITE_SWEET[m.key]];
        ctx.drawImage(sweet, x + 8, y + 24 - (m.hop > 1 ? 4 : 0));
      }
      if (m.state === 'read') ctx.drawImage(E.spr.room.book, x + 6, y + 26, 20, 16);
      if (m.emote) {
        const em = E.spr.room.emotes[m.emote];
        const ey = seated ? y + 10 : y;
        if (em) ctx.drawImage(em, x + 22, ey - 14 - Math.round(Math.sin(t * 0.2)), em.width * 2, em.height * 2);
      }
    },
  };

  // ------------------------------------------------------------------ Title
  SC.title = {
    enter() {
      this.t = 0;
      this.phase = 'press';
      this.sel = 0;
      this.settings = false;
      this.setSel = 0;
      this.confirmClear = false;
      this.cast = Cast;
      Cast.members = null;
      A.playMusic('title');
    },
    items() { return [G.t('開始冒險'), G.t('女僕對決'), G.t('卡片圖鑑'), G.t('設定')]; },
    update() {
      this.t++;
      Cast.update();
      if (this.phase === 'press') {
        const ld = E.menuDir();
        if (ld === 'left' || ld === 'right') cycleLang(ld === 'left' ? -1 : 1);
        if (E.pointer.pressed && E.pointer.y >= 222) { cycleLang(1); E.input.tapped = false; return; }
        if (E.menuPressed('a') || E.menuPressed('start') || E.menuPressed('b') || E.input.tapped) { A.unlock(); A.sfx('confirm'); this.phase = 'menu'; A.playMusic('title'); }
        E.input.tapped = false;
        return;
      }
      if (this.settings) return this.updateSettings();
      const d = E.menuDir();
      const n = this.items().length;
      if (d === 'up') { this.sel = (this.sel + n - 1) % n; A.sfx('select'); }
      if (d === 'down') { this.sel = (this.sel + 1) % n; A.sfx('select'); }
      if (E.menuPressed('a')) {
        A.sfx('confirm');
        if (this.sel === 0) E.go(SAVE.maid ? SC.room : SC.intro);
        if (this.sel === 1) E.go(SC.battleSetup);
        if (this.sel === 2) E.go(SC.album, { back: SC.title });
        if (this.sel === 3) { this.settings = true; this.setSel = 0; }
      }
      if (E.menuPressed('b') || E.menuPressed('start')) { this.phase = 'press'; A.sfx('cancel'); }
    },
    updateSettings() {
      const d = E.menuDir();
      if (this.confirmClear) {
        if (E.menuPressed('a')) {
          E.clearSave();
          G.initSave();
          Cast.members = null;
          this.confirmClear = false;
          A.sfx('boom');
        }
        if (E.menuPressed('b')) { this.confirmClear = false; A.sfx('cancel'); }
        return;
      }
      if (d === 'up') { this.setSel = (this.setSel + 4) % 5; A.sfx('select'); }
      if (d === 'down') { this.setSel = (this.setSel + 1) % 5; A.sfx('select'); }
      const toggle = E.menuPressed('a') || d === 'left' || d === 'right';
      if (toggle && this.setSel === 0) { SAVE.sound = !SAVE.sound; A.setSound(SAVE.sound); persist(); A.sfx('select'); }
      if (toggle && this.setSel === 1) { SAVE.music = !SAVE.music; A.setMusic(SAVE.music); persist(); A.sfx('select'); }
      if (toggle && this.setSel === 2) cycleLang(d === 'left' ? -1 : 1);
      if (E.menuPressed('a') && this.setSel === 3) { this.confirmClear = true; A.sfx('denied'); }
      if ((E.menuPressed('a') && this.setSel === 4) || E.menuPressed('b')) { this.settings = false; A.sfx('cancel'); }
    },
    drawLangBar() {
      E.rect(0, 222, E.W, 18, 'rgba(42,27,48,0.85)');
      edgeBar({ y: 222, h: 18, color: 'rgba(42,27,48,0.85)' });
      E.text('◀', 58, 226, { color: C.pink });
      E.text('▶', 258, 226, { color: C.pink });
      G.LANGS.forEach((l, i) => {
        const on = l === G.LANG;
        const label = G.LANG_NAMES[l];
        const w = E.textWidth(label);
        const cx = 104 + i * 56;
        if (on) E.rect(cx - w / 2 - 4, 224, w + 8, 14, C.red);
        E.text(label, cx, 226, { color: on ? C.white : C.gray, align: 'center' });
      });
    },
    draw() {
      const t = this.t;
      bg(t);
      // logo
      const drop = Math.max(0, 40 - t * 2);
      const wBomb = E.textWidth('BOMB', { outline: C.plum, scale: 3 }), wMaids = E.textWidth('MAIDS', { outline: C.white, scale: 3 });
      const lx = Math.round((E.W - (wBomb + 30 + wMaids)) / 2);
      E.text('BOMB', lx, 16 - drop, { color: C.red, outline: C.plum, scale: 3 });
      E.ctx.drawImage(E.spr.bomb[(t >> 4) % 3], lx + wBomb + 3, 12 - drop, 24, 24);
      E.text('MAIDS', lx + wBomb + 30, 16 - drop, { color: C.plum, outline: C.white, scale: 3 });
      E.rect(70, 52, 180, 22, C.plum);
      lace(70, 74, 180, C.plum);
      E.text(G.t('炸彈女僕'), 160, G.LANG === 'en' ? 55 : 56, { color: C.white, align: 'center', scale: G.LANG === 'en' ? 2 : 1, size: 14 });
      E.text(G.t('～ 蕾絲咖啡廳的大掃除 ～'), 160, 82, { color: C.ink, align: 'center' });

      // the maids who have joined, going about their day
      if (!Cast.members) Cast.build();
      Cast.draw(t);

      if (this.phase === 'press') {
        if ((t >> 5) % 2 === 0) E.text('PRESS START', 160, 186, { color: C.red, outline: C.white, scale: 2, align: 'center' });
        E.text(G.t('點一下畫面，或按 Z / Enter 開始'), 160, 208, { color: C.ink, align: 'center' });
        this.drawLangBar();
        return;
      }
      // menu
      const items = this.items();
      paper(104, 172, 112, 64);
      items.forEach((s, i) => {
        const y = 177 + i * 14;
        const on = i === this.sel;
        E.text(s, 136, y, { color: on ? C.red : C.ink });
        if (on) heartCursor(122, y + 3);
      });
      if (SAVE.coins) coinLabel(312, 226, SAVE.coins, 'right');
      if (this.settings) {
        E.rect(0, 0, E.W, E.H, 'rgba(42,27,48,0.6)');
        darkPanel(70, 62, 180, 116);
        E.text(G.t('設定'), 160, 68, { color: C.gold, align: 'center' });
        const rows = [G.t('音效　{v}', { v: G.t(SAVE.sound ? '開' : '關') }), G.t('音樂　{v}', { v: G.t(SAVE.music ? '開' : '關') }), G.t('語言　{v}', { v: G.LANG_NAMES[G.LANG] }), G.t('清除存檔'), G.t('返回')];
        rows.forEach((s, i) => {
          const y = 86 + i * 17;
          E.text(s, 100, y, { color: i === this.setSel ? C.gold : C.paper });
          if (i === this.setSel) heartCursor(86, y + 3);
        });
        if (this.confirmClear) {
          darkPanel(60, 100, 200, 44);
          E.text(G.t('確定要清除所有進度嗎？'), 160, 108, { color: C.white, align: 'center' });
          E.text(G.t('Z 清除　X 取消'), 160, 126, { color: C.pink, align: 'center' });
        }
      }
    },
  };

  // ------------------------------------------------------------------ Maid select / hire
  SC.select = {
    enter(arg) {
      this.mode = (arg && arg.mode) || 'first';
      this.back = (arg && arg.back) || 'room';
      this.sel = Math.max(0, G.MAID_ORDER.indexOf(SAVE.maid || 'berry'));
      this.t = 0;
      this.msg = null;
      A.playMusic('cafe');
    },
    update() {
      this.t++;
      const d = E.menuDir();
      if (d === 'left') { this.sel = (this.sel + 3) % 4; A.sfx('select'); this.msg = null; }
      if (d === 'right') { this.sel = (this.sel + 1) % 4; A.sfx('select'); this.msg = null; }
      const key = G.MAID_ORDER[this.sel];
      const D = G.MAID_DATA[key];
      if (E.menuPressed('a')) {
        if (this.mode === 'first' && key !== G.MAID_ORDER[0]) {
          A.sfx('denied');
          const id = unlockPlan()[key];
          this.msg = G.t('打倒{id}「{title}」後，就會有新的女僕加入！', { id, title: stageById(id).title });
        } else if (this.mode === 'first') {
          SAVE.hired[key] = true;
          SAVE.maid = key;
          SAVE.first = key;
          persist();
          A.sfx('power');
          E.go(SC.room, { intro: true });
        } else if (SAVE.hired[key]) {
          SAVE.maid = key;
          persist();
          A.sfx('confirm');
          this.leave();
        } else {
          A.sfx('denied');
          const id = unlockPlan()[key];
          this.msg = G.t('打倒{id}「{title}」後，就會有新的女僕加入！', { id, title: stageById(id).title });
        }
      }
      if (E.menuPressed('b') || E.menuPressed('start')) {
        A.sfx('cancel');
        if (this.mode === 'first') E.go(SC.title); else this.leave();
      }
    },
    leave() {
      if (this.back === 'cafe') E.go(SC.cafe, { tab: 5 }); else E.go(SC.room);
    },
    draw() {
      bg(this.t);
      const hiredCount = G.MAID_ORDER.filter((k) => SAVE.hired[k]).length;
      header(G.t(this.mode === 'first' ? '第一位女僕' : '女僕換班'), this.mode === 'first' ? G.t('每打倒一個 BOSS，就有一位女僕加入') : G.t('夥伴 {n}/{total}', { n: hiredCount, total: G.MAID_ORDER.length }));
      G.MAID_ORDER.forEach((k, i) => {
        const D = G.MAID_DATA[k];
        const on = i === this.sel;
        const x = 10 + i * 76, y = on ? 22 : 26;
        const locked = isLocked(k);
        const duty = !locked && this.mode !== 'first' && SAVE.maid === k;
        E.panel(x, y, 70, 128, on ? C.paper : '#f7e3ec', on ? C.gold : C.pink, { shine: C.white });
        E.rect(x + 2, y + 2, 66, 14, locked ? '#8d86a8' : D.color);
        E.text((duty ? '★ ' : '') + maidName(k), x + 35, y + 3, { color: C.white, align: 'center', fit: 64 });
        // portrait window: the character art, darkened until she joins
        E.rect(x + 2, y + 16, 66, 82, C.plum);
        E.art('select-' + k, CG_ART, x + 3, y + 17, 64, 80, CG_CROP.select[k], locked ? 'grayscale(1) brightness(0.18) contrast(1.4)' : on ? 'none' : 'saturate(0.8) brightness(0.9)');
        if (locked) {
          E.rect(x + 3, y + 104, 64, 14, C.plum);
          E.text(G.t('打倒 {id}', { id: unlockPlan()[k] }), x + 35, y + 105, { color: C.gold, align: 'center', fit: 62 });
        } else {
          const st = this.mode === 'first' ? D.stats : maidStats(k);
          statPips(x + 6, y + 100, 'bomb', st.bombs, 6, C.red);
          statPips(x + 6, y + 109, 'fire', st.fire, 6, '#ff8a2e');
          statPips(x + 6, y + 118, 'speed', st.speed, 6, '#3d86f0');
        }
      });
      const key = G.MAID_ORDER[this.sel];
      const D = G.MAID_DATA[key];
      darkPanel(8, 156, 304, 66);
      if (isLocked(key)) {
        // nothing about her is revealed until she joins
        const id = unlockPlan()[key];
        E.text(G.t('特技「{skill}」', { skill: '？？？' }), 16, 161, { color: C.gold });
        E.text(G.t('愛心 {n}', { n: '?' }), 304, 161, { color: C.pink, align: 'right' });
        if (id) wrapLines([G.t('打倒 {id} 就會加入。', { id })], 16, 176, C.paper, 13, 290);
        E.text(this.msg || G.t('「{line}」', { line: '……' }), 16, 205, { color: this.msg ? C.mint : C.gray, fit: 290 });
      } else {
        // role, SP skill and its cost, then the skill in two lines and her passive underneath
        E.text('【' + D.role + '】' + G.t('特技「{skill}」', { skill: D.skill }), 16, 161, { color: C.gold, fit: 196 });
        E.text('SP ' + D.cost + '　' + G.t('愛心 {n}', { n: this.mode === 'first' ? D.stats.hearts : maidStats(key).hearts }), 304, 161, { color: C.pink, align: 'right' });
        wrapLines([G.joinLines(D.skillDesc)], 16, 176, C.paper, 13, 290);
        E.text(this.msg || '◆' + D.passive + '：' + G.joinLines(D.passiveDesc), 16, 205, { color: C.mint, fit: 290 });
      }
      hint(G.t(this.mode === 'first' ? '←→ 選擇　Z 決定　X 返回' : '←→ 選擇　Z 值班　X 返回'));
    },
  };

  // ------------------------------------------------------------------ Job board (stage select)
  const MAP_ROWS = 9;
  SC.map = {
    enter(arg) {
      this.t = 0;
      let first = 0;
      for (let i = 0; i < G.STAGES.length; i++) if (stageUnlocked(i)) first = i;
      this.sel = arg && arg.sel != null ? arg.sel : first;
      A.playMusic('cafe');
    },
    update() {
      this.t++;
      const d = E.menuDir();
      const n = G.STAGES.length;
      if (d === 'up') { this.sel = (this.sel + n - 1) % n; A.sfx('select'); }
      if (d === 'down') { this.sel = (this.sel + 1) % n; A.sfx('select'); }
      this.scroll = E.clamp(this.scroll || 0, Math.max(0, this.sel - MAP_ROWS + 1), Math.min(this.sel, Math.max(0, n - MAP_ROWS)));
      if (E.menuPressed('a')) {
        if (!stageUnlocked(this.sel)) A.sfx('denied');
        else if (getBond(SAVE.maid).stamina < G.JOB_STAMINA) { A.sfx('denied'); this.warn = 60 * 3; }
        else { A.sfx('start'); E.go(SC.play, { stage: this.sel }); }
      }
      if (this.warn > 0) this.warn--;
      if (E.menuPressed('b')) { A.sfx('door'); E.go(SC.room); }
      if (E.menuPressed('start')) { A.sfx('cancel'); E.go(SC.title); }
    },
    draw() {
      bg(this.t);
      header(G.t('委託看板'), '');
      coinLabel(312, 5, SAVE.coins, 'right');
      const bond = getBond(SAVE.maid);
      E.text(G.t('體力'), 200, 3, { color: C.paper });
      E.bar(226, 6, 40, 7, bond.stamina / 100, bond.stamina < G.JOB_STAMINA ? C.red : C.mint);
      // job list
      E.panel(6, 24, 132, 196, '#c98a5a', '#9c5f3a', { shine: '#e0b47a' });
      const scroll = E.clamp(this.scroll || 0, 0, Math.max(0, G.STAGES.length - MAP_ROWS));
      G.STAGES.forEach((s, i) => {
        if (i < scroll || i >= scroll + MAP_ROWS) return;
        const y = 28 + (i - scroll) * 21;
        const on = i === this.sel;
        const open = stageUnlocked(i);
        E.panel(12, y, 120, 19, on ? C.paper : open ? (s.boss ? '#ffd3dc' : '#fbe8ef') : '#d8c3cf', on ? C.red : s.boss ? '#c9506c' : '#b88a9c');
        E.rect(70, y - 1, 2, 3, C.red);
        if (open) {
          const idW = E.text(s.id, 17, y + 6, { color: on || s.boss ? C.red : C.ink });
          const rk = SAVE.cleared[s.id];
          const tx = Math.max(38, 21 + idW);
          E.text(s.title, tx, E.textImage(s.title).cjk ? y + 3 : y + 6, { color: on ? C.plum : C.ink, fit: (rk ? 117 : 129) - tx });
          if (rk) E.text(rk, 126, y + 6, { color: rankColor(rk), outline: C.plum, align: 'right' });
        } else {
          E.text('???', 44, y + 3, { color: '#9c8494' });
        }
        if (on) heartCursor(4, y + 6);
      });
      if (scroll > 0) E.text('▲', 72, 17, { color: C.gold, align: 'center' });
      if (scroll + MAP_ROWS < G.STAGES.length) E.text('▼', 72, 213, { color: C.gold, align: 'center' });
      // details
      const s = G.STAGES[this.sel];
      const open = stageUnlocked(this.sel);
      paper(144, 24, 170, 196);
      if (!open) {
        E.text(G.t('完成上一個委託後解鎖'), 229, 110, { color: C.dim, align: 'center' });
      } else {
        const TH = E.spr.themes[s.theme];
        for (let i = 0; i < 9; i++) E.ctx.drawImage(TH.floor[i % 2], 150 + i * 16, 30);
        E.ctx.drawImage(TH.hard, 150, 26); E.ctx.drawImage(TH.soft[0], 166, 26); E.ctx.drawImage(TH.soft[1], 214, 26); E.ctx.drawImage(TH.hard, 262, 26);
        E.ctx.drawImage(maidImg(SAVE.maid, 'down', [0, 1, 0, 2][(this.t >> 4) % 4]), 190, 22);
        E.rect(150, 46, 158, 1, C.pink);
        E.text(s.title, 152, 52, { color: C.red, size: 14 });
        E.text(G.t('委託人：{client}', { client: s.client }), 152, 70, { color: C.ink });
        // the brief gets three lines: Japanese and English run longer than Chinese
        wrapLines([G.joinLines(s.brief)], 152, 86, C.plum, 13, 156);
        E.rect(150, 127, 158, 1, C.pink);
        E.text(G.t('報酬'), 152, 131, { color: C.ink });
        coinLabel(186, 133, s.reward);
        E.text(G.t('時限 {time}', { time: Math.floor(s.time / 60) + ':' + String(s.time % 60).padStart(2, '0') }), 306, 131, { color: C.ink, align: 'right' });
        E.text(G.t('出現怪物'), 152, 147, { color: C.ink });
        let ex = 152;
        const types = s.boss ? [] : Object.keys(s.enemies);
        for (const k of types) { const img = E.spr.monsters[k].frames[(this.t >> 5) % 2]; E.ctx.drawImage(img, ex, 181 - img.height); ex += 20; }
        if (s.boss) fitImage((E.spr.bosses[s.boss] || E.spr.boss).frames[0], 152, 160, 30, 33);
        const best = SAVE.cleared[s.id];
        const joiner = G.MAID_ORDER.find((k) => unlockPlan()[k] === s.id && !SAVE.hired[k]);
        if (!best && joiner) {
          drawHead(joiner, 290, 181, 1);
          E.text(G.t('打倒後有新女僕加入！'), 286, 184, { color: C.red, align: 'right', fit: 100 });
        }
        if (best) {
          const rankW = E.text(best, 300, 183, { color: rankColor(best), outline: C.plum, scale: 2, align: 'right' });
          E.text(G.t('最佳評價'), 300 - rankW - 4, 186, { color: C.ink, align: 'right' });
        }
        const buffs = Object.keys(SAVE.buffs).filter((k) => SAVE.buffs[k]);
        if (buffs.length) {
          E.text(G.t('已點餐點：'), 152, 204, { color: C.ink });
          buffs.forEach((b, i) => {
            const food = G.MENU_FOOD.find((f) => f.id === b);
            E.ctx.drawImage(E.spr.ui[food.icon === 'tea' ? 'bomb' : food.icon], 300 - (buffs.length - i) * 14, 207);
          });
        }
      }
      if (this.warn > 0) {
        E.rect(144, 196, 170, 22, C.plum);
        E.text(G.t('女僕太累了！先回房間休息吧'), 229, 201, { color: C.pink, align: 'center' });
      }
      hint(G.t('Z 出發（體力 -{n}）　X 回房間　ESC 標題', { n: G.JOB_STAMINA }));
    },
  };

  // ------------------------------------------------------------------ Café
  SC.cafe = {
    enter(arg) {
      this.t = 0;
      this.tab = (arg && arg.tab) || 0;
      this.focus = 'tabs';
      this.row = 0;
      this.scroll = 0;
      this.msg = '';
      this.gacha = null;
      A.playMusic('cafe');
    },
    tabs: ['甜點補給', '禮物專櫃', '家具店', '女僕強化', '扭蛋機', '女僕換班', '回房間'],
    listFor(tab) {
      if (tab === 0) return G.MENU_FOOD;
      if (tab === 1) return G.GIFTS;
      if (tab === 2) return G.FURNITURE_SHOP;
      if (tab === 3) return G.UPGRADES;
      return [];
    },
    update() {
      this.t++;
      if (this.gacha) return this.updateGacha();
      const d = E.menuDir();
      const n = this.tabs.length;
      if (this.focus === 'tabs') {
        if (d === 'up') { this.tab = (this.tab + n - 1) % n; A.sfx('select'); this.msg = ''; }
        if (d === 'down') { this.tab = (this.tab + 1) % n; A.sfx('select'); this.msg = ''; }
        if (E.menuPressed('a') || d === 'right') {
          if (this.tab === 6) { A.sfx('door'); E.go(SC.room); return; }
          if (this.tab === 5) { A.sfx('confirm'); E.go(SC.select, { mode: 'switch', back: 'cafe' }); return; }
          A.sfx('confirm');
          this.focus = 'list';
          this.row = 0;
          this.scroll = 0;
        }
        if (E.menuPressed('b') || E.menuPressed('start')) { A.sfx('door'); E.go(SC.room); }
        return;
      }
      if (this.tab === 4) {
        if (E.menuPressed('a')) this.spin();
        if (E.menuPressed('b') || d === 'left') { this.focus = 'tabs'; A.sfx('cancel'); }
        return;
      }
      const list = this.listFor(this.tab);
      if (this.tab === 1) {
        // 2-column grid
        if (d === 'up') { this.row = (this.row + list.length - 2) % list.length; A.sfx('select'); }
        if (d === 'down') { this.row = (this.row + 2) % list.length; A.sfx('select'); }
        if (d === 'right') { this.row = Math.min(list.length - 1, this.row + 1); A.sfx('select'); }
        if (d === 'left') {
          if (this.row % 2 === 0) { this.focus = 'tabs'; A.sfx('cancel'); this.msg = ''; return; }
          this.row--; A.sfx('select');
        }
        if (E.menuPressed('b')) { this.focus = 'tabs'; A.sfx('cancel'); this.msg = ''; }
      } else {
        if (d === 'up') { this.row = (this.row + list.length - 1) % list.length; A.sfx('select'); }
        if (d === 'down') { this.row = (this.row + 1) % list.length; A.sfx('select'); }
        if (E.menuPressed('b') || d === 'left') { this.focus = 'tabs'; A.sfx('cancel'); this.msg = ''; }
        const visible = this.tab === 2 ? 4 : 4;
        if (this.row < this.scroll) this.scroll = this.row;
        if (this.row >= this.scroll + visible) this.scroll = this.row - visible + 1;
      }
      if (E.menuPressed('a')) this.buy(list);
    },
    buy(list) {
      if (this.tab === 0) {
        const f = G.MENU_FOOD[this.row];
        if (SAVE.buffs[f.id]) { A.sfx('denied'); this.msg = G.t('已經點過囉，下個委託會送上。'); }
        else if (SAVE.coins < f.price) { A.sfx('denied'); this.msg = G.t('金幣不夠……'); }
        else { SAVE.coins -= f.price; SAVE.buffs[f.id] = true; persist(); A.sfx('coin'); this.msg = G.t('{name} 點好了！{desc}', { name: f.name, desc: f.desc }); }
      } else if (this.tab === 1) {
        const g = G.GIFTS[this.row];
        if (SAVE.coins < g.price) { A.sfx('denied'); this.msg = G.t('金幣不夠……還差 {n}G', { n: g.price - SAVE.coins }); }
        else { SAVE.coins -= g.price; SAVE.gifts[g.id] = (SAVE.gifts[g.id] || 0) + 1; persist(); A.sfx('buy'); this.msg = G.t('買了{name}！回房間送給女僕吧。', { name: g.name }); }
      } else if (this.tab === 2) {
        const id = G.FURNITURE_SHOP[this.row];
        const F = G.FURNITURE[id];
        const room = getRoom();
        if (F.unique && room.owned[id]) { A.sfx('denied'); this.msg = G.t('房間裡已經有{name}了。', { name: F.name }); }
        else if (SAVE.coins < F.price) { A.sfx('denied'); this.msg = G.t('金幣不夠……還差 {n}G', { n: F.price - SAVE.coins }); }
        else {
          SAVE.coins -= F.price;
          room.owned[id] = (room.owned[id] || 0) + 1;
          const placed = G.ROOMAPI && G.ROOMAPI.autoPlace(id);
          G.guideStep('shop');
          persist();
          A.sfx('buy');
          this.msg = G.t(placed ? '{name} 已經搬進房間了！' : '{name} 放進倉庫了（房間太擠）', { name: F.name });
        }
      } else {
        const u = G.UPGRADES[this.row];
        const lv = SAVE.upgrades[u.id];
        if (lv >= u.prices.length) { A.sfx('denied'); this.msg = G.t('已經強化到最高級了！'); }
        else if (SAVE.coins < u.prices[lv]) { A.sfx('denied'); this.msg = G.t('金幣不夠……還差 {n}G', { n: u.prices[lv] - SAVE.coins }); }
        else { SAVE.coins -= u.prices[lv]; SAVE.upgrades[u.id]++; persist(); A.sfx('power'); this.msg = G.t('{name} 強化到 Lv.{lv}！', { name: u.name, lv: SAVE.upgrades[u.id] }); }
      }
    },
    spin() {
      if (SAVE.coins < G.GACHA_PRICE) { A.sfx('denied'); this.msg = G.t('需要 {n}G 才能轉扭蛋。', { n: G.GACHA_PRICE }); return; }
      SAVE.coins -= G.GACHA_PRICE;
      const roll = Math.random();
      const rare = roll < 0.07 ? 3 : roll < 0.32 ? 2 : 1;
      const pool = G.CARDS.filter((c) => c.rare === rare);
      const card = E.pick(pool);
      const dup = !!SAVE.cards[card.id];
      SAVE.cards[card.id] = (SAVE.cards[card.id] || 0) + 1;
      if (dup) SAVE.coins += 30;
      persist();
      this.gacha = { t: 0, card, dup };
      A.sfx('gacha');
    },
    updateGacha() {
      const g = this.gacha;
      g.t++;
      if (g.t === 70) A.sfx(g.card.rare >= 2 ? 'rare' : 'item');
      if (g.t > 80 && (E.menuPressed('a') || E.menuPressed('b'))) { this.gacha = null; A.sfx('confirm'); }
    },
    draw() {
      const t = this.t;
      bg(t);
      header(G.t('女僕咖啡廳「蕾絲炸彈」'));
      coinLabel(312, 5, SAVE.coins, 'right');
      // tabs
      darkPanel(6, 24, 84, 122);
      this.tabs.forEach((s, i) => {
        const y = 29 + i * 16;
        const on = i === this.tab;
        if (on) E.rect(9, y - 2, 78, 15, this.focus === 'tabs' ? C.red : C.panel2);
        E.text(G.t(s), 22, y, { color: on ? C.white : C.gray });
        if (on && this.focus === 'tabs') heartCursor(10, y + 3);
      });
      this.drawCounter(6, 150);
      // content
      paper(96, 24, 218, 196);
      if (this.tab === 0) this.drawFood();
      else if (this.tab === 1) this.drawGifts();
      else if (this.tab === 2) this.drawFurniture();
      else if (this.tab === 3) this.drawUpgrades();
      else if (this.tab === 4) this.drawGachaPanel();
      else if (this.tab === 5) {
        E.text(G.t('女僕換班'), 205, 40, { color: C.red, align: 'center', size: 14 });
        wrapLines([G.t('每打倒一個 BOSS，就有新的女僕加入。在這裡可以讓她們換班。'), '', G.t('按 Z 前往更衣室')], 112, 66, C.ink, 16, 190);
        const plan = unlockPlan();
        G.MAID_ORDER.forEach((k, i) => {
          drawMaidFigure(k, 124 + i * 44, 150, 2, 0);
          if (!SAVE.hired[k] && plan[k]) E.text(plan[k], 140 + i * 44, 140, { color: C.red, align: 'center' });
        });
      } else {
        E.text(G.t('回到自己的房間'), 205, 110, { color: C.ink, align: 'center' });
      }
      if (this.msg) {
        E.rect(98, 198, 214, 20, C.plum);
        marquee(this.msg, 102, 202, 206, C.mint);
      }
      const hints = { tabs: G.t('↑↓ 選擇　Z 決定　X 回房間'), gacha: G.t('Z 轉扭蛋　X 返回'), grid: G.t('方向鍵 選擇　Z 購買　X 返回'), list: G.t('↑↓ 選擇　Z 購買　X 返回') };
      hint(this.focus === 'tabs' ? hints.tabs : this.tab === 4 ? hints.gacha : this.tab === 1 ? hints.grid : hints.list);
      if (this.gacha) this.drawGachaReveal();
    },
    drawCounter(x, y) {
      const ctx = E.ctx;
      const k = SAVE.maid || 'berry';
      E.panel(x, y, 84, 70, '#ffd6e4', C.pink, { shine: C.white });
      E.rect(x + 3, y + 3, 78, 24, '#ffe9f0');
      E.rect(x + 8, y + 13, 68, 2, '#c98a5a');
      ctx.drawImage(E.spr.room.gifts.daifuku, x + 6, y - 2);
      ctx.drawImage(E.spr.room.gifts.honeycake, x + 24, y - 2);
      const peng = E.spr.monsters.penguin.frames[(this.t >> 5) % 2];
      ctx.drawImage(peng, x + 8, y + 38 - peng.height);
      // the maid on duty: her CG portrait stands behind the counter, cut off at the counter top
      E.panel(x + 46, y + 2, 34, 36, '#ffe0ea', G.MAID_DATA[k].color, {});
      E.art('cafe-maid', CG_ART, x + 48, y + 4, 30, 32, CG_CROP.bust[k]);
      E.rect(x + 3, y + 36, 78, 31, '#9c5f3a');
      E.rect(x + 3, y + 36, 78, 4, '#c98a5a');
      for (let i = 0; i < 78; i += 6) E.rect(x + 4 + i, y + 42, 3, 23, '#8c5230');
      ctx.drawImage(E.spr.bomb[(this.t >> 4) % 3], x + 27, y + 24);
    },
    drawGifts() {
      E.text(G.t('禮物專櫃'), 106, 30, { color: C.red, size: 14 });
      E.text(G.t('回房間送給女僕'), 306, 32, { color: C.dim, align: 'right' });
      G.GIFTS.forEach((g, i) => {
        const col = i % 2, row = (i / 2) | 0;
        const x = 104 + col * 104, y = 50 + row * 48;
        const on = this.focus === 'list' && i === this.row;
        E.panel(x, y, 98, 44, on ? '#fff' : C.paper2, on ? C.red : C.pink);
        E.ctx.drawImage(E.spr.room.gifts[g.id], x + 5, y + 6);
        E.text(g.name, x + 25, y + 4, { color: C.plum, fit: 70 });
        const fav = g.fav === 'all' ? G.t('大家都喜歡') : G.t('{name}最愛', { name: G.MAID_DATA[g.fav].name });
        E.text(fav, x + 25, y + 18, { color: g.fav === 'all' ? C.red : C.ink, fit: 70 });
        coinLabel(x + 6, y + 31, g.price);
        E.text(G.t('持有 {n}', { n: SAVE.gifts[g.id] || 0 }), x + 92, y + 30, { color: C.dim, align: 'right' });
        if (on) heartCursor(x - 8, y + 16);
      });
    },
    drawFurniture() {
      E.text(G.t('家具店'), 106, 30, { color: C.red, size: 14 });
      E.text(G.t('買了會自動搬進房間'), 306, 32, { color: C.dim, align: 'right' });
      const room = getRoom();
      const list = G.FURNITURE_SHOP;
      for (let i = this.scroll; i < Math.min(list.length, this.scroll + 4); i++) {
        const id = list[i];
        const F = G.FURNITURE[id];
        const y = 50 + (i - this.scroll) * 37;
        const on = this.focus === 'list' && i === this.row;
        E.panel(104, y, 202, 34, on ? '#fff' : C.paper2, on ? C.red : C.pink);
        const img = E.spr.room.furniture[id];
        const s = img.height > 30 || img.width > 30 ? 0.5 : 1;
        const iw = img.width * s, ih = img.height * s;
        E.ctx.drawImage(img, Math.round(122 - iw / 2), Math.round(y + 17 - ih / 2), iw, ih);
        E.text(F.name, 140, y + 3, { color: C.plum, fit: 104 });
        E.text(F.desc, 140, y + 18, { color: C.ink, fit: 158 });
        if (F.unique && room.owned[id]) E.text(G.t('已擁有'), 298, y + 3, { color: C.red, align: 'right' });
        else coinLabel(298, y + 5, F.price, 'right');
        if (on) heartCursor(96, y + 13);
      }
      if (this.scroll > 0) E.text('▲', 300, 40, { color: C.pink });
      if (this.scroll + 4 < list.length) E.text('▼', 300, 196, { color: C.pink });
    },
    drawFood() {
      E.text(G.t('甜點補給'), 106, 30, { color: C.red, size: 14 });
      E.text(G.t('效果只維持到下一個委託'), 306, 32, { color: C.dim, align: 'right' });
      G.MENU_FOOD.forEach((f, i) => {
        const y = 52 + i * 36;
        const on = this.focus === 'list' && i === this.row;
        E.panel(104, y, 202, 32, on ? '#fff' : C.paper2, on ? C.red : C.pink);
        E.ctx.drawImage(E.spr.items[f.icon], 110, y + 8);
        E.text(f.name, 132, y + 4, { color: C.plum });
        E.text(f.desc, 132, y + 18, { color: C.ink, fit: 136 });
        if (SAVE.buffs[f.id]) E.text(G.t('已點'), 298, y + 10, { color: C.red, align: 'right' });
        else coinLabel(298, y + 12, f.price, 'right');
        if (on) heartCursor(96, y + 12);
      });
    },
    drawUpgrades() {
      E.text(G.t('女僕強化'), 106, 30, { color: C.red, size: 14 });
      E.text(G.t('永久效果'), 306, 32, { color: C.dim, align: 'right' });
      G.UPGRADES.forEach((u, i) => {
        const y = 52 + i * 36;
        const on = this.focus === 'list' && i === this.row;
        const lv = SAVE.upgrades[u.id];
        E.panel(104, y, 202, 32, on ? '#fff' : C.paper2, on ? C.red : C.pink);
        E.ctx.drawImage(E.spr.items[u.icon], 110, y + 8);
        E.text(u.name, 132, y + 4, { color: C.plum, fit: 74 });
        E.text(u.desc, 132, y + 18, { color: C.ink, fit: 124 });
        for (let p = 0; p < u.prices.length; p++) E.rect(210 + p * 8, y + 7, 6, 6, p < lv ? C.red : '#e8cbd6');
        if (lv >= u.prices.length) E.text('MAX', 298, y + 18, { color: C.red, align: 'right' });
        else coinLabel(298, y + 18, u.prices[lv], 'right');
        if (on) heartCursor(96, y + 12);
      });
    },
    drawGachaPanel() {
      const t = this.t;
      E.text(G.t('扭蛋機'), 106, 30, { color: C.red, size: 14 });
      const owned = G.CARDS.filter((c) => SAVE.cards[c.id]).length;
      E.text(G.t('收集 {n}/{total}', { n: owned, total: G.CARDS.length }), 306, 32, { color: C.dim, align: 'right' });
      this.drawMachine(108, 56, t, false);
      E.text(G.t('轉一次'), 180, 60, { color: C.ink });
      coinLabel(222, 62, G.GACHA_PRICE);
      const n = wrapLines([G.t('抽出怪物卡或女僕卡！重複的卡會退還 30G。')], 180, 80, C.ink, 15, 126);
      E.text('N 68%  R 25%  SR 7%', 180, 88 + n * 15, { color: C.dim });
      if (this.focus === 'list' && (t >> 5) % 2 === 0) E.text(G.t('按 Z 轉扭蛋！'), 180, 150, { color: C.red });
      else if (this.focus !== 'list') E.text(G.t('按 → 或 Z 進入'), 180, 150, { color: C.dim });
    },
    drawMachine(x, y, t, shake) {
      const ox = shake ? E.randi(-1, 1) : 0;
      E.panel(x + ox, y, 60, 120, '#8fc6ff', '#3d86f0', { shine: '#d9ecff' });
      E.rect(x + 6 + ox, y + 8, 48, 48, '#e6f4ff');
      const caps = [[12, 40, C.red], [26, 44, C.gold], [38, 38, C.mint], [18, 28, C.pink], [34, 26, C.sky], [24, 16, '#fff']];
      for (const [cx, cy, col] of caps) { E.rect(x + ox + cx, y + cy, 8, 8, col); E.rect(x + ox + cx, y + cy + 4, 8, 4, '#ffffff'); }
      E.rect(x + 6 + ox, y + 8, 48, 2, '#ffffff');
      E.rect(x + 6 + ox, y + 64, 48, 48, '#3d86f0');
      E.rect(x + 22 + ox, y + 72, 16, 16, C.plum);
      E.rect(x + 28 + ox, y + 70 + ((t >> 3) % 4 === 0 ? 2 : 0), 4, 20, C.white);
      E.rect(x + 12 + ox, y + 96, 36, 12, C.plum);
    },
    drawGachaReveal() {
      const g = this.gacha;
      E.rect(0, 0, E.W, E.H, 'rgba(42,27,48,0.88)');
      E.artShade(0); // hides the café counter portrait; the card drawn below shows its own picture
      if (g.t < 60) {
        this.drawMachine(130, 50, g.t, true);
        if (g.t > 36) {
          const cy = 150 + Math.min(30, (g.t - 36) * 2);
          E.rect(152, cy, 16, 16, g.card.rare === 3 ? C.gold : g.card.rare === 2 ? C.pink : C.sky);
          E.rect(152, cy + 8, 16, 8, C.white);
        }
        return;
      }
      const s = Math.min(1, (g.t - 60) / 12);
      const w = Math.max(2, Math.round(84 * s));
      if (g.card.rare >= 2) {
        for (let i = 0; i < 12; i++) {
          const a = i / 12 * Math.PI * 2 + g.t * 0.02;
          E.ctx.drawImage(E.spr.fx.sparkle[(g.t >> 3) % 3], 160 + Math.cos(a) * 70 - 2, 110 + Math.sin(a) * 60 - 2);
        }
      }
      drawCard(g.card, 160 - w / 2, 58, w, 108, true, 'gacha');
      if (g.t > 72) {
        const info = cardInfo(g.card);
        E.text(G.RARE_NAME[g.card.rare] + '  ' + info.name, 160, 174, { color: g.card.rare === 3 ? C.gold : g.card.rare === 2 ? C.pink : C.white, align: 'center', size: 14 });
        E.text(G.t(g.dup ? '重複了！退還 30G' : 'NEW! 已加入卡片圖鑑'), 160, 194, { color: g.dup ? C.gray : C.mint, align: 'center' });
        E.text(G.t('按 Z 繼續'), 160, 212, { color: C.gray, align: 'center' });
      }
    },
  };

  // ------------------------------------------------------------------ cards
  function cardInfo(card) {
    if (card.kind === 'monster') { const D = G.ENEMY_DATA[card.ref]; return { name: D.name, desc: D.desc }; }
    if (card.kind === 'maid') {
      if (isLocked(card.ref)) return { name: '？？？', desc: G.t('還沒加入的神秘女僕。') };
      const D = G.MAID_DATA[card.ref];
      return { name: D.name, desc: G.t('喜歡{like}，興趣是{hobby}。', { like: D.like, hobby: D.hobby }) };
    }
    return { name: card.name, desc: card.desc };
  }
  // slot: a stable name for where the card is shown (its CG picture is reused frame to frame)
  function drawCard(card, x, y, w, h, faceUp, slot) {
    const ctx = E.ctx;
    const rim = card.rare === 3 ? ['#ffd23f', '#ff9fbb', '#8fc6ff', '#b8f28a'][(E.frame >> 4) % 4] : card.rare === 2 ? C.gold : '#c6c0d8';
    E.panel(x, y, w, h, faceUp ? '#fff' : C.panel, rim, {});
    if (!faceUp || w < 30) return;
    const inner = card.kind === 'maid' ? '#ffe0ea' : card.kind === 'monster' ? '#e6f4ff' : '#fff6cc';
    E.rect(x + 4, y + 4, w - 8, h - 22, inner);
    const cx = x + w / 2, cy = y + (h - 18) / 2;
    const big = h > 80;
    if (card.kind === 'maid') {
      // her CG fills the picture window: head to waist on the big card, head and shoulders on small ones
      // (a dark shadow while she has not joined yet, like the character select)
      E.art('card-' + slot, CG_ART, x + 4, y + 4, w - 8, h - 22, (big ? CG_CROP.select : CG_CROP.bust)[card.ref], isLocked(card.ref) ? 'grayscale(1) brightness(0.18) contrast(1.4)' : null);
    } else if (card.kind === 'monster') {
      const img = E.spr.monsters[card.ref].frames[(E.frame >> 5) % 2];
      const s = big ? 3 : w < 50 ? 1 : 2;
      fitImage(img, Math.round(cx - 8 * s), Math.round(cy - 9 * s), 16 * s, 18 * s);
    } else if (card.kind === 'boss') {
      const img = ((E.spr.bosses && E.spr.bosses[card.ref]) || E.spr.boss).frames[0];
      const s = big ? 1.5 : w < 50 ? 0.5 : 1;
      fitImage(img, Math.round(cx - 20 * s), Math.round(cy - 22 * s), 40 * s, 44 * s);
    } else {
      const s = big ? 4 : w < 50 ? 1 : 2;
      ctx.drawImage(E.spr.bomb[(E.frame >> 4) % 3], Math.round(cx - 8 * s), Math.round(cy - 8 * s), 16 * s, 16 * s);
    }
    const stars = card.rare;
    for (let i = 0; i < stars; i++) ctx.drawImage(E.spr.fx.star[0], Math.round(cx - stars * 3.5 + i * 7), y + h - 14);
  }

  SC.album = {
    enter(arg) { this.t = 0; this.sel = 0; this.back = (arg && arg.back) || SC.title; },
    update() {
      this.t++;
      const d = E.menuDir();
      const n = G.CARDS.length, cols = 9;
      if (d === 'left') { this.sel = (this.sel + n - 1) % n; A.sfx('select'); }
      if (d === 'right') { this.sel = (this.sel + 1) % n; A.sfx('select'); }
      if (d === 'up') { this.sel = (this.sel + n - cols) % n; A.sfx('select'); }
      if (d === 'down') { this.sel = (this.sel + cols) % n; A.sfx('select'); }
      if (E.menuPressed('b') || E.menuPressed('start')) { A.sfx('cancel'); E.go(this.back); }
    },
    draw() {
      bg(this.t);
      const owned = G.CARDS.filter((c) => SAVE.cards[c.id]).length;
      header(G.t('卡片圖鑑'), owned + ' / ' + G.CARDS.length);
      G.CARDS.forEach((card, i) => {
        const col = i % 9, row = (i / 9) | 0;
        const x = 9 + col * 34, y = 26 + row * 58;
        const has = !!SAVE.cards[card.id];
        drawCard(card, x, y, 31, 52, has, 'album-' + i);
        if (!has) E.text('?', x + 15, y + 22, { color: C.gray, align: 'center' });
        if (i === this.sel) { E.ctx.strokeStyle = C.red; E.ctx.lineWidth = 2; E.ctx.strokeRect(x - 1, y - 1, 33, 54); }
      });
      const card = G.CARDS[this.sel];
      const has = SAVE.cards[card.id];
      darkPanel(8, 144, 304, 78);
      if (has) {
        drawCard(card, 16, 150, 50, 66, true, 'album-detail');
        const info = cardInfo(card);
        E.text(G.RARE_NAME[card.rare] + '  ' + info.name, 76, 154, { color: card.rare === 3 ? C.gold : card.rare === 2 ? C.pink : C.white, size: 14 });
        E.text(info.desc, 76, 176, { color: C.paper });
        E.text(G.t('持有 ×{n}', { n: has }), 76, 196, { color: C.gray });
      } else {
        E.text(G.t('還沒有抽到這張卡。'), 160, 170, { color: C.gray, align: 'center' });
        E.text(G.t('到咖啡廳的扭蛋機試試手氣吧！'), 160, 188, { color: C.gray, align: 'center' });
      }
      hint(G.t('方向鍵 選擇　X 返回'));
    },
  };

  // ------------------------------------------------------------------ Play (story)
  const TIPS = [
    '掃起灰塵可以累積特技，打掃度越高評價越好。',
    '最後一隻怪物倒下前，記得把灰塵掃乾淨！',
    '炸彈的火焰會引爆其他炸彈，形成連鎖爆炸。',
    '到咖啡廳點甜點，下個委託會更輕鬆。',
    '時間剩 30 秒時，怪物會變得更快！',
  ];
  SC.play = {
    enter(arg) {
      this.stageIndex = arg.stage;
      const def = G.STAGES[this.stageIndex];
      this.def = def;
      const st = maidStats(SAVE.maid);
      const pk = perks(SAVE.maid);
      const bond = getBond(SAVE.maid);
      // a fresh attempt costs stamina; restarting from the pause menu does not
      this.staminaSpent = arg.restart ? (arg.staminaSpent || 0) : Math.min(bond.stamina, G.JOB_STAMINA);
      if (!arg.restart) bond.stamina = Math.max(0, bond.stamina - G.JOB_STAMINA);
      const buffs = SAVE.buffs;
      if (buffs.cake) st.hearts++;
      if (buffs.pudding) st.fire++;
      if (buffs.latte) st.speed++;
      st.hearts += pk.heartBonus;
      const sp = buffs.tea ? 100 : Math.min(100, 30 + pk.spStart);
      this.perks = pk;
      this.usedBuffs = Object.keys(buffs).filter((k) => buffs[k]);
      SAVE.buffs = {};
      persist();
      this.world = new G.World({
        mode: 'story', stage: def, theme: def.theme, layout: def.layout, decor: def.decor, soft: def.soft, items: def.items,
        enemies: def.enemies, dust: def.dust, time: def.time, boss: def.boss || null,
        players: [{ maid: SAVE.maid, human: true, pad: 0, stats: st, sp, perks: pk }],
      });
      this.paused = false;
      this.pauseSel = 0;
      this.tutorial = this.stageIndex === 0 && !SAVE.tutorial;
      this.tip = E.pick(TIPS);
      this.hurry = false;
      E.input.duo = false;
      A.tempoScale = 1;
      A.playMusic(def.boss ? 'boss' : 'stage');
    },
    exit() { A.tempoScale = 1; },
    update() {
      const w = this.world;
      if (this.tutorial) {
        if (E.menuPressed('a') || E.menuPressed('start')) { this.tutorial = false; SAVE.tutorial = true; persist(); A.sfx('confirm'); }
        return;
      }
      if (this.paused) {
        const d = E.menuDir();
        if (d === 'up' || d === 'down') { this.pauseSel = (this.pauseSel + (d === 'up' ? 2 : 1)) % 3; A.sfx('select'); }
        if (E.menuPressed('start') || E.menuPressed('b')) { this.paused = false; A.sfx('cancel'); }
        if (E.menuPressed('a')) {
          A.sfx('confirm');
          if (this.pauseSel === 0) this.paused = false;
          if (this.pauseSel === 1) { this.restoreBuffs(); E.go(SC.play, { stage: this.stageIndex, restart: true, staminaSpent: this.staminaSpent }); }
          if (this.pauseSel === 2) {
            this.restoreBuffs();
            const bond = getBond(SAVE.maid);
            bond.stamina = Math.min(100, bond.stamina + this.staminaSpent);
            persist();
            E.go(SC.room);
          }
        }
        return;
      }
      if (E.pressed(0, 'start') && w.state === 'play') { this.paused = true; this.pauseSel = 0; A.sfx('select'); return; }
      w.update();
      if (w.state === 'play' && !this.hurry && w.timeLeft <= 30 * 60) {
        this.hurry = true;
        A.tempoScale = 1.25;
        w.floaters.push({ x: 120, y: 90, text: 'HURRY UP!', col: C.red, t: 0, big: true });
        A.sfx('denied');
      }
      if (w.state === 'clear') {
        if (w.stateT === 1) { A.stopMusic(); A.playMusic('clear'); }
        if (w.stateT > 170) E.go(SC.result, { stage: this.stageIndex, world: w });
      }
      if (w.state === 'fail') {
        if (w.stateT === 1) { A.stopMusic(); A.playMusic('fail'); }
        if (w.stateT > 150) E.go(SC.gameover, { stage: this.stageIndex, world: w });
      }
    },
    drawTutorial() {
      const touch = E.input.lastDevice === 'touch';
      E.rect(0, 0, E.W, E.H, 'rgba(42,27,48,0.72)');
      E.artShade(0); // the rules sheet covers the HUD portrait
      paper(20, 22, 280, 196);
      E.text(G.t('女僕的工作守則'), 160, 30, { color: C.red, align: 'center', size: 14 });
      const rows = [
        ['bomb', G.t('{key} 放炸彈，火焰呈十字炸開。', { key: touch ? 'A' : 'Z' })],
        ['tea', G.t('{key} 使用女僕特技（消耗 SP）。', { key: touch ? 'B' : 'X' })],
        ['heart', G.t('打倒全部怪物就能完成委託。')],
        ['star', G.t('炸開家具會掉出道具，記得撿！')],
      ];
      rows.forEach(([icon, text], i) => {
        const y = 52 + i * 30;
        E.ctx.drawImage(E.spr.items[icon], 34, y);
        E.text(text, 58, y + 2, { color: C.plum });
      });
      E.ctx.drawImage(E.spr.items.dust[(E.frame >> 5) % 3], 34, 172);
      wrapLines([G.t('掃起灰塵可以累積 SP，打掃度越高，評價和報酬越好。')], 58, 170, C.ink, 14, 230);
      if ((E.frame >> 5) % 2 === 0) E.text(G.t(touch ? '按 A 開始工作' : '按 Z 開始工作'), 160, 202, { color: C.red, align: 'center' });
    },
    restoreBuffs() {
      for (const b of this.usedBuffs) SAVE.buffs[b] = true;
      persist();
    },
    draw() {
      const w = this.world;
      E.rect(0, 0, E.W, E.H, C.plum);
      w.draw(E.ctx);
      // banner
      E.rect(0, 0, 240, 16, '#000000'); E.rect(0, 15, 240, 1, '#f8b000');
      edgeBar({ y: 0, h: 16, rule: 15 });
      const idW = E.text(this.def.id, 6, 5, { color: C.pink });
      E.text(this.def.title, 12 + idW, 2, { color: C.white });
      const tl = Math.max(0, Math.ceil(w.timeLeft / 60));
      const mm = Math.floor(tl / 60), ss = String(tl % 60).padStart(2, '0');
      E.text(mm + ':' + ss, 234, 5, { color: tl <= 30 && (E.frame >> 4) % 2 ? C.red : C.gold, align: 'right' });
      // bottom strip
      E.rect(0, 224, 240, 16, '#000000'); E.rect(0, 224, 240, 1, '#f8b000');
      edgeBar({ y: 224, h: 16, rule: 224 });
      if (w.boss && w.boss.alive) {
        const nameW = E.text(this.def.title, 6, 226, { color: C.gold, fit: 80 });
        E.bar(12 + nameW, 228, 222 - nameW, 8, w.boss.hp / w.boss.maxHp, w.boss.hitT > 0 && (E.frame >> 2) % 2 ? C.white : C.red);
      } else marquee(G.t(this.tip), 4, 226, 232, C.gray);
      drawStoryPanel(w);

      if (w.state === 'ready') {
        const t = w.stateT;
        const x = Math.min(0, -240 + t * 12);
        E.rect(x, 92, 240, 40, 'rgba(42,27,48,0.85)');
        lace(x, 132, 240, C.pink);
        E.text(this.def.id + '  ' + this.def.title, x + 120, 98, { color: C.white, align: 'center', size: 14 });
        E.text(t < 70 ? 'READY...' : 'START!', x + 120, 118, { color: t < 70 ? C.gold : C.red, align: 'center', scale: 1 });
      }
      if (w.state === 'clear' && w.stateT > 20) {
        const t = w.stateT - 20;
        const s = t < 8 ? 3 : 2;
        E.text(G.t('委託完成！'), 120, 86, { color: C.gold, outline: C.plum, align: 'center', scale: s, size: 14 });
        if (t > 30) E.text('STAGE CLEAR', 120, 124, { color: C.white, outline: C.red, align: 'center', scale: 2 });
      }
      if (w.state === 'fail' && w.stateT > 30) {
        E.text(G.t(w.failReason === 'time' ? '時間到了……' : '被炸飛了……'), 120, 96, { color: C.white, outline: C.plum, align: 'center', scale: 2, size: 12 });
      }
      if (this.tutorial) this.drawTutorial();
      if (this.paused) {
        E.rect(0, 0, E.W, E.H, 'rgba(42,27,48,0.6)');
        E.artShade(0.4);
        darkPanel(70, 70, 180, 96);
        E.text(G.t('暫停'), 160, 76, { color: C.gold, align: 'center', size: 14 });
        [G.t('繼續'), G.t('重新開始'), G.t('放棄委託')].forEach((s, i) => {
          const y = 102 + i * 18;
          E.text(s, 160, y, { color: i === this.pauseSel ? C.white : C.gray, align: 'center' });
          if (i === this.pauseSel) heartCursor(120, y + 3);
        });
      }
    },
  };

  // orange-rimmed white box like the original HUD's item slots
  function slot(x, y, w, h) { E.panel(x, y, w, h, '#ffffff', '#ff8a1a', { outline: '#000000' }); }
  function drawStoryPanel(w) {
    const ctx = E.ctx;
    const m = w.maids[0];
    const D = G.MAID_DATA[m.maidKey];
    const x0 = 240;
    goldBar(x0, 0, 80, 240);
    // emblem and bunny badge beside her CG face strip (sooty and shaking for a moment when she gets blasted)
    ctx.drawImage(E.spr.ui.emblem, x0 + 4, 4);
    ctx.drawImage(E.spr.ui.bunny, x0 + 5, 20);
    const hurt = m.burnT > 0;
    E.art('play-portrait', CG_ART, x0 + 18 + (hurt ? ((E.frame >> 1) % 2 ? 1 : -1) : 0), 3, 59, 30, CG_CROP.face[m.maidKey], hurt ? 'sepia(0.7) brightness(0.45) contrast(1.3)' : null);
    E.rect(x0 + 3, 33, 74, 1, '#f8b000');
    // hearts
    for (let i = 0; i < m.maxHearts; i++) ctx.drawImage(i < m.hearts ? E.spr.ui.heart : E.spr.ui.heartEmpty, x0 + 6 + (i % 8) * 9, 37 + ((i / 8) | 0) * 9);
    // Honey's sugar shield: a pink bubble when it is up, an outline filling back in while it regrows
    if (m.maidKey === 'honey') {
      const sx = x0 + 6 + Math.min(m.maxHearts, 7) * 9, sy = 37;
      const up = m.shield > 0;
      E.rect(sx + 1, sy, 5, 7, '#000000'); E.rect(sx, sy + 1, 7, 5, '#000000');
      E.rect(sx + 1, sy + 1, 5, 5, up ? '#ff9fbb' : '#5a4a60');
      if (up) E.rect(sx + 2, sy + 2, 2, 1, '#ffffff');
      else if (m.shieldCD > 0) {
        const full = G.SKILL.shieldRecharge;
        const h = Math.round(5 * (1 - Math.min(1, m.shieldCD / full)));
        E.rect(sx + 1, sy + 6 - h, 5, h, '#c86a90');
      }
    }
    // special: SP gauge and the skill's name
    const ready = m.sp >= m.skillCost;
    E.text('SP', x0 + 5, 51, { color: C.red });
    E.bar(x0 + 19, 53, 55, 7, m.sp / 100, ready && (E.frame >> 3) % 2 ? C.gold : '#ff8a1a');
    E.text(D.skill, x0 + 5, 63, { color: ready ? C.red : C.ink, fit: 70 });
    // bombs, fire and speed in item slots
    const stat = (icon, val, x) => { slot(x, 79, 24, 16); ctx.drawImage(E.spr.ui[icon], x + 3, 83); E.text(String(val), x + 20, 82, { color: C.text, align: 'right', small: true }); };
    stat('bomb', m.bombs, x0 + 3);
    stat('fire', m.fire, x0 + 28);
    stat('speed', m.speedLv, x0 + 53);
    // coins and monsters left
    slot(x0 + 3, 98, 74, 16);
    ctx.drawImage(E.spr.ui.coin, x0 + 7, 103);
    E.text(String(w.stats.coins), x0 + 73, 101, { color: C.text, align: 'right' });
    slot(x0 + 3, 116, 74, 16);
    ctx.drawImage(E.spr.ui.enemy, x0 + 6, 121);
    E.text('x' + w.enemiesLeft(), x0 + 73, 119, { color: C.red, align: 'right' });
    // cleaning
    E.text(G.t('打掃度'), x0 + 5, 135, { color: C.text });
    const clean = w.stats.dustTotal ? w.stats.dustSwept / w.stats.dustTotal : 1;
    E.text(Math.round(clean * 100) + '%', x0 + 75, 135, { color: C.red, align: 'right' });
    E.bar(x0 + 5, 151, 70, 7, clean, C.mint);
    if (w.freezeT > 0) { ctx.drawImage(E.spr.ui.clock, x0 + 5, 163); E.bar(x0 + 15, 163, 60, 5, w.freezeT / 330, '#9ff3ff'); }
    if (m.star > 0) { ctx.drawImage(E.spr.fx.star[0], x0 + 5, 171); E.bar(x0 + 15, 171, 60, 5, m.star / 480, C.gold); }
    // controls in a black box, like the original's soft-key strip
    const touch = E.input.lastDevice === 'touch';
    E.rect(x0 + 3, 186, 74, 51, '#000000');
    E.text(G.t(touch ? 'A 放炸彈' : 'Z 放炸彈'), x0 + 7, 190, { color: C.white, fit: 68 });
    E.text(G.t(touch ? 'B 特技' : 'X 特技'), x0 + 7, 205, { color: C.white, fit: 68 });
    E.text(G.t(touch ? '||暫停' : 'ESC 暫停'), x0 + 7, 220, { color: C.gray, fit: 68 });
  }

  // ------------------------------------------------------------------ Result
  function pk_label() { return G.t('評價・好感加成'); }
  SC.result = {
    enter(arg) {
      this.t = 0;
      this.stageIndex = arg.stage;
      const def = G.STAGES[arg.stage];
      this.def = def;
      const w = arg.world;
      const clean = w.stats.dustTotal ? w.stats.dustSwept / w.stats.dustTotal : 1;
      const timeRatio = Math.max(0, w.timeLeft) / (def.time * 60);
      const hitScore = w.stats.hits === 0 ? 20 : w.stats.hits === 1 ? 10 : 0;
      const score = clean * 50 + timeRatio * 30 + hitScore;
      this.rank = score >= 82 ? 'S' : score >= 62 ? 'A' : score >= 42 ? 'B' : 'C';
      const mult = { S: 1.6, A: 1.3, B: 1.1, C: 1 }[this.rank];
      const killCoins = Math.min(w.stats.coins, w.stats.killCoins || 0);
      this.rows = [
        [G.t('委託報酬'), def.reward],
        [G.t('打倒怪物 ×{n}', { n: w.stats.kills }), killCoins],
        [G.t('撿到的金幣'), w.stats.coins - killCoins],
        [G.t('打掃度 {n}%', { n: Math.round(clean * 100) }), null],
        [G.t('剩餘時間 {n}秒', { n: Math.ceil(Math.max(0, w.timeLeft) / 60) }), null],
        [G.t('受傷次數 {n}', { n: w.stats.hits }), null],
      ];
      const pk = perks(SAVE.maid);
      this.bonus = Math.round(def.reward * (mult * pk.rewardMul - 1));
      this.total = def.reward + w.stats.coins + this.bonus;
      // the maid grows from the job
      const bond = getBond(SAVE.maid);
      const before = affLevel(bond.aff);
      this.affGain = { S: 8, A: 6, B: 5, C: 4 }[this.rank];
      bond.aff += this.affGain;
      bond.exp.bom += 4; bond.exp.agi += 3; bond.exp.str += 3;
      bond.mood = Math.min(100, bond.mood + (this.rank === 'S' ? 10 : 5));
      bond.jobs++;
      SAVE.lastJob = { result: 'clear', rank: this.rank, levelUp: affLevel(bond.aff) > before };
      const firstClear = !SAVE.cleared[def.id];
      const order = ['C', 'B', 'A', 'S'];
      if (!SAVE.cleared[def.id] || order.indexOf(this.rank) > order.indexOf(SAVE.cleared[def.id])) SAVE.cleared[def.id] = this.rank;
      this.newMaid = syncUnlocks()[0] || null;
      if (this.newMaid) SAVE.lastJob.newMaid = this.newMaid;
      SAVE.coins += this.total;
      SAVE.plays++;
      this.firstClear = firstClear;
      this.ending = !!def.final && !SAVE.ending;
      if (this.ending) SAVE.ending = true;
      persist();
      A.playMusic('cafe');
    },
    update() {
      this.t++;
      if (this.t === 110) A.sfx('boom');
      if (this.t > 60 && E.menuPressed('a')) {
        A.sfx('confirm');
        if (this.ending) E.go(SC.ending);
        else E.go(SC.room);
      }
    },
    draw() {
      bg(this.t);
      header(G.t('委託結算'), this.def.id + ' ' + this.def.title);
      paper(16, 26, 196, 190);
      this.rows.forEach(([label, val], i) => {
        if (this.t < 10 + i * 12) return;
        const y = 33 + i * 19;
        E.text(label, 28, y, { color: C.ink });
        if (val != null) coinLabel(200, y + 2, val, 'right');
        E.rect(28, y + 15, 172, 1, C.paper2);
      });
      if (this.t > 80) {
        E.text(pk_label(), 28, 148, { color: C.ink });
        coinLabel(200, 150, this.bonus, 'right');
        E.rect(24, 168, 180, 2, C.pink);
        E.text(G.t('合計'), 28, 178, { color: C.red, size: 14 });
        coinLabel(200, 182, this.total, 'right');
      }
      // rank stamp
      if (this.t > 100) {
        const s = this.t < 110 ? 6 - (this.t - 100) * 0.3 : 3;
        const col = rankColor(this.rank);
        E.ctx.save();
        E.ctx.translate(266, 70);
        E.ctx.rotate(-0.12);
        E.panel(-36, -36, 72, 72, C.paper, col, {});
        E.text(this.rank, 0, -8 * s / 3 - 12, { color: col, outline: C.plum, align: 'center', scale: Math.round(s) });
        E.ctx.restore();
        E.text(G.t({ S: '完美的女僕！', A: '非常優秀！', B: '做得不錯！', C: '再加油喔！' }[this.rank]), 266, 112, { color: C.plum, align: 'center' });
        E.ctx.drawImage(E.spr.fx.heart, 236, 213);
        E.text(G.t('好感度 +{n}', { n: this.affGain }), 244, 210, { color: C.red });
      }
      const m = SAVE.maid;
      const hop = this.t > 100 ? Math.round(Math.abs(Math.sin(this.t * 0.15)) * 4) : 0;
      E.panel(231, 132 - hop, 70, 74, '#ffe0ea', G.MAID_DATA[m].color, {});
      E.art('result-portrait', CG_ART, 233, 134 - hop, 66, 70, CG_CROP.bust[m]);
      if (this.newMaid && this.t > 130) {
        const k = this.newMaid;
        const pop = Math.min(1, (this.t - 130) / 12);
        const rise = Math.round((1 - pop) * 6);
        E.rect(20, 197, 188, 17, C.red);
        E.panel(24, 194 + rise, 22, 22, '#ffe0ea', G.MAID_DATA[k].color, {});
        E.art('result-newcomer', CG_ART, 26, 196 + rise, 18, 18, CG_CROP.head[k]);
        E.text(G.t('新夥伴 {name} 加入了！', { name: G.MAID_DATA[k].name }), 126, 199, { color: C.white, align: 'center', fit: 156 });
      }
      if (this.t > 60) hint(G.t(this.ending ? 'Z 繼續' : 'Z 回房間'));
    },
  };

  // ------------------------------------------------------------------ Game over
  SC.gameover = {
    enter(arg) {
      this.t = 0;
      this.stageIndex = arg.stage;
      this.sel = 0;
      const w = arg.world;
      this.reason = w.failReason;
      this.salvage = Math.floor(w.stats.coins / 2);
      SAVE.coins += this.salvage;
      const bond = getBond(SAVE.maid);
      bond.mood = Math.max(0, bond.mood - 10);
      SAVE.lastJob = { result: 'fail' };
      persist();
    },
    update() {
      this.t++;
      const d = E.menuDir();
      if (d === 'up' || d === 'down') { this.sel = 1 - this.sel; A.sfx('select'); }
      if (this.t > 30 && E.menuPressed('a')) {
        A.sfx('confirm');
        if (this.sel === 0 && getBond(SAVE.maid).stamina < G.JOB_STAMINA) { A.sfx('denied'); this.tired = 120; return; }
        if (this.sel === 0) { SAVE.lastJob = null; E.go(SC.play, { stage: this.stageIndex }); }
        else E.go(SC.room);
      }
    },
    draw() {
      E.rect(0, 0, E.W, E.H, C.plum);
      for (let i = 0; i < 40; i++) {
        const x = (i * 97 + this.t * 0.3) % 320, y = (i * 53) % 240;
        E.rect(x, y, 1, 1, i % 3 ? C.panel2 : C.gray);
      }
      E.text(G.t('委託失敗……'), 160, 36, { color: C.white, align: 'center', scale: 2, size: 14 });
      E.text(G.t(this.reason === 'time' ? '時間到了，灰塵還沒掃完。' : '被炸得黑漆漆的……'), 160, 76, { color: C.gray, align: 'center' });
      const img = E.spr.maids[SAVE.maid].burnt;
      E.ctx.drawImage(img, 136, 92, 48, 72);
      for (let i = 0; i < 3; i++) {
        const a = this.t * 0.1 + (i * Math.PI * 2) / 3;
        E.ctx.drawImage(E.spr.fx.star[(this.t >> 3) % 2], Math.round(160 + Math.cos(a) * 18), Math.round(92 + Math.sin(a) * 5));
      }
      if (this.salvage) E.text(G.t('撿到的金幣留下一半：+{n}G', { n: this.salvage }), 160, 170, { color: C.gold, align: 'center' });
      if (this.tired > 0) { this.tired--; E.text(G.t('體力不足，先回房間休息吧'), 160, 150, { color: C.pink, align: 'center' }); }
      [G.t('再試一次（體力 -{n}）', { n: G.JOB_STAMINA }), G.t('回房間')].forEach((s, i) => {
        const y = 188 + i * 18;
        const w = E.text(s, 160, y, { color: i === this.sel ? C.white : C.gray, align: 'center' });
        if (i === this.sel) heartCursor(160 - w / 2 - 14, y + 3);
      });
    },
  };

  // ------------------------------------------------------------------ Ending
  SC.ending = {
    enter() { this.t = 0; A.playMusic('title'); },
    lines: [
      '金熊機甲停下來了。', '', '原來，機甲裡的小熊只是想要', '一間永遠乾乾淨淨的房間。', '',
      '「那就來咖啡廳吧。」{maid}笑著說。', '「我們每天都會打掃喔！」', '', '從此以後，蕾絲炸彈咖啡廳', '多了一位毛茸茸的常客。', '', '',
      '— 炸彈女僕 BOMB MAIDS —', '', '感謝遊玩！', '', '（所有委託都能重玩刷評價，', '　也別忘了收集卡片喔）',
    ],
    update() {
      this.t++;
      if (this.t > 120 && E.menuPressed('a')) { A.sfx('confirm'); E.go(SC.room); }
    },
    draw() {
      bg(this.t, 'rgba(255,255,255,0.35)');
      const y0 = 190 - this.t * 0.45;
      const name = G.MAID_DATA[SAVE.maid || 'berry'].name;
      E.ctx.save();
      E.ctx.beginPath();
      E.ctx.rect(0, 0, E.W, 184);
      E.ctx.clip();
      this.lines.forEach((l, i) => {
        const y = y0 + i * 18;
        if (y < -16 || y > 184) return;
        E.text(l ? G.t(l, { maid: name }) : '', 160, y, { color: l.startsWith('—') ? C.red : C.plum, align: 'center', size: l.startsWith('—') ? 14 : 12 });
      });
      E.ctx.restore();
      E.rect(0, 186, E.W, 54, C.plum);
      lace(0, 183, E.W, C.plum);
      G.MAID_ORDER.forEach((k, i) => {
        const x = 20 + i * 76;
        const hop = Math.abs(Math.sin(this.t * 0.1 + i)) * 8;
        E.ctx.drawImage(maidImg(k, 'down', [1, 2][((this.t >> 4) + i) % 2]), x + 14, 190 - hop, 32, 48);
      });
      const bear = E.spr.monsters.teddy.frames[(this.t >> 5) % 2];
      E.ctx.drawImage(bear, 152, 232 - bear.height);
      if (this.t > 120) E.text('Z', 312, 4, { color: C.plum, align: 'right' });
    },
  };

  // ------------------------------------------------------------------ Battle setup
  SC.battleSetup = {
    enter() {
      this.t = 0;
      this.row = 0;
      this.cfg = this.cfg || { humans: 1, p1: 'berry', p2: 'yoru', cpus: 3, level: 1, wins: 2 };
      A.playMusic('cafe');
    },
    rows() {
      const c = this.cfg;
      const r = [
        { label: G.t('玩家人數'), value: c.humans + 'P', key: 'humans' },
        { label: G.t('1P 女僕'), value: G.MAID_DATA[c.p1].name, key: 'p1' },
      ];
      if (c.humans === 2) r.push({ label: G.t('2P 女僕'), value: G.MAID_DATA[c.p2].name, key: 'p2' });
      r.push({ label: G.t('電腦女僕'), value: G.t('{n} 位', { n: c.cpus }), key: 'cpus' });
      r.push({ label: G.t('電腦強度'), value: G.t(['普通', '厲害'][c.level - 1]), key: 'level' });
      r.push({ label: G.t('勝利條件'), value: G.t('先贏 {n} 局', { n: c.wins }), key: 'wins' });
      r.push({ label: G.t('開始對決！'), value: '', key: 'go' });
      return r;
    },
    update() {
      this.t++;
      const rows = this.rows();
      const c = this.cfg;
      const d = E.menuDir();
      if (d === 'up') { this.row = (this.row + rows.length - 1) % rows.length; A.sfx('select'); }
      if (d === 'down') { this.row = (this.row + 1) % rows.length; A.sfx('select'); }
      const key = rows[Math.min(this.row, rows.length - 1)].key;
      const step = d === 'left' ? -1 : d === 'right' ? 1 : E.menuPressed('a') ? 1 : 0;
      if (step && key !== 'go') {
        A.sfx('select');
        const open = G.MAID_ORDER.filter((m) => !isLocked(m));
        const cycleMaid = (k) => open[(open.indexOf(k) + step + open.length) % open.length];
        if (key === 'humans') { c.humans = c.humans === 1 ? 2 : 1; c.cpus = Math.min(c.cpus, 4 - c.humans); if (c.cpus < 1 && c.humans === 1) c.cpus = 1; }
        if (key === 'p1') c.p1 = cycleMaid(c.p1);
        if (key === 'p2') c.p2 = cycleMaid(c.p2);
        if (key === 'cpus') { const max = 4 - c.humans, min = c.humans === 1 ? 1 : 0; c.cpus = ((c.cpus - min + step + (max - min + 1)) % (max - min + 1)) + min; }
        if (key === 'level') c.level = c.level === 1 ? 2 : 1;
        if (key === 'wins') c.wins = ((c.wins - 1 + step + 3) % 3) + 1;
      }
      if (key === 'go' && E.menuPressed('a')) { A.sfx('start'); E.go(SC.battle, Object.assign({}, c)); }
      if (E.menuPressed('b') || E.menuPressed('start')) { A.sfx('cancel'); E.go(SC.title); }
    },
    draw() {
      bg(this.t);
      header(G.t('女僕對決'), G.t('在咖啡廳大廳一決勝負！'));
      paper(8, 26, 170, 194);
      this.rows().forEach((r, i) => {
        const y = 34 + i * 26;
        const on = i === this.row;
        if (r.key === 'go') {
          E.panel(24, y, 138, 22, on ? C.red : '#f5b8c9', C.plum, {});
          E.text(r.label, 93, y + 5, { color: C.white, align: 'center' });
        } else {
          E.text(r.label, 24, y + 4, { color: C.ink });
          E.text((on ? '◀ ' : '') + r.value + (on ? ' ▶' : ''), 166, y + 4, { color: on ? C.red : C.plum, align: 'right' });
          E.rect(24, y + 20, 142, 1, C.paper2);
        }
        if (on) heartCursor(12, y + 7);
      });
      // lineup preview
      darkPanel(184, 26, 128, 194);
      const c = this.cfg;
      const lineup = this.lineup();
      lineup.forEach((p, i) => {
        const x = 192 + (i % 2) * 58, y = 32 + ((i / 2) | 0) * 76;
        E.rect(x, y, 52, 72, C.panel2);
        E.text(p.human ? (p.pad + 1) + 'P' : 'CPU', x + 26, y + 2, { color: p.human ? C.gold : C.gray, align: 'center', small: false });
        // CG portrait from the character illustration (CPU copies of the same maid share it; in the arena they wear other outfits)
        E.rect(x + 1, y + 12, 50, 45, p.human ? C.gold : C.plum);
        E.art('battle-' + i, CG_ART, x + 2, y + 13, 48, 43, CG_CROP.lineup[p.maid]);
        E.text(G.MAID_DATA[p.maid].name, x + 26, y + 58, { color: C.white, outline: C.panel2, align: 'center', fit: 50 });
      });
      if (c.humans === 2) {
        E.text('1P  WASD・F・G', 248, 188, { color: C.paper, align: 'center' });
        E.text(G.t('2P  方向鍵・K・L'), 248, 204, { color: C.paper, align: 'center' });
      } else {
        E.text(G.t('方向鍵 移動'), 248, 188, { color: C.paper, align: 'center' });
        E.text(G.t('Z 炸彈　X 特技'), 248, 204, { color: C.paper, align: 'center' });
      }
      hint(G.t('↑↓ 選擇　←→ 變更　Z 決定　X 返回'));
    },
    lineup() {
      const c = this.cfg;
      const open = G.MAID_ORDER.filter((k) => !isLocked(k));
      if (!open.includes(c.p1)) c.p1 = open[0];
      if (!open.includes(c.p2)) c.p2 = open[Math.min(1, open.length - 1)];
      const list = [{ maid: c.p1, human: true, pad: 0 }];
      if (c.humans === 2) list.push({ maid: c.p2, human: true, pad: 1 });
      const used = new Set(list.map((p) => p.maid));
      const rest = open.filter((k) => !used.has(k)).concat(open);
      for (let i = 0; i < c.cpus; i++) list.push({ maid: rest[i % rest.length], human: false, level: c.level });
      const copies = {};
      for (const p of list) {
        const n = copies[p.maid] || 0;
        copies[p.maid] = n + 1;
        p.outfit = n === 0 ? null : G.OUTFIT_IDS.filter((o) => o !== G.outfitOf(p.maid))[(n - 1) % (G.OUTFIT_IDS.length - 1)];
      }
      return list;
    },
  };

  // ------------------------------------------------------------------ Battle
  SC.battle = {
    enter(cfg) {
      this.cfg = cfg;
      this.lineup = SC.battleSetup.lineup.call({ cfg });
      this.wins = this.lineup.map(() => 0);
      this.round = 0;
      this.paused = false;
      this.champion = null;
      E.input.duo = cfg.humans === 2;
      this.startRound();
    },
    exit() { E.input.duo = false; A.tempoScale = 1; },
    startRound() {
      this.round++;
      this.world = new G.World({
        mode: 'battle', theme: 'cafe', layout: 'classic', soft: 0.7, time: 150,
        players: this.lineup.map((p) => ({ maid: p.maid, outfit: p.outfit, human: p.human, pad: p.pad, level: p.level, stats: Object.assign({}, G.MAID_DATA[p.maid].stats, { hearts: 1, speed: Math.min(2, G.MAID_DATA[p.maid].stats.speed) }), sp: 20 })),
      });
      this.endT = 0;
      A.tempoScale = 1;
      A.playMusic('stage');
    },
    update() {
      if (this.champion) {
        this.champT++;
        if (this.champT > 90 && E.menuPressed('a')) { A.sfx('confirm'); E.go(SC.battleSetup); }
        return;
      }
      const w = this.world;
      if (this.paused) {
        const d = E.menuDir();
        if (d === 'up' || d === 'down') { this.pauseSel = 1 - this.pauseSel; A.sfx('select'); }
        if (E.menuPressed('start')) this.paused = false;
        if (E.menuPressed('a')) {
          if (this.pauseSel === 0) this.paused = false;
          else E.go(SC.battleSetup);
        }
        return;
      }
      if ((E.pressed(0, 'start') || E.pressed(1, 'start')) && w.state === 'play') { this.paused = true; this.pauseSel = 0; return; }
      w.update();
      if (w.state === 'play' && w.timeLeft === 45 * 60) A.tempoScale = 1.2;
      if (w.state === 'end') {
        if (w.stateT === 1) {
          A.stopMusic();
          if (w.winner) { this.wins[w.winner.slot]++; A.playMusic('clear'); } else A.playMusic('fail');
        }
        if (w.stateT > 150) {
          const champ = this.wins.findIndex((n) => n >= this.cfg.wins);
          if (champ >= 0) { this.champion = this.lineup[champ]; this.champSlot = champ; this.champT = 0; A.playMusic('title'); }
          else this.startRound();
        }
      }
    },
    draw() {
      const w = this.world;
      if (this.champion) return this.drawChampion();
      E.rect(0, 0, E.W, E.H, C.plum);
      w.draw(E.ctx);
      E.rect(0, 0, 240, 16, '#000000'); E.rect(0, 15, 240, 1, '#f8b000');
      edgeBar({ y: 0, h: 16, rule: 15 });
      E.text('ROUND ' + this.round, 6, 5, { color: C.pink });
      const tl = Math.max(0, Math.ceil(w.timeLeft / 60));
      E.text(Math.floor(tl / 60) + ':' + String(tl % 60).padStart(2, '0'), 234, 5, { color: tl <= 45 && (E.frame >> 4) % 2 ? C.red : C.gold, align: 'right' });
      E.text(G.t('先贏 {n} 局的女僕獲勝', { n: this.cfg.wins }), 120, 2, { color: C.gray, align: 'center' });
      E.rect(0, 224, 240, 16, '#000000'); E.rect(0, 224, 240, 1, '#f8b000');
      edgeBar({ y: 224, h: 16, rule: 224 });
      E.text(G.t(w.sudden ? '外圈開始封鎖！往中間移動！' : '最後站著的女僕就是贏家'), 120, 226, { color: w.sudden ? C.pink : C.gray, align: 'center' });
      // side panel
      goldBar(240, 0, 80, 240);
      w.maids.forEach((m, i) => {
        const y = 5 + i * 58;
        const p = this.lineup[i];
        // one gold-rimmed card per maid in the original HUD's colours
        E.panel(244, y, 72, 55, m.alive ? '#ffffff' : '#d8d4dc', m.alive ? '#f8b000' : '#8a8494', { outline: '#000000' });
        E.rect(247, y + 3, 26, 26, '#000000');
        E.art('battle-face-' + i, CG_ART, 248, y + 4, 24, 24, CG_CROP.head[m.maidKey], m.alive ? null : 'grayscale(1) brightness(0.45)');
        E.text(m.name, 276, y + 4, { color: C.text, fit: 37 });
        E.text(String(m.slot + 1), 279, y + 20, { color: C.white, outline: m.alive ? m.color : '#5a4a6e', align: 'center', small: true });
        E.text(p.human ? (p.pad + 1) + 'P' : 'CPU', 312, y + 19, { color: p.human ? C.red : C.dim, align: 'right' });
        for (let s = 0; s < this.cfg.wins; s++) E.ctx.drawImage(E.spr.fx.star[s < this.wins[i] ? 0 : 1], 249 + s * 8, y + 32);
        const stat = (icon, val, x) => { E.ctx.drawImage(E.spr.ui[icon], x, y + 43); E.text(String(val), x + 8, y + 44, { color: C.text, small: true }); };
        stat('bomb', m.bombs, 249);
        stat('fire', m.fire, 268);
        E.bar(287, y + 44, 25, 5, m.sp / 100, '#ff8a1a');
        if (!m.alive) E.text('KO', 298, y + 30, { color: C.red, outline: '#000000', align: 'center' });
      });
      if (w.state === 'ready') {
        const t = w.stateT;
        E.rect(0, 96, 240, 32, 'rgba(42,27,48,0.85)');
        E.text(t < 70 ? 'ROUND ' + this.round : 'GO!', 120, 104, { color: t < 70 ? C.white : C.red, outline: C.plum, align: 'center', scale: 2 });
      }
      if (w.state === 'end' && w.stateT > 20) {
        E.rect(0, 88, 240, 48, 'rgba(42,27,48,0.85)');
        if (w.winner) {
          E.text(G.t('{name} 贏了這一局！', { name: w.winner.name }), 120, 96, { color: C.gold, align: 'center', size: 14 });
          E.ctx.drawImage(maidImg(w.winner.maidKey, 'down', [1, 2][(E.frame >> 4) % 2], w.winner.outfit), 112, 112);
        } else E.text(G.t('平手！'), 120, 104, { color: C.white, align: 'center', scale: 2, size: 12 });
      }
      if (this.paused) {
        E.rect(0, 0, E.W, E.H, 'rgba(42,27,48,0.6)');
        E.artShade(0.4);
        darkPanel(80, 80, 160, 70);
        E.text(G.t('暫停'), 160, 86, { color: C.gold, align: 'center' });
        [G.t('繼續'), G.t('離開對決')].forEach((s, i) => {
          E.text(s, 160, 108 + i * 18, { color: i === this.pauseSel ? C.white : C.gray, align: 'center' });
          if (i === this.pauseSel) heartCursor(120, 111 + i * 18);
        });
      }
    },
    drawChampion() {
      const t = this.champT;
      bg(t);
      const p = this.champion;
      const D = G.MAID_DATA[p.maid];
      E.rect(0, 30, 320, 44, C.plum);
      lace(0, 74, 320, C.plum);
      E.text('CHAMPION', 160, 36, { color: C.gold, outline: C.red, align: 'center', scale: 3 });
      E.text(G.t('{name}（{who}）是最強的女僕！', { name: D.name, who: p.human ? (p.pad + 1) + 'P' : 'CPU' }), 160, 88, { color: C.plum, align: 'center', size: 14 });
      const hop = Math.abs(Math.sin(t * 0.12)) * 12;
      E.ctx.drawImage(maidImg(p.maid, 'down', [1, 2][(t >> 4) % 2], p.outfit), 136, 108 - hop, 48, 72);
      for (let i = 0; i < 24; i++) {
        const x = (i * 37 + t * (1 + (i % 3))) % 320, y = (i * 29 + t * 1.5) % 240;
        E.rect(x, y, 3, 3, [C.red, C.gold, C.sky, C.mint, C.pink][i % 5]);
      }
      E.text(G.t('「{line}」', { line: D.line }), 160, 196, { color: C.ink, align: 'center' });
      if (t > 90) hint(G.t('Z 回到對決設定'));
    },
  };
})(window);
