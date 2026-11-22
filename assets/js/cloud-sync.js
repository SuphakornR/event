/* HelpDai Data Persistence — Portable JSON Export/Import + Node+SQLite Backend Sync + Optional Supabase */
(() => {
  const STATE_KEY = 'vox_scoreboard_clean_v3';

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
  const SLOT_KEY = 'helpdai_event_slot_v1';
  const explicitRoom = new URLSearchParams(window.location.search).get('room') || '';
  const getSlot = () => {
    try {
      const n = Number(localStorage.getItem(SLOT_KEY) || '1');
      return (n >= 1 && n <= 3) ? n : 1;
    } catch (_) { return 1; }
  };
  const getScopedRoomId = () => {
    if (explicitRoom) return explicitRoom;
    let uid = window.HelpDaiAuth?.getSession()?.user?.id;
    if (!uid) {
      try { uid = JSON.parse(localStorage.getItem('helpdai_auth_v1') || 'null')?.user?.id; } catch (_) {}
    }
    if (!uid) return null;
    const slot = getSlot();
    return slot === 1 ? `u-${uid.slice(0, 12)}` : `u-${uid.slice(0, 12)}-s${slot}`;
  };
  let roomId = getScopedRoomId();
  let onSlotSwitchHook = null;
  const defaultApiBase = (!location.hostname.endsWith('github.io') && location.protocol.startsWith('http')) ? location.origin : '';
  const apiBase = (cfg.apiBase || defaultApiBase).replace(/\/$/, '');

  // 1. HelpDai Node + SQLite Backend Sync
  if (apiBase) {
    let backendOnline = false;
    let lastLocalRaw = localStorage.getItem(STATE_KEY) || '';
    let lastServerRaw = '';

    const checkAndStart = async () => {
      try {
        const h = await fetch(`${apiBase}/api/health`);
        if (!h.ok) return;
        backendOnline = true;
        await pullFromServer();
        setInterval(syncTick, 2500);
      } catch (_) {}
    };

    const pullFromServer = async () => {
      if (!backendOnline || !roomId) return;
      try {
        const res = await fetch(`${apiBase}/api/rooms/${encodeURIComponent(roomId)}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!data?.payload) return;
        const raw = JSON.stringify(data.payload);
        if (raw !== lastServerRaw && raw !== localStorage.getItem(STATE_KEY)) {
          lastServerRaw = raw;
          lastLocalRaw = raw;
          localStorage.setItem(STATE_KEY, raw);
          window.dispatchEvent(new StorageEvent('storage', { key: STATE_KEY, newValue: raw }));
        }
      } catch (_) {}
    };

    const pushToServer = async (raw, keepalive = false) => {
      if (!backendOnline || !roomId || !raw || raw === lastServerRaw) return;
      try {
        const parsed = JSON.parse(raw);
        if (!parsed || !Array.isArray(parsed.teams)) return;
        const res = await fetch(`${apiBase}/api/rooms/${encodeURIComponent(roomId)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ payload: parsed }),
          keepalive
        });
        if (res.ok) lastServerRaw = raw;
      } catch (_) {}
    };

    const flushOnline = () => {
      const curRaw = localStorage.getItem(STATE_KEY) || '';
      if (curRaw && curRaw !== lastServerRaw) {
        lastLocalRaw = curRaw;
        pushToServer(curRaw, true);
      }
    };
    window.addEventListener('pagehide', flushOnline);

    const syncTick = async () => {
      const curRaw = localStorage.getItem(STATE_KEY) || '';
      if (curRaw && curRaw !== lastLocalRaw) {
        lastLocalRaw = curRaw;
        await pushToServer(curRaw);
      } else {
        await pullFromServer();
      }
    };

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

    checkAndStart();
  } else if (cfg.supabaseUrl && cfg.supabaseAnonKey) {
    // 2. Fallback: Optional Supabase Cloud Sync
    const endpoint = `${cfg.supabaseUrl.replace(/\/$/, '')}/rest/v1/helpdai_rooms`;
    const headers = {
      apikey: cfg.supabaseAnonKey,
      Authorization: `Bearer ${cfg.supabaseAnonKey}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates'
    };

    let lastSyncedRaw = '';
    const pullRoom = async () => {
      if (!roomId) return;
      try {
        const res = await fetch(`${endpoint}?room_id=eq.${encodeURIComponent(roomId)}&select=payload`, { headers });
        if (!res.ok) return;
        const rows = await res.json();
        const payload = rows?.[0]?.payload;
        if (!payload) return;
        const raw = JSON.stringify(payload);
        if (raw !== lastSyncedRaw && raw !== localStorage.getItem(STATE_KEY)) {
          lastSyncedRaw = raw;
          localStorage.setItem(STATE_KEY, raw);
          window.dispatchEvent(new StorageEvent('storage', { key: STATE_KEY, newValue: raw }));
        }
      } catch (_) {}
    };

    window.addEventListener('helpdai-auth-change', () => {
      const nextRoom = getScopedRoomId();
      if (nextRoom !== roomId) {
        roomId = nextRoom;
        lastSyncedRaw = '';
        pullRoom();
      }
    });

    setInterval(pullRoom, 3000);
    pullRoom();
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
    }
  });
})();
