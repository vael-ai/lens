import React from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";

// Citation interface
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

interface CitationLinkProps {
    citation: Citation;
    className?: string;
}

export function CitationLink({ citation, className = "" }: CitationLinkProps) {
    const formattedDate = (dateStr?: string) => {
        if (!dateStr) return "Unknown";
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
        } catch (e) {
            return dateStr;
        }
    };

    const dateRange =
        citation.timeRangeStart || citation.timeRangeEnd
            ? `${formattedDate(citation.timeRangeStart)} - ${formattedDate(citation.timeRangeEnd)}`
            : "No date range available";

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <button className={`inline-flex items-center text-gray-400 hover:text-gray-600 ${className}`}>
                    <Info className="w-3 h-3" />
                </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-md">
                <div className="space-y-1 text-xs">
                    <p className="font-medium">Data Source: {citation.domainOrFeature}</p>
                    <p>Type: {citation.dataType}</p>
                    {citation.confidence !== undefined && <p>Confidence: {(citation.confidence * 100).toFixed(0)}%</p>}
                    <p>Time Range: {dateRange}</p>

                    <div className="pt-2 mt-2 border-t border-gray-200">
                        <p className="font-medium text-blue-600">Data Used:</p>
                        <p className="font-mono text-xs text-gray-700 break-all">{citation.dataPath}</p>
                        {citation.rawDataValue !== undefined && (
                            <div className="mt-1">
                                <p className="text-xs font-medium">Value:</p>
                                <p className="font-mono text-xs text-gray-600 bg-gray-100 px-1 py-0.5 rounded max-h-16 overflow-y-auto">
                                    {typeof citation.rawDataValue === "object"
                                        ? JSON.stringify(citation.rawDataValue, null, 2).slice(0, 200) +
                                          (JSON.stringify(citation.rawDataValue).length > 200 ? "..." : "")
                                        : String(citation.rawDataValue)}
                                </p>
                            </div>
                        )}
                        {citation.calculation && (
                            <div className="mt-1">
                                <p className="text-xs font-medium">Calculation:</p>
                                <p className="text-xs text-gray-600">{citation.calculation}</p>
                            </div>
                        )}
                    </div>

                    <p className="text-xs text-gray-500 mt-1 pt-1 border-t">ID: {citation.sourceId.substring(0, 12)}</p>
                </div>
            </TooltipContent>
        </Tooltip>
    );
}
