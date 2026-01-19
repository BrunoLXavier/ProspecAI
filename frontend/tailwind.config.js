/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Dynamic primary color from CSS variable (fallback to SENAI Red)
        'primary-dynamic': 'var(--color-primary, #E30613)',
        'secondary-dynamic': 'var(--color-secondary, #003366)',
        // Map full palette to CSS variables so runtime theme tokens control utility classes
        primary: {
          50: 'var(--color-primary-50, #fef2f2)',
          100: 'var(--color-primary-100, #fee2e2)',
          200: 'var(--color-primary-200, #fecaca)',
          300: 'var(--color-primary-300, #fca5a5)',
          400: 'var(--color-primary-400, #f87171)',
          500: 'var(--color-primary, #E30613)', // active primary token
          600: 'var(--brand-primary-hover, #c00510)',
          700: 'var(--brand-primary-dark, #9a040d)',
          800: 'var(--brand-primary-darker, #7a030a)',
          900: 'var(--brand-primary-deep, #5c0208)',
        },
        secondary: {
          50: 'var(--color-secondary-50, #e6f0f7)',
          100: 'var(--color-secondary-100, #cce0ef)',
          200: 'var(--color-secondary-200, #99c2df)',
          300: 'var(--color-secondary-300, #66a3cf)',
          400: 'var(--color-secondary-400, #3385bf)',
          500: 'var(--color-secondary, #003366)', // active secondary token
          600: 'var(--brand-secondary-hover, #002952)',
          700: 'var(--brand-secondary-dark, #001f3d)',
          800: 'var(--brand-secondary-darker, #001429)',
          900: 'var(--brand-secondary-deep, #000a14)',
        },
        // Semantic colors
        surface: {
          light: '#ffffff',
          DEFAULT: '#f8fafc',
          dark: '#1e293b',
          darker: '#0f172a',
        },
        muted: {
          light: '#f1f5f9',
          DEFAULT: '#94a3b8',
          dark: '#334155',
        },
        accent: {
          light: '#fef3c7',
          DEFAULT: '#fbbf24',
          dark: '#d97706',
        },
        confidence: {
          green: '#10b981',
          yellow: '#f59e0b',
          red: '#ef4444',
        },
      },
      fontFamily: {
        sans: ['Inter var', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 2px 8px -2px rgba(0, 0, 0, 0.08), 0 4px 16px -4px rgba(0, 0, 0, 0.04)',
        'elevated': '0 8px 24px -4px rgba(0, 0, 0, 0.12), 0 4px 8px -2px rgba(0, 0, 0, 0.08)',
        'floating': '0 12px 40px -8px rgba(0, 0, 0, 0.16), 0 6px 16px -4px rgba(0, 0, 0, 0.1)',
        'glass': '0 8px 32px rgba(0, 0, 0, 0.12)',
        'inner-soft': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)',
      },
      backdropBlur: {
        'xs': '2px',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateX(-10px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
      },
      transitionDuration: {
        '250': '250ms',
        '350': '350ms',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
}
