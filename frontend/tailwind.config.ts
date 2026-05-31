import type { Config } from 'tailwindcss';

/**
 * KaziPay design tokens.
 *
 * Source of truth for these values:
 *   - kazipay_prototype.html  (creative-facing dark theme)
 *   - kazipay_client.html     (client-facing light theme)
 *   - kazipay_landing.html    (marketing dark theme)
 *   - CLAUDE.md               (product-level constraints: no sidebar, inline SVG, self-hosted Manrope)
 *
 * Two themes share one config:
 *   - dark surface ("creative") is the default — apply on <html> or page root
 *   - light surface ("client") is opt-in via `data-theme="light"` on a parent element
 *
 * Naming convention:
 *   - Surface colors use semantic names (surface, surface-raised, surface-input, surface-chip).
 *   - Text colors use t1/t2/t3 (primary/secondary/tertiary).
 *   - Accents (lime, purple) and semantic (green, amber, red) keep their human names.
 */
const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Manrope',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
      },
      fontSize: {
        // Aligned to the prototypes' scale
        '2xs': ['10px', { lineHeight: '14px' }],
        xs: ['11px', { lineHeight: '16px' }],
        sm: ['12px', { lineHeight: '18px' }],
        base: ['13px', { lineHeight: '20px' }],
        md: ['14px', { lineHeight: '22px' }],
        lg: ['15px', { lineHeight: '24px' }],
        xl: ['16px', { lineHeight: '24px' }],
        '2xl': ['18px', { lineHeight: '26px' }],
        '3xl': ['22px', { lineHeight: '28px' }],
        '4xl': ['24px', { lineHeight: '30px' }],
        // Hero range (landing page)
        '5xl': ['32px', { lineHeight: '36px' }],
        '6xl': ['44px', { lineHeight: '48px' }],
        '7xl': ['64px', { lineHeight: '64px' }],
        '8xl': ['96px', { lineHeight: '96px' }],
      },
      letterSpacing: {
        tightest: '-1px',
        tighter: '-0.5px',
        tight: '-0.3px',
        normal: '0',
        wide: '0.5px',
        wider: '1px',
      },
      borderRadius: {
        sm: '6px',
        DEFAULT: '8px',
        md: '10px',
        lg: '14px',
        xl: '20px',
        '2xl': '28px',
      },
      colors: {
        // ── Dark theme (creative) ────────────────────────────
        dark: {
          surface: '#141414',
          'surface-raised': '#1C1C1C',
          'surface-input': '#222222',
          'surface-chip': '#2A2A2A',
          t1: '#F0EDE8',
          t2: '#999894',
          t3: '#666560',
          border: 'rgba(255,255,255,0.07)',
          'border-hover': 'rgba(255,255,255,0.14)',
        },
        // ── Light theme (client share view) ──────────────────
        light: {
          surface: '#F6F6F4',
          'surface-raised': '#FFFFFF',
          'surface-input': '#F6F6F4',
          'surface-chip': '#EEEDEB',
          t1: '#141414',
          t2: '#666460',
          t3: '#AAACA8',
          border: 'rgba(0,0,0,0.08)',
          'border-hover': 'rgba(0,0,0,0.14)',
        },
        // ── Accents (work on both surfaces) ──────────────────
        lime: {
          DEFAULT: '#D4F53C',
          hover: '#B8D632',
          bg: 'rgba(212,245,60,0.08)',
          'bg-strong': 'rgba(212,245,60,0.15)',
          border: 'rgba(212,245,60,0.2)',
        },
        purple: {
          DEFAULT: '#8B5CF6',
          hover: '#7C3AED',
          bg: 'rgba(139,92,246,0.1)',
          border: 'rgba(139,92,246,0.2)',
        },
        // ── Semantic (theme-aware variants via CSS vars below) ──
        success: {
          DEFAULT: '#34D399', // dark
          light: '#0A9A6A', // light
          bg: 'rgba(52,211,153,0.1)',
          'bg-light': 'rgba(10,154,106,0.08)',
        },
        warning: {
          DEFAULT: '#F59E0B',
          light: '#D97706',
          bg: 'rgba(245,158,11,0.1)',
          'bg-light': 'rgba(217,119,6,0.08)',
        },
        danger: {
          DEFAULT: '#EF4444',
          bg: 'rgba(239,68,68,0.1)',
        },
      },
      boxShadow: {
        soft: '0 2px 12px rgba(0,0,0,0.06)',
        raised: '0 8px 32px rgba(0,0,0,0.1)',
        deep: '0 40px 120px rgba(0,0,0,0.6)',
        chip: '0 16px 48px rgba(0,0,0,0.4)',
        'lime-glow': '0 8px 32px rgba(212,245,60,0.25)',
        'purple-glow': '0 8px 32px rgba(139,92,246,0.25)',
      },
      transitionDuration: {
        fast: '150ms',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.4s ease forwards',
        pulse: 'pulse 2s infinite',
      },
    },
  },
  plugins: [],
};

export default config;
