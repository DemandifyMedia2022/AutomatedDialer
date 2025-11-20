"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/useAuth"

export default function QaLayout({ children }: { children: React.ReactNode }) {
  const { loading, role } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (loading) return
    if (role !== "qa") {
      if (role === "manager") router.replace("/dashboard/manager")
      else if (role === "superadmin") router.replace("/dashboard/superadmin")
      else if (role === "agent") router.replace("/dashboard/agent")
      else router.replace("/login")
    }
  }, [loading, role, router])

  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  if (role !== "qa") return null
  return <>{children}</>
}
