"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

interface ChartData {
    focusTimeByDomain: Array<{ domain: string; focusTimeMinutes: number }>;
    visitCountByCategory: Array<{ category: string; visitCount: number }>;
    sessionActivityOverTime: Array<{ date: string; sessions: number; averageSessionDuration: number }>;
    interactionTypeBreakdown: Array<{ type: string; count: number }>;
    scrollDepthOverTime?: Array<{ timestamp: string; scrollDepth: number }>;
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

    // Custom tooltip for charts
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload?.length) {
            return (
                <div className="p-3 bg-white border border-gray-200 rounded-lg shadow-lg">
                    <p className="font-medium">{label}</p>
                    {payload.map((entry: any, index: number) => (
                        <p key={index} style={{ color: entry.color }}>
                            {entry.name}: {entry.value}
                            {entry.dataKey === "focusTimeMinutes" && " min"}
                            {entry.dataKey === "sessions" && " sessions"}
                            {entry.dataKey === "averageSessionDuration" && " min avg"}
                            {entry.dataKey === "scrollDepth" && "%"}
                        </p>
                    ))}
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
                        <CardTitle className="text-lg sm:text-xl">Time Spent by Website</CardTitle>
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
                        <CardTitle className="text-lg sm:text-xl">Browsing Categories</CardTitle>
                    </CardHeader>
                    <CardContent className="p-2 sm:p-6">
                        <ResponsiveContainer width="100%" height={getChartHeight(300)}>
                            <PieChart>
                                <Pie
                                    data={data.visitCountByCategory.map((item) => ({
                                        ...item,
                                        category: formatCategory(item.category),
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
                                    dataKey="visitCount"
                                >
                                    {data.visitCountByCategory.map((entry, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={CATEGORY_COLORS[entry.category] || COLORS[index % COLORS.length]}
                                        />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                                <Legend
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
                        <CardTitle className="text-lg sm:text-xl">Browsing Activity Over Time</CardTitle>
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
                                        const date = new Date(value);
                                        return isMobile
                                            ? date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
                                            : date.toLocaleDateString();
                                    }}
                                    fontSize={isMobile ? 10 : 12}
                                />
                                <YAxis yAxisId="left" fontSize={isMobile ? 10 : 12} />
                                {!isMobile && <YAxis yAxisId="right" orientation="right" fontSize={12} />}
                                <Tooltip
                                    content={<CustomTooltip />}
                                    labelFormatter={(value) => new Date(value).toLocaleDateString()}
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
                        <CardTitle className="text-lg sm:text-xl">Interaction Patterns</CardTitle>
                    </CardHeader>
                    <CardContent className="p-2 sm:p-6">
                        <ResponsiveContainer width="100%" height={getChartHeight(280)}>
                            <BarChart
                                data={data.interactionTypeBreakdown}
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
                                    dataKey="type"
                                    type="category"
                                    width={isMobile ? 60 : 100}
                                    fontSize={isMobile ? 9 : 12}
                                />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="count" fill="#8B5CF6" />
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
