import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LensLogo } from "@/components/lens-logo";
import { Github } from "lucide-react";
import Image from "next/image";
import { Plus_Jakarta_Sans } from "next/font/google";

const plusJakarta = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["400","500","700"], display: "swap" });

export default function HomePage() {
  return (
    <div className={"flex flex-col min-h-screen text-white relative overflow-hidden " + plusJakarta.className}>
      {/* Navbar */}
      <nav className="px-6 py-4">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-2 text-white font-semibold text-lg">
            <LensLogo className="w-8 h-8" />
            <span>Lens by Vael</span>
          </div>
          <Link 
            href="https://github.com/vael-ai/lens" 
            target="_blank"
            className="text-gray-400 hover:text-white transition-colors"
          >
            <Github className="w-5 h-5" />
          </Link>
        </div>
      </nav> 

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-6">
        {/* Background image gradient */}
        <div 
          className="fixed inset-0 -z-50 w-full h-full"
          style={{
            backgroundImage: 'url(/backgroundgradient.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            backgroundAttachment: 'fixed',
            opacity: 0.35,
          }}
          aria-hidden="true"
        />
        {/* Dark overlay to ensure readability */}
        <div 
          className="fixed inset-0 -z-40 w-full h-full"
          style={{
            backgroundColor: 'rgba(20, 20, 26, 0.65)',
          }}
          aria-hidden="true"
        />
        <div className="text-center max-w-4xl mx-auto relative z-10">
          {/* Logo with gradient background */}
          <div className="relative inline-block mb-16">
            <div 
              className="absolute inset-0 w-32 h-32 mx-auto rounded-3xl opacity-80"
              style={{
                background: 'radial-gradient(circle at center, #8F8CF3 0%, #4F8DFD 40%, transparent 80%)',
                filter: 'blur(42px)',
              }}
            />
            <div className="relative bg-[#1a1a23] p-6 rounded-3xl border border-gray-800">
              <LensLogo className="w-20 h-20" />
            </div>
          </div>

          {/* Hero Text */}
          <h1 className="text-5xl md:text-6xl font-semibold mb-6 tracking-tight">
            The next generation<br />of browsing intelligence
          </h1>
          <p className="text-lg text-gray-300 mb-10 max-w-2xl mx-auto">
            Lens by Vael is an <b className="text-white font-semibold">open source</b>, privacy-first browser extension that transforms your browsing data into beautiful, actionable insights—giving you control and context across the AI-powered web.
          </p>
          {/* CTA Buttons */}
          <div className="flex items-center justify-center gap-4 relative z-20">
            <Button 
              size="lg" 
              className="bg-white text-black hover:bg-gray-100 px-6 py-3 font-medium transition-colors btn-pop"
            >
              Install Extension <span className="arrow-slide">→</span>
            </Button>
            <Link
              href="https://twitter.com/vael_ai/status/1789380050480199922"
              target="_blank"
              className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium bg-[#1a1a23] border border-gray-800 rounded-lg hover:border-gray-700 transition-colors btn-pop"
            >
              <span>View a demo</span>
              <span className="text-gray-500 arrow-bounce">↗</span>
            </Link>
          </div> 
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 pb-4 pt-3">
        <div className="max-w-6xl mx-auto flex flex-row items-center justify-center gap-2 text-center">
          <span className="text-sm text-gray-400">Brought to you by</span>
          <Link
            href="https://vael.ai"
            target="_blank"
            className="inline-flex items-center gap-1 align-middle group"
            style={{ verticalAlign: "middle" }}
          >
            <Image src="/vael logo[1].PNG" alt="Vael Logo" width={32} height={32} className="rounded align-middle" />
            <span className="text-xs font-normal text-gray-300">Vael</span>
          </Link>
        </div>
      </footer>
    </div>
  );
}
