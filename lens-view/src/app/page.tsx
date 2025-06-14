import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LensLogo } from "@/components/lens-logo";
import { ArrowRight } from "lucide-react";
import { FaGithub } from "react-icons/fa";
import Image from "next/image";
import { Plus_Jakarta_Sans } from "next/font/google";

const plusJakarta = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["400", "500", "700"], display: "swap" });

export default function HomePage() {
    return (
        <div className={"min-h-screen flex flex-col text-white relative overflow-hidden " + plusJakarta.className}>
            {/* Enhanced gradient background */}
            <div
                className="fixed inset-0 w-full h-full -z-50"
                style={{
                    background: `
                        radial-gradient(circle at 30% 20%, #8F8CF3 0%, transparent 50%),
                        radial-gradient(circle at 80% 80%, #4F8DFD 5%, transparent 50%),
                        radial-gradient(circle at 40% 40%, #6366f1 5%, transparent 50%),
                        linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%)
                    `,
                }}
                aria-hidden="true"
            />

            {/* Subtle overlay for better readability */}
            <div
                className="fixed inset-0 w-full h-full -z-40"
                style={{
                    backgroundColor: "rgba(10, 10, 20, 0.4)",
                }}
                aria-hidden="true"
            />

            {/* Navbar - Responsive sizing */}
            <nav className="flex-shrink-0 px-4 py-4 sm:px-6 sm:py-5 lg:px-10 lg:py-7">
                <div className="flex items-center justify-between max-w-6xl mx-auto">
                    <div className="flex items-center gap-2 text-lg font-medium text-white sm:gap-3 sm:text-xl">
                        <LensLogo className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12" />
                        <span>lens by vael</span>
                    </div>
                    <Link
                        href="https://use.vael.ai/lens-github"
                        target="_blank"
                        className="text-gray-400 transition-colors hover:text-white"
                    >
                        <FaGithub className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7" />
                    </Link>
                </div>
            </nav>

            {/* Main Content - Responsive and centered */}
            <main className="flex items-center justify-center flex-grow px-4 overflow-y-auto sm:px-6">
                <div className="relative z-10 max-w-4xl py-8 mx-auto text-center hero-compact">
                    {/* Logo with hover popup effect - Responsive sizing */}
                    <div className="relative inline-block mb-6 sm:mb-8 group">
                        <div
                            className="absolute inset-0 w-20 h-20 mx-auto transition-opacity duration-300 sm:w-24 sm:h-24 lg:w-32 lg:h-32 2xl:w-40 2xl:h-40 rounded-2xl sm:rounded-3xl opacity-30 group-hover:opacity-50 hero-lens-blur"
                            style={{
                                background:
                                    "radial-gradient(ellipse 120% 100% at center, #8F8CF3 0%, #4F8DFD 25%, transparent 60%)",
                            }}
                        />
                        <div className="relative bg-[#1a1a2e]/90 backdrop-blur-sm p-4 sm:p-5 lg:p-6 2xl:p-8 rounded-2xl sm:rounded-3xl border border-gray-700/50 group-hover:border-gray-600/70 transition-all duration-300 group-hover:scale-105 group-hover:-translate-y-2 group-hover:shadow-xl group-hover:shadow-purple-500/20 will-change-transform">
                            <LensLogo className="w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 2xl:w-24 2xl:h-24 hero-lens" />
                        </div>
                    </div>

                    {/* Hero Text with better responsive spacing */}
                    <h1 className="mb-4 text-3xl font-semibold leading-tight tracking-tight sm:mb-5 sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl">
                        The next generation
                        <br />
                        <span className="hidden sm:inline">of browsing intelligence</span>
                        <span className="sm:hidden">of browsing AI</span>
                    </h1>
                    <p className="max-w-2xl mx-auto mb-6 text-sm leading-relaxed text-gray-300 sm:text-base lg:text-lg">
                        lens is an <b className="font-semibold text-white">open-source</b>,{" "}
                        <b className="font-semibold text-white">privacy-first</b> browser extension that captures and
                        analyzes your browser activity with <b className="font-semibold text-white">full control</b>{" "}
                        over your data.
                        <br className="hidden sm:inline" />
                        <span className="hidden sm:inline">
                            Get <b className="font-semibold text-white">detailed insights</b> into your browsing habits.
                        </span>
                    </p>

                    {/* CTA Buttons - Responsive stacking */}
                    <div className="relative z-20 flex flex-col items-center justify-center flex-shrink-0 gap-3 sm:flex-row sm:gap-4">
                        <Link
                            href="https://use.vael.ai/lens"
                            target="_blank"
                            className="inline-flex items-center justify-center w-full h-12 gap-2 px-4 py-3 text-sm font-medium text-black transition-all duration-300 bg-white border rounded-lg sm:w-48 lg:w-52 sm:h-14 sm:px-6 sm:py-4 sm:text-base backdrop-blur-sm border-gray-700/50 hover:border-gray-600/70 hover:bg-gray-100 btn-pop"
                        >
                            Install Extension <ArrowRight className="w-4 h-4 arrow-slide" />
                        </Link>
                        <Link
                            href="https://x.com/navincodesalot/status/1933281384438677835"
                            target="_blank"
                            className="inline-flex items-center justify-center gap-2 w-full sm:w-48 lg:w-52 h-12 sm:h-14 px-4 sm:px-6 py-3 sm:py-4 text-sm sm:text-base font-medium bg-[#1a1a2e]/80 backdrop-blur-sm border border-gray-700/50 rounded-lg hover:border-gray-600/70 hover:bg-[#1a1a2e]/90 transition-all duration-300 btn-pop"
                        >
                            <span>View a demo</span>
                            <span className="text-gray-400 arrow-bounce">↗</span>
                        </Link>
                    </div>
                </div>
            </main>

            {/* Footer - "brought to you by" */}
            <footer className="flex-shrink-0 px-4 py-4 sm:px-6 lg:px-8 sm:py-5 lg:py-6">
                <div className="flex flex-col items-center justify-center max-w-6xl mx-auto text-center">
                    <div className="flex flex-row items-center gap-1 mb-3">
                        <span className="text-xs text-gray-400 sm:text-sm lg:text-base">Brought to you by</span>
                        <Link
                            href="https://vael.ai"
                            target="_blank"
                            className="inline-flex items-center gap-1 align-middle transition-all duration-300 group hover:scale-105 hover:-translate-y-1"
                            style={{ verticalAlign: "middle" }}
                        >
                            <Image
                                src="/vael-logo.png"
                                alt="Vael Logo"
                                width={24}
                                height={24}
                                className="align-middle transition-all duration-300 rounded group-hover:shadow-lg group-hover:shadow-blue-500/20 sm:w-6 sm:h-6 lg:w-8 lg:h-8"
                            />
                            <span className="text-xs font-normal text-white sm:text-sm lg:text-base">Vael</span>
                        </Link>
                    </div>
                    <Link
                        href="/legal/privacy-policy"
                        className="text-xs text-gray-500 transition-all duration-200 opacity-75 hover:opacity-100 hover:text-gray-300"
                    >
                        Privacy Policy
                    </Link>
                </div>
            </footer>
        </div>
    );
}
