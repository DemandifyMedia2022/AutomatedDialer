'use client'

import { useState } from 'react'
import { Edit, Trash2, MoreVertical, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { cn } from '@/lib/utils'
import { User, useDeleteUser, useUpdateUserStatus } from '../../hooks/useUsers'
import { useToast } from '@/hooks/use-toast'
import { format } from 'date-fns'

interface UsersTableProps {
  users: User[]
  isLoading?: boolean
  onEdit: (user: User) => void
  onViewDetails: (userId: number) => void
}

export function UsersTable({ users, isLoading, onEdit, onViewDetails }: UsersTableProps) {
  const [deleteUserId, setDeleteUserId] = useState<number | null>(null)
  const { toast } = useToast()
  
  const deleteUserMutation = useDeleteUser()
  const updateStatusMutation = useUpdateUserStatus()

  const handleDelete = async () => {
    if (!deleteUserId) return

    try {
      await deleteUserMutation.mutateAsync(deleteUserId)
      toast({
        title: 'Success',
        description: 'User deleted successfully',
      })
      setDeleteUserId(null)
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete user',
        variant: 'destructive',
      })
    }
  }

  const handleStatusToggle = async (userId: number, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active'

    try {
      await updateStatusMutation.mutateAsync({ userId, status: newStatus })
      toast({
        title: 'Success',
        description: `User status updated to ${newStatus}`,
      })
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update user status',
        variant: 'destructive',
      })
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'superadmin':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
      case 'manager':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'qa':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'agent':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            <CheckCircle className="h-3 w-3 mr-1" />
            Active
          </Badge>
        )
      case 'inactive':
        return (
          <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200">
            <XCircle className="h-3 w-3 mr-1" />
            Inactive
          </Badge>
        )
      case 'suspended':
        return (
          <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
            <AlertCircle className="h-3 w-3 mr-1" />
            Suspended
          </Badge>
        )
      default:
        return <Badge>{status}</Badge>
    }
  }

  const formatDate = (date: Date | string | null) => {
    if (!date) return 'Never'
    try {
      return format(new Date(date), 'MMM d, yyyy HH:mm')
    } catch {
      return 'Invalid date'
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>Loading users...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>
            {users.length} user{users.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-2 font-medium text-sm">User</th>
                  <th className="text-left py-3 px-2 font-medium text-sm">Email</th>
                  <th className="text-left py-3 px-2 font-medium text-sm">Role</th>
                  <th className="text-left py-3 px-2 font-medium text-sm">Status</th>
                  <th className="text-left py-3 px-2 font-medium text-sm">Extension</th>
                  <th className="text-left py-3 px-2 font-medium text-sm">Created</th>
                  <th className="text-left py-3 px-2 font-medium text-sm">Last Login</th>
                  <th className="text-right py-3 px-2 font-medium text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-muted-foreground">
                      No users found
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => onViewDetails(user.id)}
                    >
                      <td className="py-3 px-2">
                        <div>
                          <p className="font-medium">{user.username}</p>
                          <p className="text-xs text-muted-foreground">{user.unique_user_id}</p>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-sm">{user.email}</td>
                      <td className="py-3 px-2">
                        <Badge className={cn('text-xs capitalize', getRoleColor(user.role))}>
                          {user.role}
                        </Badge>
                      </td>
                      <td className="py-3 px-2">{getStatusBadge(user.status)}</td>
                      <td className="py-3 px-2 text-sm font-mono">
                        {user.extension || <span className="text-muted-foreground">-</span>}
                      </td>
                      <td className="py-3 px-2 text-sm text-muted-foreground">
                        {formatDate(user.created_at)}
                      </td>
                      <td className="py-3 px-2 text-sm text-muted-foreground">
                        {formatDate(user.last_login)}
                      </td>
                      <td className="py-3 px-2 text-right" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => onViewDetails(user.id)}>
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onEdit(user)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit User
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleStatusToggle(user.id, user.status)}
                              disabled={updateStatusMutation.isPending}
                            >
                              {user.status === 'active' ? 'Deactivate' : 'Activate'}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => setDeleteUserId(user.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete User
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteUserId} onOpenChange={() => setDeleteUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the user account and all
              associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteUserMutation.isPending}
            >
              {deleteUserMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
