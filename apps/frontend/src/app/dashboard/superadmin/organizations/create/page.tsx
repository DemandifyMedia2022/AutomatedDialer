'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { ArrowLeft, Loader2 } from 'lucide-react'

export default function CreateOrganizationPage() {
    const router = useRouter()
    const { toast } = useToast()
    const [loading, setLoading] = useState(false)

    const [formData, setFormData] = useState({
        name: '',
        contact_email: '',
        is_demo: false,
        valid_days: 14,
        max_users: 10,
        provision_agents: 2,
        provision_managers: 1,
        provision_qas: 0
    })

    const handleChange = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const payload = {
                ...formData,
                valid_until: formData.is_demo
                    ? new Date(Date.now() + formData.valid_days * 24 * 60 * 60 * 1000).toISOString()
                    : undefined
            }

            await api.post('/api/superadmin/organizations', payload)

            toast({
                title: 'Organization Created',
                description: `Organization ${formData.name} created successfully with ${formData.provision_agents + formData.provision_managers + formData.provision_qas} users.`
            })

            router.push('/dashboard/superadmin/organizations')
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.response?.data?.message || 'Failed to create organization',
                variant: 'destructive'
            })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex flex-1 flex-col gap-4 p-4 max-w-4xl mx-auto w-full">
            <Button variant="ghost" className="w-fit" onClick={() => router.back()}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Organizations
            </Button>

            <Card>
                <CardHeader>
                    <CardTitle>Create New Organization</CardTitle>
                    <CardDescription>
                        Create a new organization and automatically provision user accounts.
                    </CardDescription>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-6">
                        <div className="space-y-4">
                            <h3 className="text-lg font-medium">Basic Information</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Organization Name *</Label>
                                    <Input
                                        id="name"
                                        value={formData.name}
                                        onChange={(e) => handleChange('name', e.target.value)}
                                        placeholder="e.g. Acme Corp"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="contact_email">Contact Email</Label>
                                    <Input
                                        id="contact_email"
                                        type="email"
                                        value={formData.contact_email}
                                        onChange={(e) => handleChange('contact_email', e.target.value)}
                                        placeholder="admin@acme.com"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="is_demo"
                                    checked={formData.is_demo}
                                    onCheckedChange={(checked) => handleChange('is_demo', checked)}
                                />
                                <Label htmlFor="is_demo">This is a Demo Organization</Label>
                            </div>

                            {formData.is_demo && (
                                <div className="space-y-2">
                                    <Label htmlFor="valid_days">Demo Duration (Days)</Label>
                                    <Input
                                        id="valid_days"
                                        type="number"
                                        value={formData.valid_days}
                                        onChange={(e) => handleChange('valid_days', parseInt(e.target.value))}
                                    />
                                </div>
                            )}
                        </div>

                        <div className="space-y-4 pt-4 border-t">
                            <h3 className="text-lg font-medium">User Provisioning</h3>
                            <p className="text-sm text-muted-foreground">Automatically create users for this organization (Default password: password123)</p>

                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="provision_agents">Agents</Label>
                                    <Input
                                        id="provision_agents"
                                        type="number"
                                        min="0"
                                        value={formData.provision_agents}
                                        onChange={(e) => handleChange('provision_agents', parseInt(e.target.value))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="provision_managers">Managers</Label>
                                    <Input
                                        id="provision_managers"
                                        type="number"
                                        min="0"
                                        value={formData.provision_managers}
                                        onChange={(e) => handleChange('provision_managers', parseInt(e.target.value))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="provision_qas">QA Specialists</Label>
                                    <Input
                                        id="provision_qas"
                                        type="number"
                                        min="0"
                                        value={formData.provision_qas}
                                        onChange={(e) => handleChange('provision_qas', parseInt(e.target.value))}
                                    />
                                </div>
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="flex justify-end gap-2 pt-6">
                        <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Create Organization
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    )
}
