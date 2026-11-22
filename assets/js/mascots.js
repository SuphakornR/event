/* Shared Vox-style geometric mascots: flat color, ink outline, hard offset shadow, two eye dots.
   Usage: VoxMascots.svg(index 0|1|2, colorHex?, tailwindSizeClass?) */
(() => {
  const COLORS = ['#F4D03F', '#E74C3C', '#2980B9'];
  const INK = '#111111';
  const PAPER = '#F8F6F0';
  const SHAPES = [
    { d: 'M9 9 H35 V35 H9 Z', eyes: [[18, 21], [28, 21]], eyeFill: INK },        // square
    { d: 'M22 7 L40 38 H4 Z', eyes: [[17, 28], [27, 28]], eyeFill: PAPER },      // triangle
    { d: 'M22 6 A16 16 0 1 1 21.99 6 Z', eyes: [[17, 21], [27, 21]], eyeFill: PAPER } // circle
  ];

  function svg(teamIdx, color, sizeClass = 'w-9 h-9') {
    const idx = ((Number(teamIdx) || 0) % 3 + 3) % 3;
    const sh = SHAPES[idx];
    const fill = color || COLORS[idx];
    return `<svg viewBox="0 0 48 48" class="${sizeClass} shrink-0 mascot-float" style="animation-delay:${idx * 0.35}s" aria-hidden="true">` +
      `<path d="${sh.d}" transform="translate(3.5 3.5)" fill="${INK}"/>` +
      `<path d="${sh.d}" fill="${fill}" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/>` +
      sh.eyes.map(e => `<circle cx="${e[0]}" cy="${e[1]}" r="2.2" fill="${sh.eyeFill}"/>`).join('') +
      `</svg>`;
  }

  window.VoxMascots = { COLORS, svg };
})();
