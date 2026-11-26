/* Smooth Page-to-Page Transitions (Cross-Document View Transitions + Smooth Fade/Slide Fallback) */
(() => {
  'use strict';

  const style = document.createElement('style');
  style.textContent = `
    @view-transition { navigation: auto; }
    ::view-transition-old(root) {
      animation: voxPageOut 0.18s cubic-bezier(0.4, 0, 1, 1) both;
    }
    ::view-transition-new(root) {
      animation: voxPageIn 0.26s cubic-bezier(0.22, 1, 0.36, 1) both;
    }
    @keyframes voxPageOut {
      from { opacity: 1; transform: translateY(0); }
      to   { opacity: 0; transform: translateY(-6px); }
    }
    @keyframes voxPageIn {
      from { opacity: 0; transform: translateY(8px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    body > main {
      animation: voxPageIn 0.26s cubic-bezier(0.22, 1, 0.36, 1) both;
      transition: opacity 0.16s cubic-bezier(0.4, 0, 0.2, 1), transform 0.16s cubic-bezier(0.4, 0, 0.2, 1);
      will-change: opacity, transform;
    }
    html.vox-page-leaving body > main {
      opacity: 0;
      transform: translateY(-6px);
    }
    @media (prefers-reduced-motion: reduce) {
      ::view-transition-old(root), ::view-transition-new(root), body > main {
        animation: none !important;
        transition: none !important;
      }
    }
  `;
  document.head.appendChild(style);

  window.addEventListener('pageshow', () => {
    document.documentElement.classList.remove('vox-page-leaving');
  });

  // Smooth exit fade for browsers without cross-document View Transitions
  const supportsCrossDocVT = 'CSSViewTransitionRule' in window || CSS.supports('view-transition-name', 'none');
  document.addEventListener('click', (e) => {
    if (supportsCrossDocVT) return;
    const link = e.target.closest('a[href]');
    if (!link) return;
    if (link.target === '_blank' || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const href = link.getAttribute('href') || '';
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
    try {
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin || url.href === window.location.href) return;
      e.preventDefault();
      document.documentElement.classList.add('vox-page-leaving');
      setTimeout(() => { window.location.href = url.href; }, 150);
    } catch (_) {}
  });

  window.__voxStageReady = true;
  window.__voxLoaderMarkReady = () => {};
})();
