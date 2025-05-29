/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    darkMode: "class",
    theme: {
        extend: {
            colors: {
                border: "var(--border)",
                input: "var(--input)",
                ring: "var(--ring)",
                background: "var(--background)",
                foreground: "var(--foreground)",
                primary: {
                    DEFAULT: "var(--primary)",
                    foreground: "var(--primary-foreground)",
                },
                secondary: {
                    DEFAULT: "var(--secondary)",
                    foreground: "var(--secondary-foreground)",
                },
                muted: {
                    DEFAULT: "var(--muted)",
                    foreground: "var(--muted-foreground)",
                },
                accent: {
                    DEFAULT: "var(--accent)",
                    foreground: "var(--accent-foreground)",
                },
                card: {
                    DEFAULT: "var(--card)",
                    foreground: "var(--card-foreground)",
                },
                destructive: {
                    DEFAULT: "var(--destructive)",
                    foreground: "var(--destructive-foreground)",
                },
                popover: {
                    DEFAULT: "var(--popover)",
                    foreground: "var(--popover-foreground)",
                },
                context: {
                    primary: "var(--context-primary)",
                    secondary: "var(--context-secondary)",
                    accent: "var(--context-accent)",
                    highlight: "var(--context-highlight)",
                    glow: "var(--context-glow)",
                },
            },
            borderRadius: {
                lg: "var(--radius)",
                md: "calc(var(--radius) - 2px)",
                sm: "calc(var(--radius) - 4px)",
            },
            keyframes: {
                float: {
                    "0%, 100%": { transform: "translateY(0)" },
                    "50%": { transform: "translateY(-10px)" },
                },
                twinkle: {
                    "0%, 100%": { opacity: "1" },
                    "50%": { opacity: "0.5" },
                },
                shooting: {
                    "0%": {
                        transform: "translateX(0) translateY(0)",
                        opacity: "1",
                    },
                    "100%": {
                        transform: "translateX(-300px) translateY(300px)",
                        opacity: "0",
                    },
                },
            },
            animation: {
                float: "float 6s ease-in-out infinite",
                "float-delay-1": "float 6s ease-in-out 1s infinite",
                "float-delay-2": "float 6s ease-in-out 2s infinite",
                "float-delay-3": "float 6s ease-in-out 3s infinite",
                twinkle: "twinkle 3s ease-in-out infinite",
                shooting: "shooting 3s linear forwards",
            },
            backgroundImage: {
                "gradient-cosmic": "url('/blur-gradient-haikei.png')",
            },
        },
    },
};
