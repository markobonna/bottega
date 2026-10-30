/* The world map: an isometric island with four lots in a square around a
   fountain (BOTTEGA DIVERGENCE, per the design author: the prototype's 3×3
   grid was too much for a demo). Each workshop sits on a lot and is drawn
   by its type; new ones start in ink. */
(function () {
  const B = window.B;
  const C = B.C;
  const A = B.art;

  const W = 1600, H = 990;
  const CX = 800, CY = 550, S = 238;
  const EX = [0.866, 0.5], EY = [-0.866, 0.5];
  const P = (i, j) => [CX + (i - 1) * S * EX[0] + (j - 1) * S * EY[0], CY + (i - 1) * S * EX[1] + (j - 1) * S * EY[1]];
  // Four quadrant centers around the fountain plaza.
  const SLOTS = [[0.25, 0.25], [1.75, 0.25], [0.25, 1.75], [1.75, 1.75]];
  const HW = 132, HH = 76;

  A.WORLD = { W, H, slotPos: (i) => P(SLOTS[i][0], SLOTS[i][1]) };

  function building(ws, id, opts) {
    const def = B.WORKSHOP_TYPES[ws.type] || B.WORKSHOP_TYPES.other;
    const [cx, cy] = P(SLOTS[ws.slot][0], SLOTS[ws.slot][1]);
    const h = def.height;
    const ink = ws.stage === 'sketch';
    const lit = !ink && B.isLit(ws);
    const L = [cx - HW, cy], F = [cx, cy + HH], R = [cx + HW, cy], K = [cx, cy - HH];
    const up = (p, v = h) => [p[0], p[1] - v];
    const onL = (t, v) => [L[0] + t * HW, L[1] + t * HH - v];
    const onR = (t, v) => [F[0] + t * HW, F[1] - t * HH - v];
    const quad = (on, t1, t2, v1, v2) => [on(t1, v1), on(t2, v1), on(t2, v2), on(t1, v2)];
    const winFill = lit ? C.glow : ink ? 'none' : C.glass;
    const st = { stroke: C.ink, 'stroke-width': ink ? 1.5 : 2 };
    const thin = { stroke: C.ink, 'stroke-width': 1.3 };
    let s = '';

    if (ink) {
      // construction lines like a notebook study
      const cl = { stroke: C.red, 'stroke-width': 1, 'stroke-dasharray': '3 5', opacity: 0.6 };
      s += A.line(up(L), up(L, h + 34), cl) + A.line(up(K), up(K, h + 38), cl) + A.line(up(R), up(R, h + 34), cl);
      s += A.line(up(L), [L[0] - 40, L[1] - h + 23], cl) + A.line(R, [R[0] + 40, R[1] + 23], cl);
    }
    // shadow
    s += A.poly([F, R, [R[0] + 30, R[1] + 18], [F[0] + 30, F[1] + 18]], { fill: C.ink, opacity: 0.08 });
    // faces
    s += A.poly([L, F, up(F), up(L)], Object.assign({ fill: ink ? C.sketch : def.walls.L }, st));
    s += A.poly([F, R, up(R), up(F)], Object.assign({ fill: ink ? C.sketch : def.walls.R }, st));
    s += A.poly([F, R, up(R), up(F)], { fill: A.hatch(id), opacity: ink ? 1 : 0.5 });
    s += A.poly([up(L), up(F), up(R), up(K)], Object.assign({ fill: ink ? C.sketch : def.walls.roof }, st));

    const win = (q, mull) => {
      let o = A.poly(q, Object.assign({ fill: winFill }, thin));
      if (mull) o += A.line([(q[0][0] + q[1][0]) / 2, (q[0][1] + q[1][1]) / 2], [(q[2][0] + q[3][0]) / 2, (q[2][1] + q[3][1]) / 2], { stroke: C.ink, 'stroke-width': 1.1 });
      return o;
    };
    const door = (on, t1, t2, vh) => A.poly(quad(on, t1, t2, 0, vh), Object.assign({ fill: ink ? 'none' : C.woodDark }, thin));
    const awning = (t1, t2, vt, vb, pat) => {
      const a = onL(t1, vt), b = onL(t2, vt), c = onL(t2, vb), d = onL(t1, vb);
      return A.poly([a, b, [c[0] - 15, c[1] + 9], [d[0] - 15, d[1] + 9]], Object.assign({ fill: ink ? 'none' : `url(#${id}-${pat})` }, thin, ink ? { 'stroke-dasharray': '4 3' } : {}));
    };
    const signL = (t1, t2, v1, v2, label) => {
      const q = quad(onL, t1, t2, v1, v2);
      const o = onL(t1 + 0.05, v1 + (v2 - v1) * 0.25);
      return A.poly(q, Object.assign({ fill: ink ? C.sketch : C.card }, thin)) +
        `<text transform="matrix(0.866 0.5 0 1 ${o[0].toFixed(1)} ${o[1].toFixed(1)})" font-family="Karla, sans-serif" font-weight="700" font-size="11" letter-spacing="2" fill="${C.ink}">${B.esc(label)}</text>`;
    };
    const signR = (t1, t2, v1, v2, label) => {
      const q = quad(onR, t1, t2, v1, v2);
      const o = onR(t1 + 0.06, v1 + (v2 - v1) * 0.25);
      return A.poly(q, Object.assign({ fill: ink ? C.sketch : C.card }, thin)) +
        `<text transform="matrix(0.866 -0.5 0 1 ${o[0].toFixed(1)} ${o[1].toFixed(1)})" font-family="Karla, sans-serif" font-weight="700" font-size="11" letter-spacing="2" fill="${C.ink}">${B.esc(label)}</text>`;
    };
    const roofC = [cx, cy - h];
    const chimney = (smoke) => {
      const c = [cx + 60, cy - h - 30];
      const l = [c[0] - 15.6, c[1]], f = [c[0], c[1] + 9], r = [c[0] + 15.6, c[1]], k = [c[0], c[1] - 9];
      let o = A.poly([l, f, up(f, 34), up(l, 34)], Object.assign({ fill: ink ? C.sketch : C.red }, thin));
      o += A.poly([f, r, up(r, 34), up(f, 34)], Object.assign({ fill: ink ? C.sketch : '#7E2E1A' }, thin));
      o += A.poly([up(l, 34), up(f, 34), up(r, 34), up(k, 34)], { fill: ink ? C.sketch : C.ink, stroke: C.ink, 'stroke-width': 1 });
      if (smoke && !ink) o += A.path(`M${c[0]} ${c[1] - 40} c-12 -14 12 -22 2 -38 s16 -22 6 -40`, { fill: 'none', stroke: C.ink, 'stroke-width': 2, 'stroke-linecap': 'round', opacity: 0.4 });
      return o;
    };

    switch (ws.type) {
      case 'cafe':
        s += win(quad(onL, 0.12, 0.55, 20, 75), true);
        s += door(onL, 0.65, 0.85, 70) + A.poly(quad(onL, 0.68, 0.82, 38, 62), { fill: winFill, opacity: 0.9 });
        s += awning(0.08, 0.9, 95, 80, 'awnR');
        s += win(quad(onR, 0.2, 0.8, 30, 80), true);
        s += A.ellipse(roofC[0], roofC[1] + 2, 30, 6, A.ink({ fill: C.card }));
        s += A.path(`M${roofC[0] - 20} ${roofC[1] - 30} h40 v18 a20 14 0 0 1 -40 0 z`, A.ink({ fill: C.card, 'stroke-width': 2 }));
        s += A.path(`M${roofC[0] + 20} ${roofC[1] - 26} a8 8 0 0 1 0 14`, { fill: 'none', stroke: C.ink, 'stroke-width': 2 });
        if (!ink) s += A.path(`M${roofC[0] - 8} ${roofC[1] - 38} c-8 -10 8 -16 0 -28 M${roofC[0] + 8} ${roofC[1] - 38} c-8 -10 8 -16 0 -28`, { fill: 'none', stroke: C.ink, 'stroke-width': 1.8, 'stroke-linecap': 'round', opacity: 0.55 });
        break;
      case 'garage': {
        const dq = quad(onR, 0.15, 0.75, 0, 70);
        s += A.poly(dq, Object.assign({ fill: ink ? 'none' : '#E9DCC0' }, thin));
        if (lit) s += A.poly(quad(onR, 0.15, 0.75, 0, 22), { fill: C.glow }) + A.poly([onR(0.15, 0), onR(0.75, 0), [onR(0.75, 0)[0] + 34, onR(0.75, 0)[1] + 20], [onR(0.15, 0)[0] + 34, onR(0.15, 0)[1] + 20]], { fill: C.glow, opacity: 0.35 });
        for (const v of [22, 34, 46, 58]) s += A.line(onR(0.15, v), onR(0.75, v), { stroke: C.ink, 'stroke-width': 1 });
        s += win(quad(onL, 0.3, 0.7, 45, 75), true);
        s += signL(0.1, 0.25, 30, 44, '');
        s += chimney(true);
        break;
      }
      case 'studio':
        s += A.poly(quad(onL, 0.08, 0.92, 25, h - 18), Object.assign({ fill: lit ? C.glow : ink ? 'none' : C.glass }, thin));
        s += A.line(onL(0.36, 25), onL(0.36, h - 18), thin) + A.line(onL(0.64, 25), onL(0.64, h - 18), thin);
        s += A.line(onL(0.08, 50), onL(0.92, 50), { stroke: C.ink, 'stroke-width': 1, 'stroke-dasharray': '3 3' });
        { const d1 = onL(0.22, h - 40), d2 = onL(0.5, h - 30); s += A.dancer(d1[0], d1[1], 0.85, 0) + A.dancer(d2[0], d2[1], 0.9, 1); }
        s += door(onR, 0.4, 0.6, 60);
        s += signR(0.28, 0.72, h - 42, h - 22, 'STUDIO');
        break;
      case 'store':
        s += win(quad(onL, 0.08, 0.6, 12, 66), false);
        s += door(onL, 0.68, 0.88, 68) + A.poly(quad(onL, 0.71, 0.85, 36, 60), { fill: winFill });
        s += awning(0.06, 0.62, 80, 70, 'awnG');
        s += signL(0.1, 0.9, h - 22, h - 6, 'SHOP');
        s += win(quad(onR, 0.25, 0.75, 34, 78), true);
        break;
      case 'kitchen':
        s += win(quad(onL, 0.1, 0.4, 30, 70), false) + win(quad(onL, 0.5, 0.8, 30, 70), false);
        s += door(onR, 0.3, 0.55, 64);
        s += win(quad(onR, 0.65, 0.88, 34, 70), false);
        s += chimney(true);
        break;
      case 'music':
        s += win(quad(onL, 0.15, 0.5, 35, 85), true);
        s += door(onL, 0.62, 0.85, 70);
        s += win(quad(onR, 0.3, 0.75, 34, 82), false);
        s += A.path(`M${roofC[0] - 6} ${roofC[1] - 6} V${roofC[1] - 46} l22 -6 V${roofC[1] - 14}`, { fill: 'none', stroke: C.ink, 'stroke-width': 2.4 });
        s += A.ellipse(roofC[0] - 11, roofC[1] - 6, 6, 4.5, { fill: ink ? 'none' : C.ink, stroke: C.ink, 'stroke-width': 1.5 }) + A.ellipse(roofC[0] + 11, roofC[1] - 14, 6, 4.5, { fill: ink ? 'none' : C.ink, stroke: C.ink, 'stroke-width': 1.5 });
        break;
      case 'classroom':
        s += win(quad(onL, 0.06, 0.3, 35, 85), true) + win(quad(onL, 0.38, 0.62, 35, 85), true) + win(quad(onL, 0.7, 0.94, 35, 85), true);
        s += door(onR, 0.4, 0.62, 70);
        s += A.line(roofC, [roofC[0], roofC[1] - 60], { stroke: C.ink, 'stroke-width': 2 });
        s += A.poly([[roofC[0], roofC[1] - 60], [roofC[0] + 28, roofC[1] - 52], [roofC[0], roofC[1] - 44]], { fill: ink ? 'none' : C.red, stroke: C.ink, 'stroke-width': 1.2 });
        break;
      default:
        s += win(quad(onL, 0.15, 0.5, 30, 78), true);
        s += door(onL, 0.62, 0.84, 70);
        s += win(quad(onR, 0.25, 0.75, 32, 80), true);
    }
    if (ink) s += A.pencil(R[0] + 14, R[1] - h - 30, 35);

    const cls = opts && opts.sketching ? ' class="sketching"' : '';
    return { svg: `<g${cls}>${s}</g>`, anchor: [cx, cy - HH - h - (ws.type === 'classroom' ? 4 : 12)], y: cy };
  }

  function lot(slot, id) {
    const [cx, cy] = A.WORLD.slotPos(slot);
    const L = [cx - HW, cy], F = [cx, cy + HH], R = [cx + HW, cy], K = [cx, cy - HH];
    const up = (p) => [p[0], p[1] - 100];
    let s = A.poly([L, F, R, K], { fill: C.sketch, stroke: C.red, 'stroke-width': 2, 'stroke-dasharray': '8 6' });
    const g = { fill: 'none', stroke: C.ink, 'stroke-width': 1.2, 'stroke-dasharray': '3 6', opacity: 0.3 };
    s += A.poly([up(L), up(F), up(R), up(K)], g) + A.line(L, up(L), g) + A.line(F, up(F), g) + A.line(R, up(R), g);
    for (const p of [K, L, R, F]) {
      s += A.line(p, [p[0], p[1] - 26], { stroke: C.woodDark, 'stroke-width': 3, 'stroke-linecap': 'round' });
      s += A.poly([[p[0], p[1] - 26], [p[0] + 14, p[1] - 21], [p[0], p[1] - 16]], { fill: C.red });
    }
    return { svg: s, center: [cx, cy], y: cy };
  }

  /* Returns { svg, tags:[{ws, x, y}], lot:{x,y}|null } with x/y as % of the scene. */
  A.world = function (state, opts) {
    opts = opts || {};
    const id = 'w' + Math.random().toString(36).slice(2, 7);
    const items = [];
    const tags = [];
    let s = A.defs(id);

    s += A.compass(130, 130);
    s += A.mirrorText(1530, 112, 'la mia bottega', 36, 0.4) + A.mirrorText(1530, 148, 'studi del mondo, f. 1', 24, 0.32);

    // island
    const Lc = P(-0.5, 2.5), Tc = P(-0.5, -0.5), Rc = P(2.5, -0.5), Fc = P(2.5, 2.5);
    s += A.poly([Lc, Fc, [Fc[0], Fc[1] + 50], [Lc[0], Lc[1] + 50]], { fill: '#E2CFA8', stroke: C.ink, 'stroke-width': 2 });
    s += A.poly([Lc, Fc, [Fc[0], Fc[1] + 50], [Lc[0], Lc[1] + 50]], { fill: A.hatch(id) });
    s += A.poly([Fc, Rc, [Rc[0], Rc[1] + 50], [Fc[0], Fc[1] + 50]], { fill: '#D6BF92', stroke: C.ink, 'stroke-width': 2 });
    s += A.poly([Fc, Rc, [Rc[0], Rc[1] + 50], [Fc[0], Fc[1] + 50]], { fill: A.hatch(id) });
    s += A.poly([Lc, Tc, Rc, Fc], { fill: '#EFE2C4', stroke: C.ink, 'stroke-width': 2 });
    const cl = { stroke: C.red, 'stroke-width': 1.2, 'stroke-dasharray': '4 6', opacity: 0.55 };
    s += A.line(Lc, [Lc[0] - 62, Lc[1] + 31], cl) + A.line(Lc, [Lc[0] - 62, Lc[1] - 31], cl) + A.line(Rc, [Rc[0] + 62, Rc[1] + 31], cl) + A.line(Rc, [Rc[0] + 62, Rc[1] - 31], cl) + A.line(Tc, [Tc[0] + 62, Tc[1] - 31], cl) + A.line(Tc, [Tc[0] - 62, Tc[1] - 31], cl);

    // one crossroads between the four lots; the fountain covers the middle
    for (const k of [1]) {
      for (const [a, b] of [[P(k, -0.5), P(k, 2.5)], [P(-0.5, k), P(2.5, k)]]) {
        s += A.line(a, b, { stroke: '#E0CBA0', 'stroke-width': 26 });
        s += A.line(a, b, { stroke: C.ink, 'stroke-width': 1.2, 'stroke-dasharray': '6 9', opacity: 0.4 });
      }
    }
    // fountain
    const [fx, fy] = P(1, 1);
    s += A.path(`M${fx - 44} ${fy} v8 a44 22 0 0 0 88 0 v-8`, A.ink({ fill: '#CFDDD6' }));
    s += A.ellipse(fx, fy, 44, 22, A.ink({ fill: '#CFDDD6' })) + A.ellipse(fx, fy, 34, 15, { fill: '#A9C6BB' });
    s += A.rect(fx - 4, fy - 30, 8, 30, { fill: '#EFE2C4', stroke: C.ink, 'stroke-width': 1.4 });
    s += A.path(`M${fx} ${fy - 30} q-18 -12 -26 24 M${fx} ${fy - 30} q18 -12 26 24`, { fill: 'none', stroke: C.verd, 'stroke-width': 1.8 });

    // trees, buildings, lot — painter's order by depth
    for (const [i, j] of [[0.38, -0.36], [1.62, -0.36], [2.36, 0.38], [2.36, 1.62], [0.38, 2.36], [1.62, 2.36], [-0.36, 0.38], [-0.36, 1.62]]) {
      const p = P(i, j);
      items.push({ y: p[1], svg: A.tree(p[0], p[1], id) });
    }
    for (const ws of state.workshops) {
      if (ws.slot < 0 || ws.slot > 3) continue;
      const b = building(ws, id, { sketching: opts.sketchingId === ws.id });
      items.push({ y: b.y, svg: b.svg });
      tags.push({ ws, x: B.pct(b.anchor[0], W), y: B.pct(b.anchor[1], H) });
    }
    const free = B.store.freeSlot();
    let lotPos = null;
    if (free >= 0) {
      const l = lot(free, id);
      items.push({ y: l.y, svg: l.svg });
      lotPos = { x: B.pct(l.center[0], W), y: B.pct(l.center[1], H) };
    }
    items.sort((a, b) => a.y - b.y).forEach((it) => { s += it.svg; });

    return {
      svg: `<svg class="art" viewBox="0 0 ${W} ${H}" aria-hidden="true">${s}</svg>`,
      tags, lot: lotPos, aspect: `${W} / ${H}`
    };
  };

  /* Small building icon for list cards and the map key. */
  A.houseIcon = (level) => {
    const fillL = level === 'ink' ? 'none' : '#D9B47A';
    const dash = level === 'ink' ? ' stroke-dasharray="3 3"' : '';
    return `<svg width="44" height="36" viewBox="0 0 44 36" aria-hidden="true" style="flex:none">${level === 'half' ? '<path d="M6 16 L22 4 V32 H6 Z" fill="#D9B47A"/>' : ''}<path d="M6 16 L22 4 L38 16 V32 H6 Z" fill="${level === 'full' ? fillL : 'none'}" stroke="#33261A" stroke-width="1.6"${dash}/><rect x="17" y="20" width="10" height="12" fill="${level === 'full' ? '#F2C46A' : 'none'}" stroke="#33261A" stroke-width="1.4"/></svg>`;
  };
})();
