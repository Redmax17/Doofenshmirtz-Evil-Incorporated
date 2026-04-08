// theme.ts (Chakra UI v3)
import { createSystem, defaultConfig, defineConfig } from "@chakra-ui/react";

const config = defineConfig({
  // Global CSS in v3 lives here (NOT theme.styles)
  globalCss: {
    "html, body": {
      margin: 0,
      padding: 0,
    },

    // Optional: consistent focus ring (nice for accessibility)
    "*:focus-visible": {
      outline: "2px solid",
      outlineColor: "brand.500",
      outlineOffset: "2px",
    },
  },

  theme: {
    tokens: {
      colors: {
        // From your screenshot palette:
        // #9282BA, #6F65A0, #656A62, #5DC89B, #73F3BD

        brand: {
          50: { value: "#f4f1fb" },
          100: { value: "#e5ddf6" },
          200: { value: "#cfc0ee" },
          300: { value: "#b8a3e5" },
          400: { value: "#a187d6" },
          500: { value: "#9282ba" }, // primary purple
          550:{ value : "#7C69AF"},
          600: { value: "#6f65a0" }, // deep purple
          700: { value: "#565a62" }, // slate-ish (ties to your grey)
          800: { value: "#3b3f45" },
          900: { value: "#1f2327" },
        },

        accent: {
          300: { value: "#A8E1C9"}, // light-mint
          400: { value: "#5dc89b" }, // mint
          500: { value: "#73f3bd" }, // bright mint
        },

        slate: {
          500: { value: "#656a62" }, // exact palette grey
        },

        //Used for negative values or losses on transactions; can also be used for close or exit buttons or error mesages.
        negatives: { 
            100: { value: "#FFC8C8"},
            200: { value: "#FF5C5C"},
            250: { value: "#FF2E2E"},
            300: { value: "#FF0000"},
            400: { value: "#A30000"},
        }
      },

      radii: {
        sm: { value: "10px" },
        md: { value: "14px" },
        lg: { value: "18px" },
        xl: { value: "22px" },
      },

      shadows: {
        sm: { value: "0 6px 16px rgba(31,35,39,0.08)" },
        md: { value: "0 10px 30px rgba(31,35,39,0.10)" },
      },

      fonts: {
        heading: {
          value:
            "Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
        },
        body: {
          value:
            "Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
        },
      },
    },

    // These are handy “semantic” names you can use everywhere
    semanticTokens: {
      colors: {
        bgCanvas: { value: { base: "#f7f7f8" } },
        bgSurface: { value: { base: "#ffffff" } },
        borderSubtle: { value: { base: "rgba(31,35,39,0.12)" } },
        textStrong: { value: { base: "{colors.brand.900}" } },
        textMuted: { value: { base: "{colors.brand.700}" } },
      },
    },
  },
});

export const system = createSystem(defaultConfig, config);
