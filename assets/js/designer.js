(() => {
  'use strict';

  const STORAGE_KEY = 'vox_figma_designer_v2';
  const SNAP_THRESHOLD = 6;
  const GRID_STEP = 12;

  const VIEWPORTS = {
    desktop: { width: 1024, label: 'Desktop' },
    tablet: { width: 768, label: 'Tablet' },
    mobile: { width: 390, label: 'Mobile' }
  };

  const PALETTE = [
    '#FFFFFF', '#F8F6F0', '#111111', '#F4D03F', '#E74C3C',
    '#2980B9', '#2ECC71', '#9B59B6', '#F39C12', 'transparent'
  ];

  const TOOL_HINTS = {
    select: 'Select (V) • Shift+Click or drag box for multi-select • Double-click text to edit',
    frame: 'Frame (F) • Click or drag on canvas to draw a container frame',
    rect: 'Rectangle (R) • Click or drag on canvas to draw a rectangle',
    circle: 'Ellipse (O) • Click or drag on canvas to draw a circle/ellipse',
    line: 'Line (L) • Click or drag horizontally to draw a divider line',
    text: 'Text (T) • Click or drag to place text, double-click to edit inline',
    button: 'Button (B) • Click or drag to place a CTA button',
    image: 'Image (I) • Click or drag to place an image frame (upload or URL in inspector)',
    hand: 'Hand (H) • Drag anywhere to pan the workspace'
  };

  const esc = (s) => (window.VoxSecurity ? window.VoxSecurity.escapeHtml(s) : String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])));
  const uid = () => 'el_' + Math.random().toString(36).slice(2, 9);
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  function normEl(raw) {
    return {
      id: raw.id || uid(),
      type: raw.type || 'rect',
      x: Number(raw.x) || 0,
      y: Number(raw.y) || 0,
      w: Math.max(12, Number(raw.w) || 120),
      h: Math.max(2, Number(raw.h) || 48),
      text: raw.text ?? '',
      imageSrc: raw.imageSrc || '',
      bg: raw.bg ?? '#FFFFFF',
      color: raw.color ?? '#111111',
      borderColor: raw.borderColor ?? '#111111',
      borderWidth: Number(raw.borderWidth ?? 0),
      borderStyle: raw.borderStyle || 'solid',
      radius: Number(raw.radius ?? 0),
      opacity: raw.opacity === undefined ? 100 : clamp(Number(raw.opacity), 0, 100),
      rotation: Number(raw.rotation ?? 0),
      fontFamily: raw.fontFamily || 'Prompt',
      fontSize: Number(raw.fontSize ?? 16),
      fontWeight: String(raw.fontWeight || '700'),
      align: raw.align || 'left',
      shadow: raw.shadow || 'none',
      visible: raw.visible !== false,
      locked: Boolean(raw.locked),
      note: raw.note || ''
    };
  }

  function makeStarterTemplate(name) {
    if (name === 'blank') {
      return {
        pageTitle: 'Untitled Design',
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
        pageGoal: 'สร้างหน้า Landing Page พร้อมแถบนำทางและชุดการ์ดฟีเจอร์ 3 คอลัมน์',
        viewport: 'desktop',
        canvasHeight: 680,
        canvasBg: '#F8F6F0',
        elements: [
          normEl({ type: 'frame', x: 36, y: 24, w: 948, h: 64, bg: '#FFFFFF', borderWidth: 3, radius: 14, shadow: 'brutal', note: 'Top navigation bar' }),
          normEl({ type: 'text', x: 60, y: 38, w: 240, h: 36, text: 'Brand Studio', bg: 'transparent', fontSize: 22, fontWeight: '900', note: 'Brand wordmark' }),
          normEl({ type: 'button', x: 828, y: 36, w: 132, h: 40, text: 'เริ่มต้นใช้งาน', bg: '#F4D03F', borderWidth: 2, radius: 10, fontSize: 14, fontWeight: '800', align: 'center', shadow: 'brutal', note: 'Navbar CTA' }),
          normEl({ type: 'text', x: 180, y: 120, w: 660, h: 56, text: 'ออกแบบหน้าเว็บไวขึ้นในไม่กี่นาที', bg: 'transparent', fontSize: 36, fontWeight: '900', align: 'center', note: 'Hero H1 headline' }),
          normEl({ type: 'text', x: 228, y: 180, w: 564, h: 48, text: 'จัดวางข้อความ รูปทรง และชุดสี แล้วส่งออกเป็น Prompt หรือโค้ดให้ AI พัฒนาต่อได้ทันที', bg: 'transparent', color: '#333333', fontSize: 16, fontWeight: '500', align: 'center', note: 'Hero subtitle' }),
          normEl({ type: 'frame', x: 36, y: 264, w: 300, h: 288, bg: '#FFFFFF', borderWidth: 3, radius: 16, shadow: 'brutal', note: 'Feature card 1' }),
          normEl({ type: 'frame', x: 360, y: 264, w: 300, h: 288, bg: '#FFFFFF', borderWidth: 3, radius: 16, shadow: 'brutal', note: 'Feature card 2' }),
          normEl({ type: 'frame', x: 684, y: 264, w: 300, h: 288, bg: '#F4D03F', borderWidth: 3, radius: 16, shadow: 'brutal', note: 'Highlighted feature card 3' }),
          normEl({ type: 'text', x: 60, y: 288, w: 252, h: 36, text: '01. วาดและจัดวางอิสระ', bg: 'transparent', fontSize: 20, fontWeight: '800', note: 'Card 1 title' }),
          normEl({ type: 'text', x: 384, y: 288, w: 252, h: 36, text: '02. ปรับสีและฟอนต์', bg: 'transparent', fontSize: 20, fontWeight: '800', note: 'Card 2 title' }),
          normEl({ type: 'text', x: 708, y: 288, w: 252, h: 36, text: '03. ส่งต่อให้ AI', bg: 'transparent', fontSize: 20, fontWeight: '800', note: 'Card 3 title' })
        ]
      };
    }
    if (name === 'event') {
      return {
        pageTitle: 'Event Registration Page',
        pageGoal: 'หน้าลงทะเบียนกิจกรรม/ค่าย มีแบนเนอร์ รายละเอียดงาน และฟอร์มสมัครด้านขวา',
        viewport: 'desktop',
        canvasHeight: 680,
        canvasBg: '#F8F6F0',
        elements: [
          normEl({ type: 'image', x: 36, y: 24, w: 948, h: 204, text: 'Event Cover Banner (1200x400)', bg: '#111111', color: '#F4D03F', borderWidth: 3, radius: 18, fontSize: 20, fontWeight: '800', align: 'center', shadow: 'brutal', note: 'Hero event banner' }),
          normEl({ type: 'badge', x: 48, y: 252, w: 144, h: 32, text: 'OPEN FOR 2026', bg: '#F4D03F', borderWidth: 2, radius: 999, fontSize: 12, fontWeight: '800', align: 'center', note: 'Status badge' }),
          normEl({ type: 'text', x: 48, y: 294, w: 504, h: 52, text: 'Tech & Design Camp 2026', bg: 'transparent', fontSize: 34, fontWeight: '900', note: 'Event title' }),
          normEl({ type: 'text', x: 48, y: 354, w: 504, h: 96, text: 'ร่วมเวิร์กชอปสร้างเว็บและเครื่องมือโต้ตอบแบบเรียลไทม์ พร้อมกิจกรรมแข่งขันชิงรางวัลตลอดวัน', bg: 'transparent', color: '#222222', fontSize: 16, fontWeight: '500', note: 'Event description' }),
          normEl({ type: 'frame', x: 588, y: 252, w: 396, h: 336, bg: '#FFFFFF', borderWidth: 3, radius: 18, shadow: 'brutal', note: 'Registration form card' }),
          normEl({ type: 'text', x: 612, y: 276, w: 348, h: 36, text: 'ลงทะเบียนเข้าร่วมงาน', bg: 'transparent', fontSize: 20, fontWeight: '800', note: 'Form heading' }),
          normEl({ type: 'input', x: 612, y: 324, w: 348, h: 44, text: 'ชื่อ-นามสกุล', bg: '#F8F6F0', color: '#555555', borderWidth: 2, radius: 10, fontSize: 14, fontWeight: '500', note: 'Name input' }),
          normEl({ type: 'input', x: 612, y: 384, w: 348, h: 44, text: 'อีเมลติดต่อ', bg: '#F8F6F0', color: '#555555', borderWidth: 2, radius: 10, fontSize: 14, fontWeight: '500', note: 'Email input' }),
          normEl({ type: 'button', x: 612, y: 456, w: 348, h: 48, text: 'ยืนยันการสมัคร', bg: '#F4D03F', borderWidth: 2, radius: 12, fontSize: 16, fontWeight: '900', align: 'center', shadow: 'brutal', note: 'Submit CTA' })
        ]
      };
    }
    return {
      pageTitle: 'My Landing Page',
      pageGoal: 'สร้างหน้า Landing Page สไตล์โมเดิร์น มี Hero Section ทางซ้าย ภาพตัวอย่างทางขวา และแถบสถิติด้านล่าง',
      viewport: 'desktop',
      canvasHeight: 680,
      canvasBg: '#F8F6F0',
      elements: [
        normEl({ type: 'badge', x: 60, y: 84, w: 168, h: 32, text: 'NEW LAUNCH 2026', bg: '#F4D03F', borderWidth: 2, radius: 999, fontSize: 12, fontWeight: '800', align: 'center', note: 'Hero eyebrow badge' }),
        normEl({ type: 'text', x: 60, y: 132, w: 468, h: 120, text: 'ออกแบบไอเดียเว็บของคุณ\nให้เป็นจริงในพริบตา', bg: 'transparent', fontSize: 40, fontWeight: '900', note: 'Main hero H1 title' }),
        normEl({ type: 'text', x: 60, y: 264, w: 456, h: 72, text: 'วาดเลย์เอาต์ ข้อความ รูปทรง และสีที่ต้องการ จากนั้นส่งออกข้อมูลให้ AI เขียนโค้ดให้สมบูรณ์ได้เลย', bg: 'transparent', color: '#333333', fontSize: 16, fontWeight: '500', note: 'Hero subtitle copy' }),
        normEl({ type: 'button', x: 60, y: 360, w: 180, h: 48, text: 'เริ่มต้นใช้งาน', bg: '#F4D03F', borderWidth: 3, radius: 12, fontSize: 16, fontWeight: '900', align: 'center', shadow: 'brutal', note: 'Primary CTA button' }),
        normEl({ type: 'button', x: 252, y: 360, w: 156, h: 48, text: 'ดูตัวอย่าง', bg: '#FFFFFF', borderWidth: 3, radius: 12, fontSize: 16, fontWeight: '800', align: 'center', shadow: 'brutal', note: 'Secondary CTA button' }),
        normEl({ type: 'image', x: 564, y: 84, w: 396, h: 336, text: 'Hero Visual / Screenshot', bg: '#FFFFFF', borderWidth: 3, radius: 20, fontSize: 18, fontWeight: '800', align: 'center', shadow: 'brutal', note: 'Right hero visual' }),
        normEl({ type: 'line', x: 60, y: 468, w: 900, h: 4, bg: '#111111', radius: 2, note: 'Section divider' }),
        normEl({ type: 'frame', x: 60, y: 504, w: 288, h: 120, text: '99.9% Fast Setup', bg: '#FFFFFF', borderWidth: 3, radius: 14, fontSize: 18, fontWeight: '800', align: 'center', shadow: 'brutal', note: 'Stat card 1' }),
        normEl({ type: 'frame', x: 366, y: 504, w: 288, h: 120, text: 'AI-Ready Spec', bg: '#111111', color: '#F4D03F', borderWidth: 3, radius: 14, fontSize: 18, fontWeight: '800', align: 'center', shadow: 'brutal', note: 'Stat card 2' }),
        normEl({ type: 'frame', x: 672, y: 504, w: 288, h: 120, text: 'Custom Palette', bg: '#F4D03F', borderWidth: 3, radius: 14, fontSize: 18, fontWeight: '800', align: 'center', shadow: 'brutal', note: 'Stat card 3' })
      ]
    };
  }

  function loadInitialState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('vox_page_designer_v1');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.elements)) {
          return {
            pageTitle: parsed.pageTitle || 'My Landing Page',
            pageGoal: parsed.pageGoal || '',
            viewport: VIEWPORTS[parsed.viewport] ? parsed.viewport : 'desktop',
            canvasHeight: clamp(Number(parsed.canvasHeight) || 680, 400, 2400),
            canvasBg: parsed.canvasBg || '#FFFFFF',
            elements: parsed.elements.map(normEl)
          };
        }
      }
    } catch { /* ignore */ }
    return makeStarterTemplate('hero');
  }

  let state = loadInitialState();
  let selectedIds = state.elements[0] ? [state.elements[0].id] : [];
  let activeTool = 'select';
  let spaceHeld = false;
  let snapEnabled = true;
  let zoom = 1;
  let editingId = null;
  let history = [];
  let redoStack = [];
  let activeExportTab = 'prompt';

  const workspaceEl = document.getElementById('canvas-workspace');
  const zoomStageEl = document.getElementById('zoom-stage');
  const canvasEl = document.getElementById('design-canvas');
  const sizeLabelEl = document.getElementById('canvas-size-label');
  const toolHintEl = document.getElementById('tool-hint-label');
  const inspectorEl = document.getElementById('inspector-panel');
  const layersListEl = document.getElementById('layers-list');
  const layersCountEl = document.getElementById('layers-count');
  const pageTitleInput = document.getElementById('page-title-input');
  const zoomResetBtn = document.getElementById('zoom-reset-btn');
  const undoBtn = document.getElementById('undo-btn');
  const redoBtn = document.getElementById('redo-btn');
  const hiddenImgInput = document.getElementById('hidden-image-upload');

  function pushHistory() {
    history.push(JSON.stringify(state));
    if (history.length > 50) history.shift();
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
    } catch { /* ignore */ }
  }

  function getSelectedElements() {
    const set = new Set(selectedIds);
    return state.elements.filter((e) => set.has(e.id));
  }

  function setTool(tool) {
    activeTool = tool;
    document.querySelectorAll('.tool-btn').forEach((btn) => {
      const on = btn.dataset.tool === tool;
      btn.classList.toggle('bg-[#F4D03F]', on);
      btn.classList.toggle('text-[#111111]', on);
      btn.classList.toggle('text-white', !on);
    });
    updateCursorAndHint();
  }

  function updateCursorAndHint() {
    const effective = spaceHeld ? 'hand' : activeTool;
    if (toolHintEl) toolHintEl.textContent = TOOL_HINTS[effective] || TOOL_HINTS.select;
    if (!canvasEl || !workspaceEl) return;
    if (effective === 'hand') {
      workspaceEl.style.cursor = 'grab';
      canvasEl.style.cursor = 'grab';
    } else if (effective === 'select') {
      workspaceEl.style.cursor = 'default';
      canvasEl.style.cursor = 'default';
    } else {
      workspaceEl.style.cursor = 'default';
      canvasEl.style.cursor = 'crosshair';
    }
  }

  function createDefaultElement(type, x, y, w, h) {
    const preset = {
      frame: { w: w || 300, h: h || 200, text: '', bg: '#FFFFFF', borderWidth: 3, radius: 16, shadow: 'brutal' },
      rect: { w: w || 180, h: h || 120, text: '', bg: '#2980B9', color: '#FFFFFF', borderWidth: 2, radius: 8 },
      circle: { w: w || 110, h: h || 110, text: '', bg: '#E74C3C', color: '#FFFFFF', borderWidth: 3, radius: 999, shadow: 'brutal' },
      line: { w: w || 320, h: 4, text: '', bg: '#111111', borderWidth: 0, radius: 2 },
      text: { w: w || 280, h: h || 48, text: 'Double-click to edit text', bg: 'transparent', borderWidth: 0, fontSize: 22, fontWeight: '800' },
      heading: { w: w || 360, h: h || 56, text: 'หัวข้อใหม่ (Heading)', bg: 'transparent', borderWidth: 0, fontSize: 32, fontWeight: '900' },
      button: { w: w || 168, h: h || 48, text: 'ปุ่มกด (CTA)', bg: '#F4D03F', borderWidth: 3, radius: 12, fontSize: 15, fontWeight: '800', align: 'center', shadow: 'brutal' },
      badge: { w: w || 140, h: h || 32, text: 'NEW TAG', bg: '#111111', color: '#F4D03F', borderWidth: 2, radius: 999, fontSize: 12, fontWeight: '800', align: 'center' },
      input: { w: w || 288, h: h || 44, text: 'กรอกข้อมูล...', bg: '#FFFFFF', color: '#666666', borderWidth: 2, radius: 10, fontSize: 14, fontWeight: '500' },
      image: { w: w || 320, h: h || 200, text: 'Click Upload Image or Paste URL', bg: '#EAE6DA', borderWidth: 3, radius: 16, fontSize: 14, fontWeight: '800', align: 'center' }
    }[type] || {};
    return normEl({ type, x, y, ...preset });
  }

  function elementShadowCss(shadow) {
    if (shadow === 'brutal') return '4px 4px 0px #111111';
    if (shadow === 'soft') return '0 10px 24px rgba(17,17,17,0.14)';
    return 'none';
  }

  function fontCss(family) {
    if (family === 'IBM Plex Sans Thai') return "'IBM Plex Sans Thai', sans-serif";
    if (family === 'JetBrains Mono') return "'JetBrains Mono', monospace";
    return "'Prompt', sans-serif";
  }

  function renderCanvas(guides = []) {
    if (!canvasEl) return;
    const vp = VIEWPORTS[state.viewport] || VIEWPORTS.desktop;
    canvasEl.style.width = `${vp.width}px`;
    canvasEl.style.height = `${state.canvasHeight}px`;
    canvasEl.style.backgroundColor = state.canvasBg || '#FFFFFF';
    canvasEl.classList.toggle('canvas-grid-lines', snapEnabled);

    if (zoomStageEl) zoomStageEl.style.transform = `scale(${zoom})`;
    if (zoomResetBtn) zoomResetBtn.textContent = `${Math.round(zoom * 100)}%`;
    if (sizeLabelEl) sizeLabelEl.textContent = `${vp.label} • ${vp.width} × ${state.canvasHeight}`;

    if (pageTitleInput && document.activeElement !== pageTitleInput) {
      pageTitleInput.value = state.pageTitle || 'Untitled Design';
    }

    document.querySelectorAll('.vp-btn').forEach((btn) => {
      const active = btn.dataset.vp === state.viewport;
      btn.classList.toggle('bg-[#F4D03F]', active);
      btn.classList.toggle('text-[#111111]', active);
      btn.classList.toggle('text-white/80', !active);
    });

    const selSet = new Set(selectedIds);
    const singleSel = selectedIds.length === 1;

    const elsHtml = state.elements.map((el, idx) => {
      if (!el.visible) return '';
      const isSel = selSet.has(el.id);
      const isEdit = editingId === el.id;
      const borderStyle = el.borderWidth > 0 ? `${el.borderWidth}px ${el.borderStyle || 'solid'} ${el.borderColor || '#111111'}` : 'none';
      const justifyMap = { left: 'flex-start', center: 'center', right: 'flex-end' };
      const transformCss = el.rotation ? `rotate(${el.rotation}deg)` : 'none';

      let inner = '';
      if (el.type === 'image') {
        inner = el.imageSrc
          ? `<img src="${esc(el.imageSrc)}" alt="${esc(el.text || 'Image')}" class="w-full h-full object-cover pointer-events-none" style="border-radius:${Math.max(0, el.radius - el.borderWidth)}px;" />`
          : `<div class="w-full h-full flex flex-col items-center justify-center gap-1.5 px-3 pointer-events-none">
              <svg class="w-7 h-7 opacity-70" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
              <span class="leading-tight">${esc(el.text || 'Image')}</span>
            </div>`;
      } else if (el.type !== 'line') {
        inner = `<div class="el-text-inner w-full whitespace-pre-line break-words leading-snug ${isEdit ? '' : 'pointer-events-none'}" ${isEdit ? 'contenteditable="true"' : ''}>${esc(el.text || '')}</div>`;
      }

      const handlesHtml = (isSel && singleSel && !el.locked && !isEdit)
        ? ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'].map((d) => `<span class="resize-handle" data-dir="${d}"></span>`).join('')
        : '';

      return `
        <div
          data-el-id="${el.id}"
          class="canvas-el ${isSel ? 'is-selected' : ''} ${isEdit ? 'is-editing' : ''}"
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
            box-shadow:${elementShadowCss(el.shadow)};
            opacity:${(el.opacity ?? 100) / 100};
            transform:${transformCss};
            font-family:${fontCss(el.fontFamily)};
            font-size:${el.fontSize || 16}px;
            font-weight:${el.fontWeight || '700'};
            text-align:${el.align || 'left'};
            display:flex;
            align-items:center;
            justify-content:${justifyMap[el.align] || 'flex-start'};
            padding:${el.type === 'line' || (el.type === 'image' && el.imageSrc) ? '0' : '6px 12px'};
          "
        >
          ${inner}
          ${handlesHtml}
        </div>
      `;
    }).join('');

    const guidesHtml = guides.map((g) => (
      g.axis === 'v'
        ? `<div class="snap-guide-v" style="left:${g.pos}px;"></div>`
        : `<div class="snap-guide-h" style="top:${g.pos}px;"></div>`
    )).join('');

    canvasEl.innerHTML = elsHtml + guidesHtml;
  }

  function renderLayers() {
    if (!layersListEl) return;
    if (layersCountEl) layersCountEl.textContent = String(state.elements.length);
    const selSet = new Set(selectedIds);

    if (!state.elements.length) {
      layersListEl.innerHTML = `<p class="text-[11px] text-[#111111]/45 py-2 text-center">ยังไม่มีเลเยอร์</p>`;
      return;
    }

    layersListEl.innerHTML = [...state.elements].reverse().map((el) => {
      const isSel = selSet.has(el.id);
      const label = el.text ? el.text.replace(/\n/g, ' ') : (el.note || `${el.type} (${el.w}×${el.h})`);
      return `
        <div data-layer-row="${el.id}" class="flex items-center gap-1 px-1.5 py-1 rounded-md border text-[11px] cursor-pointer ${isSel ? 'bg-[#F4D03F]/45 border-[#111111] font-bold' : 'bg-[#F8F6F0] border-[#111111]/20 hover:border-[#111111]/60'} ${!el.visible ? 'opacity-50' : ''}">
          <span class="font-display font-black uppercase text-[9px] px-1 py-0.5 rounded bg-white border border-[#111111]/35 shrink-0">${esc(el.type)}</span>
          <span class="truncate flex-1">${esc(label)}</span>
          <button type="button" data-layer-lock="${el.id}" title="${el.locked ? 'ปลดล็อก' : 'ล็อกตำแหน่ง'}" class="px-1 text-[10px] hover:text-[#111111] ${el.locked ? 'text-[#E74C3C]' : 'text-[#111111]/40'} cursor-pointer">${el.locked ? '🔒' : '🔓'}</button>
          <button type="button" data-layer-vis="${el.id}" title="${el.visible ? 'ซ่อน' : 'แสดง'}" class="px-1 text-[10px] hover:text-[#111111] ${!el.visible ? 'text-[#E74C3C]' : 'text-[#111111]/60'} cursor-pointer">${el.visible ? '👁' : '🚫'}</button>
        </div>
      `;
    }).join('');

    layersListEl.querySelectorAll('[data-layer-row]').forEach((row) => {
      row.addEventListener('click', (e) => {
        if (e.target.closest('[data-layer-lock], [data-layer-vis]')) return;
        const id = row.dataset.layerRow;
        if (e.shiftKey) {
          selectedIds = selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id];
        } else {
          selectedIds = [id];
        }
        renderAll();
      });
    });

    layersListEl.querySelectorAll('[data-layer-lock]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const el = state.elements.find((x) => x.id === btn.dataset.layerLock);
        if (!el) return;
        pushHistory();
        el.locked = !el.locked;
        renderAll();
        saveState();
      });
    });

    layersListEl.querySelectorAll('[data-layer-vis]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const el = state.elements.find((x) => x.id === btn.dataset.layerVis);
        if (!el) return;
        pushHistory();
        el.visible = !el.visible;
        renderAll();
        saveState();
      });
    });
  }

  function alignSelected(mode) {
    const items = getSelectedElements().filter((e) => !e.locked);
    if (items.length < 2) return;
    pushHistory();
    const minX = Math.min(...items.map((e) => e.x));
    const maxX = Math.max(...items.map((e) => e.x + e.w));
    const minY = Math.min(...items.map((e) => e.y));
    const maxY = Math.max(...items.map((e) => e.y + e.h));
    const midX = (minX + maxX) / 2;
    const midY = (minY + maxY) / 2;

    if (mode === 'left') items.forEach((e) => { e.x = minX; });
    else if (mode === 'center') items.forEach((e) => { e.x = Math.round(midX - e.w / 2); });
    else if (mode === 'right') items.forEach((e) => { e.x = maxX - e.w; });
    else if (mode === 'top') items.forEach((e) => { e.y = minY; });
    else if (mode === 'middle') items.forEach((e) => { e.y = Math.round(midY - e.h / 2); });
    else if (mode === 'bottom') items.forEach((e) => { e.y = maxY - e.h; });
    else if (mode === 'dist-h' && items.length >= 3) {
      const sorted = [...items].sort((a, b) => a.x - b.x);
      const totalW = sorted.reduce((s, e) => s + e.w, 0);
      const gap = (maxX - minX - totalW) / (sorted.length - 1);
      let cur = minX;
      sorted.forEach((e) => { e.x = Math.round(cur); cur += e.w + gap; });
    } else if (mode === 'dist-v' && items.length >= 3) {
      const sorted = [...items].sort((a, b) => a.y - b.y);
      const totalH = sorted.reduce((s, e) => s + e.h, 0);
      const gap = (maxY - minY - totalH) / (sorted.length - 1);
      let cur = minY;
      sorted.forEach((e) => { e.y = Math.round(cur); cur += e.h + gap; });
    }
    renderAll();
    saveState();
  }

  function renderInspector() {
    if (!inspectorEl) return;
    const selected = getSelectedElements();

    // Multi-select inspector
    if (selected.length > 1) {
      inspectorEl.innerHTML = `
        <div class="flex items-center justify-between border-b-2 border-[#111111] pb-2">
          <span class="font-display font-black text-xs text-[#111111]">เลือก ${selected.length} ชิ้น (Multi-Select)</span>
          <button type="button" id="insp-deselect" class="text-[11px] font-bold text-[#111111]/60 hover:text-[#111111] cursor-pointer">ล้างเลือก</button>
        </div>
        <div class="space-y-1.5">
          <div class="text-[11px] font-bold">จัดแนว (Align)</div>
          <div class="grid grid-cols-3 gap-1">
            <button type="button" data-align-group="left" class="py-1.5 rounded border border-[#111111] bg-[#F8F6F0] hover:bg-[#F4D03F] text-[10px] font-bold cursor-pointer">ซ้าย</button>
            <button type="button" data-align-group="center" class="py-1.5 rounded border border-[#111111] bg-[#F8F6F0] hover:bg-[#F4D03F] text-[10px] font-bold cursor-pointer">กลาง X</button>
            <button type="button" data-align-group="right" class="py-1.5 rounded border border-[#111111] bg-[#F8F6F0] hover:bg-[#F4D03F] text-[10px] font-bold cursor-pointer">ขวา</button>
            <button type="button" data-align-group="top" class="py-1.5 rounded border border-[#111111] bg-[#F8F6F0] hover:bg-[#F4D03F] text-[10px] font-bold cursor-pointer">บน</button>
            <button type="button" data-align-group="middle" class="py-1.5 rounded border border-[#111111] bg-[#F8F6F0] hover:bg-[#F4D03F] text-[10px] font-bold cursor-pointer">กลาง Y</button>
            <button type="button" data-align-group="bottom" class="py-1.5 rounded border border-[#111111] bg-[#F8F6F0] hover:bg-[#F4D03F] text-[10px] font-bold cursor-pointer">ล่าง</button>
          </div>
          ${selected.length >= 3 ? `
            <div class="grid grid-cols-2 gap-1 pt-1">
              <button type="button" data-align-group="dist-h" class="py-1.5 rounded border border-[#111111] bg-white hover:bg-[#F4D03F] text-[10px] font-bold cursor-pointer">กระจายแนวนอน</button>
              <button type="button" data-align-group="dist-v" class="py-1.5 rounded border border-[#111111] bg-white hover:bg-[#F4D03F] text-[10px] font-bold cursor-pointer">กระจายแนวตั้ง</button>
            </div>
          ` : ''}
        </div>
        <div class="grid grid-cols-2 gap-1.5 pt-2 border-t-2 border-dashed border-[#111111]/15">
          <button type="button" id="insp-dup-multi" class="btn-vox bg-[#F4D03F] py-1.5 rounded-lg text-[11px] font-black cursor-pointer">ทำซ้ำทั้งหมด</button>
          <button type="button" id="insp-del-multi" class="btn-vox bg-[#E74C3C] text-white py-1.5 rounded-lg text-[11px] font-black cursor-pointer">ลบทั้งหมด</button>
        </div>
      `;
      document.getElementById('insp-deselect')?.addEventListener('click', () => { selectedIds = []; renderAll(); });
      inspectorEl.querySelectorAll('[data-align-group]').forEach((b) => {
        b.addEventListener('click', () => alignSelected(b.dataset.alignGroup));
      });
      document.getElementById('insp-dup-multi')?.addEventListener('click', duplicateSelected);
      document.getElementById('insp-del-multi')?.addEventListener('click', deleteSelected);
      return;
    }

    const sel = selected[0] || null;
    if (!sel) {
      inspectorEl.innerHTML = `
        <div class="border-b-2 border-[#111111] pb-2">
          <h2 class="font-display font-black text-xs uppercase tracking-wider text-[#111111]">ตั้งค่าหน้าเว็บ (Canvas)</h2>
        </div>

        <label class="flex flex-col gap-1 text-xs font-bold">
          <span>เป้าหมาย / คำสั่งให้ AI (Page Goal)</span>
          <textarea id="insp-page-goal" rows="4" placeholder="อธิบายเป้าหมายของหน้านี้เพื่อให้ AI สร้างโค้ดตรงใจ..." class="thai-safe bg-[#F8F6F0] border-2 border-[#111111] rounded-lg p-2 text-xs font-medium resize-y focus:outline-none">${esc(state.pageGoal || '')}</textarea>
        </label>

        <div class="grid grid-cols-2 gap-2">
          <label class="flex flex-col gap-1 text-xs font-bold">
            <span>สีพื้นหลัง</span>
            <div class="flex items-center gap-1.5">
              <input id="insp-canvas-bg" type="color" value="${/^#[0-9a-f]{6}$/i.test(state.canvasBg || '') ? state.canvasBg : '#FFFFFF'}" class="w-8 h-8 rounded border-2 border-[#111111] cursor-pointer" />
              <span class="font-mono text-[11px]">${esc(state.canvasBg || '#FFFFFF')}</span>
            </div>
          </label>
          <label class="flex flex-col gap-1 text-xs font-bold">
            <span>ความสูง (px)</span>
            <input id="insp-canvas-h" type="number" min="400" max="2400" step="20" value="${state.canvasHeight}" class="bg-[#F8F6F0] border-2 border-[#111111] rounded-lg px-2 py-1 text-xs font-mono" />
          </label>
        </div>

        <div class="pt-2 border-t-2 border-dashed border-[#111111]/15 flex justify-between items-center">
          <span class="text-[11px] font-semibold text-[#111111]/60">${state.elements.length} layers</span>
          ${state.elements.length ? '<button type="button" id="insp-clear-all" class="text-[11px] font-bold text-[#E74C3C] hover:underline cursor-pointer">ล้างทั้งหมด</button>' : ''}
        </div>
      `;

      document.getElementById('insp-page-goal')?.addEventListener('input', (e) => { state.pageGoal = e.target.value; saveState(); });
      document.getElementById('insp-canvas-bg')?.addEventListener('input', (e) => { state.canvasBg = e.target.value; renderCanvas(); saveState(); });
      document.getElementById('insp-canvas-h')?.addEventListener('change', (e) => {
        pushHistory();
        state.canvasHeight = clamp(Number(e.target.value) || 680, 400, 2400);
        renderCanvas();
        saveState();
      });
      document.getElementById('insp-clear-all')?.addEventListener('click', () => {
        pushHistory();
        state.elements = [];
        selectedIds = [];
        renderAll();
        saveState();
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
          <span class="font-display font-bold text-xs text-[#111111]">Design</span>
        </div>
        <button type="button" id="insp-deselect" class="text-[11px] font-bold text-[#111111]/60 hover:text-[#111111] cursor-pointer">Canvas</button>
      </div>

      ${sel.type === 'image' ? `
        <div class="bg-[#F8F6F0] border-2 border-[#111111] rounded-lg p-2 flex flex-col gap-1.5">
          <span class="text-[11px] font-bold">รูปภาพ (Image Source)</span>
          <div class="flex gap-1.5">
            <button type="button" id="insp-img-upload" class="flex-1 py-1 rounded border border-[#111111] bg-[#F4D03F] font-display font-bold text-[11px] cursor-pointer">อัปโหลดรูป</button>
            ${sel.imageSrc ? '<button type="button" id="insp-img-clear" class="px-2 py-1 rounded border border-[#111111] bg-white text-[11px] font-bold text-[#E74C3C] cursor-pointer">ลบรูป</button>' : ''}
          </div>
          <input id="insp-img-url" type="url" value="${esc(sel.imageSrc && !sel.imageSrc.startsWith('data:') ? sel.imageSrc : '')}" placeholder="หรือวางลิงก์รูปภาพ https://..." class="bg-white border border-[#111111] rounded px-2 py-1 text-[11px] focus:outline-none" />
        </div>
      ` : ''}

      ${sel.type !== 'line' ? `
        <label class="flex flex-col gap-1 text-[11px] font-bold">
          <span>ข้อความ (Text / Placeholder)</span>
          <textarea id="insp-text" rows="2" class="thai-safe bg-[#F8F6F0] border-2 border-[#111111] rounded-lg p-2 text-xs font-medium resize-y focus:outline-none">${esc(sel.text || '')}</textarea>
        </label>
      ` : ''}

      <label class="flex flex-col gap-1 text-[11px] font-bold">
        <span>หมายเหตุให้ AI (Role / Note)</span>
        <input id="insp-note" type="text" value="${esc(sel.note || '')}" placeholder="เช่น Sticky navbar, Hero CTA" class="thai-safe bg-[#F8F6F0] border-2 border-[#111111] rounded-lg px-2 py-1.5 text-xs font-medium focus:outline-none" />
      </label>

      <div class="grid grid-cols-4 gap-1.5">
        <label class="flex flex-col gap-0.5 text-[10px] font-bold">X<input data-num="x" type="number" value="${sel.x}" class="bg-[#F8F6F0] border border-[#111111] rounded px-1.5 py-1 font-mono text-xs" /></label>
        <label class="flex flex-col gap-0.5 text-[10px] font-bold">Y<input data-num="y" type="number" value="${sel.y}" class="bg-[#F8F6F0] border border-[#111111] rounded px-1.5 py-1 font-mono text-xs" /></label>
        <label class="flex flex-col gap-0.5 text-[10px] font-bold">W<input data-num="w" type="number" min="12" value="${sel.w}" class="bg-[#F8F6F0] border border-[#111111] rounded px-1.5 py-1 font-mono text-xs" /></label>
        <label class="flex flex-col gap-0.5 text-[10px] font-bold">H<input data-num="h" type="number" min="2" value="${sel.h}" class="bg-[#F8F6F0] border border-[#111111] rounded px-1.5 py-1 font-mono text-xs" /></label>
      </div>

      <div class="grid grid-cols-2 gap-1.5">
        <label class="flex flex-col gap-0.5 text-[10px] font-bold">หมุน (°)<input data-num="rotation" type="number" min="-180" max="180" value="${sel.rotation || 0}" class="bg-[#F8F6F0] border border-[#111111] rounded px-1.5 py-1 font-mono text-xs" /></label>
        <label class="flex flex-col gap-0.5 text-[10px] font-bold">ทึบแสง (${sel.opacity ?? 100}%)<input id="insp-opacity" type="range" min="10" max="100" value="${sel.opacity ?? 100}" class="accent-[#111111] cursor-pointer mt-1" /></label>
      </div>

      <div class="grid grid-cols-3 gap-2">
        <label class="flex flex-col gap-1 text-[11px] font-bold">
          <span>Fill</span>
          <div class="flex items-center gap-1">
            <input id="insp-bg" type="color" value="${bgHex}" class="w-7 h-7 rounded border-2 border-[#111111] cursor-pointer" />
            <button type="button" id="insp-bg-clear" class="text-[10px] px-1.5 py-0.5 rounded border border-[#111111] bg-white hover:bg-[#F4D03F] cursor-pointer">ใส</button>
          </div>
        </label>
        <label class="flex flex-col gap-1 text-[11px] font-bold">
          <span>Text</span>
          <input id="insp-color" type="color" value="${textHex}" class="w-7 h-7 rounded border-2 border-[#111111] cursor-pointer" />
        </label>
        <label class="flex flex-col gap-1 text-[11px] font-bold">
          <span>Stroke</span>
          <input id="insp-border-color" type="color" value="${borderHex}" class="w-7 h-7 rounded border-2 border-[#111111] cursor-pointer" />
        </label>
      </div>

      <div class="grid grid-cols-2 gap-1.5">
        <label class="flex flex-col gap-0.5 text-[10px] font-bold">ฟอนต์
          <select id="insp-font" class="bg-[#F8F6F0] border border-[#111111] rounded px-1 py-1 text-[11px] font-bold">
            <option value="Prompt" ${sel.fontFamily === 'Prompt' ? 'selected' : ''}>Prompt</option>
            <option value="IBM Plex Sans Thai" ${sel.fontFamily === 'IBM Plex Sans Thai' ? 'selected' : ''}>IBM Plex Thai</option>
            <option value="JetBrains Mono" ${sel.fontFamily === 'JetBrains Mono' ? 'selected' : ''}>Mono</option>
          </select>
        </label>
        <label class="flex flex-col gap-0.5 text-[10px] font-bold">ขนาดอักษร
          <input data-num="fontSize" type="number" min="10" max="96" value="${sel.fontSize || 16}" class="bg-[#F8F6F0] border border-[#111111] rounded px-1.5 py-1 font-mono text-xs" />
        </label>
        <label class="flex flex-col gap-0.5 text-[10px] font-bold">น้ำหนัก
          <select id="insp-weight" class="bg-[#F8F6F0] border border-[#111111] rounded px-1 py-1 text-[11px] font-bold">
            <option value="500" ${sel.fontWeight === '500' ? 'selected' : ''}>ปกติ (500)</option>
            <option value="700" ${sel.fontWeight === '700' ? 'selected' : ''}>หนา (700)</option>
            <option value="900" ${sel.fontWeight === '900' ? 'selected' : ''}>หนามาก (900)</option>
          </select>
        </label>
        <label class="flex flex-col gap-0.5 text-[10px] font-bold">ความมนมุม
          <input data-num="radius" type="number" min="0" max="999" value="${sel.radius || 0}" class="bg-[#F8F6F0] border border-[#111111] rounded px-1.5 py-1 font-mono text-xs" />
        </label>
        <label class="flex flex-col gap-0.5 text-[10px] font-bold">หนาขอบ (px)
          <input data-num="borderWidth" type="number" min="0" max="12" value="${sel.borderWidth || 0}" class="bg-[#F8F6F0] border border-[#111111] rounded px-1.5 py-1 font-mono text-xs" />
        </label>
        <label class="flex flex-col gap-0.5 text-[10px] font-bold">เส้นขอบ
          <select id="insp-bstyle" class="bg-[#F8F6F0] border border-[#111111] rounded px-1 py-1 text-[11px] font-bold">
            <option value="solid" ${sel.borderStyle === 'solid' ? 'selected' : ''}>ทึบ (Solid)</option>
            <option value="dashed" ${sel.borderStyle === 'dashed' ? 'selected' : ''}>ประ (Dashed)</option>
          </select>
        </label>
      </div>

      <div class="grid grid-cols-2 gap-2">
        <div class="flex flex-col gap-1">
          <span class="text-[10px] font-bold">จัดตำแหน่ง</span>
          <div class="grid grid-cols-3 gap-1">
            ${['left', 'center', 'right'].map((al) => `<button type="button" data-align="${al}" class="py-1 rounded border border-[#111111] text-[10px] font-bold cursor-pointer ${sel.align === al ? 'bg-[#111111] text-[#F4D03F]' : 'bg-white'}">${al === 'left' ? 'ซ้าย' : al === 'center' ? 'กลาง' : 'ขวา'}</button>`).join('')}
          </div>
        </div>
        <label class="flex flex-col gap-1 text-[10px] font-bold">เงา (Shadow)
          <select id="insp-shadow" class="bg-[#F8F6F0] border border-[#111111] rounded px-1.5 py-1 text-[11px] font-bold">
            <option value="none" ${sel.shadow === 'none' ? 'selected' : ''}>ไม่มี</option>
            <option value="soft" ${sel.shadow === 'soft' ? 'selected' : ''}>Soft</option>
            <option value="brutal" ${sel.shadow === 'brutal' ? 'selected' : ''}>Brutal</option>
          </select>
        </label>
      </div>

      <div class="grid grid-cols-2 gap-1.5 pt-1 border-t-2 border-dashed border-[#111111]/15">
        <button type="button" id="insp-front" class="btn-vox bg-white hover:bg-[#F8F6F0] py-1.5 rounded-lg text-[11px] font-bold cursor-pointer">Bring Front</button>
        <button type="button" id="insp-back" class="btn-vox bg-white hover:bg-[#F8F6F0] py-1.5 rounded-lg text-[11px] font-bold cursor-pointer">Send Back</button>
        <button type="button" id="insp-dup" class="btn-vox bg-[#F4D03F] hover:bg-[#f2c61d] py-1.5 rounded-lg text-[11px] font-black cursor-pointer">Duplicate</button>
        <button type="button" id="insp-del" class="btn-vox bg-[#E74C3C] text-white py-1.5 rounded-lg text-[11px] font-black cursor-pointer">Delete</button>
      </div>
    `;

    document.getElementById('insp-deselect')?.addEventListener('click', () => { selectedIds = []; renderAll(); });
    document.getElementById('insp-img-upload')?.addEventListener('click', () => hiddenImgInput?.click());
    document.getElementById('insp-img-clear')?.addEventListener('click', () => { pushHistory(); sel.imageSrc = ''; renderAll(); saveState(); });
    document.getElementById('insp-img-url')?.addEventListener('change', (e) => {
      const clean = window.VoxSecurity ? window.VoxSecurity.sanitizeUrl(e.target.value) : e.target.value.trim();
      pushHistory();
      sel.imageSrc = clean;
      renderAll();
      saveState();
    });
    document.getElementById('insp-text')?.addEventListener('input', (e) => { sel.text = e.target.value; renderCanvas(); renderLayers(); saveState(); });
    document.getElementById('insp-note')?.addEventListener('input', (e) => { sel.note = e.target.value; saveState(); });
    inspectorEl.querySelectorAll('[data-num]').forEach((inp) => {
      inp.addEventListener('change', () => {
        pushHistory();
        sel[inp.dataset.num] = Number(inp.value) || 0;
        renderCanvas();
        saveState();
      });
    });
    document.getElementById('insp-opacity')?.addEventListener('input', (e) => { sel.opacity = Number(e.target.value); renderCanvas(); saveState(); });
    document.getElementById('insp-bg')?.addEventListener('input', (e) => { sel.bg = e.target.value; renderCanvas(); saveState(); });
    document.getElementById('insp-bg-clear')?.addEventListener('click', () => { pushHistory(); sel.bg = 'transparent'; renderAll(); saveState(); });
    document.getElementById('insp-color')?.addEventListener('input', (e) => { sel.color = e.target.value; renderCanvas(); saveState(); });
    document.getElementById('insp-border-color')?.addEventListener('input', (e) => { sel.borderColor = e.target.value; renderCanvas(); saveState(); });
    document.getElementById('insp-font')?.addEventListener('change', (e) => { pushHistory(); sel.fontFamily = e.target.value; renderCanvas(); saveState(); });
    document.getElementById('insp-weight')?.addEventListener('change', (e) => { pushHistory(); sel.fontWeight = e.target.value; renderCanvas(); saveState(); });
    document.getElementById('insp-bstyle')?.addEventListener('change', (e) => { pushHistory(); sel.borderStyle = e.target.value; renderCanvas(); saveState(); });
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
    renderLayers();
    renderInspector();
  }

  function duplicateSelected() {
    const items = getSelectedElements();
    if (!items.length) return;
    pushHistory();
    const newIds = [];
    items.forEach((el) => {
      const copy = { ...el, id: uid(), x: el.x + 24, y: el.y + 24, locked: false };
      state.elements.push(copy);
      newIds.push(copy.id);
    });
    selectedIds = newIds;
    renderAll();
    saveState();
  }

  function deleteSelected() {
    const items = getSelectedElements().filter((e) => !e.locked);
    if (!items.length) return;
    pushHistory();
    const delSet = new Set(items.map((e) => e.id));
    state.elements = state.elements.filter((e) => !delSet.has(e.id));
    selectedIds = [];
    renderAll();
    saveState();
  }

  // Real Image Upload Handler (resized safely to fit localStorage)
  hiddenImgInput?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    const sel = getSelectedElements()[0];
    e.target.value = '';
    if (!file || !sel) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const MAX_DIM = 960;
        let { width, height } = img;
        if (width > MAX_DIM || height > MAX_DIM) {
          const ratio = Math.min(MAX_DIM / width, MAX_DIM / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const off = document.createElement('canvas');
        off.width = width;
        off.height = height;
        off.getContext('2d').drawImage(img, 0, 0, width, height);
        pushHistory();
        sel.imageSrc = off.toDataURL('image/jpeg', 0.85);
        renderAll();
        saveState();
      };
      img.src = String(reader.result || '');
    };
    reader.readAsDataURL(file);
  });

  // Quick Swatches
  const swatchesEl = document.getElementById('quick-swatches');
  if (swatchesEl) {
    swatchesEl.innerHTML = PALETTE.map((hex) => `
      <button type="button" data-swatch="${hex}" title="${hex}" class="w-7 h-7 rounded-md border-2 border-[#111111] cursor-pointer hover:scale-105 transition-transform" style="background:${hex === 'transparent' ? 'repeating-conic-gradient(#ddd 0% 25%, #fff 0% 50%) 50% / 10px 10px' : hex}"></button>
    `).join('');
    swatchesEl.querySelectorAll('[data-swatch]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const hex = btn.dataset.swatch;
        const items = getSelectedElements().filter((e) => !e.locked);
        pushHistory();
        if (items.length) {
          items.forEach((el) => { el.bg = hex; });
        } else if (hex !== 'transparent') {
          state.canvasBg = hex;
        }
        renderAll();
        saveState();
      });
    });
  }

  // Tool Buttons & Quick Add
  document.querySelectorAll('.tool-btn').forEach((btn) => {
    btn.addEventListener('click', () => setTool(btn.dataset.tool));
  });

  document.querySelectorAll('[data-quick-add]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const vpW = VIEWPORTS[state.viewport]?.width || 1024;
      const offset = (state.elements.length % 6) * 20;
      const el = createDefaultElement(btn.dataset.quickAdd, clamp(48 + offset, 12, vpW - 200), clamp(48 + offset, 12, state.canvasHeight - 100));
      pushHistory();
      state.elements.push(el);
      selectedIds = [el.id];
      setTool('select');
      renderAll();
      saveState();
    });
  });

  // ========================================================================
  // CANVAS INTERACTION: PAN, DRAW, MARQUEE, MOVE+SNAP GUIDES, 8-HANDLE RESIZE
  // ========================================================================
  let pointerOp = null;

  function toCanvasCoords(clientX, clientY) {
    const rect = canvasEl.getBoundingClientRect();
    return {
      x: (clientX - rect.left) / zoom,
      y: (clientY - rect.top) / zoom
    };
  }

  function computeSnap(movingRect, ignoreIds) {
    if (!snapEnabled) return { dx: 0, dy: 0, guides: [] };
    const vpW = VIEWPORTS[state.viewport]?.width || 1024;
    const targetsX = [0, vpW / 2, vpW];
    const targetsY = [0, state.canvasHeight / 2, state.canvasHeight];
    state.elements.forEach((other) => {
      if (ignoreIds.has(other.id) || !other.visible) return;
      targetsX.push(other.x, other.x + other.w / 2, other.x + other.w);
      targetsY.push(other.y, other.y + other.h / 2, other.y + other.h);
    });

    const edgesX = [movingRect.x, movingRect.x + movingRect.w / 2, movingRect.x + movingRect.w];
    const edgesY = [movingRect.y, movingRect.y + movingRect.h / 2, movingRect.y + movingRect.h];

    let bestDx = 0;
    let bestDistX = SNAP_THRESHOLD + 1;
    let snapPosX = null;
    for (const ex of edgesX) {
      for (const tx of targetsX) {
        const d = tx - ex;
        if (Math.abs(d) < bestDistX) {
          bestDistX = Math.abs(d);
          bestDx = d;
          snapPosX = tx;
        }
      }
    }

    let bestDy = 0;
    let bestDistY = SNAP_THRESHOLD + 1;
    let snapPosY = null;
    for (const ey of edgesY) {
      for (const ty of targetsY) {
        const d = ty - ey;
        if (Math.abs(d) < bestDistY) {
          bestDistY = Math.abs(d);
          bestDy = d;
          snapPosY = ty;
        }
      }
    }

    const guides = [];
    if (bestDistX <= SNAP_THRESHOLD && snapPosX !== null) guides.push({ axis: 'v', pos: snapPosX });
    else bestDx = Math.round(movingRect.x / GRID_STEP) * GRID_STEP - movingRect.x;

    if (bestDistY <= SNAP_THRESHOLD && snapPosY !== null) guides.push({ axis: 'h', pos: snapPosY });
    else bestDy = Math.round(movingRect.y / GRID_STEP) * GRID_STEP - movingRect.y;

    return { dx: Math.round(bestDx), dy: Math.round(bestDy), guides };
  }

  function finishInlineEdit(commit = true) {
    if (!editingId) return;
    const el = state.elements.find((x) => x.id === editingId);
    const dom = canvasEl?.querySelector(`[data-el-id="${editingId}"] .el-text-inner`);
    if (el && dom && commit) {
      const nextText = dom.innerText;
      if (nextText !== el.text) {
        pushHistory();
        el.text = nextText;
        saveState();
      }
    }
    editingId = null;
    renderAll();
  }

  workspaceEl?.addEventListener('pointerdown', (e) => {
    if (editingId && !e.target.closest(`[data-el-id="${editingId}"]`)) {
      finishInlineEdit(true);
    }

    const effective = spaceHeld ? 'hand' : activeTool;
    if (effective === 'hand') {
      pointerOp = {
        mode: 'pan',
        startX: e.clientX,
        startY: e.clientY,
        scrollLeft: workspaceEl.scrollLeft,
        scrollTop: workspaceEl.scrollTop
      };
      workspaceEl.style.cursor = 'grabbing';
      e.preventDefault();
      return;
    }

    if (!e.target.closest('#design-canvas')) return;
    const pt = toCanvasCoords(e.clientX, e.clientY);

    // Drawing tool mode (frame, rect, circle, line, text, button, image)
    if (effective !== 'select') {
      const newEl = createDefaultElement(effective, Math.round(pt.x), Math.round(pt.y), 12, 12);
      pointerOp = {
        mode: 'draw',
        tool: effective,
        startX: pt.x,
        startY: pt.y,
        tempEl: newEl,
        dragged: false
      };
      e.preventDefault();
      return;
    }

    // Resize handle
    const handle = e.target.closest('.resize-handle');
    const card = e.target.closest('.canvas-el');
    if (handle && card) {
      const el = state.elements.find((item) => item.id === card.dataset.elId);
      if (!el || el.locked) return;
      pointerOp = {
        mode: 'resize',
        dir: handle.dataset.dir,
        id: el.id,
        startX: pt.x,
        startY: pt.y,
        orig: { x: el.x, y: el.y, w: el.w, h: el.h },
        moved: false
      };
      e.preventDefault();
      return;
    }

    // Element click / move
    if (card) {
      const id = card.dataset.elId;
      if (editingId === id) return;
      if (e.shiftKey) {
        selectedIds = selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id];
      } else if (!selectedIds.includes(id)) {
        selectedIds = [id];
      }
      renderAll();

      const movable = getSelectedElements().filter((x) => !x.locked);
      if (movable.length) {
        pointerOp = {
          mode: 'move',
          startX: pt.x,
          startY: pt.y,
          origins: movable.map((x) => ({ id: x.id, x: x.x, y: x.y, w: x.w, h: x.h })),
          moved: false
        };
      }
      e.preventDefault();
      return;
    }

    // Empty canvas click -> Marquee selection
    if (!e.shiftKey) {
      selectedIds = [];
      renderAll();
    }
    pointerOp = {
      mode: 'marquee',
      startX: pt.x,
      startY: pt.y,
      baseSelection: e.shiftKey ? [...selectedIds] : []
    };
    e.preventDefault();
  });

  window.addEventListener('pointermove', (e) => {
    if (!pointerOp) return;

    if (pointerOp.mode === 'pan') {
      workspaceEl.scrollLeft = pointerOp.scrollLeft - (e.clientX - pointerOp.startX);
      workspaceEl.scrollTop = pointerOp.scrollTop - (e.clientY - pointerOp.startY);
      return;
    }

    const pt = toCanvasCoords(e.clientX, e.clientY);
    const vpW = VIEWPORTS[state.viewport]?.width || 1024;

    if (pointerOp.mode === 'draw') {
      const dx = pt.x - pointerOp.startX;
      const dy = pt.y - pointerOp.startY;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) pointerOp.dragged = true;
      const x = Math.round(Math.min(pointerOp.startX, pt.x));
      const y = Math.round(Math.min(pointerOp.startY, pt.y));
      const w = Math.max(16, Math.round(Math.abs(dx)));
      const h = pointerOp.tool === 'line' ? 4 : Math.max(16, Math.round(Math.abs(dy)));

      let preview = canvasEl.querySelector('.marquee-box');
      if (!preview) {
        preview = document.createElement('div');
        preview.className = 'marquee-box';
        canvasEl.appendChild(preview);
      }
      preview.style.left = `${x}px`;
      preview.style.top = `${y}px`;
      preview.style.width = `${w}px`;
      preview.style.height = `${h}px`;
      pointerOp.drawRect = { x, y, w, h };
      return;
    }

    if (pointerOp.mode === 'marquee') {
      const x = Math.min(pointerOp.startX, pt.x);
      const y = Math.min(pointerOp.startY, pt.y);
      const w = Math.abs(pt.x - pointerOp.startX);
      const h = Math.abs(pt.y - pointerOp.startY);
      let box = canvasEl.querySelector('.marquee-box');
      if (!box) {
        box = document.createElement('div');
        box.className = 'marquee-box';
        canvasEl.appendChild(box);
      }
      box.style.left = `${x}px`;
      box.style.top = `${y}px`;
      box.style.width = `${w}px`;
      box.style.height = `${h}px`;

      const hits = state.elements.filter((el) => (
        el.visible && el.x < x + w && el.x + el.w > x && el.y < y + h && el.y + el.h > y
      )).map((el) => el.id);
      selectedIds = Array.from(new Set([...pointerOp.baseSelection, ...hits]));
      renderCanvas();
      const box2 = document.createElement('div');
      box2.className = 'marquee-box';
      box2.style.left = `${x}px`;
      box2.style.top = `${y}px`;
      box2.style.width = `${w}px`;
      box2.style.height = `${h}px`;
      canvasEl.appendChild(box2);
      return;
    }

    if (pointerOp.mode === 'move') {
      const dx = pt.x - pointerOp.startX;
      const dy = pt.y - pointerOp.startY;
      if (!pointerOp.moved && (Math.abs(dx) > 2 || Math.abs(dy) > 2)) {
        pushHistory();
        pointerOp.moved = true;
      }
      const first = pointerOp.origins[0];
      const ignore = new Set(pointerOp.origins.map((o) => o.id));
      const snapRes = computeSnap({ x: first.x + dx, y: first.y + dy, w: first.w, h: first.h }, ignore);

      pointerOp.origins.forEach((orig) => {
        const el = state.elements.find((item) => item.id === orig.id);
        if (!el) return;
        el.x = clamp(Math.round(orig.x + dx + snapRes.dx), 0, Math.max(0, vpW - el.w));
        el.y = clamp(Math.round(orig.y + dy + snapRes.dy), 0, Math.max(0, state.canvasHeight - el.h));
      });
      renderCanvas(snapRes.guides);
      return;
    }

    if (pointerOp.mode === 'resize') {
      const el = state.elements.find((item) => item.id === pointerOp.id);
      if (!el) return;
      const dx = pt.x - pointerOp.startX;
      const dy = pt.y - pointerOp.startY;
      if (!pointerOp.moved && (Math.abs(dx) > 2 || Math.abs(dy) > 2)) {
        pushHistory();
        pointerOp.moved = true;
      }
      const { orig, dir } = pointerOp;
      let nextX = orig.x;
      let nextY = orig.y;
      let nextW = orig.w;
      let nextH = orig.h;

      if (dir.includes('e')) nextW = Math.max(12, Math.round(orig.w + dx));
      if (dir.includes('s')) nextH = Math.max(2, Math.round(orig.h + dy));
      if (dir.includes('w')) {
        const maxLeft = orig.x + orig.w - 12;
        nextX = clamp(Math.round(orig.x + dx), 0, maxLeft);
        nextW = orig.x + orig.w - nextX;
      }
      if (dir.includes('n')) {
        const maxTop = orig.y + orig.h - 2;
        nextY = clamp(Math.round(orig.y + dy), 0, maxTop);
        nextH = orig.y + orig.h - nextY;
      }

      if (e.shiftKey && orig.h > 0 && dir.length === 2) {
        const ratio = orig.w / orig.h;
        nextH = Math.max(12, Math.round(nextW / ratio));
      }

      el.x = nextX;
      el.y = nextY;
      el.w = clamp(nextW, 12, vpW - el.x);
      el.h = clamp(nextH, 2, state.canvasHeight - el.y);
      renderCanvas();
    }
  });

  window.addEventListener('pointerup', () => {
    if (!pointerOp) return;
    canvasEl?.querySelector('.marquee-box')?.remove();

    if (pointerOp.mode === 'pan') {
      updateCursorAndHint();
    } else if (pointerOp.mode === 'draw') {
      pushHistory();
      const r = pointerOp.drawRect;
      const el = pointerOp.dragged && r
        ? createDefaultElement(pointerOp.tool, r.x, r.y, r.w, r.h)
        : createDefaultElement(pointerOp.tool, Math.round(pointerOp.startX), Math.round(pointerOp.startY));
      state.elements.push(el);
      selectedIds = [el.id];
      setTool('select');
      renderAll();
      saveState();
    } else if (pointerOp.mode === 'marquee') {
      renderAll();
    } else if (pointerOp.moved) {
      renderAll();
      saveState();
    }
    pointerOp = null;
  });

  // True Inline Text Editing on Double-Click
  canvasEl?.addEventListener('dblclick', (e) => {
    const card = e.target.closest('.canvas-el');
    if (!card) return;
    const el = state.elements.find((item) => item.id === card.dataset.elId);
    if (!el || el.locked || el.type === 'line') return;
    editingId = el.id;
    selectedIds = [el.id];
    renderCanvas();
    const inner = canvasEl.querySelector(`[data-el-id="${el.id}"] .el-text-inner`);
    if (inner) {
      inner.focus();
      const range = document.createRange();
      range.selectNodeContents(inner);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
      inner.addEventListener('keydown', (ke) => {
        if (ke.key === 'Escape') {
          ke.preventDefault();
          finishInlineEdit(false);
        } else if ((ke.metaKey || ke.ctrlKey) && ke.key === 'Enter') {
          ke.preventDefault();
          finishInlineEdit(true);
        }
      });
      inner.addEventListener('blur', () => finishInlineEdit(true), { once: true });
    }
  });

  // Top Controls & Zoom
  pageTitleInput?.addEventListener('input', (e) => { state.pageTitle = e.target.value; saveState(); });

  document.querySelectorAll('.vp-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.viewport = btn.dataset.vp;
      renderCanvas();
      saveState();
    });
  });

  document.getElementById('zoom-in-btn')?.addEventListener('click', () => { zoom = clamp(Math.round((zoom + 0.1) * 10) / 10, 0.3, 2); renderCanvas(); });
  document.getElementById('zoom-out-btn')?.addEventListener('click', () => { zoom = clamp(Math.round((zoom - 0.1) * 10) / 10, 0.3, 2); renderCanvas(); });
  document.getElementById('zoom-reset-btn')?.addEventListener('click', () => { zoom = 1; renderCanvas(); });

  workspaceEl?.addEventListener('wheel', (e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.1 : -0.1;
      zoom = clamp(Math.round((zoom + delta) * 10) / 10, 0.3, 2);
      renderCanvas();
    }
  }, { passive: false });

  const snapBtn = document.getElementById('toggle-snap-btn');
  snapBtn?.addEventListener('click', () => {
    snapEnabled = !snapEnabled;
    snapBtn.classList.toggle('bg-[#F4D03F]', snapEnabled);
    snapBtn.classList.toggle('text-[#111111]', snapEnabled);
    snapBtn.classList.toggle('bg-white/10', !snapEnabled);
    snapBtn.classList.toggle('text-white', !snapEnabled);
    renderCanvas();
  });

  document.getElementById('template-select')?.addEventListener('change', (e) => {
    const val = e.target.value;
    if (!val) return;
    pushHistory();
    state = makeStarterTemplate(val);
    selectedIds = state.elements[0] ? [state.elements[0].id] : [];
    e.target.value = '';
    renderAll();
    saveState();
  });

  function undo() {
    if (!history.length) return;
    redoStack.push(JSON.stringify(state));
    state = JSON.parse(history.pop());
    selectedIds = selectedIds.filter((id) => state.elements.some((e) => e.id === id));
    syncHistoryButtons();
    renderAll();
    saveState();
  }

  function redo() {
    if (!redoStack.length) return;
    history.push(JSON.stringify(state));
    state = JSON.parse(redoStack.pop());
    selectedIds = selectedIds.filter((id) => state.elements.some((e) => e.id === id));
    syncHistoryButtons();
    renderAll();
    saveState();
  }

  undoBtn?.addEventListener('click', undo);
  redoBtn?.addEventListener('click', redo);

  window.addEventListener('keydown', (e) => {
    if (editingId || e.target.closest('input, textarea, select')) return;

    if (e.code === 'Space' && !spaceHeld) {
      spaceHeld = true;
      updateCursorAndHint();
      e.preventDefault();
      return;
    }

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
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'a') {
      e.preventDefault();
      selectedIds = state.elements.filter((x) => x.visible).map((x) => x.id);
      renderAll();
      return;
    }
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (selectedIds.length) {
        e.preventDefault();
        deleteSelected();
      }
      return;
    }

    const toolShortcuts = { v: 'select', f: 'frame', r: 'rect', o: 'circle', l: 'line', t: 'text', b: 'button', i: 'image', h: 'hand' };
    const k = e.key.toLowerCase();
    if (!e.metaKey && !e.ctrlKey && !e.altKey && toolShortcuts[k]) {
      setTool(toolShortcuts[k]);
      return;
    }

    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && selectedIds.length) {
      const movable = getSelectedElements().filter((x) => !x.locked);
      if (!movable.length) return;
      e.preventDefault();
      const step = e.shiftKey ? 10 : 1;
      movable.forEach((el) => {
        if (e.key === 'ArrowLeft') el.x = Math.max(0, el.x - step);
        if (e.key === 'ArrowRight') el.x += step;
        if (e.key === 'ArrowUp') el.y = Math.max(0, el.y - step);
        if (e.key === 'ArrowDown') el.y += step;
      });
      renderAll();
      saveState();
    }
  });

  window.addEventListener('keyup', (e) => {
    if (e.code === 'Space' && spaceHeld) {
      spaceHeld = false;
      updateCursorAndHint();
    }
  });

  // ========================================================================
  // EXPORT FOR AI GENERATORS (Markdown Prompt / HTML+Tailwind / JSON)
  // ========================================================================
  function buildAiPromptSpec() {
    const vp = VIEWPORTS[state.viewport] || VIEWPORTS.desktop;
    const visibleEls = state.elements.filter((e) => e.visible);
    const usedColors = Array.from(new Set([
      state.canvasBg,
      ...visibleEls.flatMap((e) => [e.bg, e.color, e.borderColor])
    ].filter((c) => c && c !== 'transparent')));

    const lines = [
      `# Website Page Design Specification`,
      `Please build this web page cleanly using HTML, Tailwind CSS (or React/Next.js) matching the layout, hierarchy, texts, shapes, and colors below.`,
      ``,
      `## Page Overview`,
      `- **Title:** ${state.pageTitle || 'Untitled Design'}`,
      `- **Goal / Context:** ${state.pageGoal || 'Modern responsive web page'}`,
      `- **Target Viewport:** ${vp.label} (${vp.width} x ${state.canvasHeight} px)`,
      `- **Canvas Background:** \`${state.canvasBg || '#FFFFFF'}\``,
      `- **Color Palette:** ${usedColors.map((c) => `\`${c}\``).join(', ')}`,
      ``,
      `## Layers (${visibleEls.length} visible layers, back-to-front)`
    ];

    visibleEls.forEach((el, idx) => {
      const textInfo = el.text ? ` | Text: "${el.text.replace(/\n/g, ' \\n ')}"` : '';
      const noteInfo = el.note ? ` | Role: ${el.note}` : '';
      const imgInfo = el.imageSrc ? ` | ImageSrc: ${el.imageSrc.startsWith('data:') ? '[embedded uploaded image]' : el.imageSrc}` : '';
      lines.push(
        `${idx + 1}. **[${el.type.toUpperCase()}]**${noteInfo}${textInfo}${imgInfo}` +
        `\n   - Bounds: \`x:${el.x}, y:${el.y}, w:${el.w}, h:${el.h}, rot:${el.rotation}deg, opacity:${el.opacity}%\`` +
        `\n   - Style: \`bg:${el.bg}, color:${el.color}, border:${el.borderWidth}px ${el.borderStyle} ${el.borderColor}, radius:${el.radius}px, font:${el.fontFamily} ${el.fontSize}px/${el.fontWeight}, align:${el.align}, shadow:${el.shadow}\``
      );
    });

    return lines.join('\n');
  }

  function buildHtmlOutput() {
    const vp = VIEWPORTS[state.viewport] || VIEWPORTS.desktop;
    const bodyEls = state.elements.filter((e) => e.visible).map((el) => {
      const shadow = elementShadowCss(el.shadow);
      const border = el.borderWidth > 0 ? `${el.borderWidth}px ${el.borderStyle} ${el.borderColor}` : 'none';
      const justify = el.align === 'center' ? 'center' : (el.align === 'right' ? 'flex-end' : 'flex-start');
      const style = `position:absolute;left:${el.x}px;top:${el.y}px;width:${el.w}px;height:${el.h}px;background:${el.bg};color:${el.color};border:${border};border-radius:${el.radius}px;box-shadow:${shadow};opacity:${el.opacity / 100};transform:rotate(${el.rotation}deg);font-family:${fontCss(el.fontFamily)};font-size:${el.fontSize}px;font-weight:${el.fontWeight};text-align:${el.align};display:flex;align-items:center;justify-content:${justify};padding:${el.type === 'line' || (el.type === 'image' && el.imageSrc) ? '0' : '6px 12px'};`;
      const tag = el.type === 'button' ? 'button' : (el.type === 'heading' ? 'h1' : 'div');
      const comment = el.note ? `<!-- ${el.note.replace(/-->/g, '')} -->\n    ` : '';
      const content = (el.type === 'image' && el.imageSrc)
        ? `<img src="${esc(el.imageSrc)}" alt="${esc(el.text || 'Image')}" style="width:100%;height:100%;object-fit:cover;border-radius:${Math.max(0, el.radius - el.borderWidth)}px;" />`
        : esc(el.text || '');
      return `${comment}<${tag} style="${style}">${content}</${tag}>`;
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
    return JSON.stringify({ format: 'vox-page-design-v2', ...state }, null, 2);
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
        elements: parsed.elements.map(normEl)
      };
      selectedIds = state.elements[0] ? [state.elements[0].id] : [];
      renderAll();
      saveState();
      importModal?.classList.add('hidden');
      importModal?.classList.remove('flex');
    } catch {
      alert('ไฟล์หรือข้อมูล JSON ไม่ถูกต้อง');
    }
  });

  setTool('select');
  renderAll();
  syncHistoryButtons();
})();
