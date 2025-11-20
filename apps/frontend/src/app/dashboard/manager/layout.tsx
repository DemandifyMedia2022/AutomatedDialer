"use client"
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'

export default function ManagerLayout({ children }: { children: React.ReactNode }) {
  const { loading, role } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (loading) return
    if (role !== 'manager' && role !== 'superadmin') {
      if (role === 'agent') router.replace('/dashboard/agent')
      else if (role === 'qa') router.replace('/dashboard/qa')
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

  if (role !== 'manager' && role !== 'superadmin') return null
  return <>{children}</>
}
