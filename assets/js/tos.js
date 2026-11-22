/* Shared Terms of Service & Privacy Policy Gate (TH/EN, PDPA & International Compliance) */
(() => {
  const TOS_KEY = 'vox_tos_accepted_v2';

  function isAccepted() {
    try {
      return localStorage.getItem(TOS_KEY) === '1';
    } catch (_) {
      return false;
    }
  }

  const TOS_CONTENT = {
    th: {
      title: 'ข้อตกลงการใช้งาน & นโยบายความเป็นส่วนตัว',
      intro: 'กรุณาอ่านข้อตกลงการใช้งาน (Terms of Service) และนโยบายความเป็นส่วนตัวของ <strong>HelpDai</strong> (รองรับมาตรฐาน PDPA ไทย และ GDPR/CCPA สากล) ก่อนเริ่มใช้งาน',
      hintLocked: '⬇ กรุณาเลื่อนอ่านลงด้านล่างสุดเพื่อกดยอมรับ',
      hintUnlocked: '✓ อ่านครบถ้วนแล้ว สามารถกดยอมรับได้',
      acceptBtn: '✓ ยอมรับและเข้าใช้งาน',
      endNote: '— สิ้นสุดข้อตกลงการใช้งานและนโยบายความเป็นส่วนตัว (HelpDai v2.0) —',
      sections: [
        {
          h: '1. ขอบเขตบริการและความปลอดภัยของข้อมูล (Data Safety)',
          p: 'HelpDaiCha ให้บริการเครื่องมือจัดกิจกรรม (Stage Scoreboard, Live QR Poll) โดยเชื่อมต่อผ่าน HTTPS/TLS และระบบฐานข้อมูลที่มีการแยกสิทธิ์การเข้าถึงระดับแถว (Row-Level Security) หากใช้งานแบบไม่เข้าสู่ระบบ (Guest) ข้อมูลจะไม่ถูกซิงค์ขึ้นคลาวด์และจะรีเซ็ตเมื่อปิด/รีเฟรชหน้า เว้นแต่ผู้ใช้เลือกบันทึกในเครื่องหรือเข้าสู่ระบบ'
        },
        {
          h: '2. การคุ้มครองข้อมูลส่วนบุคคล (PDPA ไทย & GDPR/CCPA สากล)',
          p: 'เมื่อผู้ใช้สมัครหรือเข้าสู่ระบบ (อีเมลหรือ Google OAuth) ระบบจัดเก็บเฉพาะอีเมลและรหัสผู้ใช้เพื่อยืนยันตัวตนและซิงค์ข้อมูลกิจกรรมข้ามอุปกรณ์เท่านั้น ไม่มีการขายข้อมูล ไม่ใช้คุกกี้โฆษณา/ติดตามตัวตน (No Ad/Tracking Cookies) ผู้ใช้มีสิทธิ์เข้าถึง ส่งออก (.json) และลบข้อมูลได้ตลอดเวลา'
        },
        {
          h: '3. บริการภายนอกและสื่อ YouTube (Third-Party Services)',
          p: 'การเล่นสื่อ YouTube เชื่อมต่อโดยตรงกับบริการของ YouTube/Google ภายใต้ข้อกำหนดของ YouTube (<a href="https://www.youtube.com/t/terms" target="_blank" rel="noopener noreferrer" class="underline font-semibold">youtube.com/t/terms</a>) และ Google Privacy (<a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" class="underline font-semibold">policies.google.com/privacy</a>) รวมถึงระบบยืนยันตัวตน Supabase'
        },
        {
          h: '4. ความรับผิดชอบต่อเนื้อหาและลิขสิทธิ์',
          p: 'ผู้ใช้งานเป็นผู้รับผิดชอบแต่เพียงผู้เดียวต่อข้อความ รูปภาพ ไฟล์ GIF และลิงก์สื่อที่นำมาแสดงผลในกิจกรรม รวมถึงการปฏิบัติตามกฎหมายลิขสิทธิ์และทรัพย์สินทางปัญญาทั้งในประเทศไทยและต่างประเทศ'
        },
        {
          h: '5. ความปลอดภัยไซเบอร์และการห้ามโจมตีระบบ (Anti-Abuse & Cyber Law)',
          p: 'ห้ามเจาะระบบ ทดสอบช่องโหว่โดยไม่ได้รับอนุญาต ข้ามมาตรการควบคุมสิทธิ์ (RLS/Token) ส่งคำขอโจมตี (DoS/Rate-limit bypass) ดูดข้อมูล (Scraping) หรือแทรกสคริปต์อันตราย (XSS/Injection) การฝ่าฝืนมีความผิดตาม พ.ร.บ. ว่าด้วยการกระทำความผิดเกี่ยวกับคอมพิวเตอร์ พ.ศ. 2550 (และที่แก้ไขเพิ่มเติม) รวมถึงกฎหมายอาชญากรรมไซเบอร์สากล'
        },
        {
          h: '6. ข้อจำกัดความรับผิดชอบและกฎหมายที่ใช้บังคับ',
          p: 'บริการให้ใช้งานตามสภาพ (As-Is) ข้อตกลงนี้อยู่ภายใต้กฎหมายแห่งราชอาณาจักรไทย ควบคู่กับการคุ้มครองสิทธิความเป็นส่วนตัวตามมาตรฐานสากลสำหรับผู้ใช้งานในต่างประเทศ การใช้งานต่อถือว่ายอมรับข้อตกลงฉบับล่าสุด'
        }
      ]
    },
    en: {
      title: 'Terms of Service & Privacy Policy',
      intro: 'Please review the <strong>HelpDai</strong> Terms of Service & Privacy Policy (compliant with Thailand PDPA and international GDPR/CCPA principles) before continuing.',
      hintLocked: '⬇ Please scroll to the bottom to accept',
      hintUnlocked: '✓ Read completely — you may now accept',
      acceptBtn: '✓ Accept & Continue',
      endNote: '— End of Terms of Service & Privacy Policy (HelpDai v2.0) —',
      sections: [
        {
          h: '1. Service Scope & Data Safety',
          p: 'HelpDaiCha provides event tools (Stage Scoreboard, Live QR Poll) served over HTTPS/TLS with Row-Level Security (RLS) isolation. In Guest mode (not signed in), edits are ephemeral and reset on refresh/new tab unless explicitly saved locally or synced via an account.'
        },
        {
          h: '2. Privacy & International Data Rights (PDPA / GDPR / CCPA)',
          p: 'When you sign in via Email or Google OAuth, we process only your email and user ID solely for authentication and syncing your event rooms across devices. We do not sell personal data or use ad/tracking cookies. You may export (.json) or delete your data anytime.'
        },
        {
          h: '3. Third-Party Services',
          p: 'Embedded YouTube playback connects directly to YouTube/Google under YouTube Terms (<a href="https://www.youtube.com/t/terms" target="_blank" rel="noopener noreferrer" class="underline font-semibold">youtube.com/t/terms</a>) and Google Privacy (<a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" class="underline font-semibold">policies.google.com/privacy</a>). Authentication uses Supabase.'
        },
        {
          h: '4. User Content & Copyright',
          p: 'You are solely responsible for all text, images, GIFs, and media links displayed during your events, and for complying with applicable Thai and international copyright and intellectual property laws.'
        },
        {
          h: '5. Security & Anti-Tampering Policy',
          p: 'Unauthorized penetration testing, bypassing access controls or RLS, scraping, rate-limit abuse, DoS attacks, or XSS/code injection are strictly prohibited and subject to Thailand’s Computer Crime Act as well as applicable international cybercrime laws.'
        },
        {
          h: '6. Disclaimer & Governing Law',
          p: 'This service is provided "As-Is" and "As-Available". These terms are governed by the laws of the Kingdom of Thailand while respecting mandatory data-protection rights for international users.'
        }
      ]
    }
  };

  function showTosModal(forceOpen = false) {
    if (!forceOpen && isAccepted()) return;

    let modal = document.getElementById('vox-tos-modal');
    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
      return;
    }

    let lang = 'th';
    let unlocked = false;

    modal = document.createElement('div');
    modal.id = 'vox-tos-modal';
    modal.className = 'fixed inset-0 z-[190] flex items-center justify-center bg-black/65 backdrop-blur-[2px] p-4';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'vox-tos-title');

    modal.innerHTML = `
      <div class="vox-card bg-[#F8F6F0] w-full max-w-lg p-5 sm:p-6 flex flex-col gap-3.5 vox-panel-enter">
        <div class="flex items-center justify-between gap-2 pb-3 border-b-[2.5px] border-[#111111]">
          <div class="flex items-center gap-2.5 min-w-0">
            <span class="w-3.5 h-3.5 rounded-full bg-[#F4D03F] border-2 border-[#111111] shrink-0"></span>
            <h2 id="vox-tos-title" class="thai-safe-tight font-display font-black text-base sm:text-lg text-[#111111] truncate"></h2>
          </div>
          <div class="flex items-center gap-1.5 shrink-0">
            <button type="button" id="vox-tos-lang-btn" class="text-[11px] font-display font-extrabold px-2 py-0.5 rounded border-2 border-[#111111] bg-[#F4D03F] hover:bg-[#f2c61d] cursor-pointer">EN / ไทย</button>
            <span class="text-[11px] font-display font-bold px-2 py-0.5 rounded border border-[#111111] bg-white">v2.0</span>
          </div>
        </div>

        <div
          id="vox-tos-scroll"
          class="bg-white border-2 border-[#111111] rounded-xl p-4 max-h-[46vh] overflow-y-auto text-xs sm:text-sm text-[#111111]/85 leading-relaxed flex flex-col gap-3 shadow-[3px_3px_0px_#111111]"
        ></div>

        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
          <span id="vox-tos-hint" class="text-xs font-bold text-[#E74C3C]"></span>
          <button
            type="button"
            id="vox-tos-accept-btn"
            disabled
            class="btn-vox bg-[#F4D03F] text-[#111111] font-display font-extrabold text-sm px-5 py-2.5 rounded-xl opacity-45 cursor-not-allowed transition-opacity shrink-0"
          ></button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const titleEl = document.getElementById('vox-tos-title');
    const scrollBox = document.getElementById('vox-tos-scroll');
    const acceptBtn = document.getElementById('vox-tos-accept-btn');
    const hintEl = document.getElementById('vox-tos-hint');
    const langBtn = document.getElementById('vox-tos-lang-btn');

    const syncHint = () => {
      const t = TOS_CONTENT[lang];
      if (unlocked) {
        hintEl.textContent = t.hintUnlocked;
        hintEl.className = 'text-xs font-bold text-emerald-700';
      } else {
        hintEl.textContent = t.hintLocked;
        hintEl.className = 'text-xs font-bold text-[#E74C3C]';
      }
    };

    const renderLang = () => {
      const t = TOS_CONTENT[lang];
      titleEl.textContent = t.title;
      acceptBtn.textContent = t.acceptBtn;
      langBtn.textContent = lang === 'th' ? 'English' : 'ภาษาไทย';
      scrollBox.innerHTML = `
        <p class="font-semibold text-[#111111]">${t.intro}</p>
        ${t.sections.map(s => `
          <div>
            <h3 class="font-display font-extrabold text-[#111111] mb-1">${s.h}</h3>
            <p>${s.p}</p>
          </div>
        `).join('')}
        <div class="pt-2 border-t border-[#111111]/15 text-[11px] font-bold text-[#111111]/60">${t.endNote}</div>
      `;
      syncHint();
    };

    const checkScrollBottom = () => {
      if (unlocked) return;
      const atBottom = scrollBox.scrollTop + scrollBox.clientHeight >= scrollBox.scrollHeight - 12;
      if (atBottom || scrollBox.scrollHeight <= scrollBox.clientHeight + 4) {
        unlocked = true;
        acceptBtn.disabled = false;
        acceptBtn.classList.remove('opacity-45', 'cursor-not-allowed');
        acceptBtn.classList.add('hover:bg-[#f2c61d]', 'cursor-pointer');
        syncHint();
      }
    };

    langBtn.addEventListener('click', () => {
      lang = lang === 'th' ? 'en' : 'th';
      renderLang();
      scrollBox.scrollTop = 0;
    });

    scrollBox.addEventListener('scroll', checkScrollBottom, { passive: true });
    renderLang();
    requestAnimationFrame(checkScrollBottom);

    acceptBtn.addEventListener('click', () => {
      if (acceptBtn.disabled) return;
      try {
        localStorage.setItem(TOS_KEY, '1');
      } catch (_) {}
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-open-tos]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        showTosModal(true);
      });
    });
    showTosModal(false);
  });
})();
