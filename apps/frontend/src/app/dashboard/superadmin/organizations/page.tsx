'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Plus, Users, Building } from 'lucide-react'
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

interface Organization {
    id: number
    name: string
    status: string
    is_demo: boolean
    valid_until?: string | null
    max_users: number
    created_at: string
    _count: {
        users: number
    }
}

export default function OrganizationsPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [organizations, setOrganizations] = useState<Organization[]>([])

    useEffect(() => {
        fetchOrgs()
    }, [])

    const fetchOrgs = async () => {
        try {
            setLoading(true)
            const res = await api.get('/api/superadmin/organizations')
            setOrganizations(res.data)
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex flex-1 flex-col gap-4 p-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Organizations</h1>
                    <p className="text-muted-foreground mt-2">
                        Manage organizations and demo accounts
                    </p>
                </div>
                <Button onClick={() => router.push('/dashboard/superadmin/organizations/create')}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Organization
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>All Organizations</CardTitle>
                    <CardDescription>
                        List of all registered organizations on the platform.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Users</TableHead>
                                <TableHead>Created At</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-4">Loading...</TableCell>
                                </TableRow>
                            ) : organizations.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-4">No organizations found</TableCell>
                                </TableRow>
                            ) : (
                                organizations.map((org) => (
                                    <TableRow key={org.id} className="cursor-pointer hover:bg-muted/50" onClick={() => { }}>
                                        <TableCell className="font-medium flex items-center gap-2">
                                            <Building className="h-4 w-4 text-muted-foreground" />
                                            {org.name}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={org.status === 'active' ? 'default' : 'secondary'}>
                                                {org.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {org.is_demo ? (
                                                <Badge variant="outline" className="border-orange-500 text-orange-500">Demo</Badge>
                                            ) : (
                                                <Badge variant="outline">Standard</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1">
                                                <Users className="h-4 w-4 text-muted-foreground" />
                                                <span>{org._count?.users || 0} / {org.max_users}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>{new Date(org.created_at).toLocaleDateString()}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="sm">Manage</Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
