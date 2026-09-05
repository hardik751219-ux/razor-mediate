/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        rzp: {
          blue: '#3395FF',
          darkBlue: '#0C2340',
          navy: '#0B1528',
          accent: '#1877F2',
          emerald: '#00B386',
          amber: '#F39C12',
          crimson: '#E74C3C',
          surface: '#0F172A',
          border: '#1E293B',
          card: '#111C30',
          hover: '#1E2C48'
        }
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace']
      }
    },
  },
  plugins: [],
}
