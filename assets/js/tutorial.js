/* Vox Documentary Mascot Guided Tutorial (Spotlight + Mascot Speech Bubble + Replay) */
(() => {
  if (window.VoxTutorial) return;

  const getPageId = () => (document.getElementById('stage-container') ? 'scoreboard' : 'hub');

  const STEPS_BY_PAGE = {
    hub: [
      {
        selector: '#tool-grid',
        mascot: 0,
        title: 'เข้าสู่กระดานคะแนนเวที',
        text: 'เลื่อนเมาส์เข้าใกล้แล้วคลิกที่มาสคอต Stage Scoreboard เพื่อเปิดใช้งานกระดานคะแนนสดบนเวทีได้ทันที'
      },
      {
        selector: '#helpdai-auth-slot, #open-sugg-btn',
        mascot: 1,
        title: 'ซิงค์ข้อมูล & เสนอแนะ',
        text: 'เข้าสู่ระบบเพื่อซิงค์ข้อมูลกิจกรรมข้ามอุปกรณ์อัตโนมัติ หรือส่งไอเดียฟีเจอร์ใหม่ได้ที่ปุ่มเสนอแนะ'
      },
      {
        selector: '[data-start-tutorial]',
        mascot: 2,
        title: 'เปิดดูคู่มือซ้ำได้ตลอด',
        text: 'หากต้องการให้พวกเราแนะนำการใช้งานอีกครั้ง สามารถกดปุ่ม "คู่มือ" ตรงนี้ได้เลย!'
      }
    ],
    scoreboard: [
      {
        selector: '#game-cards-row',
        mascot: 0,
        title: 'รายชื่อกิจกรรม',
        text: 'คลิกซ้ายเพื่อเปิดดูกติกา/สื่อ หรือคลิกขวาเพื่อแก้ไขชื่อ กติกา และเพิ่ม-ลบกิจกรรม'
      },
      {
        selector: '#leaderboard-list',
        mascot: 1,
        title: 'บล็อกคะแนนทีม',
        text: 'คลิกซ้ายหรือคลิกขวาที่ทีมใดก็ได้ เพื่อเพิ่ม-ลดคะแนน เปลี่ยนชื่อ หรือเพิ่ม-ลบทีม'
      },
      {
        selector: '#view-settings-btn',
        mascot: 2,
        title: 'ปรับมุมมอง (View)',
        text: 'กดปุ่มรูปตาเพื่อเลือกระดับรายละเอียด (ครบ / กลาง / ย่อ) และการจัดวาง (แถว / ตาราง)'
      },
      {
        selector: '#vox-toolbox',
        mascot: 0,
        title: 'กล่องเครื่องมือ (Toolbox)',
        text: 'ใช้สุ่มทีม จับเวลา เพลง YouTube โหวตสด QR แชร์จอห้องใหญ่ ประกาศผู้ชนะ และย้ายฝั่งซ้าย-ขวาได้'
      }
    ]
  };

  let activeSteps = [];
  let stepIdx = 0;
  let overlayEl = null;
  let spotlightEl = null;
  let cardEl = null;

  function buildTourDom() {
    if (overlayEl) return;

    overlayEl = document.createElement('div');
    overlayEl.id = 'vox-tour-overlay';
    overlayEl.className = 'fixed inset-0 z-[170] hidden';
    overlayEl.setAttribute('role', 'dialog');
    overlayEl.setAttribute('aria-modal', 'true');

    // Click-blocker layer
    const blocker = document.createElement('div');
    blocker.className = 'fixed inset-0';
    overlayEl.appendChild(blocker);

    // Spotlight cutout using giant box-shadow
    spotlightEl = document.createElement('div');
    spotlightEl.style.cssText = [
      'position:fixed',
      'border-radius:14px',
      'border:3px solid #F4D03F',
      'box-shadow:0 0 0 9999px rgba(17,17,17,0.74)',
      'pointer-events:none',
      'transition:all 0.32s cubic-bezier(0.22,1,0.36,1)',
      'z-index:171'
    ].join(';');
    overlayEl.appendChild(spotlightEl);

    // Mascot Speech Card
    cardEl = document.createElement('div');
    cardEl.className = 'vox-card bg-[#F8F6F0] p-4 w-[min(22rem,calc(100vw-2rem))] fixed z-[172] flex flex-col gap-3';
    cardEl.style.transition = 'top 0.32s cubic-bezier(0.22,1,0.36,1), left 0.32s cubic-bezier(0.22,1,0.36,1)';
    cardEl.innerHTML = `
      <div class="flex items-start gap-3">
        <div id="vox-tour-mascot" class="shrink-0"></div>
        <div class="min-w-0 flex-1">
          <div class="flex items-center justify-between gap-2 mb-1">
            <span id="vox-tour-badge" class="text-[10px] font-display font-black px-2 py-0.5 rounded bg-[#111111] text-[#F4D03F]">1 / 3</span>
            <button type="button" id="vox-tour-skip" class="text-xs font-bold text-[#111111]/60 hover:text-[#111111] underline cursor-pointer">ข้าม</button>
          </div>
          <h3 id="vox-tour-title" class="thai-safe-tight font-display font-extrabold text-sm sm:text-base text-[#111111]"></h3>
          <p id="vox-tour-text" class="text-xs sm:text-sm text-[#111111]/80 leading-relaxed mt-1"></p>
        </div>
      </div>
      <div class="flex items-center justify-between gap-2 pt-2 border-t border-[#111111]/15">
        <button type="button" id="vox-tour-prev" class="btn-vox bg-white hover:bg-gray-100 text-[#111111] font-display font-bold text-xs px-3 py-1.5 rounded-xl cursor-pointer">‹ ย้อนกลับ</button>
        <button type="button" id="vox-tour-next" class="btn-vox bg-[#F4D03F] hover:bg-[#f2c61d] text-[#111111] font-display font-extrabold text-xs px-4 py-1.5 rounded-xl cursor-pointer">ถัดไป ›</button>
      </div>
    `;
    overlayEl.appendChild(cardEl);
    document.body.appendChild(overlayEl);

    document.getElementById('vox-tour-skip').addEventListener('click', endTour);
    document.getElementById('vox-tour-prev').addEventListener('click', () => {
      if (stepIdx > 0) {
        stepIdx--;
        renderStep();
      }
    });
    document.getElementById('vox-tour-next').addEventListener('click', () => {
      if (stepIdx < activeSteps.length - 1) {
        stepIdx++;
        renderStep();
      } else {
        endTour();
      }
    });

    window.addEventListener('resize', () => {
      if (overlayEl && !overlayEl.classList.contains('hidden')) renderStep();
    });
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && overlayEl && !overlayEl.classList.contains('hidden')) endTour();
    });
  }

  function renderStep() {
    const step = activeSteps[stepIdx];
    if (!step) return endTour();
    const target = document.querySelector(step.selector);
    if (!target) return endTour();

    const rect = target.getBoundingClientRect();
    const pad = 8;
    const spLeft = Math.max(4, rect.left - pad);
    const spTop = Math.max(4, rect.top - pad);
    const spWidth = Math.min(window.innerWidth - 8, rect.width + pad * 2);
    const spHeight = Math.min(window.innerHeight - 8, rect.height + pad * 2);

    spotlightEl.style.left = `${spLeft}px`;
    spotlightEl.style.top = `${spTop}px`;
    spotlightEl.style.width = `${spWidth}px`;
    spotlightEl.style.height = `${spHeight}px`;

    // Populate mascot & copy
    const mascotWrap = document.getElementById('vox-tour-mascot');
    if (mascotWrap && window.VoxMascots) {
      mascotWrap.innerHTML = VoxMascots.svg(step.mascot, undefined, 'w-14 h-14');
    }
    document.getElementById('vox-tour-badge').textContent = `${stepIdx + 1} / ${activeSteps.length}`;
    document.getElementById('vox-tour-title').textContent = step.title;
    document.getElementById('vox-tour-text').textContent = step.text;

    const prevBtn = document.getElementById('vox-tour-prev');
    const nextBtn = document.getElementById('vox-tour-next');
    prevBtn.disabled = stepIdx === 0;
    prevBtn.classList.toggle('opacity-40', stepIdx === 0);
    nextBtn.textContent = stepIdx === activeSteps.length - 1 ? '✓ เริ่มใช้งาน' : 'ถัดไป ›';

    // Position speech card without going offscreen
    const cardW = Math.min(352, window.innerWidth - 32);
    const cardH = cardEl.offsetHeight || 175;
    let cardLeft = Math.max(16, Math.min(window.innerWidth - cardW - 16, rect.left + rect.width / 2 - cardW / 2));
    let cardTop = spTop + spHeight + 14;
    if (cardTop + cardH > window.innerHeight - 16) {
      cardTop = Math.max(16, spTop - cardH - 14);
    }
    cardEl.style.left = `${cardLeft}px`;
    cardEl.style.top = `${cardTop}px`;
  }

  function startTour() {
    const pageId = getPageId();
    activeSteps = (STEPS_BY_PAGE[pageId] || []).filter(s => document.querySelector(s.selector));
    if (activeSteps.length === 0) return;
    buildTourDom();
    stepIdx = 0;
    overlayEl.classList.remove('hidden');
    requestAnimationFrame(renderStep);
  }

  function endTour() {
    const tourKey = `vox_tour_${getPageId()}_v1`;
    try { localStorage.setItem(tourKey, '1'); } catch (_) {}
    if (overlayEl) overlayEl.classList.add('hidden');
  }

  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-start-tutorial]')) {
      startTour();
    }
  });

  function maybeAutoStart() {
    const tourKey = `vox_tour_${getPageId()}_v1`;
    try {
      if (localStorage.getItem(tourKey) === '1') return;
    } catch (_) {}

    const waitAndRun = () => {
      const tosModal = document.getElementById('vox-tos-modal');
      const tosOpen = tosModal && !tosModal.classList.contains('hidden');
      const loader = document.getElementById('app-loader');
      if (tosOpen || loader) {
        setTimeout(waitAndRun, 350);
        return;
      }
      startTour();
    };
    setTimeout(waitAndRun, 450);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', maybeAutoStart, { once: true });
  } else {
    maybeAutoStart();
  }

  window.VoxTutorial = { start: startTour };
})();
