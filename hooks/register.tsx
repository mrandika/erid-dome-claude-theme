import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, ThemeSetArgs, Timer } from 'claude-code'

import { COLOR_PROBLEMS, COLORS } from './look'
import { SCENE, SCENE_AMAZE, SCENE_ASK, SCENE_LAUNCH, SCENE_LEAVE, SCENE_WORK, SYNC } from './scene'
import type { Stage } from '../types'

// Grace's dome on Erid: the Eridian-built beach under a milky dome sky, his
// faceted house on the hill above the strata, the arch to the right. The beach
// follows what Claude is doing:
//   working  – the dome lamps come on, Grace's window glows, the sea livens up
//   launch   – a subagent starts: a Beetle probe streaks across the dome
//   asking   – Rocky walks up in his glass suit, waves, sings chords, stomps if you take a while
//   leaving  – the question is answered or dropped: he walks back out
//   amaze    – a long task finished: Rocky pops in for jazz hands and an "AMAZE!"
const SCENE_NAME = 'erid-dome'
// High blur melts the pixel edges into a colour wash. Opacity stays low: the light
// panel over the dark sand reads as a milky white haze above about 0.5.
const GLASS = { blur: 28, opacity: 0.42 }
const WALK_OUT_MS = 2800 // the leave scene's walk (2.4s) plus a little slack
const LAUNCH_MS = 2900 // the Beetle's flight (2.6s) plus a little slack
const AMAZE_MS = 6700 // pop in, celebrate, walk out (6.4s) plus a little slack
const LONG_TURN_MS = 60_000 // a turn at least this long earns an "AMAZE!"

const SCENES: Record<Stage, string> = {
  idle: SCENE,
  working: SCENE_WORK,
  launch: SCENE_LAUNCH,
  asking: SCENE_ASK,
  leaving: SCENE_LEAVE,
  amaze: SCENE_AMAZE,
}
const ALTS: Record<Stage, string> = {
  idle: "Pixel-art beach on Erid inside Grace's dome: a faceted house and pale tree on a jade-and-rust cliff, a rock arch, and waves washing up the sand",
  working: "The Erid beach with the dome's lamps lit and Grace's window glowing while Claude works",
  launch: 'A Beetle probe streaks across the dome sky, its drive trailing amber',
  asking: 'Rocky, in his faceted glass suit, walks up the Erid beach, waves and sings in chords while Claude waits for your answer',
  leaving: 'Rocky walks back off along the Erid beach',
  amaze: 'Rocky pops in with jazz hands under an "AMAZE!" sign',
}

const LOOK: ThemeSetArgs = {
  colors: COLORS,
  backdrop: { scene: SCENE_NAME, glass: GLASS },
}

const stage = atom({ plugin: 'erid-dome', key: 'stage' } as const, 'idle' as Stage)

// The scenes must not use shape-rendering="crispEdges": the desktop app then
// stops every animation in the backdrop (found by bisecting, Nov 2026).

let isBusy = false // a main-loop turn is running
let pending: Timer | undefined // the one scheduled hand-back from a passing stage

// leave a passing stage for whatever fits now, unless something else took over meanwhile
function settle($: EngineInterface, ms: number, from: Stage) {
  pending?.cancel()
  pending = $.clock.after(ms, () => {
    void update($, stage, s => (s === from ? (isBusy ? 'working' : 'idle') : s))
  })
}

async function go($: EngineInterface, to: Stage) {
  pending?.cancel()
  pending = undefined
  await update($, stage, () => to)
}

async function arrive($: EngineInterface) {
  if ((await read($, stage)) !== 'asking') {
    await go($, 'asking')
  }
}

// only Rocky on the beach walks out
async function leave($: EngineInterface) {
  if ((await read($, stage)) !== 'asking') {
    return
  }
  await go($, 'leaving')
  settle($, WALK_OUT_MS, 'leaving')
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const unpainted = COLOR_PROBLEMS.find(line => line.startsWith("Desktop won't paint"))

    if (unpainted !== undefined) {
      $.ui.toast(unpainted)
    }
    isBusy = false
    await go($, 'idle')
    const set = await $.theme.set(LOOK)

    if (!set.isDrawn) {
      $.ui.status(set.reason)
    }
    await $.command.register({
      name: 'erid',
      description: "Put the Erid (Grace's dome) theme back on, or replay one of its reactions",
      argumentHint: '[launch | ask | amaze | working]',
    })

    return next(e)
  })

  // `/erid` puts the theme back on; `/erid launch|ask|amaze|working` replays a reaction to look at it
  on('command.run', { command: 'erid' }, async ($, e) => {
    const set = await $.theme.set(LOOK)

    if (!set.isDrawn) {
      return { text: `The theme is not drawn here: ${set.reason}` }
    }
    const want = e.args.trim()

    if (want === 'launch' || want === 'amaze') {
      await go($, want)
      settle($, want === 'launch' ? LAUNCH_MS : AMAZE_MS, want)

      return { text: `Erid: playing "${want}".` }
    }
    if (want === 'ask') {
      // Rocky waits on the beach for a short while, then walks out
      await go($, 'asking')
      pending = $.clock.after(16_000, () => {
        void leave($)
      })

      return { text: 'Erid: Rocky is on the beach for about 16 seconds.' }
    }
    if (want === 'working') {
      await go($, 'working')
      settle($, 8_000, 'working')

      return { text: 'Erid: dome lamps on for 8 seconds.' }
    }

    return { text: want === '' ? 'Erid theme is back on.' : 'Usage: /erid [launch | ask | amaze | working]' }
  })

  // Claude starts a turn of the main conversation: the dome lights up
  on('turn.start', async ($, e, next) => {
    if (e.agentId === undefined) {
      isBusy = true
      const now = await read($, stage)

      // a passing stage (Rocky, a Beetle) plays out; its hand-back then picks 'working'
      if (now === 'idle') {
        await go($, 'working')
      }
    }

    return next(e)
  })

  // Rocky sets off the moment Claude starts writing a question, before the dialog opens:
  // the model's response streams through turn.step, and a question's tool chunk comes first.
  on('turn.step', async function* ($, e, next) {
    for await (const chunk of next(e)) {
      if (chunk.kind === 'tool' && chunk.name === 'AskUserQuestion') {
        void arrive($)
      }
      yield chunk
    }
  })

  // The question tool runs until you answer or dismiss it; then he walks back out.
  on('tool.call', { tool: 'AskUserQuestion' }, async ($, e, next) => {
    await arrive($)
    try {
      return await next(e)
    } finally {
      await leave($)
    }
  }).catch(($, e, next) => next(e)) // if the backdrop state fails, the question still runs

  // a subagent sets off: a Beetle launches across the dome
  on('agent.spawn', async ($, e, next) => {
    const now = await read($, stage)

    if (now === 'working' || now === 'launch' || now === 'idle') {
      await go($, 'launch')
      settle($, LAUNCH_MS, 'launch')
    }

    return next(e)
  })

  // the main turn ends: Rocky leaves if he was waiting, a long finished task gets an "AMAZE!",
  // otherwise the dome lamps go back off
  on('turn.complete', async ($, e, next) => {
    if (e.agentId !== undefined) {
      return next(e)
    }
    isBusy = false
    const now = await read($, stage)

    const isLong = !e.isAborted && e.reason === 'answer' && e.durationMs >= LONG_TURN_MS

    if (now === 'asking') {
      await leave($)
    } else if (now === 'leaving') {
      // his walk-out finishes, then the plain beach
    } else if (isLong) {
      await go($, 'amaze')
      settle($, AMAZE_MS, 'amaze')
    } else if (now === 'working') {
      await go($, 'idle')
    } // a Beetle or an "AMAZE!" still playing hands back to the plain beach when it ends

    return next(e)
  })

  on('ui.render', { component: 'Backdrop' }, async ($, e, next) => {
    if ((e.surface !== 'desktop' && e.surface !== 'mobile') || e.props.scene !== SCENE_NAME) {
      return next(e)
    }
    const { Svg } = $.ui.resolve(e)
    const now = await read($, stage)
    // every scene starts its clouds, waves, sparkle and lamps where the shared clock says,
    // so swapping scenes doesn't snap them back to the start (Rocky's own routines still start fresh)
    const t = (await $.clock.now()) / 1000
    const sync = SYNC.map(([sel, period, offset = 0]) => `${sel}{animation-delay:-${((t + offset) % period).toFixed(2)}s}`).join('')

    return <Svg source={SCENES[now].replace('</style>', `${sync}</style>`)} alt={ALTS[now]} isInteractive />
  })
}
