(() => {
  'use strict';

  const STORAGE_KEY = 'helpdai_budget_planner_v1';
  const THAI_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

  const esc = (s) => (window.VoxSecurity ? window.VoxSecurity.escapeHtml(s) : String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])));
  const uid = () => 'bg_' + Math.random().toString(36).slice(2, 9);
  const fmtMoney = (n) => {
    const val = Math.round(Number(n) || 0);
    return val.toLocaleString('th-TH');
  };
  const fmtSigned = (n) => {
    const val = Math.round(Number(n) || 0);
    return `${val >= 0 ? '+' : '−'}${Math.abs(val).toLocaleString('th-TH')} ฿`;
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
        { id: uid(), title: 'เงินเดือน / รายรับประจำ', amount: 22000, type: 'income', freq: 'monthly', day: 25, date: '', category: 'รายได้', enabled: true },
        { id: uid(), title: 'ค่าหอพัก + น้ำไฟ', amount: 6500, type: 'expense', freq: 'monthly', day: 1, date: '', category: 'ที่พัก/บิล', enabled: true },
        { id: uid(), title: 'ค่าอาหาร & ของใช้รายเดือน', amount: 6000, type: 'expense', freq: 'monthly', day: 5, date: '', category: 'อาหาร', enabled: true },
        { id: uid(), title: 'ค่าเดินทาง & อินเทอร์เน็ต', amount: 2200, type: 'expense', freq: 'monthly', day: 10, date: '', category: 'เดินทาง', enabled: true },
        { id: uid(), title: 'ออมเข้ากองทุนสำรอง', amount: 3000, type: 'expense', freq: 'monthly', day: 26, date: '', category: 'ออม/ลงทุน', enabled: true },
        { id: uid(), title: 'ทดลองซื้ออุปกรณ์ใหม่ (What-if)', amount: 8500, type: 'expense', freq: 'once', day: 1, date: addDaysIso(20), category: 'ทดลองซื้อ', enabled: true }
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

  function saveState() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* ignore */ }
  }

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

  // Today label
  const todayLabelEl = document.getElementById('budget-today-label');
  if (todayLabelEl) {
    try {
      todayLabelEl.textContent = `เริ่มจาก ${new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date())}`;
    } catch {
      todayLabelEl.textContent = toIsoDate(new Date());
    }
  }

  // ========================================================================
  // FORWARD CASH-FLOW SIMULATION ENGINE
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
              category: it.category || 'ทั่วไป',
              type: it.type,
              freq: it.freq,
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
            category: it.category || 'ทั่วไป',
            type: it.type,
            freq: it.freq,
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

    // Build month buckets for chart & timeline
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
      months.push({ key, label, openBal, closeBal, income, expense, net: income - expense, events: mEvents });
    }

    const monthlyRecurringIn = activeItems.filter((i) => i.freq === 'monthly' && i.type === 'income').reduce((s, i) => s + (Number(i.amount) || 0), 0);
    const monthlyRecurringOut = activeItems.filter((i) => i.freq === 'monthly' && i.type === 'expense').reduce((s, i) => s + (Number(i.amount) || 0), 0);

    return {
      endBalance: running,
      lowestBalance,
      lowestDate,
      monthlyRecurringIn,
      monthlyRecurringOut,
      monthlyRecurringNet: monthlyRecurringIn - monthlyRecurringOut,
      months,
      events: timelineEvents
    };
  }

  // ========================================================================
  // RENDERING: KPIs, CHART, ITEMS LIST, TIMELINE
  // ========================================================================
  function renderChart(forecast) {
    const wrap = document.getElementById('budget-chart-wrap');
    const readout = document.getElementById('chart-hover-readout');
    if (!wrap) return;

    const points = [
      { label: 'วันนี้', balance: Number(state.startBalance) || 0, net: 0 },
      ...forecast.months.map((m) => ({ label: m.label, balance: m.closeBal, net: m.net }))
    ];

    const W = 640;
    const H = 200;
    const padL = 56;
    const padR = 20;
    const padT = 18;
    const padB = 28;
    const plotW = W - padL - padR;
    const plotH = H - padT - padB;

    const allVals = [...points.map((p) => p.balance), state.safeBuffer, 0];
    let minV = Math.min(...allVals);
    let maxV = Math.max(...allVals);
    if (minV === maxV) { minV -= 1000; maxV += 1000; }
    const padRange = (maxV - minV) * 0.12;
    minV -= padRange;
    maxV += padRange;

    const toX = (i) => padL + (points.length <= 1 ? plotW / 2 : (i / (points.length - 1)) * plotW);
    const toY = (v) => padT + ((maxV - v) / (maxV - minV)) * plotH;

    const coords = points.map((p, i) => ({ ...p, x: toX(i), y: toY(p.balance), idx: i }));
    const linePath = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');
    const areaPath = `${linePath} L${coords[coords.length - 1].x.toFixed(1)},${(padT + plotH).toFixed(1)} L${coords[0].x.toFixed(1)},${(padT + plotH).toFixed(1)} Z`;

    const bufY = toY(state.safeBuffer);
    const zeroY = toY(0);

    wrap.innerHTML = `
      <svg viewBox="0 0 ${W} ${H}" class="w-full h-full select-none overflow-visible" role="img" aria-label="กราฟคาดการณ์เงินคงเหลือล่วงหน้า">
        <defs>
          <linearGradient id="budgetAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#F4D03F" stop-opacity="0.55" />
            <stop offset="100%" stop-color="#F4D03F" stop-opacity="0.05" />
          </linearGradient>
        </defs>

        <!-- Zero line if visible -->
        ${zeroY >= padT && zeroY <= padT + plotH ? `<line x1="${padL}" y1="${zeroY.toFixed(1)}" x2="${W - padR}" y2="${zeroY.toFixed(1)}" stroke="#111111" stroke-opacity="0.2" stroke-width="1" />` : ''}

        <!-- Safe buffer threshold line -->
        ${bufY >= padT && bufY <= padT + plotH ? `
          <line x1="${padL}" y1="${bufY.toFixed(1)}" x2="${W - padR}" y2="${bufY.toFixed(1)}" stroke="#E74C3C" stroke-width="1.5" stroke-dasharray="5 4" />
          <text x="${padL + 4}" y="${Math.max(padT + 10, bufY - 4).toFixed(1)}" font-size="10" font-weight="700" fill="#E74C3C">สำรอง ${fmtMoney(state.safeBuffer)}</text>
        ` : ''}

        <!-- Y-Axis Min / Max -->
        <text x="${padL - 6}" y="${padT + 8}" text-anchor="end" font-size="10" font-weight="700" fill="#111111" opacity="0.55">${fmtMoney(maxV)}</text>
        <text x="${padL - 6}" y="${padT + plotH}" text-anchor="end" font-size="10" font-weight="700" fill="#111111" opacity="0.55">${fmtMoney(minV)}</text>

        <!-- Area & Line -->
        <path d="${areaPath}" fill="url(#budgetAreaGrad)" />
        <path d="${linePath}" fill="none" stroke="#111111" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" />

        <!-- X-Axis Labels & Interactive Points -->
        ${coords.map((c) => {
          const isDanger = c.balance < state.safeBuffer;
          const showLabel = coords.length <= 8 || c.idx % 2 === 0 || c.idx === coords.length - 1;
          return `
            ${showLabel ? `<text x="${c.x.toFixed(1)}" y="${H - 6}" text-anchor="middle" font-size="10" font-weight="700" fill="#111111" opacity="0.65">${esc(c.label)}</text>` : ''}
            <circle cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="5" fill="${isDanger ? '#E74C3C' : '#F4D03F'}" stroke="#111111" stroke-width="2.2" class="chart-pt cursor-pointer" data-pt-idx="${c.idx}" />
          `;
        }).join('')}
      </svg>
    `;

    wrap.querySelectorAll('.chart-pt').forEach((dot) => {
      const showPoint = () => {
        const p = points[Number(dot.dataset.ptIdx)];
        if (p && readout) {
          readout.textContent = `${p.label}: ${fmtMoney(p.balance)} ฿${p.net ? ` (${fmtSigned(p.net)})` : ''}`;
        }
      };
      dot.addEventListener('mouseenter', showPoint);
      dot.addEventListener('click', showPoint);
    });
  }

  function renderItemsList() {
    const listEl = document.getElementById('budget-items-list');
    if (!listEl) return;
    if (!state.items.length) {
      listEl.innerHTML = `
        <div class="bg-[#F8F6F0] border-2 border-dashed border-[#111111]/30 rounded-2xl p-6 text-center text-xs font-semibold text-[#111111]/55">
          ยังไม่มีรายการ — เพิ่มรายรับหรือรายจ่ายด้านบนเพื่อดูไทม์ไลน์เงินล่วงหน้า
        </div>
      `;
      return;
    }

    listEl.innerHTML = state.items.map((it) => {
      const isIncome = it.type === 'income';
      const on = it.enabled !== false;
      const whenLabel = it.freq === 'monthly' ? `ทุกวันที่ ${it.day}` : (it.date || 'ครั้งเดียว');
      return `
        <div class="bg-[#F8F6F0] border-2 border-[#111111] rounded-xl px-3 py-2 flex items-center gap-2.5 transition-opacity ${on ? 'shadow-[2px_2px_0px_#111111]' : 'opacity-50'}">
          <input type="checkbox" data-item-toggle="${esc(it.id)}" ${on ? 'checked' : ''} aria-label="เปิดหรือปิดรายการ" class="w-4 h-4 accent-[#111111] cursor-pointer shrink-0" />
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-1.5">
              <span class="thai-safe font-display font-bold text-xs sm:text-sm text-[#111111] truncate">${esc(it.title)}</span>
              <span class="px-1.5 py-0.5 rounded bg-white border border-[#111111]/30 text-[10px] font-bold text-[#111111]/70 shrink-0">${esc(it.category || 'ทั่วไป')}</span>
            </div>
            <div class="text-[11px] font-semibold text-[#111111]/55">${esc(whenLabel)}</div>
          </div>
          <span class="font-display font-black text-xs sm:text-sm tabular-nums shrink-0 ${isIncome ? 'text-[#10B981]' : 'text-[#E74C3C]'}">
            ${isIncome ? '+' : '−'}${fmtMoney(it.amount)} ฿
          </span>
          <button type="button" data-item-del="${esc(it.id)}" aria-label="ลบรายการ" class="px-1.5 py-1 rounded text-xs font-black text-[#111111]/40 hover:text-[#E74C3C] cursor-pointer">✕</button>
        </div>
      `;
    }).join('');

    listEl.querySelectorAll('[data-item-toggle]').forEach((cb) => {
      cb.addEventListener('change', () => {
        const item = state.items.find((x) => x.id === cb.dataset.itemToggle);
        if (!item) return;
        item.enabled = cb.checked;
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
        showToast('ลบรายการแล้ว', 'ย้อนกลับ', () => {
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
    if (countEl) countEl.textContent = `${forecast.events.length} รายการล่วงหน้า`;
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
                  <span class="font-mono text-[11px] font-bold text-[#111111]/55 shrink-0">${esc(ev.date.slice(5))}</span>
                  <span class="thai-safe font-semibold text-[#111111] truncate">${esc(ev.title)}</span>
                </div>
                <div class="flex items-center gap-2.5 shrink-0 tabular-nums">
                  <span class="font-display font-bold ${isIncome ? 'text-[#10B981]' : 'text-[#E74C3C]'}">${fmtSigned(ev.signed)}</span>
                  <span class="font-display font-black px-1.5 py-0.5 rounded ${warn ? 'bg-[#E74C3C] text-white' : 'bg-white border border-[#111111]/30 text-[#111111]'}">${fmtMoney(ev.balanceAfter)}</span>
                </div>
              </div>
            `;
          }).join('')
        : '<p class="text-[11px] text-[#111111]/45 pt-1 border-t border-dashed border-[#111111]/15">ไม่มีรายการเคลื่อนไหวในเดือนนี้</p>';

      return `
        <div class="bg-[#F8F6F0] border-2 border-[#111111] rounded-2xl p-3 shadow-[3px_3px_0px_#111111]">
          <div class="flex flex-wrap items-center justify-between gap-2 mb-2">
            <div class="flex items-center gap-2">
              <span class="px-2.5 py-0.5 rounded-lg bg-[#111111] text-[#F4D03F] font-display font-black text-xs">${esc(m.label)}</span>
              <span class="text-[11px] font-bold ${m.net >= 0 ? 'text-[#10B981]' : 'text-[#E74C3C]'}">${fmtSigned(m.net)}</span>
            </div>
            <div class="flex items-center gap-1.5 text-xs font-display font-black">
              <span class="text-[#111111]/55 font-semibold">สิ้นเดือน:</span>
              <span class="${belowBuffer ? 'text-[#E74C3C]' : 'text-[#111111]'} tabular-nums">${fmtMoney(m.closeBal)} ฿</span>
            </div>
          </div>
          <div class="flex flex-col">${rowsHtml}</div>
        </div>
      `;
    }).join('');
  }

  function renderKpis(forecast) {
    const netEl = document.getElementById('kpi-monthly-net');
    const subEl = document.getElementById('kpi-monthly-sub');
    const endEl = document.getElementById('kpi-end-balance');
    const lowEl = document.getElementById('kpi-lowest-note');

    if (netEl) {
      netEl.textContent = fmtSigned(forecast.monthlyRecurringNet);
      netEl.classList.toggle('text-[#10B981]', forecast.monthlyRecurringNet >= 0);
      netEl.classList.toggle('text-[#E74C3C]', forecast.monthlyRecurringNet < 0);
    }
    if (subEl) {
      subEl.textContent = `รับ ${fmtMoney(forecast.monthlyRecurringIn)} • จ่าย ${fmtMoney(forecast.monthlyRecurringOut)}`;
    }
    if (endEl) {
      endEl.textContent = `${fmtMoney(forecast.endBalance)} ฿`;
      endEl.classList.toggle('text-[#E74C3C]', forecast.endBalance < state.safeBuffer);
      endEl.classList.toggle('text-[#111111]', forecast.endBalance >= state.safeBuffer);
    }
    if (lowEl) {
      if (forecast.lowestBalance < 0) {
        lowEl.textContent = `⚠ ติดลบ ${fmtMoney(forecast.lowestBalance)} ฿ (${forecast.lowestDate})`;
        lowEl.className = 'text-[11px] font-black text-[#E74C3C]';
      } else if (forecast.lowestBalance < state.safeBuffer) {
        lowEl.textContent = `⚠ ต่ำกว่าสำรอง: ${fmtMoney(forecast.lowestBalance)} ฿ (${forecast.lowestDate})`;
        lowEl.className = 'text-[11px] font-black text-[#E74C3C]';
      } else {
        lowEl.textContent = `✓ ต่ำสุด ${fmtMoney(forecast.lowestBalance)} ฿ (ปลอดภัย)`;
        lowEl.className = 'text-[11px] font-bold text-[#10B981]';
      }
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
    renderKpis(forecast);
    renderChart(forecast);
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

  document.querySelectorAll('.type-toggle-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      formType = btn.dataset.itemType;
      document.querySelectorAll('.type-toggle-btn').forEach((b) => {
        const on = b.dataset.itemType === formType;
        b.classList.toggle('bg-[#111111]', on);
        b.classList.toggle('text-[#F4D03F]', on);
        b.classList.toggle('bg-white', !on);
        b.classList.toggle('text-[#111111]', !on);
      });
    });
  });

  const freqSelect = document.getElementById('in-item-freq');
  const dayWrap = document.getElementById('wrap-day-of-month');
  const dateIn = document.getElementById('in-item-date');
  if (dateIn) dateIn.value = addDaysIso(7);

  freqSelect?.addEventListener('change', () => {
    const isOnce = freqSelect.value === 'once';
    dayWrap?.classList.toggle('hidden', isOnce);
    dayWrap?.classList.toggle('flex', !isOnce);
    dateIn?.classList.toggle('hidden', !isOnce);
  });

  document.getElementById('budget-add-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const titleEl = document.getElementById('in-item-title');
    const amountEl = document.getElementById('in-item-amount');
    const dayEl = document.getElementById('in-item-day');
    const catEl = document.getElementById('in-item-cat');

    const title = (titleEl?.value || '').trim();
    const amount = Math.max(1, Number(amountEl?.value) || 0);
    const freq = freqSelect?.value || 'monthly';
    if (!title || !amount) return;

    state.items.unshift({
      id: uid(),
      title,
      amount,
      type: formType,
      freq,
      day: Math.min(31, Math.max(1, Number(dayEl?.value) || 1)),
      date: freq === 'once' ? (dateIn?.value || addDaysIso(7)) : '',
      category: catEl?.value || 'ทั่วไป',
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
    showToast('โหลดข้อมูลตัวอย่างแล้ว', 'ย้อนกลับ', () => {
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
    showToast('ล้างรายการทั้งหมดแล้ว', 'ย้อนกลับ', () => {
      state.items = prev;
      saveState();
      renderAll();
    });
  });

  document.getElementById('budget-export-btn')?.addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `monthly-budget-${toIsoDate(new Date())}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    showToast('ดาวน์โหลดไฟล์สำรองข้อมูลแล้ว');
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
        showToast('กู้คืนข้อมูลเรียบร้อยแล้ว');
      } catch {
        alert('ไฟล์ JSON ไม่ถูกต้อง');
      }
    };
    reader.readAsText(file);
  });

  renderAll();
})();
