"use client"

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import { getCsvList, uploadCsv, selectCsv, deleteCsv, previewCsv, downloadCsv } from '@/lib/agenticApi'
import { useToast } from '@/hooks/use-toast'
import { formatBytes, formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Upload, Download, Eye, Trash2, RefreshCw, Check } from 'lucide-react'
import type { CsvPreview } from '@/types/agentic'

export default function CsvManager() {
  const { toast } = useToast()
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [previewData, setPreviewData] = useState<CsvPreview & { fileName: string } | null>(null)
  const [showPreview, setShowPreview] = useState(false)

  const { data: csvData, isLoading, refetch } = useQuery({
    queryKey: ['csvList'],
    queryFn: () => getCsvList(),
    staleTime: 30 * 1000,
  })

  const csvFiles = csvData?.files || []
  const activeFile = csvFiles.find(f => f.active)

  const handleUpload = async () => {
    if (!uploadFile) {
      toast({
        title: "Error",
        description: "Please select a file to upload",
        variant: "destructive",
      })
      return
    }

    setIsUploading(true)
    try {
      await uploadCsv(uploadFile)
      toast({
        title: "Success",
        description: `Uploaded ${uploadFile.name} Successfully`,
      })
      setUploadFile(null)
      const fileInput = document.getElementById('csv-upload') as HTMLInputElement
      if (fileInput) fileInput.value = ''
      refetch()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to upload file",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  const handleSelect = async (fileName: string) => {
    try {
      await selectCsv(fileName)
      toast({
        title: "Success",
        description: `Active CSV set to ${fileName}`,
      })
      refetch()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to set active CSV",
        variant: "destructive",
      })
    }
  }

  const handleDelete = async (fileName: string) => {
    if (!confirm(`Delete ${fileName}?`)) return

    try {
      await deleteCsv(fileName)
      toast({
        title: "Success",
        description: `Deleted ${fileName}`,
      })
      refetch()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete file (if it is active, select another CSV first)",
        variant: "destructive",
      })
    }
  }

  const handlePreview = async (fileName: string) => {
    try {
      const preview = await previewCsv(fileName, 10)
      setPreviewData({ ...preview, fileName })
      setShowPreview(true)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to preview file",
        variant: "destructive",
      })
    }
  }

  const handleDownload = (fileName: string) => {
    const url = downloadCsv(fileName)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>CSV Manager</CardTitle>
              <CardDescription>
                Upload and manage your leads CSV files
              </CardDescription>
            </div>
            <Badge variant="secondary">
              Active: <span className="font-bold ml-1">{activeFile?.name || 'None'}</span>
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-6">
            <Input
              id="csv-upload"
              type="file"
              accept=".csv"
              onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
              className="flex-1"
            />
            <Button onClick={handleUpload} disabled={!uploadFile || isUploading}>
              {isUploading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload
                </>
              )}
            </Button>
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>

          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading CSV files...
            </div>
          ) : csvFiles.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No CSV files found. Upload a file to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>File</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {csvFiles.map((file) => (
                  <TableRow key={file.name}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {file.name}
                        {file.active && <Badge variant="default" className="text-xs">Active</Badge>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground">
                        {formatBytes(file.size)} · {formatDate(file.mtime)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSelect(file.name)}
                          disabled={file.active}
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handlePreview(file.name)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDownload(file.name)}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(file.name)}
                          disabled={file.active}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Preview: {previewData?.fileName}</DialogTitle>
            <DialogDescription>
              Showing first 10 rows of the CSV file
            </DialogDescription>
          </DialogHeader>
          {previewData && (
            <Table>
              <TableHeader>
                <TableRow>
                  {previewData.headers.map((header) => (
                    <TableHead key={header}>{header}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewData.rows.map((row, index) => (
                  <TableRow key={index}>
                    {previewData.headers.map((header) => (
                      <TableCell key={header}>{row[header] || ''}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}