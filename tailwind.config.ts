import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#0f172a",
        pine: "#21493d",
        sand: "#efe5d2",
        clay: "#b36845",
        mist: "#dbe7e4"
      },
      boxShadow: {
        card: "0 20px 45px -24px rgba(15, 23, 42, 0.25)"
      },
      backgroundImage: {
        "portal-grid":
          "linear-gradient(to right, rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.08) 1px, transparent 1px)"
      }
    }
  },
  plugins: []
};

export default config;
