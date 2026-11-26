/* Smooth Page Transitions, Page Lifecycle Cleanup Registry & Animated Modal/Popover Helpers */
(() => {
  'use strict';

  if (!document.getElementById('vox-transition-styles')) {
    const style = document.createElement('style');
    style.id = 'vox-transition-styles';
    style.textContent = `
      @view-transition { navigation: auto; }
      ::view-transition-old(root) {
        animation: voxPageOut 0.16s cubic-bezier(0.4, 0, 1, 1) both;
      }
      ::view-transition-new(root) {
        animation: voxPageIn 0.24s cubic-bezier(0.22, 1, 0.36, 1) both;
      }
      @keyframes voxPageOut {
        from { opacity: 1; transform: translateY(0) scale(1); }
        to   { opacity: 0; transform: translateY(-6px) scale(0.992); }
      }
      @keyframes voxPageIn {
        from { opacity: 0; transform: translateY(8px) scale(0.992); }
        to   { opacity: 1; transform: translateY(0) scale(1); }
      }
      body > main {
        animation: voxPageIn 0.24s cubic-bezier(0.22, 1, 0.36, 1) both;
        transition: opacity 0.14s cubic-bezier(0.4, 0, 0.2, 1),
                    transform 0.16s cubic-bezier(0.22, 1, 0.36, 1);
        will-change: opacity, transform;
      }
      html.vox-pjax-out body > main {
        opacity: 0 !important;
        transform: translateY(-6px) scale(0.992) !important;
      }
      @media (prefers-reduced-motion: reduce) {
        ::view-transition-old(root), ::view-transition-new(root), body > main {
          animation: none !important;
          transition: none !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  // Lifecycle cleanup registry so PJAX page switches never leak listeners, intervals, or channels
  const cleanups = new Set();
  window.__voxRegisterCleanup = (fn) => {
    if (typeof fn === 'function') cleanups.add(fn);
    return () => cleanups.delete(fn);
  };
  window.__voxRunPageCleanups = () => {
    cleanups.forEach((fn) => {
      try { fn(); } catch (_) {}
    });
    cleanups.clear();
  };

  // Unified animated modal & popover helpers (smooth open AND smooth exit before hiding)
  window.VoxUI = {
    openModal(modalEl, focusEl = null) {
      if (!modalEl) return;
      clearTimeout(modalEl.__voxHideTimer);
      modalEl.classList.remove('hidden');
      modalEl.classList.add('flex');
      modalEl.setAttribute('aria-hidden', 'false');
      requestAnimationFrame(() => {
        modalEl.classList.add('is-open');
        if (focusEl) setTimeout(() => focusEl.focus?.(), 40);
      });
    },
    closeModal(modalEl) {
      if (!modalEl || modalEl.classList.contains('hidden')) return;
      modalEl.classList.remove('is-open');
      modalEl.setAttribute('aria-hidden', 'true');
      clearTimeout(modalEl.__voxHideTimer);
      modalEl.__voxHideTimer = setTimeout(() => {
        if (!modalEl.classList.contains('is-open')) {
          modalEl.classList.add('hidden');
          modalEl.classList.remove('flex');
        }
      }, 230);
    },
    setPopover(popEl, open, triggerBtn = null) {
      if (!popEl) return;
      clearTimeout(popEl.__voxHideTimer);
      if (open) {
        popEl.classList.remove('hidden');
        popEl.classList.add('flex');
        triggerBtn?.setAttribute('aria-expanded', 'true');
        requestAnimationFrame(() => popEl.classList.add('is-open'));
      } else {
        popEl.classList.remove('is-open');
        triggerBtn?.setAttribute('aria-expanded', 'false');
        popEl.__voxHideTimer = setTimeout(() => {
          if (!popEl.classList.contains('is-open')) {
            popEl.classList.add('hidden');
            popEl.classList.remove('flex');
          }
        }, 190);
      }
    }
  };

  window.addEventListener('pageshow', () => {
    document.documentElement.classList.remove('vox-pjax-out');
  });

  window.__voxStageReady = true;
  window.__voxLoaderMarkReady = () => {};
})();
