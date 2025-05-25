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
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <button className={`inline-flex items-center text-gray-400 hover:text-gray-600 ${className}`}>
                        <Info className="w-3 h-3" />
                    </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                    <div className="space-y-1 text-xs">
                        <p className="font-medium">Source: {citation.domainOrFeature}</p>
                        <p>Data Type: {citation.dataType}</p>
                        {citation.confidence !== undefined && (
                            <p>Confidence: {(citation.confidence * 100).toFixed(0)}%</p>
                        )}
                        <p>Time Range: {dateRange}</p>
                        <p className="text-xs text-gray-500 mt-1">ID: {citation.sourceId.substring(0, 8)}</p>
                    </div>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}
