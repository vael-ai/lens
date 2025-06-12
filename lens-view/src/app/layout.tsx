import "@/styles/globals.css";

import { type Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";

export const metadata: Metadata = {
    metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || "https://lens.vael.ai"),
    title: "lens by vael - The next generation of browsing intelligence",
    description: "Open-source, privacy-first browser extension for detailed insights into your browsing habits.",
    icons: [{ rel: "icon", url: "/favicon.ico" }],
    keywords: [
        "lens",
        "vael",
        "lens by vael",
        "browser extension",
        "privacy",
        "open source",
        "browsing analytics",
        "browser intelligence",
        "data privacy",
    ],
    authors: [{ name: "Vael AI", url: "https://vael.ai" }],
    creator: "Vael AI",
    publisher: "Vael AI",
    openGraph: {
        type: "website",
        locale: "en_US",
        url: "https://lens.vael.ai",
        siteName: "lens by vael- Browsing Intelligence",
        title: "lens by vael - The Next Generation of Browsing Intelligence",
        description: "Open-source, privacy-first browser extension for detailed insights into your browsing habits.",
        images: [
            {
                url: "/lens_homepage.png",
                alt: "lens by vael- Browsing Intelligence by Vael",
            },
        ],
    },
    twitter: {
        card: "summary_large_image",
        site: "@Vael_AI",
        creator: "@Vael_AI",
        title: "lens by vael - The Next Generation of Browsing Intelligence",
        description: "Open-source, privacy-first browser extension for detailed insights into your browsing habits.",
        images: ["/lens_homepage.png"],
    },
};

export const viewport = {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: "cover",
};

const plusJakartaSans = Plus_Jakarta_Sans({
    variable: "--font-plus-jakarta-sans",
    subsets: ["latin"],
    weight: "400",
});

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    return (
        <html lang="en" className={`${plusJakartaSans.variable}`}>
            <body>
                <TooltipProvider>{children}</TooltipProvider>
            </body>
        </html>
    );
}
