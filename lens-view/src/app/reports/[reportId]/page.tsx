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
    currentStage?: string;
    createdAt: string;
    completedAt?: string;
    lastUpdated?: string;
    error?: string;
    errorType?: string;
}

export default function ReportPage() {
    const params = useParams();
    const reportId = params.reportId as string;

    const [report, setReport] = useState<Report | null>(null);
    const [status, setStatus] = useState<ReportStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const pollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const pollStartTime = useRef<number>(Date.now());

    // Poll for status updates and load completed reports
    useEffect(() => {
        const checkStatus = async () => {
            try {
                const response = await fetch(`/api/reports/${reportId}/status`);
                const statusData = await response.json();

                if (!response.ok) {
                    if (response.status === 404) {
                        throw new Error("Report not found");
                    }
                    throw new Error(statusData.error || "Failed to check status");
                }

                setStatus(statusData);

                // If completed, fetch the report data and STOP polling immediately
                if (statusData.status === "completed") {
                    // Stop polling before fetching report to prevent race conditions
                    if (pollIntervalRef.current) {
                        clearInterval(pollIntervalRef.current);
                        pollIntervalRef.current = null;
                    }
                    if (pollTimeoutRef.current) {
                        clearTimeout(pollTimeoutRef.current);
                        pollTimeoutRef.current = null;
                    }

                    const reportResponse = await fetch(`/api/reports/${reportId}`);
                    const reportData = await reportResponse.json();

                    if (reportResponse.ok) {
                        setReport(reportData.report);
                    }
                } else if (statusData.status === "failed") {
                    // Stop polling immediately for failed reports
                    if (pollIntervalRef.current) {
                        clearInterval(pollIntervalRef.current);
                        pollIntervalRef.current = null;
                    }
                    if (pollTimeoutRef.current) {
                        clearTimeout(pollTimeoutRef.current);
                        pollTimeoutRef.current = null;
                    }
                    setError(statusData.error || "Report processing failed");
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : "Unknown error occurred");
                if (pollIntervalRef.current) {
                    clearInterval(pollIntervalRef.current);
                    pollIntervalRef.current = null;
                }
                if (pollTimeoutRef.current) {
                    clearTimeout(pollTimeoutRef.current);
                    pollTimeoutRef.current = null;
                }
            } finally {
                setLoading(false);
            }
        };

        // Start immediate status check
        const initializeReport = async () => {
            pollStartTime.current = Date.now();
            await checkStatus();

            // Only start polling if report is still processing
            if (status?.status === "processing" || loading) {
                startPolling();
            }
        };

        // More frequent polling with shorter intervals for better responsiveness
        const startPolling = () => {
            // Don't start if already polling or if complete/failed
            if (pollIntervalRef.current || status?.status === "completed" || status?.status === "failed") {
                return;
            }

            // Set up polling timeout (5 minutes max)
            pollTimeoutRef.current = setTimeout(
                () => {
                    if (pollIntervalRef.current) {
                        clearInterval(pollIntervalRef.current);
                        pollIntervalRef.current = null;
                    }
                    setError("Report processing is taking longer than expected. Please try again later.");
                },
                5 * 60 * 1000
            ); // 5 minutes

            // Poll every 1-2 seconds for more responsive feedback
            const baseInterval = 1000; // 1 second base
            const randomOffset = Math.random() * 1000; // 0-1 second random offset

            pollIntervalRef.current = setInterval(async () => {
                await checkStatus();

                // Stop polling if status changed to completed or failed
                if (status?.status === "completed" || status?.status === "failed") {
                    if (pollIntervalRef.current) {
                        clearInterval(pollIntervalRef.current);
                        pollIntervalRef.current = null;
                    }
                    if (pollTimeoutRef.current) {
                        clearTimeout(pollTimeoutRef.current);
                        pollTimeoutRef.current = null;
                    }
                }
            }, baseInterval + randomOffset);
        };

        void initializeReport();

        return () => {
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
                pollIntervalRef.current = null;
            }
            if (pollTimeoutRef.current) {
                clearTimeout(pollTimeoutRef.current);
                pollTimeoutRef.current = null;
            }
        };
    }, [reportId]);

    // Loading state while processing
    if (loading || (status?.status === "processing" && !report)) {
        const progress = status?.progressPercent || 0;

        // Use real-time stage from API or fallback to progress-based stage
        let currentStage = status?.currentStage || "Initializing...";
        let stageDescription = "Setting up your report generation";

        // Dynamic descriptions based on current stage or progress
        if (status?.currentStage) {
            // Use real-time stage descriptions
            switch (status.currentStage) {
                case "Initializing AI analysis":
                    stageDescription = "Setting up AI models and preparing data analysis";
                    break;
                case "Processing browsing data":
                    stageDescription = "Our AI is analyzing your browsing patterns and extracting insights";
                    break;
                case "Generating insights and visualizations":
                    stageDescription = "Creating personalized insights and building interactive charts";
                    break;
                case "Finalizing report":
                    stageDescription = "Applying final formatting and preparing your report";
                    break;
                case "Completed":
                    stageDescription = "Your report is ready!";
                    break;
                default:
                    stageDescription = "Processing your browsing data";
            }
        } else {
            // Fallback progress-based descriptions
            if (progress >= 10 && progress < 80) {
                currentStage = "AI Analysis in Progress";
                stageDescription = "Our AI is deeply analyzing your browsing patterns and generating insights";
            } else if (progress >= 80 && progress < 95) {
                currentStage = "Finalizing Report";
                stageDescription = "Creating visualizations and formatting your personalized report";
            } else if (progress >= 95) {
                currentStage = "Almost Ready";
                stageDescription = "Applying final touches and preparing your report";
            }
        }

        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
                <div className="flex items-center justify-center min-h-screen p-4">
                    <Card className="max-w-md mx-auto">
                        <CardHeader>
                            <CardTitle className="flex items-center space-x-2">
                                <RefreshCw className="w-5 h-5 animate-spin" />
                                <span>{currentStage}</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="text-center">
                                <p className="mb-4 text-gray-600">{stageDescription}</p>
                                <Progress value={progress} className="mb-2" />
                                <p className="text-sm text-gray-500">{progress}% complete</p>
                                {progress >= 95 && (
                                    <p className="text-xs text-blue-600 mt-1 animate-pulse">
                                        This usually takes just a few more seconds...
                                    </p>
                                )}
                            </div>
                            <div className="space-y-2 text-sm text-gray-600">
                                <p className={progress >= 5 ? "text-green-600" : "text-blue-600"}>
                                    {progress >= 5 ? "✅" : "⏳"} Data received and validated
                                </p>
                                <p
                                    className={
                                        progress >= 15 ? "text-green-600" : progress >= 10 ? "text-blue-600" : ""
                                    }
                                >
                                    {progress >= 15 ? "✅" : progress >= 10 ? "🔄" : "⏳"} Processing browsing patterns
                                </p>
                                <p
                                    className={
                                        progress >= 50 ? "text-green-600" : progress >= 25 ? "text-blue-600" : ""
                                    }
                                >
                                    {progress >= 50 ? "✅" : progress >= 25 ? "🔄" : "⏳"} Generating AI insights
                                </p>
                                <p
                                    className={
                                        progress >= 85 ? "text-green-600" : progress >= 80 ? "text-blue-600" : ""
                                    }
                                >
                                    {progress >= 85 ? "✅" : progress >= 80 ? "🔄" : "⏳"} Creating visualizations
                                </p>
                                <p
                                    className={
                                        progress >= 98 ? "text-green-600" : progress >= 95 ? "text-blue-600" : ""
                                    }
                                >
                                    {progress >= 98 ? "✅" : progress >= 95 ? "🔄" : "⏳"} Finalizing report
                                </p>
                            </div>
                            <div className="text-xs text-gray-400 text-center pt-2 border-t space-y-1">
                                {status?.createdAt && (
                                    <div>Started: {new Date(status.createdAt).toLocaleTimeString()}</div>
                                )}
                                {status?.lastUpdated && (
                                    <div className="text-blue-500">
                                        Last updated: {new Date(status.lastUpdated).toLocaleTimeString()}
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    // Error state
    if (error || status?.status === "failed") {
        const getErrorMessage = () => {
            if (status?.error) {
                return status.error;
            }
            return error || "An unexpected error occurred";
        };

        const getErrorTitle = () => {
            if (status?.errorType === "ai_token_limit") {
                return "Data Too Large";
            } else if (status?.errorType === "rate_limit") {
                return "Service Temporarily Unavailable";
            }
            return "Processing Failed";
        };

        const canRetry = status?.errorType === "rate_limit" || status?.errorType === "general";

        return (
            <div className="flex items-center justify-center min-h-screen p-4 bg-gradient-to-br from-gray-50 to-gray-100">
                <Card className="max-w-md mx-auto">
                    <CardContent className="pt-6">
                        <div className="flex items-center mb-4 space-x-2 text-red-600">
                            <AlertCircle className="w-5 h-5" />
                            <span className="font-medium">{getErrorTitle()}</span>
                        </div>
                        <p className="mb-4 text-gray-600">{getErrorMessage()}</p>

                        {status?.errorType === "ai_token_limit" && (
                            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                <p className="text-sm text-blue-800">
                                    <strong>Tip:</strong> Try clearing some browsing data in the extension or wait for
                                    more optimized processing.
                                </p>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Button onClick={() => window.location.reload()} className="w-full">
                                {canRetry ? "Try Again" : "Refresh Page"}
                            </Button>
                            <Button variant="outline" onClick={() => window.close()} className="w-full">
                                Close Tab
                            </Button>
                        </div>

                        {status?.lastUpdated && (
                            <div className="text-xs text-gray-400 text-center pt-3 border-t mt-4">
                                Failed at: {new Date(status.lastUpdated).toLocaleTimeString()}
                            </div>
                        )}
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
