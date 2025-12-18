"use client"

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useTheme } from "next-themes"

interface CallsTrendChartProps {
    data: { label: string; value: number }[]
    loading?: boolean
    range: 'daily' | 'monthly'
    onRangeChange: (range: 'daily' | 'monthly') => void
}

const CustomTooltip = ({ active, payload, label, isDark }: any) => {
    if (active && payload && payload.length) {
        return (
            <div
                className="rounded-lg border p-2 shadow-sm"
                style={{
                    backgroundColor: isDark ? "#1f2937" : "#fff",
                    borderColor: isDark ? "#374151" : "#e5e7eb",
                    color: isDark ? "#f3f4f6" : "#1f2937"
                }}
            >
                <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col">
                        <span className="text-[0.70rem] uppercase opacity-70">
                            {label}
                        </span>
                        <span className="font-bold">
                            {payload[0].value} calls
                        </span>
                    </div>
                </div>
            </div>
        )
    }
    return null
}

export function CallsTrendChart({ data, loading, range, onRangeChange }: CallsTrendChartProps) {
    const { theme } = useTheme()
    const isDark = theme === "dark"

    // Calculate max value for better Y-axis scaling, adding some buffer
    const maxValue = Math.max(...data.map(d => d.value), 5)

    return (
        <Card className="md:col-span-2 transition-shadow hover:shadow-md duration-200 h-full">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="font-medium text-base">Calls Trend</CardTitle>
                        <CardDescription>Call volume over time</CardDescription>
                    </div>
                    <Tabs value={range} onValueChange={(v) => onRangeChange(v as 'daily' | 'monthly')} className="w-auto">
                        <TabsList className="grid w-full grid-cols-2 h-8">
                            <TabsTrigger value="daily" className="text-xs px-2 h-6">Daily</TabsTrigger>
                            <TabsTrigger value="monthly" className="text-xs px-2 h-6">Monthly</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>
            </CardHeader>
            <CardContent>
                <div className="h-[250px] w-full mt-4">
                    {loading ? (
                        <div className="h-full w-full flex items-center justify-center">
                            <div className="animate-pulse flex flex-col items-center">
                                <div className="h-4 w-32 bg-muted rounded mb-2"></div>
                                <div className="h-32 w-full bg-muted/20 rounded"></div>
                            </div>
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart
                                data={data}
                                margin={{
                                    top: 10,
                                    right: 10,
                                    left: 0,
                                    bottom: 0,
                                }}
                            >
                                <defs>
                                    <linearGradient id="colorCalls" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "#333" : "#e5e7eb"} />
                                <XAxis
                                    dataKey="label"
                                    tickLine={false}
                                    axisLine={false}
                                    tickMargin={10}
                                    minTickGap={30}
                                    tick={{ fontSize: 12, fill: isDark ? "#9ca3af" : "#6b7280" }}
                                />
                                <YAxis
                                    tickLine={false}
                                    axisLine={false}
                                    tickMargin={10}
                                    tickFormatter={(value) => `${value}`}
                                    domain={[0, 'auto']}
                                    tick={{ fontSize: 12, fill: isDark ? "#9ca3af" : "#6b7280" }}
                                />
                                <Tooltip
                                    content={<CustomTooltip isDark={isDark} />}
                                    cursor={{ stroke: isDark ? "#4b5563" : "#9ca3af", strokeWidth: 1, strokeDasharray: '4 4' }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="value"
                                    stroke="#8b5cf6"
                                    strokeWidth={2}
                                    fillOpacity={1}
                                    fill="url(#colorCalls)"
                                    animationDuration={1500}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
