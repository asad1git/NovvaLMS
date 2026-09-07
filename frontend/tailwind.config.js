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
      // Additive elevation scale for the visual-polish pass — the locked
      // palette/radii above stay untouched, this just gives cards/buttons a
      // subtle sense of depth instead of a flat border only.
      boxShadow: {
        card: "0 1px 2px rgba(16,24,40,0.04), 0 1px 3px rgba(16,24,40,0.06)",
        "card-hover": "0 4px 10px rgba(16,24,40,0.08), 0 2px 4px rgba(16,24,40,0.04)",
      },
    },
  },
  plugins: [],
};
