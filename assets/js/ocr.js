/* HelpDai OpenThai2.1-OCR — 100% Client-Side Browser Runner (onnxruntime-web + CacheStorage) */
(() => {
  const HF_BASE = 'https://huggingface.co/iapp/OpenThai2.1-OCR-Text-20261118/resolve/main';
  const CACHE_NAME = 'helpdai-openthai-ocr-v2.1';
  const MODEL_FILES = [
    { name: 'det.onnx', url: `${HF_BASE}/det.onnx`, approxBytes: 1780590 },
    { name: 'rec.onnx', url: `${HF_BASE}/rec.onnx`, approxBytes: 2392837 },
    { name: 'rec_dict.txt', url: `${HF_BASE}/rec_dict.txt`, approxBytes: 1783 }
  ];

  const modelBadge = document.getElementById('ocr-model-badge');
  const dlModelBtn = document.getElementById('ocr-download-model-btn');
  const clearModelBtn = document.getElementById('ocr-clear-model-btn');
  const dlBarWrap = document.getElementById('ocr-dl-bar-wrap');
  const dlLabel = document.getElementById('ocr-dl-label');
  const dlPct = document.getElementById('ocr-dl-pct');
  const dlFill = document.getElementById('ocr-dl-fill');

  const dropzone = document.getElementById('ocr-dropzone');
  const fileInput = document.getElementById('ocr-file-input');
  const emptyHint = document.getElementById('ocr-empty-hint');
  const queueGrid = document.getElementById('ocr-queue-grid');
  const queueCountEl = document.getElementById('ocr-queue-count');
  const clearImgsBtn = document.getElementById('ocr-clear-imgs-btn');
  const scanBtn = document.getElementById('ocr-scan-btn');
  const errBox = document.getElementById('ocr-error-box');
  const outputEl = document.getElementById('ocr-output');
  const lineCountEl = document.getElementById('ocr-line-count');
  const copyBtn = document.getElementById('ocr-copy-btn');
  const downloadBtn = document.getElementById('ocr-download-btn');

  let detSession = null;
  let recSession = null;
  let recChars = null;
  let isDownloading = false;
  let isScanning = false;

  // Queue items: { id, name, dataUrl, status: 'pending'|'scanning'|'done'|'error', text: '' }
  const imageQueue = [];

  const esc = (v) => String(v).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function showError(msg) {
    if (!msg) {
      errBox.classList.add('hidden');
      errBox.textContent = '';
      return;
    }
    errBox.textContent = msg;
    errBox.classList.remove('hidden');
  }

  async function isModelCached() {
    if (!('caches' in window)) return false;
    try {
      const cache = await caches.open(CACHE_NAME);
      const checks = await Promise.all(MODEL_FILES.map(f => cache.match(f.url)));
      return checks.every(Boolean);
    } catch (_) {
      return false;
    }
  }

  async function syncModelStatusUI() {
    const readyInMem = Boolean(detSession && recSession && recChars);
    const cached = readyInMem || (await isModelCached());
    if (readyInMem) {
      modelBadge.textContent = '✓ โมเดลพร้อมใช้งาน (ในเครื่อง)';
      modelBadge.className = 'bg-[#10B981] text-white border-2 border-[#111111] px-3 py-1 rounded-xl font-display font-extrabold text-xs shadow-[2px_2px_0px_#111111]';
      dlModelBtn.classList.add('hidden');
      clearModelBtn.classList.remove('hidden');
    } else if (cached) {
      modelBadge.textContent = '✓ แคชโมเดลพร้อม (4.2 MB)';
      modelBadge.className = 'bg-[#F4D03F] text-[#111111] border-2 border-[#111111] px-3 py-1 rounded-xl font-display font-extrabold text-xs shadow-[2px_2px_0px_#111111]';
      dlModelBtn.classList.add('hidden');
      clearModelBtn.classList.remove('hidden');
    } else {
      modelBadge.textContent = 'ยังไม่ได้โหลดโมเดล (~4.2 MB)';
      modelBadge.className = 'bg-white text-[#111111] border-2 border-[#111111] px-3 py-1 rounded-xl font-display font-extrabold text-xs shadow-[2px_2px_0px_#111111]';
      dlModelBtn.classList.remove('hidden');
      clearModelBtn.classList.add('hidden');
    }
  }

  async function fetchWithProgress(url, onBytes) {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) throw new Error(`ดาวน์โหลดโมเดลไม่สำเร็จ (${res.status})`);
    if (!res.body) {
      const buf = new Uint8Array(await res.arrayBuffer());
      onBytes(buf.byteLength);
      return buf;
    }
    const reader = res.body.getReader();
    const chunks = [];
    let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      total += value.byteLength;
      onBytes(value.byteLength);
    }
    const merged = new Uint8Array(total);
    let offset = 0;
    for (const c of chunks) {
      merged.set(c, offset);
      offset += c.byteLength;
    }
    return merged;
  }

  async function ensureModelLoaded() {
    if (detSession && recSession && recChars) return;
    if (typeof window.ort === 'undefined') {
      throw new Error('กำลังโหลด onnxruntime-web กรุณารอสักครู่แล้วลองใหม่');
    }
    if (isDownloading) return;
    isDownloading = true;
    showError('');

    try {
      const cache = ('caches' in window) ? await caches.open(CACHE_NAME) : null;
      const totalExpected = MODEL_FILES.reduce((a, b) => a + b.approxBytes, 0);
      let loadedBytes = 0;

      const updateDlUi = (label) => {
        const pct = Math.min(99, Math.round((loadedBytes / totalExpected) * 100));
        dlBarWrap.classList.remove('hidden');
        dlBarWrap.classList.add('flex');
        dlLabel.textContent = label;
        dlPct.textContent = `${pct}%`;
        dlFill.style.width = `${pct}%`;
      };

      const fileBuffers = {};
      for (const mf of MODEL_FILES) {
        const cachedRes = cache ? await cache.match(mf.url) : null;
        if (cachedRes) {
          const buf = new Uint8Array(await cachedRes.arrayBuffer());
          fileBuffers[mf.name] = buf;
          loadedBytes += buf.byteLength;
          updateDlUi(`โหลดจากแคช: ${mf.name}`);
        } else {
          updateDlUi(`กำลังดาวน์โหลด: ${mf.name}...`);
          const buf = await fetchWithProgress(mf.url, (delta) => {
            loadedBytes += delta;
            updateDlUi(`กำลังดาวน์โหลด: ${mf.name}...`);
          });
          fileBuffers[mf.name] = buf;
          if (cache) {
            await cache.put(mf.url, new Response(buf, { headers: { 'Content-Type': 'application/octet-stream' } }));
          }
        }
      }

      dlLabel.textContent = 'กำลังเตรียมเอนจิน ONNX WebAssembly...';
      dlPct.textContent = '100%';
      dlFill.style.width = '100%';

      window.ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.20.1/dist/';
      window.ort.env.wasm.numThreads = 1;

      detSession = await window.ort.InferenceSession.create(fileBuffers['det.onnx'], { executionProviders: ['wasm'] });
      recSession = await window.ort.InferenceSession.create(fileBuffers['rec.onnx'], { executionProviders: ['wasm'] });
      const dictText = new TextDecoder('utf-8').decode(fileBuffers['rec_dict.txt']);
      const chars = dictText.split(/\r?\n/).filter(Boolean);
      recChars = ['', ...chars, ' '];

      setTimeout(() => {
        dlBarWrap.classList.add('hidden');
        dlBarWrap.classList.remove('flex');
      }, 450);
      await syncModelStatusUI();
    } finally {
      isDownloading = false;
    }
  }

  // ========================================================================
  // PURE JS + CANVAS2D OPENTHAI2.1-OCR PIPELINE (DET + REC + CTC)
  // ========================================================================
  function loadHtmlImage(dataUrl) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('ไม่สามารถอ่านไฟล์ภาพได้'));
      img.src = dataUrl;
    });
  }

  function extractConnectedLineBoxes(prob, w, h, thresh = 0.25, boxThresh = 0.45, unclipRatio = 1.45) {
    const visited = new Uint8Array(w * h);
    const boxes = [];
    const stack = new Int32Array(w * h);

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const startIdx = y * w + x;
        if (visited[startIdx] || prob[startIdx] <= thresh) continue;

        let sp = 0;
        stack[sp++] = startIdx;
        visited[startIdx] = 1;

        let minX = x, maxX = x, minY = y, maxY = y;
        let area = 0;
        let probSum = 0;

        while (sp > 0) {
          const idx = stack[--sp];
          const cy = (idx / w) | 0;
          const cx = idx - cy * w;
          area++;
          probSum += prob[idx];
          if (cx < minX) minX = cx;
          if (cx > maxX) maxX = cx;
          if (cy < minY) minY = cy;
          if (cy > maxY) maxY = cy;

          if (cx > 0 && !visited[idx - 1] && prob[idx - 1] > thresh) { visited[idx - 1] = 1; stack[sp++] = idx - 1; }
          if (cx + 1 < w && !visited[idx + 1] && prob[idx + 1] > thresh) { visited[idx + 1] = 1; stack[sp++] = idx + 1; }
          if (cy > 0 && !visited[idx - w] && prob[idx - w] > thresh) { visited[idx - w] = 1; stack[sp++] = idx - w; }
          if (cy + 1 < h && !visited[idx + w] && prob[idx + w] > thresh) { visited[idx + w] = 1; stack[sp++] = idx + w; }
        }

        const bw = maxX - minX + 1;
        const bh = maxY - minY + 1;
        if (bw < 3 || bh < 3 || (probSum / area) < boxThresh) continue;

        // DBNet unclip expansion
        const rectArea = bw * bh;
        const perim = 2 * (bw + bh);
        const pad = Math.max(1, (rectArea * unclipRatio) / Math.max(1, perim));
        const ux0 = Math.max(0, minX - pad * 0.7);
        const uy0 = Math.max(0, minY - pad * 0.55);
        const ux1 = Math.min(w, maxX + 1 + pad * 0.7);
        const uy1 = Math.min(h, maxY + 1 + pad * 0.55);
        boxes.push({ x0: ux0, y0: uy0, x1: ux1, y1: uy1, cy: (uy0 + uy1) / 2, h: uy1 - uy0 });
      }
    }

    // Sort top-to-bottom, grouping same-row segments left-to-right
    boxes.sort((a, b) => a.cy - b.cy || a.x0 - b.x0);
    const rows = [];
    for (const b of boxes) {
      const lastRow = rows[rows.length - 1];
      if (lastRow && Math.abs(b.cy - lastRow.cy) <= Math.max(b.h, lastRow.h) * 0.55) {
        lastRow.items.push(b);
        lastRow.cy = lastRow.items.reduce((s, it) => s + it.cy, 0) / lastRow.items.length;
      } else {
        rows.push({ cy: b.cy, h: b.h, items: [b] });
      }
    }
    const sorted = [];
    for (const r of rows) {
      r.items.sort((a, b) => a.x0 - b.x0);
      sorted.push(...r.items);
    }
    return sorted;
  }

  async function runOcrOnImage(dataUrl) {
    await ensureModelLoaded();
    const img = await loadHtmlImage(dataUrl);
    const srcW = img.naturalWidth || img.width;
    const srcH = img.naturalHeight || img.height;

    const maxSide = 960;
    const scale = Math.min(1, maxSide / Math.max(srcW, srcH));
    const detW = Math.max(32, Math.round((srcW * scale) / 32) * 32);
    const detH = Math.max(32, Math.round((srcH * scale) / 32) * 32);

    const detCanvas = document.createElement('canvas');
    detCanvas.width = detW;
    detCanvas.height = detH;
    const detCtx = detCanvas.getContext('2d');
    detCtx.fillStyle = '#FFFFFF';
    detCtx.fillRect(0, 0, detW, detH);
    detCtx.drawImage(img, 0, 0, detW, detH);

    const rgba = detCtx.getImageData(0, 0, detW, detH).data;
    const detInput = new Float32Array(3 * detH * detW);
    const plane = detH * detW;
    const mean = [0.485, 0.456, 0.406];
    const std = [0.229, 0.224, 0.225];
    for (let i = 0; i < plane; i++) {
      const p = i * 4;
      // BGR order
      detInput[i] = (rgba[p + 2] / 255 - mean[0]) / std[0];
      detInput[plane + i] = (rgba[p + 1] / 255 - mean[1]) / std[1];
      detInput[2 * plane + i] = (rgba[p] / 255 - mean[2]) / std[2];
    }

    const detTensor = new window.ort.Tensor('float32', detInput, [1, 3, detH, detW]);
    const detOut = await detSession.run({ [detSession.inputNames[0]]: detTensor });
    const probMap = detOut[detSession.outputNames[0]].data;

    const detBoxes = extractConnectedLineBoxes(probMap, detW, detH);
    const scaleX = srcW / detW;
    const scaleY = srcH / detH;

    const cropCanvas = document.createElement('canvas');
    const cropCtx = cropCanvas.getContext('2d');
    const lines = [];

    for (const box of detBoxes) {
      const sx = Math.max(0, Math.floor(box.x0 * scaleX));
      const sy = Math.max(0, Math.floor(box.y0 * scaleY));
      const sw = Math.max(1, Math.min(srcW - sx, Math.ceil((box.x1 - box.x0) * scaleX)));
      const sh = Math.max(1, Math.min(srcH - sy, Math.ceil((box.y1 - box.y0) * scaleY)));

      const recH = 48;
      const targetW = Math.max(16, Math.round(sw * (recH / sh)));
      const recW = Math.min(2048, Math.max(32, Math.ceil(targetW / 8) * 8));

      cropCanvas.width = recW;
      cropCanvas.height = recH;
      cropCtx.fillStyle = '#FFFFFF';
      cropCtx.fillRect(0, 0, recW, recH);
      cropCtx.drawImage(img, sx, sy, sw, sh, 0, 0, Math.min(recW, targetW), recH);

      const cData = cropCtx.getImageData(0, 0, recW, recH).data;
      const recInput = new Float32Array(3 * recH * recW);
      const rPlane = recH * recW;
      for (let i = 0; i < rPlane; i++) {
        const p = i * 4;
        recInput[i] = (cData[p + 2] / 255 - 0.5) / 0.5;
        recInput[rPlane + i] = (cData[p + 1] / 255 - 0.5) / 0.5;
        recInput[2 * rPlane + i] = (cData[p] / 255 - 0.5) / 0.5;
      }

      const recTensor = new window.ort.Tensor('float32', recInput, [1, 3, recH, recW]);
      const recOut = await recSession.run({ [recSession.inputNames[0]]: recTensor });
      const outTensor = recOut[recSession.outputNames[0]];
      const dims = outTensor.dims; // [1, T, C]
      const T = dims[1];
      const C = dims[2];
      const logits = outTensor.data;

      let text = '';
      let prevId = -1;
      for (let t = 0; t < T; t++) {
        let bestId = 0;
        let bestVal = logits[t * C];
        for (let c = 1; c < C; c++) {
          const v = logits[t * C + c];
          if (v > bestVal) {
            bestVal = v;
            bestId = c;
          }
        }
        if (bestId !== 0 && bestId !== prevId && bestId < recChars.length) {
          text += recChars[bestId];
        }
        prevId = bestId;
      }
      const trimmed = text.trim();
      if (trimmed) lines.push(trimmed);
    }

    return lines;
  }

  // ========================================================================
  // MULTI-IMAGE QUEUE UI
  // ========================================================================
  function renderQueue() {
    const count = imageQueue.length;
    queueCountEl.textContent = `คิวรูปภาพ (${count} รูป)`;
    clearImgsBtn.classList.toggle('hidden', count === 0);
    emptyHint.classList.toggle('hidden', count > 0);
    queueGrid.classList.toggle('hidden', count === 0);
    queueGrid.classList.toggle('grid', count > 0);
    scanBtn.disabled = count === 0 || isScanning;
    scanBtn.textContent = isScanning
      ? 'กำลังสแกนข้อความ...'
      : (count > 1 ? `สแกนทั้งหมด (${count} รูป)` : 'สแกนข้อความด้วย OpenThai OCR');

    queueGrid.innerHTML = imageQueue.map((item) => {
      const badge = item.status === 'done'
        ? '<span class="bg-[#10B981] text-white px-1.5 py-0.5 rounded text-[9px] font-bold">✓ เสร็จ</span>'
        : item.status === 'scanning'
          ? '<span class="bg-[#F4D03F] text-[#111111] px-1.5 py-0.5 rounded text-[9px] font-bold animate-pulse">กำลังสแกน</span>'
          : item.status === 'error'
            ? '<span class="bg-[#E74C3C] text-white px-1.5 py-0.5 rounded text-[9px] font-bold">ผิดพลาด</span>'
            : '<span class="bg-white/90 text-[#111111] px-1.5 py-0.5 rounded text-[9px] font-bold">รอสแกน</span>';

      return `
        <div class="relative rounded-xl border-2 border-[#111111] bg-[#F8F6F0] overflow-hidden flex flex-col">
          <button type="button" data-rm-img="${item.id}" title="ลบรูปนี้" class="absolute top-1 right-1 z-10 w-5 h-5 rounded-md border border-[#111111] bg-white hover:bg-[#E74C3C] hover:text-white text-[10px] font-black flex items-center justify-center cursor-pointer">✕</button>
          <img src="${item.dataUrl}" alt="${esc(item.name)}" class="w-full h-24 object-cover border-b border-[#111111]/20" />
          <div class="px-2 py-1 flex items-center justify-between gap-1">
            <span class="text-[10px] font-bold text-[#111111] truncate">${esc(item.name)}</span>
            ${badge}
          </div>
        </div>
      `;
    }).join('');

    queueGrid.querySelectorAll('[data-rm-img]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (isScanning) return;
        const idx = imageQueue.findIndex(x => x.id === btn.dataset.rmImg);
        if (idx !== -1) imageQueue.splice(idx, 1);
        renderQueue();
      });
    });
  }

  function addFilesToQueue(fileList) {
    showError('');
    const files = Array.from(fileList || []).filter(f => f && f.type.startsWith('image/'));
    if (!files.length) {
      showError('กรุณาเลือกไฟล์รูปภาพ (PNG, JPG, WebP)');
      return;
    }
    files.forEach((file, i) => {
      const reader = new FileReader();
      reader.onload = () => {
        imageQueue.push({
          id: `${Date.now().toString(36)}-${i}-${Math.random().toString(36).slice(2, 6)}`,
          name: file.name || `image-${imageQueue.length + 1}.png`,
          dataUrl: String(reader.result || ''),
          status: 'pending',
          text: ''
        });
        renderQueue();
      };
      reader.readAsDataURL(file);
    });
  }

  function syncOutputFromQueue() {
    const completed = imageQueue.filter(it => it.status === 'done');
    const fullText = completed.length <= 1
      ? (completed[0]?.text || '')
      : completed.map(it => `=== ${it.name} ===\n${it.text}`).join('\n\n');
    outputEl.value = fullText;
    const totalLines = fullText ? fullText.split('\n').length : 0;
    lineCountEl.textContent = `ผลลัพธ์ข้อความ (${totalLines} บรรทัด)`;
  }

  fileInput?.addEventListener('change', (e) => {
    addFilesToQueue(e.target.files);
    e.target.value = '';
  });

  clearImgsBtn?.addEventListener('click', () => {
    if (isScanning) return;
    imageQueue.length = 0;
    outputEl.value = '';
    lineCountEl.textContent = 'ผลลัพธ์ข้อความ (0 บรรทัด)';
    renderQueue();
  });

  dropzone?.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('ring-4', 'ring-[#F4D03F]');
  });
  dropzone?.addEventListener('dragleave', () => {
    dropzone.classList.remove('ring-4', 'ring-[#F4D03F]');
  });
  dropzone?.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('ring-4', 'ring-[#F4D03F]');
    addFilesToQueue(e.dataTransfer?.files);
  });

  window.addEventListener('paste', (e) => {
    const items = Array.from(e.clipboardData?.items || []);
    const files = items.filter(it => it.type.startsWith('image/')).map(it => it.getAsFile()).filter(Boolean);
    if (files.length) addFilesToQueue(files);
  });

  dlModelBtn?.addEventListener('click', async () => {
    try {
      dlModelBtn.disabled = true;
      await ensureModelLoaded();
    } catch (err) {
      showError(err.message);
    } finally {
      dlModelBtn.disabled = false;
    }
  });

  clearModelBtn?.addEventListener('click', async () => {
    if ('caches' in window) await caches.delete(CACHE_NAME);
    detSession = null;
    recSession = null;
    recChars = null;
    await syncModelStatusUI();
  });

  scanBtn?.addEventListener('click', async () => {
    if (!imageQueue.length || isScanning) return;
    showError('');
    isScanning = true;
    renderQueue();
    try {
      await ensureModelLoaded();
      for (const item of imageQueue) {
        item.status = 'scanning';
        renderQueue();
        try {
          const lines = await runOcrOnImage(item.dataUrl);
          item.text = lines.join('\n');
          item.status = 'done';
        } catch (err) {
          item.status = 'error';
          showError(`${item.name}: ${err.message}`);
        }
        renderQueue();
        syncOutputFromQueue();
      }
    } catch (err) {
      showError(err.message);
    } finally {
      isScanning = false;
      renderQueue();
    }
  });

  copyBtn?.addEventListener('click', async () => {
    if (!outputEl.value) return;
    try { await navigator.clipboard.writeText(outputEl.value); } catch (_) {
      outputEl.select();
      document.execCommand('copy');
    }
    copyBtn.classList.remove('bg-[#F8F6F0]');
    copyBtn.classList.add('bg-[#F4D03F]', 'inline-flex', 'items-center', 'gap-1.5');
    copyBtn.innerHTML = `<svg class="w-3.5 h-3.5 shrink-0 text-[#111111]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg><span>Copied!</span>`;
    setTimeout(() => {
      copyBtn.classList.remove('bg-[#F4D03F]');
      copyBtn.classList.add('bg-[#F8F6F0]');
      copyBtn.textContent = 'คัดลอกข้อความ';
    }, 1800);
  });

  downloadBtn?.addEventListener('click', () => {
    if (!outputEl.value) return;
    const blob = new Blob([outputEl.value], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `openthai-ocr-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });

  syncModelStatusUI();
  renderQueue();
})();
