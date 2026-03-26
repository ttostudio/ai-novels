import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        text: "var(--text)",
        accent: "var(--accent)",
        border: "var(--border)",
        panel: "var(--panel)",
        muted: "var(--muted)",
      },
      fontFamily: {
        reading: ["Noto Serif JP", "Georgia", "游明朝", "serif"],
        ui: ["Noto Sans JP", "sans-serif"],
      },
      maxWidth: {
        reader: "800px",
        content: "1200px",
      },
    },
  },
  plugins: [],
};

export default config;
