// Pixel-art Erid beach (Grace's dome) — generates the backdrop SVG.
// usage (from the project folder): node scene/gen-pixel.mjs [<out.svg>] [<out scene.ts>]
//   defaults: scene/erid-dome.svg (+ -work, -launch, -return, -ask, -permit, -leave, -amaze) and hooks/scene.ts
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildRocky, ROCKY_PAL } from './rocky.mjs'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const OUT_SVG = process.argv[2] ?? path.join(HERE, 'erid-dome.svg')
const OUT_TS = process.argv[3] ?? path.join(HERE, '..', 'hooks', 'scene.ts')

const W = 1600, H = 900, GW = 240, GH = 135, S = W / GW
// extra dome sky above and beach below, so windows narrower than 16:9 (down to ~4:3) show the full width
const PADR = 26, PAD = PADR * S

// ---------- utilities
const rng = s => () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296 }
const hex = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16))
const toHex = a => '#' + a.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t)
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v))
const sstep = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0)); return t * t * (3 - 2 * t) }
const r1 = n => Math.round(n * 10) / 10
const perm = (() => { const r = rng(7); return Array.from({ length: 1024 }, r) })()
const h2 = (x, y) => perm[(((x * 374761393) ^ (y * 668265263)) >>> 0) % 1024]
function vnoise(x, y) { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi; const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf); const a = h2(xi, yi), b = h2(xi + 1, yi), c = h2(xi, yi + 1), d = h2(xi + 1, yi + 1); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v }
function fbm(x, y, o = 4) { let s = 0, a = .5, f = 1; for (let i = 0; i < o; i++) { s += a * vnoise(x * f, y * f); f *= 2; a *= .5 } return s }
function inPoly(x, y, poly) { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c } return c }
const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]
const bay = (i, j) => BAYER[j & 3][i & 3] / 16 - .47

// ---------- geometry, traced from the reference frame (739x415 -> 1600x900)
const RIDGE0 = [[0, 422], [110, 405], [200, 330], [240, 318], [330, 314], [360, 290], [390, 250], [430, 238], [520, 200], [650, 156], [720, 152], [800, 170], [870, 205], [930, 240], [1018, 300], [1083, 330], [1110, 300], [1150, 260], [1235, 217], [1340, 206], [1475, 190], [1560, 184], [1600, 195]]
const RIDGE = []
for (let k = 0; k < RIDGE0.length - 1; k++) {
  const [ax, ay] = RIDGE0[k], [bx, by] = RIDGE0[k + 1]
  const n = Math.max(1, Math.round(Math.hypot(bx - ax, by - ay) / 12))
  for (let i = 0; i < n; i++) {
    const t = i / n, x = ax + (bx - ax) * t, y = ay + (by - ay) * t
    const damp = (x > 200 && x < 340) ? .12 : sstep(0, 160, x)
    RIDGE.push([x, y + damp * ((fbm(x * .011, 3.3, 3) - .5) * 80 + (fbm(x * .05, 9.1, 2) - .5) * 30 + (fbm(x * .16, 1.7, 2) - .5) * 6)])
  }
}
RIDGE.push([1600, 195])
const BASE = [[1600, 652], [1424, 650], [1330, 646], [1100, 642], [800, 640], [400, 644], [0, 660]]
const ROCK = [...RIDGE, ...BASE]
const HOLE = (() => { const p = [[1426, 652], [1421, 560]]; for (let i = 0; i <= 18; i++) { const a = i / 18 * Math.PI; p.push([1376 + 45 * Math.cos(a) + (fbm(i * .7, 4) - .5) * 8, 530 - 86 * Math.sin(a) + (fbm(i * .7, 8) - .5) * 8]) } p.push([1331, 560], [1327, 652]); return p })()
const inHole = (x, y) => inPoly(x, y, HOLE)
const inRock = (x, y) => inPoly(x, y, ROCK) && !inHole(x, y)
const SHORE = [[700, 650], [730, 658], [800, 668], [920, 682], [1050, 696], [1200, 707], [1350, 716], [1480, 723], [1600, 730]]
const SEA = [[690, 644], [1600, 646], ...SHORE.slice().reverse()]
const shoreY = x => { for (let i = 0; i < SHORE.length - 1; i++) { const [ax, ay] = SHORE[i], [bx, by] = SHORE[i + 1]; if (x >= ax && x <= bx) return ay + (by - ay) * (x - ax) / (bx - ax) } return x < 700 ? 650 : 730 }
const HOUSE = {
  cabin: [[238, 318], [238, 270], [262, 258], [318, 264], [324, 318]],
  cabinFront: [[262, 258], [318, 264], [324, 318], [262, 318]],
  door: [[284, 318], [284, 290], [298, 290], [298, 318]],
  win: [[304, 280], [316, 281], [316, 294], [304, 294]],
  f1: [[206, 202], [262, 184], [250, 248]],
  f2: [[262, 184], [324, 230], [250, 248]],
  f3: [[250, 248], [324, 230], [286, 276]],
  f4: [[206, 202], [250, 248], [286, 276], [236, 262]],
  spike: [[262, 184], [292, 162], [304, 214]],
}
const TRUSS = (() => {
  const L = []; const seg = (a, b, c, n) => { for (let i = 1; i < n; i++) { const t = i / n; L.push([[a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], [a[0] + (c[0] - a[0]) * t, a[1] + (c[1] - a[1]) * t]]) } }
  seg(HOUSE.f1[1], HOUSE.f1[0], HOUSE.f1[2], 4); seg(HOUSE.f2[0], HOUSE.f2[1], HOUSE.f2[2], 4); seg(HOUSE.f3[1], HOUSE.f3[0], HOUSE.f3[2], 3)
  return L
})()
const STAIRS = [[318, 318], [338, 352], [322, 392], [352, 440], [330, 492], [362, 548], [346, 612], [356, 642]]
const TREE = (() => {
  const r = rng(42), br = [], lv = []
  const grow = (x, y, a, len, w, d) => {
    const x2 = x + Math.cos(a) * len, y2 = y + Math.sin(a) * len
    br.push({ x, y, x2, y2, w })
    if (d === 0 || len < 6) { for (let i = 0; i < 3; i++) lv.push([x2 + (r() - .5) * 18, y2 + (r() - .5) * 12]); return }
    const n = d > 3 ? 2 : 2 + (r() < .45 ? 1 : 0)
    for (let i = 0; i < n; i++) grow(x2, y2, a + (i - (n - 1) / 2) * (.5 + r() * .35) + (r() - .5) * .3, len * (.66 + r() * .16), w * .66, d - 1)
  }
  grow(388, 252, -Math.PI / 2 - .04, 58, 10, 7)
  return { br, lv }
})()

// ---------- palette: [name, day, night]. Night = the dome's lights dimmed.
const NIGHT = hex('#0a131a')
const nightOf = (c, t = .7) => toHex(mix(mix(hex(c), [hex(c)[0] * .7, hex(c)[1] * .9, hex(c)[2] * 1.1], .5), NIGHT, t))
const PAL = [
  ['sky0', '#c4cbca', '#0c161d'], ['sky1', '#d1d7d5', '#0f1b23'], ['sky2', '#dde1df', '#132129'], ['sky3', '#e7eae7', '#172830'], ['sky4', '#f1f3ef', '#1c2f37'],
  ['cloud', '#fafbf8', '#203640'], ['rib', '#b3bcbb', '#2a4350'], ['lamp', '#b3bcbb', '#ffd99a'],
  ['jadeD', '#34514a'], ['jade1', '#4f7066'], ['jade2', '#6d9686'], ['jadeL', '#9dbcaa'], ['ochre', '#ad9849'], ['moss', '#8a8a48'], ['mossL', '#c4b05c'],
  ['rust', '#a9652f'], ['rustD', '#7a4824'], ['stone', '#8b7765'], ['stoneD', '#5a4a3d'], ['shadow', '#2e2925'], ['rim', '#c9d8cc'],
  ['h0', '#221d1a'], ['h1', '#3d342e'], ['h2', '#5d5249'], ['lat', '#a19a8e'], ['win', '#cdb68a', '#ffb24c'], ['glow', '#cdb68a', '#ff9f3a'],
  ['trunk', '#9a9488'], ['leaf', '#e4e1d7'], ['leafD', '#bdb9ae'],
  ['sand0', '#a6845f'], ['sand1', '#8f6d4e'], ['sand2', '#785940'], ['sand3', '#5e4533'], ['sand4', '#4b3729'], ['pebL', '#c8aa84'], ['pebD', '#3e2e23'], ['wet', '#5f4636'],
  ['seaL', '#8ccbc2', '#2d6a6a'], ['sea1', '#5eaaa3', '#1f5455'], ['sea2', '#4a9b96', '#184546'], ['sea3', '#3a8682', '#12393b'], ['foam', '#f4f6f1', '#9cc9c6'], ['spark', '#ffffff', '#9ff5ea'],
]
PAL.forEach(p => { if (!p[2]) p[2] = nightOf(p[1], /^(sand|peb|wet)/.test(p[0]) ? .6 : .7) })
PAL[PAL.findIndex(p => p[0] === 'pebL')][2] = nightOf('#8f7458', .55)
PAL.push(...ROCKY_PAL)
const IDX = Object.fromEntries(PAL.map((p, i) => [p[0], i]))
const RGB = PAL.map(p => hex(p[1]))
const ROCK_SET = ['jadeD', 'jade1', 'jade2', 'jadeL', 'ochre', 'moss', 'mossL', 'rust', 'rustD', 'stone', 'stoneD', 'shadow'].map(n => IDX[n])
const nearest = (c, set) => { let bi = set[0], bd = 1e9; for (const i of set) { const p = RGB[i]; const d = (p[0] - c[0]) ** 2 * .3 + (p[1] - c[1]) ** 2 * .59 + (p[2] - c[2]) ** 2 * .11; if (d < bd) { bd = d; bi = i } } return bi }

// ---------- rock colour field
const CC = Object.fromEntries(Object.entries({ jade: '#6d9686', jadeL: '#a3c2b0', jadeD: '#33504a', ochre: '#ad9849', moss: '#8a8a48', stone: '#8b7765', rust: '#a9652f', dark: '#1f1b17' }).map(([k, v]) => [k, hex(v)]))
function rockColor(x, y) {
  const wl = sstep(420, 170, x) * (1 - sstep(330, 240, y) * .3), wa = sstep(1110, 1250, x)
  let c = mix(CC.jade, mix(CC.ochre, CC.moss, sstep(560, 640, y)), wl)
  c = mix(c, CC.stone, wa)
  const wr = Math.pow(clamp(1 - Math.hypot((x - 560) / 330, (y - 520) / 220)), 1.4) * .8
  const wr2 = Math.pow(clamp(1 - Math.hypot((x - 1250) / 170, (y - 560) / 170)), 1.4) * .65
  c = mix(c, CC.rust, Math.max(wr, wr2))
  const cx = x < 1150 ? 240 : 1950, cy = x < 1150 ? 1250 : 1150
  const d = Math.hypot(x - cx, y - cy) + fbm(x * .004, y * .006, 3) * 120
  const b = Math.sin(d / 10)
  if (b > .7) c = mix(c, CC.jadeD, .55); else if (b < -.8) c = mix(c, CC.jadeL, .4)
  c = mix(c, [255, 255, 255], sstep(420, 180, y) * .12)
  c = mix(c, CC.dark, sstep(560, 650, y) * .45)
  const crease = Math.exp(-(((x - (1083 + (y - 330) * .11)) / 16) ** 2)) * sstep(320, 360, y) * .55
  return mix(c, CC.dark, crease)
}

// ---------- rasterise the rock, house, stairs and the view through the arch
const ctr = (i, j) => [(i + .5) * S, (j + .5) * S]
const rock = Array.from({ length: GH }, () => new Array(GW).fill(-1))
for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) {
  const [x, y] = ctr(i, j)
  if (inRock(x, y)) {
    let k = nearest(rockColor(x, y).map(v => v + bay(i, j) * 13), ROCK_SET)
    const [ux, uy] = ctr(i, j - 1)
    if (!inPoly(ux, uy, ROCK)) k = x < 420 ? IDX.mossL : IDX.rim // sunlit top edge
    else if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => inHole(...ctr(i + a, j + b)))) k = IDX.shadow // arch thickness
    rock[j][i] = k
  } else if (inHole(x, y)) rock[j][i] = y > 640 ? IDX.sea1 : y > 616 ? IDX.seaL : y > 590 ? IDX.sky4 : IDX.cloud
}
const fillPoly = (grid, poly, k) => { for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) if (inPoly(...ctr(i, j), poly)) grid[j][i] = k }
const put = (grid, x, y, k) => { const i = Math.floor(x / S), j = Math.floor(y / S); if (i >= 0 && j >= 0 && i < GW && j < GH) grid[j][i] = k }
const line = (grid, a, b, k) => { const n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / (S * .4)); for (let t = 0; t <= n; t++) put(grid, a[0] + (b[0] - a[0]) * t / n, a[1] + (b[1] - a[1]) * t / n, k) }
for (let i = 0; i < STAIRS.length - 1; i++) line(rock, STAIRS[i], STAIRS[i + 1], IDX.stoneD)
for (let i = 0; i < STAIRS.length - 1; i++) line(rock, [STAIRS[i][0] + S, STAIRS[i][1]], [STAIRS[i + 1][0] + S, STAIRS[i + 1][1]], IDX.lat)
fillPoly(rock, HOUSE.cabin, IDX.h1); fillPoly(rock, HOUSE.cabinFront, IDX.h0); fillPoly(rock, HOUSE.door, IDX.h2); fillPoly(rock, HOUSE.win, IDX.win)
fillPoly(rock, HOUSE.f4, IDX.h0); fillPoly(rock, HOUSE.f3, IDX.h0); fillPoly(rock, HOUSE.f2, IDX.h1); fillPoly(rock, HOUSE.f1, IDX.h2)
TRUSS.forEach(([a, b]) => line(rock, a, b, IDX.lat))
line(rock, HOUSE.spike[0], HOUSE.spike[1], IDX.h1); line(rock, HOUSE.spike[1], HOUSE.spike[2], IDX.h1)

// tree: trunk + canopy split so the canopy can sway a pixel
const trunk = new Map(), canopy = new Map()
TREE.br.forEach(b => { const n = Math.ceil(Math.hypot(b.x2 - b.x, b.y2 - b.y) / (S * .4)); for (let t = 0; t <= n; t++) { const x = b.x + (b.x2 - b.x) * t / n, y = b.y + (b.y2 - b.y) * t / n, i = Math.floor(x / S), j = Math.floor(y / S); const m = y < 180 ? canopy : trunk; m.set(`${i},${j}`, IDX.trunk); if (b.w > 6) m.set(`${i + 1},${j}`, IDX.leafD) } })
TREE.lv.forEach(([x, y], n) => canopy.set(`${Math.floor(x / S)},${Math.floor(y / S)}`, n % 3 ? IDX.leaf : IDX.leafD))

// sea (+ fade into wet sand at the tip)
const sea = Array.from({ length: GH }, () => new Array(GW).fill(-1))
const shoreRow = new Array(GW).fill(-1)
for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) {
  const [x, y] = ctr(i, j)
  if (!inPoly(x, y, SEA)) continue
  const a = sstep(690, 880, x)
  if (a < .98 && bay(i, j) + .5 > a) { sea[j][i] = IDX.wet; continue }
  const t = (y - 646) / Math.max(8, shoreY(x) - 646)
  sea[j][i] = t + bay(i, j) * .25 < .22 ? IDX.seaL : t + bay(i, j) * .25 < .55 ? IDX.sea1 : t + bay(i, j) * .25 < .85 ? IDX.sea2 : IDX.sea3
  shoreRow[i] = Math.max(shoreRow[i], j)
}

// ---------- encode a grid (or map) as one stroked path per colour
const runsOf = grid => { const out = {}; for (let j = 0; j < GH; j++) { let i = 0; while (i < GW) { const k = grid[j][i]; let e = i; while (e < GW && grid[j][e] === k) e++; if (k >= 0) out[k] = (out[k] || '') + `M${i} ${j}.5h${e - i}`; i = e } } return out }
const mapRuns = m => { const out = {}; for (const [key, k] of m) { const [i, j] = key.split(','); out[k] = (out[k] || '') + `M${i} ${j}.5h1` } return out }
const underlay = grid => { const out = {}; for (let j = 0; j < GH; j++) { const row = grid[j]; let i = 0; while (i < GW) { if (row[i] < 0) { i++; continue } let e = i; const n = {}; while (e < GW && row[e] >= 0) { n[row[e]] = (n[row[e]] || 0) + 1; e++ } if (e - i > 1) { const k = Object.entries(n).sort((x, y) => y[1] - x[1])[0][0]; out[k] = (out[k] || '') + `M${i + .1} ${j}.5h${e - i - .2}` } i = e } } return out }
const paths = runs => Object.entries(runs).map(([k, d]) => `<path class="c${k}" d="${d}"/>`).join('')

// ---------- sky: flat bands with checker-dithered seams (cheap vector)
const SKY = [[-PADR - 1, 'sky0'], [16, 'sky1'], [36, 'sky2'], [58, 'sky3'], [78, 'sky4']]
let skyD = '', defs = ''
SKY.forEach(([row, name], n) => {
  const next = SKY[n + 1]?.[0] ?? GH
  skyD += `<rect class="c${IDX[name]}" y="${row}" width="${GW}" height="${next - row}"/>`
  if (n) { defs += `<pattern id="d${n}" width="2" height="2" patternUnits="userSpaceOnUse"><rect class="c${IDX[name]}" width="1" height="1"/><rect class="c${IDX[name]}" x="1" y="1" width="1" height="1"/></pattern>`; skyD += `<rect fill="url(#d${n})" y="${row - 2}" width="${GW}" height="2"/>` }
})
// dome: ribs as aliased pixel lines, lamps that light up at night
let ribD = '', lampD = ''
for (let k = 0; k < 6; k++) { const f = 1 - k * .14; const rx = 262 * f, ry = 150 * f; let d = ''; for (let a = 0; a <= 64; a++) { const t = a / 64 * Math.PI; d += (a ? 'L' : 'M') + r1(120 - Math.cos(t) * rx) + ' ' + r1(147 - Math.sin(t) * ry) } ribD += d }
for (let m = 1; m < 12; m++) { const a = m / 12 * Math.PI, bx = 120 - Math.cos(a) * 262; ribD += `M${r1(bx)} 147Q${r1(120 - Math.cos(a) * 135)} ${r1(147 - 172 * Math.sin(a) * .95)} 120 -20` }
const lr = rng(9)
for (let k = 0; k < 6; k++) { const f = 1 - k * .14; for (let m = 1; m < 12; m++) { if (lr() < .55) continue; const t = m / 12 * Math.PI; const x = Math.round(120 - Math.cos(t) * 262 * f), y = Math.round(147 - Math.sin(t) * 150 * f); if (y >= 0 && y < 92 && x >= 0 && x < GW) lampD += `M${x} ${y}.5h1` } }

// ---------- beach: bands + dithered seams + pebble speckle
const BEACH = [[95, 'sand0'], [101, 'sand1'], [109, 'sand2'], [121, 'sand3'], [139, 'sand4']]
let beachD = ''
BEACH.forEach(([row, name], n) => {
  const next = BEACH[n + 1]?.[0] ?? GH + PADR + 1
  beachD += `<rect class="c${IDX[name]}" y="${row}" width="${GW}" height="${next - row}"/>`
  if (n) { defs += `<pattern id="b${n}" width="2" height="2" patternUnits="userSpaceOnUse"><rect class="c${IDX[name]}" width="1" height="1"/><rect class="c${IDX[name]}" x="1" y="1" width="1" height="1"/></pattern>`; beachD += `<rect fill="url(#b${n})" y="${row - 2}" width="${GW}" height="2"/>` }
})
const pr = rng(3); let pebL = '', pebD = ''
for (let n = 0; n < 440; n++) { const j = 96 + Math.floor(Math.pow(pr(), .8) * (39 + PADR)), i = Math.floor(pr() * GW); if (sea[j]?.[i] >= 0) continue; const w = j > 120 && pr() < .4 ? 2 : 1; if (pr() < .5) pebL += `M${i} ${j}.5h${w}`; else pebD += `M${i} ${j}.5h${w}` }

// ---------- animated layers
// swash: frames k=0..3 — foam line k rows below the shore, wash filled behind it
const frame = k => { let wash = '', foam = '', wet = ''; for (let i = 0; i < GW; i++) { if (shoreRow[i] < 0) continue; const [x] = ctr(i, 0); const reach = Math.round(k * sstep(760, 980, x)); const r0 = shoreRow[i]; if (reach > 1) wash += `M${i + .5} ${r0 + 1}v${reach - 1}`; if (x > 760 || k === 0) foam += `M${i} ${r0 + reach}.5h1`; if (k === 3 && reach > 0) wet += `M${i + .5} ${r0 + 1}v${reach}` } return { wash, foam, wet } }
const F = [0, 1, 2, 3].map(frame)
const swash = F.map((f, k) => `<g class="s${k}">${f.wash ? `<path class="c${IDX.seaL}" d="${f.wash}"/>` : ''}<path class="c${IDX.foam}" d="${f.foam}"/></g>`).join('')
const wet = `<path class="wet c${IDX.wet}" d="${F[3].wet}"/>`
// sea sparkle: periodic dashes (period 12) so a 12px stepped slide loops
let sp1 = '', sp2 = ''
for (let j = 96; j < 112; j++) for (let i = 96; i < 264; i++) { const h = (i % 12) * 7 + j * 13; if (j % 2 === 0 && h % 12 < 1) sp1 += `M${i} ${j}.5h2`; if (j % 2 === 1 && (h + 5) % 12 < 1) sp2 += `M${i} ${j}.5h1` }
let tw = ''; const tr = rng(4)
for (let n = 0; n < 16; n++) { const i = 110 + Math.floor(tr() * 128), j = 97 + Math.floor(tr() * 12); if (sea[j]?.[i] >= 0 && sea[j][i] !== IDX.wet) tw += `<path class="tw td${n % 6} c${IDX.spark}" d="M${i} ${j}.5h1"/>` }
for (let n = 0; n < 4; n++) tw += `<path class="tw td${(n + 3) % 6} c${IDX.spark}" d="M${200 + Math.floor(tr() * 10)} ${93 + Math.floor(tr() * 3)}.5h1"/>`
const cloud = (x, y, w) => `M${x} ${y}.5h${w}M${x + 3} ${y - 1}.5h${w - 7}M${x + 7} ${y - 2}.5h${w - 15}M${x - 4} ${y + 1}.5h${w - 6}`
const seaClip = `<clipPath id="sc"><path d="M${SEA.map(([x, y]) => r1(x / S) + ' ' + r1(y / S)).join('L')}Z"/></clipPath>`
defs += seaClip

const cls = PAL.map((p, i) => `.c${i}{stroke:${p[1]};fill:${p[1]}}`).join('')
const ncls = PAL.map((p, i) => p[2] !== p[1] ? `.c${i}{stroke:${p[2]};fill:${p[2]}}` : '').join('')
const css = `rect{stroke:none!important}path{fill:none!important}${cls}
.rib{stroke:${PAL[IDX.rib][1]};fill:none;opacity:.32}
.lamp{opacity:0}@keyframes lp{0%{opacity:1}70%{opacity:.6}}
.cl{animation:cl 90s steps(90) infinite alternate}@keyframes cl{to{transform:translateX(36px)}}
.cl2{animation:cl 140s steps(140) infinite alternate-reverse}
.sw{animation:sw 4s step-end infinite}@keyframes sw{50%{transform:translateX(1px)}}
.sp{animation:sp 2.4s steps(12) infinite}.sp2{animation:sp 3.9s steps(12) infinite reverse}@keyframes sp{to{transform:translateX(-12px)}}
.tw{opacity:0;animation:tw 6s step-end infinite}@keyframes tw{0%{opacity:0}40%{opacity:1}48%{opacity:0}}
.s0,.s1,.s2,.s3,.wet{animation:8s step-end infinite}
.s0{animation-name:s0}@keyframes s0{0%{opacity:1}12%{opacity:0}88%{opacity:1}}
.s1{opacity:0;animation-name:s1}@keyframes s1{0%{opacity:0}12%{opacity:1}24%{opacity:0}76%{opacity:1}88%{opacity:0}}
.s2{opacity:0;animation-name:s2}@keyframes s2{0%{opacity:0}24%{opacity:1}36%{opacity:0}64%{opacity:1}76%{opacity:0}}
.s3{opacity:0;animation-name:s3}@keyframes s3{0%{opacity:0}36%{opacity:1}64%{opacity:0}}
.wet{opacity:0;animation-name:wt}@keyframes wt{0%{opacity:0}66%{opacity:.9}78%{opacity:.6}88%{opacity:.3}96%{opacity:0}}
.glow{opacity:0}
@media (prefers-color-scheme:dark){${ncls}.rib{stroke:${PAL[IDX.rib][2]};opacity:.65}.lamp{opacity:1;animation:lp 5s step-end infinite}.glow{opacity:.35}}`

const body = `<g stroke-width="1.1" transform="scale(${r1(S * 1000) / 1000})">
${skyD}
<path class="rib" d="${ribD}"/><path class="lamp c${IDX.lamp}" d="${lampD}"/>
<path class="cl c${IDX.cloud}" d="${cloud(10, 22, 40)}${cloud(150, 14, 46)}"/><path class="cl2 c${IDX.cloud}" d="${cloud(178, 50, 30)}${cloud(70, 8, 26)}"/>{{SKY}}
${paths(underlay(rock))}${paths(runsOf(rock))}
<rect class="glow c${IDX.glow}" x="44" y="40" width="7" height="6"/>
${paths(mapRuns(trunk))}<g class="sw">${paths(mapRuns(canopy))}</g>
${beachD}<path class="c${IDX.pebL}" d="${pebL}"/><path class="c${IDX.pebD}" d="${pebD}"/>
${wet}
${paths(underlay(sea))}${paths(runsOf(sea))}
<g clip-path="url(#sc)"><path class="sp c${IDX.seaL}" d="${sp1}"/><path class="sp2 c${IDX.foam}" d="${sp2}" opacity=".7"/></g>
${tw}
${swash}
</g>`

const wrap = (style, inner) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 ${r1(-PAD)} ${W} ${r1(H + 2 * PAD)}" preserveAspectRatio="xMinYMid slice"><style>${style}</style><defs>${defs}</defs>${inner}</svg>`.replace(/\n/g, '')
// OVERLAY marks where the mod draws its live layers (the haze, the task markers): over the beach, under Rocky
const OVERLAY = '<g class="ov"></g>'
const scene = ({ style = '', sky = '', front = '' } = {}) => wrap(css + style, body.replace('{{SKY}}', sky).replace(/<\/g>$/, OVERLAY + front + '</g>'))

// working: Claude is on a turn — the dome lamps come on, Grace's window glows, the sea livens up
const WORK = `.lamp{opacity:1;animation:lp 5s step-end infinite}
.c${IDX.lamp}{stroke:#f6bd52}.c${IDX.win}{stroke:#ffcf6b;fill:#ffcf6b}.c${IDX.glow}{fill:#ffa83e}
.glow{opacity:.5;animation:gw 1.6s step-end infinite}@keyframes gw{50%{opacity:.3}}
.rib{opacity:.5}`

// a Beetle launch: a small probe with an amber Astrophage-drive trail, rising from behind the hill
// across the dome to the upper right (a subagent has set off)
const BEETLE_PATH = 'translate(180px,-74px)'
const beetle = (() => {
  // a stubby dark probe, lit edge on top, its drive flaring amber/red at the trailing (lower-left) end
  const probe = `<path class="c${IDX.h0}" d="M0 -2.5h4M-1 -1.5h6M-1 -0.5h6M0 0.5h4"/><path class="c${IDX.lat}" d="M1 -2.5h2M0 -1.5h1"/>`
    + `<path class="c${IDX.nt3}" d="M-3 -0.5h2M-2 0.5h2"/><path class="c${IDX.nt2}" d="M-4 0.5h2M-3 1.5h1"/>`
  const trail = Array.from({ length: 9 }, (_, i) => i + 1).map(i => `<g class="bt" style="animation-delay:${(i * .07).toFixed(2)}s;opacity:${(1 - i * .1).toFixed(2)}"><path class="c${i < 4 ? IDX.nt3 : IDX.nt2}" d="M-3 0.5h${i < 4 ? 2 : 1}"/></g>`).join('')
  return `<g transform="translate(70 40)">${trail}<g class="bt">${probe}</g></g>`
})()
const LAUNCH = `${WORK}
.bt{animation:bt 2.6s cubic-bezier(.4,0,.8,.7) both}@keyframes bt{0%{transform:none;visibility:visible}96%{visibility:visible}100%{transform:${BEETLE_PATH};visibility:hidden}}`

// a Beetle comes home (a subagent has finished): the same probe drops back down the dome toward the hill,
// drive first as it brakes, and sinks behind the ridge
const RETURN = `${WORK}
.bt{animation:br 2.6s cubic-bezier(.2,.4,.5,1) both}@keyframes br{0%{transform:${BEETLE_PATH};visibility:visible}96%{visibility:visible}100%{transform:none;visibility:hidden}}`

const svg = scene()
const svgWork = scene({ style: WORK })
const svgLaunch = scene({ style: LAUNCH, sky: beetle })
const svgReturn = scene({ style: RETURN, sky: beetle })
const rockyScene = (mode, style = '') => { const r = buildRocky(IDX, mode); return scene({ style: style + r.css, front: r.markup }) }
const svgAsk = rockyScene('ask') //     Rocky walks in, waves, sings, stomps while a question waits
const svgPermit = rockyScene('permit') // holds up an "ALLOW, QUESTION?" sign while a permission prompt waits
const svgLeave = rockyScene('leave') // and walks back out once it's answered or dropped
const svgAmaze = rockyScene('amaze') // a long task finished: Rocky pops in — "Amaze!"

const OUT = { '': svg, '-work': svgWork, '-launch': svgLaunch, '-return': svgReturn, '-ask': svgAsk, '-permit': svgPermit, '-leave': svgLeave, '-amaze': svgAmaze }
for (const [k, v] of Object.entries(OUT)) {
  fs.writeFileSync(OUT_SVG.replace(/\.svg$/, `${k}.svg`), v)
  console.log((k || 'idle').padEnd(8), v.length, v.length > 131072 ? 'OVER LIMIT' : '')
}
const SYNC = [['.cl', 180], ['.cl2', 280], ['.sw', 4], ['.sp', 2.4], ['.sp2', 3.9], ['.s0,.s1,.s2,.s3,.wet', 8], ['.lamp', 5], ['.glow', 1.6],
  ...[0, 1, 2, 3, 4, 5].map(k => [`.td${k}`, 6, k])]
fs.writeFileSync(OUT_TS, `// Generated by scene/gen-pixel.mjs — do not edit by hand.
// Ambient loops [selector, period s, offset s]: the mod starts each scene's loops where the clock says, so swaps don't jump.
export const SYNC: [string, number, number?][] = ${JSON.stringify(SYNC)}
export const SCENE = ${JSON.stringify(svg)}
export const SCENE_WORK = ${JSON.stringify(svgWork)}
export const SCENE_LAUNCH = ${JSON.stringify(svgLaunch)}
export const SCENE_RETURN = ${JSON.stringify(svgReturn)}
export const SCENE_ASK = ${JSON.stringify(svgAsk)}
export const SCENE_PERMIT = ${JSON.stringify(svgPermit)}
export const SCENE_LEAVE = ${JSON.stringify(svgLeave)}
export const SCENE_AMAZE = ${JSON.stringify(svgAmaze)}
`)
