/* Live Scoreboard tool: state, sync (BroadcastChannel + PeerJS), stage & backstage views */
    (() => {
      const STORAGE_KEY = 'vox_scoreboard_clean_v3';
      const ROOM_STORAGE_KEY = 'vox_freshy_marketing_room_code_v1';
      const CHANNEL_NAME = 'vox_event_toolkit_sync_channel';
      const GAME_COLORS = ['#F4D03F', '#E74C3C', '#2980B9', '#10B981', '#8E44AD', '#F39C12'];

      // Shared Vox geometric mascots (assets/js/mascots.js)
      const getTeamMascotSvg = (idx, color, sizeClass) => VoxMascots.svg(idx, color, sizeClass);

      const standbyMascotsEl = document.getElementById('standby-mascots');
      if (standbyMascotsEl) {
        standbyMascotsEl.innerHTML = [0, 1, 2].map(i => getTeamMascotSvg(i, GAME_COLORS[i], 'w-20 h-20')).join('');
      }

      const urlParams = new URLSearchParams(window.location.search);
      const initialRole = 'stage';
      const urlRoomParam = '';

      function generateRoomCode() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        for (let i = 0; i < 4; i++) {
          code += chars[Math.floor(Math.random() * chars.length)];
        }
        return code;
      }

      // Persistent 4-character Room Code
      function getOrCreateRoomCode() {
        return 'TOOL';
      }

      let roomCode = getOrCreateRoomCode();

      // Default Initial State (Clean Neutral Presets)
      const defaultState = {
        eventTitle: 'กระดานคะแนนกิจกรรม',
        eventSubtitle: 'แสดงคะแนน กติกา และจับเวลาสดบนเวที',
        games: [
          'Activity 1',
          'Activity 2',
          'Activity 3'
        ],
        gameMedia: [
          { description: '', youtubeUrl: '', imageData: '', activeMediaType: 'video' },
          { description: '', youtubeUrl: '', imageData: '', activeMediaType: 'video' },
          { description: '', youtubeUrl: '', imageData: '', activeMediaType: 'video' }
        ],
        teams: [
          {
            id: 'team-1',
            name: 'Team 1',
            color: '#F4D03F',
            textColor: '#111111',
            scores: [0, 0, 0]
          },
          {
            id: 'team-2',
            name: 'Team 2',
            color: '#E74C3C',
            textColor: '#FFFFFF',
            scores: [0, 0, 0]
          },
          {
            id: 'team-3',
            name: 'Team 3',
            color: '#2980B9',
            textColor: '#FFFFFF',
            scores: [0, 0, 0]
          }
        ],
        winnerAnnounced: false,
        winnerAnnouncedAt: 0,
        activeGameAccordion: null,
        isMediaZoomed: false,
        isVideoMuted: false,
        bgmTracks: [
          { label: 'เพลงที่ 1', url: '' },
          { label: 'เพลงที่ 2', url: '' },
          { label: 'เพลงที่ 3', url: '' }
        ],
        activeBgmSlot: 0,
        bgmPlaying: false,
        bgmVolume: 45,
        bgmMuted: false,
        timer: {
          durationSec: 180,
          remainingSec: 180,
          running: false,
          endAt: null,
          visible: false,
          mode: 'corner',
          timerVersion: 0
        },
        viewMode: {
          detail: 'compact',
          layout: 'row'
        },
        updatedAt: Date.now()
      };

      function cloneDefaultState() {
        return JSON.parse(JSON.stringify(defaultState));
      }

      // Normalize activeMediaType based on available YouTube & Image/GIF for a game
      function resolveActiveMediaType(mediaObj) {
        const hasYt = Boolean(extractYouTubeId(mediaObj?.youtubeUrl));
        const hasImg = Boolean((mediaObj?.imageData || '').trim());
        if (hasYt && hasImg) {
          return mediaObj.activeMediaType === 'image' ? 'image' : 'video';
        }
        if (hasYt) return 'video';
        if (hasImg) return 'image';
        return 'video';
      }

      function normalizeTimer(incT, prevTimer = null) {
        if (!incT || typeof incT !== 'object') return { ...defaultState.timer };
        const incVer = Number(incT.timerVersion) || 0;
        const prevVer = Number(prevTimer?.timerVersion) || 0;
        const rem = Math.max(0, Number(incT.remainingSec ?? incT.durationSec ?? 180));
        const incEndAt = Number(incT.endAt) || 0;
        const expired = (rem <= 0) || (incEndAt > 0 && incEndAt <= Date.now());
        const stoppedSameVer = Boolean(prevTimer && incVer === prevVer && !prevTimer.running && prevTimer.remainingSec === 0);
        const isRun = Boolean(incT.running) && !expired && !stoppedSameVer;
        let nextEndAt = null;
        if (isRun) {
          if (prevTimer && incVer === prevVer && prevTimer.endAt) {
            nextEndAt = prevTimer.endAt;
          } else {
            nextEndAt = incEndAt > Date.now() ? incEndAt : (Date.now() + rem * 1000);
          }
        }
        return {
          durationSec: Math.max(10, Number(incT.durationSec) || 180),
          remainingSec: expired ? 0 : rem,
          running: isRun,
          endAt: nextEndAt,
          visible: Boolean(incT.visible),
          mode: incT.mode === 'center' ? 'center' : 'corner',
          timerVersion: incVer
        };
      }

      const TEAM_PALETTE = [
        { color: '#F4D03F', textColor: '#111111' },
        { color: '#E74C3C', textColor: '#FFFFFF' },
        { color: '#2980B9', textColor: '#FFFFFF' },
        { color: '#10B981', textColor: '#FFFFFF' },
        { color: '#8E44AD', textColor: '#FFFFFF' },
        { color: '#F39C12', textColor: '#111111' },
        { color: '#16A085', textColor: '#FFFFFF' },
        { color: '#34495E', textColor: '#FFFFFF' }
      ];

      function normalizeState(parsed, prevTimer = null) {
        if (!parsed || !Array.isArray(parsed.teams) || parsed.teams.length < 2) {
          return cloneDefaultState();
        }
        const base = cloneDefaultState();
        base.eventTitle = parsed.eventTitle || base.eventTitle;
        base.eventSubtitle = parsed.eventSubtitle || base.eventSubtitle;
        if (Array.isArray(parsed.games) && parsed.games.length >= 1) {
          base.games = parsed.games.slice(0, 6).map((g, i) => g || `Activity ${i + 1}`);
        }
        const gCount = base.games.length;
        base.gameMedia = Array.from({ length: gCount }, (_, i) => {
          const m = Array.isArray(parsed.gameMedia) ? parsed.gameMedia[i] : null;
          return {
            description: m?.description || '',
            youtubeUrl: m?.youtubeUrl || '',
            imageData: m?.imageData || '',
            activeMediaType: m?.activeMediaType === 'image' ? 'image' : 'video'
          };
        });
        base.teams = parsed.teams.slice(0, 8).map((t, i) => {
          const pal = TEAM_PALETTE[i % TEAM_PALETTE.length];
          return {
            id: t.id || `team-${i + 1}`,
            name: t.name || `Team ${i + 1}`,
            color: t.color || pal.color,
            textColor: t.textColor || pal.textColor,
            scores: Array.from({ length: gCount }, (_, gIdx) => Number(t.scores?.[gIdx]) || 0)
          };
        });
        base.winnerAnnounced = Boolean(parsed.winnerAnnounced);
        base.winnerAnnouncedAt = Number(parsed.winnerAnnouncedAt) || 0;
        base.activeGameAccordion = (typeof parsed.activeGameAccordion === 'number' && parsed.activeGameAccordion >= 0 && parsed.activeGameAccordion < gCount)
          ? parsed.activeGameAccordion
          : null;
        base.isMediaZoomed = Boolean(parsed.isMediaZoomed) && base.activeGameAccordion !== null;
        base.isActivityFocused = Boolean(parsed.isActivityFocused) && base.activeGameAccordion !== null;
        base.isVideoMuted = Boolean(parsed.isVideoMuted);
        if (Array.isArray(parsed.bgmTracks) && parsed.bgmTracks.length === 3) {
          base.bgmTracks = parsed.bgmTracks.map((tr, i) => ({
            label: tr?.label || base.bgmTracks[i].label,
            url: tr?.url || ''
          }));
        }
        base.activeBgmSlot = (typeof parsed.activeBgmSlot === 'number' && parsed.activeBgmSlot >= 0 && parsed.activeBgmSlot <= 2)
          ? parsed.activeBgmSlot
          : 0;
        base.bgmPlaying = Boolean(parsed.bgmPlaying);
        base.bgmVolume = typeof parsed.bgmVolume === 'number'
          ? Math.max(0, Math.min(100, Math.round(parsed.bgmVolume)))
          : 45;
        base.bgmMuted = Boolean(parsed.bgmMuted);
        base.timer = normalizeTimer(parsed.timer, prevTimer);
        base.viewMode = {
          detail: ['full', 'compact', 'simple'].includes(parsed.viewMode?.detail) ? parsed.viewMode.detail : 'compact',
          layout: ['row', 'grid'].includes(parsed.viewMode?.layout) ? parsed.viewMode.layout : 'row'
        };
        return base;
      }

      const LOCAL_SAVED_KEY = 'vox_local_saved_v1';
      const isAccountSignedIn = () => {
        try { return Boolean(JSON.parse(localStorage.getItem('helpdai_auth_v1') || 'null')?.user?.id); } catch (_) { return false; }
      };
      const isLocallySaved = () => {
        try { return localStorage.getItem(LOCAL_SAVED_KEY) === '1'; } catch (_) { return false; }
      };
      let hasUnsavedGuestChanges = false;

      // Load State safely: logged-in, locally-saved, or shared display rooms restore their data
      function loadState() {
        try {
          const isSharedRoom = urlParams.get('display') === '1' || Boolean(urlParams.get('room'));
          if (!isAccountSignedIn() && !isLocallySaved() && !isSharedRoom) return cloneDefaultState();
          const raw = localStorage.getItem(STORAGE_KEY);
          if (!raw) return cloneDefaultState();
          const st = normalizeState(JSON.parse(raw), null);
          if (st.timer && !st.timer.running) {
            st.timer.visible = false;
            st.timer.mode = 'corner';
            st.timer.remainingSec = st.timer.durationSec || 180;
            st.timer.endAt = null;
          }
          st.winnerAnnounced = false;
          st.winnerAnnouncedAt = 0;
          return st;
        } catch (err) {
          console.warn('Recovering default state due to storage read error:', err);
          return cloneDefaultState();
        }
      }

      let state = loadState();
      const displayedTotals = {};
      state.teams.forEach(t => {
        displayedTotals[t.id] = getTeamTotal(t);
      });

      function getTeamTotal(team) {
        return team.scores.reduce((sum, val) => sum + (Number(val) || 0), 0);
      }

      function escapeHtml(str) {
        return String(str || '')
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');
      }

      // ========================================================================
      // REAL-TIME SYNC ENGINE (LOCALSTORAGE + BROADCASTCHANNEL + PEERJS WEBRTC)
      // ========================================================================
      const bc = ('BroadcastChannel' in window) ? new BroadcastChannel(CHANNEL_NAME) : null;
      let currentRole = initialRole;
      let peerInstance = null;
      const stageConnections = new Set();
      let adminConnection = null;

      function pulseAdminSyncFeedback() {
        const dotEl = document.getElementById('admin-conn-dot');
        if (dotEl) {
          dotEl.classList.remove('vox-sync-pulse');
          void dotEl.offsetWidth;
          dotEl.classList.add('vox-sync-pulse');
        }
        try { if (navigator.vibrate) navigator.vibrate(10); } catch (_) {}
      }

      function broadcastPayload(payload) {
        if (bc) {
          try { bc.postMessage(payload); } catch (_) {}
        }
        if (currentRole === 'stage') {
          stageConnections.forEach(conn => {
            if (conn && conn.open) {
              try { conn.send(payload); } catch (_) {}
            }
          });
        } else if (currentRole === 'admin' || currentRole === 'play') {
          if (adminConnection && adminConnection.open) {
            try { adminConnection.send(payload); } catch (_) {}
          }
          if (currentRole === 'admin') pulseAdminSyncFeedback();
        }
      }

      function persistStateToStorage() {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        } catch (err) {
          console.warn('LocalStorage write warning:', err);
        }
      }

      const SYNC_SVGS = {
        arrows: '<path d="M21 12a9 9 0 0 0-15.5-6.36L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 15.5 6.36L21 16"/><path d="M16 16h5v5"/>',
        success: '<circle cx="12" cy="12" r="9"/><path d="M8.5 12.5l2.5 2.5 4.5-5"/>',
        fail: '<path d="M12 3L2 20h20L12 3z"/><path d="M12 9v4"/><circle cx="12" cy="16.5" r="0.8" fill="currentColor"/>'
      };
      let lastRemoteSyncStatus = 'idle';

      function applySyncIconState(status) {
        lastRemoteSyncStatus = status;
        const iconEl = document.getElementById('stage-autosync-icon');
        if (!iconEl) return;
        const signedIn = isAccountSignedIn();
        const savedLocal = isLocallySaved();
        if (status === 'syncing') {
          iconEl.innerHTML = SYNC_SVGS.arrows;
          iconEl.setAttribute('class', 'vox-autosync-spin is-syncing w-3.5 h-3.5 shrink-0 text-[#2980B9]');
        } else if (status === 'error') {
          iconEl.innerHTML = SYNC_SVGS.fail;
          iconEl.setAttribute('class', 'vox-autosync-spin w-3.5 h-3.5 shrink-0 text-[#E74C3C]');
        } else if (status === 'success') {
          iconEl.innerHTML = SYNC_SVGS.success;
          iconEl.setAttribute('class', 'vox-autosync-spin w-3.5 h-3.5 shrink-0 text-[#10B981]');
        } else {
          iconEl.innerHTML = SYNC_SVGS.arrows;
          const colorCls = signedIn ? 'text-[#10B981]' : (savedLocal ? 'text-[#2980B9]' : (hasUnsavedGuestChanges ? 'text-[#E74C3C]' : 'text-[#111111]/65'));
          iconEl.setAttribute('class', `vox-autosync-spin w-3.5 h-3.5 shrink-0 ${colorCls}`);
        }
      }

      window.addEventListener('helpdai-sync-state', (e) => {
        const st = e.detail?.status || 'idle';
        applySyncIconState(st);
      });

      function syncStageSyncPill() {
        const labelEl = document.getElementById('stage-sync-label');
        const btnEl = document.getElementById('stage-menu-btn');
        if (!labelEl) return;
        const signedIn = isAccountSignedIn();
        const savedLocal = isLocallySaved();
        if (signedIn) {
          const slot = window.VoxCloudSync?.getSlot?.() || 1;
          labelEl.textContent = `ซิงค์ ${slot}`;
          if (btnEl) btnEl.title = 'เมนูงาน • ซิงค์บัญชีอัตโนมัติ';
        } else if (savedLocal) {
          labelEl.textContent = 'ในเครื่อง';
          if (btnEl) btnEl.title = 'เมนูงาน • บันทึกในเครื่องอัตโนมัติ';
        } else {
          labelEl.textContent = hasUnsavedGuestChanges ? 'ยังไม่เซฟ' : 'Guest';
          if (btnEl) btnEl.title = 'เมนูงาน • โหมดทดลองใช้ (คลิกเพื่อบันทึกหรือเข้าสู่ระบบ)';
        }
        applySyncIconState(lastRemoteSyncStatus);
      }

      (() => {
        const menuBtn = document.getElementById('stage-menu-btn');
        const popEl = document.getElementById('stage-menu-popover');
        if (!menuBtn || !popEl) return;

        const MENU_ICONS = {
          save: '<svg class="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8"/><path d="M7 3v5h8"/></svg>',
          plus: '<svg class="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
          quiz: '<svg class="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/></svg>',
          sport: '<svg class="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4a2 2 0 0 1-2-2V5h4M18 9h2a2 2 0 0 0 2-2V5h-4M6 4h12v6a6 6 0 0 1-12 0V4zM12 16v4M8 20h8"/></svg>',
          group: '<svg class="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/><rect x="13" y="13" width="8" height="8" rx="1.5"/></svg>',
          user: '<svg class="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>'
        };

        const closeStageMenu = () => {
          popEl.classList.add('hidden');
          popEl.classList.remove('flex');
          menuBtn.setAttribute('aria-expanded', 'false');
        };

        const renderStageMenu = () => {
          const signedIn = isAccountSignedIn();
          const curSlot = window.VoxCloudSync?.getSlot?.() || 1;
          const userEmail = window.HelpDaiAuth?.getSession?.()?.user?.email || '';
          const syncText = lastRemoteSyncStatus === 'error'
            ? 'ซิงค์ไม่สำเร็จ (ตรวจสอบเน็ต)'
            : signedIn
              ? `ซิงค์บัญชีอัตโนมัติ (งาน ${curSlot})`
              : (isLocallySaved() ? 'บันทึกในเบราว์เซอร์อัตโนมัติ' : 'Guest Mode (ยังไม่บันทึก)');
          const statusSvg = lastRemoteSyncStatus === 'error'
            ? SYNC_SVGS.fail
            : (lastRemoteSyncStatus === 'success' ? SYNC_SVGS.success : SYNC_SVGS.arrows);
          const statusColor = lastRemoteSyncStatus === 'error'
            ? 'text-[#E74C3C]'
            : (signedIn || lastRemoteSyncStatus === 'success' ? 'text-[#10B981]' : 'text-[#2980B9]');

          popEl.innerHTML = `
            <div class="flex items-center justify-between gap-2 bg-white border-2 border-[#111111] rounded-xl px-2.5 py-2 shadow-[2px_2px_0px_#111111]">
              <div class="flex items-center gap-2 min-w-0">
                <svg class="w-4 h-4 shrink-0 ${statusColor} ${lastRemoteSyncStatus === 'syncing' ? 'vox-autosync-spin is-syncing' : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">${statusSvg}</svg>
                <div class="min-w-0">
                  <div class="font-display font-extrabold text-[11px] text-[#111111] truncate">${syncText}</div>
                  ${userEmail ? `<div class="text-[9px] font-semibold text-[#111111]/60 truncate">${userEmail}</div>` : ''}
                </div>
              </div>
            </div>

            ${signedIn ? `
              <div class="grid grid-cols-3 gap-1">
                ${[1, 2, 3].map(n => `<button type="button" data-sm-slot="${n}" class="btn-vox py-1 rounded-lg font-display font-extrabold text-[10px] cursor-pointer ${curSlot === n ? 'bg-[#111111] text-[#F4D03F]' : 'bg-white text-[#111111] hover:bg-[#F4D03F]'}">งาน ${n}</button>`).join('')}
              </div>
            ` : ''}

            <div class="flex flex-col gap-1 pt-1 border-t border-[#111111]/15">
              <span class="text-[9px] font-display font-extrabold uppercase tracking-wider text-[#111111]/55 px-1">ไฟล์งาน (File)</span>
              <button type="button" data-sm-act="save" class="w-full text-left px-2.5 py-1.5 rounded-lg bg-white hover:bg-[#F4D03F] border border-[#111111] font-display font-bold text-xs text-[#111111] cursor-pointer flex items-center gap-2">${MENU_ICONS.save}<span>บันทึกงาน (Save)</span></button>
              <button type="button" data-sm-act="new" class="w-full text-left px-2.5 py-1.5 rounded-lg bg-white hover:bg-[#F4D03F] border border-[#111111] font-display font-bold text-xs text-[#111111] cursor-pointer flex items-center gap-2">${MENU_ICONS.plus}<span>สร้างงานใหม่ (New)</span></button>
            </div>

            <div class="flex flex-col gap-1 pt-1 border-t border-[#111111]/15">
              <span class="text-[9px] font-display font-extrabold uppercase tracking-wider text-[#111111]/55 px-1">เทมเพลตเริ่มไว (Presets)</span>
              <div class="grid grid-cols-3 gap-1">
                <button type="button" data-sm-preset="quiz" class="px-1.5 py-1.5 rounded-lg bg-white hover:bg-[#F4D03F] border border-[#111111] font-display font-bold text-[10px] text-[#111111] cursor-pointer flex items-center justify-center gap-1">${MENU_ICONS.quiz}<span>Quiz</span></button>
                <button type="button" data-sm-preset="sport" class="px-1.5 py-1.5 rounded-lg bg-white hover:bg-[#F4D03F] border border-[#111111] font-display font-bold text-[10px] text-[#111111] cursor-pointer flex items-center justify-center gap-1">${MENU_ICONS.sport}<span>Sport</span></button>
                <button type="button" data-sm-preset="workshop" class="px-1.5 py-1.5 rounded-lg bg-white hover:bg-[#F4D03F] border border-[#111111] font-display font-bold text-[10px] text-[#111111] cursor-pointer flex items-center justify-center gap-1">${MENU_ICONS.group}<span>Group</span></button>
              </div>
            </div>

            <div class="pt-1 border-t border-[#111111]/15">
              ${signedIn
                ? `<button type="button" data-sm-act="logout" class="w-full px-2.5 py-1.5 rounded-lg bg-white hover:bg-red-50 border border-[#111111] font-display font-bold text-xs text-[#E74C3C] cursor-pointer">ออกจากระบบ</button>`
                : `<button type="button" data-sm-act="login" class="w-full btn-vox bg-[#F4D03F] hover:bg-[#f2c61d] py-1.5 rounded-xl font-display font-extrabold text-xs text-[#111111] cursor-pointer flex items-center justify-center gap-1.5">${MENU_ICONS.user}<span>เข้าสู่ระบบเพื่อซิงค์ข้ามเครื่อง</span></button>`
              }
            </div>
          `;

          popEl.querySelectorAll('[data-sm-slot]').forEach(b => {
            b.addEventListener('click', () => {
              window.VoxCloudSync?.setSlot?.(Number(b.dataset.smSlot));
              closeStageMenu();
            });
          });
          popEl.querySelectorAll('[data-sm-preset]').forEach(b => {
            b.addEventListener('click', () => {
              const kind = b.dataset.smPreset;
              const presets = {
                quiz: { title: 'Quiz & Trivia Battle', sub: 'ตอบไวได้คะแนน!', games: ['รอบที่ 1: ความรู้ทั่วไป', 'รอบที่ 2: ทายภาพ', 'รอบชิงชนะเลิศ'] },
                sport: { title: 'Sport Day Arena', sub: 'ตารางคะแนนกีฬาสี', games: ['วิ่งผลัด', 'ชักเย่อ', 'แชร์บอล'] },
                workshop: { title: 'Team Workshop', sub: 'คะแนนกิจกรรมกลุ่ม', games: ['Ice Breaking', 'ระดมสมอง', 'นำเสนอผลงาน'] }
              };
              const p = presets[kind];
              if (p) {
                state.eventTitle = p.title;
                state.eventSubtitle = p.sub;
                state.games = p.games;
                state.gameMedia = p.games.map(() => ({ description: '', youtubeUrl: '', imageData: '', activeMediaType: 'video' }));
                state.teams.forEach(t => { t.scores = p.games.map(() => 0); });
                saveAndBroadcast();
                syncHeaderTexts();
                renderLeaderboard(true);
                renderDrawerControls();
              }
              closeStageMenu();
            });
          });
          popEl.querySelector('[data-sm-act="save"]')?.addEventListener('click', () => {
            try { localStorage.setItem(LOCAL_SAVED_KEY, '1'); } catch (_) {}
            saveAndBroadcast();
            showVoxAlert('✓ บันทึกงานเรียบร้อยแล้ว', 'success');
            closeStageMenu();
          });
          popEl.querySelector('[data-sm-act="new"]')?.addEventListener('click', () => {
            state = cloneDefaultState();
            saveAndBroadcast();
            syncHeaderTexts();
            renderLeaderboard(true);
            renderDrawerControls();
            closeStageMenu();
          });
          popEl.querySelector('[data-sm-act="login"]')?.addEventListener('click', () => {
            closeStageMenu();
            window.HelpDaiAuth?.openLogin?.();
          });
          popEl.querySelector('[data-sm-act="logout"]')?.addEventListener('click', () => {
            closeStageMenu();
            window.HelpDaiAuth?.signOut?.();
          });
        };

        menuBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const isHidden = popEl.classList.contains('hidden');
          if (isHidden) {
            renderStageMenu();
            popEl.classList.remove('hidden');
            popEl.classList.add('flex');
            menuBtn.setAttribute('aria-expanded', 'true');
          } else {
            closeStageMenu();
          }
        });
        document.addEventListener('click', (e) => {
          if (!popEl.contains(e.target) && e.target !== menuBtn && !menuBtn.contains(e.target)) closeStageMenu();
        });
        window.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeStageMenu(); });
      })();

      function saveAndBroadcast(options = { broadcast: true }) {
        state.updatedAt = Date.now();
        persistStateToStorage();
        if (isAccountSignedIn() || isLocallySaved()) {
          hasUnsavedGuestChanges = false;
        } else {
          hasUnsavedGuestChanges = true;
        }
        syncStageSyncPill();

        if (options.broadcast) {
          broadcastPayload({ type: 'SYNC_STATE', state });
        }
      }

      window.addEventListener('helpdai-auth-change', () => {
        if (isAccountSignedIn()) {
          hasUnsavedGuestChanges = false;
          persistStateToStorage();
        }
        syncStageSyncPill();
      });

      window.addEventListener('helpdai-slot-change', () => {
        state = cloneDefaultState();
        switchRoleView(currentRole);
        syncStageSyncPill();
      });

      // Authoritative Stage Reducer for Concurrent Multi-User Score Actions
      function applyAtomicAction(msg) {
        if (!msg || typeof msg.op !== 'string') return;
        const team = state.teams.find(t => t.id === msg.teamId);
        if (msg.op === 'ADJUST_SCORE' && team) {
          const gIdx = Number(msg.gameIdx);
          if (gIdx >= 0 && gIdx <= 2) {
            team.scores[gIdx] = Math.max(0, (Number(team.scores[gIdx]) || 0) + (Number(msg.delta) || 0));
          }
        } else if (msg.op === 'SET_SCORE' && team) {
          const gIdx = Number(msg.gameIdx);
          if (gIdx >= 0 && gIdx <= 2) {
            team.scores[gIdx] = Math.max(0, Number(msg.value) || 0);
          }
        }
        saveAndBroadcast();
        if (currentRole === 'stage') {
          renderLeaderboard(true);
          renderDrawerControls();
        }
      }

      function applyIncomingState(incomingState, triggerConfettiIfNewWinner = true) {
        if (!incomingState || !Array.isArray(incomingState.teams)) return;
        const wasWinner = state.winnerAnnounced;
        const prevAccordion = state.activeGameAccordion;
        const prevZoom = state.isMediaZoomed;
        const prevMediaJson = JSON.stringify(state.gameMedia);

        state = normalizeState(incomingState, state.timer);

        if (state.activeGameAccordion === null) {
          state.isMediaZoomed = false;
        }

        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        } catch (_) {}

        if (currentRole === 'stage') {
          syncHeaderTexts();
          renderLeaderboard(true);
          renderDrawerControls();
          syncStageBgmPlayer();
          renderTimerUI();

          const nextMediaJson = JSON.stringify(state.gameMedia);
          if (state.activeGameAccordion !== prevAccordion) {
            syncAccordionFromState();
          } else if (state.activeGameAccordion !== null && nextMediaJson !== prevMediaJson) {
            renderMediaStageContent(state.activeGameAccordion, true);
          }

          if (state.isMediaZoomed !== prevZoom) {
            syncTheaterZoomState();
          }

          const isFreshRemoteWinner = Boolean(state.winnerAnnouncedAt) && (Date.now() - state.winnerAnnouncedAt < 15000);
          if (triggerConfettiIfNewWinner && !wasWinner && state.winnerAnnounced && isFreshRemoteWinner) {
            triggerVictorySequence();
          } else if (wasWinner && !state.winnerAnnounced) {
            hideVictorySpotlight();
          }
        } else {
          renderAdminUI();
        }
      }

      if (bc) {
        bc.onmessage = (event) => {
          if (event.data?.type === 'SYNC_STATE' && event.data.state) {
            applyIncomingState(event.data.state, true);
          } else if (event.data?.type === 'ACTION' && currentRole === 'stage') {
            applyAtomicAction(event.data);
          } else if (event.data?.type === 'VIDEO_COMMAND' && currentRole === 'stage') {
            handleStageVideoCommand(event.data.action, event.data.gameIdx);
          } else if (event.data?.type === 'BGM_COMMAND' && currentRole === 'stage') {
            handleStageBgmCommand(event.data);
          }
        };
      }

      const pageLoadedAt = Date.now();
      window.addEventListener('storage', (e) => {
        if (e.key === STORAGE_KEY && e.newValue) {
          try {
            const parsed = JSON.parse(e.newValue);
            const isInitialCloudHydrate = !e.isTrusted && (Date.now() - pageLoadedAt < 3500);
            applyIncomingState(parsed, !isInitialCloudHydrate);
          } catch (_) {}
        }
      });

      function buildAdminUrl(code) {
        const url = new URL(window.location.href);
        url.searchParams.set('role', 'admin');
        url.searchParams.set('room', code);
        return url.toString();
      }

      function updateDrawerPairingUI() {
        const badgeEl = document.getElementById('drawer-room-code-badge');
        const qrImgEl = document.getElementById('drawer-qr-img');
        if (badgeEl) badgeEl.textContent = `ห้อง: ${roomCode}`;
        if (qrImgEl) {
          qrImgEl.style.display = '';
          if (qrImgEl.nextElementSibling) qrImgEl.nextElementSibling.classList.add('hidden');
          const adminUrl = buildAdminUrl(roomCode);
          qrImgEl.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=6&data=${encodeURIComponent(adminUrl)}`;
        }
      }

      function initStagePeerHost() {
        if (typeof Peer === 'undefined') return;
        if (peerInstance) {
          try { peerInstance.destroy(); } catch (_) {}
        }

        const hostPeerId = `vox-sb-${roomCode.toLowerCase()}`;
        const statusEl = document.getElementById('drawer-peer-status');

        try {
          peerInstance = new Peer(hostPeerId);

          peerInstance.on('open', () => {
            if (statusEl) {
              statusEl.textContent = stageConnections.size > 0
                ? `เชื่อมต่อมือถือแล้ว (${stageConnections.size} เครื่อง)`
                : 'พร้อมรับการเชื่อมต่อจากมือถือ';
              statusEl.className = 'text-xs font-bold text-emerald-700 mt-1';
            }
          });

          peerInstance.on('connection', (conn) => {
            stageConnections.add(conn);
            if (statusEl) {
              statusEl.textContent = `เชื่อมต่อมือถือแล้ว (${stageConnections.size} เครื่อง)`;
              statusEl.className = 'text-xs font-bold text-emerald-700 mt-1';
            }

            conn.on('open', () => {
              conn.send({ type: 'SYNC_STATE', state });
            });

            conn.on('data', (msg) => {
              if (msg?.type === 'SYNC_STATE' && msg.state) {
                applyIncomingState(msg.state, true);
                stageConnections.forEach(other => {
                  if (other !== conn && other.open) {
                    try { other.send({ type: 'SYNC_STATE', state }); } catch (_) {}
                  }
                });
              } else if (msg?.type === 'ACTION') {
                applyAtomicAction(msg);
              } else if (msg?.type === 'VIDEO_COMMAND') {
                handleStageVideoCommand(msg.action, msg.gameIdx);
              } else if (msg?.type === 'BGM_COMMAND') {
                handleStageBgmCommand(msg);
              } else if (msg?.type === 'REQUEST_STATE') {
                if (conn.open) conn.send({ type: 'SYNC_STATE', state });
              }
            });

            conn.on('close', () => {
              stageConnections.delete(conn);
              if (statusEl) {
                statusEl.textContent = stageConnections.size > 0
                  ? `เชื่อมต่อมือถือแล้ว (${stageConnections.size} เครื่อง)`
                  : 'พร้อมรับการเชื่อมต่อจากมือถือ';
              }
            });
          });

          peerInstance.on('error', () => {
            if (statusEl) {
              statusEl.textContent = 'พร้อมใช้งานบนเครื่อง (โหมดออฟไลน์)';
              statusEl.className = 'text-xs font-bold text-amber-700 mt-1';
            }
          });
        } catch (err) {
          console.warn('PeerJS host init skipped:', err);
        }
      }

      function connectAdminToRoom(targetCode) {
        const cleanCode = (targetCode || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
        if (!cleanCode) return;
        roomCode = cleanCode;
        try { localStorage.setItem(ROOM_STORAGE_KEY, roomCode); } catch (_) {}

        const dotEl = document.getElementById('admin-conn-dot');
        const textEl = document.getElementById('admin-conn-text');
        if (dotEl) dotEl.className = 'w-3.5 h-3.5 rounded-sm bg-[#F4D03F] border border-white shrink-0 animate-pulse';
        if (textEl) textEl.textContent = `กำลังเชื่อมต่อห้อง ${roomCode}...`;

        if (typeof Peer === 'undefined') {
          if (textEl) textEl.textContent = 'เชื่อมต่อผ่านเบราว์เซอร์เดียวกัน (Offline)';
          return;
        }

        if (adminConnection) {
          try { adminConnection.close(); } catch (_) {}
          adminConnection = null;
        }

        try {
          if (peerInstance && !peerInstance.destroyed && peerInstance.id && peerInstance.id.startsWith('vox-sb-')) {
            try { peerInstance.destroy(); } catch (_) {}
            peerInstance = null;
          }
          if (!peerInstance || peerInstance.destroyed) {
            peerInstance = new Peer();
            peerInstance.on('error', () => {
              const d = document.getElementById('admin-conn-dot');
              const t = document.getElementById('admin-conn-text');
              if (d) d.className = 'w-3.5 h-3.5 rounded-sm bg-[#E74C3C] border border-white shrink-0';
              if (t) t.textContent = `ไม่พบห้อง ${roomCode} กรุณาตรวจสอบรหัสบนจอหลัก`;
            });
          }

          const startConnect = () => {
            const hostPeerId = `vox-sb-${roomCode.toLowerCase()}`;
            const conn = peerInstance.connect(hostPeerId, { reliable: true });
            adminConnection = conn;

            conn.on('open', () => {
              if (dotEl) dotEl.className = 'w-3.5 h-3.5 rounded-sm bg-[#2980B9] border border-white shrink-0';
              if (textEl) textEl.textContent = `เชื่อมต่อแล้ว (${roomCode})`;
              const roomBar = document.getElementById('admin-room-bar');
              if (roomBar) roomBar.classList.remove('is-open');
              conn.send({ type: 'REQUEST_STATE' });
            });

            conn.on('data', (msg) => {
              if (msg?.type === 'SYNC_STATE' && msg.state) {
                applyIncomingState(msg.state, false);
              }
            });

            conn.on('close', () => {
              if (dotEl) dotEl.className = 'w-3.5 h-3.5 rounded-sm bg-[#E74C3C] border border-white shrink-0';
              if (textEl) textEl.textContent = `หลุดการเชื่อมต่อจากห้อง ${roomCode} — กดเชื่อมต่อใหม่`;
            });

            conn.on('error', () => {
              if (dotEl) dotEl.className = 'w-3.5 h-3.5 rounded-sm bg-[#E74C3C] border border-white shrink-0';
              if (textEl) textEl.textContent = `ไม่พบจอหลักรหัส ${roomCode} (ตรวจสอบรหัสบนหน้าจอหลัก)`;
            });
          };

          if (peerInstance.open) {
            startConnect();
          } else {
            peerInstance.once('open', startConnect);
          }
        } catch (err) {
          if (textEl) textEl.textContent = 'เชื่อมต่อผ่านเบราว์เซอร์เดียวกัน (Offline)';
        }
      }

      // ========================================================================
      // YOUTUBE URL PARSER, EMBED API & IMAGE/GIF PROCESSOR
      // ========================================================================
      function extractYouTubeId(url) {
        if (!url || typeof url !== 'string') return null;
        const trimmed = url.trim();
        if (!trimmed) return null;
        if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;

        const patterns = [
          /(?:youtube\.com\/watch\?v=|youtube\.com\/watch\?.+&v=)([a-zA-Z0-9_-]{11})/,
          /youtu\.be\/([a-zA-Z0-9_-]{11})/,
          /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
          /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
          /youtube\.com\/live\/([a-zA-Z0-9_-]{11})/
        ];

        for (const regex of patterns) {
          const match = trimmed.match(regex);
          if (match && match[1]) return match[1];
        }
        return null;
      }

      function buildYouTubeEmbedUrl(videoId) {
        const originParam = (window.location.origin && window.location.origin !== 'null')
          ? `&origin=${encodeURIComponent(window.location.origin)}`
          : '';
        return `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&enablejsapi=1${originParam}`;
      }

      let pendingVideoCommand = null;
      let ytIframeReady = false;

      function postYtCmd(iframe, func, args = []) {
        if (!iframe || !iframe.contentWindow) return false;
        iframe.contentWindow.postMessage(
          JSON.stringify({ event: 'command', func, args }),
          '*'
        );
        return true;
      }

      function executeYtAction(iframe, action) {
        if (!iframe) return;
        if (state.isVideoMuted && action !== 'unmute') {
          postYtCmd(iframe, 'mute');
        }
        switch (action) {
          case 'play':
            postYtCmd(iframe, 'playVideo');
            break;
          case 'pause':
            postYtCmd(iframe, 'pauseVideo');
            break;
          case 'restart':
            postYtCmd(iframe, 'seekTo', [0, true]);
            postYtCmd(iframe, 'playVideo');
            break;
          case 'mute':
            postYtCmd(iframe, 'mute');
            break;
          case 'unmute':
            postYtCmd(iframe, 'unMute');
            break;
        }
      }

      function handleStageVideoCommand(action, gameIdx) {
        if (typeof gameIdx === 'number' && state.activeGameAccordion !== gameIdx) {
          return;
        }
        const iframe = document.getElementById('stage-youtube-iframe');
        if (!iframe || !ytIframeReady) {
          pendingVideoCommand = { action, gameIdx };
          return;
        }
        executeYtAction(iframe, action);
      }

      // ========================================================================
      // BACKGROUND MUSIC (BGM) STAGE PLAYER ENGINE (YOUTUBE OR AUDIO URL)
      // ========================================================================
      let currentBgmYtId = '';
      let currentBgmAudioSrc = '';
      let bgmYtReady = false;

      function applyStageBgmYtControls(iframe) {
        if (!iframe) return;
        const vol = Math.max(0, Math.min(100, Number(state.bgmVolume) || 0));
        postYtCmd(iframe, 'setVolume', [vol]);
        postYtCmd(iframe, state.bgmMuted ? 'mute' : 'unMute');
        postYtCmd(iframe, state.bgmPlaying ? 'playVideo' : 'pauseVideo');
      }

      function syncStageBgmPlayer() {
        if (currentRole !== 'stage') return;
        const audioEl = document.getElementById('stage-bgm-audio');
        const ytWrapEl = document.getElementById('stage-bgm-yt-wrap');
        if (!audioEl || !ytWrapEl) return;

        const activeTrack = state.bgmTracks[state.activeBgmSlot] || { url: '' };
        const rawUrl = (activeTrack.url || '').trim();
        const ytId = extractYouTubeId(rawUrl);

        if (ytId) {
          // Stop direct audio if active
          if (currentBgmAudioSrc) {
            audioEl.pause();
            audioEl.removeAttribute('src');
            currentBgmAudioSrc = '';
          }

          if (currentBgmYtId !== ytId) {
            currentBgmYtId = ytId;
            bgmYtReady = false;
            const originParam = (window.location.origin && window.location.origin !== 'null')
              ? `&origin=${encodeURIComponent(window.location.origin)}`
              : '';
            const embedUrl = `https://www.youtube.com/embed/${ytId}?rel=0&modestbranding=1&enablejsapi=1&loop=1&playlist=${ytId}${originParam}`;
            ytWrapEl.innerHTML = `<iframe id="stage-bgm-yt" src="${embedUrl}" allow="autoplay; encrypted-media" class="w-px h-px border-0"></iframe>`;
            const ytIframe = document.getElementById('stage-bgm-yt');
            if (ytIframe) {
              ytIframe.addEventListener('load', () => {
                setTimeout(() => {
                  bgmYtReady = true;
                  applyStageBgmYtControls(ytIframe);
                }, 450);
              });
            }
          } else if (bgmYtReady) {
            applyStageBgmYtControls(document.getElementById('stage-bgm-yt'));
          }
        } else if (rawUrl) {
          // Stop YouTube BGM if active
          if (currentBgmYtId) {
            ytWrapEl.innerHTML = '';
            currentBgmYtId = '';
            bgmYtReady = false;
          }

          if (currentBgmAudioSrc !== rawUrl) {
            currentBgmAudioSrc = rawUrl;
            audioEl.src = rawUrl;
          }
          audioEl.volume = Math.max(0, Math.min(1, (Number(state.bgmVolume) || 0) / 100));
          audioEl.muted = Boolean(state.bgmMuted);
          if (state.bgmPlaying) {
            audioEl.play().catch(() => {});
          } else {
            audioEl.pause();
          }
        } else {
          // Empty slot: stop both
          if (currentBgmYtId) {
            ytWrapEl.innerHTML = '';
            currentBgmYtId = '';
            bgmYtReady = false;
          }
          if (currentBgmAudioSrc) {
            audioEl.pause();
            audioEl.removeAttribute('src');
            currentBgmAudioSrc = '';
          }
        }
      }

      function handleStageBgmCommand(cmd) {
        if (!cmd) return;
        if (typeof cmd.activeBgmSlot === 'number') state.activeBgmSlot = cmd.activeBgmSlot;
        if (typeof cmd.bgmPlaying === 'boolean') state.bgmPlaying = cmd.bgmPlaying;
        if (typeof cmd.bgmVolume === 'number') state.bgmVolume = cmd.bgmVolume;
        if (typeof cmd.bgmMuted === 'boolean') state.bgmMuted = cmd.bgmMuted;
        syncStageBgmPlayer();
      }

      // ========================================================================
      // GAME COUNTDOWN TIMER ENGINE (SYNCED VIA endAt + WEB AUDIO CHIME)
      // ========================================================================
      let timerChimePlayed = false;

      function formatTimeMMSS(totalSec) {
        const s = Math.max(0, Math.floor(totalSec));
        const mins = Math.floor(s / 60);
        const secs = s % 60;
        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
      }

      function getLiveRemainingSec() {
        const t = state.timer || defaultState.timer;
        if (t.running && t.endAt) {
          return Math.max(0, Math.ceil((t.endAt - Date.now()) / 1000));
        }
        return Math.max(0, Math.floor(t.remainingSec ?? t.durationSec ?? 180));
      }

      let lastTickSec = -1;

      function showVoxAlert(message, type = 'info', options = null) {
        try {
          let stack = document.getElementById('vox-toast-stack');
          if (!stack) {
            stack = document.createElement('div');
            stack.id = 'vox-toast-stack';
            stack.className = 'fixed top-4 left-1/2 -translate-x-1/2 z-[180] flex flex-col items-center gap-2 pointer-events-none';
            document.body.appendChild(stack);
          }
          const bg = type === 'alarm' ? 'bg-[#E74C3C] text-white' : type === 'success' ? 'bg-[#F4D03F] text-[#111111]' : 'bg-[#111111] text-[#F4D03F]';
          const toast = document.createElement('div');
          toast.className = `vox-panel-enter pointer-events-auto ${bg} border-[2.5px] border-[#111111] rounded-xl px-4 py-2 shadow-[4px_4px_0px_#111111] font-display font-extrabold text-xs sm:text-sm flex items-center gap-2.5`;
          const msgSpan = document.createElement('span');
          msgSpan.textContent = message;
          toast.appendChild(msgSpan);

          if (options?.actionLabel && typeof options.onAction === 'function') {
            const actionBtn = document.createElement('button');
            actionBtn.type = 'button';
            actionBtn.className = 'px-2.5 py-0.5 rounded-lg border-2 border-[#111111] bg-white hover:bg-[#F4D03F] text-[#111111] font-display font-black text-xs cursor-pointer transition-colors';
            actionBtn.textContent = options.actionLabel;
            actionBtn.addEventListener('click', () => {
              options.onAction();
              toast.remove();
            }, { once: true });
            toast.appendChild(actionBtn);
          }

          stack.appendChild(toast);
          const duration = Number(options?.duration) || 2800;
          setTimeout(() => {
            if (!toast.isConnected) return;
            toast.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(-6px)';
            setTimeout(() => toast.remove(), 260);
          }, duration);
        } catch (_) {}
      }

      const timerTickAudio = typeof Audio !== 'undefined' ? new Audio('assets/audio/timer-tick.mp3') : null;
      const timerTimesUpAudio = typeof Audio !== 'undefined' ? new Audio('assets/audio/timer-timesup.mp3') : null;
      if (timerTickAudio) timerTickAudio.preload = 'auto';
      if (timerTimesUpAudio) timerTimesUpAudio.preload = 'auto';

      function stopTimerTickAudio() {
        try {
          if (timerTickAudio && !timerTickAudio.paused) {
            timerTickAudio.pause();
            timerTickAudio.currentTime = 0;
          }
        } catch (_) {}
      }

      function syncTimerTickAudio(sec, running) {
        if (!running || sec <= 0 || sec > 5) {
          stopTimerTickAudio();
          return;
        }
        if (timerTickAudio) {
          try {
            if (timerTickAudio.paused) {
              timerTickAudio.currentTime = Math.max(0, Math.min(4.8, 5 - sec));
              timerTickAudio.volume = 1;
              const p = timerTickAudio.play();
              if (p && typeof p.catch === 'function') p.catch(() => playSynthTimerTick());
            }
            return;
          } catch (_) {}
        }
        playSynthTimerTick();
      }

      function playSynthTimerTick() {
        try {
          const ctxAudio = getAudioCtx();
          if (!ctxAudio) return;
          const now = ctxAudio.currentTime;
          const sec = getLiveRemainingSec();
          const urgentBoost = sec <= 3 ? 180 : 0;
          const osc = ctxAudio.createOscillator();
          const gain = ctxAudio.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(760 + urgentBoost, now);
          osc.frequency.exponentialRampToValueAtTime(420, now + 0.06);
          gain.gain.setValueAtTime(0.14, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.075);
          osc.connect(gain);
          gain.connect(ctxAudio.destination);
          osc.start(now);
          osc.stop(now + 0.08);
        } catch (_) {}
      }

      function playSynthTimerChime() {
        try {
          const ctxAudio = getAudioCtx();
          if (ctxAudio) {
            const now = ctxAudio.currentTime;
            [659.25, 880, 1318.51].forEach((freq, i) => {
              const t = now + i * 0.13;
              const osc = ctxAudio.createOscillator();
              const gain = ctxAudio.createGain();
              osc.type = 'triangle';
              osc.frequency.setValueAtTime(freq, t);
              gain.gain.setValueAtTime(0.001, t);
              gain.gain.exponentialRampToValueAtTime(0.22, t + 0.025);
              gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
              osc.connect(gain);
              gain.connect(ctxAudio.destination);
              osc.start(t);
              osc.stop(t + 0.62);
            });
          }
        } catch (_) {}
      }

      function playTimerChime() {
        stopTimerTickAudio();
        if (timerTimesUpAudio) {
          try {
            timerTimesUpAudio.currentTime = 0;
            timerTimesUpAudio.volume = 1;
            const p = timerTimesUpAudio.play();
            if (p && typeof p.catch === 'function') p.catch(() => playSynthTimerChime());
            return;
          } catch (_) {}
        }
        playSynthTimerChime();
      }

      let lastTimerRenderKey = '';

      function renderTimerUI() {
        const t = state.timer || defaultState.timer;
        const sec = getLiveRemainingSec();
        const renderKey = `${sec}:${t.running}:${t.visible}:${t.mode}:${t.durationSec}`;
        if (renderKey === lastTimerRenderKey) return;
        lastTimerRenderKey = renderKey;
        const formatted = formatTimeMMSS(sec);

        if (t.running && sec > 0) {
          timerChimePlayed = false;
        }

        // Synced final 5-second ticking cue + digit pop on Stage
        const secondChanged = sec !== lastTickSec;
        if (secondChanged) {
          lastTickSec = sec;
        }
        if (currentRole === 'stage' && !window.VoxCloudSync?.isDisplayMode?.()) {
          syncTimerTickAudio(sec, t.running);
        } else {
          stopTimerTickAudio();
        }

        // Auto-stop when countdown hits 0
        if (t.running && sec <= 0) {
          t.running = false;
          t.remainingSec = 0;
          t.endAt = null;
          t.timerVersion = Date.now();
          if (window.__voxLiquidRaf) {
            cancelAnimationFrame(window.__voxLiquidRaf);
            window.__voxLiquidRaf = null;
          }
          saveAndBroadcast();
          if (currentRole === 'stage' && !window.VoxCloudSync?.isDisplayMode?.() && !timerChimePlayed) {
            timerChimePlayed = true;
            playTimerChime();
          }
        }

        // Stage Corner Timer Pill removed (Timer runs via Center Circle Timer & Toolbox Timer)

        // Center-Stage Vox Countdown Overlay
        const centerOverlay = document.getElementById('center-timer-overlay');
        const centerCard = document.getElementById('center-timer-card');
        const centerDigits = document.getElementById('center-timer-digits');
        const centerBar = document.getElementById('center-timer-bar');
        const centerBarBack = document.getElementById('center-timer-bar-back');
        const centerStatusText = document.getElementById('center-timer-status-text');
        const centerTimesUp = document.getElementById('center-timer-timesup-badge');
        const showCenter = Boolean(currentRole === 'stage' && t.visible && t.mode === 'center');
        if (centerOverlay && centerCard && centerDigits && centerBar) {
          centerOverlay.classList.toggle('is-open', showCenter);
          centerDigits.textContent = formatted;

          if (secondChanged && showCenter && t.running && sec > 0 && sec <= 5) {
            centerDigits.classList.remove('timer-digit-pop');
            void centerDigits.offsetWidth;
            centerDigits.classList.add('timer-digit-pop');
          }

          const totalDur = Math.max(1, Number(t.durationSec) || 180);
          const remMs = (t.running && t.endAt) ? Math.max(0, t.endAt - Date.now()) : (sec * 1000);
          const elapsedPct = Math.max(0, Math.min(100, ((totalDur * 1000 - remMs) / (totalDur * 1000)) * 100));
          const hasStarted = elapsedPct > 0.05;
          centerBar.classList.toggle('is-flowing', Boolean(t.running && showCenter));
          if (centerBarBack) centerBarBack.classList.toggle('is-flowing', Boolean(t.running && showCenter));
          centerBar.style.opacity = hasStarted ? '1' : '0';
          centerBar.style.height = `${elapsedPct}%`;
          if (centerBarBack) {
            centerBarBack.style.opacity = hasStarted ? '1' : '0';
            centerBarBack.style.height = `${Math.min(100, elapsedPct + (hasStarted && elapsedPct < 98 ? 2.4 : 0))}%`;
          }
          if (t.running && showCenter && !window.__voxLiquidRaf) {
            const tickLiquid = () => {
              const cur = state.timer;
              const isStillOpen = Boolean(currentRole === 'stage' && cur?.visible && cur?.mode === 'center' && cur?.running && cur?.endAt);
              if (!isStillOpen) {
                window.__voxLiquidRaf = null;
                return;
              }
              const durMs = Math.max(1000, (Number(cur.durationSec) || 180) * 1000);
              const leftMs = Math.max(0, cur.endAt - Date.now());
              const pct = Math.max(0, Math.min(100, ((durMs - leftMs) / durMs) * 100));
              const started = pct > 0.05;
              centerBar.style.opacity = started ? '1' : '0';
              centerBar.style.height = `${pct}%`;
              if (centerBarBack) {
                centerBarBack.style.opacity = started ? '1' : '0';
                centerBarBack.style.height = `${Math.min(100, pct + (started && pct < 98 ? 2.4 : 0))}%`;
              }
              if (leftMs > 0) {
                window.__voxLiquidRaf = requestAnimationFrame(tickLiquid);
              } else {
                window.__voxLiquidRaf = null;
              }
            };
            window.__voxLiquidRaf = requestAnimationFrame(tickLiquid);
          }
          const cToggleIcon = document.getElementById('center-timer-toggle-icon');
          if (cToggleIcon) {
            cToggleIcon.innerHTML = t.running
              ? '<rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>'
              : '<path d="M6 4l15 8-15 8V4z"/>';
          }

          const isCritical = sec <= 5;
          const isWarn = sec > 5 && sec <= 15;
          const liquidColor = isCritical ? '#E74C3C' : (isWarn ? '#F4D03F' : '#2980B9');
          const darkLiquidColor = isCritical ? '#A93226' : (isWarn ? '#B7950B' : '#1B5E8A');
          centerBar.style.backgroundColor = liquidColor;
          if (centerBarBack) centerBarBack.style.backgroundColor = darkLiquidColor;
          const wavePath = document.getElementById('center-timer-wave-path');
          if (wavePath) wavePath.setAttribute('fill', liquidColor);
          const waveBackPath = document.getElementById('center-timer-wave-back-path');
          if (waveBackPath) waveBackPath.setAttribute('fill', darkLiquidColor);

          centerCard.classList.add('bg-[#FFFFFF]', 'text-[#111111]');
          centerCard.classList.remove('bg-[#FFE8E6]', 'bg-[#FFFDF5]');
          if (centerStatusText) {
            centerStatusText.textContent = t.running ? 'GAME COUNTDOWN • LIVE' : 'GAME COUNTDOWN';
          }
          if (centerTimesUp) {
            centerTimesUp.classList.toggle('hidden', sec > 0);
          }
        }

        // Admin Timer Card Controls
        const adminDisplay = document.getElementById('admin-timer-display');
        const toggleBtn = document.getElementById('admin-timer-toggle-btn');
        const toggleIcon = document.getElementById('admin-timer-toggle-icon');
        const toggleLabel = document.getElementById('admin-timer-toggle-label');
        const visBtn = document.getElementById('admin-timer-visibility-btn');
        const visIcon = document.getElementById('admin-timer-vis-icon');
        const visLabel = document.getElementById('admin-timer-vis-label');
        const modeBtn = document.getElementById('admin-timer-mode-btn');
        const modeIcon = document.getElementById('admin-timer-mode-icon');
        const modeLabel = document.getElementById('admin-timer-mode-label');

        if (adminDisplay) {
          adminDisplay.textContent = formatted;
          adminDisplay.classList.toggle('bg-[#E74C3C]', sec <= 10);
          adminDisplay.classList.toggle('text-white', sec <= 10);
          adminDisplay.classList.toggle('bg-[#F8F6F0]', sec > 10);
          adminDisplay.classList.toggle('text-[#111111]', sec > 10);
        }
        if (toggleBtn && toggleIcon && toggleLabel) {
          toggleIcon.textContent = t.running ? '⏸' : '▶';
          toggleLabel.textContent = t.running ? 'พัก' : 'เริ่ม';
          toggleBtn.classList.toggle('bg-[#111111]', t.running);
          toggleBtn.classList.toggle('text-[#F4D03F]', t.running);
          toggleBtn.classList.toggle('bg-[#F4D03F]', !t.running);
          toggleBtn.classList.toggle('text-[#111111]', !t.running);
        }
        if (visBtn && visIcon && visLabel) {
          visIcon.textContent = t.visible ? '🙈' : '👁';
          visLabel.textContent = t.visible ? 'ซ่อน' : 'แสดง';
          visBtn.classList.toggle('bg-[#111111]', t.visible);
          visBtn.classList.toggle('text-[#F4D03F]', t.visible);
          visBtn.classList.toggle('bg-white', !t.visible);
          visBtn.classList.toggle('text-[#111111]', !t.visible);
        }
        if (modeBtn && modeIcon && modeLabel) {
          const isCenter = t.mode === 'center';
          modeIcon.textContent = isCenter ? '🗗' : '📺';
          modeLabel.textContent = isCenter ? 'มุมจอ' : 'กลางจอ';
          modeBtn.classList.toggle('bg-[#111111]', isCenter);
          modeBtn.classList.toggle('text-[#F4D03F]', isCenter);
          modeBtn.classList.toggle('bg-white', !isCenter);
          modeBtn.classList.toggle('text-[#111111]', !isCenter);
        }
        const presetsWrap = document.getElementById('admin-timer-presets-wrap');
        if (presetsWrap) {
          presetsWrap.classList.toggle('is-open', !t.running);
        }
      }

      setInterval(() => {
        if (state.timer?.running) {
          renderTimerUI();
        }
      }, 250);

      function compressImageFile(file, callback) {
        const isGif = file.type === 'image/gif' || /\.gif$/i.test(file.name || '');
        const reader = new FileReader();
        reader.onload = (event) => {
          // Preserve animated GIFs directly as Data URLs without flattening to JPEG
          if (isGif) {
            callback(event.target.result);
            return;
          }

          const img = new Image();
          img.onload = () => {
            const maxDim = 960;
            let width = img.width;
            let height = img.height;
            if (width > maxDim || height > maxDim) {
              if (width > height) {
                height = Math.round((height * maxDim) / width);
                width = maxDim;
              } else {
                width = Math.round((width * maxDim) / height);
                height = maxDim;
              }
            }
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx2d = canvas.getContext('2d');
            ctx2d.drawImage(img, 0, 0, width, height);
            callback(canvas.toDataURL('image/jpeg', 0.78));
          };
          img.src = event.target.result;
        };
        reader.readAsDataURL(file);
      }

      // ========================================================================
      // DOM REFERENCES
      // ========================================================================
      const stageContainerEl = document.getElementById('stage-container');
      const mobileAdminViewEl = document.getElementById('mobile-admin-view');

      const eventTitleEl = document.getElementById('event-title');
      const eventSubtitleEl = document.getElementById('event-subtitle');
      const gameTitleEls = [
        document.getElementById('game-title-0'),
        document.getElementById('game-title-1'),
        document.getElementById('game-title-2')
      ];
      const gameCardEls = [
        document.getElementById('game-card-0'),
        document.getElementById('game-card-1'),
        document.getElementById('game-card-2')
      ];
      const gameMediaDotEls = [
        document.getElementById('game-media-dot-0'),
        document.getElementById('game-media-dot-1'),
        document.getElementById('game-media-dot-2')
      ];

      // Media Accordion & Persistent Visual Host Elements
      const mediaAccordionEl = document.getElementById('media-accordion');
      const accordionGameDotEl = document.getElementById('accordion-game-dot');
      const accordionGameTitleEl = document.getElementById('accordion-game-title');
      const accordionCloseBtn = document.getElementById('accordion-close-btn');
      const mediaContentStageEl = document.getElementById('media-content-stage');

      const mediaVisualHostEl = document.getElementById('media-visual-host');
      const mediaSwitcherBarEl = document.getElementById('media-switcher-bar');
      const mediaNavPrevBtn = document.getElementById('media-nav-prev');
      const mediaPillVideoBtn = document.getElementById('media-pill-video');
      const mediaPillImageBtn = document.getElementById('media-pill-image');
      const mediaNavNextBtn = document.getElementById('media-nav-next');
      const mediaZoomToggleBtn = document.getElementById('media-zoom-toggle-btn');
      const mediaZoomBtnIcon = document.getElementById('media-zoom-btn-icon');
      const mediaZoomBtnLabel = document.getElementById('media-zoom-btn-label');
      const mediaVisualPaneEl = document.getElementById('media-visual-pane');

      // Theater Zoom Overlay Elements
      const theaterZoomOverlayEl = document.getElementById('theater-zoom-overlay');
      const zoomGameDotEl = document.getElementById('zoom-game-dot');
      const zoomModalTitleEl = document.getElementById('zoom-modal-title');
      const zoomCloseBtn = document.getElementById('zoom-close-btn');
      const zoomMediaSlotEl = document.getElementById('zoom-media-slot');

      // Leaderboard & Drawer Elements
      const leaderboardListEl = document.getElementById('leaderboard-list');
      const drawerEl = document.getElementById('control-drawer');
      const drawerToggleBtn = document.getElementById('drawer-toggle-btn');
      const btnCloseDrawer = document.getElementById('btn-close-drawer');
      const drawerTeamsGrid = document.getElementById('drawer-teams-grid');
      const btnWinner = document.getElementById('btn-winner');
      const btnReset = document.getElementById('btn-reset');
      const drawerCopyAdminBtn = document.getElementById('drawer-copy-admin-btn');
      const drawerOpenAdminBtn = document.getElementById('drawer-open-admin-btn');

      // ========================================================================
      // VIDEO <-> IMAGE/GIF SWITCHING & THEATER ZOOM CONTROLLER
      // ========================================================================
      let swapTimeoutId = null;
      let mediaFadeTimeoutId = null;
      let currentRenderedPaneKey = '';

      function updateMediaSwitcherPills(gameIdx, activeType, hasBoth) {
        mediaSwitcherBarEl.classList.toggle('hidden', !hasBoth);
        if (!hasBoth) return;

        const isVideo = activeType === 'video';
        mediaPillVideoBtn.className = isVideo
          ? 'font-display font-extrabold text-xs px-2.5 py-1 rounded-lg bg-[#111111] text-[#F4D03F] border border-[#111111] transition-all cursor-pointer flex items-center gap-1'
          : 'font-display font-bold text-xs px-2.5 py-1 rounded-lg bg-transparent text-[#111111] hover:bg-[#F4D03F]/35 border border-transparent transition-all cursor-pointer flex items-center gap-1';

        mediaPillImageBtn.className = !isVideo
          ? 'font-display font-extrabold text-xs px-2.5 py-1 rounded-lg bg-[#111111] text-[#F4D03F] border border-[#111111] transition-all cursor-pointer flex items-center gap-1'
          : 'font-display font-bold text-xs px-2.5 py-1 rounded-lg bg-transparent text-[#111111] hover:bg-[#F4D03F]/35 border border-transparent transition-all cursor-pointer flex items-center gap-1';
      }

      function renderVisualPaneContent(gameIdx, animateCrossfade = false) {
        const media = state.gameMedia[gameIdx] || { description: '', youtubeUrl: '', imageData: '', activeMediaType: 'video' };
        const ytId = extractYouTubeId(media.youtubeUrl);
        const imgSrc = (media.imageData || '').trim();
        const hasYt = Boolean(ytId);
        const hasImg = Boolean(imgSrc);
        const hasBoth = hasYt && hasImg;

        if (!hasYt && !hasImg) {
          mediaVisualHostEl.classList.add('hidden');
          mediaVisualPaneEl.innerHTML = '';
          currentRenderedPaneKey = '';
          ytIframeReady = false;
          return;
        }

        const resolvedType = resolveActiveMediaType(media);
        media.activeMediaType = resolvedType;

        mediaVisualHostEl.classList.remove('hidden');
        updateMediaSwitcherPills(gameIdx, resolvedType, hasBoth);

        const mediaSignature = resolvedType === 'video'
          ? ytId
          : `${imgSrc.length}:${imgSrc.slice(0, 48)}:${imgSrc.slice(-24)}`;
        const nextKey = `${gameIdx}:${resolvedType}:${mediaSignature}`;
        if (nextKey === currentRenderedPaneKey && mediaVisualPaneEl.innerHTML !== '') {
          return;
        }

        const injectHtml = () => {
          currentRenderedPaneKey = nextKey;
          if (resolvedType === 'video' && hasYt) {
            ytIframeReady = false;
            const embedSrc = buildYouTubeEmbedUrl(ytId);
            mediaVisualPaneEl.innerHTML = `
              <div class="relative w-full aspect-video bg-[#111111] border-[2.5px] border-[#111111] rounded-xl overflow-hidden shadow-[4px_4px_0px_#111111]">
                <iframe
                  id="stage-youtube-iframe"
                  src="${embedSrc}"
                  title="${escapeHtml(state.games[gameIdx])}"
                  class="absolute inset-0 w-full h-full border-0"
                  referrerpolicy="strict-origin-when-cross-origin"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowfullscreen
                ></iframe>
              </div>
            `;
            const ytIframe = document.getElementById('stage-youtube-iframe');
            if (ytIframe) {
              ytIframe.addEventListener('load', () => {
                setTimeout(() => {
                  ytIframeReady = true;
                  if (state.isVideoMuted) {
                    postYtCmd(ytIframe, 'mute');
                  }
                  if (pendingVideoCommand && pendingVideoCommand.gameIdx === gameIdx) {
                    const cmdAction = pendingVideoCommand.action;
                    pendingVideoCommand = null;
                    executeYtAction(ytIframe, cmdAction);
                  }
                }, 400);
              });
            }
          } else if (hasImg) {
            ytIframeReady = false;
            const maxHeightClass = state.isMediaZoomed ? 'max-h-[74vh]' : 'max-h-[46vh]';
            mediaVisualPaneEl.innerHTML = `
              <div
                id="stage-zoomable-image-box"
                class="w-full bg-[#F8F6F0] border-[2.5px] border-[#111111] rounded-xl p-2.5 sm:p-3.5 shadow-[4px_4px_0px_#111111] flex items-center justify-center cursor-pointer"
              >
                <img
                  src="${imgSrc}"
                  alt="${escapeHtml(state.games[gameIdx])}"
                  onerror="this.style.display='none'; this.nextElementSibling.classList.remove('hidden');"
                  class="${maxHeightClass} w-auto max-w-full rounded-lg object-contain transition-all duration-300"
                />
                <span class="hidden thai-safe font-display font-bold text-sm text-[#E74C3C] py-8">ไม่สามารถโหลดรูปภาพหรือ GIF ได้</span>
              </div>
            `;
            const imgBox = document.getElementById('stage-zoomable-image-box');
            if (imgBox) {
              imgBox.addEventListener('click', () => {
                setTheaterZoom(!state.isMediaZoomed);
              });
            }
          }
        };

        if (animateCrossfade && mediaVisualPaneEl.innerHTML !== '') {
          if (mediaFadeTimeoutId) clearTimeout(mediaFadeTimeoutId);
          mediaVisualPaneEl.classList.add('is-fading-out');
          mediaFadeTimeoutId = setTimeout(() => {
            injectHtml();
            requestAnimationFrame(() => {
              mediaVisualPaneEl.classList.remove('is-fading-out');
            });
            mediaFadeTimeoutId = null;
          }, 200);
        } else {
          mediaVisualPaneEl.classList.remove('is-fading-out');
          injectHtml();
        }
      }

      function setActiveMediaType(gameIdx, nextType) {
        const media = state.gameMedia[gameIdx];
        if (!media) return;
        const hasYt = Boolean(extractYouTubeId(media.youtubeUrl));
        const hasImg = Boolean((media.imageData || '').trim());
        if (nextType === 'video' && !hasYt) return;
        if (nextType === 'image' && !hasImg) return;
        if (media.activeMediaType === nextType) return;

        media.activeMediaType = nextType;
        saveAndBroadcast();
        if (currentRole === 'stage') {
          renderVisualPaneContent(gameIdx, true);
        } else {
          renderAdminUI();
        }
      }

      mediaPillVideoBtn.addEventListener('click', () => {
        if (state.activeGameAccordion !== null) {
          setActiveMediaType(state.activeGameAccordion, 'video');
        }
      });

      mediaPillImageBtn.addEventListener('click', () => {
        if (state.activeGameAccordion !== null) {
          setActiveMediaType(state.activeGameAccordion, 'image');
        }
      });

      function cycleActiveMediaType() {
        const idx = state.activeGameAccordion;
        if (idx === null) return;
        const currentType = resolveActiveMediaType(state.gameMedia[idx]);
        setActiveMediaType(idx, currentType === 'video' ? 'image' : 'video');
      }

      mediaNavPrevBtn.addEventListener('click', cycleActiveMediaType);
      mediaNavNextBtn.addEventListener('click', cycleActiveMediaType);

      // Theater Zoom Reparenting & Smooth Transition
      function syncTheaterZoomState() {
        const idx = state.activeGameAccordion;
        const shouldZoom = Boolean(state.isMediaZoomed && idx !== null);

        if (shouldZoom) {
          const media = state.gameMedia[idx] || {};
          const hasMedia = Boolean(extractYouTubeId(media.youtubeUrl) || (media.imageData || '').trim());
          if (!hasMedia) {
            state.isMediaZoomed = false;
            return;
          }

          zoomGameDotEl.style.backgroundColor = GAME_COLORS[idx] || '#F4D03F';
          zoomModalTitleEl.textContent = state.games[idx];
          mediaZoomBtnIcon.textContent = '🗕';
          mediaZoomBtnLabel.textContent = 'ย่อกลับ';

          // Reparent persistent visual host into zoom slot so iframe doesn't reload
          if (mediaVisualHostEl.parentElement !== zoomMediaSlotEl) {
            zoomMediaSlotEl.appendChild(mediaVisualHostEl);
          }
          renderVisualPaneContent(idx, false);
          theaterZoomOverlayEl.classList.add('is-zoomed');
        } else {
          theaterZoomOverlayEl.classList.remove('is-zoomed');
          if (centerTimerOverlayEl) centerTimerOverlayEl.classList.remove('is-open');
          mediaZoomBtnIcon.textContent = '🔍';
          mediaZoomBtnLabel.textContent = 'ขยาย';

          const accordionSlot = document.getElementById('accordion-media-slot');
          if (accordionSlot && mediaVisualHostEl.parentElement !== accordionSlot) {
            accordionSlot.appendChild(mediaVisualHostEl);
          }
          if (idx !== null) {
            renderVisualPaneContent(idx, false);
          }
        }
      }

      function setTheaterZoom(zoomed) {
        state.isMediaZoomed = Boolean(zoomed) && state.activeGameAccordion !== null;
        if (state.isMediaZoomed) {
          syncNativeFullscreen(true);
        } else if (!state.isActivityFocused) {
          syncNativeFullscreen(false);
        }
        saveAndBroadcast();
        if (currentRole === 'stage') {
          syncTheaterZoomState();
        } else {
          renderAdminUI();
        }
      }

      mediaZoomToggleBtn.addEventListener('click', () => {
        setTheaterZoom(!state.isMediaZoomed);
      });

      zoomCloseBtn.addEventListener('click', () => {
        setTheaterZoom(false);
      });

      theaterZoomOverlayEl.addEventListener('click', (e) => {
        if (e.target === theaterZoomOverlayEl) {
          setTheaterZoom(false);
        }
      });

      // ========================================================================
      // INTERACTIVE GAME DESCRIPTION + MEDIA ACCORDION
      // ========================================================================
      function renderMediaStageContent(gameIdx, animateMediaCrossfade = false) {
        const media = state.gameMedia[gameIdx] || { description: '', youtubeUrl: '', imageData: '', activeMediaType: 'video' };
        const ytId = extractYouTubeId(media.youtubeUrl);
        const imgSrc = (media.imageData || '').trim();

        accordionGameDotEl.style.backgroundColor = GAME_COLORS[gameIdx] || '#F4D03F';
        accordionGameTitleEl.textContent = state.games[gameIdx];

        const hasMedia = Boolean(ytId || imgSrc);

        // Temporarily park persistent visual host safely in document.body before rebuilding innerHTML
        if (mediaVisualHostEl.parentElement && mediaVisualHostEl.parentElement !== zoomMediaSlotEl) {
          mediaVisualHostEl.classList.add('hidden');
          document.body.appendChild(mediaVisualHostEl);
        }

        if (!hasMedia) {
          mediaContentStageEl.innerHTML = `
            <div class="w-full bg-[#F8F6F0] border-2 border-dashed border-[#111111]/45 rounded-xl py-7 px-4 flex flex-col items-center justify-center text-center gap-3">
              <p class="thai-safe font-display font-bold text-base sm:text-lg text-[#111111]/75">
                ยังไม่ได้ตั้งค่าลิงก์ YouTube หรือรูปภาพ/GIF สำหรับกิจกรรมนี้
              </p>
              <button
                type="button"
                data-open-wrench="${gameIdx}"
                class="btn-vox bg-[#F4D03F] hover:bg-[#f2c61d] text-[#111111] font-display font-bold text-sm px-4 py-2 rounded-xl flex items-center gap-2 cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
                </svg>
                <span>เพิ่มสื่อประกอบ / กติกา</span>
              </button>
            </div>
          `;
          const quickBtn = mediaContentStageEl.querySelector('[data-open-wrench]');
          if (quickBtn) quickBtn.addEventListener('click', () => window.VoxContextMenu?.openMediaEditor(gameIdx));
          return;
        }

        mediaContentStageEl.innerHTML = `
          <div id="accordion-media-slot" class="w-full max-w-4xl mx-auto"></div>
        `;

        const targetSlot = state.isMediaZoomed ? zoomMediaSlotEl : document.getElementById('accordion-media-slot');
        if (targetSlot) {
          targetSlot.appendChild(mediaVisualHostEl);
        }
        renderVisualPaneContent(gameIdx, animateMediaCrossfade);
      }

      function renderActivityList() {
        const row = document.getElementById('game-cards-row');
        if (!row) return;
        row.className = 'flex-1 min-h-0 flex flex-col gap-2 overflow-y-auto pr-0.5';
        const nextSig = JSON.stringify(state.games.map((t, idx) => {
          const m = state.gameMedia[idx];
          return [
            t,
            (m?.description || '').trim(),
            Boolean(extractYouTubeId(m?.youtubeUrl) || (m?.imageData || '').trim())
          ];
        }));

        if (row.dataset.renderSig === nextSig && row.querySelectorAll('[data-game-index]').length === state.games.length) {
          row.querySelectorAll('[data-game-index]').forEach((card) => {
            const idx = Number(card.dataset.gameIndex);
            const isOpen = state.activeGameAccordion === idx;
            card.classList.toggle('is-active', isOpen);
            card.setAttribute('aria-expanded', String(isOpen));
            const drawer = document.getElementById(`game-rules-${idx}`);
            if (drawer) {
              const wasOpen = drawer.classList.contains('is-open');
              drawer.classList.toggle('is-open', isOpen);
              drawer.setAttribute('aria-hidden', String(!isOpen));
              if (isOpen && !wasOpen) {
                requestAnimationFrame(() => drawer.scrollIntoView({ block: 'nearest', behavior: 'smooth' }));
              }
            }
          });
          return;
        }

        row.dataset.renderSig = nextSig;
        row.innerHTML = state.games.map((title, idx) => {
          const isOpen = state.activeGameAccordion === idx;
          const color = GAME_COLORS[idx % GAME_COLORS.length];
          const media = state.gameMedia[idx];
          const descText = (media?.description || '').trim();
          const hasContent = Boolean(
            descText ||
            extractYouTubeId(media?.youtubeUrl) ||
            (media?.imageData || '').trim()
          );
          return `
            <div class="flex flex-col shrink-0">
              <div
                id="game-card-${idx}"
                data-game-index="${idx}"
                role="button"
                tabindex="0"
                aria-expanded="${isOpen}"
                class="game-pill-card px-3 py-2 flex items-center justify-between gap-2 ${isOpen ? 'is-active' : ''}"
              >
                <div class="flex items-center gap-2 min-w-0 flex-1">
                  <span class="w-3 h-3 rounded-full border-[1.5px] border-[#111111] shrink-0" style="background:${color}"></span>
                  <span class="thai-safe-tight font-semibold text-sm text-[#111111] truncate">${escapeHtml(title)}</span>
                </div>
                <div class="flex items-center gap-1.5 shrink-0">
                  <span class="${hasContent ? '' : 'hidden'} w-2 h-2 rounded-full bg-[#111111]" title="มีรายละเอียดหรือสื่อประกอบ"></span>
                  <button type="button" data-game-menu="${idx}" title="ตั้งค่ากิจกรรม (หรือคลิกขวา)" aria-label="ตั้งค่ากิจกรรม" class="w-6 h-6 rounded-md border border-transparent hover:border-[#111111] hover:bg-[#F4D03F] font-display font-black text-xs text-[#111111]/65 hover:text-[#111111] flex items-center justify-center transition-colors cursor-pointer">⋯</button>
                  <span class="game-chevron font-display font-black text-base text-[#111111]/55 leading-none">›</span>
                </div>
              </div>
              ${descText ? `
                <div id="game-rules-${idx}" class="game-rules-drawer ${isOpen ? 'is-open' : ''}" aria-hidden="${!isOpen}">
                  <div class="game-rules-drawer-inner">
                    <div class="mx-1 mb-0.5 bg-[#F8F6F0] border-2 border-[#111111] rounded-lg px-2.5 py-2 shadow-[2px_2px_0px_#111111]">
                      <div class="inline-flex items-center gap-1 mb-1">
                        <span class="px-1.5 py-0.5 rounded bg-[#111111] text-[#F4D03F] font-display font-extrabold text-[10px] tracking-wide">กติกา / รายละเอียด</span>
                      </div>
                      <p class="thai-safe text-xs font-medium text-[#111111] whitespace-pre-line break-words leading-snug">${escapeHtml(descText)}</p>
                    </div>
                  </div>
                </div>
              ` : ''}
            </div>
          `;
        }).join('');

        row.querySelectorAll('[data-game-index]').forEach(card => {
          const idx = Number(card.dataset.gameIndex);
          card.querySelector('[data-game-menu]')?.addEventListener('click', (e) => {
            e.stopPropagation();
            const r = e.currentTarget.getBoundingClientRect();
            window.VoxContextMenu?.openForTarget?.(card, r.left, r.bottom + 4);
          });
          card.addEventListener('click', (e) => {
            if (e.target.closest('[data-game-menu]')) return;
            toggleGameAccordion(idx);
          });
          card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.code === 'Space') {
              e.preventDefault();
              toggleGameAccordion(idx);
            }
          });
        });
      }

      let wasNativeFullscreen = Boolean(document.fullscreenElement || document.webkitFullscreenElement);
      function syncNativeFullscreen(shouldBeFullscreen) {
        const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
        if (shouldBeFullscreen && !fsEl) {
          const root = document.documentElement;
          const req = root.requestFullscreen || root.webkitRequestFullscreen;
          if (req) {
            Promise.resolve(req.call(root)).catch(() => {});
          }
        } else if (!shouldBeFullscreen && fsEl) {
          const exit = document.exitFullscreen || document.webkitExitFullscreen;
          if (exit) {
            Promise.resolve(exit.call(document)).catch(() => {});
          }
        }
      }

      function handleNativeFullscreenChange() {
        const isFs = Boolean(document.fullscreenElement || document.webkitFullscreenElement);
        if (wasNativeFullscreen && !isFs) {
          let changed = false;
          if (state.isMediaZoomed) {
            state.isMediaZoomed = false;
            syncTheaterZoomState();
            changed = true;
          }
          if (state.isActivityFocused) {
            state.isActivityFocused = false;
            syncActivityFocusLayout();
            changed = true;
          }
          if (changed) saveAndBroadcast();
        }
        wasNativeFullscreen = isFs;
      }
      document.addEventListener('fullscreenchange', handleNativeFullscreenChange);
      document.addEventListener('webkitfullscreenchange', handleNativeFullscreenChange);

      function syncActivityFocusLayout() {
        const listCol = document.getElementById('activity-list-col');
        const focusCol = document.getElementById('activity-focus-col');
        const focusIcon = document.getElementById('accordion-focus-icon');
        const focusLabel = document.getElementById('accordion-focus-label');
        const centerGridEl = document.getElementById('stage-center-grid');
        const bottomSlotEl = document.getElementById('stage-bottom-slot');

        const hasActivity = state.activeGameAccordion !== null;
        const focused = Boolean(state.isActivityFocused && hasActivity);
        document.body.classList.toggle('is-activity-focused', focused);

        if (listCol) {
          listCol.classList.remove('hidden');
          listCol.classList.add('flex');
          listCol.classList.toggle('is-bookmark-dock', focused);
        }
        if (bottomSlotEl) {
          bottomSlotEl.classList.toggle('is-team-bookmark-dock', focused);
        }
        if (focusCol) {
          const wasHidden = focusCol.classList.contains('hidden');
          focusCol.classList.toggle('hidden', !hasActivity);
          focusCol.classList.toggle('flex', hasActivity);
          focusCol.classList.toggle('lg:col-span-12', focused);
          focusCol.classList.toggle('lg:col-span-8', !focused);
          if (hasActivity && wasHidden) {
            focusCol.classList.remove('vox-stage-enter');
            void focusCol.offsetWidth;
            focusCol.classList.add('vox-stage-enter');
          }
        }
        if (leaderboardListEl) {
          if (hasActivity && bottomSlotEl) {
            bottomSlotEl.classList.remove('hidden');
            if (leaderboardListEl.parentElement !== bottomSlotEl) {
              bottomSlotEl.appendChild(leaderboardListEl);
            }
          } else if (centerGridEl) {
            if (bottomSlotEl) bottomSlotEl.classList.add('hidden');
            if (leaderboardListEl.parentElement !== centerGridEl) {
              centerGridEl.appendChild(leaderboardListEl);
            }
          }
        }
        if (focusIcon) {
          focusIcon.innerHTML = focused
            ? '<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14h6v6M20 10h-6V4M14 10l7-7M10 14l-7 7"/></svg>'
            : '<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>';
        }
        if (focusLabel) focusLabel.textContent = focused ? 'ย่อกลับ' : 'ขยายโฟกัส';
      }

      function updateGameCardActiveStyles() {
        renderActivityList();
      }

      function syncAccordionFromState() {
        const targetIdx = state.activeGameAccordion;
        const layoutFirstRects = {};
        if (leaderboardListEl) {
          leaderboardListEl.querySelectorAll('.team-row').forEach(row => {
            layoutFirstRects[row.dataset.teamId] = row.getBoundingClientRect();
          });
        }
        updateGameCardActiveStyles();
        syncActivityFocusLayout();
        renderLeaderboard(false, layoutFirstRects);

        if (targetIdx === null || typeof targetIdx !== 'number') {
          if (swapTimeoutId) {
            clearTimeout(swapTimeoutId);
            swapTimeoutId = null;
          }
          state.isActivityFocused = false;
          syncActivityFocusLayout();
          if (state.isMediaZoomed) {
            state.isMediaZoomed = false;
            theaterZoomOverlayEl.classList.remove('is-zoomed');
            if (centerTimerOverlayEl) centerTimerOverlayEl.classList.remove('is-open');
          }
          mediaAccordionEl.classList.remove('is-open');
          mediaAccordionEl.setAttribute('aria-hidden', 'true');
          setTimeout(() => {
            if (state.activeGameAccordion === null) {
              mediaVisualHostEl.classList.add('hidden');
              document.body.appendChild(mediaVisualHostEl);
              mediaContentStageEl.innerHTML = '';
              currentRenderedPaneKey = '';
              ytIframeReady = false;
            }
          }, 460);
          return;
        }

        const wasClosed = !mediaAccordionEl.classList.contains('is-open');
        if (wasClosed) {
          renderMediaStageContent(targetIdx, false);
          mediaAccordionEl.classList.add('is-open');
          mediaAccordionEl.setAttribute('aria-hidden', 'false');
          if (state.isMediaZoomed) syncTheaterZoomState();
        } else {
          if (swapTimeoutId) clearTimeout(swapTimeoutId);
          mediaContentStageEl.classList.add('is-swapping');
          swapTimeoutId = setTimeout(() => {
            renderMediaStageContent(targetIdx, false);
            mediaContentStageEl.classList.remove('is-swapping');
            if (state.isMediaZoomed) syncTheaterZoomState();
            swapTimeoutId = null;
          }, 190);
        }
      }

      function toggleGameAccordion(gameIdx) {
        if (state.activeGameAccordion === gameIdx) {
          state.activeGameAccordion = null;
          state.isMediaZoomed = false;
          state.isActivityFocused = false;
          syncNativeFullscreen(false);
        } else {
          state.activeGameAccordion = gameIdx;
        }
        saveAndBroadcast();
        syncAccordionFromState();
      }

      const accordionFocusBtn = document.getElementById('accordion-focus-btn');
      if (accordionFocusBtn) {
        accordionFocusBtn.addEventListener('click', () => {
          if (state.activeGameAccordion === null) return;
          state.isActivityFocused = !state.isActivityFocused;
          syncNativeFullscreen(state.isActivityFocused);
          saveAndBroadcast();
          syncActivityFocusLayout();
        });
      }

      accordionCloseBtn.addEventListener('click', () => {
        state.activeGameAccordion = null;
        state.isMediaZoomed = false;
        state.isActivityFocused = false;
        syncNativeFullscreen(false);
        saveAndBroadcast();
        syncAccordionFromState();
      });

      // ========================================================================
      // DRAWER EMBEDDED QR CLIPBOARD COPY & ROLE SWITCH
      // ========================================================================
      async function copyAdminUrlToClipboard(buttonEl) {
        const url = buildAdminUrl(roomCode);
        const showCopiedFeedback = () => {
          const origText = buttonEl.textContent;
          buttonEl.textContent = '✓ คัดลอกลิงก์แล้ว!';
          setTimeout(() => { buttonEl.textContent = origText; }, 2200);
        };

        if (navigator.clipboard?.writeText) {
          try {
            await navigator.clipboard.writeText(url);
            showCopiedFeedback();
            return;
          } catch (_) {}
        }

        const tempInput = document.createElement('textarea');
        tempInput.value = url;
        tempInput.style.position = 'fixed';
        tempInput.style.opacity = '0';
        document.body.appendChild(tempInput);
        tempInput.select();
        try {
          if (document.execCommand('copy')) showCopiedFeedback();
        } catch (_) {}
        document.body.removeChild(tempInput);
      }

      if (drawerCopyAdminBtn) {
        drawerCopyAdminBtn.addEventListener('click', () => copyAdminUrlToClipboard(drawerCopyAdminBtn));
      }
      if (drawerOpenAdminBtn) {
        drawerOpenAdminBtn.addEventListener('click', () => {
          setDrawerOpen(false);
          switchRoleView('admin');
        });
      }

      const drawerNewRoomBtn = document.getElementById('drawer-new-room-btn');
      if (drawerNewRoomBtn) {
        drawerNewRoomBtn.addEventListener('click', () => {
          roomCode = generateRoomCode();
          try { localStorage.setItem(ROOM_STORAGE_KEY, roomCode); } catch (_) {}
          const adminRoomInp = document.getElementById('admin-room-input');
          if (adminRoomInp) adminRoomInp.value = roomCode;
          stageConnections.clear();
          updateDrawerPairingUI();
          initStagePeerHost();
        });
      }

      // ========================================================================
      // SMOOTH COUNT-UP NUMBER ANIMATION
      // ========================================================================
      const activeAnimations = {};

      let sharedAudioCtx = null;
      function getAudioCtx() {
        if (!sharedAudioCtx) {
          const Ctx = window.AudioContext || window.webkitAudioContext;
          if (Ctx) sharedAudioCtx = new Ctx();
        }
        if (sharedAudioCtx && sharedAudioCtx.state === 'suspended') {
          sharedAudioCtx.resume().catch(() => {});
        }
        return sharedAudioCtx;
      }

      function playScoreSound(delta) {
        try {
          const ctx = getAudioCtx();
          if (!ctx) return;
          const now = ctx.currentTime;
          const isUp = delta > 0;
          const notes = isUp
            ? (Math.abs(delta) >= 10 ? [587.33, 880, 1174.66] : [523.25, 783.99])
            : [349.23, 246.94];
          notes.forEach((freq, idx) => {
            const t = now + idx * 0.055;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = isUp ? 'triangle' : 'sine';
            osc.frequency.setValueAtTime(freq, t);
            gain.gain.setValueAtTime(isUp ? 0.09 : 0.07, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(t);
            osc.stop(t + 0.17);
          });
        } catch (_) {}
      }

      // Preloaded Victory & Drumroll Audio Tracks (with Web Audio synthesis fallback)
      const drumrollAudio = typeof Audio !== 'undefined' ? new Audio('assets/audio/drum-roll.mp3') : null;
      const victoryAudio = typeof Audio !== 'undefined' ? new Audio('assets/audio/victory-fanfare.mp3') : null;
      if (drumrollAudio) drumrollAudio.preload = 'auto';
      if (victoryAudio) victoryAudio.preload = 'auto';

      function stopVictoryAudio() {
        try {
          if (drumrollAudio) { drumrollAudio.pause(); drumrollAudio.currentTime = 0; }
          if (victoryAudio) { victoryAudio.pause(); victoryAudio.currentTime = 0; }
        } catch (_) {}
      }

      function playSynthDrumroll(durationMs = 2120) {
        try {
          const ctx = getAudioCtx();
          if (!ctx) return;
          const now = ctx.currentTime;
          const totalSec = durationMs / 1000;

          // Shared white-noise buffer for crisp snare rattle
          const bufSize = Math.floor(ctx.sampleRate * 0.06);
          const noiseBuf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
          const data = noiseBuf.getChannelData(0);
          for (let i = 0; i < bufSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufSize * 0.35));
          }

          // Accelerating drumroll hits (slow build -> rapid roll)
          let t = 0;
          let step = 0.115;
          while (t < totalSec - 0.05) {
            const progress = t / totalSec;
            const hitTime = now + t;
            const vol = 0.04 + progress * 0.14;

            const src = ctx.createBufferSource();
            src.buffer = noiseBuf;
            const filter = ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(1400 + progress * 900, hitTime);
            filter.Q.setValueAtTime(1.4, hitTime);
            const nGain = ctx.createGain();
            nGain.gain.setValueAtTime(vol, hitTime);
            nGain.gain.exponentialRampToValueAtTime(0.001, hitTime + 0.055);
            src.connect(filter);
            filter.connect(nGain);
            nGain.connect(ctx.destination);
            src.start(hitTime);

            const osc = ctx.createOscillator();
            const oGain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(165 + progress * 45, hitTime);
            osc.frequency.exponentialRampToValueAtTime(85, hitTime + 0.045);
            oGain.gain.setValueAtTime(vol * 0.75, hitTime);
            oGain.gain.exponentialRampToValueAtTime(0.001, hitTime + 0.05);
            osc.connect(oGain);
            oGain.connect(ctx.destination);
            osc.start(hitTime);
            osc.stop(hitTime + 0.055);

            t += step;
            step = Math.max(0.036, step * 0.91);
          }
        } catch (_) {}
      }

      function playDrumroll(durationMs = 2120) {
        if (drumrollAudio) {
          try {
            drumrollAudio.currentTime = 0;
            drumrollAudio.volume = 1;
            const p = drumrollAudio.play();
            if (p && typeof p.catch === 'function') {
              p.catch(() => playSynthDrumroll(durationMs));
            }
            return;
          } catch (_) {}
        }
        playSynthDrumroll(durationMs);
      }

      function playSynthVictoryFanfare() {
        try {
          const ctx = getAudioCtx();
          if (!ctx) return;
          const now = ctx.currentTime;
          const bass = ctx.createOscillator();
          const bassGain = ctx.createGain();
          bass.type = 'sine';
          bass.frequency.setValueAtTime(130.81, now);
          bass.frequency.exponentialRampToValueAtTime(55, now + 0.45);
          bassGain.gain.setValueAtTime(0.22, now);
          bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.48);
          bass.connect(bassGain);
          bassGain.connect(ctx.destination);
          bass.start(now);
          bass.stop(now + 0.5);

          const seq = [
            { f: 523.25, t: 0.0, d: 0.22, v: 0.11 },
            { f: 659.25, t: 0.09, d: 0.22, v: 0.11 },
            { f: 783.99, t: 0.18, d: 0.22, v: 0.11 },
            { f: 1046.5, t: 0.28, d: 0.55, v: 0.13 },
            { f: 783.99, t: 0.28, d: 0.55, v: 0.08 },
            { f: 1318.5, t: 0.42, d: 0.75, v: 0.12 },
            { f: 1567.98, t: 0.52, d: 0.9, v: 0.1 }
          ];
          seq.forEach(n => {
            const t = now + n.t;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(n.f, t);
            gain.gain.setValueAtTime(n.v, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + n.d);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(t);
            osc.stop(t + n.d + 0.02);
          });
        } catch (_) {}
      }

      function playVictoryFanfare() {
        try {
          if (drumrollAudio) { drumrollAudio.pause(); drumrollAudio.currentTime = 0; }
        } catch (_) {}
        if (victoryAudio) {
          try {
            victoryAudio.currentTime = 0;
            victoryAudio.volume = 1;
            const p = victoryAudio.play();
            if (p && typeof p.catch === 'function') {
              p.catch(() => playSynthVictoryFanfare());
            }
            return;
          } catch (_) {}
        }
        playSynthVictoryFanfare();
      }

      function spawnScoreDeltaPop(boxEl, delta) {
        if (!boxEl || !delta) return;
        const pop = document.createElement('span');
        const isPos = delta > 0;
        pop.textContent = isPos ? `+${delta}` : `${delta}`;
        pop.className = `score-delta-pop font-display font-black text-xs sm:text-sm px-2 py-0.5 rounded-lg border-2 border-[#111111] shadow-[2px_2px_0px_#111111] ${isPos ? 'bg-[#F4D03F] text-[#111111]' : 'bg-[#E74C3C] text-white'}`;
        boxEl.appendChild(pop);
        setTimeout(() => pop.remove(), 920);
      }

      function animateNumber(teamId, targetValue, element) {
        const startValue = displayedTotals[teamId] ?? targetValue;
        if (startValue === targetValue) {
          element.textContent = targetValue;
          return;
        }

        if (activeAnimations[teamId]) {
          cancelAnimationFrame(activeAnimations[teamId]);
        }

        const duration = 550;
        const startTime = performance.now();

        function step(now) {
          const elapsed = now - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          const current = Math.round(startValue + (targetValue - startValue) * eased);
          displayedTotals[teamId] = current;
          element.textContent = current;

          if (progress < 1) {
            activeAnimations[teamId] = requestAnimationFrame(step);
          } else {
            displayedTotals[teamId] = targetValue;
            element.textContent = targetValue;
            delete activeAnimations[teamId];
          }
        }

        activeAnimations[teamId] = requestAnimationFrame(step);
      }

      // ========================================================================
      // RENDER STAGE LEADERBOARD (3 GROUP CARDS + PER-GAME SCORE BOXES)
      // ========================================================================
      function getVoxCrownSvg(sizeClass = 'w-5 h-5') {
        return `
          <svg class="${sizeClass} shrink-0" viewBox="0 0 64 52" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M8 38 L4 12 L20 24 L32 6 L44 24 L60 12 L56 38 Z"/>
            <rect x="8" y="41" width="48" height="7" rx="2.5"/>
          </svg>
        `;
      }

      function syncViewModeUI() {
        const vm = state.viewMode || { detail: 'compact', layout: 'row' };
        document.querySelectorAll('.view-detail-btn').forEach(btn => {
          const active = btn.dataset.viewDetail === vm.detail;
          btn.classList.toggle('bg-[#111111]', active);
          btn.classList.toggle('text-[#F4D03F]', active);
          btn.classList.toggle('bg-white', !active);
          btn.classList.toggle('text-[#111111]', !active);
        });
        document.querySelectorAll('.view-layout-btn').forEach(btn => {
          const active = btn.dataset.viewLayout === vm.layout;
          btn.classList.toggle('bg-[#111111]', active);
          btn.classList.toggle('text-[#F4D03F]', active);
          btn.classList.toggle('bg-white', !active);
          btn.classList.toggle('text-[#111111]', !active);
        });
      }

      function renderLeaderboard(useFlip = true, preCapturedRects = null) {
        const vm = state.viewMode || { detail: 'compact', layout: 'row' };
        const detailMode = vm.detail || 'compact';
        const layoutMode = vm.layout || 'row';
        const hasActivity = state.activeGameAccordion !== null;

        // Auto-adapt layout, grid columns, and card density to match team count & available stage space.
        // pb-2.5 pr-2.5 preserves hard-offset card shadows without clipping.
        const teamCount = state.teams.length;
        const effectiveLayout = (layoutMode === 'grid' || teamCount > 3) ? 'grid' : 'row';
        let effectiveDetail = detailMode;
        if (hasActivity && teamCount >= 9) {
          effectiveDetail = 'simple';
        } else if ((hasActivity && teamCount >= 5) || (!hasActivity && teamCount >= 9)) {
          if (effectiveDetail === 'full') effectiveDetail = 'compact';
        }
        if (!hasActivity && teamCount >= 13) {
          effectiveDetail = 'simple';
        }

        const densityTier = teamCount >= 9 ? 'ultra' : (teamCount >= 5 ? 'dense' : 'normal');
        const stretchRows = !hasActivity && effectiveLayout !== 'grid' && teamCount <= 3;

        if (!hasActivity) {
          if (effectiveLayout === 'grid') {
            const colsClass = teamCount >= 10
              ? 'grid-cols-2 sm:grid-cols-3 xl:grid-cols-4'
              : (teamCount >= 7 ? 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2');
            const gapClass = densityTier === 'ultra' ? 'gap-2' : (densityTier === 'dense' ? 'gap-2.5' : 'gap-3 sm:gap-3.5');
            const overflowClass = teamCount >= 9 ? 'overflow-y-auto' : 'overflow-hidden';
            leaderboardListEl.className = `lg:col-span-8 grid ${colsClass} auto-rows-fr ${gapClass} min-h-0 ${overflowClass} pb-2.5 pr-2.5 bg-[#F8F6F0]/90`;
          } else {
            leaderboardListEl.className = 'lg:col-span-8 flex flex-col gap-3 sm:gap-3.5 min-h-0 overflow-hidden pb-2.5 pr-2.5 bg-[#F8F6F0]/90';
          }
        } else if (effectiveLayout === 'grid') {
          const colsClass = teamCount >= 9
            ? 'grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'
            : (teamCount > 3 ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-3');
          leaderboardListEl.className = `shrink-0 grid ${colsClass} gap-2 pb-2 pr-2 bg-[#F8F6F0]/90`;
        } else {
          leaderboardListEl.className = 'shrink-0 grid grid-cols-2 sm:grid-cols-3 lg:grid-flow-col lg:auto-cols-fr gap-2.5 sm:gap-3 pb-2 pr-2 bg-[#F8F6F0]/90';
        }

        const activeIds = new Set(state.teams.map(t => t.id));
        leaderboardListEl.querySelectorAll('.team-row').forEach(row => {
          if (!activeIds.has(row.dataset.teamId)) row.remove();
        });

        const firstRects = preCapturedRects ? { ...preCapturedRects } : {};
        if (!preCapturedRects && useFlip) {
          leaderboardListEl.querySelectorAll('.team-row').forEach(row => {
            firstRects[row.dataset.teamId] = row.getBoundingClientRect();
          });
        }

        const rankedTeams = state.teams
          .map((team, originalIndex) => ({
            ...team,
            originalIndex,
            total: getTeamTotal(team)
          }))
          .sort((a, b) => {
            if (b.total !== a.total) return b.total - a.total;
            return a.originalIndex - b.originalIndex;
          });

        const scaleMax = Math.max(...rankedTeams.map(t => t.total), 75);
        const activeTeamEditId = document.activeElement?.dataset?.editTeamId || null;

        rankedTeams.forEach((team, rankIdx) => {
          const rankNumber = rankIdx + 1;
          const isWinner = state.winnerAnnounced && rankIdx === 0 && team.total > 0;
          const barPercent = team.total <= 0 ? 0 : Math.min(100, (team.total / scaleMax) * 100);

          let rowEl = leaderboardListEl.querySelector(`[data-team-id="${team.id}"]`);
          const structureKey = `${effectiveDetail}:${state.games.length}:${densityTier}:${stretchRows ? 'stretch' : 'fit'}`;

          if (!rowEl || rowEl.dataset.structureKey !== structureKey) {
            if (!rowEl) {
              rowEl = document.createElement('article');
              rowEl.dataset.teamId = team.id;
            }
            rowEl.dataset.structureKey = structureKey;
            const padCls = densityTier === 'ultra' ? 'p-2 gap-1' : (densityTier === 'dense' ? 'p-2.5 gap-1.5' : 'p-3 sm:p-3.5 gap-2');
            rowEl.className = `team-row vox-card ${stretchRows ? 'flex-1' : ''} ${padCls} flex flex-col justify-center min-w-0`;

            const mascotCls = densityTier === 'ultra' ? 'w-7 h-7' : (effectiveDetail === 'full' ? 'w-10 h-10' : (densityTier === 'dense' ? 'w-8 h-8' : 'w-9 h-9'));
            const rankCls = densityTier === 'ultra' ? 'w-6 h-6 text-xs' : 'w-8 h-8 text-sm';
            const scoreCls = densityTier === 'ultra' ? 'text-base sm:text-lg' : (densityTier === 'dense' ? 'text-lg sm:text-xl' : 'text-xl sm:text-2xl');
            const barCls = densityTier === 'ultra' ? 'h-3.5' : (densityTier === 'dense' ? 'h-4 sm:h-5' : 'h-5 sm:h-6');

            if (effectiveDetail === 'simple') {
              rowEl.innerHTML = `
                <div class="winner-crown-bg">${getVoxCrownSvg('w-full h-full')}</div>
                <div class="relative z-10 flex items-center justify-between gap-2 min-w-0">
                  <div class="flex items-center gap-2 min-w-0 flex-1">
                    ${getTeamMascotSvg(team.originalIndex, team.color, mascotCls)}
                    <div class="min-w-0 flex-1">
                      <span class="crown-badge items-center gap-1 bg-white border border-[#111111] px-1.5 py-0.5 rounded font-display font-black text-[9px] text-[#111111]">${getVoxCrownSvg('w-3 h-3')} WIN</span>
                      <h2 class="team-name-el thai-safe font-display font-extrabold ${densityTier === 'ultra' ? 'text-xs sm:text-sm' : 'text-sm sm:text-base'} text-[#111111] truncate"></h2>
                    </div>
                  </div>
                  <div class="total-score-box relative shrink-0 flex items-center justify-center bg-[#F8F6F0] border-2 border-[#111111] rounded-lg ${densityTier === 'ultra' ? 'px-2 py-0.5 min-w-[2.5rem]' : 'px-2.5 py-1 min-w-[3rem]'} shadow-[2px_2px_0px_#111111]">
                    <div class="total-score-el tabular-nums font-display font-black ${densityTier === 'ultra' ? 'text-base sm:text-lg' : 'text-lg sm:text-xl'} text-[#111111] leading-none">0</div>
                  </div>
                </div>
              `;
            } else {
              const chipsHtml = effectiveDetail === 'full'
                ? `<div class="relative z-10 grid grid-cols-2 sm:grid-cols-3 gap-1 pt-0.5">
                    ${state.games.map((_, gIdx) => `
                      <div class="bg-[#F8F6F0] border border-[#111111] rounded-md px-1.5 py-0.5 flex items-center justify-between gap-1 text-[10px]">
                        <span class="flex items-center gap-1 min-w-0">
                          <span class="w-1.5 h-1.5 rounded-full shrink-0" style="background:${GAME_COLORS[gIdx % GAME_COLORS.length]}"></span>
                          <span class="game-chip-label-${gIdx} truncate font-semibold text-[#111111]/80"></span>
                        </span>
                        <span class="game-score-${gIdx} font-display font-black text-[#111111] shrink-0">0</span>
                      </div>
                    `).join('')}
                  </div>`
                : '';

              rowEl.innerHTML = `
                <div class="winner-crown-bg">${getVoxCrownSvg('w-full h-full')}</div>
                <div class="relative z-10 flex items-center justify-between gap-2 min-w-0">
                  <div class="flex items-center gap-2 min-w-0 flex-1">
                    <div class="rank-badge ${rankCls} rounded-lg border-2 border-[#111111] shadow-[2px_2px_0px_#111111] flex items-center justify-center font-display font-black shrink-0"></div>
                    ${getTeamMascotSvg(team.originalIndex, team.color, mascotCls)}
                    <div class="min-w-0 flex-1">
                      <span class="crown-badge items-center gap-1 bg-white border border-[#111111] px-1.5 py-0.5 rounded font-display font-black text-[9px] text-[#111111] tracking-wider">${getVoxCrownSvg('w-3 h-3')} WIN</span>
                      <h2 class="team-name-el thai-safe font-display font-extrabold ${densityTier === 'ultra' ? 'text-xs sm:text-sm' : 'text-sm sm:text-base'} text-[#111111] truncate"></h2>
                    </div>
                  </div>
                  <div class="total-score-box relative shrink-0 flex items-center justify-center bg-[#F8F6F0] border-2 border-[#111111] rounded-lg ${densityTier === 'ultra' ? 'px-2 py-0.5 min-w-[2.5rem]' : 'px-2.5 py-1 min-w-[3.25rem]'} shadow-[2px_2px_0px_#111111]">
                    <div class="total-score-el tabular-nums font-display font-black ${scoreCls} text-[#111111] leading-none tracking-tight">0</div>
                  </div>
                </div>
                <div class="relative z-10 w-full ${barCls} bg-[#F0EDE4] border-2 border-[#111111] rounded-lg overflow-hidden p-[3px]">
                  <div class="infographic-bar-fill h-full rounded-[4px]"></div>
                </div>
                ${chipsHtml}
              `;
            }
          }

          const isNewRow = !rowEl.parentElement;
          if (isNewRow) rowEl.classList.add('vox-stagger-in');
          const expectedChild = leaderboardListEl.children[rankIdx] || null;
          const needsDomMove = isNewRow || expectedChild !== rowEl;
          if (needsDomMove) {
            leaderboardListEl.insertBefore(rowEl, expectedChild);
          }

          rowEl.classList.toggle('is-winner', isWinner);
          rowEl.classList.toggle('is-leader', rankIdx === 0 && team.total > 0);

          const rankBadge = rowEl.querySelector('.rank-badge');
          if (rankBadge) {
            rankBadge.textContent = `#${rankNumber}`;
            rankBadge.style.backgroundColor = team.color;
            rankBadge.style.color = team.textColor;
          }

          const nameEl = rowEl.querySelector('.team-name-el');
          if (nameEl && activeTeamEditId !== team.id) {
            nameEl.textContent = team.name;
          }

          const barFill = rowEl.querySelector('.infographic-bar-fill');
          if (barFill) {
            const targetWidth = `${barPercent}%`;
            barFill.style.backgroundColor = team.color;
            barFill.style.borderRight = barPercent > 0 ? '2px solid #111111' : 'none';
            if (needsDomMove) {
              requestAnimationFrame(() => {
                barFill.style.width = targetWidth;
              });
            } else {
              barFill.style.width = targetWidth;
            }
          }

          if (detailMode === 'full') {
            state.games.forEach((gTitle, gIdx) => {
              const lbl = rowEl.querySelector(`.game-chip-label-${gIdx}`);
              const sc = rowEl.querySelector(`.game-score-${gIdx}`);
              if (lbl) lbl.textContent = gTitle;
              if (sc) sc.textContent = team.scores[gIdx] || 0;
            });
          }

          const prevTotal = displayedTotals[team.id] ?? team.total;
          const totalDelta = team.total - prevTotal;
          const totalEl = rowEl.querySelector('.total-score-el');
          const totalBoxEl = rowEl.querySelector('.total-score-box');
          if (useFlip && totalDelta !== 0) {
            spawnScoreDeltaPop(totalBoxEl, totalDelta);
            playScoreSound(totalDelta);
          }
          animateNumber(team.id, team.total, totalEl);
        });

        if ((useFlip || preCapturedRects) && Object.keys(firstRects).length > 0) {
          leaderboardListEl.querySelectorAll('.team-row').forEach(row => {
            const first = firstRects[row.dataset.teamId];
            if (!first) return;
            const last = row.getBoundingClientRect();
            const deltaX = first.left - last.left;
            const deltaY = first.top - last.top;

            if (Math.abs(deltaX) > 1 || Math.abs(deltaY) > 1) {
              row.style.transition = 'none';
              row.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
              row.getBoundingClientRect();
              row.style.transition = 'transform 0.78s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.42s ease';
              row.style.transform = 'translate(0, 0)';
            }
          });
        }
      }

      // ========================================================================
      // INLINE HEADER & GAME TITLE SYNCHRONIZATION
      // ========================================================================
      function syncMediaDots() {
        renderActivityList();
      }

      function syncHeaderTexts() {
        if (eventTitleEl && document.activeElement !== eventTitleEl) {
          eventTitleEl.textContent = state.eventTitle;
        }
        if (eventSubtitleEl && document.activeElement !== eventSubtitleEl) {
          eventSubtitleEl.textContent = state.eventSubtitle;
        }
        if (state.activeGameAccordion !== null && state.games[state.activeGameAccordion]) {
          if (accordionGameTitleEl) accordionGameTitleEl.textContent = state.games[state.activeGameAccordion];
          if (zoomModalTitleEl) zoomModalTitleEl.textContent = state.games[state.activeGameAccordion];
        }
        renderActivityList();
      }

      // ========================================================================
      // SCORE MUTATION HELPERS
      // ========================================================================
      function adjustTeamGameScore(teamId, gameIdx, delta) {
        const team = state.teams.find(t => t.id === teamId);
        if (!team) return;
        const idx = Math.max(0, Math.min(state.games.length - 1, Number(gameIdx) || 0));
        const cur = Number(team.scores[idx]) || 0;
        if (delta < 0 && cur === 0) {
          // If selected activity is 0, deduct from the highest-scoring activity so minus always works smoothly
          let bestIdx = idx;
          let bestVal = 0;
          team.scores.forEach((s, i) => {
            const v = Number(s) || 0;
            if (v > bestVal) { bestVal = v; bestIdx = i; }
          });
          team.scores[bestIdx] = Math.max(0, bestVal + delta);
        } else {
          team.scores[idx] = Math.max(0, cur + delta);
        }
        if (currentRole === 'stage') {
          saveAndBroadcast();
          renderLeaderboard(true);
          renderDrawerControls();
        } else {
          // Send atomic delta so concurrent mobile controllers never overwrite each other
          broadcastPayload({ type: 'ACTION', op: 'ADJUST_SCORE', teamId, gameIdx: idx, delta });
          if (!adminConnection?.open) saveAndBroadcast({ broadcast: false });
          renderAdminUI();
        }
      }

      function setTeamGameScore(teamId, gameIdx, exactVal) {
        const team = state.teams.find(t => t.id === teamId);
        if (!team) return;
        const value = Math.max(0, Number(exactVal) || 0);
        team.scores[gameIdx] = value;
        if (currentRole === 'stage') {
          saveAndBroadcast();
          renderLeaderboard(true);
          renderDrawerControls();
        } else {
          broadcastPayload({ type: 'ACTION', op: 'SET_SCORE', teamId, gameIdx, value });
          if (!adminConnection?.open) saveAndBroadcast({ broadcast: false });
          renderAdminUI();
        }
      }

      // ========================================================================
      // SHARED SCORE CONTROL CARD RENDERER & TWO-STEP SAFE RESET HELPER
      // ========================================================================
      let activeDrawerScoreGame = 0;

      function renderSingleGameScoreControls({ tabsEl, containerEl, attrPrefix, selectedGameIdx, onSelectGame }) {
        const safeGameIdx = Math.max(0, Math.min(state.games.length - 1, selectedGameIdx));
        if (tabsEl) {
          tabsEl.innerHTML = state.games.map((gTitle, gIdx) => {
            const active = safeGameIdx === gIdx;
            const isLiveOnStage = state.activeGameAccordion === gIdx;
            const dotColor = GAME_COLORS[gIdx % GAME_COLORS.length];
            return `
              <button
                type="button"
                data-${attrPrefix}-game-tab="${gIdx}"
                class="btn-vox flex-1 min-w-[6.5rem] ${active ? 'bg-[#111111] text-[#F4D03F]' : 'bg-white text-[#111111]'} font-display font-bold text-xs py-2 px-2.5 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span class="w-2.5 h-2.5 rounded-full border border-current shrink-0" style="background:${dotColor}"></span>
                <span class="truncate">${escapeHtml(gTitle)}</span>
                ${isLiveOnStage ? '<span class="w-1.5 h-1.5 rounded-full bg-[#E74C3C] shrink-0" title="กำลังเปิดบนจอ"></span>' : ''}
              </button>
            `;
          }).join('');
          tabsEl.querySelectorAll(`[data-${attrPrefix}-game-tab]`).forEach(btn => {
            btn.addEventListener('click', () => {
              onSelectGame(Number(btn.getAttribute(`data-${attrPrefix}-game-tab`)));
            });
          });
        }

        if (!containerEl) return;
        const gIdx = safeGameIdx;
        containerEl.innerHTML = state.teams.map((team, tIdx) => {
          const total = getTeamTotal(team);
          return `
            <div class="vox-card bg-white p-3.5 flex flex-col gap-2.5">
              <div class="flex items-center justify-between gap-2">
                <div class="flex items-center gap-2 min-w-0">
                  ${getTeamMascotSvg(tIdx, team.color, 'w-9 h-9')}
                  <h3 class="thai-safe-tight font-display font-extrabold text-base text-[#111111] truncate">${escapeHtml(team.name)}</h3>
                </div>
                <span class="font-display font-black text-sm bg-[#F8F6F0] border-2 border-[#111111] px-2.5 py-0.5 rounded-lg shrink-0">
                  รวม ${total}
                </span>
              </div>
              <div class="grid grid-cols-4 gap-1.5 items-center">
                <button type="button" data-${attrPrefix}-delta="${team.id}:${gIdx}:-5" class="btn-vox bg-white hover:bg-red-50 text-[#E74C3C] font-display font-extrabold text-sm py-2 rounded-xl cursor-pointer">-5</button>
                <input
                  type="number"
                  min="0"
                  value="${team.scores[gIdx]}"
                  data-${attrPrefix}-input="${team.id}:${gIdx}"
                  aria-label="คะแนน ${escapeHtml(team.name)} ${escapeHtml(state.games[gIdx])}"
                  class="w-full text-center font-display font-black text-base bg-[#F8F6F0] border-2 border-[#111111] rounded-xl py-1.5 text-[#111111]"
                />
                <button type="button" data-${attrPrefix}-delta="${team.id}:${gIdx}:5" class="btn-vox bg-white hover:bg-yellow-100 text-[#111111] font-display font-extrabold text-sm py-2 rounded-xl cursor-pointer">+5</button>
                <button type="button" data-${attrPrefix}-delta="${team.id}:${gIdx}:10" class="btn-vox bg-[#F4D03F] hover:bg-[#f2c61d] text-[#111111] font-display font-extrabold text-sm py-2 rounded-xl cursor-pointer">+10</button>
              </div>
            </div>
          `;
        }).join('');

        containerEl.querySelectorAll(`[data-${attrPrefix}-delta]`).forEach(btn => {
          btn.addEventListener('click', () => {
            const [teamId, gameIdx, delta] = btn.getAttribute(`data-${attrPrefix}-delta`).split(':');
            adjustTeamGameScore(teamId, Number(gameIdx), Number(delta));
          });
        });

        containerEl.querySelectorAll(`[data-${attrPrefix}-input]`).forEach(inp => {
          inp.addEventListener('change', () => {
            const [teamId, gameIdx] = inp.getAttribute(`data-${attrPrefix}-input`).split(':');
            setTeamGameScore(teamId, Number(gameIdx), inp.value);
          });
        });
      }

      function bindTwoStepReset(buttonEl, idleLabel, armedLabel, onConfirm) {
        if (!buttonEl) return;
        let armed = false;
        let timer = null;
        const disarm = () => {
          armed = false;
          buttonEl.textContent = idleLabel;
          buttonEl.classList.remove('bg-[#E74C3C]', 'text-white');
          buttonEl.classList.add('bg-white', 'text-[#E74C3C]');
        };
        buttonEl.addEventListener('click', () => {
          if (!armed) {
            armed = true;
            buttonEl.textContent = armedLabel;
            buttonEl.classList.add('bg-[#E74C3C]', 'text-white');
            buttonEl.classList.remove('bg-white', 'text-[#E74C3C]');
            timer = setTimeout(disarm, 3200);
            return;
          }
          clearTimeout(timer);
          disarm();
          onConfirm();
        });
      }

      function renderDrawerControls() {
        const gameCountBadge = document.getElementById('drawer-game-count-badge');
        const addGameBtn = document.getElementById('drawer-add-game-btn');
        const remGameBtn = document.getElementById('drawer-remove-game-btn');
        if (gameCountBadge) gameCountBadge.textContent = `${state.games.length} กิจกรรม`;
        if (addGameBtn) {
          addGameBtn.disabled = state.games.length >= 6;
          addGameBtn.classList.toggle('opacity-45', addGameBtn.disabled);
        }
        if (remGameBtn) {
          remGameBtn.disabled = state.games.length <= 1;
          remGameBtn.classList.toggle('opacity-45', remGameBtn.disabled);
        }

        const countBadge = document.getElementById('drawer-team-count-badge');
        const addBtn = document.getElementById('drawer-add-team-btn');
        const remBtn = document.getElementById('drawer-remove-team-btn');
        if (countBadge) countBadge.textContent = `${state.teams.length} ทีม`;
        if (addBtn) {
          addBtn.disabled = state.teams.length >= 8;
          addBtn.classList.toggle('opacity-45', addBtn.disabled);
        }
        if (remBtn) {
          remBtn.disabled = state.teams.length <= 2;
          remBtn.classList.toggle('opacity-45', remBtn.disabled);
        }

        const titleInp = document.getElementById('drawer-input-event-title');
        const subInp = document.getElementById('drawer-input-event-subtitle');
        if (titleInp && document.activeElement !== titleInp) titleInp.value = state.eventTitle;
        if (subInp && document.activeElement !== subInp) subInp.value = state.eventSubtitle;

        const gameNamesWrap = document.getElementById('drawer-game-names-inputs');
        if (gameNamesWrap && !gameNamesWrap.contains(document.activeElement)) {
          gameNamesWrap.innerHTML = state.games.map((g, idx) => `
            <input type="text" data-drawer-game-name="${idx}" value="${escapeHtml(g)}" class="thai-safe-tight bg-[#F8F6F0] border-2 border-[#111111] rounded-xl px-2.5 py-1.5 font-bold text-xs" />
          `).join('');
          gameNamesWrap.querySelectorAll('[data-drawer-game-name]').forEach(inp => {
            inp.addEventListener('change', () => {
              const idx = Number(inp.dataset.drawerGameName);
              state.games[idx] = inp.value.trim() || `Activity ${idx + 1}`;
              saveAndBroadcast();
              syncHeaderTexts();
              renderLeaderboard(false);
              renderDrawerControls();
            });
          });
        }

        const teamNamesWrap = document.getElementById('drawer-team-names-inputs');
        if (teamNamesWrap && !teamNamesWrap.contains(document.activeElement)) {
          teamNamesWrap.innerHTML = state.teams.map((t, idx) => `
            <div class="flex items-center gap-1.5">
              ${getTeamMascotSvg(idx, t.color, 'w-6 h-6')}
              <input type="text" data-drawer-team-name="${idx}" value="${escapeHtml(t.name)}" class="thai-safe-tight flex-1 min-w-0 bg-[#F8F6F0] border-2 border-[#111111] rounded-xl px-2.5 py-1.5 font-bold text-xs" />
            </div>
          `).join('');
          teamNamesWrap.querySelectorAll('[data-drawer-team-name]').forEach(inp => {
            inp.addEventListener('change', () => {
              const idx = Number(inp.dataset.drawerTeamName);
              state.teams[idx].name = inp.value.trim() || `Team ${idx + 1}`;
              saveAndBroadcast();
              renderLeaderboard(false);
              renderDrawerControls();
            });
          });
        }

        renderSingleGameScoreControls({
          tabsEl: document.getElementById('drawer-score-game-tabs'),
          containerEl: drawerTeamsGrid,
          attrPrefix: 'drawer',
          selectedGameIdx: activeDrawerScoreGame,
          onSelectGame: (gIdx) => {
            activeDrawerScoreGame = gIdx;
            renderDrawerControls();
          }
        });
      }

      const drawerTitleInp = document.getElementById('drawer-input-event-title');
      const drawerSubInp = document.getElementById('drawer-input-event-subtitle');
      if (drawerTitleInp) {
        drawerTitleInp.addEventListener('change', () => {
          state.eventTitle = drawerTitleInp.value.trim() || defaultState.eventTitle;
          saveAndBroadcast();
          syncHeaderTexts();
        });
      }
      if (drawerSubInp) {
        drawerSubInp.addEventListener('change', () => {
          state.eventSubtitle = drawerSubInp.value.trim() || defaultState.eventSubtitle;
          saveAndBroadcast();
          syncHeaderTexts();
        });
      }

      const drawerAddGameBtn = document.getElementById('drawer-add-game-btn');
      const drawerRemoveGameBtn = document.getElementById('drawer-remove-game-btn');
      if (drawerAddGameBtn) {
        drawerAddGameBtn.addEventListener('click', () => {
          if (state.games.length >= 6) return;
          const idx = state.games.length;
          state.games.push(`Activity ${idx + 1}`);
          state.gameMedia.push({ description: '', youtubeUrl: '', imageData: '', activeMediaType: 'video' });
          state.teams.forEach(t => t.scores.push(0));
          saveAndBroadcast();
          syncHeaderTexts();
          renderDrawerControls();
        });
      }
      if (drawerRemoveGameBtn) {
        drawerRemoveGameBtn.addEventListener('click', () => {
          if (state.games.length <= 1) return;
          state.games.pop();
          state.gameMedia.pop();
          state.teams.forEach(t => t.scores.pop());
          if (state.activeGameAccordion !== null && state.activeGameAccordion >= state.games.length) {
            state.activeGameAccordion = null;
            state.isActivityFocused = false;
            state.isMediaZoomed = false;
          }
          if (activeDrawerScoreGame >= state.games.length) {
            activeDrawerScoreGame = state.games.length - 1;
          }
          saveAndBroadcast();
          syncHeaderTexts();
          syncAccordionFromState();
          renderLeaderboard(true);
          renderDrawerControls();
        });
      }

      const drawerAddTeamBtn = document.getElementById('drawer-add-team-btn');
      const drawerRemoveTeamBtn = document.getElementById('drawer-remove-team-btn');
      if (drawerAddTeamBtn) {
        drawerAddTeamBtn.addEventListener('click', () => {
          if (state.teams.length >= 8) return;
          const usedColors = new Set(state.teams.map(t => (t.color || '').toUpperCase()));
          const pal = TEAM_PALETTE.find(p => !usedColors.has(p.color.toUpperCase())) || TEAM_PALETTE[state.teams.length % TEAM_PALETTE.length];
          const usedNames = new Set(state.teams.map(t => (t.name || '').trim().toLowerCase()));
          let num = 1;
          while (usedNames.has(`team ${num}`)) num++;
          const newTeam = {
            id: `team-${Date.now().toString(36)}`,
            name: `Team ${num}`,
            color: pal.color,
            textColor: pal.textColor,
            scores: state.games.map(() => 0)
          };
          state.teams.push(newTeam);
          displayedTotals[newTeam.id] = 0;
          saveAndBroadcast();
          renderLeaderboard(true);
          renderDrawerControls();
        });
      }
      if (drawerRemoveTeamBtn) {
        drawerRemoveTeamBtn.addEventListener('click', () => {
          if (state.teams.length <= 2) return;
          const removed = state.teams.pop();
          if (removed) delete displayedTotals[removed.id];
          saveAndBroadcast();
          renderLeaderboard(true);
          renderDrawerControls();
        });
      }

      // View Level & Layout Popover Controls
      const viewSettingsBtn = document.getElementById('view-settings-btn');
      const viewSettingsPopover = document.getElementById('view-settings-popover');
      if (viewSettingsBtn && viewSettingsPopover) {
        viewSettingsBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const isHidden = viewSettingsPopover.classList.contains('hidden');
          viewSettingsPopover.classList.toggle('hidden', !isHidden);
          viewSettingsPopover.classList.toggle('flex', isHidden);
          viewSettingsBtn.setAttribute('aria-expanded', String(isHidden));
        });
        document.addEventListener('click', (e) => {
          if (!viewSettingsPopover.contains(e.target) && e.target !== viewSettingsBtn) {
            viewSettingsPopover.classList.add('hidden');
            viewSettingsPopover.classList.remove('flex');
            viewSettingsBtn.setAttribute('aria-expanded', 'false');
          }
        });
      }

      document.querySelectorAll('[data-view-detail]').forEach(btn => {
        btn.addEventListener('click', () => {
          state.viewMode.detail = btn.dataset.viewDetail;
          saveAndBroadcast();
          syncViewModeUI();
          renderLeaderboard(true);
        });
      });

      document.querySelectorAll('[data-view-layout]').forEach(btn => {
        btn.addEventListener('click', () => {
          state.viewMode.layout = btn.dataset.viewLayout;
          saveAndBroadcast();
          syncViewModeUI();
          renderLeaderboard(true);
        });
      });

      let isDrawerOpen = false;
      function setDrawerOpen() {
        isDrawerOpen = false;
        if (drawerEl) drawerEl.classList.add('hidden');
      }

      if (drawerToggleBtn) drawerToggleBtn.addEventListener('click', () => setDrawerOpen());
      if (btnCloseDrawer) btnCloseDrawer.addEventListener('click', () => setDrawerOpen());

      if (btnWinner) {
        btnWinner.addEventListener('click', () => {
          state.winnerAnnounced = !state.winnerAnnounced;
          state.winnerAnnouncedAt = state.winnerAnnounced ? Date.now() : 0;
          saveAndBroadcast();
          renderLeaderboard(true);
          if (state.winnerAnnounced) triggerVictorySequence();
          else hideVictorySpotlight();
        });
      }

      if (btnReset) {
        bindTwoStepReset(btnReset, 'รีเซ็ตคะแนน', 'กดอีกครั้งเพื่อยืนยันรีเซ็ต', () => {
          state.teams.forEach(t => { t.scores = [0, 0, 0]; });
          state.winnerAnnounced = false;
          saveAndBroadcast();
          renderLeaderboard(true);
          renderDrawerControls();
        });
      }

      // Keyboard Shortcuts (Esc steps back: Popover -> Victory -> Center Timer -> Zoom -> Focus -> Accordion; Space toggles center timer)
      window.addEventListener('keydown', (e) => {
        if (e.code === 'Space' && !e.target.closest('input, textarea, select, button, a, [contenteditable="true"]')) {
          if (state.timer?.visible && state.timer?.mode === 'center') {
            e.preventDefault();
            document.getElementById('center-timer-toggle-btn')?.click();
            return;
          }
        }
        if (e.key === 'Escape') {
          if (viewSettingsPopover && !viewSettingsPopover.classList.contains('hidden')) {
            viewSettingsPopover.classList.add('hidden');
            viewSettingsPopover.classList.remove('flex');
            viewSettingsBtn?.setAttribute('aria-expanded', 'false');
            return;
          }
          if (document.getElementById('victory-celebration-overlay') || document.getElementById('victory-drumroll-overlay')) {
            dismissVictorySpotlight();
            return;
          }
          if (state.timer?.visible && state.timer?.mode === 'center') {
            state.timer.mode = 'corner';
            state.timer.timerVersion = Date.now();
            saveAndBroadcast();
            renderTimerUI();
            return;
          }
          if (state.isMediaZoomed) {
            setTheaterZoom(false);
            return;
          }
          if (state.isActivityFocused) {
            state.isActivityFocused = false;
            syncNativeFullscreen(false);
            saveAndBroadcast();
            syncActivityFocusLayout();
            return;
          }
          if (state.activeGameAccordion !== null) {
            state.activeGameAccordion = null;
            saveAndBroadcast();
            syncAccordionFromState();
          }
        }
      });

      // ========================================================================
      // MOBILE BACKSTAGE ADMIN VIEW (?role=admin&room=XXXX)
      // ========================================================================
      let activeAdminTab = 'scores';
      let activeAdminScoreGame = 0;
      let activeAdminEditorGame = 0;

      function setAdminTab(tabName) {
        activeAdminTab = tabName;
        document.querySelectorAll('.admin-tab-btn').forEach(btn => {
          const active = btn.dataset.adminTab === tabName;
          btn.classList.toggle('bg-[#F4D03F]', active);
          btn.classList.toggle('bg-white', !active);
        });
        document.getElementById('admin-panel-scores').classList.toggle('hidden', tabName !== 'scores');
        document.getElementById('admin-panel-scores').classList.toggle('flex', tabName === 'scores');
        document.getElementById('admin-panel-stage-media').classList.toggle('hidden', tabName !== 'stage-media');
        document.getElementById('admin-panel-stage-media').classList.toggle('flex', tabName === 'stage-media');
        document.getElementById('admin-panel-names').classList.toggle('hidden', tabName !== 'names');
        document.getElementById('admin-panel-names').classList.toggle('flex', tabName === 'names');
      }

      document.querySelectorAll('.admin-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => setAdminTab(btn.dataset.adminTab));
      });

      function sendAdminVideoCommand(action) {
        const idx = state.activeGameAccordion;
        if (idx === null) return;
        const media = state.gameMedia[idx];
        if (!media || !extractYouTubeId(media.youtubeUrl)) return;

        // If stage is currently displaying Image/GIF, switch to Video first
        if (resolveActiveMediaType(media) !== 'video') {
          media.activeMediaType = 'video';
          saveAndBroadcast();
          renderAdminUI();
        }

        broadcastPayload({ type: 'VIDEO_COMMAND', action, gameIdx: idx });
      }

      function renderAdminScoreCards() {
        renderSingleGameScoreControls({
          tabsEl: document.getElementById('admin-score-game-tabs'),
          containerEl: document.getElementById('admin-teams-container'),
          attrPrefix: 'admin',
          selectedGameIdx: activeAdminScoreGame,
          onSelectGame: (gIdx) => {
            activeAdminScoreGame = gIdx;
            renderAdminScoreCards();
          }
        });
      }

      function renderAdminUI() {
        // Tab 1: Teams Scoring Cards (1 game at a time)
        renderAdminScoreCards();

        // Tab 2: Remote Accordion Open/Close (Compact 3-pill row)
        const accBtnsEl = document.getElementById('admin-remote-accordion-btns');
        if (accBtnsEl) {
          accBtnsEl.innerHTML = [0, 1, 2].map(idx => {
            const isOpen = state.activeGameAccordion === idx;
            return `
              <button
                type="button"
                data-admin-toggle-acc="${idx}"
                class="btn-vox ${isOpen ? 'bg-[#111111] text-[#F4D03F]' : 'bg-[#F8F6F0] text-[#111111]'} font-display font-bold text-xs py-2 px-2 rounded-xl flex items-center justify-center gap-1 cursor-pointer"
              >
                <span class="w-2 h-2 rounded-full border border-current shrink-0" style="background:${GAME_COLORS[idx]}"></span>
                <span class="truncate">${escapeHtml(state.games[idx])}</span>
              </button>
            `;
          }).join('');

          accBtnsEl.querySelectorAll('[data-admin-toggle-acc]').forEach(btn => {
            btn.addEventListener('click', () => {
              const idx = Number(btn.dataset.adminToggleAcc);
              if (state.activeGameAccordion === idx) {
                state.activeGameAccordion = null;
                state.isMediaZoomed = false;
              } else {
                state.activeGameAccordion = idx;
                activeAdminScoreGame = idx; // Auto-follow active stage game in Tab 1
              }
              saveAndBroadcast();
              renderAdminUI();
            });
          });
        }

        // Sync Video <-> Image/GIF, Zoom & Playback Buttons in Tab 2 (Contextual + Smooth Collapse)
        const activeIdx = state.activeGameAccordion;
        const activeMedia = activeIdx !== null ? (state.gameMedia[activeIdx] || {}) : {};
        const hasYt = Boolean(extractYouTubeId(activeMedia.youtubeUrl));
        const hasImg = Boolean((activeMedia.imageData || '').trim());
        const hasAnyMedia = hasYt || hasImg;
        const hasBothMedia = hasYt && hasImg;
        const resolvedType = resolveActiveMediaType(activeMedia);

        const mediaWrapEl = document.getElementById('admin-media-actions-wrap');
        const mediaGridEl = document.getElementById('admin-media-actions-grid');
        if (mediaWrapEl) {
          mediaWrapEl.classList.toggle('is-open', activeIdx !== null && hasAnyMedia);
        }
        if (mediaGridEl) {
          mediaGridEl.classList.toggle('grid-cols-3', hasBothMedia);
          mediaGridEl.classList.toggle('grid-cols-1', !hasBothMedia);
        }

        const switchVideoBtn = document.getElementById('admin-switch-video-btn');
        const switchImageBtn = document.getElementById('admin-switch-image-btn');
        const toggleZoomBtn = document.getElementById('admin-toggle-zoom-btn');
        const zoomBadgeEl = document.getElementById('admin-live-zoom-badge');
        const zoomBtnIconEl = document.getElementById('admin-zoom-btn-icon');
        const zoomBtnTextEl = document.getElementById('admin-zoom-btn-text');

        if (switchVideoBtn) {
          const isVideoActive = activeIdx !== null && hasYt && resolvedType === 'video';
          switchVideoBtn.classList.toggle('hidden', !hasBothMedia);
          switchVideoBtn.classList.toggle('flex', hasBothMedia);
          switchVideoBtn.classList.toggle('bg-[#111111]', isVideoActive);
          switchVideoBtn.classList.toggle('text-[#F4D03F]', isVideoActive);
          switchVideoBtn.classList.toggle('bg-white', !isVideoActive);
          switchVideoBtn.classList.toggle('text-[#111111]', !isVideoActive);
        }

        if (switchImageBtn) {
          const isImageActive = activeIdx !== null && hasImg && resolvedType === 'image';
          switchImageBtn.classList.toggle('hidden', !hasBothMedia);
          switchImageBtn.classList.toggle('flex', hasBothMedia);
          switchImageBtn.classList.toggle('bg-[#111111]', isImageActive);
          switchImageBtn.classList.toggle('text-[#F4D03F]', isImageActive);
          switchImageBtn.classList.toggle('bg-white', !isImageActive);
          switchImageBtn.classList.toggle('text-[#111111]', !isImageActive);
        }

        if (toggleZoomBtn) {
          const canZoom = activeIdx !== null && hasAnyMedia;
          toggleZoomBtn.disabled = !canZoom;
          toggleZoomBtn.classList.toggle('opacity-45', !canZoom);
          if (state.isMediaZoomed && canZoom) {
            toggleZoomBtn.classList.remove('bg-[#F4D03F]', 'text-[#111111]');
            toggleZoomBtn.classList.add('bg-[#E74C3C]', 'text-white');
            if (zoomBtnIconEl) zoomBtnIconEl.textContent = '🗕';
            if (zoomBtnTextEl) zoomBtnTextEl.textContent = hasBothMedia ? 'ย่อ' : 'ย่อสื่อกลับปกติ';
            if (zoomBadgeEl) {
              zoomBadgeEl.textContent = '🔍 กำลังซูม';
              zoomBadgeEl.className = 'text-[11px] font-display font-bold px-2 py-0.5 rounded-md border border-[#111111] bg-[#F4D03F] text-[#111111]';
            }
          } else {
            toggleZoomBtn.classList.add('bg-[#F4D03F]', 'text-[#111111]');
            toggleZoomBtn.classList.remove('bg-[#E74C3C]', 'text-white');
            if (zoomBtnIconEl) zoomBtnIconEl.textContent = '🔍';
            if (zoomBtnTextEl) zoomBtnTextEl.textContent = hasBothMedia ? 'ซูม' : '🔍 ซูมขยายเต็มจอ';
            if (zoomBadgeEl) {
              zoomBadgeEl.textContent = activeIdx !== null ? 'ปกติ' : 'ปิดอยู่';
              zoomBadgeEl.className = 'text-[11px] font-display font-bold px-2 py-0.5 rounded-md border border-[#111111] bg-[#F8F6F0] text-[#111111]';
            }
          }
        }

        // Sync Video Playback Control Buttons (Smoothly reveals only when active game has YouTube)
        const canControlVideo = activeIdx !== null && hasYt;
        const videoWrapEl = document.getElementById('admin-video-controls-wrap');
        if (videoWrapEl) {
          videoWrapEl.classList.toggle('is-open', canControlVideo);
        }
        const muteIconEl = document.getElementById('admin-video-mute-icon');
        const muteLabelEl = document.getElementById('admin-video-mute-label');
        const muteBtnEl = document.getElementById('admin-video-mute-btn');
        if (muteIconEl && muteLabelEl && muteBtnEl) {
          muteIconEl.textContent = state.isVideoMuted ? '🔇' : '🔊';
          muteLabelEl.textContent = state.isVideoMuted ? 'ปิด' : 'เสียง';
          muteBtnEl.classList.toggle('bg-[#E74C3C]', state.isVideoMuted);
          muteBtnEl.classList.toggle('text-white', state.isVideoMuted);
          muteBtnEl.classList.toggle('bg-white', !state.isVideoMuted);
          muteBtnEl.classList.toggle('text-[#111111]', !state.isVideoMuted);
        }

        // Tab 2: Background Music (BGM) 3 Compact Slot Pills + 1 Active URL Input (focus-safe)
        const bgmSlotsEl = document.getElementById('admin-bgm-slots-container');
        if (bgmSlotsEl && !bgmSlotsEl.contains(document.activeElement)) {
          const activeTrack = state.bgmTracks[state.activeBgmSlot] || { label: `เพลงที่ ${state.activeBgmSlot + 1}`, url: '' };
          bgmSlotsEl.innerHTML = `
            <div class="grid grid-cols-3 gap-1.5">
              ${[0, 1, 2].map(idx => {
                const tr = state.bgmTracks[idx] || { url: '' };
                const isActive = state.activeBgmSlot === idx;
                const hasUrl = Boolean((tr.url || '').trim());
                return `
                  <button
                    type="button"
                    data-admin-bgm-select="${idx}"
                    class="btn-vox ${isActive ? 'bg-[#111111] text-[#F4D03F]' : 'bg-[#F8F6F0] text-[#111111]'} font-display font-bold text-xs py-1.5 px-2 rounded-xl flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span>${hasUrl ? '●' : '○'}</span>
                    <span>ช่อง ${idx + 1}</span>
                  </button>
                `;
              }).join('')}
            </div>
            <input
              type="url"
              data-admin-bgm-url="${state.activeBgmSlot}"
              value="${escapeHtml(activeTrack.url)}"
              placeholder="วางลิงก์ YouTube หรือ .mp3 (ช่อง ${state.activeBgmSlot + 1})"
              class="w-full bg-[#F8F6F0] border-2 border-[#111111] rounded-xl px-2.5 py-1.5 text-xs font-medium text-[#111111] focus:outline-none focus:bg-white"
            />
          `;

          bgmSlotsEl.querySelectorAll('[data-admin-bgm-select]').forEach(btn => {
            btn.addEventListener('click', () => {
              const idx = Number(btn.dataset.adminBgmSelect);
              state.activeBgmSlot = idx;
              saveAndBroadcast();
              broadcastPayload({ type: 'BGM_COMMAND', activeBgmSlot: idx });
              renderAdminUI();
            });
          });

          bgmSlotsEl.querySelectorAll('[data-admin-bgm-url]').forEach(inp => {
            inp.addEventListener('change', () => {
              const idx = Number(inp.dataset.adminBgmUrl);
              state.bgmTracks[idx].url = inp.value.trim();
              saveAndBroadcast();
              renderAdminUI();
            });
          });
        }

        const activeBgmUrl = (state.bgmTracks[state.activeBgmSlot]?.url || '').trim();
        const bgmBadgeEl = document.getElementById('admin-bgm-status-badge');
        const bgmPlayBtn = document.getElementById('admin-bgm-toggle-play-btn');
        const bgmPlayIcon = document.getElementById('admin-bgm-play-icon');
        const bgmPlayLabel = document.getElementById('admin-bgm-play-label');
        const bgmMuteBtn = document.getElementById('admin-bgm-mute-btn');
        const bgmMuteIcon = document.getElementById('admin-bgm-mute-icon');
        const bgmSlider = document.getElementById('admin-bgm-volume-slider');
        const bgmVolVal = document.getElementById('admin-bgm-volume-value');

        if (bgmBadgeEl) {
          if (state.bgmPlaying && activeBgmUrl) {
            bgmBadgeEl.textContent = `▶ ช่อง ${state.activeBgmSlot + 1}`;
            bgmBadgeEl.className = 'text-[11px] font-display font-bold px-2 py-0.5 rounded-md border border-[#111111] bg-[#F4D03F] text-[#111111] shrink-0';
          } else {
            bgmBadgeEl.textContent = activeBgmUrl ? 'หยุดอยู่' : 'ว่าง';
            bgmBadgeEl.className = 'text-[11px] font-display font-bold px-2 py-0.5 rounded-md border border-[#111111] bg-[#F8F6F0] text-[#111111] shrink-0';
          }
        }
        if (bgmPlayBtn && bgmPlayIcon && bgmPlayLabel) {
          bgmPlayBtn.disabled = !activeBgmUrl;
          bgmPlayBtn.classList.toggle('opacity-45', !activeBgmUrl);
          bgmPlayIcon.textContent = state.bgmPlaying ? '⏸' : '▶';
          bgmPlayLabel.textContent = state.bgmPlaying ? 'หยุดเพลง' : 'เปิดเพลง';
          bgmPlayBtn.classList.toggle('bg-[#111111]', state.bgmPlaying);
          bgmPlayBtn.classList.toggle('text-[#F4D03F]', state.bgmPlaying);
          bgmPlayBtn.classList.toggle('bg-[#F4D03F]', !state.bgmPlaying);
          bgmPlayBtn.classList.toggle('text-[#111111]', !state.bgmPlaying);
        }
        if (bgmMuteBtn && bgmMuteIcon) {
          bgmMuteIcon.textContent = state.bgmMuted ? '🔇' : '🔊';
          bgmMuteBtn.classList.toggle('bg-[#E74C3C]', state.bgmMuted);
          bgmMuteBtn.classList.toggle('text-white', state.bgmMuted);
          bgmMuteBtn.classList.toggle('bg-white', !state.bgmMuted);
          bgmMuteBtn.classList.toggle('text-[#111111]', !state.bgmMuted);
        }
        if (bgmSlider) bgmSlider.value = state.bgmVolume;
        if (bgmVolVal) bgmVolVal.textContent = `${state.bgmVolume}%`;

        const mediaEditorsEl = document.getElementById('admin-media-editors');
        if (mediaEditorsEl && !mediaEditorsEl.contains(document.activeElement)) {
          const idx = activeAdminEditorGame;
          const m = state.gameMedia[idx] || { description: '', youtubeUrl: '', imageData: '', activeMediaType: 'video' };
          mediaEditorsEl.innerHTML = `
            <div class="grid grid-cols-3 gap-1.5">
              ${[0, 1, 2].map(gIdx => `
                <button
                  type="button"
                  data-admin-editor-game="${gIdx}"
                  class="btn-vox ${idx === gIdx ? 'bg-[#111111] text-[#F4D03F]' : 'bg-[#F8F6F0] text-[#111111]'} font-display font-bold text-xs py-1.5 px-2 rounded-xl truncate cursor-pointer"
                >
                  ${escapeHtml(state.games[gIdx])}
                </button>
              `).join('')}
            </div>
            <input
              type="text"
              data-admin-game-title="${idx}"
              value="${escapeHtml(state.games[idx])}"
              placeholder="ชื่อเกมที่ ${idx + 1}"
              class="thai-safe-tight w-full bg-[#F8F6F0] border-2 border-[#111111] rounded-xl px-3 py-1.5 font-bold text-sm"
            />
            <textarea
              rows="2"
              data-admin-desc="${idx}"
              placeholder="คำอธิบาย / กติกาเกม..."
              class="thai-safe w-full bg-[#F8F6F0] border-2 border-[#111111] rounded-xl px-3 py-1.5 text-sm"
            >${escapeHtml(m.description)}</textarea>
            <input
              type="url"
              data-admin-yt="${idx}"
              value="${escapeHtml(m.youtubeUrl)}"
              placeholder="ลิงก์ YouTube (ถ้ามี)"
              class="w-full bg-[#F8F6F0] border-2 border-[#111111] rounded-xl px-3 py-1.5 text-sm"
            />
            <div class="flex items-center gap-2">
              <input
                type="text"
                data-admin-img="${idx}"
                value="${escapeHtml(m.imageData)}"
                placeholder="ลิงก์รูปภาพ / GIF (URL)"
                class="flex-1 bg-[#F8F6F0] border-2 border-[#111111] rounded-xl px-3 py-1.5 text-sm"
              />
              <label class="btn-vox bg-[#F4D03F] text-[#111111] font-display font-bold text-xs px-3 py-1.5 rounded-xl cursor-pointer shrink-0">
                📁 รูป/GIF
                <input type="file" accept="image/*,.gif" data-admin-file="${idx}" class="hidden" />
              </label>
            </div>
          `;

          mediaEditorsEl.querySelectorAll('[data-admin-editor-game]').forEach(btn => {
            btn.addEventListener('click', () => {
              activeAdminEditorGame = Number(btn.dataset.adminEditorGame);
              renderAdminUI();
            });
          });
          mediaEditorsEl.querySelectorAll('[data-admin-game-title]').forEach(inp => {
            inp.addEventListener('change', () => {
              const gIdx = Number(inp.dataset.adminGameTitle);
              state.games[gIdx] = inp.value.trim() || defaultState.games[gIdx];
              saveAndBroadcast();
              renderAdminUI();
            });
          });
          mediaEditorsEl.querySelectorAll('[data-admin-desc]').forEach(el => {
            el.addEventListener('change', () => {
              const gIdx = Number(el.dataset.adminDesc);
              state.gameMedia[gIdx].description = el.value.trim();
              saveAndBroadcast();
            });
          });
          mediaEditorsEl.querySelectorAll('[data-admin-yt]').forEach(el => {
            el.addEventListener('change', () => {
              const gIdx = Number(el.dataset.adminYt);
              state.gameMedia[gIdx].youtubeUrl = el.value.trim();
              state.gameMedia[gIdx].activeMediaType = resolveActiveMediaType(state.gameMedia[gIdx]);
              saveAndBroadcast();
              renderAdminUI();
            });
          });
          mediaEditorsEl.querySelectorAll('[data-admin-img]').forEach(el => {
            el.addEventListener('change', () => {
              const gIdx = Number(el.dataset.adminImg);
              state.gameMedia[gIdx].imageData = el.value.trim();
              state.gameMedia[gIdx].activeMediaType = resolveActiveMediaType(state.gameMedia[gIdx]);
              saveAndBroadcast();
              renderAdminUI();
            });
          });
          mediaEditorsEl.querySelectorAll('[data-admin-file]').forEach(el => {
            el.addEventListener('change', (e) => {
              const file = e.target.files?.[0];
              const gIdx = Number(el.dataset.adminFile);
              if (!file) return;
              compressImageFile(file, (dataUrl) => {
                state.gameMedia[gIdx].imageData = dataUrl;
                state.gameMedia[gIdx].activeMediaType = resolveActiveMediaType(state.gameMedia[gIdx]);
                saveAndBroadcast();
                renderAdminUI();
              });
            });
          });
        }

        // Tab 3: Event Title, Subtitle & Team Names
        const adminEventInput = document.getElementById('admin-input-event-title');
        if (adminEventInput && document.activeElement !== adminEventInput) {
          adminEventInput.value = state.eventTitle;
        }
        const adminSubInput = document.getElementById('admin-input-event-subtitle');
        if (adminSubInput && document.activeElement !== adminSubInput) {
          adminSubInput.value = state.eventSubtitle;
        }

        const teamInputsWrap = document.getElementById('admin-team-names-inputs');
        if (teamInputsWrap && !teamInputsWrap.contains(document.activeElement)) {
          teamInputsWrap.innerHTML = state.teams.map((t, idx) => `
            <div class="flex items-center gap-2">
              ${getTeamMascotSvg(idx, t.color, 'w-9 h-9')}
              <input type="text" data-admin-team-name="${idx}" value="${escapeHtml(t.name)}" class="thai-safe-tight flex-1 bg-[#F8F6F0] border-2 border-[#111111] rounded-xl px-3 py-1.5 font-bold text-sm" />
            </div>
          `).join('');
          teamInputsWrap.querySelectorAll('[data-admin-team-name]').forEach(inp => {
            inp.addEventListener('change', () => {
              const idx = Number(inp.dataset.adminTeamName);
              state.teams[idx].name = inp.value.trim() || `กลุ่มที่ ${idx + 1}`;
              saveAndBroadcast();
              renderAdminUI();
            });
          });
        }

        renderTimerUI();
      }

      // Admin Static Event Listeners (Timer, Video/Image Switch, Zoom & Playback Controls)
      const onClick = (id, handler) => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('click', handler);
        return el;
      };

      const updateTimerState = (mutator) => {
        mutator(state.timer);
        state.timer.timerVersion = Date.now();
        saveAndBroadcast();
        renderTimerUI();
      };

      document.querySelectorAll('[data-timer-preset]').forEach(btn => {
        btn.addEventListener('click', () => {
          const sec = Math.max(10, Number(btn.dataset.timerPreset) || 180);
          updateTimerState(t => {
            t.durationSec = sec;
            t.remainingSec = sec;
            t.running = false;
            t.endAt = null;
          });
        });
      });

      onClick('admin-timer-minus30', () => {
        const next = Math.max(0, getLiveRemainingSec() - 30);
        updateTimerState(t => {
          t.remainingSec = next;
          if (!t.running) t.durationSec = Math.max(10, next);
          else if (next > 0) t.endAt = Date.now() + next * 1000;
          else { t.running = false; t.endAt = null; }
        });
      });

      onClick('admin-timer-plus30', () => {
        const next = getLiveRemainingSec() + 30;
        updateTimerState(t => {
          t.remainingSec = next;
          if (!t.running) t.durationSec = next;
          else t.endAt = Date.now() + next * 1000;
        });
      });

      onClick('admin-timer-toggle-btn', () => {
        updateTimerState(t => {
          if (t.running) {
            t.remainingSec = getLiveRemainingSec();
            t.running = false;
            t.endAt = null;
          } else {
            let rem = getLiveRemainingSec();
            if (rem <= 0) rem = t.durationSec || 180;
            t.remainingSec = rem;
            t.running = true;
            t.endAt = Date.now() + rem * 1000;
            t.visible = true;
          }
        });
      });

      onClick('admin-timer-reset-btn', () => {
        updateTimerState(t => {
          t.running = false;
          t.endAt = null;
          t.remainingSec = t.durationSec || 180;
        });
      });

      onClick('admin-timer-visibility-btn', () => {
        updateTimerState(t => { t.visible = !t.visible; });
      });

      onClick('admin-timer-mode-btn', () => {
        updateTimerState(t => {
          t.mode = t.mode === 'center' ? 'corner' : 'center';
          if (t.mode === 'center') t.visible = true;
        });
      });

      const minimizeCenterTimer = () => updateTimerState(t => { t.mode = 'corner'; });
      onClick('center-timer-minimize-btn', minimizeCenterTimer);
      onClick('center-timer-toggle-btn', () => {
        if (state.timer.running) {
          state.timer.remainingSec = getLiveRemainingSec();
          state.timer.running = false;
          state.timer.endAt = null;
        } else {
          const rem = state.timer.remainingSec > 0 ? state.timer.remainingSec : (state.timer.durationSec || 180);
          state.timer.remainingSec = rem;
          state.timer.running = true;
          state.timer.endAt = Date.now() + rem * 1000;
        }
        state.timer.timerVersion = Date.now();
        saveAndBroadcast();
        renderTimerUI();
      });
      onClick('center-timer-reset-btn', () => {
        state.timer.remainingSec = state.timer.durationSec || 180;
        state.timer.running = false;
        state.timer.endAt = null;
        state.timer.timerVersion = Date.now();
        saveAndBroadcast();
        renderTimerUI();
      });

      document.querySelectorAll('[data-ct-preset]').forEach(btn => {
        btn.addEventListener('click', () => {
          const sec = Number(btn.dataset.ctPreset) || 180;
          updateTimerState(t => {
            t.durationSec = sec;
            t.remainingSec = sec;
            t.running = false;
            t.endAt = null;
          });
        });
      });

      document.querySelectorAll('[data-ct-nudge]').forEach(btn => {
        btn.addEventListener('click', () => {
          const delta = Number(btn.dataset.ctNudge) || 0;
          updateTimerState(t => {
            const cur = t.running && t.endAt
              ? Math.max(0, Math.ceil((t.endAt - Date.now()) / 1000))
              : Math.max(0, t.remainingSec || 0);
            const next = Math.max(0, cur + delta);
            t.remainingSec = next;
            t.durationSec = Math.max(next, t.durationSec || 180);
            t.endAt = t.running ? (Date.now() + next * 1000) : null;
          });
        });
      });

      const centerTimerOverlayEl = document.getElementById('center-timer-overlay');
      if (centerTimerOverlayEl) {
        centerTimerOverlayEl.addEventListener('click', (e) => {
          if (e.target === centerTimerOverlayEl) minimizeCenterTimer();
        });
      }

      onClick('admin-switch-video-btn', () => {
        if (state.activeGameAccordion !== null) setActiveMediaType(state.activeGameAccordion, 'video');
      });

      onClick('admin-switch-image-btn', () => {
        if (state.activeGameAccordion !== null) setActiveMediaType(state.activeGameAccordion, 'image');
      });

      onClick('admin-toggle-zoom-btn', () => {
        if (state.activeGameAccordion !== null) setTheaterZoom(!state.isMediaZoomed);
      });

      onClick('admin-video-play-btn', () => sendAdminVideoCommand('play'));
      onClick('admin-video-pause-btn', () => sendAdminVideoCommand('pause'));
      onClick('admin-video-restart-btn', () => sendAdminVideoCommand('restart'));
      onClick('admin-video-mute-btn', () => {
        state.isVideoMuted = !state.isVideoMuted;
        saveAndBroadcast();
        renderAdminUI();
        sendAdminVideoCommand(state.isVideoMuted ? 'mute' : 'unmute');
      });

      onClick('admin-bgm-toggle-play-btn', () => {
        const activeUrl = (state.bgmTracks[state.activeBgmSlot]?.url || '').trim();
        if (!activeUrl) return;
        state.bgmPlaying = !state.bgmPlaying;
        saveAndBroadcast();
        broadcastPayload({ type: 'BGM_COMMAND', bgmPlaying: state.bgmPlaying });
        renderAdminUI();
      });

      onClick('admin-bgm-mute-btn', () => {
        state.bgmMuted = !state.bgmMuted;
        saveAndBroadcast();
        broadcastPayload({ type: 'BGM_COMMAND', bgmMuted: state.bgmMuted });
        renderAdminUI();
      });

      const adminBgmVolSlider = document.getElementById('admin-bgm-volume-slider');
      const adminBgmVolVal = document.getElementById('admin-bgm-volume-value');
      if (adminBgmVolSlider) {
        adminBgmVolSlider.addEventListener('input', () => {
          const nextVol = Math.max(0, Math.min(100, Number(adminBgmVolSlider.value) || 0));
          state.bgmVolume = nextVol;
          if (adminBgmVolVal) adminBgmVolVal.textContent = `${nextVol}%`;
          broadcastPayload({ type: 'BGM_COMMAND', bgmVolume: nextVol });
        });
        adminBgmVolSlider.addEventListener('change', () => {
          saveAndBroadcast();
        });
      }

      const adminEventTitleInp = document.getElementById('admin-input-event-title');
      if (adminEventTitleInp) {
        adminEventTitleInp.addEventListener('change', () => {
          state.eventTitle = adminEventTitleInp.value.trim() || defaultState.eventTitle;
          saveAndBroadcast();
        });
      }

      const adminEventSubInp = document.getElementById('admin-input-event-subtitle');
      if (adminEventSubInp) {
        adminEventSubInp.addEventListener('change', () => {
          state.eventSubtitle = adminEventSubInp.value.trim() || defaultState.eventSubtitle;
          saveAndBroadcast();
        });
      }

      const adminVictoryBtn = document.getElementById('admin-btn-victory');
      if (adminVictoryBtn) {
        adminVictoryBtn.addEventListener('click', () => {
          state.winnerAnnounced = !state.winnerAnnounced;
          state.winnerAnnouncedAt = state.winnerAnnounced ? Date.now() : 0;
          saveAndBroadcast();
          renderAdminUI();
        });
      }

      bindTwoStepReset(document.getElementById('admin-btn-reset'), 'รีเซ็ตคะแนน', 'กดอีกครั้งเพื่อยืนยัน', () => {
        state.teams.forEach(t => { t.scores = [0, 0, 0]; });
        state.winnerAnnounced = false;
        saveAndBroadcast();
        renderAdminUI();
      });

      const adminRoomInput = document.getElementById('admin-room-input');
      const adminConnectBtn = document.getElementById('admin-connect-btn');
      const adminSwitchToStageBtn = document.getElementById('admin-switch-to-stage-btn');

      if (adminRoomInput) adminRoomInput.value = roomCode;
      if (adminConnectBtn) {
        adminConnectBtn.addEventListener('click', () => {
          connectAdminToRoom(adminRoomInput.value);
        });
      }
      if (adminSwitchToStageBtn) {
        adminSwitchToStageBtn.addEventListener('click', () => switchRoleView('stage'));
      }
      onClick('admin-toggle-room-btn', () => {
        const roomBar = document.getElementById('admin-room-bar');
        if (roomBar) roomBar.classList.toggle('is-open');
      });

      // ========================================================================
      // ROLE SWITCHER ('stage' vs 'admin')
      // ========================================================================
      function switchRoleView() {
        currentRole = 'stage';
        stageContainerEl.classList.remove('hidden');
        if (drawerEl) drawerEl.classList.add('hidden');
        syncHeaderTexts();
        syncViewModeUI();
        renderLeaderboard(false);
        renderDrawerControls();
        syncAccordionFromState();
        syncStageBgmPlayer();
        renderTimerUI();
      }

      // ========================================================================
      // EDITORIAL CONFETTI ENGINE
      // ========================================================================
      const confettiCanvas = document.getElementById('confetti-canvas');
      const ctx = confettiCanvas.getContext('2d');
      let confettiPieces = [];
      let confettiAnimId = null;

      function resizeConfettiCanvas() {
        confettiCanvas.width = window.innerWidth;
        confettiCanvas.height = window.innerHeight;
      }
      window.addEventListener('resize', resizeConfettiCanvas);
      resizeConfettiCanvas();

      let victoryTimers = [];
      let confettiWaveTimers = [];

      function hideVictorySpotlight() {
        victoryTimers.forEach(id => clearTimeout(id));
        victoryTimers = [];
        confettiWaveTimers.forEach(id => clearTimeout(id));
        confettiWaveTimers = [];
        stopVictoryAudio();
        document.getElementById('victory-drumroll-overlay')?.remove();
        document.getElementById('victory-celebration-overlay')?.remove();
        document.getElementById('victory-flash-burst')?.remove();
      }

      function dismissVictorySpotlight() {
        hideVictorySpotlight();
        if (state.winnerAnnounced) {
          state.winnerAnnounced = false;
          state.winnerAnnouncedAt = 0;
          saveAndBroadcast();
          renderLeaderboard(true);
        }
      }

      function triggerVictorySequence() {
        hideVictorySpotlight();
        const STEP1_MS = 1150;
        const DRUMROLL_MS = 2120;
        const TOTAL_MS = STEP1_MS + DRUMROLL_MS;

        const drumOverlay = document.createElement('div');
        drumOverlay.id = 'victory-drumroll-overlay';
        drumOverlay.className = 'fixed inset-0 z-[76] bg-[#050507]/95 backdrop-blur-md flex items-center justify-center p-6 overflow-hidden select-none';
        drumOverlay.innerHTML = `
          <div class="pointer-events-none fixed inset-0 opacity-25" style="background: radial-gradient(circle at 50% 50%, rgba(244,208,63,0.38) 0%, transparent 65%);"></div>
          <div id="victory-suspense-stage" class="relative z-10 text-center flex flex-col items-center gap-3">
            <p class="victory-card-slam thai-safe font-display font-black text-5xl sm:text-7xl text-[#F4D03F] tracking-tight drop-shadow-[0_6px_0_#111111]">และ<span id="v-s1-dots"></span></p>
            <span class="font-display font-extrabold text-sm sm:text-base uppercase tracking-[0.28em] text-white/60">AND<span id="v-s1-en-dots"></span></span>
          </div>
        `;
        document.body.appendChild(drumOverlay);

        // Timed dots one-by-one for "และ..."
        [240, 520, 800].forEach((delay) => {
          victoryTimers.push(setTimeout(() => {
            const dTh = document.getElementById('v-s1-dots');
            const dEn = document.getElementById('v-s1-en-dots');
            if (dTh) dTh.textContent += '.';
            if (dEn) dEn.textContent += '.';
          }, delay));
        });

        // Step 2: Play drumroll + switch big headline to "ผู้ชนะคือ...." with timed dots one by one
        victoryTimers.push(setTimeout(() => {
          if (!state.winnerAnnounced) return;
          playDrumroll(DRUMROLL_MS);
          const stageBox = document.getElementById('victory-suspense-stage');
          if (stageBox) {
            stageBox.innerHTML = `
              <p class="victory-card-slam victory-drum-shake thai-safe font-display font-black text-5xl sm:text-7xl text-white tracking-tight drop-shadow-[0_6px_0_#111111]">ผู้ชนะคือ<span id="v-s2-dots" class="text-[#F4D03F]"></span></p>
              <span class="font-display font-extrabold text-sm sm:text-base uppercase tracking-[0.28em] text-[#F4D03F]">THE WINNER IS<span id="v-s2-en-dots"></span></span>
            `;
            [380, 820, 1260, 1700].forEach((dDelay) => {
              victoryTimers.push(setTimeout(() => {
                const dTh2 = document.getElementById('v-s2-dots');
                const dEn2 = document.getElementById('v-s2-en-dots');
                if (dTh2) dTh2.textContent += '.';
                if (dEn2) dEn2.textContent += '.';
              }, dDelay));
            });
          }
        }, STEP1_MS));

        // Step 3: Flash + reveal Winner group!
        victoryTimers.push(setTimeout(() => {
          document.getElementById('victory-drumroll-overlay')?.remove();
          if (state.winnerAnnounced) {
            const flash = document.createElement('div');
            flash.id = 'victory-flash-burst';
            flash.className = 'victory-flash-burst fixed inset-0 z-[85] bg-white pointer-events-none';
            document.body.appendChild(flash);
            setTimeout(() => flash.remove(), 650);
            launchConfetti();
          }
        }, TOTAL_MS));
      }

      function showVictorySpotlight() {
        document.getElementById('victory-drumroll-overlay')?.remove();
        document.getElementById('victory-celebration-overlay')?.remove();
        const ranked = state.teams
          .map((t, idx) => ({ ...t, originalIndex: idx, total: getTeamTotal(t) }))
          .sort((a, b) => b.total - a.total || a.originalIndex - b.originalIndex);
        const champ = ranked[0];
        if (!champ) return;

        const stageEl = document.getElementById('stage-container');
        if (stageEl) {
          stageEl.classList.remove('victory-stage-shake');
          void stageEl.offsetWidth;
          stageEl.classList.add('victory-stage-shake');
        }

        const runnersUp = ranked.slice(1, 3);
        const overlay = document.createElement('div');
        overlay.id = 'victory-celebration-overlay';
        overlay.className = 'fixed inset-0 z-[75] flex items-center justify-center p-4 bg-[#0B0B0B]/85 backdrop-blur-md overflow-hidden';
        overlay.innerHTML = `
          <div class="victory-sunburst pointer-events-none fixed left-1/2 top-1/2 w-[190vmax] h-[190vmax] opacity-35"
            style="background: repeating-conic-gradient(from 0deg, #F4D03F 0deg 10deg, transparent 10deg 20deg);"></div>
          <div class="pointer-events-none fixed inset-0" style="background: radial-gradient(circle at 50% 45%, rgba(244,208,63,0.28) 0%, transparent 62%);"></div>

          <div class="victory-card-slam relative z-10 w-full max-w-xl vox-card bg-[#F8F6F0] p-6 sm:p-8 text-center flex flex-col items-center gap-5 border-4 border-[#111111] shadow-[14px_14px_0px_#F4D03F]">
            <button type="button" id="victory-overlay-close" aria-label="ปิดหน้าต่างฉลองชัยชนะ"
              class="btn-vox absolute top-3.5 right-3.5 w-9 h-9 rounded-xl bg-white hover:bg-[#E74C3C] hover:text-white text-[#111111] flex items-center justify-center cursor-pointer transition-colors">
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>

            <div class="relative flex flex-col items-center justify-center pt-2">
              <div class="victory-mascot-jump w-32 h-32 sm:w-36 sm:h-36 rounded-3xl border-4 border-[#111111] shadow-[8px_8px_0px_#111111] flex items-center justify-center" style="background:${champ.color}">
                ${getTeamMascotSvg(champ.originalIndex, champ.color, 'w-28 h-28 sm:w-32 sm:h-32')}
              </div>
            </div>

            <div class="space-y-2">
              <h2 class="thai-safe font-display font-black text-4xl sm:text-5xl text-[#111111] tracking-tight">${escapeHtml(champ.name)}</h2>
              <div class="inline-flex items-baseline gap-2 bg-[#111111] text-[#F4D03F] px-6 py-2.5 rounded-2xl border-2 border-[#111111] shadow-[5px_5px_0px_#F4D03F]">
                <span class="font-display font-black text-4xl sm:text-5xl tabular-nums leading-none">${champ.total}</span>
                <span class="font-display font-bold text-sm uppercase tracking-wider text-white/80">PTS</span>
              </div>
            </div>

            ${runnersUp.length ? `
              <div class="w-full pt-3.5 mt-1 border-t-2 border-dashed border-[#111111]/25 grid ${runnersUp.length === 1 ? 'grid-cols-1 max-w-xs mx-auto' : 'grid-cols-2'} gap-2.5">
                ${runnersUp.map((r, i) => `
                  <div class="bg-white border-2 border-[#111111] rounded-xl px-3 py-2 flex items-center gap-2.5 shadow-[3px_3px_0px_#111111]">
                    <div class="victory-mascot-idle w-11 h-11 sm:w-12 sm:h-12 rounded-xl border-2 border-[#111111] shadow-[2px_2px_0px_#111111] flex items-center justify-center shrink-0" style="background:${r.color}; animation-delay:${i * 0.45}s">
                      ${getTeamMascotSvg(r.originalIndex, r.color, 'w-9 h-9 sm:w-10 sm:h-10')}
                    </div>
                    <div class="min-w-0 flex-1 text-left">
                      <div class="flex items-center gap-1.5">
                        <span class="font-display font-black text-[10px] px-1.5 py-0.5 rounded bg-[#F8F6F0] border border-[#111111]">#${i + 2}</span>
                        <span class="font-display font-black text-xs sm:text-sm tabular-nums text-[#111111]">${r.total} <span class="text-[10px] font-bold text-[#111111]/60">PTS</span></span>
                      </div>
                      <p class="thai-safe font-display font-extrabold text-xs sm:text-sm text-[#111111] truncate mt-0.5">${escapeHtml(r.name)}</p>
                    </div>
                  </div>
                `).join('')}
              </div>
            ` : ''}
          </div>
        `;

        document.body.appendChild(overlay);
        overlay.addEventListener('click', (e) => {
          if (e.target === overlay || e.target.closest('#victory-overlay-close')) {
            dismissVictorySpotlight();
          }
        });
      }

      function launchConfetti() {
        playVictoryFanfare();
        showVictorySpotlight();
        const colors = ['#F4D03F', '#E74C3C', '#2980B9', '#111111', '#FFFFFF', '#2ECC71'];
        confettiPieces = [];

        const spawnBurst = (count, mode) => {
          for (let i = 0; i < count; i++) {
            const isLeft = mode === 'left';
            const isRight = mode === 'right';
            const x = isLeft
              ? 20
              : isRight
                ? confettiCanvas.width - 20
                : Math.random() * confettiCanvas.width;
            const y = (isLeft || isRight)
              ? confettiCanvas.height - 20
              : -20 - Math.random() * confettiCanvas.height * 0.45;
            const vx = isLeft
              ? 4 + Math.random() * 11
              : isRight
                ? -(4 + Math.random() * 11)
                : (Math.random() - 0.5) * 6;
            const vy = (isLeft || isRight)
              ? -(10 + Math.random() * 11)
              : 3.2 + Math.random() * 4.8;

            confettiPieces.push({
              x, y,
              w: 10 + Math.random() * 11,
              h: 7 + Math.random() * 9,
              color: colors[Math.floor(Math.random() * colors.length)],
              vx, vy,
              rotation: Math.random() * 360,
              vRot: (Math.random() - 0.5) * 14,
              isCircle: Math.random() < 0.22
            });
          }
        };

        // Wave 1: Side cannons + top rain
        spawnBurst(85, 'left');
        spawnBurst(85, 'right');
        spawnBurst(120, 'top');

        // Wave 2: Delayed second cannon blast
        setTimeout(() => {
          if (!state.winnerAnnounced) return;
          spawnBurst(60, 'left');
          spawnBurst(60, 'right');
        }, 420);

        if (confettiAnimId) cancelAnimationFrame(confettiAnimId);

        function animateConfetti() {
          ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
          let alive = 0;
          for (const p of confettiPieces) {
            p.x += p.vx;
            p.y += p.vy;
            p.vx *= 0.992;
            p.vy += 0.16;
            p.rotation += p.vRot;

            if (p.y < confettiCanvas.height + 40) {
              alive++;
              ctx.save();
              ctx.translate(p.x, p.y);
              ctx.rotate((p.rotation * Math.PI) / 180);
              ctx.fillStyle = p.color;
              ctx.strokeStyle = '#111111';
              ctx.lineWidth = 1.3;
              if (p.isCircle) {
                ctx.beginPath();
                ctx.arc(0, 0, p.w * 0.42, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
              } else {
                ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
                ctx.strokeRect(-p.w / 2, -p.h / 2, p.w, p.h);
              }
              ctx.restore();
            }
          }

          if (alive > 0) {
            confettiAnimId = requestAnimationFrame(animateConfetti);
          } else {
            ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
            confettiAnimId = null;
          }
        }

        confettiAnimId = requestAnimationFrame(animateConfetti);
      }

      // Public API for Context Action Menu (assets/js/context-menu.js)
      window.VoxScoreboardAPI = {
        getState: () => state,
        getActiveGameIdx: () => (state.activeGameAccordion !== null ? state.activeGameAccordion : activeDrawerScoreGame),
        adjustScore: (teamId, gIdx, delta) => adjustTeamGameScore(teamId, gIdx, delta),
        renameTeam: (teamId, name) => {
          const t = state.teams.find(tm => tm.id === teamId);
          if (!t) return;
          t.name = (name || '').trim() || t.name;
          saveAndBroadcast();
          renderLeaderboard(false);
          renderDrawerControls();
        },
        addTeam: () => {
          if (state.teams.length >= 8) return;
          const usedColors = new Set(state.teams.map(t => (t.color || '').toUpperCase()));
          const pal = TEAM_PALETTE.find(p => !usedColors.has(p.color.toUpperCase())) || TEAM_PALETTE[state.teams.length % TEAM_PALETTE.length];
          const usedNames = new Set(state.teams.map(t => (t.name || '').trim().toLowerCase()));
          let num = 1;
          while (usedNames.has(`team ${num}`)) num++;
          const newTeam = {
            id: `team-${Date.now().toString(36)}`,
            name: `Team ${num}`,
            color: pal.color,
            textColor: pal.textColor,
            scores: state.games.map(() => 0)
          };
          state.teams.push(newTeam);
          displayedTotals[newTeam.id] = 0;
          saveAndBroadcast();
          renderLeaderboard(true);
        },
        removeTeam: (teamId) => {
          if (state.teams.length <= 2) return;
          const idx = state.teams.findIndex(t => t.id === teamId);
          if (idx === -1) return;
          const [removed] = state.teams.splice(idx, 1);
          if (removed) delete displayedTotals[removed.id];
          saveAndBroadcast();
          renderLeaderboard(true);
          renderDrawerControls();
        },
        renameGame: (gIdx, title) => {
          if (gIdx < 0 || gIdx >= state.games.length) return;
          state.games[gIdx] = (title || '').trim() || state.games[gIdx];
          saveAndBroadcast();
          syncHeaderTexts();
          renderDrawerControls();
        },
        updateGameMedia: (gIdx, patch) => {
          if (gIdx < 0 || gIdx >= state.gameMedia.length) return;
          const cur = state.gameMedia[gIdx];
          Object.assign(cur, patch);
          cur.activeMediaType = resolveActiveMediaType(cur);
          if (state.activeGameAccordion !== gIdx) {
            state.activeGameAccordion = gIdx;
          }
          saveAndBroadcast();
          syncMediaDots();
          currentRenderedPaneKey = '';
          syncAccordionFromState();
        },
        toggleGameOpen: (gIdx) => toggleGameAccordion(gIdx),
        toggleGameFocus: (gIdx) => {
          if (state.activeGameAccordion !== gIdx) {
            state.activeGameAccordion = gIdx;
            state.isActivityFocused = true;
          } else {
            state.isActivityFocused = !state.isActivityFocused;
          }
          syncNativeFullscreen(state.isActivityFocused);
          saveAndBroadcast();
          syncAccordionFromState();
        },
        addGame: () => {
          if (state.games.length >= 6) return;
          const idx = state.games.length;
          state.games.push(`Activity ${idx + 1}`);
          state.gameMedia.push({ description: '', youtubeUrl: '', imageData: '', activeMediaType: 'video' });
          state.teams.forEach(t => t.scores.push(0));
          saveAndBroadcast();
          syncHeaderTexts();
        },
        removeGame: (gIdx) => {
          if (state.games.length <= 1 || gIdx < 0 || gIdx >= state.games.length) return;
          state.games.splice(gIdx, 1);
          state.gameMedia.splice(gIdx, 1);
          state.teams.forEach(t => t.scores.splice(gIdx, 1));
          if (state.activeGameAccordion === gIdx) {
            state.activeGameAccordion = null;
            state.isActivityFocused = false;
            state.isMediaZoomed = false;
            syncNativeFullscreen(false);
          } else if (state.activeGameAccordion > gIdx) {
            state.activeGameAccordion -= 1;
          }
          if (activeDrawerScoreGame >= state.games.length) activeDrawerScoreGame = state.games.length - 1;
          saveAndBroadcast();
          syncHeaderTexts();
          syncAccordionFromState();
          renderLeaderboard(true);
          renderDrawerControls();
        },
        updateHeader: (title, subtitle) => {
          state.eventTitle = (title || '').trim() || defaultState.eventTitle;
          state.eventSubtitle = (subtitle || '').trim() || defaultState.eventSubtitle;
          saveAndBroadcast();
          syncHeaderTexts();
          renderDrawerControls();
        },
        setViewMode: (detail, layout) => {
          if (detail) state.viewMode.detail = detail;
          if (layout) state.viewMode.layout = layout;
          saveAndBroadcast();
          syncViewModeUI();
          renderLeaderboard(true);
        },
        toggleVictory: () => {
          const isOverlayOpen = Boolean(
            document.getElementById('victory-celebration-overlay') ||
            document.getElementById('victory-drumroll-overlay')
          );
          if (isOverlayOpen) {
            state.winnerAnnounced = false;
            state.winnerAnnouncedAt = 0;
            saveAndBroadcast();
            renderLeaderboard(true);
            hideVictorySpotlight();
          } else {
            state.winnerAnnounced = true;
            state.winnerAnnouncedAt = Date.now();
            saveAndBroadcast();
            renderLeaderboard(true);
            triggerVictorySequence();
          }
        },
        updateTimer: (fn) => {
          if (typeof fn === 'function') fn(state.timer);
          state.timer.timerVersion = Date.now();
          saveAndBroadcast();
          renderTimerUI();
        },
        resetScores: () => {
          const snapshot = state.teams.map(t => ({ id: t.id, scores: [...t.scores] }));
          const prevWinner = state.winnerAnnounced;
          state.teams.forEach(t => { t.scores = state.games.map(() => 0); });
          state.winnerAnnounced = false;
          hideVictorySpotlight();
          saveAndBroadcast();
          renderLeaderboard(true);
          renderDrawerControls();
          showVoxAlert('รีเซ็ตคะแนนทั้งหมดแล้ว', 'info', {
            actionLabel: 'ย้อนกลับ (Undo)',
            duration: 5000,
            onAction: () => {
              snapshot.forEach(snap => {
                const team = state.teams.find(t => t.id === snap.id);
                if (team) team.scores = [...snap.scores];
              });
              state.winnerAnnounced = prevWinner;
              saveAndBroadcast();
              renderLeaderboard(true);
              renderDrawerControls();
              showVoxAlert('กู้คืนคะแนนเดิมแล้ว', 'success');
            }
          });
        },
        applyTemplate: (key) => {
          const templates = {
            camp: {
              title: 'กิจกรรมค่าย & กลุ่มสัมพันธ์',
              sub: 'คะแนนรวมฐานกิจกรรม',
              games: ['ฐานที่ 1: ละลายพฤติกรรม', 'ฐานที่ 2: เกมวางแผน', 'ฐานที่ 3: ภารกิจรวมพลัง'],
              teams: ['ทีมสีเหลือง', 'ทีมสีแดง', 'ทีมสีน้ำเงิน']
            },
            quiz: {
              title: 'Quiz Show Battle',
              sub: 'การแข่งขันตอบคำถามชิงไหวพริบ',
              games: ['รอบเก็บคะแนน', 'รอบความเร็ว', 'รอบชิงชนะเลิศ (x2)'],
              teams: ['Team Alpha', 'Team Bravo', 'Team Charlie', 'Team Delta']
            },
            sports: {
              title: 'กีฬาสี & เกมมหาสนุก',
              sub: 'ตารางคะแนนรวมทุกสี',
              games: ['วิ่งผลัด', 'ชักเย่อ', 'เกมกองเชียร์', 'ภารกิจลับ'],
              teams: ['สีเหลือง', 'สีแดง', 'สีน้ำเงิน', 'สีเขียว', 'สีม่วง', 'สีส้ม']
            }
          };
          const tpl = templates[key];
          if (!tpl) return;
          state.eventTitle = tpl.title;
          state.eventSubtitle = tpl.sub;
          state.games = tpl.games.slice();
          state.gameMedia = tpl.games.map(() => ({ description: '', youtubeUrl: '', imageData: '', activeMediaType: 'video' }));
          state.teams = tpl.teams.map((name, i) => {
            const pal = TEAM_PALETTE[i % TEAM_PALETTE.length];
            return { id: `team-${i + 1}`, name, color: pal.color, textColor: pal.textColor, scores: tpl.games.map(() => 0) };
          });
          state.winnerAnnounced = false;
          state.activeGameAccordion = null;
          state.isActivityFocused = false;
          hideVictorySpotlight();
          saveAndBroadcast();
          syncHeaderTexts();
          syncAccordionFromState();
          renderLeaderboard(true);
          renderDrawerControls();
        },
        saveLocally: () => {
          try { localStorage.setItem(LOCAL_SAVED_KEY, '1'); } catch (_) {}
          hasUnsavedGuestChanges = false;
          persistStateToStorage();
          syncStageSyncPill();
        },
        isSaved: () => isAccountSignedIn() || isLocallySaved()
      };

      // Warn Guest users if leaving/refreshing with unsaved changes (neither logged in nor saved locally)
      const needsUnsavedGuard = () => hasUnsavedGuestChanges && !isAccountSignedIn() && !isLocallySaved();

      window.addEventListener('beforeunload', (e) => {
        if (!needsUnsavedGuard()) return;
        e.preventDefault();
        e.returnValue = '';
      });

      document.addEventListener('click', (e) => {
        const link = e.target.closest('a[href]');
        if (!link || !needsUnsavedGuard()) return;
        const href = link.getAttribute('href') || '';
        if (!href || href.startsWith('#') || link.target === '_blank') return;

        e.preventDefault();
        let modal = document.getElementById('vox-unsaved-modal');
        if (!modal) {
          modal = document.createElement('div');
          modal.id = 'vox-unsaved-modal';
          modal.className = 'fixed inset-0 z-[185] flex items-center justify-center p-4 bg-black/60 backdrop-blur-[2px]';
          modal.innerHTML = `
            <div class="vox-panel-enter vox-card bg-[#F8F6F0] w-full max-w-sm p-5 flex flex-col gap-3">
              <h3 class="font-display font-black text-base text-[#111111]">ยังไม่ได้บันทึกข้อมูล</h3>
              <p class="text-xs text-[#111111]/75 leading-relaxed">คุณยังไม่ได้เข้าสู่ระบบหรือบันทึกลงเครื่อง หากออกจากหน้านี้การแก้ไขทั้งหมดจะหายไป</p>
              <div class="flex flex-col gap-2 pt-1">
                <button type="button" id="vox-unsaved-login" class="btn-vox bg-[#F4D03F] hover:bg-[#f2c61d] text-[#111111] font-display font-extrabold text-xs py-2 rounded-xl cursor-pointer">เข้าสู่ระบบเพื่อซิงค์ออนไลน์</button>
                <button type="button" id="vox-unsaved-local" class="btn-vox bg-white hover:bg-[#F4D03F]/40 text-[#111111] font-display font-bold text-xs py-2 rounded-xl cursor-pointer">บันทึกไว้ในเครื่องนี้</button>
                <div class="grid grid-cols-2 gap-2">
                  <button type="button" id="vox-unsaved-discard" class="btn-vox bg-white hover:bg-red-50 text-[#E74C3C] font-display font-bold text-xs py-2 rounded-xl cursor-pointer">ออกโดยไม่บันทึก</button>
                  <button type="button" id="vox-unsaved-stay" class="btn-vox bg-[#111111] text-white font-display font-bold text-xs py-2 rounded-xl cursor-pointer">อยู่หน้านี้ต่อ</button>
                </div>
              </div>
            </div>
          `;
          document.body.appendChild(modal);
        } else {
          modal.classList.remove('hidden');
          modal.classList.add('flex');
        }

        const hideModal = () => { modal.classList.add('hidden'); modal.classList.remove('flex'); };
        document.getElementById('vox-unsaved-stay').onclick = hideModal;
        document.getElementById('vox-unsaved-discard').onclick = () => {
          hasUnsavedGuestChanges = false;
          window.location.href = href;
        };
        document.getElementById('vox-unsaved-local').onclick = () => {
          window.VoxScoreboardAPI.saveLocally();
          window.location.href = href;
        };
        document.getElementById('vox-unsaved-login').onclick = () => {
          hideModal();
          if (window.HelpDaiAuth?.openLogin) {
            window.HelpDaiAuth.openLogin();
          } else {
            window.location.href = 'index.html';
          }
        };
      });

      // ========================================================================
      // INITIALIZE IMMEDIATELY
      // ========================================================================
      switchRoleView(initialRole);
      syncStageSyncPill();
      window.__voxStageReady = true;
      window.dispatchEvent(new Event('vox-stage-ready'));
    })();
  
