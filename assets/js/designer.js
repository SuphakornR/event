(() => {
  'use strict';

  const STORAGE_KEY = 'vox_page_designer_v1';
  const SNAP_STEP = 12;
  const VIEWPORTS = {
    desktop: { width: 1024, label: 'Desktop' },
    tablet: { width: 768, label: 'Tablet' },
    mobile: { width: 390, label: 'Mobile' }
  };
  const PALETTE = [
    '#FFFFFF', '#F8F6F0', '#111111', '#F4D03F', '#E74C3C',
    '#2980B9', '#2ECC71', '#9B59B6', '#F39C12', 'transparent'
  ];

  const esc = (s) => (window.VoxSecurity ? window.VoxSecurity.escapeHtml(s) : String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])));
  const uid = () => 'el_' + Math.random().toString(36).slice(2, 9);
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  function makeStarterTemplate(name) {
    if (name === 'blank') {
      return {
        pageTitle: 'Blank Page',
        pageGoal: '',
        viewport: 'desktop',
        canvasHeight: 680,
        canvasBg: '#FFFFFF',
        elements: []
      };
    }
    if (name === 'cards') {
      return {
        pageTitle: 'Product Feature Cards',
        pageGoal: 'สร้างหน้า Landing Page พร้อมแถบหัวข้อและการ์ดฟีเจอร์ 3 คอลัมน์',
        viewport: 'desktop',
        canvasHeight: 680,
        canvasBg: '#F8F6F0',
        elements: [
          { id: uid(), type: 'box', x: 36, y: 24, w: 948, h: 64, text: '', bg: '#FFFFFF', color: '#111111', borderColor: '#111111', borderWidth: 3, radius: 14, fontSize: 16, fontWeight: '700', align: 'left', shadow: 'brutal', note: 'Top navigation bar' },
          { id: uid(), type: 'heading', x: 60, y: 40, w: 240, h: 36, text: 'Brand Studio', bg: 'transparent', color: '#111111', borderColor: '#111111', borderWidth: 0, radius: 0, fontSize: 22, fontWeight: '900', align: 'left', shadow: 'none', note: 'Brand logo text' },
          { id: uid(), type: 'button', x: 828, y: 36, w: 132, h: 40, text: 'เริ่มต้นใช้งาน', bg: '#F4D03F', color: '#111111', borderColor: '#111111', borderWidth: 2, radius: 10, fontSize: 14, fontWeight: '800', align: 'center', shadow: 'brutal', note: 'Navbar CTA button' },
          { id: uid(), type: 'heading', x: 180, y: 120, w: 660, h: 56, text: 'ออกแบบหน้าเว็บไวขึ้นในไม่กี่นาที', bg: 'transparent', color: '#111111', borderColor: '#111111', borderWidth: 0, radius: 0, fontSize: 36, fontWeight: '900', align: 'center', shadow: 'none', note: 'Main headline' },
          { id: uid(), type: 'text', x: 228, y: 180, w: 564, h: 48, text: 'จัดวางข้อความ รูปทรง และชุดสี แล้วส่งออกเป็น Prompt หรือโค้ดให้ AI พัฒนาต่อได้ทันที', bg: 'transparent', color: '#333333', borderColor: '#111111', borderWidth: 0, radius: 0, fontSize: 16, fontWeight: '500', align: 'center', shadow: 'none', note: 'Hero subtitle' },
          { id: uid(), type: 'box', x: 36, y: 264, w: 300, h: 288, text: '', bg: '#FFFFFF', color: '#111111', borderColor: '#111111', borderWidth: 3, radius: 16, fontSize: 16, fontWeight: '700', align: 'left', shadow: 'brutal', note: 'Feature card 1' },
          { id: uid(), type: 'box', x: 360, y: 264, w: 300, h: 288, text: '', bg: '#FFFFFF', color: '#111111', borderColor: '#111111', borderWidth: 3, radius: 16, fontSize: 16, fontWeight: '700', align: 'left', shadow: 'brutal', note: 'Feature card 2' },
          { id: uid(), type: 'box', x: 684, y: 264, w: 300, h: 288, text: '', bg: '#F4D03F', color: '#111111', borderColor: '#111111', borderWidth: 3, radius: 16, fontSize: 16, fontWeight: '700', align: 'left', shadow: 'brutal', note: 'Highlighted feature card 3' },
          { id: uid(), type: 'heading', x: 60, y: 288, w: 252, h: 36, text: '01. ลากวางอิสระ', bg: 'transparent', color: '#111111', borderColor: '#111111', borderWidth: 0, radius: 0, fontSize: 20, fontWeight: '800', align: 'left', shadow: 'none', note: 'Card 1 title' },
          { id: uid(), type: 'heading', x: 384, y: 288, w: 252, h: 36, text: '02. ปรับสีและฟอนต์', bg: 'transparent', color: '#111111', borderColor: '#111111', borderWidth: 0, radius: 0, fontSize: 20, fontWeight: '800', align: 'left', shadow: 'none', note: 'Card 2 title' },
          { id: uid(), type: 'heading', x: 708, y: 288, w: 252, h: 36, text: '03. ส่งต่อให้ AI', bg: 'transparent', color: '#111111', borderColor: '#111111', borderWidth: 0, radius: 0, fontSize: 20, fontWeight: '800', align: 'left', shadow: 'none', note: 'Card 3 title' }
        ]
      };
    }
    if (name === 'event') {
      return {
        pageTitle: 'Event Registration Page',
        pageGoal: 'หน้าลงทะเบียนกิจกรรม/ค่าย มีแบนเนอร์ วันเวลา สถานที่ และฟอร์มสมัคร',
        viewport: 'desktop',
        canvasHeight: 680,
        canvasBg: '#F8F6F0',
        elements: [
          { id: uid(), type: 'image', x: 36, y: 24, w: 948, h: 204, text: 'Event Cover Banner (1200x400)', bg: '#111111', color: '#F4D03F', borderColor: '#111111', borderWidth: 3, radius: 18, fontSize: 20, fontWeight: '800', align: 'center', shadow: 'brutal', note: 'Hero event banner image' },
          { id: uid(), type: 'badge', x: 48, y: 252, w: 144, h: 32, text: 'OPEN FOR 2026', bg: '#F4D03F', color: '#111111', borderColor: '#111111', borderWidth: 2, radius: 999, fontSize: 12, fontWeight: '800', align: 'center', shadow: 'none', note: 'Event status tag' },
          { id: uid(), type: 'heading', x: 48, y: 294, w: 504, h: 52, text: 'Tech & Design Camp 2026', bg: 'transparent', color: '#111111', borderColor: '#111111', borderWidth: 0, radius: 0, fontSize: 34, fontWeight: '900', align: 'left', shadow: 'none', note: 'Event title' },
          { id: uid(), type: 'text', x: 48, y: 354, w: 504, h: 96, text: 'ร่วมเวิร์กชอปสร้างเว็บและเครื่องมือโต้ตอบแบบเรียลไทม์ พร้อมกิจกรรมแข่งขันชิงรางวัลตลอดวัน', bg: 'transparent', color: '#222222', borderColor: '#111111', borderWidth: 0, radius: 0, fontSize: 16, fontWeight: '500', align: 'left', shadow: 'none', note: 'Event description' },
          { id: uid(), type: 'box', x: 588, y: 252, w: 396, h: 336, text: '', bg: '#FFFFFF', color: '#111111', borderColor: '#111111', borderWidth: 3, radius: 18, fontSize: 16, fontWeight: '700', align: 'left', shadow: 'brutal', note: 'Registration form card' },
          { id: uid(), type: 'heading', x: 612, y: 276, w: 348, h: 36, text: 'ลงทะเบียนเข้าร่วมงาน', bg: 'transparent', color: '#111111', borderColor: '#111111', borderWidth: 0, radius: 0, fontSize: 20, fontWeight: '800', align: 'left', shadow: 'none', note: 'Form heading' },
          { id: uid(), type: 'input', x: 612, y: 324, w: 348, h: 44, text: 'ชื่อ-นามสกุล', bg: '#F8F6F0', color: '#555555', borderColor: '#111111', borderWidth: 2, radius: 10, fontSize: 14, fontWeight: '500', align: 'left', shadow: 'none', note: 'Full name input' },
          { id: uid(), type: 'input', x: 612, y: 384, w: 348, h: 44, text: 'อีเมลติดต่อ', bg: '#F8F6F0', color: '#555555', borderColor: '#111111', borderWidth: 2, radius: 10, fontSize: 14, fontWeight: '500', align: 'left', shadow: 'none', note: 'Email input' },
          { id: uid(), type: 'button', x: 612, y: 456, w: 348, h: 48, text: 'ยืนยันการสมัคร', bg: '#F4D03F', color: '#111111', borderColor: '#111111', borderWidth: 2, radius: 12, fontSize: 16, fontWeight: '900', align: 'center', shadow: 'brutal', note: 'Submit registration button' }
        ]
      };
    }
    // Default: 'hero'
    return {
      pageTitle: 'My Landing Page',
      pageGoal: 'สร้างหน้า Landing Page สไตล์โมเดิร์น ชัดเจน มี Hero Section ทางซ้ายและภาพตัวอย่างทางขวา',
      viewport: 'desktop',
      canvasHeight: 680,
      canvasBg: '#F8F6F0',
      elements: [
        { id: uid(), type: 'badge', x: 60, y: 84, w: 168, h: 32, text: 'NEW LAUNCH 2026', bg: '#F4D03F', color: '#111111', borderColor: '#111111', borderWidth: 2, radius: 999, fontSize: 12, fontWeight: '800', align: 'center', shadow: 'none', note: 'Hero eyebrow badge' },
        { id: uid(), type: 'heading', x: 60, y: 132, w: 468, h: 120, text: 'ออกแบบไอเดียเว็บของคุณ\nให้เป็นจริงในพริบตา', bg: 'transparent', color: '#111111', borderColor: '#111111', borderWidth: 0, radius: 0, fontSize: 40, fontWeight: '900', align: 'left', shadow: 'none', note: 'Main hero H1 title' },
        { id: uid(), type: 'text', x: 60, y: 264, w: 456, h: 72, text: 'วางเลย์เอาต์ ข้อความ รูปทรง และสีที่ต้องการ จากนั้นคัดลอกข้อมูลส่งให้ AI เขียนโค้ดให้สมบูรณ์ได้เลย', bg: 'transparent', color: '#333333', borderColor: '#111111', borderWidth: 0, radius: 0, fontSize: 16, fontWeight: '500', align: 'left', shadow: 'none', note: 'Hero subtitle copy' },
        { id: uid(), type: 'button', x: 60, y: 360, w: 180, h: 48, text: 'เริ่มต้นใช้งาน', bg: '#F4D03F', color: '#111111', borderColor: '#111111', borderWidth: 3, radius: 12, fontSize: 16, fontWeight: '900', align: 'center', shadow: 'brutal', note: 'Primary CTA button' },
        { id: uid(), type: 'button', x: 252, y: 360, w: 156, h: 48, text: 'ดูตัวอย่าง', bg: '#FFFFFF', color: '#111111', borderColor: '#111111', borderWidth: 3, radius: 12, fontSize: 16, fontWeight: '800', align: 'center', shadow: 'brutal', note: 'Secondary CTA button' },
        { id: uid(), type: 'image', x: 564, y: 84, w: 396, h: 336, text: 'Hero Illustration / Screenshot', bg: '#FFFFFF', color: '#111111', borderColor: '#111111', borderWidth: 3, radius: 20, fontSize: 18, fontWeight: '800', align: 'center', shadow: 'brutal', note: 'Right side hero visual' },
        { id: uid(), type: 'divider', x: 60, y: 468, w: 900, h: 4, text: '', bg: '#111111', color: '#111111', borderColor: '#111111', borderWidth: 0, radius: 2, fontSize: 12, fontWeight: '700', align: 'center', shadow: 'none', note: 'Section divider' },
        { id: uid(), type: 'box', x: 60, y: 504, w: 288, h: 120, text: '99.9% Fast Setup', bg: '#FFFFFF', color: '#111111', borderColor: '#111111', borderWidth: 3, radius: 14, fontSize: 18, fontWeight: '800', align: 'center', shadow: 'brutal', note: 'Stat card 1' },
        { id: uid(), type: 'box', x: 366, y: 504, w: 288, h: 120, text: 'AI-Ready Spec', bg: '#111111', color: '#F4D03F', borderColor: '#111111', borderWidth: 3, radius: 14, fontSize: 18, fontWeight: '800', align: 'center', shadow: 'brutal', note: 'Stat card 2' },
        { id: uid(), type: 'box', x: 672, y: 504, w: 288, h: 120, text: 'Custom Palette', bg: '#F4D03F', color: '#111111', borderColor: '#111111', borderWidth: 3, radius: 14, fontSize: 18, fontWeight: '800', align: 'center', shadow: 'brutal', note: 'Stat card 3' }
      ]
    };
  }

  function loadInitialState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.elements)) {
          return parsed;
        }
      }
    } catch { /* ignore */ }
    return makeStarterTemplate('hero');
  }

  let state = loadInitialState();
  let selectedId = state.elements[0]?.id || null;
  let snapEnabled = true;
  let history = [];
  let redoStack = [];
  let activeExportTab = 'prompt';

  const canvasEl = document.getElementById('design-canvas');
  const canvasShellEl = document.getElementById('design-canvas-shell');
  const sizeLabelEl = document.getElementById('canvas-size-label');
  const elCountEl = document.getElementById('canvas-el-count');
  const inspectorEl = document.getElementById('inspector-panel');
  const pageTitleInput = document.getElementById('page-title-input');
  const undoBtn = document.getElementById('undo-btn');
  const redoBtn = document.getElementById('redo-btn');

  function pushHistory() {
    history.push(JSON.stringify(state));
    if (history.length > 40) history.shift();
    redoStack = [];
    syncHistoryButtons();
  }

  function syncHistoryButtons() {
    if (undoBtn) undoBtn.disabled = history.length === 0;
    if (redoBtn) redoBtn.disabled = redoStack.length === 0;
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch { /* ignore quota errors */ }
  }

  function snap(val) {
    return snapEnabled ? Math.round(val / SNAP_STEP) * SNAP_STEP : Math.round(val);
  }

  function getSelected() {
    return state.elements.find((e) => e.id === selectedId) || null;
  }

  function createElementByType(type) {
    const vpWidth = VIEWPORTS[state.viewport]?.width || 1024;
    const baseX = snap(Math.max(24, Math.min(vpWidth - 220, 48 + (state.elements.length % 5) * 24)));
    const baseY = snap(Math.max(24, Math.min(state.canvasHeight - 120, 48 + (state.elements.length % 6) * 24)));
    const defaults = {
      heading: { w: 360, h: 52, text: 'หัวข้อใหม่ (Heading)', bg: 'transparent', color: '#111111', borderWidth: 0, radius: 0, fontSize: 32, fontWeight: '900', align: 'left', shadow: 'none' },
      text: { w: 340, h: 72, text: 'พิมพ์ข้อความรายละเอียดหรือคำอธิบายที่นี่', bg: 'transparent', color: '#222222', borderWidth: 0, radius: 0, fontSize: 16, fontWeight: '500', align: 'left', shadow: 'none' },
      button: { w: 168, h: 48, text: 'ปุ่มกด (CTA)', bg: '#F4D03F', color: '#111111', borderWidth: 3, radius: 12, fontSize: 15, fontWeight: '800', align: 'center', shadow: 'brutal' },
      badge: { w: 144, h: 32, text: 'NEW TAG', bg: '#111111', color: '#F4D03F', borderWidth: 2, radius: 999, fontSize: 12, fontWeight: '800', align: 'center', shadow: 'none' },
      input: { w: 288, h: 44, text: 'กรอกข้อมูล...', bg: '#FFFFFF', color: '#666666', borderWidth: 2, radius: 10, fontSize: 14, fontWeight: '500', align: 'left', shadow: 'none' },
      box: { w: 288, h: 180, text: '', bg: '#FFFFFF', color: '#111111', borderWidth: 3, radius: 16, fontSize: 16, fontWeight: '700', align: 'center', shadow: 'brutal' },
      rect: { w: 180, h: 120, text: '', bg: '#2980B9', color: '#FFFFFF', borderWidth: 2, radius: 8, fontSize: 16, fontWeight: '700', align: 'center', shadow: 'none' },
      circle: { w: 108, h: 108, text: '', bg: '#E74C3C', color: '#FFFFFF', borderWidth: 3, radius: 999, fontSize: 16, fontWeight: '800', align: 'center', shadow: 'brutal' },
      image: { w: 324, h: 204, text: 'Image / Media Placeholder', bg: '#EAE6DA', color: '#111111', borderWidth: 3, radius: 16, fontSize: 14, fontWeight: '800', align: 'center', shadow: 'none' },
      divider: { w: 360, h: 4, text: '', bg: '#111111', color: '#111111', borderWidth: 0, radius: 2, fontSize: 12, fontWeight: '700', align: 'center', shadow: 'none' }
    };
    const d = defaults[type] || defaults.box;
    return {
      id: uid(),
      type,
      x: baseX,
      y: baseY,
      borderColor: '#111111',
      note: '',
      ...d
    };
  }

  function elementShadowCss(shadow) {
    if (shadow === 'brutal') return '4px 4px 0px #111111';
    if (shadow === 'soft') return '0 10px 24px rgba(17,17,17,0.14)';
    return 'none';
  }

  function renderCanvas() {
    if (!canvasEl) return;
    const vp = VIEWPORTS[state.viewport] || VIEWPORTS.desktop;
    if (canvasShellEl) canvasShellEl.style.width = `${vp.width}px`;
    canvasEl.style.height = `${state.canvasHeight}px`;
    canvasEl.style.backgroundColor = state.canvasBg || '#FFFFFF';
    canvasEl.classList.toggle('designer-grid-bg', snapEnabled);

    if (pageTitleInput && document.activeElement !== pageTitleInput) {
      pageTitleInput.value = state.pageTitle || 'Untitled Page';
    }
    if (sizeLabelEl) sizeLabelEl.textContent = `${vp.label} • ${vp.width} × ${state.canvasHeight} px`;
    if (elCountEl) elCountEl.textContent = `${state.elements.length} elements`;

    document.querySelectorAll('.vp-btn').forEach((btn) => {
      const active = btn.dataset.vp === state.viewport;
      btn.classList.toggle('bg-[#111111]', active);
      btn.classList.toggle('text-[#F4D03F]', active);
      btn.classList.toggle('text-[#111111]', !active);
    });

    canvasEl.innerHTML = state.elements.map((el, idx) => {
      const isSel = el.id === selectedId;
      const shadowCss = elementShadowCss(el.shadow);
      const borderStyle = el.borderWidth > 0 ? `${el.borderWidth}px solid ${el.borderColor || '#111111'}` : 'none';
      const justifyMap = { left: 'flex-start', center: 'center', right: 'flex-end' };
      const isImage = el.type === 'image';
      const isTextLike = ['heading', 'text', 'button', 'badge', 'input', 'box', 'rect', 'circle', 'image'].includes(el.type);
      const innerContent = isImage
        ? `<div class="w-full h-full flex flex-col items-center justify-center gap-1.5 px-3 pointer-events-none">
            <svg class="w-7 h-7 opacity-70" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
            <span class="leading-tight">${esc(el.text || 'Image')}</span>
           </div>`
        : (isTextLike && el.text
          ? `<div class="w-full whitespace-pre-line break-words leading-snug pointer-events-none">${esc(el.text)}</div>`
          : '');

      return `
        <div
          data-el-id="${el.id}"
          class="canvas-el ${isSel ? 'is-selected' : ''}"
          style="
            left:${el.x}px;
            top:${el.y}px;
            width:${el.w}px;
            height:${el.h}px;
            z-index:${idx + 1};
            background:${el.bg || 'transparent'};
            color:${el.color || '#111111'};
            border:${borderStyle};
            border-radius:${el.radius || 0}px;
            box-shadow:${shadowCss};
            font-size:${el.fontSize || 16}px;
            font-weight:${el.fontWeight || '600'};
            text-align:${el.align || 'left'};
            display:flex;
            align-items:center;
            justify-content:${justifyMap[el.align] || 'flex-start'};
            padding:${el.type === 'divider' ? '0' : '6px 12px'};
          "
        >
          ${innerContent}
          ${isSel ? `
            <span class="resize-handle" data-dir="se" title="ปรับขนาด"></span>
            <span class="resize-handle" data-dir="e" title="ปรับความกว้าง"></span>
            <span class="resize-handle" data-dir="s" title="ปรับความสูง"></span>
          ` : ''}
        </div>
      `;
    }).join('');
  }

  function renderInspector() {
    if (!inspectorEl) return;
    const sel = getSelected();

    if (!sel) {
      inspectorEl.innerHTML = `
        <div class="border-b-2 border-[#111111] pb-2">
          <h2 class="font-display font-black text-xs uppercase tracking-wider text-[#111111]">ตั้งค่าหน้าเว็บ (Page)</h2>
        </div>

        <label class="flex flex-col gap-1 text-xs font-bold">
          <span>เป้าหมาย / คำสั่งให้ AI (Page Goal)</span>
          <textarea id="insp-page-goal" rows="3" placeholder="เช่น หน้า Landing Page ขายคอร์สออนไลน์ โทนสนุก..." class="thai-safe bg-[#F8F6F0] border-2 border-[#111111] rounded-lg p-2 text-xs font-medium resize-none focus:outline-none">${esc(state.pageGoal || '')}</textarea>
        </label>

        <div class="grid grid-cols-2 gap-2">
          <label class="flex flex-col gap-1 text-xs font-bold">
            <span>สีพื้นหลังหน้า</span>
            <div class="flex items-center gap-1.5">
              <input id="insp-canvas-bg" type="color" value="${/^#[0-9a-f]{6}$/i.test(state.canvasBg || '') ? state.canvasBg : '#FFFFFF'}" class="w-8 h-8 rounded border-2 border-[#111111] cursor-pointer" />
              <span class="font-mono text-[11px]">${esc(state.canvasBg || '#FFFFFF')}</span>
            </div>
          </label>
          <label class="flex flex-col gap-1 text-xs font-bold">
            <span>ความสูงหน้า (px)</span>
            <input id="insp-canvas-h" type="number" min="400" max="2400" step="20" value="${state.canvasHeight}" class="bg-[#F8F6F0] border-2 border-[#111111] rounded-lg px-2 py-1 text-xs font-mono" />
          </label>
        </div>

        <div class="pt-2 border-t-2 border-dashed border-[#111111]/15">
          <div class="flex items-center justify-between mb-1.5">
            <span class="font-display font-black text-xs uppercase tracking-wider text-[#111111]/70">เลเยอร์ (${state.elements.length})</span>
            ${state.elements.length ? '<button type="button" id="insp-clear-all" class="text-[11px] font-bold text-[#E74C3C] hover:underline cursor-pointer">ล้างทั้งหมด</button>' : ''}
          </div>
          <div class="flex flex-col gap-1 max-h-64 overflow-y-auto">
            ${state.elements.length ? [...state.elements].reverse().map((el) => `
              <button type="button" data-select-layer="${el.id}" class="flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg border border-[#111111]/30 bg-[#F8F6F0] hover:bg-[#F4D03F]/40 text-left text-xs cursor-pointer">
                <span class="font-display font-bold uppercase text-[10px] px-1.5 py-0.5 rounded bg-white border border-[#111111]/40 shrink-0">${esc(el.type)}</span>
                <span class="truncate flex-1 font-medium text-[#111111]/80">${esc(el.text || el.note || `${el.w}×${el.h}`)}</span>
              </button>
            `).join('') : '<p class="text-xs text-[#111111]/50">คลิกเครื่องมือฝั่งซ้ายเพื่อเพิ่มองค์ประกอบ</p>'}
          </div>
        </div>
      `;

      document.getElementById('insp-page-goal')?.addEventListener('input', (e) => {
        state.pageGoal = e.target.value;
        saveState();
      });
      document.getElementById('insp-canvas-bg')?.addEventListener('input', (e) => {
        state.canvasBg = e.target.value;
        renderCanvas();
        saveState();
      });
      document.getElementById('insp-canvas-h')?.addEventListener('change', (e) => {
        pushHistory();
        state.canvasHeight = clamp(Number(e.target.value) || 680, 400, 2400);
        renderCanvas();
        saveState();
      });
      document.getElementById('insp-clear-all')?.addEventListener('click', () => {
        pushHistory();
        state.elements = [];
        selectedId = null;
        renderAll();
        saveState();
      });
      inspectorEl.querySelectorAll('[data-select-layer]').forEach((btn) => {
        btn.addEventListener('click', () => {
          selectedId = btn.dataset.selectLayer;
          renderAll();
        });
      });
      return;
    }

    const bgHex = /^#[0-9a-f]{6}$/i.test(sel.bg || '') ? sel.bg : '#FFFFFF';
    const textHex = /^#[0-9a-f]{6}$/i.test(sel.color || '') ? sel.color : '#111111';
    const borderHex = /^#[0-9a-f]{6}$/i.test(sel.borderColor || '') ? sel.borderColor : '#111111';

    inspectorEl.innerHTML = `
      <div class="flex items-center justify-between border-b-2 border-[#111111] pb-2">
        <div class="flex items-center gap-1.5">
          <span class="px-1.5 py-0.5 rounded bg-[#111111] text-[#F4D03F] font-display font-black text-[10px] uppercase">${esc(sel.type)}</span>
          <span class="font-display font-bold text-xs text-[#111111]">แก้ไขคุณสมบัติ</span>
        </div>
        <button type="button" id="insp-deselect" class="text-[11px] font-bold text-[#111111]/60 hover:text-[#111111] cursor-pointer">หน้าเว็บ</button>
      </div>

      ${sel.type !== 'divider' ? `
        <label class="flex flex-col gap-1 text-xs font-bold">
          <span>ข้อความ (Text / Label)</span>
          <textarea id="insp-text" rows="2" class="thai-safe bg-[#F8F6F0] border-2 border-[#111111] rounded-lg p-2 text-xs font-medium resize-y focus:outline-none">${esc(sel.text || '')}</textarea>
        </label>
      ` : ''}

      <label class="flex flex-col gap-1 text-xs font-bold">
        <span>หมายเหตุให้ AI (Role / Note)</span>
        <input id="insp-note" type="text" value="${esc(sel.note || '')}" placeholder="เช่น Sticky navbar, Hero CTA" class="thai-safe bg-[#F8F6F0] border-2 border-[#111111] rounded-lg px-2 py-1.5 text-xs font-medium focus:outline-none" />
      </label>

      <div class="grid grid-cols-4 gap-1.5">
        <label class="flex flex-col gap-0.5 text-[10px] font-bold">X<input data-num="x" type="number" value="${sel.x}" class="bg-[#F8F6F0] border border-[#111111] rounded px-1.5 py-1 font-mono text-xs" /></label>
        <label class="flex flex-col gap-0.5 text-[10px] font-bold">Y<input data-num="y" type="number" value="${sel.y}" class="bg-[#F8F6F0] border border-[#111111] rounded px-1.5 py-1 font-mono text-xs" /></label>
        <label class="flex flex-col gap-0.5 text-[10px] font-bold">W<input data-num="w" type="number" min="16" value="${sel.w}" class="bg-[#F8F6F0] border border-[#111111] rounded px-1.5 py-1 font-mono text-xs" /></label>
        <label class="flex flex-col gap-0.5 text-[10px] font-bold">H<input data-num="h" type="number" min="2" value="${sel.h}" class="bg-[#F8F6F0] border border-[#111111] rounded px-1.5 py-1 font-mono text-xs" /></label>
      </div>

      <div class="grid grid-cols-3 gap-2">
        <label class="flex flex-col gap-1 text-[11px] font-bold">
          <span>สีพื้นหลัง</span>
          <div class="flex items-center gap-1">
            <input id="insp-bg" type="color" value="${bgHex}" class="w-7 h-7 rounded border-2 border-[#111111] cursor-pointer" />
            <button type="button" id="insp-bg-clear" class="text-[10px] px-1.5 py-0.5 rounded border border-[#111111] bg-white hover:bg-[#F4D03F] cursor-pointer" title="โปร่งใส">ใส</button>
          </div>
        </label>
        <label class="flex flex-col gap-1 text-[11px] font-bold">
          <span>สีตัวอักษร</span>
          <input id="insp-color" type="color" value="${textHex}" class="w-7 h-7 rounded border-2 border-[#111111] cursor-pointer" />
        </label>
        <label class="flex flex-col gap-1 text-[11px] font-bold">
          <span>สีขอบ</span>
          <input id="insp-border-color" type="color" value="${borderHex}" class="w-7 h-7 rounded border-2 border-[#111111] cursor-pointer" />
        </label>
      </div>

      <div class="grid grid-cols-2 gap-2">
        <label class="flex flex-col gap-0.5 text-[11px] font-bold">
          <span>ขนาดอักษร (px)</span>
          <input data-num="fontSize" type="number" min="10" max="96" value="${sel.fontSize || 16}" class="bg-[#F8F6F0] border border-[#111111] rounded px-2 py-1 font-mono text-xs" />
        </label>
        <label class="flex flex-col gap-0.5 text-[11px] font-bold">
          <span>ความหนา</span>
          <select id="insp-weight" class="bg-[#F8F6F0] border border-[#111111] rounded px-1.5 py-1 text-xs font-bold">
            <option value="500" ${sel.fontWeight === '500' ? 'selected' : ''}>ปกติ</option>
            <option value="700" ${sel.fontWeight === '700' ? 'selected' : ''}>หนา</option>
            <option value="900" ${sel.fontWeight === '900' ? 'selected' : ''}>หนามาก</option>
          </select>
        </label>
        <label class="flex flex-col gap-0.5 text-[11px] font-bold">
          <span>ความมนมุม (px)</span>
          <input data-num="radius" type="number" min="0" max="999" value="${sel.radius || 0}" class="bg-[#F8F6F0] border border-[#111111] rounded px-2 py-1 font-mono text-xs" />
        </label>
        <label class="flex flex-col gap-0.5 text-[11px] font-bold">
          <span>ความหนาขอบ (px)</span>
          <input data-num="borderWidth" type="number" min="0" max="12" value="${sel.borderWidth || 0}" class="bg-[#F8F6F0] border border-[#111111] rounded px-2 py-1 font-mono text-xs" />
        </label>
      </div>

      <div class="grid grid-cols-2 gap-2">
        <div class="flex flex-col gap-1">
          <span class="text-[11px] font-bold">จัดตำแหน่ง</span>
          <div class="grid grid-cols-3 gap-1">
            ${['left', 'center', 'right'].map((al) => `<button type="button" data-align="${al}" class="py-1 rounded border border-[#111111] text-[10px] font-bold cursor-pointer ${sel.align === al ? 'bg-[#111111] text-[#F4D03F]' : 'bg-white'}">${al === 'left' ? 'ซ้าย' : al === 'center' ? 'กลาง' : 'ขวา'}</button>`).join('')}
          </div>
        </div>
        <label class="flex flex-col gap-1 text-[11px] font-bold">
          <span>เงา (Shadow)</span>
          <select id="insp-shadow" class="bg-[#F8F6F0] border border-[#111111] rounded px-1.5 py-1 text-xs font-bold">
            <option value="none" ${sel.shadow === 'none' ? 'selected' : ''}>ไม่มี</option>
            <option value="soft" ${sel.shadow === 'soft' ? 'selected' : ''}>นุ่ม (Soft)</option>
            <option value="brutal" ${sel.shadow === 'brutal' ? 'selected' : ''}>ขอบเข้ม (Brutal)</option>
          </select>
        </label>
      </div>

      <div class="grid grid-cols-2 gap-1.5 pt-1 border-t-2 border-dashed border-[#111111]/15">
        <button type="button" id="insp-front" class="btn-vox bg-white hover:bg-[#F8F6F0] py-1.5 rounded-lg text-[11px] font-bold cursor-pointer">นำมาหน้าสุด</button>
        <button type="button" id="insp-back" class="btn-vox bg-white hover:bg-[#F8F6F0] py-1.5 rounded-lg text-[11px] font-bold cursor-pointer">ส่งไปหลังสุด</button>
        <button type="button" id="insp-dup" class="btn-vox bg-[#F4D03F] hover:bg-[#f2c61d] py-1.5 rounded-lg text-[11px] font-black cursor-pointer">ทำซ้ำ (Duplicate)</button>
        <button type="button" id="insp-del" class="btn-vox bg-[#E74C3C] text-white py-1.5 rounded-lg text-[11px] font-black cursor-pointer">ลบ (Delete)</button>
      </div>
    `;

    document.getElementById('insp-deselect')?.addEventListener('click', () => { selectedId = null; renderAll(); });
    document.getElementById('insp-text')?.addEventListener('input', (e) => {
      sel.text = e.target.value;
      renderCanvas();
      saveState();
    });
    document.getElementById('insp-note')?.addEventListener('input', (e) => {
      sel.note = e.target.value;
      saveState();
    });
    inspectorEl.querySelectorAll('[data-num]').forEach((inp) => {
      inp.addEventListener('change', () => {
        pushHistory();
        const k = inp.dataset.num;
        sel[k] = Number(inp.value) || 0;
        renderCanvas();
        saveState();
      });
    });
    document.getElementById('insp-bg')?.addEventListener('input', (e) => { sel.bg = e.target.value; renderCanvas(); saveState(); });
    document.getElementById('insp-bg-clear')?.addEventListener('click', () => { pushHistory(); sel.bg = 'transparent'; renderAll(); saveState(); });
    document.getElementById('insp-color')?.addEventListener('input', (e) => { sel.color = e.target.value; renderCanvas(); saveState(); });
    document.getElementById('insp-border-color')?.addEventListener('input', (e) => { sel.borderColor = e.target.value; renderCanvas(); saveState(); });
    document.getElementById('insp-weight')?.addEventListener('change', (e) => { pushHistory(); sel.fontWeight = e.target.value; renderCanvas(); saveState(); });
    document.getElementById('insp-shadow')?.addEventListener('change', (e) => { pushHistory(); sel.shadow = e.target.value; renderCanvas(); saveState(); });
    inspectorEl.querySelectorAll('[data-align]').forEach((btn) => {
      btn.addEventListener('click', () => { pushHistory(); sel.align = btn.dataset.align; renderAll(); saveState(); });
    });
    document.getElementById('insp-front')?.addEventListener('click', () => {
      pushHistory();
      state.elements = [...state.elements.filter((x) => x.id !== sel.id), sel];
      renderAll();
      saveState();
    });
    document.getElementById('insp-back')?.addEventListener('click', () => {
      pushHistory();
      state.elements = [sel, ...state.elements.filter((x) => x.id !== sel.id)];
      renderAll();
      saveState();
    });
    document.getElementById('insp-dup')?.addEventListener('click', duplicateSelected);
    document.getElementById('insp-del')?.addEventListener('click', deleteSelected);
  }

  function renderAll() {
    renderCanvas();
    renderInspector();
  }

  function duplicateSelected() {
    const sel = getSelected();
    if (!sel) return;
    pushHistory();
    const copy = { ...sel, id: uid(), x: sel.x + 24, y: sel.y + 24 };
    state.elements.push(copy);
    selectedId = copy.id;
    renderAll();
    saveState();
  }

  function deleteSelected() {
    if (!selectedId) return;
    pushHistory();
    state.elements = state.elements.filter((e) => e.id !== selectedId);
    selectedId = state.elements[state.elements.length - 1]?.id || null;
    renderAll();
    saveState();
  }

  // Quick Color Swatches
  const swatchesEl = document.getElementById('quick-swatches');
  if (swatchesEl) {
    swatchesEl.innerHTML = PALETTE.map((hex) => `
      <button type="button" data-swatch="${hex}" title="${hex}" class="w-7 h-7 rounded-md border-2 border-[#111111] cursor-pointer hover:scale-105 transition-transform" style="background:${hex === 'transparent' ? 'repeating-conic-gradient(#ddd 0% 25%, #fff 0% 50%) 50% / 10px 10px' : hex}"></button>
    `).join('');
    swatchesEl.querySelectorAll('[data-swatch]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const hex = btn.dataset.swatch;
        const sel = getSelected();
        pushHistory();
        if (sel) {
          sel.bg = hex;
        } else if (hex !== 'transparent') {
          state.canvasBg = hex;
        }
        renderAll();
        saveState();
      });
    });
  }

  // Add Elements from Left Palette
  document.querySelectorAll('[data-add-el]').forEach((btn) => {
    btn.addEventListener('click', () => {
      pushHistory();
      const el = createElementByType(btn.dataset.addEl);
      state.elements.push(el);
      selectedId = el.id;
      renderAll();
      saveState();
    });
  });

  // Canvas Pointer Interaction (Select, Drag, Resize)
  let dragState = null;

  canvasEl?.addEventListener('pointerdown', (e) => {
    const handle = e.target.closest('.resize-handle');
    const card = e.target.closest('.canvas-el');
    if (!card) {
      if (selectedId !== null) {
        selectedId = null;
        renderAll();
      }
      return;
    }

    const id = card.dataset.elId;
    if (selectedId !== id) {
      selectedId = id;
      renderAll();
    }

    const el = state.elements.find((item) => item.id === id);
    if (!el) return;

    const dir = handle?.dataset.dir || null;
    dragState = {
      mode: dir ? 'resize' : 'move',
      dir,
      id,
      startX: e.clientX,
      startY: e.clientY,
      origX: el.x,
      origY: el.y,
      origW: el.w,
      origH: el.h,
      moved: false
    };
    e.preventDefault();
  });

  window.addEventListener('pointermove', (e) => {
    if (!dragState) return;
    const el = state.elements.find((item) => item.id === dragState.id);
    if (!el) return;
    const dx = e.clientX - dragState.startX;
    const dy = e.clientY - dragState.startY;
    if (!dragState.moved && (Math.abs(dx) > 2 || Math.abs(dy) > 2)) {
      pushHistory();
      dragState.moved = true;
    }
    const vpW = VIEWPORTS[state.viewport]?.width || 1024;
    if (dragState.mode === 'move') {
      el.x = clamp(snap(dragState.origX + dx), 0, Math.max(0, vpW - el.w));
      el.y = clamp(snap(dragState.origY + dy), 0, Math.max(0, state.canvasHeight - el.h));
    } else {
      if (dragState.dir === 'se' || dragState.dir === 'e') {
        el.w = clamp(snap(dragState.origW + dx), 16, vpW - el.x);
      }
      if (dragState.dir === 'se' || dragState.dir === 's') {
        el.h = clamp(snap(dragState.origH + dy), 2, state.canvasHeight - el.y);
      }
    }
    renderCanvas();
  });

  window.addEventListener('pointerup', () => {
    if (dragState?.moved) {
      renderInspector();
      saveState();
    }
    dragState = null;
  });

  // Double-click inline text edit
  canvasEl?.addEventListener('dblclick', (e) => {
    const card = e.target.closest('.canvas-el');
    if (!card) return;
    const el = state.elements.find((item) => item.id === card.dataset.elId);
    if (!el || el.type === 'divider') return;
    const next = window.prompt('แก้ไขข้อความ:', el.text || '');
    if (next !== null) {
      pushHistory();
      el.text = next;
      renderAll();
      saveState();
    }
  });

  // Top Toolbar Actions
  pageTitleInput?.addEventListener('input', (e) => {
    state.pageTitle = e.target.value;
    saveState();
  });

  document.querySelectorAll('.vp-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.viewport = btn.dataset.vp;
      renderCanvas();
      saveState();
    });
  });

  const snapBtn = document.getElementById('toggle-snap-btn');
  snapBtn?.addEventListener('click', () => {
    snapEnabled = !snapEnabled;
    snapBtn.textContent = snapEnabled ? 'Grid: ON' : 'Grid: OFF';
    snapBtn.classList.toggle('bg-[#F4D03F]', snapEnabled);
    snapBtn.classList.toggle('bg-white', !snapEnabled);
    renderCanvas();
  });

  document.getElementById('template-select')?.addEventListener('change', (e) => {
    const val = e.target.value;
    if (!val) return;
    pushHistory();
    state = makeStarterTemplate(val);
    selectedId = state.elements[0]?.id || null;
    e.target.value = '';
    renderAll();
    saveState();
  });

  function undo() {
    if (!history.length) return;
    redoStack.push(JSON.stringify(state));
    state = JSON.parse(history.pop());
    if (!state.elements.some((e) => e.id === selectedId)) selectedId = null;
    syncHistoryButtons();
    renderAll();
    saveState();
  }

  function redo() {
    if (!redoStack.length) return;
    history.push(JSON.stringify(state));
    state = JSON.parse(redoStack.pop());
    if (!state.elements.some((e) => e.id === selectedId)) selectedId = null;
    syncHistoryButtons();
    renderAll();
    saveState();
  }

  undoBtn?.addEventListener('click', undo);
  redoBtn?.addEventListener('click', redo);

  window.addEventListener('keydown', (e) => {
    if (e.target.closest('input, textarea, select')) return;
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
      return;
    }
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'd') {
      e.preventDefault();
      duplicateSelected();
      return;
    }
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (selectedId) {
        e.preventDefault();
        deleteSelected();
      }
      return;
    }
    const sel = getSelected();
    if (sel && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault();
      const step = e.shiftKey ? SNAP_STEP : 2;
      if (e.key === 'ArrowLeft') sel.x = Math.max(0, sel.x - step);
      if (e.key === 'ArrowRight') sel.x += step;
      if (e.key === 'ArrowUp') sel.y = Math.max(0, sel.y - step);
      if (e.key === 'ArrowDown') sel.y += step;
      renderAll();
      saveState();
    }
  });

  // ========================================================================
  // EXPORT FOR AI GENERATORS (Markdown Prompt / HTML+Tailwind / JSON)
  // ========================================================================
  function buildAiPromptSpec() {
    const vp = VIEWPORTS[state.viewport] || VIEWPORTS.desktop;
    const usedColors = Array.from(new Set([
      state.canvasBg,
      ...state.elements.flatMap((e) => [e.bg, e.color, e.borderColor])
    ].filter((c) => c && c !== 'transparent')));

    const lines = [
      `# Website Page Design Specification`,
      `Please build this web page cleanly using HTML, Tailwind CSS (or React/Next.js) matching the layout, hierarchy, texts, shapes, and colors below.`,
      ``,
      `## Page Overview`,
      `- **Title:** ${state.pageTitle || 'Untitled Page'}`,
      `- **Goal / Context:** ${state.pageGoal || 'Modern responsive web page'}`,
      `- **Target Viewport:** ${vp.label} (${vp.width} x ${state.canvasHeight} px)`,
      `- **Canvas Background:** \`${state.canvasBg || '#FFFFFF'}\``,
      `- **Color Palette Used:** ${usedColors.map((c) => `\`${c}\``).join(', ')}`,
      ``,
      `## Elements (${state.elements.length} layers, back-to-front)`
    ];

    state.elements.forEach((el, idx) => {
      const textInfo = el.text ? ` | Text: "${el.text.replace(/\n/g, ' \\n ')}"` : '';
      const noteInfo = el.note ? ` | Role: ${el.note}` : '';
      lines.push(
        `${idx + 1}. **[${el.type.toUpperCase()}]**${noteInfo}${textInfo}` +
        `\n   - Bounds: \`x:${el.x}, y:${el.y}, w:${el.w}, h:${el.h}\`` +
        `\n   - Style: \`bg:${el.bg}, color:${el.color}, border:${el.borderWidth}px ${el.borderColor}, radius:${el.radius}px, font:${el.fontSize}px/${el.fontWeight}, align:${el.align}, shadow:${el.shadow}\``
      );
    });

    return lines.join('\n');
  }

  function buildHtmlOutput() {
    const vp = VIEWPORTS[state.viewport] || VIEWPORTS.desktop;
    const bodyEls = state.elements.map((el) => {
      const shadow = elementShadowCss(el.shadow);
      const border = el.borderWidth > 0 ? `${el.borderWidth}px solid ${el.borderColor}` : 'none';
      const justify = el.align === 'center' ? 'center' : (el.align === 'right' ? 'flex-end' : 'flex-start');
      const style = `position:absolute;left:${el.x}px;top:${el.y}px;width:${el.w}px;height:${el.h}px;background:${el.bg};color:${el.color};border:${border};border-radius:${el.radius}px;box-shadow:${shadow};font-size:${el.fontSize}px;font-weight:${el.fontWeight};text-align:${el.align};display:flex;align-items:center;justify-content:${justify};padding:${el.type === 'divider' ? '0' : '6px 12px'};`;
      const tag = el.type === 'button' ? 'button' : (el.type === 'heading' ? 'h1' : 'div');
      const comment = el.note ? `<!-- ${el.note.replace(/-->/g, '')} -->\n    ` : '';
      return `${comment}<${tag} style="${style}">${esc(el.text || '')}</${tag}>`;
    }).join('\n    ');

    return `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(state.pageTitle || 'Designed Page')}</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="min-h-screen flex justify-center p-6" style="background:#EAE6DA;">
  <main class="relative overflow-hidden" style="width:${vp.width}px;height:${state.canvasHeight}px;background:${state.canvasBg};">
    ${bodyEls}
  </main>
</body>
</html>`;
  }

  function buildJsonOutput() {
    return JSON.stringify({ format: 'vox-page-design-v1', ...state }, null, 2);
  }

  const exportModal = document.getElementById('export-modal');
  const exportOutput = document.getElementById('export-output');
  const exportStatus = document.getElementById('export-copy-status');

  function updateExportContent() {
    if (!exportOutput) return;
    if (activeExportTab === 'prompt') exportOutput.value = buildAiPromptSpec();
    else if (activeExportTab === 'html') exportOutput.value = buildHtmlOutput();
    else exportOutput.value = buildJsonOutput();
  }

  document.getElementById('open-export-btn')?.addEventListener('click', () => {
    updateExportContent();
    exportModal?.classList.remove('hidden');
    exportModal?.classList.add('flex');
    exportModal?.setAttribute('aria-hidden', 'false');
  });

  document.getElementById('close-export-btn')?.addEventListener('click', () => {
    exportModal?.classList.add('hidden');
    exportModal?.classList.remove('flex');
    exportModal?.setAttribute('aria-hidden', 'true');
  });

  exportModal?.addEventListener('click', (e) => {
    if (e.target === exportModal) {
      exportModal.classList.add('hidden');
      exportModal.classList.remove('flex');
    }
  });

  document.querySelectorAll('.exp-tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      activeExportTab = btn.dataset.exportTab;
      document.querySelectorAll('.exp-tab-btn').forEach((b) => {
        const on = b.dataset.exportTab === activeExportTab;
        b.classList.toggle('bg-[#111111]', on);
        b.classList.toggle('text-[#F4D03F]', on);
        b.classList.toggle('bg-white', !on);
        b.classList.toggle('text-[#111111]', !on);
      });
      updateExportContent();
    });
  });

  document.getElementById('copy-export-btn')?.addEventListener('click', async () => {
    if (!exportOutput) return;
    try {
      await navigator.clipboard.writeText(exportOutput.value);
      if (exportStatus) exportStatus.textContent = '✓ คัดลอกแล้ว! นำไปวางให้ AI ได้เลย';
    } catch {
      exportOutput.select();
      document.execCommand('copy');
      if (exportStatus) exportStatus.textContent = '✓ คัดลอกแล้ว!';
    }
    setTimeout(() => {
      if (exportStatus) exportStatus.textContent = 'พร้อมคัดลอกไปวางให้ AI (ChatGPT, Claude, Antigravity)';
    }, 2200);
  });

  document.getElementById('download-export-btn')?.addEventListener('click', () => {
    if (!exportOutput) return;
    const ext = activeExportTab === 'prompt' ? 'md' : (activeExportTab === 'html' ? 'html' : 'json');
    const slug = (state.pageTitle || 'page-design').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'page-design';
    const blob = new Blob([exportOutput.value], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${slug}.${ext}`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });

  // Import JSON Modal
  const importModal = document.getElementById('import-modal');
  const importText = document.getElementById('import-json-text');
  const importFile = document.getElementById('import-file-input');

  document.getElementById('open-import-btn')?.addEventListener('click', () => {
    importModal?.classList.remove('hidden');
    importModal?.classList.add('flex');
  });
  document.getElementById('close-import-btn')?.addEventListener('click', () => {
    importModal?.classList.add('hidden');
    importModal?.classList.remove('flex');
  });
  importFile?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { if (importText) importText.value = String(reader.result || ''); };
    reader.readAsText(file);
  });
  document.getElementById('apply-import-btn')?.addEventListener('click', () => {
    try {
      const parsed = JSON.parse(importText?.value || '');
      if (!parsed || !Array.isArray(parsed.elements)) throw new Error('Invalid');
      pushHistory();
      state = {
        pageTitle: String(parsed.pageTitle || 'Imported Page'),
        pageGoal: String(parsed.pageGoal || ''),
        viewport: VIEWPORTS[parsed.viewport] ? parsed.viewport : 'desktop',
        canvasHeight: clamp(Number(parsed.canvasHeight) || 680, 400, 2400),
        canvasBg: String(parsed.canvasBg || '#FFFFFF'),
        elements: parsed.elements
      };
      selectedId = state.elements[0]?.id || null;
      renderAll();
      saveState();
      importModal?.classList.add('hidden');
      importModal?.classList.remove('flex');
    } catch {
      alert('ไฟล์หรือข้อมูล JSON ไม่ถูกต้อง');
    }
  });

  renderAll();
  syncHistoryButtons();
})();
