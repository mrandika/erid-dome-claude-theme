# Art direction

The decisions behind the look, so later changes stay consistent.

## Reference and composition

The composition is traced from a frame of the film's ending, 739×415 px scaled to the 1600×900 scene (factor ≈2.166). Reading left to right:

1. **Grace's house** sits top-left on a mossy hill: a charcoal timber cabin topped by a tilted, faceted xenonite-style truss. Stairs are cut down the rock face to the beach.
2. **A bleached, nearly leafless tree** stands just right of the house.
3. **The big strata mass**, jade-green with rust and ochre patches and diagonal folded bands, peaks near x = 650–720.
4. **A crease or valley** around x = 1080 separates it from the arch headland.
5. **The arch** (Durdle Door) is at x ≈ 1330–1420, with bright sky and teal sea showing through.
6. **The sea** is a teal band from x ≈ 700 to the right edge. Its shoreline runs diagonally from (700, 650) to (1600, 730).
7. **The beach** is gravel-brown across the whole foreground.

The subject keeps clear of the screen's middle, where text sits, and its foot, where the message box sits. Rocky stands bottom-right.

## Style choice

Four drafts were made from the same geometry. The user picked **pixel art**.

| Draft | Look | Why not chosen / notes |
|---|---|---|
| A · Cinematic matte | Gradients, displacement-warped strata, film grain | Closest to the film; about 110K |
| B · Eridian low-poly | Shaded triangle facets; the sky as dome panels | About 160K, over the limit |
| C · Retro screenprint | Flat ink layers, halftone, misregistered outline | About 58K |
| **D · Pixel art** ✔ | 240×135 dithered pixels, stepped animation | **Chosen** |

The draft generator lived in the session scratchpad and wasn't kept. Its geometry survives in `scene/gen-pixel.mjs`.

## Pixel-art rules used

- **Grid:** 240×135 pixels, so one pixel is about 6.67 scene units. A vertical pad of 26 rows above and below adds extra sky and beach for windows narrower than 16:9.
- **Limited palette with ordered dithering:** a 4×4 Bayer matrix, at amplitude 13 on the rock, blends between neighbouring palette entries. Lower amplitude means fewer, longer runs and a smaller file.
- **Flat bands with checker seams:** sky and beach are flat colour bands, with a 2-row checkerboard pattern where two bands meet. This is cheap in size and looks dithered.
- **Lighting:** light comes from the upper left. The top edge of the rock is a light rim (`rim`, or `mossL` on the left hill), and the arch has a dark 1-pixel inner edge (`shadow`) to give it thickness.
- **Stepped motion:** animations use `steps()` or `step-end`, so things move a whole pixel at a time. Clouds move one pixel per second.
- **No `crispEdges`:** it freezes desktop backdrops (see [troubleshooting.md](troubleshooting.md)). Edges stay sharp anyway, because every run is drawn with a 1.1-unit stroke over a matching-colour underlay.

## Palettes

### Scene: day / night

The night palette is derived as `nightOf(day)`: hue-shifted cooler and mixed about 70% toward `#0a131a` (60% for sand). Some entries are hand-set: sky, lamps, window, glow, sea, foam, sparkle and light pebbles.

| Group | Day | Night |
|---|---|---|
| Sky bands `sky0…sky4` | `#c4cbca` `#d1d7d5` `#dde1df` `#e7eae7` `#f1f3ef` | `#0c161d` `#0f1b23` `#132129` `#172830` `#1c2f37` |
| Cloud, dome rib | `#fafbf8`, `#b3bcbb` (32% opacity) | `#203640`, `#2a4350` (65%) |
| Dome lamp | hidden (rib colour) | `#ffd99a` |
| Jade rock `jadeD/1/2/L` | `#34514a` `#4f7066` `#6d9686` `#9dbcaa` | `#14242a` `#1b2d32` `#23383c` `#2f4348` |
| Ochre, moss, mossL | `#ad9849` `#8a8a48` `#c4b05c` | `#333929` `#2a3529` `#393f2f` |
| Rust, rustD | `#a9652f` `#7a4824` | `#322a21` `#26221e` |
| Stone, stoneD, shadow, rim | `#8b7765` `#5a4a3d` `#2e2925` `#c9d8cc` | `#2a2f32` `#1e2225` `#13191e` `#3a4b52` |
| House `h0 h1 h2`, lattice | `#221d1a` `#3d342e` `#5d5249`, `#a19a8e` | `#10161a` `#171c21` `#1f2529`, `#30393f` |
| Window, window glow | `#cdb68a`, `#cdb68a` (hidden) | `#ffb24c`, `#ff9f3a` (35%) |
| Tree trunk, leaf, leafD | `#9a9488` `#e4e1d7` `#bdb9ae` | `#2e373d` `#414d56` `#374249` |
| Sand `sand0…4` | `#a6845f` `#8f6d4e` `#785940` `#5e4533` `#4b3729` | `#3e3e38` `#373530` `#2f2d2a` `#262625` `#202021` |
| Pebbles light/dark, wet sand | `#c8aa84` `#3e2e23` `#5f4636` | `#3c3c38` `#1b1d1e` `#262626` |
| Sea `seaL sea1 sea2 sea3` | `#8ccbc2` `#5eaaa3` `#4a9b96` `#3a8682` | `#2d6a6a` `#1f5455` `#184546` `#12393b` |
| Foam, sparkle | `#f4f6f1` `#ffffff` | `#9cc9c6` `#9ff5ea` |

Work mode (Claude is busy) changes three colours: lamps `#f6bd52`, window `#ffcf6b`, glow `#ffa83e` at 50% opacity, pulsing.

### Rocky and his effects

| Name | Day | Night | Use |
|---|---|---|---|
| `rkO` | `#2a1a10` | `#140d08` | outline, vent holes, wave marks |
| `rkD` | `#5c3a24` | `#3a2618` | shadow side, cracks, facet seams |
| `rkM` | `#8b5a37` | `#5e3e28` | body |
| `rkL` | `#b37b4e` | `#7e5638` | lit edges |
| `rkH` | `#d29f70` | `#a17552` | lumpy lit top |
| `rkG` | `#5fc7a1` | `#4fb592` | green mineral flecks |
| `rkB` | `#46281a` | `#2c1910` | leg strap band (reserved) |
| `gls` / `glw` | `#e6f5f2` / `#ffffff` | `#a9dcd5` / `#d9fff9` | glass suit shell and seams (45% opacity) / glints |
| `bub` | `#f4f6f1` | `#bfe3dd` | chord bubbles, the AMAZE! board |
| `nt1 nt2 nt3` | `#2f8f88` `#b8432f` `#b07a2a` | `#7fe0d8` `#ff8a6a` `#ffc76b` | chord notes (teal, Petrova red, amber); AMAZE! text uses `nt2`; the Beetle's drive uses `nt3`/`nt2` |

### App colours (`hooks/look.ts`, via `makeColors`)

| Anchor | Light (dome by day) | Dark (dome at night) |
|---|---|---|
| surface-0 / 1 / 2 / 3 | `#dde2df` `#e6eae7` `#f1f3f0` `#f1f3f0` | `#0f181d` `#152127` `#1a2930` `#1f3038` |
| text primary / secondary / muted | `#1c2724` `#36443e` `#4d5c55` | `#e6eeea` `#c0cec8` `#9aada6` |

| Role | Colour | Meaning |
|---|---|---|
| accent | `#2f8f88` | Erid sea teal |
| danger | `#b8432f` | Petrova-line red |
| success | `#4f8a5e` | jade strata |
| warning | `#b07a2a` | rust and ochre rock |
| pro | `#7a5ca0` | Astrophage violet |

`makeColors` reports no "Desktop won't paint" problem. The remaining contrast notes, on some light-mode borders and git tags, are under the design system's own bar but still paint.

## Rocky's design

These rules came from the user's references, the last of which were a 3D model sheet and two figure photos.

- **Front view.** Eridians have no front, so the same sprite walks toward or away from the viewer.
- **Torso:** an "acorn" shape, wide and lumpy on top, tapering to a dark opening underneath. It has a crack down the front, facet seams and green flecks.
- **Limbs:** an upper slab from the shoulder runs **out and slightly down** to a knee about level with the torso, then a tapered lower slab drops **straight down** to the foot. The back limbs are drawn darker and attached slightly higher, and the fifth hangs under the torso.
- **Arm poses:** a raised limb is slimmer (2 px upper, about 1 px forearm). The elbow swings out to the side and the three fingers are spread. A thick, vertical arm read as a llama or camel neck.
- **Glass suit:** a one-pixel pale shell outside the outline, with faint diagonal facet seams and a few white glints, all at 45% opacity.
- **Size:** about 34×26 scene pixels, standing with his feet at grid (214, 128).
