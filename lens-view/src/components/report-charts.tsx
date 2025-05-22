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

const CATEGORY_COLORS: Record<string, string> = {
    shopping: "#F59E0B",
    travel: "#06B6D4",
    productivity: "#10B981",
    news: "#EF4444",
    miscellaneous: "#8B5CF6",
};

export function ReportCharts({ data }: ReportChartsProps) {
    // Format domain names for better display
    const formatDomain = (domain: string) => {
        return domain.length > 15 ? domain.substring(0, 12) + "..." : domain;
    };

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
        <div className="space-y-8">
            {/* Focus Time by Domain - Bar Chart */}
            {data.focusTimeByDomain.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Time Spent by Website</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={data.focusTimeByDomain.slice(0, 10)}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis
                                    dataKey="domain"
                                    tickFormatter={formatDomain}
                                    angle={-45}
                                    textAnchor="end"
                                    height={60}
                                />
                                <YAxis />
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
                        <CardTitle>Browsing Categories</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={data.visitCountByCategory}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    outerRadius={100}
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
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            )}

            {/* Session Activity Over Time - Line Chart */}
            {data.sessionActivityOverTime.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Browsing Activity Over Time</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={data.sessionActivityOverTime}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" tickFormatter={(value) => new Date(value).toLocaleDateString()} />
                                <YAxis yAxisId="left" />
                                <YAxis yAxisId="right" orientation="right" />
                                <Tooltip
                                    content={<CustomTooltip />}
                                    labelFormatter={(value) => new Date(value).toLocaleDateString()}
                                />
                                <Legend />
                                <Line
                                    yAxisId="left"
                                    type="monotone"
                                    dataKey="sessions"
                                    stroke="#3B82F6"
                                    strokeWidth={2}
                                    name="Sessions"
                                />
                                <Line
                                    yAxisId="right"
                                    type="monotone"
                                    dataKey="averageSessionDuration"
                                    stroke="#10B981"
                                    strokeWidth={2}
                                    name="Avg Duration (min)"
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
                        <CardTitle>Interaction Patterns</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={data.interactionTypeBreakdown} layout="horizontal">
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis type="number" />
                                <YAxis dataKey="type" type="category" width={80} />
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
                        <CardTitle>Scroll Depth Patterns</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={250}>
                            <LineChart data={data.scrollDepthOverTime}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis
                                    dataKey="timestamp"
                                    tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                                />
                                <YAxis domain={[0, 100]} />
                                <Tooltip
                                    content={<CustomTooltip />}
                                    labelFormatter={(value) => new Date(value).toLocaleString()}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="scrollDepth"
                                    stroke="#F59E0B"
                                    strokeWidth={2}
                                    dot={{ r: 2 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
