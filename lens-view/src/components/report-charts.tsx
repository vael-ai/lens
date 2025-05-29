"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CitationLink } from "@/components/citation-link";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    PieChart,
    Pie,
    Cell,
    LineChart,
    Line,
    ResponsiveContainer,
    Legend,
} from "recharts";

// Citation interface for chart data
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

interface ChartData {
    focusTimeByDomain: Array<{ domain: string; focusTimeMinutes: number; citation: Citation }>;
    visitCountByCategory: Array<{ category: string; visitCount: number; citation: Citation }>;
    sessionActivityOverTime: Array<{
        date: string;
        sessions: number;
        averageSessionDuration: number;
        citation: Citation;
    }>;
    interactionTypeBreakdown: Array<{ type: string; count: number; citation: Citation }>;
    scrollDepthOverTime?: Array<{ timestamp: string; scrollDepth: number; citation?: Citation }>;
    citations: Citation[];
}

interface ReportChartsProps {
    data: ChartData;
}

// Color palettes for charts
const COLORS = [
    "#3B82F6", // Blue
    "#10B981", // Green
    "#F59E0B", // Yellow
    "#EF4444", // Red
    "#8B5CF6", // Purple
    "#06B6D4", // Cyan
    "#84CC16", // Lime
    "#F97316", // Orange
];

// Category name mapping for better display
const CATEGORY_NAMES: Record<string, string> = {
    shopping: "Shopping",
    travel: "Travel",
    productivity: "Productivity",
    news: "News & Media",
    miscellaneous: "Entertainment",
    social: "Social Media",
    education: "Education",
    gaming: "Gaming",
    finance: "Finance",
    health: "Health & Fitness",
    // Fallback for any numbers or unknown categories
    "0": "Shopping",
    "1": "Travel",
    "2": "Productivity",
    "3": "News & Media",
    "4": "Entertainment",
    "5": "Social Media",
    "6": "Education",
    "7": "Gaming",
    "8": "Finance",
    "9": "Health & Fitness",
};

const CATEGORY_COLORS: Record<string, string> = {
    shopping: "#F59E0B",
    travel: "#06B6D4",
    productivity: "#10B981",
    news: "#EF4444",
    miscellaneous: "#8B5CF6",
    social: "#EC4899",
    education: "#3B82F6",
    gaming: "#F97316",
    finance: "#059669",
    health: "#84CC16",
    // Default colors for fallback cases
    Shopping: "#F59E0B",
    Travel: "#06B6D4",
    Productivity: "#10B981",
    "News & Media": "#EF4444",
    Entertainment: "#8B5CF6",
    "Social Media": "#EC4899",
    Education: "#3B82F6",
    Gaming: "#F97316",
    Finance: "#059669",
    "Health & Fitness": "#84CC16",
};

// Interaction type name mapping for better display
const INTERACTION_NAMES: Record<string, string> = {
    click: "Click",
    scroll: "Scroll",
    hover: "Hover",
    input: "Input",
    selection: "Selection",
    navigation: "Navigation",
    focus: "Focus",
    typing: "Typing",
    keypress: "Keypress",
    // Fallback for any numbers or unknown interaction types
    "0": "Click",
    "1": "Scroll",
    "2": "Hover",
    "3": "Input",
    "4": "Selection",
    "5": "Navigation",
    "6": "Focus",
    "7": "Typing",
};

export function ReportCharts({ data }: ReportChartsProps) {
    // Responsive domain formatting based on screen size
    const formatDomain = (domain: string) => {
        const isMobileCheck = typeof window !== "undefined" && window.innerWidth < 640;
        if (isMobileCheck) {
            return domain.length > 10 ? domain.substring(0, 8) + "..." : domain;
        }
        return domain.length > 20 ? domain.substring(0, 17) + "..." : domain;
    };

    // Format category names for better display
    const formatCategory = (category: string) => {
        return CATEGORY_NAMES[category] || category.charAt(0).toUpperCase() + category.slice(1);
    };

    // Responsive chart dimensions
    const getChartHeight = (baseHeight: number) => {
        if (typeof window !== "undefined") {
            const width = window.innerWidth;
            if (width < 640) return Math.max(250, baseHeight - 100); // Mobile
            if (width < 1024) return Math.max(300, baseHeight - 50); // Tablet
            return baseHeight; // Desktop
        }
        return baseHeight;
    };

    // Check if mobile
    const isMobile = typeof window !== "undefined" && window.innerWidth < 640;

    // Enhanced custom tooltip for charts
    const CustomTooltip = ({ active, payload, label }: any): React.ReactElement | null => {
        if (active && payload?.length) {
            const dataPoint = payload[0]?.payload;
            const citation = dataPoint?.citation;

            // Format label for better display (especially for long URLs)
            const formatLabel = (rawLabel: string) => {
                if (typeof rawLabel === "string" && rawLabel.length > 25) {
                    return rawLabel.substring(0, 22) + "...";
                }
                return rawLabel;
            };

            // Determine what type of chart this is based on the data
            const isInteractionChart =
                dataPoint && (dataPoint.type || dataPoint.label) && typeof dataPoint.count === "number";
            const displayLabel = isInteractionChart ? dataPoint.type || dataPoint.label || label : label;

            return (
                <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-lg max-w-sm">
                    <p className="font-medium text-gray-900 border-b border-gray-100 pb-2 mb-2" title={displayLabel}>
                        {formatLabel(displayLabel)}
                    </p>
                    {payload.map((entry: any, index: number) => (
                        <div key={index} className="mb-2">
                            <p className="flex items-center justify-between" style={{ color: entry.color }}>
                                <span className="font-medium">{entry.name}:</span>
                                <span className="ml-2">
                                    {entry.value}
                                    {entry.dataKey === "focusTimeMinutes" && " min"}
                                    {entry.dataKey === "sessions" && " sessions"}
                                    {entry.dataKey === "averageSessionDuration" && " min avg"}
                                    {entry.dataKey === "scrollDepth" && "%"}
                                    {(entry.dataKey === "visitCount" || entry.dataKey === "value") && " visits"}
                                    {entry.dataKey === "count" && " interactions"}
                                </span>
                            </p>
                        </div>
                    ))}

                    {citation && (
                        <div className="pt-2 mt-2 border-t border-gray-100 text-xs text-gray-600">
                            <div className="flex items-center mb-1">
                                <span className="font-medium">Source:</span>
                                <span className="ml-1">{citation.domainOrFeature}</span>
                            </div>
                            {citation.confidence && (
                                <div className="flex items-center mb-1">
                                    <span className="font-medium">Confidence:</span>
                                    <span
                                        className={`ml-1 ${citation.confidence > 0.8 ? "text-green-600" : citation.confidence > 0.6 ? "text-orange-600" : "text-red-600"}`}
                                    >
                                        {Math.round(citation.confidence * 100)}%
                                    </span>
                                </div>
                            )}
                            <div className="text-xs text-gray-500 mt-1">Path: {citation.dataPath}</div>
                        </div>
                    )}
                </div>
            );
        }
        return null;
    };

    return (
        <div className="space-y-4 sm:space-y-6 lg:space-y-8 px-2 sm:px-0">
            {/* Focus Time by Domain - Bar Chart */}
            {data.focusTimeByDomain.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg sm:text-xl flex items-center">
                            Time Spent by Website
                            {data.focusTimeByDomain[0]?.citation && (
                                <CitationLink citation={data.focusTimeByDomain[0].citation} className="ml-2" />
                            )}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-2 sm:p-6">
                        <ResponsiveContainer width="100%" height={getChartHeight(380)}>
                            <BarChart
                                data={data.focusTimeByDomain.slice(0, isMobile ? 8 : 10)}
                                margin={{
                                    top: 20,
                                    right: isMobile ? 10 : 30,
                                    left: isMobile ? 10 : 20,
                                    bottom: isMobile ? 60 : 80,
                                }}
                            >
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis
                                    dataKey="domain"
                                    tickFormatter={formatDomain}
                                    angle={-45}
                                    textAnchor="end"
                                    height={isMobile ? 60 : 80}
                                    interval={0}
                                    fontSize={isMobile ? 10 : 12}
                                />
                                <YAxis fontSize={isMobile ? 10 : 12} />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="focusTimeMinutes" fill="#3B82F6" />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            )}

            {/* Visit Count by Category - Pie Chart */}
            {data.visitCountByCategory.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg sm:text-xl flex items-center">
                            Browsing Categories
                            {data.visitCountByCategory[0]?.citation && (
                                <CitationLink citation={data.visitCountByCategory[0].citation} className="ml-2" />
                            )}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-2 sm:p-6">
                        <ResponsiveContainer width="100%" height={getChartHeight(300)}>
                            <PieChart>
                                <Pie
                                    data={data.visitCountByCategory.map((item) => ({
                                        ...item,
                                        name: formatCategory(item.category), // Add name field for labels and legend
                                        category: formatCategory(item.category),
                                        value: item.visitCount, // Ensure value is set for dataKey
                                    }))}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={
                                        isMobile
                                            ? false
                                            : ({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`
                                    }
                                    outerRadius={isMobile ? 60 : 100}
                                    fill="#8884d8"
                                    nameKey="name" // Use nameKey to specify which field to use for names
                                    dataKey="value" // Use value instead of visitCount
                                >
                                    {data.visitCountByCategory.map((entry, index) => {
                                        const categoryName = formatCategory(entry.category);
                                        return (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={CATEGORY_COLORS[categoryName] || COLORS[index % COLORS.length]}
                                            />
                                        );
                                    })}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                                <Legend
                                    formatter={(value) => String(value)} // Ensure legend shows the name value
                                    wrapperStyle={{
                                        fontSize: isMobile ? "12px" : "14px",
                                        paddingTop: "10px",
                                    }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            )}

            {/* Session Activity Over Time - Line Chart */}
            {data.sessionActivityOverTime.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg sm:text-xl flex items-center">
                            Browsing Activity Over Time
                            {data.sessionActivityOverTime[0]?.citation && (
                                <CitationLink citation={data.sessionActivityOverTime[0].citation} className="ml-2" />
                            )}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-2 sm:p-6">
                        <ResponsiveContainer width="100%" height={getChartHeight(300)}>
                            <LineChart
                                data={data.sessionActivityOverTime}
                                margin={{
                                    top: 20,
                                    right: isMobile ? 10 : 30,
                                    left: isMobile ? 10 : 20,
                                    bottom: 20,
                                }}
                            >
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis
                                    dataKey="date"
                                    tickFormatter={(value) => {
                                        // Parse the date string to ensure proper formatting
                                        let date;

                                        // Handle various date formats
                                        if (typeof value === "string") {
                                            // For YYYY-MM-DD format, parse as UTC to avoid timezone issues
                                            if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
                                                const parts = value.split("-").map(Number);
                                                if (parts.length === 3 && parts.every((n) => !isNaN(n))) {
                                                    const [year, month, day] = parts as [number, number, number];
                                                    date = new Date(year, month - 1, day); // Use local date constructor
                                                } else {
                                                    date = new Date(value);
                                                }
                                            } else {
                                                // Try parsing as ISO string first
                                                date = new Date(value);
                                            }
                                        } else if (typeof value === "number") {
                                            date = new Date(value);
                                        } else {
                                            date = new Date(value);
                                        }

                                        // Check if date is valid
                                        if (isNaN(date.getTime())) {
                                            console.warn("Invalid date value:", value);
                                            return String(value);
                                        }

                                        // Use more detailed formatting
                                        return isMobile
                                            ? date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
                                            : date.toLocaleDateString("en-US", {
                                                  year: "numeric",
                                                  month: "long",
                                                  day: "numeric",
                                              });
                                    }}
                                    fontSize={isMobile ? 10 : 12}
                                />
                                <YAxis yAxisId="left" fontSize={isMobile ? 10 : 12} />
                                {!isMobile && <YAxis yAxisId="right" orientation="right" fontSize={12} />}
                                <Tooltip
                                    content={<CustomTooltip />}
                                    labelFormatter={(value) => {
                                        let date;

                                        // Handle various date formats
                                        if (typeof value === "string") {
                                            // For YYYY-MM-DD format, parse as UTC to avoid timezone issues
                                            if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
                                                const parts = value.split("-").map(Number);
                                                if (parts.length === 3 && parts.every((n) => !isNaN(n))) {
                                                    const [year, month, day] = parts as [number, number, number];
                                                    date = new Date(year, month - 1, day); // Use local date constructor
                                                } else {
                                                    date = new Date(value);
                                                }
                                            } else {
                                                date = new Date(value);
                                            }
                                        } else if (typeof value === "number") {
                                            date = new Date(value);
                                        } else {
                                            date = new Date(value);
                                        }

                                        if (isNaN(date.getTime())) {
                                            console.warn("Invalid date in tooltip:", value);
                                            return String(value);
                                        }

                                        // Show more detailed date in tooltip including weekday
                                        return date.toLocaleDateString("en-US", {
                                            weekday: "long",
                                            year: "numeric",
                                            month: "long",
                                            day: "numeric",
                                        });
                                    }}
                                />
                                <Legend
                                    wrapperStyle={{
                                        fontSize: isMobile ? "11px" : "14px",
                                    }}
                                />
                                <Line
                                    yAxisId="left"
                                    type="monotone"
                                    dataKey="sessions"
                                    stroke="#3B82F6"
                                    strokeWidth={isMobile ? 1.5 : 2}
                                    name="Sessions"
                                    dot={{ r: isMobile ? 2 : 3 }}
                                />
                                <Line
                                    yAxisId={isMobile ? "left" : "right"}
                                    type="monotone"
                                    dataKey="averageSessionDuration"
                                    stroke="#10B981"
                                    strokeWidth={isMobile ? 1.5 : 2}
                                    name="Avg Duration (min)"
                                    dot={{ r: isMobile ? 2 : 3 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            )}

            {/* Interaction Type Breakdown - Bar Chart */}
            {data.interactionTypeBreakdown.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg sm:text-xl flex items-center">
                            Interaction Type Distribution
                            {data.interactionTypeBreakdown[0]?.citation && (
                                <CitationLink citation={data.interactionTypeBreakdown[0].citation} className="ml-2" />
                            )}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-2 sm:p-6">
                        {/* Enhanced key/legend for numeric or unclear labels */}
                        {data.interactionTypeBreakdown.some(
                            (item) =>
                                /^\d+(\.\d+)?$/.test(String(item.type)) ||
                                String(item.type).toLowerCase().includes("type") ||
                                ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"].includes(String(item.type))
                        ) && (
                            <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
                                <h4 className="text-sm font-semibold text-blue-800 mb-3 flex items-center">
                                    🔑 Interaction Type Guide
                                    <span className="ml-2 text-xs font-normal text-blue-600">
                                        (What these numbers mean)
                                    </span>
                                </h4>
                                <div className="grid grid-cols-2 gap-2 text-xs text-blue-700 md:grid-cols-4">
                                    <div className="flex items-center space-x-2">
                                        <span className="font-medium">0 =</span>
                                        <span>Click</span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <span className="font-medium">1 =</span>
                                        <span>Scroll</span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <span className="font-medium">2 =</span>
                                        <span>Hover</span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <span className="font-medium">3 =</span>
                                        <span>Input</span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <span className="font-medium">4 =</span>
                                        <span>Selection</span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <span className="font-medium">5 =</span>
                                        <span>Navigation</span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <span className="font-medium">6 =</span>
                                        <span>Focus</span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <span className="font-medium">7 =</span>
                                        <span>Typing</span>
                                    </div>
                                </div>
                                <p className="mt-2 text-xs text-blue-600">
                                    💡 <strong>Tip:</strong> These represent different ways you interact with websites -
                                    clicking links, scrolling through content, hovering over elements, typing in forms,
                                    etc.
                                </p>
                            </div>
                        )}
                        <ResponsiveContainer width="100%" height={getChartHeight(280)}>
                            <BarChart
                                data={data.interactionTypeBreakdown.map((item) => {
                                    // Enhanced label mapping with better fallbacks
                                    const typeStr = String(item.type).toLowerCase().trim();
                                    const numericMappings: Record<string, string> = {
                                        "0": "Click",
                                        "1": "Scroll",
                                        "2": "Hover",
                                        "3": "Input",
                                        "4": "Selection",
                                        "5": "Navigation",
                                        "6": "Focus",
                                        "7": "Typing",
                                        "0.0": "Click",
                                        "1.0": "Scroll",
                                        "2.0": "Hover",
                                        "3.0": "Input",
                                        "4.0": "Selection",
                                        "5.0": "Navigation",
                                        "6.0": "Focus",
                                        "7.0": "Typing",
                                    };

                                    // Determine the correct descriptive label
                                    let mappedType: string;

                                    // Try direct numeric mapping first
                                    if (numericMappings[typeStr]) {
                                        mappedType = numericMappings[typeStr];
                                    } else {
                                        // Try the existing interaction names mapping
                                        const mappedName = INTERACTION_NAMES[typeStr];
                                        if (mappedName) {
                                            mappedType = mappedName;
                                        } else {
                                            // Pattern-based fallback for any missed cases
                                            if (/^(0|click)/i.test(typeStr)) mappedType = "Click";
                                            else if (/^(1|scroll)/i.test(typeStr)) mappedType = "Scroll";
                                            else if (/^(2|hover)/i.test(typeStr)) mappedType = "Hover";
                                            else if (/^(3|input)/i.test(typeStr)) mappedType = "Input";
                                            else if (/^(4|selection)/i.test(typeStr)) mappedType = "Selection";
                                            else if (/^(5|navigation)/i.test(typeStr)) mappedType = "Navigation";
                                            else if (/^(6|focus)/i.test(typeStr)) mappedType = "Focus";
                                            else if (/^(7|typing|keypress)/i.test(typeStr)) mappedType = "Typing";
                                            else {
                                                // If it's already a proper descriptive string, just capitalize
                                                if (typeof item.type === "string" && !/^\d+(\.\d+)?$/.test(item.type)) {
                                                    mappedType = item.type.charAt(0).toUpperCase() + item.type.slice(1);
                                                } else {
                                                    // Final fallback
                                                    mappedType = `Type ${String(item.type)}`;
                                                }
                                            }
                                        }
                                    }

                                    console.log(`Chart: Mapping interaction type "${item.type}" -> "${mappedType}"`);

                                    // Return the item with BOTH type and label updated so tooltips work correctly
                                    return {
                                        ...item,
                                        type: mappedType, // Update the original type field for tooltips
                                        label: mappedType, // Keep label for Y-axis display
                                    };
                                })}
                                layout="horizontal"
                                margin={{
                                    top: 20,
                                    right: isMobile ? 10 : 30,
                                    left: isMobile ? 60 : 80,
                                    bottom: 20,
                                }}
                            >
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis type="number" fontSize={isMobile ? 10 : 12} />
                                <YAxis
                                    dataKey="label"
                                    type="category"
                                    width={isMobile ? 70 : 110}
                                    fontSize={isMobile ? 9 : 12}
                                />
                                <Tooltip
                                    content={<CustomTooltip />}
                                    formatter={(value, name) => [value, "Interactions"]}
                                />
                                <Bar dataKey="count" fill="#8B5CF6" name="Interactions" />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            )}

            {/* Scroll Depth Over Time - Line Chart (Optional) */}
            {data.scrollDepthOverTime && data.scrollDepthOverTime.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg sm:text-xl">Scroll Depth Patterns</CardTitle>
                    </CardHeader>
                    <CardContent className="p-2 sm:p-6">
                        <ResponsiveContainer width="100%" height={getChartHeight(250)}>
                            <LineChart
                                data={data.scrollDepthOverTime}
                                margin={{
                                    top: 20,
                                    right: isMobile ? 10 : 30,
                                    left: isMobile ? 10 : 20,
                                    bottom: 20,
                                }}
                            >
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis
                                    dataKey="timestamp"
                                    tickFormatter={(value) => {
                                        try {
                                            // Parse timestamp and convert to user's local timezone
                                            const date = new Date(value);
                                            if (isNaN(date.getTime())) return String(value);

                                            // Use user's local timezone automatically
                                            return isMobile
                                                ? date.toLocaleTimeString(undefined, {
                                                      hour: "2-digit",
                                                      minute: "2-digit",
                                                      hour12: false,
                                                  })
                                                : date.toLocaleTimeString(undefined, {
                                                      hour: "2-digit",
                                                      minute: "2-digit",
                                                      second: "2-digit",
                                                      hour12: false,
                                                  });
                                        } catch {
                                            return String(value);
                                        }
                                    }}
                                    fontSize={isMobile ? 10 : 12}
                                />
                                <YAxis domain={[0, 100]} fontSize={isMobile ? 10 : 12} />
                                <Tooltip
                                    content={<CustomTooltip />}
                                    labelFormatter={(value) => {
                                        try {
                                            // Parse timestamp and convert to user's local timezone
                                            const date = new Date(value);
                                            if (isNaN(date.getTime())) return String(value);

                                            // Use user's local timezone for full date/time display
                                            return date.toLocaleString(undefined, {
                                                weekday: "short",
                                                year: "numeric",
                                                month: "short",
                                                day: "numeric",
                                                hour: "2-digit",
                                                minute: "2-digit",
                                                second: "2-digit",
                                                hour12: false,
                                            });
                                        } catch {
                                            return String(value);
                                        }
                                    }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="scrollDepth"
                                    stroke="#F59E0B"
                                    strokeWidth={isMobile ? 1.5 : 2}
                                    dot={{ r: isMobile ? 1 : 2 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
