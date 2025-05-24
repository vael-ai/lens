"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ReportCharts } from "@/components/report-charts";
import { SocialShare } from "@/components/social-share";
import { AlertCircle, Brain, Clock, Mouse, RefreshCw, TrendingUp } from "lucide-react";

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

interface ReportStatus {
    reportId: string;
    status: "processing" | "completed" | "failed";
    progressPercent: number;
    createdAt: string;
    completedAt?: string;
    error?: string;
}

export default function ReportPage() {
    const params = useParams();
    const reportId = params.reportId as string;

    const [report, setReport] = useState<Report | null>(null);
    const [status, setStatus] = useState<ReportStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Poll for status updates
    useEffect(() => {
        const checkStatus = async () => {
            try {
                const response = await fetch(`/api/reports/${reportId}/status`);
                const statusData = await response.json();

                if (!response.ok) {
                    throw new Error(statusData.error || "Failed to check status");
                }

                setStatus(statusData);

                // If completed, fetch the report data
                if (statusData.status === "completed") {
                    const reportResponse = await fetch(`/api/reports/${reportId}`);
                    const reportData = await reportResponse.json();

                    if (reportResponse.ok) {
                        setReport(reportData.report);
                        if (pollIntervalRef.current) {
                            clearInterval(pollIntervalRef.current);
                            pollIntervalRef.current = null;
                        }
                    }
                } else if (statusData.status === "failed") {
                    setError(statusData.error || "Report processing failed");
                    if (pollIntervalRef.current) {
                        clearInterval(pollIntervalRef.current);
                        pollIntervalRef.current = null;
                    }
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : "Unknown error occurred");
                if (pollIntervalRef.current) {
                    clearInterval(pollIntervalRef.current);
                    pollIntervalRef.current = null;
                }
            } finally {
                setLoading(false);
            }
        };

        // Initial check
        void checkStatus();

        // Poll every 2 seconds while processing
        pollIntervalRef.current = setInterval(() => {
            void checkStatus();
        }, 2000);

        return () => {
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
                pollIntervalRef.current = null;
            }
        };
    }, [reportId]);

    // Loading state while processing
    if (loading || (status?.status === "processing" && !report)) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
                <div className="flex items-center justify-center min-h-screen p-4">
                    <Card className="max-w-md mx-auto">
                        <CardHeader>
                            <CardTitle className="flex items-center space-x-2">
                                <RefreshCw className="w-5 h-5 animate-spin" />
                                <span>Generating Your Report</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="text-center">
                                <p className="mb-4 text-gray-600">Our AI is analyzing your browsing patterns...</p>
                                <Progress value={status?.progressPercent || 0} className="mb-2" />
                                <p className="text-sm text-gray-500">{status?.progressPercent || 0}% complete</p>
                            </div>
                            <div className="space-y-2 text-sm text-gray-600">
                                <p>✅ Data received and validated</p>
                                <p className={(status?.progressPercent ?? 0) >= 30 ? "text-blue-600" : ""}>
                                    {(status?.progressPercent ?? 0) >= 30 ? "✅" : "⏳"} Processing browsing patterns
                                </p>
                                <p className={(status?.progressPercent ?? 0) >= 60 ? "text-blue-600" : ""}>
                                    {(status?.progressPercent ?? 0) >= 60 ? "✅" : "⏳"} Generating insights
                                </p>
                                <p className={(status?.progressPercent ?? 0) >= 90 ? "text-blue-600" : ""}>
                                    {(status?.progressPercent ?? 0) >= 90 ? "✅" : "⏳"} Creating visualizations
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    // Error state
    if (error || status?.status === "failed") {
        return (
            <div className="flex items-center justify-center min-h-screen p-4 bg-gradient-to-br from-gray-50 to-gray-100">
                <Card className="max-w-md mx-auto">
                    <CardContent className="pt-6">
                        <div className="flex items-center mb-4 space-x-2 text-red-600">
                            <AlertCircle className="w-5 h-5" />
                            <span className="font-medium">Error</span>
                        </div>
                        <p className="mb-4 text-gray-600">{error || status?.error}</p>
                        <Button onClick={() => window.location.reload()} className="w-full">
                            Try Again
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Report ready - show the report UI
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
                            <Badge variant="outline" className="mb-2">
                                Report ID: {reportId.slice(0, 8)}...
                            </Badge>
                            <p className="text-sm text-gray-500">Generated at</p>
                            <p className="text-sm font-medium">
                                {status?.completedAt ? new Date(status.completedAt).toLocaleString() : "Recent"}
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
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {report.topWebsites.slice(0, 6).map((website, index) => (
                                <div key={index} className="p-4 rounded-lg bg-gray-50">
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className="font-medium truncate">{website.domain}</h4>
                                        <Badge variant="secondary" className="text-xs">
                                            {website.inferredCategory}
                                        </Badge>
                                    </div>
                                    <div className="space-y-1 text-sm text-gray-600">
                                        <p>Visits: {website.visitCount}</p>
                                        <p>Focus time: {Math.round(website.totalFocusTimeMinutes)} min</p>
                                        <p>Confidence: {Math.round(website.confidence * 100)}%</p>
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
