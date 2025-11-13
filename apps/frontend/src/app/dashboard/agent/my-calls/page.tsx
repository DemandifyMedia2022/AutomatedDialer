import { redirect } from "next/navigation"

export default function HomePage() {
  redirect("/dashboard/agent/my-calls/call-history")
}
