/** @type {import('tailwindcss').Config} */

// CSS 변수(--color-brand-*)를 Tailwind 컬러로 연결하는 헬퍼.
// opacityValue를 함께 받아 bg-brand-600/10 같은 불투명도 모디파이어도 동작함.
const v = (varName) => ({ opacityValue }) =>
  opacityValue !== undefined
    ? `hsl(var(${varName}) / ${opacityValue})`
    : `hsl(var(${varName}))`;

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          50:  v("--color-brand-50"),
          100: v("--color-brand-100"),
          400: v("--color-brand-400"),
          500: v("--color-brand-500"),
          600: v("--color-brand-600"),
          700: v("--color-brand-700"),
          900: v("--color-brand-900"),
        },
        surface: {
          DEFAULT: "#ffffff",
          alt:     "#f7f8fb",
          dark:    "#161821",
          "dark-alt": "#1d1f2b",
        },
        sys: {
          DEFAULT: "#5b6b87",
          bg:      "#dbe3f0",
          "bg-dark": "#0e1322",
          "fg-dark": "#5a6f96",
        },
        rec: {
          DEFAULT: "#b06800",
          bg:      "#fff3c4",
          "bg-dark": "#2c1d00",
          "fg-dark": "#f5c518",
        },
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "fade-in": "fadeIn 0.2s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      fontFamily: {
        sans: ["Inter", "Segoe UI", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Consolas", "monospace"],
      },
    },
  },
  plugins: [],
};
