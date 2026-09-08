/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Locked design system — exact values from the 7 reference
        // prototypes in design-system/*.html (design-system/*.html's own
        // :root custom properties, confirmed identical across all 7 files).
        navy: "#1F3864",
        "navy-dark": "#152847",
        "navy-hover": "#253f74",
        "navy-light": "#2E75B6", // the reference calls this "--blue" — kept
        // under its pre-existing app name since it's used ~100+ places already.
        "bg-page": "#F4F6F9",
        "text-main": "#1a2332",
        "text-muted": "#64748b",
        line: "#e2e8f0", // reference "--border" — named to avoid clashing
        // with Tailwind's own border-* utility family.
        success: "#1E8449",
        "badge-blue-bg": "#E6F1FB",
        "badge-blue-text": "#0C447C",
        "badge-amber-bg": "#FAEEDA",
        "badge-amber-text": "#633806",
        "badge-green-bg": "#EAF3DE",
        "badge-green-text": "#27500A",
        "badge-red-bg": "#fdf0f0",
        "badge-red-text": "#A32D2D",
      },
      fontFamily: {
        sans: ["Inter", "Arial", "sans-serif"],
      },
      borderRadius: {
        card: "8px",
        input: "4px",
      },
      boxShadow: {
        card: "0 1px 4px rgba(0,0,0,0.07)",
        "card-hover": "0 4px 20px rgba(0,0,0,0.1)",
      },
    },
  },
  plugins: [],
};
