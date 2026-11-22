/* Vox Event Toolbox Toolbar (Left-Side Default, Switchable Left <-> Right) */
(() => {
  const SIDE_KEY = 'vox_toolbox_side_v1';
  let side = 'left';
  try {
    side = localStorage.getItem(SIDE_KEY) === 'right' ? 'right' : 'left';
  } catch (_) {}

  let audioCtx = null;
  function getCtx() {
    if (!audioCtx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (Ctx) audioCtx = new Ctx();
    }
    if (audioCtx?.state === 'suspended') audioCtx.resume().catch(() => {});
    return audioCtx;
  }

  function playSfx(kind) {
    try {
      const ctx = getCtx();
      if (!ctx) return;
      const now = ctx.currentTime;
      if (kind === 'bell') {
        [880, 1318.5].forEach((f, i) => {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.type = 'sine';
          o.frequency.setValueAtTime(f, now + i * 0.08);
          g.gain.setValueAtTime(0.11, now + i * 0.08);
          g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.45);
          o.connect(g); g.connect(ctx.destination);
          o.start(now + i * 0.08); o.stop(now + i * 0.08 + 0.46);
        });
      } else if (kind === 'buzzer') {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(165, now);
        o.frequency.linearRampToValueAtTime(125, now + 0.42);
        g.gain.setValueAtTime(0.09, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
        o.connect(g); g.connect(ctx.destination);
        o.start(now); o.stop(now + 0.46);
      } else {
        [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.type = 'triangle';
          o.frequency.setValueAtTime(f, now + i * 0.07);
          g.gain.setValueAtTime(0.09, now + i * 0.07);
          g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.35);
          o.connect(g); g.connect(ctx.destination);
          o.start(now + i * 0.07); o.stop(now + i * 0.07 + 0.36);
        });
      }
    } catch (_) {}
  }

  function initToolbox() {
    if (!document.getElementById('stage-container')) return;
    if (window.VoxCloudSync?.isDisplayMode?.() || new URLSearchParams(window.location.search).get('display') === '1') {
      document.getElementById('header-screenshare-btn')?.classList.add('hidden');
      return;
    }

    const bar = document.createElement('div');
    bar.id = 'vox-toolbox';
    bar.className = 'fixed top-1/2 -translate-y-1/2 z-40 vox-card bg-[#F8F6F0] p-1.5 flex flex-col gap-1.5 transition-all duration-200';
    bar.setAttribute('aria-label', 'กล่องเครื่องมือ');

    const applySide = () => {
      bar.classList.toggle('left-3', side === 'left');
      bar.classList.toggle('right-3', side === 'right');
    };
    applySide();

    const TB_ICONS = {
      dice: '<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="8.5" cy="8.5" r="1" fill="currentColor"/><circle cx="15.5" cy="8.5" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="8.5" cy="15.5" r="1" fill="currentColor"/><circle cx="15.5" cy="15.5" r="1" fill="currentColor"/></svg>',
      timer: '<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M9 2h6M12 2v3"/></svg>',
      music: '<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>',
      poll: '<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="12" width="4" height="8" rx="1" fill="currentColor"/><rect x="10" y="5" width="4" height="15" rx="1"/><rect x="17" y="9" width="4" height="11" rx="1" fill="currentColor"/></svg>',
      share: '<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>',
      crown: '<svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M3 17L2 7l5.5 4.5L12 5l4.5 6.5L22 7l-1 10H3zm1 2h16v2H4v-2z"/></svg>',
      flip: '<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M7 16l-4-4 4-4M3 12h18M17 8l4 4-4 4"/></svg>',
      play: '<svg class="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M6 4l15 8-15 8V4z"/></svg>',
      pause: '<svg class="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>',
      stop: '<svg class="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="5" width="14" height="14" rx="2"/></svg>',
      reset: '<svg class="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>',
      eye: '<svg class="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>',
      eyeOff: '<svg class="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-7 0-11-7-11-7a21.8 21.8 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 7 11 7a21.8 21.8 0 0 1-2.16 3.19M1 1l22 22"/></svg>',
      expand: '<svg class="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>',
      shrink: '<svg class="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14h6v6M20 10h-6V4M14 10l7-7M10 14l-7 7"/></svg>',
      search: '<svg class="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/></svg>'
    };

    bar.innerHTML = `
      <button type="button" id="tb-random-btn" title="สุ่มทีม / สุ่มเลข" aria-label="สุ่มทีมหรือตัวเลข" class="btn-vox w-9 h-9 bg-white hover:bg-[#F4D03F] text-[#111111] rounded-lg flex items-center justify-center cursor-pointer transition-colors">${TB_ICONS.dice}</button>
      <button type="button" id="tb-timer-btn" title="ตัวจับเวลา" aria-label="ตัวจับเวลา" class="btn-vox w-9 h-9 bg-white hover:bg-[#F4D03F] text-[#111111] rounded-lg flex items-center justify-center cursor-pointer transition-colors">${TB_ICONS.timer}</button>
      <button type="button" id="tb-music-btn" title="เพลง YouTube" aria-label="เครื่องเล่นเพลง YouTube" class="relative btn-vox w-9 h-9 bg-white hover:bg-[#F4D03F] text-[#111111] rounded-lg flex items-center justify-center cursor-pointer transition-colors">${TB_ICONS.music}<span id="tb-music-dot" class="hidden absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full bg-[#10B981] border-2 border-[#111111] shadow-[1px_1px_0px_#111111] flex items-center justify-center"><span class="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span></span></button>
      <button type="button" id="tb-poll-btn" title="โหวตสด QR Poll" aria-label="โหวตสด QR Poll" class="btn-vox w-9 h-9 bg-white hover:bg-[#F4D03F] text-[#111111] rounded-lg flex items-center justify-center cursor-pointer transition-colors">${TB_ICONS.poll}</button>
      <button type="button" id="tb-share-btn" title="แชร์หน้าจอไปคอมพิวเตอร์ / จอโปรเจกเตอร์ในห้องใหญ่" aria-label="แชร์หน้าจอไปจอมอนิเตอร์อื่น" class="btn-vox w-9 h-9 bg-white hover:bg-[#F4D03F] text-[#111111] rounded-lg flex items-center justify-center cursor-pointer transition-colors">${TB_ICONS.share}</button>
      <button type="button" id="tb-victory-btn" title="ประกาศผู้ชนะ" aria-label="ประกาศผู้ชนะ" class="btn-vox w-9 h-9 bg-[#F4D03F] hover:bg-[#f2c61d] text-[#111111] rounded-lg flex items-center justify-center cursor-pointer transition-colors">${TB_ICONS.crown}</button>
      <div class="h-px bg-[#111111]/20 my-0.5"></div>
      <button type="button" id="tb-flip-btn" title="ย้ายแถบเครื่องมือ ซ้าย ⇄ ขวา" aria-label="สลับฝั่งแถบเครื่องมือ" class="btn-vox w-9 h-9 bg-[#111111] text-[#F4D03F] rounded-lg flex items-center justify-center cursor-pointer">${TB_ICONS.flip}</button>
    `;

    document.body.appendChild(bar);

    // Independent Persistent Floating Sub-Popups (Random / Timer / Music / Poll / Share)
    // Closing a popup only hides it — running tasks (Timer / Music) keep running uninterrupted!
    let topWinZ = 42;
    const subWindows = {};
    const dockBtnMap = {
      random: 'tb-random-btn',
      timer: 'tb-timer-btn',
      music: 'tb-music-btn',
      poll: 'tb-poll-btn',
      share: 'tb-share-btn'
    };

    const syncDockHighlights = () => {
      Object.entries(dockBtnMap).forEach(([key, btnId]) => {
        const el = document.getElementById(btnId);
        const w = subWindows[key];
        if (!el) return;
        const isOpen = Boolean(w && !w.el.classList.contains('hidden'));
        el.classList.toggle('ring-2', isOpen);
        el.classList.toggle('ring-[#111111]', isOpen);
        if (key !== 'music') {
          el.classList.toggle('bg-[#F4D03F]', isOpen);
          el.classList.toggle('bg-white', !isOpen);
        }
      });
    };

    const positionSubWindow = (winObj, indexOffset = 0) => {
      const el = winObj.el;
      if (winObj.customPos) {
        el.classList.remove('left-16', 'right-16', 'top-1/2', '-translate-y-1/2');
        const maxL = Math.max(8, window.innerWidth - (el.offsetWidth || 288) - 8);
        const maxT = Math.max(8, window.innerHeight - (el.offsetHeight || 220) - 8);
        winObj.customPos.left = Math.max(8, Math.min(maxL, winObj.customPos.left));
        winObj.customPos.top = Math.max(8, Math.min(maxT, winObj.customPos.top));
        el.style.left = `${winObj.customPos.left}px`;
        el.style.top = `${winObj.customPos.top}px`;
      } else {
        const h = el.offsetHeight || 220;
        const maxT = Math.max(12, window.innerHeight - h - 12);
        const topPx = Math.max(12, Math.min(maxT, Math.round((window.innerHeight - h) / 2 + indexOffset)));
        el.style.left = '';
        el.style.top = `${topPx}px`;
        el.classList.remove('top-1/2', '-translate-y-1/2', 'left-16', 'right-16');
        el.classList.add(side === 'left' ? 'left-16' : 'right-16');
      }
    };

    window.addEventListener('resize', () => {
      Object.values(subWindows).forEach((w) => {
        if (w.customPos && !w.el.classList.contains('hidden')) positionSubWindow(w);
      });
    });

    // Persistent YouTube Embed Overlay (delegates to shared HelpDaiBgm engine so music never restarts across pages!)
    const parkYtHost = () => {
      window.HelpDaiBgm?.parkOverlay?.();
    };

    const syncYtOverlayPos = () => {
      const musicWin = subWindows.music?.el;
      const slot = document.getElementById('tb-yt-slot');
      const st = window.HelpDaiBgm?.getState?.();
      if (!musicWin || musicWin.classList.contains('hidden') || !slot || !st?.videoId) {
        parkYtHost();
        return;
      }
      const r = slot.getBoundingClientRect();
      if (r.width < 10 || r.height < 10) {
        parkYtHost();
        return;
      }
      window.HelpDaiBgm?.mountOverlay?.(r);
    };

    window.addEventListener('resize', syncYtOverlayPos);

    const makeWindowDraggable = (winObj, handleEl) => {
      if (!handleEl) return;
      handleEl.addEventListener('pointerdown', (e) => {
        if (e.target.closest('button')) return;
        e.preventDefault();
        winObj.el.style.zIndex = String(++topWinZ);
        document.documentElement.classList.add('vox-grabbing');
        const rect = winObj.el.getBoundingClientRect();
        const offsetX = e.clientX - rect.left;
        const offsetY = e.clientY - rect.top;
        winObj.el.classList.remove('top-1/2', '-translate-y-1/2', 'left-16', 'right-16');
        winObj.el.style.left = `${rect.left}px`;
        winObj.el.style.top = `${rect.top}px`;

        const onMove = (ev) => {
          const maxL = Math.max(8, window.innerWidth - winObj.el.offsetWidth - 8);
          const maxT = Math.max(8, window.innerHeight - winObj.el.offsetHeight - 8);
          const nextL = Math.max(8, Math.min(maxL, ev.clientX - offsetX));
          const nextT = Math.max(8, Math.min(maxT, ev.clientY - offsetY));
          winObj.customPos = { left: nextL, top: nextT };
          winObj.el.style.left = `${nextL}px`;
          winObj.el.style.top = `${nextT}px`;
          if (winObj === subWindows.music) syncYtOverlayPos();
        };
        const onUp = () => {
          document.documentElement.classList.remove('vox-grabbing');
          window.removeEventListener('pointermove', onMove);
          window.removeEventListener('pointerup', onUp);
          window.removeEventListener('pointercancel', onUp);
        };
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
        window.addEventListener('pointercancel', onUp);
      });
    };

    const toggleSubWindow = (key, title, widthClass, html, bind, { onShow, onHide } = {}) => {
      let winObj = subWindows[key];
      if (!winObj) {
        const el = document.createElement('div');
        el.id = `tb-win-${key}`;
        el.className = `fixed hidden ${widthClass} vox-card bg-[#F8F6F0] p-3.5 flex-col gap-2.5`;
        el.style.zIndex = String(++topWinZ);
        el.innerHTML = `
          <div data-tb-drag="${key}" title="กดค้างเพื่อลากย้ายตำแหน่ง" class="vox-grab flex items-center justify-between pb-2 border-b-2 border-[#111111] select-none">
            <span class="inline-flex items-center gap-1.5 font-display font-extrabold text-xs uppercase tracking-wider text-[#111111]">
              <svg class="w-3 h-3 opacity-45 shrink-0" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><circle cx="5" cy="4" r="1.3"/><circle cx="11" cy="4" r="1.3"/><circle cx="5" cy="8" r="1.3"/><circle cx="11" cy="8" r="1.3"/><circle cx="5" cy="12" r="1.3"/><circle cx="11" cy="12" r="1.3"/></svg>
              <span>${title}</span>
            </span>
            <button type="button" data-tb-close="${key}" title="ซ่อนหน้าต่าง (งานยังคงทำงานต่อ)" class="w-6 h-6 rounded-md hover:bg-[#E74C3C] hover:text-white text-xs font-black flex items-center justify-center cursor-pointer transition-colors">✕</button>
          </div>
          <div data-tb-body="${key}" class="flex flex-col gap-2.5">${html}</div>
        `;
        document.body.appendChild(el);
        const offsetMap = { random: -36, timer: -12, music: 12, poll: 36 };
        winObj = { el, customPos: null, offset: offsetMap[key] || 0, onShow, onHide };
        subWindows[key] = winObj;

        el.addEventListener('pointerdown', () => {
          el.style.zIndex = String(++topWinZ);
          if (key === 'music') syncYtOverlayPos();
        });
        el.querySelector(`[data-tb-close="${key}"]`)?.addEventListener('click', () => {
          el.classList.add('hidden');
          el.classList.remove('flex');
          if (winObj.onHide) winObj.onHide(el);
          syncDockHighlights();
        });
        makeWindowDraggable(winObj, el.querySelector(`[data-tb-drag="${key}"]`));
        positionSubWindow(winObj, winObj.offset);
        if (bind) bind(el);
      }

      const isCurrentlyHidden = winObj.el.classList.contains('hidden');
      if (isCurrentlyHidden) {
        winObj.el.style.zIndex = String(++topWinZ);
        winObj.el.classList.remove('hidden', 'vox-panel-enter');
        winObj.el.classList.add('flex');
        positionSubWindow(winObj, winObj.offset);
        void winObj.el.offsetWidth;
        winObj.el.classList.add('vox-panel-enter');
        if (winObj.onShow) winObj.onShow(winObj.el);
      } else {
        winObj.el.classList.add('hidden');
        winObj.el.classList.remove('flex');
        if (winObj.onHide) winObj.onHide(winObj.el);
      }
      syncDockHighlights();
    };

    // 1. Random Picker (Dramatic decelerating roulette + Web Audio ticks + card spotlight)
    document.getElementById('tb-random-btn').addEventListener('click', () => {
      toggleSubWindow('random', 'สุ่ม (Random)', 'w-64', `
        <div id="tb-rand-box" class="bg-white border-2 border-[#111111] rounded-xl p-3.5 text-center min-h-[4.25rem] flex flex-col items-center justify-center gap-1.5 transition-all duration-200 shadow-[3px_3px_0px_#111111]">
          <div id="tb-rand-result" class="font-display font-black text-xl text-[#111111] leading-tight">?</div>
          <div class="w-full h-1.5 bg-[#F0EDE4] border border-[#111111] rounded-full overflow-hidden hidden" id="tb-rand-bar-wrap">
            <div id="tb-rand-bar" class="h-full bg-[#E74C3C] transition-all duration-75" style="width:0%"></div>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-1.5">
          <button type="button" id="tb-rand-team" class="btn-vox bg-[#F4D03F] hover:bg-[#f2c61d] text-[#111111] font-display font-extrabold text-xs py-2 rounded-xl cursor-pointer">สุ่มทีม</button>
          <button type="button" id="tb-rand-num" class="btn-vox bg-white hover:bg-[#F4D03F] text-[#111111] font-display font-extrabold text-xs py-2 rounded-xl cursor-pointer">สุ่ม 1–100</button>
        </div>
      `, (winEl) => {
        const boxEl = winEl.querySelector('#tb-rand-box');
        const resEl = winEl.querySelector('#tb-rand-result');
        const barWrap = winEl.querySelector('#tb-rand-bar-wrap');
        const barEl = winEl.querySelector('#tb-rand-bar');
        let spinning = false;

        const playSpinTick = (progress) => {
          try {
            const Ctx = window.AudioContext || window.webkitAudioContext;
            if (!Ctx) return;
            const ctx = window.__voxAudioCtx || (window.__voxAudioCtx = new Ctx());
            if (ctx.state === 'suspended') ctx.resume();
            const o = ctx.createOscillator();
            const g = ctx.createGain();
            o.type = 'triangle';
            o.frequency.setValueAtTime(340 + progress * 380, ctx.currentTime);
            g.gain.setValueAtTime(0.08, ctx.currentTime);
            g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.045);
            o.connect(g); g.connect(ctx.destination);
            o.start(); o.stop(ctx.currentTime + 0.05);
          } catch (_) {}
        };

        const spin = (items, isTeam = false) => {
          if (spinning || !items.length) return;
          spinning = true;
          const totalSteps = 20;
          let step = 0;

          boxEl.classList.remove('bg-[#F4D03F]', 'scale-105');
          boxEl.classList.add('bg-white');
          barWrap.classList.remove('hidden');
          barEl.style.width = '0%';

          const nextTick = () => {
            const pick = items[Math.floor(Math.random() * items.length)];
            resEl.textContent = isTeam ? pick.name : pick;
            resEl.style.transform = step % 2 === 0 ? 'scale(1.06)' : 'scale(0.96)';
            const progress = step / totalSteps;
            barEl.style.width = `${Math.round(progress * 100)}%`;
            playSpinTick(progress);

            step++;
            if (step < totalSteps) {
              // Fast at start (45ms), dramatic slowdown at the end (up to ~280ms)
              const delay = Math.round(45 + Math.pow(progress, 2.4) * 240);
              setTimeout(nextTick, delay);
            } else {
              const winner = items[Math.floor(Math.random() * items.length)];
              resEl.textContent = isTeam ? winner.name : winner;
              resEl.style.transform = 'scale(1.16)';
              boxEl.classList.remove('bg-white');
              boxEl.classList.add('bg-[#F4D03F]', 'scale-105');
              barEl.style.width = '100%';
              playSfx('bell');

              if (isTeam && winner.id) {
                const row = document.querySelector(`.team-row[data-team-id="${winner.id}"]`);
                if (row) {
                  row.style.transition = 'transform 0.35s cubic-bezier(0.22, 1, 0.36, 1)';
                  row.style.transform = 'scale(1.04)';
                  setTimeout(() => { row.style.transform = ''; }, 900);
                }
              }

              setTimeout(() => {
                resEl.style.transform = 'scale(1)';
                boxEl.classList.remove('scale-105');
                barWrap.classList.add('hidden');
                spinning = false;
              }, 420);
            }
          };
          nextTick();
        };

        winEl.querySelector('#tb-rand-team')?.addEventListener('click', () => {
          let teams = window.VoxScoreboardAPI?.getState()?.teams || [];
          if (!teams.length) {
            try {
              const saved = JSON.parse(localStorage.getItem('vox_scoreboard_clean_v3') || 'null');
              if (Array.isArray(saved?.teams)) teams = saved.teams;
            } catch (_) {}
          }
          if (!teams.length) {
            if (resEl) resEl.textContent = 'ไม่พบทีม';
            return;
          }
          spin(teams, true);
        });
        winEl.querySelector('#tb-rand-num')?.addEventListener('click', () => {
          spin(Array.from({ length: 100 }, (_, i) => String(i + 1)), false);
        });
      });
    });

    // 2. Quick Timer (Live clock preview + presets + nudge +/- + instant controls)
    let timerPollId = null;
    document.getElementById('tb-timer-btn').addEventListener('click', () => {
      const api = window.VoxScoreboardAPI;
      const st = api?.getState();
      if (!st) return;

      const fmtClock = (sec) => {
        const s = Math.max(0, Math.floor(sec));
        return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
      };
      const getLiveSec = () => {
        const t = (api.getState() || st).timer;
        if (t.running && t.endAt) return Math.max(0, Math.ceil((t.endAt - Date.now()) / 1000));
        return Math.max(0, t.remainingSec || 0);
      };

      let syncTimerPopUI = () => {};

      toggleSubWindow('timer', 'ตัวจับเวลา (Timer)', 'w-64', `
        <div class="bg-white border-2 border-[#111111] rounded-xl py-2.5 px-3 text-center shadow-[3px_3px_0px_#111111]">
          <div id="tb-t-clock" class="font-display font-black text-3xl tabular-nums text-[#111111] leading-none">${fmtClock(getLiveSec())}</div>
        </div>
        <div class="grid grid-cols-5 gap-1">
          <button type="button" data-tb-t="30" class="btn-vox bg-white hover:bg-[#F4D03F] text-[11px] font-display font-bold py-1 rounded-lg cursor-pointer">30s</button>
          <button type="button" data-tb-t="60" class="btn-vox bg-white hover:bg-[#F4D03F] text-[11px] font-display font-bold py-1 rounded-lg cursor-pointer">1m</button>
          <button type="button" data-tb-t="180" class="btn-vox bg-white hover:bg-[#F4D03F] text-[11px] font-display font-bold py-1 rounded-lg cursor-pointer">3m</button>
          <button type="button" data-tb-t="300" class="btn-vox bg-white hover:bg-[#F4D03F] text-[11px] font-display font-bold py-1 rounded-lg cursor-pointer">5m</button>
          <button type="button" data-tb-t="600" class="btn-vox bg-white hover:bg-[#F4D03F] text-[11px] font-display font-bold py-1 rounded-lg cursor-pointer">10m</button>
        </div>
        <div class="grid grid-cols-4 gap-1">
          <button type="button" data-tb-nudge="-60" class="btn-vox bg-white hover:bg-red-50 text-[11px] font-display font-bold py-1 rounded-lg cursor-pointer">−1m</button>
          <button type="button" data-tb-nudge="-10" class="btn-vox bg-white hover:bg-red-50 text-[11px] font-display font-bold py-1 rounded-lg cursor-pointer">−10s</button>
          <button type="button" data-tb-nudge="10" class="btn-vox bg-white hover:bg-[#F4D03F] text-[11px] font-display font-bold py-1 rounded-lg cursor-pointer">+10s</button>
          <button type="button" data-tb-nudge="60" class="btn-vox bg-white hover:bg-[#F4D03F] text-[11px] font-display font-bold py-1 rounded-lg cursor-pointer">+1m</button>
        </div>
        <div class="grid grid-cols-2 gap-1.5">
          <button type="button" id="tb-t-toggle" class="btn-vox bg-[#F4D03F] hover:bg-[#f2c61d] text-xs font-display font-extrabold py-2 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"></button>
          <button type="button" id="tb-t-reset" class="btn-vox bg-white hover:bg-red-50 text-xs font-display font-bold py-2 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer">${TB_ICONS.reset}<span>รีเซ็ต</span></button>
        </div>
        <div class="grid grid-cols-2 gap-1.5">
          <button type="button" id="tb-t-vis" class="btn-vox bg-white hover:bg-[#F4D03F] text-xs font-display font-bold py-1.5 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"></button>
          <button type="button" id="tb-t-mode" class="btn-vox bg-white hover:bg-[#F4D03F] text-xs font-display font-bold py-1.5 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"></button>
        </div>
      `, (winEl) => {
        const clockEl = document.getElementById('tb-t-clock');
        const toggleBtn = document.getElementById('tb-t-toggle');
        const visBtn = document.getElementById('tb-t-vis');
        const modeBtn = document.getElementById('tb-t-mode');

        syncTimerPopUI = () => {
          const t = (api.getState() || st).timer;
          if (clockEl) clockEl.textContent = fmtClock(getLiveSec());
          if (toggleBtn) toggleBtn.innerHTML = t.running ? `${TB_ICONS.pause}<span>หยุด</span>` : `${TB_ICONS.play}<span>เริ่ม</span>`;
          if (visBtn) visBtn.innerHTML = t.visible ? `${TB_ICONS.eyeOff}<span>ซ่อนจอ</span>` : `${TB_ICONS.eye}<span>แสดงจอ</span>`;
          if (modeBtn) modeBtn.innerHTML = t.mode === 'center' ? `${TB_ICONS.shrink}<span>มุมจอ</span>` : `${TB_ICONS.expand}<span>กลางจอ</span>`;
        };

        const updateTimer = (fn) => {
          if (api.updateTimer) {
            api.updateTimer(fn);
          } else {
            const t = st.timer;
            fn(t);
            t.timerVersion = Date.now();
            localStorage.setItem('vox_scoreboard_clean_v3', JSON.stringify(st));
          }
          syncTimerPopUI();
        };

        winEl.querySelectorAll('[data-tb-t]').forEach(b => {
          b.addEventListener('click', () => {
            const sec = Number(b.dataset.tbT);
            updateTimer(t => { t.durationSec = sec; t.remainingSec = sec; t.running = false; t.endAt = null; t.visible = true; });
          });
        });

        winEl.querySelectorAll('[data-tb-nudge]').forEach(b => {
          b.addEventListener('click', () => {
            const delta = Number(b.dataset.tbNudge);
            updateTimer(t => {
              const cur = getLiveSec();
              const next = Math.max(5, cur + delta);
              t.remainingSec = next;
              if (!t.running) t.durationSec = next;
              else t.endAt = Date.now() + next * 1000;
              t.visible = true;
            });
          });
        });

        toggleBtn?.addEventListener('click', () => {
          updateTimer(t => {
            if (t.running) {
              t.remainingSec = getLiveSec();
              t.running = false;
              t.endAt = null;
            } else {
              const rem = t.remainingSec > 0 ? t.remainingSec : (t.durationSec || 180);
              t.remainingSec = rem;
              t.running = true;
              t.endAt = Date.now() + rem * 1000;
              t.visible = true;
            }
          });
        });

        document.getElementById('tb-t-reset')?.addEventListener('click', () => {
          updateTimer(t => {
            const base = t.durationSec || 180;
            t.remainingSec = base;
            t.running = false;
            t.endAt = null;
          });
        });

        visBtn?.addEventListener('click', () => {
          updateTimer(t => { t.visible = !t.visible; });
        });

        modeBtn?.addEventListener('click', () => {
          updateTimer(t => { t.mode = t.mode === 'center' ? 'corner' : 'center'; t.visible = true; });
        });

        syncTimerPopUI();
      }, {
        onShow: () => {
          syncTimerPopUI();
          if (timerPollId) clearInterval(timerPollId);
          timerPollId = setInterval(() => {
            syncTimerPopUI();
          }, 200);
        },
        onHide: () => {
          if (timerPollId) { clearInterval(timerPollId); timerPollId = null; }
        }
      });
    });

    // 3.5 YouTube Legal Embed Music Player (Unified with window.HelpDaiBgm for zero-interruption cross-page playback)
    const extractYoutubeId = (raw) => {
      if (window.HelpDaiBgm?.extractYoutubeId) return window.HelpDaiBgm.extractYoutubeId(raw);
      const s = (raw || '').trim();
      if (!s) return '';
      if (/^[a-zA-Z0-9_-]{11}$/.test(s)) return s;
      const m = s.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
      return m ? m[1] : '';
    };

    const syncMusicBtnBadge = () => {
      const st = window.HelpDaiBgm?.getState?.() || { videoId: '', playing: false };
      const hasActive = Boolean(st.videoId);
      const btn = document.getElementById('tb-music-btn');
      const dot = document.getElementById('tb-music-dot');
      if (btn) {
        btn.classList.toggle('bg-[#F4D03F]', hasActive);
        btn.classList.toggle('bg-white', !hasActive);
      }
      if (dot) {
        dot.classList.toggle('hidden', !(hasActive && st.playing));
      }
      const titleBar = document.getElementById('tb-yt-now-title');
      const togglePlayBtn = document.getElementById('tb-yt-toggle-play');
      if (titleBar) {
        titleBar.textContent = hasActive ? (st.title || `YouTube (${st.videoId})`) : 'ยังไม่ได้เลือกเพลง';
      }
      if (togglePlayBtn) {
        togglePlayBtn.classList.toggle('hidden', !hasActive);
        togglePlayBtn.classList.toggle('flex', hasActive);
        togglePlayBtn.innerHTML = st.playing ? TB_ICONS.pause : TB_ICONS.play;
      }
    };

    const loadYoutubeTrack = (videoId, title = '') => {
      if (!videoId) return;
      window.HelpDaiBgm?.setTrack?.(videoId, title, true);
      syncMusicBtnBadge();
    };

    const stopYoutubeTrack = () => {
      parkYtHost();
      window.HelpDaiBgm?.stop?.();
      syncMusicBtnBadge();
    };

    window.addEventListener('helpdai-bgm-change', () => {
      syncMusicBtnBadge();
      const musicWin = subWindows.music?.el;
      if (musicWin && !musicWin.classList.contains('hidden')) {
        requestAnimationFrame(syncYtOverlayPos);
      }
    });
    syncMusicBtnBadge();

    const searchYoutubeInApp = async (query) => {
      const cfg = window.HELPDAI_CONFIG || {};
      const defaultApiBase = (!location.hostname.endsWith('github.io') && location.protocol.startsWith('http')) ? location.origin : '';
      const apiBase = (cfg.apiBase || defaultApiBase).replace(/\/$/, '');
      if (apiBase) {
        try {
          const res = await fetch(`${apiBase}/api/yt-search?q=${encodeURIComponent(query)}`, {
            signal: AbortSignal.timeout(5000)
          });
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data?.items) && data.items.length) return data.items.slice(0, 4);
          }
        } catch (_) {}
      }
      return [];
    };

    document.getElementById('tb-music-btn').addEventListener('click', () => {
      const mountYtIntoSlot = () => {
        const slot = document.getElementById('tb-yt-slot');
        const st = window.HelpDaiBgm?.getState?.();
        syncMusicBtnBadge();
        if (slot && st?.videoId) {
          slot.textContent = '';
          requestAnimationFrame(syncYtOverlayPos);
        } else {
          if (slot) slot.textContent = 'วางลิงก์ YouTube หรือพิมพ์ชื่อเพลงแล้วกด Enter';
          parkYtHost();
        }
      };

      const curSt = window.HelpDaiBgm?.getState?.() || { videoId: '', title: '', playing: false };
      const renderMusicBody = () => `
        <div class="flex flex-col gap-2">
          <div id="tb-yt-slot" class="w-full aspect-video bg-[#111111] rounded-lg border-2 border-[#111111] overflow-hidden flex items-center justify-center text-[11px] text-white/60 font-display text-center px-3">
            ${curSt.videoId ? '' : 'วางลิงก์ YouTube หรือพิมพ์ชื่อเพลงแล้วกด Enter'}
          </div>
          <div class="flex items-center justify-between gap-2 bg-white border-2 border-[#111111] rounded-lg px-2.5 py-1">
            <span id="tb-yt-now-title" class="font-display font-bold text-[11px] text-[#111111] truncate">${curSt.videoId ? (curSt.title || `YouTube (${curSt.videoId})`) : 'ยังไม่ได้เลือกเพลง'}</span>
            <div class="flex items-center gap-1 shrink-0">
              <button type="button" id="tb-yt-toggle-play" title="เล่น / พัก" class="${curSt.videoId ? 'flex' : 'hidden'} btn-vox w-6 h-6 bg-[#F4D03F] hover:bg-[#f2c61d] text-[#111111] rounded items-center justify-center cursor-pointer">${curSt.playing ? TB_ICONS.pause : TB_ICONS.play}</button>
              <button type="button" id="tb-yt-stop" title="หยุดเพลง" aria-label="หยุดเพลง" class="btn-vox w-6 h-6 bg-white hover:bg-red-100 text-[#E74C3C] rounded flex items-center justify-center cursor-pointer">${TB_ICONS.stop}</button>
            </div>
          </div>
          <div class="flex gap-1.5">
            <input id="tb-yt-input" type="text" placeholder="พิมพ์ชื่อเพลง หรือวางลิงก์ YouTube..." class="flex-1 min-w-0 bg-white border-2 border-[#111111] rounded-lg px-2.5 py-1.5 text-xs font-semibold" />
            <button type="button" id="tb-yt-load" title="ค้นหา / เล่น" aria-label="ค้นหาหรือเล่นเพลง" class="btn-vox bg-[#F4D03F] hover:bg-[#f2c61d] px-2.5 py-1 rounded-lg flex items-center justify-center cursor-pointer">${TB_ICONS.search}</button>
          </div>
          <div id="tb-yt-results" class="hidden flex-col gap-1.5 pt-1 border-t border-[#111111]/15"></div>
        </div>
      `;

      toggleSubWindow('music', 'YouTube Music', 'w-72', renderMusicBody(), () => {
        mountYtIntoSlot();

        const resultsEl = document.getElementById('tb-yt-results');
        const inpEl = document.getElementById('tb-yt-input');

        const handleInputAction = async () => {
          const raw = (inpEl?.value || '').trim();
          if (!raw) return;
          const id = extractYoutubeId(raw);
          if (id) {
            loadYoutubeTrack(id);
            mountYtIntoSlot();
            if (inpEl) inpEl.value = '';
            resultsEl?.classList.add('hidden');
            resultsEl?.classList.remove('flex');
            return;
          }

          if (resultsEl) {
            resultsEl.classList.remove('hidden');
            resultsEl.classList.add('flex');
            resultsEl.innerHTML = `<div class="text-[11px] font-display font-bold text-[#111111]/60 py-1 text-center">กำลังค้นหา "${raw.replace(/[<>&"]/g, '')}"...</div>`;
          }

          const items = await searchYoutubeInApp(raw);
          if (!resultsEl) return;
          if (!items.length) {
            resultsEl.innerHTML = `
              <div class="text-[11px] font-semibold text-[#111111]/70 text-center py-0.5">ไม่พบผลการค้นหาในโหมดออฟไลน์</div>
              <a href="https://www.youtube.com/results?search_query=${encodeURIComponent(raw)}" target="_blank" rel="noopener noreferrer" class="btn-vox bg-white hover:bg-[#F4D03F] px-2.5 py-1.5 rounded-lg text-[11px] font-display font-bold text-[#111111] flex items-center justify-between">
                <span class="truncate">ค้นหา "${raw.replace(/[<>&"]/g, '')}" บน YouTube</span>
                <span class="shrink-0 ml-1">↗</span>
              </a>
            `;
            return;
          }

          resultsEl.innerHTML = items.map(item => `
            <button type="button" data-yt-pick="${item.id}" data-yt-title="${item.title.replace(/"/g, '&quot;')}" class="w-full text-left bg-white hover:bg-[#F4D03F] border-2 border-[#111111] rounded-lg p-1.5 flex items-center gap-2 transition-colors cursor-pointer">
              ${item.thumb ? `<img src="${item.thumb}" alt="" class="w-10 h-7 object-cover rounded border border-[#111111] shrink-0" />` : ''}
              <div class="min-w-0 flex-1">
                <div class="font-display font-bold text-[11px] text-[#111111] truncate">${item.title.replace(/[<>&"]/g, '')}</div>
                <div class="text-[9px] text-[#111111]/60 truncate">${item.author.replace(/[<>&"]/g, '')}</div>
              </div>
            </button>
          `).join('');

          resultsEl.querySelectorAll('[data-yt-pick]').forEach(btn => {
            btn.addEventListener('click', () => {
              loadYoutubeTrack(btn.dataset.ytPick, btn.dataset.ytTitle || '');
              mountYtIntoSlot();
              resultsEl.classList.add('hidden');
              resultsEl.classList.remove('flex');
            });
          });
        };

        inpEl?.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            handleInputAction();
          }
        });

        document.getElementById('tb-yt-load')?.addEventListener('click', handleInputAction);
        document.getElementById('tb-yt-toggle-play')?.addEventListener('click', () => {
          const st = window.HelpDaiBgm?.getState?.();
          if (st?.videoId) window.HelpDaiBgm?.setPlaying?.(!st.playing);
        });
        document.getElementById('tb-yt-stop')?.addEventListener('click', () => {
          stopYoutubeTrack();
          const slot = document.getElementById('tb-yt-slot');
          if (slot) slot.innerHTML = 'วางลิงก์ YouTube หรือพิมพ์ชื่อเพลงแล้วกด Enter';
        });
      }, {
        onShow: mountYtIntoSlot,
        onHide: parkYtHost
      });
    });

    // 3.8 Renovated Simple & Easy Live QR Poll (1-Click Presets + Auto-Save + +1 Quick Vote + Center-Stage Overlay)
    let pollSyncTimerId = null;
    document.getElementById('tb-poll-btn')?.addEventListener('click', () => {
      const POLL_COLORS = ['#F4D03F', '#E74C3C', '#2980B9', '#10B981', '#8E44AD', '#F39C12'];
      const POLL_HOST_KEY = 'helpdai_poll_host_v1';
      const cfg = window.HELPDAI_CONFIG || {};
      const defaultApiBase = (!location.hostname.endsWith('github.io') && location.protocol.startsWith('http')) ? location.origin : '';
      const apiBase = (cfg.apiBase || defaultApiBase).replace(/\/$/, '');
      const escP = (v) => String(v || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

      let hostCfg = {
        pollId: 'poll-' + Math.random().toString(36).slice(2, 8),
        adminToken: 'adm-' + Math.random().toString(36).slice(2, 12) + Date.now().toString(36),
        question: 'เชียร์ทีมไหนในรอบนี้?',
        options: ['ตัวเลือก A', 'ตัวเลือก B', 'ตัวเลือก C'],
        isOpen: true,
        hideResults: false
      };
      try {
        const saved = JSON.parse(localStorage.getItem(POLL_HOST_KEY) || 'null');
        if (saved?.pollId && saved?.adminToken) hostCfg = { ...hostCfg, ...saved };
      } catch (_) {}
      const saveHostCfg = () => { try { localStorage.setItem(POLL_HOST_KEY, JSON.stringify(hostCfg)); } catch (_) {} };
      saveHostCfg();

      const localPollKey = () => `helpdai_poll_local_${hostCfg.pollId}`;
      const pollBc = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('helpdai_poll_bc') : null;

      let latestCounts = hostCfg.options.map(() => 0);
      let latestTotal = 0;

      const loadLocalPollCounts = () => {
        try {
          const loc = JSON.parse(localStorage.getItem(localPollKey()) || 'null');
          if (loc && Array.isArray(loc.counts) && loc.counts.length === hostCfg.options.length) {
            latestCounts = loc.counts.map(n => Math.max(0, Number(n) || 0));
            latestTotal = latestCounts.reduce((a, b) => a + b, 0);
          }
        } catch (_) {}
      };
      loadLocalPollCounts();

      const saveLocalPollState = () => {
        const payload = {
          pollId: hostCfg.pollId,
          question: hostCfg.question,
          options: hostCfg.options,
          counts: latestCounts,
          totalVotes: latestTotal,
          isOpen: hostCfg.isOpen
        };
        try { localStorage.setItem(localPollKey(), JSON.stringify(payload)); } catch (_) {}
        try { pollBc?.postMessage(payload); } catch (_) {}
      };
      saveLocalPollState();

      const getVoteUrl = () => `${location.origin}/poll.html?vote=${encodeURIComponent(hostCfg.pollId)}`;
      let pullResults = () => {};
      let syncCenterPollOverlay = () => {};

      toggleSubWindow('poll', 'โหวตสด (Live Poll)', 'w-80', `
        <!-- 1-Click Quick Templates -->
        <div class="flex items-center gap-1">
          <button type="button" data-tb-preset="teams" title="ดึงชื่อทีมบนเวทีมาเปิดโหวตทันที" class="flex-1 btn-vox bg-[#F4D03F] hover:bg-[#f2c61d] text-[#111111] font-display font-extrabold text-[10px] py-1 px-1.5 rounded-lg cursor-pointer">🏆 โหวตทีม</button>
          <button type="button" data-tb-preset="yesno" class="flex-1 btn-vox bg-white hover:bg-[#F4D03F] text-[#111111] font-display font-bold text-[10px] py-1 px-1.5 rounded-lg cursor-pointer">👍 ใช่/ไม่ใช่</button>
          <button type="button" data-tb-preset="abcd" class="flex-1 btn-vox bg-white hover:bg-[#F4D03F] text-[#111111] font-display font-bold text-[10px] py-1 px-1.5 rounded-lg cursor-pointer">🔤 A/B/C/D</button>
        </div>

        <input id="tb-poll-in-q" type="text" maxlength="160" placeholder="พิมพ์หัวข้อโหวต..." class="w-full bg-white border-2 border-[#111111] rounded-xl px-2.5 py-1.5 text-xs font-display font-extrabold text-[#111111] shadow-[2px_2px_0px_#111111] focus:outline-none" />

        <div id="tb-poll-rows" class="flex flex-col gap-1.5 max-h-52 overflow-y-auto pr-0.5"></div>

        <div class="flex items-center justify-between gap-1.5">
          <button type="button" id="tb-poll-add-opt" class="btn-vox bg-white hover:bg-[#F4D03F] text-[11px] font-display font-bold px-2.5 py-1 rounded-lg cursor-pointer">+ ตัวเลือก</button>
          <div class="flex items-center gap-1">
            <button type="button" id="tb-poll-open-btn" class="btn-vox bg-[#10B981] text-white text-[11px] font-display font-extrabold px-2.5 py-1 rounded-lg cursor-pointer">เปิดโหวต</button>
            <button type="button" id="tb-poll-reset" class="btn-vox bg-white hover:bg-red-50 text-[#E74C3C] text-[11px] font-display font-bold px-2 py-1 rounded-lg cursor-pointer">ล้าง 0</button>
          </div>
        </div>

        <!-- Stage Projection + QR Card -->
        <div class="flex items-center gap-2.5 bg-white border-2 border-[#111111] rounded-xl p-2 shadow-[2px_2px_0px_#111111]">
          <img id="tb-poll-qr" src="" alt="QR โหวต" class="w-14 h-14 rounded-lg border border-[#111111] bg-[#F8F6F0] shrink-0 cursor-pointer" title="คลิกเพื่อฉายโพลกลางจอ" />
          <div class="min-w-0 flex-1 flex flex-col gap-1.5">
            <div class="flex items-center justify-between">
              <span class="text-[10px] font-display font-extrabold text-[#111111]/70">สแกน QR หรือกด +1</span>
              <span id="tb-poll-total" class="bg-[#F4D03F] border border-[#111111] px-1.5 py-0.5 rounded font-display font-black text-[10px]">0 โหวต</span>
            </div>
            <div class="flex gap-1">
              <button type="button" id="tb-poll-stage-btn" class="flex-1 btn-vox bg-[#111111] hover:bg-[#222222] text-[#F4D03F] text-[11px] font-display font-extrabold py-1 px-2 rounded-lg flex items-center justify-center gap-1 cursor-pointer">${TB_ICONS.expand}<span>ฉายกลางจอ</span></button>
              <button type="button" id="tb-poll-copy" title="คัดลอกลิงก์โหวต" class="btn-vox bg-[#F8F6F0] hover:bg-[#F4D03F] text-[10px] font-display font-bold px-2 py-1 rounded-lg cursor-pointer">ลิงก์</button>
            </div>
          </div>
        </div>
      `, (winEl) => {
        const inQ = winEl.querySelector('#tb-poll-in-q');
        const rowsEl = winEl.querySelector('#tb-poll-rows');
        const totalEl = winEl.querySelector('#tb-poll-total');
        const openBtn = winEl.querySelector('#tb-poll-open-btn');
        const qrEl = winEl.querySelector('#tb-poll-qr');
        let pushDebounce = null;

        const syncQr = () => {
          const url = getVoteUrl();
          if (qrEl) qrEl.src = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(url)}`;
        };

        const syncOpenBtn = () => {
          if (!openBtn) return;
          openBtn.textContent = hostCfg.isOpen ? 'เปิดโหวต' : 'ปิดโหวต';
          openBtn.classList.toggle('bg-[#10B981]', hostCfg.isOpen);
          openBtn.classList.toggle('bg-[#E74C3C]', !hostCfg.isOpen);
        };

        const syncBarStatsOnly = () => {
          if (totalEl) totalEl.textContent = `${latestTotal} โหวต`;
          const total = Math.max(1, latestTotal);
          rowsEl.querySelectorAll('[data-tb-row]').forEach((row, i) => {
            const cnt = latestCounts[i] || 0;
            const pct = latestTotal > 0 ? Math.round((cnt / total) * 100) : 0;
            const stat = row.querySelector('[data-tb-stat]');
            const fill = row.querySelector('[data-tb-fill]');
            if (stat) stat.textContent = `${pct}% (${cnt})`;
            if (fill) fill.style.width = `${pct}%`;
          });
          syncCenterPollOverlay();
        };

        const pushPoll = async () => {
          hostCfg.question = (inQ.value || '').trim() || 'คำถามโหวต';
          const inputs = Array.from(rowsEl.querySelectorAll('[data-tb-opt]'));
          if (inputs.length) hostCfg.options = inputs.map(x => x.value.trim() || 'ตัวเลือก');
          while (latestCounts.length < hostCfg.options.length) latestCounts.push(0);
          if (latestCounts.length > hostCfg.options.length) latestCounts = latestCounts.slice(0, hostCfg.options.length);
          latestTotal = latestCounts.reduce((a, b) => a + b, 0);
          saveHostCfg();
          saveLocalPollState();
          syncCenterPollOverlay();
          if (!apiBase) return;
          try {
            await fetch(`${apiBase}/api/polls/${encodeURIComponent(hostCfg.pollId)}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'X-Poll-Admin': hostCfg.adminToken },
              body: JSON.stringify({ question: hostCfg.question, options: hostCfg.options, isOpen: hostCfg.isOpen })
            });
          } catch (_) {}
        };

        const schedulePush = () => {
          clearTimeout(pushDebounce);
          pushDebounce = setTimeout(pushPoll, 220);
        };

        const addManualVote = async (idx) => {
          if (!hostCfg.isOpen) return;
          latestCounts[idx] = (latestCounts[idx] || 0) + 1;
          latestTotal = latestCounts.reduce((a, b) => a + b, 0);
          saveLocalPollState();
          syncBarStatsOnly();
          playSfx('bell');
          if (apiBase) {
            try {
              await fetch(`${apiBase}/api/polls/${encodeURIComponent(hostCfg.pollId)}/vote`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ choiceIndex: idx, voterId: 'host-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7) })
              });
            } catch (_) {}
          }
        };

        const renderRows = () => {
          inQ.value = hostCfg.question;
          const total = Math.max(1, latestTotal);
          rowsEl.innerHTML = hostCfg.options.map((opt, i) => {
            const cnt = latestCounts[i] || 0;
            const pct = latestTotal > 0 ? Math.round((cnt / total) * 100) : 0;
            const color = POLL_COLORS[i % POLL_COLORS.length];
            return `
              <div data-tb-row="${i}" class="bg-white border-2 border-[#111111] rounded-xl p-1.5 flex flex-col gap-1">
                <div class="flex items-center gap-1">
                  <span class="w-4 h-4 rounded-md border border-[#111111] font-display font-black text-[9px] flex items-center justify-center shrink-0" style="background:${color}; color:${color === '#F4D03F' ? '#111111' : '#FFFFFF'}">${String.fromCharCode(65 + i)}</span>
                  <input data-tb-opt="${i}" type="text" maxlength="60" value="${escP(opt)}" class="flex-1 min-w-0 bg-transparent text-[11px] font-display font-bold text-[#111111] focus:outline-none focus:bg-[#F8F6F0] rounded px-1" />
                  <span data-tb-stat class="text-[10px] font-display font-black tabular-nums text-[#111111]/75 shrink-0">${pct}% (${cnt})</span>
                  <button type="button" data-tb-plus="${i}" title="บวกคะแนนโหวต +1" class="px-1.5 py-0.5 rounded border border-[#111111] bg-[#F8F6F0] hover:bg-[#F4D03F] font-display font-black text-[10px] text-[#111111] shrink-0 cursor-pointer">+1</button>
                  ${hostCfg.options.length > 2 ? `<button type="button" data-tb-del="${i}" title="ลบตัวเลือก" class="w-4 h-4 rounded hover:bg-red-100 text-[#E74C3C] font-black text-[10px] flex items-center justify-center cursor-pointer">✕</button>` : ''}
                </div>
                <div class="w-full h-2 bg-[#F0EDE4] border border-[#111111] rounded-full overflow-hidden">
                  <div data-tb-fill class="h-full transition-all duration-500" style="width:${pct}%; background:${color};"></div>
                </div>
              </div>
            `;
          }).join('');

          rowsEl.querySelectorAll('[data-tb-opt]').forEach(inp => {
            inp.addEventListener('input', schedulePush);
            inp.addEventListener('change', pushPoll);
            inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); inp.blur(); pushPoll(); } });
          });

          rowsEl.querySelectorAll('[data-tb-plus]').forEach(btn => {
            btn.addEventListener('click', () => addManualVote(Number(btn.dataset.tbPlus)));
          });

          rowsEl.querySelectorAll('[data-tb-del]').forEach(btn => {
            btn.addEventListener('click', () => {
              hostCfg.options = Array.from(rowsEl.querySelectorAll('[data-tb-opt]')).map(x => x.value);
              hostCfg.options.splice(Number(btn.dataset.tbDel), 1);
              latestCounts.splice(Number(btn.dataset.tbDel), 1);
              latestTotal = latestCounts.reduce((a, b) => a + b, 0);
              renderRows();
              pushPoll();
            });
          });
        };

        inQ.addEventListener('input', schedulePush);
        inQ.addEventListener('change', pushPoll);
        inQ.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); inQ.blur(); pushPoll(); } });

        const resetAllVotes = async () => {
          latestCounts = hostCfg.options.map(() => 0);
          latestTotal = 0;
          saveLocalPollState();
          syncBarStatsOnly();
          if (!apiBase) return;
          try {
            await fetch(`${apiBase}/api/polls/${encodeURIComponent(hostCfg.pollId)}/reset`, {
              method: 'POST',
              headers: { 'X-Poll-Admin': hostCfg.adminToken }
            });
          } catch (_) {}
        };

        // Quick 1-Click Presets
        winEl.querySelectorAll('[data-tb-preset]').forEach(btn => {
          btn.addEventListener('click', async () => {
            const kind = btn.dataset.tbPreset;
            if (kind === 'teams') {
              const teams = window.VoxScoreboardAPI?.getState?.()?.teams || [];
              const names = teams.map(t => (t.name || '').trim()).filter(Boolean).slice(0, 6);
              hostCfg.question = 'เชียร์ทีมไหนในรอบนี้?';
              hostCfg.options = names.length >= 2 ? names : ['ทีม A', 'ทีม B', 'ทีม C'];
            } else if (kind === 'yesno') {
              hostCfg.question = 'เห็นด้วยกับข้อเสนอนี้หรือไม่?';
              hostCfg.options = ['เห็นด้วย 👍', 'ไม่เห็นด้วย 👎'];
            } else {
              hostCfg.question = 'เลือกคำตอบข้อไหน?';
              hostCfg.options = ['ตัวเลือก A', 'ตัวเลือก B', 'ตัวเลือก C', 'ตัวเลือก D'];
            }
            hostCfg.isOpen = true;
            syncOpenBtn();
            await resetAllVotes();
            renderRows();
            await pushPoll();
          });
        });

        pullResults = async () => {
          loadLocalPollCounts();
          if (apiBase) {
            try {
              const res = await fetch(`${apiBase}/api/polls/${encodeURIComponent(hostCfg.pollId)}`);
              if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data.counts) && data.counts.length === hostCfg.options.length) {
                  const srvTotal = Number(data.totalVotes) || 0;
                  if (srvTotal >= latestTotal) {
                    latestCounts = data.counts;
                    latestTotal = srvTotal;
                    saveLocalPollState();
                  }
                }
              }
            } catch (_) {}
          }
          syncBarStatsOnly();
        };

        pollBc?.addEventListener('message', (e) => {
          const d = e.data;
          if (d?.pollId === hostCfg.pollId && Array.isArray(d.counts)) {
            latestCounts = d.counts;
            latestTotal = Number(d.totalVotes) || latestCounts.reduce((a, b) => a + b, 0);
            syncBarStatsOnly();
          }
        });

        winEl.querySelector('#tb-poll-add-opt')?.addEventListener('click', () => {
          hostCfg.options = Array.from(rowsEl.querySelectorAll('[data-tb-opt]')).map(x => x.value);
          if (hostCfg.options.length >= 6) return;
          hostCfg.options.push(`ตัวเลือก ${String.fromCharCode(65 + hostCfg.options.length)}`);
          latestCounts.push(0);
          renderRows();
          pushPoll();
        });

        openBtn?.addEventListener('click', () => {
          hostCfg.isOpen = !hostCfg.isOpen;
          syncOpenBtn();
          pushPoll();
        });

        winEl.querySelector('#tb-poll-reset')?.addEventListener('click', resetAllVotes);

        winEl.querySelector('#tb-poll-copy')?.addEventListener('click', async (e) => {
          const btn = e.currentTarget;
          const url = getVoteUrl();
          try { await navigator.clipboard.writeText(url); } catch (_) {}
          btn.classList.add('bg-[#F4D03F]');
          btn.textContent = '✓ คัดลอก';
          setTimeout(() => { btn.classList.remove('bg-[#F4D03F]'); btn.textContent = 'ลิงก์'; }, 1600);
        });

        // Center-Stage Poll Overlay (Projector-ready QR + Live Bar Chart)
        const openCenterPollStage = () => {
          let m = document.getElementById('center-poll-overlay');
          if (!m) {
            m = document.createElement('div');
            m.id = 'center-poll-overlay';
            m.className = 'fixed inset-0 z-[180] bg-[#111111]/75 backdrop-blur-[4px] flex items-center justify-center p-4 sm:p-8';
            m.innerHTML = `
              <div class="vox-panel-enter vox-card bg-white w-full max-w-4xl p-5 sm:p-7 flex flex-col gap-5">
                <div class="flex flex-wrap items-center justify-between gap-2 pb-3 border-b-[2.5px] border-[#111111]">
                  <div class="flex items-center gap-2">
                    <div class="inline-flex items-center gap-2 bg-[#111111] text-[#F8F6F0] px-3 py-1 rounded-md font-display font-extrabold text-xs tracking-wider shadow-[3px_3px_0px_#F4D03F]">
                      <span id="cp-status-dot" class="w-2.5 h-2.5 rounded-full bg-[#10B981]"></span>
                      <span id="cp-status-text">LIVE QR POLL</span>
                    </div>
                    <span id="cp-total-badge" class="bg-[#F4D03F] border-2 border-[#111111] px-3 py-0.5 rounded-lg font-display font-black text-xs shadow-[2px_2px_0px_#111111]">0 โหวต</span>
                  </div>
                  <div class="flex flex-wrap items-center gap-1.5">
                    <button type="button" id="cp-toggle-open" class="btn-vox bg-[#10B981] text-white font-display font-extrabold text-xs px-3 py-1.5 rounded-xl cursor-pointer">เปิดรับโหวต</button>
                    <button type="button" id="cp-toggle-hide" class="btn-vox bg-white hover:bg-[#F4D03F] text-[#111111] font-display font-bold text-xs px-3 py-1.5 rounded-xl cursor-pointer">ซ่อนผล</button>
                    <button type="button" id="cp-reset-btn" class="btn-vox bg-white hover:bg-red-50 text-[#E74C3C] font-display font-bold text-xs px-2.5 py-1.5 rounded-xl cursor-pointer">ล้าง 0</button>
                    <button type="button" id="cp-close-btn" class="btn-vox bg-[#F8F6F0] hover:bg-[#F4D03F] text-[#111111] font-display font-bold text-xs px-3 py-1.5 rounded-xl inline-flex items-center gap-1 cursor-pointer">${TB_ICONS.shrink}<span>ย่อกลับ</span></button>
                  </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
                  <div class="md:col-span-4 bg-[#F8F6F0] border-2 border-[#111111] rounded-2xl p-4 flex flex-col items-center gap-2.5 text-center shadow-[4px_4px_0px_#111111]">
                    <img id="cp-qr-img" src="" alt="QR Code โหวตสด" class="w-44 h-44 sm:w-52 sm:h-52 rounded-xl border-2 border-[#111111] bg-white p-1.5" />
                    <span class="font-display font-black text-sm text-[#111111]">สแกน QR เพื่อโหวตจากมือถือ</span>
                    <button type="button" id="cp-copy-btn" class="w-full btn-vox bg-white hover:bg-[#F4D03F] text-[#111111] font-display font-bold text-xs py-1.5 rounded-xl cursor-pointer">คัดลอกลิงก์โหวต</button>
                  </div>

                  <div class="md:col-span-8 flex flex-col gap-3.5">
                    <h2 id="cp-question" class="thai-safe font-display font-black text-2xl sm:text-3xl text-[#111111]"></h2>
                    <div id="cp-bars" class="flex flex-col gap-2.5"></div>
                  </div>
                </div>
              </div>
            `;
            document.body.appendChild(m);
            m.addEventListener('click', (ev) => {
              if (ev.target === m) m.classList.add('hidden');
            });
            m.querySelector('#cp-close-btn')?.addEventListener('click', () => m.classList.add('hidden'));
            m.querySelector('#cp-toggle-open')?.addEventListener('click', () => {
              hostCfg.isOpen = !hostCfg.isOpen;
              syncOpenBtn();
              pushPoll();
            });
            m.querySelector('#cp-toggle-hide')?.addEventListener('click', () => {
              hostCfg.hideResults = !hostCfg.hideResults;
              saveHostCfg();
              syncCenterPollOverlay();
            });
            m.querySelector('#cp-reset-btn')?.addEventListener('click', resetAllVotes);
            m.querySelector('#cp-copy-btn')?.addEventListener('click', async (e) => {
              const btn = e.currentTarget;
              try { await navigator.clipboard.writeText(getVoteUrl()); } catch (_) {}
              btn.textContent = '✓ คัดลอกลิงก์แล้ว!';
              setTimeout(() => { btn.textContent = 'คัดลอกลิงก์โหวต'; }, 1600);
            });
          }

          syncCenterPollOverlay = () => {
            const ov = document.getElementById('center-poll-overlay');
            if (!ov || ov.classList.contains('hidden')) return;
            ov.querySelector('#cp-question').textContent = hostCfg.question;
            ov.querySelector('#cp-qr-img').src = qrEl.src;
            ov.querySelector('#cp-total-badge').textContent = `${latestTotal} โหวต`;
            const dot = ov.querySelector('#cp-status-dot');
            const stTxt = ov.querySelector('#cp-status-text');
            const openToggle = ov.querySelector('#cp-toggle-open');
            const hideToggle = ov.querySelector('#cp-toggle-hide');
            if (dot) {
              dot.classList.toggle('bg-[#10B981]', hostCfg.isOpen);
              dot.classList.toggle('bg-[#E74C3C]', !hostCfg.isOpen);
            }
            if (stTxt) stTxt.textContent = hostCfg.isOpen ? 'LIVE QR POLL • เปิดโหวต' : 'LIVE QR POLL • ปิดโหวต';
            if (openToggle) {
              openToggle.textContent = hostCfg.isOpen ? 'เปิดรับโหวต' : 'ปิดโหวต';
              openToggle.classList.toggle('bg-[#10B981]', hostCfg.isOpen);
              openToggle.classList.toggle('bg-[#E74C3C]', !hostCfg.isOpen);
            }
            if (hideToggle) {
              hideToggle.textContent = hostCfg.hideResults ? 'เปิดเผยผล' : 'ซ่อนผล';
              hideToggle.classList.toggle('bg-[#111111]', hostCfg.hideResults);
              hideToggle.classList.toggle('text-[#F4D03F]', hostCfg.hideResults);
              hideToggle.classList.toggle('bg-white', !hostCfg.hideResults);
              hideToggle.classList.toggle('text-[#111111]', !hostCfg.hideResults);
            }

            const total = Math.max(1, latestTotal);
            const maxCnt = Math.max(0, ...latestCounts);
            const showLeader = !hostCfg.hideResults && latestTotal > 0 && maxCnt > 0;
            const barsEl = ov.querySelector('#cp-bars');
            if (barsEl) {
              barsEl.innerHTML = hostCfg.options.map((opt, idx) => {
                const cnt = latestCounts[idx] || 0;
                const pct = hostCfg.hideResults ? 0 : (latestTotal > 0 ? Math.round((cnt / total) * 100) : 0);
                const color = POLL_COLORS[idx % POLL_COLORS.length];
                const isLeader = showLeader && cnt === maxCnt;
                const statText = hostCfg.hideResults ? '••% (ซ่อนผล)' : `${pct}% (${cnt})`;
                return `
                  <div class="w-full text-left bg-[#F8F6F0] border-2 border-[#111111] rounded-xl p-3 flex flex-col gap-1.5 shadow-[3px_3px_0px_#111111]">
                    <div class="flex items-center justify-between gap-2 font-display font-extrabold text-sm sm:text-base text-[#111111]">
                      <span class="flex items-center gap-2 min-w-0">
                        <span class="w-6 h-6 rounded-lg border-2 border-[#111111] font-display font-black text-xs flex items-center justify-center shrink-0" style="background:${color}; color:${color === '#F4D03F' ? '#111111' : '#FFFFFF'}">${String.fromCharCode(65 + idx)}</span>
                        ${isLeader ? '<span class="px-1.5 py-0.5 rounded bg-[#111111] text-[#F4D03F] text-[10px] shrink-0">👑 นำอยู่</span>' : ''}
                        <span class="truncate">${escP(opt)}</span>
                      </span>
                      <span class="tabular-nums shrink-0 font-black">${statText}</span>
                    </div>
                    <div class="w-full h-4 bg-white border-2 border-[#111111] rounded-lg overflow-hidden p-0.5">
                      <div class="h-full rounded-[3px] transition-all duration-500" style="width:${pct}%; background:${color};"></div>
                    </div>
                  </div>
                `;
              }).join('');
            }
          };

          m.classList.remove('hidden');
          syncCenterPollOverlay();
        };

        qrEl?.addEventListener('click', openCenterPollStage);
        winEl.querySelector('#tb-poll-stage-btn')?.addEventListener('click', openCenterPollStage);

        syncQr();
        syncOpenBtn();
        renderRows();
        pushPoll();
      }, {
        onShow: () => {
          if (pollSyncTimerId) clearInterval(pollSyncTimerId);
          pullResults();
          pollSyncTimerId = setInterval(pullResults, 2000);
        },
        onHide: () => {
          if (pollSyncTimerId) { clearInterval(pollSyncTimerId); pollSyncTimerId = null; }
        }
      });
    });

    // 3.9 Big-Room Multi-Monitor & Cross-Computer Screen Share Tool
    const openShareSubWindow = () => {
      const getCode = () => window.VoxCloudSync?.getShareCode?.() || 'STAGE';
      const getDispUrl = () => window.VoxCloudSync?.getDisplayUrl?.(getCode()) || `${location.origin}${location.pathname}?display=1&room=${encodeURIComponent(getCode())}`;

      toggleSubWindow('share', 'แชร์จอห้องใหญ่ (Screen Share)', 'w-80', `
        <!-- Method 1: 2nd Monitor / HDMI Projector Popup -->
        <div class="bg-white border-2 border-[#111111] rounded-xl p-2.5 flex flex-col gap-2 shadow-[2px_2px_0px_#111111]">
          <div class="flex items-center justify-between">
            <span class="font-display font-extrabold text-[11px] text-[#111111]">1. จอที่ 2 / โปรเจกเตอร์ (HDMI / AirPlay)</span>
            <span class="bg-[#10B981]/20 border border-[#111111] px-1.5 py-0.5 rounded font-display font-black text-[9px] text-[#111111]">0ms Sync</span>
          </div>
          <p class="text-[10px] font-semibold text-[#111111]/65 leading-snug">เปิดหน้าต่างจอฉายแบบไร้ปุ่มควบคุม เพื่อลากไปวางบนจอมอนิเตอร์ที่ 2 หรือโปรเจกเตอร์</p>
          <button type="button" id="tb-share-open-2nd" class="w-full btn-vox bg-[#F4D03F] hover:bg-[#f2c61d] text-[#111111] font-display font-extrabold text-xs py-2 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer">
            ${TB_ICONS.share}
            <span>เปิดหน้าต่างจอฉายที่ 2</span>
          </button>
        </div>

        <!-- Method 2: Other Computers / Monitors in Big Room via Room Code & QR -->
        <div class="bg-white border-2 border-[#111111] rounded-xl p-2.5 flex flex-col gap-2 shadow-[2px_2px_0px_#111111]">
          <div class="flex items-center justify-between">
            <span class="font-display font-extrabold text-[11px] text-[#111111]">2. แชร์ไปคอม/จออื่นในห้องใหญ่</span>
            <span class="inline-flex items-center gap-1 bg-[#111111] text-[#F4D03F] px-2 py-0.5 rounded font-display font-black text-[10px]">
              <span class="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse"></span>
              <span id="tb-share-code-badge">${getCode()}</span>
            </span>
          </div>
          <div class="flex items-center gap-2.5">
            <img id="tb-share-qr" src="" alt="QR จอฉาย" class="w-16 h-16 rounded-lg border border-[#111111] bg-[#F8F6F0] shrink-0" />
            <div class="min-w-0 flex-1 flex flex-col gap-1.5">
              <p class="text-[10px] font-semibold text-[#111111]/70 leading-tight">สแกนหรือเปิดลิงก์บนคอมพิวเตอร์ / Smart TV เครื่องอื่นในห้องเพื่อซิงค์หน้าจอสด</p>
              <div class="flex gap-1">
                <button type="button" id="tb-share-copy-url" class="flex-1 btn-vox bg-[#111111] text-[#F4D03F] font-display font-extrabold text-[10px] py-1 px-2 rounded-lg cursor-pointer">คัดลอกลิงก์จอฉาย</button>
                <button type="button" id="tb-share-new-code" title="สุ่มรหัสห้องใหม่" class="btn-vox bg-[#F8F6F0] hover:bg-[#F4D03F] text-[#111111] font-display font-bold text-[10px] px-2 py-1 rounded-lg cursor-pointer">${TB_ICONS.reset}</button>
              </div>
            </div>
          </div>

          <!-- Join Another Host Computer by Room Code -->
          <div class="pt-1.5 border-t border-[#111111]/15 flex items-center gap-1.5">
            <input id="tb-share-join-input" type="text" maxlength="12" placeholder="ใส่รหัสห้องเพื่อรับภาพจากจอหลัก..." class="flex-1 min-w-0 bg-[#F8F6F0] border-2 border-[#111111] rounded-lg px-2 py-1 text-[11px] font-display font-bold uppercase text-[#111111] focus:outline-none focus:bg-white" />
            <button type="button" id="tb-share-join-btn" class="btn-vox bg-white hover:bg-[#F4D03F] text-[#111111] font-display font-extrabold text-[10px] px-2.5 py-1 rounded-lg shrink-0 cursor-pointer">เข้าร่วมจอ</button>
          </div>
        </div>

        <!-- Method 3: Native OS / Wireless Screen Cast -->
        <button type="button" id="tb-share-native-cast" class="w-full btn-vox bg-white hover:bg-[#F4D03F] text-[#111111] font-display font-bold text-[11px] py-1.5 px-3 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer">
          <span>📡 แชร์ภาพหน้าจอสดของระบบ (Screen Cast)</span>
        </button>
      `, (winEl) => {
        const codeBadge = winEl.querySelector('#tb-share-code-badge');
        const qrImg = winEl.querySelector('#tb-share-qr');
        const joinInput = winEl.querySelector('#tb-share-join-input');

        const syncShareUI = () => {
          const code = getCode();
          const url = getDispUrl();
          if (codeBadge) codeBadge.textContent = `ห้อง: ${code}`;
          if (qrImg) qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(url)}`;
        };

        winEl.querySelector('#tb-share-open-2nd')?.addEventListener('click', () => {
          if (window.VoxCloudSync?.openSecondMonitorWindow) {
            window.VoxCloudSync.openSecondMonitorWindow();
          } else {
            window.open(getDispUrl(), 'HelpDaiBigRoomDisplay', 'width=1280,height=720');
          }
        });

        winEl.querySelector('#tb-share-copy-url')?.addEventListener('click', async (e) => {
          const btn = e.currentTarget;
          window.VoxCloudSync?.broadcastNow?.();
          try { await navigator.clipboard.writeText(getDispUrl()); } catch (_) {}
          btn.textContent = '✓ คัดลอกลิงก์แล้ว!';
          setTimeout(() => { btn.textContent = 'คัดลอกลิงก์จอฉาย'; }, 1700);
        });

        winEl.querySelector('#tb-share-new-code')?.addEventListener('click', () => {
          window.VoxCloudSync?.regenerateShareCode?.();
          syncShareUI();
        });

        const handleJoinRoom = () => {
          const val = (joinInput?.value || '').trim().toUpperCase();
          if (!val) return;
          window.VoxCloudSync?.joinShareRoom?.(val, true);
        };
        winEl.querySelector('#tb-share-join-btn')?.addEventListener('click', handleJoinRoom);
        joinInput?.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); handleJoinRoom(); } });

        winEl.querySelector('#tb-share-native-cast')?.addEventListener('click', async () => {
          if (!navigator.mediaDevices?.getDisplayMedia) return;
          try {
            let stream;
            try {
              stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
            } catch (_) {
              stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
            }
            const w = window.open('', 'HelpDaiLiveMirror', 'width=1280,height=720,menubar=no,toolbar=no');
            if (w) {
              w.document.write('<!DOCTYPE html><html><head><title>HelpDaiCha — Live Screen Mirror</title><style>html,body{margin:0;background:#000;height:100%;overflow:hidden;display:flex;align-items:center;justify-content:center}video{width:100%;height:100%;object-fit:contain}</style></head><body><video id="v" autoplay playsinline muted></video></body></html>');
              w.document.close();
              const v = w.document.getElementById('v');
              if (v) {
                v.srcObject = stream;
                v.play?.().catch(() => {});
              }
              w.addEventListener('beforeunload', () => stream.getTracks().forEach(t => t.stop()));
            } else {
              stream.getTracks().forEach(t => t.stop());
            }
          } catch (_) {}
        });

        syncShareUI();
      }, {
        onShow: () => {
          window.VoxCloudSync?.broadcastNow?.();
        }
      });
    };

    document.getElementById('tb-share-btn')?.addEventListener('click', openShareSubWindow);
    document.getElementById('header-screenshare-btn')?.addEventListener('click', openShareSubWindow);

    // 4. Victory Toggle
    document.getElementById('tb-victory-btn').addEventListener('click', () => {
      if (window.VoxSecurity?.isLocked()) return window.VoxSecurity.toggleLock();
      window.VoxScoreboardAPI?.toggleVictory();
    });

    // 5. Flip Side (Left <-> Right) with smooth FLIP glide
    document.getElementById('tb-flip-btn').addEventListener('click', () => {
      const first = bar.getBoundingClientRect();
      side = side === 'left' ? 'right' : 'left';
      try { localStorage.setItem(SIDE_KEY, side); } catch (_) {}
      applySide();
      Object.values(subWindows).forEach((w) => {
        const isOpen = !w.el.classList.contains('hidden');
        if (isOpen && !w.customPos) {
          const r = w.el.getBoundingClientRect();
          w.customPos = { left: r.left, top: r.top };
          positionSubWindow(w, w.offset);
        } else if (!isOpen && !w.customPos) {
          positionSubWindow(w, w.offset);
        }
      });
      const last = bar.getBoundingClientRect();
      const dx = first.left - last.left;
      if (Math.abs(dx) > 1) {
        bar.style.transition = 'none';
        bar.style.transform = `translate(${dx}px, -50%)`;
        void bar.offsetWidth;
        bar.style.transition = 'transform 0.48s cubic-bezier(0.22, 1, 0.36, 1)';
        bar.style.transform = 'translate(0, -50%)';
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initToolbox, { once: true });
  } else {
    initToolbox();
  }
})();
