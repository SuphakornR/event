/* Client-Side Security & Stage Lock (URL Sanitization, CSP-safe helpers, SHA-256 PIN Lock) */
(() => {
  const LOCK_KEY = 'vox_stage_lock_v1';

  // Strict URL sanitizer: allows only http(s) and safe raster/gif data URIs
  function sanitizeUrl(raw) {
    const val = String(raw || '').trim();
    if (!val) return '';
    if (/^data:image\/(png|jpeg|jpg|gif|webp);base64,/i.test(val)) return val;
    try {
      const parsed = new URL(val, window.location.origin);
      if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
        return parsed.href;
      }
    } catch (_) {}
    return '';
  }

  async function sha256(text) {
    if (window.crypto?.subtle) {
      const buf = new TextEncoder().encode(String(text));
      const hash = await crypto.subtle.digest('SHA-256', buf);
      return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
    }
    // Fallback non-crypto hash for non-HTTPS file:// contexts
    let h = 2166136261;
    for (let i = 0; i < text.length; i++) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0).toString(16);
  }

  function getLockState() {
    try {
      return JSON.parse(localStorage.getItem(LOCK_KEY) || '{"locked":false,"hash":""}');
    } catch (_) {
      return { locked: false, hash: '' };
    }
  }

  function setLockState(st) {
    try { localStorage.setItem(LOCK_KEY, JSON.stringify(st)); } catch (_) {}
    document.body.classList.toggle('vox-stage-locked', Boolean(st.locked));
    window.dispatchEvent(new CustomEvent('vox-lock-change', { detail: { locked: Boolean(st.locked) } }));
  }

  function isLocked() {
    return Boolean(getLockState().locked);
  }

  function openPinModal(mode, onSuccess) {
    let modal = document.getElementById('vox-pin-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'vox-pin-modal';
      modal.className = 'fixed inset-0 z-[210] hidden items-center justify-center bg-black/60 backdrop-blur-[2px] p-4';
      modal.innerHTML = `
        <div class="vox-card bg-[#F8F6F0] w-full max-w-xs p-5 flex flex-col gap-3 vox-panel-enter">
          <div class="flex items-center justify-between pb-2 border-b-2 border-[#111111]">
            <h3 id="vpin-title" class="font-display font-extrabold text-base text-[#111111]">🔒 ล็อกหน้าจอ</h3>
            <button type="button" id="vpin-close" class="w-7 h-7 rounded-lg border-2 border-[#111111] bg-white hover:bg-[#E74C3C] hover:text-white font-display font-bold text-xs flex items-center justify-center cursor-pointer">✕</button>
          </div>
          <p id="vpin-desc" class="text-xs text-[#111111]/75"></p>
          <input id="vpin-input" type="password" inputmode="numeric" maxlength="8" placeholder="••••" class="w-full text-center tracking-[0.4em] font-display font-black text-xl bg-white border-2 border-[#111111] rounded-xl py-2" />
          <p id="vpin-err" class="hidden text-xs font-bold text-[#E74C3C]"></p>
          <button type="button" id="vpin-submit" class="btn-vox bg-[#F4D03F] hover:bg-[#f2c61d] text-[#111111] font-display font-extrabold text-sm py-2 rounded-xl cursor-pointer">ยืนยัน</button>
        </div>
      `;
      document.body.appendChild(modal);
      document.getElementById('vpin-close').addEventListener('click', () => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
      });
    }

    const titleEl = document.getElementById('vpin-title');
    const descEl = document.getElementById('vpin-desc');
    const inp = document.getElementById('vpin-input');
    const errEl = document.getElementById('vpin-err');
    const submitBtn = document.getElementById('vpin-submit');

    inp.value = '';
    errEl.classList.add('hidden');
    if (mode === 'set') {
      titleEl.textContent = '🔒 ตั้งรหัส PIN ล็อกหน้าจอ';
      descEl.textContent = 'ตั้งรหัส PIN (อย่างน้อย 4 หลัก) เพื่อป้องกันการแก้ไขคะแนนโดยไม่ได้รับอนุญาต';
    } else {
      titleEl.textContent = '🔓 ปลดล็อกหน้าจอ';
      descEl.textContent = 'กรอกรหัส PIN เพื่อปลดล็อกการแก้ไข';
    }

    const newSubmit = submitBtn.cloneNode(true);
    submitBtn.parentNode.replaceChild(newSubmit, submitBtn);

    const handleSubmit = async () => {
      const pin = inp.value.trim();
      if (pin.length < 4) {
        errEl.textContent = 'กรุณาใส่รหัสอย่างน้อย 4 ตัว';
        errEl.classList.remove('hidden');
        return;
      }
      const h = await sha256(pin);
      if (mode === 'set') {
        setLockState({ locked: true, hash: h });
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        if (onSuccess) onSuccess();
      } else {
        const cur = getLockState();
        if (h === cur.hash) {
          setLockState({ locked: false, hash: '' });
          modal.classList.add('hidden');
          modal.classList.remove('flex');
          if (onSuccess) onSuccess();
        } else {
          errEl.textContent = 'รหัส PIN ไม่ถูกต้อง';
          errEl.classList.remove('hidden');
        }
      }
    };

    newSubmit.addEventListener('click', handleSubmit);
    inp.onkeydown = (e) => { if (e.key === 'Enter') handleSubmit(); };

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    inp.focus();
  }

  function toggleLock() {
    if (isLocked()) {
      openPinModal('unlock');
    } else {
      openPinModal('set');
    }
  }

  // Apply lock state on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setLockState(getLockState()), { once: true });
  } else {
    setLockState(getLockState());
  }

  window.VoxSecurity = Object.freeze({
    sanitizeUrl,
    isLocked,
    toggleLock
  });
})();
