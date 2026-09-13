/* 炸彈女僕 BOMB MAIDS — languages: 日本語 (default), 中文, English
   Source strings are the Traditional Chinese text already in the code and data;
   G.TR maps each of them to [Japanese, English]. */
(function (G) {
  'use strict';

  G.LANGS = ['ja', 'zh', 'en'];
  G.LANG_NAMES = { ja: '日本語', zh: '中文', en: 'English' };
  G.LANG = 'ja';
  const TR = (G.TR = {});
  const missing = (G.I18N_MISSING = new Set());
  const outputs = new Set(); // already-translated text passed through G.t again is not missing

  G.addTr = function (table) {
    for (const k of Object.keys(table)) { TR[k] = table[k]; outputs.add(table[k][0]); }
  };

  // translate a source (Chinese) string; {name} placeholders are filled from vars
  G.t = function (src, vars) {
    let out = src;
    if (G.LANG !== 'zh' && typeof src === 'string') {
      const e = TR[src];
      const v = e && e[G.LANG === 'ja' ? 0 : 1];
      if (v != null) out = v;
      else if (/[㐀-鿿]/.test(src) && !outputs.has(src)) missing.add(src);
    }
    if (vars) out = out.replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? String(vars[k]) : m));
    return out;
  };

  // multi-part sentences: Chinese and Japanese run together, English needs a space
  G.joinLines = (parts) => parts.map((p) => p.trim()).join(G.LANG === 'en' ? ' ' : '');

  // ---------------------------------------------------------------- game data
  // Walk the data tables and swap every translatable string for the current language.
  const ORIGIN = new WeakMap();
  const SKIP = new Set(['id', 'theme', 'layout', 'decor', 'ai', 'icon', 'anim', 'use', 'layer', 'fav', 'kind', 'ref', 'color', 'en', 'key', 'boss']);
  function localise(obj) {
    if (!obj || typeof obj !== 'object') return;
    let orig = ORIGIN.get(obj);
    if (!orig) { orig = {}; ORIGIN.set(obj, orig); }
    for (const k of Object.keys(obj)) {
      if (SKIP.has(k)) continue;
      const v = obj[k];
      if (typeof v === 'string' || (k in orig)) {
        if (!(k in orig)) orig[k] = v;
        obj[k] = G.t(orig[k]);
      } else if (v && typeof v === 'object') localise(v);
    }
  }
  const DATA_ROOTS = ['OUTFITS', 'MAID_DATA', 'ENEMY_DATA', 'STAGES', 'MENU_FOOD', 'UPGRADES', 'CARDS', 'ROOM_SIZES', 'WALLPAPERS', 'FLOORS', 'FURNITURE', 'GIFTS', 'AFF_LEVELS', 'TRAININGS', 'INTRO_LINES', 'GUIDE', 'MORNING_EVENTS', 'LINES'];

  const listeners = [];
  G.onLang = (fn) => listeners.push(fn);

  G.setLang = function (lang) {
    if (!G.LANGS.includes(lang)) lang = 'ja';
    G.LANG = lang;
    for (const r of DATA_ROOTS) localise(G[r]);
    if (typeof document !== 'undefined') {
      document.documentElement.lang = { ja: 'ja', zh: 'zh-Hant', en: 'en' }[lang];
      for (const el of document.querySelectorAll('[data-i18n]')) el.textContent = G.t(el.getAttribute('data-i18n'));
      for (const el of document.querySelectorAll('[data-i18n-label]')) el.setAttribute('aria-label', G.t(el.getAttribute('data-i18n-label')));
    }
    for (const fn of listeners) fn(lang);
  };
})(window);
