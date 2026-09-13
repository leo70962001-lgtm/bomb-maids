/* 炸彈女僕 BOMB MAIDS — pixel buffer helpers (runs in browser and in node for previews) */
(function (G) {
  'use strict';

  const cache = new Map();
  function rgba(hex) {
    if (Array.isArray(hex)) return hex;
    let c = cache.get(hex);
    if (c) return c;
    let h = hex.charAt(0) === '#' ? hex.slice(1) : hex;
    if (h.length === 3 || h.length === 4) h = h.split('').map((ch) => ch + ch).join('');
    c = [
      parseInt(h.slice(0, 2), 16),
      parseInt(h.slice(2, 4), 16),
      parseInt(h.slice(4, 6), 16),
      h.length >= 8 ? parseInt(h.slice(6, 8), 16) : 255,
    ];
    cache.set(hex, c);
    return c;
  }

  function mix(a, b, t) {
    const A = rgba(a), B = rgba(b);
    return [
      Math.round(A[0] + (B[0] - A[0]) * t),
      Math.round(A[1] + (B[1] - A[1]) * t),
      Math.round(A[2] + (B[2] - A[2]) * t),
      255,
    ];
  }

  // Deterministic hash noise in [0,1)
  function hash(x, y, s) {
    let n = (x * 374761393 + y * 668265263 + (s || 0) * 2147483647) | 0;
    n = (n ^ (n >>> 13)) * 1274126177;
    n = n ^ (n >>> 16);
    return ((n >>> 0) % 10000) / 10000;
  }

  class Pix {
    constructor(w, h) {
      this.w = w;
      this.h = h;
      this.d = new Uint8ClampedArray(w * h * 4);
    }
    inside(x, y) {
      return x >= 0 && y >= 0 && x < this.w && y < this.h;
    }
    set(x, y, col) {
      x |= 0; y |= 0;
      if (!this.inside(x, y) || col == null) return;
      const c = rgba(col);
      if (c[3] === 0) return;
      const i = (y * this.w + x) * 4;
      this.d[i] = c[0]; this.d[i + 1] = c[1]; this.d[i + 2] = c[2]; this.d[i + 3] = c[3];
    }
    clear(x, y) {
      if (!this.inside(x, y)) return;
      const i = (y * this.w + x) * 4;
      this.d[i + 3] = 0;
    }
    get(x, y) {
      if (!this.inside(x, y)) return null;
      const i = (y * this.w + x) * 4;
      if (this.d[i + 3] === 0) return null;
      return [this.d[i], this.d[i + 1], this.d[i + 2], this.d[i + 3]];
    }
    solid(x, y) {
      if (!this.inside(x, y)) return false;
      return this.d[(y * this.w + x) * 4 + 3] > 0;
    }
    rect(x, y, w, h, col) {
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, col);
      return this;
    }
    hline(x, y, w, col) { return this.rect(x, y, w, 1, col); }
    vline(x, y, h, col) { return this.rect(x, y, 1, h, col); }
    // filled ellipse inside box
    oval(x, y, w, h, col) {
      const cx = x + w / 2 - 0.5, cy = y + h / 2 - 0.5, rx = w / 2, ry = h / 2;
      for (let j = 0; j < h; j++)
        for (let i = 0; i < w; i++) {
          const dx = (x + i - cx) / rx, dy = (y + j - cy) / ry;
          if (dx * dx + dy * dy <= 1.0) this.set(x + i, y + j, col);
        }
      return this;
    }
    blit(src, dx, dy, flip) {
      for (let y = 0; y < src.h; y++)
        for (let x = 0; x < src.w; x++) {
          const i = (y * src.w + x) * 4;
          if (src.d[i + 3] === 0) continue;
          const tx = flip ? dx + src.w - 1 - x : dx + x;
          const ty = dy + y;
          if (!this.inside(tx, ty)) continue;
          const o = (ty * this.w + tx) * 4;
          this.d[o] = src.d[i]; this.d[o + 1] = src.d[i + 1]; this.d[o + 2] = src.d[i + 2]; this.d[o + 3] = src.d[i + 3];
        }
      return this;
    }
    clone() {
      const p = new Pix(this.w, this.h);
      p.d.set(this.d);
      return p;
    }
    flipped() {
      const p = new Pix(this.w, this.h);
      p.blit(this, 0, 0, true);
      return p;
    }
    // map every opaque pixel through fn([r,g,b,a], x, y) -> color|null
    map(fn) {
      const p = new Pix(this.w, this.h);
      for (let y = 0; y < this.h; y++)
        for (let x = 0; x < this.w; x++) {
          const c = this.get(x, y);
          if (!c) continue;
          const n = fn(c, x, y);
          if (n) p.set(x, y, n);
        }
      return p;
    }
    // 1px outline around opaque pixels (outside only)
    outlined(col) {
      const p = new Pix(this.w, this.h);
      for (let y = 0; y < this.h; y++)
        for (let x = 0; x < this.w; x++) {
          if (this.solid(x, y)) continue;
          if (this.solid(x - 1, y) || this.solid(x + 1, y) || this.solid(x, y - 1) || this.solid(x, y + 1)) p.set(x, y, col);
        }
      p.blit(this, 0, 0);
      return p;
    }
  }

  // Build a Pix from string rows + palette object; '.' and ' ' are transparent, '|' is a
  // visual separator used while authoring and is stripped.
  function fromRows(rows, pal, w) {
    rows = rows.map((r) => r.replace(/\|/g, ''));
    const h = rows.length;
    w = w || Math.max.apply(null, rows.map((r) => r.length));
    const p = new Pix(w, h);
    for (let y = 0; y < h; y++) {
      const row = rows[y];
      for (let x = 0; x < row.length; x++) {
        const ch = row.charAt(x);
        if (ch === '.' || ch === ' ') continue;
        const col = pal[ch];
        if (col === undefined) throw new Error('palette missing "' + ch + '" in row ' + y + ': ' + row);
        if (col) p.set(x, y, col);
      }
    }
    return p;
  }

  G.PX = { Pix, rgba, mix, hash, fromRows };
})(typeof window !== 'undefined' ? window : globalThis);
