"use client"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/useAuth"

export default function HomePage() {
  const { loading, role } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (loading) return
    if (role === "manager") router.replace("/dashboard/manager")
    else if (role === "superadmin") router.replace("/dashboard/superadmin")
    else router.replace("/dashboard/agent")
  }, [loading, role, router])

  return (
    <div className="flex min-h-svh items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  )
}