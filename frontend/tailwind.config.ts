import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        void: {
          black:  '#050505',
          zinc:   '#111111',
          card:   '#111111',
          card2:  '#1A1A1A',
          border: '#2A2A2A',
        },
        text: {
          primary: '#F0F0F0',
          muted:   '#777777',
          muted2:  '#444444',
        },
        signal: {
          stable:   '#10B981',
          risk:     '#F59E0B',
          critical: '#DC2626',
          amber:    '#F59E0B',
        },
        sarih: {
          bg:       '#050505',
          text:     '#F0F0F0',
          amber:    '#F59E0B',
          card:     '#111111',
          border:   '#2A2A2A',
          muted:    '#777777',
          emerald:  '#10B981',
          critical: '#DC2626',
        },
      },
      fontFamily: {
        sans:    ['Inter', 'system-ui', 'sans-serif'],
        arabic:  ['Cairo', 'Readex Pro', 'Tajawal', 'sans-serif'],
        mono:    ['JetBrains Mono', 'Courier New', 'monospace'],
      },
      borderRadius: {
        card: '6px',
        sm:   '4px',
      },
      boxShadow: {
        'amber-glow':    '0 0 16px rgba(245,158,11,0.2)',
        'critical-glow': '0 0 16px rgba(220,38,38,0.2)',
        'stable-glow':   '0 0 16px rgba(16,185,129,0.2)',
      },
    },
  },
  plugins: [],
}

export default config
