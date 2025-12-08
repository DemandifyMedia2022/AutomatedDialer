'use client'

import { useState, useMemo } from 'react'
import { ChevronDown, ChevronUp, Search, ArrowUpDown } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { APIMetrics } from '../../hooks/useAPIMetrics'

interface APIEndpointsTableProps {
  metrics: APIMetrics[]
  isLoading?: boolean
}

type SortField = 'endpoint' | 'requestCount' | 'avgResponseTime' | 'errorRate' | 'p95' | 'p99'
type SortDirection = 'asc' | 'desc'

export function APIEndpointsTable({ metrics, isLoading }: APIEndpointsTableProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedRow, setExpandedRow] = useState<string | null>(null)
  const [sortField, setSortField] = useState<SortField>('requestCount')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  // Filter metrics by search query
  const filteredMetrics = useMemo(() => {
    if (!searchQuery) return metrics

    const query = searchQuery.toLowerCase()
    return metrics.filter(
      (m) =>
        m.endpoint.toLowerCase().includes(query) ||
        m.method.toLowerCase().includes(query)
    )
  }, [metrics, searchQuery])

  // Sort metrics
  const sortedMetrics = useMemo(() => {
    const sorted = [...filteredMetrics]
    
    sorted.sort((a, b) => {
      const aValue: number | string = a[sortField]
      const bValue: number | string = b[sortField]
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue)
      }
      
      return sortDirection === 'asc'
        ? (aValue as number) - (bValue as number)
        : (bValue as number) - (aValue as number)
    })
    
    return sorted
  }, [filteredMetrics, sortField, sortDirection])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const toggleRow = (key: string) => {
    setExpandedRow(expandedRow === key ? null : key)
  }

  const getMethodColor = (method: string) => {
    switch (method.toUpperCase()) {
      case 'GET':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'POST':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'PUT':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'DELETE':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      case 'PATCH':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  const getErrorRateColor = (errorRate: number) => {
    if (errorRate >= 5) return 'text-red-600 font-semibold'
    if (errorRate >= 1) return 'text-yellow-600'
    return 'text-green-600'
  }

  const SortButton = ({ field, label }: { field: SortField; label: string }) => (
    <Button
      variant="ghost"
      size="sm"
      className="h-8 px-2 hover:bg-muted"
      onClick={() => handleSort(field)}
    >
      {label}
      {sortField === field ? (
        sortDirection === 'asc' ? (
          <ChevronUp className="ml-1 h-3 w-3" />
        ) : (
          <ChevronDown className="ml-1 h-3 w-3" />
        )
      ) : (
        <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />
      )}
    </Button>
  )

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>API Endpoints</CardTitle>
          <CardDescription>Loading endpoint metrics...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>API Endpoints</CardTitle>
            <CardDescription>
              {filteredMetrics.length} endpoint{filteredMetrics.length !== 1 ? 's' : ''} found
            </CardDescription>
          </div>
          <div className="relative w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Filter by endpoint..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-2 font-medium text-sm">Endpoint</th>
                <th className="text-left py-3 px-2 font-medium text-sm">Method</th>
                <th className="text-right py-3 px-2">
                  <SortButton field="requestCount" label="Requests" />
                </th>
                <th className="text-right py-3 px-2">
                  <SortButton field="avgResponseTime" label="Avg Time" />
                </th>
                <th className="text-right py-3 px-2">
                  <SortButton field="errorRate" label="Error Rate" />
                </th>
                <th className="text-right py-3 px-2">
                  <SortButton field="p95" label="P95" />
                </th>
                <th className="text-right py-3 px-2">
                  <SortButton field="p99" label="P99" />
                </th>
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody>
              {sortedMetrics.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-muted-foreground">
                    No endpoints found matching your search
                  </td>
                </tr>
              ) : (
                sortedMetrics.map((metric) => {
                  const key = `${metric.method}:${metric.endpoint}`
                  const isExpanded = expandedRow === key

                  return (
                    <>
                      <tr
                        key={key}
                        className={cn(
                          'border-b hover:bg-muted/50 cursor-pointer transition-colors',
                          isExpanded && 'bg-muted/50'
                        )}
                        onClick={() => toggleRow(key)}
                      >
                        <td className="py-3 px-2 font-mono text-sm">{metric.endpoint}</td>
                        <td className="py-3 px-2">
                          <Badge className={cn('text-xs', getMethodColor(metric.method))}>
                            {metric.method}
                          </Badge>
                        </td>
                        <td className="py-3 px-2 text-right font-medium">
                          {metric.requestCount.toLocaleString()}
                        </td>
                        <td className="py-3 px-2 text-right">
                          <span className="font-medium">{metric.avgResponseTime}</span>
                          <span className="text-xs text-muted-foreground ml-1">ms</span>
                        </td>
                        <td className="py-3 px-2 text-right">
                          <span className={getErrorRateColor(metric.errorRate)}>
                            {metric.errorRate.toFixed(2)}%
                          </span>
                        </td>
                        <td className="py-3 px-2 text-right">
                          <span className="font-medium">{metric.p95}</span>
                          <span className="text-xs text-muted-foreground ml-1">ms</span>
                        </td>
                        <td className="py-3 px-2 text-right">
                          <span className="font-medium">{metric.p99}</span>
                          <span className="text-xs text-muted-foreground ml-1">ms</span>
                        </td>
                        <td className="py-3 px-2 text-center">
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          )}
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="border-b bg-muted/30">
                          <td colSpan={8} className="py-4 px-6">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Total Requests</p>
                                <p className="text-lg font-semibold">
                                  {metric.requestCount.toLocaleString()}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Error Count</p>
                                <p className="text-lg font-semibold text-red-600">
                                  {metric.errorCount.toLocaleString()}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">P50 (Median)</p>
                                <p className="text-lg font-semibold">{metric.p50}ms</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Success Rate</p>
                                <p className="text-lg font-semibold text-green-600">
                                  {(100 - metric.errorRate).toFixed(2)}%
                                </p>
                              </div>
                            </div>
                            <div className="mt-4 pt-4 border-t">
                              <p className="text-xs text-muted-foreground mb-2">Response Time Distribution</p>
                              <div className="flex items-end gap-2 h-16">
                                <div className="flex-1 flex flex-col items-center">
                                  <div
                                    className="w-full bg-blue-500 rounded-t"
                                    style={{
                                      height: `${(metric.p50 / metric.p99) * 100}%`,
                                      minHeight: '4px',
                                    }}
                                  />
                                  <span className="text-xs mt-1">P50</span>
                                </div>
                                <div className="flex-1 flex flex-col items-center">
                                  <div
                                    className="w-full bg-yellow-500 rounded-t"
                                    style={{
                                      height: `${(metric.p95 / metric.p99) * 100}%`,
                                      minHeight: '4px',
                                    }}
                                  />
                                  <span className="text-xs mt-1">P95</span>
                                </div>
                                <div className="flex-1 flex flex-col items-center">
                                  <div className="w-full bg-red-500 rounded-t h-full" />
                                  <span className="text-xs mt-1">P99</span>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
