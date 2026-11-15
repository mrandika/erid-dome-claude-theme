// Pixel Rocky in his faceted glass suit, plus Eridian chord bubbles.
// Local sprite coordinates: 1 unit = 1 scene pixel, feet on y = 0, body centred on x = 0.

// [name, day, night]: Rocky stays readable at night (he's lit by the house lamp).
export const ROCKY_PAL = [
  ['rkO', '#2a1a10', '#140d08'], ['rkD', '#5c3a24', '#3a2618'], ['rkM', '#8b5a37', '#5e3e28'], ['rkL', '#b37b4e', '#7e5638'], ['rkH', '#d29f70', '#a17552'],
  ['rkG', '#5fc7a1', '#4fb592'], ['rkB', '#46281a', '#2c1910'],
  ['gls', '#e6f5f2', '#a9dcd5'], ['glw', '#ffffff', '#d9fff9'],
  ['bub', '#f4f6f1', '#bfe3dd'], ['nt1', '#2f8f88', '#7fe0d8'], ['nt2', '#b8432f', '#ff8a6a'], ['nt3', '#b07a2a', '#ffc76b'],
  ['sgn', '#2f8f88', '#1d5551'], // the permit sign's text: stays dark on the pale board at night
]

const key = (x, y) => `${x},${y}`

function sprite(legs, extra = {}) {
  const mat = new Map() // key -> 'b' (back limb) | 'f' (front: torso and front limbs)
  const put = (x, y, m) => { const k = key(Math.round(x), Math.round(y)); if (m === 'b' && mat.get(k) === 'f') return; mat.set(k, m) }
  const thick = (a, b, w, m) => { const n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) * 2); for (let t = 0; t <= n; t++) { const x = a[0] + (b[0] - a[0]) * t / n, y = a[1] + (b[1] - a[1]) * t / n; for (let dx = 0; dx < w; dx++) for (let dy = 0; dy < w; dy++) put(x - (w - 1) / 2 + dx, y - (w - 1) / 2 + dy, m) } }
  const poly = (pts, m) => { const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]); for (let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)); y++) for (let x = Math.floor(Math.min(...xs)); x <= Math.ceil(Math.max(...xs)); x++) { let c = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, yi] = pts[i], [xj, yj] = pts[j]; if ((yi > y + .5) !== (yj > y + .5) && x + .5 < (xj - xi) * (y + .5 - yi) / (yj - yi) + xi) c = !c } if (c) put(x, y, m) } }
  // a limb: a thick upper slab out from the shoulder, then a tapered slab down to the foot
  const limb = (l, m) => {
    thick(l.s, l.k, l.arm ? 2 : 3, m)
    const dx = l.f[0] - l.k[0], dy = l.f[1] - l.k[1], len = Math.hypot(dx, dy) || 1, px = -dy / len, py = dx / len
    const wk = l.arm ? 1 : 2.2, wf = l.arm ? .6 : 1.1
    poly([[l.k[0] + px * wk, l.k[1] + py * wk], [l.f[0] + px * wf, l.f[1] + py * wf], [l.f[0] - px * wf, l.f[1] - py * wf], [l.k[0] - px * wk, l.k[1] - py * wk]], m)
    if (l.hand) { thick(l.f, [l.f[0] - 3, l.f[1] - 3], 1, m); thick(l.f, [l.f[0], l.f[1] - 4], 1, m); thick(l.f, [l.f[0] + 3, l.f[1] - 3], 1, m) }
  }
  for (const l of legs.filter(l => l.back)) limb(l, 'b')
  // acorn torso: wide faceted top, tapering to an open underside
  poly([[-6, -23], [-2, -25], [3, -25], [7, -22], [8, -18], [7, -13], [4, -9], [1, -8], [-2, -8], [-5, -10], [-7, -14], [-7, -19]], 'f')
  for (const l of legs.filter(l => !l.back)) limb(l, 'f')
  // shade: light from upper left, dark lower right
  const col = new Map()
  const has = (x, y) => mat.has(key(x, y))
  for (const [k, m] of mat) {
    const [x, y] = k.split(',').map(Number)
    let c = m === 'b' ? 'rkD' : 'rkM'
    if (!has(x, y - 1) || !has(x - 1, y)) c = m === 'b' ? 'rkM' : 'rkL'
    else if (!has(x, y + 1) || !has(x + 1, y)) c = m === 'b' ? 'rkO' : 'rkD'
    col.set(k, c)
  }
  const set = (k, c) => { if (mat.has(k)) col.set(k, c) }
  ;['-3,-24', '-2,-24', '-1,-24', '2,-24', '-5,-22', '-4,-22', '4,-23'].forEach(k => set(k, 'rkH')) // lumpy lit top
  for (let y = -24; y <= -11; y++) set(key(y < -18 ? 1 : 2, y), 'rkD') // crack down the front
  ;['-6,-19', '-5,-19', '-4,-19', '4,-18', '5,-18', '6,-18'].forEach(k => set(k, 'rkD')) // facet seams
  ;['-1,-9', '0,-9', '1,-9', '0,-10'].forEach(k => set(k, 'rkO')) // the opening underneath
  for (const k of extra.flecks ?? []) set(k, 'rkG')
  const outline = new Map(), glass = new Map(), glint = new Map()
  for (const k of mat.keys()) { const [x, y] = k.split(',').map(Number); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const n = key(x + dx, y + dy); if (!mat.has(n)) outline.set(n, 'rkO') } }
  // glass suit: a faceted shell one pixel outside the outline, faint facet seams across him
  const shell = new Set([...mat.keys(), ...outline.keys()])
  for (const k of shell) { const [x, y] = k.split(',').map(Number); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, -1], [-1, -1]]) { const n = key(x + dx, y + dy); if (!shell.has(n) && y + dy < 0) glass.set(n, 'gls') } }
  for (const k of mat.keys()) { const [x, y] = k.split(',').map(Number); if (((x + y) % 8 === 0 || (x - y) % 11 === 0) && y < -2) glint.set(k, 'gls') }
  for (const k of ['-6,-24', '-5,-25', '8,-20', '-16,-14']) if (glass.has(k)) glint.set(k, 'glw')
  return { col, outline, glass, glint }
}

// limb = shoulder (s) -> knee (k) -> foot (f). Front view, as in the model sheet:
// the upper slab runs out and slightly down, the lower slab drops straight to the ground.
const L = (s, k, f, o = {}) => ({ s, k, f, ...o })
const FL = L([-6, -15], [-14, -13], [-15, 0]), FR = L([7, -15], [15, -13], [16, 0])
const BL = L([-4, -18], [-10, -17], [-10, -3], { back: true }), BR = L([5, -18], [11, -17], [11, -3], { back: true })
const C5 = L([0, -12], [0, -10], [0, -2], { back: true })
const STAND = [BL, BR, C5, FL, FR]
// gait: diagonal pairs lift a couple of pixels, feet stay under the knees
const W1 = [BL, L(BR.s, [11, -18], [11, -6], { back: true }), C5, L(FL.s, [-14, -15], [-14, -4]), FR]
const W3 = [L(BL.s, [-10, -18], [-10, -6], { back: true }), BR, C5, FL, L(FR.s, [15, -15], [15, -4])]
// talking: the front-left limb swings out to the side and up as an arm, hand open
const TALK = hand => [BL, BR, C5, FR, L([-6, -15], [-15, -15], hand, { arm: true, hand: true })]
// impatient: the front-right leg lifts for a stomp
const LIFT = [BL, BR, C5, FL, L(FR.s, [17, -19], [20, -10])]
// celebrating: both front limbs up, hands open, wiggling ("jazz hands")
const JAZZ = (l, r) => [BL, BR, C5, L([-6, -15], [-15, -15], l, { arm: true, hand: true }), L([7, -15], [16, -15], r, { arm: true, hand: true })]
// waiting on a permission: the front-left limb holds a sign up on a short stick; SIGN_LIFT stomps while holding it
const SIGN_HAND = [-16, -26]
const SIGN_ARM = L([-6, -15], [-15, -16], SIGN_HAND, { arm: true, hand: true })
const SIGN = [BL, BR, C5, FR, SIGN_ARM]
const SIGN_LIFT = [BL, BR, C5, L(FR.s, [17, -19], [20, -10]), SIGN_ARM]
const DECOR = { flecks: ['-13,-12', '14,-12', '3,-15', '-15,-5', '16,-6', '-9,-20', '10,-20', '-4,-13'] }

function runs(map) { // Map key->colour => { colour: 'M x y.5h w...' }
  const rows = new Map()
  for (const [k, c] of map) { const [x, y] = k.split(',').map(Number); if (!rows.has(y)) rows.set(y, []); rows.get(y).push([x, c]) }
  const out = {}
  for (const [y, xs] of rows) { xs.sort((a, b) => a[0] - b[0]); let i = 0; while (i < xs.length) { let e = i; while (e + 1 < xs.length && xs[e + 1][0] === xs[e][0] + 1 && xs[e + 1][1] === xs[i][1]) e++; out[xs[i][1]] = (out[xs[i][1]] || '') + `M${xs[i][0]} ${y}.5h${e - i + 1}`; i = e + 1 } }
  return out
}

// chord bubble: round pixel outline holding a three-note chord on one stem
function bubble(noteCls) {
  const ring = [[2, 0, 4], [1, 1, 1], [6, 1, 1], [0, 2, 1], [7, 2, 1], [0, 3, 1], [7, 3, 1], [0, 4, 1], [7, 4, 1], [0, 5, 1], [7, 5, 1], [1, 6, 1], [6, 6, 1], [2, 7, 4]]
  const note = [[2, 5, 2], [3, 4, 2], [2, 3, 2], [4, 1, 1], [4, 2, 1], [4, 3, 1], [5, 1, 1]]
  const d = a => a.map(([x, y, w]) => `M${x - 4} ${y - 8}.5h${w}`).join('')
  return `<path class="${'bubR'}" d="${d(ring)}"/><path class="${noteCls}" d="${d(note)}"/>`
}

// 5-row pixel font for the sign
const GLYPH = {
  A: [' # ', '# #', '###', '# #', '# #'], M: ['#   #', '## ##', '# # #', '#   #', '#   #'], Z: ['###', '  #', ' # ', '#  ', '###'], E: ['###', '#  ', '## ', '#  ', '###'], '!': ['#', '#', '#', ' ', '#'],
  O: [' # ', '# #', '# #', '# #', ' # '], K: ['# #', '# #', '## ', '# #', '# #'], '?': ['## ', '  #', ' # ', '   ', ' # '],
  L: ['#  ', '#  ', '#  ', '#  ', '###'], W: ['#   #', '#   #', '# # #', '## ##', '#   #'], ',': [' ', ' ', ' ', '#', '#'],
  Q: [' # ', '# #', '# #', '## ', ' ##'], U: ['# #', '# #', '# #', '# #', '###'], S: [' ##', '#  ', ' # ', '  #', '## '],
  T: ['###', ' # ', ' # ', ' # ', ' # '], I: ['#', '#', '#', '#', '#'], N: ['#  #', '## #', '# ##', '#  #', '#  #'],
}
function sign(text) {
  let x = 0, d = ''
  for (const ch of text) { const g = GLYPH[ch]; g.forEach((row, y) => { for (let i = 0; i < row.length; i++) if (row[i] === '#') { let e = i; while (row[e + 1] === '#') e++; d += `M${x + i} ${y}.5h${e - i + 1}`; i = e } }); x += g[0].length + 1 }
  return { d, w: x - 1 }
}

export function buildRocky(IDX, mode = 'ask', at = [214, 128]) {
  const c = n => `c${IDX[n]}`
  const flat = sp => ({ solid: new Map([...sp.outline, ...sp.col]), gl: new Map([...sp.glass, ...sp.glint]) })
  const poses = mode === 'ask'
    ? { st: STAND, w1: W1, w3: W3, t1: TALK([-16, -25]), t2: TALK([-19, -24]), lf: LIFT }
    : mode === 'amaze'
      ? { st: STAND, w1: W1, w3: W3, j1: JAZZ([-17, -26], [18, -26]), j2: JAZZ([-19, -24], [20, -24]) }
      : mode === 'permit'
        ? { st: STAND, w1: W1, w3: W3, sg: SIGN, sl: SIGN_LIFT }
        : { st: STAND, w1: W1, w3: W3 }
  const frames = Object.fromEntries(Object.entries(poses).map(([k, p]) => [k, flat(sprite(p, DECOR))]))
  const all = Object.values(frames)
  // pixels identical in every pose are drawn once; each pose carries only its differences
  const common = part => new Map([...all[0][part]].filter(([k, v]) => all.every(f => f[part].get(k) === v)))
  const cs = common('solid'), cg = common('gl')
  const diff = (m, base) => new Map([...m].filter(([k, v]) => base.get(k) !== v))
  const draw = (solid, gl) => Object.entries(runs(solid)).map(([k, d]) => `<path class="${c(k)}" d="${d}"/>`).join('') + `<g class="gl">${Object.entries(runs(gl)).map(([k, d]) => `<path class="${c(k)}" d="${d}"/>`).join('')}</g>`
  const f = Object.fromEntries(Object.entries(frames).map(([k, v]) => [k, draw(diff(v.solid, cs), diff(v.gl, cg))]))
  const WALK = 2.4, STEP = .4, N = Math.round(WALK / STEP)
  const FAR = 'translate(40px,-14px) scale(.72)'
  const gait = `.rw1,.rw3,.rst,.rlf,.rtk,.rch{opacity:0}
.rbw{animation:rbw ${STEP / 2}s step-end ${N * 2}}@keyframes rbw{50%{transform:translateY(1px)}}
.rw1{animation:rw1 ${STEP}s step-end ${N}}@keyframes rw1{0%{opacity:1}25%{opacity:0}}
.rw3{animation:rw3 ${STEP}s step-end ${N}}@keyframes rw3{0%{opacity:0}50%{opacity:1}75%{opacity:0}}
@keyframes rst{0%{opacity:0}25%{opacity:1}50%{opacity:0}75%{opacity:1}}`
  const shadow = `<path class="rsh ${c('pebD')}" d="M-15 0.5h33M-12 1.5h27"/>`

  if (mode === 'amaze') {
    // pop in (1.6s), jazz hands with an AMAZE! sign and chords (3.2s), walk back out (1.6s)
    const fx = v => +v.toFixed(2), IN = 1.6, PARTY = 3.2, TOTAL = fx(IN * 2 + PARTY), n = Math.round(IN / STEP), out = fx(IN + PARTY)
    const t = sign('AMAZE!'), sx = -Math.round(t.w / 2) - 2
    const board = `<g transform="translate(${sx} -42)"><g class="rsg"><path class="${c('bub')}" d="M1 -0.5h${t.w + 2}M0 0.5h${t.w + 4}M0 1.5h${t.w + 4}M0 2.5h${t.w + 4}M0 3.5h${t.w + 4}M0 4.5h${t.w + 4}M0 5.5h${t.w + 4}M1 6.5h${t.w + 2}M${-sx - 1} 7.5h3M${-sx} 8.5h1"/><g transform="translate(2 1)"><path class="${c('nt2')}" d="${t.d}"/></g></g></g>`
    const bubbles = ['nt1', 'nt3', 'nt1'].map((nm, i) => `<g transform="translate(${[-22, 17, 21][i]} ${[-30, -32, -24][i]})"><g class="bb bb${i}">${bubble(c(nm)).replace('bubR', c('bub'))}</g></g>`).join('')
    const markup = `<g transform="translate(${at[0]} ${at[1]})"><g class="rw">${shadow}<g class="rbw">${draw(cs, cg)}`
      + `<g class="rst">${f.st}</g><g class="rw1">${f.w1}</g><g class="rw3">${f.w3}</g>`
      + `<g class="rjz"><g class="rj1">${f.j1}</g><g class="rj2">${f.j2}</g></g></g>`
      + `<g class="rjz">${board}${bubbles}</g></g></g>`
    const pc = x => +(x / TOTAL * 100).toFixed(2)
    const css = `.gl{opacity:.45}.rsh{opacity:.35}${gait.replace(/\.rbw\{[^}]*\}/, '').replace(/\.rw1\{[^}]*\}/, '').replace(/\.rw3\{[^}]*\}/, '')}
.rjz,.rj2{opacity:0}
.rw{animation:rw ${TOTAL}s linear forwards}@keyframes rw{0%{transform:${FAR}}${pc(IN)}%{transform:none}${pc(out)}%{transform:none}100%{transform:${FAR}}}
.rbw{animation:rbw ${STEP / 2}s step-end ${n * 2},rbw ${STEP / 2}s step-end ${out}s ${n * 2}}
.rw1{animation:rw1 ${STEP}s step-end ${n},rw1 ${STEP}s step-end ${out}s ${n}}
.rw3{animation:rw3 ${STEP}s step-end ${n},rw3 ${STEP}s step-end ${out}s ${n}}
.rst{animation:rst ${STEP}s step-end ${n},rst ${STEP}s step-end ${out}s ${n}}
.rjz{animation:rjz ${TOTAL}s step-end forwards}@keyframes rjz{0%{opacity:0}${pc(IN)}%{opacity:1}${pc(out)}%{opacity:0}}
.rj1{animation:rj1 .4s step-end ${IN}s infinite}@keyframes rj1{50%{opacity:0}}
.rj2{animation:rj2 .4s step-end ${IN}s infinite}@keyframes rj2{50%{opacity:1}}
.rsg{animation:rsg .8s step-end ${IN}s infinite}@keyframes rsg{50%{transform:translateY(-1px)}}
.bb{opacity:0;animation:bb 2.4s steps(16) infinite}@keyframes bb{0%{opacity:0;transform:translate(0,0)}8%{opacity:1}75%{opacity:1}100%{opacity:0;transform:translate(0,-16px)}}
.bb0{animation-delay:${fx(IN + .1)}s}.bb1{animation-delay:${fx(IN + .7)}s}.bb2{animation-delay:${fx(IN + 1.3)}s}`
    return { markup, css }
  }

  if (mode === 'permit') {
    // walk in (2.4s), raise an "ALLOW, / QUESTION?" sign on a stick (Rocky ends a question with
    // "question?"), then a loop: hold it up, bobbing (4.6s), stomp twice (1.8s) without lowering it
    const HOLD = 4.6, STOMP = .9, LIFT_S = .4, CYCLE = HOLD + 2 * STOMP
    const pc = t => +(t / CYCLE * 100).toFixed(2)
    const lines = ['ALLOW,', 'QUESTION?'].map(sign), inner = Math.max(...lines.map(l => l.w))
    const bw = inner + 4, rows = lines.length * 6 + 1, bx = SIGN_HAND[0] - Math.floor(bw / 2), top = SIGN_HAND[1] - 6 - rows
    // a rounded board, one 5-row line of text per 6 rows, over a 2px stick that ends in his fingers
    const boardD = `M${bx + 1} ${top}.5h${bw - 2}` + Array.from({ length: rows - 2 }, (_, r) => `M${bx} ${top + r + 1}.5h${bw}`).join('') + `M${bx + 1} ${top + rows - 1}.5h${bw - 2}`
    const text = lines.map((l, i) => `<g transform="translate(${bx + 2 + Math.floor((inner - l.w) / 2)} ${top + 1 + i * 6})"><path class="${c('sgn')}" d="${l.d}"/></g>`).join('')
    const board = `<g class="rsb"><path class="${c('rkB')}" d="M${SIGN_HAND[0]} ${top + rows}.5h1M${SIGN_HAND[0]} ${top + rows + 1}.5h1"/>`
      + `<path class="${c('bub')}" d="${boardD}"/>${text}</g>`
    let lift = '0%{opacity:0}', hold = '0%{opacity:1}'
    for (let i = 0; i < 2; i++) { const t0 = HOLD + i * STOMP; lift += `${pc(t0)}%{opacity:1}${pc(t0 + LIFT_S)}%{opacity:0}`; hold += `${pc(t0)}%{opacity:0}${pc(t0 + LIFT_S)}%{opacity:1}` }
    const loop = `${CYCLE}s step-end ${WALK}s infinite`
    const markup = `<g transform="translate(${at[0]} ${at[1]})"><g class="rw">${shadow}`
      + `<g class="rbw"><g class="rbt">${draw(cs, cg)}`
      + `<g class="rst">${f.st}</g><g class="rw1">${f.w1}</g><g class="rw3">${f.w3}</g>`
      + `<g class="rsn"><g class="rsp">${f.sg}</g><g class="rlf">${f.sl}</g>${board}</g></g></g></g></g>`
    const css = `.gl{opacity:.45}.rsh{opacity:.35}${gait}
.rw{animation:rw ${WALK}s linear both}@keyframes rw{from{transform:${FAR}}to{transform:none}}
.rbt{animation:rbt 1.8s step-end ${WALK}s infinite}@keyframes rbt{50%{transform:translateY(-1px)}}
.rst{animation:rst ${STEP}s step-end ${N}}
/* shown from the end of the walk: both keyframes hold 1, as a step's last frame alone doesn't stick */
.rsn{opacity:0;animation:on .01s ${WALK}s forwards}@keyframes on{from,to{opacity:1}}
.rsp{animation:rsp ${loop}}@keyframes rsp{${hold}}
.rlf{animation:rlf ${loop}}@keyframes rlf{${lift}}
.rsb{animation:rsb .8s step-end ${WALK}s infinite}@keyframes rsb{50%{transform:translateY(-1px)}}`
    return { markup, css }
  }

  if (mode === 'leave') {
    // walking back out the way he came; he ends off the right edge
    const markup = `<g transform="translate(${at[0]} ${at[1]})"><g class="rw">${shadow}<g class="rbw">${draw(cs, cg)}`
      + `<g class="rst">${f.st}</g><g class="rw1">${f.w1}</g><g class="rw3">${f.w3}</g></g></g></g>`
    const css = `.gl{opacity:.45}.rsh{opacity:.35}${gait}
.rw{animation:rw ${WALK}s linear forwards}@keyframes rw{from{transform:none}to{transform:${FAR}}}
.rst{opacity:1;animation:rst ${STEP}s step-end ${N}}`
    return { markup, css }
  }

  const waves = `<path class="${c('rkO')}" d="M-24 -31.5h1M-25 -30.5h1M-25 -29.5h1M-24 -28.5h1M-12 -31.5h1M-11 -30.5h1M-11 -29.5h1M-12 -28.5h1"/>`
  const bubbles = ['nt1', 'nt2', 'nt3'].map((n, i) => `<g transform="translate(${[-6, 3, -13][i]} ${[-30, -28, -34][i]})"><g class="bb bb${i}">${bubble(c(n)).replace('bubR', c('bub'))}</g></g>`).join('')
  const markup = `<g transform="translate(${at[0]} ${at[1]})"><g class="rw">${shadow}`
    + `<g class="rbw"><g class="rbt">${draw(cs, cg)}`
    + `<g class="rst">${f.st}</g><g class="rw1">${f.w1}</g><g class="rw3">${f.w3}</g>`
    + `<g class="rtk"><g class="rt1">${f.t1}</g><g class="rt2">${f.t2}${waves}</g></g>`
    + `<g class="rlf">${f.lf}</g></g></g>`
    + `</g><g class="rch">${bubbles}</g></g>`
  // entrance: walk in (2.4s), wave once (1.8s), then a loop from 4.2s:
  // stand by singing chords (5.8s), stomp three times (2.7s), back to standby
  const WAVE = 1.8, STANDBY = 5.8, STOMP = .9, LIFT_S = .4, T0 = WALK + WAVE, CYCLE = STANDBY + 3 * STOMP
  const pc = t => +(t / CYCLE * 100).toFixed(2)
  let lift = '0%{opacity:0}', stand = '0%{opacity:1}'
  for (let i = 0; i < 3; i++) { const t0 = STANDBY + i * STOMP; lift += `${pc(t0)}%{opacity:1}${pc(t0 + LIFT_S)}%{opacity:0}`; stand += `${pc(t0)}%{opacity:0}${pc(t0 + LIFT_S)}%{opacity:1}` }
  const loop = `${CYCLE}s step-end ${T0}s infinite`
  const css = `.gl{opacity:.45}.rsh{opacity:.35}${gait}
.rw{animation:rw ${WALK}s linear both}@keyframes rw{from{transform:${FAR}}to{transform:none}}
.rbt{animation:rbt 1.8s step-end ${WALK}s infinite}@keyframes rbt{50%{transform:translateY(-1px)}}
.rst{animation:rst ${STEP}s step-end ${N},rsl ${loop}}@keyframes rsl{${stand}}
.rtk{animation:rtk ${T0}s step-end forwards}@keyframes rtk{0%{opacity:0}${pc0(WALK, T0)}%{opacity:1}100%{opacity:0}}
.rt2{opacity:0;animation:rt2 .9s step-end ${WALK}s infinite}@keyframes rt2{50%{opacity:1}}
.rt1{animation:rt1 .9s step-end ${WALK}s infinite}@keyframes rt1{50%{opacity:0}}
.rlf{animation:rlf ${loop}}@keyframes rlf{${lift}}
.rch{animation:rch ${loop}}@keyframes rch{0%{opacity:1}${pc(STANDBY)}%{opacity:0}}
.bb{opacity:0;animation:bb 3.6s steps(24) infinite}@keyframes bb{0%{opacity:0;transform:translate(0,0)}8%{opacity:1}75%{opacity:1}100%{opacity:0;transform:translate(-6px,-24px)}}
.bb0{animation-delay:${T0}s}.bb1{animation-delay:${T0 + 1.2}s}.bb2{animation-delay:${T0 + 2.4}s}`
  return { markup, css }
}
const pc0 = (t, total) => +(t / total * 100).toFixed(2)
