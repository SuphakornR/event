/* Real-progress loading screen: tracks DOMContentLoaded, fonts.ready, and window.load with zero artificial delay. */
(() => {
  document.body.insertAdjacentHTML('afterbegin', `
    <div id="app-loader" role="status" aria-live="polite" style="cursor: url(&quot;data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='26' height='26' viewBox='0 0 26 26'%3E%3Cpath d='M4 3 L20 13 L12.5 15 L9.5 22 Z' transform='translate(2 2)' fill='%23111111'/%3E%3Cpath d='M4 3 L20 13 L12.5 15 L9.5 22 Z' fill='%23F4D03F' stroke='%23111111' stroke-width='2.2' stroke-linejoin='round'/%3E%3C/svg%3E&quot;) 4 3, auto;">
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
    loaderEl.classList.add('is-done');
    setTimeout(() => loaderEl.remove(), 320);
  };

  if (document.readyState === 'interactive' || document.readyState === 'complete') {
    setProgress(55);
  } else {
    document.addEventListener('DOMContentLoaded', () => setProgress(55), { once: true });
  }

  let fontsDone = false;
  let domDone = document.readyState === 'interactive' || document.readyState === 'complete';
  const needsStageReady = () => Boolean(document.getElementById('stage-container'));
  let stageDone = !needsStageReady() || Boolean(window.__voxStageReady);

  const checkDone = () => {
    if (fontsDone && domDone && stageDone) {
      requestAnimationFrame(() => requestAnimationFrame(finish));
    }
  };

  if (!stageDone) {
    window.addEventListener('vox-stage-ready', () => {
      stageDone = true;
      setProgress(90);
      checkDone();
    }, { once: true });
  }

  if (domDone) {
    if (!needsStageReady()) stageDone = true;
    setProgress(75);
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      domDone = true;
      if (!needsStageReady() || window.__voxStageReady) stageDone = true;
      setProgress(stageDone ? 85 : 70);
      checkDone();
    }, { once: true });
  }

  if (document.fonts?.ready) {
    Promise.race([
      document.fonts.ready,
      new Promise((resolve) => setTimeout(resolve, 180))
    ]).then(() => {
      fontsDone = true;
      setProgress(domDone ? 100 : 85);
      checkDone();
    }).catch(() => {
      fontsDone = true;
      checkDone();
    });
  } else {
    fontsDone = true;
    checkDone();
  }

  // Safety timeout in case a slow external CDN/font hangs
  setTimeout(finish, 750);

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
