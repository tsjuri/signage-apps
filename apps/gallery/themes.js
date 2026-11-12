/* Gallery themes: colours, title, and decorations around the photo.
 * Each picture in ART is drawn on a 100×100 grid. In a theme's decor list:
 *   [art, left %, top %, size (in screen units), rotation, motion, layer]
 * motion: bob | sway | reach (+ optional reach x/y) | '' ; layer: back | front
 * Halloween has two moods: elementary (cute) and secondary (spooky, no gore). */
;(function () {
  var A = {}

  // ---------- Halloween, cute ----------
  A.pumpkin = '<path d="M50 24 C42 18 44 10 52 8" fill="none" stroke="#5a7a2a" stroke-width="5" stroke-linecap="round"/>' +
    '<ellipse cx="32" cy="58" rx="22" ry="30" fill="#f08a24"/><ellipse cx="68" cy="58" rx="22" ry="30" fill="#f08a24"/><ellipse cx="50" cy="58" rx="20" ry="32" fill="#f79a35"/>' +
    '<circle cx="39" cy="52" r="5" fill="#3a2414"/><circle cx="61" cy="52" r="5" fill="#3a2414"/><circle cx="40.5" cy="50.5" r="1.6" fill="#fff"/><circle cx="62.5" cy="50.5" r="1.6" fill="#fff"/>' +
    '<path d="M37 66 Q50 78 63 66" fill="none" stroke="#3a2414" stroke-width="4" stroke-linecap="round"/><circle cx="30" cy="62" r="4" fill="#ff9fb0" opacity=".7"/><circle cx="70" cy="62" r="4" fill="#ff9fb0" opacity=".7"/>'
  A.ghost = '<path d="M20 90 L20 44 C20 22 34 10 50 10 C66 10 80 22 80 44 L80 90 L71 82 L62 90 L50 82 L38 90 L29 82 Z" fill="#fffdf8"/>' +
    '<ellipse cx="40" cy="42" rx="5" ry="6.5" fill="#2a2440"/><ellipse cx="60" cy="42" rx="5" ry="6.5" fill="#2a2440"/><path d="M43 56 Q50 63 57 56" fill="none" stroke="#2a2440" stroke-width="3.5" stroke-linecap="round"/>' +
    '<circle cx="34" cy="52" r="3.5" fill="#ffb3c4" opacity=".8"/><circle cx="66" cy="52" r="3.5" fill="#ffb3c4" opacity=".8"/>'
  A.witchhat = '<path d="M30 76 L48 10 C52 8 56 12 58 20 L66 40 L74 76 Z" fill="#5b3c88"/><path d="M50 14 C60 16 70 24 78 18" fill="none" stroke="#5b3c88" stroke-width="7" stroke-linecap="round"/>' +
    '<rect x="33" y="62" width="40" height="10" fill="#f79a35"/><rect x="47" y="61" width="12" height="12" rx="2" fill="none" stroke="#f6c945" stroke-width="3"/><ellipse cx="52" cy="80" rx="46" ry="9" fill="#4a2f73"/>'
  A.candycorn = '<path d="M50 10 C58 10 82 70 80 82 C76 92 24 92 20 82 C18 70 42 10 50 10Z" fill="#fffdf8"/><path d="M27 58 C36 56 64 56 73 58 C77 70 80 78 80 82 C76 92 24 92 20 82 C20 78 23 70 27 58Z" fill="#f79a35"/>' +
    '<path d="M22 76 C38 74 62 74 78 76 C80 79 80 81 80 82 C76 92 24 92 20 82 C20 81 20 79 22 76Z" fill="#f6c945"/>'
  A.batcute = '<path d="M50 40 C42 30 30 26 12 32 C20 38 20 46 14 52 C24 50 32 54 36 62 C40 56 46 54 50 56 C54 54 60 56 64 62 C68 54 76 50 86 52 C80 46 80 38 88 32 C70 26 58 30 50 40Z" fill="#4a3a6b"/>' +
    '<circle cx="50" cy="48" r="11" fill="#4a3a6b"/><path d="M42 40 L40 30 L47 37 M58 40 L60 30 L53 37" fill="#4a3a6b"/><circle cx="46" cy="47" r="2.6" fill="#fff"/><circle cx="54" cy="47" r="2.6" fill="#fff"/><path d="M46 53 Q50 56 54 53" stroke="#fff" stroke-width="1.6" fill="none"/>'
  A.moon = '<circle cx="50" cy="50" r="40" fill="#fff3c4"/><circle cx="36" cy="40" r="6" fill="#f3e3a6"/><circle cx="60" cy="62" r="9" fill="#f3e3a6"/><circle cx="62" cy="34" r="4" fill="#f3e3a6"/>'
  A.star = '<path d="M50 6 L61 37 L94 38 L68 58 L77 90 L50 71 L23 90 L32 58 L6 38 L39 37Z" fill="#f6c945"/>'

  // ---------- Halloween, spooky ----------
  A.hand = '<g fill="#e8e2d0" stroke="#9c947c" stroke-width="1.6" stroke-linejoin="round">' +
    '<path d="M44 100 L46 66 L54 66 L56 100Z"/><path d="M58 100 L58 70 L64 70 L64 100Z"/>' +
    '<path d="M38 66 C38 56 62 54 66 62 L64 70 C56 72 44 72 38 66Z"/>' +
    '<path d="M40 60 L32 36 L36 34 L44 56Z"/><path d="M32 36 L28 20 L32 19 L36 34Z"/>' +
    '<path d="M47 56 L46 26 L51 26 L52 56Z"/><path d="M46 26 L46 10 L50 10 L51 26Z"/>' +
    '<path d="M54 57 L58 28 L63 29 L59 57Z"/><path d="M58 28 L61 14 L65 15 L63 29Z"/>' +
    '<path d="M60 60 L70 40 L74 42 L64 61Z"/><path d="M70 40 L76 28 L79 30 L74 42Z"/>' +
    '<path d="M64 66 L80 58 L82 62 L66 70Z"/></g>'
  A.cauldron = '<ellipse cx="50" cy="40" rx="34" ry="8" fill="#5fd35a"/><circle cx="40" cy="30" r="6" fill="#7be86f" opacity=".9"/><circle cx="58" cy="24" r="4.5" fill="#7be86f" opacity=".9"/><circle cx="50" cy="14" r="3" fill="#7be86f" opacity=".8"/>' +
    '<path d="M14 42 C12 76 30 90 50 90 C70 90 88 76 86 42 Z" fill="#1f1d24"/><path d="M12 40 H88 C90 40 90 46 88 46 H12 C10 46 10 40 12 40Z" fill="#2c2a33"/>' +
    '<path d="M28 88 L22 98 M72 88 L78 98" stroke="#1f1d24" stroke-width="5" stroke-linecap="round"/><path d="M30 92 C40 96 60 96 70 92" stroke="#e8682c" stroke-width="4" fill="none" opacity=".8"/>'
  A.cobweb = '<g fill="none" stroke="#d9d4e6" stroke-width="1.3" opacity=".85"><path d="M0 0 L100 30 M0 0 L80 80 M0 0 L30 100 M0 0 L60 100 M0 0 L100 60"/>' +
    '<path d="M20 6 Q16 16 6 20 M40 12 Q30 28 12 40 M60 18 Q46 42 18 60 M80 24 Q62 58 24 80 M100 30 Q80 72 30 100"/></g>' +
    '<g transform="translate(70 66)"><path d="M0 -34 V-8" stroke="#d9d4e6" stroke-width="1"/><ellipse cy="0" rx="6" ry="8" fill="#3d3550"/><circle cy="-9" r="4" fill="#3d3550"/>' +
    '<path d="M-5 -2 L-14 -8 M-5 2 L-15 2 M-5 5 L-13 12 M5 -2 L14 -8 M5 2 L15 2 M5 5 L13 12" stroke="#3d3550" stroke-width="2"/></g>'
  A.batdark = '<path d="M50 44 C40 30 26 24 4 30 C14 38 14 48 6 56 C18 52 30 56 34 66 C40 58 46 56 50 58 C54 56 60 58 66 66 C70 56 82 52 94 56 C86 48 86 38 96 30 C74 24 60 30 50 44Z" fill="#3d3550" stroke="#5a4f72" stroke-width="1.5"/>' +
    '<circle cx="50" cy="50" r="9" fill="#3d3550"/><path d="M44 44 L42 34 L48 41 M56 44 L58 34 L52 41" fill="#3d3550"/><circle cx="46.5" cy="49" r="1.8" fill="#e8682c"/><circle cx="53.5" cy="49" r="1.8" fill="#e8682c"/>'
  A.crookedhat = '<path d="M26 78 L44 30 C46 20 40 12 48 6 C52 18 58 26 56 36 L70 78 Z" fill="#2c2836" stroke="#4d4660" stroke-width="2"/><rect x="31" y="64" width="35" height="9" fill="#7b3b8e"/><ellipse cx="50" cy="80" rx="46" ry="8" fill="#24212c" stroke="#4d4660" stroke-width="2"/>'
  A.tomb = '<path d="M22 92 V40 C22 18 78 18 78 40 V92Z" fill="#6d6a78"/><path d="M22 92 V40 C22 18 78 18 78 40 V92Z" fill="none" stroke="#4d4a57" stroke-width="3"/>' +
    '<path d="M40 44 H60 M50 34 V64" stroke="#4d4a57" stroke-width="5" stroke-linecap="round"/><path d="M10 94 Q30 86 50 92 Q70 86 90 94Z" fill="#2d3a24"/>'
  A.fullmoon = '<circle cx="50" cy="50" r="42" fill="#e9e4c8"/><circle cx="36" cy="38" r="7" fill="#d6d0b0"/><circle cx="62" cy="60" r="10" fill="#d6d0b0"/><circle cx="64" cy="32" r="5" fill="#d6d0b0"/>'

  // ---------- fall / Thanksgiving ----------
  A.maple = '<path d="M50 6 L58 26 L76 18 L70 38 L92 42 L74 54 L80 72 L58 64 L52 92 L48 92 L42 64 L20 72 L26 54 L8 42 L30 38 L24 18 L42 26Z" fill="#d9542b"/><path d="M50 30 V94" stroke="#8a3a1a" stroke-width="3"/>'
  A.oak = '<path d="M50 6 C60 10 56 20 64 22 C74 22 72 34 66 38 C76 42 74 54 64 54 C70 64 62 72 54 68 L52 94 L48 94 L46 68 C38 72 30 64 36 54 C26 54 24 42 34 38 C28 34 26 22 36 22 C44 20 40 10 50 6Z" fill="#e8a02c"/><path d="M50 18 V94" stroke="#8a5a1a" stroke-width="3"/>'
  A.acorn = '<path d="M30 46 C30 74 44 92 50 94 C56 92 70 74 70 46Z" fill="#c98a3c"/><path d="M24 46 C24 26 76 26 76 46 C76 52 24 52 24 46Z" fill="#7a5233"/><path d="M50 30 C50 22 54 16 60 14" stroke="#7a5233" stroke-width="5" fill="none" stroke-linecap="round"/>'
  A.turkey = '<g>' + [['#d9542b', -60], ['#f08a24', -30], ['#f6c945', 0], ['#f08a24', 30], ['#d9542b', 60]].map(function (f) {
    return '<ellipse cx="50" cy="30" rx="11" ry="30" fill="' + f[0] + '" transform="rotate(' + f[1] + ' 50 62)"/>' }).join('') +
    '</g><ellipse cx="50" cy="66" rx="22" ry="24" fill="#7a4a2a"/><circle cx="50" cy="44" r="13" fill="#8a5a33"/><circle cx="45" cy="42" r="2.6" fill="#fff"/><circle cx="55" cy="42" r="2.6" fill="#fff"/>' +
    '<circle cx="45" cy="42" r="1.3" fill="#222"/><circle cx="55" cy="42" r="1.3" fill="#222"/><path d="M46 48 L54 48 L50 55Z" fill="#f6c945"/><path d="M52 50 C56 54 56 60 52 62" stroke="#d9302b" stroke-width="4" fill="none" stroke-linecap="round"/>' +
    '<path d="M42 90 L40 98 M58 90 L60 98" stroke="#f6a01a" stroke-width="3.5" stroke-linecap="round"/>'
  A.pie = '<path d="M10 56 L50 22 L90 56Z" fill="#f2c27a"/><path d="M10 56 H90 L84 74 H16Z" fill="#d9822b"/><path d="M10 56 L50 22 L90 56" fill="none" stroke="#c97a2b" stroke-width="6" stroke-linejoin="round"/>' +
    '<path d="M44 30 C50 24 58 26 58 32 C64 30 66 36 62 40 C56 42 48 40 44 30Z" fill="#fffdf8"/>'
  A.corn = '<path d="M50 12 C66 16 68 60 54 90 C40 60 34 16 50 12Z" fill="#f6c945"/><g fill="#e8a02c" opacity=".7"><circle cx="46" cy="30" r="3"/><circle cx="54" cy="30" r="3"/><circle cx="46" cy="42" r="3"/><circle cx="54" cy="42" r="3"/><circle cx="46" cy="54" r="3"/><circle cx="54" cy="54" r="3"/><circle cx="50" cy="66" r="3"/></g>' +
    '<path d="M50 90 C30 80 22 60 30 40 C34 60 44 74 50 90Z" fill="#7aa83a"/><path d="M52 90 C72 80 78 60 70 40 C66 60 58 74 52 90Z" fill="#5f9e3a"/>'

  // ---------- winter ----------
  A.flake = '<g stroke="#ffffff" stroke-width="5" stroke-linecap="round" fill="none"><path d="M50 8 V92 M14 29 L86 71 M14 71 L86 29"/>' +
    '<path d="M50 22 L40 12 M50 22 L60 12 M50 78 L40 88 M50 78 L60 88 M26 36 L12 38 M26 36 L22 22 M74 64 L88 62 M74 64 L78 78 M26 64 L12 62 M26 64 L22 78 M74 36 L88 38 M74 36 L78 22"/></g>'
  A.snowman = '<circle cx="50" cy="72" r="24" fill="#fffdf8"/><circle cx="50" cy="38" r="17" fill="#fffdf8"/><rect x="36" y="10" width="28" height="16" rx="2" fill="#2a2440"/><rect x="30" y="24" width="40" height="5" rx="2" fill="#2a2440"/>' +
    '<circle cx="44" cy="36" r="2.4" fill="#2a2440"/><circle cx="56" cy="36" r="2.4" fill="#2a2440"/><path d="M50 41 L62 44 L50 46Z" fill="#f08a24"/><path d="M34 52 C42 58 58 58 66 52 L68 58 C58 64 42 64 32 58Z" fill="#d9302b"/>' +
    '<circle cx="50" cy="66" r="2.4" fill="#2a2440"/><circle cx="50" cy="76" r="2.4" fill="#2a2440"/>'
  A.mitten = '<path d="M30 30 C30 14 62 12 64 28 L66 52 C72 44 84 46 82 56 C80 64 70 70 66 76 L66 86 H32 Z" fill="#d9302b"/><rect x="30" y="80" width="38" height="14" rx="3" fill="#fffdf8"/><path d="M36 44 H58 M36 56 H58" stroke="#fffdf8" stroke-width="4" stroke-dasharray="4 4"/>'
  A.pine = '<path d="M50 6 L74 40 H62 L82 66 H66 L88 92 H12 L34 66 H18 L38 40 H26Z" fill="#2f6b5e"/><path d="M50 6 L60 20 C56 24 44 24 40 20Z" fill="#fff"/><rect x="45" y="90" width="10" height="10" fill="#7a5233"/>'

  // ---------- Valentine's ----------
  A.heart = '<path d="M50 88 C20 66 6 50 10 32 C14 16 36 12 50 30 C64 12 86 16 90 32 C94 50 80 66 50 88Z" fill="#e8476b"/><path d="M28 30 C30 24 36 22 40 24" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round" opacity=".7"/>'
  A.heartpink = A.heart.replace('#e8476b', '#f7a6bd')
  A.envelope = '<rect x="10" y="26" width="80" height="54" rx="4" fill="#fffdf8"/><path d="M10 30 L50 58 L90 30" fill="none" stroke="#e3c9cf" stroke-width="4"/><path d="M50 62 C42 56 38 52 40 48 C42 44 48 44 50 48 C52 44 58 44 60 48 C62 52 58 56 50 62Z" fill="#e8476b"/>'

  // ---------- spring / summer ----------
  A.flower = '<g fill="#f28db2">' + [0, 72, 144, 216, 288].map(function (r) { return '<ellipse cx="50" cy="30" rx="13" ry="20" transform="rotate(' + r + ' 50 50)"/>' }).join('') + '</g><circle cx="50" cy="50" r="12" fill="#f6c945"/>'
  A.tulip = '<path d="M50 50 V98" stroke="#5aa04a" stroke-width="5"/><path d="M50 84 C36 78 30 66 32 58 C42 62 48 72 50 84Z" fill="#5aa04a"/><path d="M30 18 L40 32 L50 14 L60 32 L70 18 C74 40 66 54 50 54 C34 54 26 40 30 18Z" fill="#e8768f"/>'
  A.butterfly = '<path d="M50 50 C30 14 6 26 18 50 C6 70 34 82 50 56Z" fill="#8fc3ea"/><path d="M50 50 C70 14 94 26 82 50 C94 70 66 82 50 56Z" fill="#f6a01a"/><path d="M50 34 V74" stroke="#2a2440" stroke-width="5" stroke-linecap="round"/><path d="M50 34 C46 24 40 20 36 20 M50 34 C54 24 60 20 64 20" stroke="#2a2440" stroke-width="2" fill="none"/>'
  A.sun = '<g stroke="#f6b73c" stroke-width="6" stroke-linecap="round">' + [0, 45, 90, 135, 180, 225, 270, 315].map(function (r) { return '<path d="M50 8 V20" transform="rotate(' + r + ' 50 50)"/>' }).join('') + '</g><circle cx="50" cy="50" r="24" fill="#f8c63a"/>'
  A.ball = '<circle cx="50" cy="50" r="40" fill="#fffdf8"/><path d="M50 10 C30 30 30 70 50 90 C40 70 40 30 50 10Z" fill="#e8476b"/><path d="M50 10 C70 30 70 70 50 90 C60 70 60 30 50 10Z" fill="#3a8fd9"/><path d="M10 50 C30 40 70 40 90 50 C70 46 30 46 10 50Z" fill="#f6c945"/>'

  // ---------- end of year ----------
  A.gradcap = '<path d="M50 18 L94 36 L50 54 L6 36Z" fill="#1d2558"/><path d="M26 44 V64 C26 72 74 72 74 64 V44 L50 54Z" fill="#2c3f8f"/><path d="M50 36 L82 44 V70" stroke="#f6c945" stroke-width="3" fill="none"/><circle cx="82" cy="72" r="5" fill="#f6c945"/>'
  A.diploma = '<rect x="12" y="34" width="76" height="30" rx="15" fill="#fffdf8"/><circle cx="20" cy="49" r="10" fill="#efe6d4"/><path d="M48 30 V68 M56 30 V68" stroke="#d9302b" stroke-width="6"/><path d="M52 64 L44 86 L52 80 L60 86Z" fill="#d9302b"/>'

  // ---------- themes ----------
  function deco(list) { return list.map(function (d) { return { art: d[0], x: d[1], y: d[2], size: d[3], r: d[4] || 0, motion: d[5] || '', layer: d[6] || 'back', rx: d[7], ry: d[8] } }) }
  var T = {}
  T['halloween-elementary'] = { label: 'Halloween', title: 'Halloween Gallery', bg1: '#6b3fa0', bg2: '#2e1a52', ink: '#fff8ec', accent: '#f79a35', frame: '#fffdf8',
    decor: deco([['moon', 86, 4, 12, 0, 'bob'], ['batcute', 5, 5, 9, -12, 'bob'], ['batcute', 21, 3, 6, 10, 'bob'], ['batcute', 75, 4, 7, 8, 'bob'],
      ['witchhat', 1, 30, 13, -14, 'sway'], ['ghost', 90, 36, 11, 6, 'bob'], ['candycorn', 13, 56, 6, -20, 'sway'], ['candycorn', 96, 64, 6, 18, 'sway'],
      ['pumpkin', 0, 96, 17, -6, '', 'front'], ['pumpkin', 88, 98, 14, 8, '', 'front']]) }
  T['halloween-secondary'] = { label: 'Halloween', title: 'Halloween Gallery', bg1: '#2a2333', bg2: '#0c0a10', ink: '#ece6d6', accent: '#e8682c', frame: '#ece6d6',
    decor: deco([['fullmoon', 77, 22, 8, 0, ''], ['cobweb', 0, 0, 20, 0, '', 'front'], ['cobweb', 100, 0, 20, 90, '', 'front'],
      ['batdark', 22, 6, 8, -8, 'bob'], ['batdark', 66, 12, 6, 10, 'bob'], ['batdark', 94, 34, 6, -14, 'bob'], ['batdark', 4, 34, 6, 12, 'bob'],
      ['crookedhat', 2, 54, 12, -12, 'sway'], ['tomb', 95, 62, 11, 4, ''], ['cauldron', 0, 98, 16, 0, '', 'front'],
      ['hand', 88, 118, 22, -8, 'reach', 'front', '0', 'calc(var(--u) * -3)'], ['hand', 16, 120, 16, 12, 'reach', 'front', '0', 'calc(var(--u) * -2.5)']]) }
  T.fall = { label: 'Fall', title: 'Fall Gallery', bg1: '#f4b76a', bg2: '#b5541f', ink: '#fffaf0', accent: '#fff1c9', frame: '#fffdf8',
    decor: deco([['maple', 3, 6, 10, -20, 'sway'], ['oak', 18, 2, 7, 25, 'sway'], ['maple', 86, 4, 9, 30, 'sway'], ['acorn', 92, 30, 6, 12, 'bob'],
      ['oak', 2, 40, 8, -40, 'sway'], ['maple', 90, 52, 10, -10, 'sway'], ['acorn', 5, 66, 6, -10, 'bob'], ['oak', 86, 80, 9, 50, 'sway', 'front'], ['maple', 0, 82, 11, 15, 'sway', 'front']]) }
  T.thanksgiving = { label: 'Thanksgiving', title: 'We Are Thankful', bg1: '#f0c27a', bg2: '#a8541f', ink: '#fffaf0', accent: '#fff1c9', frame: '#fffdf8',
    decor: deco([['maple', 3, 5, 9, -20, 'sway'], ['oak', 88, 4, 8, 25, 'sway'], ['corn', 2, 32, 10, -15, 'sway'], ['pie', 88, 36, 11, 0, ''],
      ['acorn', 92, 62, 6, 10, 'bob'], ['turkey', 0, 66, 17, 0, 'bob', 'front'], ['pumpkin', 87, 78, 13, 6, '', 'front']]) }
  T.winter = { label: 'Winter', title: 'Winter Gallery', bg1: '#5b8fc7', bg2: '#1f3f6e', ink: '#ffffff', accent: '#cfe3f5', frame: '#ffffff',
    decor: deco([['flake', 4, 6, 7, 0, 'bob'], ['flake', 20, 2, 5, 15, 'bob'], ['flake', 80, 4, 6, 10, 'bob'], ['flake', 92, 22, 5, 0, 'bob'], ['flake', 3, 44, 5, 20, 'bob'],
      ['pine', 90, 46, 12, 0, ''], ['mitten', 2, 58, 9, -15, 'sway'], ['snowman', 0, 74, 16, 0, '', 'front'], ['pine', 86, 76, 14, 0, '', 'front']]) }
  T.valentines = { label: "Valentine's", title: 'Spreading the Love', bg1: '#f7a6bd', bg2: '#c23a64', ink: '#ffffff', accent: '#fff0f4', frame: '#ffffff',
    decor: deco([['heart', 3, 6, 9, -15, 'bob'], ['heartpink', 18, 2, 6, 10, 'bob'], ['heart', 86, 4, 10, 12, 'bob'], ['heartpink', 92, 30, 6, -8, 'bob'],
      ['envelope', 1, 38, 11, -10, 'sway'], ['heartpink', 6, 64, 7, 15, 'bob'], ['heart', 88, 58, 8, -12, 'bob'], ['heart', 0, 80, 12, 8, '', 'front'], ['envelope', 86, 80, 12, 10, '', 'front']]) }
  T.spring = { label: 'Spring', title: 'Spring Gallery', bg1: '#bfe3a6', bg2: '#5aa04a', ink: '#ffffff', accent: '#fff6c9', frame: '#ffffff',
    decor: deco([['sun', 84, 2, 12, 0, 'sway'], ['butterfly', 6, 6, 8, -12, 'bob'], ['butterfly', 76, 22, 6, 14, 'bob'], ['flower', 2, 36, 8, 0, 'sway'],
      ['flower', 91, 46, 7, 20, 'sway'], ['tulip', 2, 70, 12, -6, 'sway', 'front'], ['tulip', 10, 76, 10, 8, 'sway', 'front'], ['flower', 88, 78, 11, 0, 'sway', 'front']]) }
  T.summer = { label: 'Summer', title: 'Summer Gallery', bg1: '#8fd3f0', bg2: '#2a86c4', ink: '#ffffff', accent: '#fff3b0', frame: '#ffffff',
    decor: deco([['sun', 84, 2, 14, 0, 'sway'], ['butterfly', 6, 8, 7, -10, 'bob'], ['ball', 2, 70, 13, 0, 'bob', 'front'], ['flower', 90, 70, 10, 0, 'sway', 'front'], ['star', 4, 36, 6, 10, 'bob']]) }
  T.endofyear = { label: 'End of year', title: 'What a Year!', bg1: '#3a5bd9', bg2: '#1d2558', ink: '#ffffff', accent: '#f6c945', frame: '#ffffff',
    decor: deco([['star', 4, 6, 7, -10, 'bob'], ['star', 20, 2, 5, 15, 'bob'], ['gradcap', 84, 4, 13, 10, 'sway'], ['star', 92, 34, 5, 0, 'bob'], ['star', 3, 44, 5, 20, 'bob'],
      ['diploma', 0, 74, 15, -12, '', 'front'], ['gradcap', 86, 76, 13, -8, 'sway', 'front']]) }
  T.plain = { label: 'Plain', title: 'Gallery', bg1: '#2c3f8f', bg2: '#1d2558', ink: '#fff8ec', accent: '#f6c945', frame: '#fffdf8', decor: [] }

  // Which theme "Automatic" picks, by month (0 = January).
  T.byMonth = ['winter', 'valentines', 'spring', 'spring', 'spring', 'endofyear', 'summer', 'summer', 'fall', 'halloween', 'thanksgiving', 'winter']

  window.GALLERY_ART = A
  window.GALLERY_THEMES = T
})()
