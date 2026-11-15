# Rocky reference (`scene/rocky.mjs`)

Rocky is drawn as pixel art. The module exports `ROCKY_PAL` (13 palette entries, appended to the scene palette) and `buildRocky(IDX, mode, at = [214, 128])`. That returns `{ markup, css }` for the `ask`, `leave` or `amaze` mode. `at` is where his feet stand, in grid pixels.

## Sprite model

Local coordinates: 1 unit = 1 scene pixel, feet on y = 0, body centred on x = 0, and up is −y.

```
sprite(limbs, decor) → { col, outline, glass, glint }   (Maps of "x,y" → palette name)
```

1. **Back limbs** (`back: true`) are drawn first as material `b`, so they shade darker. Front material always wins over back.
2. **Torso:** an acorn polygon from (−6, −23) to (8, −18), tapering to (1, −8).
3. **Front limbs.** Each limb `L(shoulder, knee, foot, opts)` is:
   - **Upper slab:** a 3 px square brush from the shoulder to the knee (2 px for an arm).
   - **Lower slab:** a tapered quad, ±2.2 wide at the knee and ±1.1 at the foot (±1 and ±0.6 for an arm).
   - **Hand** (`hand: true`): three 1 px fingers spread up and out from the foot point.
4. **Shading:**
   - **Lit (`rkL`):** a pixel with an empty neighbour above or to the left (`rkM` for back material).
   - **Shadowed (`rkD`):** an empty neighbour below or to the right (`rkO` for back material).
   - **Body (`rkM`):** everything else.
5. **Details:** a lumpy lit top (`rkH`), a crack down the front at x = 1–2, facet seams at y = −19/−18, the dark opening underneath (`rkO`), and green flecks from `DECOR`.
6. **Outline:** every empty 4-neighbour of the body becomes `rkO`.
7. **Glass suit:** every empty neighbour of body plus outline above the feet becomes `gls`. Seams fall where `(x+y) % 8 == 0` or `(x−y) % 11 == 0`, plus four white `glw` glints. It's drawn in `<g class="gl">` at 45% opacity.

## Poses

| Pose | Limbs (shoulder → knee → foot) | Used in |
|---|---|---|
| `STAND` | BL (−4,−18)→(−10,−17)→(−10,−3) back · BR (5,−18)→(11,−17)→(11,−3) back · C5 (0,−12)→(0,−10)→(0,−2) back · FL (−6,−15)→(−14,−13)→(−15,0) · FR (7,−15)→(15,−13)→(16,0) | All modes |
| `W1` | Like STAND, but BR's knee is at −18 with the foot raised to −6, and FL's knee is at −15 with the foot raised to −4 | Walk |
| `W3` | Like STAND, but BL's foot is raised to −6 and FR's to −4 | Walk |
| `TALK(hand)` | FR, the back limbs and C5 planted. FL becomes an arm: (−6,−15)→(−15,−15)→hand at (−16,−25) or (−19,−24) | Ask: wave |
| `LIFT` | FR raised: knee (17,−19), foot (20,−10) | Ask: stomp |
| `JAZZ(l, r)` | Both front limbs are arms; hands at (−17,−26)/(18,−26), then (−19,−24)/(20,−24) | Amaze |

The gait is four beats: W1, STAND, W3, STAND, with diagonal pairs lifting in turn. The body bobs down 1 px on every second beat (`rbw`).

## Frame sharing

All the poses for one mode are rendered as sprites. Pixels identical across every pose go into a **common** layer, drawn once, and each pose keeps only its **differences** in its own group. Pose groups are switched with `opacity` keyframes and `step-end` timing. This roughly halves Rocky's size.

## Timelines

All times are seconds from when the scene loads. `FAR` = `translate(40px, -14px) scale(.72)` is the off-screen right starting point, so he appears to walk in from beyond the arch.

### `ask`: Claude is asking you something

| Time | What happens | Classes |
|---|---|---|
| 0–2.4 | Walks from `FAR` to his spot. Gait at 0.4 s per cycle, 6 cycles | `rw`, `rw1`/`rw3`/`rst`, `rbw` |
| 2.4–4.2 | Waves once: the arm alternates between two hand positions every 0.45 s, with sound marks beside the hand | `rtk`, `rt1`/`rt2` |
| from 4.2 | A loop of 8.5 s: **standby** for 5.8 s, standing and bobbing (`rbt`, 1.8 s) while chord bubbles rise | `rst` (`rsl`), `rch`, `bb0–2` |
| | …then **3 stomps** at 0.9 s each: leg up for 0.4 s, down for 0.5 s; no bubbles | `rlf`, `rst` |

The chord bubbles are three bubbles (teal, red and amber chords) rising 24 px over 3.6 s in `steps(24)`, staggered by 1.2 s. The `rch` group hides them during the stomps.

### `leave`: the question is answered or dropped

| Time | What happens |
|---|---|
| 0–2.4 | Walks from his spot back to `FAR` using the same gait, and stays off-screen (`forwards`) |

The mod switches to the next stage 2.8 s later.

### `amaze`: a long task finished

| Time | What happens |
|---|---|
| 0–1.6 | Quick walk in from `FAR`, 4 gait cycles |
| 1.6–4.8 | Jazz hands: `rj1`/`rj2` alternate every 0.2 s. The **AMAZE!** board (`rsg`) bobs 1 px every 0.4 s, and three bubbles pop in turn |
| 4.8–6.4 | Walks back out to `FAR` |

The total is 6.4 s; the mod hands back after 6.7 s.

The board is a `bub`-colour rounded box with a speech-tail toward Rocky, with **AMAZE!** in red (`nt2`) in a 5-row pixel font (`GLYPH` holds the letters A, M, Z, E and !). `sign(text)` returns the text's pixel runs and width, so other words from those letters work too.

## Changing Rocky

- **Proportions:** edit the torso polygon and the limb constants. Keep the lower slabs dropping straight down.
- **New pose:** add a limb list, add it to `poses` for the mode, and give it a group and keyframes. Each pose costs about 1.5–3K, and the asking scene is about 5K under the limit.
- **Speed:** `WALK`, `STEP`, `WAVE`, `STANDBY`, `STOMP` and `LIFT_S` in the `ask` branch; `IN` and `PARTY` in `amaze`. If you change `WALK` in `leave`, also change `WALK_OUT_MS` in `hooks/register.tsx`, and likewise `AMAZE_MS` for the amaze timings.
- **Position:** the `at` argument. Bottom-right was chosen to stay clear of the text column and the message box.
