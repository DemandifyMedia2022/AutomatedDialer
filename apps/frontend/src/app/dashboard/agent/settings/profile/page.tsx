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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

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
    employmentStatus: "Active",
    employmentType: "Full-time",
    dateOfJoining: "2022-01-10",
    confirmationDate: "",
    department: "Development",
    designation: "IT Executive",
    businessUnit: "Development",
    reportingManager: "Viresh Kumbhar",
    functionalManager: "Viresh Kumbhar",
    fatherName: "",
    fatherDob: "",
    motherName: "",
    motherDob: "",
    maritalStatus: "",
    salaryPayMode: "online transfer",
    salaryBankName: "SBI BANK",
    salaryBranchName: "Patoda",
    salaryIfsc: "SBIN0011509",
    salaryAccountNumber: "33953452846",
    reimbursementPayMode: "online transfer",
    reimbursementBankName: "SBI BANK",
    reimbursementBranchName: "Patoda",
    reimbursementIfsc: "SBIN0011509",
    reimbursementAccountNumber: "33953452846",
    insureeName: "",
    relationship: "",
    insureeDob: "",
    insureeGender: "",
    insureeCode: "",
    assuredSum: "",
    insuranceCompany: "",
    companyCode: "",
    issueDate: "",
    panNo: "DSMPG3226B",
    aadharNo: "980647553956",
    passportNo: "",
    passportExpiryDate: "",
    personalEmailOther: "anjalighumre984@gmail.com",
    emergencyContact: "",
    emergencyContactName: "",
    emergencyRelation: "",
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
          <Tabs defaultValue="basic" className="flex gap-6">
            <TabsList orientation="vertical" className="grid w-64 items-start gap-1 rounded-lg bg-card p-2 text-left">
              <TabsTrigger value="basic" className="justify-start">Basic Information</TabsTrigger>
              <TabsTrigger value="employment" className="justify-start">Employment Status & Type</TabsTrigger>
              <TabsTrigger value="family" className="justify-start">Family</TabsTrigger>
              <TabsTrigger value="professional" className="justify-start">Professional</TabsTrigger>
              <TabsTrigger value="bank" className="justify-start">Bank</TabsTrigger>
              <TabsTrigger value="insurance" className="justify-start">Health Insurance</TabsTrigger>
              <TabsTrigger value="other" className="justify-start">Employees Other Details</TabsTrigger>
            </TabsList>
            <div className="flex-1">
              <TabsContent value="basic" className="m-0">
                <Card className="w-full">
                  <CardHeader>
                    <CardTitle>Basic Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-12">
                      <div className="lg:col-span-4 space-y-2">
                        <Label htmlFor="prefix">Prefix</Label>
                        <Input id="prefix" value={form.prefix} onChange={update("prefix")} placeholder="Mr./Ms./Mrs." />
                      </div>
                      <div className="lg:col-span-4 space-y-2">
                        <Label htmlFor="fullName">Full Name</Label>
                        <Input id="fullName" value={form.fullName} onChange={update("fullName")} placeholder="Full Name" />
                      </div>
                      <div className="lg:col-span-4 space-y-2">
                        <Label htmlFor="employeeCode">Employee Code</Label>
                        <Input id="employeeCode" value={form.employeeCode} onChange={update("employeeCode")} placeholder="Code" />
                      </div>
                      <div className="lg:col-span-4 space-y-2">
                        <Label htmlFor="dob">Date of Birth</Label>
                        <Input id="dob" type="date" value={form.dob} onChange={update("dob")} />
                      </div>
                      <div className="lg:col-span-4 space-y-2">
                        <Label htmlFor="gender">Gender</Label>
                        <Input id="gender" value={form.gender} onChange={update("gender")} placeholder="Gender" />
                      </div>
                      <div className="lg:col-span-4 space-y-2">
                        <Label htmlFor="bloodGroup">Blood Group</Label>
                        <Input id="bloodGroup" value={form.bloodGroup} onChange={update("bloodGroup")} placeholder="e.g. O+" />
                      </div>
                      <div className="lg:col-span-4 space-y-2">
                        <Label htmlFor="nationality">Nationality</Label>
                        <Input id="nationality" value={form.nationality} onChange={update("nationality")} placeholder="Nationality" />
                      </div>
                      <div className="lg:col-span-4 space-y-2">
                        <Label htmlFor="workEmail">Work Email</Label>
                        <Input id="workEmail" type="email" value={form.workEmail} onChange={update("workEmail")} placeholder="name@company.com" />
                      </div>
                      <div className="lg:col-span-4 space-y-2">
                        <Label htmlFor="personalEmail">Personal Email</Label>
                        <Input id="personalEmail" type="email" value={form.personalEmail} onChange={update("personalEmail")} placeholder="name@example.com" />
                      </div>
                      <div className="lg:col-span-4 space-y-2">
                        <Label htmlFor="contactNo">Contact No.</Label>
                        <Input id="contactNo" value={form.contactNo} onChange={update("contactNo")} placeholder="Phone number" />
                      </div>
                      <div className="lg:col-span-4 space-y-2">
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
              </TabsContent>
              <TabsContent value="employment" className="m-0">
                <Card className="w-full">
                  <CardHeader>
                    <CardTitle>Employment Status & Type</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-12">
                      <div className="lg:col-span-4 space-y-2">
                        <Label htmlFor="employmentStatus">Employment Status</Label>
                        <Input id="employmentStatus" value={form.employmentStatus} onChange={update("employmentStatus")} placeholder="Active/Inactive" />
                      </div>
                      <div className="lg:col-span-4 space-y-2">
                        <Label htmlFor="employmentType">Employment Type</Label>
                        <Input id="employmentType" value={form.employmentType} onChange={update("employmentType")} placeholder="Full-time/Part-time/Contract" />
                      </div>
                      <div className="lg:col-span-4 space-y-2">
                        <Label htmlFor="dateOfJoining">Date of Joining</Label>
                        <Input id="dateOfJoining" type="date" value={form.dateOfJoining} onChange={update("dateOfJoining")} />
                      </div>
                      <div className="lg:col-span-4 space-y-2">
                        <Label htmlFor="confirmationDate">Confirmation Date</Label>
                        <Input id="confirmationDate" type="date" value={form.confirmationDate} onChange={update("confirmationDate")} />
                      </div>
                      <div className="lg:col-span-4 space-y-2">
                        <Label htmlFor="department">Department</Label>
                        <Input id="department" value={form.department} onChange={update("department")} placeholder="Department" />
                      </div>
                      <div className="lg:col-span-4 space-y-2">
                        <Label htmlFor="designation">Designation</Label>
                        <Input id="designation" value={form.designation} onChange={update("designation")} placeholder="Designation" />
                      </div>
                      <div className="lg:col-span-4 space-y-2">
                        <Label htmlFor="businessUnit">Business Unit</Label>
                        <Input id="businessUnit" value={form.businessUnit} onChange={update("businessUnit")} placeholder="Business Unit" />
                      </div>
                      <div className="lg:col-span-4 space-y-2">
                        <Label htmlFor="reportingManager">Reporting Manager</Label>
                        <Input id="reportingManager" value={form.reportingManager} onChange={update("reportingManager")} placeholder="Manager Name" />
                      </div>
                      <div className="lg:col-span-4 space-y-2">
                        <Label htmlFor="functionalManager">Functional Manager</Label>
                        <Input id="functionalManager" value={form.functionalManager} onChange={update("functionalManager")} placeholder="Manager Name" />
                      </div>
                    </div>
                    <div className="mt-8 flex justify-end gap-2">
                      <Button variant="outline" type="button">Cancel</Button>
                      <Button type="button">Save Changes</Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="family" className="m-0">
                <Card className="w-full">
                  <CardHeader>
                    <CardTitle>Parental Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-8">
                      <div className="lg:col-span-4 space-y-2">
                        <Label htmlFor="fatherName">Father Name</Label>
                        <Input id="fatherName" value={form.fatherName} onChange={update("fatherName")} />
                      </div>
                      <div className="lg:col-span-4 space-y-2">
                        <Label htmlFor="fatherDob">Father Date of Birth</Label>
                        <Input id="fatherDob" type="date" value={form.fatherDob} onChange={update("fatherDob")} />
                      </div>
                      <div className="lg:col-span-4 space-y-2">
                        <Label htmlFor="motherName">Mother Name</Label>
                        <Input id="motherName" value={form.motherName} onChange={update("motherName")} />
                      </div>
                      <div className="lg:col-span-4 space-y-2">
                        <Label htmlFor="motherDob">Mother Date of Birth</Label>
                        <Input id="motherDob" type="date" value={form.motherDob} onChange={update("motherDob")} />
                      </div>
                    </div>
                    <div className="mt-8" />
                    <CardTitle className="mb-4">Marital Status & Children Details</CardTitle>
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-12">
                      <div className="lg:col-span-3 space-y-2">
                        <Label htmlFor="maritalStatus">Marital Status</Label>
                        <Input id="maritalStatus" value={form.maritalStatus} onChange={update("maritalStatus")} />
                      </div>
                    </div>
                    <div className="mt-8 flex justify-end gap-2">
                      <Button variant="outline" type="button">Cancel</Button>
                      <Button type="button">Save Changes</Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="professional" className="m-0">
                <Card className="w-full">
                  <CardHeader>
                    <CardTitle>Position</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-8">
                      <div className="lg:col-span-4 space-y-2">
                        <Label htmlFor="company">Company</Label>
                        <Input id="company" value={form.insuranceCompany || "Demandify Media"} onChange={update("insuranceCompany")} />
                      </div>
                      <div className="lg:col-span-4 space-y-2">
                        <Label htmlFor="businessUnit">Business Unit</Label>
                        <Input id="businessUnit" value={form.businessUnit} onChange={update("businessUnit")} />
                      </div>
                      <div className="lg:col-span-4 space-y-2">
                        <Label htmlFor="department">Department</Label>
                        <Input id="department" value={form.department} onChange={update("department")} />
                      </div>
                      <div className="lg:col-span-4 space-y-2">
                        <Label htmlFor="designation">Designation</Label>
                        <Input id="designation" value={form.designation} onChange={update("designation")} />
                      </div>
                      <div className="lg:col-span-4 space-y-2">
                        <Label htmlFor="reportingManager">Reporting Manager</Label>
                        <Input id="reportingManager" value={form.reportingManager} onChange={update("reportingManager")} />
                      </div>
                      <div className="lg:col-span-4 space-y-2">
                        <Label htmlFor="functionalManager">Functional Manager</Label>
                        <Input id="functionalManager" value={form.functionalManager} onChange={update("functionalManager")} />
                      </div>
                    </div>
                    <div className="mt-8 flex justify-end gap-2">
                      <Button variant="outline" type="button">Cancel</Button>
                      <Button type="button">Save Changes</Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="bank" className="m-0">
                <Card className="w-full">
                  <CardHeader>
                    <CardTitle>Bank Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-12">
                      <div className="lg:col-span-4 space-y-2">
                        <Label htmlFor="salaryPayMode">Salary Pay Mode</Label>
                        <Input id="salaryPayMode" value={form.salaryPayMode} onChange={update("salaryPayMode")} />
                      </div>
                      <div className="lg:col-span-4 space-y-2">
                        <Label htmlFor="salaryBankName">Salary Bank Name</Label>
                        <Input id="salaryBankName" value={form.salaryBankName} onChange={update("salaryBankName")} />
                      </div>
                      <div className="lg:col-span-4 space-y-2">
                        <Label htmlFor="salaryBranchName">Salary Branch Name</Label>
                        <Input id="salaryBranchName" value={form.salaryBranchName} onChange={update("salaryBranchName")} />
                      </div>
                      <div className="lg:col-span-4 space-y-2">
                        <Label htmlFor="salaryIfsc">Salary IFSC Code</Label>
                        <Input id="salaryIfsc" value={form.salaryIfsc} onChange={update("salaryIfsc")} />
                      </div>
                      <div className="lg:col-span-4 space-y-2">
                        <Label htmlFor="salaryAccountNumber">Salary Account Number</Label>
                        <Input id="salaryAccountNumber" value={form.salaryAccountNumber} onChange={update("salaryAccountNumber")} />
                      </div>
                    </div>
                    <div className="mt-8" />
                    <CardTitle className="mb-4">Reimbursement</CardTitle>
                    <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-12">
                      <div className="lg:col-span-4 space-y-2">
                        <Label htmlFor="reimbursementPayMode">Reimbursement Pay Mode</Label>
                        <Input id="reimbursementPayMode" value={form.reimbursementPayMode} onChange={update("reimbursementPayMode")} />
                      </div>
                      <div className="lg:col-span-4 space-y-2">
                        <Label htmlFor="reimbursementBankName">Reimbursement Bank Name</Label>
                        <Input id="reimbursementBankName" value={form.reimbursementBankName} onChange={update("reimbursementBankName")} />
                      </div>
                      <div className="lg:col-span-4 space-y-2">
                        <Label htmlFor="reimbursementBranchName">Reimbursement Branch Name</Label>
                        <Input id="reimbursementBranchName" value={form.reimbursementBranchName} onChange={update("reimbursementBranchName")} />
                      </div>
                      <div className="lg:col-span-4 space-y-2">
                        <Label htmlFor="reimbursementIfsc">Reimbursement IFSC Code</Label>
                        <Input id="reimbursementIfsc" value={form.reimbursementIfsc} onChange={update("reimbursementIfsc")} />
                      </div>
                      <div className="lg:col-span-4 space-y-2">
                        <Label htmlFor="reimbursementAccountNumber">Reimbursement Account Number</Label>
                        <Input id="reimbursementAccountNumber" value={form.reimbursementAccountNumber} onChange={update("reimbursementAccountNumber")} />
                      </div>
                    </div>
                    <div className="mt-8 flex justify-end gap-2">
                      <Button variant="outline" type="button">Cancel</Button>
                      <Button type="button">Save Changes</Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="insurance" className="m-0">
                <Card className="w-full">
                  <CardHeader>
                    <CardTitle>Health Insurance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-12">
                      <div className="lg:col-span-4 space-y-2">
                        <Label htmlFor="insureeName">Insuree Name</Label>
                        <Input id="insureeName" value={form.insureeName} onChange={update("insureeName")} />
                      </div>
                      <div className="lg:col-span-4 space-y-2">
                        <Label htmlFor="relationship">Relationship</Label>
                        <Input id="relationship" value={form.relationship} onChange={update("relationship")} />
                      </div>
                      <div className="lg:col-span-4 space-y-2">
                        <Label htmlFor="insureeDob">Insuree Date of Birth</Label>
                        <Input id="insureeDob" type="date" value={form.insureeDob} onChange={update("insureeDob")} />
                      </div>
                      <div className="lg:col-span-4 space-y-2">
                        <Label htmlFor="insureeGender">Insuree Gender</Label>
                        <Input id="insureeGender" value={form.insureeGender} onChange={update("insureeGender")} />
                      </div>
                      <div className="lg:col-span-4 space-y-2">
                        <Label htmlFor="insureeCode">Insuree Code</Label>
                        <Input id="insureeCode" value={form.insureeCode} onChange={update("insureeCode")} />
                      </div>
                      <div className="lg:col-span-4 space-y-2">
                        <Label htmlFor="assuredSum">Assured Sum</Label>
                        <Input id="assuredSum" value={form.assuredSum} onChange={update("assuredSum")} />
                      </div>
                      <div className="lg:col-span-4 space-y-2">
                        <Label htmlFor="insuranceCompany">Insurance Company</Label>
                        <Input id="insuranceCompany" value={form.insuranceCompany} onChange={update("insuranceCompany")} />
                      </div>
                      <div className="lg:col-span-4 space-y-2">
                        <Label htmlFor="companyCode">Company Code</Label>
                        <Input id="companyCode" value={form.companyCode} onChange={update("companyCode")} />
                      </div>
                      <div className="lg:col-span-4 space-y-2">
                        <Label htmlFor="issueDate">Issue Date</Label>
                        <Input id="issueDate" type="date" value={form.issueDate} onChange={update("issueDate")} />
                      </div>
                    </div>
                    <div className="mt-8 flex justify-end gap-2">
                      <Button variant="outline" type="button">Cancel</Button>
                      <Button type="button">Save Changes</Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="other" className="m-0">
                <Card className="w-full">
                  <CardHeader>
                    <CardTitle>Employee Other Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-8">
                      <div className="lg:col-span-4 space-y-2">
                        <Label htmlFor="panNo">PAN No.</Label>
                        <Input id="panNo" value={form.panNo} onChange={update("panNo")} />
                      </div>
                      <div className="lg:col-span-4 space-y-2">
                        <Label htmlFor="aadharNo">Aadhar No.</Label>
                        <Input id="aadharNo" value={form.aadharNo} onChange={update("aadharNo")} />
                      </div>
                      <div className="lg:col-span-4 space-y-2">
                        <Label htmlFor="passportNo">Passport No.</Label>
                        <Input id="passportNo" value={form.passportNo} onChange={update("passportNo")} />
                      </div>
                      <div className="lg:col-span-4 space-y-2">
                        <Label htmlFor="passportExpiryDate">Passport Expiry Date</Label>
                        <Input id="passportExpiryDate" type="date" value={form.passportExpiryDate} onChange={update("passportExpiryDate")} />
                      </div>
                    </div>
                    <div className="mt-8" />
                    <CardTitle className="mb-4">Contact Details</CardTitle>
                    <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-8">
                      <div className="lg:col-span-4 space-y-2">
                        <Label htmlFor="personalEmailOther">Personal Email</Label>
                        <Input id="personalEmailOther" type="email" value={form.personalEmailOther} onChange={update("personalEmailOther")} />
                      </div>
                      <div className="lg:col-span-4 space-y-2">
                        <Label htmlFor="emergencyContact">Emergency Contact</Label>
                        <Input id="emergencyContact" value={form.emergencyContact} onChange={update("emergencyContact")} />
                      </div>
                      <div className="lg:col-span-4 space-y-2">
                        <Label htmlFor="emergencyContactName">Emergency Contact Name</Label>
                        <Input id="emergencyContactName" value={form.emergencyContactName} onChange={update("emergencyContactName")} />
                      </div>
                      <div className="lg:col-span-4 space-y-2">
                        <Label htmlFor="emergencyRelation">Emergency Relation</Label>
                        <Input id="emergencyRelation" value={form.emergencyRelation} onChange={update("emergencyRelation")} />
                      </div>
                    </div>
                    <div className="mt-8 flex justify-end gap-2">
                      <Button variant="outline" type="button">Cancel</Button>
                      <Button type="button">Save Changes</Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

