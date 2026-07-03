import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#18201d",
        paper: "#f5f3ed",
        moss: "#3d5a4d",
        line: "#dedbd1",
        ambered: "#a5672f",
      },
      boxShadow: { soft: "0 18px 55px rgba(38, 45, 41, .08)" },
    },
  },
  plugins: [],
} satisfies Config;
