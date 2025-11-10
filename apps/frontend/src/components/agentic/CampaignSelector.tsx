import { useState } from 'react'
import { useCampaigns } from '@/hooks/agentic/useCampaigns'
import { selectCampaign } from '@/lib/agenticApi'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Upload } from 'lucide-react'

interface CampaignSelectorProps {
  selectedCampaign: string
  onCampaignChange: (campaign: string) => void
}

export default function CampaignSelector({ selectedCampaign, onCampaignChange }: CampaignSelectorProps) {
  const { campaigns, loading } = useCampaigns()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmitting) return

    setIsSubmitting(true)
    try {
      await selectCampaign(selectedCampaign || null)
      toast({
        title: "Success",
        description: "Campaign applied successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to set campaign",
        variant: "destructive",
      })
      console.error('Campaign selection error:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      toast({
        title: "File Selected",
        description: `Campaign file "${file.name}" selected for upload`,
      })
      // TODO: Implement campaign file upload
    }
  }

  const selectedCampaignLabel = campaigns.find((c: { key: string; label: string }) => c.key === selectedCampaign)?.label || selectedCampaign

  return (
    <section className="my-4">
      <Card>
        <CardContent className="p-4">
          <form onSubmit={handleSubmit} className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <label htmlFor="campaign" className="text-sm font-medium">Campaign</label>
              <Select value={selectedCampaign} onValueChange={onCampaignChange} disabled={loading}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Select campaign..." />
                </SelectTrigger>
                <SelectContent>
                  {campaigns.map((campaign: { key: string; label: string }) => (
                    <SelectItem key={campaign.key} value={campaign.key}>
                      {campaign.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="submit" disabled={isSubmitting}>
                Apply
              </Button>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => document.getElementById('campaign-file')?.click()}
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Campaign
              </Button>
              <Input
                id="campaign-file"
                type="file"
                accept=".py"
                className="hidden"
                onChange={handleFileUpload}
              />
            </div>
            
            <Badge variant={selectedCampaign ? "default" : "secondary"}>
              Campaign: <span className="font-bold ml-1">{selectedCampaignLabel || "Not set"}</span>
            </Badge>
          </form>
        </CardContent>
      </Card>
    </section>
  )
}