"use client";

import * as React from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info, HelpCircle, Database, Clock, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface EnhancedTooltipProps {
    title: string;
    content: string | React.ReactNode;
    dataSource?: string;
    confidence?: number;
    lastUpdated?: string;
    calculation?: string;
    className?: string;
    variant?: "info" | "data" | "help" | "trend";
    side?: "top" | "right" | "bottom" | "left";
    align?: "start" | "center" | "end";
}

export function EnhancedTooltip({
    title,
    content,
    dataSource,
    confidence,
    lastUpdated,
    calculation,
    className = "",
    variant = "info",
    side = "top",
    align = "center",
}: EnhancedTooltipProps) {
    // Determine optimal positioning based on screen size and position
    const getOptimalSide = () => {
        if (typeof window === "undefined") return side;

        const screenWidth = window.innerWidth;
        const isMobile = screenWidth < 768;
        const isTablet = screenWidth >= 768 && screenWidth < 1024;

        // On mobile and tablet, prefer bottom to avoid top cutoff
        if (isMobile && (side === "top" || side === "left" || side === "right")) return "bottom";
        if (isTablet && side === "top") return "bottom";

        return side;
    };

    const getOptimalAlign = () => {
        if (typeof window === "undefined") return align;

        const screenWidth = window.innerWidth;
        const isMobile = screenWidth < 768;

        // On mobile, prefer center alignment for better positioning
        if (isMobile) return "center";

        return align;
    };
    const getIcon = () => {
        // Always use Info icon for consistency as requested
        return <Info className="w-3 h-3" />;
    };

    const getIconColor = () => {
        switch (variant) {
            case "data":
                return "text-green-500 hover:text-green-700";
            case "help":
                return "text-gray-500 hover:text-gray-700";
            case "trend":
                return "text-purple-500 hover:text-purple-700";
            default:
                return "text-blue-500 hover:text-blue-700";
        }
    };

    const formatConfidence = (conf: number) => {
        const percentage = Math.round(conf * 100);
        let colorClass = "text-green-600";
        if (percentage < 50) colorClass = "text-red-600";
        else if (percentage < 75) colorClass = "text-orange-600";

        return <span className={colorClass}>{percentage}%</span>;
    };

    return (
        <TooltipProvider delayDuration={200}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <button
                        className={cn(
                            "inline-flex items-center ml-1 transition-colors rounded-full p-0.5 hover:bg-gray-100",
                            getIconColor(),
                            className
                        )}
                        type="button"
                    >
                        {getIcon()}
                    </button>
                </TooltipTrigger>
                <TooltipContent
                    side={getOptimalSide()}
                    align={getOptimalAlign()}
                    className="max-w-xs sm:max-w-sm z-50 max-h-80 overflow-auto touch-pan-y"
                    sideOffset={1}
                    alignOffset={0}
                    avoidCollisions={true}
                    sticky="always"
                    collisionPadding={4}
                >
                    <div className="space-y-2">
                        <div className="font-medium text-gray-900 border-b border-gray-200 pb-1">{title}</div>

                        <div className="text-sm text-gray-700">{content}</div>

                        {(dataSource || confidence || lastUpdated || calculation) && (
                            <div className="pt-2 mt-2 border-t border-gray-200 space-y-1">
                                {dataSource && (
                                    <div className="flex items-center text-xs text-gray-600">
                                        <Database className="w-3 h-3 mr-1" />
                                        <span className="font-medium">Source:</span>
                                        <span className="ml-1">{dataSource}</span>
                                    </div>
                                )}

                                {confidence !== undefined && (
                                    <div className="flex items-center text-xs text-gray-600">
                                        <TrendingUp className="w-3 h-3 mr-1" />
                                        <span className="font-medium">Confidence:</span>
                                        <span className="ml-1">{formatConfidence(confidence)}</span>
                                    </div>
                                )}

                                {lastUpdated && (
                                    <div className="flex items-center text-xs text-gray-600">
                                        <Clock className="w-3 h-3 mr-1" />
                                        <span className="font-medium">Updated:</span>
                                        <span className="ml-1">{lastUpdated}</span>
                                    </div>
                                )}

                                {calculation && (
                                    <div className="text-xs text-gray-600">
                                        <span className="font-medium">Calculation:</span>
                                        <div className="mt-1 p-2 bg-gray-50 rounded text-xs font-mono">
                                            {calculation}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}
