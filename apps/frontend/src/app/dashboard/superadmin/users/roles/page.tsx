'use client'

import { useState } from 'react'
import { Shield, Users, Check, X, Edit2, Save, XCircle, ChevronDown, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { useRoles, useUpdateRolePermissions, RoleType, Permission, PermissionAction } from '../../hooks/useRoles'
import { MetricCard } from '../../components/cards/MetricCard'
import { useToast } from '@/hooks/use-toast'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'

export default function RolesPage() {
  const { data: roles, isLoading, error } = useRoles()
  const updatePermissions = useUpdateRolePermissions()
  const { toast } = useToast()

  const [editingRole, setEditingRole] = useState<RoleType | null>(null)
  const [editedPermissions, setEditedPermissions] = useState<Permission[]>([])
  const [expandedRoles, setExpandedRoles] = useState<Set<RoleType>>(new Set())

  // Calculate statistics
  const stats = roles
    ? {
        totalRoles: roles.length,
        totalUsers: roles.reduce((sum, role) => sum + role.userCount, 0),
        agentCount: roles.find((r) => r.role === 'agent')?.userCount || 0,
        managerCount: roles.find((r) => r.role === 'manager')?.userCount || 0,
      }
    : { totalRoles: 0, totalUsers: 0, agentCount: 0, managerCount: 0 }

  const handleEditRole = (role: RoleType, permissions: Permission[]) => {
    setEditingRole(role)
    setEditedPermissions(JSON.parse(JSON.stringify(permissions))) // Deep clone
  }

  const handleCancelEdit = () => {
    setEditingRole(null)
    setEditedPermissions([])
  }

  const handleSavePermissions = async () => {
    if (!editingRole) return

    try {
      await updatePermissions.mutateAsync({
        roleName: editingRole,
        permissions: editedPermissions,
      })

      toast({
        title: 'Success',
        description: 'Role permissions updated successfully',
      })

      setEditingRole(null)
      setEditedPermissions([])
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update permissions',
        variant: 'destructive',
      })
    }
  }

  const handleToggleAction = (resourceIndex: number, action: PermissionAction) => {
    const newPermissions = [...editedPermissions]
    const permission = newPermissions[resourceIndex]

    if (permission.actions.includes(action)) {
      permission.actions = permission.actions.filter((a) => a !== action)
    } else {
      permission.actions = [...permission.actions, action]
    }

    setEditedPermissions(newPermissions)
  }

  const toggleRoleExpanded = (role: RoleType) => {
    const newExpanded = new Set(expandedRoles)
    if (newExpanded.has(role)) {
      newExpanded.delete(role)
    } else {
      newExpanded.add(role)
    }
    setExpandedRoles(newExpanded)
  }

  const getRoleBadgeColor = (role: RoleType) => {
    switch (role) {
      case 'superadmin':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      case 'manager':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'qa':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
      case 'agent':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  const actionOrder: PermissionAction[] = ['create', 'read', 'update', 'delete']

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
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="/dashboard/superadmin/users">Users</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>Roles & Permissions</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Roles & Permissions</h1>
          <p className="text-muted-foreground mt-2">
            Manage role-based access control and permissions
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Total Roles"
            value={stats.totalRoles}
            icon={Shield}
            description="System roles"
          />
          <MetricCard
            title="Total Users"
            value={stats.totalUsers}
            icon={Users}
            description="All users across roles"
          />
          <MetricCard
            title="Agents"
            value={stats.agentCount}
            icon={Users}
            description="Agent role users"
          />
          <MetricCard
            title="Managers"
            value={stats.managerCount}
            icon={Users}
            description="Manager role users"
          />
        </div>

        {/* Error State */}
        {error && (
          <Card className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950">
            <CardContent className="pt-6">
              <p className="text-red-600 dark:text-red-400">
                Error loading roles: {error.message}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Loading State */}
        {isLoading && (
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground">Loading roles...</p>
            </CardContent>
          </Card>
        )}

        {/* Roles List */}
        {roles && roles.length > 0 && (
          <div className="space-y-4">
            {roles.map((role) => {
              const isEditing = editingRole === role.role
              const isExpanded = expandedRoles.has(role.role)
              const displayPermissions = isEditing ? editedPermissions : role.permissions

              return (
                <Card key={role.role}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <CardTitle className="text-xl">{role.displayName}</CardTitle>
                          <Badge className={getRoleBadgeColor(role.role)}>
                            {role.role}
                          </Badge>
                          <Badge variant="outline">
                            <Users className="h-3 w-3 mr-1" />
                            {role.userCount} {role.userCount === 1 ? 'user' : 'users'}
                          </Badge>
                        </div>
                        <CardDescription className="mt-2">
                          {role.description}
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        {isEditing ? (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={handleCancelEdit}
                              disabled={updatePermissions.isPending}
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              onClick={handleSavePermissions}
                              disabled={updatePermissions.isPending}
                            >
                              <Save className="h-4 w-4 mr-2" />
                              {updatePermissions.isPending ? 'Saving...' : 'Save'}
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditRole(role.role, role.permissions)}
                          >
                            <Edit2 className="h-4 w-4 mr-2" />
                            Edit Permissions
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Collapsible
                      open={isExpanded}
                      onOpenChange={() => toggleRoleExpanded(role.role)}
                    >
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" className="w-full justify-between p-0 h-auto">
                          <span className="text-sm font-medium">
                            {displayPermissions.length} Permission{displayPermissions.length !== 1 ? 's' : ''}
                          </span>
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-4">
                        <div className="space-y-4">
                          {displayPermissions.map((permission, index) => (
                            <div
                              key={permission.resource}
                              className="border rounded-lg p-4 space-y-3"
                            >
                              <div>
                                <h4 className="font-medium text-sm capitalize">
                                  {permission.resource.replace(/_/g, ' ')}
                                </h4>
                                {permission.description && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {permission.description}
                                  </p>
                                )}
                              </div>
                              <div className="flex flex-wrap gap-3">
                                {actionOrder.map((action) => {
                                  const hasAction = permission.actions.includes(action)
                                  return (
                                    <div
                                      key={action}
                                      className="flex items-center space-x-2"
                                    >
                                      {isEditing ? (
                                        <Checkbox
                                          id={`${role.role}-${permission.resource}-${action}`}
                                          checked={hasAction}
                                          onCheckedChange={() =>
                                            handleToggleAction(index, action)
                                          }
                                        />
                                      ) : (
                                        <div className="w-4 h-4 flex items-center justify-center">
                                          {hasAction ? (
                                            <Check className="h-4 w-4 text-green-600" />
                                          ) : (
                                            <X className="h-4 w-4 text-gray-300" />
                                          )}
                                        </div>
                                      )}
                                      <label
                                        htmlFor={`${role.role}-${permission.resource}-${action}`}
                                        className={`text-sm capitalize ${
                                          isEditing ? 'cursor-pointer' : ''
                                        } ${
                                          hasAction
                                            ? 'text-foreground'
                                            : 'text-muted-foreground'
                                        }`}
                                      >
                                        {action}
                                      </label>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        {/* Empty State */}
        {roles && roles.length === 0 && (
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground text-center">No roles found</p>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  )
}
