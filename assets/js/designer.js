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

  const SWATCHES = ['#FFFFFF', '#F8F6F0', '#111111', '#F4D03F', '#E74C3C', '#2980B9', '#2ECC71', '#9B59B6'];

  const esc = (s) => (window.VoxSecurity ? window.VoxSecurity.escapeHtml(s) : String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])));
  const uid = () => 'el_' + Math.random().toString(36).slice(2, 9);
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  function normEl(raw) {
    return {
      id: raw.id || uid(),
      type: raw.type || 'frame',
      x: Math.round(Number(raw.x) || 0),
      y: Math.round(Number(raw.y) || 0),
      w: Math.max(16, Math.round(Number(raw.w) || 160)),
      h: Math.max(4, Math.round(Number(raw.h) || 48)),
      text: raw.text ?? '',
      imageSrc: raw.imageSrc || '',
      bg: raw.bg ?? '#FFFFFF',
      color: raw.color ?? '#111111',
      borderColor: raw.borderColor ?? '#111111',
      borderWidth: Number(raw.borderWidth ?? 0),
      radius: Number(raw.radius ?? 0),
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
      return { pageTitle: 'Untitled Page', pageGoal: '', viewport: 'desktop', canvasHeight: 680, canvasBg: '#FFFFFF', elements: [] };
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
          normEl({ type: 'heading', x: 60, y: 38, w: 240, h: 36, text: 'Brand Studio', bg: 'transparent', fontSize: 22, fontWeight: '900', note: 'Brand logo' }),
          normEl({ type: 'button', x: 828, y: 36, w: 132, h: 40, text: 'เริ่มต้นใช้งาน', bg: '#F4D03F', borderWidth: 2, radius: 10, fontSize: 14, fontWeight: '800', align: 'center', shadow: 'brutal', note: 'Navbar CTA' }),
          normEl({ type: 'heading', x: 180, y: 120, w: 660, h: 56, text: 'ออกแบบหน้าเว็บไวขึ้นในไม่กี่นาที', bg: 'transparent', fontSize: 36, fontWeight: '900', align: 'center', note: 'Hero H1' }),
          normEl({ type: 'text', x: 228, y: 180, w: 564, h: 48, text: 'จัดวางข้อความ รูปทรง และชุดสี แล้วคัดลอกส่งให้ AI พัฒนาต่อได้ทันที', bg: 'transparent', color: '#333333', fontSize: 16, fontWeight: '500', align: 'center', note: 'Subtitle' }),
          normEl({ type: 'frame', x: 36, y: 264, w: 300, h: 264, text: '01. จัดวางง่าย', bg: '#FFFFFF', borderWidth: 3, radius: 16, fontSize: 20, fontWeight: '800', align: 'center', shadow: 'brutal', note: 'Feature card 1' }),
          normEl({ type: 'frame', x: 360, y: 264, w: 300, h: 264, text: '02. ปรับแต่งสีไว', bg: '#FFFFFF', borderWidth: 3, radius: 16, fontSize: 20, fontWeight: '800', align: 'center', shadow: 'brutal', note: 'Feature card 2' }),
          normEl({ type: 'frame', x: 684, y: 264, w: 300, h: 264, text: '03. ส่งต่อให้ AI', bg: '#F4D03F', borderWidth: 3, radius: 16, fontSize: 20, fontWeight: '800', align: 'center', shadow: 'brutal', note: 'Feature card 3' })
        ]
      };
    }
    if (name === 'event') {
      return {
        pageTitle: 'Event Registration Page',
        pageGoal: 'หน้าลงทะเบียนกิจกรรม มีแบนเนอร์ รายละเอียดงาน และฟอร์มสมัคร',
        viewport: 'desktop',
        canvasHeight: 680,
        canvasBg: '#F8F6F0',
        elements: [
          normEl({ type: 'image', x: 36, y: 24, w: 948, h: 192, text: 'Event Cover Banner (1200×400)', bg: '#111111', color: '#F4D03F', borderWidth: 3, radius: 18, fontSize: 20, fontWeight: '800', align: 'center', shadow: 'brutal', note: 'Hero event banner' }),
          normEl({ type: 'badge', x: 48, y: 240, w: 144, h: 32, text: 'OPEN FOR 2026', bg: '#F4D03F', borderWidth: 2, radius: 999, fontSize: 12, fontWeight: '800', align: 'center', note: 'Status badge' }),
          normEl({ type: 'heading', x: 48, y: 284, w: 504, h: 52, text: 'Tech & Design Camp 2026', bg: 'transparent', fontSize: 34, fontWeight: '900', note: 'Event title' }),
          normEl({ type: 'text', x: 48, y: 344, w: 504, h: 84, text: 'ร่วมเวิร์กชอปสร้างเว็บและเครื่องมือโต้ตอบแบบเรียลไทม์ พร้อมกิจกรรมสนุกตลอดวัน', bg: 'transparent', color: '#222222', fontSize: 16, fontWeight: '500', note: 'Event description' }),
          normEl({ type: 'frame', x: 588, y: 240, w: 396, h: 336, bg: '#FFFFFF', borderWidth: 3, radius: 18, shadow: 'brutal', note: 'Registration form card' }),
          normEl({ type: 'heading', x: 612, y: 264, w: 348, h: 36, text: 'ลงทะเบียนเข้าร่วมงาน', bg: 'transparent', fontSize: 20, fontWeight: '800', note: 'Form heading' }),
          normEl({ type: 'input', x: 612, y: 316, w: 348, h: 44, text: 'ชื่อ-นามสกุล', bg: '#F8F6F0', color: '#555555', borderWidth: 2, radius: 10, fontSize: 14, fontWeight: '500', note: 'Name input' }),
          normEl({ type: 'input', x: 612, y: 376, w: 348, h: 44, text: 'อีเมลติดต่อ', bg: '#F8F6F0', color: '#555555', borderWidth: 2, radius: 10, fontSize: 14, fontWeight: '500', note: 'Email input' }),
          normEl({ type: 'button', x: 612, y: 448, w: 348, h: 48, text: 'ยืนยันการสมัคร', bg: '#F4D03F', borderWidth: 2, radius: 12, fontSize: 16, fontWeight: '900', align: 'center', shadow: 'brutal', note: 'Submit CTA' })
        ]
      };
    }
    return {
      pageTitle: 'My Landing Page',
      pageGoal: 'สร้างหน้า Landing Page สไตล์โมเดิร์น มี Hero Section ทางซ้าย ภาพตัวอย่างทางขวา และการ์ดจุดเด่นด้านล่าง',
      viewport: 'desktop',
      canvasHeight: 680,
      canvasBg: '#F8F6F0',
      elements: [
        normEl({ type: 'badge', x: 60, y: 72, w: 168, h: 32, text: 'NEW LAUNCH 2026', bg: '#F4D03F', borderWidth: 2, radius: 999, fontSize: 12, fontWeight: '800', align: 'center', note: 'Hero badge' }),
        normEl({ type: 'heading', x: 60, y: 120, w: 468, h: 108, text: 'ออกแบบไอเดียเว็บของคุณ\nให้เป็นจริงในพริบตา', bg: 'transparent', fontSize: 38, fontWeight: '900', note: 'Main hero H1' }),
        normEl({ type: 'text', x: 60, y: 240, w: 456, h: 64, text: 'จัดวางข้อความ รูปทรง และสีที่ต้องการ แล้วกด Copy for AI เพื่อนำไปสร้างโค้ดจริงได้เลย', bg: 'transparent', color: '#333333', fontSize: 16, fontWeight: '500', note: 'Hero subtitle' }),
        normEl({ type: 'button', x: 60, y: 324, w: 180, h: 48, text: 'เริ่มต้นใช้งาน', bg: '#F4D03F', borderWidth: 3, radius: 12, fontSize: 16, fontWeight: '900', align: 'center', shadow: 'brutal', note: 'Primary CTA' }),
        normEl({ type: 'button', x: 252, y: 324, w: 156, h: 48, text: 'ดูตัวอย่าง', bg: '#FFFFFF', borderWidth: 3, radius: 12, fontSize: 16, fontWeight: '800', align: 'center', shadow: 'brutal', note: 'Secondary CTA' }),
        normEl({ type: 'image', x: 564, y: 72, w: 396, h: 312, text: 'Hero Visual / Screenshot', bg: '#FFFFFF', borderWidth: 3, radius: 20, fontSize: 16, fontWeight: '800', align: 'center', shadow: 'brutal', note: 'Right hero visual' }),
        normEl({ type: 'line', x: 60, y: 432, w: 900, h: 4, bg: '#111111', radius: 2, note: 'Section divider' }),
        normEl({ type: 'frame', x: 60, y: 468, w: 288, h: 120, text: '⚡ Fast & Lightweight', bg: '#FFFFFF', borderWidth: 3, radius: 14, fontSize: 18, fontWeight: '800', align: 'center', shadow: 'brutal', note: 'Highlight card 1' }),
        normEl({ type: 'frame', x: 366, y: 468, w: 288, h: 120, text: '🤖 1-Click AI Prompt', bg: '#111111', color: '#F4D03F', borderWidth: 3, radius: 14, fontSize: 18, fontWeight: '800', align: 'center', shadow: 'brutal', note: 'Highlight card 2' }),
        normEl({ type: 'frame', x: 672, y: 468, w: 288, h: 120, text: '🎨 Custom Palette', bg: '#F4D03F', borderWidth: 3, radius: 14, fontSize: 18, fontWeight: '800', align: 'center', shadow: 'brutal', note: 'Highlight card 3' })
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
  let selectedId = state.elements[0]?.id || null;
  let activeTool = 'select';
  let spaceHeld = false;
  let snapEnabled = true;
  let zoom = 1;
  let editingId = null;
  let history = [];
  let redoStack = [];
  let activeExportTab = 'prompt';
  let saveTimer = null;

  // Persistent DOM Map for 60/120fps zero-rebuild updates
  const nodeMap = new Map();

  const workspaceEl = document.getElementById('canvas-workspace');
  const zoomStageEl = document.getElementById('zoom-stage');
  const canvasEl = document.getElementById('design-canvas');
  const elementsRoot = document.getElementById('canvas-elements-root');
  const guidesRoot = document.getElementById('canvas-guides-root');
  const sizeLabelEl = document.getElementById('canvas-size-label');
  const inspectorEl = document.getElementById('inspector-panel');
  const layersListEl = document.getElementById('layers-list');
  const layersCountEl = document.getElementById('layers-count');
  const pageTitleInput = document.getElementById('page-title-input');
  const zoomResetBtn = document.getElementById('zoom-reset-btn');
  const undoBtn = document.getElementById('undo-btn');
  const redoBtn = document.getElementById('redo-btn');
  const hiddenImgInput = document.getElementById('hidden-image-upload');

  function scheduleSave() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* ignore */ }
    }, 220);
  }

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

  function getSelected() {
    return state.elements.find((e) => e.id === selectedId) || null;
  }

  function setTool(tool) {
    activeTool = tool;
    document.querySelectorAll('.tool-btn').forEach((btn) => {
      const on = btn.dataset.tool === tool;
      btn.classList.toggle('bg-[#111111]', on);
      btn.classList.toggle('text-[#F4D03F]', on);
      btn.classList.toggle('text-[#111111]', !on);
    });
    updateCursor();
  }

  function updateCursor() {
    const isHand = spaceHeld || activeTool === 'hand';
    if (workspaceEl) workspaceEl.style.cursor = isHand ? 'grab' : 'default';
    if (canvasEl) canvasEl.style.cursor = isHand ? 'grab' : 'default';
  }

  function createDefaultElement(type) {
    const vpW = VIEWPORTS[state.viewport]?.width || 1024;
    const step = (state.elements.length % 7) * 24;
    const x = clamp(48 + step, 12, vpW - 220);
    const y = clamp(48 + step, 12, state.canvasHeight - 100);
    const preset = {
      heading: { w: 360, h: 56, text: 'หัวข้อใหม่ (Heading)', bg: 'transparent', borderWidth: 0, fontSize: 32, fontWeight: '900' },
      text: { w: 340, h: 68, text: 'คลิกสองครั้งเพื่อแก้ไขข้อความนี้', bg: 'transparent', color: '#222222', borderWidth: 0, fontSize: 16, fontWeight: '500' },
      button: { w: 168, h: 48, text: 'ปุ่มกด (CTA)', bg: '#F4D03F', borderWidth: 3, radius: 12, fontSize: 15, fontWeight: '800', align: 'center', shadow: 'brutal' },
      badge: { w: 140, h: 32, text: 'NEW TAG', bg: '#111111', color: '#F4D03F', borderWidth: 2, radius: 999, fontSize: 12, fontWeight: '800', align: 'center' },
      frame: { w: 288, h: 180, text: '', bg: '#FFFFFF', borderWidth: 3, radius: 16, fontSize: 18, fontWeight: '800', align: 'center', shadow: 'brutal' },
      circle: { w: 108, h: 108, text: '', bg: '#E74C3C', color: '#FFFFFF', borderWidth: 3, radius: 999, align: 'center', shadow: 'brutal' },
      image: { w: 320, h: 200, text: 'รูปภาพ (อัปโหลดในแถบขวา)', bg: '#EAE6DA', borderWidth: 3, radius: 16, fontSize: 14, fontWeight: '800', align: 'center' },
      input: { w: 288, h: 44, text: 'กรอกข้อมูล...', bg: '#FFFFFF', color: '#666666', borderWidth: 2, radius: 10, fontSize: 14, fontWeight: '500' },
      line: { w: 360, h: 4, text: '', bg: '#111111', borderWidth: 0, radius: 2 }
    }[type] || {};
    return normEl({ type, x, y, ...preset });
  }

  function shadowCss(shadow) {
    if (shadow === 'brutal') return '4px 4px 0px #111111';
    if (shadow === 'soft') return '0 10px 24px rgba(17,17,17,0.13)';
    return 'none';
  }

  // ========================================================================
  // SURGICAL DOM RENDERING (FAST, LIGHTWEIGHT, ZERO INNERHTML THRASH)
  // ========================================================================
  function applyNodeStyle(node, el, idx, isSelected, isEditing) {
    node.style.display = el.visible ? 'flex' : 'none';
    if (!el.visible) return;
    node.style.left = `${el.x}px`;
    node.style.top = `${el.y}px`;
    node.style.width = `${el.w}px`;
    node.style.height = `${el.h}px`;
    node.style.zIndex = String(idx + 1);
    node.style.background = el.bg || 'transparent';
    node.style.color = el.color || '#111111';
    node.style.border = el.borderWidth > 0 ? `${el.borderWidth}px solid ${el.borderColor || '#111111'}` : 'none';
    node.style.borderRadius = `${el.radius || 0}px`;
    node.style.boxShadow = shadowCss(el.shadow);
    node.style.fontSize = `${el.fontSize || 16}px`;
    node.style.fontWeight = el.fontWeight || '700';
    node.style.textAlign = el.align || 'left';
    node.style.alignItems = 'center';
    node.style.justifyContent = el.align === 'center' ? 'center' : (el.align === 'right' ? 'flex-end' : 'flex-start');
    node.style.padding = (el.type === 'line' || (el.type === 'image' && el.imageSrc)) ? '0' : '6px 12px';

    node.classList.toggle('is-selected', isSelected);
    node.classList.toggle('is-editing', isEditing);

    const handlesBox = node.querySelector('.handles-box');
    if (handlesBox) {
      handlesBox.style.display = (isSelected && !el.locked && !isEditing) ? 'block' : 'none';
    }
  }

  function applyNodeContent(node, el, isEditing) {
    const contentBox = node.querySelector('.el-content-box');
    if (!contentBox) return;
    const sig = `${el.type}|${el.imageSrc}|${el.text}|${el.radius}|${el.borderWidth}|${isEditing}`;
    if (contentBox.dataset.sig === sig && !isEditing) return;
    contentBox.dataset.sig = sig;

    if (el.type === 'image') {
      if (el.imageSrc) {
        contentBox.innerHTML = `<img src="${esc(el.imageSrc)}" alt="${esc(el.text || 'Image')}" class="w-full h-full object-cover pointer-events-none" style="border-radius:${Math.max(0, el.radius - el.borderWidth)}px;" />`;
      } else {
        contentBox.innerHTML = `
          <div class="w-full h-full flex flex-col items-center justify-center gap-1 px-2 pointer-events-none">
            <svg class="w-6 h-6 opacity-65" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
            <span class="leading-tight">${esc(el.text || 'Image')}</span>
          </div>`;
      }
    } else if (el.type === 'line') {
      contentBox.innerHTML = '';
    } else {
      contentBox.innerHTML = `<div class="el-text-inner w-full whitespace-pre-line break-words leading-snug ${isEditing ? '' : 'pointer-events-none'}" ${isEditing ? 'contenteditable="true"' : ''}>${esc(el.text || '')}</div>`;
    }
  }

  function createDomNode(el, animateIn = false) {
    const node = document.createElement('div');
    node.dataset.elId = el.id;
    node.className = `canvas-el ${animateIn ? 'is-new' : ''}`;
    node.innerHTML = `
      <div class="el-content-box w-full h-full flex items-center" style="justify-content:inherit;"></div>
      <div class="handles-box" style="display:none;">
        ${['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'].map((d) => `<span class="resize-handle" data-dir="${d}"></span>`).join('')}
      </div>
    `;
    if (animateIn) {
      node.addEventListener('animationend', () => node.classList.remove('is-new'), { once: true });
    }
    return node;
  }

  function syncCanvasStage(animateNewId = null) {
    if (!canvasEl || !elementsRoot) return;
    const vp = VIEWPORTS[state.viewport] || VIEWPORTS.desktop;
    canvasEl.style.width = `${vp.width}px`;
    canvasEl.style.height = `${state.canvasHeight}px`;
    canvasEl.style.backgroundColor = state.canvasBg || '#FFFFFF';
    canvasEl.classList.toggle('canvas-grid-lines', snapEnabled);

    if (zoomStageEl) zoomStageEl.style.transform = `scale(${zoom})`;
    if (zoomResetBtn) zoomResetBtn.textContent = `${Math.round(zoom * 100)}%`;
    if (sizeLabelEl) sizeLabelEl.textContent = `${vp.label} • ${vp.width} × ${state.canvasHeight}`;
    if (pageTitleInput && document.activeElement !== pageTitleInput) {
      pageTitleInput.value = state.pageTitle || 'My Landing Page';
    }

    document.querySelectorAll('.vp-btn').forEach((btn) => {
      const active = btn.dataset.vp === state.viewport;
      btn.classList.toggle('bg-[#111111]', active);
      btn.classList.toggle('text-[#F4D03F]', active);
      btn.classList.toggle('text-[#111111]', !active);
    });

    const activeIds = new Set(state.elements.map((e) => e.id));
    for (const [id, node] of nodeMap.entries()) {
      if (!activeIds.has(id)) {
        node.remove();
        nodeMap.delete(id);
      }
    }

    state.elements.forEach((el, idx) => {
      let node = nodeMap.get(el.id);
      if (!node) {
        node = createDomNode(el, el.id === animateNewId);
        nodeMap.set(el.id, node);
        elementsRoot.appendChild(node);
      }
      const isSel = el.id === selectedId;
      const isEdit = el.id === editingId;
      applyNodeStyle(node, el, idx, isSel, isEdit);
      applyNodeContent(node, el, isEdit);
    });
  }

  function renderGuides(guides) {
    if (!guidesRoot) return;
    if (!guides || !guides.length) {
      if (guidesRoot.childElementCount > 0) guidesRoot.innerHTML = '';
      return;
    }
    guidesRoot.innerHTML = guides.map((g) => (
      g.axis === 'v'
        ? `<div class="snap-guide-v" style="left:${g.pos}px;"></div>`
        : `<div class="snap-guide-h" style="top:${g.pos}px;"></div>`
    )).join('');
  }

  function renderLayers() {
    if (!layersListEl) return;
    if (layersCountEl) layersCountEl.textContent = String(state.elements.length);

    if (!state.elements.length) {
      layersListEl.innerHTML = `<p class="text-[11px] text-[#111111]/45 py-3 text-center">คลิกปุ่มด้านบนเพื่อเพิ่มองค์ประกอบ</p>`;
      return;
    }

    layersListEl.innerHTML = [...state.elements].reverse().map((el) => {
      const isSel = el.id === selectedId;
      const label = el.text ? el.text.replace(/\n/g, ' ') : (el.note || `${el.type} (${el.w}×${el.h})`);
      return `
        <div data-layer-row="${el.id}" class="flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-xs cursor-pointer transition-colors ${isSel ? 'bg-[#F4D03F]/50 border-[#111111] font-bold' : 'bg-[#F8F6F0] border-[#111111]/20 hover:border-[#111111]/60'} ${!el.visible ? 'opacity-45' : ''}">
          <span class="font-display font-black uppercase text-[9px] px-1.5 py-0.5 rounded bg-white border border-[#111111]/35 shrink-0">${esc(el.type)}</span>
          <span class="truncate flex-1">${esc(label)}</span>
          <button type="button" data-layer-lock="${el.id}" title="${el.locked ? 'ปลดล็อก' : 'ล็อก'}" class="px-1 text-[11px] ${el.locked ? 'opacity-100' : 'opacity-35 hover:opacity-100'} cursor-pointer">${el.locked ? '🔒' : '🔓'}</button>
          <button type="button" data-layer-vis="${el.id}" title="${el.visible ? 'ซ่อน' : 'แสดง'}" class="px-1 text-[11px] ${!el.visible ? 'opacity-100' : 'opacity-50 hover:opacity-100'} cursor-pointer">${el.visible ? '👁' : '🚫'}</button>
        </div>
      `;
    }).join('');

    layersListEl.querySelectorAll('[data-layer-row]').forEach((row) => {
      row.addEventListener('click', (e) => {
        if (e.target.closest('[data-layer-lock], [data-layer-vis]')) return;
        selectedId = row.dataset.layerRow;
        syncCanvasStage();
        renderLayers();
        renderInspector();
      });
    });

    layersListEl.querySelectorAll('[data-layer-lock]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const el = state.elements.find((x) => x.id === btn.dataset.layerLock);
        if (!el) return;
        pushHistory();
        el.locked = !el.locked;
        syncCanvasStage();
        renderLayers();
        scheduleSave();
      });
    });

    layersListEl.querySelectorAll('[data-layer-vis]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const el = state.elements.find((x) => x.id === btn.dataset.layerVis);
        if (!el) return;
        pushHistory();
        el.visible = !el.visible;
        syncCanvasStage();
        renderLayers();
        scheduleSave();
      });
    });
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
          <textarea id="insp-page-goal" rows="4" placeholder="อธิบายหน้าเว็บที่ต้องการให้ AI สร้าง เช่น หน้า Landing Page..." class="thai-safe bg-[#F8F6F0] border-2 border-[#111111] rounded-lg p-2 text-xs font-medium resize-y focus:outline-none">${esc(state.pageGoal || '')}</textarea>
        </label>

        <div class="flex flex-col gap-1.5">
          <span class="text-xs font-bold">สีพื้นหลังหน้า (Background)</span>
          <div class="flex items-center gap-1.5 flex-wrap">
            ${SWATCHES.map((hex) => `<button type="button" data-page-bg="${hex}" class="w-6 h-6 rounded-md border-2 border-[#111111] cursor-pointer hover:scale-110 transition-transform" style="background:${hex}"></button>`).join('')}
            <input id="insp-canvas-bg" type="color" value="${/^#[0-9a-f]{6}$/i.test(state.canvasBg || '') ? state.canvasBg : '#FFFFFF'}" class="w-7 h-7 rounded border-2 border-[#111111] cursor-pointer" />
          </div>
        </div>

        <label class="flex flex-col gap-1 text-xs font-bold">
          <span>ความสูงหน้าเว็บ (px)</span>
          <input id="insp-canvas-h" type="number" min="400" max="2400" step="20" value="${state.canvasHeight}" class="bg-[#F8F6F0] border-2 border-[#111111] rounded-lg px-2.5 py-1.5 text-xs font-mono" />
        </label>

        <div class="p-2.5 rounded-xl bg-[#F8F6F0] border-2 border-[#111111]/20 text-[11px] text-[#111111]/70 space-y-1">
          <p class="font-bold text-[#111111]">เคล็ดลับใช้งานไว:</p>
          <p>• คลิกองค์ประกอบบนหน้าเว็บเพื่อปรับสี ข้อความ และขนาด</p>
          <p>• ดับเบิลคลิกที่ข้อความเพื่อพิมพ์แก้บนหน้าเว็บได้ทันที</p>
          <p>• กดปุ่ม <b>Copy for AI</b> ด้านบนเพื่อคัดลอกไปวางให้ AI</p>
        </div>
      `;

      document.getElementById('insp-page-goal')?.addEventListener('input', (e) => { state.pageGoal = e.target.value; scheduleSave(); });
      document.getElementById('insp-canvas-bg')?.addEventListener('input', (e) => { state.canvasBg = e.target.value; syncCanvasStage(); scheduleSave(); });
      inspectorEl.querySelectorAll('[data-page-bg]').forEach((b) => {
        b.addEventListener('click', () => { pushHistory(); state.canvasBg = b.dataset.pageBg; syncCanvasStage(); renderInspector(); scheduleSave(); });
      });
      document.getElementById('insp-canvas-h')?.addEventListener('change', (e) => {
        pushHistory();
        state.canvasHeight = clamp(Number(e.target.value) || 680, 400, 2400);
        syncCanvasStage();
        scheduleSave();
      });
      return;
    }

    const bgHex = /^#[0-9a-f]{6}$/i.test(sel.bg || '') ? sel.bg : '#FFFFFF';
    const textHex = /^#[0-9a-f]{6}$/i.test(sel.color || '') ? sel.color : '#111111';
    const borderHex = /^#[0-9a-f]{6}$/i.test(sel.borderColor || '') ? sel.borderColor : '#111111';

    inspectorEl.innerHTML = `
      <div class="flex items-center justify-between border-b-2 border-[#111111] pb-2">
        <div class="flex items-center gap-1.5">
          <span class="px-2 py-0.5 rounded bg-[#111111] text-[#F4D03F] font-display font-black text-[10px] uppercase">${esc(sel.type)}</span>
          <span class="font-display font-bold text-xs text-[#111111]">ปรับแต่ง</span>
        </div>
        <button type="button" id="insp-deselect" class="text-[11px] font-bold text-[#111111]/60 hover:text-[#111111] cursor-pointer">ตั้งค่าหน้า</button>
      </div>

      ${sel.type === 'image' ? `
        <div class="bg-[#F8F6F0] border-2 border-[#111111] rounded-xl p-2.5 flex flex-col gap-1.5">
          <span class="text-xs font-bold">รูปภาพ (Image)</span>
          <div class="flex gap-1.5">
            <button type="button" id="insp-img-upload" class="flex-1 py-1.5 rounded-lg border-2 border-[#111111] bg-[#F4D03F] font-display font-bold text-xs cursor-pointer">อัปโหลดรูป</button>
            ${sel.imageSrc ? '<button type="button" id="insp-img-clear" class="px-2.5 py-1.5 rounded-lg border-2 border-[#111111] bg-white text-xs font-bold text-[#E74C3C] cursor-pointer">ลบ</button>' : ''}
          </div>
          <input id="insp-img-url" type="url" value="${esc(sel.imageSrc && !sel.imageSrc.startsWith('data:') ? sel.imageSrc : '')}" placeholder="หรือวางลิงก์ https://..." class="bg-white border border-[#111111] rounded-lg px-2 py-1 text-xs focus:outline-none" />
        </div>
      ` : ''}

      ${sel.type !== 'line' ? `
        <label class="flex flex-col gap-1 text-xs font-bold">
          <span>ข้อความ (Text)</span>
          <textarea id="insp-text" rows="2" class="thai-safe bg-[#F8F6F0] border-2 border-[#111111] rounded-lg p-2 text-xs font-medium resize-y focus:outline-none">${esc(sel.text || '')}</textarea>
        </label>
      ` : ''}

      <label class="flex flex-col gap-1 text-xs font-bold">
        <span>บอก AI ว่าชิ้นนี้คืออะไร (Role / Note)</span>
        <input id="insp-note" type="text" value="${esc(sel.note || '')}" placeholder="เช่น ปุ่มสมัครสมาชิก, แบนเนอร์หลัก" class="thai-safe bg-[#F8F6F0] border-2 border-[#111111] rounded-lg px-2.5 py-1.5 text-xs font-medium focus:outline-none" />
      </label>

      <!-- Quick Fill Swatches + Color Pickers -->
      <div class="bg-[#F8F6F0] border-2 border-[#111111]/20 rounded-xl p-2.5 flex flex-col gap-2">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold">สีพื้นหลัง (Fill)</span>
          <button type="button" id="insp-bg-clear" class="text-[10px] font-bold px-2 py-0.5 rounded border border-[#111111] bg-white hover:bg-[#F4D03F] cursor-pointer">พื้นใส</button>
        </div>
        <div class="flex items-center gap-1.5 flex-wrap">
          ${SWATCHES.map((hex) => `<button type="button" data-fill-swatch="${hex}" class="w-6 h-6 rounded-md border-2 border-[#111111] cursor-pointer hover:scale-110 transition-transform" style="background:${hex}"></button>`).join('')}
          <input id="insp-bg" type="color" value="${bgHex}" class="w-7 h-7 rounded border-2 border-[#111111] cursor-pointer" />
        </div>
        <div class="grid grid-cols-2 gap-2 pt-1 border-t border-[#111111]/15">
          <label class="flex items-center justify-between text-xs font-bold">
            <span>สีข้อความ</span>
            <input id="insp-color" type="color" value="${textHex}" class="w-7 h-7 rounded border-2 border-[#111111] cursor-pointer" />
          </label>
          <label class="flex items-center justify-between text-xs font-bold">
            <span>สีขอบ</span>
            <input id="insp-border-color" type="color" value="${borderHex}" class="w-7 h-7 rounded border-2 border-[#111111] cursor-pointer" />
          </label>
        </div>
      </div>

      <!-- Size & Position -->
      <div class="grid grid-cols-4 gap-1.5">
        <label class="flex flex-col gap-0.5 text-[10px] font-bold">X<input data-num="x" type="number" value="${sel.x}" class="bg-[#F8F6F0] border border-[#111111] rounded-md px-1.5 py-1 font-mono text-xs" /></label>
        <label class="flex flex-col gap-0.5 text-[10px] font-bold">Y<input data-num="y" type="number" value="${sel.y}" class="bg-[#F8F6F0] border border-[#111111] rounded-md px-1.5 py-1 font-mono text-xs" /></label>
        <label class="flex flex-col gap-0.5 text-[10px] font-bold">กว้าง<input data-num="w" type="number" min="16" value="${sel.w}" class="bg-[#F8F6F0] border border-[#111111] rounded-md px-1.5 py-1 font-mono text-xs" /></label>
        <label class="flex flex-col gap-0.5 text-[10px] font-bold">สูง<input data-num="h" type="number" min="4" value="${sel.h}" class="bg-[#F8F6F0] border border-[#111111] rounded-md px-1.5 py-1 font-mono text-xs" /></label>
      </div>

      <!-- Typography & Border Style -->
      <div class="grid grid-cols-2 gap-2">
        <label class="flex flex-col gap-0.5 text-xs font-bold">ขนาดอักษร
          <input data-num="fontSize" type="number" min="10" max="96" value="${sel.fontSize || 16}" class="bg-[#F8F6F0] border border-[#111111] rounded-md px-2 py-1 font-mono text-xs" />
        </label>
        <label class="flex flex-col gap-0.5 text-xs font-bold">ความหนา
          <select id="insp-weight" class="bg-[#F8F6F0] border border-[#111111] rounded-md px-1.5 py-1 text-xs font-bold">
            <option value="500" ${sel.fontWeight === '500' ? 'selected' : ''}>ปกติ</option>
            <option value="700" ${sel.fontWeight === '700' ? 'selected' : ''}>หนา</option>
            <option value="900" ${sel.fontWeight === '900' ? 'selected' : ''}>หนามาก</option>
          </select>
        </label>
        <label class="flex flex-col gap-0.5 text-xs font-bold">ความมนมุม
          <input data-num="radius" type="number" min="0" max="999" value="${sel.radius || 0}" class="bg-[#F8F6F0] border border-[#111111] rounded-md px-2 py-1 font-mono text-xs" />
        </label>
        <label class="flex flex-col gap-0.5 text-xs font-bold">เส้นขอบ (px)
          <input data-num="borderWidth" type="number" min="0" max="12" value="${sel.borderWidth || 0}" class="bg-[#F8F6F0] border border-[#111111] rounded-md px-2 py-1 font-mono text-xs" />
        </label>
      </div>

      <div class="grid grid-cols-2 gap-2">
        <div class="flex flex-col gap-1">
          <span class="text-xs font-bold">จัดข้อความ</span>
          <div class="grid grid-cols-3 gap-1">
            ${['left', 'center', 'right'].map((al) => `<button type="button" data-align="${al}" class="py-1 rounded-md border border-[#111111] text-[11px] font-bold cursor-pointer ${sel.align === al ? 'bg-[#111111] text-[#F4D03F]' : 'bg-white'}">${al === 'left' ? 'ซ้าย' : al === 'center' ? 'กลาง' : 'ขวา'}</button>`).join('')}
          </div>
        </div>
        <label class="flex flex-col gap-1 text-xs font-bold">เงา (Shadow)
          <select id="insp-shadow" class="bg-[#F8F6F0] border border-[#111111] rounded-md px-1.5 py-1 text-xs font-bold">
            <option value="none" ${sel.shadow === 'none' ? 'selected' : ''}>ไม่มี</option>
            <option value="soft" ${sel.shadow === 'soft' ? 'selected' : ''}>นุ่ม (Soft)</option>
            <option value="brutal" ${sel.shadow === 'brutal' ? 'selected' : ''}>ขอบเข้ม (Brutal)</option>
          </select>
        </label>
      </div>

      <div class="grid grid-cols-2 gap-1.5 pt-2 border-t-2 border-dashed border-[#111111]/15">
        <button type="button" id="insp-front" class="btn-vox bg-white hover:bg-[#F8F6F0] py-1.5 rounded-lg text-xs font-bold cursor-pointer">ไว้บนสุด</button>
        <button type="button" id="insp-back" class="btn-vox bg-white hover:bg-[#F8F6F0] py-1.5 rounded-lg text-xs font-bold cursor-pointer">ไว้ล่างสุด</button>
        <button type="button" id="insp-dup" class="btn-vox bg-[#F4D03F] hover:bg-[#f2c61d] py-1.5 rounded-lg text-xs font-black cursor-pointer">ทำซ้ำ</button>
        <button type="button" id="insp-del" class="btn-vox bg-[#E74C3C] text-white py-1.5 rounded-lg text-xs font-black cursor-pointer">ลบชิ้นนี้</button>
      </div>
    `;

    const refreshActiveNode = () => {
      const idx = state.elements.findIndex((x) => x.id === sel.id);
      const node = nodeMap.get(sel.id);
      if (node && idx >= 0) {
        applyNodeStyle(node, sel, idx, true, editingId === sel.id);
        applyNodeContent(node, sel, editingId === sel.id);
      }
      scheduleSave();
    };

    document.getElementById('insp-deselect')?.addEventListener('click', () => { selectedId = null; syncCanvasStage(); renderLayers(); renderInspector(); });
    document.getElementById('insp-img-upload')?.addEventListener('click', () => hiddenImgInput?.click());
    document.getElementById('insp-img-clear')?.addEventListener('click', () => { pushHistory(); sel.imageSrc = ''; refreshActiveNode(); renderInspector(); });
    document.getElementById('insp-img-url')?.addEventListener('change', (e) => {
      const clean = window.VoxSecurity ? window.VoxSecurity.sanitizeUrl(e.target.value) : e.target.value.trim();
      pushHistory();
      sel.imageSrc = clean;
      refreshActiveNode();
      renderInspector();
    });
    document.getElementById('insp-text')?.addEventListener('input', (e) => { sel.text = e.target.value; refreshActiveNode(); renderLayers(); });
    document.getElementById('insp-note')?.addEventListener('input', (e) => { sel.note = e.target.value; scheduleSave(); });

    inspectorEl.querySelectorAll('[data-fill-swatch]').forEach((b) => {
      b.addEventListener('click', () => { pushHistory(); sel.bg = b.dataset.fillSwatch; refreshActiveNode(); renderInspector(); });
    });
    document.getElementById('insp-bg')?.addEventListener('input', (e) => { sel.bg = e.target.value; refreshActiveNode(); });
    document.getElementById('insp-bg-clear')?.addEventListener('click', () => { pushHistory(); sel.bg = 'transparent'; refreshActiveNode(); renderInspector(); });
    document.getElementById('insp-color')?.addEventListener('input', (e) => { sel.color = e.target.value; refreshActiveNode(); });
    document.getElementById('insp-border-color')?.addEventListener('input', (e) => { sel.borderColor = e.target.value; refreshActiveNode(); });

    inspectorEl.querySelectorAll('[data-num]').forEach((inp) => {
      inp.addEventListener('input', () => {
        sel[inp.dataset.num] = Number(inp.value) || 0;
        refreshActiveNode();
      });
    });

    document.getElementById('insp-weight')?.addEventListener('change', (e) => { pushHistory(); sel.fontWeight = e.target.value; refreshActiveNode(); });
    document.getElementById('insp-shadow')?.addEventListener('change', (e) => { pushHistory(); sel.shadow = e.target.value; refreshActiveNode(); });
    inspectorEl.querySelectorAll('[data-align]').forEach((btn) => {
      btn.addEventListener('click', () => { pushHistory(); sel.align = btn.dataset.align; refreshActiveNode(); renderInspector(); });
    });
    document.getElementById('insp-front')?.addEventListener('click', () => {
      pushHistory();
      state.elements = [...state.elements.filter((x) => x.id !== sel.id), sel];
      syncCanvasStage();
      renderLayers();
      scheduleSave();
    });
    document.getElementById('insp-back')?.addEventListener('click', () => {
      pushHistory();
      state.elements = [sel, ...state.elements.filter((x) => x.id !== sel.id)];
      syncCanvasStage();
      renderLayers();
      scheduleSave();
    });
    document.getElementById('insp-dup')?.addEventListener('click', duplicateSelected);
    document.getElementById('insp-del')?.addEventListener('click', deleteSelected);
  }

  function renderAll(animateNewId = null) {
    syncCanvasStage(animateNewId);
    renderLayers();
    renderInspector();
  }

  function duplicateSelected() {
    const sel = getSelected();
    if (!sel) return;
    pushHistory();
    const copy = { ...sel, id: uid(), x: sel.x + 24, y: sel.y + 24, locked: false };
    state.elements.push(copy);
    selectedId = copy.id;
    renderAll(copy.id);
    scheduleSave();
  }

  function deleteSelected() {
    const sel = getSelected();
    if (!sel || sel.locked) return;
    pushHistory();
    state.elements = state.elements.filter((e) => e.id !== sel.id);
    selectedId = state.elements[state.elements.length - 1]?.id || null;
    renderAll();
    scheduleSave();
  }

  // Image Upload
  hiddenImgInput?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    const sel = getSelected();
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
        scheduleSave();
      };
      img.src = String(reader.result || '');
    };
    reader.readAsDataURL(file);
  });

  // Left Panel Add Buttons
  document.querySelectorAll('.tool-btn').forEach((btn) => {
    btn.addEventListener('click', () => setTool(btn.dataset.tool));
  });

  document.querySelectorAll('[data-add-item]').forEach((btn) => {
    btn.addEventListener('click', () => {
      pushHistory();
      const el = createDefaultElement(btn.dataset.addItem);
      state.elements.push(el);
      selectedId = el.id;
      setTool('select');
      renderAll(el.id);
      scheduleSave();
    });
  });

  document.getElementById('clear-canvas-btn')?.addEventListener('click', () => {
    if (!state.elements.length) return;
    pushHistory();
    state.elements = [];
    selectedId = null;
    renderAll();
    scheduleSave();
  });

  // ========================================================================
  // 60/120FPS POINTER INTERACTION (REQUESTANIMATIONFRAME + PERSISTENT NODES)
  // ========================================================================
  let pointerOp = null;
  let rafId = null;

  function toCanvasCoords(clientX, clientY) {
    const rect = canvasEl.getBoundingClientRect();
    return {
      x: (clientX - rect.left) / zoom,
      y: (clientY - rect.top) / zoom
    };
  }

  function computeSnap(movingRect, ignoreId) {
    if (!snapEnabled) return { dx: 0, dy: 0, guides: [] };
    const vpW = VIEWPORTS[state.viewport]?.width || 1024;
    const targetsX = [0, vpW / 2, vpW];
    const targetsY = [0, state.canvasHeight / 2, state.canvasHeight];
    for (let i = 0; i < state.elements.length; i++) {
      const other = state.elements[i];
      if (other.id === ignoreId || !other.visible) continue;
      targetsX.push(other.x, other.x + other.w / 2, other.x + other.w);
      targetsY.push(other.y, other.y + other.h / 2, other.y + other.h);
    }

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
    const node = nodeMap.get(editingId);
    const dom = node?.querySelector('.el-text-inner');
    if (el && dom && commit) {
      const nextText = dom.innerText;
      if (nextText !== el.text) {
        pushHistory();
        el.text = nextText;
        scheduleSave();
      }
    }
    const prevId = editingId;
    editingId = null;
    if (node && el) {
      applyNodeContent(node, el, false);
    }
    if (prevId) renderAll();
  }

  workspaceEl?.addEventListener('pointerdown', (e) => {
    if (editingId && !e.target.closest(`[data-el-id="${editingId}"]`)) {
      finishInlineEdit(true);
    }

    if (spaceHeld || activeTool === 'hand') {
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

    const handle = e.target.closest('.resize-handle');
    const card = e.target.closest('.canvas-el');

    if (handle && card) {
      const el = state.elements.find((item) => item.id === card.dataset.elId);
      if (!el || el.locked) return;
      card.classList.add('is-dragging');
      pointerOp = {
        mode: 'resize',
        dir: handle.dataset.dir,
        el,
        node: card,
        startX: pt.x,
        startY: pt.y,
        orig: { x: el.x, y: el.y, w: el.w, h: el.h },
        moved: false
      };
      e.preventDefault();
      return;
    }

    if (card) {
      const id = card.dataset.elId;
      if (editingId === id) return;
      if (selectedId !== id) {
        selectedId = id;
        syncCanvasStage();
        renderLayers();
        renderInspector();
      }
      const el = state.elements.find((item) => item.id === id);
      if (!el || el.locked) return;
      card.classList.add('is-dragging');
      pointerOp = {
        mode: 'move',
        el,
        node: card,
        startX: pt.x,
        startY: pt.y,
        origX: el.x,
        origY: el.y,
        moved: false
      };
      e.preventDefault();
      return;
    }

    if (selectedId !== null) {
      selectedId = null;
      syncCanvasStage();
      renderLayers();
      renderInspector();
    }
  });

  window.addEventListener('pointermove', (e) => {
    if (!pointerOp) return;
    const clientX = e.clientX;
    const clientY = e.clientY;
    const shiftKey = e.shiftKey;

    if (pointerOp.mode === 'pan') {
      workspaceEl.scrollLeft = pointerOp.scrollLeft - (clientX - pointerOp.startX);
      workspaceEl.scrollTop = pointerOp.scrollTop - (clientY - pointerOp.startY);
      return;
    }

    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(() => {
      rafId = null;
      if (!pointerOp) return;
      const pt = toCanvasCoords(clientX, clientY);
      const vpW = VIEWPORTS[state.viewport]?.width || 1024;

      if (pointerOp.mode === 'move') {
        const { el, node } = pointerOp;
        const dx = pt.x - pointerOp.startX;
        const dy = pt.y - pointerOp.startY;
        if (!pointerOp.moved && (Math.abs(dx) > 2 || Math.abs(dy) > 2)) {
          pushHistory();
          pointerOp.moved = true;
        }
        const snapRes = computeSnap({ x: pointerOp.origX + dx, y: pointerOp.origY + dy, w: el.w, h: el.h }, el.id);
        el.x = clamp(Math.round(pointerOp.origX + dx + snapRes.dx), 0, Math.max(0, vpW - el.w));
        el.y = clamp(Math.round(pointerOp.origY + dy + snapRes.dy), 0, Math.max(0, state.canvasHeight - el.h));
        node.style.left = `${el.x}px`;
        node.style.top = `${el.y}px`;
        renderGuides(snapRes.guides);
        return;
      }

      if (pointerOp.mode === 'resize') {
        const { el, node, orig, dir } = pointerOp;
        const dx = pt.x - pointerOp.startX;
        const dy = pt.y - pointerOp.startY;
        if (!pointerOp.moved && (Math.abs(dx) > 2 || Math.abs(dy) > 2)) {
          pushHistory();
          pointerOp.moved = true;
        }
        let nextX = orig.x;
        let nextY = orig.y;
        let nextW = orig.w;
        let nextH = orig.h;

        if (dir.includes('e')) nextW = Math.max(16, Math.round(orig.w + dx));
        if (dir.includes('s')) nextH = Math.max(4, Math.round(orig.h + dy));
        if (dir.includes('w')) {
          nextX = clamp(Math.round(orig.x + dx), 0, orig.x + orig.w - 16);
          nextW = orig.x + orig.w - nextX;
        }
        if (dir.includes('n')) {
          nextY = clamp(Math.round(orig.y + dy), 0, orig.y + orig.h - 4);
          nextH = orig.y + orig.h - nextY;
        }
        if (shiftKey && orig.h > 0 && dir.length === 2) {
          nextH = Math.max(12, Math.round(nextW / (orig.w / orig.h)));
        }

        el.x = nextX;
        el.y = nextY;
        el.w = clamp(nextW, 16, vpW - el.x);
        el.h = clamp(nextH, 4, state.canvasHeight - el.y);
        node.style.left = `${el.x}px`;
        node.style.top = `${el.y}px`;
        node.style.width = `${el.w}px`;
        node.style.height = `${el.h}px`;
      }
    });
  });

  window.addEventListener('pointerup', () => {
    if (!pointerOp) return;
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    if (pointerOp.node) pointerOp.node.classList.remove('is-dragging');
    renderGuides([]);
    if (pointerOp.mode === 'pan') {
      updateCursor();
    } else if (pointerOp.moved) {
      renderInspector();
      scheduleSave();
    }
    pointerOp = null;
  });

  // Inline Text Editing on Double-Click
  canvasEl?.addEventListener('dblclick', (e) => {
    const card = e.target.closest('.canvas-el');
    if (!card) return;
    const el = state.elements.find((item) => item.id === card.dataset.elId);
    if (!el || el.locked || el.type === 'line' || el.type === 'image') return;
    editingId = el.id;
    selectedId = el.id;
    applyNodeStyle(card, el, state.elements.indexOf(el), true, true);
    applyNodeContent(card, el, true);
    const inner = card.querySelector('.el-text-inner');
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

  // Top Bar Controls
  pageTitleInput?.addEventListener('input', (e) => { state.pageTitle = e.target.value; scheduleSave(); });

  document.querySelectorAll('.vp-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.viewport = btn.dataset.vp;
      syncCanvasStage();
      scheduleSave();
    });
  });

  document.getElementById('zoom-in-btn')?.addEventListener('click', () => { zoom = clamp(Math.round((zoom + 0.1) * 10) / 10, 0.4, 1.8); syncCanvasStage(); });
  document.getElementById('zoom-out-btn')?.addEventListener('click', () => { zoom = clamp(Math.round((zoom - 0.1) * 10) / 10, 0.4, 1.8); syncCanvasStage(); });
  document.getElementById('zoom-reset-btn')?.addEventListener('click', () => { zoom = 1; syncCanvasStage(); });

  workspaceEl?.addEventListener('wheel', (e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      zoom = clamp(Math.round((zoom + (e.deltaY < 0 ? 0.1 : -0.1)) * 10) / 10, 0.4, 1.8);
      syncCanvasStage();
    }
  }, { passive: false });

  const snapBtn = document.getElementById('toggle-snap-btn');
  snapBtn?.addEventListener('click', () => {
    snapEnabled = !snapEnabled;
    snapBtn.textContent = snapEnabled ? 'Snap: ON' : 'Snap: OFF';
    snapBtn.classList.toggle('bg-[#F4D03F]', snapEnabled);
    snapBtn.classList.toggle('bg-white', !snapEnabled);
    syncCanvasStage();
  });

  document.getElementById('template-select')?.addEventListener('change', (e) => {
    const val = e.target.value;
    if (!val) return;
    pushHistory();
    state = makeStarterTemplate(val);
    selectedId = state.elements[0]?.id || null;
    e.target.value = '';
    renderAll();
    scheduleSave();
  });

  function undo() {
    if (!history.length) return;
    redoStack.push(JSON.stringify(state));
    state = JSON.parse(history.pop());
    if (!state.elements.some((e) => e.id === selectedId)) selectedId = null;
    syncHistoryButtons();
    renderAll();
    scheduleSave();
  }

  function redo() {
    if (!redoStack.length) return;
    history.push(JSON.stringify(state));
    state = JSON.parse(redoStack.pop());
    if (!state.elements.some((e) => e.id === selectedId)) selectedId = null;
    syncHistoryButtons();
    renderAll();
    scheduleSave();
  }

  undoBtn?.addEventListener('click', undo);
  redoBtn?.addEventListener('click', redo);

  window.addEventListener('keydown', (e) => {
    if (editingId || e.target.closest('input, textarea, select')) return;
    if (e.code === 'Space' && !spaceHeld) {
      spaceHeld = true;
      updateCursor();
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
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (selectedId) {
        e.preventDefault();
        deleteSelected();
      }
      return;
    }
    if (e.key.toLowerCase() === 'v') { setTool('select'); return; }
    if (e.key.toLowerCase() === 'h') { setTool('hand'); return; }

    const sel = getSelected();
    if (sel && !sel.locked && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault();
      const step = e.shiftKey ? 12 : 2;
      if (e.key === 'ArrowLeft') sel.x = Math.max(0, sel.x - step);
      if (e.key === 'ArrowRight') sel.x += step;
      if (e.key === 'ArrowUp') sel.y = Math.max(0, sel.y - step);
      if (e.key === 'ArrowDown') sel.y += step;
      syncCanvasStage();
      renderInspector();
      scheduleSave();
    }
  });

  window.addEventListener('keyup', (e) => {
    if (e.code === 'Space' && spaceHeld) {
      spaceHeld = false;
      updateCursor();
    }
  });

  // ========================================================================
  // AI PROMPT / HTML / JSON EXPORT & 1-CLICK COPY
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
      `Please build this web page cleanly using HTML and Tailwind CSS (or React/Next.js) matching the layout, texts, shapes, and colors below.`,
      ``,
      `## Page Overview`,
      `- **Title:** ${state.pageTitle || 'My Landing Page'}`,
      `- **Goal / Context:** ${state.pageGoal || 'Modern responsive web page'}`,
      `- **Target Viewport:** ${vp.label} (${vp.width} x ${state.canvasHeight} px)`,
      `- **Background Color:** \`${state.canvasBg || '#FFFFFF'}\``,
      `- **Color Palette:** ${usedColors.map((c) => `\`${c}\``).join(', ')}`,
      ``,
      `## Elements (${visibleEls.length} layers, back-to-front)`
    ];

    visibleEls.forEach((el, idx) => {
      const textInfo = el.text ? ` | Text: "${el.text.replace(/\n/g, ' \\n ')}"` : '';
      const noteInfo = el.note ? ` | Role: ${el.note}` : '';
      lines.push(
        `${idx + 1}. **[${el.type.toUpperCase()}]**${noteInfo}${textInfo}` +
        `\n   - Position & Size: \`x:${el.x}, y:${el.y}, w:${el.w}, h:${el.h}\`` +
        `\n   - Style: \`bg:${el.bg}, color:${el.color}, border:${el.borderWidth}px ${el.borderColor}, radius:${el.radius}px, font:${el.fontSize}px/${el.fontWeight}, align:${el.align}, shadow:${el.shadow}\``
      );
    });

    return lines.join('\n');
  }

  function buildHtmlOutput() {
    const vp = VIEWPORTS[state.viewport] || VIEWPORTS.desktop;
    const bodyEls = state.elements.filter((e) => e.visible).map((el) => {
      const border = el.borderWidth > 0 ? `${el.borderWidth}px solid ${el.borderColor}` : 'none';
      const justify = el.align === 'center' ? 'center' : (el.align === 'right' ? 'flex-end' : 'flex-start');
      const style = `position:absolute;left:${el.x}px;top:${el.y}px;width:${el.w}px;height:${el.h}px;background:${el.bg};color:${el.color};border:${border};border-radius:${el.radius}px;box-shadow:${shadowCss(el.shadow)};font-size:${el.fontSize}px;font-weight:${el.fontWeight};text-align:${el.align};display:flex;align-items:center;justify-content:${justify};padding:${el.type === 'line' || (el.type === 'image' && el.imageSrc) ? '0' : '6px 12px'};`;
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

  // 1-Click Top-Bar Copy for AI
  const quickCopyBtn = document.getElementById('quick-copy-ai-btn');
  const quickCopyLabel = document.getElementById('quick-copy-ai-label');
  quickCopyBtn?.addEventListener('click', async () => {
    const spec = buildAiPromptSpec();
    try {
      await navigator.clipboard.writeText(spec);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = spec;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    if (quickCopyLabel) {
      quickCopyLabel.textContent = '✓ คัดลอกให้ AI แล้ว!';
      setTimeout(() => { quickCopyLabel.textContent = 'Copy for AI'; }, 1800);
    }
  });

  // Export / Import Modal
  const exportModal = document.getElementById('export-modal');
  const exportOutput = document.getElementById('export-output');
  const exportStatus = document.getElementById('export-copy-status');
  const applyJsonBtn = document.getElementById('apply-json-btn');

  function updateExportContent() {
    if (!exportOutput) return;
    const isJson = activeExportTab === 'json';
    exportOutput.readOnly = !isJson;
    if (applyJsonBtn) applyJsonBtn.classList.toggle('hidden', !isJson);
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
    } catch {
      exportOutput.select();
      document.execCommand('copy');
    }
    if (exportStatus) {
      exportStatus.textContent = '✓ คัดลอกแล้ว! นำไปวางให้ AI ได้เลย';
      setTimeout(() => {
        exportStatus.textContent = 'คัดลอกไปวางให้ AI หรือแก้ไข JSON แล้วกดโหลดดีไซน์ได้';
      }, 2200);
    }
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

  function loadDesignJsonString(rawStr) {
    try {
      const parsed = JSON.parse(rawStr);
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
      selectedId = state.elements[0]?.id || null;
      renderAll();
      scheduleSave();
      exportModal?.classList.add('hidden');
      exportModal?.classList.remove('flex');
    } catch {
      alert('ข้อมูล JSON ไม่ถูกต้อง');
    }
  }

  applyJsonBtn?.addEventListener('click', () => {
    if (exportOutput) loadDesignJsonString(exportOutput.value);
  });

  document.getElementById('import-file-input')?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => loadDesignJsonString(String(reader.result || ''));
    reader.readAsText(file);
  });

  setTool('select');
  renderAll();
  syncHistoryButtons();
})();
