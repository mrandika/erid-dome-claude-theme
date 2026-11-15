# Changelog

How the theme got here, built over one session on 2026-11-15.

**0.1.0: first theme**
- Researched the film, Erid, Rocky and Durdle Door ([research.md](research.md)).
- Drafted four art styles (matte, low-poly, screenprint, pixel); the user chose pixel art.
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
- Redrew him from the user's model sheet: an acorn torso, with slab legs out and straight down rather than arched.
- Gave him a four-beat gait and a faster walk-in that starts as soon as the question begins streaming (`turn.step`).
- Routine: wave once, stand by with chord bubbles, three stomps if unanswered, repeat. No dust or jolt.
- He walks back out once the question is answered or dropped (a third scene, plus a timer).

**Reactions**
- Work mode: dome lamps on and Grace's window glowing while Claude works.
- A Beetle launch when a subagent starts.
- Rocky's "AMAZE!" jazz hands after turns of 60 s or more. The threshold went to 20 s and back to 60 s at the user's request.
- `/erid launch | ask | amaze | working` replays a reaction.
- A new turn no longer cuts off a playing Beetle or AMAZE!.

**Seamless swaps**
- Ambient loops share fixed periods across scenes, and the mod offsets them by the clock (`SYNC`).
- Work mode's faster sea was dropped so the sea lines up across scenes.

**Packaging**
- Moved the mod into this project folder as the single source, with a local marketplace manifest.
- Wrote these docs.
