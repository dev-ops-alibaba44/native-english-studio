import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Core neutrals
        ink: "#1B2240",
        paper: "#FAF8F5",
        surface: "#FFFFFF",
        line: "#E4DFD5",
        slate: {
          DEFAULT: "#5B6472",
          light: "#EEEAE2",
        },
        // Brand navy — used mostly as tinted backgrounds, per brand guidelines
        brand: {
          DEFAULT: "#172983",
          deep: "#0F1C5C",
          tint: "rgba(23,41,131,0.07)",
          "tint-strong": "rgba(23,41,131,0.14)",
        },
        // Brand red — used sparingly, for genuine urgency only
        danger: {
          DEFAULT: "#DD0E20",
          tint: "rgba(221,14,32,0.08)",
          "tint-strong": "rgba(221,14,32,0.15)",
        },
        // Status colors, kept distinct from brand navy/red
        warn: {
          DEFAULT: "#A9782F",
          tint: "rgba(169,120,47,0.13)",
        },
        good: {
          DEFAULT: "#3F6B4E",
          tint: "rgba(63,107,78,0.11)",
        },
        // Content-marking colors (student/advisor highlighter + comment
        // anchors) — deliberately NOT part of the navy/red brand palette,
        // since these mark user text rather than UI chrome.
        highlight: {
          DEFAULT: "rgba(255,214,10,0.35)", // yellow highlighter
        },
        "comment-anchor": {
          DEFAULT: "rgba(221,14,32,0.12)", // ties visually to feedback = brand red, still a tint
          active: "rgba(221,14,32,0.24)",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        body: ["var(--font-body)", "sans-serif"],
        util: ["var(--font-util)", "sans-serif"],
        // Brush-style Chinese font, used ONLY as a large, faint decorative
        // character behind section headers (the "calligraphy" accent) —
        // never for body text or anything that needs to stay legible.
        calligraphy: ["var(--font-calligraphy)", "serif"],
      },
      borderRadius: {
        DEFAULT: "12px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(15,20,60,0.04), 0 4px 16px rgba(15,20,60,0.06)",
      },
    },
  },
  plugins: [],
};

export default config;
