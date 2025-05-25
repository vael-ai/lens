import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LensLogo } from "@/components/lens-logo";
import { Github, ArrowRight } from "lucide-react";
import Image from "next/image";
import { Plus_Jakarta_Sans } from "next/font/google";

const plusJakarta = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["400", "500", "700"], display: "swap" });

export default function HomePage() {
    return (
        <div
            className={
                "min-h-screen h-screen max-h-screen flex flex-col text-white relative overflow-hidden " +
                plusJakarta.className
            }
        >
            {/* Enhanced gradient background */}
            <div
                className="fixed inset-0 w-full h-full -z-50"
                style={{
                    background: `
                        radial-gradient(circle at 30% 20%, #8F8CF3 0%, transparent 50%),
                        radial-gradient(circle at 80% 80%, #4F8DFD 0%, transparent 50%),
                        radial-gradient(circle at 40% 40%, #6366f1 0%, transparent 50%),
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

            {/* Navbar - Further increased scale */}
            <nav className="flex-shrink-0 px-10 py-7">
                <div className="flex items-center justify-between max-w-6xl mx-auto">
                    <div className="flex items-center gap-3 text-xl font-medium text-white">
                        <LensLogo className="w-12 h-12" />
                        <span>lens by vael</span>
                    </div>
                    <Link
                        href="https://github.com/vael-ai/lens"
                        target="_blank"
                        className="text-gray-400 transition-colors hover:text-white"
                    >
                        <Github className="w-7 h-7" />
                    </Link>
                </div>
            </nav>

            {/* Main Content - flex-grow to fill available space */}
            <main className="flex items-center justify-center flex-grow px-6">
                <div className="relative z-10 max-w-4xl mx-auto text-center">
                    {/* Logo with hover popup effect */}
                    <div className="relative inline-block mb-8 group">
                        <div
                            className="absolute inset-0 w-32 h-32 mx-auto transition-opacity duration-300 rounded-3xl opacity-60 group-hover:opacity-80"
                            style={{
                                background:
                                    "radial-gradient(circle at center, #8F8CF3 0%, #4F8DFD 40%, transparent 80%)",
                                filter: "blur(35px)",
                            }}
                        />
                        <div className="relative bg-[#1a1a2e]/90 backdrop-blur-sm p-6 rounded-3xl border border-gray-700/50 group-hover:border-gray-600/70 transition-all duration-300 group-hover:scale-105 group-hover:-translate-y-2 group-hover:shadow-xl group-hover:shadow-purple-500/20">
                            <LensLogo className="w-20 h-20 hero-lens" />
                        </div>
                    </div>

                    {/* Hero Text with better spacing */}
                    <h1 className="mb-5 text-5xl font-semibold leading-tight tracking-tight md:text-6xl lg:text-7xl">
                        The next generation
                        <br />
                        of browsing intelligence
                    </h1>
                    <p className="max-w-2xl mx-auto mb-6 text-base leading-relaxed text-gray-300 md:text-lg">
                        Lens is an <b className="font-semibold text-white">open-source</b>,{" "}
                        <b className="font-semibold text-white">privacy-first</b> browser extension that captures and
                        analyzes your browser activity with <b className="font-semibold text-white">full control</b>{" "}
                        over your data.
                        <br /> Get <b className="font-semibold text-white">detailed insights</b> into your browsing
                        habits.
                    </p>

                    {/* CTA Buttons */}
                    <div className="relative z-20 flex flex-wrap items-center justify-center gap-4">
                        <Button
                            size="lg"
                            className="flex items-center justify-center gap-2 px-6 py-4 text-base font-medium text-black transition-all duration-300 bg-white w-52 h-14 hover:bg-gray-100 btn-pop"
                        >
                            Install Extension <ArrowRight className="w-4 h-4 arrow-slide" />
                        </Button>
                        <Link
                            href="https://twitter.com/vael_ai/status/1789380050480199922"
                            target="_blank"
                            className="inline-flex items-center justify-center gap-2 w-52 h-14 px-6 py-4 text-base font-medium bg-[#1a1a2e]/80 backdrop-blur-sm border border-gray-700/50 rounded-lg hover:border-gray-600/70 hover:bg-[#1a1a2e]/90 transition-all duration-300 btn-pop"
                        >
                            <span>View a demo</span>
                            <span className="text-gray-400 arrow-bounce">↗</span>
                        </Link>
                    </div>
                </div>
            </main>

            {/* Footer - Fixed spacing with new logo */}
            <footer className="flex-shrink-0 px-8 py-6">
                <div className="flex flex-row items-center justify-center max-w-6xl gap-1 mx-auto text-center">
                    <span className="text-base text-gray-400">Brought to you by</span>
                    <Link
                        href="https://vael.ai"
                        target="_blank"
                        className="inline-flex items-center gap-1 align-middle transition-all duration-300 group hover:scale-105 hover:-translate-y-1"
                        style={{ verticalAlign: "middle" }}
                    >
                        <Image
                            src="/vael-logo.png"
                            alt="Vael Logo"
                            width={32}
                            height={32}
                            className="align-middle transition-all duration-300 rounded group-hover:shadow-lg group-hover:shadow-blue-500/20"
                        />
                        <span className="text-base font-normal text-white">Vael</span>
                    </Link>
                </div>
            </footer>
        </div>
    );
}
