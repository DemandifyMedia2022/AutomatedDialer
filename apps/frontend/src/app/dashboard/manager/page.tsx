import { ManagerSidebar } from "./components/ManagerSidebar"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Users, PhoneCall, PhoneIncoming, Timer, Trophy } from "lucide-react"

function LineChart({ data }: { data: number[] }) {
  const max = Math.max(...data, 1)
  const width = 600
  const height = 220
  const paddingX = 12
  const paddingY = 12
  const innerW = width - paddingX * 2
  const innerH = height - paddingY * 2
  const step = data.length > 1 ? innerW / (data.length - 1) : innerW
  const points = data
    .map((v, i) => {
      const x = paddingX + i * step
      const y = paddingY + (1 - v / max) * innerH
      return `${x},${y}`
    })
    .join(" ")
  return (
    <div className="mt-4 h-56 w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full">
        <defs>
          <linearGradient id="lineFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.25" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polyline
          points={points}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="3"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <polygon
          points={`${points} ${paddingX + innerW},${paddingY + innerH} ${paddingX},${paddingY + innerH}`}
          fill="url(#lineFill)"
        />
        {data.map((v, i) => {
          const x = paddingX + i * step
          const y = paddingY + (1 - v / max) * innerH
          return (
            <g key={i}>
              <circle cx={x} cy={y} r={3} fill="hsl(var(--primary))" />
              <circle cx={x} cy={y} r={10} fill="transparent" className="cursor-pointer" />
              <title>{v}</title>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

export default function Page() {
  return (
    <SidebarProvider>
      <ManagerSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Manager</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="transition-shadow hover:shadow-sm">
              <CardHeader>
                <div className="flex items-start gap-3">
                  <div className="grid size-10 place-items-center rounded-full border bg-emerald-500/10 text-emerald-700 border-emerald-500/20">
                    <Users className="size-4" />
                  </div>
                  <div>
                    <CardTitle className="font-medium text-base">Active Agents</CardTitle>
                    <CardDescription>Agents currently on calls</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-medium">24</div>
              </CardContent>
            </Card>
            <Card className="transition-shadow hover:shadow-sm">
              <CardHeader>
                <div className="flex items-start gap-3">
                  <div className="grid size-10 place-items-center rounded-full border bg-blue-500/10 text-blue-700 border-blue-500/20">
                    <PhoneCall className="size-4" />
                  </div>
                  <div>
                    <CardTitle className="font-medium text-base">Avg Calls Dialed/Agent</CardTitle>
                    <CardDescription>Today</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-medium">56</div>
              </CardContent>
            </Card>
            <Card className="transition-shadow hover:shadow-sm">
              <CardHeader>
                <div className="flex items-start gap-3">
                  <div className="grid size-10 place-items-center rounded-full border bg-violet-500/10 text-violet-700 border-violet-500/20">
                    <PhoneIncoming className="size-4" />
                  </div>
                  <div>
                    <CardTitle className="font-medium text-base">Avg Calls Answered</CardTitle>
                    <CardDescription>Today</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-medium">38</div>
              </CardContent>
            </Card>
            <Card className="transition-shadow hover:shadow-sm">
              <CardHeader>
                <div className="flex items-start gap-3">
                  <div className="grid size-10 place-items-center rounded-full border bg-amber-500/10 text-amber-700 border-amber-500/20">
                    <Timer className="size-4" />
                  </div>
                  <div>
                    <CardTitle className="font-medium text-base">Avg Campaign Time</CardTitle>
                    <CardDescription>Minutes</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-medium">12m</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <Card className="md:col-span-3 transition-shadow hover:shadow-sm">
              <CardHeader>
                <CardTitle className="font-medium text-base">Calling Activity</CardTitle>
                <CardDescription>Toggle to view Daily or Monthly</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="daily">
                  <TabsList>
                    <TabsTrigger value="daily">Daily</TabsTrigger>
                    <TabsTrigger value="monthly">Monthly</TabsTrigger>
                  </TabsList>
                  <TabsContent value="daily">
                    {(() => {
                      const daily = [12, 18, 9, 20, 14, 22, 17]
                      return <LineChart data={daily} />
                    })()}
                  </TabsContent>
                  <TabsContent value="monthly">
                    {(() => {
                      const monthly = [120, 180, 90, 200, 140, 220, 170, 190, 160, 210, 230, 175]
                      return <LineChart data={monthly} />
                    })()}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
            <Card className="transition-shadow hover:shadow-sm">
              <CardHeader>
                <div className="flex items-start gap-3">
                  <div className="grid size-10 place-items-center rounded-full border bg-blue-500/10 text-blue-700 border-blue-500/20">
                    <Trophy className="size-4" />
                  </div>
                  <div>
                    <CardTitle className="font-medium text-base">Leader Board</CardTitle>
                    <CardDescription>Top performers</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {([
                    { name: "A. Sharma", count: 92 },
                    { name: "R. Singh", count: 88 },
                    { name: "P. Patel", count: 85 },
                    { name: "N. Khan", count: 82 },
                  ] as { name: string; count: number }[]).map((row, idx) => (
                    <div key={row.name} className="grid grid-cols-[1fr_auto] items-center gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar className="h-7 w-7">
                          <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(row.name)}`} alt={row.name} />
                          <AvatarFallback>{row.name.split(" ").map(s=>s[0]).slice(0,2).join("")}</AvatarFallback>
                        </Avatar>
                        <div className="truncate text-sm">{row.name}</div>
                        {idx < 3 && (
                          <span className="ml-2 text-[11px] px-2 py-0.5 rounded-full border bg-primary/5 text-primary border-primary/20">#{idx + 1}</span>
                        )}
                      </div>
                      <span className="text-sm font-medium tabular-nums px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-700 border border-blue-500/20">{row.count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card className="transition-shadow hover:shadow-sm">
              <CardHeader>
                <CardTitle className="font-medium text-base">Playbook</CardTitle>
                <CardDescription>Guided workflows for agents</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Create standardized calling sequences, scripts, and dispositions to improve outcomes.</p>
              </CardContent>
              <CardFooter>
                <Button>Add Playbook</Button>
              </CardFooter>
            </Card>
            <Card className="transition-shadow hover:shadow-sm">
              <CardHeader>
                <CardTitle className="font-medium text-base">Campaign</CardTitle>
                <CardDescription>Manage campaign targets and pacing</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Set up new campaigns with audience, schedules, and success metrics to track performance.</p>
              </CardContent>
              <CardFooter>
                <Button>Add Campaign</Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}