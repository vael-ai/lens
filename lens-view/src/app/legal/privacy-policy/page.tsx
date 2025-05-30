import Link from "next/link";
import { LensLogo } from "@/components/lens-logo";
import { FaGithub } from "react-icons/fa";
import Image from "next/image";
import { Plus_Jakarta_Sans } from "next/font/google";

const plusJakarta = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["400", "500", "700"], display: "swap" });

export default function PrivacyPolicyPage() {
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

            {/* Navbar - Same as main page */}
            <nav className="flex-shrink-0 px-4 py-4 sm:px-6 sm:py-5 lg:px-10 lg:py-7">
                <div className="flex items-center justify-between max-w-6xl mx-auto">
                    <Link
                        href="/"
                        className="flex items-center gap-2 text-lg font-medium text-white transition-opacity sm:gap-3 sm:text-xl hover:opacity-80"
                    >
                        <LensLogo className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12" />
                        <span>lens by vael</span>
                    </Link>
                    <Link
                        href="https://github.com/vael-ai/lens"
                        target="_blank"
                        className="text-gray-400 transition-colors hover:text-white"
                    >
                        <FaGithub className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7" />
                    </Link>
                </div>
            </nav>

            {/* Main Content */}
            <main className="flex-grow px-4 py-8 overflow-y-auto sm:px-6">
                <div className="max-w-4xl mx-auto">
                    <h1 className="mb-8 text-3xl font-semibold text-center sm:text-4xl">Privacy Policy</h1>

                    <div className="bg-[#1a1a2e]/80 backdrop-blur-sm p-6 sm:p-8 rounded-2xl border border-gray-700/50 space-y-6">
                        <div>
                            <h2 className="mb-3 text-xl font-semibold text-white">Our Commitment to Privacy</h2>
                            <p className="leading-relaxed text-gray-300">
                                At lens by vael, we believe privacy is a fundamental right. We are committed to
                                protecting your personal information and being transparent about how we collect, use,
                                and share data.
                            </p>
                        </div>

                        <div>
                            <h2 className="mb-3 text-xl font-semibold text-white">Information We Collect</h2>
                            <p className="mb-4 leading-relaxed text-gray-300">
                                lens is designed with privacy-first principles. The extension operates primarily on your
                                local device:
                            </p>
                            <ul className="ml-6 space-y-2 text-gray-300">
                                <li className="list-disc">• Browsing data is processed locally on your device</li>
                                <li className="list-disc">• You have full control over what data is shared</li>
                                <li className="list-disc">
                                    • Optional analytics reports are generated only with your explicit consent
                                </li>
                                <li className="list-disc">
                                    • No personal browsing data is stored on our servers without your permission
                                </li>
                            </ul>
                        </div>

                        <div>
                            <h2 className="mb-3 text-xl font-semibold text-white">How We Use Your Information</h2>
                            <p className="leading-relaxed text-gray-300">
                                When you choose to generate and share reports, we use this information solely to provide
                                you with insights about your browsing patterns. We do not sell, rent, or share your
                                personal data with third parties for commercial purposes.
                            </p>
                        </div>

                        <div>
                            <h2 className="mb-3 text-xl font-semibold text-white">Your Rights and Choices</h2>
                            <ul className="ml-6 space-y-2 text-gray-300">
                                <li className="list-disc">• You can delete your data at any time</li>
                                <li className="list-disc">• You control what information is shared</li>
                                <li className="list-disc">• You can opt out of data collection completely</li>
                                <li className="list-disc">• All data processing happens with your explicit consent</li>
                            </ul>
                        </div>

                        <div>
                            <h2 className="mb-3 text-xl font-semibold text-white">Open Source Transparency</h2>
                            <p className="leading-relaxed text-gray-300">
                                lens is open-source software. You can review our code, understand exactly how your data
                                is processed, and contribute to making the extension even more privacy-focused. Visit
                                our GitHub repository to learn more.
                            </p>
                        </div>

                        <div>
                            <h2 className="mb-3 text-xl font-semibold text-white">Contact Us</h2>
                            <p className="leading-relaxed text-gray-300">
                                If you have any questions about this privacy policy or our data practices, please
                                contact us through our GitHub repository or reach out to us at{" "}
                                <Link
                                    href="mailto:support@vael.ai"
                                    className="text-blue-400 underline hover:text-blue-300"
                                >
                                    support@vael.ai
                                </Link>
                                .
                            </p>
                        </div>

                        <div className="pt-4 border-t border-gray-700/50">
                            <p className="text-sm text-gray-400">
                                Last updated:{" "}
                                {new Date().toLocaleDateString("en-US", {
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                })}
                            </p>
                        </div>
                    </div>
                </div>
            </main>

            {/* Footer - Same as main page */}
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
                        className="text-xs text-gray-500 opacity-75 hover:opacity-100 hover:text-gray-300 transition-all duration-200"
                    >
                        Privacy Policy
                    </Link>
                </div>
            </footer>
        </div>
    );
}
