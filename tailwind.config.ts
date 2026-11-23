import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        obsidian: '#09090B',
        panel: '#111113',
        panelBorder: '#222226',
        panelHover: '#18181B',
        panelElevated: '#1A1A1D',
        panelInset: '#0A0A0C',
        paper: '#F8F7F4',
        paperDark: '#EDECE7',
        accent: {
          DEFAULT: '#F59E0B',
          amber: '#F59E0B',
          subtle: 'rgba(245, 158, 11, 0.15)',
        },
        textPrimary: '#EDEDED',
        textSecondary: '#A1A1AA',
        textMuted: '#71717A',
        textSubtle: '#52525B',
        status: {
          pass: '#22C55E',
          warn: '#F59E0B',
          fail: '#EF4444',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'IBM Plex Sans', 'Inter', 'sans-serif'],
        mono: ['var(--font-mono)', 'IBM Plex Mono', 'JetBrains Mono', 'monospace'],
        editorial: ['var(--font-editorial)', 'Newsreader', 'Georgia', 'serif'],
        display: ['var(--font-display)', 'Space Grotesk', 'sans-serif'],
      },
      borderRadius: {
        none: '0px',
        DEFAULT: '0px',
        sharp: '2px',
      },
      transitionTimingFunction: {
        'anti-ai': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      transitionDuration: {
        '75': '75ms',
        '150': '150ms',
      },
      keyframes: {
        reticleSnap: {
          '0%': { transform: 'scale(1.03)', opacity: '0.8' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      animation: {
        'reticle-lock': 'reticleSnap 150ms cubic-bezier(0.16, 1, 0.3, 1) forwards',
      },
    },
  },
  plugins: [],
};

export default config;
