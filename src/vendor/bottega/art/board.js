/* The workbench drawing on a project page (viewBox 1000×750).
   Each drawing provides a "color" layer and an "ink" layer. The board shows:
     Ink only   → just the ink
     As built   → color on the left half, ink on the right (the signature look)
     Full render→ color everywhere
   parts[] are the numbered spots margin notes can pin to. */
(function () {
  const B = window.B;
  const C = B.C;
  const A = B.art;
  const red = { stroke: C.red, 'stroke-width': 1.4, fill: 'none' };
  const hand = (x, y, s, o) => A.text(x, y, s, Object.assign({ 'font-family': 'Caveat, cursive', 'font-size': 26, fill: C.red }, o));
  const dimH = (x1, x2, y, label) => A.line([x1, y], [x2, y], red) + A.line([x1, y - 10], [x1, y + 10], red) + A.line([x2, y - 10], [x2, y + 10], red) + hand((x1 + x2) / 2, y - 10, label, { 'text-anchor': 'middle', 'font-size': 28 });
  const dimV = (x, y1, y2, label) => A.line([x, y1], [x, y2], red) + A.line([x - 10, y1], [x + 10, y1], red) + A.line([x - 10, y2], [x + 10, y2], red) + `<text transform="translate(${x - 16} ${(y1 + y2) / 2}) rotate(-90)" text-anchor="middle" font-family="Caveat, cursive" font-size="28" fill="${C.red}">${B.esc(label)}</text>`;
  const O = { fill: 'none', stroke: C.ink, 'stroke-width': 2, 'stroke-linejoin': 'round' };
  const dims = (p) => p.specs || { width: 300, height: 300, unit: 'mm' };

  const BOARDS = {};

  BOARDS.espresso = () => {
    const color =
      A.rect(270, 590, 460, 22, { fill: C.ink }) + A.rect(300, 612, 40, 12, { fill: C.ink }) + A.rect(660, 612, 40, 12, { fill: C.ink }) +
      A.rect(280, 190, 440, 400, { fill: C.verd }) + A.rect(280, 190, 440, 12, { fill: C.verdDark }) + A.rect(280, 520, 440, 5, { fill: C.brass }) +
      A.rect(290, 168, 420, 22, { fill: C.brass }) + A.rect(300, 300, 400, 70, { fill: C.verdDark }) +
      A.circle(400, 335, 26, { fill: C.card }) + A.circle(600, 335, 26, { fill: C.card }) + A.rect(470, 322, 60, 26, { rx: 4, fill: C.brass }) +
      A.rect(355, 380, 90, 34, { fill: C.brass }) + A.rect(555, 380, 90, 34, { fill: C.brass }) + A.rect(365, 414, 70, 24, { fill: C.ink }) + A.rect(565, 414, 70, 24, { fill: C.ink }) +
      A.path('M394 438 L406 438 L398 506 L386 506 Z', { fill: C.ink }) + A.path('M594 438 L606 438 L598 506 L586 506 Z', { fill: C.ink }) +
      A.rect(300, 540, 400, 44, { fill: C.steel }) + A.path('M280 326 H248 V482 H256 V334 H280 Z', { fill: C.steel }) + A.path('M720 326 H752 V472 H744 V334 H720 Z', { fill: C.steel });
    let ink = `<g ${A.attrs(O)}>` +
      A.rect(270, 590, 460, 22) + A.rect(300, 612, 40, 12) + A.rect(660, 612, 40, 12) + A.rect(280, 190, 440, 400) + A.rect(290, 168, 420, 22) + A.line([280, 202], [720, 202]) +
      A.rect(300, 300, 400, 70) + A.circle(400, 335, 26) + A.circle(600, 335, 26) + A.rect(470, 322, 60, 26, { rx: 4 }) + A.rect(355, 380, 90, 34) + A.rect(555, 380, 90, 34) +
      A.rect(365, 414, 70, 24) + A.rect(565, 414, 70, 24) + A.path('M394 438 L406 438 L398 506 L386 506 Z') + A.path('M594 438 L606 438 L598 506 L586 506 Z') +
      A.rect(300, 540, 400, 44) + A.path('M280 326 H248 V482 H256 V334 H280') + A.path('M720 326 H752 V472 H744 V334 H720') + '</g>';
    ink += `<g stroke="${C.ink}" stroke-width="1" fill="none">${A.circle(400, 335, 19)}${A.circle(600, 335, 19)}${A.line([400, 335], [413, 319], { 'stroke-width': 2 })}${A.line([600, 335], [588, 317], { 'stroke-width': 2 })}`;
    for (let x = 320; x <= 680; x += 20) ink += A.line([x, 548], [x, 576]);
    ink += '</g>';
    ink += A.rect(305, 210, 390, 80, { rx: 8, fill: 'none', stroke: C.ink, 'stroke-width': 1.5, 'stroke-dasharray': '8 6' }) + A.circle(650, 226, 8, { fill: 'none', stroke: C.ink, 'stroke-width': 1.2, 'stroke-dasharray': '3 3' });
    ink += dimH(280, 720, 120, '440 mm') + A.line([280, 132], [280, 164], Object.assign({ 'stroke-dasharray': '3 4' }, red)) + A.line([720, 132], [720, 164], Object.assign({ 'stroke-dasharray': '3 4' }, red));
    ink += dimV(205, 168, 624, '456 mm');
    ink += A.path('M635 430 L700 490 H770', red) + hand(775, 497, 'Ø 58 mm') + A.path('M690 566 L760 600 H790', red) + hand(795, 607, '+12 mm, on rails') + A.path('M690 240 H755', red) + hand(762, 247, 'fill: top or back?');
    return { color, ink, hatch: [500, 190, 220, 400], parts: [{ n: 1, x: 620, y: 562, label: 'Drip tray' }, { n: 2, x: 665, y: 397, label: 'Group head' }, { n: 3, x: 620, y: 250, label: 'Water tank' }], caption: 'Front elevation · 1:4' };
  };

  BOARDS.register = () => {
    const color = A.rect(560, 150, 180, 70, { fill: C.ink }) + A.text(650, 196, '0.00', { 'text-anchor': 'middle', 'font-family': 'ui-monospace, Menlo, monospace', 'font-size': 34, fill: C.glow }) + A.rect(640, 220, 20, 30, { fill: C.ink }) +
      A.poly([[280, 330], [720, 330], [690, 250], [310, 250]], { fill: '#D9C39A' }) + A.rect(250, 330, 500, 240, { fill: '#6E8B7F' }) + A.rect(280, 470, 440, 70, { fill: '#5A7A6E' }) + A.rect(470, 495, 60, 14, { fill: C.brass }) + A.rect(260, 570, 60, 14, { fill: C.ink }) + A.rect(680, 570, 60, 14, { fill: C.ink });
    let keys = '';
    for (let r = 0; r < 3; r++) for (let i = 0; i < 7; i++) keys += A.rect(330 - r * 6 + i * (50 + r * 2), 262 + r * 22, 38 + r * 2, 14, { rx: 2 });
    let ink = `<g ${A.attrs(O)}>${A.rect(560, 150, 180, 70)}${A.poly([[280, 330], [720, 330], [690, 250], [310, 250]])}${A.rect(250, 330, 500, 240)}${A.rect(280, 470, 440, 70)}${A.rect(470, 495, 60, 14)}${A.rect(260, 570, 60, 14)}${A.rect(680, 570, 60, 14)}</g>`;
    ink += `<g fill="${C.card}" stroke="${C.ink}" stroke-width="1.2">${keys}</g>`;
    ink += A.line([290, 548], [710, 548], { stroke: C.ink, 'stroke-width': 1.5, 'stroke-dasharray': '8 6' });
    for (let x = 310; x <= 690; x += 38) ink += A.circle(x, 548, 5, { fill: 'none', stroke: C.ink, 'stroke-width': 1.2 });
    ink += dimH(250, 750, 640, '410 mm') + A.path('M720 548 L790 590 H820', red) + hand(826, 597, 'ball-bearing slides, 20 kg');
    return { color, ink, hatch: [500, 250, 250, 320], parts: [{ n: 1, x: 560, y: 520, label: 'Drawer slides' }, { n: 2, x: 420, y: 292, label: 'Keypad' }, { n: 3, x: 700, y: 185, label: 'Display' }], caption: 'Front view · 1:3' };
  };

  BOARDS.device = (p) => {
    const col = [C.verd, '#5E6E8C', C.red, C.brass][B.hash(p.name) % 4];
    const d = dims(p);
    const color = A.rect(290, 200, 420, 20, { fill: C.brassLight }) + A.rect(300, 220, 400, 360, { fill: col }) + A.rect(340, 260, 160, 70, { fill: C.ink }) + A.path('M360 295 h40 M410 295 h60', { stroke: C.glow, 'stroke-width': 6 }) +
      A.circle(580, 295, 26, { fill: C.card }) + A.circle(650, 295, 26, { fill: C.card }) + A.rect(320, 580, 70, 16, { fill: C.ink }) + A.rect(610, 580, 70, 16, { fill: C.ink });
    let ink = `<g ${A.attrs(O)}>${A.rect(290, 200, 420, 20)}${A.rect(300, 220, 400, 360)}${A.rect(340, 260, 160, 70)}${A.circle(580, 295, 26)}${A.circle(650, 295, 26)}${A.rect(320, 580, 70, 16)}${A.rect(610, 580, 70, 16)}</g>`;
    for (let i = 0; i < 6; i++) ink += A.line([340, 420 + i * 18], [660, 420 + i * 18], { stroke: C.ink, 'stroke-width': 1.5 });
    ink += A.line([580, 295], [592, 278], { stroke: C.ink, 'stroke-width': 2 }) + A.line([650, 295], [638, 278], { stroke: C.ink, 'stroke-width': 2 });
    ink += dimH(300, 700, 160, `${d.width} ${d.unit}`) + dimV(240, 200, 596, `${d.height} ${d.unit}`);
    return { color, ink, hatch: [500, 220, 200, 360], parts: [{ n: 1, x: 420, y: 295, label: 'Display' }, { n: 2, x: 615, y: 295, label: 'Controls' }, { n: 3, x: 500, y: 470, label: 'Body' }], caption: 'Front elevation' };
  };

  BOARDS.lamp = () => {
    const color = A.rect(400, 600, 200, 40, { fill: C.ink }) + A.path('M480 600 L560 380 L380 220', { fill: 'none', stroke: C.ink, 'stroke-width': 14, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }) +
      A.circle(560, 380, 14, { fill: C.brass }) + A.poly([[380, 220], [270, 280], [350, 350]], { fill: C.red }) + A.circle(325, 300, 70, { fill: '#F7D58A', opacity: 0.5 });
    const ink = `<g ${A.attrs(O)}>${A.rect(400, 600, 200, 40)}${A.path('M480 600 L560 380 L380 220')}${A.circle(560, 380, 14)}${A.poly([[380, 220], [270, 280], [350, 350]])}</g>` +
      A.path('M420 640 v30 h160 v-30', { fill: 'none', stroke: C.ink, 'stroke-width': 2, 'stroke-dasharray': '6 4' }) + A.circle(560, 380, 120, { fill: 'none', stroke: C.red, 'stroke-width': 1.2, 'stroke-dasharray': '4 6' }) + hand(690, 300, 'reach: 520 mm') + hand(620, 660, 'clamp fits 60 mm bench');
    return { color, ink, hatch: [500, 200, 200, 460], parts: [{ n: 1, x: 500, y: 620, label: 'Clamp' }, { n: 2, x: 560, y: 380, label: 'Joint' }, { n: 3, x: 330, y: 280, label: 'Shade' }], caption: 'Side view' };
  };

  BOARDS.rack = () => {
    const color = A.rect(180, 170, 640, 50, { fill: C.wood }) + [300, 500, 700].map((x) => A.path(`M${x} 220 v60 q0 24 24 24`, { fill: 'none', stroke: C.ink, 'stroke-width': 10, 'stroke-linecap': 'round' })).join('') + [300, 500, 700].map((x) => A.circle(x, 450, 110, { fill: 'none', stroke: C.ink, 'stroke-width': 8 })).join('');
    let ink = `<g ${A.attrs(O)}>${A.rect(180, 170, 640, 50)}</g>`;
    for (const x of [300, 500, 700]) { ink += A.path(`M${x} 220 v60 q0 24 24 24`, O) + A.circle(x, 450, 110, { fill: 'none', stroke: C.ink, 'stroke-width': 1.5, 'stroke-dasharray': '6 5' }); for (let a = 0; a < 6; a++) ink += A.line([x, 450], [x + 100 * Math.cos(a), 450 + 100 * Math.sin(a)], { stroke: C.ink, 'stroke-width': 0.8, opacity: 0.5 }); }
    for (const x of [220, 400, 600, 780]) ink += A.circle(x, 195, 6, { fill: C.card, stroke: C.ink, 'stroke-width': 1.5 });
    ink += dimH(300, 500, 130, '200 mm');
    return { color, ink, hatch: [500, 170, 320, 400], parts: [{ n: 1, x: 400, y: 195, label: 'Wall plank' }, { n: 2, x: 300, y: 280, label: 'Hook' }, { n: 3, x: 600, y: 450, label: 'Spacing' }], caption: 'Wall elevation' };
  };

  BOARDS.software = () => {
    let color = A.rect(120, 110, 260, 520, { rx: 30, fill: C.ink }) + A.rect(136, 150, 228, 440, { fill: '#CFE3DA' }) + A.rect(150, 166, 200, 34, { fill: C.verd });
    for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) color += A.rect(156 + c * 66, 230 + r * 66, 56, 54, { rx: 8, fill: C.card });
    color += A.rect(150, 520, 200, 48, { rx: 24, fill: C.red });
    color += A.rect(440, 150, 480, 330, { rx: 10, fill: C.ink }) + A.rect(454, 164, 452, 302, { fill: '#E9F1EC' }) + A.rect(454, 164, 110, 302, { fill: C.verdDark }) + A.rect(590, 186, 140, 90, { fill: C.card }) + A.rect(746, 186, 140, 90, { fill: C.card });
    for (let i = 0; i < 6; i++) color += A.rect(600 + i * 46, 430 - (30 + ((i * 37) % 90)), 30, 30 + ((i * 37) % 90), { fill: i % 2 ? C.brass : C.verd });
    color += A.rect(660, 480, 40, 60, { fill: C.ink }) + A.rect(600, 540, 160, 14, { fill: C.ink });
    let ink = `<g ${A.attrs(O)}>${A.rect(120, 110, 260, 520, { rx: 30 })}${A.rect(136, 150, 228, 440)}${A.rect(150, 166, 200, 34)}${A.rect(150, 520, 200, 48, { rx: 24 })}${A.rect(440, 150, 480, 330, { rx: 10 })}${A.rect(454, 164, 452, 302)}${A.line([564, 164], [564, 466])}${A.rect(590, 186, 140, 90)}${A.rect(746, 186, 140, 90)}${A.path('M660 480 v60 M700 480 v60 M600 554 h160')}</g>`;
    for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) ink += A.rect(156 + c * 66, 230 + r * 66, 56, 54, { rx: 8, fill: 'none', stroke: C.ink, 'stroke-width': 1.2 }) + A.text(184 + c * 66, 265 + r * 66, r === 3 ? ['', '0', ''][c] : String(r * 3 + c + 1), { 'text-anchor': 'middle', 'font-family': 'Karla, sans-serif', 'font-size': 20, fill: C.ink });
    ink += A.line([590, 430], [886, 430], { stroke: C.ink, 'stroke-width': 1.5 });
    ink += A.path('M380 545 C420 560 420 600 470 610', red) + hand(476, 620, 'big, thumb-sized button');
    return { color, ink, hatch: [500, 150, 420, 400], parts: [{ n: 1, x: 250, y: 330, label: 'Keypad' }, { n: 2, x: 250, y: 544, label: 'Main button' }, { n: 3, x: 740, y: 320, label: 'Dashboard' }], caption: 'Phone + desktop screens' };
  };

  BOARDS.music = (p) => {
    let color = A.rect(470, 150, 420, 200, { fill: C.glow, opacity: 0.45 }) + A.rect(110, 430, 380, 200, { fill: '#CFE3DA', opacity: 0.7 });
    let ink = A.text(500, 90, p.name, { 'text-anchor': 'middle', 'font-family': 'IM Fell English, serif', 'font-size': 38, fill: C.ink });
    const staff = (y0) => { let s = ''; for (let i = 0; i < 5; i++) s += A.line([100, y0 + i * 16], [900, y0 + i * 16], { stroke: C.ink, 'stroke-width': 1.2 }); return s + A.line([100, y0], [100, y0 + 64], { stroke: C.ink, 'stroke-width': 2 }) + A.line([900, y0], [900, y0 + 64], { stroke: C.ink, 'stroke-width': 2 }); };
    ink += staff(220) + staff(500);
    for (const x of [300, 500, 700]) ink += A.line([x, 220], [x, 284], { stroke: C.ink, 'stroke-width': 1.2 }) + A.line([x, 500], [x, 564], { stroke: C.ink, 'stroke-width': 1.2 });
    const melody = [8, 6, 5, 6, 4, 3, 2, 3, 5, 6, 8, 9, 8, 6, 5, 3];
    melody.forEach((v, i) => {
      const x = 130 + i * 49 + Math.floor(i / 4) * 2, y = 284 - v * 8;
      color += A.ellipse(x, y, 9, 6.5, { fill: C.ink, transform: `rotate(-20 ${x} ${y})` });
      ink += A.ellipse(x, y, 9, 6.5, { fill: 'none', stroke: C.ink, 'stroke-width': 1.5, transform: `rotate(-20 ${x} ${y})` }) + A.line([x + 8, y - 2], [x + 8, y - 44], { stroke: C.ink, 'stroke-width': 1.4 });
      const y2 = 564 - melody[(i + 5) % 16] * 8;
      color += A.ellipse(x, y2, 9, 6.5, { fill: C.ink, transform: `rotate(-20 ${x} ${y2})` });
      ink += A.ellipse(x, y2, 9, 6.5, { fill: 'none', stroke: C.ink, 'stroke-width': 1.5, transform: `rotate(-20 ${x} ${y2})` }) + A.line([x + 8, y2 - 2], [x + 8, y2 - 44], { stroke: C.ink, 'stroke-width': 1.4 });
    });
    ['C', 'Am', 'F', 'G'].forEach((c, i) => { color += A.text(140 + i * 200, 190, c, { 'font-family': 'Karla, sans-serif', 'font-weight': 700, 'font-size': 26, fill: C.red }); ink += A.text(140 + i * 200, 470, ['F', 'G', 'Em', 'Am'][i], { 'font-family': 'Karla, sans-serif', 'font-weight': 700, 'font-size': 26, fill: C.ink }); });
    ink += hand(120, 340, 'la la la… (words here)', { fill: C.ink2, 'font-size': 28 }) + hand(120, 620, 'and the chorus lifts here', { fill: C.ink2, 'font-size': 28 }) + hand(880, 140, '♩ = 92', { 'text-anchor': 'end' });
    return { color, ink, hatch: null, parts: [{ n: 1, x: 200, y: 250, label: 'Intro' }, { n: 2, x: 640, y: 250, label: 'Chorus' }, { n: 3, x: 450, y: 530, label: 'Bridge' }], caption: 'Lead sheet' };
  };

  BOARDS.dance = () => {
    const fl = [[140, 640], [860, 640], [760, 180], [240, 180]];
    let color = A.poly(fl, { fill: '#E5C99A' });
    let ink = A.poly(fl, O);
    for (let i = 1; i < 8; i++) { const t = i / 8; ink += A.line([140 + 720 * t, 640], [240 + 520 * t, 180], { stroke: C.ink, 'stroke-width': 0.8, opacity: 0.35 }); }
    for (let j = 1; j < 4; j++) { const t = j / 4; ink += A.line([140 + 100 * t, 640 - 460 * t], [860 - 100 * t, 640 - 460 * t], { stroke: C.ink, 'stroke-width': 0.8, opacity: 0.35 }); }
    const start = [[300, 560], [400, 560], [500, 560], [600, 560], [700, 560], [350, 470], [500, 470], [650, 470]];
    const end = [[380, 300], [440, 260], [500, 240], [560, 260], [620, 300], [320, 360], [500, 340], [680, 360]];
    start.forEach((s, i) => {
      const e = end[i];
      color += A.path(`M${s[0]} ${s[1]} Q${(s[0] + e[0]) / 2 + (i % 2 ? 40 : -40)} ${(s[1] + e[1]) / 2} ${e[0]} ${e[1]}`, { fill: 'none', stroke: C.red, 'stroke-width': 3, opacity: 0.6 });
      color += A.circle(e[0], e[1], 14, { fill: C.verd }) + A.circle(s[0], s[1], 14, { fill: C.red });
      ink += A.path(`M${s[0]} ${s[1]} Q${(s[0] + e[0]) / 2 + (i % 2 ? 40 : -40)} ${(s[1] + e[1]) / 2} ${e[0]} ${e[1]}`, { fill: 'none', stroke: C.ink, 'stroke-width': 1.2, 'stroke-dasharray': '5 5' });
      ink += A.circle(s[0], s[1], 14, { fill: 'none', stroke: C.ink, 'stroke-width': 1.5 }) + A.circle(e[0], e[1], 14, { fill: 'none', stroke: C.ink, 'stroke-width': 1.5, 'stroke-dasharray': '3 3' });
      ink += A.text(s[0], s[1] + 6, String(i + 1), { 'text-anchor': 'middle', 'font-family': 'Karla, sans-serif', 'font-weight': 700, 'font-size': 14, fill: C.ink });
    });
    ink += hand(500, 690, 'audience', { 'text-anchor': 'middle', fill: C.ink2 }) + hand(800, 220, 'counts 1–8: travel', { 'text-anchor': 'start' }) + hand(140, 140, 'counts 9–16: hold + turn', {});
    return { color, ink, hatch: null, parts: [{ n: 1, x: 500, y: 600, label: 'Opening line' }, { n: 2, x: 430, y: 420, label: 'Travel' }, { n: 3, x: 500, y: 240, label: 'Final shape' }], caption: 'Floor plan · 8 dancers' };
  };

  BOARDS.print = (p) => {
    const lines = (p.lines && p.lines.length ? p.lines : ['First item', 'Second item', 'Third item']).slice(0, 5);
    let color = A.rect(300, 80, 400, 590, { rx: 6, fill: C.woodDark }) + A.rect(318, 98, 364, 554, { fill: '#2F3B34' });
    color += A.text(500, 190, p.lines ? 'Today' : p.name, { 'text-anchor': 'middle', 'font-family': 'Caveat, cursive', 'font-size': 64, fill: C.paper });
    lines.forEach((ln, i) => { color += A.text(350, 300 + i * 70, ln, { 'font-family': 'Caveat, cursive', 'font-size': 40, fill: C.paper }) + A.text(650, 300 + i * 70, '[price]', { 'text-anchor': 'end', 'font-family': 'Caveat, cursive', 'font-size': 30, fill: C.glow }); });
    let ink = `<g ${A.attrs(O)}>${A.rect(300, 80, 400, 590, { rx: 6 })}${A.rect(318, 98, 364, 554)}</g>`;
    ink += A.rect(340, 130, 320, 90, { fill: 'none', stroke: C.red, 'stroke-width': 1, 'stroke-dasharray': '4 4' }) + A.rect(340, 250, 320, 330, { fill: 'none', stroke: C.red, 'stroke-width': 1, 'stroke-dasharray': '4 4' });
    lines.forEach((ln, i) => { ink += A.line([350, 300 + i * 70], [600, 300 + i * 70], { stroke: C.ink, 'stroke-width': 1, opacity: 0.4 }); });
    ink += hand(720, 180, 'headline: read from the door') + hand(720, 620, '600 × 900 mm');
    return { color, ink, hatch: [500, 98, 182, 554], parts: [{ n: 1, x: 500, y: 175, label: 'Headline' }, { n: 2, x: 500, y: 380, label: 'Items' }, { n: 3, x: 500, y: 620, label: 'Footer' }], caption: 'Layout · to scale' };
  };

  BOARDS.recipe = (p) => {
    let color = A.path('M150 330 h300 v60 a80 70 0 0 1 -80 90 h-140 a80 70 0 0 1 -80 -90 z', { fill: C.red }) + A.ellipse(300, 330, 150, 22, { fill: '#E5C99A' }) + A.circle(260, 322, 12, { fill: C.leaf }) + A.circle(320, 330, 10, { fill: C.brass }) + A.circle(350, 318, 8, { fill: C.leaf });
    let ink = A.path('M150 330 h300 v60 a80 70 0 0 1 -80 90 h-140 a80 70 0 0 1 -80 -90 z', O) + A.ellipse(300, 330, 150, 22, O) + A.path('M240 300 c-10 -14 10 -22 0 -40 M300 296 c-10 -14 10 -22 0 -40 M360 300 c-10 -14 10 -22 0 -40', { fill: 'none', stroke: C.ink, 'stroke-width': 1.6, opacity: 0.5 });
    ink += A.text(560, 160, p.name, { 'font-family': 'IM Fell English, serif', 'font-size': 36, fill: C.ink });
    const ing = p.ingredients || ['[amount] base', '[amount] spice', '[amount] sweetener', '[amount] garnish'];
    ing.forEach((t, i) => { ink += A.circle(570, 222 + i * 44, 5, { fill: C.ink }) + A.text(590, 230 + i * 44, t, { 'font-family': 'Karla, sans-serif', 'font-size': 24, fill: C.ink }); });
    ['1. Warm the base', '2. Bloom the spice', '3. Taste, adjust, serve'].forEach((t, i) => { ink += hand(560, 450 + i * 50, t, { fill: C.ink }); });
    ink += hand(150, 560, 'cost per serving: [YOUR TARGET]');
    return { color, ink, hatch: [300, 300, 160, 190], parts: [{ n: 1, x: 300, y: 400, label: 'Base' }, { n: 2, x: 640, y: 270, label: 'Ingredients' }, { n: 3, x: 640, y: 500, label: 'Method' }], caption: 'Recipe card' };
  };

  BOARDS.space = () => {
    let color = A.rect(150, 120, 700, 520, { fill: '#E5D3AE' }) + A.path('M180 150 h300 v60 h-240 v180 h-60 z', { fill: C.wood });
    for (const [x, y] of [[560, 300], [700, 300], [560, 460], [700, 460], [420, 520]]) color += A.circle(x, y, 40, { fill: C.verd });
    let ink = A.rect(150, 120, 700, 520, { fill: 'none', stroke: C.ink, 'stroke-width': 8 }) + A.path('M180 150 h300 v60 h-240 v180 h-60 z', O);
    for (const [x, y] of [[560, 300], [700, 300], [560, 460], [700, 460], [420, 520]]) { ink += A.circle(x, y, 40, O); for (let a = 0; a < 4; a++) ink += A.rect(x + 54 * Math.cos(a * 1.57) - 10, y + 54 * Math.sin(a * 1.57) - 10, 20, 20, { fill: 'none', stroke: C.ink, 'stroke-width': 1.4 }); }
    ink += A.path('M850 560 a80 80 0 0 0 -80 -80 v80', { fill: 'none', stroke: C.ink, 'stroke-width': 1.5, 'stroke-dasharray': '4 4' }) + A.line([150, 260], [150, 420], { stroke: C.sky, 'stroke-width': 8 });
    ink += dimH(150, 850, 90, '7.0 m') + dimV(110, 120, 640, '5.2 m');
    return { color, ink, hatch: [500, 120, 350, 520], parts: [{ n: 1, x: 320, y: 180, label: 'Counter' }, { n: 2, x: 630, y: 380, label: 'Seating' }, { n: 3, x: 800, y: 560, label: 'Entrance' }], caption: 'Floor plan · 1:50' };
  };

  A.MODES = { ink: { b: 0, r: 0, h: 1, sp: 0 }, built: { b: 1, r: 0, h: 1, sp: 1 }, render: { b: 1, r: 1, h: 0.15, sp: 0 } };
  A.modeForStage = (stage) => ({ sketch: 'ink', shape: 'ink', build: 'built', sent: 'render', arrived: 'render' }[stage] || 'ink');

  A.board = function (p, mode, opts) {
    opts = opts || {};
    const id = 'b' + Math.random().toString(36).slice(2, 7);
    const kind = B.art.drawingFor(p);
    const d = (BOARDS[kind] || BOARDS.device)(p);
    const m = A.MODES[mode] || A.MODES.ink;
    // Sketch-stage drawings get a hand-drawn wobble and no dimensions-in-color.
    const rough = opts.stage ? opts.stage === 'sketch' : p.stage === 'sketch' && mode === 'ink';
    let s = A.defs(id) + `<defs><filter id="${id}-rough"><feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="2" seed="${B.hash(p.name) % 50}"/><feDisplacementMap in="SourceGraphic" scale="9"/></filter></defs>`;
    if (!opts.thumb) s += `<g fill="none" stroke="${C.ink}" stroke-opacity="0.18" stroke-width="1" stroke-dasharray="5 7">${A.circle(500, 390, 300)}${A.line([180, 390], [820, 390])}${A.line([500, 70], [500, 700])}</g>`;
    s += `<g opacity="${m.b}" clip-path="url(#${id}-left)">${d.color}</g>`;
    s += `<g opacity="${m.r}" clip-path="url(#${id}-right)">${d.color}</g>`;
    if (d.hatch) s += A.rect(d.hatch[0], d.hatch[1], d.hatch[2], d.hatch[3], { fill: A.hatch(id), opacity: m.h });
    s += rough ? `<g filter="url(#${id}-rough)" opacity="0.85">${d.ink}</g>` : d.ink;
    s += A.line([500, 60], [500, 700], { stroke: C.red, 'stroke-width': 1.3, 'stroke-dasharray': '2 6', opacity: m.sp });
    const label = opts.thumb ? '' : `role="img" aria-label="${B.esc(p.name)}: ${B.esc(d.caption)}, shown as ${mode === 'ink' ? 'ink only' : mode === 'built' ? 'half built' : 'full render'}"`;
    return { svg: `<svg viewBox="0 0 1000 750" ${label} ${opts.thumb ? 'aria-hidden="true"' : ''}>${s}</svg>`, parts: d.parts, caption: d.caption };
  };
})();
