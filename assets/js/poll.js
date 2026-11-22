/* HelpDai Live QR Poll — Strict Host/Voter Separation (Voters cannot edit or delete admin content) */
(() => {
  const BAR_COLORS = ['#F4D03F', '#E74C3C', '#2980B9', '#10B981', '#8E44AD', '#F39C12'];
  const params = new URLSearchParams(window.location.search);
  const votePollId = (params.get('vote') || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 32);

  const cfg = window.HELPDAI_CONFIG || {};
  const defaultApiBase = (!location.hostname.endsWith('github.io') && location.protocol.startsWith('http')) ? location.origin : '';
  const apiBase = (cfg.apiBase || defaultApiBase).replace(/\/$/, '');

  const hostView = document.getElementById('poll-host-view');
  const voterView = document.getElementById('poll-voter-view');
  const totalBadge = document.getElementById('poll-total-badge');

  const esc = (v) => String(v).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function getOrCreateVoterId() {
    const key = 'helpdai_voter_id_v1';
    try {
      let id = localStorage.getItem(key);
      if (!id || id.length < 8) {
        id = 'v-' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
        localStorage.setItem(key, id);
      }
      return id;
    } catch (_) {
      return 'v-' + Math.random().toString(36).slice(2, 12);
    }
  }

  // ========================================================================
  // MODE A: VOTER VIEW (?vote=<pollId>) — NO ADMIN CONTROLS IN DOM
  // ========================================================================
  if (votePollId) {
    if (hostView) hostView.remove();
    const backLink = document.getElementById('poll-back-link');
    if (backLink) backLink.classList.add('hidden');
    voterView.classList.remove('hidden');
    voterView.classList.add('flex');

    const qEl = document.getElementById('poll-voter-question');
    const choicesEl = document.getElementById('poll-voter-choices');
    const statusEl = document.getElementById('poll-voter-status');
    const voterId = getOrCreateVoterId();
    const votedKey = `helpdai_voted_${votePollId}`;
    let hasVoted = false;
    try { hasVoted = localStorage.getItem(votedKey) !== null; } catch (_) {}
    let lastVoterRenderKey = '';

    const renderVoter = async () => {
      if (!apiBase) {
        qEl.textContent = 'ต้องเชื่อมต่อเซิร์ฟเวอร์ (npm start) เพื่อใช้งานโหวตสด';
        return;
      }
      try {
        const res = await fetch(`${apiBase}/api/polls/${encodeURIComponent(votePollId)}`);
        if (!res.ok) {
          qEl.textContent = 'ไม่พบโพลนี้ หรือโพลถูกปิดไปแล้ว';
          choicesEl.innerHTML = '';
          lastVoterRenderKey = '';
          return;
        }
        const data = await res.json();
        const renderKey = JSON.stringify({ q: data.question, opts: data.options, counts: data.counts, open: data.isOpen, voted: hasVoted });
        if (renderKey === lastVoterRenderKey) return;
        lastVoterRenderKey = renderKey;

        qEl.textContent = data.question;
        totalBadge.textContent = `${data.totalVotes} โหวต`;

        if (!data.isOpen) {
          statusEl.textContent = 'ปิดรับโหวตแล้ว';
          statusEl.classList.replace('bg-[#F4D03F]', 'bg-[#E74C3C]');
          statusEl.classList.add('text-white');
        } else if (hasVoted) {
          statusEl.textContent = '✓ ส่งโหวตเรียบร้อยแล้ว';
        }

        const total = Math.max(1, data.totalVotes);
        choicesEl.innerHTML = data.options.map((opt, idx) => {
          const cnt = data.counts[idx] || 0;
          const pct = Math.round((cnt / total) * 100);
          const color = BAR_COLORS[idx % BAR_COLORS.length];
          if (hasVoted || !data.isOpen) {
            return `
              <div class="vox-stagger-in border-2 border-[#111111] rounded-xl p-3 bg-[#F8F6F0]" style="animation-delay:${idx * 45}ms">
                <div class="flex items-center justify-between gap-2 font-display font-bold text-sm mb-1.5">
                  <span>${esc(opt)}</span>
                  <span class="tabular-nums">${pct}% (${cnt})</span>
                </div>
                <div class="w-full h-3.5 bg-white border-2 border-[#111111] rounded-md overflow-hidden p-0.5">
                  <div class="h-full rounded-[2px] transition-all duration-500" style="width:${pct}%; background:${color};"></div>
                </div>
              </div>
            `;
          }
          return `
            <button type="button" data-vote-idx="${idx}" style="animation-delay:${idx * 45}ms" class="vox-stagger-in btn-vox bg-white hover:bg-[#F4D03F] text-left px-4 py-3 rounded-xl font-display font-extrabold text-sm sm:text-base text-[#111111] flex items-center justify-between cursor-pointer">
              <span>${esc(opt)}</span>
              <span class="w-3.5 h-3.5 rounded-full border-2 border-[#111111]" style="background:${color};"></span>
            </button>
          `;
        }).join('');

        choicesEl.querySelectorAll('[data-vote-idx]').forEach(btn => {
          btn.addEventListener('click', async () => {
            if (hasVoted) return;
            const choiceIndex = Number(btn.dataset.voteIdx);
            const r = await fetch(`${apiBase}/api/polls/${encodeURIComponent(votePollId)}/vote`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ choiceIndex, voterId })
            });
            if (r.ok) {
              hasVoted = true;
              try { localStorage.setItem(votedKey, String(choiceIndex)); } catch (_) {}
              renderVoter();
            }
          });
        });
      } catch (_) {}
    };

    renderVoter();
    setInterval(renderVoter, 2500);
    return;
  }

  // ========================================================================
  // MODE B: HOST / ADMIN PROJECTOR VIEW
  // ========================================================================
  if (voterView) voterView.remove();
  hostView.classList.remove('hidden');
  hostView.classList.add('grid');

  const HOST_KEY = 'helpdai_poll_host_v1';
  let hostCfg = {
    pollId: 'poll-' + Math.random().toString(36).slice(2, 8),
    adminToken: 'adm-' + Math.random().toString(36).slice(2, 12) + Date.now().toString(36),
    question: 'กิจกรรมต่อไปอยากเล่นแนวไหน?',
    options: ['เกมตอบคำถามความเร็ว', 'เกมใบ้คำ / แสดงท่าทาง', 'เกมวางแผนทีม', 'พักเบรกก่อน 5 นาที'],
    isOpen: true
  };
  try {
    const saved = JSON.parse(localStorage.getItem(HOST_KEY) || 'null');
    if (saved?.pollId && saved?.adminToken) hostCfg = saved;
  } catch (_) {}
  const saveHostCfg = () => { try { localStorage.setItem(HOST_KEY, JSON.stringify(hostCfg)); } catch (_) {} };
  saveHostCfg();

  const inQ = document.getElementById('poll-in-q');
  const inOptsWrap = document.getElementById('poll-in-opts');
  const hostQEl = document.getElementById('poll-host-question');
  const hostBarsEl = document.getElementById('poll-host-bars');
  const toggleOpenBtn = document.getElementById('poll-toggle-open');
  const qrImg = document.getElementById('poll-qr-img');

  const voteUrl = `${location.origin}${location.pathname}?vote=${encodeURIComponent(hostCfg.pollId)}`;
  if (qrImg) {
    qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(voteUrl)}`;
  }

  function syncInputsFromDom() {
    hostCfg.question = inQ.value;
    const curInputs = Array.from(inOptsWrap.querySelectorAll('[data-poll-opt]'));
    if (curInputs.length) {
      hostCfg.options = curInputs.map(el => el.value);
    }
  }

  function renderOptionInputs() {
    inQ.value = hostCfg.question;
    inOptsWrap.innerHTML = hostCfg.options.map((opt, i) => `
      <div class="vox-stagger-in flex items-center gap-1.5" style="animation-delay:${i * 35}ms">
        <span class="w-3 h-3 rounded-full border border-[#111111] shrink-0" style="background:${BAR_COLORS[i % BAR_COLORS.length]};"></span>
        <input data-poll-opt="${i}" type="text" maxlength="60" value="${esc(opt)}" class="thai-safe-tight flex-1 bg-[#F8F6F0] border-2 border-[#111111] rounded-lg px-2.5 py-1 text-xs font-bold" />
        ${hostCfg.options.length > 2 ? `<button type="button" data-poll-del="${i}" class="w-6 h-6 rounded border border-[#111111] bg-white hover:bg-red-50 text-[#E74C3C] font-black text-xs cursor-pointer">−</button>` : ''}
      </div>
    `).join('');

    inOptsWrap.querySelectorAll('[data-poll-del]').forEach(b => {
      b.addEventListener('click', () => {
        syncInputsFromDom();
        hostCfg.options.splice(Number(b.dataset.pollDel), 1);
        renderOptionInputs();
      });
    });
  }

  async function pushPollToServer() {
    syncInputsFromDom();
    hostCfg.question = (hostCfg.question || '').trim() || 'คำถามโหวต';
    hostCfg.options = hostCfg.options.map(v => v.trim()).filter(Boolean).slice(0, 6);
    if (hostCfg.options.length < 2) hostCfg.options = ['ตัวเลือก A', 'ตัวเลือก B'];
    saveHostCfg();
    renderOptionInputs();

    if (!apiBase) return;
    await fetch(`${apiBase}/api/polls/${encodeURIComponent(hostCfg.pollId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Poll-Admin': hostCfg.adminToken },
      body: JSON.stringify({ question: hostCfg.question, options: hostCfg.options, isOpen: hostCfg.isOpen })
    });
    pullResults();
  }

  let lastHostRenderKey = '';

  async function pullResults() {
    hostQEl.textContent = hostCfg.question;
    if (!apiBase) {
      hostBarsEl.innerHTML = `<div class="text-xs font-bold text-[#E74C3C]">ต้องรันผ่านเซิร์ฟเวอร์ (npm start) เพื่อรับผลโหวตจากมือถือ</div>`;
      return;
    }
    try {
      const res = await fetch(`${apiBase}/api/polls/${encodeURIComponent(hostCfg.pollId)}`);
      if (!res.ok) {
        // Render local preview bars even if backend/RLS isn't ready yet
        const previewCounts = hostCfg.options.map(() => 0);
        const previewKey = JSON.stringify({ q: hostCfg.question, opts: hostCfg.options, counts: previewCounts });
        if (previewKey !== lastHostRenderKey) {
          lastHostRenderKey = previewKey;
          hostBarsEl.innerHTML = hostCfg.options.map((opt, idx) => `
            <div data-poll-bar="${idx}" style="animation-delay:${idx * 45}ms" class="vox-stagger-in flex flex-col gap-1">
              <div class="flex items-center justify-between gap-2 font-display font-extrabold text-sm sm:text-base text-[#111111]">
                <span data-poll-lbl>${esc(opt)}</span>
                <span data-poll-stat class="tabular-nums">0% (0)</span>
              </div>
              <div class="w-full h-6 bg-[#F0EDE4] border-2 border-[#111111] rounded-lg overflow-hidden p-[3px]">
                <div data-poll-fill class="infographic-bar-fill h-full rounded-[4px]" style="width:0%; background-color:${BAR_COLORS[idx % BAR_COLORS.length]};"></div>
              </div>
            </div>
          `).join('');
        }
        return;
      }
      const data = await res.json();
      const renderKey = JSON.stringify({ q: data.question, opts: data.options, counts: data.counts });
      if (renderKey === lastHostRenderKey) return;
      lastHostRenderKey = renderKey;

      totalBadge.textContent = `${data.totalVotes} โหวต`;
      const total = Math.max(1, data.totalVotes);
      const existingBars = hostBarsEl.querySelectorAll('[data-poll-bar]');
      if (existingBars.length === data.options.length) {
        data.options.forEach((opt, idx) => {
          const cnt = data.counts[idx] || 0;
          const pct = Math.round((cnt / total) * 100);
          const row = existingBars[idx];
          const lbl = row.querySelector('[data-poll-lbl]');
          const stat = row.querySelector('[data-poll-stat]');
          const fill = row.querySelector('[data-poll-fill]');
          if (lbl) lbl.textContent = opt;
          if (stat) stat.textContent = `${pct}% (${cnt})`;
          if (fill) fill.style.width = `${pct}%`;
        });
        return;
      }

      hostBarsEl.innerHTML = data.options.map((opt, idx) => {
        const cnt = data.counts[idx] || 0;
        const pct = Math.round((cnt / total) * 100);
        const color = BAR_COLORS[idx % BAR_COLORS.length];
        return `
          <div data-poll-bar="${idx}" style="animation-delay:${idx * 45}ms" class="vox-stagger-in flex flex-col gap-1">
            <div class="flex items-center justify-between gap-2 font-display font-extrabold text-sm sm:text-base text-[#111111]">
              <span data-poll-lbl>${esc(opt)}</span>
              <span data-poll-stat class="tabular-nums">${pct}% (${cnt})</span>
            </div>
            <div class="w-full h-6 bg-[#F0EDE4] border-2 border-[#111111] rounded-lg overflow-hidden p-[3px]">
              <div data-poll-fill class="infographic-bar-fill h-full rounded-[4px]" style="width:${pct}%; background-color:${color};"></div>
            </div>
          </div>
        `;
      }).join('');
    } catch (_) {}
  }

  document.getElementById('poll-add-opt')?.addEventListener('click', () => {
    syncInputsFromDom();
    if (hostCfg.options.length >= 6) return;
    hostCfg.options.push(`ตัวเลือก ${hostCfg.options.length + 1}`);
    renderOptionInputs();
  });

  document.getElementById('poll-save-btn')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    await pushPollToServer();
    btn.style.transition = 'background-color 0.28s ease, color 0.28s ease, transform 0.25s cubic-bezier(0.22,1,0.36,1)';
    btn.classList.remove('bg-[#F4D03F]', 'text-[#111111]');
    btn.classList.add('bg-[#10B981]', 'text-white', 'scale-105');
    btn.textContent = '✓ อัปเดตโพลแล้ว!';
    setTimeout(() => {
      btn.classList.remove('bg-[#10B981]', 'text-white', 'scale-105');
      btn.classList.add('bg-[#F4D03F]', 'text-[#111111]');
      btn.textContent = 'อัปเดตโพล';
    }, 1800);
  });
  toggleOpenBtn?.addEventListener('click', () => {
    hostCfg.isOpen = !hostCfg.isOpen;
    toggleOpenBtn.textContent = hostCfg.isOpen ? 'กำลังเปิดโหวต' : 'ปิดรับโหวต';
    toggleOpenBtn.classList.toggle('bg-[#10B981]', hostCfg.isOpen);
    toggleOpenBtn.classList.toggle('bg-[#E74C3C]', !hostCfg.isOpen);
    pushPollToServer();
  });

  document.getElementById('poll-reset-votes')?.addEventListener('click', async () => {
    if (!apiBase) return;
    await fetch(`${apiBase}/api/polls/${encodeURIComponent(hostCfg.pollId)}/reset`, {
      method: 'POST',
      headers: { 'X-Poll-Admin': hostCfg.adminToken }
    });
    pullResults();
  });

  document.getElementById('poll-copy-link')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    try {
      await navigator.clipboard.writeText(voteUrl);
    } catch (_) {
      const tmp = document.createElement('input');
      tmp.value = voteUrl;
      document.body.appendChild(tmp);
      tmp.select();
      document.execCommand('copy');
      tmp.remove();
    }
    btn.style.transition = 'background-color 0.3s ease, color 0.3s ease, transform 0.28s cubic-bezier(0.22,1,0.36,1)';
    btn.classList.remove('bg-[#F8F6F0]', 'text-[#111111]');
    btn.classList.add('bg-[#10B981]', 'text-white', 'scale-105');
    btn.textContent = '✓ คัดลอกลิงก์แล้ว! ส่งให้ผู้โหวตได้เลย';
    setTimeout(() => {
      btn.classList.remove('bg-[#10B981]', 'text-white', 'scale-105');
      btn.classList.add('bg-[#F8F6F0]', 'text-[#111111]');
      btn.textContent = 'คัดลอกลิงก์โหวต';
    }, 2200);
  });

  renderOptionInputs();
  pushPollToServer();
  setInterval(pullResults, 2000);
})();
