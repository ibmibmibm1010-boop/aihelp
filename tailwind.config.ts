import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1A202C",
        vibe: {
          purple: "#9D27FF",
          canvas: "#F7FAFC",
          line: "#E2E8F0",
          muted: "#64748B",
        },
        kanban: {
          void: "#0c0c14",
          surface: "#1a1a2e",
          card: "#252538",
          line: "#3d3d5c",
          muted: "#94a3b8",
          subtle: "#64748b",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
      },
      borderRadius: {
        vibe: "14px",
        "kanban-col": "1.25rem",
        "kanban-card": "0.75rem",
      },
      keyframes: {
        kanbanColIn: {
          "0%": { opacity: "0", transform: "translateY(1rem)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        kanbanCardIn: {
          "0%": { opacity: "0", transform: "translateY(0.5rem) scale(0.98)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        modalBackdropIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        modalDialogIn: {
          "0%": { opacity: "0", transform: "translateY(0.75rem) scale(0.97)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
      },
      animation: {
        "kanban-col-in":
          "kanbanColIn 0.55s cubic-bezier(0.22, 1, 0.36, 1) both",
        "kanban-card-in":
          "kanbanCardIn 0.42s cubic-bezier(0.22, 1, 0.36, 1) both",
        "modal-backdrop-in": "modalBackdropIn 0.22s ease-out both",
        "modal-dialog-in": "modalDialogIn 0.32s cubic-bezier(0.22, 1, 0.36, 1) both",
      },
    },
  },
  plugins: [],
};

export default config;
