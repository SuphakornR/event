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
      <button type="button" id="tb-random-btn" title="สุ่มทีม / สุ่มเลข" aria-label="สุ่มทีมหรือตัวเลข" class="btn-vox w-9 h-9 bg-white hover:bg-[#F4D03F] text-[#111111] rounded-lg flex items-center justify-center cursor-pointer">${TB_ICONS.dice}</button>
      <button type="button" id="tb-timer-btn" title="ตัวจับเวลา" aria-label="ตัวจับเวลา" class="btn-vox w-9 h-9 bg-white hover:bg-[#F4D03F] text-[#111111] rounded-lg flex items-center justify-center cursor-pointer">${TB_ICONS.timer}</button>
      <button type="button" id="tb-music-btn" title="เพลง YouTube" aria-label="เครื่องเล่นเพลง YouTube" class="btn-vox w-9 h-9 bg-white hover:bg-[#F4D03F] text-[#111111] rounded-lg flex items-center justify-center cursor-pointer">${TB_ICONS.music}</button>
      <button type="button" id="tb-victory-btn" title="ประกาศผู้ชนะ" aria-label="ประกาศผู้ชนะ" class="btn-vox w-9 h-9 bg-[#F4D03F] hover:bg-[#f2c61d] text-[#111111] rounded-lg flex items-center justify-center cursor-pointer">${TB_ICONS.crown}</button>
      <div class="h-px bg-[#111111]/20 my-0.5"></div>
      <button type="button" id="tb-flip-btn" title="ย้ายแถบเครื่องมือ ซ้าย ⇄ ขวา" aria-label="สลับฝั่งแถบเครื่องมือ" class="btn-vox w-9 h-9 bg-[#111111] text-[#F4D03F] rounded-lg flex items-center justify-center cursor-pointer">${TB_ICONS.flip}</button>
    `;

    // Floating Popover Panel for Random / Timer / SFX
    const pop = document.createElement('div');
    pop.id = 'tb-popover';
    pop.className = 'fixed top-1/2 -translate-y-1/2 z-40 hidden w-64 vox-card bg-[#F8F6F0] p-3.5 flex-col gap-2.5 vox-panel-enter';

    let customPopPos = null;
    const positionPopover = () => {
      if (customPopPos) {
        pop.classList.remove('left-16', 'right-16', 'top-1/2', '-translate-y-1/2');
        pop.style.left = `${customPopPos.left}px`;
        pop.style.top = `${customPopPos.top}px`;
      } else {
        pop.style.left = '';
        pop.style.top = '';
        pop.classList.add('top-1/2', '-translate-y-1/2');
        pop.classList.remove('left-16', 'right-16');
        pop.classList.add(side === 'left' ? 'left-16' : 'right-16');
      }
    };
    positionPopover();

    document.body.appendChild(bar);
    document.body.appendChild(pop);

    // Persistent YouTube Embed Host (stays alive in DOM so music keeps playing uninterrupted)
    let currentTrackId = '';
    let musicMuted = false;

    const ytHost = document.createElement('div');
    ytHost.id = 'tb-yt-persistent-host';
    ytHost.className = 'fixed -left-[9999px] top-0 w-64 aspect-video pointer-events-none opacity-0';
    document.body.appendChild(ytHost);

    const parkYtHost = () => {
      if (ytHost.parentElement !== document.body) {
        ytHost.className = 'fixed -left-[9999px] top-0 w-64 aspect-video pointer-events-none opacity-0';
        document.body.appendChild(ytHost);
      }
    };

    let timerPollId = null;
    let activeTool = null;
    const closePop = () => {
      if (timerPollId) {
        clearInterval(timerPollId);
        timerPollId = null;
      }
      parkYtHost();
      activeTool = null;
      pop.classList.add('hidden');
      pop.classList.remove('flex');
    };

    const makePopoverDraggable = (handleEl) => {
      if (!handleEl) return;
      handleEl.style.cursor = 'grab';
      handleEl.addEventListener('pointerdown', (e) => {
        if (e.target.closest('button')) return;
        e.preventDefault();
        handleEl.style.cursor = 'grabbing';
        const rect = pop.getBoundingClientRect();
        const offsetX = e.clientX - rect.left;
        const offsetY = e.clientY - rect.top;
        pop.classList.remove('top-1/2', '-translate-y-1/2', 'left-16', 'right-16');
        pop.style.left = `${rect.left}px`;
        pop.style.top = `${rect.top}px`;

        const onMove = (ev) => {
          const maxL = Math.max(8, window.innerWidth - pop.offsetWidth - 8);
          const maxT = Math.max(8, window.innerHeight - pop.offsetHeight - 8);
          const nextL = Math.max(8, Math.min(maxL, ev.clientX - offsetX));
          const nextT = Math.max(8, Math.min(maxT, ev.clientY - offsetY));
          customPopPos = { left: nextL, top: nextT };
          pop.style.left = `${nextL}px`;
          pop.style.top = `${nextT}px`;
        };
        const onUp = () => {
          handleEl.style.cursor = 'grab';
          window.removeEventListener('pointermove', onMove);
          window.removeEventListener('pointerup', onUp);
        };
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
      });
    };

    const openPop = (toolName, html, bind) => {
      if (activeTool === toolName) return closePop();
      if (timerPollId) {
        clearInterval(timerPollId);
        timerPollId = null;
      }
      parkYtHost();
      activeTool = toolName;
      positionPopover();
      pop.classList.toggle('w-72', toolName.includes('YouTube'));
      pop.classList.toggle('w-64', !toolName.includes('YouTube'));
      pop.innerHTML = `
        <div id="tb-pop-drag" title="กดค้างเพื่อลากย้ายตำแหน่ง" class="flex items-center justify-between pb-2 border-b-2 border-[#111111] select-none">
          <span class="font-display font-extrabold text-xs uppercase tracking-wider text-[#111111]">${toolName}</span>
          <button type="button" id="tb-pop-close" class="w-6 h-6 rounded-md hover:bg-[#E74C3C] hover:text-white text-xs font-black flex items-center justify-center cursor-pointer transition-colors">✕</button>
        </div>
        ${html}
      `;
      pop.classList.remove('hidden', 'vox-panel-enter');
      pop.classList.add('flex');
      void pop.offsetWidth;
      pop.classList.add('vox-panel-enter');
      document.getElementById('tb-pop-close')?.addEventListener('click', closePop);
      makePopoverDraggable(document.getElementById('tb-pop-drag'));
      if (bind) bind();
    };

    // 1. Random Picker (Dramatic decelerating roulette + Web Audio ticks + card spotlight)
    document.getElementById('tb-random-btn').addEventListener('click', () => {
      const teams = window.VoxScoreboardAPI?.getState()?.teams || [];
      openPop('สุ่ม (Random)', `
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
      `, () => {
        const boxEl = document.getElementById('tb-rand-box');
        const resEl = document.getElementById('tb-rand-result');
        const barWrap = document.getElementById('tb-rand-bar-wrap');
        const barEl = document.getElementById('tb-rand-bar');
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

        document.getElementById('tb-rand-team').addEventListener('click', () => {
          if (teams.length) spin(teams, true);
        });
        document.getElementById('tb-rand-num').addEventListener('click', () => {
          spin(Array.from({ length: 100 }, (_, i) => String(i + 1)), false);
        });
      });
    });

    // 2. Quick Timer (Live clock preview + presets + nudge +/- + instant controls)
    document.getElementById('tb-timer-btn').addEventListener('click', () => {
      const api = window.VoxScoreboardAPI;
      const st = api?.getState();
      if (!st) return;

      const fmtClock = (sec) => {
        const s = Math.max(0, Math.floor(sec));
        return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
      };
      const getLiveSec = () => {
        const t = st.timer;
        if (t.running && t.endAt) return Math.max(0, Math.ceil((t.endAt - Date.now()) / 1000));
        return Math.max(0, t.remainingSec || 0);
      };

      openPop('ตัวจับเวลา (Timer)', `
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
      `, () => {
        const clockEl = document.getElementById('tb-t-clock');
        const toggleBtn = document.getElementById('tb-t-toggle');
        const visBtn = document.getElementById('tb-t-vis');
        const modeBtn = document.getElementById('tb-t-mode');

        const syncTimerPopUI = () => {
          const t = st.timer;
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

        pop.querySelectorAll('[data-tb-t]').forEach(b => {
          b.addEventListener('click', () => {
            const sec = Number(b.dataset.tbT);
            updateTimer(t => { t.durationSec = sec; t.remainingSec = sec; t.running = false; t.endAt = null; t.visible = true; });
          });
        });

        pop.querySelectorAll('[data-tb-nudge]').forEach(b => {
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
        timerPollId = setInterval(() => {
          if (clockEl) clockEl.textContent = fmtClock(getLiveSec());
        }, 200);
      });
    });

    // 3.5 YouTube Legal Embed Music Player
    const extractYoutubeId = (raw) => {
      const s = (raw || '').trim();
      if (!s) return '';
      if (/^[a-zA-Z0-9_-]{11}$/.test(s)) return s;
      const m = s.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
      return m ? m[1] : '';
    };

    const sendYtCmd = (func, args = []) => {
      const iframe = ytHost.querySelector('iframe');
      if (!iframe || !iframe.contentWindow) return;
      iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func, args }), '*');
    };

    const syncMusicBtnBadge = () => {
      const btn = document.getElementById('tb-music-btn');
      if (!btn) return;
      btn.classList.toggle('bg-[#F4D03F]', Boolean(currentTrackId));
      btn.classList.toggle('bg-white', !currentTrackId);
    };

    const loadYoutubeTrack = (videoId) => {
      if (!videoId) return;
      currentTrackId = videoId;
      musicMuted = false;
      const originParam = window.location.protocol.startsWith('http')
        ? `&origin=${encodeURIComponent(window.location.origin)}`
        : '';
      ytHost.innerHTML = `
        <iframe class="w-full h-full rounded-lg border-2 border-[#111111]"
          src="https://www.youtube.com/embed/${videoId}?enablejsapi=1&autoplay=1&rel=0${originParam}"
          title="YouTube Music Player"
          referrerpolicy="strict-origin-when-cross-origin"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowfullscreen></iframe>
      `;
      syncMusicBtnBadge();
    };

    const stopYoutubeTrack = () => {
      currentTrackId = '';
      ytHost.innerHTML = '';
      syncMusicBtnBadge();
    };

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
      const renderMusicBody = () => `
        <div class="flex flex-col gap-2">
          <div id="tb-yt-slot" class="w-full aspect-video bg-[#111111] rounded-lg border-2 border-[#111111] overflow-hidden flex items-center justify-center text-[11px] text-white/60 font-display text-center px-3">
            ${currentTrackId ? '' : 'วางลิงก์ YouTube หรือพิมพ์ชื่อเพลงแล้วกด Enter'}
          </div>
          <div class="flex gap-1.5">
            <input id="tb-yt-input" type="text" placeholder="พิมพ์ชื่อเพลง หรือวางลิงก์ YouTube..." class="flex-1 min-w-0 bg-white border-2 border-[#111111] rounded-lg px-2.5 py-1.5 text-xs font-semibold" />
            <button type="button" id="tb-yt-load" title="ค้นหา / เล่น" aria-label="ค้นหาหรือเล่นเพลง" class="btn-vox bg-[#F4D03F] hover:bg-[#f2c61d] px-2.5 py-1 rounded-lg flex items-center justify-center cursor-pointer">${TB_ICONS.play}</button>
            <button type="button" id="tb-yt-stop" title="หยุด" aria-label="หยุดเพลง" class="btn-vox bg-white hover:bg-red-100 text-[#E74C3C] px-2.5 py-1 rounded-lg flex items-center justify-center cursor-pointer">${TB_ICONS.stop}</button>
          </div>
          <div id="tb-yt-results" class="hidden flex-col gap-1.5 pt-1 border-t border-[#111111]/15"></div>
        </div>
      `;

      openPop('YouTube Music', renderMusicBody(), () => {
        const mountYtIntoSlot = () => {
          const slot = document.getElementById('tb-yt-slot');
          if (slot && currentTrackId) {
            slot.innerHTML = '';
            ytHost.className = 'w-full h-full';
            slot.appendChild(ytHost);
          }
        };
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
            <button type="button" data-yt-pick="${item.id}" class="w-full text-left bg-white hover:bg-[#F4D03F] border-2 border-[#111111] rounded-lg p-1.5 flex items-center gap-2 transition-colors cursor-pointer">
              ${item.thumb ? `<img src="${item.thumb}" alt="" class="w-10 h-7 object-cover rounded border border-[#111111] shrink-0" />` : ''}
              <div class="min-w-0 flex-1">
                <div class="font-display font-bold text-[11px] text-[#111111] truncate">${item.title.replace(/[<>&"]/g, '')}</div>
                <div class="text-[9px] text-[#111111]/60 truncate">${item.author.replace(/[<>&"]/g, '')}</div>
              </div>
            </button>
          `).join('');

          resultsEl.querySelectorAll('[data-yt-pick]').forEach(btn => {
            btn.addEventListener('click', () => {
              loadYoutubeTrack(btn.dataset.ytPick);
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
        document.getElementById('tb-yt-stop')?.addEventListener('click', () => {
          parkYtHost();
          stopYoutubeTrack();
          const slot = document.getElementById('tb-yt-slot');
          if (slot) slot.innerHTML = 'วางลิงก์ YouTube หรือพิมพ์ชื่อเพลงแล้วกด Enter';
        });
      });
    });

    // 4. Victory Toggle
    document.getElementById('tb-victory-btn').addEventListener('click', () => {
      if (window.VoxSecurity?.isLocked()) return window.VoxSecurity.toggleLock();
      window.VoxScoreboardAPI?.toggleVictory();
    });

    // 5. Flip Side (Left <-> Right) with smooth FLIP glide
    document.getElementById('tb-flip-btn').addEventListener('click', () => {
      const first = bar.getBoundingClientRect();
      side = side === 'left' ? 'right' : 'left';
      customPopPos = null;
      try { localStorage.setItem(SIDE_KEY, side); } catch (_) {}
      applySide();
      positionPopover();
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
