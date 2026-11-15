# Scene reference (`scene/gen-pixel.mjs`)

The generator draws the Erid beach as pixel art and writes six SVG scenes, plus `hooks/scene.ts` for the mod.

```bash
node scene/gen-pixel.mjs                                    # default outputs
node scene/gen-pixel.mjs <out.svg> <out scene.ts>           # explicit outputs
```

It prints every scene's length, and `OVER LIMIT` for any past **131,072 characters**, the most a backdrop `Svg` may hold.

## Coordinate systems

| System | Size | Use |
|---|---|---|
| Scene units | 1600 × 900 (`W`, `H`) | Geometry is traced here: ridge, shore, house, tree |
| Pixel grid | 240 × 135 (`GW`, `GH`), one pixel = `S` = 6.667 units | Everything is rasterised and drawn here, inside `<g transform="scale(6.667)">` |
| Pad | `PADR` = 26 rows (`PAD` ≈ 173 units) above and below | Extra sky and beach for windows narrower than 16:9 |

Root SVG: `viewBox="0 -173.3 1600 1246.7"` and `preserveAspectRatio="xMinYMid slice"`.

| Window shape | What you see |
|---|---|
| 16:9 | Exactly the 1600 × 900 composition |
| 16:10 to about 4:3 | The full width, with more sky and beach |
| Narrower than 4:3 (phones) | Cropped from the right, so the house and tree stay in view and Rocky is cut off |

## Geometry constants

| Constant | Meaning |
|---|---|
| `RIDGE0` | Skyline control points of the rock, left to right. `RIDGE` densifies them every 12 units and roughens them with fBm noise; the roughness is damped over the house plateau (x 200–340) and the left edge |
| `BASE` | The rock's foot, where it meets the beach |
| `ROCK` | `RIDGE + BASE` polygon |
| `HOLE` | The arch opening: a noisy half-ellipse centred on (1376, 530), rx 45, ry 86, with sides down to y ≈ 652 |
| `SHORE` / `SEA` | Shoreline points from (700, 650) to (1600, 730); the sea polygon sits above them |
| `HOUSE` | Polygons: `cabin`, `cabinFront`, `door`, `win`, crystal faces `f1`–`f4`, `spike`. `TRUSS` holds lattice lines across the faces |
| `STAIRS` | The path cut down the rock face from the house to the beach |
| `TREE` | A recursive branching tree from (388, 252), depth 7, seeded random 42. Branches above y = 180 form the canopy, which sways |

## Layers, back to front

1. **Sky:** flat bands `sky0…sky4` starting at rows −27, 16, 36, 58 and 78, with checker-dither seams (`<pattern id="dN">`). **`{{SKY}}`** follows: what flies outside the dome (the Beetles), at 80% opacity, so the ribs and clouds draw over it and it reads as seen through the milky glass.
2. **Dome ribs:** six latitude half-ellipses and eleven meridians, as one path with class `rib`. **Lamps** (`lamp`) are scattered on rib crossings and hidden by day.
3. **Clouds:** `cl` and `cl2` pixel clouds.
4. **Rock:** a raster of `rockColor(x, y)`, quantised to the rock palette with Bayer dither. Under it, a **per-row underlay** of each row's most common colour hides anti-alias seams. The top rim, the arch's inner shadow, the stairs, the house and the truss are drawn into the same grid.
5. **Window glow:** `<rect class="glow">`, shown at night and in work mode.
6. **Tree:** trunk, then the canopy inside `<g class="sw">`.
7. **Beach:** bands `sand0…sand4`, with dark and light pebble speckle (440 pebbles, seeded).
8. **Wet sand:** shown by the `wet` animation.
9. **Sea:** its own raster with an underlay. At the left tip it dithers into wet sand.
10. **Sparkle:** `sp` and `sp2` dash rows clipped to the sea (`clipPath id="sc"`), plus `tw` twinkles in classes `td0…td5`.
11. **Swash frames:** `s0`–`s3`, each holding a foam line and wash fill.
12. **Rocky:** inserted just before the closing `</g>` in the asking, leaving and amaze scenes.

### The rock's colour field (`rockColor`)

- **Base:** jade, blended toward ochre and moss on the left hill (x < 420) and toward stone on the arch headland (x > 1110).
- **Rust patches:** around (560, 520) and (1250, 560).
- **Strata:** `sin(distance / 10)` around a centre point, with fBm warp: (240, 1250) for the main mass and (1950, 1150) for the headland. Peaks darken toward `jadeD`; troughs lighten toward `jadeL`.
- **Light:** brightened toward the top, darkened toward the foot.
- **Crease:** a dark band down x ≈ 1083 between the masses.

## Encoding: why the file stays small

- **One path per colour.** Each row run is `M x y.5h w`, a horizontal stroke 1.1 wide. Classes `.cN` set `stroke` and `fill` per palette entry. `rect{stroke:none!important}` and `path{fill:none!important}` stop the class rules adding fills to runs or strokes to rects.
- **Sky and beach** are vector rects, not rasters.
- **Rocky's frames** share their common pixels; see [rocky-reference.md](rocky-reference.md).
- **Size levers:**

  | Lever | Effect |
  |---|---|
  | Rock dither amplitude, `bay(i, j) * 13` | The biggest lever: 26 → 16 → 13 took the scene from 123K to 103K |
  | Pebble count | 440 now |
  | Grid resolution | 240 × 135 |
  | Rocky's pose count | Each extra pose adds 1.5–3K |

## Night mode

One CSS block, `@media (prefers-color-scheme: dark)`, recolours every `.cN`. It also raises rib opacity, lights the lamps (`lp`, 5 s) and shows the window glow at 35%. No other media query is used; see [troubleshooting.md](troubleshooting.md).

## Ambient animations

| Class | What | Timing | Period in `SYNC` |
|---|---|---|---|
| `cl` | Clouds drift 36 px | 90 s, `steps(90)`, alternate | 180 s |
| `cl2` | Second cloud pair | 140 s, alternate-reverse | 280 s |
| `sw` | Tree canopy sways 1 px | 4 s, step-end | 4 s |
| `sp` / `sp2` | Sea sparkle rows slide 12 px (`sp2` reversed) | 2.4 s / 3.9 s, `steps(12)` | 2.4 / 3.9 s |
| `tw` + `td0…td5` | Twinkles: on at 40–48% of each cycle, offsets 0–5 s | 6 s | 6 s with offset k |
| `s0…s3`, `wet` | Swash: foam steps 0 → 3 rows up the sand and back; wet sand fades after | 8 s, step-end | 8 s |
| `lamp` | Dome lamps flicker (night and work only) | 5 s | 5 s |
| `glow` | Window glow pulse (work only) | 1.6 s | 1.6 s |

**Swash timeline (8 s):**

| Frame | Shown at |
|---|---|
| `s0`, foam at the shoreline | 0–12% and 88–100% |
| `s1` | 12–24% and 76–88% |
| `s2` | 24–36% and 64–76% |
| `s3`, peak reach | 36–64% |
| Wet sand | appears at 66% and fades out by 96% |

### Keeping loops in step across scenes (`SYNC`)

Every state change loads a different scene, which restarts its CSS. `scene.ts` exports `SYNC`, a list of `[selector, period, offset?]` entries. On each draw the mod appends `selector{animation-delay:-((now + offset) % period)s}` to the scene's style, so the loops pick up where the shared clock says.

- **Keep each loop's duration the same in every scene.** A loop that runs at a different speed in one scene can't line up.
- **Add any new ambient loop to `SYNC`,** with its full period. An alternating loop's period is twice its duration.

Rocky's routines and the Beetle are deliberately left out, because they start fresh.

## The nine scenes

| Export | File | Built from | About |
|---|---|---|---|
| `SCENE` | `erid-dome.svg` | base | 103K |
| `SCENE_WORK` | `-work.svg` | base + `WORK` CSS: lamps on in amber, window and glow amber and pulsing, ribs at 50% | 103K |
| `SCENE_LAUNCH` | `-launch.svg` | work + Beetle markup at `{{SKY}}` + `bt` animation | 105K |
| `SCENE_RETURN` | `-return.svg` | work + the same Beetle, flown back by `br` | 105K |
| `SCENE_SALVO` | `-salvo.svg` | work + four Beetles (`bs0`–`bs3`), 0.5 s apart | 109K |
| `SCENE_ASK` | `-ask.svg` | base + `buildRocky('ask')` | 126K, the tightest |
| `SCENE_PERMIT` | `-permit.svg` | base + `buildRocky('permit')`: the ALLOW, QUESTION? sign | 122K |
| `SCENE_LEAVE` | `-leave.svg` | base + `buildRocky('leave')` | 113K |
| `SCENE_AMAZE` | `-amaze.svg` | base + `buildRocky('amaze')` | 124K |

### The Beetle

- **Start:** at grid (8, 68) (`BEETLE_FROM`), just behind the ridge at the left edge, so it emerges almost at once. The flights stay on the left, since the chat's frosted panel covers the middle and right of the dome.
- **Probe:** a 6×4 dark body (`h0`) with a lit top edge (`lat`) and a drive flare in `nt3` and `nt2` at its lower-left, trailing end.
- **Trail:** nine copies of a one-pixel trail mark, each on the same path with 0.07 s more delay and 10% less opacity.
- **Flight:** `bt`, 2.6 s with `cubic-bezier(.4,0,.8,.7)` so it speeds up, to `translate(24px, -104px)`: up past Grace's house and off the top. It's hidden at the end.
- **Outside the dome:** Beetles sit in the `{{SKY}}` slot, behind the ribs and clouds, since they fly in Erid's sky, not inside the habitat.
- **Salvo:** four Beetles from the same start, launched 0, 0.5, 1 and 1.5 s in, each with its own keyframes fanning out to `translate(24px,-104px)`, `(44px,-100px)`, `(6px,-108px)` and `(62px,-98px)`. All end off the top; the widest passes behind the house and tree. `beetleOf(cls, at)` builds each with its trail.
- **Return:** `br` flies the same path backwards in 2.6 s, easing out (`cubic-bezier(.2,.4,.5,1)`) so it brakes, drive flare first, and is hidden once it sinks behind the ridge.

## The overlay slot

Every scene has an empty `<g class="ov"></g>` after the swash and before Rocky. The mod replaces it at render time with its live layers from `hooks/overlay.ts`, and appends their CSS before `</style>`:

- **Haze:** six full-width bands (rows −27 to 161) in `#e2ddc8` by day and `#4a6670` by night. The top band's opacity is 0.14 to 0.62 for levels 1–5, and each lower band takes a smaller share (down to a quarter at the near beach). Up to ten one-pixel streaks drift 20 px on a 120 s alternating loop. A level change crossfades in 4 s (`steps(8)`); a compaction slides the old layer 48 px right as it fades.
- **Task lamps:** up to 12 markers in the bottom-left corner, clear of the chat's frosted panel: row 126, from x = 8, 7 px apart (the twelfth at x = 85). Each is a 1×5 post (`#7a6650`), a 3×2 head and a 3-pixel shadow. Heads are `#a89c8c` waiting, `#ffcf6b` blinking in hand, `#ffcf6b` steady when done (night: `#6b5d50` and `#ffb24c`). Row 126 stays on screen in windows up to 2:1.
- **One-shots** (a lamp rising, a sparkle, a crossfade) run on a negative `animation-delay` measured from when the state changed, so a redraw mid-way picks them up where they were.
- **Budget:** keep the busiest scene plus the fullest overlay under 131,072 characters; the render drops the lamps, then the haze, if it would pass.

## Adding to the scene

- **New static art:** add it to a grid (`rock`, or a new layer) and encode it with `runsOf` or `mapRuns`. Prefer vector shapes for large flat areas.
- **New palette entry:** add `[name, day, night]` to `PAL`, or leave night out to derive it. Reference it with `c${IDX.name}`.
- **New ambient loop:** a class with `@keyframes`, the same duration in every scene, and an entry in `SYNC`.
- **New one-shot effect:** a new scene variant via `scene({ style, sky, front })`, a new `Stage` in the mod, and a hand-back timer. See [mod-reference.md](mod-reference.md).
- **After every change:** run the generator and check the sizes. Then preview it (see [troubleshooting.md](troubleshooting.md)) and check that `grep -c crispEdges` prints `0`.
