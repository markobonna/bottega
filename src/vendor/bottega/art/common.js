/* Shared SVG drawing helpers. All art is drawn in the "Leonardo notebook" style:
   sepia ink lines, left-handed hatching, red-chalk construction lines. */
(function () {
  const B = window.B;
  const C = B.C;
  const A = (B.art = B.art || {});

  A.attrs = (o) => Object.entries(o || {}).filter(([, v]) => v !== undefined && v !== null && v !== false)
    .map(([k, v]) => `${k}="${v}"`).join(' ');
  A.poly = (pts, o) => `<polygon points="${B.pts(pts)}" ${A.attrs(o)}/>`;
  A.line = (a, b, o) => `<line x1="${a[0].toFixed(1)}" y1="${a[1].toFixed(1)}" x2="${b[0].toFixed(1)}" y2="${b[1].toFixed(1)}" ${A.attrs(o)}/>`;
  A.rect = (x, y, w, h, o) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" ${A.attrs(o)}/>`;
  A.circle = (x, y, r, o) => `<circle cx="${x}" cy="${y}" r="${r}" ${A.attrs(o)}/>`;
  A.ellipse = (x, y, rx, ry, o) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" ${A.attrs(o)}/>`;
  A.path = (d, o) => `<path d="${d}" ${A.attrs(o)}/>`;
  A.text = (x, y, s, o) => `<text x="${x}" y="${y}" ${A.attrs(o)}>${B.esc(s)}</text>`;

  A.INK = { stroke: C.ink, 'stroke-width': 1.6, 'stroke-linejoin': 'round' };
  A.ink = (extra) => Object.assign({}, A.INK, extra);

  /* Each SVG gets its own pattern ids so several drawings can share a page. */
  A.defs = (id) => `<defs>
    <pattern id="${id}-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)"><line x1="0" y1="0" x2="0" y2="6" stroke="${C.ink}" stroke-width="1" stroke-opacity="0.35"/></pattern>
    <pattern id="${id}-hatch2" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)"><line x1="0" y1="0" x2="0" y2="7" stroke="${C.ink}" stroke-width="1" stroke-opacity="0.28"/></pattern>
    <pattern id="${id}-awnR" width="16" height="16" patternUnits="userSpaceOnUse"><rect width="8" height="16" fill="${C.red}"/><rect x="8" width="8" height="16" fill="${C.card}"/></pattern>
    <pattern id="${id}-awnG" width="16" height="16" patternUnits="userSpaceOnUse"><rect width="8" height="16" fill="${C.verd}"/><rect x="8" width="8" height="16" fill="${C.card}"/></pattern>
    <radialGradient id="${id}-glow"><stop offset="0" stop-color="#F7D58A" stop-opacity="0.85"/><stop offset="1" stop-color="#F7D58A" stop-opacity="0"/></radialGradient>
    <radialGradient id="${id}-cool"><stop offset="0" stop-color="#BFE0D4" stop-opacity="0.9"/><stop offset="1" stop-color="#BFE0D4" stop-opacity="0"/></radialGradient>
    <clipPath id="${id}-left"><rect x="-2000" y="-2000" width="2500" height="5000"/></clipPath>
    <clipPath id="${id}-right"><rect x="500" y="-2000" width="2500" height="5000"/></clipPath>
  </defs>`;
  A.hatch = (id) => `url(#${id}-hatch)`;

  A.tree = (x, y, id) =>
    A.ellipse(x, y, 16, 6, { fill: C.ink, opacity: 0.12 }) +
    A.line([x, y], [x, y - 22], { stroke: C.ink, 'stroke-width': 2 }) +
    A.circle(x, y - 38, 20, { fill: C.leaf, stroke: C.ink, 'stroke-width': 1.5 }) +
    A.circle(x, y - 38, 20, { fill: A.hatch(id) });

  A.pencil = (x, y, rot = 35) => `<g transform="translate(${x} ${y}) rotate(${rot})">
    ${A.rect(0, 0, 10, 56, { fill: C.brass, stroke: C.ink, 'stroke-width': 1.5 })}
    ${A.poly([[0, 56], [10, 56], [5, 70]], { fill: C.paper, stroke: C.ink, 'stroke-width': 1.5 })}
    ${A.poly([[3.6, 65.5], [6.4, 65.5], [5, 70]], { fill: C.ink })}
  </g>`;

  A.compass = (x, y) => `<g opacity="0.55" fill="none" stroke="${C.ink}" stroke-width="1.2">
      ${A.circle(x, y, 48)}${A.circle(x, y, 40, { 'stroke-dasharray': '2 4' })}
      ${A.path(`M${x} ${y - 60} L${x + 9} ${y} L${x} ${y + 60} L${x - 9} ${y} Z`)}
      ${A.path(`M${x - 60} ${y} L${x} ${y - 9} L${x + 60} ${y} L${x} ${y + 9} Z`)}
    </g>
    ${A.path(`M${x} ${y - 60} L${x + 9} ${y} L${x - 9} ${y} Z`, { fill: C.red, opacity: 0.7 })}
    ${A.text(x, y - 70, 'N', { 'text-anchor': 'middle', 'font-family': 'IM Fell English, serif', 'font-size': 20, fill: C.ink, opacity: 0.75 })}`;

  A.mirrorText = (x, y, s, size, op) =>
    `<text transform="translate(${x} ${y}) scale(-1 1)" font-family="Caveat, cursive" font-size="${size}" fill="${C.ink}" opacity="${op}">${B.esc(s)}</text>`;

  /* A tiny dancer, used in windows and on studio floors. */
  A.dancer = (x, y, s = 1, pose = 0) => {
    const k = (v) => (v * s).toFixed(1);
    const d = pose === 0
      ? `M${x} ${y + 5 * s} V${y + 32 * s} M${x} ${y + 32 * s} L${x - 6 * s} ${y + 56 * s} M${x} ${y + 32 * s} L${x + 6 * s} ${y + 56 * s} M${x} ${y + 13 * s} L${x - 12 * s} ${y + 22 * s} M${x} ${y + 13 * s} L${x + 12 * s} ${y + 22 * s}`
      : `M${x} ${y + 5 * s} L${x + 2 * s} ${y + 34 * s} M${x + 2 * s} ${y + 34 * s} L${x - 2 * s} ${y + 62 * s} M${x + 2 * s} ${y + 34 * s} L${x + 21 * s} ${y + 28 * s} M${x} ${y + 14 * s} L${x - 13 * s} ${y} M${x} ${y + 14 * s} L${x + 15 * s} ${y + 6 * s}`;
    return `<g fill="none" stroke="${C.ink}" stroke-width="1.6" stroke-linecap="round">${A.circle(x, y, k(4.5))}${A.path(d)}</g>`;
  };

  /* Paint helper: given a fill level and which half, pick color or paper. */
  A.paint = (level, side, color) => {
    if (level === 'full') return color;
    if (level === 'half' && side === 'L') return color;
    return C.sketch;
  };

  A.svg = (viewBox, inner, o) => `<svg viewBox="${viewBox}" ${A.attrs(Object.assign({ xmlns: 'http://www.w3.org/2000/svg' }, o))}>${inner}</svg>`;
})();
