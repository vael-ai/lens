import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Report - Lens by Vael",
    description: "Private browsing intelligence report - access requires valid credentials.",
    robots: {
        index: false,
        follow: false,
        noarchive: true,
        nosnippet: true,
        noimageindex: true,
    },
};

export default function ReportsLayout({ children }: { children: React.ReactNode }) {
    return children;
}
