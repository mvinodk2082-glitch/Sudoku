/** @type {import('tailwindcss').Config} */
const v = (n) => `rgb(var(--${n}) / <alpha-value>)`;
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: v('bg'), surface: v('surface'), raised: v('raised'), line: v('line'), thick: v('thick'),
        text: v('text'), muted: v('muted'), given: v('given'), accent: v('accent'), rose: v('rose'),
        peer: v('peer'), same: v('same'), sel: v('sel'), note: v('note'),
      },
      fontFamily: { sans: ['Inter', 'Roboto', 'system-ui', 'sans-serif'] },
      keyframes: {
        pop: { '0%': { transform: 'scale(.6)', opacity: '0' }, '60%': { transform: 'scale(1.12)' }, '100%': { transform: 'scale(1)', opacity: '1' } },
        glow: { '0%': { backgroundColor: 'rgb(var(--accent) / 0)' }, '40%': { backgroundColor: 'rgb(var(--accent) / .28)' }, '100%': { backgroundColor: 'rgb(var(--accent) / 0)' } },
        fadein: { '0%': { opacity: '0', transform: 'translateY(8px)' }, '100%': { opacity: '1', transform: 'none' } },
        shake: { '0%,100%': { transform: 'none' }, '25%': { transform: 'translateX(-2px)' }, '75%': { transform: 'translateX(2px)' } },
      },
      animation: { pop: 'pop .22s ease-out', glow: 'glow .9s ease-in-out', fadein: 'fadein .35s ease-out', shake: 'shake .25s ease-in-out' },
    },
  },
  plugins: [],
};
