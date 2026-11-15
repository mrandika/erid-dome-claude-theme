import { makeColors } from './make-colors.js'

// Light: the dome by day, milky haze over jade-and-rust strata.
// Dark: the dome's lights dimmed, deep teal night over the Eridian sea.
// Roles: accent = Erid sea teal, danger = Petrova-line red, success = jade strata,
// warning = rust/ochre rock, pro = Astrophage violet.
export const { theme: COLORS, problems: COLOR_PROBLEMS } = makeColors({
  label: "Erid — Grace's Dome",
  roles: { accent: '#2f8f88', danger: '#b8432f', success: '#4f8a5e', warning: '#b07a2a', pro: '#7a5ca0' },
  light: {
    gray: {
      anchors: {
        'surface-0': '#dde2df',
        'surface-1': '#e6eae7',
        'surface-2': '#f1f3f0',
        'surface-3': '#f1f3f0',
        'text-primary': '#1c2724',
        'text-secondary': '#36443e',
        'text-muted': '#4d5c55',
      },
    },
  },
  dark: {
    gray: {
      anchors: {
        'surface-0': '#0f181d',
        'surface-1': '#152127',
        'surface-2': '#1a2930',
        'surface-3': '#1f3038',
        'text-primary': '#e6eeea',
        'text-secondary': '#c0cec8',
        'text-muted': '#9aada6',
      },
    },
  },
})
