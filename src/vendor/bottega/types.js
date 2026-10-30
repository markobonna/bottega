/* What kinds of workshops and projects exist, and what each one needs.
   Add a new workshop type or medium here and the rest of the app picks it up. */
(function () {
  const B = window.B;

  B.WORKSHOP_TYPES = {
    cafe: {
      label: 'Café', article: 'The Café',
      keywords: ['café', 'cafe', 'coffee', 'espresso', 'bakery', 'tea room', 'coffee shop', 'barista'],
      walls: { L: '#EAD7B0', R: '#D4BB8E', roof: '#6E8B7F' }, height: 110,
      defaultMedium: 'hardware', mediums: ['hardware', 'software', 'print', 'recipe', 'space'],
      examples: ['a cold-brew tower that fits under the counter', 'a loyalty app for regulars', 'a new seasonal menu board']
    },
    garage: {
      label: 'Garage', article: 'The Garage',
      keywords: ['garage', 'shed', 'workbench', 'woodshop', 'car', 'bike', 'maker space', 'makerspace'],
      walls: { L: '#D9B47A', R: '#BE9660', roof: '#7E6650' }, height: 96,
      defaultMedium: 'hardware', mediums: ['hardware', 'software', 'space'],
      examples: ['a wall rack for three bikes', 'a dust collector for the table saw', 'a parts inventory app']
    },
    studio: {
      label: 'Dance studio', article: 'The Dance Studio',
      keywords: ['dance', 'ballet', 'studio', 'yoga', 'choreograph', 'pilates'],
      walls: { L: '#E3D3C4', R: '#CBB6A2', roof: '#8C5E58' }, height: 128,
      defaultMedium: 'dance', mediums: ['dance', 'music', 'software', 'print', 'space'],
      examples: ['a new routine for the spring show', 'a class booking app', 'a poster for open house']
    },
    store: {
      label: 'Store', article: 'The Store',
      keywords: ['store', 'shop', 'boutique', 'market', 'retail', 'grocery', 'corner store'],
      walls: { L: '#DCCFA6', R: '#C4B488', roof: '#5E6E8C' }, height: 104,
      defaultMedium: 'hardware', mediums: ['hardware', 'software', 'print', 'space'],
      examples: ['a register that doesn\'t jam', 'a stock-count app', 'window signage for the sale']
    },
    kitchen: {
      label: 'Kitchen', article: 'The Kitchen',
      keywords: ['kitchen', 'restaurant', 'diner', 'catering', 'food truck', 'bistro', 'pizzeria'],
      walls: { L: '#E6D9C3', R: '#CDBEA4', roof: '#8B4E3A' }, height: 100,
      defaultMedium: 'recipe', mediums: ['recipe', 'hardware', 'software', 'print', 'space'],
      examples: ['a new house sauce', 'a better pass shelf', 'an online ordering page']
    },
    music: {
      label: 'Music room', article: 'The Music Room',
      keywords: ['music room', 'band', 'recording', 'rehearsal room', 'home studio', 'guitar', 'piano'],
      walls: { L: '#E0D2BF', R: '#C6B59D', roof: '#4E5D6C' }, height: 112,
      defaultMedium: 'music', mediums: ['music', 'hardware', 'software', 'print'],
      examples: ['a song for my sister\'s wedding', 'a pedalboard', 'a gig poster']
    },
    classroom: {
      label: 'Classroom', article: 'The Classroom',
      keywords: ['classroom', 'school', 'teach', 'class', 'tutoring', 'lesson'],
      walls: { L: '#E8DDBF', R: '#CFC29F', roof: '#7A5C3E' }, height: 118,
      defaultMedium: 'print', mediums: ['print', 'software', 'hardware', 'music'],
      examples: ['a science fair kit', 'a quiz app', 'worksheets for unit 3']
    },
    other: {
      label: 'Workshop', article: 'The Workshop',
      keywords: ['workshop', 'office', 'lab', 'warehouse', 'salon', 'clinic', 'farm', 'home'],
      walls: { L: '#E2D4B4', R: '#C9B892', roof: '#6B5A48' }, height: 104,
      defaultMedium: 'hardware', mediums: ['hardware', 'software', 'print', 'space'],
      examples: ['a gadget that solves a daily annoyance', 'a small tool for the team', 'a sign for the door']
    }
  };

  B.MEDIUMS = {
    hardware: {
      label: 'Hardware', keywords: ['machine', 'maker', 'device', 'register', 'grinder', 'rack', 'lamp', 'fix', 'repair', 'gadget', 'hardware', 'motor', 'sensor', 'cabinet', 'table', 'chair', 'shelf', 'stand', 'holder', 'tower', 'brewer', 'kettle', 'oven', 'cart', 'bracket', 'mount', 'case', 'enclosure', 'collector', 'pedalboard', 'drawer', 'kit', 'robot', 'printer'],
      tools: [['sketch', 'Sketch'], ['measure', 'Measure'], ['parts', 'Parts'], ['materials', 'Materials'], ['gauge', 'Stress test'], ['layers', 'Explode']],
      flow: 'quote', sentLabel: 'Ordered', arrivedLabel: 'Arrived', thing: 'machine',
      questions: [
        'Where does it live — what does it sit on, and how much room is there?',
        'What has to plug into it: power, water, air, anything else?',
        'Is there anything you already own that it has to fit?',
        'How many do you need — just one, or a small run?',
        'What would make you say it\'s better than what you have now?'
      ]
    },
    software: {
      label: 'Software', keywords: ['app', 'website', 'site', 'software', 'program', 'system', 'dashboard', 'bot', 'booking', 'tracker', 'portal', 'page', 'online', 'ordering', 'inventory', 'quiz', 'calculator', 'spreadsheet', 'automation'],
      tools: [['screen', 'Screens'], ['flow', 'Flows'], ['data', 'Data'], ['test', 'Test'], ['play', 'Preview']],
      flow: 'ship', sentLabel: 'Building', arrivedLabel: 'Installed', thing: 'app',
      questions: [
        'Who uses it first — you, your staff, or customers?',
        'What will it run on: a phone, a tablet, a computer, or the web?',
        'What\'s the one thing it must do on day one?',
        'Does it need to talk to anything you already use, like a till or a calendar?',
        'What should it never do — anything that would annoy people?'
      ]
    },
    music: {
      label: 'Music', keywords: ['song', 'music', 'track', 'melody', 'beat', 'playlist', 'jingle', 'tune', 'lyrics', 'score'],
      tools: [['note', 'Melody'], ['layers', 'Chords'], ['lyrics', 'Lyrics'], ['tempo', 'Tempo'], ['play', 'Listen']],
      flow: 'export', sentLabel: 'Mixing', arrivedLabel: 'Released', thing: 'song',
      questions: ['What should it feel like in the first ten seconds?', 'Roughly how fast — slow dance, walking pace, or running?', 'Is there a line or phrase that has to be in it?', 'Who sings or plays it?']
    },
    dance: {
      label: 'Dance', keywords: ['dance', 'routine', 'choreograph', 'combo', 'piece', 'number', 'showcase', 'recital'],
      tools: [['feet', 'Counts'], ['group', 'Formations'], ['note', 'Music'], ['video', 'Video'], ['play', 'Rehearse']],
      flow: 'export', sentLabel: 'Rehearsing', arrivedLabel: 'Performed', thing: 'routine',
      questions: ['How many dancers, and what level?', 'What\'s the music, or should I suggest some?', 'How long is the piece?', 'Is there a moment you already see in your head?']
    },
    print: {
      label: 'Print', keywords: ['menu', 'sign', 'poster', 'flyer', 'label', 'logo', 'card', 'banner', 'board', 'worksheet', 'brochure', 'sticker', 'signage'],
      tools: [['layout', 'Layout'], ['type', 'Type'], ['materials', 'Color'], ['proof', 'Proof']],
      flow: 'quote', sentLabel: 'At the printer', arrivedLabel: 'Delivered', thing: 'print job',
      questions: ['Where will it hang or be handed out?', 'What\'s the one thing people should read first?', 'How big, and how many copies?', 'Any colors or fonts it has to match?']
    },
    recipe: {
      label: 'Recipe', keywords: ['recipe', 'drink', 'dish', 'latte', 'cake', 'sauce', 'cocktail', 'bread', 'special', 'pastry', 'soup'],
      tools: [['pot', 'Ingredients'], ['list', 'Steps'], ['coin', 'Cost'], ['taste', 'Taste test']],
      flow: 'export', sentLabel: 'Testing', arrivedLabel: 'On the menu', thing: 'recipe',
      questions: ['How many portions at a time?', 'What should it cost you per serving, at most?', 'Any allergens to avoid?', 'Is it for every day or a special?']
    },
    space: {
      label: 'Space', keywords: ['layout', 'floor plan', 'seating', 'redesign', 'remodel', 'space', 'room layout', 'renovation'],
      tools: [['plan', 'Plan'], ['measure', 'Measure'], ['chair', 'Furniture'], ['walk', 'Walk through']],
      flow: 'quote', sentLabel: 'Ordered', arrivedLabel: 'Done', thing: 'new layout',
      questions: ['How big is the room, roughly?', 'How many people at the busiest moment?', 'What can\'t move — plumbing, doors, windows?', 'What\'s your budget range?']
    }
  };

  /* The kinds of makers the apprentice looks for per medium. In the demo these are
     clearly-labeled placeholders; a real build would search for actual businesses
     near the user (see FLOW.md). */
  B.MAKER_KINDS = {
    hardware: [
      { kind: 'Machine shop', does: 'CNC, sheet metal, welding', contact: 'email' },
      { kind: 'Online fabrication service', does: 'Instant-quote CNC and 3D printing', contact: 'web' },
      { kind: 'Parts supplier', does: 'Off-the-shelf components', contact: 'phone' }
    ],
    print: [
      { kind: 'Print shop', does: 'Large-format and short runs', contact: 'email' },
      { kind: 'Sign maker', does: 'Boards, vinyl, window graphics', contact: 'phone' },
      { kind: 'Online print service', does: 'Bulk prints, shipped', contact: 'web' }
    ],
    space: [
      { kind: 'Carpenter', does: 'Counters, benches, built-ins', contact: 'phone' },
      { kind: 'Furniture supplier', does: 'Tables, chairs, stools', contact: 'email' },
      { kind: 'General contractor', does: 'Walls, electrics, permits', contact: 'email' }
    ]
  };

  B.detectType = function (text) {
    const t = text.toLowerCase();
    let best = null, score = 0;
    for (const [id, def] of Object.entries(B.WORKSHOP_TYPES)) {
      for (const k of def.keywords) if (t.includes(k) && k.length > score) { best = id; score = k.length; }
    }
    return best;
  };

  B.detectMedium = function (text, fallback) {
    const t = ' ' + text.toLowerCase() + ' ';
    let best = null, score = 0;
    for (const [id, def] of Object.entries(B.MEDIUMS)) {
      let s = 0;
      for (const k of def.keywords) if (new RegExp('\\b' + k.replace(/ /g, '\\s+') + 's?\\b').test(t)) s += k.length;
      if (s > score) { best = id; score = s; }
    }
    return best || fallback || 'hardware';
  };
})();
