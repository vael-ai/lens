"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { LoadingScreen } from "@/components/loading-screen";
import { ReportCharts } from "@/components/report-charts";
import { SocialShare } from "@/components/social-share";
import { AlertCircle, Brain, Clock, Mouse, TrendingUp } from "lucide-react";

interface Report {
    userProfileSummary: {
        dailyActivityLevel: "low" | "moderate" | "high";
        averageSessionDurationMinutes: number;
        averageTabsPerSession: number;
        commonTabGroups: string[][];
    };
    topWebsites: Array<{
        domain: string;
        visitCount: number;
        totalFocusTimeMinutes: number;
        inferredCategory: "shopping" | "travel" | "productivity" | "news" | "miscellaneous";
        confidence: number;
    }>;
    interactionPatterns: {
        mostCommonInteractionType: "click" | "scroll" | "hover" | "input" | "selection";
        averageScrollDepth?: number;
        averageInputFocusTimeMs?: number;
    };
    ecommerceInsights?: {
        topCategories: string[];
        averageViewedPriceRange?: {
            min: number;
            max: number;
            currency: string;
        };
    };
    travelInsights?: {
        topDestinations: string[];
        preferredTransport?: string;
    };
    inferredUserPersona:
        | "shopper"
        | "productiveProfessional"
        | "explorer"
        | "newsSeeker"
        | "passiveBrowser"
        | "powerMultitasker";
    chartData: {
        focusTimeByDomain: Array<{ domain: string; focusTimeMinutes: number }>;
        visitCountByCategory: Array<{ category: string; visitCount: number }>;
        sessionActivityOverTime: Array<{ date: string; sessions: number; averageSessionDuration: number }>;
        interactionTypeBreakdown: Array<{ type: string; count: number }>;
        scrollDepthOverTime?: Array<{ timestamp: string; scrollDepth: number }>;
    };
}

export default function ReportPage() {
    const params = useParams();
    const slug = params.slug as string;

    const [report, setReport] = useState<Report | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [generatedAt, setGeneratedAt] = useState<string | null>(null);

    useEffect(() => {
        const fetchReport = async () => {
            try {
                const response = await fetch(`/api/generate-report/${slug}`);
                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || "Failed to fetch report");
                }

                setReport(data.report);
                setGeneratedAt(data.generatedAt);
            } catch (err) {
                setError(err instanceof Error ? err.message : "Unknown error occurred");
            } finally {
                setLoading(false);
            }
        };

        void fetchReport();
    }, [slug]);

    if (loading) {
        return <LoadingScreen />;
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen p-4 bg-gradient-to-br from-gray-50 to-gray-100">
                <Card className="max-w-md mx-auto">
                    <CardContent className="pt-6">
                        <div className="flex items-center mb-4 space-x-2 text-red-600">
                            <AlertCircle className="w-5 h-5" />
                            <span className="font-medium">Error</span>
                        </div>
                        <p className="mb-4 text-gray-600">{error}</p>
                        <Button onClick={() => window.location.reload()} className="w-full">
                            Try Again
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!report) {
        return <div>No report found</div>;
    }

    const getPersonaIcon = (persona: string) => {
        switch (persona) {
            case "shopper":
                return "🛍️";
            case "productiveProfessional":
                return "💼";
            case "explorer":
                return "🌍";
            case "newsSeeker":
                return "📰";
            case "passiveBrowser":
                return "🌐";
            case "powerMultitasker":
                return "⚡";
            default:
                return "👤";
        }
    };

    const getActivityBadgeColor = (level: string) => {
        switch (level) {
            case "high":
                return "bg-green-500";
            case "moderate":
                return "bg-yellow-500";
            case "low":
                return "bg-gray-500";
            default:
                return "bg-gray-500";
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
            {/* Header */}
            <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm">
                <div className="px-4 py-6 mx-auto max-w-7xl sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Your Browsing Intelligence Report</h1>
                            <p className="mt-1 text-gray-600">Powered by Vael AI</p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-gray-500">Generated at</p>
                            <p className="text-sm font-medium">
                                {generatedAt ? new Date(generatedAt).toLocaleString() : "Recent"}
                            </p>
                        </div>
                    </div>
                </div>
            </header>

            <main className="px-4 py-8 mx-auto max-w-7xl sm:px-6 lg:px-8">
                {/* User Profile Summary */}
                <Card className="mb-8">
                    <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                            <Brain className="w-5 h-5" />
                            <span>Your Digital Profile</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
                            <div className="text-center">
                                <div className="mb-2 text-4xl">{getPersonaIcon(report.inferredUserPersona)}</div>
                                <h3 className="text-lg font-semibold capitalize">
                                    {report.inferredUserPersona.replace(/([A-Z])/g, " $1").trim()}
                                </h3>
                                <p className="text-sm text-gray-600">Your browsing persona</p>
                            </div>

                            <div className="text-center">
                                <Badge
                                    className={`${getActivityBadgeColor(report.userProfileSummary.dailyActivityLevel)} text-white mb-2`}
                                >
                                    {report.userProfileSummary.dailyActivityLevel.toUpperCase()}
                                </Badge>
                                <h3 className="font-semibold">Activity Level</h3>
                                <p className="text-sm text-gray-600">Daily browsing intensity</p>
                            </div>

                            <div className="text-center">
                                <div className="flex items-center justify-center mb-2 space-x-1">
                                    <Clock className="w-4 h-4" />
                                    <span className="text-2xl font-bold">
                                        {Math.round(report.userProfileSummary.averageSessionDurationMinutes)}
                                    </span>
                                    <span className="text-sm text-gray-600">min</span>
                                </div>
                                <h3 className="font-semibold">Average Session</h3>
                                <p className="text-sm text-gray-600">Time spent browsing</p>
                            </div>

                            <div className="text-center">
                                <div className="flex items-center justify-center mb-2 space-x-1">
                                    <Mouse className="w-4 h-4" />
                                    <span className="text-2xl font-bold">
                                        {Math.round(report.userProfileSummary.averageTabsPerSession)}
                                    </span>
                                    <span className="text-sm text-gray-600">tabs</span>
                                </div>
                                <h3 className="font-semibold">Average Tabs</h3>
                                <p className="text-sm text-gray-600">Per session</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Top Websites */}
                <Card className="mb-8">
                    <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                            <TrendingUp className="w-5 h-5" />
                            <span>Top Websites</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {report.topWebsites.slice(0, 5).map((website, index) => (
                                <div
                                    key={website.domain}
                                    className="flex items-center justify-between p-4 rounded-lg bg-gray-50"
                                >
                                    <div className="flex items-center space-x-3">
                                        <div className="flex items-center justify-center w-8 h-8 font-bold text-blue-600 bg-blue-100 rounded-full">
                                            {index + 1}
                                        </div>
                                        <div>
                                            <h4 className="font-medium">{website.domain}</h4>
                                            <p className="text-sm text-gray-600 capitalize">
                                                {website.inferredCategory}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-medium">{website.visitCount} visits</p>
                                        <p className="text-sm text-gray-600">
                                            {Math.round(website.totalFocusTimeMinutes)} min focus
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Charts */}
                <ReportCharts data={report.chartData} />

                {/* Interaction Patterns */}
                <Card className="mb-8">
                    <CardHeader>
                        <CardTitle>Interaction Patterns</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                            <div className="p-4 text-center rounded-lg bg-blue-50">
                                <h4 className="font-medium capitalize">Most Common Interaction</h4>
                                <p className="mt-2 text-2xl font-bold text-blue-600">
                                    {report.interactionPatterns.mostCommonInteractionType}
                                </p>
                            </div>

                            {report.interactionPatterns.averageScrollDepth && (
                                <div className="p-4 text-center rounded-lg bg-green-50">
                                    <h4 className="font-medium">Average Scroll Depth</h4>
                                    <p className="mt-2 text-2xl font-bold text-green-600">
                                        {Math.round(report.interactionPatterns.averageScrollDepth)}%
                                    </p>
                                </div>
                            )}

                            {report.interactionPatterns.averageInputFocusTimeMs && (
                                <div className="p-4 text-center rounded-lg bg-purple-50">
                                    <h4 className="font-medium">Input Focus Time</h4>
                                    <p className="mt-2 text-2xl font-bold text-purple-600">
                                        {Math.round(report.interactionPatterns.averageInputFocusTimeMs / 1000)}s
                                    </p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Insights */}
                {(report.ecommerceInsights || report.travelInsights) && (
                    <Card className="mb-8">
                        <CardHeader>
                            <CardTitle>Personalized Insights</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                {report.ecommerceInsights && (
                                    <div>
                                        <h4 className="mb-3 font-medium">🛍️ Shopping Preferences</h4>
                                        <div className="space-y-2">
                                            <p className="text-sm">
                                                <strong>Top Categories:</strong>{" "}
                                                {report.ecommerceInsights.topCategories.join(", ")}
                                            </p>
                                            {report.ecommerceInsights.averageViewedPriceRange && (
                                                <p className="text-sm">
                                                    <strong>Price Range:</strong>{" "}
                                                    {report.ecommerceInsights.averageViewedPriceRange.currency}
                                                    {report.ecommerceInsights.averageViewedPriceRange.min} -
                                                    {report.ecommerceInsights.averageViewedPriceRange.currency}
                                                    {report.ecommerceInsights.averageViewedPriceRange.max}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {report.travelInsights && (
                                    <div>
                                        <h4 className="mb-3 font-medium">✈️ Travel Interests</h4>
                                        <div className="space-y-2">
                                            <p className="text-sm">
                                                <strong>Destinations:</strong>{" "}
                                                {report.travelInsights.topDestinations.join(", ")}
                                            </p>
                                            {report.travelInsights.preferredTransport && (
                                                <p className="text-sm">
                                                    <strong>Transport:</strong>{" "}
                                                    {report.travelInsights.preferredTransport}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                )}

                <Separator className="my-8" />

                {/* Social Share */}
                <SocialShare report={report} />

                {/* Footer */}
                <div className="py-8 mt-12 text-center border-t border-gray-200">
                    <p className="mb-2 text-gray-600">
                        This report was generated using AI analysis of your browsing patterns
                    </p>
                    <p className="text-sm text-gray-500">
                        Powered by <strong>Vael AI</strong> • Built with privacy in mind
                    </p>
                </div>
            </main>
        </div>
    );
}
