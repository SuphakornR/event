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
    menuEl.className = 'fixed z-[160] hidden flex-col gap-1 w-60 vox-card bg-[#F8F6F0] p-2 vox-panel-enter';
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
      const hide = () => {
        editModalEl.classList.add('hidden');
        editModalEl.classList.remove('flex');
      };
      document.getElementById('vqe-close').addEventListener('click', hide);
      document.getElementById('vqe-cancel').addEventListener('click', hide);
      editModalEl.addEventListener('click', (e) => {
        if (e.target === editModalEl) hide();
      });
    }

    document.getElementById('vqe-title').textContent = title;
    const fieldsWrap = document.getElementById('vqe-fields');
    fieldsWrap.innerHTML = fields.map((f, i) => `
      <label class="flex flex-col gap-1">
        <span class="text-xs font-display font-bold text-[#111111]/80">${f.label}</span>
        ${f.type === 'textarea'
          ? `<textarea data-vqe-idx="${i}" rows="3" placeholder="${f.placeholder || ''}" class="thai-safe w-full bg-white border-2 border-[#111111] rounded-xl px-3 py-2 text-sm"></textarea>`
          : `<input data-vqe-idx="${i}" type="${f.type || 'text'}" placeholder="${f.placeholder || ''}" class="thai-safe-tight w-full bg-white border-2 border-[#111111] rounded-xl px-3 py-2 text-sm font-bold" />`
        }
      </label>
    `).join('');

    fields.forEach((f, i) => {
      const inp = fieldsWrap.querySelector(`[data-vqe-idx="${i}"]`);
      if (inp) inp.value = f.value || '';
    });

    const saveBtn = document.getElementById('vqe-save');
    const newSave = saveBtn.cloneNode(true);
    saveBtn.parentNode.replaceChild(newSave, saveBtn);
    newSave.addEventListener('click', () => {
      const vals = fields.map((_, i) => fieldsWrap.querySelector(`[data-vqe-idx="${i}"]`)?.value ?? '');
      onSave(vals);
      editModalEl.classList.add('hidden');
      editModalEl.classList.remove('flex');
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
    reset: '<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>'
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
      const activeG = api.getActiveGameIdx();
      const gTitle = st.games[activeG] || 'Activity';

      let selectedG = activeG;

      const items = `
        <div class="px-1 py-1">
          ${st.games.length > 1 ? `
            <select id="cm-team-game-sel" class="w-full mb-1.5 bg-[#F8F6F0] border-2 border-[#111111] rounded-lg px-2 py-1 text-[11px] font-display font-bold text-[#111111]">
              ${st.games.map((g, gi) => `<option value="${gi}" ${gi === selectedG ? 'selected' : ''}>${g}</option>`).join('')}
            </select>
          ` : `<div class="text-[10px] font-bold text-[#111111]/60 mb-1 truncate">${gTitle}</div>`}
          <div class="grid grid-cols-5 gap-1">
            <button type="button" data-cm-score="-5" class="btn-vox bg-white hover:bg-red-50 text-[#E74C3C] font-display font-black text-[11px] py-1 rounded-lg cursor-pointer">−5</button>
            <button type="button" data-cm-score="-1" class="btn-vox bg-white hover:bg-red-50 text-[#E74C3C] font-display font-black text-[11px] py-1 rounded-lg cursor-pointer">−1</button>
            <button type="button" data-cm-score="1" class="btn-vox bg-white hover:bg-yellow-100 text-[#111111] font-display font-black text-[11px] py-1 rounded-lg cursor-pointer">+1</button>
            <button type="button" data-cm-score="5" class="btn-vox bg-white hover:bg-yellow-100 text-[#111111] font-display font-black text-[11px] py-1 rounded-lg cursor-pointer">+5</button>
            <button type="button" data-cm-score="10" class="btn-vox bg-[#F4D03F] hover:bg-[#f2c61d] text-[#111111] font-display font-black text-[11px] py-1 rounded-lg cursor-pointer">+10</button>
          </div>
        </div>
        ${menuBtn('rename-team', CM_ICONS.edit, 'เปลี่ยนชื่อทีม')}
        ${st.teams.length < 8 ? menuBtn('add-team', '+', 'เพิ่มทีมใหม่') : ''}
        ${st.teams.length > 2 ? menuBtn('remove-team', '−', 'ลบทีมนี้', true) : ''}
      `;

      showMenuAt(x, y, team.name, items, (m) => {
        m.querySelector('#cm-team-game-sel')?.addEventListener('change', (e) => {
          selectedG = Number(e.target.value) || 0;
        });
        m.querySelectorAll('[data-cm-score]').forEach(btn => {
          btn.addEventListener('click', () => {
            api.adjustScore(teamId, selectedG, Number(btn.dataset.cmScore));
            closeMenu();
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

    // 2. Activity Card
    const gameCard = target.closest('[data-game-index]');
    if (gameCard) {
      const gIdx = Number(gameCard.dataset.gameIndex);
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
              { label: 'ลิงก์รูปภาพ / GIF (ถ้ามี)', type: 'text', value: media.imageData || '', placeholder: 'https://...' }
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

    // 4. General Stage Background (Stage-wide reset only; Teams/Activities/Victory live in their dedicated places)
    const items = `
      ${menuBtn('reset-scores', CM_ICONS.reset, 'รีเซ็ตคะแนนทั้งหมด', true)}
    `;
    showMenuAt(x, y, 'Stage Menu', items, (m) => {
      m.querySelector('[data-cm-action="reset-scores"]')?.addEventListener('click', () => { closeMenu(); api.resetScores(); });
    });
  }

  const stage = document.getElementById('stage-container');
  if (stage) {
    // Right-click anywhere on stage
    stage.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      openForTarget(e.target, e.clientX, e.clientY);
    });

    // Left-click on non-interactive blocks (Team cards & Header) opens their menu too
    stage.addEventListener('click', (e) => {
      if (e.target.closest('a, button, input, textarea, [data-game-index], #view-settings-popover')) return;
      if (e.target.closest('.team-row, header')) {
        e.stopPropagation();
        openForTarget(e.target, e.clientX, e.clientY);
      }
    });
  }
})();
