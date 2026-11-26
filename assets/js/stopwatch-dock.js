/* Vox Physical Stopwatch & Kitchen Egg Timer (Throwable, Edge-Peek, Scroll-to-Wind, Cross-Page Persistent) */
(() => {
  'use strict';
  if (window.VoxStopwatch) return;
  if (new URLSearchParams(window.location.search).get('display') === '1') return;

  const STATE_KEY = 'helpdai_stopwatch_state_v1';
  const POS_KEY = 'helpdai_stopwatch_pos_v1';

  // Web Audio mechanical SFX (ratchet wind click, crown click, tick-tock, alarm bell)
  let audioCtx = null;
  let alarmAudioEl = null;
  const getAudioCtx = () => {
    try {
      if (!audioCtx) {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (Ctx) audioCtx = new Ctx();
      }
      if (audioCtx?.state === 'suspended') audioCtx.resume().catch(() => {});
      return audioCtx;
    } catch (_) {
      return null;
    }
  };

  const playClickSfx = (pitch = 920, dur = 0.032, vol = 0.09) => {
    const ctx = getAudioCtx();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(pitch, now);
      osc.frequency.exponentialRampToValueAtTime(pitch * 0.45, now + dur);
      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + dur + 0.01);
    } catch (_) {}
  };

  const playTickSfx = (urgent = false) => {
    playClickSfx(urgent ? 1320 : 780, 0.022, urgent ? 0.08 : 0.045);
  };

  const playAlarmBell = () => {
    try {
      if (!alarmAudioEl) {
        alarmAudioEl = new Audio('assets/audio/timer-timesup.mp3');
        alarmAudioEl.volume = 0.72;
      }
      alarmAudioEl.currentTime = 0;
      alarmAudioEl.play().catch(() => playSynthBell());
    } catch (_) {
      playSynthBell();
    }
  };

  const playSynthBell = () => {
    const ctx = getAudioCtx();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      for (let k = 0; k < 6; k++) {
        const t = now + k * 0.09;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(k % 2 === 0 ? 1568 : 1975.5, t);
        gain.gain.setValueAtTime(0.11, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.15);
      }
    } catch (_) {}
  };

  // Persistent timer state
  const defaultState = () => ({
    mode: 'countdown',     // 'countdown' | 'stopwatch'
    presetSec: 60,         // default 1 min egg timer
    remainingMs: 60000,    // used in countdown mode
    elapsedMs: 0,          // used in stopwatch mode
    running: false,
    lastTickAt: 0,
    ringing: false,
    tickSound: true
  });

  const readState = () => {
    try {
      const raw = JSON.parse(localStorage.getItem(STATE_KEY) || 'null');
      if (raw && typeof raw === 'object') {
        const st = { ...defaultState(), ...raw };
        if (st.running && st.lastTickAt > 0) {
          const dt = Math.max(0, Date.now() - st.lastTickAt);
          if (st.mode === 'countdown') {
            st.remainingMs = Math.max(0, st.remainingMs - dt);
            if (st.remainingMs === 0) {
              st.running = false;
              st.ringing = true;
            }
          } else {
            st.elapsedMs += dt;
          }
          st.lastTickAt = Date.now();
        }
        return st;
      }
    } catch (_) {}
    return defaultState();
  };

  let state = readState();
  const saveState = () => {
    try { localStorage.setItem(STATE_KEY, JSON.stringify(state)); } catch (_) {}
  };

  const loadPos = () => {
    try {
      const p = JSON.parse(localStorage.getItem(POS_KEY) || 'null');
      if (p && typeof p.x === 'number' && typeof p.y === 'number') {
        return {
          x: p.x,
          y: p.y,
          side: p.side === 'right' ? 'right' : 'left',
          hiddenMode: p.hiddenMode !== false
        };
      }
    } catch (_) {}
    return { x: 12, y: Math.round(window.innerHeight * 0.42), side: 'left', hiddenMode: true };
  };

  let dockPos = loadPos();
  const savePos = () => {
    try { localStorage.setItem(POS_KEY, JSON.stringify(dockPos)); } catch (_) {}
  };

  const buildTickMarksSvg = () => {
    const parts = [];
    for (let i = 0; i < 60; i++) {
      const ang = (i * 6 - 90) * (Math.PI / 180);
      const major = i % 5 === 0;
      const r1 = major ? 62 : 66;
      const r2 = 72;
      const x1 = (110 + Math.cos(ang) * r1).toFixed(1);
      const y1 = (134 + Math.sin(ang) * r1).toFixed(1);
      const x2 = (110 + Math.cos(ang) * r2).toFixed(1);
      const y2 = (134 + Math.sin(ang) * r2).toFixed(1);
      parts.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#111111" stroke-width="${major ? 3 : 1.5}" stroke-linecap="round"/>`);
    }
    return parts.join('');
  };

  function mountStopwatchDock() {
    if (document.getElementById('stopwatch-side-dock')) return;

    const dock = document.createElement('aside');
    dock.id = 'stopwatch-side-dock';
    dock.setAttribute('aria-label', 'นาฬิกาจับเวลาแบบพกพา');
    dock.style.cssText = [
      'position: fixed',
      'left: 0',
      'top: 0',
      'z-index: 154',
      'width: 216px',
      'transition: transform 0.34s cubic-bezier(0.22, 1, 0.36, 1)',
      'will-change: transform',
      'pointer-events: auto',
      'user-select: none'
    ].join(';');

    dock.innerHTML = `
      <div id="sw-shell" class="relative w-[216px] group">
        <div id="sw-visual-box" class="vox-grab relative w-[216px] h-[242px]" title="ลากหรือโยนเพื่อย้าย • เลื่อนลูกกลิ้งเพื่อหมุนตั้งเวลา • คลิกปุ่มบนเพื่อเริ่ม/พัก • คลิกขวาเปิดเมนู">
          <svg id="sw-svg" viewBox="0 0 220 246" class="w-full h-full block overflow-visible drop-shadow-[5px_6px_0px_rgba(17,17,17,0.85)]">
            <!-- Top Ring Loop -->
            <circle cx="110" cy="18" r="11" fill="none" stroke="#111111" stroke-width="5"/>

            <!-- Top Crown Plunger (Start / Pause) -->
            <g id="sw-crown-btn" class="cursor-pointer" style="transition: transform 0.12s cubic-bezier(0.22,1,0.36,1);">
              <rect x="97" y="23" width="26" height="14" rx="4" fill="#111111"/>
              <rect x="91" y="17" width="38" height="12" rx="5" fill="#F4D03F" stroke="#111111" stroke-width="3.5"/>
              <line x1="103" y1="19" x2="103" y2="27" stroke="#111111" stroke-width="2"/>
              <line x1="110" y1="19" x2="110" y2="27" stroke="#111111" stroke-width="2"/>
              <line x1="117" y1="19" x2="117" y2="27" stroke="#111111" stroke-width="2"/>
            </g>

            <!-- Left Side Pusher (Mode Switch: Egg Timer <-> Stopwatch) -->
            <g id="sw-mode-btn" class="cursor-pointer" transform="rotate(-38 110 134)">
              <rect x="102" y="28" width="16" height="16" rx="4" fill="#2980B9" stroke="#111111" stroke-width="3.2"/>
            </g>

            <!-- Right Side Pusher (Reset) -->
            <g id="sw-reset-btn" class="cursor-pointer" transform="rotate(38 110 134)">
              <rect x="102" y="28" width="16" height="16" rx="4" fill="#FFFFFF" stroke="#111111" stroke-width="3.2"/>
            </g>

            <!-- Solid-Color Outer Case / Bezel -->
            <circle id="sw-bezel" cx="110" cy="134" r="95" fill="#E74C3C" stroke="#111111" stroke-width="5"/>

            <!-- Crisp Inner Paper Dial Face -->
            <circle cx="110" cy="134" r="78" fill="#F8F6F0" stroke="#111111" stroke-width="3.5"/>

            <!-- Egg Timer Pie Wedge Sweep -->
            <path id="sw-wedge" d="" fill="#E74C3C" opacity="0.28"/>

            <!-- 60 Mechanical Tick Marks -->
            <g>${buildTickMarksSvg()}</g>

            <!-- Mode Badge at 12 o'clock -->
            <rect x="76" y="82" width="68" height="18" rx="5" fill="#111111"/>
            <text id="sw-mode-label" x="110" y="94.5" text-anchor="middle" fill="#F4D03F" font-family="Prompt, sans-serif" font-weight="900" font-size="9.5" letter-spacing="0.06em">TIMER</text>

            <!-- Digital LCD Window -->
            <rect x="63" y="154" width="94" height="31" rx="7" fill="#FFFFFF" stroke="#111111" stroke-width="3"/>
            <text id="sw-lcd" x="110" y="176" text-anchor="middle" fill="#111111" font-family="Prompt, sans-serif" font-weight="900" font-size="19" style="font-variant-numeric:tabular-nums;">01:00</text>

            <!-- Sweeping Mechanical Second Hand -->
            <g id="sw-hand" transform="rotate(0 110 134)">
              <line x1="110" y1="150" x2="110" y2="70" stroke="#111111" stroke-width="4" stroke-linecap="round"/>
              <line x1="110" y1="134" x2="110" y2="74" stroke="#E74C3C" stroke-width="2.2" stroke-linecap="round"/>
              <circle cx="110" cy="134" r="7.5" fill="#F4D03F" stroke="#111111" stroke-width="3"/>
              <circle cx="110" cy="134" r="2.2" fill="#111111"/>
            </g>
          </svg>
        </div>

        <!-- Minimal Controls Pill (fades in cleanly on hover) -->
        <div class="mt-1 flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-200">
          <button type="button" data-sw-preset="30" class="btn-vox bg-white hover:bg-[#F4D03F] text-[#111111] font-display font-black text-[10px] px-2 py-1 rounded-lg cursor-pointer">30s</button>
          <button type="button" data-sw-preset="60" class="btn-vox bg-white hover:bg-[#F4D03F] text-[#111111] font-display font-black text-[10px] px-2 py-1 rounded-lg cursor-pointer">1m</button>
          <button type="button" data-sw-preset="180" class="btn-vox bg-white hover:bg-[#F4D03F] text-[#111111] font-display font-black text-[10px] px-2 py-1 rounded-lg cursor-pointer">3m</button>
          <button type="button" id="sw-hide-btn" title="ซ่อนเข้าขอบจอ / แสดงค้าง" class="w-7 h-7 rounded-lg border-2 border-[#111111] bg-white hover:bg-[#F4D03F] text-[#111111] font-display font-black text-[11px] flex items-center justify-center cursor-pointer shadow-[2px_2px_0px_#111111]">⇄</button>
          <button type="button" id="sw-menu-btn" title="เมนูนาฬิกา" class="w-7 h-7 rounded-lg border-2 border-[#111111] bg-[#111111] text-[#F4D03F] font-display font-black text-xs flex items-center justify-center cursor-pointer shadow-[2px_2px_0px_#111111]">⋯</button>
        </div>

        <!-- Custom Popover Menu -->
        <div id="sw-custom-menu" class="hidden absolute left-1/2 -translate-x-1/2 bottom-10 z-50 w-56 vox-card bg-[#F8F6F0] p-1.5 flex-col gap-1 vox-panel-enter">
          <div class="px-2 py-1 border-b border-[#111111]/15 font-display font-black text-[10px] uppercase tracking-wider text-[#111111]/60">Stopwatch Menu</div>
          <button type="button" data-sw-act="toggle" class="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-[#F4D03F] font-display font-bold text-xs text-[#111111] flex items-center justify-between cursor-pointer transition-colors">
            <span>เริ่ม / พัก</span>
            <span id="sw-menu-run-badge" class="text-[10px] px-1.5 py-0.5 rounded bg-[#111111] text-[#F4D03F]">PAUSED</span>
          </button>
          <button type="button" data-sw-act="mode" class="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-[#F4D03F] font-display font-bold text-xs text-[#111111] flex items-center justify-between cursor-pointer transition-colors">
            <span>โหมด</span>
            <span id="sw-menu-mode-badge" class="text-[10px] px-1.5 py-0.5 rounded bg-[#E74C3C] text-white">นับถอยหลัง</span>
          </button>
          <div class="px-2 pt-1 pb-0.5 font-display font-bold text-[10px] text-[#111111]/55">ตั้งเวลาด่วน (หรือเลื่อนลูกกลิ้ง)</div>
          <div class="grid grid-cols-4 gap-1 px-1 pb-1">
            <button type="button" data-sw-preset="15" class="py-1 rounded-md border-2 border-[#111111] bg-white hover:bg-[#F4D03F] font-display font-black text-[10px] cursor-pointer">15s</button>
            <button type="button" data-sw-preset="60" class="py-1 rounded-md border-2 border-[#111111] bg-white hover:bg-[#F4D03F] font-display font-black text-[10px] cursor-pointer">1m</button>
            <button type="button" data-sw-preset="180" class="py-1 rounded-md border-2 border-[#111111] bg-white hover:bg-[#F4D03F] font-display font-black text-[10px] cursor-pointer">3m</button>
            <button type="button" data-sw-preset="300" class="py-1 rounded-md border-2 border-[#111111] bg-white hover:bg-[#F4D03F] font-display font-black text-[10px] cursor-pointer">5m</button>
          </div>
          <button type="button" data-sw-act="sound" class="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-[#F4D03F] font-display font-bold text-xs text-[#111111] flex items-center justify-between cursor-pointer transition-colors">
            <span>เสียงติ๊กต็อก</span>
            <span id="sw-menu-sound-badge" class="text-[10px] px-1.5 py-0.5 rounded bg-white border border-[#111111]">ON</span>
          </button>
          <button type="button" data-sw-act="toggle-hide" class="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-[#F4D03F] font-display font-bold text-xs text-[#111111] flex items-center justify-between cursor-pointer transition-colors">
            <span>ซ่อนเข้าขอบจออัตโนมัติ</span>
            <span id="sw-menu-hide-badge" class="text-[10px] px-1.5 py-0.5 rounded bg-white border border-[#111111]">ON</span>
          </button>
          <button type="button" data-sw-act="reset" class="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-red-100 font-display font-bold text-xs text-[#E74C3C] flex items-center justify-between cursor-pointer transition-colors">
            <span>รีเซ็ตเวลา</span>
            <span class="text-[10px] font-black">↺</span>
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(dock);

    const visualBox = document.getElementById('sw-visual-box');
    const svgEl = document.getElementById('sw-svg');
    const bezelEl = document.getElementById('sw-bezel');
    const wedgeEl = document.getElementById('sw-wedge');
    const handEl = document.getElementById('sw-hand');
    const lcdEl = document.getElementById('sw-lcd');
    const modeLabelEl = document.getElementById('sw-mode-label');
    const crownEl = document.getElementById('sw-crown-btn');
    const modeBtnEl = document.getElementById('sw-mode-btn');
    const resetBtnEl = document.getElementById('sw-reset-btn');
    const customMenu = document.getElementById('sw-custom-menu');
    const hideBadge = document.getElementById('sw-menu-hide-badge');
    const modeBadge = document.getElementById('sw-menu-mode-badge');
    const runBadge = document.getElementById('sw-menu-run-badge');
    const soundBadge = document.getElementById('sw-menu-sound-badge');

    const PEEK_PX = 48;
    let isHoveredOrOpen = false;
    let hideTimer = null;
    let glideRaf = null;
    let tickRaf = null;
    let dragState = null;
    let lastWholeSec = -1;

    function formatClock(ms, showTenths) {
      const clamped = Math.max(0, ms);
      const totalSec = Math.floor(clamped / 1000);
      const mins = Math.floor(totalSec / 60);
      const secs = totalSec % 60;
      const mm = String(Math.min(99, mins)).padStart(2, '0');
      const ss = String(secs).padStart(2, '0');
      if (showTenths && mins < 10) {
        const tenths = Math.floor((clamped % 1000) / 100);
        return `${mm}:${ss}.${tenths}`;
      }
      return `${mm}:${ss}`;
    }

    function computeWedgePath(fraction) {
      const f = Math.max(0, Math.min(1, fraction));
      if (f <= 0.001) return '';
      const cx = 110;
      const cy = 134;
      const r = 73;
      if (f >= 0.999) {
        return `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx - 0.01} ${cy - r} Z`;
      }
      const angle = f * Math.PI * 2 - Math.PI / 2;
      const x = (cx + Math.cos(angle) * r).toFixed(2);
      const y = (cy + Math.sin(angle) * r).toFixed(2);
      const largeArc = f > 0.5 ? 1 : 0;
      return `M ${cx} ${cy} L ${cx} ${cy - r} A ${r} ${r} 0 ${largeArc} 1 ${x} ${y} Z`;
    }

    function applyDockPosition() {
      const W = window.innerWidth;
      const H = window.innerHeight;
      const dockW = 216;
      const dockH = 282;
      const clampedY = Math.max(12, Math.min(H - dockH, dockPos.y));
      dockPos.y = clampedY;

      const menuOpen = customMenu && !customMenu.classList.contains('hidden');
      const shouldHide = dockPos.hiddenMode && !isHoveredOrOpen && !menuOpen && !state.ringing;

      let tx = Math.max(8, Math.min(W - dockW - 8, dockPos.x));
      if (shouldHide) {
        tx = dockPos.side === 'left' ? -(dockW - PEEK_PX) : (W - PEEK_PX);
      } else if (dockPos.hiddenMode) {
        tx = dockPos.side === 'left' ? 12 : Math.max(12, W - dockW - 12);
      }
      dock.style.transform = `translate3d(${Math.round(tx)}px, ${Math.round(clampedY)}px, 0)`;
    }

    function renderFace() {
      const isCountdown = state.mode === 'countdown';
      const displayMs = isCountdown ? state.remainingMs : state.elapsedMs;
      const totalSec = displayMs / 1000;

      if (bezelEl) {
        bezelEl.setAttribute('fill', state.ringing ? '#E74C3C' : (isCountdown ? '#E74C3C' : '#F4D03F'));
      }
      if (modeLabelEl) {
        modeLabelEl.textContent = state.ringing ? 'TIME UP!' : (isCountdown ? 'TIMER' : 'STOPWATCH');
        modeLabelEl.setAttribute('fill', state.ringing ? '#FFFFFF' : '#F4D03F');
      }
      if (lcdEl) {
        lcdEl.textContent = formatClock(displayMs, !isCountdown);
      }

      if (isCountdown) {
        const denom = Math.max(1, state.presetSec * 1000);
        const frac = Math.min(1, displayMs / denom);
        const deg = frac * 360;
        if (handEl) handEl.setAttribute('transform', `rotate(${deg.toFixed(2)} 110 134)`);
        if (wedgeEl) {
          wedgeEl.setAttribute('d', computeWedgePath(frac));
          wedgeEl.setAttribute('fill', displayMs <= 10000 && displayMs > 0 ? '#E74C3C' : '#F4D03F');
          wedgeEl.setAttribute('opacity', displayMs <= 10000 && displayMs > 0 ? '0.45' : '0.32');
        }
      } else {
        const deg = ((totalSec % 60) / 60) * 360;
        if (handEl) handEl.setAttribute('transform', `rotate(${deg.toFixed(2)} 110 134)`);
        if (wedgeEl) wedgeEl.setAttribute('d', '');
      }

      svgEl?.classList.toggle('sw-ringing-shake', Boolean(state.ringing));

      if (runBadge) runBadge.textContent = state.ringing ? 'RINGING' : (state.running ? 'RUNNING' : 'PAUSED');
      if (modeBadge) {
        modeBadge.textContent = isCountdown ? 'นับถอยหลัง' : 'จับเวลาเดินหน้า';
        modeBadge.className = `text-[10px] px-1.5 py-0.5 rounded ${isCountdown ? 'bg-[#E74C3C] text-white' : 'bg-[#F4D03F] text-[#111111]'}`;
      }
      if (soundBadge) soundBadge.textContent = state.tickSound ? 'ON' : 'OFF';
      if (hideBadge) hideBadge.textContent = dockPos.hiddenMode ? 'ON' : 'OFF';
    }

    function stepLoop() {
      if (!state.running) {
        tickRaf = null;
        return;
      }
      const now = Date.now();
      const dt = Math.max(0, now - (state.lastTickAt || now));
      state.lastTickAt = now;

      if (state.mode === 'countdown') {
        state.remainingMs = Math.max(0, state.remainingMs - dt);
        const wholeSec = Math.ceil(state.remainingMs / 1000);
        if (wholeSec !== lastWholeSec) {
          lastWholeSec = wholeSec;
          if (state.tickSound && wholeSec > 0) {
            playTickSfx(wholeSec <= 5);
          }
          saveState();
        }
        if (state.remainingMs === 0) {
          state.running = false;
          state.ringing = true;
          saveState();
          playAlarmBell();
          isHoveredOrOpen = true;
          applyDockPosition();
          renderFace();
          tickRaf = null;
          return;
        }
      } else {
        state.elapsedMs += dt;
        const wholeSec = Math.floor(state.elapsedMs / 1000);
        if (wholeSec !== lastWholeSec) {
          lastWholeSec = wholeSec;
          if (state.tickSound) playTickSfx(false);
          saveState();
        }
      }

      renderFace();
      tickRaf = requestAnimationFrame(stepLoop);
    }

    function ensureLoop() {
      if (state.running && !tickRaf) {
        state.lastTickAt = Date.now();
        tickRaf = requestAnimationFrame(stepLoop);
      }
    }

    function pulseCrown() {
      if (!crownEl) return;
      crownEl.style.transform = 'translateY(4px)';
      setTimeout(() => { crownEl.style.transform = ''; }, 130);
    }

    function toggleRun() {
      pulseCrown();
      if (state.ringing) {
        state.ringing = false;
        state.remainingMs = state.presetSec * 1000;
        playClickSfx(620, 0.04, 0.08);
        saveState();
        renderFace();
        applyDockPosition();
        return;
      }
      if (state.mode === 'countdown' && state.remainingMs <= 0) {
        state.remainingMs = state.presetSec * 1000;
      }
      state.running = !state.running;
      state.lastTickAt = Date.now();
      lastWholeSec = -1;
      playClickSfx(state.running ? 1050 : 700, 0.035, 0.1);
      saveState();
      renderFace();
      ensureLoop();
    }

    function resetTimer() {
      state.running = false;
      state.ringing = false;
      if (state.mode === 'countdown') {
        state.remainingMs = state.presetSec * 1000;
      } else {
        state.elapsedMs = 0;
      }
      lastWholeSec = -1;
      playClickSfx(540, 0.045, 0.09);
      saveState();
      renderFace();
      applyDockPosition();
    }

    function setPreset(sec) {
      const clamped = Math.max(5, Math.min(3599, Math.round(sec)));
      state.mode = 'countdown';
      state.presetSec = clamped;
      state.remainingMs = clamped * 1000;
      state.running = false;
      state.ringing = false;
      lastWholeSec = -1;
      playClickSfx(880, 0.03, 0.08);
      saveState();
      renderFace();
      applyDockPosition();
    }

    function toggleMode() {
      state.running = false;
      state.ringing = false;
      state.mode = state.mode === 'countdown' ? 'stopwatch' : 'countdown';
      if (state.mode === 'countdown' && state.remainingMs <= 0) {
        state.remainingMs = state.presetSec * 1000;
      }
      playClickSfx(960, 0.035, 0.09);
      saveState();
      renderFace();
    }

    // Hover & proximity edge-peek
    function scheduleHide() {
      if (hideTimer) clearTimeout(hideTimer);
      hideTimer = setTimeout(() => {
        isHoveredOrOpen = false;
        applyDockPosition();
      }, 320);
    }

    dock.addEventListener('mouseenter', () => {
      if (hideTimer) clearTimeout(hideTimer);
      isHoveredOrOpen = true;
      applyDockPosition();
    });
    dock.addEventListener('mouseleave', () => { scheduleHide(); });

    window.addEventListener('mousemove', (e) => {
      if (!dockPos.hiddenMode || dragState) return;
      const nearEdge = dockPos.side === 'left'
        ? e.clientX <= 72
        : (window.innerWidth - e.clientX) <= 72;
      const nearY = e.clientY >= (dockPos.y - 36) && e.clientY <= (dockPos.y + 260);
      if (nearEdge && nearY) {
        if (hideTimer) clearTimeout(hideTimer);
        if (!isHoveredOrOpen) {
          isHoveredOrOpen = true;
          applyDockPosition();
        }
      }
    }, { passive: true });

    // Scroll wheel on stopwatch face winds up/down countdown time!
    visualBox?.addEventListener('wheel', (e) => {
      if (state.mode !== 'countdown') return;
      e.preventDefault();
      const step = e.shiftKey ? 30 : 10;
      const delta = e.deltaY < 0 ? step : -step;
      const curSec = Math.round(state.remainingMs / 1000);
      const nextSec = Math.max(10, Math.min(3590, curSec + delta));
      state.presetSec = nextSec;
      state.remainingMs = nextSec * 1000;
      state.ringing = false;
      playClickSfx(delta > 0 ? 1120 : 760, 0.018, 0.055);
      saveState();
      renderFace();
    }, { passive: false });

    // Drag & Throw with inertia + edge auto-dock
    visualBox?.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      if (e.target.closest('#sw-crown-btn, #sw-mode-btn, #sw-reset-btn')) return;
      if (glideRaf) {
        cancelAnimationFrame(glideRaf);
        glideRaf = null;
      }
      document.documentElement.classList.add('vox-grabbing');
      const curX = dockPos.hiddenMode
        ? (dockPos.side === 'left' ? 12 : Math.max(12, window.innerWidth - 228))
        : dockPos.x;
      dragState = {
        startX: e.clientX,
        startY: e.clientY,
        origX: curX,
        origY: dockPos.y,
        lastX: e.clientX,
        lastY: e.clientY,
        lastT: performance.now(),
        vx: 0,
        vy: 0,
        moved: false
      };
      dock.style.transition = 'none';
      e.preventDefault();
    });

    window.addEventListener('pointermove', (e) => {
      if (!dragState) return;
      const dx = e.clientX - dragState.startX;
      const dy = e.clientY - dragState.startY;
      if (!dragState.moved && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
        dragState.moved = true;
        dockPos.hiddenMode = false;
      }
      const now = performance.now();
      const dt = Math.max(8, now - dragState.lastT);
      dragState.vx = ((e.clientX - dragState.lastX) / dt) * 16;
      dragState.vy = ((e.clientY - dragState.lastY) / dt) * 16;
      dragState.lastX = e.clientX;
      dragState.lastY = e.clientY;
      dragState.lastT = now;

      if (dragState.moved) {
        const W = window.innerWidth;
        const H = window.innerHeight;
        dockPos.x = Math.max(8, Math.min(W - 224, dragState.origX + dx));
        dockPos.y = Math.max(12, Math.min(H - 282, dragState.origY + dy));
        dockPos.side = (dockPos.x + 108) < (W / 2) ? 'left' : 'right';
        dock.style.transform = `translate3d(${Math.round(dockPos.x)}px, ${Math.round(dockPos.y)}px, 0)`;
      }
    });

    const endDrag = () => {
      if (!dragState) return;
      const wasMoved = dragState.moved;
      let vx = Math.max(-42, Math.min(42, dragState.vx));
      let vy = Math.max(-42, Math.min(42, dragState.vy));
      dragState = null;
      document.documentElement.classList.remove('vox-grabbing');

      if (!wasMoved) {
        dock.style.transition = 'transform 0.34s cubic-bezier(0.22, 1, 0.36, 1)';
        toggleRun();
        return;
      }

      const speed = Math.hypot(vx, vy);
      if (speed < 2.2) {
        dock.style.transition = 'transform 0.34s cubic-bezier(0.22, 1, 0.36, 1)';
        const W = window.innerWidth;
        const nearLeft = dockPos.x <= 56;
        const nearRight = (W - (dockPos.x + 216)) <= 56;
        if (nearLeft || nearRight) {
          dockPos.side = nearLeft ? 'left' : 'right';
          dockPos.hiddenMode = true;
          isHoveredOrOpen = false;
        }
        savePos();
        applyDockPosition();
        renderFace();
        return;
      }

      const friction = 0.91;
      const glideStep = () => {
        const W = window.innerWidth;
        const H = window.innerHeight;
        dockPos.x += vx;
        dockPos.y += vy;
        vx *= friction;
        vy *= friction;

        if (dockPos.y < 12) { dockPos.y = 12; vy = Math.abs(vy) * 0.35; }
        else if (dockPos.y > H - 282) { dockPos.y = H - 282; vy = -Math.abs(vy) * 0.35; }

        if (dockPos.x <= 8 || dockPos.x >= W - 224) {
          dockPos.side = dockPos.x <= 8 ? 'left' : 'right';
          dockPos.x = dockPos.side === 'left' ? 8 : Math.max(8, W - 224);
          dockPos.hiddenMode = true;
          isHoveredOrOpen = false;
          glideRaf = null;
          dock.style.transition = 'transform 0.38s cubic-bezier(0.22, 1, 0.36, 1)';
          savePos();
          applyDockPosition();
          renderFace();
          return;
        }

        dockPos.side = (dockPos.x + 108) < (W / 2) ? 'left' : 'right';
        dock.style.transform = `translate3d(${Math.round(dockPos.x)}px, ${Math.round(dockPos.y)}px, 0)`;

        if (Math.hypot(vx, vy) > 0.45) {
          glideRaf = requestAnimationFrame(glideStep);
        } else {
          glideRaf = null;
          dock.style.transition = 'transform 0.34s cubic-bezier(0.22, 1, 0.36, 1)';
          const nearLeft = dockPos.x <= 64;
          const nearRight = (W - (dockPos.x + 216)) <= 64;
          if (nearLeft || nearRight) {
            dockPos.side = nearLeft ? 'left' : 'right';
            dockPos.hiddenMode = true;
            isHoveredOrOpen = false;
          }
          savePos();
          applyDockPosition();
          renderFace();
        }
      };
      glideRaf = requestAnimationFrame(glideStep);
    };

    window.addEventListener('pointerup', endDrag);
    window.addEventListener('pointercancel', endDrag);

    // Direct SVG mechanical buttons
    crownEl?.addEventListener('click', (e) => { e.stopPropagation(); toggleRun(); });
    modeBtnEl?.addEventListener('click', (e) => { e.stopPropagation(); toggleMode(); });
    resetBtnEl?.addEventListener('click', (e) => { e.stopPropagation(); resetTimer(); });

    // Custom menu & preset buttons
    const toggleMenu = (force) => {
      if (!customMenu) return;
      const open = typeof force === 'boolean' ? force : customMenu.classList.contains('hidden');
      customMenu.classList.toggle('hidden', !open);
      customMenu.classList.toggle('flex', open);
      if (open) {
        isHoveredOrOpen = true;
        applyDockPosition();
      }
    };

    visualBox?.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleMenu(true);
    });

    document.getElementById('sw-menu-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleMenu();
    });

    document.getElementById('sw-hide-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      dockPos.hiddenMode = !dockPos.hiddenMode;
      isHoveredOrOpen = !dockPos.hiddenMode;
      savePos();
      applyDockPosition();
      renderFace();
    });

    dock.addEventListener('click', (e) => {
      const presetBtn = e.target.closest('[data-sw-preset]');
      if (presetBtn) {
        e.stopPropagation();
        setPreset(Number(presetBtn.dataset.swPreset));
        toggleMenu(false);
        return;
      }
      const actBtn = e.target.closest('[data-sw-act]');
      if (!actBtn) return;
      e.stopPropagation();
      const act = actBtn.dataset.swAct;
      if (act === 'toggle') toggleRun();
      else if (act === 'mode') toggleMode();
      else if (act === 'sound') {
        state.tickSound = !state.tickSound;
        saveState();
        renderFace();
      } else if (act === 'toggle-hide') {
        dockPos.hiddenMode = !dockPos.hiddenMode;
        isHoveredOrOpen = !dockPos.hiddenMode;
        savePos();
        applyDockPosition();
        renderFace();
      } else if (act === 'reset') {
        resetTimer();
      }
      toggleMenu(false);
    });

    document.addEventListener('click', (e) => {
      if (customMenu && !customMenu.classList.contains('hidden') && !dock.contains(e.target)) {
        toggleMenu(false);
      }
    });

    window.addEventListener('resize', applyDockPosition);

    renderFace();
    applyDockPosition();
    ensureLoop();

    window.VoxStopwatch = Object.freeze({
      open() {
        dockPos.hiddenMode = false;
        isHoveredOrOpen = true;
        savePos();
        applyDockPosition();
        renderFace();
      },
      toggle: toggleRun,
      reset: resetTimer,
      setPreset
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountStopwatchDock, { once: true });
  } else {
    mountStopwatchDock();
  }
})();
