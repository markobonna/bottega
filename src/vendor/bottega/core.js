/* Bottega core helpers: colors, icons, small utilities.
   Everything hangs off one global, window.B, so the app runs from a double-clicked
   index.html with no build step and no server. */
(function () {
  const B = (window.B = window.B || {});

  B.C = {
    paper: '#F3E9D2', paper2: '#EADBBD', card: '#FBF4E4', white: '#FFFDF7',
    sketch: '#F7EFDD', ink: '#33261A', ink2: '#5E4A36', red: '#A23E25',
    redDark: '#6E2A18', verd: '#3F7A6E', verdDark: '#2F5E55', brass: '#C8963E',
    brassLight: '#D8AB57', glow: '#F2C46A', leaf: '#8FA88A', wood: '#8B6B4A',
    woodDark: '#6B4A2B', steel: '#D9D2C3', glass: '#B9C9C2', sky: '#D5E3DD'
  };

  B.esc = (s) =>
    String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  B.uid = (p = 'id') => p + '-' + Math.random().toString(36).slice(2, 9);
  B.clone = (o) => JSON.parse(JSON.stringify(o));
  B.pct = (v, total) => ((v / total) * 100).toFixed(2) + '%';
  B.cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
  B.slug = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'project';
  B.delay = (ms) => new Promise((r) => setTimeout(r, ms));
  B.hash = (s) => { let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return Math.abs(h); };
  B.pts = (arr) => arr.map((p) => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');

  B.ICONS = {
    plus: 'M12 5v14M5 12h14',
    map: 'M3 7l6-3 6 3 6-3v13l-6 3-6-3-6 3zM9 4v13M15 7v13',
    list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
    room: 'M4 21V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v16M2 21h20M15 12h.01',
    back: 'M19 12H5M12 19l-7-7 7-7',
    fwd: 'M5 12h14M12 5l7 7-7 7',
    chev: 'M9 6l6 6-6 6',
    close: 'M6 6l12 12M18 6L6 18',
    pencil: 'M4 20l4-1 11-11-3-3L5 16zM14 6l3 3',
    send: 'M22 2L11 13M22 2l-7 20-4-9-9-4z',
    mic: 'M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3zM19 10a7 7 0 0 1-14 0M12 17v4M8 21h8',
    crate: 'M3 9h18v12H3zM3 9l3-5h12l3 5M12 18v-6M9 15l3-3 3 3',
    download: 'M12 3v12M7 10l5 5 5-5M4 21h16',
    check: 'M5 12l5 5 9-11',
    reset: 'M3 12a9 9 0 1 0 3-6.7M3 4v5h5',
    user: 'M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM4 21c1.5-4 4.5-6 8-6s6.5 2 8 6',
    up: 'M6 15l6-6 6 6',
    down: 'M6 9l6 6 6-6',
    speaker: 'M4 9v6h4l5 4V5L8 9zM16 9a4 4 0 0 1 0 6M19 6a8 8 0 0 1 0 12',
    mute: 'M4 9v6h4l5 4V5L8 9zM17 9l5 6M22 9l-5 6',
    copy: 'M8 8h12v12H8zM4 16V4h12',
    phone: 'M5 3h4l2 5-3 2a12 12 0 0 0 6 6l2-3 5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 3 5a2 2 0 0 1 2-2z',
    mail: 'M3 6h18v12H3zM3 7l9 6 9-6',
    globe: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18',
    search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM21 21l-5-5',
    // tools
    sketch: 'M4 20l4-1 11-11-3-3L5 16zM14 6l3 3',
    measure: 'M3 17L17 3l4 4L7 21zM7 13l2 2M10 10l2 2M13 7l2 2',
    parts: 'M12 2l9 5v10l-9 5-9-5V7zM12 22V12M21 7l-9 5-9-5',
    materials: 'M12 3a9 9 0 1 0 0 18c1.5 0 2-1 2-2s-1-1.5-1-2.5 1-1.5 2-1.5h2a4 4 0 0 0 4-4c0-4.5-4-8-9-8zM7.5 11h.01M10 7.5h.01M15 7.5h.01',
    gauge: 'M4 18a8 8 0 1 1 16 0M12 18l4-6',
    layers: 'M12 3l9 5-9 5-9-5zM3 13l9 5 9-5',
    screen: 'M3 4h18v13H3zM8 21h8M12 17v4',
    flow: 'M5 3v6h6M19 21v-6h-6M5 9a8 8 0 0 0 8 6M19 15a8 8 0 0 0-8-6',
    data: 'M12 3c4.4 0 8 1.3 8 3s-3.6 3-8 3-8-1.3-8-3 3.6-3 8-3zM4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3',
    test: 'M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3',
    play: 'M7 4l13 8-13 8z',
    note: 'M9 18V5l11-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM20 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z',
    tempo: 'M12 3l6 18H6zM12 13l5-7',
    lyrics: 'M4 6h16M4 12h10M4 18h13',
    feet: 'M7 4c2 0 3 2 3 5s-1 5-3 5-3-2-3-5 1-5 3-5zM17 8c2 0 3 2 3 5s-1 5-3 5-3-2-3-5 1-5 3-5zM5 18h4M15 21h4',
    group: 'M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM16 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM2 21c0-4 3-7 6-7s6 3 6 7M10 21c0-4 3-7 6-7s6 3 6 7',
    video: 'M3 6h13v12H3zM16 10l5-3v10l-5-3',
    layout: 'M3 3h18v18H3zM3 9h18M9 9v12',
    type: 'M4 6V4h16v2M12 4v16M8 20h8',
    proof: 'M4 4h16v16H4zM8 12l3 3 5-6',
    pot: 'M4 10h16v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5zM2 10h20M9 6c0-2 2-2 2-4M14 6c0-2 2-2 2-4',
    coin: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v10M9 9.5c0-1 1.3-1.5 3-1.5s3 .7 3 2-1.3 1.6-3 2-3 1-3 2 1.3 2 3 2 3-.5 3-1.5',
    taste: 'M7 3v8a3 3 0 0 0 6 0V3M10 3v18M17 3c-2 2-2 6 0 8v10',
    plan: 'M3 3h18v18H3zM3 12h8V3M15 12h6M15 12v9',
    chair: 'M6 3v10h12V3M6 13v8M18 13v8M6 17h12',
    walk: 'M13 4a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM9 21l2-7 3 3v5M8 11l3-4 4 2 3 3'
  };

  B.icon = (name, size = 18, sw = 2) =>
    `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${B.ICONS[name] || B.ICONS.plus}"/></svg>`;

  B.sigil = (s = 40) =>
    `<svg width="${s}" height="${s}" viewBox="0 0 32 32" aria-hidden="true" style="flex:none"><circle cx="16" cy="16" r="14" fill="#FBF4E4" stroke="#33261A" stroke-width="1.5"/><path d="M16 4l3 12-3 12-3-12z" fill="#A23E25"/><path d="M4 16l12-3 12 3-12 3z" fill="#33261A"/></svg>`;

  B.logo = () =>
    `<svg width="30" height="30" viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="6" r="3" fill="none" stroke="#33261A" stroke-width="2"/><path d="M14.5 8.5L7 28M17.5 8.5L25 28" stroke="#33261A" stroke-width="2" stroke-linecap="round"/><path d="M5 20a14 14 0 0 0 22 0" fill="none" stroke="#A23E25" stroke-width="2" stroke-linecap="round"/></svg>`;

  B.download = (filename, text, mime = 'text/plain') => {
    const blob = new Blob([text], { type: mime });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 800);
  };

  B.timeAgo = (ts) => {
    if (!ts) return '';
    const m = Math.round((Date.now() - ts) / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return m + ' min ago';
    const h = Math.round(m / 60);
    if (h < 24) return h + ' h ago';
    return Math.round(h / 24) + ' days ago';
  };

  /* Project stages. Every medium moves through the same five, but the last two
     get medium-specific words (see B.MEDIUMS[...].sentLabel / arrivedLabel). */
  B.STAGES = ['sketch', 'shape', 'build', 'sent', 'arrived'];
  B.stageLabel = (p) => {
    const m = B.MEDIUMS[p.medium] || B.MEDIUMS.hardware;
    return { sketch: 'Sketched', shape: 'Shaped', build: 'Being built', sent: m.sentLabel, arrived: m.arrivedLabel }[p.stage] || p.stage;
  };
  // How much color a drawing gets: 'ink' | 'half' | 'full'
  B.fillLevel = (stage) => (stage === 'build' ? 'half' : stage === 'sent' || stage === 'arrived' ? 'full' : 'ink');
  B.isLit = (ws) => ws.lit || (ws.lastActivity && Date.now() - ws.lastActivity < 24 * 3600 * 1000);
})();
