import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

const config: Config = {
  darkMode: ["class"],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#080712",
        surface: "#0E111B",
        cyan: "#2DD4BF",
        indigo: "#A78BFA",
        border: "#243042"
      },
      fontFamily: {
        sans: ["Inter", "Geist", "ui-sans-serif", "system-ui", "sans-serif"]
      },
      boxShadow: {
        cyan: "0 0 0 0.5px rgba(45,212,191,0.75), 0 0 24px rgba(45,212,191,0.14)"
      }
    }
  },
  plugins: [tailwindcssAnimate]
};

export default config;
