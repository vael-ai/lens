"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Twitter, Linkedin, Copy, Check, Share2 } from "lucide-react";

interface Report {
    userProfileSummary: {
        dailyActivityLevel: "low" | "moderate" | "high";
        averageSessionDurationMinutes: number;
        averageTabsPerSession: number;
    };
    topWebsites: Array<{
        domain: string;
        visitCount: number;
        totalFocusTimeMinutes: number;
        inferredCategory: string;
    }>;
    inferredUserPersona: string;
    interactionPatterns: {
        mostCommonInteractionType: string;
    };
}

interface SocialShareProps {
    report: Report;
}

export function SocialShare({ report }: SocialShareProps) {
    const [copied, setCopied] = useState(false);

    // Generate shareable insights
    const generateShareText = (platform: "twitter" | "linkedin") => {
        const persona = report.inferredUserPersona.replace(/([A-Z])/g, " $1").trim();
        const topDomain = report.topWebsites[0]?.domain ?? "various sites";
        const sessionTime = Math.round(report.userProfileSummary.averageSessionDurationMinutes);
        const tabCount = Math.round(report.userProfileSummary.averageTabsPerSession);

        const insights = [
            `🧠 My browsing personality: ${persona}`,
            `📊 Activity level: ${report.userProfileSummary.dailyActivityLevel}`,
            `⏱️ Average session: ${sessionTime} minutes`,
            `📱 Average tabs: ${tabCount} per session`,
            `🏆 Top site: ${topDomain}`,
            `🎯 Most common interaction: ${report.interactionPatterns.mostCommonInteractionType}`,
        ];

        if (platform === "twitter") {
            return `Just got my browsing intelligence report from @Vael_AI! 🚀\n\n${insights.slice(0, 4).join("\n")}\n\nDiscover your digital personality: lens.vael.ai\n\n#BrowsingIntelligence #VaelAI #DigitalPersonality`;
        } else {
            return `I just discovered my browsing intelligence with Vael AI! Here are some fascinating insights about my digital behavior:\n\n${insights.join("\n")}\n\nIt's amazing what AI can reveal about our browsing patterns. Check out your own digital personality at lens.vael.ai\n\n#DigitalAnalytics #AI #BrowsingIntelligence #VaelAI`;
        }
    };

    const shareToTwitter = () => {
        const text = generateShareText("twitter");
        const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
        window.open(url, "_blank", "width=550,height=420");
    };

    const shareToLinkedIn = () => {
        const text = generateShareText("linkedin");
        const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent("https://lens.vael.ai")}&summary=${encodeURIComponent(text)}`;
        window.open(url, "_blank", "width=550,height=420");
    };

    const copyToClipboard = async () => {
        const text = generateShareText("linkedin");
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error("Failed to copy text:", err);
        }
    };

    const generateFunFacts = () => {
        const facts = [];

        if (report.userProfileSummary.averageTabsPerSession > 10) {
            facts.push("🤯 You're a tab master! Most people use way fewer tabs.");
        }

        if (report.userProfileSummary.averageSessionDurationMinutes > 60) {
            facts.push("🕐 You have impressive focus - longer sessions than average!");
        }

        if (report.topWebsites.length > 5) {
            facts.push("🌐 You're a diverse browser - exploring many different sites!");
        }

        if (report.userProfileSummary.dailyActivityLevel === "high") {
            facts.push("⚡ High activity level - you're a power user!");
        }

        return facts.slice(0, 2); // Show max 2 facts
    };

    const funFacts = generateFunFacts();

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                    <Share2 className="w-5 h-5" />
                    <span>Share Your Digital Insights</span>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-6">
                    {/* Fun Facts */}
                    {funFacts.length > 0 && (
                        <div>
                            <h4 className="mb-3 font-medium">✨ Share-worthy highlights:</h4>
                            <div className="space-y-2">
                                {funFacts.map((fact, index) => (
                                    <Badge key={index} variant="outline" className="px-3 py-1 text-sm">
                                        {fact}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Preview Text */}
                    <div className="p-4 rounded-lg bg-gray-50">
                        <h4 className="mb-2 font-medium">Preview (Twitter version):</h4>
                        <p className="text-sm text-gray-700 whitespace-pre-line">{generateShareText("twitter")}</p>
                    </div>

                    {/* Social Share Buttons */}
                    <div className="flex flex-wrap gap-3">
                        <Button
                            onClick={shareToTwitter}
                            className="flex items-center space-x-2 bg-black hover:bg-gray-800"
                        >
                            <Twitter className="w-4 h-4" />
                            <span>Share on X</span>
                        </Button>

                        <Button
                            onClick={shareToLinkedIn}
                            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700"
                        >
                            <Linkedin className="w-4 h-4" />
                            <span>Share on LinkedIn</span>
                        </Button>

                        <Button
                            onClick={() => void copyToClipboard()}
                            variant="outline"
                            className="flex items-center space-x-2"
                        >
                            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                            <span>{copied ? "Copied!" : "Copy Text"}</span>
                        </Button>
                    </div>

                    {/* Engagement Tip */}
                    <div className="p-4 rounded-lg bg-blue-50">
                        <p className="text-sm text-blue-800">
                            💡 <strong>Tip:</strong> Sharing your insights helps Vael AI reach more people and improve
                            our algorithms. Plus, your friends might discover something interesting about their own
                            browsing habits!
                        </p>
                    </div>

                    {/* Privacy Note */}
                    <div className="text-center">
                        <p className="text-xs text-gray-500">
                            🔒 No personal browsing data is shared - only your anonymized insights and persona.
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
