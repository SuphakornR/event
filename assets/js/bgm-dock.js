/* HelpDaiCha Cross-Page Persistent YouTube BGM Engine + Footer Compact Player */
(() => {
  const BGM_KEY = 'helpdai_bgm_player_v1';

  const extractYoutubeId = (raw) => {
    const s = String(raw || '').trim();
    if (!s) return '';
    if (/^[a-zA-Z0-9_-]{11}$/.test(s)) return s;
    const m = s.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return m ? m[1] : '';
  };

  // If running inside the seamless cross-page shell iframe, delegate to window.parent.HelpDaiBgm
  try {
    if (window.parent && window.parent !== window && window.parent.HelpDaiBgm) {
      const parentBgm = window.parent.HelpDaiBgm;
      parentBgm.registerChildWindow?.(window);
      window.HelpDaiBgm = parentBgm;

      document.addEventListener('click', (e) => {
        const a = e.target.closest?.('a[href]');
        if (!a || a.target === '_blank' || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        const href = (a.getAttribute('href') || '').trim();
        if (href === 'index.html' || href === './index.html' || href === '/') {
          e.preventDefault();
          parentBgm.parkOverlay?.();
          parentBgm.closeShell?.('index.html');
        }
      });
      return;
    }
  } catch (_) {}

  const childWindows = new Set();

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

  const broadcastBgm = (next) => {
    window.dispatchEvent(new CustomEvent('helpdai-bgm-change', { detail: next }));
    childWindows.forEach((w) => {
      try {
        if (w && !w.closed) {
          w.dispatchEvent(new w.CustomEvent('helpdai-bgm-change', { detail: next }));
        } else {
          childWindows.delete(w);
        }
      } catch (_) {
        childWindows.delete(w);
      }
    });
  };

  const writeBgm = (next, emit = true) => {
    try {
      localStorage.setItem(BGM_KEY, JSON.stringify(next));
    } catch (_) {}
    if (emit) broadcastBgm(next);
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

  // Single persistent YouTube host in window.top (never destroyed across index.html <-> scoreboard.html)
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
    if (st.videoId && st.videoId !== loadedId) {
      loadedId = st.videoId;
      loadedPlaying = st.playing;
      const originParam = location.protocol.startsWith('http') ? `&origin=${encodeURIComponent(location.origin)}` : '';
      const startParam = st.elapsedSec > 1 ? `&start=${Math.floor(st.elapsedSec)}` : '';
      ytFrameHost.innerHTML = `<iframe class="w-full h-full rounded-lg border-2 border-[#111111]" src="https://www.youtube.com/embed/${st.videoId}?enablejsapi=1&autoplay=${st.playing ? 1 : 0}&rel=0${startParam}${originParam}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" referrerpolicy="strict-origin-when-cross-origin" title="HelpDaiCha BGM"></iframe>`;
      const iframe = ytFrameHost.querySelector('iframe');
      iframe?.addEventListener('load', () => {
        try {
          iframe.contentWindow?.postMessage(JSON.stringify({ event: 'listening', id: 1 }), '*');
        } catch (_) {}
      });
    } else if (!st.videoId && loadedId) {
      loadedId = '';
      loadedPlaying = false;
      ytFrameHost.innerHTML = '';
      parkOverlay();
    } else if (st.videoId && st.videoId === loadedId && st.playing !== loadedPlaying) {
      loadedPlaying = st.playing;
      sendYtCmd(st.playing ? 'playVideo' : 'pauseVideo');
    }
  };

  // Listen for YouTube embed currentTime telemetry so hard refreshes resume at the exact second
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

  // Seamless cross-page shell so switching index.html <-> scoreboard.html never unloads the YouTube iframe
  let shellFrame = null;
  let shellOpen = false;
  const initialPage = location.pathname.endsWith('scoreboard.html') ? 'scoreboard.html' : 'index.html';

  const openShell = (targetHref, pushHistory = true) => {
    parkOverlay();
    if (!shellFrame) {
      shellFrame = document.createElement('iframe');
      shellFrame.id = 'helpdai-page-shell';
      shellFrame.src = targetHref;
      shellFrame.title = 'HelpDaiCha Stage';
      shellFrame.className = 'fixed inset-0 w-full h-full border-0 z-[200] bg-[#F8F6F0]';
      shellFrame.setAttribute('allow', 'autoplay; fullscreen; clipboard-write');
      document.body.appendChild(shellFrame);
    } else {
      shellFrame.classList.remove('hidden');
    }
    shellOpen = true;
    if (pushHistory) {
      try {
        history.pushState({ helpdaiShell: targetHref }, '', targetHref);
      } catch (_) {}
    }
  };

  const closeShell = (backHref = initialPage, pushHistory = true) => {
    parkOverlay();
    if (shellFrame) {
      shellFrame.classList.add('hidden');
    }
    shellOpen = false;
    if (pushHistory) {
      try {
        history.pushState({ helpdaiShell: null }, '', backHref);
      } catch (_) {}
    }
    broadcastBgm(readBgm());
  };

  window.addEventListener('popstate', () => {
    const onScoreboard = location.pathname.endsWith('scoreboard.html');
    const targetPage = onScoreboard ? 'scoreboard.html' : 'index.html';
    if (targetPage !== initialPage) {
      openShell(targetPage, false);
    } else if (shellOpen) {
      closeShell(initialPage, false);
    }
  });

  document.addEventListener('click', (e) => {
    const a = e.target.closest?.('a[href]');
    if (!a || a.target === '_blank' || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const href = (a.getAttribute('href') || '').trim();
    if (initialPage === 'index.html' && (href === 'scoreboard.html' || href === './scoreboard.html')) {
      e.preventDefault();
      openShell('scoreboard.html', true);
    } else if (initialPage === 'scoreboard.html' && (href === 'index.html' || href === './index.html')) {
      e.preventDefault();
      openShell('index.html', true);
    }
  });

  window.HelpDaiBgm = Object.freeze({
    getState: readBgm,
    extractYoutubeId,
    registerChildWindow(win) {
      if (win) childWindows.add(win);
    },
    mountOverlay,
    parkOverlay,
    openShell,
    closeShell,
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
      writeBgm({ videoId: '', title: '', playing: false, elapsedSec: 0, startedAt: 0 });
      syncEngineIframe();
    }
  });

  function mountHubPlayer() {
    ensureHostMounted();
    syncEngineIframe();

    const slot = document.getElementById('hub-bgm-slot');
    if (!slot) return;

    let searchOpen = false;

    slot.innerHTML = `
      <!-- Upward Popover for YouTube Link / Search so footer stays on the same horizontal level -->
      <div id="hub-bgm-input-row" class="hidden absolute bottom-full left-1/2 -translate-x-1/2 mb-2.5 w-80 sm:w-96 z-50 vox-card bg-white p-2.5 flex-col gap-2 vox-panel-enter">
        <div class="flex items-center justify-between gap-2 pb-1 border-b border-[#111111]/15">
          <span class="font-display font-extrabold text-[11px] text-[#111111]">♪ เลือกเพลงพื้นหลัง YouTube</span>
          <button type="button" id="hub-bgm-pop-close" class="w-5 h-5 rounded hover:bg-red-100 text-[#111111] hover:text-[#E74C3C] font-black text-[11px] flex items-center justify-center cursor-pointer">✕</button>
        </div>
        <div class="flex gap-1.5">
          <input id="hub-bgm-input" type="text" placeholder="วางลิงก์ YouTube หรือพิมพ์ชื่อเพลง..." class="flex-1 min-w-0 bg-[#F8F6F0] border-2 border-[#111111] rounded-lg px-2.5 py-1 text-xs font-semibold text-[#111111] focus:outline-none focus:bg-white" />
          <button type="button" id="hub-bgm-go" class="btn-vox bg-[#F4D03F] hover:bg-[#f2c61d] text-[#111111] font-display font-extrabold text-xs px-3 py-1 rounded-lg cursor-pointer">เล่น</button>
        </div>
        <div id="hub-bgm-results" class="hidden flex-col gap-1 max-h-40 overflow-y-auto"></div>
      </div>

      <!-- Compact Horizontal Footer Card (Same Level as Suggestion Box & ToS) -->
      <div class="bg-white border-2 border-[#111111] rounded-xl shadow-[2px_2px_0px_#111111] px-2.5 py-1 flex items-center gap-2 w-full">
        <div id="hub-bgm-thumb-wrap" class="w-8 h-6 rounded-md border border-[#111111] bg-[#F4D03F] flex items-center justify-center overflow-hidden shrink-0">
          <svg class="w-3.5 h-3.5 text-[#111111]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
        </div>
        <div class="min-w-0 flex-1 flex items-center gap-1.5">
          <span id="hub-bgm-dot" class="hidden w-2 h-2 rounded-full bg-[#10B981] shrink-0 animate-pulse"></span>
          <p id="hub-bgm-title" class="thai-safe-tight font-display font-bold text-[11px] text-[#111111] truncate">ยังไม่ได้เปิดเพลงพื้นหลัง</p>
        </div>
        <div class="flex items-center gap-1 shrink-0">
          <button type="button" id="hub-bgm-toggle" title="เล่น / พัก" aria-label="เล่นหรือพักเพลง" class="hidden btn-vox w-6 h-6 bg-[#F4D03F] hover:bg-[#f2c61d] text-[#111111] rounded-md items-center justify-center cursor-pointer"></button>
          <button type="button" id="hub-bgm-stop" title="ปิดเพลง" aria-label="ปิดเพลง" class="hidden btn-vox w-6 h-6 bg-white hover:bg-red-50 text-[#E74C3C] rounded-md items-center justify-center cursor-pointer">
            <svg class="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="5" width="14" height="14" rx="2"/></svg>
          </button>
          <button type="button" id="hub-bgm-edit-btn" title="เลือกเพลง YouTube" aria-label="เลือกเพลง YouTube" class="btn-vox bg-[#111111] hover:bg-[#222222] text-[#F4D03F] font-display font-extrabold text-[10px] px-2 py-0.5 rounded-md cursor-pointer">♪ เพลง</button>
        </div>
      </div>
    `;

    const thumbWrap = document.getElementById('hub-bgm-thumb-wrap');
    const dotEl = document.getElementById('hub-bgm-dot');
    const titleEl = document.getElementById('hub-bgm-title');
    const toggleBtn = document.getElementById('hub-bgm-toggle');
    const stopBtn = document.getElementById('hub-bgm-stop');
    const editBtn = document.getElementById('hub-bgm-edit-btn');
    const popCloseBtn = document.getElementById('hub-bgm-pop-close');
    const inputRow = document.getElementById('hub-bgm-input-row');
    const inpEl = document.getElementById('hub-bgm-input');
    const goBtn = document.getElementById('hub-bgm-go');
    const resultsEl = document.getElementById('hub-bgm-results');

    const closePop = () => {
      searchOpen = false;
      inputRow.classList.add('hidden');
      inputRow.classList.remove('flex');
    };

    const syncUi = () => {
      syncEngineIframe();
      const st = readBgm();
      const hasTrack = Boolean(st.videoId);

      toggleBtn.classList.toggle('hidden', !hasTrack);
      toggleBtn.classList.toggle('flex', hasTrack);
      stopBtn.classList.toggle('hidden', !hasTrack);
      stopBtn.classList.toggle('flex', hasTrack);
      dotEl.classList.toggle('hidden', !(hasTrack && st.playing));

      if (hasTrack) {
        thumbWrap.innerHTML = `<img src="https://i.ytimg.com/vi/${st.videoId}/hqdefault.jpg" alt="" class="w-full h-full object-cover" />`;
        titleEl.textContent = st.title || `YouTube (${st.videoId})`;
        toggleBtn.innerHTML = st.playing
          ? '<svg class="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>'
          : '<svg class="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M6 4l15 8-15 8V4z"/></svg>';
      } else {
        thumbWrap.innerHTML = '<svg class="w-3.5 h-3.5 text-[#111111]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>';
        titleEl.textContent = 'ยังไม่ได้เปิดเพลงพื้นหลัง';
      }
    };

    const handleSearchOrUrl = async () => {
      const raw = (inpEl.value || '').trim();
      if (!raw) return;
      const id = extractYoutubeId(raw);
      if (id) {
        inpEl.value = '';
        resultsEl.classList.add('hidden');
        resultsEl.classList.remove('flex');
        closePop();
        await window.HelpDaiBgm.setTrack(id, '', true);
        return;
      }

      resultsEl.classList.remove('hidden');
      resultsEl.classList.add('flex');
      resultsEl.innerHTML = `<div class="text-[11px] font-display font-bold text-[#111111]/60 py-1 text-center">กำลังค้นหา...</div>`;
      try {
        const cfg = window.HELPDAI_CONFIG || {};
        const defaultApiBase = (!location.hostname.endsWith('github.io') && location.protocol.startsWith('http')) ? location.origin : '';
        const apiBase = (cfg.apiBase || defaultApiBase).replace(/\/$/, '');
        if (apiBase) {
          const res = await fetch(`${apiBase}/api/yt-search?q=${encodeURIComponent(raw)}`, { signal: AbortSignal.timeout(5000) });
          if (res.ok) {
            const data = await res.json();
            const items = Array.isArray(data?.items) ? data.items.slice(0, 4) : [];
            if (items.length) {
              resultsEl.innerHTML = items.map(it => `
                <button type="button" data-hub-yt="${it.id}" data-hub-title="${String(it.title || '').replace(/"/g, '&quot;')}" class="w-full text-left bg-[#F8F6F0] hover:bg-[#F4D03F] border border-[#111111] rounded-lg p-1.5 flex items-center gap-2 cursor-pointer">
                  ${it.thumb ? `<img src="${it.thumb}" alt="" class="w-9 h-6 object-cover rounded border border-[#111111] shrink-0" />` : ''}
                  <span class="font-display font-bold text-[11px] text-[#111111] truncate">${String(it.title || '').replace(/[<>&"]/g, '')}</span>
                </button>
              `).join('');
              resultsEl.querySelectorAll('[data-hub-yt]').forEach(b => {
                b.addEventListener('click', () => {
                  window.HelpDaiBgm.setTrack(b.dataset.hubYt, b.dataset.hubTitle, true);
                  resultsEl.classList.add('hidden');
                  closePop();
                });
              });
              return;
            }
          }
        }
      } catch (_) {}
      resultsEl.innerHTML = `<a href="https://www.youtube.com/results?search_query=${encodeURIComponent(raw)}" target="_blank" rel="noopener noreferrer" class="btn-vox bg-white hover:bg-[#F4D03F] px-2.5 py-1 rounded-lg text-[11px] font-display font-bold flex items-center justify-between text-[#111111]"><span>ค้นหาบน YouTube ↗</span></a>`;
    };

    editBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      searchOpen = !searchOpen;
      inputRow.classList.toggle('hidden', !searchOpen);
      inputRow.classList.toggle('flex', searchOpen);
      if (searchOpen) inpEl.focus();
    });
    popCloseBtn?.addEventListener('click', closePop);
    document.addEventListener('click', (e) => {
      if (searchOpen && !slot.contains(e.target)) closePop();
    });
    goBtn.addEventListener('click', handleSearchOrUrl);
    inpEl.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); handleSearchOrUrl(); } });
    toggleBtn.addEventListener('click', () => {
      const cur = readBgm();
      window.HelpDaiBgm.setPlaying(!cur.playing);
    });
    stopBtn.addEventListener('click', () => window.HelpDaiBgm.stop());

    window.addEventListener('helpdai-bgm-change', syncUi);
    window.addEventListener('storage', (e) => { if (e.key === BGM_KEY) syncUi(); });
    syncUi();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountHubPlayer, { once: true });
  } else {
    mountHubPlayer();
  }
})();
