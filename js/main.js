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
      const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
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
    canvas.addEventListener('pointerdown', () => { canvas.focus(); E.audio.unlock(); E.input.tapped = true; });
    E.go(G.SCENES.title, null, true);
    E.run();
    if (window.ResizeObserver) new ResizeObserver(() => E.fit()).observe(E.holder);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(window);
