/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'fleet-bg': '#0F1117',
        'fleet-surface': '#161B27',
        'fleet-border': '#1E2940',
        'fleet-blue': '#2D7DD2',
        'fleet-amber': '#F4A259',
        'fleet-red': '#E63946',
        'fleet-green': '#2EC4B6',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      }
    },
  },
  plugins: [],
}