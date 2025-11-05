"use client"

import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { API_BASE } from "@/lib/api"
import { USE_AUTH_COOKIE, setToken } from "@/lib/auth"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting) return
    setSubmitting(true)
    setError(null)
    const form = e.target as HTMLFormElement
    const fd = new FormData(form)
    const email = String(fd.get("email") || "")
    const password = String(fd.get("password") || "")
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        credentials: USE_AUTH_COOKIE ? "include" : "omit",
      })
      if (!res.ok) {
        const msg = (await res.json()).message || "Login failed"
        setError(msg)
        return
      }
      const data = await res.json()
      if (data.token) setToken(data.token)
      const role = String((data.user?.role || "")).toLowerCase()
      if (role === "manager") router.replace("/dashboard/manager")
      else if (role === "superadmin") router.replace("/dashboard/superadmin")
      else router.replace("/dashboard/agent")
    } catch {
      setError("Network error")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden p-0">
        <CardContent className="grid p-0 md:grid-cols-2">
          <form className="p-6 md:p-8" onSubmit={handleLogin}>
            <FieldGroup>
              <div className="flex flex-col items-center gap-2 text-center">
                <h1 className="text-2xl font-bold">Welcome back</h1>
                <p className="text-muted-foreground text-balance">
                  Login to your Acme Inc account
                </p>
              </div>
              <Field>
                <FieldLabel htmlFor="email">Email or User ID</FieldLabel>
                <Input
                  id="email"
                  placeholder="m@example.com or DM-AB-0001"
                  required
                  name="email"
                />
              </Field>
              <Field>
                <div className="flex items-center">
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  <a
                    href="#"
                    className="ml-auto text-sm underline-offset-2 hover:underline"
                  >
                    Forgot your password?
                  </a>
                </div>
                <Input id="password" type="password" required name="password" />
              </Field>
              <Field>
                <Button type="submit" disabled={submitting}>{submitting ? "Logging in..." : "Login"}</Button>
              </Field>
              {error ? (
                <p className="text-destructive text-sm">{error}</p>
              ) : null}
              <FieldDescription className="text-center">
                Don&apos;t have an account? <a href="#">Sign up</a>
              </FieldDescription>
            </FieldGroup>
          </form>
          <div className="bg-muted relative hidden md:block">
            <img
              src="/SalesConsulting.svg"
              alt="Login illustration"
              className="absolute inset-0 h-full w-full object-cover block dark:hidden"
            />
            <img
              src="/SalesConsulting_dark.svg"
              alt="Login illustration (dark)"
              className="absolute inset-0 h-full w-full object-cover hidden dark:block"
            />
          </div>
        </CardContent>
      </Card>
      <FieldDescription className="px-6 text-center">
        By clicking continue, you agree to our <a href="#">Terms of Service</a>{" "}
        and <a href="#">Privacy Policy</a>.
      </FieldDescription>
    </div>
  )
}
