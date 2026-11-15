// What the beach is showing, from what Claude is doing:
// idle (plain beach), working (dome lamps on), launch (a Beetle flies for a new subagent),
// return (a Beetle comes home: a subagent finished), salvo (four Beetles fly home: Claude pushed), asking (Rocky waits on your answer),
// permit (Rocky holds up an "ALLOW, QUESTION?" sign while a permission prompt waits), leaving (he walks out),
// amaze (a long task just finished)
export type Stage = 'idle' | 'working' | 'launch' | 'return' | 'salvo' | 'asking' | 'permit' | 'leaving' | 'amaze'

// The dome's haze, from how full the context window is: level 0 (clear) to 5 (dense).
// `from` is the level it is fading out of since `at` (ms on the engine clock);
// `isClearing` when a compaction thinned it, so the old haze blows away instead of fading
export type Haze = {
  level: number
  from: number
  at: number
  isClearing: boolean
}

// One marker lamp on the sand per task in Claude's task list
export type Mark = {
  id: string
  state: 'pending' | 'active' | 'done'
}

// The markers, and which of them were just added (rise out of the sand) or just lit (sparkle) at `at`
export type Tasks = {
  marks: Mark[]
  at: number
  added: string[]
  lit: string[]
}

declare module 'claude-code' {
  interface PluginState {
    'erid-dome': {
      stage: Stage
      haze: Haze
      tasks: Tasks
    }
  }
}
