# Changelog

How the theme got here, built over one session on 2026-11-15.

**0.1.0: first theme**
- Researched the film, Erid, Rocky and Durdle Door ([research.md](research.md)).
- Drafted four art styles (matte, low-poly, screenprint, pixel) and chose pixel art.
- Built a 240×135 pixel Erid beach with an animated swash, sparkle, clouds and a swaying tree, plus a night palette for dark mode.
- Added app colours via `makeColors`: Erid teal, Petrova red, jade, rust and Astrophage violet.

**Animation freeze fixed**
- Removed the aspect-ratio media queries and the reduced-motion rule. That didn't help.
- Bisected with probe backdrops: `shape-rendering="crispEdges"` freezes desktop backdrops.
- Dropped it, and hid anti-alias seams with a 1.1-unit stroke and a per-row underlay.

**Framing**
- Anchored the scene left (`xMinYMid slice`) and added 26 rows of sky and beach, so windows down to 4:3 show the arch.

**0.2.0: Rocky**
- Added pixel Rocky in his faceted glass suit, walking in while Claude asks a question.
- Redrew him from a model sheet: an acorn torso, with slab legs out and straight down rather than arched.
- Gave him a four-beat gait and a faster walk-in that starts as soon as the question begins streaming (`turn.step`).
- Routine: wave once, stand by with chord bubbles, three stomps if unanswered, repeat. No dust or jolt.
- He walks back out once the question is answered or dropped (a third scene, plus a timer).

**Reactions**
- Work mode: dome lamps on and Grace's window glowing while Claude works.
- A Beetle launch when a subagent starts.
- Rocky's "AMAZE!" jazz hands after turns of 60 s or more. The threshold was tried at 20 s and went back to 60 s.
- `/erid launch | ask | amaze | working` replays a reaction.
- A new turn no longer cuts off a playing Beetle or AMAZE!.

**Seamless swaps**
- Ambient loops share fixed periods across scenes, and the mod offsets them by the clock (`SYNC`).
- Work mode's faster sea was dropped so the sea lines up across scenes.

**Packaging**
- Moved the mod into this project folder as the single source, with a local marketplace manifest.
- Wrote these docs.

**0.3.0: more of Claude on the beach**
- Permission prompts: Rocky walks up holding an "ALLOW, QUESTION?" sign (`classic.PermissionRequest`, or the `permission_prompt` notification) and walks out when the waiting tool finishes, the prompt is refused or the turn ends.
- Subagents finishing: the Beetle comes home, dropping back down the dome behind the hill (`turn.complete` for a subagent this load launched).
- Tasks: a marker lamp on the sand per task, from the desktop app's task list (`update_plan`, `wrap_up`) or Claude Code's task tools (`classic.TaskCreated`, `classic.TaskCompleted`). New lamps rise out of the sand; a lamp sparkles as it lights.
- Context haze: translucent bands thicken over the dome in five steps as the context fills (`session.measure`, and after each main-loop tool call); a compaction blows the old haze out to the right as it fades.
- The haze and the lamps are live layers (`hooks/overlay.ts`) drawn into whichever scene is up, at a new `<g class="ov">` slot, so they cost no extra scenes. The render drops them if a scene would pass 131,072 characters; the worst case (ask, mid-fade, 12 lamps) is 130,026.
- A first dithered haze read as a screen door at level 3; replaced with flat bands, matching the sky.
- `/erid return | permit | haze 0-5 | tasks`, and the first tests (`hooks/erid.test.ts`, `hooks/backdrop.test.tsx`).
- Rocky's permit sign now reads "ALLOW, / QUESTION?" on two lines (he ends a question with "question?"); new pixel glyphs L, W, Q, U, S, T, I, N and a comma, and a sign text colour (`sgn`) that stays dark on the pale board at night.
- README previews for permit, return, tasks and compaction. `scene/render-previews.mjs` now draws the live layers into a scene for a preview (`withLayers`), which needs a Node that runs `.ts` files (23.6 or later).
- Task lamps moved to the bottom-left corner of the sand (the middle sits under the chat's frosted panel), with lighter posts and heads to read on the dark near sand.
- Fixed the permit scene losing Rocky's sign and limbs after the walk-in: a 0.01 s `step-end` reveal with only a `to` keyframe ended back at opacity 0 in Chrome. Its keyframes now hold 1 at both ends (`from,to`).
- Fixed a blank backdrop: the render hook's haze variable was named `h`, hiding the JSX factory, so the hook threw and was skipped. A render test now catches it.

**0.4.0: the Beetles fly home**
- A successful `git push` sends a salvo: four Beetles (John, Paul, George, Ringo) launch half a second apart and fan out across Erid's sky, as Grace sent his data home.
- Beetles now fly outside the dome: drawn behind its ribs and clouds at 80% opacity, seen through the glass. Flying them inside an enclosed habitat didn't make sense. The launch and return previews were re-rendered.
- Every Beetle now launches from behind the ridge at the left edge and climbs out of the top, past Grace's house: the upper right, where they used to fly, sits under the chat panel.
- `/erid salvo`, a push test, and a salvo preview.

**Softer frosting**
- Panel glass raised from blur 12 / opacity 0.62 to blur 28 / opacity 0.55. At 12 the pixel cliff, house and arch showed through as blocky smears; at 28 they melt into a colour wash and a little more of the scene tint reaches the panels.
- Opacity then lowered to 0.42: the light-mode panel (a pale grey) over the dark sand lifted it to a milky white haze at the bottom of the chat. A tint can't fix it, since the one tint applies in both modes and the mod can't tell which is showing.
