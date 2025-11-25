"use client"
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useFollowUpNotifications } from '@/hooks/useFollowUpNotifications'

export default function AgentLayout({ children }: { children: React.ReactNode }) {
  const { loading, role } = useAuth()
  const router = useRouter()
  useFollowUpNotifications() // Initialize login notifications

  useEffect(() => {
    if (loading) return
    if (role !== 'agent') {
      if (role === 'manager') router.replace('/dashboard/manager')
      else if (role === 'superadmin') router.replace('/dashboard/superadmin')
      else router.replace('/login')
    }
  }, [loading, role, router])

  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  if (role !== 'agent') return null
  return <>{children}</>
}
