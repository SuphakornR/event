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

  async function consumeHashSession() {
    const hash = window.location.hash || '';
    if (!hash.includes('access_token=')) return;
    const params = new URLSearchParams(hash.slice(1));
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token') || '';
    if (!accessToken) return;
    try {
      const res = await fetch(`${sbUrl}/auth/v1/user`, {
        headers: { apikey: sbKey, Authorization: `Bearer ${accessToken}` }
      });
      if (res.ok) {
        const user = await res.json();
        if (user?.id && user?.email) {
          writeSession({ accessToken, refreshToken, user: { id: user.id, email: user.email } });
        }
      }
    } catch (_) {}
    try {
      history.replaceState(null, '', window.location.pathname + window.location.search);
    } catch (_) {}
  }

  async function authReq(path, body) {
    const sep = path.includes('?') ? '&' : '?';
    const url = path.startsWith('signup')
      ? `${sbUrl}/auth/v1/${path}${sep}redirect_to=${encodeURIComponent(window.location.origin)}`
      : `${sbUrl}/auth/v1/${path}`;
    const res = await fetch(url, {
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
        <div class="vox-panel-enter vox-card bg-[#F8F6F0] w-full max-w-sm p-5 flex flex-col gap-3.5">
          <div class="flex items-center justify-between border-b-2 border-[#111111] pb-2.5">
            <div class="flex items-center gap-2">
              <span class="w-6 h-6 rounded-md bg-[#F4D03F] border-2 border-[#111111] flex items-center justify-center text-[#111111]">
                <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              </span>
              <h3 class="font-display font-black text-base text-[#111111]">บัญชีผู้ใช้ HelpDai</h3>
            </div>
            <button type="button" id="auth-close-btn" aria-label="ปิดหน้าต่างบัญชี" class="w-7 h-7 rounded-lg border-2 border-[#111111] bg-white hover:bg-[#E74C3C] hover:text-white font-black text-xs flex items-center justify-center transition-colors cursor-pointer">✕</button>
          </div>

          <!-- Signed-In Account View -->
          <div id="auth-account-view" class="hidden flex-col gap-3">
            <div class="bg-white border-2 border-[#111111] rounded-xl p-3 flex items-center gap-3 shadow-[2px_2px_0px_#111111]">
              <div class="w-9 h-9 rounded-lg bg-[#F4D03F] border-2 border-[#111111] flex items-center justify-center font-display font-black text-sm text-[#111111] shrink-0" id="auth-avatar-letter">U</div>
              <div class="min-w-0 flex-1">
                <p id="auth-account-email" class="font-display font-extrabold text-xs text-[#111111] truncate"></p>
                <span class="inline-flex items-center gap-1 text-[10px] font-bold text-[#059669]">
                  <span class="w-1.5 h-1.5 rounded-full bg-[#10B981]"></span>
                  ซิงค์ข้อมูลข้ามเครื่องเปิดอยู่
                </span>
              </div>
            </div>
            <button type="button" id="auth-signout-btn" class="btn-vox w-full bg-white hover:bg-[#FFE8E6] hover:text-[#E74C3C] text-[#111111] font-display font-extrabold text-xs py-2.5 rounded-xl cursor-pointer">ออกจากระบบ</button>
          </div>

          <!-- Sign-In / Sign-Up View -->
          <div id="auth-guest-view" class="flex flex-col gap-3">
            <p class="text-[11px] text-[#111111]/75 leading-relaxed">เข้าสู่ระบบเพื่อซิงค์คะแนนและกิจกรรมข้ามเครื่องอัตโนมัติ (หรือใช้งานฟรีแบบไม่ต้องล็อกอินได้ทันที)</p>
            <div class="grid grid-cols-2 gap-1.5 bg-white border-2 border-[#111111] rounded-xl p-1">
              <button type="button" id="auth-tab-signin" class="font-display font-extrabold text-xs py-1.5 rounded-lg transition-colors cursor-pointer bg-[#F4D03F] text-[#111111]">เข้าสู่ระบบ</button>
              <button type="button" id="auth-tab-signup" class="font-display font-bold text-xs py-1.5 rounded-lg transition-colors cursor-pointer text-[#111111]/70 hover:text-[#111111]">สมัครสมาชิก</button>
            </div>
            <form id="auth-form" class="flex flex-col gap-2.5">
              <div>
                <label for="auth-email" class="block text-[11px] font-display font-bold text-[#111111] mb-1">อีเมล</label>
                <input id="auth-email" type="email" required autocomplete="email" placeholder="you@example.com" class="w-full bg-white border-2 border-[#111111] rounded-xl px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#F4D03F]" />
              </div>
              <div>
                <label for="auth-pass" class="block text-[11px] font-display font-bold text-[#111111] mb-1">รหัสผ่าน</label>
                <div class="relative">
                  <input id="auth-pass" type="password" required minlength="6" autocomplete="current-password" placeholder="อย่างน้อย 6 ตัวอักษร" class="w-full bg-white border-2 border-[#111111] rounded-xl pl-3 pr-10 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#F4D03F]" />
                  <button type="button" id="auth-toggle-pass" aria-label="แสดง/ซ่อนรหัสผ่าน" class="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-md text-[#111111]/60 hover:text-[#111111] flex items-center justify-center cursor-pointer">
                    <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>
                  </button>
                </div>
              </div>
              <div id="auth-msg" class="hidden text-xs font-bold rounded-lg px-2.5 py-1.5 border border-[#111111]"></div>
              <button type="submit" id="auth-submit-btn" class="btn-vox w-full bg-[#F4D03F] hover:bg-[#f2c61d] text-[#111111] font-display font-extrabold text-xs py-2.5 rounded-xl mt-0.5 cursor-pointer">เข้าสู่ระบบ</button>
            </form>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      let isSignupMode = false;
      const tabSignin = document.getElementById('auth-tab-signin');
      const tabSignup = document.getElementById('auth-tab-signup');
      const submitBtn = document.getElementById('auth-submit-btn');
      const passInput = document.getElementById('auth-pass');
      const msgEl = document.getElementById('auth-msg');

      const hide = () => { modal.classList.add('hidden'); modal.classList.remove('flex'); };
      document.getElementById('auth-close-btn').addEventListener('click', hide);
      modal.addEventListener('click', (e) => { if (e.target === modal) hide(); });
      window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !modal.classList.contains('hidden')) hide();
      });

      const showMsg = (txt, ok = false) => {
        msgEl.textContent = txt;
        msgEl.className = `text-xs font-bold rounded-lg px-2.5 py-1.5 border border-[#111111] ${ok ? 'bg-[#10B981] text-white' : 'bg-[#FFE8E6] text-[#E74C3C]'}`;
      };

      const setMode = (signup) => {
        isSignupMode = signup;
        msgEl.className = 'hidden';
        tabSignin.className = `font-display text-xs py-1.5 rounded-lg transition-colors cursor-pointer ${!signup ? 'font-extrabold bg-[#F4D03F] text-[#111111]' : 'font-bold text-[#111111]/70 hover:text-[#111111]'}`;
        tabSignup.className = `font-display text-xs py-1.5 rounded-lg transition-colors cursor-pointer ${signup ? 'font-extrabold bg-[#F4D03F] text-[#111111]' : 'font-bold text-[#111111]/70 hover:text-[#111111]'}`;
        submitBtn.textContent = signup ? 'สมัครสมาชิก' : 'เข้าสู่ระบบ';
        passInput.setAttribute('autocomplete', signup ? 'new-password' : 'current-password');
      };

      tabSignin.addEventListener('click', () => setMode(false));
      tabSignup.addEventListener('click', () => setMode(true));

      document.getElementById('auth-toggle-pass').addEventListener('click', () => {
        passInput.type = passInput.type === 'password' ? 'text' : 'password';
      });

      document.getElementById('auth-signout-btn').addEventListener('click', () => {
        writeSession(null);
        hide();
      });

      document.getElementById('auth-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('auth-email').value.trim();
        const password = passInput.value;
        if (!email || password.length < 6) {
          showMsg('กรุณากรอกอีเมลและรหัสผ่านอย่างน้อย 6 ตัวอักษร');
          return;
        }
        submitBtn.disabled = true;
        submitBtn.textContent = 'กำลังดำเนินการ...';
        try {
          const data = isSignupMode
            ? await authReq('signup', { email, password })
            : await authReq('token?grant_type=password', { email, password });

          if (data.access_token && data.user) {
            writeSession({ accessToken: data.access_token, refreshToken: data.refresh_token, user: { id: data.user.id, email: data.user.email } });
            showMsg('✓ เข้าสู่ระบบสำเร็จ!', true);
            setTimeout(hide, 650);
          } else {
            showMsg('✓ สมัครสำเร็จ! กรุณาเช็กอีเมลยืนยัน', true);
          }
        } catch (err) {
          showMsg(err.message);
        } finally {
          submitBtn.disabled = false;
          submitBtn.textContent = isSignupMode ? 'สมัครสมาชิก' : 'เข้าสู่ระบบ';
        }
      });
    }

    const session = readSession();
    const accountView = document.getElementById('auth-account-view');
    const guestView = document.getElementById('auth-guest-view');
    if (session?.user?.email) {
      accountView.classList.remove('hidden');
      accountView.classList.add('flex');
      guestView.classList.add('hidden');
      guestView.classList.remove('flex');
      document.getElementById('auth-account-email').textContent = session.user.email;
      document.getElementById('auth-avatar-letter').textContent = session.user.email.charAt(0).toUpperCase();
    } else {
      accountView.classList.add('hidden');
      accountView.classList.remove('flex');
      guestView.classList.remove('hidden');
      guestView.classList.add('flex');
    }

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    if (!session?.user) {
      setTimeout(() => document.getElementById('auth-email')?.focus(), 40);
    }
  }

  function mountAuthBadge() {
    // Don't show login button on Voter-only mobile poll view
    if (new URLSearchParams(window.location.search).get('vote')) return;
    const slot = document.getElementById('helpdai-auth-slot');
    let btn = document.getElementById('helpdai-auth-btn');
    if (!btn) {
      btn = document.createElement('button');
      btn.id = 'helpdai-auth-btn';
      btn.type = 'button';
      btn.className = slot
        ? 'inline-flex items-center gap-1.5 border-2 border-[#111111] px-2.5 py-0.5 rounded-md font-display font-extrabold text-[11px] shadow-[2px_2px_0px_#111111] transition-colors cursor-pointer whitespace-nowrap'
        : 'fixed top-3 right-3 z-40 btn-vox bg-white hover:bg-[#F4D03F] text-[#111111] font-display font-bold text-[11px] px-2.5 py-1 rounded-lg inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap';
      (slot || document.body).appendChild(btn);
      btn.addEventListener('click', openAuthModal);
    }

    const syncLabel = () => {
      const s = readSession();
      if (s?.user?.email) {
        btn.classList.add('bg-[#F4D03F]', 'text-[#111111]', 'hover:bg-[#f2c61d]');
        btn.classList.remove('bg-white', 'hover:bg-[#F4D03F]');
        btn.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-[#10B981] border border-[#111111] shrink-0"></span><span class="max-w-[110px] truncate">${s.user.email.split('@')[0]}</span>`;
        btn.title = `บัญชี: ${s.user.email}`;
      } else {
        btn.classList.remove('bg-[#F4D03F]', 'hover:bg-[#f2c61d]');
        btn.classList.add('bg-white', 'text-[#111111]', 'hover:bg-[#F4D03F]');
        btn.innerHTML = `<svg class="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg><span>เข้าสู่ระบบ</span>`;
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

  consumeHashSession();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountAuthBadge, { once: true });
  } else {
    mountAuthBadge();
  }
})();
