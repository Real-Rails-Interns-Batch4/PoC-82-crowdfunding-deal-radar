import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

const config: Config = {
  darkMode: ["class"],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#030712",
        surface: "#0B1117",
        cyan: "#38BDF8",
        indigo: "#818CF8",
        border: "#1F2937"
      },
      fontFamily: {
        sans: ["Inter", "Geist", "ui-sans-serif", "system-ui", "sans-serif"]
      },
      boxShadow: {
        cyan: "0 0 0 0.5px rgba(56,189,248,0.75), 0 0 24px rgba(56,189,248,0.12)"
      }
    }
  },
  plugins: [tailwindcssAnimate]
};

export default config;
