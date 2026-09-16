/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "background": "#f7f9fb",
        "surface": "#ffffff",
        "surface-container-lowest": "#ffffff",
        "surface-container-low": "#f2f4f6",
        "surface-container": "#eceef0",
        "surface-container-high": "#e6e8ea",
        "surface-container-highest": "#e0e3e5",
        "surface-variant": "#e0e3e5",
        "on-surface": "#191c1e",
        "on-surface-variant": "#45464d",
        "outline": "#76777d",
        "outline-variant": "#c6c6cd",
        "primary": "#131b2e",
        "on-primary": "#ffffff",
        "secondary": "#006a61",
        "secondary-container": "#86f2e4",
        "on-secondary-container": "#006f66",
        "tertiary-fixed": "#85f8c4",
        "on-tertiary-fixed-variant": "#005137",
        "error": "#ba1a1a",
        "error-container": "#ffdad6",
        "on-error-container": "#93000a"
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        body: ["Inter", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"]
      }
    },
  },
  plugins: [],
};
