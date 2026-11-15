import { expect, mock, test } from 'claude-code/testing'

import type { Haze, Stage, Tasks } from '../types'

type Seen = { stage?: Stage; haze?: Haze; tasks?: Tasks }

// The engine beneath the mod: a context window `fill`% full, a clock that moves only when told,
// and the mod's state writes, recorded as they pass to the kit's own store.
// (The kit draws no theme, so session.start stops at $.theme.set, after the haze is set.)
function engine(on: Parameters<typeof mock.clock>[0], fill: { percent: number }): Seen {
  const seen: Seen = {}

  mock.clock(on, { now: 1_000_000 })
  on('state.set', ($, e, next) => {
    if (e.plugin === 'erid-dome') {
      ;(seen as Record<string, unknown>)[e.key] = e.value
    }
    return next(e)
  })
  on('command.register', () => ({ value: { command: 'erid' } }))
  on('session.usage', () => ({ value: { startedAt: 0, rateLimits: [], context: { window: 200_000, tokens: fill.percent * 2000, percent: fill.percent } } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('tool.call', () => ({ result: {} }))
  on('classic.PermissionRequest', () => ({}))
  on('session.measure', (_, e) => ({ changed: e.changed }))

  return seen
}

test('the task list lights a lamp per step', async ($, on) => {
  const seen = engine(on, { percent: 10 })
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

  const plan = 'mcp__ccd_turn__update_plan'
  await $.tool.call({ tool: plan, items: [{ content: 'a', status: 'in_progress' }, { content: 'b', status: 'pending' }, { content: 'c', status: 'pending' }] } as never)
  expect(seen.tasks!.marks.map(m => m.state)).toEqual(['active', 'pending', 'pending'])

  await $.tool.call({ tool: plan, advance: true } as never)
  const stepped = seen.tasks!
  expect(stepped.marks.map(m => m.state)).toEqual(['done', 'active', 'pending'])
  expect(stepped.lit).toEqual(['p0'])

  await $.tool.call({ tool: plan, done: [2], start: 3 } as never)
  expect(seen.tasks!.marks.map(m => m.state)).toEqual(['done', 'done', 'active'])

  await $.tool.call({ tool: 'mcp__ccd_turn__wrap_up', recap: 'done' } as never)
  expect(seen.tasks!.marks.every(m => m.state === 'done')).toBe(true)
})

test('the haze follows the context and a compaction clears it', async ($, on) => {
  const fill = { percent: 20 }
  const seen = engine(on, fill)
  on('session.compact', () => ({ messages: [{ role: 'user', text: 'summary', toolUses: [] }], tokensBefore: 170_000, tokensAfter: 30_000 }))
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  expect(seen.haze!.level).toBe(0)

  await $.session.measure({ context: { window: 200_000, tokens: 160_000, percent: 80 }, rateLimits: [], changed: ['context'] })
  expect(seen.haze!.level).toBe(4)

  fill.percent = 15
  await $.session.compact({ trigger: 'auto', messages: [{ role: 'user', text: 'a long talk', toolUses: [] }] } as never)
  const cleared = seen.haze!
  expect(cleared.level).toBe(0)
  expect(cleared.from).toBe(4)
  expect(cleared.isClearing).toBe(true)
})

test('a permission prompt brings Rocky with his sign, and the call ending sends him off', async ($, on) => {
  const seen = engine(on, { percent: 10 })
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

  await $.classic.PermissionRequest({ tool_name: 'Bash', tool_input: { command: 'rm -rf build' } } as never)
  expect(seen.stage).toBe('permit')

  await $.tool.call({ tool: 'Read', file_path: '/x' } as never)
  expect(seen.stage).toBe('permit') // another tool finishing is not the answer

  await $.tool.call({ tool: 'Bash', command: 'rm -rf build' })
  expect(seen.stage).toBe('leaving')
})

test('a subagent going out and coming home flies a Beetle each way', async ($, on) => {
  const seen = engine(on, { percent: 10 })
  on('agent.spawn', () => ({ model: 'm', agentId: 'a1' }))
  on('turn.complete', () => ({ text: '' }))
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

  await $.agent.spawn({ prompt: 'look', description: 'look' } as never)
  expect(seen.stage).toBe('launch')

  await $.turn.complete({ answer: 'found it', durationMs: 5_000, isAborted: false, turnId: 't1', agentId: 'a1', reason: 'answer' })
  expect(seen.stage).toBe('return')

  // a subagent this load never launched brings nothing home
  await $.turn.complete({ answer: '', durationMs: 5_000, isAborted: false, turnId: 't2', agentId: 'zz', reason: 'answer' })
  expect(seen.stage).toBe('return')
})
