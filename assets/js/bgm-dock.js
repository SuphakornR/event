/* HelpDaiCha Cross-Page YouTube BGM State + Footer-Aligned Compact Card & Smooth Modal */
(() => {
  const BGM_KEY = 'helpdai_bgm_player_v1';

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
    try {
      localStorage.setItem(BGM_KEY, JSON.stringify(next));
    } catch (_) {}
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

  // Persistent YouTube host on current page (never reparented inside DOM)
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

    // Only mount/autoplay iframe when playing is true (or if already loaded and paused)
    if (st.videoId !== loadedId) {
      if (!st.playing) {
        // Track is paused: do NOT autoplay or load hidden playing iframe across refresh/page change
        return;
      }
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

  // Track exact YouTube currentTime ONLY while playing
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

  function mountHubPlayer() {
    ensureHostMounted();
    syncEngineIframe();

    const slot = document.getElementById('hub-bgm-slot');
    if (!slot) return;

    // Compact inline footer card (same height & level as Suggestion Box / ToS / Ko-fi, no inner เพลง button)
    slot.innerHTML = `
      <div id="hub-bgm-card" title="คลิก หรือ คลิกขวา เพื่อเลือก/แก้ไขเพลง YouTube" class="bg-white border-2 border-[#111111] rounded-xl shadow-[2px_2px_0px_#111111] px-2.5 py-1 flex items-center gap-2 cursor-pointer hover:bg-[#FFFDF5] transition-colors select-none max-w-[16rem]">
        <div id="hub-bgm-thumb-wrap" class="w-7 h-7 rounded-md border-2 border-[#111111] bg-[#F4D03F] flex items-center justify-center overflow-hidden shrink-0">
          <svg class="w-3.5 h-3.5 text-[#111111]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
        </div>
        <div class="min-w-0 flex-1 flex items-center gap-1.5">
          <span id="hub-bgm-dot" class="hidden w-2 h-2 rounded-full bg-[#10B981] shrink-0 animate-pulse"></span>
          <p id="hub-bgm-title" class="thai-safe-tight font-display font-extrabold text-[11px] text-[#111111] truncate">คลิกขวาเลือกเพลง</p>
        </div>
        <div class="flex items-center gap-1 shrink-0">
          <button type="button" id="hub-bgm-toggle" title="เล่น / พัก" aria-label="เล่นหรือพักเพลง" class="hidden w-6 h-6 bg-[#F4D03F] hover:bg-[#f2c61d] border border-[#111111] text-[#111111] rounded-md items-center justify-center cursor-pointer"></button>
          <button type="button" id="hub-bgm-stop" title="ปิดเพลง" aria-label="ปิดเพลง" class="hidden w-6 h-6 bg-white hover:bg-red-50 border border-[#111111] text-[#E74C3C] rounded-md items-center justify-center cursor-pointer">
            <svg class="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="5" width="14" height="14" rx="2"/></svg>
          </button>
        </div>
      </div>
    `;

    // Smooth Centered Modal (never teleports or jumps!)
    let modal = document.getElementById('hub-bgm-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'hub-bgm-modal';
      modal.className = 'hidden fixed inset-0 z-[170] items-center justify-center p-4 bg-[#111111]/60 backdrop-blur-sm';
      modal.innerHTML = `
        <div class="vox-panel-enter w-full max-w-md vox-card bg-[#F8F6F0] p-5 flex flex-col gap-3">
          <div class="flex items-center justify-between gap-2 pb-2 border-b-2 border-[#111111]">
            <div class="flex items-center gap-2">
              <span class="w-7 h-7 rounded-lg border-2 border-[#111111] bg-[#F4D03F] flex items-center justify-center shadow-[2px_2px_0px_#111111]">
                <svg class="w-4 h-4 text-[#111111]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
              </span>
              <h2 class="thai-safe-tight font-display font-extrabold text-base text-[#111111]">เลือกเพลงพื้นหลัง (YouTube)</h2>
            </div>
            <button type="button" id="hub-bgm-pop-close" class="w-7 h-7 rounded-lg border-2 border-[#111111] bg-white hover:bg-[#E74C3C] hover:text-white font-display font-black text-xs flex items-center justify-center cursor-pointer transition-colors">✕</button>
          </div>
          <div class="flex gap-1.5">
            <input id="hub-bgm-input" type="text" placeholder="วางลิงก์ YouTube หรือพิมพ์ชื่อเพลงแล้วกด Enter..." class="flex-1 min-w-0 bg-white border-2 border-[#111111] rounded-xl px-3 py-2 text-xs sm:text-sm font-semibold text-[#111111] focus:outline-none" />
            <button type="button" id="hub-bgm-go" class="btn-vox bg-[#F4D03F] hover:bg-[#f2c61d] text-[#111111] font-display font-extrabold text-xs px-4 py-2 rounded-xl cursor-pointer">เล่น</button>
          </div>
          <div id="hub-bgm-results" class="hidden flex-col gap-1.5 max-h-48 overflow-y-auto"></div>
        </div>
      `;
      document.body.appendChild(modal);
    }

    const cardEl = document.getElementById('hub-bgm-card');
    const thumbWrap = document.getElementById('hub-bgm-thumb-wrap');
    const dotEl = document.getElementById('hub-bgm-dot');
    const titleEl = document.getElementById('hub-bgm-title');
    const toggleBtn = document.getElementById('hub-bgm-toggle');
    const stopBtn = document.getElementById('hub-bgm-stop');
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
        titleEl.textContent = 'คลิกขวาเลือกเพลง';
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
        closeMusicModal();
        await window.HelpDaiBgm.setTrack(id, '', true);
        return;
      }

      resultsEl.classList.remove('hidden');
      resultsEl.classList.add('flex');
      resultsEl.innerHTML = `<div class="text-xs font-display font-bold text-[#111111]/60 py-2 text-center">กำลังค้นหา...</div>`;
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
      resultsEl.innerHTML = `<a href="https://www.youtube.com/results?search_query=${encodeURIComponent(raw)}" target="_blank" rel="noopener noreferrer" class="btn-vox bg-white hover:bg-[#F4D03F] px-3 py-2 rounded-xl text-xs font-display font-bold flex items-center justify-between text-[#111111]"><span>ค้นหาบน YouTube ↗</span></a>`;
    };

    cardEl?.addEventListener('click', (e) => {
      if (e.target.closest('button')) return;
      openMusicModal();
    });
    popCloseBtn?.addEventListener('click', closeMusicModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeMusicModal();
    });
    goBtn?.addEventListener('click', handleSearchOrUrl);
    inpEl?.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); handleSearchOrUrl(); } });
    toggleBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      const cur = readBgm();
      window.HelpDaiBgm.setPlaying(!cur.playing);
    });
    stopBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      window.HelpDaiBgm.stop();
    });

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
