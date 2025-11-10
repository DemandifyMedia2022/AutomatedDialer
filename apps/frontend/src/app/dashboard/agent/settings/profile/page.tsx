"use client"

import React, { useState } from "react"
import { AgentSidebar } from "../../components/AgentSidebar"
import { Separator } from "@/components/ui/separator"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"

export default function ProfileSettingsPage() {
  const [form, setForm] = useState({
    prefix: "Mrs.",
    fullName: "Anjali Ghumare",
    employeeCode: "118",
    dob: "2000-07-15",
    gender: "Female",
    bloodGroup: "O+",
    nationality: "Indian",
    workEmail: "anjali.ghumare@demandflymedia.com",
    personalEmail: "anjalighumre984@gmail.com",
    contactNo: "8459283265",
    biometricCode: "118",
  })

  const update = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [key]: e.target.value })

  return (
    <SidebarProvider>
      <AgentSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4 w-full">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/dashboard/agent">Agent</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/dashboard/agent/settings">Settings</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Profile</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
          <Card className="w-full">
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-12">
                <div className="lg:col-span-3 space-y-2">
                  <Label htmlFor="prefix">Prefix</Label>
                  <Input id="prefix" value={form.prefix} onChange={update("prefix")} placeholder="Mr./Ms./Mrs." />
                </div>
                <div className="lg:col-span-3 space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input id="fullName" value={form.fullName} onChange={update("fullName")} placeholder="Full Name" />
                </div>
                <div className="lg:col-span-3 space-y-2">
                  <Label htmlFor="employeeCode">Employee Code</Label>
                  <Input id="employeeCode" value={form.employeeCode} onChange={update("employeeCode")} placeholder="Code" />
                </div>
                <div className="lg:col-span-3 space-y-2">
                  <Label htmlFor="dob">Date of Birth</Label>
                  <Input id="dob" type="date" value={form.dob} onChange={update("dob")} />
                </div>
                <div className="lg:col-span-3 space-y-2">
                  <Label htmlFor="gender">Gender</Label>
                  <Input id="gender" value={form.gender} onChange={update("gender")} placeholder="Gender" />
                </div>
                <div className="lg:col-span-3 space-y-2">
                  <Label htmlFor="bloodGroup">Blood Group</Label>
                  <Input id="bloodGroup" value={form.bloodGroup} onChange={update("bloodGroup")} placeholder="e.g. O+" />
                </div>
                <div className="lg:col-span-3 space-y-2">
                  <Label htmlFor="nationality">Nationality</Label>
                  <Input id="nationality" value={form.nationality} onChange={update("nationality")} placeholder="Nationality" />
                </div>
                <div className="lg:col-span-3 space-y-2">
                  <Label htmlFor="workEmail">Work Email</Label>
                  <Input id="workEmail" type="email" value={form.workEmail} onChange={update("workEmail")} placeholder="name@company.com" />
                </div>
                <div className="lg:col-span-3 space-y-2">
                  <Label htmlFor="personalEmail">Personal Email</Label>
                  <Input id="personalEmail" type="email" value={form.personalEmail} onChange={update("personalEmail")} placeholder="name@example.com" />
                </div>
                <div className="lg:col-span-3 space-y-2">
                  <Label htmlFor="contactNo">Contact No.</Label>
                  <Input id="contactNo" value={form.contactNo} onChange={update("contactNo")} placeholder="Phone number" />
                </div>
                <div className="lg:col-span-3 space-y-2">
                  <Label htmlFor="biometricCode">Biometric Code</Label>
                  <Input id="biometricCode" value={form.biometricCode} onChange={update("biometricCode")} placeholder="Code" />
                </div>
              </div>

              <div className="mt-8 flex justify-end gap-2">
                <Button variant="outline" type="button">Cancel</Button>
                <Button type="button">Save Changes</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

