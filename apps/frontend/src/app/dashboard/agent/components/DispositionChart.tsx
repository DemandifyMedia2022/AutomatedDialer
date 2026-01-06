"use client"

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts"
import { useTheme } from "next-themes"


interface DispositionChartProps {
    view: 'daily' | 'monthly'
    data?: { name: string; answered: number; failed: number }[]
}

export function DispositionChart({ view, data = [] }: DispositionChartProps) {
    const { theme } = useTheme()
    const isDark = theme === "dark"

    return (
        <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                        <linearGradient id="colorAnswered" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorFailed" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "#333" : "#e5e7eb"} />
                    <XAxis
                        dataKey="name"
                        stroke={isDark ? "#666" : "#9ca3af"}
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        dy={10}
                    />
                    <YAxis
                        stroke={isDark ? "#666" : "#9ca3af"}
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        dx={-10}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: isDark ? "#1f2937" : "#fff",
                            borderColor: isDark ? "#374151" : "#e5e7eb",
                            borderRadius: "8px",
                            boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)"
                        }}
                        itemStyle={{ fontSize: "12px", fontWeight: 500 }}
                    />
                    <Area
                        type="monotone"
                        dataKey="answered"
                        stroke="#8b5cf6"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#colorAnswered)"
                        name="Answered"
                    />
                    <Area
                        type="monotone"
                        dataKey="failed"
                        stroke="#ef4444"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#colorFailed)"
                        name="Call Failed"
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    )
}
