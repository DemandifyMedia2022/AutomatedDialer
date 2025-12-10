"use client"

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts"
import { useTheme } from "next-themes"

interface DispositionChartProps {
    view: 'daily' | 'monthly'
}

export function DispositionChart({ view }: DispositionChartProps) {
    const { theme } = useTheme()
    const isDark = theme === "dark"

    // Mock data generator
    const generateData = () => {
        const data = []
        const points = view === 'daily' ? 12 : 15 // 2-hour intervals or 2-day intervals

        for (let i = 0; i < points; i++) {
            let label = ""
            if (view === 'daily') {
                const hour = i * 2
                label = `${hour === 0 ? 12 : hour > 12 ? hour - 12 : hour}${hour === 0 || hour === 24 ? 'am' : hour >= 12 ? 'pm' : 'am'}`
            } else {
                label = `${(i * 2) + 1}`
            }

            // Make the curve look "sophisticated" - minimal random noise, smooth waves
            // Answered usually lower than failed in this specific user scenario? Or vice versa.
            // Let's assume some realistic call center stats.
            const baseAnswered = view === 'daily'
                ? 15 + Math.sin(i / 2) * 10 + Math.random() * 5
                : 40 + Math.sin(i / 3) * 20 + Math.random() * 10

            const baseFailed = view === 'daily'
                ? 5 + Math.cos(i / 2) * 3 + Math.random() * 2
                : 15 + Math.cos(i / 3) * 5 + Math.random() * 5

            data.push({
                name: label,
                answered: Math.max(0, Math.round(baseAnswered)),
                failed: Math.max(0, Math.round(baseFailed)),
            })
        }
        return data
    }

    const data = generateData()

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
