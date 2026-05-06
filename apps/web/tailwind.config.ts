import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: {
          bg: "#f8f9fa",
          grid: "#e5e7eb",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
