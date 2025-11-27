'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, CheckCircle, XCircle, Eye } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { AuditLog } from '../../hooks/useAuditLogs'
import { format } from 'date-fns'

interface AuditLogTableProps {
  logs: AuditLog[]
  isLoading?: boolean
  onSort?: (field: string) => void
  sortField?: string
  sortDirection?: 'asc' | 'desc'
}

export function AuditLogTable({
  logs,
  isLoading,
  onSort,
  sortField,
  sortDirection,
}: AuditLogTableProps) {
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null)
  const [detailsDialogLog, setDetailsDialogLog] = useState<AuditLog | null>(null)

  const formatDate = (date: Date | string) => {
    try {
      return format(new Date(date), 'MMM d, yyyy HH:mm:ss')
    } catch {
      return 'Invalid date'
    }
  }

  const getOutcomeBadge = (outcome: 'success' | 'failure') => {
    if (outcome === 'success') {
      return (
        <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
          <CheckCircle className="h-3 w-3 mr-1" />
          Success
        </Badge>
      )
    }
    return (
      <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
        <XCircle className="h-3 w-3 mr-1" />
        Failure
      </Badge>
    )
  }

  const getActionColor = (action: string) => {
    if (action.includes('CREATE')) {
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
    }
    if (action.includes('UPDATE') || action.includes('MODIFY')) {
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
    }
    if (action.includes('DELETE')) {
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    }
    if (action.includes('LOGIN') || action.includes('LOGOUT')) {
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
    }
    return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
  }

  const toggleExpand = (logId: string) => {
    setExpandedLogId(expandedLogId === logId ? null : logId)
  }

  const handleSort = (field: string) => {
    if (onSort) {
      onSort(field)
    }
  }

  const renderSortIcon = (field: string) => {
    if (sortField !== field) return null
    return sortDirection === 'asc' ? '↑' : '↓'
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Audit Logs</CardTitle>
          <CardDescription>Loading audit logs...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Audit Logs</CardTitle>
          <CardDescription>
            {logs.length} log entr{logs.length !== 1 ? 'ies' : 'y'} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-2 font-medium text-sm w-8"></th>
                  <th
                    className="text-left py-3 px-2 font-medium text-sm cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('timestamp')}
                  >
                    Timestamp {renderSortIcon('timestamp')}
                  </th>
                  <th
                    className="text-left py-3 px-2 font-medium text-sm cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('username')}
                  >
                    User {renderSortIcon('username')}
                  </th>
                  <th
                    className="text-left py-3 px-2 font-medium text-sm cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('action')}
                  >
                    Action {renderSortIcon('action')}
                  </th>
                  <th
                    className="text-left py-3 px-2 font-medium text-sm cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('resource')}
                  >
                    Resource {renderSortIcon('resource')}
                  </th>
                  <th className="text-left py-3 px-2 font-medium text-sm">Outcome</th>
                  <th className="text-left py-3 px-2 font-medium text-sm">IP Address</th>
                  <th className="text-right py-3 px-2 font-medium text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-muted-foreground">
                      No audit logs found
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <>
                      <tr
                        key={log.id}
                        className="border-b hover:bg-muted/50 transition-colors"
                      >
                        <td className="py-3 px-2">
                          {log.changes && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => toggleExpand(log.id)}
                            >
                              {expandedLogId === log.id ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                        </td>
                        <td className="py-3 px-2 text-sm font-mono">
                          {formatDate(log.timestamp)}
                        </td>
                        <td className="py-3 px-2">
                          <div>
                            <p className="font-medium text-sm">
                              {log.username || 'System'}
                            </p>
                            {log.user_id && (
                              <p className="text-xs text-muted-foreground">
                                ID: {log.user_id}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-2">
                          <Badge className={cn('text-xs', getActionColor(log.action))}>
                            {log.action}
                          </Badge>
                        </td>
                        <td className="py-3 px-2">
                          <div>
                            <p className="font-medium text-sm">{log.resource}</p>
                            {log.resource_id && (
                              <p className="text-xs text-muted-foreground font-mono">
                                {log.resource_id}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-2">{getOutcomeBadge(log.outcome)}</td>
                        <td className="py-3 px-2 text-sm font-mono">
                          {log.ip || <span className="text-muted-foreground">-</span>}
                        </td>
                        <td className="py-3 px-2 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDetailsDialogLog(log)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Details
                          </Button>
                        </td>
                      </tr>
                      {expandedLogId === log.id && log.changes && (
                        <tr className="border-b bg-muted/30">
                          <td colSpan={8} className="py-4 px-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <h4 className="font-semibold text-sm mb-2">Before</h4>
                                <pre className="bg-background p-3 rounded text-xs overflow-auto max-h-48">
                                  {JSON.stringify(log.changes.before, null, 2)}
                                </pre>
                              </div>
                              <div>
                                <h4 className="font-semibold text-sm mb-2">After</h4>
                                <pre className="bg-background p-3 rounded text-xs overflow-auto max-h-48">
                                  {JSON.stringify(log.changes.after, null, 2)}
                                </pre>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!detailsDialogLog} onOpenChange={() => setDetailsDialogLog(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Audit Log Details</DialogTitle>
            <DialogDescription>
              Complete information about this audit log entry
            </DialogDescription>
          </DialogHeader>
          {detailsDialogLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold">Timestamp</label>
                  <p className="text-sm font-mono">{formatDate(detailsDialogLog.timestamp)}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold">Outcome</label>
                  <div className="mt-1">{getOutcomeBadge(detailsDialogLog.outcome)}</div>
                </div>
                <div>
                  <label className="text-sm font-semibold">User</label>
                  <p className="text-sm">{detailsDialogLog.username || 'System'}</p>
                  {detailsDialogLog.user_id && (
                    <p className="text-xs text-muted-foreground">ID: {detailsDialogLog.user_id}</p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-semibold">Action</label>
                  <div className="mt-1">
                    <Badge className={cn('text-xs', getActionColor(detailsDialogLog.action))}>
                      {detailsDialogLog.action}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-semibold">Resource</label>
                  <p className="text-sm">{detailsDialogLog.resource}</p>
                  {detailsDialogLog.resource_id && (
                    <p className="text-xs text-muted-foreground font-mono">
                      {detailsDialogLog.resource_id}
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-semibold">IP Address</label>
                  <p className="text-sm font-mono">{detailsDialogLog.ip || '-'}</p>
                </div>
              </div>

              {detailsDialogLog.user_agent && (
                <div>
                  <label className="text-sm font-semibold">User Agent</label>
                  <p className="text-xs text-muted-foreground break-all">
                    {detailsDialogLog.user_agent}
                  </p>
                </div>
              )}

              {detailsDialogLog.changes && (
                <div>
                  <label className="text-sm font-semibold mb-2 block">Changes</label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-xs font-semibold mb-1">Before</h4>
                      <pre className="bg-muted p-3 rounded text-xs overflow-auto max-h-64">
                        {JSON.stringify(detailsDialogLog.changes.before, null, 2)}
                      </pre>
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold mb-1">After</h4>
                      <pre className="bg-muted p-3 rounded text-xs overflow-auto max-h-64">
                        {JSON.stringify(detailsDialogLog.changes.after, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
