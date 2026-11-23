/* HelpDai Live QR Poll — Strict Host/Voter Separation + Projector & Suspense Modes */
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
    document.getElementById('poll-qr-modal')?.remove();
    const backLink = document.getElementById('poll-back-link');
    if (backLink) backLink.classList.add('hidden');
    voterView.classList.remove('hidden');
    voterView.classList.add('flex');

    const qEl = document.getElementById('poll-voter-question');
    const choicesEl = document.getElementById('poll-voter-choices');
    const statusEl = document.getElementById('poll-voter-status');
    const voterId = getOrCreateVoterId();
    const votedKey = `helpdai_voted_${votePollId}`;
    let votedChoice = null;
    try {
      const savedChoice = localStorage.getItem(votedKey);
      if (savedChoice !== null) votedChoice = Number(savedChoice);
    } catch (_) {}
    let lastVoterRenderKey = '';

    const localPollKey = `helpdai_poll_local_${votePollId}`;
    const pollBc = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('helpdai_poll_bc') : null;

    const readLocalPollData = () => {
      try {
        const loc = JSON.parse(localStorage.getItem(localPollKey) || 'null');
        if (loc && Array.isArray(loc.options)) return loc;
        const hostSaved = JSON.parse(localStorage.getItem('helpdai_poll_host_v1') || 'null');
        if (hostSaved && hostSaved.pollId === votePollId && Array.isArray(hostSaved.options)) {
          return {
            pollId: votePollId,
            question: hostSaved.question || 'โหวตสด',
            options: hostSaved.options,
            counts: hostSaved.options.map(() => 0),
            totalVotes: 0,
            isOpen: hostSaved.isOpen !== false
          };
        }
      } catch (_) {}
      return null;
    };

    const renderVoter = async () => {
      try {
        let data = null;
        if (apiBase) {
          try {
            const res = await fetch(`${apiBase}/api/polls/${encodeURIComponent(votePollId)}`);
            if (res.ok) data = await res.json();
          } catch (_) {}
        }
        if (!data) data = readLocalPollData();
        if (!data) {
          statusEl.textContent = 'ไม่พบห้องโหวต';
          statusEl.classList.remove('bg-[#F4D03F]', 'bg-[#10B981]', 'text-[#111111]');
          statusEl.classList.add('bg-[#E74C3C]', 'text-white');
          qEl.textContent = 'ไม่พบโพลนี้ หรือโพลถูกปิดไปแล้ว';
          choicesEl.innerHTML = `
            <button type="button" id="poll-voter-retry" class="btn-vox bg-[#F4D03F] hover:bg-[#f2c61d] text-[#111111] font-display font-extrabold text-sm px-4 py-2.5 rounded-xl cursor-pointer self-start">
              ลองเชื่อมต่อใหม่
            </button>
          `;
          document.getElementById('poll-voter-retry')?.addEventListener('click', () => {
            qEl.textContent = 'กำลังโหลดโพล...';
            renderVoter();
          });
          lastVoterRenderKey = '';
          return;
        }
        if (data.totalVotes === 0 && votedChoice !== null) {
          votedChoice = null;
          try { localStorage.removeItem(votedKey); } catch (_) {}
        }
        const hasVoted = votedChoice !== null;
        const renderKey = JSON.stringify({ q: data.question, opts: data.options, counts: data.counts, open: data.isOpen, voted: votedChoice });
        if (renderKey === lastVoterRenderKey) return;
        lastVoterRenderKey = renderKey;

        qEl.textContent = data.question;
        totalBadge.textContent = `${data.totalVotes} โหวต`;

        if (!data.isOpen) {
          statusEl.textContent = 'ปิดรับโหวตแล้ว';
          statusEl.classList.remove('bg-[#F4D03F]', 'bg-[#10B981]');
          statusEl.classList.add('bg-[#E74C3C]', 'text-white');
        } else if (hasVoted) {
          statusEl.textContent = '✓ ส่งโหวตเรียบร้อยแล้ว';
          statusEl.classList.remove('bg-[#E74C3C]', 'bg-[#F4D03F]');
          statusEl.classList.add('bg-[#10B981]', 'text-white');
        } else {
          statusEl.textContent = 'เลือกคำตอบของคุณ (1 สิทธิ์)';
          statusEl.classList.remove('bg-[#E74C3C]', 'bg-[#10B981]', 'text-white');
          statusEl.classList.add('bg-[#F4D03F]', 'text-[#111111]');
        }

        const total = Math.max(1, data.totalVotes);
        choicesEl.innerHTML = data.options.map((opt, idx) => {
          const cnt = data.counts[idx] || 0;
          const pct = data.totalVotes > 0 ? Math.round((cnt / total) * 100) : 0;
          const color = BAR_COLORS[idx % BAR_COLORS.length];
          const isPicked = votedChoice === idx;
          if (hasVoted || !data.isOpen) {
            return `
              <div class="vox-stagger-in border-2 border-[#111111] rounded-xl p-3 ${isPicked ? 'bg-[#F4D03F]/30 shadow-[3px_3px_0px_#111111]' : 'bg-[#F8F6F0]'}" style="animation-delay:${idx * 45}ms">
                <div class="flex items-center justify-between gap-2 font-display font-bold text-sm mb-1.5">
                  <span class="flex items-center gap-1.5">${isPicked ? '<span class="px-1.5 py-0.5 rounded bg-[#111111] text-[#F4D03F] text-[10px]">✓ คุณเลือก</span>' : ''}<span>${esc(opt)}</span></span>
                  <span class="tabular-nums shrink-0">${pct}% (${cnt})</span>
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
              <span class="w-3.5 h-3.5 rounded-full border-2 border-[#111111] shrink-0" style="background:${color};"></span>
            </button>
          `;
        }).join('');

        choicesEl.querySelectorAll('[data-vote-idx]').forEach(btn => {
          btn.addEventListener('click', async () => {
            if (votedChoice !== null) return;
            const choiceIndex = Number(btn.dataset.voteIdx);
            btn.disabled = true;
            let votedOk = false;
            if (apiBase) {
              try {
                const r = await fetch(`${apiBase}/api/polls/${encodeURIComponent(votePollId)}/vote`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ choiceIndex, voterId })
                });
                if (r.ok) votedOk = true;
              } catch (_) {}
            }
            const loc = readLocalPollData();
            if (loc) {
              loc.counts = Array.isArray(loc.counts) ? loc.counts : loc.options.map(() => 0);
              loc.counts[choiceIndex] = (loc.counts[choiceIndex] || 0) + 1;
              loc.totalVotes = loc.counts.reduce((a, b) => a + b, 0);
              try { localStorage.setItem(localPollKey, JSON.stringify(loc)); } catch (_) {}
              try { pollBc?.postMessage(loc); } catch (_) {}
              votedOk = true;
            }
            if (votedOk) {
              votedChoice = choiceIndex;
              try { localStorage.setItem(votedKey, String(choiceIndex)); } catch (_) {}
              lastVoterRenderKey = '';
              renderVoter();
            } else {
              btn.disabled = false;
            }
          });
        });
      } catch (_) {}
    };

    pollBc?.addEventListener('message', (e) => {
      if (e.data?.pollId === votePollId) renderVoter();
    });
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

  const hideResultsBtn = document.getElementById('poll-hide-results-btn');
  const hideResultsLabel = document.getElementById('poll-hide-results-label');
  const presentBtn = document.getElementById('poll-present-btn');
  const presentLabel = document.getElementById('poll-present-label');
  if (hideResultsBtn) { hideResultsBtn.classList.remove('hidden'); hideResultsBtn.classList.add('inline-flex'); }
  if (presentBtn) { presentBtn.classList.remove('hidden'); presentBtn.classList.add('inline-flex'); }

  const HOST_KEY = 'helpdai_poll_host_v1';
  const PRESETS = {
    activity: {
      question: 'กิจกรรมต่อไปอยากเล่นแนวไหน?',
      options: ['เกมตอบคำถามความเร็ว', 'เกมใบ้คำ / แสดงท่าทาง', 'เกมวางแผนทีม', 'พักเบรกก่อน 5 นาที']
    },
    yesno: {
      question: 'เห็นด้วยหรือไม่กับข้อเสนอนี้?',
      options: ['เห็นด้วย (Yes)', 'ไม่เห็นด้วย (No)', 'ขอฟังเพิ่มเติม']
    },
    rate5: {
      question: 'ให้คะแนนความสนุกของช่วงนี้กี่ดาว?',
      options: ['★★★★★ สนุกมาก!', '★★★★ ดีเลย', '★★★ โอเค', '★★ พอใช้', '★ อยากให้ปรับเพิ่ม']
    }
  };

  let hostCfg = {
    pollId: 'poll-' + Math.random().toString(36).slice(2, 8),
    adminToken: 'adm-' + Math.random().toString(36).slice(2, 12) + Date.now().toString(36),
    question: PRESETS.activity.question,
    options: [...PRESETS.activity.options],
    isOpen: true,
    hideResults: false
  };
  try {
    const saved = JSON.parse(localStorage.getItem(HOST_KEY) || 'null');
    if (saved?.pollId && saved?.adminToken) hostCfg = { ...hostCfg, ...saved };
  } catch (_) {}
  const saveHostCfg = () => { try { localStorage.setItem(HOST_KEY, JSON.stringify(hostCfg)); } catch (_) {} };
  saveHostCfg();

  const inQ = document.getElementById('poll-in-q');
  const inOptsWrap = document.getElementById('poll-in-opts');
  const hostQEl = document.getElementById('poll-host-question');
  const hostBarsEl = document.getElementById('poll-host-bars');
  const toggleOpenBtn = document.getElementById('poll-toggle-open');
  const stageStatusEl = document.getElementById('poll-stage-status');
  const qrImg = document.getElementById('poll-qr-img');
  const openVoterLink = document.getElementById('poll-open-voter');
  const presentQrStrip = document.getElementById('poll-present-qr-strip');
  const presentQrImg = document.getElementById('poll-present-qr-img');
  const presentUrlEl = document.getElementById('poll-present-url');
  const hostSidebar = document.getElementById('poll-host-sidebar');
  const hostStage = document.getElementById('poll-host-stage');

  let isPresenting = false;
  let wasFullscreen = false;
  let lastHostRenderKey = '';

  const getVoteUrl = () => `${location.origin}${location.pathname}?vote=${encodeURIComponent(hostCfg.pollId)}`;

  function syncQrTargets() {
    const url = getVoteUrl();
    const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(url)}`;
    if (qrImg) qrImg.src = qrSrc;
    if (presentQrImg) presentQrImg.src = qrSrc;
    if (presentUrlEl) presentUrlEl.textContent = url;
    if (openVoterLink) openVoterLink.href = url;
    const modalImg = document.getElementById('poll-qr-modal-img');
    const modalUrl = document.getElementById('poll-qr-modal-url');
    if (modalImg) modalImg.src = qrSrc;
    if (modalUrl) modalUrl.textContent = url;
  }

  function syncOpenBadge() {
    if (toggleOpenBtn) {
      toggleOpenBtn.textContent = hostCfg.isOpen ? 'กำลังเปิดโหวต' : 'ปิดรับโหวต';
      toggleOpenBtn.classList.toggle('bg-[#10B981]', hostCfg.isOpen);
      toggleOpenBtn.classList.toggle('bg-[#E74C3C]', !hostCfg.isOpen);
    }
    if (stageStatusEl) {
      stageStatusEl.textContent = hostCfg.isOpen ? 'เปิดรับโหวต' : 'ปิดรับโหวตแล้ว';
      stageStatusEl.classList.toggle('bg-[#10B981]/15', hostCfg.isOpen);
      stageStatusEl.classList.toggle('bg-[#E74C3C]/15', !hostCfg.isOpen);
    }
  }

  function syncHideResultsBtn() {
    if (!hideResultsBtn || !hideResultsLabel) return;
    hideResultsLabel.textContent = hostCfg.hideResults ? 'เปิดเผยผล' : 'ซ่อนผล';
    hideResultsBtn.classList.toggle('bg-[#111111]', hostCfg.hideResults);
    hideResultsBtn.classList.toggle('text-[#F4D03F]', hostCfg.hideResults);
    hideResultsBtn.classList.toggle('bg-white', !hostCfg.hideResults);
    hideResultsBtn.classList.toggle('text-[#111111]', !hostCfg.hideResults);
  }

  function setPresentMode(next, syncFs = true) {
    isPresenting = Boolean(next);
    if (hostSidebar) hostSidebar.classList.toggle('hidden', isPresenting);
    if (hostStage) {
      hostStage.classList.toggle('lg:col-span-12', isPresenting);
      hostStage.classList.toggle('lg:col-span-7', !isPresenting);
    }
    if (presentQrStrip) {
      presentQrStrip.classList.toggle('hidden', !isPresenting);
      presentQrStrip.classList.toggle('flex', isPresenting);
    }
    if (presentBtn && presentLabel) {
      presentLabel.textContent = isPresenting ? 'ออกจากฉายจอ' : 'ฉายขึ้นจอ';
      presentBtn.classList.toggle('bg-[#F4D03F]', isPresenting);
      presentBtn.classList.toggle('bg-white', !isPresenting);
    }
    if (syncFs) {
      const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
      if (isPresenting && !fsEl) {
        const req = document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen;
        if (req) Promise.resolve(req.call(document.documentElement)).catch(() => {});
      } else if (!isPresenting && fsEl) {
        const exit = document.exitFullscreen || document.webkitExitFullscreen;
        if (exit) Promise.resolve(exit.call(document)).catch(() => {});
      }
    }
  }

  const onFsChange = () => {
    const isFs = Boolean(document.fullscreenElement || document.webkitFullscreenElement);
    if (wasFullscreen && !isFs && isPresenting) setPresentMode(false, false);
    wasFullscreen = isFs;
  };
  document.addEventListener('fullscreenchange', onFsChange);
  document.addEventListener('webkitfullscreenchange', onFsChange);

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
        <input data-poll-opt="${i}" type="text" maxlength="60" value="${esc(opt)}" class="thai-safe-tight flex-1 bg-[#F8F6F0] border-2 border-[#111111] rounded-lg px-2.5 py-1 text-xs font-bold focus:outline-none focus:bg-white" />
        ${hostCfg.options.length > 2 ? `<button type="button" data-poll-del="${i}" class="w-6 h-6 rounded border border-[#111111] bg-white hover:bg-red-50 text-[#E74C3C] font-black text-xs cursor-pointer">−</button>` : ''}
      </div>
    `).join('');

    inOptsWrap.querySelectorAll('[data-poll-opt]').forEach(inp => {
      inp.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); pushPollToServer(); }
      });
    });

    inOptsWrap.querySelectorAll('[data-poll-del]').forEach(b => {
      b.addEventListener('click', () => {
        syncInputsFromDom();
        hostCfg.options.splice(Number(b.dataset.pollDel), 1);
        renderOptionInputs();
      });
    });
  }

  inQ?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); pushPollToServer(); }
  });

  async function pushPollToServer() {
    syncInputsFromDom();
    hostCfg.question = (hostCfg.question || '').trim() || 'คำถามโหวต';
    hostCfg.options = hostCfg.options.map(v => v.trim()).filter(Boolean).slice(0, 6);
    if (hostCfg.options.length < 2) hostCfg.options = ['ตัวเลือก A', 'ตัวเลือก B'];
    saveHostCfg();
    renderOptionInputs();

    if (!apiBase) return;
    try {
      await fetch(`${apiBase}/api/polls/${encodeURIComponent(hostCfg.pollId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Poll-Admin': hostCfg.adminToken },
        body: JSON.stringify({ question: hostCfg.question, options: hostCfg.options, isOpen: hostCfg.isOpen })
      });
    } catch (_) {}
    pullResults();
  }

  function renderBars(question, options, counts, totalVotes) {
    hostQEl.textContent = question;
    totalBadge.textContent = `${totalVotes} โหวต`;
    const total = Math.max(1, totalVotes);
    const maxCnt = Math.max(0, ...counts);
    const showLeader = !hostCfg.hideResults && totalVotes > 0 && maxCnt > 0;

    hostBarsEl.innerHTML = options.map((opt, idx) => {
      const cnt = counts[idx] || 0;
      const pct = hostCfg.hideResults ? 0 : Math.round((cnt / total) * 100);
      const color = BAR_COLORS[idx % BAR_COLORS.length];
      const isLeader = showLeader && cnt === maxCnt;
      const statText = hostCfg.hideResults ? '••% (ซ่อนผล)' : `${pct}% (${cnt})`;
      return `
        <div data-poll-bar="${idx}" style="animation-delay:${idx * 45}ms" class="vox-stagger-in flex flex-col gap-1">
          <div class="flex items-center justify-between gap-2 font-display font-extrabold text-sm sm:text-base text-[#111111]">
            <span class="flex items-center gap-2 min-w-0">
              ${isLeader ? '<span class="px-1.5 py-0.5 rounded bg-[#111111] text-[#F4D03F] text-[10px] shrink-0">นำอยู่</span>' : ''}
              <span data-poll-lbl class="truncate">${esc(opt)}</span>
            </span>
            <span data-poll-stat class="tabular-nums shrink-0">${statText}</span>
          </div>
          <div class="w-full h-7 bg-[#F0EDE4] border-2 border-[#111111] rounded-lg overflow-hidden p-[3px]">
            <div data-poll-fill class="infographic-bar-fill h-full rounded-[4px] transition-all duration-500" style="width:${pct}%; background-color:${color};"></div>
          </div>
        </div>
      `;
    }).join('');
  }

  async function pullResults() {
    hostQEl.textContent = hostCfg.question;
    if (!apiBase) {
      hostBarsEl.innerHTML = `<div class="text-xs font-bold text-[#E74C3C]">ต้องรันผ่านเซิร์ฟเวอร์ (npm start) เพื่อรับผลโหวตจากมือถือ</div>`;
      return;
    }
    try {
      const res = await fetch(`${apiBase}/api/polls/${encodeURIComponent(hostCfg.pollId)}`);
      if (!res.ok) {
        const previewCounts = hostCfg.options.map(() => 0);
        const previewKey = JSON.stringify({ q: hostCfg.question, opts: hostCfg.options, counts: previewCounts, hide: hostCfg.hideResults });
        if (previewKey !== lastHostRenderKey) {
          lastHostRenderKey = previewKey;
          renderBars(hostCfg.question, hostCfg.options, previewCounts, 0);
        }
        return;
      }
      const data = await res.json();
      const renderKey = JSON.stringify({ q: data.question, opts: data.options, counts: data.counts, hide: hostCfg.hideResults });
      if (renderKey === lastHostRenderKey) return;
      lastHostRenderKey = renderKey;
      renderBars(data.question, data.options, data.counts, data.totalVotes);
    } catch (_) {}
  }

  document.querySelectorAll('[data-poll-preset]').forEach(btn => {
    btn.addEventListener('click', () => {
      const p = PRESETS[btn.dataset.pollPreset];
      if (!p) return;
      hostCfg.question = p.question;
      hostCfg.options = [...p.options];
      renderOptionInputs();
      pushPollToServer();
    });
  });

  document.getElementById('poll-new-btn')?.addEventListener('click', () => {
    hostCfg.pollId = 'poll-' + Math.random().toString(36).slice(2, 8);
    hostCfg.adminToken = 'adm-' + Math.random().toString(36).slice(2, 12) + Date.now().toString(36);
    hostCfg.isOpen = true;
    lastHostRenderKey = '';
    saveHostCfg();
    syncQrTargets();
    syncOpenBadge();
    pushPollToServer();
  });

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
    syncOpenBadge();
    pushPollToServer();
  });

  hideResultsBtn?.addEventListener('click', () => {
    hostCfg.hideResults = !hostCfg.hideResults;
    saveHostCfg();
    syncHideResultsBtn();
    lastHostRenderKey = '';
    pullResults();
  });

  presentBtn?.addEventListener('click', () => setPresentMode(!isPresenting));

  document.getElementById('poll-reset-votes')?.addEventListener('click', async () => {
    if (!apiBase) return;
    await fetch(`${apiBase}/api/polls/${encodeURIComponent(hostCfg.pollId)}/reset`, {
      method: 'POST',
      headers: { 'X-Poll-Admin': hostCfg.adminToken }
    });
    lastHostRenderKey = '';
    pullResults();
  });

  document.getElementById('poll-copy-link')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    const voteUrl = getVoteUrl();
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
    btn.style.transition = 'background-color 0.28s ease, color 0.28s ease, transform 0.28s cubic-bezier(0.22,1,0.36,1)';
    btn.classList.remove('bg-[#F8F6F0]');
    btn.classList.add('bg-[#F4D03F]', 'text-[#111111]', 'scale-105', 'inline-flex', 'items-center', 'gap-1.5');
    btn.innerHTML = `<svg class="w-4 h-4 shrink-0 text-[#111111]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg><span>Copied!</span>`;
    setTimeout(() => {
      btn.classList.remove('bg-[#F4D03F]', 'scale-105');
      btn.classList.add('bg-[#F8F6F0]');
      btn.textContent = 'คัดลอกลิงก์โหวต';
    }, 2000);
  });

  // QR Zoom Modal
  const qrModal = document.getElementById('poll-qr-modal');
  const closeQrModal = () => { qrModal?.classList.add('hidden'); qrModal?.classList.remove('flex'); };
  document.getElementById('poll-qr-zoom-btn')?.addEventListener('click', () => {
    qrModal?.classList.remove('hidden');
    qrModal?.classList.add('flex');
  });
  document.getElementById('poll-qr-modal-close')?.addEventListener('click', closeQrModal);
  qrModal?.addEventListener('click', (e) => { if (e.target === qrModal) closeQrModal(); });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (qrModal && !qrModal.classList.contains('hidden')) closeQrModal();
      else if (isPresenting) setPresentMode(false);
    }
  });

  syncQrTargets();
  syncOpenBadge();
  syncHideResultsBtn();
  renderOptionInputs();
  pushPollToServer();
  setInterval(pullResults, 2000);
})();
