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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fpOpen, setFpOpen] = useState(false)
  const [fpStep, setFpStep] = useState<1 | 2 | 3>(1)
  const [fpEmail, setFpEmail] = useState("")
  const [fpOtp, setFpOtp] = useState("")
  const [fpToken, setFpToken] = useState("")
  const [fpPassword, setFpPassword] = useState("")
  const [fpLoading, setFpLoading] = useState(false)
  const [fpMessage, setFpMessage] = useState<string | null>(null)

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
      else if (role === "qa") router.replace("/dashboard/qa")
      else router.replace("/dashboard/agent")
    } catch {
      setError("Network error")
    } finally {
      setSubmitting(false)
    }
  }

  const startForgot = () => {
    setFpOpen(true)
    setFpStep(1)
    setFpEmail("")
    setFpOtp("")
    setFpToken("")
    setFpPassword("")
    setFpMessage(null)
  }

  const submitEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fpEmail) return
    setFpLoading(true)
    setFpMessage(null)
    try {
      await fetch(`${API_BASE}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: fpEmail }),
      })
      setFpMessage("OTP is sent to your email.")
      setFpStep(2)
    } catch {
      setFpMessage("Request failed. Try again.")
    } finally {
      setFpLoading(false)
    }
  }

  const submitOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fpEmail || !fpOtp) return
    setFpLoading(true)
    setFpMessage(null)
    try {
      const res = await fetch(`${API_BASE}/api/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: fpEmail, otp: fpOtp }),
      })
      const data = await res.json()
      if (!res.ok || !data.reset_token) {
        setFpMessage(data.message || "Invalid or expired OTP")
        return
      }
      setFpToken(String(data.reset_token))
      setFpStep(3)
    } catch {
      setFpMessage("Verification failed. Try again.")
    } finally {
      setFpLoading(false)
    }
  }

  const submitReset = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fpEmail || !fpToken || !fpPassword) return
    setFpLoading(true)
    setFpMessage(null)
    try {
      const res = await fetch(`${API_BASE}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: fpEmail, reset_token: fpToken, new_password: fpPassword }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setFpMessage(data.message || "Reset failed")
        return
      }
      setFpOpen(false)
    } catch {
      setFpMessage("Reset failed. Try again.")
    } finally {
      setFpLoading(false)
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
                  Login to your Dialer account
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
                  <button
                    type="button"
                    onClick={startForgot}
                    className="ml-auto text-sm underline-offset-2 hover:underline"
                  >
                    Forgot your password?
                  </button>
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

      <Dialog open={fpOpen} onOpenChange={setFpOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset password</DialogTitle>
            <DialogDescription>Use the email OTP to reset your password.</DialogDescription>
          </DialogHeader>
          {fpStep === 1 && (
            <form onSubmit={submitEmail} className="flex flex-col gap-4">
              <Field>
                <FieldLabel htmlFor="fp-email">Email</FieldLabel>
                <Input id="fp-email" type="email" required value={fpEmail} onChange={(e) => setFpEmail(e.target.value)} />
              </Field>
              {fpMessage ? <p className="text-muted-foreground text-sm">{fpMessage}</p> : null}
              <Button type="submit" disabled={fpLoading}>{fpLoading ? "Sending..." : "Send OTP"}</Button>
            </form>
          )}
          {fpStep === 2 && (
            <form onSubmit={submitOtp} className="flex flex-col gap-4">
              <Field>
                <FieldLabel htmlFor="fp-otp">OTP</FieldLabel>
                <InputOTP value={fpOtp} onChange={(v) => setFpOtp(String(v).replace(/[^0-9]/g, '').slice(0,6))} maxLength={6}>
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </Field>
              {fpMessage ? <p className="text-destructive text-sm">{fpMessage}</p> : null}
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setFpStep(1)}>Back</Button>
                <Button type="submit" disabled={fpLoading}>{fpLoading ? "Verifying..." : "Verify OTP"}</Button>
              </div>
            </form>
          )}
          {fpStep === 3 && (
            <form onSubmit={submitReset} className="flex flex-col gap-4">
              <Field>
                <FieldLabel htmlFor="fp-newpass">New password</FieldLabel>
                <Input id="fp-newpass" type="password" required value={fpPassword} onChange={(e) => setFpPassword(e.target.value)} />
              </Field>
              {fpMessage ? <p className="text-destructive text-sm">{fpMessage}</p> : null}
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setFpStep(2)}>Back</Button>
                <Button type="submit" disabled={fpLoading}>{fpLoading ? "Saving..." : "Reset password"}</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
