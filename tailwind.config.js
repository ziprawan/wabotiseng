/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,js}"],
  theme: {
    extend: {
      colors: {
        "card-foreground": "hsl(210 40% 98%)",
        login: "hsl(220, 13%, 13%)",
      },
      container: {
        margin: "auto",
        padding: "2rem",
      },
    },
  },
  plugins: [],
};
