import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class', // We use the .dark class on the root element
  theme: {
    extend: {
      colors: {
        'bg-primary': 'var(--bg-primary)',
        'bg-secondary': 'var(--bg-secondary)',
        'brand-primary': 'var(--text-inverse)',
        'brand-accent': 'var(--accent-primary)',
        'semantic-success': 'var(--success)',
        'semantic-danger': 'var(--error)',
        'text-main': 'var(--text-primary)',
        'text-muted': 'var(--text-secondary)',
        'border-subtle': 'var(--border-color)',
      },
      fontFamily: {
        sans: ['Inter', 'SF Pro Display', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
