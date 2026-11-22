/* Vox Context Action Menu (Right-Click & Left-Click Element Options) */
(() => {
  let menuEl = null;
  let editModalEl = null;

  function closeMenu() {
    if (menuEl) {
      menuEl.classList.add('hidden');
      menuEl.classList.remove('flex');
    }
  }

  function ensureMenu() {
    if (menuEl) return menuEl;
    menuEl = document.createElement('div');
    menuEl.id = 'vox-context-menu';
    menuEl.className = 'fixed z-[160] hidden flex-col gap-1 w-60 max-h-[85vh] overflow-y-auto vox-card bg-[#F8F6F0] p-2 vox-panel-enter';
    menuEl.setAttribute('role', 'menu');
    document.body.appendChild(menuEl);

    document.addEventListener('click', (e) => {
      if (menuEl && !menuEl.contains(e.target)) closeMenu();
    });
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeMenu();
    });
    window.addEventListener('resize', closeMenu);
    return menuEl;
  }

  function openQuickEditDialog({ title, fields, onSave }) {
    if (!editModalEl) {
      editModalEl = document.createElement('div');
      editModalEl.id = 'vox-quick-edit-modal';
      editModalEl.className = 'fixed inset-0 z-[175] hidden items-center justify-center bg-black/55 backdrop-blur-[2px] p-4';
      editModalEl.innerHTML = `
        <div class="vox-card bg-[#F8F6F0] w-full max-w-md p-5 flex flex-col gap-3 vox-panel-enter">
          <div class="flex items-center justify-between pb-2.5 border-b-2 border-[#111111]">
            <h3 id="vqe-title" class="font-display font-extrabold text-base text-[#111111]"></h3>
            <button type="button" id="vqe-close" class="w-7 h-7 rounded-lg border-2 border-[#111111] bg-white hover:bg-[#E74C3C] hover:text-white font-display font-bold text-xs flex items-center justify-center cursor-pointer">✕</button>
          </div>
          <div id="vqe-fields" class="flex flex-col gap-2.5"></div>
          <div class="flex justify-end gap-2 pt-1">
            <button type="button" id="vqe-cancel" class="btn-vox bg-white text-[#111111] font-display font-bold text-xs px-4 py-2 rounded-xl cursor-pointer">ยกเลิก</button>
            <button type="button" id="vqe-save" class="btn-vox bg-[#F4D03F] text-[#111111] font-display font-extrabold text-xs px-4 py-2 rounded-xl cursor-pointer">✓ บันทึก</button>
          </div>
        </div>
      `;
      document.body.appendChild(editModalEl);
      const hide = (force = false) => {
        if (!force && editModalEl.dataset.dirty === '1') {
          if (!window.confirm('มีการแก้ไขที่ยังไม่ได้บันทึก ต้องการทิ้งการแก้ไขหรือไม่?')) return;
        }
        editModalEl.dataset.dirty = '0';
        editModalEl.classList.add('hidden');
        editModalEl.classList.remove('flex');
      };
      document.getElementById('vqe-close').addEventListener('click', () => hide(false));
      document.getElementById('vqe-cancel').addEventListener('click', () => hide(false));
      editModalEl.addEventListener('click', (e) => {
        if (e.target === editModalEl) hide(false);
      });
      window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && editModalEl && !editModalEl.classList.contains('hidden')) {
          e.stopPropagation();
          hide(false);
        }
      }, true);
    }

    document.getElementById('vqe-title').textContent = title;
    const fieldsWrap = document.getElementById('vqe-fields');
    fieldsWrap.innerHTML = fields.map((f, i) => `
      <label class="flex flex-col gap-1">
        <span class="text-xs font-display font-bold text-[#111111]/80">${f.label}</span>
        ${f.type === 'textarea'
          ? `<textarea data-vqe-idx="${i}" rows="3" placeholder="${f.placeholder || ''}" class="thai-safe w-full bg-white border-2 border-[#111111] rounded-xl px-3 py-2 text-sm"></textarea>`
          : f.type === 'image'
            ? `<div class="flex gap-1.5 items-center">
                <input data-vqe-idx="${i}" type="text" placeholder="${f.placeholder || ''}" class="thai-safe-tight flex-1 min-w-0 bg-white border-2 border-[#111111] rounded-xl px-3 py-2 text-sm font-bold" />
                <label class="btn-vox bg-white hover:bg-[#F4D03F] text-[#111111] font-display font-extrabold text-xs px-2.5 py-2 rounded-xl cursor-pointer shrink-0">
                  เลือกรูป
                  <input type="file" accept="image/*" data-vqe-file="${i}" class="hidden" />
                </label>
              </div>`
            : `<input data-vqe-idx="${i}" type="${f.type || 'text'}" placeholder="${f.placeholder || ''}" class="thai-safe-tight w-full bg-white border-2 border-[#111111] rounded-xl px-3 py-2 text-sm font-bold" />`
        }
      </label>
    `).join('');

    fields.forEach((f, i) => {
      const inp = fieldsWrap.querySelector(`[data-vqe-idx="${i}"]`);
      if (inp) inp.value = f.value || '';
      const fileInp = fieldsWrap.querySelector(`[data-vqe-file="${i}"]`);
      if (fileInp && inp) {
        fileInp.addEventListener('change', () => {
          const file = fileInp.files?.[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = () => {
            const dataUrl = String(reader.result || '');
            if (file.type === 'image/gif' || dataUrl.length < 320000) {
              inp.value = dataUrl;
              return;
            }
            const img = new Image();
            img.onload = () => {
              const maxSide = 1200;
              const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
              const canvas = document.createElement('canvas');
              canvas.width = Math.round(img.width * scale);
              canvas.height = Math.round(img.height * scale);
              canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
              inp.value = canvas.toDataURL('image/jpeg', 0.82);
            };
            img.src = dataUrl;
          };
          reader.readAsDataURL(file);
        });
      }
    });

    editModalEl.dataset.dirty = '0';
    fieldsWrap.querySelectorAll('input, textarea').forEach(el => {
      el.addEventListener('input', () => { editModalEl.dataset.dirty = '1'; });
      el.addEventListener('change', () => { editModalEl.dataset.dirty = '1'; });
    });

    const saveBtn = document.getElementById('vqe-save');
    const newSave = saveBtn.cloneNode(true);
    saveBtn.parentNode.replaceChild(newSave, saveBtn);
    const submitModal = () => {
      const vals = fields.map((_, i) => fieldsWrap.querySelector(`[data-vqe-idx="${i}"]`)?.value ?? '');
      onSave(vals);
      editModalEl.dataset.dirty = '0';
      editModalEl.classList.add('hidden');
      editModalEl.classList.remove('flex');
    };
    newSave.addEventListener('click', submitModal);

    fieldsWrap.querySelectorAll('input:not([type="file"])').forEach(inp => {
      inp.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          submitModal();
        }
      });
    });
    fieldsWrap.querySelectorAll('textarea').forEach(ta => {
      ta.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          submitModal();
        }
      });
    });

    editModalEl.classList.remove('hidden');
    editModalEl.classList.add('flex');
    fieldsWrap.querySelector('[data-vqe-idx="0"]')?.focus();
  }

  function showMenuAt(x, y, headerLabel, itemsHtml, bindFn) {
    const m = ensureMenu();
    m.innerHTML = `
      <div class="px-2 py-1 border-b border-[#111111]/15 flex items-center justify-between gap-2">
        <span class="font-display font-extrabold text-[11px] uppercase tracking-wider text-[#111111]/70 truncate">${headerLabel}</span>
        <button type="button" data-cm-close class="text-xs font-bold text-[#111111]/50 hover:text-[#111111] cursor-pointer">✕</button>
      </div>
      <div class="flex flex-col gap-1 pt-0.5">${itemsHtml}</div>
    `;

    m.classList.remove('hidden', 'vox-panel-enter');
    m.classList.add('flex');

    const mw = m.offsetWidth || 240;
    const mh = m.offsetHeight || 200;
    const left = Math.max(8, Math.min(window.innerWidth - mw - 8, x));
    const top = Math.max(8, Math.min(window.innerHeight - mh - 8, y));
    m.style.left = `${left}px`;
    m.style.top = `${top}px`;
    void m.offsetWidth;
    m.classList.add('vox-panel-enter');

    m.querySelector('[data-cm-close]')?.addEventListener('click', closeMenu);
    if (bindFn) bindFn(m);
  }

  const CM_ICONS = {
    eye: '<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>',
    expand: '<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>',
    edit: '<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
    doc: '<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/></svg>',
    crown: '<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M3 17L2 7l5.5 4.5L12 5l4.5 6.5L22 7l-1 10H3z"/></svg>',
    full: '<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>',
    compact: '<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><rect x="4" y="8" width="16" height="8" rx="2"/></svg>',
    simple: '<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="5"/></svg>',
    reset: '<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>',
    download: '<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>',
    upload: '<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>'
  };

  function menuBtn(action, icon, label, danger = false) {
    return `
      <button type="button" data-cm-action="${action}" class="w-full text-left px-2.5 py-1.5 rounded-lg border-2 border-transparent hover:border-[#111111] ${danger ? 'hover:bg-red-50 text-[#E74C3C]' : 'hover:bg-[#F4D03F] text-[#111111]'} font-display font-bold text-xs flex items-center gap-2 transition-colors cursor-pointer">
        <span class="w-4 flex items-center justify-center shrink-0">${icon}</span>
        <span class="truncate">${label}</span>
      </button>
    `;
  }

  function openForTarget(target, x, y) {
    if (window.VoxSecurity?.isLocked()) {
      window.VoxSecurity.toggleLock();
      return;
    }
    const api = window.VoxScoreboardAPI;
    if (!api) return;
    const st = api.getState();

    // 1. Team Block
    const teamRow = target.closest('.team-row');
    if (teamRow) {
      const teamId = teamRow.dataset.teamId;
      const team = st.teams.find(t => t.id === teamId);
      if (!team) return;
      const rawActiveG = api.getActiveGameIdx();
      let selectedG = Math.max(0, Math.min(st.games.length - 1, Number(rawActiveG) || 0));
      const getTotal = () => (team.scores || []).reduce((a, b) => a + (Number(b) || 0), 0);

      const GAME_COLORS = ['#F4D03F', '#E74C3C', '#2980B9', '#10B981', '#8E44AD', '#F39C12'];
      const escCm = (v) => String(v || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

      const items = `
        <div class="px-1 py-1">
          ${st.games.length > 1 ? `
            <div id="cm-team-game-dropdown" class="relative mb-1.5">
              <button type="button" id="cm-team-game-trigger" class="w-full bg-white hover:bg-[#FFFDF5] border-2 border-[#111111] rounded-lg px-2.5 py-1.5 shadow-[2px_2px_0px_#111111] flex items-center justify-between gap-2 text-[11px] font-display font-bold text-[#111111] cursor-pointer transition-colors">
                <span class="flex items-center gap-1.5 min-w-0">
                  <span id="cm-team-game-dot" class="w-2.5 h-2.5 rounded-full border border-[#111111] shrink-0" style="background:${GAME_COLORS[selectedG % GAME_COLORS.length]};"></span>
                  <span id="cm-team-game-label" class="truncate">${escCm(st.games[selectedG])} (${team.scores[selectedG] || 0})</span>
                </span>
                <span id="cm-team-game-chev" class="text-[10px] text-[#111111]/70 transition-transform duration-200 shrink-0">▾</span>
              </button>
              <div id="cm-team-game-list" class="hidden mt-1 bg-[#F8F6F0] border-2 border-[#111111] rounded-xl p-1 shadow-[3px_3px_0px_#111111] flex-col gap-0.5 max-h-44 overflow-y-auto vox-panel-enter">
                ${st.games.map((g, gi) => `
                  <button type="button" data-cm-game-opt="${gi}" class="w-full text-left px-2 py-1.5 rounded-lg border-2 ${gi === selectedG ? 'bg-[#F4D03F] border-[#111111]' : 'bg-transparent border-transparent hover:bg-white hover:border-[#111111]'} font-display font-bold text-[11px] text-[#111111] flex items-center justify-between gap-2 cursor-pointer transition-colors">
                    <span class="flex items-center gap-1.5 min-w-0">
                      <span class="w-2.5 h-2.5 rounded-full border border-[#111111] shrink-0" style="background:${GAME_COLORS[gi % GAME_COLORS.length]};"></span>
                      <span class="truncate">${escCm(g)}</span>
                    </span>
                    <span data-cm-opt-score="${gi}" class="px-1.5 py-0.5 rounded bg-white border border-[#111111] text-[10px] font-black tabular-nums shrink-0">${team.scores[gi] || 0}</span>
                  </button>
                `).join('')}
              </div>
            </div>
          ` : `<div id="cm-team-single-g" class="text-[10px] font-bold text-[#111111]/60 mb-1 truncate">${escCm(st.games[selectedG] || 'Activity')} (${team.scores[selectedG] || 0})</div>`}
          <div class="grid grid-cols-5 gap-1">
            <button type="button" data-cm-score="-5" class="btn-vox bg-white hover:bg-red-50 text-[#E74C3C] font-display font-black text-[11px] py-1.5 rounded-lg cursor-pointer">−5</button>
            <button type="button" data-cm-score="-1" class="btn-vox bg-white hover:bg-red-50 text-[#E74C3C] font-display font-black text-[11px] py-1.5 rounded-lg cursor-pointer">−1</button>
            <button type="button" data-cm-score="1" class="btn-vox bg-white hover:bg-yellow-100 text-[#111111] font-display font-black text-[11px] py-1.5 rounded-lg cursor-pointer">+1</button>
            <button type="button" data-cm-score="5" class="btn-vox bg-white hover:bg-yellow-100 text-[#111111] font-display font-black text-[11px] py-1.5 rounded-lg cursor-pointer">+5</button>
            <button type="button" data-cm-score="10" class="btn-vox bg-[#F4D03F] hover:bg-[#f2c61d] text-[#111111] font-display font-black text-[11px] py-1.5 rounded-lg cursor-pointer">+10</button>
          </div>
        </div>
        ${menuBtn('rename-team', CM_ICONS.edit, 'เปลี่ยนชื่อทีม')}
        ${st.teams.length < 8 ? menuBtn('add-team', '+', 'เพิ่มทีมใหม่') : ''}
        ${st.teams.length > 2 ? menuBtn('remove-team', '−', 'ลบทีมนี้', true) : ''}
      `;

      showMenuAt(x, y, `${team.name} • ${getTotal()}`, items, (m) => {
        const triggerBtn = m.querySelector('#cm-team-game-trigger');
        const listEl = m.querySelector('#cm-team-game-list');
        const chevEl = m.querySelector('#cm-team-game-chev');
        const dotEl = m.querySelector('#cm-team-game-dot');
        const labelEl = m.querySelector('#cm-team-game-label');

        const toggleDropdown = (open) => {
          if (!listEl) return;
          const next = open === undefined ? listEl.classList.contains('hidden') : open;
          listEl.classList.toggle('hidden', !next);
          listEl.classList.toggle('flex', next);
          if (chevEl) chevEl.style.transform = next ? 'rotate(180deg)' : '';
        };

        const refreshMenuScores = () => {
          const hdr = m.querySelector('span');
          if (hdr) hdr.textContent = `${team.name} • ${getTotal()}`;
          if (dotEl) dotEl.style.backgroundColor = GAME_COLORS[selectedG % GAME_COLORS.length];
          if (labelEl) labelEl.textContent = `${st.games[selectedG] || 'Activity'} (${team.scores[selectedG] || 0})`;
          m.querySelectorAll('[data-cm-game-opt]').forEach(optBtn => {
            const gi = Number(optBtn.dataset.cmGameOpt);
            const active = gi === selectedG;
            optBtn.className = `w-full text-left px-2 py-1.5 rounded-lg border-2 ${active ? 'bg-[#F4D03F] border-[#111111]' : 'bg-transparent border-transparent hover:bg-white hover:border-[#111111]'} font-display font-bold text-[11px] text-[#111111] flex items-center justify-between gap-2 cursor-pointer transition-colors`;
            const scEl = optBtn.querySelector(`[data-cm-opt-score="${gi}"]`);
            if (scEl) scEl.textContent = String(team.scores[gi] || 0);
          });
          const singleEl = m.querySelector('#cm-team-single-g');
          if (singleEl) singleEl.textContent = `${st.games[selectedG] || 'Activity'} (${team.scores[selectedG] || 0})`;
        };

        triggerBtn?.addEventListener('click', (e) => {
          e.stopPropagation();
          toggleDropdown();
        });
        m.querySelectorAll('[data-cm-game-opt]').forEach(optBtn => {
          optBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            selectedG = Number(optBtn.dataset.cmGameOpt) || 0;
            toggleDropdown(false);
            refreshMenuScores();
          });
        });
        m.querySelectorAll('[data-cm-score]').forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            api.adjustScore(teamId, selectedG, Number(btn.dataset.cmScore));
            refreshMenuScores();
          });
        });
        m.querySelector('[data-cm-action="rename-team"]')?.addEventListener('click', () => {
          closeMenu();
          openQuickEditDialog({
            title: 'เปลี่ยนชื่อทีม',
            fields: [{ label: 'ชื่อทีม', value: team.name }],
            onSave: ([val]) => api.renameTeam(teamId, val)
          });
        });
        m.querySelector('[data-cm-action="add-team"]')?.addEventListener('click', () => {
          closeMenu();
          api.addTeam();
        });
        m.querySelector('[data-cm-action="remove-team"]')?.addEventListener('click', () => {
          closeMenu();
          api.removeTeam(teamId);
        });
      });
      return;
    }

    // 2. Activity Card (or Open Activity Detail Card #media-accordion)
    const gameCard = target.closest('[data-game-index]');
    const openDetailCard = !gameCard ? target.closest('#media-accordion') : null;
    if (gameCard || (openDetailCard && st.activeGameAccordion !== null)) {
      const gIdx = gameCard ? Number(gameCard.dataset.gameIndex) : st.activeGameAccordion;
      const gTitle = st.games[gIdx] || `Activity ${gIdx + 1}`;
      const media = st.gameMedia[gIdx] || {};

      const items = `
        ${menuBtn('toggle-open', CM_ICONS.eye, st.activeGameAccordion === gIdx ? 'ซ่อนรายละเอียด' : 'เปิดดูกิจกรรม')}
        ${menuBtn('focus-game', CM_ICONS.expand, st.activeGameAccordion === gIdx && st.isActivityFocused ? 'ย่อกลับปกติ' : 'ขยายโฟกัสกลางจอ')}
        ${menuBtn('rename-game', CM_ICONS.edit, 'เปลี่ยนชื่อกิจกรรม')}
        ${menuBtn('edit-media', CM_ICONS.doc, 'แก้ไขกติกา & สื่อ')}
        ${st.games.length < 6 ? menuBtn('add-game', '+', 'เพิ่มกิจกรรมใหม่') : ''}
        ${st.games.length > 1 ? menuBtn('remove-game', '−', 'ลบกิจกรรมนี้', true) : ''}
      `;

      showMenuAt(x, y, gTitle, items, (m) => {
        m.querySelector('[data-cm-action="toggle-open"]')?.addEventListener('click', () => {
          closeMenu();
          api.toggleGameOpen(gIdx);
        });
        m.querySelector('[data-cm-action="focus-game"]')?.addEventListener('click', () => {
          closeMenu();
          api.toggleGameFocus(gIdx);
        });
        m.querySelector('[data-cm-action="rename-game"]')?.addEventListener('click', () => {
          closeMenu();
          openQuickEditDialog({
            title: 'เปลี่ยนชื่อกิจกรรม',
            fields: [{ label: 'ชื่อกิจกรรม', value: gTitle }],
            onSave: ([val]) => api.renameGame(gIdx, val)
          });
        });
        m.querySelector('[data-cm-action="edit-media"]')?.addEventListener('click', () => {
          closeMenu();
          openQuickEditDialog({
            title: `กติกา & สื่อ: ${gTitle}`,
            fields: [
              { label: 'กติกา / คำอธิบาย', type: 'textarea', value: media.description || '', placeholder: 'พิมพ์รายละเอียดหรือกติกา...' },
              { label: 'ลิงก์ YouTube (ถ้ามี)', type: 'url', value: media.youtubeUrl || '', placeholder: 'https://youtu.be/...' },
              { label: 'ลิงก์รูปภาพ / GIF หรืออัปโหลดรูป', type: 'image', value: media.imageData || '', placeholder: 'https://... หรือกดเลือกรูป' }
            ],
            onSave: ([description, youtubeUrl, imageData]) => {
              const clean = window.VoxSecurity ? window.VoxSecurity.sanitizeUrl : (v => v.trim());
              api.updateGameMedia(gIdx, {
                description: description.trim(),
                youtubeUrl: clean(youtubeUrl),
                imageData: clean(imageData)
              });
            }
          });
        });
        m.querySelector('[data-cm-action="add-game"]')?.addEventListener('click', () => {
          closeMenu();
          api.addGame();
        });
        m.querySelector('[data-cm-action="remove-game"]')?.addEventListener('click', () => {
          closeMenu();
          api.removeGame(gIdx);
        });
      });
      return;
    }

    // 2.5 Corner Timer Pill (#stage-timer-pill)
    const timerPill = target.closest('#stage-timer-pill');
    if (timerPill && api.updateTimer) {
      const t = st.timer || {};
      const items = `
        ${menuBtn('timer-toggle', CM_ICONS.eye, t.running ? 'หยุดเวลาชั่วคราว' : 'เริ่มนับเวลา')}
        ${menuBtn('timer-center', CM_ICONS.expand, 'ขยายกลางจอ')}
        ${menuBtn('timer-reset', CM_ICONS.reset, 'รีเซ็ตเวลา')}
        ${menuBtn('timer-hide', '✕', 'ซ่อนตัวจับเวลา', true)}
      `;
      showMenuAt(x, y, 'ตัวจับเวลา (Timer)', items, (m) => {
        m.querySelector('[data-cm-action="timer-toggle"]')?.addEventListener('click', () => {
          closeMenu();
          api.updateTimer(tm => {
            if (tm.running) {
              tm.remainingSec = tm.endAt ? Math.max(0, Math.ceil((tm.endAt - Date.now()) / 1000)) : (tm.remainingSec || 0);
              tm.running = false;
              tm.endAt = null;
            } else {
              const rem = tm.remainingSec > 0 ? tm.remainingSec : (tm.durationSec || 180);
              tm.remainingSec = rem;
              tm.running = true;
              tm.endAt = Date.now() + rem * 1000;
            }
          });
        });
        m.querySelector('[data-cm-action="timer-center"]')?.addEventListener('click', () => {
          closeMenu();
          api.updateTimer(tm => { tm.mode = 'center'; tm.visible = true; });
        });
        m.querySelector('[data-cm-action="timer-reset"]')?.addEventListener('click', () => {
          closeMenu();
          api.updateTimer(tm => { tm.remainingSec = tm.durationSec || 180; tm.running = false; tm.endAt = null; });
        });
        m.querySelector('[data-cm-action="timer-hide"]')?.addEventListener('click', () => {
          closeMenu();
          api.updateTimer(tm => { tm.visible = false; tm.running = false; tm.endAt = null; });
        });
      });
      return;
    }

    // 3. Header / Masthead (Direct quick-edit for event title & subtitle)
    const headerEl = target.closest('header');
    if (headerEl) {
      closeMenu();
      openQuickEditDialog({
        title: 'แก้ไขชื่องาน',
        fields: [
          { label: 'ชื่องานหลัก', value: st.eventTitle },
          { label: 'คำโปรยรอง', value: st.eventSubtitle }
        ],
        onSave: ([title, sub]) => api.updateHeader(title, sub)
      });
      return;
    }

    // 4. General Stage Background (Quick Templates + Account Slots + Backup/Restore + Reset)
    const isSignedIn = Boolean(window.HelpDaiAuth?.getSession?.()?.user?.id);
    const curSlot = window.VoxCloudSync?.getSlot?.() || 1;
    const slotHtml = isSignedIn ? `
      <div class="px-1 py-1 border-b border-[#111111]/15 mb-0.5">
        <div class="text-[10px] font-bold text-[#111111]/60 mb-1">สลับงานที่บันทึก (Account Slots)</div>
        <div class="grid grid-cols-3 gap-1">
          ${[1, 2, 3].map(n => `<button type="button" data-cm-slot="${n}" class="btn-vox ${curSlot === n ? 'bg-[#111111] text-[#F4D03F]' : 'bg-white hover:bg-[#F4D03F] text-[#111111]'} font-display font-bold text-[10px] py-1 rounded-lg cursor-pointer">งาน ${n}</button>`).join('')}
        </div>
      </div>
    ` : '';
    const items = `
      ${slotHtml}
      <div class="px-1 py-1 border-b border-[#111111]/15 mb-0.5">
        <div class="text-[10px] font-bold text-[#111111]/60 mb-1">เทมเพลตเริ่มไว (1-Click)</div>
        <div class="grid grid-cols-3 gap-1">
          <button type="button" data-cm-tpl="camp" class="btn-vox bg-white hover:bg-[#F4D03F] font-display font-bold text-[10px] py-1 rounded-lg cursor-pointer">ค่าย 3 ทีม</button>
          <button type="button" data-cm-tpl="quiz" class="btn-vox bg-white hover:bg-[#F4D03F] font-display font-bold text-[10px] py-1 rounded-lg cursor-pointer">ควิซ 4 ทีม</button>
          <button type="button" data-cm-tpl="sports" class="btn-vox bg-white hover:bg-[#F4D03F] font-display font-bold text-[10px] py-1 rounded-lg cursor-pointer">สี 6 ทีม</button>
        </div>
      </div>
      ${menuBtn('save-local', CM_ICONS.download, api.isSaved?.() ? '✓ บันทึกข้อมูลแล้ว' : 'บันทึกไว้ในเครื่องนี้')}
      ${menuBtn('export-json', CM_ICONS.download, 'ส่งออกไฟล์ (.json)')}
      ${menuBtn('import-json', CM_ICONS.upload, 'โหลดไฟล์งาน (.json)')}
      ${menuBtn('reset-scores', CM_ICONS.reset, 'รีเซ็ตคะแนนทั้งหมด', true)}
    `;
    showMenuAt(x, y, 'Stage Menu', items, (m) => {
      m.querySelectorAll('[data-cm-slot]').forEach(btn => {
        btn.addEventListener('click', () => { closeMenu(); window.VoxCloudSync?.setSlot?.(Number(btn.dataset.cmSlot)); });
      });
      m.querySelectorAll('[data-cm-tpl]').forEach(btn => {
        btn.addEventListener('click', () => { closeMenu(); api.applyTemplate(btn.dataset.cmTpl); });
      });
      m.querySelector('[data-cm-action="save-local"]')?.addEventListener('click', () => { closeMenu(); api.saveLocally?.(); });
      m.querySelector('[data-cm-action="export-json"]')?.addEventListener('click', () => { closeMenu(); window.VoxCloudSync?.exportEventJson(); });
      m.querySelector('[data-cm-action="import-json"]')?.addEventListener('click', () => { closeMenu(); window.VoxCloudSync?.importEventJson(); });
      m.querySelector('[data-cm-action="reset-scores"]')?.addEventListener('click', () => { closeMenu(); api.resetScores(); });
    });
  }

  function openMediaEditor(gIdx) {
    const api = window.VoxScoreboardAPI;
    if (!api) return;
    const st = api.getState();
    const gTitle = st.games[gIdx] || `Activity ${gIdx + 1}`;
    const media = st.gameMedia[gIdx] || {};
    openQuickEditDialog({
      title: `กติกา & สื่อ: ${gTitle}`,
      fields: [
        { label: 'กติกา / คำอธิบาย', type: 'textarea', value: media.description || '', placeholder: 'พิมพ์รายละเอียดหรือกติกา...' },
        { label: 'ลิงก์ YouTube (ถ้ามี)', type: 'url', value: media.youtubeUrl || '', placeholder: 'https://youtu.be/...' },
        { label: 'ลิงก์รูปภาพ / GIF หรืออัปโหลดรูป', type: 'image', value: media.imageData || '', placeholder: 'https://... หรือกดเลือกรูป' }
      ],
      onSave: ([description, youtubeUrl, imageData]) => {
        const clean = window.VoxSecurity ? window.VoxSecurity.sanitizeUrl : (v => v.trim());
        api.updateGameMedia(gIdx, {
          description: description.trim(),
          youtubeUrl: clean(youtubeUrl),
          imageData: clean(imageData)
        });
      }
    });
  }

  window.VoxContextMenu = Object.freeze({ openMediaEditor, openForTarget });

  const stage = document.getElementById('stage-container');
  if (stage) {
    // Right-click anywhere on the scoreboard page (excluding inputs, modals, and floating toolbox windows)
    document.addEventListener('contextmenu', (e) => {
      if (e.target.closest('input, textarea, [contenteditable="true"], #vox-context-menu, #vox-quick-edit-modal, [id^="tb-win-"], #vox-toolbox, #center-timer-overlay, #theater-zoom-overlay')) return;
      e.preventDefault();
      openForTarget(e.target, e.clientX, e.clientY);
    });

    // Left-click on non-interactive blocks (Team cards & Header) opens their menu too
    stage.addEventListener('click', (e) => {
      if (e.target.closest('a, button, input, textarea, [data-game-index], #view-settings-popover, #stage-timer-pill')) return;
      if (e.target.closest('.team-row, header')) {
        e.stopPropagation();
        openForTarget(e.target, e.clientX, e.clientY);
      }
    });
  }
})();
