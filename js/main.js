/* 炸彈女僕 BOMB MAIDS — boot */
(function (G) {
  'use strict';
  const E = G.E;

  function setupTouch() {
    const pad = document.getElementById('pad');
    if (!pad) return;
    const markTouch = () => { document.body.classList.add('touch'); E.input.lastDevice = 'touch'; };
    window.addEventListener('touchstart', markTouch, { once: true, passive: true });
    if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) markTouch();

    // d-pad: one surface, direction follows the finger
    const dpad = document.getElementById('dpad');
    const dirs = ['up', 'down', 'left', 'right'];
    let dpadId = null;
    const setDir = (d) => {
      for (const k of dirs) E.setTouch(k, k === d);
      dpad.dataset.dir = d || '';
    };
    const fromPoint = (e) => {
      const r = dpad.getBoundingClientRect();
      let dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
      if (E.rotated) [dx, dy] = [dy, -dx]; // the pad is turned with the game
      if (Math.hypot(dx, dy) < r.width * 0.12) return null;
      return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
    };
    dpad.addEventListener('pointerdown', (e) => { dpadId = e.pointerId; dpad.setPointerCapture(e.pointerId); setDir(fromPoint(e)); e.preventDefault(); });
    dpad.addEventListener('pointermove', (e) => { if (e.pointerId === dpadId) setDir(fromPoint(e)); });
    const endD = (e) => { if (e.pointerId === dpadId) { dpadId = null; setDir(null); } };
    dpad.addEventListener('pointerup', endD);
    dpad.addEventListener('pointercancel', endD);

    for (const btn of pad.querySelectorAll('[data-btn]')) {
      const name = btn.dataset.btn;
      const on = (e) => { btn.setPointerCapture(e.pointerId); E.setTouch(name, true); btn.classList.add('on'); e.preventDefault(); };
      const off = () => { E.setTouch(name, false); btn.classList.remove('on'); };
      btn.addEventListener('pointerdown', on);
      btn.addEventListener('pointerup', off);
      btn.addEventListener('pointercancel', off);
    }
    pad.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  // full screen: the Fullscreen API where the browser offers it (Android, desktop);
  // iPhone Safari does not, so explain Add to Home Screen, which launches the game without browser bars
  function toast(text) {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = text;
    el.hidden = false;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => { el.hidden = true; }, 7000);
    el.onclick = () => { el.hidden = true; };
  }
  function setupFullscreen() {
    const btn = document.getElementById('fullscreen');
    if (!btn) return;
    const mq = (q) => window.matchMedia && window.matchMedia(q).matches;
    if (mq('(display-mode: fullscreen)') || mq('(display-mode: standalone)') || navigator.standalone) { btn.hidden = true; return; }
    const root = document.documentElement;
    const request = root.requestFullscreen || root.webkitRequestFullscreen;
    const exit = document.exitFullscreen || document.webkitExitFullscreen;
    const current = () => document.fullscreenElement || document.webkitFullscreenElement;
    const sync = () => { btn.classList.toggle('is-full', !!current()); E.fit(); };
    document.addEventListener('fullscreenchange', sync);
    document.addEventListener('webkitfullscreenchange', sync);
    btn.addEventListener('click', () => {
      E.audio.unlock();
      if (current()) exit.call(document);
      else if (request) {
        const p = request.call(root, { navigationUI: 'hide' });
        if (p && p.catch) p.catch(() => toast(G.t('無法切換成全螢幕。')));
      } else {
        toast(G.t('這個瀏覽器不支援全螢幕。iPhone 請點「分享」→「加入主畫面」，從主畫面打開就能全螢幕遊玩。'));
      }
      E.canvas.focus();
    });
  }

  // sideways play: some browsers (in-app ones especially) keep a phone upright, so the game can turn itself instead.
  // The choice is remembered; really turning the phone to landscape drops it.
  function setupRotate() {
    const btn = document.getElementById('rotate');
    if (!btn) return;
    const KEY = 'bomb-maids-sideways';
    const landscape = window.matchMedia && window.matchMedia('(orientation: landscape)');
    const apply = (on) => {
      document.body.classList.toggle('rot', on);
      E.rotated = on;
      try { localStorage.setItem(KEY, on ? '1' : ''); } catch (err) { /* private mode */ }
      E.fit();
    };
    btn.addEventListener('click', () => { E.audio.unlock(); apply(!E.rotated); E.canvas.focus(); });
    if (landscape) {
      const drop = () => { if (landscape.matches && E.rotated) apply(false); };
      if (landscape.addEventListener) landscape.addEventListener('change', drop);
      else if (landscape.addListener) landscape.addListener(drop);
    }
    let saved = '';
    try { saved = localStorage.getItem(KEY); } catch (err) { /* private mode */ }
    if (saved === '1' && !(landscape && landscape.matches)) apply(true);
  }

  function boot() {
    const canvas = document.getElementById('screen');
    E.holder = document.getElementById('holder');
    E.holderPad = 40;
    E.init(canvas);
    E.bindInput();
    E.bindPointer(canvas);
    E.loadArt();
    G.initSave();
    setupTouch();
    setupFullscreen();
    setupRotate();
    canvas.addEventListener('pointerdown', () => { canvas.focus(); E.audio.unlock(); E.input.tapped = true; });
    E.go(G.SCENES.title, null, true);
    E.run();
    if (window.ResizeObserver) new ResizeObserver(() => E.fit()).observe(E.holder);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(window);
