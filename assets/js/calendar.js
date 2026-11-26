(() => {
  'use strict';

  const STORAGE_KEY = 'helpdai_calendar_v1';
  const THAI_MONTHS_FULL = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
  const THAI_MONTHS_SHORT = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

  const esc = (s) => (window.VoxSecurity ? window.VoxSecurity.escapeHtml(s) : String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])));
  const uid = () => 'ev_' + Math.random().toString(36).slice(2, 9);

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

  let events = loadEvents();
  const now = new Date();
  let viewYear = now.getFullYear();
  let viewMonth = now.getMonth();
  let selectedDate = toIso(now);
  let formColor = '#F4D03F';

  function saveEvents() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(events)); } catch { /* ignore */ }
  }

  function showToast(msg, actionLabel = '', onAction = null) {
    let stack = document.getElementById('cal-toast-stack');
    if (!stack) {
      stack = document.createElement('div');
      stack.id = 'cal-toast-stack';
      stack.className = 'fixed top-4 left-1/2 -translate-x-1/2 z-[180] flex flex-col items-center gap-2 pointer-events-none';
      document.body.appendChild(stack);
    }
    const toast = document.createElement('div');
    toast.className = 'vox-panel-enter pointer-events-auto bg-[#111111] text-[#F4D03F] border-[2.5px] border-[#111111] rounded-xl px-4 py-2 shadow-[4px_4px_0px_#F4D03F] font-display font-extrabold text-xs sm:text-sm flex items-center gap-2.5';
    const span = document.createElement('span');
    span.textContent = msg;
    toast.appendChild(span);
    if (actionLabel && typeof onAction === 'function') {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'px-2 py-0.5 rounded-lg border-2 border-[#111111] bg-[#F4D03F] text-[#111111] font-display font-black text-xs cursor-pointer';
      btn.textContent = actionLabel;
      btn.addEventListener('click', () => { onAction(); toast.remove(); }, { once: true });
      toast.appendChild(btn);
    }
    stack.appendChild(toast);
    setTimeout(() => {
      if (!toast.isConnected) return;
      toast.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-6px)';
      setTimeout(() => toast.remove(), 260);
    }, actionLabel ? 4500 : 2400);
  }

  function formatThaiDateLong(iso) {
    const [y, m, d] = iso.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    try {
      return new Intl.DateTimeFormat('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(dt);
    } catch {
      return `${d} ${THAI_MONTHS_FULL[m - 1] || ''} ${y + 543}`;
    }
  }

  function renderGrid() {
    const gridEl = document.getElementById('cal-grid');
    const monthTitleEl = document.getElementById('cal-month-title');
    const monthCountEl = document.getElementById('cal-month-count');
    if (!gridEl) return;

    if (monthTitleEl) {
      monthTitleEl.textContent = `${THAI_MONTHS_FULL[viewMonth]} ${viewYear + 543}`;
    }

    const monthPrefix = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;
    const monthEventsTotal = events.filter((ev) => ev.date.startsWith(monthPrefix)).length;
    if (monthCountEl) monthCountEl.textContent = `${monthEventsTotal} กิจกรรมในเดือนนี้`;

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
      const isSelected = iso === selectedDate;

      const pillsHtml = dayEvs.slice(0, 2).map((ev) => `
        <div class="hidden sm:flex items-center gap-1 px-1 py-0.5 rounded text-[10px] font-semibold truncate border border-[#111111]/25 bg-white ${ev.done ? 'opacity-50 line-through' : ''}">
          <span class="w-1.5 h-1.5 rounded-full shrink-0" style="background:${esc(ev.color || '#F4D03F')}"></span>
          <span class="truncate text-[#111111]">${esc(ev.title)}</span>
        </div>
      `).join('');

      const dotsHtml = dayEvs.slice(0, 4).map((ev) => `
        <span class="sm:hidden w-1.5 h-1.5 rounded-full border border-[#111111]/40" style="background:${esc(ev.color || '#F4D03F')}"></span>
      `).join('');

      const moreHtml = dayEvs.length > 2
        ? `<span class="hidden sm:block text-[9px] font-bold text-[#111111]/55 pl-0.5">+${dayEvs.length - 2} เพิ่มเติม</span>`
        : '';

      cells.push(`
        <button type="button" data-cal-date="${iso}" class="cal-day-cell min-h-[54px] sm:min-h-[82px] p-1 sm:p-1.5 rounded-xl border-2 text-left flex flex-col gap-1 cursor-pointer ${
          isSelected
            ? 'border-[#111111] bg-[#FFFBEB] shadow-[3px_3px_0px_#111111]'
            : (isCurrentMonth ? 'border-[#111111]/20 bg-[#F8F6F0] hover:border-[#111111]' : 'border-transparent bg-[#F8F6F0]/40 opacity-45 hover:opacity-80')
        }">
          <div class="flex items-center justify-between w-full">
            <span class="w-6 h-6 rounded-md font-display font-black text-xs flex items-center justify-center ${
              isToday ? 'bg-[#111111] text-[#F4D03F]' : 'text-[#111111]'
            }">${dayNum}</span>
          </div>
          <div class="flex sm:hidden flex-wrap gap-0.5 mt-auto">${dotsHtml}</div>
          <div class="hidden sm:flex flex-col gap-0.5 w-full overflow-hidden">${pillsHtml}${moreHtml}</div>
        </button>
      `);
    }

    gridEl.innerHTML = cells.join('');
    gridEl.querySelectorAll('[data-cal-date]').forEach((btn) => {
      btn.addEventListener('click', () => {
        selectedDate = btn.dataset.calDate;
        const [y, m] = selectedDate.split('-').map(Number);
        if (y !== viewYear || (m - 1) !== viewMonth) {
          viewYear = y;
          viewMonth = m - 1;
        }
        renderAll();
      });
    });
  }

  function renderDayPanel() {
    const titleEl = document.getElementById('cal-selected-title');
    const badgeEl = document.getElementById('cal-day-badge');
    const listEl = document.getElementById('cal-day-events');

    if (titleEl) titleEl.textContent = formatThaiDateLong(selectedDate);
    const dayEvents = events
      .filter((ev) => ev.date === selectedDate)
      .sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99'));

    if (badgeEl) badgeEl.textContent = `${dayEvents.length} งาน`;
    if (!listEl) return;

    if (!dayEvents.length) {
      listEl.innerHTML = `
        <div class="bg-[#F8F6F0] border-2 border-dashed border-[#111111]/25 rounded-xl p-4 text-center text-xs font-semibold text-[#111111]/55">
          วันนี้ยังไม่มีกิจกรรม — เพิ่มนัดหมายด้านบนได้เลย
        </div>
      `;
      return;
    }

    listEl.innerHTML = dayEvents.map((ev) => `
      <div class="bg-[#F8F6F0] border-2 border-[#111111] rounded-xl px-3 py-2 flex items-start gap-2.5 shadow-[2px_2px_0px_#111111] ${ev.done ? 'opacity-60' : ''}">
        <button type="button" data-ev-toggle="${esc(ev.id)}" aria-label="สลับสถานะ" class="mt-0.5 w-5 h-5 rounded-md border-2 border-[#111111] ${ev.done ? 'bg-[#10B981] text-white' : 'bg-white'} font-black text-[11px] flex items-center justify-center shrink-0 cursor-pointer">
          ${ev.done ? '✓' : ''}
        </button>
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-1.5">
            <span class="w-2.5 h-2.5 rounded-full border border-[#111111] shrink-0" style="background:${esc(ev.color || '#F4D03F')}"></span>
            ${ev.time ? `<span class="font-mono font-bold text-[11px] text-[#111111]/70 shrink-0">${esc(ev.time)}</span>` : ''}
            <span class="thai-safe font-display font-bold text-xs sm:text-sm text-[#111111] truncate ${ev.done ? 'line-through' : ''}">${esc(ev.title)}</span>
          </div>
          ${ev.note ? `<p class="text-[11px] font-medium text-[#111111]/65 mt-0.5 break-words">${esc(ev.note)}</p>` : ''}
        </div>
        <button type="button" data-ev-del="${esc(ev.id)}" aria-label="ลบ" class="text-xs font-black text-[#111111]/40 hover:text-[#E74C3C] px-1 cursor-pointer">✕</button>
      </div>
    `).join('');

    listEl.querySelectorAll('[data-ev-toggle]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const item = events.find((x) => x.id === btn.dataset.evToggle);
        if (!item) return;
        item.done = !item.done;
        saveEvents();
        renderAll();
      });
    });

    listEl.querySelectorAll('[data-ev-del]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = events.findIndex((x) => x.id === btn.dataset.evDel);
        if (idx < 0) return;
        const removed = events.splice(idx, 1)[0];
        saveEvents();
        renderAll();
        showToast('ลบกิจกรรมแล้ว', 'ย้อนกลับ', () => {
          events.splice(idx, 0, removed);
          saveEvents();
          renderAll();
        });
      });
    });
  }

  function renderUpcoming() {
    const upEl = document.getElementById('cal-upcoming-list');
    if (!upEl) return;
    const todayStr = toIso(new Date());
    const upcoming = events
      .filter((ev) => !ev.done && ev.date >= todayStr)
      .sort((a, b) => a.date.localeCompare(b.date) || (a.time || '99:99').localeCompare(b.time || '99:99'))
      .slice(0, 8);

    if (!upcoming.length) {
      upEl.innerHTML = '<p class="text-xs text-[#111111]/50 py-1">ไม่มีรายการที่กำลังจะมาถึง</p>';
      return;
    }

    upEl.innerHTML = upcoming.map((ev) => {
      const mIdx = Number(ev.date.slice(5, 7)) - 1;
      const dayNum = Number(ev.date.slice(8, 10));
      const dateShort = ev.date === todayStr ? 'วันนี้' : `${dayNum} ${THAI_MONTHS_SHORT[mIdx] || ''}`;
      return `
        <button type="button" data-jump-date="${esc(ev.date)}" class="w-full text-left flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-[#F8F6F0] hover:bg-[#F4D03F]/40 border border-[#111111]/25 text-xs cursor-pointer transition-colors">
          <div class="flex items-center gap-2 min-w-0">
            <span class="w-2 h-2 rounded-full border border-[#111111] shrink-0" style="background:${esc(ev.color || '#F4D03F')}"></span>
            <span class="thai-safe font-semibold text-[#111111] truncate">${esc(ev.title)}</span>
          </div>
          <span class="font-display font-bold text-[10px] text-[#111111]/65 shrink-0">${esc(dateShort)}${ev.time ? ` • ${esc(ev.time)}` : ''}</span>
        </button>
      `;
    }).join('');

    upEl.querySelectorAll('[data-jump-date]').forEach((btn) => {
      btn.addEventListener('click', () => {
        selectedDate = btn.dataset.jumpDate;
        const [y, m] = selectedDate.split('-').map(Number);
        viewYear = y;
        viewMonth = m - 1;
        renderAll();
      });
    });
  }

  function renderAll() {
    renderGrid();
    renderDayPanel();
    renderUpcoming();
  }

  // Controls
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
    selectedDate = toIso(t);
    renderAll();
  });

  document.querySelectorAll('.cal-color-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      formColor = btn.dataset.calColor;
      document.querySelectorAll('.cal-color-btn').forEach((b) => {
        const on = b.dataset.calColor === formColor;
        b.classList.toggle('ring-2', on);
        b.classList.toggle('ring-[#111111]', on);
        b.classList.toggle('ring-offset-1', on);
      });
    });
  });

  document.getElementById('cal-add-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const titleIn = document.getElementById('cal-in-title');
    const timeIn = document.getElementById('cal-in-time');
    const noteIn = document.getElementById('cal-in-note');
    const title = (titleIn?.value || '').trim();
    if (!title) return;
    events.push({
      id: uid(),
      date: selectedDate,
      time: (timeIn?.value || '').trim(),
      title,
      note: (noteIn?.value || '').trim(),
      color: formColor,
      done: false
    });
    if (titleIn) titleIn.value = '';
    if (noteIn) noteIn.value = '';
    saveEvents();
    renderAll();
  });

  // Export .ics (Apple/Google Calendar compatible)
  document.getElementById('cal-export-ics-btn')?.addEventListener('click', () => {
    if (!events.length) {
      showToast('ยังไม่มีกิจกรรมให้ส่งออก');
      return;
    }
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//HelpDaiCha//Calendar//TH'];
    events.forEach((ev) => {
      const ymd = ev.date.replace(/-/g, '');
      lines.push('BEGIN:VEVENT');
      lines.push(`UID:${ev.id}@helpdai`);
      if (ev.time && /^\d{2}:\d{2}$/.test(ev.time)) {
        const hm = ev.time.replace(':', '') + '00';
        lines.push(`DTSTART:${ymd}T${hm}`);
      } else {
        lines.push(`DTSTART;VALUE=DATE:${ymd}`);
      }
      lines.push(`SUMMARY:${ev.title.replace(/[\r\n]/g, ' ')}`);
      if (ev.note) lines.push(`DESCRIPTION:${ev.note.replace(/[\r\n]/g, ' ')}`);
      lines.push('END:VEVENT');
    });
    lines.push('END:VCALENDAR');
    const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `helpdai-calendar-${toIso(new Date())}.ics`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    showToast('ส่งออกไฟล์ .ics เรียบร้อยแล้ว');
  });

  // JSON Backup & Restore
  document.getElementById('cal-export-btn')?.addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(events, null, 2)], { type: 'application/json;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `calendar-backup-${toIso(new Date())}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    showToast('สำรองข้อมูลปฏิทินแล้ว');
  });

  document.getElementById('cal-import-input')?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || ''));
        if (!Array.isArray(parsed)) throw new Error('Invalid');
        events = parsed.filter((ev) => ev && ev.date && ev.title);
        saveEvents();
        renderAll();
        showToast('กู้คืนปฏิทินเรียบร้อยแล้ว');
      } catch {
        alert('ไฟล์ JSON ไม่ถูกต้อง');
      }
    };
    reader.readAsText(file);
  });

  renderAll();
})();
