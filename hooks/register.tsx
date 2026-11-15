import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, ThemeSetArgs, Timer } from 'claude-code'

import { COLOR_PROBLEMS, COLORS } from './look'
import { hazeLevel, hazeOverlay, MAX_MARKS, OVERLAY_SLOT, overlayAlt, taskOverlay } from './overlay'
import { SCENE, SCENE_AMAZE, SCENE_ASK, SCENE_LAUNCH, SCENE_LEAVE, SCENE_PERMIT, SCENE_RETURN, SCENE_SALVO, SCENE_WORK, SYNC } from './scene'
import type { Haze, Mark, Stage, Tasks } from '../types'

// Grace's dome on Erid: the Eridian-built beach under a milky dome sky, his
// faceted house on the hill above the strata, the arch to the right. The beach
// follows what Claude is doing:
//   working  – the dome lamps come on, Grace's window glows, the sea livens up
//   launch   – a subagent starts: a Beetle probe streaks across the dome
//   return   – a subagent finishes: the Beetle drops back home behind the hill
//   salvo    – Claude pushes its work: four Beetles launch in turn and fan out, carrying it home
//   asking   – Rocky walks up in his glass suit, waves, sings chords, stomps if you take a while
//   permit   – a permission prompt waits: Rocky walks up holding an "ALLOW, QUESTION?" sign
//   leaving  – the question or prompt is answered or dropped: he walks back out
//   amaze    – a long task finished: Rocky pops in for jazz hands and an "AMAZE!"
// and two live layers, over whichever of those is up:
//   haze     – the dome thickens as the context window fills; a compaction blows it away
//   tasks    – a marker lamp on the sand per task in Claude's list, lit as each is done
const SCENE_NAME = 'erid-dome'
// High blur melts the pixel edges into a colour wash. Opacity stays low: the light
// panel over the dark sand reads as a milky white haze above about 0.5.
const GLASS = { blur: 28, opacity: 0.42 }
const WALK_OUT_MS = 2800 // the leave scene's walk (2.4s) plus a little slack
const LAUNCH_MS = 2900 // the Beetle's flight (2.6s) plus a little slack
const RETURN_MS = 2900 // and its flight home
const SALVO_MS = 4400 // four Beetles half a second apart (the last leaves at 1.5s, flies 2.6s) plus a little slack
const AMAZE_MS = 6700 // pop in, celebrate, walk out (6.4s) plus a little slack
const LONG_TURN_MS = 60_000 // a turn at least this long earns an "AMAZE!"
const CLEAR_MARKS_MS = 12_000 // once every task is done and the turn ends, the lamps stay this long
const SVG_LIMIT = 131_072 // the most an Svg source may hold

const SCENES: Record<Stage, string> = {
  idle: SCENE,
  working: SCENE_WORK,
  launch: SCENE_LAUNCH,
  return: SCENE_RETURN,
  salvo: SCENE_SALVO,
  asking: SCENE_ASK,
  permit: SCENE_PERMIT,
  leaving: SCENE_LEAVE,
  amaze: SCENE_AMAZE,
}
const ALTS: Record<Stage, string> = {
  idle: "Pixel-art beach on Erid inside Grace's dome: a faceted house and pale tree on a jade-and-rust cliff, a rock arch, and waves washing up the sand",
  working: "The Erid beach with the dome's lamps lit and Grace's window glowing while Claude works",
  launch: 'A Beetle probe streaks across the dome sky, its drive trailing amber',
  return: 'A Beetle probe drops back down the dome sky and lands behind the hill',
  salvo: 'Four Beetle probes launch one after another and fan out across the dome sky, carrying the work home',
  asking: 'Rocky, in his faceted glass suit, walks up the Erid beach, waves and sings in chords while Claude waits for your answer',
  permit: 'Rocky walks up the Erid beach holding up an "ALLOW, QUESTION?" sign while Claude waits for your permission',
  leaving: 'Rocky walks back off along the Erid beach',
  amaze: 'Rocky pops in with jazz hands under an "AMAZE!" sign',
}

const LOOK: ThemeSetArgs = {
  colors: COLORS,
  backdrop: { scene: SCENE_NAME, glass: GLASS },
}

const CLEAR_HAZE: Haze = { level: 0, from: 0, at: 0, isClearing: false }
const NO_TASKS: Tasks = { marks: [], at: 0, added: [], lit: [] }
const stage = atom({ plugin: 'erid-dome', key: 'stage' } as const, 'idle' as Stage)
const haze = atom({ plugin: 'erid-dome', key: 'haze' } as const, CLEAR_HAZE)
const tasks = atom({ plugin: 'erid-dome', key: 'tasks' } as const, NO_TASKS)

// The scenes must not use shape-rendering="crispEdges": the desktop app then
// stops every animation in the backdrop (found by bisecting, Nov 2026).

let isBusy = false // a main-loop turn is running
let pending: Timer | undefined // the one scheduled hand-back from a passing stage
let clearing: Timer | undefined // the one scheduled clearing of the task lamps
let permitTool: string | undefined // the tool a permission prompt is waiting on; undefined: any
const subagents = new Set<string>() // subagents set off this load, so their finish brings a Beetle home

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

// Rocky comes up to wait: with chords for a question, with his sign for a permission prompt
async function arrive($: EngineInterface, to: 'asking' | 'permit') {
  if ((await read($, stage)) !== to) {
    await go($, to)
  }
}

// only Rocky on the beach walks out
async function leave($: EngineInterface) {
  const now = await read($, stage)

  if (now !== 'asking' && now !== 'permit') {
    return
  }
  permitTool = undefined
  await go($, 'leaving')
  settle($, WALK_OUT_MS, 'leaving')
}

// Beetles fly (out for a new subagent, home for a finished one, a salvo for a push) unless Rocky is on the beach
const FLIGHTS = { launch: LAUNCH_MS, return: RETURN_MS, salvo: SALVO_MS } as const

async function fly($: EngineInterface, to: keyof typeof FLIGHTS) {
  const now = await read($, stage)

  if (now === 'working' || now === 'idle' || now in FLIGHTS) {
    await go($, to)
    settle($, FLIGHTS[to], to)
  }
}

// a shell command that pushes with git (`git push`, `git -C dir push --tags`, after `&&`), not one that only mentions it
const PUSH = /(^|[;&|(]\s*)git(\s+-[cC]\s+\S+|\s+--?[\w-]+(=\S+)?)*\s+push\b/

// ---------- haze

async function setHaze($: EngineInterface, level: number, isClearing = false) {
  const now = await $.clock.now()

  await update($, haze, h => (h.level === level && !isClearing ? h : { level, from: h.level, at: now, isClearing }))
}

// the context window's fill as the last response reported it
async function measureHaze($: EngineInterface) {
  const { context } = await $.session.usage()

  if (context.percent !== undefined) {
    await setHaze($, hazeLevel(context.percent))
  }
}

// ---------- task lamps

// replace the marks, noting which are new (they rise) and which just lit (they sparkle)
async function setMarks($: EngineInterface, next: (marks: Mark[]) => Mark[]) {
  const now = await $.clock.now()

  clearing?.cancel()
  clearing = undefined
  await update($, tasks, t => {
    const marks = next(t.marks).slice(0, MAX_MARKS)
    const before = new Map(t.marks.map(m => [m.id, m.state]))
    const added = marks.filter(m => !before.has(m.id)).map(m => m.id)
    const lit = marks.filter(m => m.state === 'done' && before.has(m.id) && before.get(m.id) !== 'done').map(m => m.id)

    return added.length === 0 && lit.length === 0 && marks.length === t.marks.length && marks.every((m, k) => m.state === t.marks[k]?.state)
      ? t
      : { marks, at: now, added, lit }
  })
}

const STATUS: Record<string, Mark['state']> = { pending: 'pending', in_progress: 'active', completed: 'done' }

// the desktop app's task list: update_plan replaces it (`items`), steps it on (`advance`),
// or checks off and starts steps by their 1-based number (`done`, `start`)
function planMarks(marks: Mark[], input: Record<string, unknown>): Mark[] {
  if (Array.isArray(input.items)) {
    return input.items.map((item, k) => ({ id: `p${k}`, state: STATUS[(item as { status?: string }).status ?? ''] ?? 'pending' }))
  }
  let out = marks

  if (input.advance === true) {
    const at = out.findIndex(m => m.state === 'active')
    const nextUp = out.findIndex((m, k) => k > at && m.state === 'pending')

    out = out.map((m, k) => (k === at ? { ...m, state: 'done' } : k === nextUp ? { ...m, state: 'active' } : m))
  }
  if (Array.isArray(input.done)) {
    const done = new Set(input.done.filter((n): n is number => typeof n === 'number').map(n => n - 1))

    out = out.map((m, k) => (done.has(k) ? { ...m, state: 'done' } : m))
  }
  if (typeof input.start === 'number' && input.start >= 1 && input.start <= out.length) {
    const start = input.start - 1

    out = out.map((m, k) => (k === start ? { ...m, state: 'active' } : m.state === 'active' ? { ...m, state: 'pending' } : m))
  }

  return out
}

const allDone = (t: Tasks) => t.marks.length > 0 && t.marks.every(m => m.state === 'done')

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const unpainted = COLOR_PROBLEMS.find(line => line.startsWith("Desktop won't paint"))

    if (unpainted !== undefined) {
      $.ui.toast(unpainted)
    }
    isBusy = false
    await go($, 'idle')
    // a resumed session starts as hazy as its context is full, without a fade
    const { context } = await $.session.usage()
    const level = context.percent === undefined ? 0 : hazeLevel(context.percent)

    await update($, haze, () => ({ level, from: level, at: 0, isClearing: false }))
    const set = await $.theme.set(LOOK)

    if (!set.isDrawn) {
      $.ui.status(set.reason)
    }
    await $.command.register({
      name: 'erid',
      description: "Put the Erid (Grace's dome) theme back on, or replay one of its reactions",
      argumentHint: '[launch | return | salvo | ask | permit | amaze | working | haze 0-5 | tasks]',
    })

    return next(e)
  })

  // `/erid` puts the theme back on; the arguments replay a reaction to look at it
  on('command.run', { command: 'erid' }, async ($, e) => {
    const set = await $.theme.set(LOOK)

    if (!set.isDrawn) {
      return { text: `The theme is not drawn here: ${set.reason}` }
    }
    const [want = '', arg] = e.args.trim().split(/\s+/)

    if (want === 'launch' || want === 'return' || want === 'salvo' || want === 'amaze') {
      await go($, want)
      settle($, want === 'amaze' ? AMAZE_MS : FLIGHTS[want], want)

      return { text: `Erid: playing "${want}".` }
    }
    if (want === 'ask' || want === 'permit') {
      // Rocky waits on the beach for a short while, then walks out
      await go($, want === 'ask' ? 'asking' : 'permit')
      pending = $.clock.after(16_000, () => {
        void leave($)
      })

      return { text: `Erid: Rocky is on the beach${want === 'permit' ? ' with his sign' : ''} for about 16 seconds.` }
    }
    if (want === 'working') {
      await go($, 'working')
      settle($, 8_000, 'working')

      return { text: 'Erid: dome lamps on for 8 seconds.' }
    }
    if (want === 'haze') {
      const level = Number(arg)

      if (!Number.isInteger(level) || level < 0 || level > 5) {
        return { text: 'Usage: /erid haze 0-5 (a lower level than now blows the haze away, as a compaction does). The next measurement puts the real level back.' }
      }
      const was = (await read($, haze)).level

      await setHaze($, level, level < was)

      return { text: `Erid: haze ${was} → ${level}, until the next measurement.` }
    }
    if (want === 'tasks') {
      // a demo list: one lit, one in hand, two waiting; the next step lights after 3 seconds
      await setMarks($, () => [])
      await setMarks($, () => [{ id: 'd0', state: 'done' }, { id: 'd1', state: 'active' }, { id: 'd2', state: 'pending' }, { id: 'd3', state: 'pending' }])
      $.clock.after(3_000, () => {
        void setMarks($, marks => planMarks(marks, { advance: true }))
      })
      $.clock.after(15_000, () => {
        void update($, tasks, t => (t.marks[0]?.id === 'd0' ? NO_TASKS : t))
      })

      return { text: 'Erid: four marker lamps for 15 seconds; the second lights after 3.' }
    }

    return { text: want === '' ? 'Erid theme is back on.' : 'Usage: /erid [launch | return | salvo | ask | permit | amaze | working | haze 0-5 | tasks]' }
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
        void arrive($, 'asking')
      }
      yield chunk
    }
  })

  // The question tool runs until you answer or dismiss it; then he walks back out.
  on('tool.call', { tool: 'AskUserQuestion' }, async ($, e, next) => {
    await arrive($, 'asking')
    try {
      return await next(e)
    } finally {
      await leave($)
    }
  }).catch(($, e, next) => next(e)) // if the backdrop state fails, the question still runs

  // A permission prompt opens: Rocky walks up with his "ALLOW, QUESTION?" sign. A question's own prompt is his chords already.
  on('classic.PermissionRequest', async ($, e, next) => {
    if (e.tool_name !== 'AskUserQuestion' && (await read($, stage)) !== 'asking') {
      permitTool = e.tool_name
      await arrive($, 'permit')
    }

    return next(e)
  }).catch(($, e, next) => next(e)) // the prompt still opens

  // the app's own "Claude needs your permission" notice, where no PermissionRequest came first
  on('classic.Notification', async ($, e, next) => {
    if (e.notification_type === 'permission_prompt' && (await read($, stage)) !== 'asking') {
      await arrive($, 'permit')
    }

    return next(e)
  }).catch(($, e, next) => next(e))

  // a refused prompt: he walks out
  on('classic.PermissionDenied', async ($, e, next) => {
    await leave($)

    return next(e)
  }).catch(($, e, next) => next(e))

  // Every main-loop tool call: when the one a prompt waited on is done, Rocky walks out; the haze
  // follows the context as the turn fills it; the desktop app's task list moves the lamps.
  on('tool.call', async ($, e, next) => {
    if (e.agentId !== undefined || e.tool === 'AskUserQuestion') {
      return next(e)
    }
    const result = await next(e)

    if ((await read($, stage)) === 'permit' && (permitTool === undefined || permitTool === e.tool)) {
      await leave($)
    }
    if (e.tool === 'mcp__ccd_turn__update_plan') {
      await setMarks($, marks => planMarks(marks, e as unknown as Record<string, unknown>))
    } else if (e.tool === 'mcp__ccd_turn__wrap_up') {
      // wrap_up checks off the whole list
      await setMarks($, marks => marks.map(m => ({ ...m, state: 'done' })))
    }
    await measureHaze($)

    return result
  }).catch(($, e, next) => next(e)) // a failed lamp or haze update never holds up the tool

  // Claude pushed its work (from any loop): once git answers without an error, a salvo of Beetles flies it home
  on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
    const result = await next(e)
    const isFailed = result.deny !== undefined || ('isError' in result && result.isError === true)

    if (!isFailed && PUSH.test(e.command)) {
      await fly($, 'salvo')
    }

    return result
  }).catch(($, e, next) => next(e)) // a failed backdrop update never holds up the command

  // Claude Code's own task tools (TaskCreate, TaskUpdate) report through the classic task events
  on('classic.TaskCreated', async ($, e, next) => {
    await setMarks($, marks => [...marks.filter(m => m.id !== e.task_id), { id: e.task_id, state: 'pending' }])

    return next(e)
  }).catch(($, e, next) => next(e))

  on('classic.TaskCompleted', async ($, e, next) => {
    await setMarks($, marks => (marks.some(m => m.id === e.task_id)
      ? marks.map(m => (m.id === e.task_id ? { ...m, state: 'done' } : m))
      : [...marks, { id: e.task_id, state: 'done' }]))

    return next(e)
  }).catch(($, e, next) => next(e))

  // a subagent sets off: a Beetle launches across the dome
  on('agent.spawn', async ($, e, next) => {
    const result = await next(e)

    if (result.deny === undefined) {
      if (result.agentId !== undefined) {
        subagents.add(result.agentId)
      }
      await fly($, 'launch')
    }

    return result
  })

  // after each main turn the engine measures the context: the haze follows it
  on('session.measure', async ($, e, next) => {
    if (e.changed.includes('context') && e.context.percent !== undefined) {
      await setHaze($, hazeLevel(e.context.percent))
    }

    return next(e)
  }).catch(($, e, next) => next(e))

  // a compaction that stands blows the haze away, down to what is left
  on('session.compact', async ($, e, next) => {
    const result = await next(e)

    if (e.trigger !== 'precompute' && result.messages !== undefined) {
      const { context } = await $.session.usage()
      const after = result.tokensAfter !== undefined && context.window > 0 ? (result.tokensAfter / context.window) * 100 : 0

      await setHaze($, hazeLevel(after), true)
    }

    return result
  }).catch(($, e, next) => next(e))

  // A subagent finishes: its Beetle comes home. The main turn ends: Rocky leaves if he was
  // waiting, a long finished task gets an "AMAZE!", otherwise the dome lamps go back off.
  on('turn.complete', async ($, e, next) => {
    if (e.agentId !== undefined) {
      if (subagents.delete(e.agentId)) {
        await fly($, 'return')
      }

      return next(e)
    }
    isBusy = false
    const now = await read($, stage)

    const isLong = !e.isAborted && e.reason === 'answer' && e.durationMs >= LONG_TURN_MS

    if (now === 'asking' || now === 'permit') {
      await leave($)
    } else if (now === 'leaving') {
      // his walk-out finishes, then the plain beach
    } else if (isLong) {
      await go($, 'amaze')
      settle($, AMAZE_MS, 'amaze')
    } else if (now === 'working') {
      await go($, 'idle')
    } // a Beetle or an "AMAZE!" still playing hands back to the plain beach when it ends

    // a finished list keeps its lamps lit a little while, then clears the sand
    if (allDone(await read($, tasks))) {
      clearing?.cancel()
      clearing = $.clock.after(CLEAR_MARKS_MS, () => {
        void update($, tasks, t => (allDone(t) ? NO_TASKS : t))
      })
    }

    return next(e)
  })

  on('ui.render', { component: 'Backdrop' }, async ($, e, next) => {
    if ((e.surface !== 'desktop' && e.surface !== 'mobile') || e.props.scene !== SCENE_NAME) {
      return next(e)
    }
    const { Svg } = $.ui.resolve(e)
    const now = await read($, stage)
    const mist = await read($, haze) // never `h`: JSX compiles to the global h
    const t = await read($, tasks)
    const ms = await $.clock.now()
    // every scene starts its clouds, waves, sparkle and lamps where the shared clock says,
    // so swapping scenes doesn't snap them back to the start (Rocky's own routines still start fresh)
    const sec = ms / 1000
    const sync = SYNC.map(([sel, period, offset = 0]) => `${sel}{animation-delay:-${((sec + offset) % period).toFixed(2)}s}`).join('')
    const base = SCENES[now]
    const draw = (layers: { markup: string; css: string }[]) =>
      base.replace('</style>', `${sync}${layers.map(l => l.css).join('')}</style>`).replace(OVERLAY_SLOT, layers.map(l => l.markup).join(''))
    // the live layers, dropping the lamps and then the haze if a full scene would run over the limit
    const hz = hazeOverlay(mist, ms)
    const tk = taskOverlay(t, ms)
    let source = draw([hz, tk])

    if (source.length > SVG_LIMIT) {
      source = draw([hz])
    }
    if (source.length > SVG_LIMIT) {
      source = draw([])
    }
    const extra = overlayAlt(mist, t)

    return <Svg source={source} alt={extra ? `${ALTS[now]}. ${extra}` : ALTS[now]} isInteractive />
  })
}
