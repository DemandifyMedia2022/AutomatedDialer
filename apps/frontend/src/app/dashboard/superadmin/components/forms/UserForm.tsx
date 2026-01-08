'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { User, useCreateUser, useUpdateUser, CreateUserData, UpdateUserData } from '../../hooks/useUsers'

interface UserFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user?: User | null
  mode: 'create' | 'edit'
}

export function UserForm({ open, onOpenChange, user, mode }: UserFormProps) {
  const { toast } = useToast()
  const createUserMutation = useCreateUser()
  const updateUserMutation = useUpdateUser()

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'agent' as 'agent' | 'manager' | 'qa' | 'superadmin',
    extension: '',
    status: 'active' as 'active' | 'inactive' | 'suspended',
    is_demo_user: false,
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  // Reset form when dialog opens/closes or user changes
  useEffect(() => {
    if (open) {
      if (mode === 'edit' && user) {
        setFormData({
          username: user.username,
          email: user.email,
          password: '',
          role: user.role,
          extension: user.extension || '',
          status: user.status,
          is_demo_user: user.is_demo_user || false,
        })
      } else {
        setFormData({
          username: '',
          email: '',
          password: '',
          role: 'agent',
          extension: '',
          status: 'active',
          is_demo_user: false,
        })
      }
      setErrors({})
    }
  }, [open, mode, user])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.username.trim()) {
      newErrors.username = 'Username is required'
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email address'
    }

    if (mode === 'create' && !formData.password) {
      newErrors.password = 'Password is required'
    }

    if (mode === 'create' && formData.password && formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters'
    }

    if (mode === 'edit' && formData.password && formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    try {
      if (mode === 'create') {
        const createData: CreateUserData = {
          username: formData.username.trim(),
          email: formData.email.trim(),
          password: formData.password,
          role: formData.role,
          extension: formData.extension.trim() || null,
          status: formData.status,
          is_demo_user: formData.is_demo_user,
        }

        await createUserMutation.mutateAsync(createData)
        toast({
          title: 'Success',
          description: 'User created successfully',
        })
      } else if (user) {
        const updateData: UpdateUserData = {
          username: formData.username.trim(),
          email: formData.email.trim(),
          role: formData.role,
          extension: formData.extension.trim() || null,
          status: formData.status,
          is_demo_user: formData.is_demo_user,
        }

        // Only include password if it was changed
        if (formData.password) {
          updateData.password = formData.password
        }

        await updateUserMutation.mutateAsync({ userId: user.id, data: updateData })
        toast({
          title: 'Success',
          description: 'User updated successfully',
        })
      }

      onOpenChange(false)
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || `Failed to ${mode} user`,
        variant: 'destructive',
      })
    }
  }

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  const isPending = createUserMutation.isPending || updateUserMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Create New User' : 'Edit User'}</DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Add a new user to the system. All fields marked with * are required.'
              : 'Update user information. Leave password blank to keep current password.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="username">
                Username <span className="text-red-500">*</span>
              </Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => handleChange('username', e.target.value)}
                placeholder="Enter username"
                disabled={isPending}
              />
              {errors.username && (
                <p className="text-sm text-red-600">{errors.username}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">
                Email <span className="text-red-500">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="user@example.com"
                disabled={isPending}
              />
              {errors.email && (
                <p className="text-sm text-red-600">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">
                Password {mode === 'create' && <span className="text-red-500">*</span>}
              </Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => handleChange('password', e.target.value)}
                placeholder={mode === 'edit' ? 'Leave blank to keep current' : 'Enter password'}
                disabled={isPending}
              />
              {errors.password && (
                <p className="text-sm text-red-600">{errors.password}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Minimum 6 characters
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">
                Role <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.role}
                onValueChange={(value) => handleChange('role', value)}
                disabled={isPending}
              >
                <SelectTrigger id="role">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="agent">Agent</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="qa">QA</SelectItem>
                  <SelectItem value="superadmin">Superadmin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="extension">Extension (Optional)</Label>
              <Input
                id="extension"
                value={formData.extension}
                onChange={(e) => handleChange('extension', e.target.value)}
                placeholder="e.g., 1001"
                disabled={isPending}
              />
              <p className="text-xs text-muted-foreground">
                SIP extension for agent calls
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">
                Status <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.status}
                onValueChange={(value) => handleChange('status', value)}
                disabled={isPending}
              >
                <SelectTrigger id="status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_demo_user"
                checked={formData.is_demo_user}
                onCheckedChange={(checked) => handleChange('is_demo_user', checked as any)}
                disabled={isPending}
              />
              <div className="grid gap-1.5 leading-none">
                <Label
                  htmlFor="is_demo_user"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Demo User
                </Label>
                <p className="text-xs text-muted-foreground">
                  Restrict access to certain features for demo purposes.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending
                ? mode === 'create'
                  ? 'Creating...'
                  : 'Updating...'
                : mode === 'create'
                  ? 'Create User'
                  : 'Update User'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
