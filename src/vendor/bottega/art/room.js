/* Workshop interiors: one-point-perspective rooms whose furniture depends on the
   workshop type, with each project drawn as a physical object in the room.
   BOTTEGA DIVERGENCE: A.room also returns spots[] (click boxes per object,
   in percent) so the React port can lay transparent links over the drawing. */
(function () {
  const B = window.B;
  const C = B.C;
  const A = B.art;
  const W = 1600, H = 900;

  const ROOMS = {
    cafe: { back: '#EEDFC2', left: '#E6D6B6', right: '#DFCDA9', floor: '#E3CC9F', ceil: '#E2D2B2', wains: '#DCC59C', counter: ['#8B6B4A', '#A47E55'], L: 'shelves', Cz: 'chalkboard', R: 'pinboard', wall: 'C', lamps: 'pendant' },
    garage: { back: '#D9D3C4', left: '#CFC8B6', right: '#C7BFAB', floor: '#BDB5A3', ceil: '#CFC7B4', wains: null, counter: ['#9C7A50', '#7E6650'], L: 'pegboard', Cz: 'rolldoor', R: 'bins', wall: 'R', lamps: 'bulb' },
    studio: { back: '#EDE3D6', left: '#E4D8C8', right: '#DDD0BE', floor: '#D9B98A', ceil: '#E4D9CA', wains: null, counter: null, L: 'mirror', Cz: 'mirror', R: 'mirror', wall: 'R', lamps: 'spot' },
    store: { back: '#E8DFC6', left: '#E0D5B8', right: '#D8CCAD', floor: '#D8C7A0', ceil: '#E0D4B8', wains: '#D2C49E', counter: ['#5A7A6E', '#6E8B7F'], L: 'goods', Cz: 'sign', R: 'goods', wall: 'C', lamps: 'pendant' },
    kitchen: { back: '#E9E4D6', left: '#E0DACA', right: '#D8D1BF', floor: '#CFC5B0', ceil: '#E2DCCB', wains: null, counter: ['#B9B9B0', '#9C9C92'], L: 'pots', Cz: 'hood', R: 'pinboard', wall: 'R', lamps: 'pendant', tiles: true },
    music: { back: '#E3D5C0', left: '#DACBB4', right: '#D2C2A9', floor: '#C9AE84', ceil: '#DCCDB6', wains: null, counter: ['#6B4A2B', '#8B6B4A'], L: 'panels', Cz: 'frame', R: 'guitars', wall: 'C', lamps: 'pendant' },
    classroom: { back: '#E8E0C8', left: '#E0D7BC', right: '#D8CEB1', floor: '#D6C49C', ceil: '#E0D7BE', wains: '#D6C9A4', counter: ['#A47E55', '#C9A06B'], L: 'books', Cz: 'greenboard', R: 'pinboard', wall: 'C', lamps: 'pendant' },
    other: { back: '#ECE0C6', left: '#E3D6B9', right: '#DBCDAE', floor: '#DCC6A0', ceil: '#E0D2B4', wains: '#D8C6A0', counter: ['#8B6B4A', '#A47E55'], L: 'shelves', Cz: 'pinboard', R: 'shelves', wall: 'C', lamps: 'pendant' }
  };
  const ZONE = { L: [240, 120, 200, 293], C: [560, 118, 360, 236], R: [980, 120, 360, 260] };
  const COUNTER_SLOTS = [470, 720, 970, 1200];
  const FLOOR_SLOTS = [430, 800, 1170];

  /* ---------- room shell ---------- */
  function shell(r, id) {
    let s = '';
    s += A.poly([[0, 0], [1600, 0], [1400, 80], [200, 80]], { fill: r.ceil });
    s += A.poly([[0, 0], [40, 0], [200, 80], [200, 560], [0, 620]], A.ink({ fill: r.left, 'stroke-width': 1.5 }));
    s += A.poly([[1560, 0], [1600, 0], [1600, 620], [1400, 560], [1400, 80]], A.ink({ fill: r.right, 'stroke-width': 1.5 }));
    s += A.rect(200, 80, 1200, 480, A.ink({ fill: r.back, 'stroke-width': 1.5 }));
    s += A.poly([[200, 560], [1400, 560], [1600, 620], [1600, 900], [0, 900], [0, 620]], A.ink({ fill: r.floor, 'stroke-width': 1.5 }));
    s += `<g stroke="${C.woodDark}" stroke-width="6">${A.line([500, 80], [420, 0])}${A.line([800, 80], [800, 0])}${A.line([1100, 80], [1180, 0])}</g>`;
    let fl = '';
    for (let xb = 300; xb <= 1300; xb += 100) fl += A.line([xb, 560], [800 + 2.889 * (xb - 800), 900]);
    for (const y of [588, 624, 674, 748, 860]) fl += A.line([0, y], [1600, y]);
    s += `<g stroke="${C.ink}" stroke-width="1" stroke-opacity="0.2">${fl}</g>`;
    if (r.tiles) {
      let t = '';
      for (let x = 200; x <= 1400; x += 40) t += A.line([x, 300], [x, 560]);
      for (let y = 300; y <= 560; y += 40) t += A.line([200, y], [1400, y]);
      s += A.rect(200, 300, 1200, 260, { fill: '#F4F1E8' }) + `<g stroke="${C.ink}" stroke-width="0.8" stroke-opacity="0.18">${t}</g>`;
    }
    if (r.wains) {
      s += A.rect(200, 440, 1200, 120, A.ink({ fill: r.wains, 'stroke-width': 1.2 }));
      s += A.poly([[0, 520], [200, 440], [200, 560], [0, 620]], A.ink({ fill: r.wains, 'stroke-width': 1.2 }));
      s += A.poly([[1400, 440], [1600, 520], [1600, 620], [1400, 560]], A.ink({ fill: r.wains, 'stroke-width': 1.2 }));
    }
    // window on the left wall + light on the floor
    s += A.poly([[50, 155], [150, 185], [150, 393], [50, 395]], { fill: C.sky, stroke: C.woodDark, 'stroke-width': 5 });
    s += A.line([100, 170], [100, 394], { stroke: C.woodDark, 'stroke-width': 3 }) + A.line([50, 275], [150, 289], { stroke: C.woodDark, 'stroke-width': 3 });
    s += A.poly([[200, 600], [560, 650], [470, 780], [40, 710]], { fill: '#F7E2A8', opacity: 0.45 });
    // door on the right wall = the way back out to the world
    s += A.poly([[1446, 246], [1544, 227], [1544, 606], [1446, 579]], A.ink({ fill: C.wood, 'stroke-width': 1.5 }));
    s += A.poly([[1450, 250], [1540, 232], [1540, 602], [1450, 575]], A.ink({ fill: C.woodDark, 'stroke-width': 2 }));
    s += A.poly([[1462, 272], [1528, 260], [1528, 400], [1462, 404]], { fill: 'none', stroke: C.ink, 'stroke-width': 1.2, opacity: 0.6 });
    s += A.circle(1528, 420, 5, { fill: C.brass, stroke: C.ink, 'stroke-width': 1 });
    return s;
  }

  /* ---------- wall decor ---------- */
  const D = {};
  D.shelves = (x0) => {
    const dx = x0 - 240;
    let s = `<g transform="translate(${dx} 0)">`;
    s += A.rect(240, 120, 6, 293, { fill: C.wood }) + A.rect(434, 120, 6, 293, { fill: C.wood });
    s += `<g stroke="${C.ink}" stroke-width="1.2">` +
      A.rect(254, 150, 30, 40, { fill: C.brass }) + A.rect(290, 156, 30, 34, { fill: C.red }) + A.rect(326, 148, 30, 42, { fill: '#D9C39A' }) +
      A.rect(372, 160, 26, 30, { rx: 4, fill: '#CFDDD6' }) + A.rect(404, 166, 24, 24, { rx: 4, fill: '#CFDDD6' }) +
      A.rect(256, 240, 26, 25, { fill: C.card }) + A.rect(288, 240, 26, 25, { fill: C.card }) + A.rect(272, 216, 26, 24, { fill: C.card }) +
      A.rect(340, 222, 10, 43, { fill: '#6E8B7F' }) + A.rect(352, 228, 10, 37, { fill: C.red }) + A.rect(364, 220, 12, 45, { fill: C.brass }) + A.rect(384, 236, 44, 29, { rx: 3, fill: '#E6D6B6' }) +
      A.rect(256, 300, 18, 40, { rx: 3, fill: C.red }) + A.rect(280, 306, 18, 34, { rx: 3, fill: C.brass }) + A.rect(304, 302, 18, 38, { rx: 3, fill: C.woodDark }) +
      A.rect(360, 318, 36, 22, { fill: C.red }) + A.rect(408, 312, 24, 28, { rx: 4, fill: '#CFDDD6' }) +
      A.rect(250, 370, 80, 35, { rx: 4, fill: '#C9A06B' }) + A.rect(340, 370, 88, 35, { rx: 4, fill: '#C9A06B' }) + '</g>';
    s += A.path('M378 318 C366 300 370 290 378 284 C382 296 384 306 378 318 Z M378 318 C392 302 398 294 394 284 C386 294 380 306 378 318 Z', A.ink({ fill: C.leaf, 'stroke-width': 1 }));
    s += `<g fill="${C.wood}" stroke="${C.ink}" stroke-width="1">` + [190, 265, 340, 405].map((y) => A.rect(240, y, 200, 8)).join('') + '</g>';
    return s + '</g>';
  };
  D.chalkboard = (ws) => {
    let s = A.rect(560, 118, 360, 236, A.ink({ rx: 4, fill: C.woodDark, 'stroke-width': 1.5 })) + A.rect(572, 130, 336, 212, { fill: '#2F3B34' });
    s += A.text(740, 176, 'Today', { 'text-anchor': 'middle', 'font-family': 'Caveat, cursive', 'font-size': 36, fill: C.paper });
    s += A.path('M690 186 C720 182 760 188 790 184', { fill: 'none', stroke: C.paper, 'stroke-width': 1.5 });
    for (const [i, w] of [[0, 170], [1, 140], [2, 190]]) s += A.path(`M604 ${222 + i * 36} q${w / 2} -6 ${w} 0`, { fill: 'none', stroke: C.paper, 'stroke-width': 2, opacity: 0.8 });
    s += A.rect(566, 354, 348, 8, A.ink({ fill: C.wood, 'stroke-width': 1 }));
    return s;
  };
  D.greenboard = () => {
    let s = A.rect(540, 110, 400, 250, A.ink({ rx: 4, fill: C.woodDark })) + A.rect(552, 122, 376, 226, { fill: '#33503F' });
    s += A.text(740, 190, 'a² + b² = c²', { 'text-anchor': 'middle', 'font-family': 'Caveat, cursive', 'font-size': 44, fill: C.paper });
    s += A.path('M640 270 l60 -50 l60 50 z', { fill: 'none', stroke: C.paper, 'stroke-width': 2 }) + A.path('M800 290 q40 -60 80 0', { fill: 'none', stroke: C.paper, 'stroke-width': 2, 'stroke-dasharray': '4 4' });
    return s + A.rect(546, 360, 388, 8, A.ink({ fill: C.wood, 'stroke-width': 1 }));
  };
  D.pinboard = (x0, w = 360, h = 260) => {
    const dx = x0 - 980;
    let s = `<g transform="translate(${dx} 0)">`;
    s += A.rect(980, 120, w, h, A.ink({ rx: 4, fill: C.wood, 'stroke-width': 1.5 })) + A.rect(992, 132, w - 24, h - 24, { fill: '#C9A06B' });
    s += `<g transform="rotate(-3 1056 207)">${A.rect(1010, 148, 92, 118, A.ink({ fill: C.card, 'stroke-width': 1 }))}${A.rect(1038, 160, 36, 64, A.ink({ rx: 5, fill: 'none', 'stroke-width': 1.2 }))}${A.path('M1044 172 h24 M1044 182 h24 M1044 192 h14 M1020 240 h70 M1020 250 h48', { stroke: C.ink, 'stroke-width': 1, fill: 'none', opacity: 0.7 })}${A.circle(1056, 152, 4, { fill: C.red })}</g>`;
    s += `<g transform="rotate(2 1164 211)">${A.rect(1118, 156, 92, 110, A.ink({ fill: C.card, 'stroke-width': 1 }))}${A.path('M1132 230 h64 v-26 l-8 -16 h-48 l-8 16 z M1140 196 h48', { fill: 'none', stroke: C.ink, 'stroke-width': 1.2 })}${A.circle(1164, 160, 4, { fill: C.red })}</g>`;
    if (w >= 360) s += `<g transform="rotate(1.5 1270 300)">${A.rect(1232, 262, 84, 58, A.ink({ fill: '#F2E3B5', 'stroke-width': 1 }))}${A.path('M1240 282 h60 M1240 296 h44', { stroke: C.ink, 'stroke-width': 1.2, fill: 'none', opacity: 0.6 })}</g>`;
    s += A.rect(1124, 288, 72, 70, A.ink({ fill: C.card, 'stroke-width': 1 })) + A.rect(1130, 294, 60, 46, { fill: C.leaf }) + A.path('M1130 340 l18 -20 l14 12 l10 -8 l18 16 z', { fill: C.verd });
    return s + '</g>';
  };
  D.pegboard = () => {
    let s = A.rect(230, 120, 220, 290, A.ink({ fill: '#C9A06B' }));
    let dots = '';
    for (let x = 245; x < 450; x += 18) for (let y = 135; y < 410; y += 18) dots += A.circle(x, y, 1.6);
    s += `<g fill="${C.ink}" opacity="0.35">${dots}</g>`;
    s += A.path('M270 160 v90 M258 160 h24 v14 h-24 z', A.ink({ fill: C.steel, 'stroke-width': 2 }));
    s += A.path('M330 150 l10 10 l-6 6 l40 70 l-8 5 l-40 -70 l-6 2 z', A.ink({ fill: C.steel, 'stroke-width': 1.5 }));
    s += A.path('M395 160 h30 v100 h-30 z M400 260 l10 30 l10 -30', A.ink({ fill: C.red, 'stroke-width': 1.5 }));
    s += A.path('M250 300 h140 l-12 50 h-116 z', A.ink({ fill: C.steel, 'stroke-width': 1.5 })) + A.path('M262 315 h116 M268 330 h104', { stroke: C.ink, 'stroke-width': 1, opacity: 0.5 });
    return s;
  };
  D.rolldoor = () => {
    let s = A.rect(530, 140, 420, 420, A.ink({ fill: '#B9B1A0', 'stroke-width': 2 }));
    let sl = '';
    for (let y = 160; y < 560; y += 22) sl += A.line([530, y], [950, y]);
    s += `<g stroke="${C.ink}" stroke-width="1" opacity="0.5">${sl}</g>`;
    s += A.rect(720, 520, 40, 10, A.ink({ fill: C.steel, 'stroke-width': 1.2 }));
    return s + A.rect(520, 128, 440, 14, A.ink({ fill: C.woodDark }));
  };
  D.bins = (x0) => {
    const dx = x0 - 980;
    let s = `<g transform="translate(${dx} 0)">` + A.rect(990, 130, 340, 270, A.ink({ fill: 'none', 'stroke-width': 1.5 }));
    const cols = [C.red, C.brass, C.verd, '#5E6E8C', C.brass, C.red];
    [170, 250, 330].forEach((y, r) => {
      s += A.rect(990, y + 40, 340, 8, A.ink({ fill: C.wood, 'stroke-width': 1 }));
      for (let i = 0; i < 6; i++) s += A.path(`M${1000 + i * 55} ${y} h48 l-4 40 h-40 z`, A.ink({ fill: cols[(i + r) % 6], 'stroke-width': 1.2 }));
    });
    return s + '</g>';
  };
  D.mirror = (x0, w) => {
    let s = A.rect(x0, 110, w, 330, A.ink({ fill: '#D6E2E0', 'stroke-width': 2 }));
    s += A.path(`M${x0 + w * 0.2} 130 l${w * 0.3} 160 M${x0 + w * 0.32} 130 l${w * 0.18} 96 M${x0 + w * 0.65} 200 l${w * 0.2} 110`, { stroke: '#FFFFFF', 'stroke-width': 3, opacity: 0.7 });
    return s;
  };
  D.goods = (x0) => {
    let s = A.rect(x0, 120, 200, 300, A.ink({ fill: '#D9C9A2', 'stroke-width': 1.5 }));
    const cols = [C.red, C.brass, C.verd, '#5E6E8C', C.card, C.leaf];
    [170, 240, 310, 380].forEach((y, r) => {
      s += A.rect(x0, y + 30, 200, 6, A.ink({ fill: C.wood, 'stroke-width': 1 }));
      for (let i = 0; i < 7; i++) s += A.rect(x0 + 8 + i * 27, y - 4 + ((i + r) % 3) * 4, 22, 34 - ((i + r) % 3) * 4, A.ink({ fill: cols[(i * 2 + r) % 6], 'stroke-width': 1 }));
    });
    return s;
  };
  D.sign = (ws) => {
    let s = A.rect(570, 140, 340, 120, A.ink({ rx: 6, fill: C.card, 'stroke-width': 2 }));
    s += A.text(740, 214, ws.name, { 'text-anchor': 'middle', 'font-family': 'IM Fell English, serif', 'font-size': 40, fill: C.ink });
    s += A.line([600, 236], [880, 236], { stroke: C.red, 'stroke-width': 2 });
    return s;
  };
  D.pots = () => {
    let s = A.rect(240, 160, 200, 8, A.ink({ fill: C.woodDark }));
    [[270, 40, C.brass], [330, 34, C.red], [395, 44, C.steel]].forEach(([x, r, c]) => {
      s += A.line([x, 168], [x, 188], { stroke: C.ink, 'stroke-width': 2 }) + A.circle(x, 188 + r, r, A.ink({ fill: c }));
    });
    return s;
  };
  D.hood = () => A.poly([[600, 120], [880, 120], [940, 260], [540, 260]], A.ink({ fill: C.steel, 'stroke-width': 2 })) + A.rect(700, 80, 80, 40, A.ink({ fill: C.steel }));
  D.panels = () => {
    let s = '';
    for (let r = 0; r < 3; r++) for (let c = 0; c < 2; c++) s += A.rect(250 + c * 96, 130 + r * 92, 86, 82, A.ink({ fill: (r + c) % 2 ? '#5E6E8C' : '#7E6650', 'stroke-width': 1.2 }));
    return s;
  };
  D.frame = () => A.rect(600, 130, 280, 210, A.ink({ fill: C.card, 'stroke-width': 3 })) + A.circle(740, 235, 70, A.ink({ fill: C.ink })) + A.circle(740, 235, 18, { fill: C.red }) + A.circle(740, 235, 4, { fill: C.card });
  D.guitars = (x0) => {
    let s = '';
    [x0 + 60, x0 + 170, x0 + 280].forEach((x, i) => {
      const c = [C.red, C.brass, C.verd][i];
      s += A.line([x, 140], [x, 260], { stroke: C.woodDark, 'stroke-width': 8 }) + A.path(`M${x} 255 c-40 0 -44 40 -24 56 c-24 20 -18 70 24 70 c42 0 48 -50 24 -70 c20 -16 16 -56 -24 -56 z`, A.ink({ fill: c, 'stroke-width': 1.5 })) + A.circle(x, 315, 9, { fill: C.ink });
    });
    return s;
  };
  D.books = () => {
    let s = A.rect(240, 120, 200, 290, A.ink({ fill: 'none' }));
    const cols = [C.red, C.verd, C.brass, '#5E6E8C', C.woodDark];
    [190, 265, 340, 405].forEach((y, r) => {
      s += A.rect(240, y, 200, 8, A.ink({ fill: C.wood, 'stroke-width': 1 }));
      let x = 248;
      for (let i = 0; i < 11 && x < 430; i++) { const w = 10 + ((i + r) % 3) * 4; s += A.rect(x, y - 50 + ((i * 7 + r) % 10), w, 50 - ((i * 7 + r) % 10), A.ink({ fill: cols[(i + r) % 5], 'stroke-width': 1 })); x += w + 3; }
    });
    return s;
  };

  function decor(r, zone, ws) {
    const kind = r[zone === 'C' ? 'Cz' : zone];
    const [x0, , w] = ZONE[zone];
    switch (kind) {
      case 'shelves': return D.shelves(x0);
      case 'chalkboard': return D.chalkboard(ws);
      case 'greenboard': return D.greenboard(ws);
      case 'pinboard': return D.pinboard(x0 === 560 ? 560 : 980, zone === 'C' ? 360 : 360);
      case 'pegboard': return D.pegboard();
      case 'rolldoor': return D.rolldoor();
      case 'bins': return D.bins(x0);
      case 'mirror': return D.mirror(zone === 'L' ? 230 : zone === 'C' ? 600 : 970, zone === 'C' ? 350 : 360);
      case 'goods': return D.goods(zone === 'L' ? 240 : 1100);
      case 'sign': return D.sign(ws);
      case 'pots': return D.pots();
      case 'hood': return D.hood();
      case 'panels': return D.panels();
      case 'frame': return D.frame();
      case 'guitars': return D.guitars(x0);
      case 'books': return D.books();
      default: return '';
    }
  }

  function lamps(r, id) {
    let s = '';
    for (const x of [500, 950, 1370]) {
      if (r.lamps === 'spot') {
        s += A.circle(x, 110, 70, { fill: `url(#${id}-glow)` }) + A.rect(x - 14, 82, 28, 22, A.ink({ fill: C.ink }));
        continue;
      }
      const len = r.lamps === 'bulb' ? 120 : 148;
      s += A.line([x, 0], [x, len], { stroke: C.ink, 'stroke-width': 1.5 }) + A.circle(x, len + 40, 70, { fill: `url(#${id}-glow)` });
      if (r.lamps === 'bulb') s += A.circle(x, len + 12, 12, A.ink({ fill: '#F7D58A' })) + A.rect(x - 6, len, 12, 6, { fill: C.ink });
      else s += A.poly([[x - 24, len + 28], [x + 24, len + 28], [x + 12, len], [x - 12, len]], A.ink({ fill: C.verd }));
    }
    if (r.lamps === 'spot') s += A.rect(220, 76, 1160, 6, { fill: C.ink });
    return s;
  }

  function counter(r) {
    const [top, front] = r.counter;
    let s = A.poly([[300, 585], [1300, 585], [1340, 615], [260, 615]], A.ink({ fill: top, 'stroke-width': 2 }));
    s += A.rect(260, 615, 1080, 170, A.ink({ fill: front, 'stroke-width': 2 }));
    s += `<g stroke="${C.ink}" stroke-width="1.2" opacity="0.5">` + [395, 530, 665, 800, 935, 1070, 1205].map((x) => A.line([x, 625], [x, 775])).join('') + '</g>';
    s += A.rect(260, 775, 1080, 12, A.ink({ fill: C.woodDark, 'stroke-width': 1.5 }));
    s += `<g stroke="${C.ink}" stroke-width="3" stroke-linecap="round">${A.line([392, 812], [380, 900])}${A.line([448, 812], [460, 900])}${A.line([1152, 812], [1140, 900])}${A.line([1208, 812], [1220, 900])}</g>`;
    s += A.ellipse(420, 806, 46, 12, A.ink({ fill: C.woodDark })) + A.ellipse(1180, 806, 46, 12, A.ink({ fill: C.woodDark }));
    return s;
  }

  /* ---------- project objects (x = center, y = base line) ---------- */
  const O = {};
  B.art.drawingFor = (p) => {
    if (p.drawing) return p.drawing;
    const n = (p.name || '').toLowerCase();
    if (p.medium !== 'hardware') return p.medium;
    if (/espresso|coffee machine/.test(n)) return 'espresso';
    if (/register|till|cash/.test(n)) return 'register';
    if (/lamp|light/.test(n)) return 'lamp';
    if (/rack|hook|hanger|holder/.test(n)) return 'rack';
    return 'device';
  };
  const bodyColor = (p) => [C.verd, '#5E6E8C', C.red, C.brass][B.hash(p.name) % 4];

  O.espresso = (x, y, lv, id) => {
    const L = lv !== 'ink', R = lv === 'full';
    const dash = (on) => (on ? {} : { 'stroke-dasharray': '3 2' });
    let s = `<g transform="translate(${x - 490} ${y - 595})">`;
    s += A.poly([[398, 458], [490, 458], [490, 470], [390, 470]], { fill: L ? C.brassLight : C.sketch });
    s += A.poly([[490, 458], [582, 458], [590, 470], [490, 470]], { fill: R ? C.brassLight : C.sketch });
    s += A.rect(390, 470, 100, 125, { fill: L ? C.verd : C.sketch }) + A.rect(490, 470, 100, 125, { fill: R ? C.verd : C.sketch });
    if (!L) s += A.rect(390, 470, 100, 125, { fill: A.hatch(id) });
    if (!R) s += A.rect(490, 470, 100, 125, { fill: A.hatch(id) });
    s += A.rect(390, 490, 100, 24, Object.assign({ fill: L ? C.verdDark : 'none', stroke: C.ink, 'stroke-width': L ? 0 : 1.2 }));
    s += A.rect(490, 490, 100, 24, { fill: R ? C.verdDark : 'none', stroke: C.ink, 'stroke-width': R ? 0 : 1.2 });
    s += A.poly([[398, 458], [582, 458], [590, 470], [390, 470]], A.ink({ fill: 'none', 'stroke-width': 2 })) + A.rect(390, 470, 200, 125, A.ink({ fill: 'none', 'stroke-width': 2 }));
    s += A.circle(440, 502, 10, A.ink(Object.assign({ fill: L ? C.paper : 'none', 'stroke-width': 1.5 }, dash(L))));
    s += A.circle(540, 502, 10, A.ink(Object.assign({ fill: R ? C.paper : 'none', 'stroke-width': 1.5 }, dash(R))));
    s += A.rect(425, 530, 30, 12, A.ink(Object.assign({ fill: L ? C.brass : 'none', 'stroke-width': 1.5 }, dash(L))));
    s += A.rect(525, 530, 30, 12, A.ink(Object.assign({ fill: R ? C.brass : 'none', 'stroke-width': 1.5 }, dash(R))));
    s += A.line([440, 544], [436, 572], L ? { stroke: C.ink, 'stroke-width': 6, 'stroke-linecap': 'round' } : { stroke: C.ink, 'stroke-width': 1.5, 'stroke-dasharray': '3 3' });
    s += A.line([540, 544], [536, 572], R ? { stroke: C.ink, 'stroke-width': 6, 'stroke-linecap': 'round' } : { stroke: C.ink, 'stroke-width': 1.5, 'stroke-dasharray': '3 3' });
    s += A.rect(398, 578, 92, 12, A.ink({ fill: L ? C.steel : 'none', 'stroke-width': 1.2 })) + A.rect(490, 578, 92, 12, A.ink({ fill: R ? C.steel : 'none', 'stroke-width': 1.2 }));
    s += A.path('M390 500 H376 V556', { fill: 'none', stroke: C.ink, 'stroke-width': 4, 'stroke-linecap': 'round' });
    if (lv !== 'full') {
      const red = { stroke: C.red, 'stroke-width': 1.3, fill: 'none' };
      s += A.line([490, 446], [590, 446], red) + A.line([490, 440], [490, 452], red) + A.line([590, 440], [590, 452], red);
      s += A.line([600, 430], [600, 605], Object.assign({ 'stroke-dasharray': '4 5', opacity: 0.6 }, red));
      s += A.ellipse(540, 537, 26, 16, Object.assign({ 'stroke-dasharray': '3 3' }, red));
      s += A.text(540, 440, '220', { 'text-anchor': 'middle', 'font-family': 'Caveat, cursive', 'font-size': 20, fill: C.red });
    }
    return { svg: s + '</g>', h: 156 };
  };

  O.register = (x, y, lv, id, p) => {
    const L = lv !== 'ink', R = lv === 'full';
    let s = `<g transform="translate(${x - 1050} ${y - 595})">`;
    s += A.rect(1040, 468, 80, 30, { fill: L ? C.ink : 'none', stroke: C.ink, 'stroke-width': 1.5 });
    s += A.text(1080, 489, '0.00', { 'text-anchor': 'middle', 'font-family': 'ui-monospace, Menlo, monospace', 'font-size': 16, fill: L ? C.glow : C.ink });
    s += A.rect(1076, 498, 8, 10, { fill: C.ink });
    s += A.poly([[975, 540], [1125, 540], [1110, 508], [990, 508]], A.ink({ fill: L ? '#D9C39A' : C.sketch, 'stroke-width': 1.5 }));
    let keys = '';
    for (let r = 0; r < 3; r++) for (let i = 0; i < 5; i++) keys += A.rect(996 - r * 5 + i * (22 + r), 512 + r * 9, 14 + r, 5 + (r ? 1 : 0));
    s += `<g fill="${C.card}" stroke="${C.ink}" stroke-width="0.8">${keys}</g>`;
    s += A.rect(960, 540, 90, 55, { fill: L ? '#6E8B7F' : C.sketch }) + A.rect(1050, 540, 90, 55, { fill: R ? '#6E8B7F' : C.sketch });
    if (!R) s += A.rect(1050, 540, 90, 55, { fill: A.hatch(id) });
    s += A.rect(960, 540, 180, 55, A.ink({ fill: 'none', 'stroke-width': 2 }));
    s += A.rect(972, 572, 156, 16, A.ink({ fill: L ? '#5A7A6E' : 'none', 'stroke-width': 1.5 })) + A.rect(968, 588, 164, 6, A.ink({ fill: L ? '#4E6B60' : 'none', 'stroke-width': 1 })) + A.rect(1040, 577, 20, 5, { fill: C.brass });
    if (lv !== 'full') {
      s += A.ellipse(1050, 584, 100, 20, { fill: 'none', stroke: C.red, 'stroke-width': 1.5, 'stroke-dasharray': '4 4' });
      s += A.text(1150, 534, 'sticks!', { 'font-family': 'Caveat, cursive', 'font-size': 24, fill: C.red });
    }
    return { svg: s + '</g>', h: 130 };
  };

  O.device = (x, y, lv, id, p) => {
    const L = lv !== 'ink', R = lv === 'full';
    const col = bodyColor(p);
    let s = A.poly([[x - 72, y - 122], [x + 72, y - 122], [x + 80, y - 110], [x - 80, y - 110]], A.ink({ fill: L ? C.brassLight : C.sketch }));
    s += A.rect(x - 80, y - 110, 80, 104, { fill: L ? col : C.sketch }) + A.rect(x, y - 110, 80, 104, { fill: R ? col : C.sketch });
    if (!R) s += A.rect(x, y - 110, 80, 104, { fill: A.hatch(id) });
    if (!L) s += A.rect(x - 80, y - 110, 80, 104, { fill: A.hatch(id) });
    s += A.rect(x - 80, y - 110, 160, 104, A.ink({ fill: 'none', 'stroke-width': 2 }));
    s += A.rect(x - 64, y - 96, 64, 26, A.ink({ fill: L ? C.ink : 'none', 'stroke-width': 1.4 }));
    if (L) s += A.path(`M${x - 58} ${y - 83} h14 M${x - 40} ${y - 83} h20`, { stroke: C.glow, 'stroke-width': 3 });
    s += A.circle(x + 26, y - 83, 10, A.ink({ fill: L ? C.card : 'none', 'stroke-width': 1.4 })) + A.circle(x + 56, y - 83, 10, A.ink({ fill: R ? C.card : 'none', 'stroke-width': 1.4, 'stroke-dasharray': R ? null : '2 2' }));
    for (let i = 0; i < 4; i++) s += A.line([x - 60, y - 52 + i * 9], [x + 60, y - 52 + i * 9], { stroke: C.ink, 'stroke-width': 1.2, opacity: 0.6 });
    s += A.rect(x - 70, y - 6, 24, 6, { fill: C.ink }) + A.rect(x + 46, y - 6, 24, 6, { fill: C.ink });
    if (lv === 'ink') s += A.circle(x, y - 60, 92, { fill: 'none', stroke: C.red, 'stroke-width': 1, 'stroke-dasharray': '3 5', opacity: 0.6 });
    return { svg: s, h: 128 };
  };

  O.lamp = (x, y, lv, id) => {
    const L = lv !== 'ink';
    const ln = L ? { stroke: C.ink, 'stroke-width': 7, 'stroke-linecap': 'round' } : { stroke: C.ink, 'stroke-width': 1.6, 'stroke-dasharray': '4 3' };
    let s = A.rect(x - 40, y - 14, 80, 14, A.ink({ fill: L ? C.ink : 'none' }));
    s += A.line([x - 20, y - 14], [x + 10, y - 90], ln) + A.line([x + 10, y - 90], [x - 40, y - 150], ln);
    s += A.circle(x + 10, y - 90, 6, A.ink({ fill: L ? C.brass : 'none' }));
    s += A.poly([[x - 40, y - 150], [x - 86, y - 130], [x - 56, y - 104]], A.ink({ fill: L ? C.red : C.sketch, 'stroke-width': 1.8 }));
    if (L) s += A.circle(x - 66, y - 112, 30, { fill: `url(#${id}-glow)` });
    if (!L) s += A.circle(x + 10, y - 90, 70, { fill: 'none', stroke: C.red, 'stroke-width': 1, 'stroke-dasharray': '3 5', opacity: 0.6 });
    return { svg: s, h: 160 };
  };

  O.rack = (x, y, lv, id) => {
    const L = lv !== 'ink';
    let s = A.rect(x - 90, y - 150, 180, 18, A.ink({ fill: L ? C.wood : C.sketch }));
    for (const dx of [-60, 0, 60]) {
      s += A.path(`M${x + dx} ${y - 132} v24 q0 10 10 10`, { fill: 'none', stroke: C.ink, 'stroke-width': L ? 4 : 1.5 });
      s += A.circle(x + dx, y - 50, 34, { fill: 'none', stroke: L ? C.ink : C.ink2, 'stroke-width': L ? 3 : 1.2, 'stroke-dasharray': L ? null : '3 3' });
      s += A.circle(x + dx, y - 50, 4, { fill: C.ink });
    }
    return { svg: s, h: 152 };
  };

  O.software = (x, y, lv, id) => {
    let s = '';
    if (lv !== 'ink') s += A.circle(x, y - 58, 90, { fill: `url(#${id}-cool)` });
    s += A.rect(x - 3, y - 23, 6, 22, { fill: C.ink }) + A.ellipse(x, y, 22, 4, { fill: C.ink });
    s += A.rect(x - 50, y - 93, 100, 72, { rx: 6, fill: C.ink });
    const scr = lv === 'ink' ? C.card : '#CFE3DA';
    s += A.rect(x - 44, y - 87, 88, 60, { rx: 2, fill: scr });
    if (lv === 'ink') {
      s += A.path(`M${x - 38} ${y - 79} h76 M${x - 38} ${y - 67} h34 M${x + 2} ${y - 67} h34 M${x - 38} ${y - 50} h34 M${x + 2} ${y - 50} h34 M${x - 38} ${y - 36} h76`, { stroke: C.ink, 'stroke-width': 1.2, 'stroke-dasharray': '3 2' });
    } else {
      const R = lv === 'full';
      s += A.rect(x - 40, y - 83, 80, 8, { fill: C.verd });
      s += A.rect(x - 40, y - 70, 38, 18, { fill: C.card }) + A.rect(x + 2, y - 70, 38, 18, { fill: R ? C.card : 'none', stroke: C.ink, 'stroke-width': R ? 0 : 1, 'stroke-dasharray': '2 2' });
      s += A.rect(x - 40, y - 46, 80, 12, { rx: 6, fill: R ? C.red : 'none', stroke: C.red, 'stroke-width': 1.2 });
    }
    return { svg: s, h: 96 };
  };

  O.music = (x, y, lv) => {
    const L = lv !== 'ink';
    let s = A.line([x, y], [x, y - 80], { stroke: C.ink, 'stroke-width': 3 }) + A.path(`M${x - 24} ${y} L${x} ${y - 20} L${x + 24} ${y}`, { fill: 'none', stroke: C.ink, 'stroke-width': 2.5 });
    s += A.rect(x - 70, y - 160, 140, 84, A.ink({ fill: C.card }));
    for (const base of [y - 146, y - 112]) for (let i = 0; i < 5; i++) s += A.line([x - 62, base + i * 5], [x + 62, base + i * 5], { stroke: C.ink, 'stroke-width': 0.8, 'stroke-dasharray': L ? null : '2 2' });
    const notes = [[-46, -136], [-28, -131], [-10, -141], [8, -126], [26, -136], [44, -131], [-40, -102], [-16, -97], [10, -107], [36, -102]];
    notes.forEach(([dx, dy], i) => {
      if (!L && i > 4) return;
      const filled = lv === 'full' || (lv === 'half' && i < 6);
      s += A.ellipse(x + dx, y + dy, 4.5, 3.4, { fill: filled ? C.ink : 'none', stroke: C.ink, 'stroke-width': 1.2 }) + A.line([x + dx + 4, y + dy], [x + dx + 4, y + dy - 14], { stroke: C.ink, 'stroke-width': 1.1 });
    });
    if (lv === 'full') s += A.text(x, y - 166, '♩ = 92', { 'text-anchor': 'middle', 'font-family': 'Caveat, cursive', 'font-size': 18, fill: C.red });
    return { svg: s, h: 182 };
  };

  O.dance = (x, y, lv, id, p, floor) => {
    const col = lv === 'ink' ? 'none' : C.red;
    const stroke = lv === 'ink' ? { stroke: C.ink, 'stroke-width': 1.2, 'stroke-dasharray': '2 2' } : { stroke: C.red, 'stroke-width': 1 };
    const foot = (fx, fy, rot, n) => `<g transform="rotate(${rot} ${fx} ${fy})">${A.ellipse(fx, fy, 7, 13, Object.assign({ fill: col, opacity: lv === 'half' && n > 4 ? 0.35 : 0.85 }, stroke))}${A.ellipse(fx, fy + 18, 5, 6, Object.assign({ fill: col, opacity: 0.85 }, stroke))}</g>` + A.text(fx + 14, fy - 4, String(n), { 'font-family': 'Caveat, cursive', 'font-size': 20, fill: C.ink });
    let s = '';
    if (!floor) s += A.poly([[x - 90, y], [x + 90, y], [x + 76, y - 34], [x - 76, y - 34]], A.ink({ fill: C.card }));
    const sc = floor ? 1 : 0.45;
    const pts = [[-110, -10], [-70, -40], [-20, -20], [20, -50], [70, -30], [110, -60], [60, -80], [0, -70]];
    if (floor) {
      s += A.path(`M${x - 110} ${y - 10} C${x - 60} ${y - 60} ${x + 20} ${y} ${x + 110} ${y - 60}`, { fill: 'none', stroke: lv === 'ink' ? C.ink : C.red, 'stroke-width': 1.2, 'stroke-dasharray': '5 6', opacity: 0.6 });
      pts.forEach(([dx, dy], i) => { s += foot(x + dx, y + dy, (i % 2 ? 18 : -12), i + 1); });
    } else {
      pts.forEach(([dx, dy], i) => { s += foot(x + dx * sc, y - 18 + dy * 0.25, (i % 2 ? 18 : -12), i + 1).replace(/font-size="20"/g, 'font-size="12"'); });
    }
    return { svg: floor ? s : `<g>${s}</g>`, h: floor ? 100 : 60 };
  };

  O.print = (x, y, lv, id, p) => {
    const L = lv !== 'ink';
    let s = A.path(`M${x - 60} ${y} L${x - 30} ${y - 150} M${x + 60} ${y} L${x + 30} ${y - 150}`, { stroke: C.woodDark, 'stroke-width': 6, 'stroke-linecap': 'round' });
    s += A.rect(x - 52, y - 150, 104, 120, A.ink({ rx: 3, fill: L ? '#2F3B34' : C.card, 'stroke-width': 2 }));
    for (let i = 0; i < 4; i++) s += A.line([x - 38, y - 126 + i * 24], [x + (i % 2 ? 22 : 38), y - 126 + i * 24], { stroke: L ? C.paper : C.ink, 'stroke-width': L ? 2.4 : 1.2, 'stroke-dasharray': L ? null : '3 3' });
    return { svg: s, h: 150 };
  };

  O.recipe = (x, y, lv) => {
    const L = lv !== 'ink', R = lv === 'full';
    let s = '';
    if (L) s += A.path(`M${x - 18} ${y - 78} c-8 -10 8 -16 0 -28 M${x + 4} ${y - 80} c-8 -10 8 -16 0 -28 M${x + 24} ${y - 78} c-8 -10 8 -16 0 -28`, { fill: 'none', stroke: C.ink, 'stroke-width': 1.8, opacity: 0.5 });
    s += A.path(`M${x - 56} ${y - 70} h112 v40 a20 20 0 0 1 -20 26 h-72 a20 20 0 0 1 -20 -26 z`, A.ink({ fill: L ? C.red : C.sketch, 'stroke-width': 2 }));
    if (!R) s += A.rect(x, y - 70, 56, 66, { fill: C.sketch, opacity: 0.85 });
    s += A.path(`M${x - 56} ${y - 70} h112 v40 a20 20 0 0 1 -20 26 h-72 a20 20 0 0 1 -20 -26 z`, A.ink({ fill: 'none', 'stroke-width': 2 }));
    s += A.ellipse(x, y - 72, 60, 8, A.ink({ fill: L ? C.steel : 'none' })) + A.rect(x - 8, y - 88, 16, 10, A.ink({ fill: L ? C.ink : 'none' }));
    s += A.path(`M${x - 56} ${y - 56} h-14 M${x + 56} ${y - 56} h14`, { stroke: C.ink, 'stroke-width': 4, 'stroke-linecap': 'round' });
    s += A.rect(x + 78, y - 46, 22, 46, A.ink({ rx: 4, fill: R ? C.brass : 'none' })) + A.rect(x + 104, y - 36, 18, 36, A.ink({ rx: 4, fill: R ? C.leaf : 'none' }));
    return { svg: s, h: 110 };
  };

  O.space = (x, y, lv) => {
    const L = lv !== 'ink';
    let s = A.poly([[x - 100, y - 4], [x + 90, y - 4], [x + 70, y - 40], [x - 84, y - 40]], A.ink({ fill: C.card }));
    s += A.path(`M${x - 74} ${y - 12} L${x - 62} ${y - 34} H${x + 10} L${x + 4} ${y - 12} Z M${x + 20} ${y - 12} L${x + 26} ${y - 34} H${x + 60} L${x + 72} ${y - 12} Z`, { fill: L ? C.leaf : 'none', stroke: C.ink, 'stroke-width': 1.2, 'stroke-dasharray': L ? null : '3 2' });
    s += A.rect(x + 96, y - 22, 60, 20, A.ink({ rx: 10, fill: C.card }));
    return { svg: s, h: 50 };
  };

  O.crate = (x, y, p) => {
    let s = A.poly([[x - 75, y - 100], [x + 75, y - 100], [x + 90, y - 116], [x - 60, y - 116]], A.ink({ fill: '#D9B47A', 'stroke-width': 2 }));
    s += A.rect(x - 75, y - 100, 150, 100, A.ink({ fill: '#C9A06B', 'stroke-width': 2 }));
    s += A.poly([[x + 75, y - 100], [x + 90, y - 116], [x + 90, y - 16], [x + 75, y]], A.ink({ fill: '#B08A57', 'stroke-width': 2 }));
    s += `<g stroke="${C.ink}" stroke-width="1" opacity="0.45">${A.line([x - 75, y - 66], [x + 75, y - 66])}${A.line([x - 75, y - 33], [x + 75, y - 33])}</g>`;
    s += A.path(`M${x - 75} ${y - 100} L${x + 75} ${y} M${x + 75} ${y - 100} L${x - 75} ${y}`, { stroke: C.woodDark, 'stroke-width': 5, opacity: 0.6 });
    s += A.rect(x - 52, y - 76, 104, 36, A.ink({ fill: C.card, 'stroke-width': 1.2 }));
    s += A.text(x, y - 62, 'ON ITS WAY', { 'text-anchor': 'middle', 'font-family': 'Karla, sans-serif', 'font-weight': 700, 'font-size': 12, 'letter-spacing': 2, fill: C.red });
    s += A.text(x, y - 46, (p.name || '').slice(0, 18), { 'text-anchor': 'middle', 'font-family': 'Caveat, cursive', 'font-size': 16, fill: C.ink });
    return { svg: s, h: 118 };
  };

  O.newSpot = (x, y) => ({ svg: A.rect(x - 80, y - 120, 160, 116, { rx: 6, fill: 'rgba(251,244,228,0.5)', stroke: C.red, 'stroke-width': 2, 'stroke-dasharray': '6 5' }), h: 120 });

  B.art.object = function (p, x, y, id, opts) {
    opts = opts || {};
    const lv = B.fillLevel(p.stage);
    const physical = ['hardware', 'print', 'space'].includes(p.medium);
    if (p.stage === 'sent' && physical) return O.crate(x, y, p);
    const kind = B.art.drawingFor(p);
    const fn = O[kind] || O[p.medium] || O.device;
    const out = fn(x, y, lv, id, p, opts.floor);
    if (p.stage === 'sent' && p.medium === 'software') {
      out.svg += A.rect(x - 40, y - 30, 80, 6, { fill: C.card, stroke: C.ink, 'stroke-width': 1 }) + `<rect x="${x - 40}" y="${y - 30}" width="80" height="6" fill="${C.verd}" class="progress-bar"/>`;
    }
    return out;
  };

  /* Print projects hang on the wall zone instead of sitting on the bench. */
  function wallPrint(p, r, id) {
    const z = r.wall === 'C' ? ZONE.C : ZONE.R;
    const [x0, y0, w, h] = z;
    const lv = B.fillLevel(p.stage);
    let s = A.rect(x0, y0, w, h, A.ink({ rx: 4, fill: C.woodDark, 'stroke-width': 1.5 }));
    if (p.stage === 'sent') {
      s += A.rect(x0 + 12, y0 + 12, w - 24, h - 24, { fill: C.card, stroke: C.red, 'stroke-width': 2, 'stroke-dasharray': '6 5' });
      s += A.text(x0 + w / 2, y0 + h / 2, 'at the printer…', { 'text-anchor': 'middle', 'font-family': 'Caveat, cursive', 'font-size': 30, fill: C.red });
      return { svg: s, anchor: [x0 + w / 2, y0 - 6], box: [x0, y0, w, h] };
    }
    const dark = lv !== 'ink';
    s += A.rect(x0 + 12, y0 + 12, w - 24, h - 24, { fill: dark ? '#2F3B34' : C.card });
    if (lv === 'half') s += A.rect(x0 + w / 2, y0 + 12, w / 2 - 12, h - 24, { fill: A.hatch(id) }) + A.rect(x0 + w / 2, y0 + 12, w / 2 - 12, h - 24, { fill: C.card, opacity: 0.25 });
    const lines = (p.lines && p.lines.length ? p.lines : [p.name, 'Line two', 'Line three']).slice(0, 4);
    s += A.text(x0 + w / 2, y0 + 58, p.lines ? 'Today' : p.name, { 'text-anchor': 'middle', 'font-family': 'Caveat, cursive', 'font-size': 36, fill: dark ? C.paper : C.ink });
    lines.forEach((ln, i) => {
      if (lv === 'ink' || !p.lines) s += A.line([x0 + 44, y0 + 100 + i * 34], [x0 + w - 60 - (i % 2) * 40, y0 + 100 + i * 34], { stroke: dark && lv === 'full' ? C.paper : C.ink, 'stroke-width': 2, 'stroke-dasharray': lv === 'ink' ? '4 4' : null, opacity: 0.7 });
      else s += A.text(x0 + 44, y0 + 108 + i * 34, ln, { 'font-family': 'Caveat, cursive', 'font-size': 26, fill: lv === 'full' ? C.paper : C.paper });
    });
    s += A.rect(x0 + 6, y0 + h, w - 12, 8, A.ink({ fill: C.wood, 'stroke-width': 1 }));
    return { svg: s, anchor: [x0 + w / 2, y0 - 6], box: [x0, y0, w, h] };
  }

  /* Returns { svg, tags:[{p,x,y}], spots:[{p,x,y,w,h}], newSpot:{x,y}|null, door:{x,y}, overflow:n } */
  A.room = function (ws, opts) {
    opts = opts || {};
    const r = ROOMS[ws.type] || ROOMS.other;
    const id = 'r' + Math.random().toString(36).slice(2, 7);
    let s = A.defs(id) + shell(r, id);
    const prints = ws.projects.filter((p) => p.medium === 'print');
    const wallP = prints[0];
    const tags = [];
    const spots = [];

    for (const zone of ['L', 'C', 'R']) {
      if (wallP && r.wall === zone) continue;
      s += decor(r, zone, ws);
    }
    if (ws.type === 'studio') s += A.rect(220, 396, 1160, 8, A.ink({ fill: C.wood, 'stroke-width': 1.2 })) + [300, 700, 1100].map((x) => A.rect(x, 404, 6, 22, { fill: C.ink })).join('');
    if (wallP) {
      const wp = wallPrint(wallP, r, id);
      s += wp.svg;
      tags.push({ p: wallP, x: B.pct(wp.anchor[0], W), y: B.pct(wp.anchor[1], H) });
      spots.push({ p: wallP, x: B.pct(wp.box[0], W), y: B.pct(wp.box[1], H), w: B.pct(wp.box[2], W), h: B.pct(wp.box[3], H) });
    }
    s += lamps(r, id);

    const onFloor = !r.counter;
    if (r.counter) s += counter(r);
    const slots = onFloor ? FLOOR_SLOTS : COUNTER_SLOTS;
    const baseY = onFloor ? 710 : 596;
    const benchProjects = ws.projects.filter((p) => p !== wallP);
    let i = 0;
    for (const p of benchProjects) {
      if (i >= slots.length) break;
      const x = slots[i];
      const obj = B.art.object(p, x, baseY, id, { floor: onFloor });
      const cls = opts.newId === p.id ? ' class="sketching"' : '';
      s += `<g${cls}>${obj.svg}</g>`;
      tags.push({ p, x: B.pct(x, W), y: B.pct(baseY - obj.h - 22, H) });
      spots.push({ p, x: B.pct(x - 110, W), y: B.pct(baseY - obj.h, H), w: B.pct(220, W), h: B.pct(obj.h, H) });
      i++;
    }
    let newSpot = null;
    if (i < slots.length) {
      const x = slots[i];
      s += O.newSpot(x, baseY).svg;
      newSpot = { x: B.pct(x, W), y: B.pct(baseY - 60, H) };
    }
    // the apprentice hovers near whatever it's working on
    const busy = benchProjects.findIndex((p) => p.stage === 'build' || p.stage === 'sketch');
    if (busy >= 0 && busy < slots.length) {
      const ax = slots[busy] + 112, ay = baseY - 56;
      s += `<g transform="translate(${ax} ${ay})"><g class="apprentice-float">${A.circle(0, 0, 18, A.ink({ fill: C.card, 'stroke-width': 1.5 }))}${A.path('M0 -12 l3 12 -3 12 -3 -12 z', { fill: C.red })}${A.path('M-12 0 l12 -3 12 3 -12 3 z', { fill: C.ink })}</g></g>`;
    }
    return {
      svg: `<svg class="art" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${s}</svg>`,
      tags, spots, newSpot, door: { x: B.pct(1495, W), y: B.pct(330, H) }, overflow: Math.max(0, benchProjects.length - slots.length)
    };
  };
})();
