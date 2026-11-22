/* HelpDaiCha Cross-Page YouTube BGM State + Hub Compact Horizontal Player */
(() => {
  const BGM_KEY = 'helpdai_bgm_player_v1';

  const readBgm = () => {
    try {
      const raw = JSON.parse(localStorage.getItem(BGM_KEY) || 'null');
      if (raw && typeof raw.videoId === 'string') {
        return { videoId: raw.videoId, title: String(raw.title || ''), playing: Boolean(raw.playing) };
      }
    } catch (_) {}
    return { videoId: '', title: '', playing: false };
  };

  const writeBgm = (next) => {
    try {
      localStorage.setItem(BGM_KEY, JSON.stringify(next));
    } catch (_) {}
    window.dispatchEvent(new CustomEvent('helpdai-bgm-change', { detail: next }));
  };

  const extractYoutubeId = (raw) => {
    const s = String(raw || '').trim();
    if (!s) return '';
    if (/^[a-zA-Z0-9_-]{11}$/.test(s)) return s;
    const m = s.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return m ? m[1] : '';
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

  window.HelpDaiBgm = Object.freeze({
    getState: readBgm,
    extractYoutubeId,
    async setTrack(videoId, title = '', playing = true) {
      const cleanId = extractYoutubeId(videoId);
      if (!cleanId) return;
      const cur = readBgm();
      const resolvedTitle = title || (cur.videoId === cleanId && cur.title ? cur.title : `YouTube (${cleanId})`);
      writeBgm({ videoId: cleanId, title: resolvedTitle, playing: Boolean(playing) });
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
      writeBgm({ ...cur, playing: Boolean(playing) });
    },
    stop() {
      writeBgm({ videoId: '', title: '', playing: false });
    }
  });

  function mountHubPlayer() {
    const slot = document.getElementById('hub-bgm-slot');
    if (!slot) return;

    const ytFrameHost = document.createElement('div');
    ytFrameHost.className = 'fixed -left-[9999px] top-0 w-40 h-24 opacity-0 pointer-events-none';
    document.body.appendChild(ytFrameHost);

    let loadedId = '';
    let searchOpen = false;

    slot.innerHTML = `
      <div class="vox-card bg-white px-3 py-2 flex flex-col gap-2 w-full max-w-xl mx-auto">
        <div class="flex items-center gap-3">
          <div id="hub-bgm-thumb-wrap" class="w-12 h-9 rounded-lg border-2 border-[#111111] bg-[#F4D03F] flex items-center justify-center overflow-hidden shrink-0">
            <svg class="w-4 h-4 text-[#111111]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-1.5">
              <span id="hub-bgm-dot" class="hidden w-2 h-2 rounded-full bg-[#10B981] shrink-0 animate-pulse"></span>
              <p id="hub-bgm-title" class="thai-safe-tight font-display font-extrabold text-xs text-[#111111] truncate">ยังไม่ได้เลือกเพลงพื้นหลัง</p>
            </div>
            <p id="hub-bgm-sub" class="text-[10px] font-semibold text-[#111111]/60 truncate">เล่นต่อเนื่องข้ามหน้าไปยัง Stage Scoreboard ได้ทันที</p>
          </div>
          <div class="flex items-center gap-1.5 shrink-0">
            <button type="button" id="hub-bgm-toggle" title="เล่น / หยุด" aria-label="เล่นหรือหยุดเพลง" class="hidden btn-vox w-8 h-8 bg-[#F4D03F] hover:bg-[#f2c61d] text-[#111111] rounded-lg items-center justify-center cursor-pointer"></button>
            <button type="button" id="hub-bgm-stop" title="หยุดเพลง" aria-label="ปิดเพลง" class="hidden btn-vox w-8 h-8 bg-white hover:bg-red-50 text-[#E74C3C] rounded-lg items-center justify-center cursor-pointer">
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="5" width="14" height="14" rx="2"/></svg>
            </button>
            <button type="button" id="hub-bgm-edit-btn" title="ใส่ลิงก์หรือค้นหาเพลง YouTube" aria-label="เลือกเพลง YouTube" class="btn-vox bg-[#111111] hover:bg-[#222222] text-[#F4D03F] font-display font-extrabold text-[11px] px-2.5 py-1.5 rounded-lg cursor-pointer">♪ เลือกเพลง</button>
          </div>
        </div>

        <div id="hub-bgm-input-row" class="hidden flex-col gap-1.5 pt-1 border-t border-[#111111]/15">
          <div class="flex gap-1.5">
            <input id="hub-bgm-input" type="text" placeholder="วางลิงก์ YouTube หรือพิมพ์ชื่อเพลงแล้วกด Enter..." class="flex-1 min-w-0 bg-[#F8F6F0] border-2 border-[#111111] rounded-lg px-2.5 py-1 text-xs font-semibold focus:outline-none focus:bg-white" />
            <button type="button" id="hub-bgm-go" class="btn-vox bg-[#F4D03F] hover:bg-[#f2c61d] text-[#111111] font-display font-extrabold text-xs px-3 py-1 rounded-lg cursor-pointer">เล่น</button>
          </div>
          <div id="hub-bgm-results" class="hidden flex-col gap-1 max-h-36 overflow-y-auto"></div>
        </div>
      </div>
    `;

    const thumbWrap = document.getElementById('hub-bgm-thumb-wrap');
    const dotEl = document.getElementById('hub-bgm-dot');
    const titleEl = document.getElementById('hub-bgm-title');
    const subEl = document.getElementById('hub-bgm-sub');
    const toggleBtn = document.getElementById('hub-bgm-toggle');
    const stopBtn = document.getElementById('hub-bgm-stop');
    const editBtn = document.getElementById('hub-bgm-edit-btn');
    const inputRow = document.getElementById('hub-bgm-input-row');
    const inpEl = document.getElementById('hub-bgm-input');
    const goBtn = document.getElementById('hub-bgm-go');
    const resultsEl = document.getElementById('hub-bgm-results');

    const sendCmd = (func) => {
      const iframe = ytFrameHost.querySelector('iframe');
      if (iframe?.contentWindow) {
        iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func, args: [] }), '*');
      }
    };

    const syncUi = () => {
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
        subEl.textContent = st.playing ? 'กำลังเล่นเพลงพื้นหลัง • ต่อเนื่องข้ามหน้า' : 'หยุดชั่วคราว';
        toggleBtn.innerHTML = st.playing
          ? '<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>'
          : '<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M6 4l15 8-15 8V4z"/></svg>';
      } else {
        thumbWrap.innerHTML = '<svg class="w-4 h-4 text-[#111111]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>';
        titleEl.textContent = 'ยังไม่ได้เลือกเพลงพื้นหลัง';
        subEl.textContent = 'เล่นต่อเนื่องข้ามหน้าไปยัง Stage Scoreboard ได้ทันที';
      }

      if (st.videoId && st.videoId !== loadedId) {
        loadedId = st.videoId;
        const originParam = location.protocol.startsWith('http') ? `&origin=${encodeURIComponent(location.origin)}` : '';
        ytFrameHost.innerHTML = `<iframe src="https://www.youtube.com/embed/${st.videoId}?enablejsapi=1&autoplay=${st.playing ? 1 : 0}&rel=0${originParam}" allow="autoplay; encrypted-media" referrerpolicy="strict-origin-when-cross-origin" title="Hub BGM"></iframe>`;
      } else if (!st.videoId && loadedId) {
        loadedId = '';
        ytFrameHost.innerHTML = '';
      } else if (st.videoId && st.videoId === loadedId) {
        sendCmd(st.playing ? 'playVideo' : 'pauseVideo');
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
        searchOpen = false;
        inputRow.classList.add('hidden');
        inputRow.classList.remove('flex');
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
                  inputRow.classList.add('hidden');
                  searchOpen = false;
                });
              });
              return;
            }
          }
        }
      } catch (_) {}
      resultsEl.innerHTML = `<a href="https://www.youtube.com/results?search_query=${encodeURIComponent(raw)}" target="_blank" rel="noopener noreferrer" class="btn-vox bg-white hover:bg-[#F4D03F] px-2.5 py-1 rounded-lg text-[11px] font-display font-bold flex items-center justify-between"><span>ค้นหาบน YouTube ↗</span></a>`;
    };

    editBtn.addEventListener('click', () => {
      searchOpen = !searchOpen;
      inputRow.classList.toggle('hidden', !searchOpen);
      inputRow.classList.toggle('flex', searchOpen);
      if (searchOpen) inpEl.focus();
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
