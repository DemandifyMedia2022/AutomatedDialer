'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Plus, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { UsersTable } from '../components/tables/UsersTable'
import { UserForm } from '../components/forms/UserForm'
import { useUsers, User } from '../hooks/useUsers'
import { MetricCard } from '../components/cards/MetricCard'
import { Users as UsersIcon, UserCheck, UserX, Shield } from 'lucide-react'

export default function UsersPage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<'agent' | 'manager' | 'qa' | 'superadmin' | ''>('')
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | 'suspended' | ''>('')
  const [page, setPage] = useState(1)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)

  // Build filters object
  const filters = {
    search: searchQuery || undefined,
    role: (roleFilter || undefined) as 'agent' | 'manager' | 'qa' | 'superadmin' | undefined,
    status: (statusFilter || undefined) as 'active' | 'inactive' | 'suspended' | undefined,
    page,
    limit: 20,
  }

  const { data, isLoading, error } = useUsers(filters)

  const handleSearch = (value: string) => {
    setSearchQuery(value)
    setPage(1) // Reset to first page on search
  }

  const handleRoleFilter = (value: string) => {
    setRoleFilter(value === 'all' ? '' : value as 'agent' | 'manager' | 'qa' | 'superadmin')
    setPage(1)
  }

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value === 'all' ? '' : value as 'active' | 'inactive' | 'suspended')
    setPage(1)
  }

  const handleCreateUser = () => {
    setEditingUser(null)
    setIsFormOpen(true)
  }

  const handleEditUser = (user: User) => {
    setEditingUser(user)
    setIsFormOpen(true)
  }

  const handleViewDetails = (userId: number) => {
    router.push(`/dashboard/superadmin/users/${userId}`)
  }

  const handleFormClose = () => {
    setIsFormOpen(false)
    setEditingUser(null)
  }

  // Calculate statistics
  const stats = data?.users
    ? {
        total: data.pagination.total,
        active: data.users.filter((u) => u.status === 'active').length,
        inactive: data.users.filter((u) => u.status === 'inactive').length,
        superadmins: data.users.filter((u) => u.role === 'superadmin').length,
      }
    : { total: 0, active: 0, inactive: 0, superadmins: 0 }

  return (
    <>
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
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="/dashboard/superadmin">Super Admin</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>Users</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground mt-2">
            Manage user accounts, roles, and permissions
          </p>
        </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Users"
          value={stats.total}
          icon={UsersIcon}
          description="All registered users"
        />
        <MetricCard
          title="Active Users"
          value={stats.active}
          icon={UserCheck}
          description="Currently active"
        />
        <MetricCard
          title="Inactive Users"
          value={stats.inactive}
          icon={UserX}
          description="Inactive or suspended"
        />
        <MetricCard
          title="Superadmins"
          value={stats.superadmins}
          icon={Shield}
          description="Admin accounts"
        />
      </div>

      {/* Filters and Actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Users</CardTitle>
              <CardDescription>Search and filter users</CardDescription>
            </div>
            <Button onClick={handleCreateUser}>
              <Plus className="h-4 w-4 mr-2" />
              Create User
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by email or username..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={roleFilter || 'all'} onValueChange={handleRoleFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="agent">Agent</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="qa">QA</SelectItem>
                <SelectItem value="superadmin">Superadmin</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter || 'all'} onValueChange={handleStatusFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Error State */}
      {error && (
        <Card className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950">
          <CardContent className="pt-6">
            <p className="text-red-600 dark:text-red-400">
              Error loading users: {error.message}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Users Table */}
      <UsersTable
        users={data?.users || []}
        isLoading={isLoading}
        onEdit={handleEditUser}
        onViewDetails={handleViewDetails}
      />

      {/* Pagination */}
      {data?.pagination && data.pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, data.pagination.total)} of{' '}
            {data.pagination.total} users
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || isLoading}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(data.pagination.totalPages, p + 1))}
              disabled={page === data.pagination.totalPages || isLoading}
            >
              Next
            </Button>
          </div>
        </div>
      )}

        {/* User Form Dialog */}
        <UserForm
          open={isFormOpen}
          onOpenChange={handleFormClose}
          user={editingUser}
          mode={editingUser ? 'edit' : 'create'}
        />
      </div>
    </>
  )
}
