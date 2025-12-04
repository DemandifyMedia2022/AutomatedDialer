"use client"

import React from 'react'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ManagerSidebar } from '../../components/ManagerSidebar'
import { API_BASE } from '@/lib/api'
import { USE_AUTH_COOKIE, getToken, getCsrfTokenFromCookies } from '@/lib/auth'
import { Upload, FileText, CheckCircle, AlertCircle, X, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function PlaybookUploadPage() {
  const router = useRouter()
  const [title, setTitle] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [type, setType] = React.useState('guide')
  const [visibility, setVisibility] = React.useState('org')
  const [status, setStatus] = React.useState('active')
  const [tags, setTags] = React.useState('')
  const [file, setFile] = React.useState<File | null>(null)
  const [text, setText] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)
  const [ok, setOk] = React.useState<string | null>(null)
  const [uploading, setUploading] = React.useState(false)
  const [uploadProgress, setUploadProgress] = React.useState(0)
  const [isDragging, setIsDragging] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null
    setFile(selectedFile)
    if (selectedFile && !title) {
      // Auto-populate title from filename
      const nameWithoutExt = selectedFile.name.replace(/\.[^/.]+$/, '')
      setTitle(nameWithoutExt)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const droppedFile = e.dataTransfer.files?.[0]
    if (droppedFile) {
      setFile(droppedFile)
      if (droppedFile && !title) {
        const nameWithoutExt = droppedFile.name.replace(/\.[^/.]+$/, '')
        setTitle(nameWithoutExt)
      }
    }
  }

  const removeFile = () => {
    setFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const submit = async () => {
    setError(null)
    setOk(null)
    setUploading(true)
    setUploadProgress(0)

    try {
      let credentials: RequestCredentials = 'omit'
      const headers: Record<string, string> = {}
      if (USE_AUTH_COOKIE) {
        credentials = 'include'
        const csrf = getCsrfTokenFromCookies()
        if (csrf) headers['X-CSRF-Token'] = csrf
      } else {
        const t = getToken()
        if (t) headers['Authorization'] = `Bearer ${t}`
      }

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 200)

      let res: Response
      if (file) {
        const form = new FormData()
        form.append('type', type)
        form.append('title', title)
        form.append('description', description)
        form.append('visibility', visibility)
        form.append('status', status)
        form.append('tags_csv', tags)
        if (text.trim()) form.append('content_richtext', text.trim())
        form.append('file', file)
        res = await fetch(`${API_BASE}/api/documents`, { method: 'POST', body: form, credentials, headers })
      } else {
        const body = JSON.stringify({ type, title, description, visibility, status, tags_csv: tags, content_richtext: text.trim() })
        res = await fetch(`${API_BASE}/api/documents`, { method: 'POST', credentials, headers: { ...headers, 'Content-Type': 'application/json' }, body })
      }

      clearInterval(progressInterval)
      setUploadProgress(100)

      if (!res.ok) throw new Error(`Upload failed: ${res.status}`)
      
      setOk('Playbook uploaded successfully!')
      setTitle('')
      setDescription('')
      setStatus('active')
      setTags('')
      setFile(null)
      setText('')
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }

      // Redirect after 2 seconds
      setTimeout(() => {
        router.push('/dashboard/manager/playbook')
      }, 2000)
    } catch (e: any) {
      setError(e?.message || 'Upload failed')
      setUploadProgress(0)
    } finally {
      setUploading(false)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  return (
    <SidebarProvider>
      <ManagerSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b">
          <div className="flex items-center gap-2 px-4 w-full">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/dashboard/manager">Manager</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/dashboard/manager/playbook">Playbook</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Upload</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4 pt-4 max-w-4xl mx-auto w-full">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {ok && (
            <Alert className="border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>{ok}</AlertDescription>
            </Alert>
          )}

          <Card className="transition-shadow hover:shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Upload Playbook
              </CardTitle>
              <CardDescription>
                Upload a new playbook document or paste content directly
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input 
                  id="title"
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)} 
                  placeholder="Enter playbook title" 
                  disabled={uploading}
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea 
                  id="description"
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)} 
                  placeholder="Provide a brief description of this playbook"
                  rows={3}
                  disabled={uploading}
                />
              </div>

              {/* Type, Visibility, Status, Tags */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Type</Label>
                  <Select value={type} onValueChange={setType} disabled={uploading}>
                    <SelectTrigger id="type">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="playbook">Playbook</SelectItem>
                      <SelectItem value="guide">Guide</SelectItem>
                      <SelectItem value="template">Template</SelectItem>
                      <SelectItem value="snippet">Snippet</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="visibility">Visibility</Label>
                  <Select value={visibility} onValueChange={setVisibility} disabled={uploading}>
                    <SelectTrigger id="visibility">
                      <SelectValue placeholder="Select visibility" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="private">Private</SelectItem>
                      <SelectItem value="org">Organization</SelectItem>
                      <SelectItem value="public">Public</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={status} onValueChange={setStatus} disabled={uploading}>
                    <SelectTrigger id="status">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tags">Tags</Label>
                  <Input 
                    id="tags"
                    value={tags} 
                    onChange={(e) => setTags(e.target.value)} 
                    placeholder="sales, pitch, cold-call"
                    disabled={uploading}
                  />
                </div>
              </div>

              <Separator />

              {/* File Upload */}
              <div className="space-y-2">
                <Label htmlFor="file">Upload File (optional)</Label>
                <div className="space-y-3">
                  {!file ? (
                    <div 
                      className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${
                        isDragging 
                          ? 'border-primary bg-primary/5 scale-[1.02]' 
                          : 'border-muted-foreground/25 hover:border-primary/50'
                      }`}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                    >
                      <Upload className={`h-8 w-8 mx-auto mb-2 transition-colors ${
                        isDragging ? 'text-primary' : 'text-muted-foreground'
                      }`} />
                      <p className="text-sm text-muted-foreground mb-2">
                        {isDragging ? 'Drop file here' : 'Click to upload or drag and drop'}
                      </p>
                      <p className="text-xs text-muted-foreground mb-4">
                        PDF, DOC, DOCX, TXT (max 10MB)
                      </p>
                      <Input 
                        ref={fileInputRef}
                        id="file"
                        type="file" 
                        onChange={handleFileChange}
                        className="hidden"
                        disabled={uploading}
                        accept=".pdf,.doc,.docx,.txt"
                      />
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                      >
                        Select File
                      </Button>
                    </div>
                  ) : (
                    <div className="border rounded-lg p-4 bg-muted/50 animate-in fade-in-50 duration-200">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <FileText className="h-8 w-8 text-primary flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{file.name}</p>
                            <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                          </div>
                        </div>
                        <Button 
                          type="button"
                          variant="ghost" 
                          size="sm"
                          onClick={removeFile}
                          disabled={uploading}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Text Content */}
              <div className="space-y-2">
                <Label htmlFor="text">Or Paste Content (optional)</Label>
                <Textarea 
                  id="text"
                  value={text} 
                  onChange={(e) => setText(e.target.value)} 
                  placeholder="Paste your playbook content here..."
                  rows={8}
                  disabled={uploading}
                  className="font-mono text-sm"
                />
              </div>

              {/* Upload Progress */}
              {uploading && uploadProgress > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Uploading...</span>
                    <span className="font-medium">{uploadProgress}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all duration-300 ease-out"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <div className="flex items-center justify-between pt-4">
                <p className="text-sm text-muted-foreground">
                  * Required fields
                </p>
                <div className="flex gap-2">
                  <Button 
                    type="button"
                    variant="outline" 
                    onClick={() => router.push('/dashboard/manager/playbook')}
                    disabled={uploading}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={submit} 
                    disabled={!title.trim() || (!file && !text.trim()) || uploading}
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Playbook
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
