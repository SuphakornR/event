/* HelpDai OpenThai2.1-OCR Frontend */
(() => {
  const cfg = window.HELPDAI_CONFIG || {};
  const defaultApiBase = (!location.hostname.endsWith('github.io') && location.protocol.startsWith('http')) ? location.origin : '';
  const apiBase = (cfg.apiBase || defaultApiBase).replace(/\/$/, '');

  const statusBadge = document.getElementById('ocr-status-badge');
  const dropzone = document.getElementById('ocr-dropzone');
  const fileInput = document.getElementById('ocr-file-input');
  const emptyHint = document.getElementById('ocr-empty-hint');
  const previewImg = document.getElementById('ocr-preview-img');
  const scanBtn = document.getElementById('ocr-scan-btn');
  const errBox = document.getElementById('ocr-error-box');
  const outputEl = document.getElementById('ocr-output');
  const lineCountEl = document.getElementById('ocr-line-count');
  const copyBtn = document.getElementById('ocr-copy-btn');
  const downloadBtn = document.getElementById('ocr-download-btn');

  let currentImageData = '';

  async function checkStatus() {
    if (!apiBase) {
      statusBadge.textContent = 'ต้องรันผ่าน Node Server';
      return;
    }
    try {
      const res = await fetch(`${apiBase}/api/ocr/status`);
      const data = await res.json();
      if (data?.configured) {
        statusBadge.textContent = '✓ OpenThai OCR พร้อมใช้งาน';
        statusBadge.classList.add('bg-[#10B981]', 'text-white');
        statusBadge.classList.remove('bg-white');
      } else {
        statusBadge.textContent = 'รอตั้งค่า OCR_SERVICE_URL';
        statusBadge.classList.add('bg-[#F4D03F]');
        statusBadge.classList.remove('bg-white');
      }
    } catch (_) {
      statusBadge.textContent = 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้';
    }
  }

  function showError(msg) {
    if (!msg) {
      errBox.classList.add('hidden');
      errBox.textContent = '';
      return;
    }
    errBox.textContent = msg;
    errBox.classList.remove('hidden');
  }

  function loadImageFile(file) {
    if (!file || !file.type.startsWith('image/')) {
      showError('กรุณาเลือกไฟล์รูปภาพ (PNG, JPG, WebP)');
      return;
    }
    showError('');
    const reader = new FileReader();
    reader.onload = () => {
      currentImageData = String(reader.result || '');
      previewImg.src = currentImageData;
      previewImg.classList.remove('hidden');
      emptyHint.classList.add('hidden');
      scanBtn.disabled = false;
    };
    reader.readAsDataURL(file);
  }

  fileInput?.addEventListener('change', (e) => {
    const f = e.target.files?.[0];
    if (f) loadImageFile(f);
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
    const f = e.dataTransfer?.files?.[0];
    if (f) loadImageFile(f);
  });

  window.addEventListener('paste', (e) => {
    const items = Array.from(e.clipboardData?.items || []);
    const imgItem = items.find(it => it.type.startsWith('image/'));
    if (imgItem) {
      const f = imgItem.getAsFile();
      if (f) loadImageFile(f);
    }
  });

  scanBtn?.addEventListener('click', async () => {
    if (!currentImageData) return;
    if (!apiBase) {
      showError('ต้องรันผ่าน Node Server เพื่อเรียก /api/ocr');
      return;
    }
    showError('');
    scanBtn.disabled = true;
    scanBtn.textContent = 'กำลังสแกนข้อความ...';
    try {
      const res = await fetch(`${apiBase}/api/ocr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageData: currentImageData })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'สแกนข้อความไม่สำเร็จ');
      }
      outputEl.value = data.text || '';
      const count = Array.isArray(data.lines) ? data.lines.length : (outputEl.value ? outputEl.value.split('\n').length : 0);
      lineCountEl.textContent = `ผลลัพธ์ข้อความ (${count} บรรทัด)`;
    } catch (err) {
      showError(err.message);
    } finally {
      scanBtn.disabled = false;
      scanBtn.textContent = 'สแกนข้อความด้วย OpenThai OCR';
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

  checkStatus();
})();
