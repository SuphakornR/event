/* Real-progress loading screen: tracks DOMContentLoaded, fonts.ready, and window.load with zero artificial delay. */
(() => {
  document.body.insertAdjacentHTML('afterbegin', `
    <div id="app-loader" role="status" aria-live="polite">
      <div class="inline-flex items-center gap-2 bg-[#111111] text-[#F8F6F0] px-3 py-1 rounded-md font-display font-extrabold text-xs tracking-widest shadow-[3px_3px_0px_#F4D03F]">
        <span class="w-2 h-2 rounded-full bg-[#F4D03F]"></span>
        <span>HELPDAI • EVENT TOOLKIT</span>
      </div>
      <div class="loader-stage">
        <svg viewBox="0 0 48 48" class="loader-shape loader-square" aria-hidden="true">
          <path d="M9 9 H35 V35 H9 Z" transform="translate(3.5 3.5)" fill="#111111"/>
          <path d="M9 9 H35 V35 H9 Z" fill="#F4D03F" stroke="#111111" stroke-width="2.6" stroke-linejoin="round"/>
        </svg>
        <svg viewBox="0 0 48 48" class="loader-shape loader-triangle" aria-hidden="true">
          <path d="M22 7 L40 38 H4 Z" transform="translate(3.5 3.5)" fill="#111111"/>
          <path d="M22 7 L40 38 H4 Z" fill="#E74C3C" stroke="#111111" stroke-width="2.6" stroke-linejoin="round"/>
        </svg>
        <svg viewBox="0 0 48 48" class="loader-shape loader-circle" aria-hidden="true">
          <circle cx="22" cy="22" r="16" transform="translate(3.5 3.5)" fill="#111111"/>
          <circle cx="22" cy="22" r="16" fill="#2980B9" stroke="#111111" stroke-width="2.6"/>
        </svg>
      </div>
      <div class="flex flex-col items-center gap-2">
        <div class="loader-bar"><div id="loader-bar-fill" class="loader-bar-fill"></div></div>
        <span id="loader-pct" class="font-display font-extrabold text-xs tracking-[0.2em] text-[#111111]">LOADING • 15%</span>
      </div>
    </div>`);

  const loaderEl = document.getElementById('app-loader');
  const fillEl = document.getElementById('loader-bar-fill');
  const pctEl = document.getElementById('loader-pct');
  let progress = 15;
  let finished = false;

  const setProgress = (next) => {
    if (finished || next <= progress) return;
    progress = Math.min(100, next);
    if (fillEl) fillEl.style.width = `${progress}%`;
    if (pctEl) pctEl.textContent = progress >= 100 ? 'READY • 100%' : `LOADING • ${progress}%`;
  };

  const finish = () => {
    if (finished) return;
    setProgress(100);
    finished = true;
    setTimeout(() => {
      loaderEl.classList.add('is-done');
      setTimeout(() => loaderEl.remove(), 520);
    }, 180);
  };

  if (document.readyState === 'interactive' || document.readyState === 'complete') {
    setProgress(55);
  } else {
    document.addEventListener('DOMContentLoaded', () => setProgress(55), { once: true });
  }

  let fontsDone = false;
  let winDone = document.readyState === 'complete';

  const checkDone = () => {
    if (fontsDone && winDone) finish();
  };

  if (document.fonts?.ready) {
    document.fonts.ready.then(() => {
      fontsDone = true;
      setProgress(winDone ? 100 : 85);
      checkDone();
    }).catch(() => {
      fontsDone = true;
      checkDone();
    });
  } else {
    fontsDone = true;
  }

  if (winDone) {
    setProgress(85);
    checkDone();
  } else {
    window.addEventListener('load', () => {
      winDone = true;
      setProgress(fontsDone ? 100 : 85);
      checkDone();
    }, { once: true });
  }

  // Safety timeout in case a slow external CDN/font hangs
  setTimeout(finish, 6000);

  // Auto-hide custom Vox cursor after 2.8s of mouse inactivity
  let idleCursorTimer = null;
  const IDLE_MS = 2800;
  const resetIdleCursor = () => {
    document.documentElement.classList.remove('vox-cursor-idle');
    if (idleCursorTimer) clearTimeout(idleCursorTimer);
    idleCursorTimer = setTimeout(() => {
      document.documentElement.classList.add('vox-cursor-idle');
    }, IDLE_MS);
  };
  ['pointermove', 'mousedown', 'wheel', 'touchstart', 'focus'].forEach((evt) => {
    window.addEventListener(evt, resetIdleCursor, { passive: true });
  });
  resetIdleCursor();
})();
