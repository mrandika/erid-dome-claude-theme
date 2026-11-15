# Troubleshooting and testing

## The backdrop doesn't animate (frozen)

The desktop app (Claude Code 2.1.325, Nov 2026) draws a backdrop `Svg` in a sandboxed frame. Some constructs make it stop **every** animation in the scene, even though the same SVG animates fine in a browser.

| Construct | Status |
|---|---|
| `shape-rendering="crispEdges"` | **Confirmed trigger** (this project, by probes) |
| Aspect-ratio `@media` queries (`min-/max-aspect-ratio`) | Suspected; removed together with the two below in the hail-mary mod |
| `transform-box: view-box` | Suspected (hail-mary) |
| `#id` selectors in CSS | Suspected (hail-mary) |

Proven safe in the same probes:
- a source of about 115K characters;
- `<pattern>` fills, `clipPath`, `!important`, `steps()` and `step-end`;
- a `prefers-color-scheme` `@media` block containing `@keyframes`;
- a `transform="scale()"` group;
- animating classes with the default transform origin inside a `translate()` group;
- the same keyframes listed twice in one `animation:` declaration (`rw1 …, rw1 … 4.8s …`);
- animating `visibility`.

Quick check, which should print `0` for each scene:

```bash
grep -cE 'crispEdges|aspect-ratio|view-box|#[a-zA-Z][a-zA-Z0-9_-]*[ ,]*\{' scene/erid-dome*.svg
```

**First rule out the app's own no-animation mode.** The app deliberately freezes backdrops when its background-animation setting is off, when the system asks for reduced motion, or when there's no GPU compositing. If a known-good scene, such as hail-mary's, is also still, it's that and not the scene.

### How the crispEdges trigger was found

1. Build probe backdrops with `scene/build-probes.mjs`. Each draws an orange disc that slides back and forth plus a blinking bar, so "moving or frozen" is obvious.
2. Wire them into a temporary command that calls `$.theme.set({ backdrop: { scene: 'probe-<name>' } })`, with the Backdrop hook drawing `PROBES[name]`.
3. Run them one at a time in the app and note whether each moves or freezes:

| Probe | What it adds | Result |
|---|---|---|
| `big` | Disc alone (control) | moved |
| `big-css` | Disc + the whole scene stylesheet | moved |
| `big-size` | Disc + 115K of invisible padding | moved |
| `big-markup` | The whole scene + disc | **frozen** |
| `big-nopat` | Scene without patterns + disc | frozen |
| `big-half` | Scene with half the rock paths + disc | frozen |
| `m-noclip` | Scene without the clip path + disc | frozen |
| `m-nocrisp` | **Scene without `crispEdges`** + disc | **moved** |

The technique: start from a known-good control, then add or remove one construct at a time. Only someone looking at the app can do it, since the scene can't be watched from code.

## Things jump when the scene changes

Every stage change loads a new SVG, which restarts its CSS. Ambient loops are re-aligned with `SYNC` (see [scene-reference.md](scene-reference.md)). If something still jumps:
- a loop isn't listed in `SYNC`;
- it runs at a different speed in some scene; or
- its period in `SYNC` is wrong (alternating loops count both directions).

A brief flash while the frame swaps comes from the app, and the scene can't prevent it.

## Rocky or AMAZE! doesn't show

| Symptom | Cause |
|---|---|
| No AMAZE! after a task | The turn was shorter than `LONG_TURN_MS` (60 s), was interrupted, or ended in an error. Replay it with `/erid amaze` |
| `/erid amaze` played nothing | (Fixed) A new Claude turn started right after the command and switched to `working`. Now `turn.start` only changes `idle` |
| Rocky never appears on a phone | Windows narrower than 4:3 crop the right side, where he stands |
| Rocky appears late | The swap happens when the `AskUserQuestion` chunk streams, but the app may take a moment to load the new frame |

## Previewing scenes in a browser

The in-app browser can't open `file://` pages for inspection, so serve the folder over HTTP:

```bash
python3 -m http.server 8779 --directory scene
```

Then open `http://localhost:8779/erid-dome-ask.svg`.

- **Phase and timing checks:** embed the SVG in an `<iframe>` on a small HTML page. From the page you can read the frame's `contentDocument` and `getComputedStyle(el).transform` or `.animationDelay`.
- **Use a query string, not `#hash`, to pick the file.** Changing only the hash doesn't reload the page, so you keep seeing the old file.
- **Close-ups:** copy the SVG with its `viewBox` swapped to a region, for example `viewBox="1240 520 360 360" preserveAspectRatio="xMidYMid meet"` around Rocky.
- **Dark mode:** emulate `prefers-color-scheme: dark` in the browser.
- **One-shot animations** (Beetle, walks) finish before a slow page loads. Change `both` or `forwards` to `infinite` in a debug copy to catch them.

## Size over the limit

Each scene must be at most 131,072 characters. To save space:
- lower the rock dither amplitude in `gen-pixel.mjs` (`bay(i, j) * 13`);
- drop pebbles;
- share more of Rocky's pixels across poses, or cut a pose;
- keep large flat areas as vector rects rather than rasters.

The asking scene, at about 126K, is the one to watch.

## Validator messages

| Message | Fix |
|---|---|
| `no component is named Backdrop, so it never runs` | The validator is an older CLI; use the app's 2.1.325 binary ([mod-reference.md](mod-reference.md)) |
| `a contract exports types and nothing else` | Remove `export {}` from `types/index.d.ts`; export a type instead |
| `$ is passed to "<fn>", which is not a function declared at the top of this file` | Move the helper to the top level |
| `gating hook without .catch` | Add `.catch(($, e, next) => next(e))` |
| README has no install line | Only matters for the public plugin directory |
