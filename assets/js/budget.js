(() => {
  'use strict';

  const STORAGE_KEY = 'helpdai_budget_planner_v1';
  const THAI_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

  const ICONS = {
    check: '<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
    alert: '<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4"/><circle cx="12" cy="17" r="1" fill="currentColor"/><path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/></svg>',
    incomeBadge: '<span class="w-6 h-6 rounded-lg border-[1.5px] border-[#111111] bg-[#10B981] text-white flex items-center justify-center shrink-0"><svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg></span>',
    expenseBadge: '<span class="w-6 h-6 rounded-lg border-[1.5px] border-[#111111] bg-[#E74C3C] text-white flex items-center justify-center shrink-0"><svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M5 12h14"/></svg></span>',
    incomeDot: '<span class="w-2.5 h-2.5 rounded-full bg-[#10B981] border border-[#111111] shrink-0"></span>',
    expenseDot: '<span class="w-2.5 h-2.5 rounded-full bg-[#E74C3C] border border-[#111111] shrink-0"></span>',
    trash: '<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>'
  };

  const esc = (s) => (window.VoxSecurity ? window.VoxSecurity.escapeHtml(s) : String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])));
  const uid = () => 'bg_' + Math.random().toString(36).slice(2, 9);
  const fmtMoney = (n) => Math.round(Number(n) || 0).toLocaleString('th-TH');
  const fmtCompact = (n) => {
    const val = Math.round(Number(n) || 0);
    if (Math.abs(val) >= 100000) return `${(val / 1000).toFixed(0)}k`;
    if (Math.abs(val) >= 10000) return `${(val / 1000).toFixed(1).replace(/\.0$/, '')}k`;
    return val.toLocaleString('th-TH');
  };
  const fmtSigned = (n) => {
    const val = Math.round(Number(n) || 0);
    return `${val >= 0 ? '+' : '−'}${Math.abs(val).toLocaleString('th-TH')} ฿`;
  };
  const fmtThaiShortDate = (iso) => {
    if (!iso || iso.length < 10) return iso || '';
    const mIdx = Number(iso.slice(5, 7)) - 1;
    const d = Number(iso.slice(8, 10));
    return `${d} ${THAI_MONTHS[mIdx] || ''}`;
  };

  function toIsoDate(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function addDaysIso(days) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return toIsoDate(d);
  }

  function makeSampleState() {
    return {
      startBalance: 15000,
      safeBuffer: 5000,
      horizonMonths: 6,
      items: [
        { id: uid(), title: 'เงินเดือน / ค่าขนม', amount: 22000, type: 'income', freq: 'monthly', day: 25, date: '', enabled: true },
        { id: uid(), title: 'ค่าห้อง + น้ำไฟ', amount: 6500, type: 'expense', freq: 'monthly', day: 1, date: '', enabled: true },
        { id: uid(), title: 'ค่าข้าว & ของกิน', amount: 6000, type: 'expense', freq: 'monthly', day: 5, date: '', enabled: true },
        { id: uid(), title: 'ค่าเดินทาง & เน็ต', amount: 2200, type: 'expense', freq: 'monthly', day: 10, date: '', enabled: true },
        { id: uid(), title: 'เก็บออมประจำเดือน', amount: 3000, type: 'expense', freq: 'monthly', day: 26, date: '', enabled: true },
        { id: uid(), title: 'ลองซื้อของที่อยากได้', amount: 8500, type: 'expense', freq: 'once', day: 1, date: addDaysIso(20), enabled: true }
      ]
    };
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.items)) {
          return {
            startBalance: Number(parsed.startBalance) || 0,
            safeBuffer: Math.max(0, Number(parsed.safeBuffer) || 0),
            horizonMonths: [3, 6, 12].includes(Number(parsed.horizonMonths)) ? Number(parsed.horizonMonths) : 6,
            items: parsed.items
          };
        }
      }
    } catch { /* ignore */ }
    return makeSampleState();
  }

  let state = loadState();
  let formType = 'expense';
  let formFreq = 'monthly';

  function saveState() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* ignore */ }
  }

  function setFormType(nextType) {
    formType = nextType === 'income' ? 'income' : 'expense';
    document.querySelectorAll('.type-toggle-btn').forEach((b) => {
      const on = b.dataset.itemType === formType;
      const isInc = b.dataset.itemType === 'income';
      b.classList.remove('bg-[#10B981]', 'bg-[#E74C3C]', 'text-white', 'bg-white', 'text-[#111111]', 'shadow-[2px_2px_0px_#111111]');
      if (on) {
        b.classList.add(isInc ? 'bg-[#10B981]' : 'bg-[#E74C3C]', 'text-white', 'shadow-[2px_2px_0px_#111111]');
      } else {
        b.classList.add('bg-white', 'text-[#111111]');
      }
    });
  }

  // Custom Vox Frequency Dropdown
  const freqWrap = document.getElementById('freq-dropdown-wrap');
  const freqBtn = document.getElementById('freq-dropdown-btn');
  const freqMenu = document.getElementById('freq-dropdown-menu');
  const freqLabel = document.getElementById('freq-dropdown-label');
  const freqChevron = document.getElementById('freq-dropdown-chevron');
  const dayWrap = document.getElementById('wrap-day-of-month');
  const dateIn = document.getElementById('in-item-date');
  if (dateIn) dateIn.value = addDaysIso(7);

  function setFreqDropdownOpen(open) {
    if (!freqMenu || !freqBtn) return;
    freqMenu.classList.toggle('is-open', open);
    freqBtn.setAttribute('aria-expanded', String(open));
    if (freqChevron) freqChevron.style.transform = open ? 'rotate(180deg)' : 'rotate(0deg)';
  }

  function setFormFreq(nextFreq) {
    formFreq = nextFreq === 'once' ? 'once' : 'monthly';
    if (freqLabel) freqLabel.textContent = formFreq === 'once' ? 'แค่ครั้งเดียว' : 'เกิดซ้ำทุกเดือน';
    document.querySelectorAll('[data-freq-opt]').forEach((opt) => {
      const active = opt.dataset.freqOpt === formFreq;
      opt.classList.toggle('bg-[#111111]', active);
      opt.classList.toggle('text-[#F4D03F]', active);
      opt.classList.toggle('text-[#111111]', !active);
    });
    const isOnce = formFreq === 'once';
    dayWrap?.classList.toggle('hidden', isOnce);
    dayWrap?.classList.toggle('flex', !isOnce);
    dateIn?.classList.toggle('hidden', !isOnce);
  }

  freqBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = freqMenu?.classList.contains('is-open');
    setFreqDropdownOpen(!isOpen);
  });

  document.querySelectorAll('[data-freq-opt]').forEach((opt) => {
    opt.addEventListener('click', () => {
      setFormFreq(opt.dataset.freqOpt);
      setFreqDropdownOpen(false);
    });
  });

  document.addEventListener('click', (e) => {
    if (freqWrap && !freqWrap.contains(e.target)) setFreqDropdownOpen(false);
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') setFreqDropdownOpen(false);
  });

  function showToast(msg, actionLabel = '', onAction = null) {
    let stack = document.getElementById('budget-toast-stack');
    if (!stack) {
      stack = document.createElement('div');
      stack.id = 'budget-toast-stack';
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

  const todayLabelEl = document.getElementById('budget-today-label');
  if (todayLabelEl) {
    try {
      todayLabelEl.textContent = `เริ่มนับตั้งแต่วันนี้ (${new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date())})`;
    } catch {
      todayLabelEl.textContent = toIsoDate(new Date());
    }
  }

  // ========================================================================
  // FORWARD CASH-FLOW ENGINE
  // ========================================================================
  function buildForecast() {
    const now = new Date();
    const todayStr = toIsoDate(now);
    const startYear = now.getFullYear();
    const startMonth = now.getMonth();
    const horizon = state.horizonMonths || 6;

    const endBoundary = new Date(startYear, startMonth + horizon, 0);
    const endStr = toIsoDate(endBoundary);

    const events = [];
    const activeItems = state.items.filter((it) => it.enabled !== false && (Number(it.amount) || 0) > 0);

    for (let mOffset = 0; mOffset < horizon; mOffset++) {
      const targetMonthStart = new Date(startYear, startMonth + mOffset, 1);
      const y = targetMonthStart.getFullYear();
      const m = targetMonthStart.getMonth();
      const daysInMonth = new Date(y, m + 1, 0).getDate();

      activeItems.forEach((it) => {
        if (it.freq === 'monthly') {
          const day = Math.min(Math.max(1, Number(it.day) || 1), daysInMonth);
          const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          if (dateStr >= todayStr) {
            events.push({
              date: dateStr,
              monthKey: `${y}-${String(m + 1).padStart(2, '0')}`,
              title: it.title,
              type: it.type,
              amount: Number(it.amount) || 0,
              signed: it.type === 'income' ? (Number(it.amount) || 0) : -(Number(it.amount) || 0)
            });
          }
        }
      });
    }

    activeItems.forEach((it) => {
      if (it.freq === 'once' && it.date) {
        if (it.date >= todayStr && it.date <= endStr) {
          events.push({
            date: it.date,
            monthKey: it.date.slice(0, 7),
            title: it.title,
            type: it.type,
            amount: Number(it.amount) || 0,
            signed: it.type === 'income' ? (Number(it.amount) || 0) : -(Number(it.amount) || 0)
          });
        }
      }
    });

    events.sort((a, b) => a.date.localeCompare(b.date) || b.signed - a.signed);

    let running = Number(state.startBalance) || 0;
    let lowestBalance = running;
    let lowestDate = todayStr;

    const timelineEvents = events.map((ev) => {
      running += ev.signed;
      if (running < lowestBalance) {
        lowestBalance = running;
        lowestDate = ev.date;
      }
      return { ...ev, balanceAfter: running };
    });

    const months = [];
    let monthCursorBalance = Number(state.startBalance) || 0;
    for (let mOffset = 0; mOffset < horizon; mOffset++) {
      const d = new Date(startYear, startMonth + mOffset, 1);
      const y = d.getFullYear();
      const m = d.getMonth();
      const key = `${y}-${String(m + 1).padStart(2, '0')}`;
      const label = `${THAI_MONTHS[m]} ${String(y + 543).slice(-2)}`;
      const mEvents = timelineEvents.filter((e) => e.monthKey === key);
      const income = mEvents.filter((e) => e.signed > 0).reduce((s, e) => s + e.signed, 0);
      const expense = mEvents.filter((e) => e.signed < 0).reduce((s, e) => s + Math.abs(e.signed), 0);
      const openBal = monthCursorBalance;
      const closeBal = mEvents.length ? mEvents[mEvents.length - 1].balanceAfter : openBal;
      monthCursorBalance = closeBal;
      months.push({ key, label, shortLabel: THAI_MONTHS[m], openBal, closeBal, income, expense, net: income - expense, events: mEvents });
    }

    const monthlyRecurringIn = activeItems.filter((i) => i.freq === 'monthly' && i.type === 'income').reduce((s, i) => s + (Number(i.amount) || 0), 0);
    const monthlyRecurringOut = activeItems.filter((i) => i.freq === 'monthly' && i.type === 'expense').reduce((s, i) => s + (Number(i.amount) || 0), 0);

    return {
      endBalance: running,
      lowestBalance,
      lowestDate,
      monthlyRecurringNet: monthlyRecurringIn - monthlyRecurringOut,
      months,
      events: timelineEvents
    };
  }

  // ========================================================================
  // RENDERING: VERDICT, KPIs, BAR GRAPH, LIST, TIMELINE
  // ========================================================================
  function renderVerdict(forecast) {
    const banner = document.getElementById('budget-verdict-banner');
    const iconEl = document.getElementById('verdict-icon');
    const textEl = document.getElementById('verdict-text');
    const simPill = document.getElementById('test-sim-pill');
    const simLabel = document.getElementById('test-sim-label');

    if (banner && iconEl && textEl) {
      banner.classList.remove('bg-[#10B981]/15', 'bg-[#F4D03F]/30', 'bg-[#E74C3C]/15');
      iconEl.classList.remove('bg-[#10B981]', 'bg-[#F4D03F]', 'bg-[#E74C3C]', 'text-white', 'text-[#111111]');

      if (forecast.lowestBalance < 0) {
        banner.classList.add('bg-[#E74C3C]/15');
        iconEl.classList.add('bg-[#E74C3C]', 'text-white');
        iconEl.innerHTML = ICONS.alert;
        textEl.textContent = `เงินจะไม่พอใช้! วันที่ ${fmtThaiShortDate(forecast.lowestDate)} เงินจะติดลบ ${fmtMoney(forecast.lowestBalance)} ฿ — ลองปิดบางรายจ่ายด้านซ้าย`;
      } else if (forecast.lowestBalance < state.safeBuffer) {
        banner.classList.add('bg-[#F4D03F]/30');
        iconEl.classList.add('bg-[#F4D03F]', 'text-[#111111]');
        iconEl.innerHTML = ICONS.alert;
        textEl.textContent = `ใกล้ถึงเงินเก็บแล้ว! วันที่ ${fmtThaiShortDate(forecast.lowestDate)} เงินจะลดเหลือ ${fmtMoney(forecast.lowestBalance)} ฿ (ต่ำกว่า ${fmtMoney(state.safeBuffer)} ฿)`;
      } else {
        banner.classList.add('bg-[#10B981]/15');
        iconEl.classList.add('bg-[#10B981]', 'text-white');
        iconEl.innerHTML = ICONS.check;
        textEl.textContent = `สบายมาก! เงินพอใช้ตลอด ${state.horizonMonths} เดือน (ช่วงที่เหลือน้อยสุดยังมี ${fmtMoney(forecast.lowestBalance)} ฿)`;
      }
    }

    const disabledCount = state.items.filter((it) => it.enabled === false).length;
    if (simPill && simLabel) {
      if (disabledCount) {
        simPill.classList.remove('hidden');
        simPill.classList.add('inline-flex');
        simLabel.textContent = `ลองปิดไว้ ${disabledCount} รายการ`;
      } else {
        simPill.classList.add('hidden');
        simPill.classList.remove('inline-flex');
      }
    }
  }

  function renderBarGraph(forecast) {
    const wrap = document.getElementById('budget-chart-wrap');
    if (!wrap) return;

    const bars = forecast.months;
    const maxVal = Math.max(1000, ...bars.map((m) => Math.max(0, m.closeBal)), state.safeBuffer);

    wrap.innerHTML = `
      <div class="grid gap-2 items-end h-44 sm:h-48 pt-6" style="grid-template-columns: repeat(${bars.length}, minmax(0, 1fr));">
        ${bars.map((m) => {
          const val = m.closeBal;
          const isLow = val < state.safeBuffer;
          const pct = val <= 0 ? 6 : Math.max(10, Math.round((val / maxVal) * 100));
          const barColor = val < 0 ? 'bg-[#E74C3C]' : (isLow ? 'bg-[#F39C12]' : 'bg-[#F4D03F]');
          return `
            <button type="button" data-bar-month="${esc(m.key)}" class="group h-full flex flex-col items-center justify-end gap-1 cursor-pointer focus:outline-none" title="${esc(m.label)}: เหลือ ${fmtMoney(val)} ฿">
              <span class="font-display font-black text-[10px] sm:text-xs tabular-nums ${isLow ? 'text-[#E74C3C]' : 'text-[#111111]'} group-hover:scale-110 transition-transform">${fmtCompact(val)}</span>
              <div class="w-full max-w-[46px] flex-1 flex items-end justify-center">
                <div class="bar-col-fill w-full rounded-t-xl border-2 border-[#111111] shadow-[2px_0px_0px_#111111] ${barColor} group-hover:-translate-y-0.5" style="height: ${pct}%;"></div>
              </div>
              <span class="font-display font-bold text-[10px] sm:text-xs text-[#111111]/75 truncate w-full text-center">${esc(bars.length > 6 ? m.shortLabel : m.label)}</span>
            </button>
          `;
        }).join('')}
      </div>
    `;

    wrap.querySelectorAll('[data-bar-month]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const card = document.getElementById(`month-card-${btn.dataset.barMonth}`);
        if (card) {
          card.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
          card.classList.remove('month-card-flash');
          void card.offsetWidth;
          card.classList.add('month-card-flash');
        }
      });
    });
  }

  function renderItemsList() {
    const listEl = document.getElementById('budget-items-list');
    if (!listEl) return;
    if (!state.items.length) {
      listEl.innerHTML = `
        <div class="bg-[#F8F6F0] border-2 border-dashed border-[#111111]/30 rounded-2xl p-6 text-center text-xs font-semibold text-[#111111]/55">
          ยังไม่มีรายการ — กดปุ่ม "เลือกไว" ด้านบนได้เลย
        </div>
      `;
      return;
    }

    listEl.innerHTML = state.items.map((it) => {
      const isIncome = it.type === 'income';
      const on = it.enabled !== false;
      const whenLabel = it.freq === 'monthly' ? `ทุกวันที่ ${it.day}` : fmtThaiShortDate(it.date || '');
      return `
        <div class="bg-[#F8F6F0] border-2 border-[#111111] rounded-xl px-3 py-2 flex items-center gap-2.5 transition-all duration-150 ${on ? 'shadow-[2px_2px_0px_#111111]' : 'opacity-50 bg-white'}">
          <button type="button" role="switch" aria-checked="${on}" data-item-toggle="${esc(it.id)}" title="${on ? 'กดปิดเพื่อลองดู' : 'กดเปิด'}" class="vox-switch"></button>
          ${isIncome ? ICONS.incomeBadge : ICONS.expenseBadge}
          <div class="min-w-0 flex-1">
            <div class="thai-safe font-display font-bold text-xs sm:text-sm text-[#111111] truncate ${on ? '' : 'line-through'}">${esc(it.title)}</div>
            <div class="text-[11px] font-semibold text-[#111111]/55">${esc(whenLabel)}</div>
          </div>
          <div class="flex items-center gap-0.5 shrink-0">
            <span class="font-display font-black text-xs ${isIncome ? 'text-[#10B981]' : 'text-[#E74C3C]'}">${isIncome ? '+' : '−'}</span>
            <input type="number" min="0" step="100" value="${Math.round(Number(it.amount) || 0)}" data-item-amount="${esc(it.id)}" aria-label="จำนวนเงิน ${esc(it.title)}" class="w-20 text-right font-display font-black text-xs sm:text-sm tabular-nums bg-white/85 hover:bg-white focus:bg-white border border-transparent hover:border-[#111111]/40 focus:border-[#111111] rounded-lg px-1.5 py-0.5 focus:outline-none ${isIncome ? 'text-[#10B981]' : 'text-[#E74C3C]'}" />
          </div>
          <button type="button" data-item-del="${esc(it.id)}" aria-label="ลบรายการ" class="p-1 rounded text-[#111111]/40 hover:text-[#E74C3C] cursor-pointer transition-colors">${ICONS.trash}</button>
        </div>
      `;
    }).join('');

    listEl.querySelectorAll('[data-item-toggle]').forEach((sw) => {
      sw.addEventListener('click', () => {
        const item = state.items.find((x) => x.id === sw.dataset.itemToggle);
        if (!item) return;
        item.enabled = item.enabled === false;
        saveState();
        renderAll();
      });
    });

    listEl.querySelectorAll('[data-item-amount]').forEach((inp) => {
      inp.addEventListener('change', () => {
        const item = state.items.find((x) => x.id === inp.dataset.itemAmount);
        if (!item) return;
        item.amount = Math.max(0, Number(inp.value) || 0);
        saveState();
        renderAll();
      });
    });

    listEl.querySelectorAll('[data-item-del]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = state.items.findIndex((x) => x.id === btn.dataset.itemDel);
        if (idx < 0) return;
        const removed = state.items.splice(idx, 1)[0];
        saveState();
        renderAll();
        showToast('ลบรายการแล้ว', 'เอากลับมา', () => {
          state.items.splice(idx, 0, removed);
          saveState();
          renderAll();
        });
      });
    });
  }

  function renderTimeline(forecast) {
    const listEl = document.getElementById('budget-timeline-list');
    const countEl = document.getElementById('timeline-events-count');
    if (countEl) countEl.textContent = `${forecast.events.length} รายการ`;
    if (!listEl) return;

    listEl.innerHTML = forecast.months.map((m) => {
      const belowBuffer = m.closeBal < state.safeBuffer;
      const rowsHtml = m.events.length
        ? m.events.map((ev) => {
            const isIncome = ev.signed >= 0;
            const warn = ev.balanceAfter < state.safeBuffer;
            return `
              <div class="flex items-center justify-between gap-2 py-1.5 border-t border-dashed border-[#111111]/15 text-xs">
                <div class="flex items-center gap-2 min-w-0">
                  <span class="px-1.5 py-0.5 rounded bg-white border border-[#111111]/25 font-display font-bold text-[10px] text-[#111111]/75 shrink-0">${esc(fmtThaiShortDate(ev.date))}</span>
                  ${isIncome ? ICONS.incomeDot : ICONS.expenseDot}
                  <span class="thai-safe font-semibold text-[#111111] truncate">${esc(ev.title)}</span>
                </div>
                <div class="flex items-center gap-2 shrink-0 tabular-nums">
                  <span class="font-display font-bold ${isIncome ? 'text-[#10B981]' : 'text-[#E74C3C]'}">${fmtSigned(ev.signed)}</span>
                  <span class="font-display font-black px-2 py-0.5 rounded-md ${warn ? 'bg-[#E74C3C] text-white' : 'bg-white border border-[#111111]/30 text-[#111111]'}">${fmtMoney(ev.balanceAfter)}</span>
                </div>
              </div>
            `;
          }).join('')
        : '<p class="text-[11px] text-[#111111]/45 pt-1.5 border-t border-dashed border-[#111111]/15">เดือนนี้ไม่มีรายการเงินเข้า-ออก</p>';

      return `
        <div id="month-card-${esc(m.key)}" class="bg-[#F8F6F0] border-2 border-[#111111] rounded-2xl p-3 shadow-[3px_3px_0px_#111111] transition-shadow">
          <div class="flex flex-wrap items-center justify-between gap-2 mb-2">
            <div class="flex items-center gap-2">
              <span class="px-2.5 py-0.5 rounded-lg bg-[#111111] text-[#F4D03F] font-display font-black text-xs">${esc(m.label)}</span>
              <span class="text-xs font-bold ${m.net >= 0 ? 'text-[#10B981]' : 'text-[#E74C3C]'}">${m.net >= 0 ? 'ได้เพิ่ม' : 'ใช้เกิน'} ${fmtSigned(m.net)}</span>
            </div>
            <div class="flex items-center gap-1.5 text-xs font-display font-bold">
              <span class="text-[#111111]/60 text-[11px]">เหลือสิ้นเดือน:</span>
              <span class="font-black px-2.5 py-0.5 rounded-lg border border-[#111111] ${belowBuffer ? 'bg-[#E74C3C] text-white' : 'bg-[#F4D03F] text-[#111111]'} tabular-nums">${fmtMoney(m.closeBal)} ฿</span>
            </div>
          </div>
          <div class="flex flex-col">${rowsHtml}</div>
        </div>
      `;
    }).join('');
  }

  function renderKpis(forecast) {
    const endTitleEl = document.getElementById('kpi-end-title');
    const endEl = document.getElementById('kpi-end-balance');
    const netEl = document.getElementById('kpi-monthly-net');

    if (endTitleEl) {
      endTitleEl.textContent = state.horizonMonths === 12 ? 'อีก 1 ปีจะมีเงินเหลือ' : `อีก ${state.horizonMonths} เดือนจะมีเงินเหลือ`;
    }
    if (endEl) {
      endEl.textContent = `${fmtMoney(forecast.endBalance)} ฿`;
      endEl.classList.toggle('text-[#E74C3C]', forecast.endBalance < state.safeBuffer);
      endEl.classList.toggle('text-[#111111]', forecast.endBalance >= state.safeBuffer);
    }
    if (netEl) {
      netEl.textContent = `เฉลี่ย ${fmtSigned(forecast.monthlyRecurringNet)} / เดือน`;
      netEl.classList.toggle('text-[#10B981]', forecast.monthlyRecurringNet >= 0);
      netEl.classList.toggle('text-[#E74C3C]', forecast.monthlyRecurringNet < 0);
    }
  }

  function renderAll() {
    const startIn = document.getElementById('in-start-balance');
    const bufIn = document.getElementById('in-safe-buffer');
    if (startIn && document.activeElement !== startIn) startIn.value = String(state.startBalance);
    if (bufIn && document.activeElement !== bufIn) bufIn.value = String(state.safeBuffer);

    document.querySelectorAll('.horizon-btn').forEach((btn) => {
      const on = Number(btn.dataset.horizon) === state.horizonMonths;
      btn.classList.toggle('bg-[#111111]', on);
      btn.classList.toggle('text-[#F4D03F]', on);
      btn.classList.toggle('text-[#111111]', !on);
    });

    const forecast = buildForecast();
    renderVerdict(forecast);
    renderKpis(forecast);
    renderBarGraph(forecast);
    renderItemsList();
    renderTimeline(forecast);
  }

  // ========================================================================
  // INPUT & FORM HANDLERS
  // ========================================================================
  document.getElementById('in-start-balance')?.addEventListener('input', (e) => {
    state.startBalance = Number(e.target.value) || 0;
    saveState();
    renderAll();
  });

  document.getElementById('in-safe-buffer')?.addEventListener('input', (e) => {
    state.safeBuffer = Math.max(0, Number(e.target.value) || 0);
    saveState();
    renderAll();
  });

  document.querySelectorAll('.horizon-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.horizonMonths = Number(btn.dataset.horizon) || 6;
      saveState();
      renderAll();
    });
  });

  document.getElementById('enable-all-items-btn')?.addEventListener('click', () => {
    state.items.forEach((it) => { it.enabled = true; });
    saveState();
    renderAll();
  });

  document.querySelectorAll('.type-toggle-btn').forEach((btn) => {
    btn.addEventListener('click', () => setFormType(btn.dataset.itemType));
  });

  const QUICK_PRESETS = {
    salary: { type: 'income', title: 'เงินเดือน / ค่าขนม', freq: 'monthly', day: 25 },
    rent: { type: 'expense', title: 'ค่าห้อง + น้ำไฟ', freq: 'monthly', day: 1 },
    food: { type: 'expense', title: 'ค่าข้าว & ของกิน', freq: 'monthly', day: 5 },
    buy: { type: 'expense', title: 'ลองซื้อของที่อยากได้', freq: 'once', day: 1 }
  };

  document.querySelectorAll('[data-quick-preset]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const p = QUICK_PRESETS[btn.dataset.quickPreset];
      if (!p) return;
      setFormType(p.type);
      setFormFreq(p.freq);
      const titleEl = document.getElementById('in-item-title');
      const dayEl = document.getElementById('in-item-day');
      const amountEl = document.getElementById('in-item-amount');
      if (titleEl) titleEl.value = p.title;
      if (dayEl) dayEl.value = String(p.day);
      amountEl?.focus();
    });
  });

  document.getElementById('budget-add-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const titleEl = document.getElementById('in-item-title');
    const amountEl = document.getElementById('in-item-amount');
    const dayEl = document.getElementById('in-item-day');

    const title = (titleEl?.value || '').trim();
    const amount = Math.max(1, Number(amountEl?.value) || 0);
    if (!title || !amount) return;

    state.items.unshift({
      id: uid(),
      title,
      amount,
      type: formType,
      freq: formFreq,
      day: Math.min(31, Math.max(1, Number(dayEl?.value) || 1)),
      date: formFreq === 'once' ? (dateIn?.value || addDaysIso(7)) : '',
      enabled: true
    });

    if (titleEl) titleEl.value = '';
    if (amountEl) amountEl.value = '';
    saveState();
    renderAll();
  });

  document.getElementById('budget-sample-btn')?.addEventListener('click', () => {
    const prev = JSON.stringify(state);
    state = makeSampleState();
    saveState();
    renderAll();
    showToast('ใส่ตัวอย่างให้แล้ว', 'เอากลับมา', () => {
      state = JSON.parse(prev);
      saveState();
      renderAll();
    });
  });

  document.getElementById('budget-clear-btn')?.addEventListener('click', () => {
    if (!state.items.length) return;
    const prev = [...state.items];
    state.items = [];
    saveState();
    renderAll();
    showToast('ลบรายการทั้งหมดแล้ว', 'เอากลับมา', () => {
      state.items = prev;
      saveState();
      renderAll();
    });
  });

  document.getElementById('budget-export-btn')?.addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `my-money-plan-${toIsoDate(new Date())}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    showToast('บันทึกไฟล์เรียบร้อยแล้ว');
  });

  document.getElementById('budget-import-input')?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || ''));
        if (!parsed || !Array.isArray(parsed.items)) throw new Error('Invalid');
        state = {
          startBalance: Number(parsed.startBalance) || 0,
          safeBuffer: Math.max(0, Number(parsed.safeBuffer) || 0),
          horizonMonths: [3, 6, 12].includes(Number(parsed.horizonMonths)) ? Number(parsed.horizonMonths) : 6,
          items: parsed.items
        };
        saveState();
        renderAll();
        showToast('เปิดไฟล์เรียบร้อยแล้ว');
      } catch {
        alert('ไฟล์นี้เปิดไม่ได้ ลองเลือกไฟล์ .json ที่บันทึกจากหน้านี้');
      }
    };
    reader.readAsText(file);
  });

  setFormType('expense');
  setFormFreq('monthly');
  renderAll();
})();
