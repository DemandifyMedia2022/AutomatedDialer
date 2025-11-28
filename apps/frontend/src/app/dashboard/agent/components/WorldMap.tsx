"use client"

import React, { useEffect, useState } from "react"
import { ComposableMap, Geographies, Geography, ZoomableGroup, Sphere, Graticule } from "react-simple-maps"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useTheme } from "next-themes"

// Use a TopoJSON source that uses ISO 3166-1 alpha-3 codes for IDs
const GEO_URL = "https://gist.githubusercontent.com/WunderBart/6a3c589643c1978fd5a9/raw/world_by_iso_min_topo.json"

// Timezone offsets (UTC) for countries
const TIMEZONE_OFFSETS: Record<string, number> = {
    USA: -5, CAN: -5, MEX: -6,
    GBR: 0, FRA: 1, DEU: 1, ESP: 1, ITA: 1, NLD: 1, BEL: 1, CHE: 1, SWE: 1, NOR: 1, DNK: 1, POL: 1,
    RUS: 3, KAZ: 5, UKR: 2, BLR: 3,
    CHN: 8, JPN: 9, KOR: 9, IND: 5.5, AUS: 11, NZL: 13,
    BRA: -3, ARG: -3, CHL: -3, COL: -5, PER: -5, VEN: -4,
    ZAF: 2, NGA: 1, EGY: 2, SAU: 3, ARE: 4, TUR: 3, IRN: 3.5,
    PAK: 5, BGD: 6, IDN: 7, THA: 7, VNM: 7, PHL: 8, MYS: 8, SGP: 8,
    ISR: 2, GR: 2, PRT: 0, IRL: 0, ISL: 0,
    FIN: 2, EST: 2, LVA: 2, LTU: 2,
    CZE: 1, AUT: 1, HUN: 1, ROU: 2, BGR: 2,
    MAR: 1, DZA: 1, TUN: 1, KEN: 3, ETH: 3,
    // Add more as needed
}

const WORKING_HOURS = { start: 9, end: 17 } // 9 AM to 5 PM

export function WorldMap() {
    const { theme } = useTheme()
    const [currentTime, setCurrentTime] = useState(new Date())
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
        const timer = setInterval(() => setCurrentTime(new Date()), 60000)
        return () => clearInterval(timer)
    }, [])

    const getCountryStatus = (geo: any) => {
        // The deldersveld TopoJSON uses ISO Alpha-3 as the ID
        const iso = geo.id
        const offset = TIMEZONE_OFFSETS[iso]

        if (offset === undefined) return "unknown"

        const utc = currentTime.getTime() + (currentTime.getTimezoneOffset() * 60000)
        const localTime = new Date(utc + (3600000 * offset))
        const hours = localTime.getHours()

        if (hours >= WORKING_HOURS.start && hours < WORKING_HOURS.end) {
            return "active"
        }
        return "inactive"
    }

    const getLocalTime = (offset: number) => {
        const utc = currentTime.getTime() + (currentTime.getTimezoneOffset() * 60000)
        const localTime = new Date(utc + (3600000 * offset))
        return localTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    if (!mounted) return null

    return (
        <Card className="col-span-full lg:col-span-3 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
            <CardHeader>
                <CardTitle className="flex items-center justify-between">
                    <span>Global Dialing Zones</span>
                    <div className="flex items-center gap-4 text-sm font-normal">
                        <div className="flex items-center gap-2">
                            <span className="block w-3 h-3 rounded-full bg-emerald-500 shadow-sm" />
                            <span className="text-muted-foreground">Active (9AM - 5PM)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="block w-3 h-3 rounded-full bg-muted shadow-sm" />
                            <span className="text-muted-foreground">Inactive</span>
                        </div>
                    </div>
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <div className="h-[500px] w-full bg-accent/30 dark:bg-accent/20 relative">
                    <ComposableMap projection="geoMercator" projectionConfig={{ scale: 150 }}>
                        <ZoomableGroup center={[0, 20]} minZoom={1} maxZoom={4}>
                            <Sphere stroke="none" fill="transparent" id="sphere" strokeWidth={0} />
                            <Graticule stroke={theme === "dark" ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"} />
                            <Geographies geography={GEO_URL}>
                                {({ geographies }) =>
                                    geographies.map((geo) => {
                                        const status = getCountryStatus(geo)
                                        const iso = geo.id
                                        const offset = TIMEZONE_OFFSETS[iso]

                                        return (
                                            <TooltipProvider key={geo.rsmKey}>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Geography
                                                            geography={geo}
                                                            style={{
                                                                default: {
                                                                    fill: status === "active"
                                                                        ? "rgb(16 185 129)" // emerald-500
                                                                        : theme === "dark" ? "hsl(var(--muted))" : "hsl(var(--muted))",
                                                                    stroke: theme === "dark" ? "hsl(var(--border))" : "hsl(var(--border))",
                                                                    strokeWidth: 0.5,
                                                                    outline: "none",
                                                                    transition: "all 250ms ease-in-out"
                                                                },
                                                                hover: {
                                                                    fill: status === "active"
                                                                        ? "rgb(5 150 105)" // emerald-600
                                                                        : theme === "dark" ? "hsl(var(--accent))" : "hsl(var(--accent))",
                                                                    stroke: theme === "dark" ? "hsl(var(--border))" : "hsl(var(--border))",
                                                                    strokeWidth: 0.5,
                                                                    outline: "none",
                                                                    cursor: "pointer"
                                                                },
                                                                pressed: {
                                                                    outline: "none"
                                                                }
                                                            }}
                                                        />
                                                    </TooltipTrigger>
                                                    <TooltipContent className="bg-background border shadow-lg">
                                                        <div className="text-xs space-y-1">
                                                            <div className="font-semibold">{geo.properties.name}</div>
                                                            {offset !== undefined ? (
                                                                <>
                                                                    <div className="text-muted-foreground">Local Time: {getLocalTime(offset)}</div>
                                                                    <div className={status === "active" ? "text-emerald-500 font-medium" : "text-muted-foreground"}>
                                                                        {status === "active" ? "✓ Active Hours" : "○ Off Hours"}
                                                                    </div>
                                                                </>
                                                            ) : (
                                                                <div className="text-muted-foreground">Timezone unknown</div>
                                                            )}
                                                        </div>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        )
                                    })
                                }
                            </Geographies>
                        </ZoomableGroup>
                    </ComposableMap>

                    <div className="absolute bottom-4 left-4 text-xs text-muted-foreground bg-background/90 backdrop-blur-sm px-3 py-2 rounded-md border shadow-sm">
                        <span className="font-medium">UTC:</span> {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
