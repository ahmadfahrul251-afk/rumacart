import type { Config } from "tailwindcss";

// Warna & style di sini mengikuti branding RumaCart dari brief:
// Primary Green, Secondary Orange, Background, Text, Accent.
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#0B6A3B",
          dark: "#08512D",
          light: "#E6F2EB",
        },
        secondary: {
          DEFAULT: "#FF7A1A",
          dark: "#E0650A",
          light: "#FFEEE0",
        },
        background: "#FAFAFA",
        surface: "#FFFFFF",
        accent: "#F3F5F7",
        ink: "#202020",
      },
      fontFamily: {
        sans: ["var(--font-poppins)", "Poppins", "Inter", "sans-serif"],
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.5rem",
      },
      boxShadow: {
        soft: "0 4px 20px rgba(0, 0, 0, 0.06)",
        card: "0 2px 12px rgba(0, 0, 0, 0.05)",
      },
    },
  },
  plugins: [],
};
export default config;
