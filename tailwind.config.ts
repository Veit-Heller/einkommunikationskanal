import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        newsreader: ["Newsreader", "serif"],
      },
      colors: {
        // Design system — primary (soft mint)
        primary: {
          50:  "#FBFFFD",
          100: "#F8FEFB",
          200: "#F0FDF7",
          300: "#E9FDF3",
          400: "#DEFBEC",
          500: "#D1FAE5",
          600: "#B4D7C5",
          700: "#92AFA0",
          800: "#6D8277",
          900: "#47554E",
          950: "#2A322E",
        },
        // Design system — secondary (soft indigo)
        secondary: {
          500: "#E0E7FF",
          600: "#C1C7DB",
          700: "#9DA2B3",
        },
        // Design system — neutral
        neutral: {
          50:  "#FDFDFD",
          100: "#FBFBFC",
          200: "#F8F8F8",
          300: "#F4F4F5",
          400: "#EEEFF0",
          500: "#E8E9EA",
          600: "#C8C8C9",
          700: "#A2A3A4",
          800: "#79797A",
          900: "#4F4F50",
          950: "#2E2F2F",
        },
        // Design system — semantic
        ds: {
          bg:           "#E2E8F0",
          surface:      "#FFFFFF",
          "text-1":     "#64748B",
          "text-2":     "#94A3B8",
          border:       "#94A3B8",
          "border-soft":"#CBD5E1",
          accent:       "#D1FAE5",
          action:       "#059669",
          "action-hover":"#047857",
        },
      },
    },
  },
  plugins: [],
};

export default config;
