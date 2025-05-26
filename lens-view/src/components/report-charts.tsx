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
            return domain.length > 8 ? domain.substring(0, 6) + "..." : domain;
        }
        return domain.length > 15 ? domain.substring(0, 12) + "..." : domain;
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

            return (
                <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-lg max-w-sm">
                    <p className="font-medium text-gray-900 border-b border-gray-100 pb-2 mb-2">{label}</p>
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
                                    {entry.dataKey === "visitCount" && " visits"}
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
                                            // Try parsing as ISO string first
                                            date = new Date(value);

                                            // If that fails, try parsing as YYYY-MM-DD
                                            if (isNaN(date.getTime()) && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
                                                date = new Date(value + "T00:00:00");
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
                                            date = new Date(value);
                                            if (isNaN(date.getTime()) && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
                                                date = new Date(value + "T00:00:00");
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
                            Interaction Patterns
                            {data.interactionTypeBreakdown[0]?.citation && (
                                <CitationLink citation={data.interactionTypeBreakdown[0].citation} className="ml-2" />
                            )}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-2 sm:p-6">
                        <ResponsiveContainer width="100%" height={getChartHeight(280)}>
                            <BarChart
                                data={data.interactionTypeBreakdown.map((item) => ({
                                    ...item,
                                    // Map interaction type to human-readable format
                                    label: (() => {
                                        // First try the mapping
                                        const mappedName = INTERACTION_NAMES[item.type];
                                        if (mappedName) return mappedName;

                                        // If it's a numeric string, try mapping
                                        if (typeof item.type === "string" && /^\d+$/.test(item.type)) {
                                            return INTERACTION_NAMES[item.type] || `Type ${item.type}`;
                                        }

                                        // If it's already a proper string, just capitalize
                                        if (typeof item.type === "string") {
                                            return item.type.charAt(0).toUpperCase() + item.type.slice(1);
                                        }

                                        // Fallback
                                        return `Type ${String(item.type)}`;
                                    })(),
                                }))}
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
                                        const date = new Date(value);
                                        return isMobile
                                            ? date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
                                            : date.toLocaleTimeString();
                                    }}
                                    fontSize={isMobile ? 10 : 12}
                                />
                                <YAxis domain={[0, 100]} fontSize={isMobile ? 10 : 12} />
                                <Tooltip
                                    content={<CustomTooltip />}
                                    labelFormatter={(value) => new Date(value).toLocaleString()}
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
