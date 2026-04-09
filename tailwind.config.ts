import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        sidebar: {
          DEFAULT: "#1a1a2e",
          hover: "#16213e",
          active: "#0f3460",
        },
        brand: {
          primary: "#0f3460",
          secondary: "#e94560",
          accent: "#533483",
        },
      },
    },
  },
  plugins: [],
};
export default config;
