import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { AgentSidebar } from "../../components/AgentSidebar";

const CallHistory = () => {
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
                  <BreadcrumbLink href="/dashboard/agent/my-calls">My Calls</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Call History</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4 pt-0"> 
          
          <div className="p-6">
           <h1 className="text-2xl font-bold mb-3">Call History</h1>
            <div className="flex justify-between items-center mb-4">
              
              <div className="flex space-x-2">
                <Input type="date" placeholder="From Date" />
                <Input type="date" placeholder="To Date" />
                <Input placeholder="Phone No." />
                <Input placeholder="Extension" />
                <select
                  className="border h-9 rounded-md bg-transparent px-3 py-1 text-sm"
                  defaultValue=""
                  aria-label="Status"
                >
                  <option value="" disabled>
                    Select Status
                  </option>
                  <option>ANSWERED</option>
                  <option>NO ANSWER</option>
                  <option>BUSY</option>
                  <option>FAILED</option>
                </select>
                <select
                  className="border h-9 rounded-md bg-transparent px-3 py-1 text-sm"
                  defaultValue=""
                  aria-label="Call Type"
                >
                  <option value="" disabled>
                    Select Call Type
                  </option>
                  <option>Inbound</option>
                  <option>Outbound</option>
                </select>
                <Button>Search</Button>
                <Button>Reset</Button>
              </div>
            </div>
            <div className="mt-4 overflow-x-auto rounded-lg border">
              <table className="min-w-full text-sm">
                <thead className="bg-muted sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">ID</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Extension</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Destination Number</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Source</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Start Time (UTC)</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">End Time (UTC)</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Call Duration</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Call Disposition</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <tr className="hover:bg-accent/50">
                    <td className="px-4 py-3">151974</td>
                    <td className="px-4 py-3">1033204</td>
                    <td className="px-4 py-3">91972779416</td>
                    <td className="px-4 py-3">13236595567</td>
                    <td className="px-4 py-3">2025-11-05 05:55:33</td>
                    <td className="px-4 py-3">2025-11-05 05:56:33</td>
                    <td className="px-4 py-3">60 Sec</td>
                    <td className="px-4 py-3">NO ANSWER</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="flex justify-center mt-4 gap-2">
              <Button variant="outline" size="sm">1</Button>
              <Button variant="outline" size="sm">2</Button>
              <Button variant="outline" size="sm">3</Button>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default CallHistory;