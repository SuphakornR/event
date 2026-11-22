/* HelpDai User Accounts — Supabase GoTrue Auth (Zero-Dependency) */
(() => {
  const AUTH_KEY = 'helpdai_auth_v1';
  const cfg = window.HELPDAI_CONFIG || {};
  const sbUrl = (cfg.supabaseUrl || '').replace(/\/$/, '');
  const sbKey = cfg.supabaseAnonKey || '';
  if (!sbUrl || !sbKey) return;

  const readSession = () => {
    try { return JSON.parse(localStorage.getItem(AUTH_KEY) || 'null'); } catch (_) { return null; }
  };
  const writeSession = (s) => {
    try {
      if (s) localStorage.setItem(AUTH_KEY, JSON.stringify(s));
      else localStorage.removeItem(AUTH_KEY);
    } catch (_) {}
    window.dispatchEvent(new CustomEvent('helpdai-auth-change', { detail: s }));
  };

  async function authReq(path, body) {
    const res = await fetch(`${sbUrl}/auth/v1/${path}`, {
      method: 'POST',
      headers: { apikey: sbKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error_description || data.msg || data.message || 'Authentication failed');
    return data;
  }

  function openAuthModal() {
    let modal = document.getElementById('helpdai-auth-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'helpdai-auth-modal';
      modal.className = 'fixed inset-0 z-[185] hidden items-center justify-center p-4 bg-black/60 backdrop-blur-[2px]';
      modal.innerHTML = `
        <div class="vox-panel-enter vox-card bg-[#F8F6F0] w-full max-w-sm p-5 flex flex-col gap-3">
          <div class="flex items-center justify-between border-b-2 border-[#111111] pb-2">
            <h3 class="font-display font-black text-base text-[#111111]">บัญชีผู้ใช้ HelpDai</h3>
            <button type="button" id="auth-close-btn" class="w-7 h-7 rounded-lg border-2 border-[#111111] bg-white hover:bg-[#E74C3C] hover:text-white font-black text-xs flex items-center justify-center cursor-pointer">✕</button>
          </div>
          <p class="text-[11px] text-[#111111]/70 leading-relaxed">เข้าสู่ระบบเพื่อซิงค์ข้อมูลคะแนนและกิจกรรมข้ามเครื่องอัตโนมัติ (หรือใช้งานฟรีแบบไม่ต้องล็อกอินได้ทันที)</p>
          <form id="auth-form" class="flex flex-col gap-2.5">
            <input id="auth-email" type="email" required placeholder="อีเมล (Email)" class="bg-white border-2 border-[#111111] rounded-xl px-3 py-2 text-sm font-semibold" />
            <input id="auth-pass" type="password" required minlength="6" placeholder="รหัสผ่าน (อย่างน้อย 6 ตัวอักษร)" class="bg-white border-2 border-[#111111] rounded-xl px-3 py-2 text-sm font-semibold" />
            <div id="auth-msg" class="hidden text-xs font-bold rounded-lg px-2.5 py-1.5 border border-[#111111]"></div>
            <div class="grid grid-cols-2 gap-2 pt-1">
              <button type="submit" data-auth-mode="signin" class="btn-vox bg-[#F4D03F] hover:bg-[#f2c61d] text-[#111111] font-display font-extrabold text-xs py-2 rounded-xl cursor-pointer">เข้าสู่ระบบ</button>
              <button type="button" id="auth-signup-btn" class="btn-vox bg-white hover:bg-[#F4D03F] text-[#111111] font-display font-bold text-xs py-2 rounded-xl cursor-pointer">สมัครสมาชิก</button>
            </div>
          </form>
        </div>
      `;
      document.body.appendChild(modal);

      const hide = () => { modal.classList.add('hidden'); modal.classList.remove('flex'); };
      document.getElementById('auth-close-btn').addEventListener('click', hide);
      modal.addEventListener('click', (e) => { if (e.target === modal) hide(); });

      const msgEl = document.getElementById('auth-msg');
      const showMsg = (txt, ok = false) => {
        msgEl.textContent = txt;
        msgEl.className = `text-xs font-bold rounded-lg px-2.5 py-1.5 border border-[#111111] ${ok ? 'bg-[#10B981] text-white' : 'bg-[#FFE8E6] text-[#E74C3C]'}`;
      };

      const handleAuth = async (isSignup) => {
        const email = document.getElementById('auth-email').value.trim();
        const password = document.getElementById('auth-pass').value;
        if (!email || password.length < 6) {
          showMsg('กรุณากรอกอีเมลและรหัสผ่านอย่างน้อย 6 ตัวอักษร');
          return;
        }
        try {
          const data = isSignup
            ? await authReq('signup', { email, password })
            : await authReq('token?grant_type=password', { email, password });

          if (data.access_token && data.user) {
            writeSession({ accessToken: data.access_token, refreshToken: data.refresh_token, user: { id: data.user.id, email: data.user.email } });
            showMsg('✓ เข้าสู่ระบบสำเร็จ!', true);
            setTimeout(hide, 650);
          } else {
            showMsg('✓ สมัครสำเร็จ! กรุณาเช็กอีเมลยืนยัน หรือกดเข้าสู่ระบบ', true);
          }
        } catch (err) {
          showMsg(err.message);
        }
      };

      document.getElementById('auth-form').addEventListener('submit', (e) => {
        e.preventDefault();
        handleAuth(false);
      });
      document.getElementById('auth-signup-btn').addEventListener('click', () => handleAuth(true));
    }
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }

  function mountAuthBadge() {
    // Don't show login button on Voter-only mobile poll view
    if (new URLSearchParams(window.location.search).get('vote')) return;
    let btn = document.getElementById('helpdai-auth-btn');
    if (!btn) {
      btn = document.createElement('button');
      btn.id = 'helpdai-auth-btn';
      btn.type = 'button';
      btn.className = 'fixed top-3 right-3 z-40 btn-vox bg-white hover:bg-[#F4D03F] text-[#111111] font-display font-bold text-[11px] px-2.5 py-1 rounded-lg flex items-center gap-1.5 cursor-pointer';
      document.body.appendChild(btn);
      btn.addEventListener('click', () => {
        const cur = readSession();
        if (cur?.user) {
          if (window.confirm(`ออกจากระบบ (${cur.user.email}) หรือไม่?`)) {
            writeSession(null);
          }
        } else {
          openAuthModal();
        }
      });
    }

    const syncLabel = () => {
      const s = readSession();
      if (s?.user?.email) {
        btn.classList.add('bg-[#F4D03F]');
        btn.classList.remove('bg-white');
        btn.textContent = `✓ ${s.user.email.split('@')[0]}`;
        btn.title = `ล็อกอินแล้ว: ${s.user.email} (คลิกเพื่อออกจากระบบ)`;
      } else {
        btn.classList.remove('bg-[#F4D03F]');
        btn.classList.add('bg-white');
        btn.textContent = 'เข้าสู่ระบบ';
        btn.title = 'เข้าสู่ระบบเพื่อซิงค์ข้อมูลข้ามเครื่อง';
      }
    };
    syncLabel();
    window.addEventListener('helpdai-auth-change', syncLabel);
  }

  window.HelpDaiAuth = Object.freeze({
    getSession: readSession,
    openLogin: openAuthModal,
    signOut: () => writeSession(null)
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountAuthBadge, { once: true });
  } else {
    mountAuthBadge();
  }
})();
