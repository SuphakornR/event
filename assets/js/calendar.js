(() => {
  'use strict';

  const STORAGE_KEY = 'helpdai_calendar_v1';
  const THAI_MONTHS_FULL = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
  const PASTEL_MAP = {
    '#F4D03F': '#FFF3A8',
    '#2980B9': '#D6ECFF',
    '#E74C3C': '#FFD6DF',
    '#10B981': '#D7F7E3'
  };
  const VALID_PAPERS = ['#FFF3A8', '#FFD6DF', '#D7F7E3', '#D6ECFF', '#F8F6F0'];

  const esc = (s) => (window.VoxSecurity ? window.VoxSecurity.escapeHtml(s) : String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])));
  const uid = () => 'ev_' + Math.random().toString(36).slice(2, 9);

  function toPaperColor(c) {
    if (PASTEL_MAP[c]) return PASTEL_MAP[c];
    if (VALID_PAPERS.includes(c)) return c;
    return '#FFF3A8';
  }

  function toIso(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function loadEvents() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch { /* ignore */ }
    return [];
  }

  function saveEvents() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(events)); } catch { /* ignore */ }
  }

  let events = loadEvents();
  const now = new Date();
  let viewYear = now.getFullYear();
  let viewMonth = now.getMonth();

  let modalDate = toIso(now);
  let editingId = null;
  let noteColor = '#FFF3A8';
  let draggedNoteId = null;

  function showToast(msg, actionLabel = '', onAction = null) {
    let stack = document.getElementById('cal-toast-stack');
    if (!stack) {
      stack = document.createElement('div');
      stack.id = 'cal-toast-stack';
      stack.className = 'fixed bottom-5 left-1/2 -translate-x-1/2 z-[180] flex flex-col items-center gap-2 pointer-events-none';
      document.body.appendChild(stack);
    }
    const toast = document.createElement('div');
    toast.className = 'pointer-events-auto bg-[#111111]/90 text-[#FCFBF7] rounded-full px-4 py-1.5 shadow-lg font-display font-semibold text-xs flex items-center gap-2.5';
    const span = document.createElement('span');
    span.textContent = msg;
    toast.appendChild(span);
    if (actionLabel && typeof onAction === 'function') {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'px-2 py-0.5 rounded-full bg-[#FFF3A8] text-[#111111] font-display font-bold text-[11px] cursor-pointer';
      btn.textContent = actionLabel;
      btn.addEventListener('click', () => { onAction(); toast.remove(); }, { once: true });
      toast.appendChild(btn);
    }
    stack.appendChild(toast);
    setTimeout(() => {
      if (!toast.isConnected) return;
      toast.style.transition = 'opacity 0.22s ease, transform 0.22s ease';
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(6px)';
      setTimeout(() => toast.remove(), 240);
    }, actionLabel ? 4200 : 2000);
  }

  function formatThaiDate(iso) {
    const [y, m, d] = iso.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    try {
      return new Intl.DateTimeFormat('th-TH', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' }).format(dt);
    } catch {
      return `${d} ${THAI_MONTHS_FULL[m - 1] || ''} ${y + 543}`;
    }
  }

  function getTiltForId(id, idx) {
    let hash = idx * 17;
    for (let i = 0; i < id.length; i++) hash += id.charCodeAt(i);
    const tilts = [-2.1, 1.6, -1.2, 2.0, -0.7, 1.1];
    return tilts[Math.abs(hash) % tilts.length];
  }

  function renderGrid() {
    const gridEl = document.getElementById('cal-grid');
    const monthTitleEl = document.getElementById('cal-month-title');
    if (!gridEl) return;

    if (monthTitleEl) {
      monthTitleEl.textContent = `${THAI_MONTHS_FULL[viewMonth]} ${viewYear + 543}`;
    }

    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const prevMonthDays = new Date(viewYear, viewMonth, 0).getDate();
    const todayStr = toIso(new Date());

    const byDate = new Map();
    events.forEach((ev) => {
      if (!byDate.has(ev.date)) byDate.set(ev.date, []);
      byDate.get(ev.date).push(ev);
    });
    byDate.forEach((list) => list.sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99')));

    const cells = [];
    for (let i = 0; i < 42; i++) {
      let cellYear = viewYear;
      let cellMonth = viewMonth;
      let dayNum = i - firstDay + 1;
      let isCurrentMonth = true;

      if (dayNum <= 0) {
        isCurrentMonth = false;
        cellMonth = viewMonth - 1;
        if (cellMonth < 0) { cellMonth = 11; cellYear -= 1; }
        dayNum = prevMonthDays + dayNum;
      } else if (dayNum > daysInMonth) {
        isCurrentMonth = false;
        dayNum -= daysInMonth;
        cellMonth = viewMonth + 1;
        if (cellMonth > 11) { cellMonth = 0; cellYear += 1; }
      }

      const iso = `${cellYear}-${String(cellMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      const dayEvs = byDate.get(iso) || [];
      const isToday = iso === todayStr;
      const col = i % 7;

      const notesHtml = dayEvs.map((ev, idx) => {
        const bg = toPaperColor(ev.color);
        const tilt = getTiltForId(ev.id || String(idx), idx);
        const delay = (0.03 + (col * 0.018) + (idx * 0.025)).toFixed(3);
        return `
          <div
            draggable="true"
            data-note-id="${esc(ev.id)}"
            style="background:${esc(bg)}; --note-tilt:${tilt}deg; --note-delay:${delay}s;"
            class="note-paper px-1.5 py-1 rounded-[2px] text-[10px] sm:text-[11px] leading-tight text-[#111111] cursor-pointer select-none ${ev.done ? 'opacity-50 line-through' : ''}"
            title="${esc(ev.title)}"
          >
            ${ev.time ? `<span class="font-mono text-[9px] text-[#111111]/55 mr-0.5">${esc(ev.time)}</span>` : ''}
            <span class="thai-safe font-medium break-words">${esc(ev.title)}</span>
          </div>
        `;
      }).join('');

      cells.push(`
        <div
          data-cal-date="${iso}"
          class="cal-day-cell group relative min-h-[82px] sm:min-h-[112px] p-1.5 sm:p-2 border-r border-b border-[#111111]/10 flex flex-col gap-1.5 cursor-pointer ${
            isCurrentMonth ? '' : 'opacity-35'
          }"
        >
          <div class="flex items-center justify-between">
            <span class="w-6 h-6 rounded-full font-display font-semibold text-xs flex items-center justify-center ${
              isToday
                ? 'border border-[#111111] text-[#111111] font-bold bg-[#FFF3A8]/65'
                : (col === 0 ? 'text-[#C0392B]/80' : col === 6 ? 'text-[#2471A3]/80' : 'text-[#111111]/75')
            }">${dayNum}</span>
            <span class="opacity-0 group-hover:opacity-100 text-[10px] text-[#111111]/35 transition-opacity select-none">+</span>
          </div>
          <div class="flex flex-col gap-1.5">${notesHtml}</div>
        </div>
      `);
    }

    gridEl.innerHTML = cells.join('');

    // Click cell to add a new note paper
    gridEl.querySelectorAll('[data-cal-date]').forEach((cell) => {
      cell.addEventListener('click', (e) => {
        if (e.target.closest('[data-note-id]')) return;
        openNoteModal(cell.dataset.calDate, null);
      });

      cell.addEventListener('dragover', (e) => {
        if (!draggedNoteId) return;
        e.preventDefault();
        cell.classList.add('is-drop-target');
      });
      cell.addEventListener('dragleave', () => {
        cell.classList.remove('is-drop-target');
      });
      cell.addEventListener('drop', (e) => {
        e.preventDefault();
        cell.classList.remove('is-drop-target');
        if (!draggedNoteId) return;
        const item = events.find((x) => x.id === draggedNoteId);
        draggedNoteId = null;
        if (!item || item.date === cell.dataset.calDate) return;
        item.date = cell.dataset.calDate;
        saveEvents();
        renderGrid();
      });
    });

    // Click or drag existing note paper
    gridEl.querySelectorAll('[data-note-id]').forEach((noteEl) => {
      noteEl.addEventListener('click', (e) => {
        e.stopPropagation();
        const item = events.find((x) => x.id === noteEl.dataset.noteId);
        if (item) openNoteModal(item.date, item);
      });
      noteEl.addEventListener('dragstart', (e) => {
        draggedNoteId = noteEl.dataset.noteId;
        if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
      });
      noteEl.addEventListener('dragend', () => {
        draggedNoteId = null;
        gridEl.querySelectorAll('.is-drop-target').forEach((c) => c.classList.remove('is-drop-target'));
      });
    });
  }

  // Note Paper Modal
  const modalEl = document.getElementById('note-modal');
  const formEl = document.getElementById('note-form');
  const dateLabelEl = document.getElementById('note-modal-date');
  const textIn = document.getElementById('note-in-text');
  const timeIn = document.getElementById('note-in-time');
  const toggleDoneBtn = document.getElementById('note-toggle-done');
  const deleteBtn = document.getElementById('note-delete-btn');

  function setNoteColor(c) {
    noteColor = toPaperColor(c);
    if (formEl) formEl.style.background = noteColor;
    document.querySelectorAll('.note-color-dot').forEach((dot) => {
      const active = dot.dataset.noteColor === noteColor;
      dot.classList.toggle('ring-1', active);
      dot.classList.toggle('ring-[#111111]', active);
      dot.classList.toggle('ring-offset-1', active);
    });
  }

  function openNoteModal(iso, existing) {
    modalDate = iso;
    editingId = existing ? existing.id : null;
    if (dateLabelEl) dateLabelEl.textContent = formatThaiDate(iso);

    if (existing) {
      if (textIn) textIn.value = existing.title || '';
      if (timeIn) timeIn.value = existing.time || '';
      setNoteColor(existing.color || '#FFF3A8');
      if (toggleDoneBtn) {
        toggleDoneBtn.classList.remove('hidden');
        toggleDoneBtn.textContent = existing.done ? 'ทำยังไม่เสร็จ' : 'ขีดฆ่า (เสร็จแล้ว)';
      }
      if (deleteBtn) deleteBtn.classList.remove('hidden');
    } else {
      if (textIn) textIn.value = '';
      if (timeIn) timeIn.value = '';
      setNoteColor('#FFF3A8');
      if (toggleDoneBtn) toggleDoneBtn.classList.add('hidden');
      if (deleteBtn) deleteBtn.classList.add('hidden');
    }

    if (modalEl) {
      modalEl.classList.remove('hidden');
      modalEl.classList.add('flex');
      setTimeout(() => textIn?.focus(), 20);
    }
  }

  function closeNoteModal() {
    if (!modalEl) return;
    modalEl.classList.add('hidden');
    modalEl.classList.remove('flex');
    editingId = null;
  }

  document.querySelectorAll('.note-color-dot').forEach((dot) => {
    dot.addEventListener('click', () => setNoteColor(dot.dataset.noteColor));
  });

  document.getElementById('note-modal-close')?.addEventListener('click', closeNoteModal);
  modalEl?.addEventListener('click', (e) => {
    if (e.target === modalEl) closeNoteModal();
  });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalEl && !modalEl.classList.contains('hidden')) {
      closeNoteModal();
    }
  });

  formEl?.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = (textIn?.value || '').trim();
    if (!title) return;
    const time = (timeIn?.value || '').trim();

    if (editingId) {
      const item = events.find((x) => x.id === editingId);
      if (item) {
        item.title = title;
        item.time = time;
        item.color = noteColor;
      }
    } else {
      events.push({
        id: uid(),
        date: modalDate,
        time,
        title,
        note: '',
        color: noteColor,
        done: false
      });
    }
    saveEvents();
    closeNoteModal();
    renderGrid();
  });

  toggleDoneBtn?.addEventListener('click', () => {
    if (!editingId) return;
    const item = events.find((x) => x.id === editingId);
    if (!item) return;
    item.done = !item.done;
    saveEvents();
    closeNoteModal();
    renderGrid();
  });

  deleteBtn?.addEventListener('click', () => {
    if (!editingId) return;
    const idx = events.findIndex((x) => x.id === editingId);
    if (idx < 0) return;
    const removed = events.splice(idx, 1)[0];
    saveEvents();
    closeNoteModal();
    renderGrid();
    showToast('ดึงกระดาษโน้ตออกแล้ว', 'แปะคืน', () => {
      events.splice(idx, 0, removed);
      saveEvents();
      renderGrid();
    });
  });

  // Month Navigation
  document.getElementById('cal-prev-btn')?.addEventListener('click', () => {
    viewMonth -= 1;
    if (viewMonth < 0) { viewMonth = 11; viewYear -= 1; }
    renderGrid();
  });
  document.getElementById('cal-next-btn')?.addEventListener('click', () => {
    viewMonth += 1;
    if (viewMonth > 11) { viewMonth = 0; viewYear += 1; }
    renderGrid();
  });
  document.getElementById('cal-today-btn')?.addEventListener('click', () => {
    const t = new Date();
    viewYear = t.getFullYear();
    viewMonth = t.getMonth();
    renderGrid();
  });

  // Draggable Paperweight
  const paperweight = document.getElementById('cal-paperweight');
  const paperSheet = document.getElementById('calendar-paper');
  if (paperweight && paperSheet) {
    let dragging = false;
    let startX = 0;
    let startY = 0;
    let baseX = 0;
    let baseY = 0;

    paperweight.addEventListener('pointerdown', (e) => {
      dragging = true;
      startX = e.clientX;
      startY = e.clientY;
      paperweight.setPointerCapture(e.pointerId);
      paperweight.style.transition = 'none';
    });
    paperweight.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const dx = baseX + (e.clientX - startX);
      const dy = baseY + (e.clientY - startY);
      paperweight.style.transform = `translate(${dx}px, ${dy}px) scale(1.02)`;
    });
    const endDrag = (e) => {
      if (!dragging) return;
      dragging = false;
      baseX += (e.clientX - startX);
      baseY += (e.clientY - startY);
      paperweight.style.transition = '';
      paperweight.style.transform = `translate(${baseX}px, ${baseY}px)`;
    };
    paperweight.addEventListener('pointerup', endDrag);
    paperweight.addEventListener('pointercancel', endDrag);
  }

  renderGrid();

  // Trigger right-side slide-in + note inertia sway on open and bfcache 2nd open
  function playSlideIn() {
    if (!paperSheet) return;
    paperSheet.classList.remove('is-sliding-in');
    void paperSheet.offsetWidth;
    paperSheet.classList.add('is-sliding-in');
  }

  requestAnimationFrame(playSlideIn);
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) playSlideIn();
  });
})();
