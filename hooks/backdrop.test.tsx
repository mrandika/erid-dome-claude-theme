import { expect, mock, test } from 'claude-code/testing'

const BACKDROP = { plugin: 'erid-dome', component: 'Backdrop', props: { scene: 'erid-dome', plugin: 'erid-dome', glass: { blur: 28, opacity: 0.42 } } } as const

test('the backdrop draws, hazy and with lamps, under the size limit', async ($, on) => {
  mock.clock(on, { now: 1_000_000 })
  on('theme.set', () => ({ value: { isDrawn: true, requestId: 'r1' } }))
  on('command.register', () => ({ value: { command: 'erid' } }))
  on('session.usage', () => ({ value: { startedAt: 0, rateLimits: [], context: { window: 200_000, tokens: 150_000, percent: 75 } } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('tool.call', () => ({ result: {} }))
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  await $.tool.call({ tool: 'mcp__ccd_turn__update_plan', items: [{ content: 'a', status: 'completed' }, { content: 'b', status: 'in_progress' }] } as never)

  const ui = await $.ui.mount({ ...BACKDROP, surface: 'desktop' } as never)
  const svg = (await ui.find({ type: 'Svg' } as never)) as { props: { source: string; alt: string } } | undefined
  const source = svg?.props.source ?? ''

  expect(source.length).toBeGreaterThan(100_000)
  expect(source.length).toBeLessThanOrEqual(131_072)
  expect(source).toContain('class="hzc"') // a level-4 haze (75% full)
  expect(source).toContain('class="tk-done"') // and a lit lamp
  expect(source).not.toContain('<g class="ov"></g>')
  expect(svg?.props.alt).toContain('haze')
  await ui.unmount()
})
