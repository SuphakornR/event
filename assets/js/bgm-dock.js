/* HelpDaiCha Cross-Page Cassette Side-Dock Music Player (Chroma-Keyed Animated Loop + Proximity Popup + Custom Menu) */
(() => {
  'use strict';

  const BGM_KEY = 'helpdai_bgm_player_v1';
  const PIN_KEY = 'helpdai_bgm_pinned_v1';

  const extractYoutubeId = (raw) => {
    const s = String(raw || '').trim();
    if (!s) return '';
    if (/^[a-zA-Z0-9_-]{11}$/.test(s)) return s;
    const m = s.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return m ? m[1] : '';
  };

  const readBgm = () => {
    try {
      const raw = JSON.parse(localStorage.getItem(BGM_KEY) || 'null');
      if (raw && typeof raw.videoId === 'string') {
        const playing = Boolean(raw.playing);
        const baseElapsed = Math.max(0, Number(raw.elapsedSec) || 0);
        const startedAt = Number(raw.startedAt) || 0;
        const liveElapsed = (playing && startedAt > 0)
          ? Math.max(baseElapsed, Math.floor((Date.now() - startedAt) / 1000))
          : baseElapsed;
        return {
          videoId: raw.videoId,
          title: String(raw.title || ''),
          playing,
          elapsedSec: liveElapsed,
          startedAt
        };
      }
    } catch (_) {}
    return { videoId: '', title: '', playing: false, elapsedSec: 0, startedAt: 0 };
  };

  const writeBgm = (next, emit = true) => {
    try { localStorage.setItem(BGM_KEY, JSON.stringify(next)); } catch (_) {}
    if (emit) {
      window.dispatchEvent(new CustomEvent('helpdai-bgm-change', { detail: next }));
    }
  };

  async function fetchTrackTitle(videoId) {
    try {
      const res = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}&format=json`, {
        signal: AbortSignal.timeout(4000)
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.title) return String(data.title);
      }
    } catch (_) {}
    return `YouTube (${videoId})`;
  }

  // Persistent hidden YouTube iframe host
  const ytFrameHost = document.createElement('div');
  ytFrameHost.id = 'helpdai-top-yt-host';
  ytFrameHost.className = 'fixed w-64 aspect-video rounded-lg overflow-hidden';
  ytFrameHost.style.left = '-9999px';
  ytFrameHost.style.top = '0px';
  ytFrameHost.style.opacity = '0';
  ytFrameHost.style.pointerEvents = 'none';
  ytFrameHost.style.zIndex = '250';

  let loadedId = '';
  let loadedPlaying = false;

  const ensureHostMounted = () => {
    if (!ytFrameHost.isConnected && document.body) {
      document.body.appendChild(ytFrameHost);
    }
  };

  const sendYtCmd = (func, args = []) => {
    const iframe = ytFrameHost.querySelector('iframe');
    if (iframe?.contentWindow) {
      iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func, args }), '*');
    }
  };

  const parkOverlay = () => {
    ytFrameHost.style.left = '-9999px';
    ytFrameHost.style.top = '0px';
    ytFrameHost.style.opacity = '0';
    ytFrameHost.style.pointerEvents = 'none';
  };

  const mountOverlay = (rect) => {
    ensureHostMounted();
    if (!rect || rect.width < 10 || rect.height < 10 || !loadedId) {
      parkOverlay();
      return;
    }
    ytFrameHost.style.left = `${Math.round(rect.left)}px`;
    ytFrameHost.style.top = `${Math.round(rect.top)}px`;
    ytFrameHost.style.width = `${Math.round(rect.width)}px`;
    ytFrameHost.style.height = `${Math.round(rect.height)}px`;
    ytFrameHost.style.zIndex = '250';
    ytFrameHost.style.opacity = '1';
    ytFrameHost.style.pointerEvents = 'auto';
  };

  const syncEngineIframe = () => {
    ensureHostMounted();
    const st = readBgm();
    if (!st.videoId) {
      if (loadedId) {
        loadedId = '';
        loadedPlaying = false;
        ytFrameHost.innerHTML = '';
        parkOverlay();
      }
      return;
    }

    if (st.videoId !== loadedId) {
      if (!st.playing) return;
      loadedId = st.videoId;
      loadedPlaying = true;
      const originParam = location.protocol.startsWith('http') ? `&origin=${encodeURIComponent(location.origin)}` : '';
      const startParam = st.elapsedSec > 1 ? `&start=${Math.floor(st.elapsedSec)}` : '';
      ytFrameHost.innerHTML = `<iframe class="w-full h-full rounded-lg border-2 border-[#111111]" src="https://www.youtube.com/embed/${st.videoId}?enablejsapi=1&autoplay=1&rel=0${startParam}${originParam}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" referrerpolicy="strict-origin-when-cross-origin" title="HelpDaiCha BGM"></iframe>`;
      const iframe = ytFrameHost.querySelector('iframe');
      iframe?.addEventListener('load', () => {
        try {
          iframe.contentWindow?.postMessage(JSON.stringify({ event: 'listening', id: 1 }), '*');
        } catch (_) {}
      });
    } else if (st.playing !== loadedPlaying) {
      loadedPlaying = st.playing;
      sendYtCmd(st.playing ? 'playVideo' : 'pauseVideo');
    }
  };

  window.addEventListener('message', (e) => {
    if (!e.origin.includes('youtube.com')) return;
    try {
      const msg = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
      if (msg?.event === 'infoDelivery' && typeof msg.info?.currentTime === 'number') {
        const cur = readBgm();
        if (cur.videoId && cur.playing) {
          const sec = Math.max(0, Math.floor(msg.info.currentTime));
          writeBgm({
            ...cur,
            elapsedSec: sec,
            startedAt: Date.now() - sec * 1000
          }, false);
        }
      }
    } catch (_) {}
  });

  window.HelpDaiBgm = Object.freeze({
    getState: readBgm,
    extractYoutubeId,
    mountOverlay,
    parkOverlay,
    async setTrack(videoId, title = '', playing = true) {
      const cleanId = extractYoutubeId(videoId);
      if (!cleanId) return;
      const cur = readBgm();
      const isSameTrack = cur.videoId === cleanId;
      const resolvedTitle = title || (isSameTrack && cur.title ? cur.title : `YouTube (${cleanId})`);
      const elapsedSec = isSameTrack ? cur.elapsedSec : 0;
      const startedAt = playing ? (Date.now() - elapsedSec * 1000) : 0;
      writeBgm({ videoId: cleanId, title: resolvedTitle, playing: Boolean(playing), elapsedSec, startedAt });
      syncEngineIframe();
      if (!title) {
        const fetched = await fetchTrackTitle(cleanId);
        const latest = readBgm();
        if (latest.videoId === cleanId && latest.title !== fetched) {
          writeBgm({ ...latest, title: fetched });
        }
      }
    },
    setPlaying(playing) {
      const cur = readBgm();
      if (!cur.videoId) return;
      const nextPlaying = Boolean(playing);
      const elapsedSec = cur.elapsedSec;
      const startedAt = nextPlaying ? (Date.now() - elapsedSec * 1000) : 0;
      writeBgm({ ...cur, playing: nextPlaying, elapsedSec, startedAt });
      syncEngineIframe();
    },
    stop() {
      loadedId = '';
      loadedPlaying = false;
      ytFrameHost.innerHTML = '';
      parkOverlay();
      writeBgm({ videoId: '', title: '', playing: false, elapsedSec: 0, startedAt: 0 });
    }
  });

  // ========================================================================
  // CASSETTE SIDE-DOCK PLAYER + CHROMA-KEY ANIMATION + CUSTOM MENU
  // ========================================================================
  function mountCassetteDock() {
    ensureHostMounted();
    syncEngineIframe();

    if (document.getElementById('cassette-side-dock')) return;

    const dock = document.createElement('aside');
    dock.id = 'cassette-side-dock';
    dock.setAttribute('aria-label', 'เครื่องเล่นเพลงคาสเซ็ต');
    dock.style.cssText = [
      'position: fixed',
      'right: 0',
      'top: 52%',
      'z-index: 155',
      'display: flex',
      'align-items: center',
      'transform: translateY(-50%) translateX(calc(100% - 34px))',
      'transition: transform 0.34s cubic-bezier(0.22, 1, 0.36, 1)',
      'will-change: transform',
      'pointer-events: auto'
    ].join(';');

    dock.innerHTML = `
      <!-- Side Peeking Handle Tab -->
      <button type="button" id="cassette-peek-tab" title="ชี้เมาส์หรือคลิกเพื่อเปิดเครื่องเล่นคาสเซ็ต"
        class="w-[34px] py-3 rounded-l-xl border-[2.5px] border-r-0 border-[#111111] bg-[#111111] text-[#F4D03F] shadow-[-3px_3px_0px_rgba(17,17,17,0.35)] flex flex-col items-center justify-center gap-2 cursor-pointer select-none">
        <span id="cassette-peek-dot" class="w-2.5 h-2.5 rounded-full bg-[#F4D03F]/40 border border-white/25 transition-colors"></span>
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
        <span class="font-display font-black text-[9px] tracking-widest uppercase" style="writing-mode: vertical-rl;">TAPE</span>
      </button>

      <!-- Main Cassette Body -->
      <div class="relative bg-[#F8F6F0] border-[3px] border-r-0 border-[#111111] rounded-l-2xl shadow-[-6px_6px_0px_#111111] p-2.5 pr-3 flex flex-col gap-2 w-[310px] sm:w-[330px]">
        <!-- Cassette Visual Stage (Chroma-keyed MP4 Video -> Canvas + Dynamic Label) -->
        <div id="cassette-visual-box" class="relative w-full aspect-[880/582] select-none cursor-pointer group" title="คลิกเพื่อเล่น/พัก • คลิกขวาเปิดเมนู">
          <canvas id="cassette-canvas" width="440" height="291" class="w-full h-full block drop-shadow-[3px_4px_0px_rgba(17,17,17,0.55)]"></canvas>

          <!-- Dynamic Title Printed Directly on Cassette Side-A Label -->
          <div class="pointer-events-none absolute top-[12%] left-[31%] right-[13%] h-[15%] flex flex-col justify-center overflow-hidden px-1.5">
            <p id="cassette-tape-title" class="thai-safe-tight font-display font-black text-[11px] sm:text-xs text-[#111111] truncate leading-tight">ยังไม่ได้เลือกเพลง</p>
            <p id="cassette-tape-sub" class="font-display font-bold text-[9px] text-[#111111]/60 truncate">คลิกเพื่อเลือกเพลง YouTube</p>
          </div>
        </div>

        <!-- Custom Compact Controls Bar -->
        <div class="flex items-center justify-between gap-1.5 bg-white border-2 border-[#111111] rounded-xl px-2 py-1.5 shadow-[2px_2px_0px_#111111]">
          <button type="button" id="cassette-play-btn" class="btn-vox bg-[#F4D03F] hover:bg-[#f2c61d] text-[#111111] font-display font-black text-xs px-3 py-1 rounded-lg inline-flex items-center gap-1.5 cursor-pointer">
            <span id="cassette-play-icon" class="flex items-center"></span>
            <span id="cassette-play-label">เลือกเพลง</span>
          </button>

          <div class="flex items-center gap-1">
            <button type="button" id="cassette-stop-btn" title="หยุดและนำเทปออก" class="hidden w-7 h-7 rounded-lg border-2 border-[#111111] bg-white hover:bg-red-50 text-[#E74C3C] items-center justify-center cursor-pointer transition-colors">
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="5" width="14" height="14" rx="2"/></svg>
            </button>
            <button type="button" id="cassette-menu-btn" title="เมนูเครื่องเล่น" class="w-7 h-7 rounded-lg border-2 border-[#111111] bg-[#F8F6F0] hover:bg-[#F4D03F] text-[#111111] font-display font-black text-xs flex items-center justify-center cursor-pointer transition-colors">⋯</button>
          </div>
        </div>

        <!-- Custom Cassette Popover Menu -->
        <div id="cassette-custom-menu" class="hidden absolute right-3 bottom-14 z-50 w-56 vox-card bg-[#F8F6F0] p-1.5 flex-col gap-1 vox-panel-enter">
          <div class="px-2 py-1 border-b border-[#111111]/15 font-display font-black text-[10px] uppercase tracking-wider text-[#111111]/60">Cassette Menu</div>
          <button type="button" data-cas-act="choose" class="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-[#F4D03F] font-display font-bold text-xs text-[#111111] flex items-center gap-2 cursor-pointer transition-colors">
            <svg class="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
            <span>เลือก / เปลี่ยนเพลง YouTube</span>
          </button>
          <button type="button" data-cas-act="toggle" class="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-[#F4D03F] font-display font-bold text-xs text-[#111111] flex items-center gap-2 cursor-pointer transition-colors">
            <svg class="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M6 4l15 8-15 8V4z"/></svg>
            <span id="cas-menu-toggle-label">เล่น / พักเพลง</span>
          </button>
          <button type="button" data-cas-act="pin" class="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-[#F4D03F] font-display font-bold text-xs text-[#111111] flex items-center justify-between cursor-pointer transition-colors">
            <span>ปักหมุดแสดงค้างไว้</span>
            <span id="cas-menu-pin-badge" class="text-[10px] px-1.5 py-0.5 rounded bg-white border border-[#111111]">OFF</span>
          </button>
          <button type="button" data-cas-act="stop" class="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-red-100 font-display font-bold text-xs text-[#E74C3C] flex items-center gap-2 cursor-pointer transition-colors">
            <svg class="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="5" width="14" height="14" rx="2"/></svg>
            <span>หยุดและนำเทปออก</span>
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(dock);

    // Hidden looping cassette video source (chroma-keyed onto canvas)
    const videoEl = document.createElement('video');
    videoEl.src = 'assets/video/cassette-loop.mp4';
    videoEl.muted = true;
    videoEl.loop = true;
    videoEl.playsInline = true;
    videoEl.preload = 'auto';
    videoEl.style.display = 'none';
    document.body.appendChild(videoEl);

    const canvasEl = document.getElementById('cassette-canvas');
    const ctx = canvasEl?.getContext('2d', { willReadFrequently: true });
    const offCanvas = document.createElement('canvas');
    offCanvas.width = 440;
    offCanvas.height = 291;
    const offCtx = offCanvas.getContext('2d', { willReadFrequently: true });

    let animRaf = null;
    let isDockOpen = false;
    let isPinned = false;
    try { isPinned = localStorage.getItem(PIN_KEY) === '1'; } catch (_) {}

    const customMenu = document.getElementById('cassette-custom-menu');
    const pinBadge = document.getElementById('cas-menu-pin-badge');
    const peekDot = document.getElementById('cassette-peek-dot');
    const tapeTitleEl = document.getElementById('cassette-tape-title');
    const tapeSubEl = document.getElementById('cassette-tape-sub');
    const playBtn = document.getElementById('cassette-play-btn');
    const playIconEl = document.getElementById('cassette-play-icon');
    const playLabelEl = document.getElementById('cassette-play-label');
    const stopBtn = document.getElementById('cassette-stop-btn');

    // Draw cropped cassette frame & strip chroma-key green (#00FF00)
    function drawCassetteFrame() {
      if (!ctx || !offCtx || videoEl.readyState < 2) return;
      // Crop tightly around cassette shell in 1280x720 source (x:200..1080, y:69..651)
      offCtx.drawImage(videoEl, 200, 69, 880, 582, 0, 0, 440, 291);
      const frame = offCtx.getImageData(0, 0, 440, 291);
      const d = frame.data;
      for (let i = 0; i < d.length; i += 4) {
        const r = d[i];
        const g = d[i + 1];
        const b = d[i + 2];
        if (g > 110 && g > r * 1.32 && g > b * 1.32) {
          d[i + 3] = 0;
        } else if (g > 90 && g > r * 1.15 && g > b * 1.15) {
          d[i + 3] = Math.round(d[i + 3] * 0.35);
          d[i + 1] = Math.min(g, Math.max(r, b));
        }
      }
      ctx.putImageData(frame, 0, 0);
    }

    function loopCassetteRender() {
      drawCassetteFrame();
      const st = readBgm();
      if (st.playing && st.videoId && !videoEl.paused) {
        animRaf = requestAnimationFrame(loopCassetteRender);
      } else {
        animRaf = null;
      }
    }

    videoEl.addEventListener('loadeddata', () => {
      drawCassetteFrame();
    }, { once: true });

    // Side-dock open/close with mouse proximity
    let hideTimer = null;
    function setDockVisible(open) {
      isDockOpen = Boolean(open || isPinned || (customMenu && !customMenu.classList.contains('hidden')));
      dock.style.transform = isDockOpen
        ? 'translateY(-50%) translateX(0)'
        : 'translateY(-50%) translateX(calc(100% - 34px))';
    }

    function scheduleHide() {
      if (hideTimer) clearTimeout(hideTimer);
      hideTimer = setTimeout(() => {
        if (!isPinned && customMenu?.classList.contains('hidden')) {
          setDockVisible(false);
        }
      }, 320);
    }

    dock.addEventListener('mouseenter', () => {
      if (hideTimer) clearTimeout(hideTimer);
      setDockVisible(true);
    });
    dock.addEventListener('mouseleave', () => {
      scheduleHide();
    });

    // Proximity popup when mouse gets near right edge around dock
    window.addEventListener('mousemove', (e) => {
      if (isPinned) return;
      const nearRightEdge = (window.innerWidth - e.clientX) <= 72;
      const dockRect = dock.getBoundingClientRect();
      const nearVertical = e.clientY >= (dockRect.top - 50) && e.clientY <= (dockRect.bottom + 50);
      if (nearRightEdge && nearVertical) {
        if (hideTimer) clearTimeout(hideTimer);
        if (!isDockOpen) setDockVisible(true);
      }
    }, { passive: true });

    document.getElementById('cassette-peek-tab')?.addEventListener('click', () => {
      setDockVisible(!isDockOpen);
    });

    // Modal for choosing YouTube music
    let modal = document.getElementById('hub-bgm-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'hub-bgm-modal';
      modal.className = 'hidden fixed inset-0 z-[175] items-center justify-center p-4 bg-[#111111]/60 backdrop-blur-sm';
      modal.innerHTML = `
        <div class="vox-panel-enter w-full max-w-md vox-card bg-[#F8F6F0] p-5 flex flex-col gap-3">
          <div class="flex items-center justify-between gap-2 pb-2 border-b-2 border-[#111111]">
            <div class="flex items-center gap-2">
              <span class="w-7 h-7 rounded-lg border-2 border-[#111111] bg-[#F4D03F] flex items-center justify-center shadow-[2px_2px_0px_#111111]">
                <svg class="w-4 h-4 text-[#111111]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
              </span>
              <h2 class="thai-safe-tight font-display font-extrabold text-base text-[#111111]">เลือกเพลงลงตลับเทป (YouTube)</h2>
            </div>
            <button type="button" id="hub-bgm-pop-close" class="w-7 h-7 rounded-lg border-2 border-[#111111] bg-white hover:bg-[#E74C3C] hover:text-white font-display font-black text-xs flex items-center justify-center cursor-pointer transition-colors">✕</button>
          </div>
          <div class="flex gap-1.5">
            <input id="hub-bgm-input" type="text" placeholder="วางลิงก์ YouTube หรือพิมพ์ชื่อเพลง..." class="flex-1 min-w-0 bg-white border-2 border-[#111111] rounded-xl px-3 py-2 text-xs sm:text-sm font-semibold text-[#111111] focus:outline-none" />
            <button type="button" id="hub-bgm-go" class="btn-vox bg-[#F4D03F] hover:bg-[#f2c61d] text-[#111111] font-display font-extrabold text-xs px-4 py-2 rounded-xl cursor-pointer">เล่น</button>
          </div>
          <div id="hub-bgm-results" class="hidden flex-col gap-1.5 max-h-48 overflow-y-auto"></div>
        </div>
      `;
      document.body.appendChild(modal);
    }

    const popCloseBtn = document.getElementById('hub-bgm-pop-close');
    const inpEl = document.getElementById('hub-bgm-input');
    const goBtn = document.getElementById('hub-bgm-go');
    const resultsEl = document.getElementById('hub-bgm-results');

    const openMusicModal = () => {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
      inpEl?.focus();
    };
    const closeMusicModal = () => {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    };
    window.HelpDaiBgmModal = openMusicModal;

    const handleSearchOrUrl = async () => {
      const raw = (inpEl?.value || '').trim();
      if (!raw) return;
      const id = extractYoutubeId(raw);
      if (id) {
        if (inpEl) inpEl.value = '';
        resultsEl?.classList.add('hidden');
        resultsEl?.classList.remove('flex');
        closeMusicModal();
        await window.HelpDaiBgm.setTrack(id, '', true);
        return;
      }

      if (resultsEl) {
        resultsEl.classList.remove('hidden');
        resultsEl.classList.add('flex');
        resultsEl.innerHTML = `<div class="text-xs font-display font-bold text-[#111111]/60 py-2 text-center">กำลังค้นหา...</div>`;
      }
      try {
        const cfg = window.HELPDAI_CONFIG || {};
        const defaultApiBase = (!location.hostname.endsWith('github.io') && location.protocol.startsWith('http')) ? location.origin : '';
        const apiBase = (cfg.apiBase || defaultApiBase).replace(/\/$/, '');
        if (apiBase && resultsEl) {
          const res = await fetch(`${apiBase}/api/yt-search?q=${encodeURIComponent(raw)}`, { signal: AbortSignal.timeout(5000) });
          if (res.ok) {
            const data = await res.json();
            const items = Array.isArray(data?.items) ? data.items.slice(0, 4) : [];
            if (items.length) {
              resultsEl.innerHTML = items.map(it => `
                <button type="button" data-hub-yt="${it.id}" data-hub-title="${String(it.title || '').replace(/"/g, '&quot;')}" class="w-full text-left bg-white hover:bg-[#F4D03F] border-2 border-[#111111] rounded-xl p-2 flex items-center gap-2.5 cursor-pointer transition-colors">
                  ${it.thumb ? `<img src="${it.thumb}" alt="" class="w-11 h-8 object-cover rounded border border-[#111111] shrink-0" />` : ''}
                  <span class="font-display font-bold text-xs text-[#111111] truncate">${String(it.title || '').replace(/[<>&"]/g, '')}</span>
                </button>
              `).join('');
              resultsEl.querySelectorAll('[data-hub-yt]').forEach(b => {
                b.addEventListener('click', () => {
                  window.HelpDaiBgm.setTrack(b.dataset.hubYt, b.dataset.hubTitle, true);
                  resultsEl.classList.add('hidden');
                  closeMusicModal();
                });
              });
              return;
            }
          }
        }
      } catch (_) {}
      if (resultsEl) {
        resultsEl.innerHTML = `<a href="https://www.youtube.com/results?search_query=${encodeURIComponent(raw)}" target="_blank" rel="noopener noreferrer" class="btn-vox bg-white hover:bg-[#F4D03F] px-3 py-2 rounded-xl text-xs font-display font-bold flex items-center justify-between text-[#111111]"><span>ค้นหาบน YouTube ↗</span></a>`;
      }
    };

    popCloseBtn?.addEventListener('click', closeMusicModal);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeMusicModal(); });
    goBtn?.addEventListener('click', handleSearchOrUrl);
    inpEl?.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); handleSearchOrUrl(); } });

    // Custom Menu Handlers
    function toggleCustomMenu(force) {
      if (!customMenu) return;
      const open = typeof force === 'boolean' ? force : customMenu.classList.contains('hidden');
      customMenu.classList.toggle('hidden', !open);
      customMenu.classList.toggle('flex', open);
      if (open) setDockVisible(true);
    }

    document.getElementById('cassette-menu-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleCustomMenu();
    });

    document.getElementById('cassette-visual-box')?.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      toggleCustomMenu(true);
    });

    document.getElementById('cassette-visual-box')?.addEventListener('click', () => {
      const cur = readBgm();
      if (!cur.videoId) openMusicModal();
      else window.HelpDaiBgm.setPlaying(!cur.playing);
    });

    document.addEventListener('click', (e) => {
      if (customMenu && !customMenu.classList.contains('hidden') && !dock.contains(e.target)) {
        toggleCustomMenu(false);
        scheduleHide();
      }
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (!modal.classList.contains('hidden')) closeMusicModal();
        if (customMenu && !customMenu.classList.contains('hidden')) toggleCustomMenu(false);
      }
    });

    customMenu?.querySelectorAll('[data-cas-act]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const act = btn.dataset.casAct;
        toggleCustomMenu(false);
        if (act === 'choose') openMusicModal();
        else if (act === 'toggle') {
          const cur = readBgm();
          if (!cur.videoId) openMusicModal();
          else window.HelpDaiBgm.setPlaying(!cur.playing);
        } else if (act === 'pin') {
          isPinned = !isPinned;
          try { localStorage.setItem(PIN_KEY, isPinned ? '1' : '0'); } catch (_) {}
          if (pinBadge) pinBadge.textContent = isPinned ? 'ON' : 'OFF';
          setDockVisible(isPinned);
        } else if (act === 'stop') {
          window.HelpDaiBgm.stop();
        }
      });
    });

    playBtn?.addEventListener('click', () => {
      const cur = readBgm();
      if (!cur.videoId) openMusicModal();
      else window.HelpDaiBgm.setPlaying(!cur.playing);
    });

    stopBtn?.addEventListener('click', () => {
      window.HelpDaiBgm.stop();
    });

    const syncUi = () => {
      syncEngineIframe();
      const st = readBgm();
      const hasTrack = Boolean(st.videoId);
      const isPlaying = Boolean(hasTrack && st.playing);

      if (pinBadge) pinBadge.textContent = isPinned ? 'ON' : 'OFF';

      if (tapeTitleEl) {
        tapeTitleEl.textContent = hasTrack ? (st.title || `YouTube (${st.videoId})`) : 'ยังไม่ได้เลือกเพลง';
      }
      if (tapeSubEl) {
        tapeSubEl.textContent = isPlaying ? '▶ กำลังเล่นเพลง...' : (hasTrack ? '⏸ พักเพลงอยู่' : 'คลิกเพื่อเลือกเพลง YouTube');
      }

      if (peekDot) {
        peekDot.classList.toggle('bg-[#10B981]', isPlaying);
        peekDot.classList.toggle('animate-pulse', isPlaying);
        peekDot.classList.toggle('bg-[#F4D03F]/40', !isPlaying);
      }

      if (playIconEl && playLabelEl) {
        if (!hasTrack) {
          playIconEl.innerHTML = '<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>';
          playLabelEl.textContent = 'เลือกเพลง';
        } else if (isPlaying) {
          playIconEl.innerHTML = '<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>';
          playLabelEl.textContent = 'พักเพลง';
        } else {
          playIconEl.innerHTML = '<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M6 4l15 8-15 8V4z"/></svg>';
          playLabelEl.textContent = 'เล่นต่อ';
        }
      }

      if (stopBtn) {
        stopBtn.classList.toggle('hidden', !hasTrack);
        stopBtn.classList.toggle('flex', hasTrack);
      }

      // Start/stop cassette MP4 animation ONLY when music is playing
      if (isPlaying) {
        videoEl.play().then(() => {
          if (!animRaf) loopCassetteRender();
        }).catch(() => {});
      } else {
        if (!videoEl.paused) videoEl.pause();
        drawCassetteFrame();
      }

      setDockVisible(isPinned);
    };

    window.addEventListener('helpdai-bgm-change', syncUi);
    window.addEventListener('storage', (e) => { if (e.key === BGM_KEY) syncUi(); });
    syncUi();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountCassetteDock, { once: true });
  } else {
    mountCassetteDock();
  }
})();
