'use client'

import { useState } from 'react'
import { Download, Filter, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { AuditLogTable } from '../../components/tables/AuditLogTable'
import { useAuditLogs, useExportAuditLogs } from '../../hooks/useAuditLogs'
import { MetricCard } from '../../components/cards/MetricCard'
import { FileText, CheckCircle, XCircle, Activity } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { format } from 'date-fns'

export default function AuditLogsPage() {
  const { toast } = useToast()
  const [page, setPage] = useState(1)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [userIdFilter, setUserIdFilter] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [resourceFilter, setResourceFilter] = useState('')
  const [outcomeFilter, setOutcomeFilter] = useState<'success' | 'failure' | ''>('')
  const [sortField, setSortField] = useState('timestamp')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  // Build filters object
  const filters = {
    page,
    limit: 20,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    userId: userIdFilter ? parseInt(userIdFilter) : undefined,
    action: actionFilter || undefined,
    resource: resourceFilter || undefined,
    outcome: (outcomeFilter || undefined) as 'success' | 'failure' | undefined,
  }

  const { data, isLoading, error } = useAuditLogs(filters)
  const exportMutation = useExportAuditLogs()

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const handleExport = async (exportFormat: 'csv' | 'json' | 'excel') => {
    try {
      const blob = await exportMutation.mutateAsync({
        format: exportFormat,
        filters: {
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          userId: userIdFilter ? parseInt(userIdFilter) : undefined,
          action: actionFilter || undefined,
          resource: resourceFilter || undefined,
          outcome: (outcomeFilter || undefined) as 'success' | 'failure' | undefined,
        },
      })

      // Create download link
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const timestamp = format(new Date(), 'yyyy-MM-dd-HHmmss')
      a.download = `audit-logs-${exportFormat}-${timestamp}.${
        exportFormat === 'excel' ? 'xlsx' : exportFormat
      }`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast({
        title: 'Success',
        description: `Audit logs exported as ${exportFormat.toUpperCase()}`,
      })
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to export audit logs',
        variant: 'destructive',
      })
    }
  }

  const handleClearFilters = () => {
    setStartDate('')
    setEndDate('')
    setUserIdFilter('')
    setActionFilter('')
    setResourceFilter('')
    setOutcomeFilter('')
    setPage(1)
  }

  // Calculate statistics
  const stats = data?.logs
    ? {
        total: data.pagination.total,
        success: data.logs.filter((log) => log.outcome === 'success').length,
        failure: data.logs.filter((log) => log.outcome === 'failure').length,
        uniqueUsers: new Set(data.logs.map((log) => log.user_id).filter(Boolean)).size,
      }
    : { total: 0, success: 0, failure: 0, uniqueUsers: 0 }

  // Sort logs client-side
  const sortedLogs = data?.logs
    ? [...data.logs].sort((a, b) => {
        let aVal: any = a[sortField as keyof typeof a]
        let bVal: any = b[sortField as keyof typeof b]

        if (sortField === 'timestamp') {
          aVal = new Date(aVal).getTime()
          bVal = new Date(bVal).getTime()
        }

        if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
        if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
        return 0
      })
    : []

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="/dashboard/superadmin">Super Admin</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="/dashboard/superadmin/security">Security</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>Audit Logs</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Audit Logs</h1>
          <p className="text-muted-foreground mt-2">
            View and analyze system audit logs for compliance and troubleshooting
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Total Logs"
            value={stats.total}
            icon={FileText}
            description="All audit entries"
          />
          <MetricCard
            title="Successful Actions"
            value={stats.success}
            icon={CheckCircle}
            description="Completed successfully"
          />
          <MetricCard
            title="Failed Actions"
            value={stats.failure}
            icon={XCircle}
            description="Failed or rejected"
          />
          <MetricCard
            title="Unique Users"
            value={stats.uniqueUsers}
            icon={Activity}
            description="Active in this period"
          />
        </div>

        {/* Filters and Actions */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Filters</CardTitle>
                <CardDescription>Filter and search audit logs</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleClearFilters}>
                  Clear Filters
                </Button>
                <Select onValueChange={(value) => handleExport(value as 'csv' | 'json' | 'excel')}>
                  <SelectTrigger className="w-[140px]">
                    <Download className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Export" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="csv">Export CSV</SelectItem>
                    <SelectItem value="json">Export JSON</SelectItem>
                    <SelectItem value="excel">Export Excel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {/* Date Range */}
              <div>
                <label className="text-sm font-medium mb-2 block">Start Date</label>
                <div className="relative">
                  <Calendar className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value)
                      setPage(1)
                    }}
                    className="pl-8"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">End Date</label>
                <div className="relative">
                  <Calendar className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value)
                      setPage(1)
                    }}
                    className="pl-8"
                  />
                </div>
              </div>

              {/* User ID Filter */}
              <div>
                <label className="text-sm font-medium mb-2 block">User ID</label>
                <Input
                  type="number"
                  placeholder="Filter by user ID..."
                  value={userIdFilter}
                  onChange={(e) => {
                    setUserIdFilter(e.target.value)
                    setPage(1)
                  }}
                />
              </div>

              {/* Action Filter */}
              <div>
                <label className="text-sm font-medium mb-2 block">Action</label>
                <Input
                  placeholder="Filter by action..."
                  value={actionFilter}
                  onChange={(e) => {
                    setActionFilter(e.target.value)
                    setPage(1)
                  }}
                />
              </div>

              {/* Resource Filter */}
              <div>
                <label className="text-sm font-medium mb-2 block">Resource</label>
                <Input
                  placeholder="Filter by resource..."
                  value={resourceFilter}
                  onChange={(e) => {
                    setResourceFilter(e.target.value)
                    setPage(1)
                  }}
                />
              </div>

              {/* Outcome Filter */}
              <div>
                <label className="text-sm font-medium mb-2 block">Outcome</label>
                <Select
                  value={outcomeFilter || 'all'}
                  onValueChange={(value) => {
                    setOutcomeFilter(value === 'all' ? '' : (value as 'success' | 'failure'))
                    setPage(1)
                  }}
                >
                  <SelectTrigger>
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Filter by outcome" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Outcomes</SelectItem>
                    <SelectItem value="success">Success</SelectItem>
                    <SelectItem value="failure">Failure</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Error State */}
        {error && (
          <Card className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950">
            <CardContent className="pt-6">
              <p className="text-red-600 dark:text-red-400">
                Error loading audit logs: {error.message}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Audit Logs Table */}
        <AuditLogTable
          logs={sortedLogs}
          isLoading={isLoading}
          onSort={handleSort}
          sortField={sortField}
          sortDirection={sortDirection}
        />

        {/* Pagination */}
        {data?.pagination && data.pagination.totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, data.pagination.total)} of{' '}
              {data.pagination.total} logs
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1 || isLoading}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(data.pagination.totalPages, p + 1))}
                disabled={page === data.pagination.totalPages || isLoading}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
