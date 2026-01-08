"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { Loader2, Lock, Unlock, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"

interface DemoRestriction {
    id: number;
    role: string;
    feature_key: string;
    label: string;
    is_locked: boolean;
}

// Predefined features that can be restricted
const AVAILABLE_FEATURES = [
    { key: 'manual-dialer', label: 'Manual Dialer' },
    { key: 'predictive-dialer', label: 'Predictive Dialer' },
    { key: 'campaigns', label: 'Campaign Management' },
    { key: 'reports', label: 'Analytics & Reports' },
    { key: 'settings', label: 'Settings' },
    { key: 'users', label: 'User Management' },
    { key: 'leads', label: 'Lead Management' },
]

export default function DemoRestrictionsPage() {
    const queryClient = useQueryClient()
    const [activeTab, setActiveTab] = useState("agent")

    const { data: restrictions, isLoading } = useQuery<DemoRestriction[]>({
        queryKey: ['demo-restrictions'],
        queryFn: async () => {
            const res = await api.get('/api/superadmin/demo-restrictions')
            return res.data
        }
    })

    const mutation = useMutation({
        mutationFn: async (data: { role: string, feature_key: string, label: string, is_locked: boolean }) => {
            await api.post('/api/superadmin/demo-restrictions', data)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['demo-restrictions'] })
            toast.success("Restriction updated")
        },
        onError: () => {
            toast.error("Failed to update restriction")
        }
    })

    const getRestriction = (role: string, key: string) => {
        return restrictions?.find(r => r.role === role && r.feature_key === key)
    }

    const handleToggle = (role: string, feature: { key: string, label: string }, currentLocked: boolean) => {
        mutation.mutate({
            role,
            feature_key: feature.key,
            label: feature.label,
            is_locked: !currentLocked
        })
    }

    if (isLoading) return <div className="flex h-96 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>

    return (
        <div className="flex flex-col gap-6 p-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Demo Restrictions</h1>
                <Badge variant="outline" className="text-muted-foreground">
                    Manage feature access for Demo Users
                </Badge>
            </div>

            <Tabs defaultValue="agent" value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full max-w-md grid-cols-3">
                    <TabsTrigger value="agent">Agent</TabsTrigger>
                    <TabsTrigger value="manager">Manager</TabsTrigger>
                    <TabsTrigger value="qa">QA</TabsTrigger>
                </TabsList>

                {["agent", "manager", "qa"].map((role) => (
                    <TabsContent key={role} value={role} className="mt-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="capitalize">{role} Features</CardTitle>
                                <CardDescription>
                                    Toggle which features should be locked for a Demo User with the {role} role.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {AVAILABLE_FEATURES.map((feature) => {
                                    const restriction = getRestriction(role, feature.key)
                                    // Default to locked if not found, or use DB value
                                    // wait, default in DB was TRUE. If no record, we assume... unlocked? 
                                    // It's safer to assume unlocked unless explicitly restricted, 
                                    // OR we iterate the restrictions list.
                                    // For the UI, let's assume "unlocked" if no record exists yet, 
                                    // so the toggle starts off (false).
                                    const isLocked = restriction ? restriction.is_locked : false

                                    return (
                                        <div key={feature.key} className="flex items-center justify-between rounded-lg border p-4">
                                            <div className="space-y-0.5">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium">{feature.label}</span>
                                                    {isLocked ? (
                                                        <Lock className="h-3 w-3 text-red-500" />
                                                    ) : (
                                                        <Unlock className="h-3 w-3 text-green-500" />
                                                    )}
                                                </div>
                                                <p className="text-sm text-muted-foreground">
                                                    {isLocked ? "Feature is locked for demo users" : "Feature is accessible"}
                                                </p>
                                            </div>
                                            <Switch
                                                checked={isLocked}
                                                onCheckedChange={() => handleToggle(role, feature, isLocked)}
                                            />
                                        </div>
                                    )
                                })}
                            </CardContent>
                        </Card>
                    </TabsContent>
                ))}
            </Tabs>
        </div>
    )
}
