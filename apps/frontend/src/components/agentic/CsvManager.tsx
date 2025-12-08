import { useState, useEffect } from 'react'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Upload, Trash2, FileText, Download } from 'lucide-react'
import { getCsvList, uploadCsv, selectCsv, deleteCsv, downloadCsv } from '@/lib/agenticApi'
import type { CsvFile } from '@/types/agentic'

export default function CsvManager() {
    const [files, setFiles] = useState<CsvFile[]>([])
    const [loading, setLoading] = useState(false)
    const [uploading, setUploading] = useState(false)
    const { toast } = useToast()

    const fetchFiles = async () => {
        try {
            setLoading(true)
            const data = await getCsvList()
            setFiles(data.files)
        } catch (error) {
            console.error('Failed to fetch CSV files:', error)
            toast({
                title: "Error",
                description: "Failed to load CSV files",
                variant: "destructive",
            })
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchFiles()
    }, [])

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        try {
            setUploading(true)
            await uploadCsv(file)
            toast({
                title: "Success",
                description: `Uploaded ${file.name}`,
            })
            await fetchFiles()
        } catch (error) {
            console.error('Upload failed:', error)
            toast({
                title: "Error",
                description: "Failed to upload CSV",
                variant: "destructive",
            })
        } finally {
            setUploading(false)
            // Reset input
            e.target.value = ''
        }
    }

    const handleSelect = async (name: string) => {
        try {
            await selectCsv(name)
            toast({
                title: "Success",
                description: `Selected ${name}`,
            })
            await fetchFiles()
            // Reload page to refresh leads? Or use a context/callback
            window.location.reload()
        } catch (error) {
            console.error('Selection failed:', error)
            toast({
                title: "Error",
                description: "Failed to select CSV",
                variant: "destructive",
            })
        }
    }

    const handleDelete = async (name: string) => {
        if (!confirm(`Are you sure you want to delete ${name}?`)) return

        try {
            await deleteCsv(name)
            toast({
                title: "Success",
                description: `Deleted ${name}`,
            })
            await fetchFiles()
        } catch (error) {
            console.error('Delete failed:', error)
            toast({
                title: "Error",
                description: "Failed to delete CSV",
                variant: "destructive",
            })
        }
    }

    const activeFile = files.find(f => f.active)

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg font-medium">Lead Lists (CSV)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                    <div className="flex-1">
                        <Select
                            value={activeFile?.name || ''}
                            onValueChange={handleSelect}
                            disabled={loading}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select a CSV file..." />
                            </SelectTrigger>
                            <SelectContent>
                                {files.map(file => (
                                    <SelectItem key={file.name} value={file.name}>
                                        {file.name} ({Math.round(file.size / 1024)} KB)
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => document.getElementById('csv-upload')?.click()}
                            disabled={uploading}
                            title="Upload CSV"
                        >
                            <Upload className="w-4 h-4" />
                        </Button>
                        <Input
                            id="csv-upload"
                            type="file"
                            accept=".csv"
                            className="hidden"
                            onChange={handleFileUpload}
                        />

                        {activeFile && (
                            <>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    asChild
                                    title="Download CSV"
                                >
                                    <a href={downloadCsv(activeFile.name)} download>
                                        <Download className="w-4 h-4" />
                                    </a>
                                </Button>
                                <Button
                                    variant="destructive"
                                    size="icon"
                                    onClick={() => handleDelete(activeFile.name)}
                                    title="Delete CSV"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </>
                        )}
                    </div>
                </div>

                {activeFile && (
                    <div className="text-sm text-muted-foreground">
                        Active List: <span className="font-medium text-foreground">{activeFile.name}</span>
                        <span className="mx-2">•</span>
                        Uploaded: {new Date(activeFile.mtime * 1000).toLocaleDateString()}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
