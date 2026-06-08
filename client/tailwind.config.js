/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        cyberpunk: {
          bg: {
            primary: '#0a0a0f',
            secondary: '#12121a',
            tertiary: '#1a1a25',
          },
          accent: {
            cyan: '#00f0ff',
            red: '#ff0055',
            yellow: '#ffcc00',
            green: '#00ff88',
            purple: '#9945ff',
          },
          text: {
            primary: '#e0e0e0',
            secondary: '#888899',
          },
          border: '#2a2a3a',
          grid: {
            bg: '#1a1a2e',
            line: '#252538',
          },
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
        'scanline': 'scanline 8s linear infinite',
        'blink': 'blink 1s step-end infinite',
        'fade-in': 'fadeIn 0.3s ease-out',
        'typing': 'typing 2s steps(40, end)',
      },
      boxShadow: {
        'neon-cyan': '0 0 10px rgba(0, 240, 255, 0.6), inset 0 0 5px rgba(0, 240, 255, 0.1)',
        'neon-red': '0 0 10px rgba(255, 0, 85, 0.6), inset 0 0 5px rgba(255, 0, 85, 0.1)',
        'neon-yellow': '0 0 10px rgba(255, 204, 0, 0.6), inset 0 0 5px rgba(255, 204, 0, 0.1)',
        'neon-green': '0 0 10px rgba(0, 255, 136, 0.6), inset 0 0 5px rgba(0, 255, 136, 0.1)',
        'neon-purple': '0 0 10px rgba(153, 69, 255, 0.6), inset 0 0 5px rgba(153, 69, 255, 0.1)',
      },
    },
  },
  plugins: [],
};
