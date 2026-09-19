/* 炸彈女僕 BOMB MAIDS — world simulation + field rendering */
(function (G) {
  'use strict';
  const E = G.E;

  const T = 16, COLS = 15, ROWS = 13;
  const FX = 0, FY = 16;
  const FLOOR = 0, HARD = 1, SOFT = 2, WALL = 3, BURN = 4, DECOR = 5;
  const DIRS = ['up', 'right', 'down', 'left'];
  const DV = { up: [0, -1], right: [1, 0], down: [0, 1], left: [-1, 0] };
  const BIT = { up: 1, right: 2, down: 4, left: 8 };
  const OPP = { up: 'down', down: 'up', left: 'right', right: 'left' };
  const FLAME_DUR = 34, FLAME_HOT = 28;
  const idx = (c, r) => r * COLS + c;
  const inb = (c, r) => c >= 0 && r >= 0 && c < COLS && r < ROWS;
  const cellOf = (a) => [Math.floor((a.x + 8) / T), Math.floor((a.y + 8) / T)];
  const sfx = (n) => E.audio.sfx(n);

  function speedPx(lv) { return 1.0 + lv * 0.2; }
  // a crisp one-pixel circle (midpoint algorithm) for skill rings, so effects stay on the pixel grid
  function pixelRing(cx, cy, rad, col) {
    let x = Math.round(rad), y = 0, err = 1 - x;
    const X = Math.round(cx), Y = Math.round(cy);
    while (x >= y) {
      for (const [px, py] of [[x, y], [y, x], [-y, x], [-x, y], [-x, -y], [-y, -x], [y, -x], [x, -y]]) E.rect(X + px, Y + py, 1, 1, col);
      y++;
      if (err < 0) err += 2 * y + 1;
      else { x--; err += 2 * (y - x) + 1; }
    }
  }

  const CUTIN_FRAMES = 36;
  G.CUTIN_FRAMES = CUTIN_FRAMES;

  class World {
    constructor(cfg) {
      this.cfg = cfg;
      this.mode = cfg.mode; // 'story' | 'battle'
      this.stage = cfg.stage || null;
      this.themeKey = cfg.theme;
      this.grid = new Uint8Array(COLS * ROWS);
      this.variant = new Uint8Array(COLS * ROWS);
      this.hidden = new Array(COLS * ROWS).fill(null);
      this.items = new Array(COLS * ROWS).fill(null);
      this.bombAt = new Array(COLS * ROWS).fill(null);
      this.flames = new Array(COLS * ROWS).fill(null);
      this.bombs = [];
      this.burning = [];
      this.decor = [];
      this.maids = [];
      this.enemies = [];
      this.boss = null;
      this.missiles = [];
      this.fireballs = [];
      this.particles = [];
      this.floaters = [];
      this.cutins = []; // skill cut-ins: { key, slot, t }, drawn by the scene over the field
      this.falling = [];
      this.frame = 0;
      this.state = 'ready';
      this.stateT = 0;
      this.shake = 0;
      this.freezeT = 0;
      this.stats = { dustTotal: 0, dustSwept: 0, coins: 0, kills: 0, hits: 0, killCoins: 0 };
      this.timeLeft = (cfg.time || 180) * 60;
      this.sudden = null;
      this.dangerCache = { frame: -1, map: null };
      this.build();
    }

    // ---------------------------------------------------------------- stage generation
    build() {
      const layout = this.cfg.layout || 'classic';
      const g = this.grid;
      for (let r = 0; r < ROWS; r++)
        for (let c = 0; c < COLS; c++) {
          const border = r === 0 || c === 0 || r === ROWS - 1 || c === COLS - 1;
          g[idx(c, r)] = border ? WALL : FLOOR;
        }
      const setHard = (c, r) => { if (inb(c, r) && g[idx(c, r)] !== WALL) g[idx(c, r)] = HARD; };
      const map = G.LAYOUTS && G.LAYOUTS[layout];
      const noCrate = new Set();
      if (map) {
        map.rows.forEach((row, j) => {
          for (let i = 0; i < row.length; i++) {
            const k = idx(i + 1, j + 1);
            const ch = row[i];
            if (ch === 'H') g[k] = HARD;
            else if (ch === 'T') { g[k] = HARD; this.variant[k] = 1; }
            else if (ch === 'D') g[k] = DECOR;
            else if (ch === '_') noCrate.add(k);
          }
        });
        for (const d of map.decor || []) this.decor.push({ kind: d.kind, c: d.c, r: d.r, w: d.w || 3, h: d.h || 3 });
      } else if (layout === 'boss') {
        for (const [c, r] of [[3, 3], [11, 3], [3, 9], [11, 9], [7, 5], [5, 7], [9, 7]]) setHard(c, r);
      } else {
        for (let r = 2; r < ROWS - 1; r += 2) for (let c = 2; c < COLS - 1; c += 2) setHard(c, r);
        if (layout === 'plaza') {
          for (let r = 4; r <= 8; r++) for (let c = 5; c <= 9; c++) g[idx(c, r)] = FLOOR;
          for (let r = 5; r <= 7; r++) for (let c = 6; c <= 8; c++) g[idx(c, r)] = DECOR;
          this.decor.push({ c: 6, r: 5, kind: this.cfg.decor || 'treehouse' });
        } else if (layout === 'lanes') {
          for (const [c, r] of [[4, 3], [10, 3], [4, 9], [10, 9], [7, 5], [7, 7]]) setHard(c, r);
        }
      }

      // starts
      const starts = this.mode === 'battle' ? [[1, 1], [13, 11], [13, 1], [1, 11]] : [[1, 1]];
      this.starts = starts;
      const safe = new Set();
      for (const [c, r] of starts) {
        for (const [dc, dr] of [[0, 0], [1, 0], [0, 1], [-1, 0], [0, -1], [2, 0], [0, 2], [-2, 0], [0, -2]]) safe.add(idx(c + dc, r + dr));
      }
      if (layout === 'plaza') for (let r = 4; r <= 8; r++) for (let c = 5; c <= 9; c++) if (g[idx(c, r)] === FLOOR && (r === 4 || r === 8 || c === 5 || c === 9)) safe.add(idx(c, r));

      const density = this.cfg.soft == null ? 0.6 : this.cfg.soft;
      const softCells = [];
      for (let r = 1; r < ROWS - 1; r++)
        for (let c = 1; c < COLS - 1; c++) {
          const k = idx(c, r);
          if (g[k] !== FLOOR || safe.has(k) || noCrate.has(k)) continue;
          if (Math.random() < density) {
            g[k] = SOFT;
            this.variant[k] = E.randi(0, 2);
            softCells.push(k);
          }
        }

      // hidden items
      E.shuffle(softCells);
      let si = 0;
      const items = this.cfg.items || {};
      for (const type of Object.keys(items)) for (let n = 0; n < items[type] && si < softCells.length; n++) this.hidden[softCells[si++]] = type;
      if (this.mode === 'battle') {
        for (; si < softCells.length; si++) {
          const roll = Math.random();
          if (roll < 0.14) this.hidden[softCells[si]] = 'bomb';
          else if (roll < 0.28) this.hidden[softCells[si]] = 'fire';
          else if (roll < 0.36) this.hidden[softCells[si]] = 'speed';
          else if (roll < 0.39) this.hidden[softCells[si]] = 'tea';
        }
      }
      this.softLeft = softCells.length;

      // enemies
      const far = [];
      for (let r = 1; r < ROWS - 1; r++)
        for (let c = 1; c < COLS - 1; c++) {
          const k = idx(c, r);
          if (g[k] === HARD || g[k] === WALL || g[k] === DECOR) continue;
          if (Math.abs(c - starts[0][0]) + Math.abs(r - starts[0][1]) < 7) continue;
          far.push([c, r]);
        }
      E.shuffle(far);
      const enemies = this.cfg.enemies || {};
      let fi = 0;
      for (const type of Object.keys(enemies)) {
        for (let n = 0; n < enemies[type]; n++) {
          // prefer open cells; clear a soft block if needed
          let spot = null;
          for (let j = fi; j < far.length; j++) {
            const [c, r] = far[j];
            if (g[idx(c, r)] === FLOOR) { spot = far[j]; far.splice(j, 1); break; }
          }
          if (!spot && far.length) {
            spot = far.shift();
            const k = idx(spot[0], spot[1]);
            if (g[k] === SOFT) { g[k] = FLOOR; this.hidden[k] = null; }
          }
          if (spot) this.spawnEnemy(type, spot[0], spot[1]);
        }
      }

      // dust piles
      const empties = [];
      for (let r = 1; r < ROWS - 1; r++)
        for (let c = 1; c < COLS - 1; c++) {
          const k = idx(c, r);
          if (g[k] === FLOOR && !safe.has(k)) empties.push(k);
        }
      E.shuffle(empties);
      for (let n = 0; n < (this.cfg.dust || 0) && n < empties.length; n++) {
        this.items[empties[n]] = { type: 'dust', age: 999 };
        this.stats.dustTotal++;
      }

      // maids
      (this.cfg.players || []).forEach((p, i) => this.addMaid(p, starts[i % starts.length]));

      if (this.cfg.boss) this.spawnBoss();
    }

    addMaid(p, start) {
      const D = G.MAID_DATA[p.maid];
      const st = p.stats || D.stats;
      const m = {
        kind: 'maid', slot: this.maids.length, maidKey: p.maid, outfit: p.outfit || null, human: !!p.human, pad: p.pad || 0,
        x: start[0] * T, y: start[1] * T, dir: 'down', moving: false, walkT: 0, dirStack: [],
        speedLv: st.speed, bombs: st.bombs, fire: st.fire, maxHearts: st.hearts, hearts: p.hearts || st.hearts,
        sp: p.sp || 0, active: 0, inv: 90, star: 0, burnT: 0, stun: 0, alive: true, deadT: 0,
        // passives: Berry kicks bombs she walks into, Yoru's flames pierce crates, Honey carries a sugar shield,
        // Yukino's blasts chill whatever stands next to them (and her fuses run long for remote play)
        kick: p.maid === 'berry', remote: p.maid === 'yukino', fuse: p.maid === 'yukino' ? 190 : 150,
        pierce: p.maid === 'yoru' ? G.SKILL.pierce : 0, frost: p.maid === 'yukino',
        shield: 0, shieldCD: 0, chill: 0,
        cool: 0, slashT: 0, magicT: 0, kickT: 0, remoteT: 0, skillCost: D.cost, name: D.name, color: D.color,
        perks: p.perks || {},
      };
      m.skillCost = Math.round(D.cost * (m.perks.skillCostMul || 1));
      // Honey starts with her shield up (in battle rounds only if the tuning says so, otherwise it grows in first)
      if (p.maid === 'honey') {
        if (this.mode !== 'battle' || G.SKILL.shieldStartBattle) m.shield = 1;
        else m.shieldCD = G.SKILL.shieldRechargeBattle;
      }
      m.guard = !!m.perks.guard;
      if (!m.human) m.ai = new BomberAI(this, m, p.level || 1);
      this.maids.push(m);
      return m;
    }

    spawnEnemy(type, c, r) {
      const D = G.ENEMY_DATA[type];
      const e = {
        kind: 'enemy', type, x: c * T, y: r * T, tx: c, ty: r, dir: E.pick(DIRS), speed: D.speed, hp: D.hp, ai: D.ai,
        ghost: D.ai === 'ghost', wait: E.randi(0, 40), animT: E.randi(0, 30), hitT: 0, charm: 0, alive: true, deadT: 0, spawnT: 0,
      };
      this.enemies.push(e);
      return e;
    }

    spawnBoss() {
      // three bosses: 'drill' (BOSS1), 'spider' (BOSS2), 'bear' (BOSS3)
      const kind = typeof this.cfg.boss === 'string' ? this.cfg.boss : 'bear';
      const hp = { drill: 8, spider: 10, bear: 12 }[kind] || 12;
      this.boss = {
        kind, x: 7.5 * T, y: 3.5 * T, hp, maxHp: hp, state: 'intro', t: 0, hitT: 0, vx: 0, vy: 0,
        goalX: 7.5 * T, goalY: 4 * T, targets: [], deadT: 0, summonCD: 3, alive: true, dashDir: null, dashes: 0, volleys: 0,
      };
    }

    // ---------------------------------------------------------------- queries
    isSolidCell(k) {
      const v = this.grid[k];
      return v !== FLOOR;
    }
    blockedFor(a, c, r) {
      if (!inb(c, r)) return true;
      const k = idx(c, r);
      if (this.grid[k] !== FLOOR) return true;
      const b = this.bombAt[k];
      if (b && !b.passers.has(a)) return true;
      return false;
    }
    overlapsTile(a, c, r) {
      return a.x < c * T + T - 0.5 && a.x + T > c * T + 0.5 && a.y < r * T + T - 0.5 && a.y + T > r * T + 0.5;
    }
    aliveMaids() { return this.maids.filter((m) => m.alive); }
    enemiesLeft() { return this.enemies.filter((e) => e.alive).length + (this.boss && this.boss.alive ? 1 : 0); }

    // ---------------------------------------------------------------- movement (maids)
    stepAxis(a, dx, dy, dist) {
      if (dx !== 0) {
        const r = Math.round(a.y / T);
        let nx = a.x + dx * dist;
        if (dx > 0) {
          const edgeNow = Math.ceil((a.x + T) / T - 1e-6) - 1;
          const edgeNew = Math.ceil((nx + T) / T - 1e-6) - 1;
          for (let c = edgeNow + 1; c <= edgeNew; c++) if (this.blockedFor(a, c, r)) { nx = c * T - T; break; }
        } else {
          const edgeNow = Math.floor(a.x / T + 1e-6);
          const edgeNew = Math.floor(nx / T + 1e-6);
          for (let c = edgeNow - 1; c >= edgeNew; c--) if (this.blockedFor(a, c, r)) { nx = (c + 1) * T; break; }
        }
        const moved = Math.abs(nx - a.x) > 1e-3;
        a.x = nx;
        return moved;
      }
      const c = Math.round(a.x / T);
      let ny = a.y + dy * dist;
      if (dy > 0) {
        const edgeNow = Math.ceil((a.y + T) / T - 1e-6) - 1;
        const edgeNew = Math.ceil((ny + T) / T - 1e-6) - 1;
        for (let r = edgeNow + 1; r <= edgeNew; r++) if (this.blockedFor(a, c, r)) { ny = r * T - T; break; }
      } else {
        const edgeNow = Math.floor(a.y / T + 1e-6);
        const edgeNew = Math.floor(ny / T + 1e-6);
        for (let r = edgeNow - 1; r >= edgeNew; r--) if (this.blockedFor(a, c, r)) { ny = (r + 1) * T; break; }
      }
      const moved = Math.abs(ny - a.y) > 1e-3;
      a.y = ny;
      return moved;
    }

    // Grid movement with corner assist. Invariant: a maid is off-grid on at most one axis.
    moveMaid(m, dir) {
      const speed = speedPx(m.speedLv) * (m.chill > 0 ? G.SKILL.chillSpeed : 1);
      const [dx, dy] = DV[dir];
      const horiz = dx !== 0;
      const perp = horiz ? m.y : m.x;
      const lane = Math.round(perp / T);
      const off = perp - lane * T;
      if (Math.abs(off) < 0.01) {
        if (horiz) m.y = lane * T; else m.x = lane * T;
        const moved = this.stepAxis(m, dx, dy, speed);
        if (!moved && m.kick && this.state === 'play') this.tryKick(m, dir, false);
        return moved;
      }
      // off-grid across the movement axis, so the forward axis is on-grid
      const fwd = horiz ? Math.round(m.x / T) : Math.round(m.y / T);
      if (horiz) m.x = fwd * T; else m.y = fwd * T;
      const aheadC = horiz ? fwd + dx : lane, aheadR = horiz ? lane : fwd + dy;
      if (!this.blockedFor(m, aheadC, aheadR)) {
        // ease back into the lane, spend what is left going forward
        const step = Math.min(speed, Math.abs(off));
        if (horiz) m.y -= Math.sign(off) * step; else m.x -= Math.sign(off) * step;
        const rest = speed - step;
        if (rest > 0.01) {
          if (horiz) m.y = lane * T; else m.x = lane * T;
          this.stepAxis(m, dx, dy, rest);
        }
        return true;
      }
      // our lane is blocked: slide into the neighbouring lane if it is open
      const lane2 = lane + Math.sign(off);
      const c2 = horiz ? fwd + dx : lane2, r2 = horiz ? lane2 : fwd + dy;
      if (Math.abs(off) >= 2 && !this.blockedFor(m, c2, r2)) {
        const step = Math.min(speed, T - Math.abs(off));
        if (horiz) m.y += Math.sign(off) * step; else m.x += Math.sign(off) * step;
        return true;
      }
      return false;
    }

    // ---------------------------------------------------------------- bombs
    placeBomb(m) {
      if (!m.alive || m.stun > 0 || m.active >= m.bombs) return false;
      const [c, r] = cellOf(m);
      const k = idx(c, r);
      if (this.grid[k] !== FLOOR || this.bombAt[k] || (this.flames[k] && this.flames[k].t < FLAME_HOT)) return false;
      const b = { c, r, x: c * T, y: r * T, owner: m, fire: m.fire, timer: m.fuse, fuse: m.fuse, passers: new Set(), slide: null, anim: 0, dead: false };
      for (const a of this.maids) if (a.alive && this.overlapsTile(a, c, r)) b.passers.add(a);
      for (const e of this.enemies) if (e.alive && this.overlapsTile(e, c, r)) b.passers.add(e);
      this.bombs.push(b);
      this.bombAt[k] = b;
      m.active++;
      sfx('place');
      return true;
    }

    tryKick(m, dir, fromSkill) {
      const [c, r] = cellOf(m);
      const [dx, dy] = DV[dir];
      let b = this.bombAt[idx(c + dx, r + dy)];
      if (fromSkill && !b) {
        const here = this.bombAt[idx(c, r)];
        if (here) b = here;
      }
      if (!b || b.slide || b.dead) return false;
      if (!this.canSlideInto(b, b.c + dx, b.r + dy)) return false;
      b.slide = dir;
      b.passers.clear();
      // Berry's skill kick flies faster and blows up on whatever it hits
      if (fromSkill) { b.impact = true; b.kicker = m; }
      sfx('kick');
      this.dust(b.x + 8, b.y + 12, 3);
      return true;
    }
    canSlideInto(b, c, r) {
      if (!inb(c, r)) return false;
      const k = idx(c, r);
      if (this.grid[k] !== FLOOR || this.bombAt[k]) return false;
      for (const m of this.maids) if (m.alive && this.overlapsTile(m, c, r)) return false;
      for (const e of this.enemies) if (e.alive && this.overlapsTile(e, c, r)) return false;
      return true;
    }

    updateBombs() {
      for (const b of this.bombs.slice()) {
        if (b.dead) continue;
        b.anim++;
        if (!b.remoteHold) b.timer--;
        // leaving passers
        for (const a of b.passers) if (!a.alive || !this.overlapsTile(a, b.c, b.r)) b.passers.delete(a);
        if (b.slide) {
          const [dx, dy] = DV[b.slide];
          let remain = b.impact ? G.SKILL.kickSpeed : 3;
          // an impact bomb streaks and bursts as soon as it meets something (the boss has no tile, so check it here)
          if (b.impact) {
            if (b.anim % 2 === 0) this.particles.push({ kind: 'streak', x: b.x + 8 - dx * 6, y: b.y + 8 - dy * 6, dx, dy, t: 0, life: 10 });
            if (this.boss && this.boss.alive && Math.hypot(this.boss.x - b.x - 8, this.boss.y - b.y - 8) < 18) { b.slide = null; b.timer = Math.min(b.timer, 1); }
          }
          while (remain > 0.001 && b.slide) {
            const aligned = Math.abs(b.x - b.c * T) < 0.01 && Math.abs(b.y - b.r * T) < 0.01;
            let goalX, goalY;
            if (aligned) {
              b.x = b.c * T; b.y = b.r * T;
              if (!this.canSlideInto(b, b.c + dx, b.r + dy)) {
                b.slide = null;
                if (b.impact) { b.timer = Math.min(b.timer, 1); this.particles.push({ kind: 'ring', x: b.x + 8, y: b.y + 8, r0: 3, r1: 11, col: '#ffffff', t: 0, life: 8 }); }
                break;
              }
              goalX = (b.c + dx) * T; goalY = (b.r + dy) * T;
            } else {
              goalX = dx > 0 ? Math.ceil(b.x / T) * T : dx < 0 ? Math.floor(b.x / T) * T : b.x;
              goalY = dy > 0 ? Math.ceil(b.y / T) * T : dy < 0 ? Math.floor(b.y / T) * T : b.y;
            }
            const step = Math.min(remain, Math.abs(goalX - b.x) + Math.abs(goalY - b.y));
            if (step <= 0.0001) break;
            b.x += dx * step; b.y += dy * step;
            remain -= step;
            const nc = Math.round(b.x / T), nr = Math.round(b.y / T);
            if (nc !== b.c || nr !== b.r) {
              if (this.bombAt[idx(b.c, b.r)] === b) this.bombAt[idx(b.c, b.r)] = null;
              b.c = nc; b.r = nr;
              this.bombAt[idx(nc, nr)] = b;
            }
          }
          if (!b.slide) { b.x = b.c * T; b.y = b.r * T; }
        }
        const f = this.flames[idx(b.c, b.r)];
        if (f && f.t < FLAME_HOT) b.timer = Math.min(b.timer, 4);
        if (b.timer <= 0) this.explode(b);
      }
    }

    explode(b) {
      if (b.dead) return;
      b.dead = true;
      const i = this.bombs.indexOf(b);
      if (i >= 0) this.bombs.splice(i, 1);
      if (this.bombAt[idx(b.c, b.r)] === b) this.bombAt[idx(b.c, b.r)] = null;
      if (b.owner && b.owner.active > 0) b.owner.active--;
      const owner = b.owner;
      const range = b.fire + (b.boost || 0);
      const pierce = (owner && owner.pierce) || 0;
      let centerMask = 0;
      const blasted = [[b.c, b.r]];
      for (const d of DIRS) {
        const [dx, dy] = DV[d];
        const tiles = [];
        let cut = 0;
        for (let n = 1; n <= range; n++) {
          const c = b.c + dx * n, r = b.r + dy * n;
          if (!inb(c, r)) break;
          const k = idx(c, r), cell = this.grid[k];
          if (cell === HARD || cell === WALL || cell === DECOR || cell === BURN) break;
          if (cell === SOFT) {
            this.burnSoft(c, r, owner);
            // Yoru's flames cut through the crate and keep going
            if (cut < pierce) { cut++; this.particles.push({ kind: 'streak', x: c * T + 8, y: r * T + 8, dx, dy, t: 0, life: 12, col: '#e8e0ff' }); continue; }
            break;
          }
          tiles.push([c, r]);
          const ob = this.bombAt[k];
          if (ob && !ob.dead) { ob.timer = Math.min(ob.timer, 6); break; }
        }
        tiles.forEach(([c, r], j) => this.addFlame(c, r, BIT[OPP[d]] | (j < tiles.length - 1 ? BIT[d] : 0), owner, b.impact));
        if (tiles.length) centerMask |= BIT[d];
        blasted.push(...tiles);
      }
      this.addFlame(b.c, b.r, centerMask, owner, b.impact);
      if (owner && owner.frost) this.frostAround(blasted, owner);
      if (b.boost) this.particles.push({ kind: 'ring', x: b.c * T + 8, y: b.r * T + 8, r0: 6, r1: 22, col: '#9ff3ff', t: 0, life: 14 });
      this.shake = Math.max(this.shake, 6);
      sfx('boom');
    }

    // Yukino's passive: the cold of her blast freezes monsters and slows rivals standing just outside the flames
    frostAround(tiles, owner) {
      const inBlast = new Set(tiles.map(([c, r]) => idx(c, r)));
      const edge = new Set();
      for (const [c, r] of tiles) for (const d of DIRS) {
        const nc = c + DV[d][0], nr = r + DV[d][1];
        if (inb(nc, nr) && !inBlast.has(idx(nc, nr)) && this.grid[idx(nc, nr)] === FLOOR) edge.add(idx(nc, nr));
      }
      for (const k of edge) {
        const c = k % COLS, r = (k / COLS) | 0;
        if (Math.random() < 0.5) this.particles.push({ kind: 'frost', x: c * T + 8 + E.rand(-4, 4), y: r * T + 8 + E.rand(-4, 4), vx: 0, vy: -0.15, t: 0, life: 30 });
        for (const e of this.enemies) if (e.alive && this.overlapsTile(e, c, r)) e.frozen = Math.max(e.frozen || 0, G.SKILL.frostEnemy);
        for (const m of this.maids) if (m !== owner && m.alive && m.star <= 0 && this.overlapsTile(m, c, r)) m.chill = Math.max(m.chill, G.SKILL.frostMaid);
      }
    }

    // impact: flames from Berry's skill kick, which never burn Berry herself
    addFlame(c, r, mask, owner, impact) {
      const k = idx(c, r);
      const f = this.flames[k];
      if (f) { f.mask |= mask; if (f.t > 6) f.t = 6; f.impact = !!impact && (f.owner === owner || f.impact); f.owner = owner; }
      else this.flames[k] = { mask, t: 0, owner, impact: !!impact };
      const it = this.items[k];
      if (it && it.age > 24) {
        this.items[k] = null;
        if (it.type === 'dust') this.stats.dustBurned = (this.stats.dustBurned || 0) + 1;
        this.puff(c * T + 8, r * T + 8);
      }
    }

    burnSoft(c, r, owner) {
      const k = idx(c, r);
      if (this.grid[k] !== SOFT) return;
      this.grid[k] = BURN;
      this.burning.push({ c, r, t: 0, v: this.variant[k], owner });
      for (let n = 0; n < 5; n++) {
        this.particles.push({ kind: 'debris', x: c * T + 8, y: r * T + 6, vx: E.rand(-1.4, 1.4), vy: E.rand(-2.4, -0.6), t: 0, life: E.randi(22, 34), col: E.pick(['#2a1b30', '#ffffff', '#c9955a']) });
      }
      sfx('crumble');
    }

    updateBurning() {
      for (let i = this.burning.length - 1; i >= 0; i--) {
        const s = this.burning[i];
        s.t++;
        if (s.t < 22) continue;
        this.burning.splice(i, 1);
        const k = idx(s.c, s.r);
        this.grid[k] = FLOOR;
        this.softLeft--;
        if (this.hidden[k]) {
          this.items[k] = { type: this.hidden[k], age: 0 };
          this.hidden[k] = null;
        } else if (this.mode === 'story') {
          const roll = Math.random();
          if (roll < 0.3) { this.items[k] = { type: 'dust', age: 0 }; this.stats.dustTotal++; }
          else if (roll < 0.42) this.items[k] = { type: 'coin', age: 0 };
        }
      }
    }

    updateFlames() {
      for (let k = 0; k < this.flames.length; k++) {
        const f = this.flames[k];
        if (!f) continue;
        f.t++;
        if (f.t >= FLAME_DUR) this.flames[k] = null;
      }
    }
    hotAt(c, r) {
      if (!inb(c, r)) return null;
      const f = this.flames[idx(c, r)];
      return f && f.t < FLAME_HOT ? f : null;
    }

    // ---------------------------------------------------------------- maids
    updateMaid(m) {
      if (!m.alive) { m.deadT++; return; }
      if (m.inv > 0) m.inv--;
      if (m.star > 0) m.star--;
      if (m.burnT > 0) m.burnT--;
      if (m.stun > 0) m.stun--;
      if (m.cool > 0) m.cool--;
      if (m.slashT > 0) m.slashT--;
      if (m.magicT > 0) m.magicT--;
      if (m.kickT > 0) m.kickT--;
      if (m.remoteT > 0) m.remoteT--;
      if (m.chill > 0) m.chill--;
      // Honey's sugar shield grows back a while after it breaks
      if (m.maidKey === 'honey' && !m.shield && m.shieldCD > 0 && --m.shieldCD === 0) {
        m.shield = 1;
        this.particles.push({ kind: 'ring', x: m.x + 8, y: m.y + 4, r0: 14, r1: 9, col: '#ffc8e0', t: 0, life: 12 });
        sfx('heal');
      }
      m.sp = Math.min(100, m.sp + (this.mode === 'battle' ? 0.08 : 0.06) * (m.perks.lowMood ? 0.7 : 1));

      let ctrl;
      if (m.human) {
        const p = m.pad;
        for (const d of DIRS) {
          if (E.pressed(p, d)) { m.dirStack = m.dirStack.filter((x) => x !== d); m.dirStack.push(d); }
          if (!E.held(p, d)) m.dirStack = m.dirStack.filter((x) => x !== d);
        }
        ctrl = { dir: m.dirStack[m.dirStack.length - 1] || null, bomb: E.pressed(p, 'a'), skill: E.pressed(p, 'b') };
      } else {
        ctrl = m.ai.update();
      }
      const busy = m.burnT > 20 || m.stun > 0 || this.state !== 'play';
      m.moving = false;
      if (!busy && ctrl.dir) {
        m.dir = ctrl.dir;
        m.moving = this.moveMaid(m, ctrl.dir);
        if (m.moving) m.walkT++;
      }
      if (!busy && ctrl.bomb) this.placeBomb(m);
      if (!busy && ctrl.skill) this.useSkill(m);

      // pickups
      const [c, r] = cellOf(m);
      const k = idx(c, r);
      const it = this.items[k];
      if (it && (it.type === 'dust' || it.age > 6)) { this.items[k] = null; this.collect(m, it.type, c, r); }

      // flames (her own skill-kick blast spares Berry when the tuning says so)
      const hot = this.hotAt(c, r);
      if (hot && !(G.SKILL.kickSelfSafe && hot.impact && hot.owner === m)) this.hurtMaid(m);
    }

    collect(m, type, c, r) {
      const x = c * T + 8, y = r * T;
      const pop = (text, col) => this.floaters.push({ x, y, text, col: col || '#ffffff', t: 0 });
      switch (type) {
        case 'bomb': m.bombs = Math.min(8, m.bombs + 1); pop(G.t('炸彈+1'), '#ff9fb4'); sfx('item'); break;
        case 'fire': m.fire = Math.min(8, m.fire + 1); pop(G.t('火力+1'), '#ffb45c'); sfx('item'); break;
        case 'speed': m.speedLv = Math.min(6, m.speedLv + 1); pop(G.t('速度+1'), '#8fc6ff'); sfx('item'); break;
        case 'heart':
          if (m.hearts < m.maxHearts) { m.hearts++; pop(G.t('愛心+1'), '#ff9fb4'); } else { this.stats.coins += 50; pop('+50G', '#ffe14d'); }
          sfx('heal');
          break;
        case 'clock': this.freezeT = 330; pop(G.t('時間暫停！'), '#9ff3ff'); sfx('freeze'); break;
        case 'star': m.star = 480; pop(G.t('無敵！'), '#ffe14d'); sfx('power'); break;
        case 'tea': m.sp = 100; pop(G.t('特技全滿'), '#b8f28a'); sfx('item'); break;
        case 'coin': this.stats.coins += 10; pop('+10G', '#ffe14d'); sfx('coin'); break;
        case 'dust':
          this.stats.dustSwept++;
          this.stats.coins += 5 + (m.perks.dustCoin || 0);
          m.sp = Math.min(100, m.sp + 15 + (m.perks.dustSp || 0));
          pop(G.t('打掃+1'), '#ffffff');
          sfx('sweep');
          for (let n = 0; n < 4; n++) this.particles.push({ kind: 'spark', x: x + E.rand(-6, 6), y: y + 6 + E.rand(-4, 4), vx: E.rand(-0.5, 0.5), vy: E.rand(-1, -0.3), t: 0, life: 24 });
          break;
      }
    }

    hurtMaid(m, force) {
      if (!m.alive || this.state !== 'play') return;
      if (!force && (m.inv > 0 || m.star > 0)) return;
      // the sugar shield takes the hit instead
      if (!force && m.shield > 0) {
        m.shield = 0;
        m.shieldCD = this.mode === 'battle' ? G.SKILL.shieldRechargeBattle : G.SKILL.shieldRecharge;
        m.inv = 90;
        this.floaters.push({ x: m.x + 8, y: m.y - 6, text: G.t('護盾破了！'), col: '#ffc8e0', t: 0 });
        for (let n = 0; n < 10; n++) this.particles.push({ kind: 'debris', x: m.x + 8, y: m.y + 2, vx: Math.cos(n * 0.63) * 1.8, vy: Math.sin(n * 0.63) * 1.8 - 1, t: 0, life: 24, col: n % 2 ? '#ffc8e0' : '#ffffff' });
        this.shake = Math.max(this.shake, 6);
        sfx('hurt');
        return;
      }
      m.hearts--;
      m.inv = 150 + (m.perks.invBonus || 0);
      m.burnT = 48;
      if (m.hearts <= 0 && m.guard && !force) {
        m.hearts = 1;
        m.guard = false;
        this.floaters.push({ x: m.x + 8, y: m.y - 6, text: G.t('愛的守護！'), col: '#ff9fbb', t: 0 });
        for (let n = 0; n < 10; n++) this.particles.push({ kind: 'heart', x: m.x + 8, y: m.y + 4, vx: Math.cos(n * 0.63) * 1.6, vy: Math.sin(n * 0.63) * 1.6, t: 0, life: 36 });
        sfx('heal');
      }
      this.stats.hits++;
      this.shake = Math.max(this.shake, 10);
      sfx('hurt');
      if (m.hearts <= 0) {
        m.alive = false;
        m.deadT = 0;
        m.burnT = 0;
        for (let n = 0; n < 8; n++) this.particles.push({ kind: 'star', x: m.x + 8, y: m.y, vx: Math.cos(n * 0.785) * 1.5, vy: Math.sin(n * 0.785) * 1.5 - 0.5, t: 0, life: 36 });
      }
    }

    useSkill(m) {
      if (m.cool > 0) return;
      const [c, r] = cellOf(m);
      const [dx, dy] = DV[m.dir];
      const S = G.SKILL;
      const pay = () => {
        if (m.sp < m.skillCost) { sfx('denied'); m.cool = 10; return false; }
        m.sp -= m.skillCost;
        // the player's own skills get the cut-in; CPU rivals using theirs would keep covering the field
        if (m.human) this.cutins = [{ key: m.maidKey, slot: this.maids.indexOf(m), t: 0 }];
        return true;
      };
      switch (m.maidKey) {
        // 爆裂飛踢: kick the bomb in front (or drop one and kick it) so it streaks off and bursts on impact
        case 'berry': {
          let b = this.bombAt[idx(c + dx, r + dy)] || this.bombAt[idx(c, r)];
          if (b && (b.slide || b.dead)) b = null;
          const canDrop = !b && m.active < m.bombs && this.grid[idx(c, r)] === FLOOR && !this.bombAt[idx(c, r)];
          const target = b || (canDrop ? { c, r } : null);
          if (!target || !this.canSlideInto(target, target.c + dx, target.r + dy)) { sfx('denied'); m.cool = 10; return; }
          if (!pay()) return;
          if (!b) { this.placeBomb(m); b = this.bombAt[idx(c, r)]; }
          m.cool = 18;
          m.kickT = 12;
          if (b && this.tryKick(m, m.dir, true)) {
            for (let n = 0; n < 6; n++) this.particles.push({ kind: 'star', x: b.x + 8, y: b.y + 8, vx: -dx * E.rand(0.5, 1.6) + E.rand(-0.8, 0.8), vy: -dy * E.rand(0.5, 1.6) + E.rand(-0.8, 0.8), t: 0, life: 20 });
            this.particles.push({ kind: 'ring', x: b.x + 8, y: b.y + 8, r0: 4, r1: 13, col: '#ffe14d', t: 0, life: 10 });
            this.floaters.push({ x: m.x + 8, y: m.y - 8, text: G.t('爆裂飛踢！'), col: '#ff9fb4', t: 0 });
          }
          break;
        }
        // 居合斬: one stroke through the next tiles — crates split, bombs defused, monsters cut, rivals knocked dizzy
        case 'yoru': {
          if (!pay()) return;
          m.cool = 22;
          m.slashT = 14;
          sfx('slash');
          for (let n = 1; n <= S.slashReach; n++) {
            const tc = c + dx * n, tr = r + dy * n;
            if (!inb(tc, tr)) break;
            const k = idx(tc, tr), cell = this.grid[k];
            if (cell === HARD || cell === WALL || cell === DECOR) break;
            for (let s = 0; s < 3; s++) this.particles.push({ kind: 'spark', x: tc * T + 8 + E.rand(-5, 5), y: tr * T + 8 + E.rand(-5, 5), vx: dx * 0.6, vy: dy * 0.6, t: 0, life: 16 });
            const b = this.bombAt[k];
            if (b && !b.dead) {
              b.dead = true;
              this.bombs.splice(this.bombs.indexOf(b), 1);
              this.bombAt[k] = null;
              if (b.owner.active > 0) b.owner.active--;
              this.puff(tc * T + 8, tr * T + 8);
              this.floaters.push({ x: tc * T + 8, y: tr * T, text: G.t('拆除！'), col: '#d8dcea', t: 0 });
            }
            for (const e of this.enemies) if (e.alive && Math.abs(e.x - tc * T) < 12 && Math.abs(e.y - tr * T) < 12) this.hitEnemy(e, m);
            // against other maids the slash only knocks them dizzy
            for (const o of this.maids) if (o !== m && o.alive && o.star <= 0 && Math.abs(o.x - tc * T) < 12 && Math.abs(o.y - tr * T) < 12) o.stun = Math.max(o.stun, 45);
            if (this.boss && this.boss.alive && Math.hypot(this.boss.x - (tc * T + 8), this.boss.y - (tr * T + 8)) < 22) this.hitBoss();
            if (cell === SOFT) { this.burnSoft(tc, tr, m); break; }
          }
          break;
        }
        // 甜心魔法: heal, rebuild the sugar shield, and daze everything nearby
        case 'honey': {
          if (!pay()) return;
          m.cool = 30;
          m.magicT = 40;
          sfx('magic');
          if (m.hearts < m.maxHearts && this.mode === 'story') m.hearts++;
          if (this.mode !== 'battle' || S.magicShieldBattle) { m.shield = 1; m.shieldCD = 0; }
          for (let n = 0; n < 12; n++) {
            const a = (n / 12) * Math.PI * 2;
            this.particles.push({ kind: 'heart', x: m.x + 8, y: m.y + 4, vx: Math.cos(a) * 1.6, vy: Math.sin(a) * 1.6, t: 0, life: 40 });
          }
          this.particles.push({ kind: 'ring', x: m.x + 8, y: m.y + 6, r0: 6, r1: S.charmRadius * T, col: '#ff9fbb', t: 0, life: 22 });
          this.particles.push({ kind: 'ring', x: m.x + 8, y: m.y + 6, r0: 2, r1: S.stunRadius * T, col: '#ffe0ec', t: 0, life: 18 });
          for (const e of this.enemies) if (e.alive && Math.hypot(e.x - m.x, e.y - m.y) < S.charmRadius * T) { e.charm = S.charmFrames; }
          for (const o of this.maids) if (o !== m && o.alive && o.star <= 0 && Math.hypot(o.x - m.x, o.y - m.y) < S.stunRadius * T) { o.stun = Math.max(o.stun, S.stunFrames); }
          if (this.boss && this.boss.alive && Math.hypot(this.boss.x - m.x - 8, this.boss.y - m.y - 8) < S.charmRadius * T) this.boss.charm = S.bossCharm;
          break;
        }
        // 遙控引爆: set all her bombs off in a quick sequence, each blast one tile longer
        case 'yukino': {
          const mine = this.bombs.filter((b) => b.owner === m && !b.dead);
          if (!mine.length) { sfx('denied'); m.cool = 10; return; }
          if (!pay()) return;
          m.cool = 20;
          m.remoteT = 24;
          sfx('remote');
          this.particles.push({ kind: 'ring', x: m.x + 8, y: m.y + 2, r0: 3, r1: 20, col: '#9ff3ff', t: 0, life: 16 });
          // short, visible countdown so opponents can still react
          mine.forEach((b, i) => {
            b.timer = Math.min(b.timer, (this.mode === 'battle' ? S.remoteDelayBattle : S.remoteDelay) + i * 3);
            b.boost = S.remoteBoost;
            this.particles.push({ kind: 'ring', x: b.x + 8, y: b.y + 8, r0: 12, r1: 3, col: '#9ff3ff', t: 0, life: 10 });
          });
          break;
        }
      }
    }

    // ---------------------------------------------------------------- enemies
    enemyCanEnter(e, c, r) {
      if (!inb(c, r)) return false;
      const k = idx(c, r), cell = this.grid[k];
      if (!(cell === FLOOR || (e.ghost && cell === SOFT))) return false;
      if (this.bombAt[k]) return false;
      return true;
    }

    updateEnemy(e) {
      if (!e.alive) { e.deadT++; return; }
      e.animT++;
      if (e.hitT > 0) e.hitT--;
      const [c, r] = cellOf(e);
      if (this.hotAt(c, r) && e.hitT <= 0) this.hitEnemy(e, this.hotAt(c, r).owner);
      if (!e.alive) return;
      if (e.charm > 0) e.charm--;
      if (e.frozen > 0) e.frozen--;
      if (this.state === 'play') {
        for (const m of this.maids) {
          if (m.alive && e.charm <= 0 && !(e.frozen > 0) && Math.abs(e.x - m.x) < 9 && Math.abs(e.y - m.y) < 9) this.hurtMaid(m);
        }
      }
      if (this.freezeT > 0 || e.charm > 0 || e.frozen > 0 || this.state !== 'play') return;
      if (e.wait > 0) { e.wait--; return; }

      const atTarget = Math.abs(e.x - e.tx * T) < 0.01 && Math.abs(e.y - e.ty * T) < 0.01;
      if (atTarget) {
        e.x = e.tx * T; e.y = e.ty * T;
        const d = this.chooseEnemyDir(e);
        if (!d) { e.wait = 18; return; }
        e.dir = d;
        e.tx += DV[d][0]; e.ty += DV[d][1];
      } else {
        // the tile we are heading into got blocked (bomb placed or kicked in): turn back
        const tk = idx(e.tx, e.ty);
        const cell = this.grid[tk];
        const b = this.bombAt[tk];
        if ((b && !b.passers.has(e)) || !(cell === FLOOR || (e.ghost && cell === SOFT))) {
          e.tx -= DV[e.dir][0]; e.ty -= DV[e.dir][1];
          e.dir = OPP[e.dir];
        }
      }
      const sp = e.speed * (this.mode === 'story' && this.timeLeft < 30 * 60 ? 1.3 : 1);
      const gx = e.tx * T - e.x, gy = e.ty * T - e.y;
      e.x += Math.sign(gx) * Math.min(Math.abs(gx), sp);
      e.y += Math.sign(gy) * Math.min(Math.abs(gy), sp);
    }

    chooseEnemyDir(e) {
      const c = e.tx, r = e.ty;
      let open = DIRS.filter((d) => this.enemyCanEnter(e, c + DV[d][0], r + DV[d][1]));
      if (!open.length) return null;
      if (e.ai === 'smart') {
        const danger = this.dangerMap();
        const here = danger[idx(c, r)];
        const safeOpen = open.filter((d) => danger[idx(c + DV[d][0], r + DV[d][1])] > 70);
        if (here < Infinity) {
          const path = this.bfsPath(c, r, (k) => danger[k] === Infinity, (cc, rr) => this.enemyCanEnter(e, cc, rr), 10);
          if (path && path.length) return path[0];
        }
        if (safeOpen.length) open = safeOpen;
        else if (here === Infinity) return null;
      }
      if (e.ai === 'chase' || e.ai === 'smart') {
        const target = this.nearestMaid(e);
        if (target && Math.random() < (e.ai === 'smart' ? 0.55 : 0.65)) {
          const [mc, mr] = cellOf(target);
          if (Math.abs(mc - c) + Math.abs(mr - r) <= 8) {
            const path = this.bfsPath(c, r, (k) => k === idx(mc, mr), (cc, rr) => this.enemyCanEnter(e, cc, rr), 14);
            if (path && path.length && open.includes(path[0])) return path[0];
          }
        }
      }
      if (e.ai === 'straight') return open.includes(e.dir) ? e.dir : E.pick(open);
      if (open.includes(e.dir) && Math.random() < 0.72) return e.dir;
      const nonBack = open.filter((d) => d !== OPP[e.dir]);
      return E.pick(nonBack.length ? nonBack : open);
    }

    nearestMaid(a) {
      let best = null, bd = Infinity;
      for (const m of this.maids) {
        if (!m.alive) continue;
        const d = Math.abs(m.x - a.x) + Math.abs(m.y - a.y);
        if (d < bd) { bd = d; best = m; }
      }
      return best;
    }

    hitEnemy(e, by) {
      if (!e.alive || e.hitT > 0) return;
      e.hp--;
      if (e.hp > 0) { e.hitT = 60; sfx('kill'); return; }
      e.alive = false;
      e.deadT = 0;
      const D = G.ENEMY_DATA[e.type];
      this.stats.kills++;
      this.stats.coins += D.coin;
      this.stats.killCoins += D.coin;
      this.floaters.push({ x: e.x + 8, y: e.y, text: '+' + D.coin + 'G', col: '#ffe14d', t: 0 });
      for (const m of this.maids) if (m.alive) m.sp = Math.min(100, m.sp + 12);
      const [c, r] = cellOf(e);
      const k = idx(c, r);
      if (!this.items[k] && this.grid[k] === FLOOR && Math.random() < 0.25) this.items[k] = { type: 'coin', age: -20 };
      sfx('kill');
      this.puff(e.x + 8, e.y + 8);
    }

    // ---------------------------------------------------------------- boss
    updateBoss() {
      const B = this.boss;
      if (!B) return;
      B.t++;
      if (B.hitT > 0) B.hitT--;
      if (B.charm > 0) B.charm--;
      if (!B.alive) {
        B.deadT++;
        if (B.deadT % 8 === 0 && B.deadT < 110) {
          this.puff(B.x + E.rand(-18, 18), B.y + E.rand(-18, 14));
          this.shake = 8;
          sfx('boom');
        }
        return;
      }
      // hit by flames
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const c = Math.floor((B.x + dx * 10) / T), r = Math.floor((B.y + dy * 10) / T);
          const hf = this.hotAt(c, r);
          if (hf && hf.owner !== B && B.hitT <= 0) this.hitBoss();
        }
      // contact
      for (const m of this.maids) if (m.alive && Math.hypot(m.x + 8 - B.x, m.y + 8 - B.y) < 17) this.hurtMaid(m);
      if (this.state !== 'play' || this.freezeT > 0 || B.charm > 0) return;

      const target = this.nearestMaid({ x: B.x - 8, y: B.y - 8 });
      const phase2 = B.hp <= B.maxHp / 2;
      const moveTo = (gx, gy, sp) => {
        const dx = gx - B.x, dy = gy - B.y, d = Math.hypot(dx, dy);
        if (d > 0.5) { B.x += (dx / d) * Math.min(sp, d); B.y += (dy / d) * Math.min(sp, d); }
        return d < 1;
      };
      const clampBoss = () => {
        B.x = E.clamp(B.x, 1.5 * T, (COLS - 1.5) * T);
        B.y = E.clamp(B.y, 2.6 * T, (ROWS - 1.5) * T);
      };
      if (B.kind === 'drill') this.bossDrill(B, target, phase2, moveTo, clampBoss);
      else if (B.kind === 'spider') this.bossSpider(B, target, phase2, moveTo);
      else switch (B.state) {
        case 'intro':
          if (B.t > 60) { B.state = 'move'; B.t = 0; }
          break;
        case 'move':
          if (B.t === 1 && target) { B.goalX = E.clamp(target.x + 8 + E.rand(-48, 48), 2 * T, 13 * T); B.goalY = E.clamp(target.y + 8 + E.pick([-40, 40]), 3 * T, 10 * T); }
          moveTo(B.goalX, B.goalY, phase2 ? 0.9 : 0.6);
          if (B.t > (phase2 ? 90 : 120)) {
            B.t = 0;
            if (phase2) B.summonCD -= 1;
            const roll = Math.random();
            if (phase2 && roll < 0.35) B.state = 'dashAim';
            else B.state = 'aim';
            if (phase2 && B.summonCD <= 0) { B.state = 'summon'; B.summonCD = 4; }
          }
          break;
        case 'aim':
          if (B.t === 1) {
            B.targets = [];
            const n = phase2 ? 5 : 3;
            if (target) B.targets.push(cellOf(target));
            let guard = 0;
            while (B.targets.length < n && guard++ < 60) {
              const c = E.randi(1, COLS - 2), r = E.randi(1, ROWS - 2);
              const k = idx(c, r);
              if (this.grid[k] === FLOOR || this.grid[k] === SOFT) B.targets.push([c, r]);
            }
            sfx('tick');
          }
          if (B.t === 50) {
            for (const [c, r] of B.targets) this.missiles.push({ sx: B.x, sy: B.y - 14, c, r, t: 0, life: 40 });
            sfx('missile');
          }
          if (B.t > 60) { B.state = 'move'; B.t = 0; B.targets = []; }
          break;
        case 'dashAim':
          if (target && B.t === 1) {
            const dx = target.x + 8 - B.x, dy = target.y + 8 - B.y;
            B.dashDir = Math.abs(dx) > Math.abs(dy) ? [Math.sign(dx), 0] : [0, Math.sign(dy)];
          }
          if (B.t > 36) { B.state = 'dash'; B.t = 0; }
          break;
        case 'dash':
          B.x += B.dashDir[0] * 3.2; B.y += B.dashDir[1] * 3.2;
          if (B.t % 4 === 0) this.dust(B.x, B.y + 16, 2);
          if (B.t > 40 || B.x <= 1.5 * T || B.x >= (COLS - 1.5) * T || B.y <= 2.6 * T || B.y >= (ROWS - 1.5) * T) {
            clampBoss();
            this.shake = 10;
            sfx('drop');
            B.state = 'move'; B.t = 0;
          }
          break;
        case 'summon':
          if (B.t === 20) {
            for (const [c, r] of [[1, 11], [13, 11], [13, 1]]) {
              const k = idx(c, r);
              if (this.grid[k] === SOFT) this.grid[k] = FLOOR;
              if (this.enemies.filter((e) => e.alive).length < 4) this.spawnEnemy('teddy', c, r);
              this.puff(c * T + 8, r * T + 8);
            }
            sfx('magic');
          }
          if (B.t > 50) { B.state = 'move'; B.t = 0; }
          break;
      }
      clampBoss();
    }
    // BOSS1: lines up with the maid and charges, boring through furniture; crashing into a hard block leaves it dizzy
    bossDrill(B, target, phase2, moveTo, clampBoss) {
      switch (B.state) {
        case 'intro':
          if (B.t > 60) { B.state = 'move'; B.t = 0; }
          break;
        case 'move':
          if (B.t === 1 && target) {
            B.goalX = E.clamp(target.x + 8 + E.rand(-40, 40), 2 * T, 13 * T);
            B.goalY = E.clamp(target.y + 8 + E.rand(-32, 32), 3 * T, 10 * T);
          }
          moveTo(B.goalX, B.goalY, phase2 ? 0.7 : 0.5);
          if (B.t > (phase2 ? 70 : 100)) { B.t = 0; B.dashes = phase2 ? 2 : 1; B.state = 'drillAim'; }
          break;
        case 'drillAim':
          if (B.t === 1) {
            const dx = (target ? target.x + 8 : B.x) - B.x, dy = (target ? target.y + 8 : B.y) - B.y;
            // room to charge before the arena edge in each direction
            const room = { right: (COLS - 1.5) * T - B.x, left: B.x - 1.5 * T, down: (ROWS - 1.5) * T - B.y, up: B.y - 2.6 * T };
            const toward = [dx >= 0 ? 'right' : 'left', dy >= 0 ? 'down' : 'up'];
            if (Math.abs(dy) > Math.abs(dx)) toward.reverse();
            let pick = toward.find((d) => room[d] >= 2 * T);
            if (!pick) pick = Object.keys(room).reduce((a, b) => (room[a] >= room[b] ? a : b));
            B.dashDir = DV[pick];
            sfx('tick');
          }
          if (B.t > (phase2 ? 32 : 48)) { B.state = 'drill'; B.t = 0; sfx('missile'); }
          break;
        case 'drill': {
          const sp = phase2 ? 3.4 : 2.8;
          B.x += B.dashDir[0] * sp;
          B.y += B.dashDir[1] * sp;
          if (B.t % 3 === 0) this.dust(B.x, B.y + 12, 2);
          const c = Math.floor((B.x + B.dashDir[0] * 14) / T), r = Math.floor((B.y + B.dashDir[1] * 12) / T);
          let crash = !inb(c, r);
          if (!crash) {
            const cell = this.grid[idx(c, r)];
            if (cell === SOFT) this.burnSoft(c, r, null);
            else if (cell === HARD || cell === WALL || cell === DECOR) crash = true;
          }
          if (crash || B.t > 80 || B.x <= 1.5 * T || B.x >= (COLS - 1.5) * T || B.y <= 2.6 * T || B.y >= (ROWS - 1.5) * T) {
            clampBoss();
            this.shake = 12;
            sfx('drop');
            B.state = 'stuck';
            B.t = 0;
          }
          break;
        }
        case 'stuck':
          if (B.t > (phase2 ? 55 : 85)) {
            B.t = 0;
            B.dashes--;
            if (B.dashes > 0) B.state = 'drillAim';
            else if (phase2 && --B.summonCD <= 0) { B.state = 'summon'; B.summonCD = 3; }
            else B.state = 'move';
          }
          break;
        case 'summon':
          if (B.t === 20) {
            for (const [c, r] of [[1, 11], [13, 11]]) {
              const k = idx(c, r);
              if (this.grid[k] === SOFT) this.grid[k] = FLOOR;
              if (this.enemies.filter((e) => e.alive).length < 3) this.spawnEnemy('dustcat', c, r);
              this.puff(c * T + 8, r * T + 8);
            }
            sfx('magic');
          }
          if (B.t > 50) { B.state = 'move'; B.t = 0; }
          break;
      }
    }
    // BOSS2: scuttles into line with the maid and breathes fire along the row and column; later it also lobs fire eggs
    bossSpider(B, target, phase2, moveTo) {
      switch (B.state) {
        case 'intro':
          if (B.t > 60) { B.state = 'move'; B.t = 0; }
          break;
        case 'move': {
          if (B.t === 1) {
            const tc = target ? cellOf(target) : null;
            for (let tries = 0; tries < 30; tries++) {
              const c = E.randi(2, COLS - 3), r = E.randi(3, ROWS - 2);
              const cell = this.grid[idx(c, r)];
              if (cell !== FLOOR && cell !== SOFT) continue;
              if (tc && tries < 20 && c !== tc[0] && r !== tc[1]) continue;
              B.goalX = c * T + 8;
              B.goalY = r * T + 8;
              break;
            }
          }
          const arrived = moveTo(B.goalX, B.goalY, phase2 ? 1.2 : 0.9);
          if ((arrived && B.t > 30) || B.t > 130) {
            B.t = 0;
            B.volleys = phase2 ? 2 : 1;
            B.state = Math.random() < (phase2 ? 0.4 : 0.25) ? 'eggAim' : 'fireAim';
          }
          break;
        }
        case 'fireAim':
          if (B.t === 1) sfx('tick');
          if (B.t > (phase2 ? 30 : 44)) { B.state = 'fire'; B.t = 0; }
          break;
        case 'fire':
          if (B.t === 1) {
            const c0 = E.clamp(Math.floor(B.x / T), 1, COLS - 2), r0 = E.clamp(Math.floor(B.y / T), 1, ROWS - 2);
            for (const d of DIRS) this.fireballs.push({ c: c0, r: r0, d, t: 0, left: phase2 ? 7 : 5 });
            this.shake = 6;
            sfx('boom');
          }
          if (B.t > 36) {
            B.t = 0;
            B.volleys--;
            B.state = B.volleys > 0 ? 'hop' : 'move';
          }
          break;
        case 'hop':
          if (B.t === 1) {
            const d = E.pick(DIRS);
            B.goalX = E.clamp(B.x + DV[d][0] * 2 * T, 2 * T, 13 * T);
            B.goalY = E.clamp(B.y + DV[d][1] * 2 * T, 3 * T, 10 * T);
          }
          moveTo(B.goalX, B.goalY, 1.8);
          if (B.t > 20) { B.state = 'fireAim'; B.t = 0; }
          break;
        case 'eggAim':
          if (B.t === 1) {
            B.targets = [];
            const n = phase2 ? 4 : 3;
            if (target) B.targets.push(cellOf(target));
            let guard = 0;
            while (B.targets.length < n && guard++ < 60) {
              const c = E.randi(1, COLS - 2), r = E.randi(1, ROWS - 2);
              const k = idx(c, r);
              if (this.grid[k] === FLOOR || this.grid[k] === SOFT) B.targets.push([c, r]);
            }
            sfx('tick');
          }
          if (B.t === 50) {
            for (const [c, r] of B.targets) this.missiles.push({ sx: B.x, sy: B.y - 10, c, r, t: 0, life: 40 });
            sfx('missile');
          }
          if (B.t > 60) { B.state = 'move'; B.t = 0; B.targets = []; }
          break;
      }
    }
    // spider fire travels one tile every few frames and leaves flames behind it
    updateFireballs() {
      for (let i = this.fireballs.length - 1; i >= 0; i--) {
        const fb = this.fireballs[i];
        if (++fb.t % 4 !== 0) continue;
        fb.c += DV[fb.d][0];
        fb.r += DV[fb.d][1];
        fb.left--;
        const cell = inb(fb.c, fb.r) ? this.grid[idx(fb.c, fb.r)] : WALL;
        if (cell === SOFT) { this.burnSoft(fb.c, fb.r, null); this.fireballs.splice(i, 1); continue; }
        if (cell !== FLOOR) { this.fireballs.splice(i, 1); continue; }
        const along = fb.d === 'left' || fb.d === 'right' ? BIT.left | BIT.right : BIT.up | BIT.down;
        this.addFlame(fb.c, fb.r, fb.left > 0 ? along : BIT[OPP[fb.d]], this.boss);
        const ob = this.bombAt[idx(fb.c, fb.r)];
        if (ob) ob.timer = Math.min(ob.timer, 6);
        if (fb.left <= 0) this.fireballs.splice(i, 1);
      }
    }
    hitBoss() {
      const B = this.boss;
      if (!B || !B.alive || B.hitT > 0) return;
      B.hp--;
      B.hitT = 55;
      this.shake = 12;
      sfx('hurt');
      if (B.hp <= 0) {
        B.alive = false;
        B.deadT = 0;
        this.stats.kills++;
        this.stats.coins += 500;
        this.stats.killCoins += 500;
        this.floaters.push({ x: B.x, y: B.y - 20, text: '+500G', col: '#ffe14d', t: 0 });
        for (const e of this.enemies) if (e.alive) { e.alive = false; e.deadT = 0; this.puff(e.x + 8, e.y + 8); }
      }
    }
    updateMissiles() {
      for (let i = this.missiles.length - 1; i >= 0; i--) {
        const ms = this.missiles[i];
        ms.t++;
        if (ms.t >= ms.life) {
          this.missiles.splice(i, 1);
          // small blast: radius 1 cross
          const b = { c: ms.c, r: ms.r, fire: 1, owner: this.boss, dead: false };
          const k = idx(ms.c, ms.r);
          if (this.grid[k] === SOFT) { this.burnSoft(ms.c, ms.r, null); continue; }
          if (this.grid[k] !== FLOOR) continue;
          this.fakeBlast(b);
        }
      }
    }
    fakeBlast(b) {
      let centerMask = 0;
      for (const d of DIRS) {
        const c = b.c + DV[d][0], r = b.r + DV[d][1];
        if (!inb(c, r)) continue;
        const cell = this.grid[idx(c, r)];
        if (cell === SOFT) { this.burnSoft(c, r, null); continue; }
        if (cell !== FLOOR) continue;
        this.addFlame(c, r, BIT[OPP[d]], b.owner);
        centerMask |= BIT[d];
        const ob = this.bombAt[idx(c, r)];
        if (ob) ob.timer = Math.min(ob.timer, 6);
      }
      this.addFlame(b.c, b.r, centerMask, b.owner);
      const ob = this.bombAt[idx(b.c, b.r)];
      if (ob) ob.timer = Math.min(ob.timer, 6);
      this.shake = Math.max(this.shake, 6);
      sfx('boom');
    }

    // ---------------------------------------------------------------- sudden death (battle)
    updateSudden() {
      if (this.mode !== 'battle' || this.state !== 'play') return;
      if (!this.sudden && this.timeLeft <= 45 * 60) {
        const order = [];
        let x0 = 1, y0 = 1, x1 = COLS - 2, y1 = ROWS - 2;
        while (x0 <= x1 && y0 <= y1) {
          for (let c = x0; c <= x1; c++) order.push([c, y0]);
          for (let r = y0 + 1; r <= y1; r++) order.push([x1, r]);
          if (y0 < y1) for (let c = x1 - 1; c >= x0; c--) order.push([c, y1]);
          if (x0 < x1) for (let r = y1 - 1; r > y0; r--) order.push([x0, r]);
          x0++; y0++; x1--; y1--;
        }
        this.sudden = { order, i: 0, t: 0 };
        this.floaters.push({ x: 120, y: 90, text: G.t('緊急清場！'), col: '#ff6f91', t: 0, big: true });
        sfx('denied');
      }
      if (!this.sudden) return;
      const s = this.sudden;
      s.t++;
      if (s.t % 9 === 0 && s.i < s.order.length) {
        const [c, r] = s.order[s.i++];
        const k = idx(c, r);
        if (this.grid[k] === HARD || this.grid[k] === WALL) return;
        this.falling.push({ c, r, t: 0 });
      }
      for (let i = this.falling.length - 1; i >= 0; i--) {
        const f = this.falling[i];
        f.t++;
        if (f.t >= 14) {
          this.falling.splice(i, 1);
          const k = idx(f.c, f.r);
          this.grid[k] = HARD;
          this.items[k] = null;
          this.hidden[k] = null;
          const b = this.bombAt[k];
          if (b) { b.dead = true; this.bombs.splice(this.bombs.indexOf(b), 1); this.bombAt[k] = null; if (b.owner.active > 0) b.owner.active--; }
          for (const m of this.maids) if (m.alive && this.overlapsTile(m, f.c, f.r)) { m.hearts = 1; this.hurtMaid(m, true); }
          sfx('drop');
        }
      }
    }

    // ---------------------------------------------------------------- danger map + BFS (shared by AI)
    dangerMap(extraBomb) {
      if (!extraBomb && this.dangerCache.frame === this.frame) return this.dangerCache.map;
      const map = new Float32Array(COLS * ROWS).fill(Infinity);
      for (let k = 0; k < this.flames.length; k++) if (this.flames[k] && this.flames[k].t < FLAME_HOT) map[k] = 0;
      for (const ms of this.missiles) map[idx(ms.c, ms.r)] = Math.min(map[idx(ms.c, ms.r)], ms.life - ms.t);
      for (const f of this.falling) map[idx(f.c, f.r)] = 0;
      if (this.sudden) {
        const s = this.sudden;
        for (let j = 0; j < 30 && s.i + j < s.order.length; j++) {
          const [c, r] = s.order[s.i + j];
          map[idx(c, r)] = Math.min(map[idx(c, r)], (j * 9) + 10);
        }
      }
      // skill-aware: remote-boosted range, crate-piercing flames, and impact bombs that go off the moment they stop
      const list = this.bombs.filter((b) => !b.dead).map((b) => ({ c: b.c, r: b.r, fire: b.fire + (b.boost || 0), pierce: b.owner ? b.owner.pierce || 0 : 0, t: b.impact && b.slide ? Math.min(b.timer, 10) : b.timer }));
      if (extraBomb) list.push(extraBomb);
      const blast = (b) => {
        const out = [idx(b.c, b.r)];
        for (const d of DIRS) {
          let cut = 0;
          for (let n = 1; n <= b.fire; n++) {
            const c = b.c + DV[d][0] * n, r = b.r + DV[d][1] * n;
            if (!inb(c, r)) break;
            const cell = this.grid[idx(c, r)];
            if (cell === SOFT && cut < (b.pierce || 0)) { cut++; continue; }
            if (cell !== FLOOR) break;
            out.push(idx(c, r));
            if (list.some((o) => o.c === c && o.r === r)) break;
          }
        }
        return out;
      };
      const tiles = list.map(blast);
      for (let pass = 0; pass < list.length; pass++) {
        let changed = false;
        list.forEach((b, i) => {
          for (const k of tiles[i]) for (const o of list) if (idx(o.c, o.r) === k && o.t > b.t) { o.t = b.t; changed = true; }
        });
        if (!changed) break;
      }
      list.forEach((b, i) => { for (const k of tiles[i]) map[k] = Math.min(map[k], Math.max(0, b.t)); });
      if (!extraBomb) this.dangerCache = { frame: this.frame, map };
      return map;
    }

    // BFS from (c,r); goal(k) -> bool; pass(c,r) -> bool. Returns list of dirs.
    bfsPath(c, r, goal, pass, maxSteps) {
      const start = idx(c, r);
      const prev = new Int16Array(COLS * ROWS).fill(-1);
      const pdir = new Int8Array(COLS * ROWS).fill(-1);
      const dist = new Int16Array(COLS * ROWS).fill(-1);
      const q = [start];
      dist[start] = 0;
      let head = 0;
      while (head < q.length) {
        const k = q[head++];
        if (k !== start && goal(k)) {
          const path = [];
          let cur = k;
          while (cur !== start) { path.unshift(DIRS[pdir[cur]]); cur = prev[cur]; }
          return path;
        }
        if (dist[k] >= (maxSteps || 99)) continue;
        const kc = k % COLS, kr = (k / COLS) | 0;
        for (let di = 0; di < 4; di++) {
          const nc = kc + DV[DIRS[di]][0], nr = kr + DV[DIRS[di]][1];
          if (!inb(nc, nr)) continue;
          const nk = idx(nc, nr);
          if (dist[nk] >= 0 || !pass(nc, nr, dist[k] + 1)) continue;
          dist[nk] = dist[k] + 1;
          prev[nk] = k;
          pdir[nk] = di;
          q.push(nk);
        }
      }
      return null;
    }

    // ---------------------------------------------------------------- effects
    puff(x, y) {
      this.particles.push({ kind: 'puff', x: x - 8, y: y - 8, t: 0, life: 20 });
    }
    dust(x, y, n) {
      for (let i = 0; i < n; i++) this.particles.push({ kind: 'mote', x: x + E.rand(-4, 4), y, vx: E.rand(-0.6, 0.6), vy: E.rand(-0.6, -0.1), t: 0, life: 18 });
    }
    // A job cleared, the maid celebrates in her own way (as FFBE gives every unit its own victory motion): Berry jumps
    // for joy twice, Honey hops, wobbles and nearly trips, Yukino twirls and curtsies, Yoru turns her back, then cuts the
    // air once. victoryTick sends out what goes with each beat; victoryPose says how she looks at that moment.
    victoryTick(m) {
      const t = this.stateT;
      const cx = m.x + 8, cy = m.y - 2;
      const burst = (kind, n, sp, col) => { for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; this.particles.push({ kind, x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 0.4, t: 0, life: 30, col }); } };
      switch (m.maidKey) {
        case 'berry':
          if (t === 22 || t === 46) { burst('star', 7, 1.6); this.particles.push({ kind: 'ring', x: cx, y: cy, r0: 3, r1: 16, col: '#ffe14d', t: 0, life: 12 }); sfx('kick'); }
          if (t === 60) sfx('item');
          break;
        case 'honey':
          if (t === 18) { burst('heart', 5, 1.1); sfx('pat'); }
          if (t === 36) { this.particles.push({ kind: 'debris', x: cx, y: m.y + 12, vx: -0.8, vy: -1, t: 0, life: 16, col: '#e8dccc' }, { kind: 'debris', x: cx, y: m.y + 12, vx: 0.8, vy: -1, t: 0, life: 16, col: '#e8dccc' }); sfx('drop'); }
          if (t === 52) { burst('heart', 7, 1.3); sfx('heal'); }
          break;
        case 'yukino':
          if (t === 30) { burst('spark', 8, 1.2); this.particles.push({ kind: 'ring', x: cx, y: cy, r0: 2, r1: 14, col: '#bfe8ff', t: 0, life: 14 }); sfx('freeze'); }
          break;
        case 'yoru':
          if (t === 26) { m.dir = 'left'; m.slashT = 14; sfx('slash'); }
          if (t === 34) burst('spark', 6, 1.4, '#c8b0ff');
          break;
      }
    }
    victoryPose(m, S) {
      const t = this.stateT;
      const arc = (a, b, h) => (t >= a && t < b ? -Math.round(Math.sin(((t - a) / (b - a)) * Math.PI) * h) : 0);
      const F = S.faces;
      switch (m.maidKey) {
        case 'berry':
          return { img: F.happy, dy: arc(12, 32, 8) + arc(36, 56, 6) + (t >= 60 ? -((t >> 3) % 2) : 0) };
        case 'honey':
          if (t < 26) return { img: F.happy, dy: arc(10, 26, 6) };
          if (t < 44) return { img: F.surprise, dy: t >= 34 ? 1 : 0, dx: t < 34 ? ((t >> 1) % 2 ? 1 : -1) : 0 };
          return { img: F.blush, dy: -((t >> 3) % 2) };
        case 'yukino':
          if (t < 8) return { img: S.down[0] };
          if (t < 28) return { img: S[['left', 'up', 'right', 'down'][((t - 8) / 5) | 0]][0] };
          if (t < 44) return { img: F.blush, dy: t >= 30 && t < 40 ? 1 : 0 };
          return { img: F.happy };
        case 'yoru':
          if (t < 20) return { img: S.up[0] };
          if (t < 44) return { img: S.left[0] };
          return { img: t < 90 ? S.down[0] : F.blush };
      }
      return null;
    }
    updateParticles() {
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.t++;
        if (p.vx != null) { p.x += p.vx; p.y += p.vy; }
        if (p.kind === 'debris') p.vy += 0.18;
        if (p.kind === 'heart' || p.kind === 'star') { p.vx *= 0.94; p.vy *= 0.94; }
        if (p.t >= p.life) this.particles.splice(i, 1);
      }
      for (let i = this.floaters.length - 1; i >= 0; i--) {
        const f = this.floaters[i];
        f.t++;
        if (f.t > (f.big ? 110 : 50)) this.floaters.splice(i, 1);
      }
      for (const c of this.cutins) c.t++;
      if (this.cutins.length && this.cutins[0].t > CUTIN_FRAMES) this.cutins = [];
      for (let k = 0; k < this.items.length; k++) if (this.items[k]) this.items[k].age++;
    }

    // ---------------------------------------------------------------- main update
    update() {
      this.frame++;
      this.stateT++;
      if (this.state === 'clear' && this.mode === 'story' && this.maids[0].alive) this.victoryTick(this.maids[0]);
      if (this.shake > 0) this.shake--;
      if (this.state === 'ready') {
        if (this.stateT > 100) { this.state = 'play'; this.stateT = 0; }
      }
      if (this.state === 'play') {
        this.timeLeft--;
        if (this.freezeT > 0) this.freezeT--;
      }
      for (const m of this.maids) this.updateMaid(m);
      if (this.state === 'play' || this.state === 'clear') {
        this.updateBombs();
        this.updateFlames();
        this.updateBurning();
      }
      for (const e of this.enemies) this.updateEnemy(e);
      this.enemies = this.enemies.filter((e) => e.alive || e.deadT < 30);
      this.updateBoss();
      this.updateMissiles();
      this.updateFireballs();
      this.updateSudden();
      this.updateParticles();
      this.checkEnd();
    }

    checkEnd() {
      if (this.state !== 'play') return;
      if (this.mode === 'story') {
        const m = this.maids[0];
        if (!m.alive) { this.state = 'fail'; this.stateT = 0; this.failReason = 'ko'; return; }
        if (this.timeLeft <= 0) { this.state = 'fail'; this.stateT = 0; this.failReason = 'time'; m.burnT = 60; return; }
        const bossDone = !this.boss || (!this.boss.alive && this.boss.deadT > 100);
        if (this.enemies.filter((e) => e.alive).length === 0 && bossDone && (!this.boss || !this.boss.alive)) {
          this.state = 'clear';
          this.stateT = 0;
          // coins fly to the maid
          for (let k = 0; k < this.items.length; k++) {
            const it = this.items[k];
            if (it && it.type === 'coin') { this.items[k] = null; this.stats.coins += 10; this.particles.push({ kind: 'coinfly', x: (k % COLS) * T, y: ((k / COLS) | 0) * T, t: 0, life: 30, tx: m.x, ty: m.y }); }
          }
        }
      } else {
        const alive = this.aliveMaids();
        if (alive.length <= 1 || this.timeLeft <= 0) {
          this.state = 'end';
          this.stateT = 0;
          this.winner = alive.length === 1 ? alive[0] : null;
          if (this.timeLeft <= 0) this.winner = null;
        }
      }
    }

    // ---------------------------------------------------------------- drawing
    draw(ctx) {
      const S = E.spr;
      const TH = S.themes[this.themeKey];
      let sx = 0, sy = 0;
      if (this.shake > 0) { sx = E.randi(-2, 2); sy = E.randi(-2, 2); }
      const ox = FX + sx, oy = FY + sy;
      E.rect(FX, FY, COLS * T, ROWS * T, TH.bg);

      // floor
      for (let r = 0; r < ROWS; r++)
        for (let c = 0; c < COLS; c++) {
          const k = idx(c, r);
          const v = this.grid[k];
          const x = ox + c * T, y = oy + r * T;
          if (v === WALL) {
            ctx.drawImage(r === 0 ? TH.wallTop[c % 2] : TH.wall, x, y);
          } else {
            ctx.drawImage(TH.floor[(c + r) % 2], x, y);
          }
        }
      // shadows under solid blocks
      ctx.fillStyle = 'rgba(42,27,48,0.22)';
      for (let r = 1; r < ROWS - 1; r++)
        for (let c = 1; c < COLS - 1; c++) {
          const above = this.grid[idx(c, r - 1)];
          if (this.grid[idx(c, r)] !== WALL && (above === HARD || above === SOFT || above === BURN || above === DECOR)) ctx.fillRect(ox + c * T, oy + r * T, T, 3);
          const left = this.grid[idx(c - 1, r)];
          if (this.grid[idx(c, r)] !== WALL && (left === HARD || left === SOFT || left === DECOR)) ctx.fillRect(ox + c * T, oy + r * T + 3, 2, T - 3);
        }
      // boss shadow + missile targets
      if (this.boss && (this.boss.alive || this.boss.deadT < 110)) {
        const B = this.boss;
        E.groundShadow(ox + B.x - 16, oy + B.y + 9, 32, 10, 0.3);
      }
      const blink = (this.frame >> 3) % 2 === 0;
      if (this.boss) for (const [c, r] of this.boss.targets) this.drawTarget(ox + c * T, oy + r * T, blink);
      for (const ms of this.missiles) this.drawTarget(ox + ms.c * T, oy + ms.r * T, true);

      // actors grouped by row
      const rows = [];
      for (let r = 0; r < ROWS; r++) rows.push([]);
      for (const m of this.maids) rows[E.clamp(Math.floor((m.y + 8) / T), 0, ROWS - 1)].push(m);
      for (const e of this.enemies) rows[E.clamp(Math.floor((e.y + 8) / T), 0, ROWS - 1)].push(e);

      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const k = idx(c, r);
          const x = ox + c * T, y = oy + r * T;
          const it = this.items[k];
          if (it && this.grid[k] === FLOOR) this.drawItem(it, x, y);
          const f = this.flames[k];
          if (f) {
            const st = f.t < 3 ? 0 : f.t < 7 ? 1 : f.t < 22 ? 2 : f.t < 28 ? 3 : 4;
            ctx.drawImage(S.flame[f.mask][st], x, y);
          }
        }
        for (const b of this.bombs) {
          if (Math.round(b.y / T) !== r) continue;
          const fr = b.timer < 40 ? ((b.anim >> 2) % 3) : ((b.anim >> 4) % 3);
          E.groundShadow(ox + b.x + 3, oy + b.y + 12, 10, 3, 0.3);
          // just before it goes off the bomb flashes orange, like the original's
          const img = b.timer < 40 && (b.anim >> 2) % 2 ? S.bomb[3] : S.bomb[fr];
          ctx.drawImage(img, Math.round(ox + b.x), Math.round(oy + b.y - 1));
        }
        for (let c = 0; c < COLS; c++) {
          const k = idx(c, r);
          const v = this.grid[k];
          const x = ox + c * T, y = oy + r * T;
          if (v === HARD) ctx.drawImage(this.variant[k] && TH.hard2 ? TH.hard2 : TH.hard, x, y - 4);
          else if (v === SOFT) ctx.drawImage(TH.soft[this.variant[k]], x, y - 4);
        }
        for (const s of this.burning) {
          if (s.r !== r) continue;
          const x = ox + s.c * T, y = oy + s.r * T;
          if (s.t < 12) {
            const jig = (s.t % 4 < 2) ? 1 : -1;
            ctx.save(); ctx.globalAlpha = 1 - s.t / 16;
            ctx.drawImage(TH.soft[s.v], x + jig, y - 4);
            ctx.restore();
          }
          ctx.drawImage(S.flame[0][s.t < 4 ? 1 : s.t < 14 ? 2 : 3], x, y - 2);
        }
        for (const d of this.decor) if (d.r + (d.h || 3) - 1 === r) this.drawDecor(d, ox, oy);
        for (const f of this.falling) if (f.r === r) {
          const fy = oy + f.r * T - 4 - (14 - f.t) * 10;
          ctx.fillStyle = 'rgba(42,27,48,0.3)';
          ctx.fillRect(ox + f.c * T + 2, oy + f.r * T + 4, 12, 8);
          ctx.drawImage(TH.hard, ox + f.c * T, fy);
        }
        const list = rows[r].sort((a, b) => a.y - b.y);
        for (const a of list) {
          if (a.kind === 'maid') this.drawMaid(a, ox, oy);
          else this.drawEnemy(a, ox, oy);
        }
      }

      if (this.boss) this.drawBoss(ox, oy);
      for (const ms of this.missiles) {
        const t = ms.t / ms.life;
        const tx = ms.c * T + 8, ty = ms.r * T + 8;
        const x = E.lerp(ms.sx, tx, t), y = E.lerp(ms.sy, ty, t) - Math.sin(t * Math.PI) * 60;
        E.rect(ox + x - 2, oy + y - 3, 4, 6, '#d8dcea');
        E.rect(ox + x - 1, oy + y + 3, 2, 2, (this.frame % 4 < 2) ? '#ffd23f' : '#ff7a1a');
      }

      // particles
      for (const p of this.particles) {
        const x = ox + p.x, y = oy + p.y;
        switch (p.kind) {
          case 'puff': ctx.drawImage(S.fx.puff[Math.min(3, (p.t / 5) | 0)], Math.round(x), Math.round(y)); break;
          case 'debris': E.rect(x, y, 2, 2, p.col); break;
          case 'mote': E.rect(x, y, 1, 1, '#ffffff'); break;
          case 'spark': ctx.drawImage(S.fx.sparkle[(p.t >> 3) % 3], Math.round(x - 2), Math.round(y - 2)); break;
          case 'heart': ctx.drawImage(S.fx.heart, Math.round(x - 2), Math.round(y - 2)); break;
          case 'star': ctx.drawImage(S.fx.star[(p.t >> 3) % 2], Math.round(x - 2), Math.round(y - 2)); break;
          // skill effects: an expanding (or closing) pixel ring, a speed streak, a drifting frost crystal
          case 'ring': {
            const t = p.t / p.life;
            if (t > 0.7 && p.t % 2) break;
            pixelRing(x, y, p.r0 + (p.r1 - p.r0) * E.ease.outCubic(t), p.col);
            break;
          }
          case 'streak': {
            const len = Math.max(1, 6 - (p.t >> 1));
            for (let i = 0; i < len; i++) E.rect(Math.round(x - p.dx * i * 2), Math.round(y - p.dy * i * 2), 1, 1, i < 2 ? '#ffffff' : p.col || '#ffe14d');
            break;
          }
          case 'frost': {
            if (p.t > p.life - 8 && p.t % 2) break;
            const fx = Math.round(x), fy = Math.round(y);
            E.rect(fx - 1, fy, 3, 1, '#9ff3ff'); E.rect(fx, fy - 1, 1, 3, '#9ff3ff'); E.rect(fx, fy, 1, 1, '#ffffff');
            if ((p.t >> 3) % 2) { E.rect(fx - 2, fy - 2, 1, 1, '#d8fbff'); E.rect(fx + 2, fy + 2, 1, 1, '#d8fbff'); }
            break;
          }
          case 'coinfly': {
            const t = E.ease.inOut(p.t / p.life);
            ctx.drawImage(S.items.coin[(p.t >> 2) % 4], Math.round(ox + E.lerp(p.x, p.tx, t)), Math.round(oy + E.lerp(p.y, p.ty, t) - Math.sin(t * Math.PI) * 20));
            break;
          }
        }
      }
      for (const f of this.floaters) {
        const t = f.t;
        if (f.big) {
          const s = t < 10 ? 1 + (10 - t) * 0.1 : 1;
          E.text(f.text, ox + f.x, oy + f.y, { color: f.col, outline: '#2a1b30', align: 'center', scale: 2 * s > 2.5 ? 3 : 2 });
        } else {
          E.text(f.text, ox + f.x, oy + f.y - Math.min(14, t * 0.6), { color: f.col, outline: '#2a1b30', align: 'center' });
        }
      }
      if (this.freezeT > 0) {
        ctx.fillStyle = 'rgba(160,230,255,' + (0.1 + 0.05 * Math.sin(this.frame * 0.2)) + ')';
        ctx.fillRect(FX, FY, COLS * T, ROWS * T);
      }
    }

    drawTarget(x, y, on) {
      const ctx = E.ctx;
      ctx.strokeStyle = on ? '#ec3d5f' : '#ffd23f';
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 2.5, y + 2.5, 11, 11);
      E.rect(x + 7, y + 4, 2, 8, on ? '#ec3d5f' : '#ffd23f');
      E.rect(x + 4, y + 7, 8, 2, on ? '#ec3d5f' : '#ffd23f');
    }

    drawItem(it, x, y) {
      const S = E.spr;
      const ctx = E.ctx;
      if (it.age < 0) return;
      if (it.type === 'dust') { ctx.drawImage(S.items.dust[(this.frame >> 5) % 3], x, y); return; }
      if (it.type === 'coin') { ctx.drawImage(S.items.coin[(this.frame >> 3) % 4], x, y - 2); return; }
      const bob = Math.round(Math.sin((this.frame + x) * 0.1) * 1);
      E.groundShadow(x + 3, y + 12, 10, 3, 0.25);
      if (it.age < 20 && (it.age >> 1) % 2) return;
      ctx.drawImage(S.items[it.type], x, y - 2 + bob);
    }

    drawDecor(d, ox, oy) {
      const img = E.spr.decor && E.spr.decor[d.kind];
      const x = ox + d.c * T, y = oy + d.r * T;
      const w = d.w || 3, h = d.h || 3;
      if (img) E.ctx.drawImage(img, x + Math.round((w * T - img.width) / 2), y + h * T - img.height);
      else for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) E.ctx.drawImage(E.spr.themes[this.themeKey].hard, x + c * T, y + r * T - 4);
    }

    drawMaid(m, ox, oy, front) {
      const S = m.outfit ? E.spr.outfits[m.maidKey][m.outfit] : E.spr.maids[m.maidKey];
      const ctx = E.ctx;
      const x = Math.round(ox + m.x), y = Math.round(oy + m.y);
      if (!m.alive) {
        if (m.deadT > 70) return;
        ctx.save();
        ctx.globalAlpha = Math.max(0, 1 - m.deadT / 70);
        const up = Math.min(20, m.deadT * 0.3);
        ctx.drawImage(S.burnt, x, y - 8 - up);
        for (let i = 0; i < 3; i++) {
          const a = m.deadT * 0.2 + (i * Math.PI * 2) / 3;
          ctx.drawImage(E.spr.fx.star[(m.deadT >> 3) % 2], Math.round(x + 6 + Math.cos(a) * 7), Math.round(y - 11 - up + Math.sin(a) * 2));
        }
        ctx.restore();
        return;
      }
      const win = this.state === 'clear' && this.mode === 'story' && m === this.maids[0] && m.burnT <= 0 ? this.victoryPose(m, S) : null;
      if (!front) E.groundShadow(x + 2, y + 13, 12, 3, 0.3);
      // hurt, she blinks; celebrating, she does not
      if (!win && m.inv > 0 && m.burnT <= 0 && (m.inv >> 2) % 2 === 0) return;
      let img;
      let vx = 0, vy = 0;
      if (m.burnT > 0) img = S.burnt;
      else if (win) { img = win.img; vx = win.dx || 0; vy = win.dy || 0; }
      else {
        const frames = S[m.dir];
        const f = m.moving ? [1, 0, 2, 0][(m.walkT >> 3) % 4] : 0;
        img = !m.moving && (this.frame + m.slot * 29) % 88 >= 72 ? S.breath[m.dir] : frames[f];
      }
      if (m.star > 0 && (m.star >> 1) % 2) {
        ctx.save();
        ctx.globalAlpha = 0.55;
        ctx.drawImage(img, x, y - 9);
        ctx.restore();
        ctx.drawImage(E.spr.fx.sparkle[(m.star >> 3) % 3], x + ((m.star * 7) % 14), y - 10 + ((m.star * 3) % 16));
      } else ctx.drawImage(img, x + vx, y - 8 + vy);
      if (m.burnT > 0 || m.stun > 0) {
        const t = this.frame * 0.15;
        for (let i = 0; i < 3; i++) {
          const a = t + (i * Math.PI * 2) / 3;
          ctx.drawImage(E.spr.fx.star[(this.frame >> 3) % 2], Math.round(x + 6 + Math.cos(a) * 7), Math.round(y - 11 + Math.sin(a) * 2));
        }
      }
      if (m.slashT > 0) {
        // the stroke crosses both tiles in front, the far arc a beat behind the near one
        const [dx, dy] = DV[m.dir];
        for (let n = 1; n <= G.SKILL.slashReach; n++) {
          const age = 14 - m.slashT - (n - 1) * 3;
          if (age < 0) continue;
          const sl = E.spr.fx.slash[Math.min(2, age >> 2)];
          ctx.save();
          ctx.translate(x + 8 + dx * 14 * n, y + 6 + dy * 14 * n);
          ctx.rotate(Math.atan2(dy, dx));
          ctx.drawImage(sl, -12, -12);
          ctx.restore();
        }
        if (m.slashT > 8) for (let i = 1; i < 16 * G.SKILL.slashReach; i += 3) E.rect(x + 8 + dx * i - (dy ? 3 : 0), y + 6 + dy * i - (dx ? 3 : 0), dy ? 7 : 2, dx ? 7 : 2, i % 2 ? '#ffffff' : '#d8d0f0');
      }
      // Berry's kick: an impact star at her foot
      if (m.kickT > 0) {
        const [dx, dy] = DV[m.dir];
        ctx.drawImage(E.spr.fx.star[(m.kickT >> 2) % 2], x + 6 + dx * 9, y + 6 + dy * 9);
      }
      // Yukino's remote: signal arcs blinking over her head
      if (m.remoteT > 0 && (m.remoteT >> 2) % 2) {
        for (let i = -2; i <= 2; i++) { E.rect(x + 8 + i, y - 16 - (Math.abs(i) === 2 ? 0 : 1), 1, 1, '#9ff3ff'); E.rect(x + 8 + i * 2, y - 19 + (Math.abs(i) < 2 ? -1 : 1), 1, 1, '#d8fbff'); }
      }
      // Honey's sugar shield: a shimmering pink bubble
      if (m.shield > 0) {
        const col = (this.frame >> 3) % 3 === 0 ? '#ffffff' : '#ffb0d0';
        pixelRing(x + 8, y + 3, 11, col);
        if ((this.frame >> 4) % 4 === 0) E.rect(x + 1, y - 5, 2, 2, '#ffffff');
      }
      // chilled by Yukino's frost: icy glints round the feet
      if (m.chill > 0 && (m.chill >> 2) % 2) {
        E.rect(x + 2, y + 13, 12, 1, '#9ff3ff');
        E.rect(x + 1 + ((m.chill * 3) % 13), y + 4 + ((m.chill * 5) % 8), 1, 1, '#ffffff');
      }
      if (this.mode === 'battle') {
        E.rect(x + 6, y - 14, 4, 2, m.color);
        E.text(String(m.slot + 1), x + 8, y - 22, { color: '#ffffff', outline: m.color, align: 'center', small: true });
      }
    }

    drawEnemy(e, ox, oy) {
      const S = E.spr.monsters[e.type];
      const ctx = E.ctx;
      const x = Math.round(ox + e.x), y = Math.round(oy + e.y);
      if (!e.alive) {
        if (e.deadT < 10) ctx.drawImage(S.white[0], x, y + 16 - S.white[0].height);
        return;
      }
      E.groundShadow(x + 2, y + 13, 12, 3, 0.3);
      const f = (e.animT >> 4) % 2;
      const frozen = this.freezeT > 0;
      let img = (e.dir === 'right' ? S.flipped : S.frames)[frozen || e.charm > 0 ? 0 : f];
      if (e.hitT > 0 && (e.hitT >> 2) % 2) img = S.white[0];
      // sprites stand on the tile's bottom edge whatever their height
      const top = y + 16 - img.height;
      ctx.drawImage(img, x, top);
      // frozen by Yukino's blast: iced over with a pale sheen and a glint
      if (e.frozen > 0) {
        ctx.save(); ctx.globalAlpha = 0.45; ctx.drawImage(S.white[0], x, y + 16 - S.white[0].height); ctx.restore();
        E.rect(x + 2, y + 15, 12, 1, '#9ff3ff');
        if ((e.frozen >> 3) % 2) { E.rect(x + 11, top + 3, 1, 3, '#ffffff'); E.rect(x + 10, top + 4, 3, 1, '#ffffff'); }
      }
      if (e.charm > 0) ctx.drawImage(E.spr.fx.heart, x + 6 + Math.round(Math.sin(this.frame * 0.2) * 3), top - 6 - ((this.frame >> 2) % 4));
      if (frozen) ctx.drawImage(E.spr.fx.sparkle[(this.frame >> 4) % 3], x + 11, top - 1);
    }

    drawBoss(ox, oy) {
      const B = this.boss;
      const S = (E.spr.bosses && E.spr.bosses[B.kind]) || E.spr.boss;
      const ctx = E.ctx;
      if (!B.alive && B.deadT > 110) return;
      const hover = B.kind === 'bear' ? Math.round(Math.sin(this.frame * 0.08) * 2) : 0;
      // the drill spins fast while charging; the spider's legs patter while it moves
      const rate = B.kind === 'drill' && (B.state === 'drill' || B.state === 'drillAim') ? 1 : B.kind === 'spider' && (B.state === 'move' || B.state === 'hop') ? 3 : 4;
      let img = S.frames[(this.frame >> rate) % 2];
      if ((B.hitT > 0 && (B.hitT >> 2) % 2) || (!B.alive && (B.deadT >> 2) % 2)) img = S.hurt;
      const jitter = B.state === 'drillAim' ? ((this.frame >> 1) % 2 ? 1 : -1) : 0;
      // each boss sprite has its own size: centre it on the boss and stand it on the same ground line
      const cx = Math.round(ox + B.x + jitter);
      const x = cx - (img.width >> 1), y = Math.round(oy + B.y + 10 - img.height + hover);
      const warn = B.state === 'dashAim' || B.state === 'fireAim';
      if (warn && (this.frame >> 2) % 2) ctx.drawImage(S.hurt, x, y);
      else ctx.drawImage(img, x, y);
      if (B.state === 'stuck') {
        for (let i = 0; i < 3; i++) {
          const a = this.frame * 0.12 + (i * Math.PI * 2) / 3;
          ctx.drawImage(E.spr.fx.star[0], Math.round(cx - 4 + Math.cos(a) * 13), Math.round(y + 2 + Math.sin(a) * 4));
        }
      }
      if (B.charm > 0) ctx.drawImage(E.spr.fx.heart, cx - 2, y - 8);
    }
  }

  // ------------------------------------------------------------------ CPU bomber AI
  class BomberAI {
    constructor(world, m, level) {
      this.w = world;
      this.m = m;
      this.level = level;
      this.path = [];
      this.goalKind = null;
      this.wait = E.randi(10, 40);
      this.pendingBomb = false;
      this.lastCell = -1;
      this.stuck = 0;
      this.skillTick = E.randi(0, 20);
    }
    framesPerTile() { return T / speedPx(this.m.speedLv); }

    passable(c, r) {
      if (!inb(c, r)) return false;
      const k = idx(c, r);
      if (this.w.grid[k] !== FLOOR) return false;
      const b = this.w.bombAt[k];
      if (b && !b.passers.has(this.m)) return false;
      if (this.w.mode === 'story') {
        for (const e of this.w.enemies) {
          if (!e.alive || e.charm > 0) continue;
          const [ec, er] = cellOf(e);
          if ((ec === c && er === r) || (e.tx === c && e.ty === r)) return false;
        }
      }
      return true;
    }

    safePathFrom(c, r, danger) {
      const fpt = this.framesPerTile();
      return this.w.bfsPath(c, r, (k) => danger[k] === Infinity && !this.w.falling.some((f) => idx(f.c, f.r) === k), (cc, rr, steps) => {
        if (!this.passable(cc, rr)) return false;
        const d = danger[idx(cc, rr)];
        const arrive = steps * fpt;
        return !(arrive + fpt + 4 > d && arrive < d + FLAME_DUR);
      }, 12);
    }

    // no clean escape: head for whichever reachable cell blows up last
    latestPath(c, r, danger) {
      const dist = new Int16Array(COLS * ROWS).fill(-1);
      const prev = new Int16Array(COLS * ROWS).fill(-1);
      const pdir = new Int8Array(COLS * ROWS).fill(-1);
      const start = idx(c, r);
      const q = [start];
      dist[start] = 0;
      let best = start, bestVal = danger[start], head = 0;
      while (head < q.length) {
        const k = q[head++];
        const val = danger[k] - dist[k] * 2;
        if (val > bestVal) { bestVal = val; best = k; }
        if (dist[k] >= 6) continue;
        const kc = k % COLS, kr = (k / COLS) | 0;
        for (let di = 0; di < 4; di++) {
          const nc = kc + DV[DIRS[di]][0], nr = kr + DV[DIRS[di]][1];
          if (!this.passable(nc, nr)) continue;
          const nk = idx(nc, nr);
          if (dist[nk] >= 0 || danger[nk] <= (dist[k] + 1) * this.framesPerTile()) continue;
          dist[nk] = dist[k] + 1; prev[nk] = k; pdir[nk] = di;
          q.push(nk);
        }
      }
      if (best === start) return null;
      const path = [];
      let cur = best;
      while (cur !== start) { path.unshift(DIRS[pdir[cur]]); cur = prev[cur]; }
      return path;
    }

    opponentsInLine(c, r, fire) {
      let hits = 0;
      const targets = this.w.mode === 'story' ? this.w.enemies : this.w.maids;
      for (const o of targets) {
        if (o === this.m || !o.alive) continue;
        const [oc, or] = cellOf(o);
        if (oc === c && or === r) { hits++; continue; }
        for (const d of DIRS) {
          let cut = 0;
          for (let n = 1; n <= fire; n++) {
            const cc = c + DV[d][0] * n, rr = r + DV[d][1] * n;
            if (!inb(cc, rr)) break;
            const cell = this.w.grid[idx(cc, rr)];
            if (cell === SOFT && cut < (this.m.pierce || 0)) { cut++; continue; }
            if (cell !== FLOOR) break;
            if (cc === oc && rr === or) hits++;
          }
        }
      }
      return hits;
    }
    // first rival straight ahead within n clear floor tiles
    rivalAhead(c, r, dir, n) {
      const [dx, dy] = DV[dir];
      for (let i = 1; i <= n; i++) {
        const cc = c + dx * i, rr = r + dy * i;
        if (!inb(cc, rr) || this.w.grid[idx(cc, rr)] !== FLOOR) return null;
        if (i > 1 && this.w.bombAt[idx(cc, rr)]) return null;
        const o = this.w.maids.find((x) => x !== this.m && x.alive && cellOf(x)[0] === cc && cellOf(x)[1] === rr);
        if (o) return { o, dist: i };
      }
      return null;
    }
    softsInBlast(c, r, fire) {
      let n = 0;
      for (const d of DIRS) {
        for (let i = 1; i <= fire; i++) {
          const cc = c + DV[d][0] * i, rr = r + DV[d][1] * i;
          if (!inb(cc, rr)) break;
          const v = this.w.grid[idx(cc, rr)];
          if (v === SOFT) { n++; break; }
          if (v !== FLOOR) break;
        }
      }
      return n;
    }

    canEscapeAfterBomb(c, r) {
      const extra = { c, r, fire: this.m.fire, pierce: this.m.pierce || 0, t: this.m.fuse };
      const danger = this.w.dangerMap(extra);
      const fpt = this.framesPerTile();
      const path = this.w.bfsPath(c, r, (k) => danger[k] === Infinity, (cc, rr, steps) => {
        if (!inb(cc, rr)) return false;
        const k = idx(cc, rr);
        if (this.w.grid[k] !== FLOOR || this.w.bombAt[k]) return false;
        const arrive = steps * fpt;
        const d = danger[k];
        return !(arrive + fpt + 6 > d && arrive < d + FLAME_DUR);
      }, 10);
      return path && path.length * fpt < this.m.fuse - 25 ? path : null;
    }

    chooseGoal(c, r, danger) {
      const w = this.w, m = this.m;
      const fpt = this.framesPerTile();
      let best = null, bestScore = -Infinity;
      const prev = new Int16Array(COLS * ROWS).fill(-1);
      const dist = new Int16Array(COLS * ROWS).fill(-1);
      const pdir = new Int8Array(COLS * ROWS).fill(-1);
      const start = idx(c, r);
      const q = [start];
      dist[start] = 0;
      let head = 0;
      while (head < q.length) {
        const k = q[head++];
        const kc = k % COLS, kr = (k / COLS) | 0;
        const dsteps = dist[k];
        // score this tile
        let score = -Infinity;
        const it = w.items[k];
        if (it && it.type !== 'dust' && it.type !== 'coin') score = 60 - dsteps * 3;
        if (m.active < m.bombs) {
          const s = this.softsInBlast(kc, kr, m.fire);
          if (s) score = Math.max(score, 18 + s * 8 - dsteps * 2.2);
          const o = this.opponentsInLine(kc, kr, m.fire);
          if (o) score = Math.max(score, 30 + o * 20 * this.level - dsteps * 3);
        }
        if (danger[k] !== Infinity) score = -Infinity;
        else if (score === -Infinity && k !== start) score = -100 + Math.random() * 20 - dsteps; // wander target
        if (score > bestScore && (k !== start || score > 25)) { bestScore = score; best = k; }
        if (dsteps >= 14) continue;
        for (let di = 0; di < 4; di++) {
          const nc = kc + DV[DIRS[di]][0], nr = kr + DV[DIRS[di]][1];
          if (!this.passable(nc, nr)) continue;
          const nk = idx(nc, nr);
          if (dist[nk] >= 0) continue;
          const arrive = (dsteps + 1) * fpt;
          const dd = danger[nk];
          if (arrive + fpt > dd && arrive < dd + FLAME_DUR) continue;
          dist[nk] = dsteps + 1;
          prev[nk] = k;
          pdir[nk] = di;
          q.push(nk);
        }
      }
      if (best == null) return null;
      const path = [];
      let cur = best;
      while (cur !== start) { path.unshift(DIRS[pdir[cur]]); cur = prev[cur]; }
      const it = w.items[best];
      const kind = it && it.type !== 'dust' && it.type !== 'coin' ? 'item' : bestScore > -50 ? 'bomb' : 'wander';
      return { path: kind === 'wander' ? path.slice(0, 4) : path, k: best, kind };
    }

    update() {
      const w = this.w, m = this.m;
      const out = { dir: null, bomb: false, skill: false };
      if (w.state !== 'play' || m.stun > 0 || m.burnT > 20) { this.path = []; this.stepTarget = null; return out; }
      const [c, r] = cellOf(m);
      const k = idx(c, r);
      const aligned = Math.abs(m.x - c * T) < 0.01 && Math.abs(m.y - r * T) < 0.01;
      const danger = w.dangerMap();

      if (--this.skillTick <= 0) {
        this.skillTick = 12;
        out.skill = this.wantSkill(c, r);
      }

      if (aligned) {
        m.x = c * T; m.y = r * T;
        if (danger[k] !== Infinity) {
          this.path = this.safePathFrom(c, r, danger) || this.latestPath(c, r, danger) || [];
          this.goalKind = 'flee';
          this.wait = 0;
        } else {
          if (this.wait > 0) { this.wait--; return out; }
          if (!this.path.length) {
            if (this.goalKind === 'bomb' && m.active < m.bombs && (this.softsInBlast(c, r, m.fire) || this.opponentsInLine(c, r, m.fire))) {
              const esc = this.canEscapeAfterBomb(c, r);
              if (esc) { out.bomb = true; this.path = esc; this.goalKind = 'flee'; }
            }
            if (!this.path.length) {
              const g = this.chooseGoal(c, r, danger);
              if (g && g.path.length) { this.path = g.path; this.goalKind = g.kind; }
              else if (g) { this.goalKind = g.kind; this.wait = 6; }
              else { this.goalKind = null; this.wait = 16; }
            }
          } else if (this.goalKind !== 'flee' && m.active < m.bombs && this.opponentsInLine(c, r, m.fire) && Math.random() < 0.12 * this.level) {
            const esc = this.canEscapeAfterBomb(c, r);
            if (esc) { out.bomb = true; this.path = esc; this.goalKind = 'flee'; }
          }
          if (this.path.length && !out.bomb) {
            const d0 = this.path[0];
            const nc = c + DV[d0][0], nr = r + DV[d0][1];
            if (!this.passable(nc, nr)) { this.path = []; return out; }
            if (danger[idx(nc, nr)] !== Infinity && this.goalKind !== 'flee') { this.path = []; this.wait = 8; return out; }
          }
        }
      }
      return this.follow(out, c, r, aligned);
    }

    // walk the planned path one cell at a time, snapping onto each cell centre
    follow(out, c, r, aligned) {
      const m = this.m;
      if (!this.path.length) {
        this.stepTarget = null;
        if (!aligned) {
          const dx = c * T - m.x, dy = r * T - m.y;
          if (Math.abs(dx) + Math.abs(dy) <= speedPx(m.speedLv) + 0.01) { m.x = c * T; m.y = r * T; }
          else out.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
        }
        return out;
      }
      if (aligned || !this.stepTarget) this.stepTarget = [c + DV[this.path[0]][0], r + DV[this.path[0]][1]];
      const [tc, tr] = this.stepTarget;
      const dist = Math.abs(m.x - tc * T) + Math.abs(m.y - tr * T);
      if (dist <= speedPx(m.speedLv) + 0.01) {
        m.x = tc * T; m.y = tr * T;
        this.path.shift();
        this.stepTarget = null;
        return out;
      }
      if (dist > T + 2) { this.path = []; this.stepTarget = null; return out; }
      out.dir = this.path[0];
      const px = m.x, py = m.y;
      this.lastPos = this.lastPos || [px, py, 0];
      if (Math.abs(this.lastPos[0] - px) < 0.01 && Math.abs(this.lastPos[1] - py) < 0.01) {
        if (++this.lastPos[2] > 30) { this.path = []; this.stepTarget = null; this.lastPos[2] = 0; this.wait = 10; }
      } else this.lastPos = [px, py, 0];
      return out;
    }

    wantSkill(c, r) {
      const w = this.w, m = this.m;
      const [dx, dy] = DV[m.dir];
      const opps = w.maids.filter((o) => o !== m && o.alive);
      const S = G.SKILL;
      if (m.sp < m.skillCost) return false;
      const danger = w.dangerMap();
      switch (m.maidKey) {
        // turn to face a rival in a clear line and send an impact bomb at them
        case 'berry': {
          if (danger[idx(c, r)] !== Infinity) return false;
          for (const d of DIRS) {
            const hit = this.rivalAhead(c, r, d, 8);
            // far enough that the burst can't reach back to her
            if (!hit || (!S.kickSelfSafe && hit.dist < m.fire + 2) || hit.dist < 2) continue;
            const [ddx, ddy] = DV[d];
            const ahead = w.bombAt[idx(c + ddx, r + ddy)];
            if (ahead || (m.active < m.bombs && !w.bombAt[idx(c, r)] && Math.random() < 0.5)) { m.dir = d; return true; }
          }
          return false;
        }
        // cut down a rival or an incoming bomb within reach; now and then clear a crate ahead
        case 'yoru': {
          for (const d of DIRS) {
            const hit = this.rivalAhead(c, r, d, S.slashReach);
            if (hit) { m.dir = d; return true; }
          }
          for (let n = 1; n <= S.slashReach; n++) {
            const b = w.bombAt[idx(c + dx * n, r + dy * n)];
            if (b && b.owner !== m && danger[idx(c, r)] !== Infinity) return true;
          }
          return w.grid[idx(c + dx, r + dy)] === SOFT && Math.random() < 0.2;
        }
        // daze rivals who come close, or rebuild a broken shield when the gauge is full
        case 'honey': {
          if (opps.some((o) => Math.hypot(o.x - m.x, o.y - m.y) < (S.stunRadius - 0.5) * T)) return true;
          return !m.shield && m.sp >= 99 && Math.random() < 0.3;
        }
        // set her bombs off when a rival stands in a (boosted) blast line and she is clear of it
        case 'yukino': {
          const mine = w.bombs.filter((b) => b.owner === m && !b.dead);
          if (!mine.length || danger[idx(c, r)] !== Infinity) return false;
          for (const b of mine) {
            const reach = b.fire + S.remoteBoost;
            if (Math.abs(c - b.c) + Math.abs(r - b.r) <= reach && (c === b.c || r === b.r)) return false;
            for (const o of opps) {
              const [oc, or] = cellOf(o);
              if ((oc === b.c && Math.abs(or - b.r) <= reach) || (or === b.r && Math.abs(oc - b.c) <= reach)) return true;
            }
          }
          return false;
        }
      }
      return false;
    }
  }

  G.World = World;
  G.pixelRing = pixelRing;
  G.GAME = { T, COLS, ROWS, FX, FY, speedPx };
})(window);
