// Live layers drawn into whichever scene is up, at the scene's <g class="ov"></g> slot
// (over the beach, under Rocky), in the scene's 240x135 pixel grid:
//   haze  – the dome thickens with a banded haze as the context window fills; a compaction
//           blows it out to the right as it thins
//   tasks – one marker lamp on the sand per task: dark while pending, blinking while in hand, lit once done
import type { Haze, Mark, Tasks } from '../types'

export const OVERLAY_SLOT = '<g class="ov"></g>'
export const HAZE_FADE_MS = 4000 // how long one haze level takes to fade into the next
const FLASH_MS = 1200 // a just-lit lamp's sparkle
const RISE_MS = 600 // a new marker rising out of the sand
export const MAX_MARKS = 12

// context fill (0-100) -> haze level 0-5; compaction usually lands back under the first step
const STEPS = [35, 50, 62, 74, 85]
export function hazeLevel(percent: number): number {
  return STEPS.filter(p => percent >= p).length
}

// Flat translucent bands, top to bottom, stepping thinner toward the near beach, the way the
// sky itself is banded: [top row, height, share of the level's strength]
const BANDS: [number, number, number][] = [[-27, 41, 1], [14, 26, .85], [40, 28, .7], [68, 28, .55], [96, 24, .4], [120, 42, .25]]
// the strength (top band opacity) of levels 1-5
const STRENGTH = [.14, .26, .38, .5, .62]
// drifting streaks [x, row, width]; level n shows the first 2n
const WISPS: [number, number, number][] = ([[30, 58], [150, 44], [96, 74], [8, 88], [180, 70], [60, 30], [128, 92], [200, 36], [20, 50], [110, 64]] as const)
  .map(([x, y], k) => [x, y, 18 + (k * 7) % 14])

function layer(level: number, cls: string, style = ''): string {
  if (level <= 0) {
    return ''
  }
  const top = STRENGTH[level - 1] ?? 0
  const bands = BANDS.map(([y, h, share]) => `<rect class="hzc" fill-opacity="${(top * share).toFixed(2)}" y="${y}" width="240" height="${h}"/>`).join('')
  const wisps = WISPS.slice(0, level * 2).map(([x, y, w]) => `M${x} ${y}.5h${w}M${x + 4} ${y - 1}.5h${w - 9}`).join('')
  return `<g class="${cls}"${style}>${bands}<path class="hzw" d="${wisps}"/></g>`
}

export function hazeOverlay(h: Haze, now: number): { markup: string; css: string } {
  const elapsed = now - h.at
  const isFading = elapsed < HAZE_FADE_MS && h.from !== h.level
  const isSweeping = elapsed < HAZE_FADE_MS && h.isClearing && h.from > 0
  if (h.level === 0 && !isFading && !isSweeping) {
    return { markup: '', css: '' }
  }
  const delay = ` style="animation-delay:-${(Math.max(0, elapsed) / 1000).toFixed(2)}s"`
  let markup = ''
  if (isSweeping) {
    markup += layer(h.from, 'hzx', delay) + layer(h.level, 'hzi', delay)
  } else if (isFading) {
    markup += layer(h.from, 'hzo', delay) + layer(h.level, 'hzi', delay)
  } else {
    markup += layer(h.level, 'hz')
  }
  // the streaks drift on the shared clock, so a redraw doesn't snap them back
  const drift = ((now / 1000) % 120).toFixed(1)
  const css = `.hzc{fill:#e2ddc8}.hzw{stroke:#e2ddc8;opacity:.6;animation:hzd 60s steps(60) -${drift}s infinite alternate}@keyframes hzd{to{transform:translateX(20px)}}
.hzo{animation:hzo ${HAZE_FADE_MS / 1000}s steps(8) both}@keyframes hzo{to{opacity:0}}
.hzi{animation:hzi ${HAZE_FADE_MS / 1000}s steps(8) both}@keyframes hzi{from{opacity:0}}
.hzx{animation:hzx ${HAZE_FADE_MS / 1000}s steps(16) both}@keyframes hzx{to{opacity:0;transform:translateX(48px)}}
@media (prefers-color-scheme:dark){.hzc{fill:#4a6670}.hzw{stroke:#4a6670}}`
  return { markup, css }
}

// bottom left, clear of the chat's frosted panel in the middle
const markX = (k: number) => 8 + k * 7
const BASE = 126 // the row a marker stands on: on the dark near sand, above the bottom edge in wide windows

export function taskOverlay(t: Tasks, now: number): { markup: string; css: string } {
  const marks = t.marks.slice(0, MAX_MARKS)
  if (marks.length === 0) {
    return { markup: '', css: '' }
  }
  const elapsed = Math.max(0, now - t.at)
  const delay = ` style="animation-delay:-${(elapsed / 1000).toFixed(2)}s"`
  const head = (x: number) => `M${x - 1} ${BASE - 6}.5h3M${x - 1} ${BASE - 5}.5h3`
  const heads: Record<Mark['state'], string> = { pending: '', active: '', done: '' }
  let posts = '', shadows = '', flash = ''
  const rising: string[] = []
  marks.forEach((m, k) => {
    const x = markX(k)
    const sprite = `M${x + .5} ${BASE - 4}v5`
    if (elapsed < RISE_MS && t.added.includes(m.id)) {
      rising.push(`<path class="tkp" d="${sprite}"/><path class="tk-${m.state}" d="${head(x)}"/>`)
    } else {
      posts += sprite
      heads[m.state] += head(x)
    }
    shadows += `M${x - 1} ${BASE + 1}.5h3`
    if (elapsed < FLASH_MS && t.lit.includes(m.id)) {
      flash += `M${x} ${BASE - 8}.5h1M${x - 3} ${BASE - 6}.5h1M${x + 3} ${BASE - 6}.5h1M${x} ${BASE - 3}.5h1`
    }
  })
  let markup = `<path class="tks" d="${shadows}"/><path class="tkp" d="${posts}"/>`
  for (const [state, d] of Object.entries(heads)) {
    if (d) {
      markup += `<path class="tk-${state}" d="${d}"/>`
    }
  }
  if (rising.length) {
    markup += `<g class="tkr"${delay}>${rising.join('')}</g>`
  }
  if (flash) {
    markup += `<path class="tkf" d="${flash}"${delay}/>`
  }
  const css = `.tks{stroke:#2e2219;opacity:.5}.tkp{stroke:#7a6650}.tk-pending{stroke:#a89c8c}.tk-done,.tk-active,.tkf{stroke:#ffcf6b}
.tk-active{animation:tka 1s step-end infinite}@keyframes tka{50%{opacity:.3}}
.tkr{animation:tkr ${RISE_MS / 1000}s steps(3) both}@keyframes tkr{from{transform:translateY(4px);opacity:0}}
.tkf{opacity:0;animation:tkf ${FLASH_MS / 1000}s step-end both}@keyframes tkf{0%{opacity:1}33%{opacity:.6}66%{opacity:.25}100%{opacity:0}}
@media (prefers-color-scheme:dark){.tks{stroke:#0e0a07}.tkp{stroke:#4a3c32}.tk-pending{stroke:#6b5d50}.tk-done,.tk-active,.tkf{stroke:#ffb24c}}`
  return { markup, css }
}

// what the alt text adds for the live layers
export function overlayAlt(h: Haze, t: Tasks): string {
  const parts: string[] = []
  if (h.level > 0) {
    parts.push(['A faint', 'A light', 'A thick', 'A heavy', 'A dense'][h.level - 1] + ' haze hangs in the dome.')
  }
  const marks = t.marks.slice(0, MAX_MARKS)
  if (marks.length > 0) {
    const lit = marks.filter(m => m.state === 'done').length
    parts.push(`${marks.length} marker lamp${marks.length === 1 ? '' : 's'} on the sand, ${lit} lit.`)
  }
  return parts.join(' ')
}
