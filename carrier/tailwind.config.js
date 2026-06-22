/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'brand-dark': '#0a0a0c',
        'brand-card': '#121216',
        'brand-border': '#1e1e24',
        'neon-cyan': '#00F0FF',
        'neon-blue': '#3b82f6',
        'neon-purple': '#8b5cf6',
      },
      boxShadow: {
        'glow-cyan': '0 0 15px rgba(0, 240, 255, 0.15)',
        'glow-blue': '0 0 15px rgba(59, 130, 246, 0.15)',
      }
    },
  },
  plugins: [],
}
