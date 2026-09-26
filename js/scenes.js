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
  // gutters at x 461-466 and y 573-578 of the 928x1152 image)
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
    // the maids rested while the game was closed
    if (G.restTick() >= 1) persist();
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
    E.ctx.drawImage(img, 0, 2, 16, 16, x, y, 16 * scale, 16 * scale);
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
  function marquee(text, x, y, w, col, left) {
    const ctx = E.ctx;
    const tw = E.textWidth(text);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y - 2, w, 16);
    ctx.clip();
    if (tw <= w) E.text(text, left ? x : x + w / 2, y, { color: col, align: left ? 'left' : 'center' });
    else if (left) {
      // a line that starts where it stands: the beginning shows first, then it slides to its end and back
      const over = tw - w + 2, hold = 90, run = over * 2;
      const ph = E.frame % (hold * 2 + run);
      const off = ph < hold ? 0 : ph < hold + run ? (ph - hold) / 2 : over;
      E.text(text, x - Math.round(off), y, { color: col });
    } else {
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
  // one room per maid: switching who is on duty switches the room with her
  function getRoom(k) {
    const key = k || SAVE.maid || 'berry';
    if (!SAVE.rooms) {
      SAVE.rooms = {};
      // an older save kept a single room: it stays with whoever was on duty then
      if (SAVE.room) { SAVE.rooms[SAVE.maid || 'berry'] = SAVE.room; delete SAVE.room; }
    }
    if (!SAVE.rooms[key]) {
      const room = JSON.parse(JSON.stringify(G.ROOM_DEFAULT));
      const style = (G.ROOM_STYLE || {})[key];
      if (style) {
        room.wall = style.wall; room.walls[style.wall] = true;
        room.floor = style.floor; room.floors[style.floor] = true;
      }
      SAVE.rooms[key] = room;
    }
    return SAVE.rooms[key];
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
  G.UI = { C, CG_ART, CG_CROP, portraitFace, goldBar, edgeBar, bg, lace, heartCursor, hint, header, coinLabel, maidImg, drawHead, isLocked, silhouette, maidName, rankColor, paper, darkPanel, statPips, wrapLines, marquee };

  // ------------------------------------------------------------------ Portrait panel (16:9 screen, left of the game)
  // The maid who matters on this screen stands beside the game with no frame and no caption: cut out of the
  // illustration, on the scene's own wallpaper carried across, in front of the scene's top and bottom bars (which run
  // on across the panel behind her), her skirt going off the bottom of the screen. She shows how she feels with her
  // joy / anger / sorrow / fun pictures, cross-fading between them; each moves in her own way (Berry bounces, Yoru
  // breathes calmly, Honey fidgets, Yukino sways) and a newly shown maid rises up into place.
  // Pictures are placed by her eyes — [centre x, centre y, distance between them] in source pixels — so her face keeps
  // its size and height from one picture to the next; right is the right-most column of her figure (not counting the
  // sparkles and notes around her).
  const STAND = {
    berry: {
      normal: { w: 369, h: 560, eye: [186, 154, 58.5], right: 368 },
      joy: { w: 399, h: 567, eye: [217, 161, 66.5], right: 398 },
      anger: { w: 379, h: 562, eye: [209, 163.5, 58], right: 377 },
      sorrow: { w: 398, h: 559, eye: [191.5, 152, 60], right: 397 },
      fun: { w: 399, h: 561, eye: [211, 150, 60], right: 397 },
    },
    yoru: {
      normal: { w: 430, h: 550, eye: [235, 139, 55.5], right: 424 },
      joy: { w: 363, h: 567, eye: [149.5, 172, 65.8], right: 361 },
      anger: { w: 406, h: 567, eye: [186.5, 171, 69.5], right: 404 },
      sorrow: { w: 408, h: 594, eye: [198, 149, 62.8], right: 406 },
      fun: { w: 366, h: 593, eye: [164, 151.5, 59.7], right: 364 },
    },
    honey: {
      normal: { w: 401, h: 549, eye: [206, 134, 50.6], right: 400 },
      joy: { w: 429, h: 565, eye: [216, 163, 67.2], right: 426 },
      anger: { w: 414, h: 570, eye: [208.5, 171.5, 71], right: 413 },
      sorrow: { w: 412, h: 582, eye: [217, 140.5, 52.5], right: 411 },
      fun: { w: 426, h: 592, eye: [224.5, 179.5, 71.2], right: 423 },
    },
    yukino: {
      normal: { w: 403, h: 552, eye: [217, 118.5, 52.7], right: 402 },
      joy: { w: 446, h: 538, eye: [217, 151, 61.3], right: 444 },
      anger: { w: 384, h: 538, eye: [173.5, 148.5, 65.4], right: 383 },
      sorrow: { w: 423, h: 545, eye: [183.5, 168, 69.5], right: 422 },
      fun: { w: 424, h: 547, eye: [208, 154.8, 74], right: 423 },
    },
  };
  // Her expression sheet (the user's, twelve pictures a maid, img/ex-<maid>-<key>.webp): wider shots down to the skirt,
  // cut out of the sheets and doubled in size; placed by the eyes like the others.
  const EXPR = {
    yoru: {
      calm: { w: 478, h: 634, eye: [256.4, 162.6, 63.4], right: 470 },
      tender: { w: 466, h: 634, eye: [242.4, 162.6, 63.4], right: 458 },
      sweat: { w: 466, h: 634, eye: [242.4, 162.6, 63.4], right: 458 },
      content: { w: 450, h: 634, eye: [242.4, 162.6, 63.4], right: 448 },
      pout: { w: 484, h: 630, eye: [254.4, 162.6, 63.4], right: 476 },
      rage: { w: 466, h: 630, eye: [234.4, 162.6, 63.4], right: 458 },
      disgust: { w: 458, h: 630, eye: [228.4, 162.6, 63.4], right: 450 },
      cry: { w: 452, h: 630, eye: [232.4, 162.6, 63.4], right: 450 },
      surprise: { w: 492, h: 618, eye: [256.4, 172.6, 63.4], right: 484 },
      shy: { w: 460, h: 618, eye: [226.4, 174.6, 63.4], right: 452 },
      serve: { w: 460, h: 618, eye: [226.4, 174.6, 63.4], right: 452 },
      wonder: { w: 448, h: 618, eye: [224.4, 172.6, 63.4], right: 446 },
    },
    yukino: {
      confident: { w: 442, h: 656, eye: [231.8, 164, 60], right: 440 },
      tender: { w: 440, h: 656, eye: [227.8, 166, 60], right: 438 },
      seduce: { w: 440, h: 654, eye: [225.8, 166, 60], right: 438 },
      arrogant: { w: 442, h: 656, eye: [217.8, 166, 60], right: 440 },
      serious: { w: 442, h: 700, eye: [231.8, 180, 60], right: 440 },
      shy: { w: 440, h: 700, eye: [221.8, 180, 60], right: 438 },
      sad: { w: 440, h: 700, eye: [223.8, 180, 60], right: 438 },
      angry: { w: 442, h: 700, eye: [215.8, 178, 60], right: 440 },
      excited: { w: 442, h: 670, eye: [225.8, 164, 60], right: 440 },
      tired: { w: 440, h: 672, eye: [217.8, 166, 60], right: 438 },
      tease: { w: 440, h: 672, eye: [221.8, 166, 60], right: 438 },
      surprise: { w: 442, h: 672, eye: [215.8, 164, 60], right: 440 },
    },
    berry: {
      rage: { w: 504, h: 700, eye: [264, 211.6, 68], right: 486 },
      smug: { w: 494, h: 704, eye: [258, 211.6, 68], right: 486 },
      cheer: { w: 472, h: 692, eye: [244, 201.6, 68], right: 464 },
      cry: { w: 448, h: 690, eye: [240, 201.6, 68], right: 442 },
      overjoy: { w: 496, h: 738, eye: [268, 207.6, 68], right: 488 },
      peace: { w: 476, h: 736, eye: [240, 205.6, 68], right: 468 },
      wonder: { w: 452, h: 734, eye: [236, 201.6, 68], right: 444 },
      tender: { w: 468, h: 736, eye: [248, 209.6, 68], right: 466 },
      giggle: { w: 468, h: 714, eye: [254, 209.6, 68], right: 460 },
      panic: { w: 492, h: 714, eye: [258, 213.6, 68], right: 484 },
      proud: { w: 448, h: 718, eye: [232, 207.6, 68], right: 440 },
      excited: { w: 474, h: 714, eye: [256, 209.6, 68], right: 472 },
    },
    honey: {
      cheer: { w: 510, h: 670, eye: [262.4, 180, 66.6], right: 502 },
      worry: { w: 494, h: 696, eye: [262.4, 214, 66.6], right: 486 },
      pout: { w: 464, h: 682, eye: [264.4, 198, 66.6], right: 456 },
      panic: { w: 476, h: 668, eye: [266.4, 186, 66.6], right: 468 },
      confused: { w: 526, h: 684, eye: [268.4, 226, 66.6], right: 518 },
      dreamy: { w: 450, h: 680, eye: [264.4, 218, 66.6], right: 442 },
      nervous: { w: 490, h: 712, eye: [266.4, 258, 66.6], right: 446 },
      shy: { w: 462, h: 648, eye: [268.4, 196, 66.6], right: 454 },
      gift: { w: 494, h: 662, eye: [262.4, 212, 66.6], right: 486 },
      content: { w: 482, h: 630, eye: [262.4, 180, 66.6], right: 474 },
      fluster: { w: 508, h: 628, eye: [250.4, 178, 66.6], right: 426 },
      wonder: { w: 466, h: 628, eye: [268.4, 186, 66.6], right: 458 },
    },
  };
  for (const k in EXPR) for (const e in EXPR[k]) STAND[k][e] = Object.assign({ src: 'img/ex-' + k + '-' + e + '.webp' }, EXPR[k][e]);
  // What a feeling looks like on each maid: the game asks for a feeling and her own picture answers it. A feeling can
  // also be a picture's own key (joy, cheer, pout...). What a maid has no picture for falls back on FEEL_FALLBACK.
  const FEEL = {
    berry: { happy: 'cheer', love: 'tender', shy: 'giggle', surprise: 'wonder', angry: 'rage', sad: 'cry', excited: 'excited', proud: 'proud', tired: 'panic', panic: 'panic', confused: 'panic', tease: 'smug', calm: 'smug', skill: 'rage', win: 'overjoy', photo: 'peace', photoHigh: 'peace', gift: 'excited', meh: 'panic', ask: 'excited', miss: 'panic', locked: 'giggle', hug: 'tender', whisper: 'tender', tea: 'tender' },
    yoru: { happy: 'tender', love: 'tender', shy: 'shy', surprise: 'surprise', angry: 'disgust', sad: 'cry', excited: 'wonder', proud: 'calm', tired: 'sweat', panic: 'surprise', confused: 'sweat', tease: 'content', calm: 'calm', skill: 'rage', win: 'content', photo: 'disgust', photoHigh: 'tender', gift: 'wonder', meh: 'pout', ask: 'calm', miss: 'pout', locked: 'disgust', hug: 'shy', whisper: 'shy', tea: 'serve' },
    honey: { happy: 'cheer', love: 'content', shy: 'shy', surprise: 'wonder', angry: 'pout', sad: 'nervous', excited: 'gift', proud: 'cheer', tired: 'worry', panic: 'panic', confused: 'confused', tease: 'dreamy', calm: 'dreamy', skill: 'cheer', win: 'cheer', photo: 'wonder', photoHigh: 'content', gift: 'gift', meh: 'worry', ask: 'dreamy', miss: 'pout', locked: 'shy', hug: 'content', whisper: 'shy', tea: 'content' },
    yukino: { happy: 'tender', love: 'tender', shy: 'shy', surprise: 'surprise', angry: 'angry', sad: 'sad', excited: 'excited', proud: 'arrogant', tired: 'tired', panic: 'surprise', confused: 'surprise', tease: 'tease', calm: 'serious', skill: 'confident', win: 'confident', photo: 'confident', photoHigh: 'seduce', gift: 'excited', meh: 'tired', ask: 'tender', miss: 'tease', locked: 'tease', hug: 'tender', whisper: 'shy', tea: 'tender' },
  };
  const FEEL_FALLBACK = { happy: 'joy', love: 'joy', shy: 'joy', surprise: 'fun', angry: 'anger', sad: 'sorrow', excited: 'fun', proud: 'fun', tired: 'sorrow', panic: 'fun', confused: 'fun', tease: 'joy', skill: 'anger', win: 'fun', gift: 'fun', meh: 'sorrow' };
  function feelPic(k, feel) {
    const set = STAND[k] || STAND.berry;
    if (!feel) return 'normal';
    if (set[feel]) return feel;
    const pick = FEEL[k] && FEEL[k][feel];
    if (pick && set[pick]) return pick;
    return set[FEEL_FALLBACK[feel]] ? FEEL_FALLBACK[feel] : 'normal';
  }
  // the room sprite's faces as feelings
  const FACE_FEEL = { happy: 'happy', blush: 'love', surprise: 'surprise', angry: 'angry', tired: 'tired', gloom: 'sad' };
  const STAND_SCALE = 0.36; // the standing picture's scale
  const STAND_TOP = 48; // where the top of the standing picture sits: under the tallest top bar (the room's status bar)
  const STAND_LEAN = 6; // how far she may reach into the game area; past it she fades out
  for (const k in STAND) {
    const base = STAND[k].normal;
    Object.assign(base, { src: 'img/stand-' + k + '.webp', s: STAND_SCALE, drop: 0 });
    const eyeD = base.eye[2] * STAND_SCALE, eyeY = STAND_TOP + base.eye[1] * STAND_SCALE;
    for (const e in STAND[k]) {
      if (e === 'normal') continue;
      const S = STAND[k][e];
      if (!S.src) S.src = 'img/emo-' + k + '-' + e + '.webp';
      // the expression pictures are closer shots: her face keeps its size, then leans in a little (up to 1.25x and 16px
      // lower) so the picture reaches the bottom of the screen; its faded lower edge covers any gap that is left
      const head = eyeD / S.eye[2];
      const need = (E.H + 4 - eyeY) / (S.h - S.eye[1]);
      S.s = head * Math.min(1.25, Math.max(1, need / head));
      S.drop = Math.min(16, Math.max(0, E.H + 4 - (eyeY + (S.h - S.eye[1]) * S.s)));
    }
  }
  // load them all up front so switching maids or feelings never shows an empty panel
  const PRELOADED = [];
  if (typeof Image !== 'undefined') for (const k in STAND) for (const e in STAND[k]) {
    const im = new Image();
    im.src = STAND[k][e].src;
    if (im.decode) im.decode().catch(() => {}); // decoded ahead, so a first change of feeling does not blink
    PRELOADED.push(im);
  }
  // a square around her face in one of her pictures (dialogue boxes, job results); zoom is its side in eye distances
  function portraitFace(k, emo, zoom) {
    const set = STAND[k] || STAND.berry;
    const S = set[emo] || set.normal;
    const side = S.eye[2] * (zoom || 3.1);
    return { src: S.src, crop: [S.eye[0] - side / 2, S.eye[1] - side * 0.42, side, side, S.w, S.h] };
  }
  // feelings to pictures, for the room's dialogue and the rest
  G.UI.FACE_FEEL = FACE_FEEL;
  G.UI.feelPic = feelPic;
  // a maid's whole picture for a feeling: { src, w, h, eye, right } (the opening shows it)
  G.UI.portraitPicture = (k, emo) => { const set = STAND[k] || STAND.berry; return set[emo] || set.normal; };
  const RANK_FEEL = { S: 'win', A: 'excited', B: 'happy', C: 'calm' };
  function moodEmotion(k) {
    const b = SAVE && SAVE.bond && SAVE.bond[k];
    if (!b) return 'normal';
    if (b.stamina < 20) return feelPic(k, 'tired');
    if (b.mood < 30) return feelPic(k, 'sad');
    return b.mood >= 80 ? feelPic(k, 'happy') : 'normal';
  }
  // short reactions while she works: glad when coins come in, fired up when she uses her skill
  const react = { world: null, coins: 0, sp: 0, emo: null, until: 0 };
  function reaction(w, m) {
    if (react.world !== w) Object.assign(react, { world: w, coins: w.stats.coins, sp: m.sp, until: 0 });
    if (m.sp < react.sp - 10) Object.assign(react, { emo: feelPic(m.maidKey, 'skill'), skill: true, until: E.frame + 80 });
    else if (w.stats.coins >= react.coins + 10 && !(react.skill && E.frame < react.until)) Object.assign(react, { emo: feelPic(m.maidKey, 'happy'), skill: false, until: E.frame + 90 });
    react.coins = w.stats.coins;
    react.sp = m.sp;
    return E.frame < react.until ? react.emo : 'normal';
  }
  function portraitFor(sc) {
    const hired = G.MAID_ORDER.filter((k) => SAVE && SAVE.hired[k]);
    const home = (SAVE && SAVE.maid) || hired[0] || 'berry';
    if (sc === SC.select && sc.sel != null) { const k = G.MAID_ORDER[sc.sel]; return isLocked(k) ? { key: k, locked: true, emo: 'normal' } : { key: k, emo: feelPic(k, 'happy') }; }
    if ((sc === SC.play || sc === SC.battle) && sc.world && sc.world.maids[0]) {
      const w = sc.world, m = w.maids[0];
      const key = m.maidKey;
      if (w.state === 'clear') return { key, emo: feelPic(key, 'win') };
      if (w.state === 'end') return { key, emo: feelPic(key, w.winner === m ? 'win' : 'sad') };
      if (w.state === 'fail' || !m.alive) return { key, emo: feelPic(key, 'sad'), ko: true };
      if (m.burnT > 0) return { key, emo: feelPic(key, 'panic') };
      return { key, emo: reaction(w, m) };
    }
    if (sc === SC.result && sc.rank) return { key: home, emo: sc.t > 100 ? feelPic(home, RANK_FEEL[sc.rank]) : 'normal' };
    if (sc === SC.gameover) return { key: home, emo: feelPic(home, 'sad') };
    if (sc === SC.ending) return { key: home, emo: feelPic(home, 'win') };
    if (sc === SC.room) {
      // what she is saying decides her picture: the line's own feeling, else her face
      const cur = sc.dialog && sc.dialog.queue[sc.dialog.i];
      if (cur && cur.who) return { key: cur.who, emo: feelPic(cur.who, cur.feel || FACE_FEEL[cur.face]) };
      const m = sc.maid;
      const f = (m && m.feelT > 0 && m.feel) || (m && m.face && FACE_FEEL[m.face]);
      return { key: home, emo: f ? feelPic(home, f) : moodEmotion(home) };
    }
    if (sc === SC.battleSetup && sc.cfg) return { key: sc.cfg.p1 || home, emo: 'normal' };
    // the title shows each maid in turn, going through her faces
    if (sc === SC.title && hired.length) { const k = hired[Math.floor(E.frame / 480) % hired.length]; return { key: k, emo: feelPic(k, ['calm', 'happy', 'love', 'excited', 'tease', 'surprise'][Math.floor(E.frame / 80) % 6]) }; }
    return { key: home, emo: moodEmotion(home) };
  }
  const MOTION = {
    berry: (t) => [0, -Math.abs(Math.sin(t * 0.11)) * 7],
    yoru: (t) => [0, Math.sin(t * 0.03) * 3],
    honey: (t) => [(t % 140) < 24 ? Math.sin(t * 1.3) * 5 : 0, Math.sin(t * 0.06) * 3],
    yukino: (t) => [Math.sin(t * 0.025) * 4, Math.sin(t * 0.05) * 2],
  };
  const shown = { key: null, emo: 'normal', since: 0, prev: null, slot: 0 };
  function drawSidePanel(ctx) {
    const PW = E.sideW;
    if (!SAVE || PW <= 0) return;
    const p = portraitFor(E.scene);
    const k = STAND[p.key] ? p.key : 'berry';
    const emo = STAND[k][p.emo] ? p.emo : 'normal';
    // the wallpaper, lined up with the scene's (same scroll, same tint); scenes without one get it dimmed
    const drew = lastBg.frame === E.draws;
    const off = drew ? lastBg.off : Math.floor(E.frame * 0.25) % 32;
    const tile = E.spr.bgTile;
    const band = (E.scene && E.scene.wideTop) || 0; // the scene has already drawn its full-width top band
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, band, PW, E.H - band);
    ctx.clip();
    for (let y = off - 32; y < E.H; y += 32) for (let x = PW + off - 32 * Math.ceil((PW + off) / 32); x < PW; x += 32) ctx.drawImage(tile, x, y);
    if (!drew) E.rect(0, band, PW, E.H - band, 'rgba(42,27,48,0.62)');
    else if (lastBg.tint) E.rect(0, band, PW, E.H - band, lastBg.tint);
    ctx.restore();
    // the scene's top and bottom bars, carried on across; a gold bar's run covers its own left end so the join is seamless
    const bars = edgeBars.frame === E.draws ? edgeBars.list : [];
    for (const bar of bars) {
      if (bar.y < band) continue;
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
    }
    // her figure, in front of everything on the panel; a change of feeling cross-fades with a little pop. Two picture
    // elements take turns, so neither swaps its image while it is still showing
    if (shown.key !== k) Object.assign(shown, { key: k, emo, since: E.frame, prev: null });
    else if (shown.emo !== emo) Object.assign(shown, { prev: { emo: shown.emo, at: E.frame, slot: shown.slot }, emo, slot: 1 - shown.slot });
    const blend = shown.prev ? Math.min(1, (E.frame - shown.prev.at) / 10) : 1;
    if (blend >= 1) shown.prev = null;
    const rise = Math.max(0, 1 - (E.frame - shown.since) / 16);
    const [mx, my] = p.locked ? [0, 0] : (MOTION[k] || MOTION.yoru)(E.frame);
    const filter = p.locked ? 'brightness(0) opacity(0.6)' : p.ko ? 'grayscale(0.7) brightness(0.8)' : null;
    const eyeY = STAND_TOP + STAND[k].normal.eye[1] * STAND_SCALE;
    const edge = PW + STAND_LEAN;
    const figure = (id, e, opacity, pop) => {
      const S = STAND[k][e];
      const sc = S.s * pop;
      const w = S.w * sc, h = S.h * sc;
      const ex = Math.max(PW / 2 - 8, Math.min(PW / 2, edge - (S.right - S.eye[0]) * sc)) + mx;
      const x = ex - S.eye[0] * sc;
      const y = eyeY + S.drop + my + rise * rise * 48 - S.eye[1] * sc;
      // nothing of her goes above the scene's full-width top band (the room's status bar): the expression-sheet
      // pictures carry sparkles and question marks up there
      const cut = Math.max(0, (band - y) / sc);
      E.art(id, S.src, x, y + cut * sc, w, h - cut * sc, [0, cut, S.w, S.h - cut, S.w, S.h], filter, { screen: true, opacity, fadeRight: [(edge - 12 - x) / w, (edge + 2 - x) / w] });
    };
    if (shown.prev) figure('side-portrait-' + shown.prev.slot, shown.prev.emo, 1 - blend, 1);
    figure('side-portrait-' + shown.slot, emo, blend, 1 + 0.05 * (1 - blend));
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
          E.groundShadow(it.tb.x - 12, it.tb.y - 3, 24, 4, 0.18);
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
      E.groundShadow(m.x - 10, m.y - 3, 20, 4, 0.18);
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
      if (G.restTick() >= 1) persist(); // stamina keeps coming back with the real clock
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
      // the real clock and today's sky, so the board reads like a real morning (or a rainy night)
      const w = G.world();
      const sky = E.spr.ui.weather[w.weather];
      if (sky) E.ctx.drawImage(sky, 96, 5);
      const tw = E.text(w.hhmm, 108, 3, { color: C.paper });
      E.text(G.t(w.weekName), 108 + tw + 5, 3, { color: w.weekend ? C.gold : C.paper });
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
            if (food) E.ctx.drawImage(E.spr.ui[food.icon === 'tea' ? 'bomb' : food.icon], 300 - (buffs.length - i) * 14, 207);
            else if (E.spr.room.gifts[b]) E.ctx.drawImage(E.spr.room.gifts[b], 300 - (buffs.length - i) * 14 - 2, 203, 12, 12);
          });
        }
      }
      if (this.warn > 0) {
        E.rect(144, 196, 170, 22, C.plum);
        E.text(G.t('女僕太累了！先回房間休息吧'), 229, 201, { color: C.pink, align: 'center' });
        E.text(G.t('體力每小時恢復 {n}', { n: G.REST_PER_HOUR }), 229, 209, { color: C.paper, align: 'center' });
      }
      hint(G.t('Z 出發（體力 -{n}）　X 回房間　ESC 標題', { n: G.JOB_STAMINA }));
    },
  };

  // ------------------------------------------------------------------ Café
  // What each counter is built of and what the room behind it looks like: the sweets counter is a little restaurant,
  // the carpenter works in a timber shed, the jeweller at a steel bench, the capsule stand under an awning.
  const SHOP_BUILD = [
    { wall: '#fff3e4', lip: '#c98a5a', top: '#e0b47a', front: '#9c5f3a', dark: '#8c5230', grain: 'plank' },
    { wall: '#f6efff', lip: '#d4a0c0', top: '#f0cde0', front: '#a96a8e', dark: '#8a5474', grain: 'plank' },
    { wall: '#f3e4cd', lip: '#d8a874', top: '#e8c08a', front: '#8a5a32', dark: '#6e4626', grain: 'plank' },
    { wall: '#e9f0fa', lip: '#aebdd2', top: '#d8e2f0', front: '#6c7a90', dark: '#4e5a6e', grain: 'rivet' },
    { wall: '#fff6e0', lip: '#ffcf8a', top: '#ffe3b4', front: '#d4485f', dark: '#a83446', grain: 'dot' },
    { wall: '#efe4ff', lip: '#a98cd0', top: '#c9b0e8', front: '#5a3d7a', dark: '#42295e', grain: 'dot' },
    { wall: '#ffe9f0', lip: '#c98a5a', top: '#e0b47a', front: '#9c5f3a', dark: '#8c5230', grain: 'plank' },
  ];
  // and how she waits at each of them
  const SHOP_IDLE = [
    { act: 'sway', emote: 'note', expr: 'happy', every: 150 },       // sweets: she hums over the cake case
    { act: 'rock', emote: 'heart', expr: 'blush', every: 130 },      // gifts: she cannot keep still
    { act: 'shift', emote: 'dots', expr: 'normal', every: 170 },     // furniture: she sizes the pieces up
    { act: 'stand', emote: 'exclaim', expr: 'normal', every: 190 },  // upgrades: she stands to attention
    { act: 'bounce', emote: 'sparkle', expr: 'happy', every: 96 },   // capsules: she bounces on the spot
    { act: 'fidget', emote: 'question', expr: 'surprise', every: 120 }, // cards: she cannot wait
  ];
  // and what her face does with what she just bought
  const DEAL_FACE = { eat: 'happy', hug: 'blush', ship: 'surprise', power: 'happy', show: 'happy' };
  // and what she makes of what he says
  const SAY_REACT = { poor: { expr: 'gloom', emote: 'sweat' }, again: { expr: 'surprise', emote: 'question' }, hello: { emote: 'exclaim' }, chat: { emote: 'dots' } };
  const DEAL_HOLD = 34; // the frame the goods are hers
  const DEAL_CUES = { eat: { 46: 'pop', 56: 'pop', 68: 'love' }, hug: { 40: 'gift', 62: 'love' }, ship: { 50: 'sweep', 70: 'door' }, power: { 52: 'levelup' }, show: { 38: 'pop', 50: 'love' } };
  const DEAL_END = { eat: 90, hug: 82, ship: 80, power: 78, show: 84 };
  const COUNTER_WALK = 28; // frames for the maid to walk on to a counter, or off it
  const BIG_H = 48; // how tall she stands at the counter, where s is 2
  SC.cafe = {
    enter(arg) {
      this.t = 0;
      this.tab = (arg && arg.tab) || 0;
      this.focus = 'tabs';
      this.row = 0;
      this.scroll = 0;
      this.msg = '';
      this.gacha = null;
      this.pack = null;
      this.deal = null;
      this.peek = null;
      this.lastRow = -1;
      this.keeperSay('hello');
      this.maidWalk('in');
      A.playMusic('cafe');
    },
    tabs: ['甜點補給', '禮物專櫃', '家具店', '女僕強化', '扭蛋機', '抽卡片', '女僕換班', '回房間'],
    shopKeys: ['food', 'gift', 'furniture', 'upgrade', 'gacha', 'card'],
    shop() { return G.SHOPS[this.shopKeys[this.tab]] || null; },
    // she walks on to the counter ('in') or off it ('out'); 'out' holds the controls until she is gone
    maidWalk(dir, then) {
      this.mw = { dir, t: 0, then: then || null };
      if (dir === 'out') this.keeperSay('bye');
    },
    // the goods changing hands, after the coins have
    handOver(img, kind, big) { this.deal = { t: 0, img: img || null, kind, big: !!big }; },
    // something to say while you make up your mind
    keeperChat() {
      const sh = this.shop();
      if (!sh || !sh.chat || !sh.chat.length) return;
      this.shopSay = { text: E.pick(sh.chat), t: 0, kind: 'chat' };
    },
    // what she makes of the thing your cursor is on
    rowMood() {
      const list = this.listFor(this.tab);
      const it = list && list[this.row];
      if (!it) return 'dots';
      const price = this.tab === 3 ? it.prices && it.prices[SAVE.upgrades[it.id] || 0] : this.tab === 2 ? (G.FURNITURE[it] || {}).price : it.price;
      if (price != null && price > SAVE.coins) return 'sweat'; // what she cannot have comes first
      if (this.tab === 1 && (it.fav === SAVE.maid || it.fav === 'all')) return 'heart';
      return 'sparkle';
    },
    // whatever the cursor is on, so he can hold it up for you
    rowIcon() {
      const S = E.spr;
      const list = this.listFor(this.tab);
      const it = list && list[this.row];
      if (!it) return null;
      if (this.tab === 0) return S.room.food[it.id] || S.items[it.icon];
      if (this.tab === 1) return S.room.gifts[it.id];
      if (this.tab === 2) return S.room.furniture[it];
      if (this.tab === 3) return S.items[it.icon];
      return null;
    },
    // what she carried off from the capsule machine or a pack of cards
    prizeIcon(p) {
      const S = E.spr;
      if (!p) return S.items.star;
      if (p.gift) return S.room.gifts[p.gift.id];
      if (p.food) return S.room.food[p.food.id] || S.items[p.food.icon];
      if (p.furniture) return S.room.furniture[p.furniture];
      if (p.card) return S.items.star;
      return S.items.coin[0]; // the coin is an animated set, not one picture
    },
    // the keeper's answer, in a bubble over the counter
    keeperSay(kind) {
      const sh = this.shop();
      const text = sh && (sh[kind] || (kind === 'again' && sh.poor));
      if (!text) { this.shopSay = null; return; }
      this.shopSay = { text, t: 0, kind };
    },
    listFor(tab) {
      if (tab === 0) return G.MENU_FOOD;
      if (tab === 1) return G.GIFTS;
      if (tab === 2) return G.FURNITURE_SHOP.filter((id) => { const F = G.FURNITURE[id]; return !F.who || F.who === SAVE.maid; });
      if (tab === 3) return G.UPGRADES;
      return [];
    },
    update() {
      this.t++;
      // she is still on her way: on her way out, the counter has the controls until she is through the door
      const walk = this.mw;
      if (walk) {
        walk.t++;
        if (walk.t >= COUNTER_WALK) {
          this.mw = null;
          if (walk.then) { walk.then(); return; }
        } else if (walk.dir === 'out') return;
      }
      const deal = this.deal;
      if (deal) {
        deal.t++;
        const cue = DEAL_CUES[deal.kind];
        if (cue && cue[deal.t]) A.sfx(cue[deal.t]);
        if (deal.t > (DEAL_END[deal.kind] || 70)) this.deal = null;
      }
      if (!this.mw && !this.deal && !this.shopSay && this.t % 400 === 0) this.keeperChat();
      // moving the cursor is an interaction too: she looks at what you are looking at
      if (this.focus === 'list' && this.tab < 4) {
        if (this.lastRow !== this.row) { this.lastRow = this.row; this.peek = { t: 0, emote: this.rowMood() }; }
      } else this.lastRow = -1;
      if (this.peek && ++this.peek.t > 44) this.peek = null;
      if (this.gacha) return this.updateGacha();
      if (this.pack) return this.updatePack();
      const d = E.menuDir();
      const n = this.tabs.length;
      if (this.focus === 'tabs') {
        // stepping along the counters: she walks to the next one, and it greets her as she arrives
        if (d === 'up' || d === 'down') {
          this.tab = (this.tab + n + (d === 'up' ? -1 : 1)) % n;
          A.sfx('select');
          this.msg = '';
          this.deal = null;
          this.keeperSay('hello');
          this.maidWalk('in');
        }
        if (E.menuPressed('a') || d === 'right') {
          if (this.tab === 7) { A.sfx('door'); this.maidWalk('out', () => E.go(SC.room)); return; }
          if (this.tab === 6) { A.sfx('confirm'); this.maidWalk('out', () => E.go(SC.select, { mode: 'switch', back: 'cafe' })); return; }
          A.sfx('confirm');
          this.focus = 'list';
          this.row = 0;
          this.scroll = 0;
        }
        if (E.menuPressed('b') || E.menuPressed('start')) { A.sfx('door'); this.maidWalk('out', () => E.go(SC.room)); }
        return;
      }
      if (this.tab === 4) {
        if (E.menuPressed('a')) this.spin();
        if (E.menuPressed('b') || d === 'left') { this.focus = 'tabs'; A.sfx('cancel'); }
        return;
      }
      // the card counter: one card, five cards, or the album (and the deck)
      if (this.tab === 5) {
        if (d === 'up') { this.row = (this.row + 2) % 3; A.sfx('select'); }
        if (d === 'down') { this.row = (this.row + 1) % 3; A.sfx('select'); }
        if (E.menuPressed('a')) {
          if (this.row === 2) { A.sfx('confirm'); E.go(SC.album, { back: SC.cafe, backArg: { tab: 5 } }); return; }
          this.openPack(this.row === 0 ? 1 : 5);
        }
        if (E.menuPressed('b') || d === 'left') { this.focus = 'tabs'; A.sfx('cancel'); this.msg = ''; }
        return;
      }
      const list = this.listFor(this.tab);
      {
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
      const coinsBefore = SAVE.coins;
      let again = false; // she asked for something she already has: the keeper says so, instead of talking about money
      if (this.tab === 0) {
        const f = G.MENU_FOOD[this.row];
        if (SAVE.buffs[f.id]) { A.sfx('denied'); this.msg = G.t('已經點過囉，下個委託會送上。'); again = true; }
        else if (SAVE.coins < f.price) { A.sfx('denied'); this.msg = G.t('金幣不夠……'); }
        else { SAVE.coins -= f.price; SAVE.buffs[f.id] = true; persist(); A.sfx('coin'); this.msg = G.t('{name} 點好了！{desc}', { name: f.name, desc: f.desc }); this.handOver(E.spr.room.food[f.id] || E.spr.items[f.icon], 'eat'); }
      } else if (this.tab === 1) {
        const g = G.GIFTS[this.row];
        if (SAVE.coins < g.price) { A.sfx('denied'); this.msg = G.t('金幣不夠……還差 {n}G', { n: g.price - SAVE.coins }); }
        else { SAVE.coins -= g.price; SAVE.gifts[g.id] = (SAVE.gifts[g.id] || 0) + 1; persist(); A.sfx('buy'); this.msg = G.t('買了{name}！回房間送給女僕吧。', { name: g.name }); this.handOver(E.spr.room.gifts[g.id], 'hug', g.fav === SAVE.maid || g.fav === 'all'); }
      } else if (this.tab === 2) {
        const id = G.FURNITURE_SHOP[this.row];
        const F = G.FURNITURE[id];
        const room = getRoom();
        if (F.unique && room.owned[id]) { A.sfx('denied'); this.msg = G.t('房間裡已經有{name}了。', { name: F.name }); again = true; }
        else if (SAVE.coins < F.price) { A.sfx('denied'); this.msg = G.t('金幣不夠……還差 {n}G', { n: F.price - SAVE.coins }); }
        else {
          SAVE.coins -= F.price;
          room.owned[id] = (room.owned[id] || 0) + 1;
          const placed = G.ROOMAPI && G.ROOMAPI.autoPlace(id);
          G.guideStep('shop');
          persist();
          A.sfx('buy');
          this.handOver(E.spr.room.furniture[id], 'ship');
          this.msg = G.t(placed ? '{name} 已經搬進房間了！' : '{name} 放進倉庫了（房間太擠）', { name: F.name });
        }
      } else {
        const u = G.UPGRADES[this.row];
        const lv = SAVE.upgrades[u.id];
        if (lv >= u.prices.length) { A.sfx('denied'); this.msg = G.t('已經強化到最高級了！'); again = true; }
        else if (SAVE.coins < u.prices[lv]) { A.sfx('denied'); this.msg = G.t('金幣不夠……還差 {n}G', { n: u.prices[lv] - SAVE.coins }); }
        else { SAVE.coins -= u.prices[lv]; SAVE.upgrades[u.id]++; persist(); A.sfx('power'); this.msg = G.t('{name} 強化到 Lv.{lv}！', { name: u.name, lv: SAVE.upgrades[u.id] }); this.handOver(E.spr.items[u.icon], 'power'); }
      }
      this.keeperSay(SAVE.coins < coinsBefore ? 'buy' : again ? 'again' : 'poor');
    },
    spin() {
      if (SAVE.coins < G.GACHA_PRICE) { A.sfx('denied'); this.msg = G.t('需要 {n}G 才能轉扭蛋。', { n: G.GACHA_PRICE }); this.keeperSay('poor'); return; }
      this.keeperSay('buy');
      SAVE.coins -= G.GACHA_PRICE;
      const prize = rollCapsule();
      persist();
      this.gacha = { t: 0, prize, rare: prize.rare };
      A.sfx('coin');
    },
    // the show, in beats: the coin (0-18), the crank (18-66), the capsule out of the chute (66-92), rolling up big
    // (92-110), wobbling in its colour (110-150), popping open (150), the prize (160-)
    updateGacha() {
      const g = this.gacha;
      g.t++;
      const t = g.t;
      if (t > 18 && t < 66 && (t - 18) % 12 === 0) A.sfx('tick');
      if (t === 70) A.sfx('drop');
      if (t > 110 && t < 150 && t % (g.rare >= 3 ? 8 : 12) === 0) A.sfx('tick');
      if (t === 150) { A.sfx(g.rare >= 3 ? 'rare' : 'pop'); if (g.rare >= 4) A.sfx('love'); }
      if (t === 162) A.sfx(g.rare >= 2 ? 'item' : 'coin');
      if (t < 150 && (E.menuPressed('a') || E.pointer.pressed)) g.t = 149; // straight to the opening
      else if (t > 175 && (E.menuPressed('a') || E.menuPressed('b') || E.pointer.pressed)) { const icon = this.prizeIcon(g.prize); this.gacha = null; A.sfx('confirm'); this.handOver(icon, 'show'); }
    },
    // ---------------- the card counter
    openPack(n) {
      const price = n === 1 ? G.CARD_PRICE : G.CARD_PRICE5;
      if (SAVE.coins < price) { A.sfx('denied'); this.msg = G.t('需要 {n}G 才能抽卡片。', { n: price }); this.keeperSay('poor'); return; }
      this.keeperSay('buy');
      SAVE.coins -= price;
      const cards = [];
      for (let i = 0; i < n; i++) cards.push(pickCard(1));
      if (n === 5 && !cards.some((c) => c.rare >= 3)) cards[E.randi(0, 4)] = pickCard(3);
      const list = cards.map((card) => { const isNew = !SAVE.cards[card.id]; return { card, isNew, refund: giveCard(card), flip: -1 }; });
      persist();
      this.pack = { t: 0, list, next: 0, nextAt: 84, best: Math.max(...cards.map((c) => c.rare)), cut: null, flash: 0 };
      A.sfx('gacha');
    },
    // the pack: in (0-40), torn open (40), the cards flying out (44-80), then turned one by one (on their own, or Z)
    updatePack() {
      const p = this.pack;
      p.t++;
      if (p.flash > 0) p.flash--;
      if (p.t === 40) { A.sfx('pop'); if (p.best >= 3) A.sfx('rare'); }
      if (p.cut) {
        if (++p.cut.t > 90 || (p.cut.t > 20 && (E.menuPressed('a') || E.pointer.pressed))) { p.cut = null; p.nextAt = p.t + 20; }
        return;
      }
      const all = p.next >= p.list.length;
      const press = E.menuPressed('a') || E.pointer.pressed;
      if (p.t < 80) { if (press) p.t = 80; return; }
      if (!all && (p.t >= p.nextAt || press)) {
        const c = p.list[p.next++];
        c.flip = p.t;
        p.nextAt = p.t + 26;
        A.sfx('select');
      }
      // the face shows six frames into the turn: its sound and, for the best cards, their moment
      for (const c of p.list) {
        if (c.flip < 0 || p.t - c.flip !== 6) continue;
        const r = c.card.rare;
        A.sfx(r >= 4 ? 'love' : r >= 3 ? 'rare' : r >= 2 ? 'item' : 'coin');
        if (r >= 4) { p.flash = 14; p.cut = { card: c.card, t: 0 }; }
        else if (r >= 3) p.flash = 6;
      }
      if (all && p.t > p.nextAt + 10 && (press || E.menuPressed('b'))) { this.pack = null; A.sfx('confirm'); this.handOver(E.spr.items.star, 'show'); }
    },
    draw() {
      const t = this.t;
      bg(t);
      header(G.t('女僕咖啡廳「蕾絲炸彈」'));
      coinLabel(312, 5, SAVE.coins, 'right');
      // tabs
      darkPanel(6, 24, 84, 124);
      this.tabs.forEach((s, i) => {
        const y = 28 + i * 15;
        const on = i === this.tab;
        if (on) E.rect(9, y - 2, 78, 14, this.focus === 'tabs' ? C.red : C.panel2);
        E.text(G.t(s), 22, y, { color: on ? C.white : C.gray, fit: 64 });
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
      else if (this.tab === 5) this.drawCardPanel();
      else if (this.tab === 6) {
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
      const hints = { tabs: G.t('↑↓ 選擇　Z 決定　X 回房間'), gacha: G.t('Z 轉扭蛋　X 返回'), grid: G.t('方向鍵 選擇　Z 購買　X 返回'), list: G.t('↑↓ 選擇　Z 購買　X 返回'), cards: G.t('↑↓ 選擇　Z 決定　X 返回') };
      hint(this.focus === 'tabs' ? hints.tabs : this.tab === 4 ? hints.gacha : this.tab === 5 ? hints.cards : this.tab === 1 ? hints.grid : hints.list);
      if (this.gacha) this.drawGachaReveal();
      if (this.pack) this.drawPack();
    },
    // the counter as it should be: the shop's keeper behind it, the maid on duty in front of it as the customer,
    // and every tab its own shop — its own room, its own bench, its own way of doing business
    drawCounter(x, y) {
      const ctx = E.ctx;
      const k = SAVE.maid || 'berry';
      const sh = this.shop();
      const b = SHOP_BUILD[this.tab] || SHOP_BUILD[6];
      E.panel(x, y, 84, 70, '#ffd6e4', C.pink, { shine: C.white });
      // the room behind the counter, clipped to the wall so a tall piece is cut off by the counter's frame
      const say = this.shopSay;
      const hop = say && say.t < 26 ? -Math.round(3 * Math.abs(Math.sin((say.t / 13) * Math.PI))) : 0;
      ctx.save();
      ctx.beginPath();
      ctx.rect(x + 3, y + 3, 78, 33);
      ctx.clip();
      this.drawShopRoom(x, y, b);
      const keeper = sh && E.spr.monsters[sh.keeper];
      if (keeper) {
        // he ducks below the counter to fetch what you asked for, and pops back up with it
        const d0 = this.deal;
        const dip = d0 && d0.t < 13 ? Math.round(7 * Math.sin((d0.t / 13) * Math.PI)) : 0;
        const img = keeper.frames[(say ? say.t >> 3 : this.t >> 5) % 2];
        ctx.drawImage(img, x + 6, y + 36 - img.height + hop + dip);
      }
      this.drawShopBusy(x, y);
      ctx.restore();
      // the counter itself, built of whatever this shop is built of: a lit top, a shadow under the lip, and the
      // front going darker towards the floor
      E.rect(x + 3, y + 34, 78, 5, b.lip);
      E.rect(x + 3, y + 34, 78, 1, b.top);
      E.rect(x + 3, y + 36, 78, 3, b.top);
      E.rect(x + 3, y + 39, 78, 28, b.front);
      E.rect(x + 3, y + 39, 78, 2, b.dark);
      E.rect(x + 3, y + 62, 78, 5, b.dark);
      if (b.grain === 'rivet') {
        E.rect(x + 3, y + 52, 78, 1, b.dark);
        for (let i = 0; i < 78; i += 12) { E.rect(x + 8 + i, y + 44, 2, 2, b.dark); E.rect(x + 8 + i, y + 60, 2, 2, b.dark); }
      } else if (b.grain === 'dot') {
        for (let j = 0; j < 3; j++) for (let i = 0; i < 78; i += 10) E.rect(x + 6 + i + (j % 2) * 5, y + 45 + j * 8, 2, 2, b.dark);
      } else {
        for (let i = 0; i < 78; i += 6) E.rect(x + 4 + i, y + 43, 3, 22, b.dark);
      }
      E.rect(x + 3, y + 41, 78, 1, b.lip);
      // the maid, in front of it: walking on, waiting the way this shop makes her wait, or walking off again
      const s = 2, spot = x + 52, gone = x + 94;
      const walk = this.mw;
      const deal = this.deal;
      const show = deal && deal.t > DEAL_HOLD ? deal.kind : null;
      const idle = SHOP_IDLE[this.tab];
      const beat = idle ? this.t % idle.every : 0;
      let mx = spot, face = 'down', step = -1, lift = 0, expr = (idle && idle.expr) || 'normal';
      let emote = idle && beat < 44 ? idle.emote : null;
      if (walk) {
        const p = Math.min(1, walk.t / COUNTER_WALK);
        const away = walk.dir === 'in' ? 1 - p : p; // 1 = off to the right, 0 = at the counter
        mx = Math.round(spot + (gone - spot) * away);
        if (p < 1) { face = walk.dir === 'in' ? 'left' : 'right'; step = [1, 0, 2, 0][(walk.t >> 2) % 4]; }
      } else if (deal) {
        // she plays it all to the front: you see what she thinks of it
        expr = DEAL_FACE[deal.kind] || 'happy';
        if (deal.t < 22) lift = -Math.round(4 * Math.abs(Math.sin((deal.t / 11) * Math.PI)));
        if (show === 'eat' && deal.t > 44 && deal.t < 80) lift = (deal.t - 44) % 10 < 3 ? -2 : 0;
        else if (show === 'hug') lift = -Math.round(1 + Math.sin(deal.t / 6));
        else if (show === 'power' && deal.t > 50 && deal.t < 64) lift = -2;
        if (show === 'ship' && deal.t > 62) expr = 'happy';
        emote = null;
      } else if (idle) {
        // waiting at the counter, facing you — what changes with the shop is how she holds herself
        if (idle.act === 'sway') lift = -Math.round(1 + Math.sin(this.t / 14));
        else if (idle.act === 'rock') { mx = spot + (Math.sin(this.t / 11) > 0 ? 1 : -1); lift = -Math.round(Math.abs(Math.sin(this.t / 11))); }
        else if (idle.act === 'shift') { if (beat < 16) step = 1; else if (beat < 30) step = 0; }
        else if (idle.act === 'bounce') lift = beat < 26 ? -Math.round(5 * Math.abs(Math.sin((beat / 13) * Math.PI))) : 0;
        else if (idle.act === 'fidget') { if (beat < 26) { step = (beat >> 3) % 2 ? 2 : 1; mx = spot + (beat >> 3) % 2; } }
        // she looks at what your cursor is on
        if (this.peek) {
          emote = this.peek.emote;
          if (emote === 'heart') expr = 'happy';
          else if (emote === 'sweat') expr = 'gloom';
        }
        // and she answers the keeper: a wince when the coins are short, a blink when she has it already
        const r = say && say.t < 64 && SAY_REACT[say.kind];
        if (r) { if (r.expr) expr = r.expr; if (r.emote) emote = r.emote; }
      }
      // every deal ends with a small bow
      if (deal) { const end = DEAL_END[deal.kind] || 70; if (deal.t > end - 18 && deal.t < end - 8) lift = 2; }
      const my = Math.round(y + 68 - BIG_H) + lift;
      // standing still she breathes, the way she does in her room, and she wears whatever she has on
      const MS = (E.spr.outfits[k] && E.spr.outfits[k][G.outfitOf(k)]) || E.spr.maids[k];
      const breath = (this.t + 23) % 96 >= 78;
      const body = step >= 0 ? MS[face][step]
        : face !== 'down' ? (breath ? MS.breath[face] : MS[face][0])
          : (breath ? MS.facesBreath : MS.faces)[expr] || (breath ? MS.breath.down : MS.down[0]);
      ctx.save();
      ctx.beginPath();
      ctx.rect(x + 2, y + 2, 80, 66);
      ctx.clip();
      E.groundShadow(mx + 7, y + 66, 18, 4, 0.25);
      // standing in her maid outfit she is drawn from the 32x44 sheet, which has the counter's own pixel density
      const bigSprite = face === 'down' && step < 0 && G.outfitOf(k) === 'maid' && E.spr.bigMaids && E.spr.bigMaids[k];
      if (bigSprite) ctx.drawImage(bigSprite, mx, y + 68 - 44 + lift);
      else ctx.drawImage(body, mx, my, 16 * s, 24 * s);
      // at this size her face is worth drawing twice over: the 16x8 version goes in, and what is hers — glasses, a
      // lock of hair over her cheek — goes back on top of it
      const big = !bigSprite && face === 'down' && step < 0 && E.spr.faceBig[k];
      if (big) {
        const fy = my + 22 + (breath ? 2 : 0);
        ctx.drawImage(big[expr] || big.normal, mx + 8, fy);
        if (MS.faceMask) ctx.drawImage(MS.faceMask, 0, 0, 8, 4, mx + 8, fy, 16, 8);
        // sulking, she gets the little rain lines over her head, the way the reference draws it
        if (expr === 'gloom' && E.spr.fx.gloom) ctx.drawImage(E.spr.fx.gloom, mx - 2, my - 3 + ((this.t >> 3) % 2)); // left of her head, clear of the emote
      } else if (expr === 'blush' && face === 'down' && step < 0) {
        const by2 = my + 8 + (breath ? 2 : 0);
        E.rect(mx + 6, by2, 4, 2, '#ff6f91');
        E.rect(mx + 22, by2, 4, 2, '#ff6f91');
      }
      // what she came with, on the counter top
      ctx.drawImage((E.spr.bombs[k] || E.spr.bomb)[(this.t >> 4) % 3], x + 34, y + 20);
      // and what he is holding up for you: whatever the cursor is on
      if (this.focus === 'list' && !walk) {
        const held = this.rowIcon();
        if (held) ctx.drawImage(held, x + 12, y + 38 - held.height - ((this.t >> 3) % 2));
      }
      // what she is thinking of at this counter
      if (!walk && emote) {
        const em = E.spr.room.emotes[emote];
        if (em) ctx.drawImage(em, mx + 14, my - 6 - (this.t % 8 < 4 ? 1 : 0));
      }
      if (deal) this.drawDeal(deal, mx, my, x, y);
      ctx.restore();
      // and what the keeper has to say
      if (say) {
        if (++say.t > 150) this.shopSay = null;
        else {
          const txt = say.text;
          const o = { size: 10, fit: 72 };
          const w = Math.min(80, E.textWidth(txt, o) + 8);
          const bx = x + 2, by = y - 4;
          E.panel(bx, by, w, 16, C.white, C.plum, {});
          E.rect(bx + 6, by + 15, 5, 2, C.plum);
          E.rect(bx + 6, by + 15, 4, 1, C.white);
          E.rect(bx + 6, by + 17, 3, 2, C.plum);
          E.rect(bx + 6, by + 17, 2, 1, C.white);
          E.text(txt, bx + 4, by + 3, { color: C.plum, size: 10, fit: w - 8 });
        }
      }
    },
    // the deal, in beats: her coin over the counter (0-16), the goods back (12-34), and then what she does with them —
    // eats it where she stands, hugs it, watches it carted off to her room, or takes the upgrade into her kit
    drawDeal(d, mx, my, x, y) {
      const ctx = E.ctx;
      const kx = x + 16;
      if (d.t <= 16 && d.kind !== 'show') {
        const p = d.t / 16;
        ctx.drawImage(E.spr.ui.coin, Math.round(mx + 12 - (mx + 12 - kx) * p), Math.round(y + 40 - 10 * p - 12 * Math.sin(p * Math.PI)));
      }
      const img = Array.isArray(d.img) ? d.img[0] : d.img; // some icons are animated sets
      if (!img || d.t <= 12) return;
      const rest = d.kind === 'show' ? { x: mx + 8, y: my - 13 }    // held up for you to see
        : d.kind === 'eat' ? { x: mx - 5, y: my + 10 }                // up beside her face
        : d.kind === 'hug' ? { x: mx + 8, y: my + 25 }                // held to her
          : d.kind === 'ship' ? { x: x + 34, y: y + 20 }              // on the counter, waiting to be carted off
            : { x: mx + 8, y: my - 10 };                              // over her head, about to go in
      const p = Math.min(1, (d.t - 12) / 22);
      let gx = kx + (rest.x - kx) * p;
      let gy = y + 24 + (rest.y - (y + 24)) * p - 12 * Math.sin(p * Math.PI);
      let cut = 0, alpha = 1;
      const s = d.t - DEAL_HOLD;
      if (s > 0) {
        if (d.kind === 'show') {
          // she holds it up: it bobs over her head while the stars go off around it
          gy += Math.round(Math.sin(s / 7));
          for (let i = 0; i < 4; i++) {
            const a = (i * Math.PI) / 2 + s / 14;
            const r = 8 + Math.min(12, s * 0.5);
            ctx.drawImage(E.spr.fx.star[(s >> 3) % 2], Math.round(mx + 13 + Math.cos(a) * r), Math.round(my - 6 + Math.sin(a) * r * 0.6));
          }
          if (s > 30) alpha = Math.max(0, 1 - (s - 30) / 20);
        } else if (d.kind === 'eat') {
          // she eats it where she stands: three bites out of the top, crumbs, and then she is very pleased
          cut = s > 30 ? img.height : s > 20 ? Math.round(img.height * 0.62) : s > 10 ? Math.round(img.height * 0.3) : 0;
          for (const at of [10, 20, 30]) if (s >= at && s < at + 8) ctx.drawImage(E.spr.fx.smoke[Math.min(3, (s - at) >> 1)], Math.round(gx + 2), Math.round(gy + 2));
          if (s > 30) { const q = Math.min(1, (s - 30) / 24); ctx.drawImage(E.spr.fx.heart, Math.round(mx + 26), Math.round(my + 2 - 12 * q)); }
        } else if (d.kind === 'hug') {
          gy -= Math.round(1 + Math.sin(d.t / 6));
          const q = (s % 30) / 30;
          ctx.drawImage(E.spr.fx.heart, Math.round(mx - 4), Math.round(my + 18 - 18 * q));
          ctx.drawImage(E.spr.fx.heart, Math.round(mx + 28), Math.round(my + 14 - 18 * ((q + 0.5) % 1)));
          // one she loves is worth a bigger one
          const big = d.big && E.spr.fx.bigHeart.love;
          if (big && s > 6) {
            const r2 = Math.min(1, (s - 6) / 10);
            const w2 = Math.round(big.width * r2), h2 = Math.round(big.height * r2);
            ctx.globalAlpha = s > 34 ? Math.max(0, 1 - (s - 34) / 16) : 1;
            ctx.drawImage(big, Math.round(mx + 16 - w2 / 2), Math.round(my - 4 - h2 / 2 - s * 0.15), w2, h2);
            ctx.globalAlpha = 1;
          }
        } else if (d.kind === 'ship') {
          // the carpenter carts it off to her room
          if (s > 12) { const q = Math.min(1, (s - 12) / 26); gx += (x + 98 - rest.x) * q; alpha = q > 0.75 ? 1 - (q - 0.75) / 0.25 : 1; }
          if (s > 18 && s < 36) ctx.drawImage(E.spr.fx.puff[Math.min(3, (s - 18) >> 2)], Math.round(x + 52), Math.round(y + 12));
        } else {
          // the upgrade goes into her kit
          const q = Math.min(1, Math.max(0, (s - 16) / 16));
          gy += 12 * q;
          alpha = 1 - q;
          const r = 17 - 10 * q;
          for (let i = 0; i < 4; i++) {
            const a = this.t / 8 + (i * Math.PI) / 2;
            ctx.drawImage(E.spr.fx.sparkle[(d.t >> 2) % 3], Math.round(mx + 13 + Math.cos(a) * r), Math.round(my + 22 + Math.sin(a) * r * 0.55));
          }
          if (s > 28) ctx.drawImage(E.spr.fx.glint[(s >> 2) % 2], Math.round(mx + 12), Math.round(my + 16));
        }
      }
      if (cut >= img.height) return;
      ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
      ctx.drawImage(img, 0, cut, img.width, img.height - cut, Math.round(gx), Math.round(gy) - (img.height - 16) + cut, img.width, img.height - cut);
      ctx.globalAlpha = 1;
    },
    // what the keeper is doing with himself while you browse: each trade has its own small business
    drawShopBusy(x, y) {
      const ctx = E.ctx;
      const S = E.spr;
      const t = this.t;
      if (this.tab === 0) {
        // steam off the machine
        for (let i = 0; i < 2; i++) {
          const q = ((t + i * 45) % 90) / 90;
          ctx.globalAlpha = 0.6 * (1 - q);
          ctx.drawImage(S.fx.smoke[Math.min(3, (q * 4) | 0)], Math.round(x + 27 + Math.sin(q * 5 + i) * 2), Math.round(y + 6 - q * 9));
        }
        ctx.globalAlpha = 1;
      } else if (this.tab === 1) {
        // he is wrapping: the lid comes off the box and settles back on
        const c = t % 150;
        const box = S.fx.giftbox;
        const by = y + 22 - box.closed.height;
        if (c < 40) ctx.drawImage(box.open, x + 24, by);
        else if (c < 58) {
          ctx.drawImage(box.closed, x + 24, by - (c < 48 ? 2 : 0));
          if (c < 52) ctx.drawImage(S.fx.sparkle[(c >> 1) % 3], x + 36, by + 1);
        }
      } else if (this.tab === 2) {
        // he taps a joint home
        const c = t % 110;
        if (c < 46) {
          const down = c % 22 >= 11;
          ctx.drawImage(S.shop.hammer, x + 42, y + (down ? 5 : 0));
          if (down && c % 22 < 16) ctx.drawImage(S.fx.star[(c >> 1) % 2], x + 47, y + 20);
        }
      } else if (this.tab === 3) {
        // the dial catches the light
        const c = t % 130;
        if (c < 18) ctx.drawImage(S.fx.glint[(c >> 3) % 2], x + 28, y + 9);
      } else if (this.tab === 4) {
        // a capsule drops into the chute
        const c = t % 120;
        if (c < 24) ctx.drawImage(S.ui.coin, x + 31, y + 18 + Math.round(c * 0.3));
      } else if (this.tab === 5) {
        // he turns a card over and over
        const c = t % 130;
        if (c < 44) {
          const w = Math.max(1, Math.round(Math.abs(Math.cos((c / 44) * Math.PI * 2)) * 11));
          drawCardBack(Math.round(x + 57 - w / 2), y + 6, w, 14, t);
        }
      }
    },
    // the room behind each counter: 78x31 of its own shop
    drawShopRoom(x, y, b) {
      const ctx = E.ctx;
      const S = E.spr;
      const tab = this.tab;
      const plank = (by) => { E.rect(x + 22, by, 42, 2, b.lip); E.rect(x + 22, by + 2, 42, 1, b.dark); };
      const on = (imgs, by) => imgs.forEach((im, i) => { if (im) ctx.drawImage(im, x + 24 + i * 20, by - im.height); });
      E.rect(x + 3, y + 3, 78, 33, b.wall);
      E.rect(x + 3, y + 32, 78, 4, b.dark);
      E.rect(x + 3, y + 32, 78, 1, b.lip);
      if (tab === 0) {
        // a little restaurant: panelled walls over a pink wainscot, the day's cakes out, the machine on the end
        for (let i = 0; i < 78; i += 9) E.rect(x + 3 + i, y + 3, 1, 21, '#ffe4cd');
        E.rect(x + 3, y + 24, 78, 12, '#f6d3dd');
        E.rect(x + 3, y + 23, 78, 1, b.lip);
        plank(y + 22);
        ctx.drawImage(S.shop.coffee, x + 24, y + 8);
        on([null, S.room.food.cake], y + 22);
      } else if (tab === 1) {
        // the gift counter: striped paper and a string of bunting
        for (let i = 0; i < 78; i += 9) E.rect(x + 3 + i, y + 3, 4, 33, '#ece0ff');
        for (let i = 0; i < 78; i += 11) {
          const col = (i / 11) % 2 ? '#ff8aa8' : '#ffd23f';
          for (let j = 0; j < 4; j++) E.rect(x + 4 + i + j, y + 4 + j, 9 - j * 2, 1, col);
        }
        E.rect(x + 3, y + 3, 78, 1, '#c98a5a');
        plank(y + 22);
        if (S.fx.giftbox.closed) ctx.drawImage(S.fx.giftbox.closed, x + 24, y + 22 - S.fx.giftbox.closed.height);
        on([null, S.room.gifts.bouquet], y + 22);
      } else if (tab === 2) {
        // the carpenter's shed: sawn planks, and his pieces standing on the floor
        for (let j = 0; j < 34; j += 8) E.rect(x + 3, y + 3 + j, 78, 1, '#c09660');
        for (let j = 0; j < 34; j += 8) for (let i = (j % 16 ? 4 : 14); i < 78; i += 22) E.rect(x + 3 + i, y + 4 + j, 1, 7, '#c09660');
        on([S.room.furniture.lamp, S.room.furniture.plant], y + 35);
      } else if (tab === 3) {
        // the jeweller's bench: a steel wall with a riveted rail and his gauge
        E.rect(x + 3, y + 3, 78, 5, '#dbe4f2');
        E.rect(x + 3, y + 8, 78, 1, '#aebdd2');
        for (let i = 0; i < 78; i += 12) E.rect(x + 8 + i, y + 5, 2, 2, '#aebdd2');
        plank(y + 22);
        ctx.drawImage(S.shop.gauge, x + 24, y + 8);
        on([null, S.items.fire], y + 22);
      } else if (tab === 4) {
        // the capsule stand: an awning, confetti and her own machine
        for (let i = 0; i < 78; i += 12) E.rect(x + 3 + i, y + 3, 6, 5, '#ec3d5f');
        E.rect(x + 3, y + 8, 78, 1, '#c9920e');
        for (const [dx, dy, col] of [[10, 14, '#ffd23f'], [30, 12, '#7fe08a'], [50, 16, '#ff8aa8'], [68, 26, '#8ac8ff'], [20, 26, '#ff8aa8']]) E.rect(x + dx, y + dy, 2, 2, col);
        plank(y + 22);
        ctx.drawImage(S.shop.gachamini, x + 24, y + 8);
        for (let i = 0; i < 2; i++) drawCapsule(x + 47 + i * 12, y + 16, 5, i + 1, this.t + i * 9, 0);
      } else if (tab === 5) {
        // the card counter: a dark scalloped curtain and a night sky
        for (let i = 0; i < 78; i += 10) { E.rect(x + 3 + i, y + 3, 10, 4, '#5a3d7a'); E.rect(x + 6 + i, y + 7, 4, 2, '#5a3d7a'); }
        for (const [dx, dy] of [[14, 14], [36, 11], [60, 16], [72, 12]]) ctx.drawImage(S.fx.star[(this.t >> 4) % 2], x + dx, y + dy);
        plank(y + 22);
        for (let i = 0; i < 2; i++) drawCardBack(x + 24 + i * 14, y + 8, 11, 14, this.t + i * 12);
      } else {
        // the rest of the café
        plank(y + 22);
        on([S.room.gifts.daifuku, S.room.gifts.novel], y + 22);
      }
    },
    drawGifts() {
      E.text(G.t('禮物專櫃'), 106, 30, { color: C.red, size: 14 });
      E.text(G.t('回房間送給女僕'), 306, 32, { color: C.dim, align: 'right' });
      const list = G.GIFTS;
      // what you have found out about the hired maids' tastes: a heart for a favourite, a drop for a miss
      const hired = G.MAID_ORDER.filter((k) => SAVE.hired[k]);
      for (let i = this.scroll; i < Math.min(list.length, this.scroll + 4); i++) {
        const g = list[i];
        const y = 50 + (i - this.scroll) * 37;
        const on = this.focus === 'list' && i === this.row;
        E.panel(104, y, 202, 34, on ? '#fff' : C.paper2, on ? C.red : C.pink);
        E.ctx.drawImage(E.spr.room.gifts[g.id], 113, y + 9);
        E.text(g.name, 136, y + 3, { color: C.plum, fit: 80 });
        E.text(g.desc, 136, y + 18, { color: C.ink, fit: 112 });
        coinLabel(256, y + 3, g.price);
        E.text(G.t('持有 {n}', { n: SAVE.gifts[g.id] || 0 }), 300, y + 19, { color: C.dim, align: 'right' });
        const marks = hired.map((k) => [k, (SAVE.tastes[k] || {})[g.id] || (g.fav === k ? 'love' : null)]).filter(([, t]) => t && t !== 'normal');
        marks.forEach(([k, taste], j) => {
          const hx = 252 - (marks.length - j) * 9;
          E.rect(hx, y + 3, 9, 9, G.MAID_DATA[k].color);
          E.ctx.drawImage(E.spr.ui.taste[taste], hx + 1, y + 5);
        });
        if (on) heartCursor(96, y + 12);
      }
      if (this.scroll > 0) E.text('▲', 300, 42, { color: C.red, align: 'right' });
      if (this.scroll + 4 < list.length) E.text('▼', 300, 199, { color: C.red, align: 'right' });
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
      E.text(G.t('轉出小獎品'), 306, 32, { color: C.dim, align: 'right' });
      drawCapsuleMachine(108, 50, t, 0, false);
      E.text(G.t('轉一次'), 184, 54, { color: C.ink });
      coinLabel(226, 56, G.GACHA_PRICE);
      const n = wrapLines([G.t('金幣、禮物、甜點券、家具，運氣好還能抽到卡片或大獎！')], 184, 72, C.ink, 15, 122);
      // what can come out, by colour
      const rows = [[1, G.t('零錢包・小禮物')], [2, G.t('甜點券・金幣袋')], [3, G.t('卡片・家具')], [4, G.t('大獎 1000G')]];
      rows.forEach(([r, label], i) => {
        const y = 80 + n * 15 + i * 13;
        drawCapsule(190, y + 5, 4, r, t, 0);
        E.text(G.RARE_NAME[r] + ' ' + label, 198, y, { color: C.dim, fit: 106 });
      });
      const py = Math.max(176, 80 + n * 15 + rows.length * 13 + 2);
      if (this.focus === 'list' && (t >> 5) % 2 === 0) E.text(G.t('按 Z 轉扭蛋！'), 184, py, { color: C.red });
      else if (this.focus !== 'list') E.text(G.t('按 → 或 Z 進入'), 184, py, { color: C.dim });
    },
    drawCardPanel() {
      const t = this.t;
      E.text(G.t('抽卡片'), 106, 30, { color: C.red, size: 14 });
      const owned = G.CARDS.filter((c) => SAVE.cards[c.id]).length;
      E.text(G.t('收集 {n}/{total}', { n: owned, total: G.CARDS.length }), 306, 32, { color: C.dim, align: 'right' });
      drawPackArt(112, 52, 56, 76, t, 0);
      const items = [[G.t('抽 1 張'), G.CARD_PRICE], [G.t('抽 5 張'), G.CARD_PRICE5], [G.t('卡片圖鑑・編組牌組'), null]];
      items.forEach(([label, price], i) => {
        const y = 52 + i * 26;
        const on = this.focus === 'list' && i === this.row;
        E.panel(180, y, 126, 22, on ? '#fff' : C.paper2, on ? C.red : C.pink);
        E.text(label, 186, y + 5, { color: C.plum, fit: price != null ? 72 : 114 });
        if (price != null) coinLabel(300, y + 7, price, 'right');
        if (on) heartCursor(172, y + 7);
      });
      E.text('N 48%  R 32%  SR 16%  SSR 4%', 106, 134, { color: C.dim });
      E.text(G.t('抽 5 張一定有 SR 以上的卡！'), 106, 148, { color: C.red, fit: 200 });
      const deck = (SAVE.deck || []).map((id) => G.CARDS.find((c) => c.id === id)).filter(Boolean);
      if (!deck.length) {
        wrapLines([G.t('放進牌組的卡片（最多 3 張）會在每次委託發揮效果。重複的卡會退還金幣。')], 106, 163, C.ink, 13, 200);
        E.text(G.t('牌組') + '：' + G.t('（空）'), 106, 204, { color: C.red, fit: 200 });
      } else {
        // with a deck, what it does takes the place of the rules
        E.text(G.t('牌組') + ' ' + deck.length + '/' + G.DECK_SIZE, 106, 164, { color: C.red });
        wrapLines([deckText(deck)], 106, 179, C.ink, 13, 200);
      }
    },
    // the capsule show (see updateGacha for the beats)
    drawGachaReveal() {
      const g = this.gacha;
      const t = g.t;
      E.rect(0, 0, E.W, E.H, 'rgba(42,27,48,0.9)');
      E.artShade(0);
      if (t < 110) {
        const crank = t >= 18 && t < 66 ? Math.floor((t - 18) / 12) + 1 : t >= 66 ? 4 : 0;
        drawCapsuleMachine(128, 36, t, crank, t >= 18 && t < 66);
        // the coin going into the slot
        if (t < 18) E.ctx.drawImage(E.spr.items.coin[(t >> 2) % 4], 139, Math.round(40 + t * 2.4));
        // out of the chute, bouncing, then rolling to the middle and growing
        if (t >= 66) {
          const k = Math.min(1, (t - 66) / 26);
          const bounce = t < 92 ? Math.abs(Math.sin((t - 66) * 0.35)) * 10 * (1 - k) : 0;
          const x = t < 92 ? 164 + k * 4 : 168 - Math.min(1, (t - 92) / 18) * 8;
          const y = t < 92 ? 142 - bounce : 142 - Math.min(1, (t - 92) / 18) * 30;
          const r = t < 92 ? 5 : 5 + Math.min(1, (t - 92) / 18) * 17;
          drawCapsule(x, y, r, g.rare, t, 0);
        }
        return;
      }
      // the capsule, big, wobbling in its colour: more and harder the rarer it is
      if (t < 150) {
        const hard = g.rare >= 3 ? 1.6 : 1;
        const wob = Math.sin(t * (g.rare >= 3 ? 0.9 : 0.6)) * (t - 110) / 40 * 5 * hard;
        rays(160, 112, 26 + (t - 110) * 0.8, rareColor(g.rare, t), 0.12 + (t - 110) / 40 * 0.25, t);
        drawCapsule(160 + wob, 112, 22, g.rare, t, 0);
        if (g.rare >= 3 && t % 6 === 0) for (let i = 0; i < 3; i++) E.ctx.drawImage(E.spr.fx.sparkle[(t >> 3) % 3], 160 + E.randi(-40, 40), 112 + E.randi(-34, 30));
        return;
      }
      // open: the halves fly apart, light bursts out, the prize rises
      const o = t - 150;
      if (o < 4 && g.rare >= 3) { E.ctx.globalAlpha = 0.6 - o * 0.15; E.rect(0, 0, E.W, E.H, '#ffffff'); E.ctx.globalAlpha = 1; }
      rays(160, 106, 70 + Math.min(40, o * 3), rareColor(g.rare, t), 0.3, t);
      if (o < 30) drawCapsule(160, 112, 22, g.rare, t, Math.min(1, o / 14));
      for (let i = 0; i < (g.rare >= 3 ? 16 : 8); i++) {
        const a = (i / (g.rare >= 3 ? 16 : 8)) * Math.PI * 2 + t * 0.02, d = 40 + Math.min(30, o * 2);
        E.ctx.drawImage(E.spr.fx.sparkle[((t >> 3) + i) % 3], Math.round(160 + Math.cos(a) * d - 2), Math.round(104 + Math.sin(a) * d * 0.6 - 2));
      }
      if (g.rare >= 3) for (let i = 0; i < 24; i++) {
        const k = ((o * 2 + i * 13) % 90) / 90;
        E.rect(Math.round(40 + ((i * 53) % 240)), Math.round(k * 240 - 20), 2, 3, ['#ff6f91', '#ffd23f', '#6ad0ff', '#8ee07a', '#c89aff'][i % 5]);
      }
      const rise = Math.round(Math.max(0, 1 - o / 12) * 20);
      drawPrize(g.prize, 160, 104 + rise, t);
      if (o > 10) {
        E.text(G.RARE_NAME[g.rare] + '  ' + G.t(g.prize.cap.name), 160, 158, { color: rareTextColor(g.rare, t), outline: C.plum, align: 'center', size: 14 });
        E.text(g.prize.label, 160, 178, { color: C.white, outline: C.plum, align: 'center', fit: 280 });
        if (g.prize.refund) E.text(G.t('重複了！退還 {n}G', { n: g.prize.refund }), 160, 196, { color: C.gray, align: 'center' });
        else if (g.prize.isNew) E.text('NEW!', 160, 196, { color: C.mint, outline: C.plum, align: 'center' });
        if (o > 25) E.text(G.t('按 Z 繼續'), 160, 214, { color: C.gray, align: 'center' });
      }
    },
    // the card pack show (see updatePack)
    drawPack() {
      const p = this.pack;
      const t = p.t;
      E.rect(0, 0, E.W, E.H, 'rgba(30,18,40,0.92)');
      E.artShade(0);
      const n = p.list.length;
      const big = n === 1;
      const cw = big ? 76 : 52, ch = big ? 104 : 72;
      const slotX = (i) => (big ? 160 : 160 + (i - 2) * 58) - cw / 2, slotY = big ? 52 : 70;
      // the pack: in, a shake, torn open with light spilling out in the colour of the best card inside
      if (t < 56) {
        const inK = E.ease.outCubic(Math.min(1, t / 20));
        const shake = t > 22 && t < 40 ? Math.sin(t * 1.6) * 2 : 0;
        if (t >= 40) rays(160, 110, 40 + (t - 40) * 5, rareColor(p.best, t), 0.35, t);
        drawPackArt(132 + shake, Math.round(250 - inK * 170), 56, 76, t, t >= 40 ? Math.min(1, (t - 40) / 10) : 0);
        return;
      }
      p.list.forEach((c, i) => {
        // flying out of the pack to its place
        const k = E.ease.outCubic(Math.min(1, (t - 56 - i * 3) / 20));
        if (k <= 0) return;
        const x = E.lerp(160 - cw / 2, slotX(i), k), y = E.lerp(118, slotY, k);
        const turned = c.flip >= 0 ? t - c.flip : -1;
        const r = c.card.rare;
        if (turned < 0 || turned < 6) {
          // face down (or turning away): an SR or better shows its edge glowing before it turns
          const s = turned < 0 ? 1 : 1 - turned / 6;
          const w = Math.max(1, Math.round(cw * s));
          if (turned < 0 && r >= 3 && (t >> 2) % 2) E.panel(Math.round(x + cw / 2 - w / 2) - 2, y - 2, w + 4, ch + 4, rareColor(r, t), rareColor(r, t + 20), {});
          drawCardBack(Math.round(x + cw / 2 - w / 2), y, w, ch, t);
        } else {
          const s = Math.min(1, (turned - 6) / 6);
          const w = Math.max(1, Math.round(cw * s));
          if (turned > 6 && r >= 3) rays(x + cw / 2, y + ch / 2, ch * 0.75, rareColor(r, t), 0.25, t + i * 9);
          drawCard(c.card, Math.round(x + cw / 2 - w / 2), y, w, ch, true, 'pack-' + i);
          if (turned > 12) {
            if (c.isNew) E.text('NEW!', x + cw / 2, y - 12, { color: C.mint, outline: C.plum, align: 'center' });
            E.text(G.RARE_NAME[r], x + cw / 2, y + ch + 2, { color: rareTextColor(r, t), outline: C.plum, align: 'center' });
            if (c.refund) E.text('+' + c.refund + 'G', x + cw / 2, y + ch + 14, { color: C.gold, align: 'center' });
            else if (big) E.text(cardInfo(c.card).name, x + cw / 2, y + ch + 16, { color: C.white, align: 'center', fit: 200 });
          }
        }
      });
      if (p.flash > 0) { E.ctx.globalAlpha = p.flash / 20; E.rect(0, 0, E.W, E.H, '#ffffff'); E.ctx.globalAlpha = 1; }
      // an SSR: her picture swept in on a rainbow band
      if (p.cut) {
        const c = p.cut.card, ct = p.cut.t;
        const k = E.ease.outCubic(Math.min(1, ct / 14));
        E.rect(0, 70, E.W, 100, 'rgba(20,10,30,0.8)');
        for (let i = 0; i < 6; i++) E.rect(0, 70 + i * 17, E.W, 2, rareColor(4, ct + i * 12));
        const x = Math.round(E.lerp(-120, 34, k));
        E.artShade(0.3); // the cards' own pictures sink behind the band
        if (c.kind === 'expr') {
          const pic = UI.portraitFace(c.ref, c.pic, 4.6);
          E.art('pack-cut', pic.src, x, 72, 96, 96, pic.crop, isLocked(c.ref) ? 'grayscale(1) brightness(0.18) contrast(1.4)' : null);
        } else drawCard(c, x + 20, 76, 64, 88, true, 'pack-cut');
        E.text('SSR', 190, 90, { color: rareColor(4, ct), outline: C.plum, scale: 3 });
        E.text(cardInfo(c).name, 190, 128, { color: C.white, outline: C.plum, size: 14, fit: 124 });
        E.text(fxText(c.fx), 190, 148, { color: C.gold, fit: 124 });
        return;
      }
      if (p.next >= n && t > p.nextAt + 10) {
        const refund = p.list.reduce((s, c) => s + c.refund, 0);
        if (refund) E.text(G.t('重複的卡退還了 {n}G', { n: refund }), 160, big ? 192 : 176, { color: C.gold, align: 'center' });
        E.text(G.t('按 Z 繼續'), 160, 214, { color: C.gray, align: 'center' });
      } else if (t > 80) E.text(G.t('Z 翻開'), 160, 214, { color: C.gray, align: 'center' });
    },
  };

  // ------------------------------------------------------------------ cards
  // rarity colours: N sky, R pink, SR gold, SSR a turning rainbow
  const RAINBOW = ['#ff6f91', '#ffb45c', '#ffe14d', '#8ee07a', '#6ad0ff', '#c89aff'];
  function rareColor(r, t) { return r >= 4 ? RAINBOW[Math.floor((t || 0) / 5) % RAINBOW.length] : r === 3 ? '#ffd23f' : r === 2 ? '#ff9fbb' : '#8fd0ff'; }
  function rareTextColor(r, t) { return r >= 4 ? rareColor(4, t) : r === 3 ? C.gold : r === 2 ? C.pink : C.white; }
  // what a card does in the deck, in words
  const FX_TEXT = { coin: '委託金幣 +{n}%', sp: '開場 SP +{n}', time: '時間 +{n} 秒', fire: '火力 +{n}', bombs: '炸彈 +{n}', speed: '速度 +{n}', heart: '愛心 +{n}', kick: '一開始就會踢炸彈', pierce: '火焰貫穿 +{n}', part: '部位破壞傷害 ×{n}' };
  function fxText(fx) { return Object.keys(fx || {}).map((k) => G.t(FX_TEXT[k], { n: fx[k] })).join(G.LANG === 'en' ? ', ' : '、'); }
  // the deck's effects added up (kick if any card kicks, part damage by the best card)
  function deckFx(deck) {
    const out = {};
    for (const c of deck || (SAVE.deck || []).map((id) => G.CARDS.find((x) => x.id === id)).filter(Boolean)) {
      for (const [k, v] of Object.entries(c.fx || {})) out[k] = k === 'part' ? Math.max(out[k] || 1, v) : k === 'kick' ? 1 : (out[k] || 0) + v;
    }
    return out;
  }
  function deckText(deck) { return fxText(deckFx(deck)); }
  G.deckFx = deckFx;
  // one card from the rates (at least minRare), and giving it: a card you had already pays back
  function pickCard(minRare) {
    let rare = 1, acc = 0;
    const roll = Math.random();
    for (const [r, p] of G.CARD_RATES) { acc += p; if (roll < acc) { rare = r; break; } }
    rare = Math.max(rare, minRare || 1);
    return E.pick(G.CARDS.filter((c) => c.rare === rare));
  }
  function giveCard(card) {
    const dup = !!SAVE.cards[card.id];
    SAVE.cards[card.id] = (SAVE.cards[card.id] || 0) + 1;
    if (!dup) return 0;
    const back = G.CARD_REFUND[card.rare] || 10;
    SAVE.coins += back;
    return back;
  }
  // the capsule machine's prize, given at once (so leaving in the middle of the show keeps it)
  function rollCapsule() {
    const total = G.CAPSULES.reduce((s, c) => s + c.w, 0);
    let roll = Math.random() * total, cap = G.CAPSULES[0];
    for (const c of G.CAPSULES) { roll -= c.w; if (roll < 0) { cap = c; break; } }
    const out = { cap, rare: cap.rare, label: '', isNew: false, refund: 0 };
    if (cap.kind === 'coins') { SAVE.coins += cap.n; out.label = '+' + cap.n + 'G'; out.coins = cap.n; }
    else if (cap.kind === 'gift') { const g = E.pick(G.GIFTS); SAVE.gifts[g.id] = (SAVE.gifts[g.id] || 0) + 1; out.gift = g; out.label = G.t('{name}（回房間送給女僕吧）', { name: g.name }); }
    else if (cap.kind === 'food') {
      const opts = G.MENU_FOOD.filter((f) => !SAVE.buffs[f.id]);
      if (opts.length) { const f = E.pick(opts); SAVE.buffs[f.id] = true; out.food = f; out.label = G.t('{name}（下個委託送上）', { name: f.name }); }
      else { SAVE.coins += 150; out.coins = 150; out.label = '+150G'; }
    } else if (cap.kind === 'furniture') {
      const room = getRoom();
      const opts = G.FURNITURE_SHOP.filter((id) => !(G.FURNITURE[id].unique && room.owned[id]));
      if (opts.length) { const id = E.pick(opts); room.owned[id] = (room.owned[id] || 0) + 1; if (G.ROOMAPI) G.ROOMAPI.autoPlace(id); out.furniture = id; out.isNew = true; out.label = G.FURNITURE[id].name; }
      else { SAVE.coins += 300; out.coins = 300; out.label = '+300G'; }
    } else if (cap.kind === 'card') {
      const card = pickCard(2);
      out.card = card;
      out.isNew = !SAVE.cards[card.id];
      out.refund = giveCard(card);
      out.rare = Math.max(cap.rare, card.rare);
      out.label = cardInfo(card).name;
    }
    return out;
  }
  // a pixel disc, row by row (crisp at any size)
  function pixDisc(cx, cy, r, col, from, to) {
    for (let y = -Math.floor(r); y <= Math.floor(r); y++) {
      if (from != null && (y < from || y > to)) continue;
      const hw = Math.floor(Math.sqrt(Math.max(0, r * r - y * y)));
      E.rect(Math.round(cx - hw), Math.round(cy + y), hw * 2 + 1, 1, col);
    }
  }
  // alpha for one drawing, then back
  function alpha(a, fn) {
    const ctx = E.ctx;
    const g = ctx.globalAlpha;
    ctx.globalAlpha = g * a;
    fn();
    ctx.globalAlpha = g;
  }
  // a capsule: a coloured lid lit from the top-left, a clear base with the light gathering in it, and the seam
  // between them; open (0-1) sends the lid up and the base down
  function drawCapsule(cx, cy, r, rare, t, open) {
    const col = rareColor(rare, t);
    const up = open * 26, down = open * 16;
    const ctx = E.ctx;
    const ga = ctx.globalAlpha;
    if (open > 0) ctx.globalAlpha = Math.max(0, 1 - open * 0.8);
    pixDisc(cx, cy - up, r + 1, '#2a1b30', -r - 1, 0);
    pixDisc(cx, cy - up, r, col, -r, 0);
    alpha(0.4, () => pixDisc(cx - r * 0.2, cy - up - r * 0.2, r * 0.8, '#ffffff', -r, -Math.round(r * 0.45)));
    alpha(0.22, () => pixDisc(cx, cy - up, r, '#2a1b30', -Math.max(1, Math.round(r * 0.2)), 0));
    pixDisc(cx, cy + down, r + 1, '#2a1b30', 0, r + 1);
    pixDisc(cx, cy + down, r, '#f4f0fa', 0, r);
    alpha(0.35, () => pixDisc(cx, cy + down, r - 1, '#9fb8d8', Math.round(r * 0.45), r));
    if (r >= 6) {
      pixDisc(cx - r * 0.35, cy - up - r * 0.45, r * 0.22, '#ffffff');
      E.rect(Math.round(cx - r), Math.round(cy - up), Math.round(r * 2) + 1, 1, '#2a1b30');
      E.rect(Math.round(cx - r + 1), Math.round(cy + down + 1), Math.round(r * 2) - 1, 1, '#ffffff');
      E.rect(Math.round(cx - r + 2), Math.round(cy + down + Math.round(r * 0.55)), 2, 1, '#ffffff');
    }
    ctx.globalAlpha = ga;
  }
  // light rays turning round a point
  function rays(cx, cy, len, col, alpha, t) {
    const ctx = E.ctx;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = col;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + t * 0.02, b = a + 0.14;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a) * len, cy + Math.sin(a) * len);
      ctx.lineTo(cx + Math.cos(b) * len, cy + Math.sin(b) * len);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }
  // the capsule machine: a glass dome full of capsules, a chrome ring, a red body with a coin slot, the crank and
  // the chute. crank: which quarter turn the handle is at; rattle: the capsules jostle while it turns
  function drawCapsuleMachine(x, y, t, crank, rattle) {
    const cx = x + 32;
    // the floor under it
    alpha(0.16, () => pixDisc(cx, y + 119, 28, '#2a1b30', -4, 4));
    // dome: glass, the capsules inside, then the glass again over them
    pixDisc(cx, y + 30, 29, '#2a1b30');
    pixDisc(cx, y + 30, 28, '#dff2ff');
    alpha(0.45, () => pixDisc(cx, y + 30, 27, '#9cc8e4', 8, 27));
    const caps = [[-14, 12, 1], [-3, 16, 2], [9, 13, 3], [18, 7, 1], [-19, 2, 2], [-8, 4, 4], [4, 5, 1], [14, -4, 2], [-12, -8, 3], [0, -6, 1], [8, -14, 2], [-4, -18, 1]];
    caps.forEach(([dx, dy, r], i) => {
      const j = rattle ? Math.round(Math.sin(t * 0.9 + i * 1.7) * 2) : 0;
      drawCapsule(cx + dx + j, y + 30 + dy + (rattle ? Math.round(Math.cos(t * 1.1 + i) * 1.5) : 0), 5, r, t + i * 7, 0);
    });
    alpha(0.4, () => { pixDisc(cx - 11, y + 17, 7, '#ffffff'); pixDisc(cx - 16, y + 26, 3, '#ffffff'); });
    alpha(0.28, () => pixDisc(cx, y + 30, 28, '#ffffff', -28, -21));
    // cap on top
    E.rect(cx - 7, y, 14, 4, '#2a1b30'); E.rect(cx - 6, y + 1, 12, 3, '#ff6f91'); E.rect(cx - 6, y + 1, 12, 1, '#ffc0d0');
    // the chrome ring the dome sits in
    E.rect(x, y + 50, 64, 8, '#2a1b30');
    E.rect(x + 1, y + 51, 62, 6, '#b9c0d8');
    E.rect(x + 1, y + 51, 62, 2, '#f2f5ff');
    E.rect(x + 1, y + 56, 62, 1, '#6e7596');
    // body, lit down its left side, with a gold trim and screws
    E.panel(x + 2, y + 56, 60, 60, '#ff5a6a', '#a8102a', { shine: '#ffc8d0' });
    alpha(0.25, () => E.rect(x + 40, y + 60, 21, 54, '#7a0a20'));
    E.rect(x + 4, y + 60, 56, 2, '#ffd23f');
    E.rect(x + 4, y + 62, 56, 1, '#c8860c');
    for (const sx of [x + 6, x + 57]) for (const sy of [y + 66, y + 110]) { E.rect(sx, sy, 2, 2, '#f0f0ff'); E.rect(sx, sy + 1, 2, 1, '#8a86a8'); }
    // coin slot with its price
    E.rect(x + 9, y + 66, 18, 12, '#2a1b30'); E.rect(x + 10, y + 67, 16, 10, '#ffd23f'); E.rect(x + 10, y + 67, 16, 2, '#fff3a0'); E.rect(x + 16, y + 69, 4, 6, '#2a1b30');
    E.text('100', x + 18, y + 80, { color: C.white, align: 'center', small: true });
    // the crank: a gold boss and a handle turned by quarters, a white knob
    pixDisc(x + 46, y + 74, 7, '#2a1b30'); pixDisc(x + 46, y + 74, 6, '#ffd23f'); pixDisc(x + 45, y + 73, 2, '#fff3a0');
    alpha(0.3, () => pixDisc(x + 46, y + 75, 6, '#8a4a00', 2, 6));
    const ang = [[0, -1], [1, 0], [0, 1], [-1, 0]][crank % 4];
    for (let i = 0; i <= 9; i++) E.rect(x + 45 + ang[0] * i, y + 73 + ang[1] * i, 3, 3, i > 7 ? '#ffffff' : '#c8c8dc');
    // chute: a dark mouth with a flap and its shadow
    E.rect(x + 22, y + 96, 20, 16, '#2a1b30');
    E.rect(x + 24, y + 98, 16, 12, '#5a1428');
    E.rect(x + 24, y + 98, 16, 2, '#ff9fbb');
    alpha(0.5, () => E.rect(x + 24, y + 100, 16, 3, '#2a1b30'));
    E.rect(x + 23, y + 106, 18, 4, '#c8c8dc'); E.rect(x + 23, y + 106, 18, 1, '#f2f5ff'); E.rect(x + 23, y + 109, 18, 1, '#6e7596');
  }
  // the card pack: foil with a lace-heart crest and a gold strip that tears off (open 0-1)
  function drawPackArt(x, y, w, h, t, open) {
    const shine = Math.floor(t / 4) % (w + 20);
    const top = Math.round(open * 22);
    E.panel(x, y + 10, w, h - 10, '#ff9fbb', '#a8285a', {});
    E.rect(x + 3, y + 13, w - 6, h - 16, '#ffd0e0');
    for (let i = 0; i < w - 6; i += 6) E.rect(x + 3 + i, y + 13, 3, h - 16, '#ffc0d4');
    // the foil darkens along the bottom and the right, and a highlight sweeps across it
    alpha(0.2, () => { E.rect(x + 3, y + h - 16, w - 6, 13, '#a8285a'); E.rect(x + w - 10, y + 13, 7, h - 16, '#a8285a'); });
    if (shine < w - 6) { E.rect(x + 3 + shine, y + 13, 2, h - 16, '#ffffff'); alpha(0.45, () => E.rect(x + 5 + shine, y + 13, 2, h - 16, '#ffffff')); }
    // the crest: a cream medallion with a gold rim behind the heart
    const mx = Math.round(x + w / 2), my = Math.round(y + h / 2 + 2);
    pixDisc(mx, my, 11, '#a8285a'); pixDisc(mx, my, 10, '#ffd23f'); pixDisc(mx, my, 8, '#fff6e6');
    alpha(0.35, () => pixDisc(mx, my, 8, '#e8b8cc', 3, 8));
    E.ctx.drawImage(E.spr.fx.bigHeart.love, mx - 5, my - 7);
    // the strip: a gold band with a lace edge, torn along a zigzag once it opens
    E.panel(x, y - top, w, 14, '#ffd23f', '#a8285a', {});
    E.rect(x + 4, y + 5 - top, w - 8, 2, '#fff3a0');
    for (let i = 2; i < w - 2; i += 4) E.rect(x + i, y + 12 - top, 2, 1, '#fff6e6');
    if (open > 0) for (let i = 0; i < w; i += 4) { E.rect(x + i, y + 13 - top, 2, 2, '#ffd23f'); E.rect(x + i + 2, y + 13 - top, 2, 1, '#c8860c'); }
    E.text('MAID', x + w / 2, y + h - 22, { color: '#a8285a', align: 'center', small: true });
    E.text('CARDS', x + w / 2, y + h - 14, { color: '#a8285a', align: 'center', small: true });
  }
  // a card face down: pink foil with a lace border and the heart crest
  function drawCardBack(x, y, w, h, t) {
    E.panel(x, y, w, h, '#ff9fbb', '#a8285a', {});
    if (w < 12) return;
    E.rect(x + 3, y + 3, w - 6, h - 6, '#ffc0d4');
    // a woven diagonal in the field, darker toward the bottom right
    for (let i = -h; i < w; i += 5) for (let j = 0; j < h - 6; j++) { const px = x + 3 + i + j; if (px >= x + 3 && px < x + w - 3) E.rect(px, y + 3 + j, 1, 1, '#ffd0e0'); }
    alpha(0.18, () => E.rect(x + Math.round(w * 0.55), y + 3, Math.round(w * 0.45) - 3, h - 6, '#a8285a'));
    // lace: scallops down both sides and a run of dots top and bottom
    for (let i = 4; i < h - 4; i += 5) { E.rect(x + 3, y + i, 2, 2, '#ffffff'); E.rect(x + w - 5, y + i, 2, 2, '#ffffff'); }
    for (let i = 5; i < w - 5; i += 5) { E.rect(x + i, y + 3, 2, 1, '#ffffff'); E.rect(x + i, y + h - 4, 2, 1, '#fff0f6'); }
    // the crest
    const mx = Math.round(x + w / 2), my = Math.round(y + h / 2);
    if (w >= 30) { pixDisc(mx, my, 9, '#a8285a'); pixDisc(mx, my, 8, '#ffe6ef'); alpha(0.3, () => pixDisc(mx, my, 8, '#c88aa0', 3, 8)); }
    E.ctx.drawImage(E.spr.fx.bigHeart.like, mx - 5, my - 5);
  }
  // what came out of a capsule, big
  function drawPrize(p, cx, cy, t) {
    const ctx = E.ctx;
    if (p.card) { drawCard(p.card, cx - 30, cy - 40, 60, 80, true, 'capsule-card'); return; }
    const put = (img, s) => ctx.drawImage(img, Math.round(cx - (img.width * s) / 2), Math.round(cy - (img.height * s) / 2), img.width * s, img.height * s);
    if (p.furniture) { const img = E.spr.room.furniture[p.furniture]; put(img, img.height > 40 ? 1 : 2); return; }
    if (p.gift) { put(E.spr.room.gifts[p.gift.id], 3); return; }
    if (p.food) { put(E.spr.items[p.food.icon], 3); return; }
    // coins: a little pile that grows with the amount
    const n = p.coins >= 1000 ? 9 : p.coins >= 200 ? 5 : 2;
    for (let i = 0; i < n; i++) ctx.drawImage(E.spr.items.coin[((t >> 2) + i) % 4], Math.round(cx - 8 + ((i % 3) - 1) * 14), Math.round(cy - 8 - Math.floor(i / 3) * 10 + (i % 2) * 3));
  }
  function cardInfo(card) {
    if (card.kind === 'expr') {
      if (isLocked(card.ref)) return { name: '？？？', desc: G.t('還沒加入的神秘女僕。') };
      return { name: G.MAID_DATA[card.ref].name + (G.LANG === 'en' ? ': ' : '・') + card.label, desc: G.t('{name}的表情卡。', { name: G.MAID_DATA[card.ref].name }) };
    }
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
    const rim = card.rare >= 4 ? rareColor(4, E.frame) : card.rare === 3 ? ['#ffd23f', '#ff9fbb', '#8fc6ff', '#b8f28a'][(E.frame >> 4) % 4] : card.rare === 2 ? C.gold : '#c6c0d8';
    E.panel(x, y, w, h, faceUp ? '#fff' : C.panel, rim, {});
    if (!faceUp || w < 30) return;
    const inner = card.kind === 'maid' || card.kind === 'expr' ? '#ffe0ea' : card.kind === 'monster' ? '#e6f4ff' : '#fff6cc';
    E.rect(x + 4, y + 4, w - 8, h - 22, inner);
    const cx = x + w / 2, cy = y + (h - 18) / 2;
    const big = h > 80;
    if (card.kind === 'expr') {
      // her expression picture, the face and shoulders (big cards show a little more of her)
      const pic = UI.portraitFace(card.ref, card.pic, big ? 5.4 : 4.2);
      E.art('card-' + slot, pic.src, x + 4, y + 4, w - 8, h - 22, pic.crop, isLocked(card.ref) ? 'grayscale(1) brightness(0.18) contrast(1.4)' : null);
      if (card.rare >= 4 && (E.frame >> 3) % 4 === 0) ctx.drawImage(E.spr.fx.sparkle[(E.frame >> 2) % 3], x + 4 + ((E.frame * 7) % Math.max(1, w - 12)), y + 6 + ((E.frame * 3) % Math.max(1, h - 30)));
    } else if (card.kind === 'maid') {
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
    const gap = w < 40 ? 5 : 7;
    for (let i = 0; i < stars; i++) ctx.drawImage(E.spr.fx.star[0], Math.round(cx - stars * gap / 2 + i * gap), y + h - 14);
  }

  SC.album = {
    enter(arg) { this.t = 0; this.sel = 0; this.back = (arg && arg.back) || SC.title; this.backArg = (arg && arg.backArg) || undefined; this.msg = ''; this.msgT = 0; SAVE.deck = SAVE.deck || []; },
    update() {
      this.t++;
      if (this.msgT > 0) this.msgT--;
      const d = E.menuDir();
      const n = G.CARDS.length, cols = 9;
      if (d === 'left') { this.sel = (this.sel + n - 1) % n; A.sfx('select'); }
      if (d === 'right') { this.sel = (this.sel + 1) % n; A.sfx('select'); }
      if (d === 'up') { this.sel = (this.sel + n - cols) % n; A.sfx('select'); }
      if (d === 'down') { this.sel = (this.sel + cols) % n; A.sfx('select'); }
      // Z puts the card in the deck or takes it out (three at most)
      if (E.menuPressed('a')) {
        const card = G.CARDS[this.sel];
        const deck = SAVE.deck;
        const at = deck.indexOf(card.id);
        if (!SAVE.cards[card.id]) { A.sfx('denied'); this.say(G.t('還沒有抽到這張卡。')); }
        else if (at >= 0) { deck.splice(at, 1); A.sfx('cancel'); this.say(G.t('從牌組拿出來了。')); persist(); }
        else if (deck.length >= G.DECK_SIZE) { A.sfx('denied'); this.say(G.t('牌組最多放 {n} 張。', { n: G.DECK_SIZE })); }
        else { deck.push(card.id); A.sfx('confirm'); this.say(G.t('放進牌組了！')); persist(); }
      }
      if (E.menuPressed('b') || E.menuPressed('start')) { A.sfx('cancel'); E.go(this.back, this.backArg); }
    },
    say(text) { this.msg = text; this.msgT = 90; },
    draw() {
      bg(this.t);
      const owned = G.CARDS.filter((c) => SAVE.cards[c.id]).length;
      const per = 18, page = Math.floor(this.sel / per), pages = Math.ceil(G.CARDS.length / per);
      header(G.t('卡片圖鑑'), owned + ' / ' + G.CARDS.length + '　' + (page + 1) + '/' + pages);
      const deck = SAVE.deck || [];
      G.CARDS.slice(page * per, page * per + per).forEach((card, j) => {
        const i = page * per + j;
        const col = j % 9, row = (j / 9) | 0;
        const x = 9 + col * 34, y = 26 + row * 58;
        const has = !!SAVE.cards[card.id];
        drawCard(card, x, y, 31, 52, has, 'album-' + j);
        if (!has) E.text('?', x + 15, y + 22, { color: C.gray, align: 'center' });
        if (deck.includes(card.id)) { E.rect(x + 20, y - 3, 13, 9, C.red); E.text('★', x + 26, y - 4, { color: C.gold, align: 'center', small: true }); }
        if (i === this.sel) { E.ctx.strokeStyle = C.red; E.ctx.lineWidth = 2; E.ctx.strokeRect(x - 1, y - 1, 33, 54); }
      });
      const card = G.CARDS[this.sel];
      const has = SAVE.cards[card.id];
      darkPanel(8, 144, 304, 78);
      if (has) {
        drawCard(card, 16, 150, 50, 66, true, 'album-detail');
        const info = cardInfo(card);
        E.text(G.RARE_NAME[card.rare] + '  ' + info.name, 76, 147, { color: rareTextColor(card.rare, this.t), size: 14, fit: 230 });
        E.text(info.desc, 76, 164, { color: C.paper, fit: 230 });
        E.text(G.t('效果') + '：' + fxText(card.fx), 76, 178, { color: C.gold, fit: 230 });
        E.text(G.t('持有 ×{n}', { n: has }) + (deck.includes(card.id) ? '　' + G.t('牌組中') : ''), 76, 192, { color: C.gray });
      } else {
        E.text(G.t('還沒有抽到這張卡。'), 160, 162, { color: C.gray, align: 'center' });
        E.text(G.t('到咖啡廳的「抽卡片」試試手氣吧！'), 160, 180, { color: C.gray, align: 'center' });
      }
      // the deck: how many cards and their effects added up
      const deckCards = deck.map((id) => G.CARDS.find((c) => c.id === id)).filter(Boolean);
      marquee(G.t('牌組') + ' ' + deckCards.length + '/' + G.DECK_SIZE + '：' + (deckCards.length ? deckText(deckCards) : G.t('（空）')), 76, 206, 232, C.pink, true);
      if (this.msgT > 0) { E.rect(60, 118, 200, 20, C.plum); E.text(this.msg, 160, 122, { color: C.mint, align: 'center', fit: 190 }); }
      hint(G.t('方向鍵 選擇　Z 放入／取出牌組　X 返回'));
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
      if (buffs.charm) { if (pk.guard) st.hearts++; else pk.guard = true; }
      st.hearts += pk.heartBonus;
      // the deck: up to three cards, each adding its effect to every job
      const fx = deckFx();
      st.fire += fx.fire || 0; st.bombs += fx.bombs || 0; st.speed += fx.speed || 0; st.hearts += fx.heart || 0;
      this.cardFx = fx;
      const sp = buffs.tea ? 100 : Math.min(100, 30 + pk.spStart + (fx.sp || 0));
      this.perks = pk;
      this.usedBuffs = Object.keys(buffs).filter((k) => buffs[k]);
      SAVE.buffs = {};
      persist();
      this.world = new G.World({
        mode: 'story', stage: def, theme: def.theme, layout: def.layout, decor: def.decor, soft: def.soft, items: def.items,
        enemies: def.enemies, dust: def.dust, time: def.time + (fx.time || 0), boss: def.boss || null, partMul: fx.part || 1,
        players: [{ maid: SAVE.maid, human: true, pad: 0, stats: st, sp, perks: pk, kick: !!fx.kick, pierce: fx.pierce || 0 }],
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
        // its health, and a mark for each part: gold while it holds, a grey cross once it is broken off
        const parts = w.boss.parts || [];
        const barW = 222 - nameW - parts.length * 9;
        E.bar(12 + nameW, 228, barW, 8, w.boss.hp / w.boss.maxHp, w.boss.hitT > 0 && (E.frame >> 2) % 2 ? C.white : C.red);
        parts.forEach((p, i) => {
          const px = 16 + nameW + barW + i * 9;
          E.rect(px, 227, 8, 10, '#000000');
          if (p.broken) { E.rect(px + 1, 228, 6, 8, '#5a4a6e'); E.rect(px + 2, 229, 1, 1, '#ffffff'); E.rect(px + 5, 229, 1, 1, '#ffffff'); E.rect(px + 3, 231, 2, 2, '#ffffff'); E.rect(px + 2, 234, 1, 1, '#ffffff'); E.rect(px + 5, 234, 1, 1, '#ffffff'); }
          else { E.rect(px + 1, 228, 6, 8, p.hitT > 0 && (E.frame >> 2) % 2 ? '#ffffff' : '#e0a014'); E.rect(px + 1, 236 - Math.ceil(8 * p.hp / p.max), 6, Math.ceil(8 * p.hp / p.max), '#ffd23f'); }
        });
      } else marquee(G.t(this.tip), 4, 226, 232, C.gray);
      drawStoryPanel(w);
      drawCutin(w, 240);

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
      // her victory motion stays in front of the banner, wherever she stands
      if (w.state === 'clear' && w.maids[0].alive) w.drawMaid(w.maids[0], 0, 16, true);
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

  // A special skill flashes her face across the middle of the field for a moment: a band in her colours with sliding
  // stripes and speed lines, her CG face coming in from the left and the skill's name from the right. It never pauses play.
  const CUTIN_COL = { berry: ['#ff8aa8', '#e2402a'], honey: ['#ffe070', '#e0a010'], yukino: ['#8fd8ff', '#3d86f0'], yoru: ['#a88ad8', '#3a2458'] };
  function drawCutin(w, fieldW) {
    const c = w.cutins && w.cutins[0];
    if (!c) return;
    const ctx = E.ctx;
    const t = c.t, dur = G.CUTIN_FRAMES;
    const open = t < 6 ? t / 6 : t > dur - 6 ? Math.max(0, (dur - t) / 6) : 1;
    const h = Math.round(32 * open);
    if (h < 2) return;
    // the band sits in the half of the field away from her, so it never hides her or what her skill does
    const who = w.maids[c.slot];
    const y = (who && who.y + 8 < 104 ? 176 : 48) - (h >> 1);
    const [light, deep] = CUTIN_COL[c.key] || ['#ffc8e0', '#c86a90'];
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, y, fieldW, h);
    ctx.clip();
    E.rect(0, y, fieldW, h, deep);
    ctx.fillStyle = light;
    for (let i = -3; i < fieldW / 14 + 3; i++) {
      const x = i * 14 - ((t * 3) % 14);
      ctx.beginPath();
      ctx.moveTo(x, y + h); ctx.lineTo(x + 6, y + h); ctx.lineTo(x + 6 + h * 0.6, y); ctx.lineTo(x + h * 0.6, y);
      ctx.fill();
    }
    for (let i = 0; i < 7; i++) {
      const ly = y + 3 + ((i * 11 + t * 2) % Math.max(1, h - 6));
      const lx = fieldW - ((t * 11 + i * 47) % (fieldW + 60));
      E.rect(lx, ly, 18 + (i % 3) * 10, 1, 'rgba(255,255,255,0.75)');
    }
    ctx.restore();
    E.rect(0, y, fieldW, 1, '#ffffff');
    E.rect(0, y + h - 1, fieldW, 1, '#ffffff');
    if (h >= 24) {
      const fx = Math.round(Math.min(10, -70 + t * 16) + Math.max(0, t - 6) * 0.3);
      // her face as she lets it loose (her skill picture: Berry blazing, Yoru grim, Honey beaming, Yukino sure of herself)
      const f = portraitFace(c.key, feelPic(c.key, 'skill'), 3.4);
      E.art('cutin-face', f.src, fx, y + 1, 68, h - 2, f.crop);
      const tx = Math.round(Math.max(fieldW - 10, fieldW + 140 - t * 34));
      E.text(G.MAID_DATA[c.key].skill, tx, y + (h >> 1) - 8, { color: '#ffffff', outline: '#2a1b30', align: 'right', size: 14 });
    }
  }

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
    // what she has picked up (kick, pierce with its level, line bomb), and a curse with the time it has left
    let ax = x0 + 5;
    const ability = (icon, label) => { ctx.drawImage(E.spr.ui[icon], ax, 178); if (label) E.text(label, ax + 8, 177, { color: C.text, small: true }); ax += label ? 15 : 10; };
    if (m.kick) ability('kick');
    if (m.pierce > 0) ability('pierce', String(m.pierce));
    if (m.line) ability('line');
    if (m.glove) ability('glove');
    if (m.curse) { ability('skull'); E.bar(ax, 179, x0 + 75 - ax, 5, m.curse.t / 600, (E.frame >> 3) % 2 ? '#b08ae0' : '#6a4a9e'); }
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
      const partCoins = w.stats.partCoins || 0, comboCoins = w.stats.comboCoins || 0;
      this.rows = [
        [G.t('委託報酬'), def.reward],
        [G.t('打倒怪物 ×{n}', { n: w.stats.kills }), killCoins],
        [G.t('撿到的金幣'), Math.max(0, w.stats.coins - killCoins - partCoins - comboCoins)],
        [G.t('打掃度 {n}%', { n: Math.round(clean * 100) }), null],
        [G.t('剩餘時間 {n}秒', { n: Math.ceil(Math.max(0, w.timeLeft) / 60) }), null],
        [G.t('受傷次數 {n}', { n: w.stats.hits }), null],
      ];
      // the extra coin rows go after the pickups, in the order they were earned: parts, chains and combos, then the cards
      const fx = deckFx();
      this.cardBonus = fx.coin ? Math.round((def.reward + w.stats.coins) * fx.coin / 100) : 0;
      const extra = [];
      if (w.stats.parts) extra.push([G.t('部位破壞 ×{n}', { n: w.stats.parts }), partCoins]);
      if (comboCoins) extra.push([G.t('連鎖・連擊獎勵'), comboCoins]);
      if (this.cardBonus) extra.push([G.t('卡片加成 +{n}%', { n: fx.coin }), this.cardBonus]);
      this.rows.splice(3, 0, ...extra);
      const pk = perks(SAVE.maid);
      this.bonus = Math.round(def.reward * (mult * pk.rewardMul - 1));
      this.total = def.reward + w.stats.coins + this.bonus + this.cardBonus;
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
      // more than six rows: they close up, and pale stripes take the place of the rules between them
      const step = this.rows.length > 6 ? Math.floor(114 / this.rows.length) : 19;
      const tight = step < 16;
      this.rows.forEach(([label, val], i) => {
        if (this.t < 10 + i * 12) return;
        const y = 33 + i * step;
        if (tight && i % 2 === 0) E.rect(24, y - 2, 180, step, '#ffeef3');
        E.text(label, 28, y, { color: C.ink, fit: val != null ? 120 : 170 });
        if (val != null) coinLabel(200, y + (tight ? 1 : 2), val, 'right');
        if (!tight) E.rect(28, y + step - 4, 172, 1, C.paper2);
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
      const rf = portraitFace(m, this.t > 100 ? feelPic(m, RANK_FEEL[this.rank]) : 'normal', 4.4);
      E.art('result-portrait', rf.src, 233, 134 - hop, 66, 70, rf.crop);
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
      // her crying picture, sooty when the blast got her, with dizzy stars circling just above her head
      const face = portraitFace(SAVE.maid, feelPic(SAVE.maid, 'sad'), 4.6);
      const sob = Math.round(Math.sin(this.t * 0.09) * 1.5);
      for (let i = 0; i < 3; i++) {
        const a = this.t * 0.1 + (i * Math.PI * 2) / 3;
        E.ctx.drawImage(E.spr.fx.star[(this.t >> 3) % 2], Math.round(157 + Math.cos(a) * 26), Math.round(96 + Math.sin(a) * 4));
      }
      E.art('gameover-portrait', face.src, 118, 96 + sob, 84, 72, face.crop, this.reason === 'time' ? null : 'sepia(0.5) brightness(0.5) contrast(1.3)', { fadeBottom: [0.62, 1] });
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
      drawCutin(w, 240);
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
      for (let i = 0; i < 24; i++) {
        const x = (i * 37 + t * (1 + (i % 3))) % 320, y = (i * 29 + t * 1.5) % 240;
        E.rect(x, y, 3, 3, [C.red, C.gold, C.sky, C.mint, C.pink][i % 5]);
      }
      // the champion in her own picture (her joyful one), rising into a soft light and bobbing a little; her words beside her
      const ctx = E.ctx;
      const glow = ctx.createRadialGradient(118, 158, 6, 118, 158, 86);
      glow.addColorStop(0, 'rgba(255,244,210,0.75)');
      glow.addColorStop(1, 'rgba(255,244,210,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(30, 80, 180, 160);
      const pic = G.UI.portraitPicture(p.maid, feelPic(p.maid, 'win'));
      const ph = 128, pw = Math.round((ph * pic.w) / pic.h);
      const rise = Math.max(0, 24 - t);
      const bob = Math.round(Math.sin(t * 0.08) * 2);
      E.art('champion', pic.src, Math.round(118 - pw / 2), 100 + rise + bob, pw, ph, [0, 0, pic.w, pic.h, pic.w, pic.h], null, { fadeBottom: [0.82, 1], opacity: Math.min(1, t / 16) });
      const quote = E.wrap(G.t('「{line}」', { line: D.line }), 118);
      const qh = quote.length * 14 + 8, qy = 128 - (qh >> 1) + 20;
      E.panel(184, qy, 128, qh, '#ffffff', D.color || C.plum, {});
      E.rect(181, qy + 10, 4, 4, '#ffffff'); E.rect(180, qy + 11, 1, 2, D.color || C.plum);
      quote.forEach((l, i) => E.text(l, 190, qy + 4 + i * 14, { color: C.ink }));
      if (t > 90) hint(G.t('Z 回到對決設定'));
    },
  };
})(window);
