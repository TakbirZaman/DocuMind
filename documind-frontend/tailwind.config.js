/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: '#0f1117',
        panel: '#161b27',
        border: '#1e2738',
        accent: '#5b8dee',
        'accent-dim': '#3a6bd4',
        muted: '#8b95a8',
        text: '#e4e8f0',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
};
