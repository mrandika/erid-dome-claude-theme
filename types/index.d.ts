// What the beach is showing, from what Claude is doing:
// idle (plain beach), working (dome lamps on), launch (a Beetle flies for a new subagent),
// asking (Rocky waits on your answer), leaving (he walks out), amaze (a long task just finished)
export type Stage = 'idle' | 'working' | 'launch' | 'asking' | 'leaving' | 'amaze'

declare module 'claude-code' {
  interface PluginState {
    'erid-dome': {
      stage: Stage
    }
  }
}
