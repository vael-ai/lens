import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, Download, BarChart3, Share2, Eye, Zap, Shield, TrendingUp } from "lucide-react";

export default function HomePage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
            {/* Header */}
            <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm">
                <div className="px-4 py-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600">
                                <Brain className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-gray-900">Vael AI Lens</h1>
                                <p className="text-sm text-gray-600">Browsing Intelligence Reports</p>
                            </div>
                        </div>
                        <Badge variant="outline" className="text-blue-700 border-blue-200 bg-blue-50">
                            Free Beta
                        </Badge>
                    </div>
                </div>
            </header>

            <main>
                {/* Hero Section */}
                <section className="px-4 py-20 mx-auto max-w-7xl sm:px-6 lg:px-8">
                    <div className="text-center">
                        <div className="mb-6">
                            <Badge className="text-purple-700 bg-purple-100 hover:bg-purple-100">
                                🚀 Powered by Gemini AI
                            </Badge>
                        </div>

                        <h1 className="mb-6 text-5xl font-bold text-gray-900 md:text-6xl">
                            Discover Your{" "}
                            <span className="text-transparent bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text">
                                Digital Personality
                            </span>
                        </h1>

                        <p className="max-w-3xl mx-auto mb-8 text-xl text-gray-600">
                            Get AI-powered insights into your browsing habits. Vael AI Lens analyzes your browsing
                            patterns to create personalized intelligence reports with beautiful visualizations.
                        </p>

                        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                            <Button
                                size="lg"
                                className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                            >
                                <Download className="w-5 h-5 mr-2" />
                                Install Extension
                            </Button>
                            <Button variant="outline" size="lg" className="px-8 py-3">
                                <Eye className="w-5 h-5 mr-2" />
                                View Sample Report
                            </Button>
                        </div>
                    </div>
                </section>

                {/* How it Works */}
                <section className="py-20 bg-white">
                    <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
                        <div className="mb-16 text-center">
                            <h2 className="mb-4 text-3xl font-bold text-gray-900">How It Works</h2>
                            <p className="text-lg text-gray-600">
                                Three simple steps to unlock your browsing intelligence
                            </p>
                        </div>

                        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
                            {/* Step 1 */}
                            <Card className="text-center">
                                <CardHeader>
                                    <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full">
                                        <Download className="w-8 h-8 text-blue-600" />
                                    </div>
                                    <CardTitle>1. Install & Setup</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-gray-600">
                                        Install the Vael AI Lens extension and enter your email to start collecting
                                        browsing data securely on your device.
                                    </p>
                                </CardContent>
                            </Card>

                            {/* Step 2 */}
                            <Card className="text-center">
                                <CardHeader>
                                    <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full">
                                        <TrendingUp className="w-8 h-8 text-green-600" />
                                    </div>
                                    <CardTitle>2. Browse Naturally</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-gray-600">
                                        Continue browsing as usual. The extension collects anonymous patterns and
                                        insights from your browsing behavior.
                                    </p>
                                </CardContent>
                            </Card>

                            {/* Step 3 */}
                            <Card className="text-center">
                                <CardHeader>
                                    <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-purple-100 rounded-full">
                                        <BarChart3 className="w-8 h-8 text-purple-600" />
                                    </div>
                                    <CardTitle>3. Generate Report</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-gray-600">
                                        Once you have enough data, generate your personalized AI report with insights,
                                        charts, and your unique browsing personality.
                                    </p>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </section>

                {/* Features */}
                <section className="py-20">
                    <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
                        <div className="mb-16 text-center">
                            <h2 className="mb-4 text-3xl font-bold text-gray-900">What You'll Discover</h2>
                            <p className="text-lg text-gray-600">
                                Your report includes personalized insights and beautiful visualizations
                            </p>
                        </div>

                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                            <div className="text-center">
                                <div className="flex items-center justify-center w-12 h-12 mx-auto mb-3 bg-blue-100 rounded-lg">
                                    <Brain className="w-6 h-6 text-blue-600" />
                                </div>
                                <h3 className="mb-2 font-semibold">Digital Personality</h3>
                                <p className="text-sm text-gray-600">
                                    Discover if you're a shopper, explorer, power multitasker, or another personality
                                    type
                                </p>
                            </div>

                            <div className="text-center">
                                <div className="flex items-center justify-center w-12 h-12 mx-auto mb-3 bg-green-100 rounded-lg">
                                    <BarChart3 className="w-6 h-6 text-green-600" />
                                </div>
                                <h3 className="mb-2 font-semibold">Usage Patterns</h3>
                                <p className="text-sm text-gray-600">
                                    See your browsing activity, session duration, and interaction patterns
                                </p>
                            </div>

                            <div className="text-center">
                                <div className="flex items-center justify-center w-12 h-12 mx-auto mb-3 bg-purple-100 rounded-lg">
                                    <TrendingUp className="w-6 h-6 text-purple-600" />
                                </div>
                                <h3 className="mb-2 font-semibold">Top Websites</h3>
                                <p className="text-sm text-gray-600">
                                    Analyze your most visited sites and categorize your interests
                                </p>
                            </div>

                            <div className="text-center">
                                <div className="flex items-center justify-center w-12 h-12 mx-auto mb-3 bg-orange-100 rounded-lg">
                                    <Share2 className="w-6 h-6 text-orange-600" />
                                </div>
                                <h3 className="mb-2 font-semibold">Social Sharing</h3>
                                <p className="text-sm text-gray-600">
                                    Share your insights on X (Twitter) and LinkedIn with engaging previews
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Privacy & Security */}
                <section className="py-20 bg-gray-50">
                    <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
                        <div className="max-w-3xl mx-auto text-center">
                            <div className="flex items-center justify-center w-16 h-16 mx-auto mb-6 bg-green-100 rounded-full">
                                <Shield className="w-8 h-8 text-green-600" />
                            </div>

                            <h2 className="mb-4 text-3xl font-bold text-gray-900">Privacy First</h2>
                            <p className="mb-8 text-lg text-gray-600">
                                Your browsing data stays on your device until you choose to generate a report. We only
                                collect anonymized patterns and insights - never your actual browsing history,
                                passwords, or personal information.
                            </p>

                            <div className="grid grid-cols-1 gap-6 text-left md:grid-cols-3">
                                <div className="p-4 bg-white rounded-lg">
                                    <h4 className="mb-2 font-semibold">🔒 Local Storage</h4>
                                    <p className="text-sm text-gray-600">Data is stored locally on your device</p>
                                </div>
                                <div className="p-4 bg-white rounded-lg">
                                    <h4 className="mb-2 font-semibold">🎭 Anonymized</h4>
                                    <p className="text-sm text-gray-600">No personal information is collected</p>
                                </div>
                                <div className="p-4 bg-white rounded-lg">
                                    <h4 className="mb-2 font-semibold">🗑️ Your Control</h4>
                                    <p className="text-sm text-gray-600">Delete your data anytime</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* CTA */}
                <section className="py-20">
                    <div className="max-w-4xl px-4 mx-auto text-center sm:px-6 lg:px-8">
                        <h2 className="mb-4 text-3xl font-bold text-gray-900">Ready to Discover Your Digital Self?</h2>
                        <p className="mb-8 text-lg text-gray-600">
                            Join thousands of users who've discovered their browsing personality with Vael AI Lens
                        </p>

                        <div className="flex flex-col justify-center gap-4 sm:flex-row">
                            <Button
                                size="lg"
                                className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                            >
                                <Download className="w-5 h-5 mr-2" />
                                Get Started Free
                            </Button>
                            <Button variant="outline" size="lg" className="px-8 py-3">
                                Learn More
                            </Button>
                        </div>
                    </div>
                </section>
            </main>

            {/* Footer */}
            <footer className="py-12 text-white bg-gray-900">
                <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
                        <div>
                            <div className="flex items-center mb-4 space-x-2">
                                <Brain className="w-6 h-6" />
                                <span className="font-bold">Vael AI</span>
                            </div>
                            <p className="text-sm text-gray-400">
                                Building AI tools to understand and enhance digital experiences.
                            </p>
                        </div>

                        <div>
                            <h4 className="mb-4 font-semibold">Product</h4>
                            <ul className="space-y-2 text-sm text-gray-400">
                                <li>
                                    <Link href="#" className="hover:text-white">
                                        Extension
                                    </Link>
                                </li>
                                <li>
                                    <Link href="#" className="hover:text-white">
                                        Reports
                                    </Link>
                                </li>
                                <li>
                                    <Link href="#" className="hover:text-white">
                                        Privacy
                                    </Link>
                                </li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="mb-4 font-semibold">Support</h4>
                            <ul className="space-y-2 text-sm text-gray-400">
                                <li>
                                    <Link href="#" className="hover:text-white">
                                        Help Center
                                    </Link>
                                </li>
                                <li>
                                    <Link href="#" className="hover:text-white">
                                        Contact
                                    </Link>
                                </li>
                                <li>
                                    <Link href="#" className="hover:text-white">
                                        Feedback
                                    </Link>
                                </li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="mb-4 font-semibold">Connect</h4>
                            <ul className="space-y-2 text-sm text-gray-400">
                                <li>
                                    <Link href="#" className="hover:text-white">
                                        Twitter
                                    </Link>
                                </li>
                                <li>
                                    <Link href="#" className="hover:text-white">
                                        LinkedIn
                                    </Link>
                                </li>
                                <li>
                                    <Link href="#" className="hover:text-white">
                                        GitHub
                                    </Link>
                                </li>
                            </ul>
                        </div>
                    </div>

                    <div className="pt-8 mt-8 text-sm text-center text-gray-400 border-t border-gray-800">
                        <p>&copy; 2024 Vael AI. All rights reserved. Built with privacy in mind.</p>
                    </div>
                </div>
            </footer>
        </div>
    );
}
