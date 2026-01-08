'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { api } from '@/lib/api'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ArrowLeft, Users, Plus, Edit, Trash2, UserCheck, UserX } from 'lucide-react'
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'

interface Organization {
    id: number
    name: string
    status: string
    is_demo: boolean
    valid_until?: string | null
    max_users: number
    max_agents: number
    max_managers: number
    max_qa: number
    created_at: string
    _count: {
        users: number
    }
}

interface User {
    id: number
    username: string
    email: string  // Backend returns 'email'
    role: string
    status: string
    extension?: string
}

export default function OrganizationManagePage() {
    const router = useRouter()
    const params = useParams()
    const { toast } = useToast()
    const organizationId = params.id as string

    const [loading, setLoading] = useState(true)
    const [organization, setOrganization] = useState<Organization | null>(null)
    const [users, setUsers] = useState<User[]>([])
    const [showCreateUser, setShowCreateUser] = useState(false)
    const [showEditOrg, setShowEditOrg] = useState(false)
    const [showEditUser, setShowEditUser] = useState(false)
    const [editingUser, setEditingUser] = useState<User | null>(null)

    // Form states
    const [newUser, setNewUser] = useState({
        username: '',
        email: '',
        password: '',
        role: 'agent',
        extension: ''
    })

    const [editUserForm, setEditUserForm] = useState({
        username: '',
        email: '',
        password: '',
        role: 'agent',
        extension: ''
    })

    const [orgEdit, setOrgEdit] = useState({
        name: '',
        status: 'active',
        max_users: 10,
        max_agents: 10,
        max_managers: 2,
        max_qa: 2,
        is_demo: false,
        valid_until: null as string | null
    })

    useEffect(() => {
        if (organizationId) {
            fetchOrganization()
            fetchUsers()
        }
    }, [organizationId])

    const fetchOrganization = async () => {
        try {
            const res = await api.get(`/api/superadmin/organizations/${organizationId}`)
            const org = res.data.data
            setOrganization(org)
            setOrgEdit({
                name: org.name,
                status: org.status,
                max_users: org.max_users,
                max_agents: org.max_agents || 10,
                max_managers: org.max_managers || 2,
                max_qa: org.max_qa || 2,
                is_demo: org.is_demo,
                valid_until: org.valid_until
            })
        } catch (err) {
            console.error('Failed to fetch organization:', err)
        }
    }

    const fetchUsers = async () => {
        try {
            setLoading(true)
            const res = await api.get(`/api/superadmin/users?organization_id=${organizationId}`)
            setUsers(res.data.data?.users || [])
        } catch (err) {
            console.error('Failed to fetch users:', err)
        } finally {
            setLoading(false)
        }
    }

    const handleCreateUser = async () => {
        try {
            await api.post('/api/superadmin/users', {
                username: newUser.username,
                email: newUser.email,
                password: newUser.password,
                role: newUser.role,
                extension: newUser.extension || null,
                organization_id: parseInt(organizationId)
            })
            setShowCreateUser(false)
            setNewUser({ username: '', email: '', password: '', role: 'agent', extension: '' })
            fetchUsers()
            toast({
                title: 'Success',
                description: 'User created successfully',
            })
        } catch (err: any) {
            console.error('Failed to create user:', err)
            toast({
                title: 'Error',
                description: err.response?.data?.message || 'Failed to create user',
                variant: 'destructive',
            })
        }
    }

    const handleUpdateUser = async () => {
        if (!editingUser) return
        try {
            const updateData: any = {
                username: editUserForm.username,
                email: editUserForm.email,
                role: editUserForm.role,
                extension: editUserForm.extension || null
            }
            if (editUserForm.password) {
                updateData.password = editUserForm.password
            }
            await api.put(`/api/superadmin/users/${editingUser.id}`, updateData)
            setShowEditUser(false)
            setEditingUser(null)
            fetchUsers()
            toast({
                title: 'Success',
                description: 'User updated successfully',
            })
        } catch (err: any) {
            console.error('Failed to update user:', err)
            toast({
                title: 'Error',
                description: err.response?.data?.message || 'Failed to update user',
                variant: 'destructive',
            })
        }
    }

    const handleEditButtonClick = (user: User) => {
        setEditingUser(user)
        setEditUserForm({
            username: user.username,
            email: user.email,
            password: '',
            role: user.role,
            extension: user.extension || ''
        })
        setShowEditUser(true)
    }

    const handleUpdateOrganization = async () => {
        try {
            await api.put(`/api/superadmin/organizations/${organizationId}`, orgEdit)
            setShowEditOrg(false)
            fetchOrganization()
        } catch (err) {
            console.error('Failed to update organization:', err)
        }
    }

    const handleToggleUserStatus = async (userId: number, currentStatus: string) => {
        try {
            const newStatus = currentStatus === 'active' ? 'inactive' : 'active'
            await api.patch(`/api/superadmin/users/${userId}/status`, { status: newStatus })
            fetchUsers()
        } catch (err) {
            console.error('Failed to update user status:', err)
        }
    }

    const handleDeleteUser = async (userId: number) => {
        if (confirm('Are you sure you want to delete this user?')) {
            try {
                await api.delete(`/api/superadmin/users/${userId}`)
                fetchUsers()
            } catch (err) {
                console.error('Failed to delete user:', err)
            }
        }
    }

    if (!organization) {
        return <div className="flex items-center justify-center h-64">Loading...</div>
    }

    return (
        <div className="flex flex-1 flex-col gap-4 p-4">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" onClick={() => router.back()}>
                    <ArrowLeft className=" h-4 w-4" />

                </Button>
                <div className="flex-1">
                    <h1 className="text-3xl mt-10 font-bold tracking-tight">{organization.name}</h1>
                    <p className="text-muted-foreground mt-2">
                        Manage users and settings for this organization
                    </p>
                </div>
                <Dialog open={showEditOrg} onOpenChange={setShowEditOrg}>
                    <DialogTrigger asChild>
                        <Button variant="outline">
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Organization
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Edit Organization</DialogTitle>
                            <DialogDescription>
                                Update organization settings and limits.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="name">Organization Name</Label>
                                <Input
                                    id="name"
                                    value={orgEdit.name}
                                    onChange={(e) => setOrgEdit({ ...orgEdit, name: e.target.value })}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="status">Status</Label>
                                <Select value={orgEdit.status} onValueChange={(value) => setOrgEdit({ ...orgEdit, status: value })}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="active">Active</SelectItem>
                                        <SelectItem value="inactive">Inactive</SelectItem>
                                        <SelectItem value="suspended">Suspended</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="maxUsers">Total Max Users</Label>
                                    <Input
                                        id="maxUsers"
                                        type="number"
                                        value={orgEdit.max_users}
                                        onChange={(e) => setOrgEdit({ ...orgEdit, max_users: parseInt(e.target.value) })}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="maxAgents">Max Agents</Label>
                                    <Input
                                        id="maxAgents"
                                        type="number"
                                        value={orgEdit.max_agents}
                                        onChange={(e) => setOrgEdit({ ...orgEdit, max_agents: parseInt(e.target.value) })}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="maxManagers">Max Managers</Label>
                                    <Input
                                        id="maxManagers"
                                        type="number"
                                        value={orgEdit.max_managers}
                                        onChange={(e) => setOrgEdit({ ...orgEdit, max_managers: parseInt(e.target.value) })}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="maxQA">Max QA</Label>
                                    <Input
                                        id="maxQA"
                                        type="number"
                                        value={orgEdit.max_qa}
                                        onChange={(e) => setOrgEdit({ ...orgEdit, max_qa: parseInt(e.target.value) })}
                                    />
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="accountType">Account Type</Label>
                                <div className="flex items-center space-x-2">
                                    <Switch
                                        id="accountType"
                                        checked={orgEdit.is_demo}
                                        onCheckedChange={(checked) => setOrgEdit({ ...orgEdit, is_demo: checked })}
                                    />
                                    <Label htmlFor="accountType" className="text-sm font-normal">
                                        {orgEdit.is_demo ? 'Demo Account' : 'Standard Account'}
                                    </Label>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Demo accounts have limited features and may have expiration dates.
                                </p>
                            </div>
                            {orgEdit.is_demo && (
                                <div className="grid gap-2">
                                    <Label htmlFor="validUntil">Demo Expiration Date (Optional)</Label>
                                    <Input
                                        id="validUntil"
                                        type="datetime-local"
                                        value={orgEdit.valid_until ? new Date(orgEdit.valid_until).toISOString().slice(0, 16) : ''}
                                        onChange={(e) => setOrgEdit({
                                            ...orgEdit,
                                            valid_until: e.target.value ? new Date(e.target.value).toISOString() : null
                                        })}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Leave empty for no expiration. Demo accounts will be restricted after this date.
                                    </p>
                                </div>
                            )}
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setShowEditOrg(false)}>
                                Cancel
                            </Button>
                            <Button onClick={handleUpdateOrganization}>
                                Save Changes
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Organization Stats */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{users.length}</div>
                        <p className="text-xs text-muted-foreground">
                            of {organization.max_users} max
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                        <UserCheck className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {users.filter(u => u.status === 'active').length}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Badge variant={organization.status === 'active' ? 'default' : 'secondary'}>
                            {organization.status}
                        </Badge>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Type</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {organization.is_demo ? (
                                <Badge variant="outline" className="border-orange-500 text-orange-500">Demo</Badge>
                            ) : (
                                <Badge variant="outline">Standard</Badge>
                            )}
                            {organization.is_demo && organization.valid_until && (
                                <div className="text-xs text-muted-foreground">
                                    Expires: {new Date(organization.valid_until).toLocaleDateString()}
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Users Management */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Users</CardTitle>
                            <CardDescription>
                                Manage users in this organization
                            </CardDescription>
                        </div>
                        <Dialog open={showCreateUser} onOpenChange={setShowCreateUser}>
                            <DialogTrigger asChild>
                                <Button>
                                    <Plus className="mr-2 h-4 w-4" />
                                    Add User
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Create New User</DialogTitle>
                                    <DialogDescription>
                                        Add a new user to {organization.name}.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="username">Username</Label>
                                        <Input
                                            id="username"
                                            value={newUser.username}
                                            onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="email">Email</Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            value={newUser.email}
                                            onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="password">Password</Label>
                                        <Input
                                            id="password"
                                            type="password"
                                            value={newUser.password}
                                            onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="role">Role</Label>
                                        <Select value={newUser.role} onValueChange={(value) => setNewUser({ ...newUser, role: value })}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="agent">Agent</SelectItem>
                                                <SelectItem value="manager">Manager</SelectItem>
                                                <SelectItem value="qa">QA</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="extension">Extension (Optional)</Label>
                                        <Input
                                            id="extension"
                                            value={newUser.extension}
                                            onChange={(e) => setNewUser({ ...newUser, extension: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setShowCreateUser(false)}>
                                        Cancel
                                    </Button>
                                    <Button onClick={handleCreateUser}>
                                        Create User
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Username</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Extension</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-4">Loading...</TableCell>
                                </TableRow>
                            ) : users.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-4">No users found</TableCell>
                                </TableRow>
                            ) : (
                                users.map((user) => (
                                    <TableRow key={user.id}>
                                        <TableCell className="font-medium">{user.username}</TableCell>
                                        <TableCell>{user.email}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{user.role}</Badge>
                                        </TableCell>
                                        <TableCell>{user.extension || '-'}</TableCell>
                                        <TableCell>
                                            <Badge variant={user.status === 'active' ? 'default' : 'secondary'}>
                                                {user.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleToggleUserStatus(user.id, user.status)}
                                                    title={user.status === 'active' ? 'Deactivate User' : 'Activate User'}
                                                >
                                                    {user.status === 'active' ? (
                                                        <UserX className="h-4 w-4" />
                                                    ) : (
                                                        <UserCheck className="h-4 w-4" />
                                                    )}
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleEditButtonClick(user)}
                                                    title="Edit User"
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleDeleteUser(user.id)}
                                                    title="Delete User"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Edit User Dialog */}
            <Dialog open={showEditUser} onOpenChange={setShowEditUser}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit User</DialogTitle>
                        <DialogDescription>
                            Update user information for {editingUser?.username}.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="edit-username">Username</Label>
                            <Input
                                id="edit-username"
                                value={editUserForm.username}
                                onChange={(e) => setEditUserForm({ ...editUserForm, username: e.target.value })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="edit-email">Email</Label>
                            <Input
                                id="edit-email"
                                type="email"
                                value={editUserForm.email}
                                onChange={(e) => setEditUserForm({ ...editUserForm, email: e.target.value })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="edit-password">Password (Leave blank to keep current)</Label>
                            <Input
                                id="edit-password"
                                type="password"
                                value={editUserForm.password}
                                onChange={(e) => setEditUserForm({ ...editUserForm, password: e.target.value })}
                                placeholder="******"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="edit-role">Role</Label>
                            <Select value={editUserForm.role} onValueChange={(value) => setEditUserForm({ ...editUserForm, role: value })}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="agent">Agent</SelectItem>
                                    <SelectItem value="manager">Manager</SelectItem>
                                    <SelectItem value="qa">QA</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="edit-extension">Extension</Label>
                            <Input
                                id="edit-extension"
                                value={editUserForm.extension}
                                onChange={(e) => setEditUserForm({ ...editUserForm, extension: e.target.value })}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowEditUser(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleUpdateUser}>
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}