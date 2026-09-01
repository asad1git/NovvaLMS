/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Locked design system from the Phase 2 SDS / prototypes
        navy: "#1F3864",
        "navy-light": "#2E75B6",
        "bg-page": "#F4F6F9",
        "badge-blue-bg": "#E6F1FB",
        "badge-blue-text": "#0C447C",
        "badge-amber-bg": "#FAEEDA",
        "badge-amber-text": "#633806",
        "badge-green-bg": "#EAF3DE",
        "badge-green-text": "#27500A",
        "badge-red-bg": "#FCEBEB",
        "badge-red-text": "#791F1F",
      },
      fontFamily: {
        sans: ["Inter", "Arial", "sans-serif"],
      },
      borderRadius: {
        card: "8px",
      },
    },
  },
  plugins: [],
};
