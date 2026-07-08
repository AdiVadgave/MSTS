/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Shell brand (highway-signage palette)
        shell: {
          yellow: "#FBCE07",
          "yellow-deep": "#F0B800",
          red: "#DD1D21",
          asphalt: "#161310",
          "asphalt-2": "#211D18",
          "asphalt-line": "#332D25",
          paper: "#FAF7F0",
          "paper-2": "#F1ECE0",
          ink: "#1A1712",
          grey: "#6B6459",
          sign: "#1B3A8B",
          ok: "#3FB984",
        },
        brand: {
          accent: "rgb(var(--brand-accent) / <alpha-value>)",
          "accent-deep": "rgb(var(--brand-accent-deep) / <alpha-value>)",
          "on-accent": "rgb(var(--brand-on-accent) / <alpha-value>)",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          foreground: "hsl(var(--info-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ["var(--font-body)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      boxShadow: {
        card: "0 1px 2px 0 rgb(26 23 18 / 0.05), 0 1px 3px 0 rgb(26 23 18 / 0.06)",
        "card-hover":
          "0 6px 18px -4px rgb(26 23 18 / 0.12), 0 2px 6px -2px rgb(26 23 18 / 0.06)",
        pop: "0 24px 48px -16px rgb(26 23 18 / 0.35)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        "ticker-scroll": {
          to: { transform: "translateX(-50%)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
        ticker: "ticker-scroll 34s linear infinite",
      },
      backgroundImage: {
        "signage-stripes":
          "repeating-linear-gradient(90deg,transparent 0 78px,rgba(0,0,0,.045) 78px 80px)",
        "signage-dash": "var(--motif-dash)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
