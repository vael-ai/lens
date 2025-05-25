"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ReportCharts } from "@/components/report-charts";
import { SocialShare } from "@/components/social-share";
import { CitationLink } from "@/components/citation-link";
import { AlertCircle, Brain, Clock, Mouse, RefreshCw, TrendingUp, FileText } from "lucide-react";
import Link from "next/link";

// Citation data structure
interface Citation {
    sourceId: string;
    domainOrFeature: string;
    dataType: string;
    confidence?: number;
    timeRangeStart?: string;
    timeRangeEnd?: string;
}

interface Report {
    userProfileSummary: {
        dailyActivityLevel: "low" | "moderate" | "high";
        averageSessionDurationMinutes: number;
        averageTabsPerSession: number;
        commonTabGroups: string[][];
        citations: Citation[];
    };
    topWebsites: Array<{
        domain: string;
        visitCount: number;
        totalFocusTimeMinutes: number;
        inferredCategory: "shopping" | "travel" | "productivity" | "news" | "miscellaneous";
        confidence: number;
        citation: Citation;
    }>;
    interactionPatterns: {
        mostCommonInteractionType: "click" | "scroll" | "hover" | "input" | "selection";
        averageScrollDepth?: number;
        averageInputFocusTimeMs?: number;
        citations: Citation[];
    };
    ecommerceInsights?: {
        topCategories: string[];
        averageViewedPriceRange?: {
            min: number;
            max: number;
            currency: string;
        };
        citations: Citation[];
    };
    travelInsights?: {
        topDestinations: string[];
        preferredTransport?: string;
        citations: Citation[];
    };
    inferredUserPersona:
        | "shopper"
        | "productiveProfessional"
        | "explorer"
        | "newsSeeker"
        | "passiveBrowser"
        | "powerMultitasker";
    personaCitations: Citation[];
    chartData: {
        focusTimeByDomain: Array<{ domain: string; focusTimeMinutes: number; citation?: Citation }>;
        visitCountByCategory: Array<{ category: string; visitCount: number; citation?: Citation }>;
        sessionActivityOverTime: Array<{
            date: string;
            sessions: number;
            averageSessionDuration: number;
            citation?: Citation;
        }>;
        interactionTypeBreakdown: Array<{ type: string; count: number; citation?: Citation }>;
        scrollDepthOverTime?: Array<{ timestamp: string; scrollDepth: number; citation?: Citation }>;
        citations: Citation[];
    };
}

interface ComparisonInsights {
    overallChange: "improved" | "declined" | "stable" | "shifted";
    keyChanges: Array<{
        metric: string;
        change: string;
        significance: "high" | "medium" | "low";
    }>;
    behavioralShift: {
        summary: string;
        recommendation: string;
    };
    trendsIdentified: string[];
    focusAreas: string[];
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
    const searchParams = useSearchParams();
    const reportId = params.reportId as string;
    const email = searchParams.get("email");

    const [report, setReport] = useState<Report | null>(null);
    const [comparisonInsights, setComparisonInsights] = useState<ComparisonInsights | null>(null);
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
                if (!email) {
                    setError("Email parameter is required for report access");
                    setLoading(false);
                    return;
                }

                const response = await fetch(`/api/reports/${reportId}/status?email=${encodeURIComponent(email)}`);
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

                    const reportResponse = await fetch(`/api/reports/${reportId}?email=${encodeURIComponent(email)}`);
                    const reportData = await reportResponse.json();

                    if (reportResponse.ok) {
                        setReport(reportData.report);
                        setComparisonInsights(reportData.comparisonInsights);
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

            // Poll every 2-3 seconds for balanced responsiveness and efficiency
            const baseInterval = 2000; // 2 second base
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
    }, [reportId, email]);

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
                    stageDescription = "Processing your browsing data (this can take a few minutes)";
            }
        } else {
            // Fallback progress-based descriptions with improved progression
            if (progress >= 10 && progress < 75) {
                currentStage = "AI Analysis in Progress";
                stageDescription = "Our AI is deeply analyzing your browsing patterns and generating insights";
            } else if (progress >= 75 && progress < 85) {
                currentStage = "Creating Visualizations";
                stageDescription = "Building interactive charts and processing your data";
            } else if (progress >= 85 && progress < 95) {
                currentStage = "Finalizing Report";
                stageDescription = "Applying final touches and formatting your personalized report";
            } else if (progress >= 95) {
                currentStage = "Almost Ready";
                stageDescription = "Just a few more seconds - your report is nearly complete!";
            }
        }

        // Check if we should show the encouraging message
        const showEncouragingMessage = status?.currentStage?.includes("almost there, hang on!");
        const cleanCurrentStage = showEncouragingMessage
            ? currentStage.replace(" - almost there, hang on!", "")
            : currentStage;

        // Enhanced progress calculation to prevent getting stuck at 75%
        let displayProgress = progress;
        if (progress >= 75 && progress < 95) {
            // Add gradual random increment to keep progress moving
            const elapsed = Date.now() - pollStartTime.current;
            const extraProgress = Math.min(Math.random() * 0.5, 2); // Small random increment
            displayProgress = Math.min(progress + extraProgress, 94);
        } else if (progress >= 95 && progress < 99) {
            // Slow but steady progress at the end
            const elapsed = Date.now() - pollStartTime.current;
            const endProgress = Math.min(95 + (elapsed % 5000) / 1000, 98.5); // Slow progression
            displayProgress = Math.max(progress, endProgress);
        }

        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
                <div className="flex items-center justify-center min-h-screen p-4">
                    <div className="relative max-w-md mx-auto">
                        {/* Encouraging Message Overlay - Positioned on top of status card */}
                        {showEncouragingMessage && (
                            <div className="absolute z-10 transform -translate-x-1/2 -top-16 left-1/2">
                                <div className="px-6 py-3 text-white bg-blue-600 rounded-full shadow-lg animate-bounce">
                                    <span className="text-sm font-medium">🎉 Almost there, hang on!</span>
                                </div>
                            </div>
                        )}

                        <Card className="w-full">
                            <CardHeader>
                                <CardTitle className="flex items-center space-x-2">
                                    <RefreshCw className="w-5 h-5 animate-spin" />
                                    <span>{cleanCurrentStage}</span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="text-center">
                                    <p className="mb-4 text-gray-600">{stageDescription}</p>
                                    <Progress value={displayProgress} className="mb-2" />
                                    <p className="text-sm text-gray-500">{Math.round(displayProgress)}% complete</p>
                                    {displayProgress >= 95 && (
                                        <p className="mt-1 text-xs text-blue-600 animate-pulse">
                                            This usually takes just a few more seconds...
                                        </p>
                                    )}
                                </div>
                                <div className="space-y-2 text-sm text-gray-600">
                                    <p className={displayProgress >= 5 ? "text-green-600" : "text-blue-600"}>
                                        {displayProgress >= 5 ? "✅" : "⏳"} Data received and validated
                                    </p>
                                    <p
                                        className={
                                            displayProgress >= 15
                                                ? "text-green-600"
                                                : displayProgress >= 10
                                                  ? "text-blue-600"
                                                  : ""
                                        }
                                    >
                                        {displayProgress >= 15 ? "✅" : displayProgress >= 10 ? "🔄" : "⏳"} Processing
                                        browsing patterns
                                    </p>
                                    <p
                                        className={
                                            displayProgress >= 50
                                                ? "text-green-600"
                                                : displayProgress >= 25
                                                  ? "text-blue-600"
                                                  : ""
                                        }
                                    >
                                        {displayProgress >= 50 ? "✅" : displayProgress >= 25 ? "🔄" : "⏳"} Generating
                                        AI insights
                                    </p>
                                    <p
                                        className={
                                            displayProgress >= 85
                                                ? "text-green-600"
                                                : displayProgress >= 75
                                                  ? "text-blue-600"
                                                  : ""
                                        }
                                    >
                                        {displayProgress >= 85 ? "✅" : displayProgress >= 75 ? "🔄" : "⏳"} Creating
                                        visualizations
                                    </p>
                                    <p
                                        className={
                                            displayProgress >= 98
                                                ? "text-green-600"
                                                : displayProgress >= 95
                                                  ? "text-blue-600"
                                                  : ""
                                        }
                                    >
                                        {displayProgress >= 98 ? "✅" : displayProgress >= 95 ? "🔄" : "⏳"} Finalizing
                                        report
                                    </p>
                                </div>
                                <div className="pt-2 space-y-1 text-xs text-center text-gray-400 border-t">
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
                            <div className="p-3 mb-4 border border-blue-200 rounded-lg bg-blue-50">
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
                            <div className="pt-3 mt-4 text-xs text-center text-gray-400 border-t">
                                Failed at: {new Date(status.lastUpdated).toLocaleTimeString()}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Report ready - show the report UI
    if (!loading && !report && !error && status && status.status !== "processing" && status.status !== "completed") {
        return (
            <div className="flex items-center justify-center min-h-screen p-4 bg-gradient-to-br from-gray-50 to-gray-100">
                <Card className="max-w-md mx-auto">
                    <CardContent className="pt-6">
                        <div className="flex items-center mb-4 space-x-2 text-gray-600">
                            <AlertCircle className="w-5 h-5" />
                            <span className="font-medium">No Report Found</span>
                        </div>
                        <p className="mb-4 text-gray-600">
                            The requested report could not be found or you don't have access to it.
                        </p>
                        <div className="space-y-2">
                            <Button onClick={() => window.location.reload()} className="w-full">
                                Refresh Page
                            </Button>
                            <Button variant="outline" onClick={() => window.close()} className="w-full">
                                Close Tab
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Don't render the report until it's actually loaded
    if (!report) {
        return null; // This prevents any flash of content while loading/processing
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
                <div className="px-4 py-4 mx-auto max-w-7xl sm:px-6 lg:px-8 sm:py-6">
                    <div className="flex flex-col items-start justify-between space-y-4 sm:flex-row sm:items-center sm:space-y-0">
                        <div className="flex-1">
                            <h1 className="text-xl font-bold text-gray-900 sm:text-2xl lg:text-3xl">
                                Your Browsing Intelligence Report
                            </h1>
                            <p className="mt-1 text-sm text-gray-600 sm:text-base">Powered by Vael AI</p>
                        </div>
                        <div className="text-left sm:text-right">
                            <Badge variant="outline" className="mb-2 text-xs">
                                Report ID: {reportId.slice(0, 8)}...
                            </Badge>
                            <p className="text-xs text-gray-500 sm:text-sm">Generated at</p>
                            <p className="text-xs font-medium sm:text-sm">
                                {status?.completedAt ? new Date(status.completedAt).toLocaleString() : "Recent"}
                            </p>
                        </div>
                    </div>
                </div>
            </header>

            <main className="px-4 py-4 mx-auto max-w-7xl sm:px-6 lg:px-8 sm:py-8">
                {/* User Profile Summary */}
                <Card className="mb-4 sm:mb-6 lg:mb-8">
                    <CardHeader className="pb-3 sm:pb-6">
                        <CardTitle className="flex items-center space-x-2 text-lg sm:text-xl">
                            <Brain className="w-4 h-4 sm:w-5 sm:h-5" />
                            <span>Your Digital Profile</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 sm:p-6">
                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-4 sm:gap-6">
                            <div className="text-center">
                                <div className="flex items-center justify-center mb-2 text-3xl sm:text-4xl">
                                    {getPersonaIcon(report.inferredUserPersona)}
                                    {report.personaCitations?.[0] && (
                                        <CitationLink citation={report.personaCitations[0]} className="ml-1" />
                                    )}
                                </div>
                                <h3 className="text-sm font-semibold capitalize sm:text-lg">
                                    {report.inferredUserPersona.replace(/([A-Z])/g, " $1").trim()}
                                </h3>
                                <p className="text-xs text-gray-600 sm:text-sm">Your browsing persona</p>
                            </div>

                            <div className="text-center">
                                <div className="flex items-center justify-center mb-2">
                                    <Badge
                                        className={`${getActivityBadgeColor(report.userProfileSummary.dailyActivityLevel)} text-white text-xs sm:text-sm`}
                                    >
                                        {report.userProfileSummary.dailyActivityLevel.toUpperCase()}
                                    </Badge>
                                    {report.userProfileSummary.citations?.[0] && (
                                        <CitationLink
                                            citation={report.userProfileSummary.citations[0]}
                                            className="ml-1"
                                        />
                                    )}
                                </div>
                                <h3 className="text-sm font-semibold sm:text-base">Activity Level</h3>
                                <p className="text-xs text-gray-600 sm:text-sm">Daily browsing intensity</p>
                            </div>

                            <div className="text-center">
                                <div className="flex items-center justify-center mb-2 space-x-1">
                                    <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                                    <span className="text-xl font-bold sm:text-2xl">
                                        {Math.round(report.userProfileSummary.averageSessionDurationMinutes)}
                                    </span>
                                    <span className="text-xs text-gray-600 sm:text-sm">min</span>
                                    {report.userProfileSummary.citations?.[1] && (
                                        <CitationLink
                                            citation={report.userProfileSummary.citations[1]}
                                            className="ml-1"
                                        />
                                    )}
                                </div>
                                <h3 className="text-sm font-semibold sm:text-base">Average Session</h3>
                                <p className="text-xs text-gray-600 sm:text-sm">Time spent browsing</p>
                            </div>

                            <div className="text-center">
                                <div className="flex items-center justify-center mb-2 space-x-1">
                                    <Mouse className="w-3 h-3 sm:w-4 sm:h-4" />
                                    <span className="text-xl font-bold sm:text-2xl">
                                        {Math.round(report.userProfileSummary.averageTabsPerSession)}
                                    </span>
                                    <span className="text-xs text-gray-600 sm:text-sm">tabs</span>
                                    {report.userProfileSummary.citations?.[2] && (
                                        <CitationLink
                                            citation={report.userProfileSummary.citations[2]}
                                            className="ml-1"
                                        />
                                    )}
                                </div>
                                <h3 className="text-sm font-semibold sm:text-base">Average Tabs</h3>
                                <p className="text-xs text-gray-600 sm:text-sm">Multitasking level</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Personalized Insights - Moved higher up in the report */}
                {(report.ecommerceInsights || report.travelInsights) && (
                    <Card className="mb-8">
                        <CardHeader>
                            <CardTitle className="flex items-center space-x-2 text-lg sm:text-xl">
                                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
                                <span>Personalized Insights</span>
                            </CardTitle>
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

                {/* Top Websites */}
                <Card className="mb-8">
                    <CardHeader>
                        <CardTitle className="flex items-center space-x-2 text-lg sm:text-xl">
                            <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
                            <span>Top Websites</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 sm:p-6">
                        <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {report.topWebsites.slice(0, 6).map((website, index) => (
                                <div key={index} className="p-3 rounded-lg bg-gray-50 sm:p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className="text-sm font-medium truncate sm:text-base">{website.domain}</h4>
                                        <Badge variant="secondary" className="text-xs">
                                            {website.inferredCategory}
                                        </Badge>
                                    </div>
                                    <div className="space-y-1 text-xs text-gray-600 sm:text-sm">
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

                {/* Behavioral Evolution Analysis */}
                {comparisonInsights && (
                    <Card className="mb-4 sm:mb-6 lg:mb-8">
                        <CardHeader className="pb-3 sm:pb-6">
                            <CardTitle className="flex items-center space-x-2 text-lg sm:text-xl">
                                <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5" />
                                <span>Behavioral Evolution Analysis</span>
                                <Badge
                                    className={`ml-2 ${
                                        comparisonInsights.overallChange === "improved"
                                            ? "bg-green-500"
                                            : comparisonInsights.overallChange === "declined"
                                              ? "bg-red-500"
                                              : comparisonInsights.overallChange === "shifted"
                                                ? "bg-blue-500"
                                                : "bg-gray-500"
                                    } text-white text-xs`}
                                >
                                    {comparisonInsights.overallChange.toUpperCase()}
                                </Badge>
                            </CardTitle>
                            <p className="mt-2 text-sm text-gray-600">
                                This analysis compares your current browsing patterns with your previous report to
                                identify how your digital behavior has evolved over time. Understanding these changes
                                can help you optimize your online habits and productivity.
                            </p>
                        </CardHeader>
                        <CardContent className="p-4 sm:p-6">
                            {/* Overall Change Summary */}
                            <div className="p-4 mb-6 border-l-4 border-blue-500 rounded-lg bg-gradient-to-r from-blue-50 to-purple-50">
                                <h4 className="flex items-center mb-2 text-sm font-semibold sm:text-base">
                                    <span className="mr-2">
                                        {comparisonInsights.overallChange === "improved"
                                            ? "📈"
                                            : comparisonInsights.overallChange === "declined"
                                              ? "📉"
                                              : comparisonInsights.overallChange === "shifted"
                                                ? "🔄"
                                                : "📊"}
                                    </span>
                                    Evolution Summary
                                </h4>
                                <p className="mb-3 text-sm leading-relaxed sm:text-base">
                                    {comparisonInsights.behavioralShift.summary}
                                </p>
                                <div className="p-3 bg-white border-l-4 border-blue-500 rounded">
                                    <p className="flex items-center text-xs font-medium text-blue-700 sm:text-sm">
                                        <span className="mr-1">💡</span>
                                        Personalized Recommendation:
                                    </p>
                                    <p className="mt-1 text-xs leading-relaxed text-blue-600 sm:text-sm">
                                        {comparisonInsights.behavioralShift.recommendation}
                                    </p>
                                </div>
                            </div>

                            {/* Detailed Change Breakdown */}
                            <div className="mb-6">
                                <h4 className="flex items-center mb-4 text-sm font-semibold sm:text-base">
                                    <span className="mr-2">🔄</span>
                                    Detailed Change Analysis
                                </h4>
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 sm:gap-4">
                                    {comparisonInsights.keyChanges.map((change, index) => (
                                        <div
                                            key={index}
                                            className={`p-4 rounded-lg border-l-4 transition-all hover:shadow-md ${change.change.includes("increase") ? "border-green-500 bg-green-50" : "border-red-500 bg-red-50"}`}
                                        >
                                            <div className="flex items-start space-x-3">
                                                <div>
                                                    <div className="flex items-center justify-between">
                                                        <h5 className="font-medium">{change.metric}</h5>
                                                        <Badge
                                                            variant="outline"
                                                            className={`ml-2 text-xs ${change.significance === "high" ? "text-red-500 border-red-500" : change.significance === "medium" ? "text-orange-500 border-orange-500" : "text-gray-500 border-gray-500"}`}
                                                        >
                                                            {change.significance.toUpperCase()}
                                                        </Badge>
                                                    </div>
                                                    <div className="space-y-1 text-xs text-gray-600 sm:text-sm">
                                                        <p>{change.change}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Insights Grid */}
                            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                {/* Trends Identified */}
                                <div className="p-4 border border-blue-200 rounded-lg bg-blue-50">
                                    <h4 className="flex items-center mb-3 text-sm font-semibold text-blue-800 sm:text-base">
                                        <span className="mr-2">📊</span>
                                        Behavioral Trends Identified
                                    </h4>
                                    <div className="space-y-3">
                                        {comparisonInsights.trendsIdentified.map((trend, index) => (
                                            <div key={index} className="flex items-start space-x-3">
                                                <div className="flex-shrink-0 w-2 h-2 mt-2 bg-blue-500 rounded-full"></div>
                                                <p className="text-xs leading-relaxed text-blue-700 sm:text-sm">
                                                    {trend}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Focus Areas */}
                                <div className="p-4 border border-purple-200 rounded-lg bg-purple-50">
                                    <h4 className="flex items-center mb-3 text-sm font-semibold text-purple-800 sm:text-base">
                                        <span className="mr-2">🎯</span>
                                        Recommended Focus Areas
                                    </h4>
                                    <div className="space-y-3">
                                        {comparisonInsights.focusAreas.map((area, index) => (
                                            <div key={index} className="flex items-start space-x-3">
                                                <div className="flex-shrink-0 w-2 h-2 mt-2 bg-purple-500 rounded-full"></div>
                                                <p className="text-xs leading-relaxed text-purple-700 sm:text-sm">
                                                    {area}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Evolution Timeline */}
                            <div className="p-4 mt-6 rounded-lg bg-gradient-to-r from-gray-50 to-gray-100">
                                <h4 className="flex items-center mb-3 text-sm font-semibold text-gray-800 sm:text-base">
                                    <span className="mr-2">⏱️</span>
                                    How to Interpret Your Evolution
                                </h4>
                                <div className="grid grid-cols-1 gap-4 text-xs text-gray-600 md:grid-cols-2 sm:text-sm">
                                    <div>
                                        <p className="mb-1 font-medium text-gray-700">📈 Improved</p>
                                        <p>
                                            Your browsing patterns show enhanced productivity, better focus, or more
                                            intentional usage.
                                        </p>
                                    </div>
                                    <div>
                                        <p className="mb-1 font-medium text-gray-700">📉 Declined</p>
                                        <p>
                                            Some patterns may indicate decreased focus or increased distraction -
                                            opportunities for optimization.
                                        </p>
                                    </div>
                                    <div>
                                        <p className="mb-1 font-medium text-gray-700">🔄 Shifted</p>
                                        <p>
                                            Your interests or priorities have changed, leading to different browsing
                                            categories or time allocation.
                                        </p>
                                    </div>
                                    <div>
                                        <p className="mb-1 font-medium text-gray-700">📊 Stable</p>
                                        <p>
                                            Consistent patterns suggest well-established habits and predictable digital
                                            behavior.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Interaction Patterns */}
                <Card className="mb-8">
                    <CardHeader>
                        <CardTitle className="flex items-center">
                            <span>Interaction Patterns</span>
                            {report.interactionPatterns.citations?.[0] && (
                                <CitationLink citation={report.interactionPatterns.citations[0]} className="ml-2" />
                            )}
                        </CardTitle>
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
                                        <div className="flex items-center mb-3">
                                            <h4 className="font-medium">🛍️ Shopping Preferences</h4>
                                            {report.ecommerceInsights.citations?.[0] && (
                                                <CitationLink
                                                    citation={report.ecommerceInsights.citations[0]}
                                                    className="ml-1"
                                                />
                                            )}
                                        </div>
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
                                        <div className="flex items-center mb-3">
                                            <h4 className="font-medium">✈️ Travel Interests</h4>
                                            {report.travelInsights.citations?.[0] && (
                                                <CitationLink
                                                    citation={report.travelInsights.citations[0]}
                                                    className="ml-1"
                                                />
                                            )}
                                        </div>
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
                        This report was generated using an AI analysis of your browsing patterns
                    </p>
                    <p className="text-sm text-gray-500">
                        Powered by{" "}
                        <Link href="https://vael.ai">
                            {" "}
                            <strong>Vael AI</strong>{" "}
                        </Link>{" "}
                        • Built with privacy in mind 🧠
                    </p>
                </div>
            </main>
        </div>
    );
}
