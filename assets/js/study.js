(() => {
  'use strict';

  const STORAGE_KEY = 'helpdai_study_planner_v1';
  const DAYS = [
    { key: 'mon', label: 'จ.' },
    { key: 'tue', label: 'อ.' },
    { key: 'wed', label: 'พ.' },
    { key: 'thu', label: 'พฤ.' },
    { key: 'fri', label: 'ศ.' },
    { key: 'sat', label: 'ส.' },
    { key: 'sun', label: 'อา.' }
  ];

  const esc = (s) => (window.VoxSecurity ? window.VoxSecurity.escapeHtml(s) : String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])));
  const uid = () => 'st_' + Math.random().toString(36).slice(2, 9);
  const todayIso = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  function defaultDayKey() {
    const map = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    return map[new Date().getDay()] || 'mon';
  }

  function makeDefaultState() {
    return {
      stats: { date: todayIso(), focusMinutes: 0, sessions: 0 },
      tasks: [
        { id: uid(), title: 'ทบทวนสรุปบทเรียนก่อนสอบ 1 รอบ', subject: 'การเรียน', due: todayIso(), priority: 'high', done: false },
        { id: uid(), title: 'จัดกระเป๋าและเตรียมอุปกรณ์สำหรับพรุ่งนี้', subject: 'ชีวิตประจำวัน', due: todayIso(), priority: 'normal', done: false }
      ],
      schedule: {
        mon: [{ id: uid(), time: '09:00 - 10:30', title: 'ทบทวนวิชาหลัก / อ่านหนังสือ', note: 'โต๊ะอ่านหนังสือ' }],
        tue: [], wed: [], thu: [], fri: [], sat: [], sun: []
      },
      flashcards: [
        { id: uid(), front: 'เทคนิค Pomodoro 1 รอบมาตรฐานคือกี่นาที?', back: 'โฟกัส 25 นาที + พัก 5 นาที (ครบ 4 รอบ พักยาว 15–30 นาที)' },
        { id: uid(), front: 'Active Recall คืออะไร?', back: 'การฝึกดึงคำตอบจากความจำด้วยตัวเอง เช่น การใช้แฟลชการ์ด แทนการอ่านซ้ำเฉยๆ' }
      ]
    };
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.tasks)) {
          const today = todayIso();
          const stats = parsed.stats?.date === today
            ? parsed.stats
            : { date: today, focusMinutes: 0, sessions: 0 };
          return {
            stats,
            tasks: parsed.tasks,
            schedule: parsed.schedule || { mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] },
            flashcards: Array.isArray(parsed.flashcards) ? parsed.flashcards : []
          };
        }
      }
    } catch { /* ignore */ }
    return makeDefaultState();
  }

  let state = loadState();
  let taskFilter = 'all';
  let activeDay = defaultDayKey();
  let fcIndex = 0;
  let fcFlipped = false;

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch { /* ignore */ }
  }

  // Date label
  const dateLabelEl = document.getElementById('study-date-label');
  if (dateLabelEl) {
    try {
      dateLabelEl.textContent = new Intl.DateTimeFormat('th-TH', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date());
    } catch {
      dateLabelEl.textContent = todayIso();
    }
  }

  function playChime() {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      const now = ctx.currentTime;
      [523.25, 659.25, 783.99].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.001, now + i * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.16, now + i * 0.12 + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.45);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.12);
        osc.stop(now + i * 0.12 + 0.48);
      });
    } catch { /* ignore */ }
  }

  function showToast(msg, actionLabel = '', onAction = null) {
    let stack = document.getElementById('study-toast-stack');
    if (!stack) {
      stack = document.createElement('div');
      stack.id = 'study-toast-stack';
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
    }, actionLabel ? 4500 : 2500);
  }

  // ========================================================================
  // 1. POMODORO FOCUS TIMER
  // ========================================================================
  let focusMins = 25;
  let breakMins = 5;
  let isBreak = false;
  let remainingSec = focusMins * 60;
  let timerRunning = false;
  let timerInterval = null;

  const timeDisplayEl = document.getElementById('pomo-time-display');
  const progressBarEl = document.getElementById('pomo-progress-bar');
  const modeBadgeEl = document.getElementById('pomo-mode-badge');
  const sessionsCountEl = document.getElementById('pomo-sessions-count');
  const toggleBtn = document.getElementById('pomo-toggle-btn');
  const pomoTaskSelect = document.getElementById('pomo-task-select');

  function renderStats() {
    const minsEl = document.getElementById('stat-focus-mins');
    const pendingEl = document.getElementById('stat-pending-tasks');
    if (minsEl) minsEl.textContent = `${state.stats.focusMinutes} นาที`;
    if (pendingEl) pendingEl.textContent = String(state.tasks.filter((t) => !t.done).length);
    if (sessionsCountEl) sessionsCountEl.textContent = `${state.stats.sessions} รอบ`;
  }

  function renderTimer() {
    const m = Math.floor(remainingSec / 60);
    const s = remainingSec % 60;
    const formatted = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    if (timeDisplayEl) timeDisplayEl.textContent = formatted;
    if (timerRunning) document.title = `${formatted} • Study Planner`;
    else document.title = 'Study & Life Planner — HelpDaiCha';

    const total = (isBreak ? breakMins : focusMins) * 60;
    const pct = total > 0 ? Math.max(0, Math.min(100, (remainingSec / total) * 100)) : 0;
    if (progressBarEl) {
      progressBarEl.style.width = `${pct}%`;
      progressBarEl.classList.toggle('bg-[#10B981]', isBreak);
      progressBarEl.classList.toggle('bg-[#F4D03F]', !isBreak);
    }
    if (modeBadgeEl) {
      modeBadgeEl.textContent = isBreak ? 'BREAK TIME' : 'FOCUS MODE';
      modeBadgeEl.classList.toggle('bg-[#10B981]', isBreak);
      modeBadgeEl.classList.toggle('text-white', isBreak);
      modeBadgeEl.classList.toggle('bg-[#F4D03F]', !isBreak);
      modeBadgeEl.classList.toggle('text-[#111111]', !isBreak);
    }
    if (toggleBtn) {
      toggleBtn.textContent = timerRunning ? 'หยุดชั่วคราว' : (isBreak ? 'เริ่มพัก' : 'เริ่มโฟกัส');
    }
  }

  function stopTimer() {
    timerRunning = false;
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    renderTimer();
  }

  function startTimer() {
    if (timerRunning) return;
    timerRunning = true;
    renderTimer();
    timerInterval = setInterval(() => {
      if (remainingSec > 0) {
        remainingSec -= 1;
        renderTimer();
      } else {
        stopTimer();
        playChime();
        if (!isBreak) {
          if (state.stats.date !== todayIso()) {
            state.stats = { date: todayIso(), focusMinutes: 0, sessions: 0 };
          }
          state.stats.focusMinutes += focusMins;
          state.stats.sessions += 1;
          saveState();
          renderStats();
          showToast(`เยี่ยมมาก! โฟกัสครบ ${focusMins} นาทีแล้ว พักสัก ${breakMins} นาที`);
          isBreak = true;
          remainingSec = breakMins * 60;
        } else {
          showToast('หมดเวลาพักแล้ว พร้อมลุยรอบถัดไป!');
          isBreak = false;
          remainingSec = focusMins * 60;
        }
        renderTimer();
      }
    }, 1000);
  }

  toggleBtn?.addEventListener('click', () => {
    if (timerRunning) stopTimer();
    else startTimer();
  });

  document.getElementById('pomo-reset-btn')?.addEventListener('click', () => {
    stopTimer();
    isBreak = false;
    remainingSec = focusMins * 60;
    renderTimer();
  });

  document.querySelectorAll('.pomo-preset-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const [f, b] = btn.dataset.pomoPreset.split(',').map(Number);
      focusMins = f || 25;
      breakMins = b || 5;
      stopTimer();
      isBreak = false;
      remainingSec = focusMins * 60;
      document.querySelectorAll('.pomo-preset-btn').forEach((x) => {
        const active = x === btn;
        x.classList.toggle('bg-[#111111]', active);
        x.classList.toggle('text-[#F4D03F]', active);
        x.classList.toggle('text-[#111111]', !active);
      });
      renderTimer();
    });
  });

  // ========================================================================
  // 2. TASKS & ASSIGNMENTS
  // ========================================================================
  const tasksListEl = document.getElementById('tasks-list');

  function syncPomoTaskSelect() {
    if (!pomoTaskSelect) return;
    const prev = pomoTaskSelect.value;
    const activeTasks = state.tasks.filter((t) => !t.done);
    pomoTaskSelect.innerHTML = `<option value="">🎯 โฟกัสอิสระ (ไม่ได้ผูกกับงาน)</option>` +
      activeTasks.map((t) => `<option value="${esc(t.id)}">📌 ${esc(t.title)}</option>`).join('');
    if (activeTasks.some((t) => t.id === prev)) pomoTaskSelect.value = prev;
  }

  function renderTasks() {
    if (!tasksListEl) return;
    const today = todayIso();
    const filtered = state.tasks.filter((t) => {
      if (taskFilter === 'today') return !t.done && t.due === today;
      if (taskFilter === 'high') return !t.done && t.priority === 'high';
      if (taskFilter === 'done') return t.done;
      return true;
    }).sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      const pWeight = { high: 0, normal: 1, low: 2 };
      return (pWeight[a.priority] ?? 1) - (pWeight[b.priority] ?? 1);
    });

    if (!filtered.length) {
      tasksListEl.innerHTML = `
        <div class="bg-[#F8F6F0] border-2 border-dashed border-[#111111]/30 rounded-2xl p-6 text-center text-xs font-semibold text-[#111111]/55">
          ยังไม่มีรายการในหมวดนี้ — พิมพ์เพิ่มด้านบนได้เลย
        </div>
      `;
      renderStats();
      syncPomoTaskSelect();
      return;
    }

    tasksListEl.innerHTML = filtered.map((t) => {
      const prioBadge = t.priority === 'high'
        ? '<span class="px-1.5 py-0.5 rounded bg-[#E74C3C] text-white font-display font-black text-[10px]">สำคัญ</span>'
        : (t.priority === 'low' ? '<span class="px-1.5 py-0.5 rounded bg-[#F8F6F0] border border-[#111111]/30 text-[#111111]/65 font-display font-bold text-[10px]">ไม่รีบ</span>' : '');
      const dueBadge = t.due
        ? `<span class="text-[10px] font-bold ${!t.done && t.due < today ? 'text-[#E74C3C]' : 'text-[#111111]/55'}">${t.due === today ? 'วันนี้' : esc(t.due)}</span>`
        : '';
      return `
        <div data-task-id="${esc(t.id)}" class="task-item-enter bg-[#F8F6F0] border-2 border-[#111111] rounded-xl px-3 py-2.5 flex items-center gap-2.5 ${t.done ? 'opacity-60' : 'shadow-[2px_2px_0px_#111111]'}">
          <button type="button" data-task-toggle="${esc(t.id)}" aria-label="สลับสถานะงาน" class="w-6 h-6 rounded-lg border-2 border-[#111111] ${t.done ? 'bg-[#10B981] text-white' : 'bg-white hover:bg-[#F4D03F]'} font-black text-xs flex items-center justify-center shrink-0 cursor-pointer transition-colors">
            ${t.done ? '✓' : ''}
          </button>
          <div class="min-w-0 flex-1">
            <p class="thai-safe font-semibold text-xs sm:text-sm text-[#111111] ${t.done ? 'line-through' : ''} break-words">${esc(t.title)}</p>
            <div class="flex flex-wrap items-center gap-1.5 mt-0.5">
              ${t.subject ? `<span class="px-1.5 py-0.5 rounded bg-white border border-[#111111]/40 font-display font-bold text-[10px] text-[#111111]">${esc(t.subject)}</span>` : ''}
              ${prioBadge}
              ${dueBadge}
            </div>
          </div>
          <button type="button" data-task-del="${esc(t.id)}" aria-label="ลบงาน" class="px-2 py-1 rounded-lg text-xs font-black text-[#111111]/45 hover:text-[#E74C3C] hover:bg-white cursor-pointer transition-colors">✕</button>
        </div>
      `;
    }).join('');

    tasksListEl.querySelectorAll('[data-task-toggle]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const item = state.tasks.find((x) => x.id === btn.dataset.taskToggle);
        if (!item) return;
        item.done = !item.done;
        saveState();
        renderTasks();
      });
    });

    tasksListEl.querySelectorAll('[data-task-del]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = state.tasks.findIndex((x) => x.id === btn.dataset.taskDel);
        if (idx < 0) return;
        const removed = state.tasks.splice(idx, 1)[0];
        saveState();
        renderTasks();
        showToast('ลบรายการแล้ว', 'ย้อนกลับ', () => {
          state.tasks.splice(idx, 0, removed);
          saveState();
          renderTasks();
        });
      });
    });

    renderStats();
    syncPomoTaskSelect();
  }

  document.getElementById('task-add-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const titleIn = document.getElementById('task-title-in');
    const subjIn = document.getElementById('task-subject-in');
    const dueIn = document.getElementById('task-due-in');
    const prioIn = document.getElementById('task-prio-in');
    const title = (titleIn?.value || '').trim();
    if (!title) return;
    state.tasks.unshift({
      id: uid(),
      title,
      subject: (subjIn?.value || '').trim(),
      due: dueIn?.value || '',
      priority: prioIn?.value || 'normal',
      done: false
    });
    if (titleIn) titleIn.value = '';
    saveState();
    renderTasks();
  });

  document.querySelectorAll('.task-filter-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      taskFilter = btn.dataset.taskFilter;
      document.querySelectorAll('.task-filter-btn').forEach((b) => {
        const on = b.dataset.taskFilter === taskFilter;
        b.classList.toggle('bg-[#111111]', on);
        b.classList.toggle('text-[#F4D03F]', on);
        b.classList.toggle('bg-white', !on);
        b.classList.toggle('text-[#111111]', !on);
      });
      renderTasks();
    });
  });

  document.getElementById('tasks-clear-done-btn')?.addEventListener('click', () => {
    const prev = [...state.tasks];
    const remaining = state.tasks.filter((t) => !t.done);
    if (remaining.length === prev.length) return;
    state.tasks = remaining;
    saveState();
    renderTasks();
    showToast('ล้างงานที่เสร็จแล้ว', 'ย้อนกลับ', () => {
      state.tasks = prev;
      saveState();
      renderTasks();
    });
  });

  // ========================================================================
  // 3. WEEKLY SCHEDULE
  // ========================================================================
  const dayTabsEl = document.getElementById('sched-day-tabs');
  const schedListEl = document.getElementById('sched-list');

  function renderSchedule() {
    if (dayTabsEl) {
      dayTabsEl.innerHTML = DAYS.map((d) => {
        const on = d.key === activeDay;
        const count = (state.schedule[d.key] || []).length;
        return `
          <button type="button" data-sched-day="${d.key}" class="py-1.5 rounded-xl border-2 border-[#111111] font-display font-black text-xs cursor-pointer transition-colors ${on ? 'bg-[#111111] text-[#F4D03F]' : 'bg-[#F8F6F0] text-[#111111] hover:bg-[#F4D03F]/40'}">
            ${d.label}${count ? ` <span class="text-[10px] opacity-75">(${count})</span>` : ''}
          </button>
        `;
      }).join('');
      dayTabsEl.querySelectorAll('[data-sched-day]').forEach((btn) => {
        btn.addEventListener('click', () => { activeDay = btn.dataset.schedDay; renderSchedule(); });
      });
    }

    if (!schedListEl) return;
    const list = (state.schedule[activeDay] || []).slice().sort((a, b) => a.time.localeCompare(b.time));
    if (!list.length) {
      schedListEl.innerHTML = `
        <div class="bg-[#F8F6F0] border-2 border-dashed border-[#111111]/30 rounded-2xl p-6 text-center text-xs font-semibold text-[#111111]/55">
          วันนี้ยังไม่มีตารางเรียนหรือช่วงอ่านหนังสือ
        </div>
      `;
      return;
    }

    schedListEl.innerHTML = list.map((item) => `
      <div class="bg-[#F8F6F0] border-2 border-[#111111] rounded-xl px-3 py-2.5 flex items-center justify-between gap-2.5 shadow-[2px_2px_0px_#111111]">
        <div class="flex items-center gap-2.5 min-w-0">
          <span class="px-2 py-1 rounded-lg bg-[#111111] text-[#F4D03F] font-mono font-bold text-[11px] shrink-0">${esc(item.time)}</span>
          <div class="min-w-0">
            <p class="thai-safe font-display font-extrabold text-xs sm:text-sm text-[#111111] truncate">${esc(item.title)}</p>
            ${item.note ? `<p class="text-[11px] font-semibold text-[#111111]/60 truncate">${esc(item.note)}</p>` : ''}
          </div>
        </div>
        <button type="button" data-sched-del="${esc(item.id)}" aria-label="ลบตาราง" class="px-2 py-1 rounded-lg text-xs font-black text-[#111111]/45 hover:text-[#E74C3C] hover:bg-white cursor-pointer">✕</button>
      </div>
    `).join('');

    schedListEl.querySelectorAll('[data-sched-del]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.schedule[activeDay] = (state.schedule[activeDay] || []).filter((x) => x.id !== btn.dataset.schedDel);
        saveState();
        renderSchedule();
      });
    });
  }

  document.getElementById('sched-add-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const timeIn = document.getElementById('sched-time-in');
    const titleIn = document.getElementById('sched-title-in');
    const noteIn = document.getElementById('sched-note-in');
    const time = (timeIn?.value || '').trim();
    const title = (titleIn?.value || '').trim();
    if (!time || !title) return;
    if (!Array.isArray(state.schedule[activeDay])) state.schedule[activeDay] = [];
    state.schedule[activeDay].push({ id: uid(), time, title, note: (noteIn?.value || '').trim() });
    if (titleIn) titleIn.value = '';
    if (noteIn) noteIn.value = '';
    saveState();
    renderSchedule();
  });

  // Main Tabs (Tasks vs Schedule)
  const panelTasks = document.getElementById('panel-tasks');
  const panelSched = document.getElementById('panel-schedule');
  const clearDoneBtn = document.getElementById('tasks-clear-done-btn');

  document.querySelectorAll('.main-tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.mainTab;
      document.querySelectorAll('.main-tab-btn').forEach((b) => {
        const on = b.dataset.mainTab === tab;
        b.classList.toggle('bg-[#111111]', on);
        b.classList.toggle('text-[#F4D03F]', on);
        b.classList.toggle('text-[#111111]', !on);
      });
      if (tab === 'tasks') {
        panelTasks?.classList.remove('hidden');
        panelTasks?.classList.add('flex');
        panelSched?.classList.add('hidden');
        panelSched?.classList.remove('flex');
        clearDoneBtn?.classList.remove('hidden');
      } else {
        panelSched?.classList.remove('hidden');
        panelSched?.classList.add('flex');
        panelTasks?.classList.add('hidden');
        panelTasks?.classList.remove('flex');
        clearDoneBtn?.classList.add('hidden');
      }
    });
  });

  // ========================================================================
  // 4. ACTIVE RECALL FLASHCARDS
  // ========================================================================
  const fcStageEl = document.getElementById('fc-stage');
  const fcSideBadge = document.getElementById('fc-side-badge');
  const fcTextEl = document.getElementById('fc-text');
  const fcCounterEl = document.getElementById('fc-counter');
  const fcAddForm = document.getElementById('fc-add-form');

  function renderFlashcard() {
    const total = state.flashcards.length;
    if (!total) {
      if (fcCounterEl) fcCounterEl.textContent = '0 / 0';
      if (fcSideBadge) fcSideBadge.textContent = 'ว่าง';
      if (fcTextEl) fcTextEl.textContent = 'ยังไม่มีแฟลชการ์ด กด + เพิ่มการ์ดด้านล่างได้เลย';
      return;
    }
    fcIndex = ((fcIndex % total) + total) % total;
    const card = state.flashcards[fcIndex];
    if (fcCounterEl) fcCounterEl.textContent = `${fcIndex + 1} / ${total}`;
    if (fcSideBadge) {
      fcSideBadge.textContent = fcFlipped ? 'คำตอบ / สรุป' : 'คำถาม / หัวข้อ';
      fcSideBadge.classList.toggle('bg-[#10B981]', fcFlipped);
      fcSideBadge.classList.toggle('text-white', fcFlipped);
      fcSideBadge.classList.toggle('bg-[#111111]', !fcFlipped);
      fcSideBadge.classList.toggle('text-[#F4D03F]', !fcFlipped);
    }
    if (fcTextEl) fcTextEl.textContent = fcFlipped ? card.back : card.front;
  }

  fcStageEl?.addEventListener('click', () => {
    if (!state.flashcards.length) return;
    fcFlipped = !fcFlipped;
    renderFlashcard();
  });
  document.getElementById('fc-prev-btn')?.addEventListener('click', () => { fcIndex -= 1; fcFlipped = false; renderFlashcard(); });
  document.getElementById('fc-next-btn')?.addEventListener('click', () => { fcIndex += 1; fcFlipped = false; renderFlashcard(); });
  document.getElementById('fc-del-btn')?.addEventListener('click', () => {
    if (!state.flashcards.length) return;
    state.flashcards.splice(fcIndex, 1);
    fcFlipped = false;
    saveState();
    renderFlashcard();
  });
  document.getElementById('fc-toggle-add-btn')?.addEventListener('click', () => {
    fcAddForm?.classList.toggle('hidden');
    fcAddForm?.classList.toggle('flex');
  });
  fcAddForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const frontIn = document.getElementById('fc-in-front');
    const backIn = document.getElementById('fc-in-back');
    const front = (frontIn?.value || '').trim();
    const back = (backIn?.value || '').trim();
    if (!front || !back) return;
    state.flashcards.push({ id: uid(), front, back });
    fcIndex = state.flashcards.length - 1;
    fcFlipped = false;
    if (frontIn) frontIn.value = '';
    if (backIn) backIn.value = '';
    fcAddForm.classList.add('hidden');
    fcAddForm.classList.remove('flex');
    saveState();
    renderFlashcard();
  });

  // ========================================================================
  // 5. BACKUP EXPORT / IMPORT (.JSON)
  // ========================================================================
  document.getElementById('study-export-btn')?.addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `study-planner-${todayIso()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    showToast('ดาวน์โหลดไฟล์สำรองข้อมูลแล้ว');
  });

  document.getElementById('study-import-input')?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || ''));
        if (!parsed || !Array.isArray(parsed.tasks)) throw new Error('Invalid');
        state = {
          stats: parsed.stats || { date: todayIso(), focusMinutes: 0, sessions: 0 },
          tasks: parsed.tasks,
          schedule: parsed.schedule || { mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] },
          flashcards: Array.isArray(parsed.flashcards) ? parsed.flashcards : []
        };
        saveState();
        renderTimer();
        renderTasks();
        renderSchedule();
        renderFlashcard();
        showToast('กู้คืนข้อมูลเรียบร้อยแล้ว');
      } catch {
        alert('ไฟล์ JSON ไม่ถูกต้อง');
      }
    };
    reader.readAsText(file);
  });

  renderTimer();
  renderTasks();
  renderSchedule();
  renderFlashcard();
})();
