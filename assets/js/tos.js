/* Shared Terms of Service & User Agreement Gate (Scroll-to-Accept) */
(() => {
  const TOS_KEY = 'vox_tos_accepted_v1';

  function isAccepted() {
    try {
      return localStorage.getItem(TOS_KEY) === '1';
    } catch (_) {
      return false;
    }
  }

  function showTosModal(forceOpen = false) {
    if (!forceOpen && isAccepted()) return;

    let modal = document.getElementById('vox-tos-modal');
    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
      return;
    }

    modal = document.createElement('div');
    modal.id = 'vox-tos-modal';
    modal.className = 'fixed inset-0 z-[190] flex items-center justify-center bg-black/65 backdrop-blur-[2px] p-4';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'vox-tos-title');

    modal.innerHTML = `
      <div class="vox-card bg-[#F8F6F0] w-full max-w-lg p-5 sm:p-6 flex flex-col gap-3.5 vox-panel-enter">
        <div class="flex items-center justify-between gap-3 pb-3 border-b-[2.5px] border-[#111111]">
          <div class="flex items-center gap-2.5">
            <span class="w-3.5 h-3.5 rounded-full bg-[#F4D03F] border-2 border-[#111111] shrink-0"></span>
            <h2 id="vox-tos-title" class="thai-safe-tight font-display font-black text-lg sm:text-xl text-[#111111]">
              ข้อตกลงการใช้งาน & นโยบายความเป็นส่วนตัว
            </h2>
          </div>
          <span class="text-[11px] font-display font-bold px-2 py-0.5 rounded border border-[#111111] bg-white shrink-0">
            HelpDai • v1.1
          </span>
        </div>

        <div
          id="vox-tos-scroll"
          class="bg-white border-2 border-[#111111] rounded-xl p-4 max-h-[46vh] overflow-y-auto text-xs sm:text-sm text-[#111111]/85 leading-relaxed flex flex-col gap-3 shadow-[3px_3px_0px_#111111]"
        >
          <p class="font-semibold text-[#111111]">
            กรุณาอ่านข้อตกลงการใช้งาน (Terms of Service) และนโยบายความเป็นส่วนตัว (Privacy Policy / PDPA) ของเว็บไซต์ <strong>HelpDai</strong> ให้ครบถ้วนก่อนเริ่มใช้งาน
          </p>

          <div>
            <h3 class="font-display font-extrabold text-[#111111] mb-1">1. วัตถุประสงค์และขอบเขตการใช้งาน</h3>
            <p>
              เว็บไซต์ HelpDai (รวมถึง Stage Scoreboard และเครื่องมือจัดกิจกรรมต่างๆ) จัดทำขึ้นเพื่อช่วยอำนวยความสะดวกในการจัดกิจกรรม การแสดงผลคะแนนสด การจับเวลา และสื่อประกอบบนเวที ผู้ใช้งานตกลงที่จะใช้งานระบบเพื่อกิจกรรมที่สุจริตและชอบด้วยกฎหมายเท่านั้น
            </p>
          </div>

          <div>
            <h3 class="font-display font-extrabold text-[#111111] mb-1">2. นโยบายความเป็นส่วนตัวและการคุ้มครองข้อมูล (PDPA)</h3>
            <p>
              เว็บไซต์ไม่มีการเก็บรวบรวม ประมวลผล หรือส่งต่อข้อมูลส่วนบุคคลไปยังเซิร์ฟเวอร์กลาง และไม่มีการใช้คุกกี้ติดตามตัวตน (Tracking Cookies) ข้อมูลคะแนน ชื่อทีม กิจกรรม ข้อเสนอแนะ และการตั้งค่าทั้งหมดจะถูกจัดเก็บไว้ในเบราว์เซอร์ของผู้ใช้งานเอง (<code>localStorage</code>) เท่านั้น ผู้ใช้สามารถลบข้อมูลทั้งหมดได้ตลอดเวลาผ่านการล้างข้อมูลเว็บไซต์ในเบราว์เซอร์
            </p>
          </div>

          <div>
            <h3 class="font-display font-extrabold text-[#111111] mb-1">3. บริการภายนอกและสื่อ YouTube (Third-Party Services)</h3>
            <p>
              การเล่นวิดีโอและเพลงประกอบผ่านเครื่องเล่น YouTube Embed และ oEmbed เป็นการเชื่อมต่อโดยตรงกับบริการของ YouTube/Google ซึ่งอยู่ภายใต้ข้อกำหนดในการให้บริการของ YouTube (<a href="https://www.youtube.com/t/terms" target="_blank" rel="noopener noreferrer" class="underline font-semibold">youtube.com/t/terms</a>) และนโยบายความเป็นส่วนตัวของ Google (<a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" class="underline font-semibold">policies.google.com/privacy</a>) เว็บไซต์ไม่มีการดาวน์โหลดหรือจัดเก็บไฟล์สื่อที่มีลิขสิทธิ์ไว้บนระบบ
            </p>
          </div>

          <div>
            <h3 class="font-display font-extrabold text-[#111111] mb-1">4. เนื้อหาที่ผู้ใช้นำเข้าและลิขสิทธิ์</h3>
            <p>
              ผู้ใช้งานเป็นผู้รับผิดชอบแต่เพียงผู้เดียวต่อข้อความ รูปภาพ ไฟล์ GIF ลิงก์ YouTube และเสียงที่นำมาแสดงผลในระบบ รวมถึงการตรวจสอบว่าได้รับอนุญาตหรือเคารพลิขสิทธิ์ สิทธิส่วนบุคคล และทรัพย์สินทางปัญญาของบุคคลที่สามอย่างถูกต้อง
            </p>
          </div>

          <div>
            <h3 class="font-display font-extrabold text-[#111111] mb-1">5. ทรัพย์สินทางปัญญาและความปลอดภัยของระบบ</h3>
            <p>
              ซอร์สโค้ด การออกแบบ UI มาสคอต และเครื่องหมายการค้า HelpDai เป็นทรัพย์สินทางปัญญาของผู้พัฒนา ห้ามคัดลอก ดัดแปลง แกะโค้ด (Reverse Engineering) ดูดข้อมูล (Scraping) หรือเจาะระบบ/ข้ามมาตรการความปลอดภัย อันอาจเข้าข่ายความผิดตาม พ.ร.บ. ว่าด้วยการกระทำความผิดเกี่ยวกับคอมพิวเตอร์ และกฎหมายทรัพย์สินทางปัญญา
            </p>
          </div>

          <div>
            <h3 class="font-display font-extrabold text-[#111111] mb-1">6. ข้อจำกัดความรับผิดชอบ (Disclaimer)</h3>
            <p>
              ระบบให้บริการตามสภาพที่เป็นอยู่ (As-Is) และตามความพร้อมใช้งาน (As-Available) ผู้พัฒนาไม่รับประกันความต่อเนื่องของเครือข่ายอินเทอร์เน็ตหรือบริการภายนอก (เช่น YouTube หรือ CDN) และไม่รับผิดชอบต่อความเสียหายหรือการสูญหายของข้อมูลที่เกิดจากการใช้งาน การปิดหน้าต่าง หรือการล้างข้อมูลเบราว์เซอร์
            </p>
          </div>

          <div>
            <h3 class="font-display font-extrabold text-[#111111] mb-1">7. กฎหมายที่ใช้บังคับและการแก้ไขข้อตกลง</h3>
            <p>
              ข้อตกลงนี้อยู่ภายใต้การบังคับและตีความตามกฎหมายแห่งราชอาณาจักรไทย ผู้พัฒนาขอสงวนสิทธิ์ในการปรับปรุงข้อตกลงได้ตามความเหมาะสม การใช้งานระบบต่อไปถือว่าผู้ใช้งานรับทราบและยอมรับข้อตกลงฉบับล่าสุด
            </p>
          </div>

          <div class="pt-2 border-t border-[#111111]/15 text-[11px] font-bold text-[#111111]/60">
            — สิ้นสุดข้อตกลงการใช้งานและนโยบายความเป็นส่วนตัว (HelpDai) —
          </div>
        </div>

        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
          <span id="vox-tos-hint" class="text-xs font-bold text-[#E74C3C]">
            ⬇ กรุณาเลื่อนอ่านลงด้านล่างสุดเพื่อกดยอมรับ
          </span>
          <button
            type="button"
            id="vox-tos-accept-btn"
            disabled
            class="btn-vox bg-[#F4D03F] text-[#111111] font-display font-extrabold text-sm px-5 py-2.5 rounded-xl opacity-45 cursor-not-allowed transition-opacity shrink-0"
          >
            ✓ ยอมรับและเข้าใช้งาน
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const scrollBox = document.getElementById('vox-tos-scroll');
    const acceptBtn = document.getElementById('vox-tos-accept-btn');
    const hintEl = document.getElementById('vox-tos-hint');

    let unlocked = false;
    const checkScrollBottom = () => {
      if (unlocked) return;
      const atBottom = scrollBox.scrollTop + scrollBox.clientHeight >= scrollBox.scrollHeight - 12;
      if (atBottom || scrollBox.scrollHeight <= scrollBox.clientHeight + 4) {
        unlocked = true;
        acceptBtn.disabled = false;
        acceptBtn.classList.remove('opacity-45', 'cursor-not-allowed');
        acceptBtn.classList.add('hover:bg-[#f2c61d]', 'cursor-pointer');
        if (hintEl) {
          hintEl.textContent = '✓ อ่านครบถ้วนแล้ว สามารถกดยอมรับได้';
          hintEl.className = 'text-xs font-bold text-emerald-700';
        }
      }
    };

    scrollBox.addEventListener('scroll', checkScrollBottom, { passive: true });
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

  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-open-tos]')) {
      showTosModal(true);
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => showTosModal(false), { once: true });
  } else {
    showTosModal(false);
  }

  window.VoxTos = { open: () => showTosModal(true) };
})();
