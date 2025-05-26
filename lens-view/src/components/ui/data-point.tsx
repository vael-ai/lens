"use client";

import React from "react";
import { EnhancedTooltip } from "@/components/ui/enhanced-tooltip";
import { cn } from "@/lib/utils";

interface Citation {
    sourceId: string;
    domainOrFeature: string;
    dataType: string;
    confidence?: number;
    timeRangeStart?: string;
    timeRangeEnd?: string;
    dataPath: string;
    rawDataValue?: string | number | any[] | Record<string, any>;
    calculation?: string;
}

interface DataPointProps {
    value: string | number | React.ReactNode;
    label: string;
    description?: string;
    citation?: Citation;
    unit?: string;
    className?: string;
    variant?: "large" | "medium" | "small";
    showConfidence?: boolean;
    tooltipVariant?: "info" | "data" | "help" | "trend";
    rawDataPath?: string; // e.g., "websites['amazon.com'].totalFocusTime"
    rawDataValue?: any; // The actual raw data value from CollectedData
}

export function DataPoint({
    value,
    label,
    description,
    citation,
    unit,
    className = "",
    variant = "medium",
    showConfidence = true,
    tooltipVariant = "data",
    rawDataPath,
    rawDataValue,
}: DataPointProps) {
    const getValueSize = () => {
        switch (variant) {
            case "large":
                return "text-2xl sm:text-3xl lg:text-4xl";
            case "small":
                return "text-lg sm:text-xl";
            default:
                return "text-xl sm:text-2xl";
        }
    };

    const getLabelSize = () => {
        switch (variant) {
            case "large":
                return "text-base sm:text-lg";
            case "small":
                return "text-xs sm:text-sm";
            default:
                return "text-sm sm:text-base";
        }
    };

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return "Unknown";
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
            });
        } catch (e) {
            return dateStr;
        }
    };

    const getTooltipContent = () => {
        if (!citation && !rawDataPath) return description || "No additional information available";

        const dateRange =
            citation?.timeRangeStart || citation?.timeRangeEnd
                ? `${formatDate(citation.timeRangeStart)} - ${formatDate(citation.timeRangeEnd)}`
                : undefined;

        return (
            <div className="space-y-2">
                {description && <div>{description}</div>}

                <div className="text-xs space-y-2">
                    {/* Show actual raw data path and value */}
                    {rawDataPath && (
                        <div>
                            <strong className="text-blue-600">Raw Data Source:</strong>
                            <div className="mt-1 p-2 bg-blue-50 rounded border border-blue-200">
                                <code className="text-xs font-mono text-blue-800">{rawDataPath}</code>
                            </div>
                        </div>
                    )}

                    {rawDataValue !== undefined && (
                        <div>
                            <strong className="text-green-600">Actual Value:</strong>
                            <div className="mt-1 p-2 bg-green-50 rounded border border-green-200 max-h-32 overflow-auto">
                                <code className="text-xs font-mono text-green-800 whitespace-pre-wrap break-words">
                                    {typeof rawDataValue === "object"
                                        ? JSON.stringify(rawDataValue, null, 2)
                                        : String(rawDataValue)}
                                </code>
                            </div>
                        </div>
                    )}

                    {citation && (
                        <>
                            {citation.dataPath && (
                                <div>
                                    <strong>Processing Path:</strong> {citation.dataPath}
                                </div>
                            )}
                            {dateRange && (
                                <div>
                                    <strong>Time Range:</strong> {dateRange}
                                </div>
                            )}
                            {citation.calculation && (
                                <div>
                                    <strong>Calculation:</strong>
                                    <div className="mt-1 p-1 bg-gray-100 rounded text-xs">{citation.calculation}</div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className={cn("text-center", className)}>
            <div className="flex items-center justify-center space-x-1">
                <span className={cn("font-bold", getValueSize())}>{value}</span>
                {unit && <span className={cn("text-gray-600", getLabelSize())}>{unit}</span>}
                {(citation || description || rawDataPath) && (
                    <EnhancedTooltip
                        title={label}
                        content={getTooltipContent()}
                        dataSource={citation?.domainOrFeature || "Raw browsing data"}
                        confidence={showConfidence ? citation?.confidence : undefined}
                        calculation={citation?.calculation}
                        variant={tooltipVariant}
                        className="ml-1"
                        side="bottom"
                        align="center"
                    />
                )}
            </div>
            <h3 className={cn("font-semibold mt-1", getLabelSize())}>{label}</h3>
            {!citation && !description && variant === "large" && (
                <p className="text-xs text-gray-600 sm:text-sm mt-1">Click info icons for data sources</p>
            )}
        </div>
    );
}
