/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#eef4ff",
          100: "#dde9ff",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
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
