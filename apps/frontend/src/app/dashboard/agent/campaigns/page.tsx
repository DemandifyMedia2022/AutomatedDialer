import { redirect } from "next/navigation"

export default function HomePage() {
  redirect("/dashboard/agent/campaigns/active")
}
