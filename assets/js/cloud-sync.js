/* HelpDai Data Persistence & Multi-Computer / Big-Room Screen Share Sync
   Supports:
   1. Same-Machine 2nd Monitor / Projector Popup (BroadcastChannel + localStorage, 0ms)
   2. Cross-Computer Live Room Sync via Node+SQLite (/api/rooms/:id)
   3. Cross-Computer Live Room Sync via Supabase Realtime WebSocket Broadcast + REST
   4. Portable JSON Export / Import
*/
(() => {
  const STATE_KEY = 'vox_scoreboard_clean_v3';
  const SHARE_CODE_KEY = 'helpdai_share_room_v1';
  const SLOT_KEY = 'helpdai_event_slot_v1';

  const params = new URLSearchParams(window.location.search);
  const urlRoom = (params.get('room') || '').trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
  const isDisplayViewer = params.get('display') === '1' || params.get('role') === 'display';

  function generateShareCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let out = '';
    for (let i = 0; i < 4; i++) out += chars[Math.floor(Math.random() * chars.length)];
    return out;
  }

  function getOrCreateShareCode() {
    if (urlRoom) return urlRoom;
    try {
      const saved = (localStorage.getItem(SHARE_CODE_KEY) || '').trim().toUpperCase();
      if (/^[A-Z0-9_-]{4,16}$/.test(saved)) return saved;
      const fresh = generateShareCode();
      localStorage.setItem(SHARE_CODE_KEY, fresh);
      return fresh;
    } catch (_) {
      return generateShareCode();
    }
  }

  let shareCode = getOrCreateShareCode();
  let connectedClientsCount = 0;

  function exportEventJson() {
    try {
      const raw = localStorage.getItem(STATE_KEY);
      if (!raw) return false;
      const blob = new Blob([raw], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const stamp = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `helpdai-event-${stamp}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      return true;
    } catch (_) {
      return false;
    }
  }

  function importEventJson() {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = 'application/json,.json';
    inp.addEventListener('change', () => {
      const file = inp.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const parsed = JSON.parse(String(reader.result || ''));
          if (!parsed || !Array.isArray(parsed.teams) || !Array.isArray(parsed.games)) return;
          const raw = JSON.stringify(parsed);
          localStorage.setItem(STATE_KEY, raw);
          window.dispatchEvent(new StorageEvent('storage', { key: STATE_KEY, newValue: raw }));
        } catch (_) {}
      };
      reader.readAsText(file);
    });
    inp.click();
  }

  const cfg = window.HELPDAI_CONFIG || {};
  const getSlot = () => {
    try {
      const n = Number(localStorage.getItem(SLOT_KEY) || '1');
      return (n >= 1 && n <= 3) ? n : 1;
    } catch (_) { return 1; }
  };

  const getScopedRoomId = () => {
    if (urlRoom) return `share-${urlRoom}`;
    let uid = window.HelpDaiAuth?.getSession()?.user?.id;
    if (!uid) {
      try { uid = JSON.parse(localStorage.getItem('helpdai_auth_v1') || 'null')?.user?.id; } catch (_) {}
    }
    if (uid) {
      const slot = getSlot();
      return slot === 1 ? `u-${uid.slice(0, 12)}` : `u-${uid.slice(0, 12)}-s${slot}`;
    }
    return `share-${shareCode}`;
  };

  let roomId = getScopedRoomId();
  let onSlotSwitchHook = null;
  const defaultApiBase = (!location.hostname.endsWith('github.io') && location.protocol.startsWith('http')) ? location.origin : '';
  const apiBase = (cfg.apiBase || defaultApiBase).replace(/\/$/, '');

  const applyRemoteRaw = (raw) => {
    if (!raw || raw === localStorage.getItem(STATE_KEY)) return;
    try {
      const parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.teams)) return;
      localStorage.setItem(STATE_KEY, raw);
      window.dispatchEvent(new StorageEvent('storage', { key: STATE_KEY, newValue: raw }));
    } catch (_) {}
  };

  // ==========================================================================
  // 1. SUPABASE REALTIME WEBSOCKET BROADCAST (Works across ANY computers/networks)
  // ==========================================================================
  let sbSocket = null;
  let sbJoined = false;
  let sbHeartbeatId = null;
  let sbRef = 1;

  function connectSupabaseRealtime() {
    if (!cfg.supabaseUrl || !cfg.supabaseAnonKey || typeof WebSocket === 'undefined') return;
    try {
      if (sbSocket) {
        try { sbSocket.close(); } catch (_) {}
        sbSocket = null;
      }
      if (sbHeartbeatId) {
        clearInterval(sbHeartbeatId);
        sbHeartbeatId = null;
      }
      sbJoined = false;
      const wsBase = cfg.supabaseUrl.replace(/^http/, 'ws').replace(/\/$/, '');
      const wsUrl = `${wsBase}/realtime/v1/websocket?apikey=${encodeURIComponent(cfg.supabaseAnonKey)}&vsn=1.0.0`;
      sbSocket = new WebSocket(wsUrl);
      const topic = `realtime:helpdai_screen_${shareCode}`;

      sbSocket.addEventListener('open', () => {
        const joinMsg = {
          topic,
          event: 'phx_join',
          payload: { config: { broadcast: { self: false, ack: false } } },
          ref: String(sbRef++)
        };
        sbSocket?.send(JSON.stringify(joinMsg));
        sbHeartbeatId = setInterval(() => {
          if (sbSocket?.readyState === WebSocket.OPEN) {
            sbSocket.send(JSON.stringify({ topic: 'phoenix', event: 'heartbeat', payload: {}, ref: String(sbRef++) }));
          }
        }, 25000);
      });

      sbSocket.addEventListener('message', (ev) => {
        try {
          const msg = JSON.parse(String(ev.data || ''));
          if (msg.event === 'phx_reply' && msg.topic === topic && msg.payload?.status === 'ok') {
            sbJoined = true;
            window.dispatchEvent(new CustomEvent('helpdai-screenshare-status', { detail: { connected: true, code: shareCode } }));
            if (isDisplayViewer) {
              // Ask host for current state immediately
              sendRealtimeEvent('request_state', { from: Date.now() });
            } else {
              // Host announces current state immediately
              const cur = localStorage.getItem(STATE_KEY);
              if (cur) sendRealtimeEvent('sync_state', { raw: cur });
            }
          } else if (msg.event === 'broadcast' && msg.topic === topic) {
            const inner = msg.payload;
            if (inner?.event === 'sync_state' && inner.payload?.raw) {
              applyRemoteRaw(inner.payload.raw);
            } else if (inner?.event === 'request_state' && !isDisplayViewer) {
              connectedClientsCount++;
              window.dispatchEvent(new CustomEvent('helpdai-screenshare-status', { detail: { connected: true, code: shareCode, viewers: connectedClientsCount } }));
              const cur = localStorage.getItem(STATE_KEY);
              if (cur) sendRealtimeEvent('sync_state', { raw: cur });
            }
          }
        } catch (_) {}
      });

      sbSocket.addEventListener('close', () => {
        sbJoined = false;
        setTimeout(() => {
          if (!sbSocket || sbSocket.readyState === WebSocket.CLOSED) connectSupabaseRealtime();
        }, 4000);
      });
    } catch (_) {}
  }

  function sendRealtimeEvent(eventName, payloadObj) {
    if (!sbSocket || sbSocket.readyState !== WebSocket.OPEN || !sbJoined) return;
    const topic = `realtime:helpdai_screen_${shareCode}`;
    try {
      sbSocket.send(JSON.stringify({
        topic,
        event: 'broadcast',
        payload: { type: 'broadcast', event: eventName, payload: payloadObj },
        ref: String(sbRef++)
      }));
    } catch (_) {}
  }

  connectSupabaseRealtime();

  // ==========================================================================
  // 2. NODE+SQLITE BACKEND (/api/rooms/:id) & SUPABASE REST FALLBACK
  // ==========================================================================
  let backendOnline = false;
  let lastLocalRaw = localStorage.getItem(STATE_KEY) || '';
  let lastServerRaw = '';

  const pullFromServer = async () => {
    const shareRoomKey = `share-${shareCode}`;
    if (backendOnline && apiBase) {
      try {
        const targetRoom = isDisplayViewer ? shareRoomKey : roomId;
        const res = await fetch(`${apiBase}/api/rooms/${encodeURIComponent(targetRoom)}`);
        if (res.ok) {
          const data = await res.json();
          if (data?.payload) {
            const raw = JSON.stringify(data.payload);
            if (raw !== lastServerRaw) {
              lastServerRaw = raw;
              lastLocalRaw = raw;
              applyRemoteRaw(raw);
            }
            return;
          }
        }
      } catch (_) {}
    }

    if (cfg.supabaseUrl && cfg.supabaseAnonKey) {
      try {
        const endpoint = `${cfg.supabaseUrl.replace(/\/$/, '')}/rest/v1/helpdai_rooms`;
        const headers = {
          apikey: cfg.supabaseAnonKey,
          Authorization: `Bearer ${cfg.supabaseAnonKey}`
        };
        const targetRoom = isDisplayViewer ? shareRoomKey : roomId;
        const res = await fetch(`${endpoint}?room_id=eq.${encodeURIComponent(targetRoom)}&select=payload`, { headers });
        if (res.ok) {
          const rows = await res.json();
          const payload = rows?.[0]?.payload;
          if (payload) {
            const raw = JSON.stringify(payload);
            if (raw !== lastServerRaw) {
              lastServerRaw = raw;
              lastLocalRaw = raw;
              applyRemoteRaw(raw);
            }
          }
        }
      } catch (_) {}
    }
  };

  const emitSyncState = (status) => {
    window.dispatchEvent(new CustomEvent('helpdai-sync-state', { detail: { status } }));
  };

  const pushToServer = async (raw, keepalive = false) => {
    if (!raw || isDisplayViewer) return;
    emitSyncState('syncing');
    sendRealtimeEvent('sync_state', { raw });

    let parsed = null;
    try {
      parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.teams)) return;
    } catch (_) { return; }

    const shareRoomKey = `share-${shareCode}`;
    const roomsToPush = roomId && roomId !== shareRoomKey ? [roomId, shareRoomKey] : [shareRoomKey];
    let anyOk = sbJoined;
    let hadError = false;

    if (backendOnline && apiBase) {
      for (const rId of roomsToPush) {
        try {
          const res = await fetch(`${apiBase}/api/rooms/${encodeURIComponent(rId)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ payload: parsed }),
            keepalive
          });
          if (res.ok) { lastServerRaw = raw; anyOk = true; }
          else hadError = true;
        } catch (_) { hadError = true; }
      }
    }

    if (cfg.supabaseUrl && cfg.supabaseAnonKey) {
      const endpoint = `${cfg.supabaseUrl.replace(/\/$/, '')}/rest/v1/helpdai_rooms`;
      const headers = {
        apikey: cfg.supabaseAnonKey,
        Authorization: `Bearer ${cfg.supabaseAnonKey}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates'
      };
      for (const rId of roomsToPush) {
        try {
          const res = await fetch(endpoint, {
            method: 'POST',
            headers,
            body: JSON.stringify({ room_id: rId, payload: parsed, updated_at: new Date().toISOString() }),
            keepalive
          });
          if (res.ok) { lastServerRaw = raw; anyOk = true; }
          else hadError = true;
        } catch (_) { hadError = true; }
      }
    }

    if (anyOk) emitSyncState('success');
    else if (hadError) emitSyncState('error');
    else emitSyncState('success');
  };

  const initSyncLoop = async () => {
    if (apiBase) {
      try {
        const h = await fetch(`${apiBase}/api/health`, { signal: AbortSignal.timeout(2500) });
        if (h.ok) backendOnline = true;
      } catch (_) {}
    }
    if (isDisplayViewer) {
      await pullFromServer();
    } else {
      const curRaw = localStorage.getItem(STATE_KEY) || '';
      if (curRaw) await pushToServer(curRaw);
      else await pullFromServer();
    }

    setInterval(async () => {
      if (isDisplayViewer) {
        await pullFromServer();
        return;
      }
      const curRaw = localStorage.getItem(STATE_KEY) || '';
      if (curRaw && curRaw !== lastLocalRaw) {
        lastLocalRaw = curRaw;
        await pushToServer(curRaw);
      } else {
        await pullFromServer();
      }
    }, 2000);
  };

  const shareBc = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('helpdai_screenshare_bc') : null;
  if (shareBc) {
    shareBc.addEventListener('message', (ev) => {
      const d = ev.data;
      if (!d || d.code !== shareCode) return;
      if (d.type === 'sync_state' && d.raw && isDisplayViewer) {
        applyRemoteRaw(d.raw);
      } else if (d.type === 'request_state' && !isDisplayViewer) {
        const cur = localStorage.getItem(STATE_KEY);
        if (cur) shareBc.postMessage({ type: 'sync_state', code: shareCode, raw: cur });
      }
    });
  }

  // Push immediately whenever local state changes on Host
  const origSetItem = localStorage.setItem.bind(localStorage);
  localStorage.setItem = function(key, val) {
    origSetItem(key, val);
    if (key === STATE_KEY && !isDisplayViewer && val !== lastLocalRaw) {
      lastLocalRaw = String(val);
      sendRealtimeEvent('sync_state', { raw: lastLocalRaw });
      try { shareBc?.postMessage({ type: 'sync_state', code: shareCode, raw: lastLocalRaw }); } catch (_) {}
    }
  };

  if (isDisplayViewer && shareBc) {
    setTimeout(() => {
      try { shareBc.postMessage({ type: 'request_state', code: shareCode }); } catch (_) {}
    }, 150);
  }

  window.addEventListener('pagehide', () => {
    const curRaw = localStorage.getItem(STATE_KEY) || '';
    if (curRaw && curRaw !== lastServerRaw && !isDisplayViewer) {
      pushToServer(curRaw, true);
    }
  });

  window.addEventListener('helpdai-auth-change', () => {
    const nextRoom = getScopedRoomId();
    if (nextRoom !== roomId) {
      roomId = nextRoom;
      lastServerRaw = '';
      pullFromServer();
    }
  });

  onSlotSwitchHook = () => {
    const nextRoom = getScopedRoomId();
    if (nextRoom !== roomId) {
      roomId = nextRoom;
      lastServerRaw = '';
      lastLocalRaw = '';
      try { localStorage.removeItem(STATE_KEY); } catch (_) {}
      pullFromServer();
    }
  };

  initSyncLoop();

  // ==========================================================================
  // 3. SPECTATOR / BIG-ROOM DISPLAY MODE UI (?display=1)
  // ==========================================================================
  function setupDisplayModeUI() {
    if (!isDisplayViewer) return;
    document.body.classList.add('is-bigroom-display');
    ['header-screenshare-btn', 'stage-sync-pill', 'stage-menu-btn', 'view-settings-btn'].forEach(id => {
      document.getElementById(id)?.classList.add('hidden');
    });
    document.querySelectorAll('[data-start-tutorial]').forEach(el => el.classList.add('hidden'));

    const badge = document.createElement('div');
    badge.id = 'bigroom-display-hud';
    badge.className = 'fixed bottom-3 right-3 z-[195] flex items-center gap-1.5 opacity-35 hover:opacity-100 transition-opacity';
    badge.innerHTML = `
      <span class="bg-[#111111] text-[#F4D03F] border-2 border-[#111111] px-2.5 py-1 rounded-lg font-display font-extrabold text-[11px] shadow-[2px_2px_0px_#F4D03F] flex items-center gap-1.5">
        <span class="w-2 h-2 rounded-full bg-[#10B981] animate-pulse"></span>
        <span>DISPLAY • ห้อง ${shareCode}</span>
      </span>
      <button type="button" id="bigroom-fs-btn" class="btn-vox bg-[#F4D03F] hover:bg-[#f2c61d] text-[#111111] font-display font-extrabold text-xs px-3 py-1 rounded-lg cursor-pointer">⛶ เต็มจอ</button>
    `;
    document.body.appendChild(badge);

    document.getElementById('bigroom-fs-btn')?.addEventListener('click', () => {
      const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
      if (!fsEl) {
        const req = document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen;
        if (req) Promise.resolve(req.call(document.documentElement)).catch(() => {});
      } else {
        const exit = document.exitFullscreen || document.webkitExitFullscreen;
        if (exit) Promise.resolve(exit.call(document)).catch(() => {});
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupDisplayModeUI, { once: true });
  } else {
    setupDisplayModeUI();
  }

  window.VoxCloudSync = Object.freeze({
    exportEventJson,
    importEventJson,
    getSlot,
    setSlot: (n) => {
      const next = (Number(n) >= 1 && Number(n) <= 3) ? Number(n) : 1;
      try { localStorage.setItem(SLOT_KEY, String(next)); } catch (_) {}
      if (onSlotSwitchHook) onSlotSwitchHook();
      window.dispatchEvent(new CustomEvent('helpdai-slot-change', { detail: next }));
    },
    getShareCode: () => shareCode,
    isDisplayMode: () => isDisplayViewer,
    isRealtimeConnected: () => sbJoined || backendOnline,
    getDisplayUrl: (code = shareCode) => `${location.origin}${location.pathname}?display=1&room=${encodeURIComponent(code)}`,
    regenerateShareCode: () => {
      shareCode = generateShareCode();
      try { origSetItem(SHARE_CODE_KEY, shareCode); } catch (_) {}
      roomId = getScopedRoomId();
      connectSupabaseRealtime();
      const curRaw = localStorage.getItem(STATE_KEY) || '';
      if (curRaw) pushToServer(curRaw);
      return shareCode;
    },
    joinShareRoom: (targetCode, asDisplay = true) => {
      const clean = String(targetCode || '').trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
      if (!clean) return;
      const targetUrl = `${location.origin}${location.pathname}?${asDisplay ? 'display=1&' : ''}room=${encodeURIComponent(clean)}`;
      window.location.href = targetUrl;
    },
    openSecondMonitorWindow: () => {
      const url = `${location.origin}${location.pathname}?display=1&room=${encodeURIComponent(shareCode)}`;
      const curRaw = localStorage.getItem(STATE_KEY) || '';
      if (curRaw) pushToServer(curRaw);
      window.open(url, 'HelpDaiBigRoomDisplay', 'width=1280,height=720,menubar=no,toolbar=no,location=no,status=no');
    },
    broadcastNow: () => {
      const curRaw = localStorage.getItem(STATE_KEY) || '';
      if (curRaw) pushToServer(curRaw);
    }
  });
})();
