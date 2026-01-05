/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        prBlue: "#0b4f9c",
        prRed: "#d62828",
        prWhite: "#f5f7fb",
        prGray: "#eef2f7",
        ink: "#0f172a",
      },
      boxShadow: {
        glow: "0 10px 50px rgba(11, 79, 156, 0.12)",
      },
    },
  },
  plugins: [],
}
