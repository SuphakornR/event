/* HelpDaiCha Cross-Page Floating Cassette Player (Shape-Only Chroma-Key, Movable, Side-Hide, Custom Menu & Reliable Audio) */
(() => {
  'use strict';

  const BGM_KEY = 'helpdai_bgm_player_v1';
  const DOCK_POS_KEY = 'helpdai_bgm_dock_pos_v2';

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

  // Keep YouTube iframe inside the visible viewport (200x112 at 0.001 opacity) so browsers allow audio playback reliably
  const ytFrameHost = document.createElement('div');
  ytFrameHost.id = 'helpdai-top-yt-host';
  ytFrameHost.style.cssText = 'position:fixed;right:4px;bottom:4px;width:200px;height:112px;opacity:0.001;pointer-events:none;z-index:1;overflow:hidden;';

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
    ytFrameHost.style.right = '4px';
    ytFrameHost.style.bottom = '4px';
    ytFrameHost.style.left = 'auto';
    ytFrameHost.style.top = 'auto';
    ytFrameHost.style.width = '200px';
    ytFrameHost.style.height = '112px';
    ytFrameHost.style.opacity = '0.001';
    ytFrameHost.style.pointerEvents = 'none';
    ytFrameHost.style.zIndex = '1';
  };

  const mountOverlay = (rect) => {
    ensureHostMounted();
    if (!rect || rect.width < 10 || rect.height < 10 || !loadedId) {
      parkOverlay();
      return;
    }
    ytFrameHost.style.right = 'auto';
    ytFrameHost.style.bottom = 'auto';
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
      ytFrameHost.innerHTML = `<iframe class="w-full h-full" src="https://www.youtube.com/embed/${st.videoId}?enablejsapi=1&autoplay=1&mute=0&playsinline=1&rel=0${startParam}${originParam}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" referrerpolicy="strict-origin-when-cross-origin" title="HelpDaiCha BGM"></iframe>`;
      const iframe = ytFrameHost.querySelector('iframe');
      iframe?.addEventListener('load', () => {
        try {
          iframe.contentWindow?.postMessage(JSON.stringify({ event: 'listening', id: 1 }), '*');
          sendYtCmd('unMute');
          sendYtCmd('setVolume', [100]);
          sendYtCmd('playVideo');
        } catch (_) {}
      });
    } else if (st.playing !== loadedPlaying) {
      loadedPlaying = st.playing;
      if (st.playing) {
        sendYtCmd('unMute');
        sendYtCmd('setVolume', [100]);
        sendYtCmd('playVideo');
      } else {
        sendYtCmd('pauseVideo');
      }
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
  // SHAPE-ONLY FLOATING CASSETTE DOCK (MOVABLE + SIDE-HIDE + PROXIMITY POPUP)
  // ========================================================================
  function mountCassetteDock() {
    ensureHostMounted();
    syncEngineIframe();

    if (document.getElementById('cassette-side-dock')) return;

    const loadPos = () => {
      try {
        const p = JSON.parse(localStorage.getItem(DOCK_POS_KEY) || 'null');
        if (p && typeof p.x === 'number' && typeof p.y === 'number') {
          return {
            x: p.x,
            y: p.y,
            side: p.side === 'left' ? 'left' : 'right',
            hiddenMode: p.hiddenMode !== false
          };
        }
      } catch (_) {}
      return { x: Math.max(12, window.innerWidth - 312), y: Math.round(window.innerHeight * 0.42), side: 'right', hiddenMode: true };
    };

    let dockPos = loadPos();
    const savePos = () => {
      try { localStorage.setItem(DOCK_POS_KEY, JSON.stringify(dockPos)); } catch (_) {}
    };

    const dock = document.createElement('aside');
    dock.id = 'cassette-side-dock';
    dock.setAttribute('aria-label', 'เครื่องเล่นเพลงคาสเซ็ต');
    dock.style.cssText = [
      'position: fixed',
      'left: 0',
      'top: 0',
      'z-index: 155',
      'width: 300px',
      'transition: transform 0.34s cubic-bezier(0.22, 1, 0.36, 1)',
      'will-change: transform',
      'pointer-events: auto',
      'user-select: none'
    ].join(';');

    // Pure Cassette Shape (no outer rectangular box!) + floating pill controls on hover
    dock.innerHTML = `
      <div id="cassette-shell" class="relative w-[300px] group">
        <!-- Side Peek Tab (shown when hidden to left/right edge) -->
        <button type="button" id="cassette-peek-tab" title="ชี้เมาส์หรือคลิกเพื่อเปิดคาสเซ็ต"
          class="hidden absolute top-1/2 -translate-y-1/2 w-[30px] py-2.5 border-2 border-[#111111] bg-[#111111] text-[#F4D03F] flex-col items-center justify-center gap-1.5 cursor-pointer shadow-[2px_2px_0px_rgba(17,17,17,0.45)] z-20">
          <span id="cassette-peek-dot" class="w-2.5 h-2.5 rounded-full bg-[#F4D03F]/40 border border-white/25"></span>
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
        </button>

        <!-- Pure Cassette Silhouette (Chroma-Keyed MP4 -> Canvas) -->
        <div id="cassette-visual-box" class="relative w-full aspect-[880/582] cursor-grab active:cursor-grabbing" title="ลากเพื่อย้าย • คลิกเพื่อเล่น/พัก • คลิกขวาเปิดเมนู">
          <canvas id="cassette-canvas" width="440" height="291" class="w-full h-full block drop-shadow-[4px_6px_0px_rgba(17,17,17,0.7)]"></canvas>

          <!-- Dynamic Video Title on Cassette Side-A Label -->
          <div class="pointer-events-none absolute top-[12%] left-[31%] right-[13%] h-[15%] flex flex-col justify-center overflow-hidden px-1">
            <p id="cassette-tape-title" class="thai-safe-tight font-display font-black text-[10px] sm:text-[11px] text-[#111111] truncate leading-tight">ยังไม่ได้เลือกเพลง</p>
            <p id="cassette-tape-sub" class="font-display font-bold text-[8.5px] text-[#111111]/65 truncate">คลิกเพื่อเลือกเพลง YouTube</p>
          </div>
        </div>

        <!-- Floating Minimal Controls Pill (appears cleanly below cassette on hover or when paused/active) -->
        <div class="mt-1 flex items-center justify-center gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
          <button type="button" id="cassette-play-btn" class="btn-vox bg-[#F4D03F] hover:bg-[#f2c61d] text-[#111111] font-display font-black text-[11px] px-2.5 py-1 rounded-lg inline-flex items-center gap-1 cursor-pointer">
            <span id="cassette-play-icon" class="flex items-center"></span>
            <span id="cassette-play-label">เลือกเพลง</span>
          </button>
          <button type="button" id="cassette-stop-btn" title="หยุดและนำเทปออก" class="hidden w-7 h-7 rounded-lg border-2 border-[#111111] bg-white hover:bg-red-50 text-[#E74C3C] items-center justify-center cursor-pointer shadow-[2px_2px_0px_#111111]">
            <svg class="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="5" width="14" height="14" rx="2"/></svg>
          </button>
          <button type="button" id="cassette-hide-btn" title="ซ่อนเข้าขอบจอ / แสดงค้าง" class="w-7 h-7 rounded-lg border-2 border-[#111111] bg-white hover:bg-[#F4D03F] text-[#111111] font-display font-black text-[11px] flex items-center justify-center cursor-pointer shadow-[2px_2px_0px_#111111]">⇄</button>
          <button type="button" id="cassette-menu-btn" title="เมนูเครื่องเล่น" class="w-7 h-7 rounded-lg border-2 border-[#111111] bg-[#111111] text-[#F4D03F] font-display font-black text-xs flex items-center justify-center cursor-pointer shadow-[2px_2px_0px_#111111]">⋯</button>
        </div>

        <!-- Custom Cassette Popover Menu -->
        <div id="cassette-custom-menu" class="hidden absolute left-1/2 -translate-x-1/2 bottom-10 z-50 w-56 vox-card bg-[#F8F6F0] p-1.5 flex-col gap-1 vox-panel-enter">
          <div class="px-2 py-1 border-b border-[#111111]/15 font-display font-black text-[10px] uppercase tracking-wider text-[#111111]/60">Cassette Menu</div>
          <button type="button" data-cas-act="choose" class="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-[#F4D03F] font-display font-bold text-xs text-[#111111] flex items-center gap-2 cursor-pointer transition-colors">
            <svg class="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
            <span>เลือก / เปลี่ยนเพลง YouTube</span>
          </button>
          <button type="button" data-cas-act="toggle" class="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-[#F4D03F] font-display font-bold text-xs text-[#111111] flex items-center gap-2 cursor-pointer transition-colors">
            <svg class="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M6 4l15 8-15 8V4z"/></svg>
            <span>เล่น / พักเพลง</span>
          </button>
          <button type="button" data-cas-act="toggle-hide" class="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-[#F4D03F] font-display font-bold text-xs text-[#111111] flex items-center justify-between cursor-pointer transition-colors">
            <span>ซ่อนเข้าขอบจออัตโนมัติ</span>
            <span id="cas-menu-hide-badge" class="text-[10px] px-1.5 py-0.5 rounded bg-white border border-[#111111]">ON</span>
          </button>
          <button type="button" data-cas-act="stop" class="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-red-100 font-display font-bold text-xs text-[#E74C3C] flex items-center gap-2 cursor-pointer transition-colors">
            <svg class="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="5" width="14" height="14" rx="2"/></svg>
            <span>หยุดและนำเทปออก</span>
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(dock);

    // Hidden looping cassette video source
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
    let isHoveredOrOpen = false;
    let hideTimer = null;

    const customMenu = document.getElementById('cassette-custom-menu');
    const hideBadge = document.getElementById('cas-menu-hide-badge');
    const peekTab = document.getElementById('cassette-peek-tab');
    const peekDot = document.getElementById('cassette-peek-dot');
    const tapeTitleEl = document.getElementById('cassette-tape-title');
    const tapeSubEl = document.getElementById('cassette-tape-sub');
    const playBtn = document.getElementById('cassette-play-btn');
    const playIconEl = document.getElementById('cassette-play-icon');
    const playLabelEl = document.getElementById('cassette-play-label');
    const stopBtn = document.getElementById('cassette-stop-btn');
    const visualBox = document.getElementById('cassette-visual-box');

    function drawCassetteFrame() {
      if (!ctx || !offCtx || videoEl.readyState < 2) return;
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

    videoEl.addEventListener('loadeddata', () => { drawCassetteFrame(); }, { once: true });

    function applyDockPosition() {
      const W = window.innerWidth;
      const H = window.innerHeight;
      const dockW = 300;
      const dockH = 235;
      const clampedY = Math.max(12, Math.min(H - dockH, dockPos.y));
      dockPos.y = clampedY;

      const menuOpen = customMenu && !customMenu.classList.contains('hidden');
      const shouldHide = dockPos.hiddenMode && !isHoveredOrOpen && !menuOpen;

      if (peekTab) {
        if (dockPos.hiddenMode) {
          peekTab.classList.remove('hidden');
          peekTab.classList.add('flex');
          if (dockPos.side === 'left') {
            peekTab.style.left = 'auto';
            peekTab.style.right = '-30px';
            peekTab.className = peekTab.className.replace(/rounded-[lr]-xl/g, '') + ' rounded-r-xl';
          } else {
            peekTab.style.right = 'auto';
            peekTab.style.left = '-30px';
            peekTab.className = peekTab.className.replace(/rounded-[lr]-xl/g, '') + ' rounded-l-xl';
          }
        } else {
          peekTab.classList.add('hidden');
          peekTab.classList.remove('flex');
        }
      }

      let tx = Math.max(8, Math.min(W - dockW - 8, dockPos.x));
      if (shouldHide) {
        tx = dockPos.side === 'left' ? -dockW : W;
      } else if (dockPos.hiddenMode) {
        tx = dockPos.side === 'left' ? 12 : Math.max(12, W - dockW - 12);
      }
      dock.style.transform = `translate3d(${Math.round(tx)}px, ${Math.round(clampedY)}px, 0)`;
    }

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
    dock.addEventListener('mouseleave', () => {
      scheduleHide();
    });

    // Proximity popup when mouse gets near the docked edge
    window.addEventListener('mousemove', (e) => {
      if (!dockPos.hiddenMode) return;
      const nearEdge = dockPos.side === 'left'
        ? e.clientX <= 64
        : (window.innerWidth - e.clientX) <= 64;
      const nearY = e.clientY >= (dockPos.y - 45) && e.clientY <= (dockPos.y + 260);
      if (nearEdge && nearY) {
        if (hideTimer) clearTimeout(hideTimer);
        if (!isHoveredOrOpen) {
          isHoveredOrOpen = true;
          applyDockPosition();
        }
      }
    }, { passive: true });

    peekTab?.addEventListener('click', () => {
      isHoveredOrOpen = !isHoveredOrOpen;
      applyDockPosition();
    });

    // Drag to move anywhere on screen
    let dragState = null;
    visualBox?.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      dragState = {
        startX: e.clientX,
        startY: e.clientY,
        origX: dockPos.hiddenMode ? (dockPos.side === 'left' ? 12 : Math.max(12, window.innerWidth - 312)) : dockPos.x,
        origY: dockPos.y,
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
      if (dragState.moved) {
        dockPos.x = Math.max(8, Math.min(window.innerWidth - 308, dragState.origX + dx));
        dockPos.y = Math.max(12, Math.min(window.innerHeight - 235, dragState.origY + dy));
        dockPos.side = (dockPos.x + 150) < (window.innerWidth / 2) ? 'left' : 'right';
        applyDockPosition();
      }
    });

    window.addEventListener('pointerup', () => {
      if (!dragState) return;
      dock.style.transition = 'transform 0.34s cubic-bezier(0.22, 1, 0.36, 1)';
      if (dragState.moved) {
        // Auto-snap to side hide if dragged right up against left or right edge
        if (dockPos.x <= 18) {
          dockPos.side = 'left';
          dockPos.hiddenMode = true;
        } else if (dockPos.x >= window.innerWidth - 318) {
          dockPos.side = 'right';
          dockPos.hiddenMode = true;
        }
        savePos();
        applyDockPosition();
      } else {
        // Simple click on cassette toggles play/modal
        const cur = readBgm();
        if (!cur.videoId) openMusicModal();
        else window.HelpDaiBgm.setPlaying(!cur.playing);
      }
      dragState = null;
    });

    window.addEventListener('resize', applyDockPosition);

    // YouTube Chooser Modal
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

    function toggleCustomMenu(force) {
      if (!customMenu) return;
      const open = typeof force === 'boolean' ? force : customMenu.classList.contains('hidden');
      customMenu.classList.toggle('hidden', !open);
      customMenu.classList.toggle('flex', open);
      if (open) isHoveredOrOpen = true;
      applyDockPosition();
    }

    document.getElementById('cassette-menu-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleCustomMenu();
    });

    document.getElementById('cassette-hide-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      dockPos.hiddenMode = !dockPos.hiddenMode;
      isHoveredOrOpen = !dockPos.hiddenMode;
      savePos();
      syncUi();
    });

    visualBox?.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      toggleCustomMenu(true);
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
        } else if (act === 'toggle-hide') {
          dockPos.hiddenMode = !dockPos.hiddenMode;
          isHoveredOrOpen = !dockPos.hiddenMode;
          savePos();
          syncUi();
        } else if (act === 'stop') {
          window.HelpDaiBgm.stop();
        }
      });
    });

    playBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      const cur = readBgm();
      if (!cur.videoId) openMusicModal();
      else window.HelpDaiBgm.setPlaying(!cur.playing);
    });

    stopBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      window.HelpDaiBgm.stop();
    });

    const syncUi = () => {
      syncEngineIframe();
      const st = readBgm();
      const hasTrack = Boolean(st.videoId);
      const isPlaying = Boolean(hasTrack && st.playing);

      if (hideBadge) hideBadge.textContent = dockPos.hiddenMode ? 'ON' : 'OFF';

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

      if (isPlaying) {
        videoEl.play().then(() => {
          if (!animRaf) loopCassetteRender();
        }).catch(() => {});
      } else {
        if (!videoEl.paused) videoEl.pause();
        drawCassetteFrame();
      }

      applyDockPosition();
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
