"use client"

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import { getCampaignsList, createCampaign, getCampaign, updateCampaign, deleteCampaign, uploadPrompts, seedSupabase } from '@/lib/agenticApi'
import type { QueryFunction, UseQueryOptions } from '@tanstack/react-query'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Upload, Trash2, Save, Plus, Database } from 'lucide-react'

export default function CampaignsManager() {
  const { toast } = useToast()
  
  // Form states
  const [campaignName, setCampaignName] = useState('')
  const [campaignModule, setCampaignModule] = useState('')
  const [agentText, setAgentText] = useState('')
  const [sessionText, setSessionText] = useState('')
  const [selectedCampaign, setSelectedCampaign] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isSeeding, setIsSeeding] = useState(false)
  
  const { data: campaignsData, isLoading, refetch } = useQuery({
    queryKey: ['campaignsList'],
    queryFn: getCampaignsList,
    staleTime: 2 * 60 * 1000,
  })

  const builtin = campaignsData?.builtin || []
  const custom = campaignsData?.custom || []

  const handleCreateCampaign = async () => {
    if (!campaignName.trim()) {
      toast({
        title: "Error",
        description: "Campaign name is required",
        variant: "destructive",
      })
      return
    }

    setIsCreating(true)
    try {
      const slug = (campaignModule && campaignModule.trim())
        ? campaignModule.trim()
        : campaignName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'campaign'
      const result = await createCampaign(campaignName, slug, agentText, sessionText)
      
      if (result.supabase_error) {
        toast({
          title: "Warning",
          description: `Campaign created locally. Supabase error: ${result.supabase_error}`,
        })
      } else {
        toast({
          title: "Success",
          description: `Created campaign "${campaignName}"`,
        })
      }
      
      // Clear form
      setCampaignName('')
      setCampaignModule('')
      setAgentText('')
      setSessionText('')
      refetch()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create campaign",
        variant: "destructive",
      })
    } finally {
      setIsCreating(false)
    }
  }

  const handleLoadCampaign = async () => {
    if (!selectedCampaign) {
      toast({
        title: "Error",
        description: "Select a campaign to load",
        variant: "destructive",
      })
      return
    }

    try {
      const data = await getCampaign(selectedCampaign)
      setCampaignName(data.name || selectedCampaign)
      setAgentText(data.agent_text || '')
      setSessionText(data.session_text || '')
      toast({
        title: "Success",
        description: `Loaded campaign "${data.name || selectedCampaign}"`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load campaign",
        variant: "destructive",
      })
    }
  }

  const handleSaveCampaign = async () => {
    if (!selectedCampaign) {
      toast({
        title: "Error",
        description: "Select a campaign to save",
        variant: "destructive",
      })
      return
    }

    const name = campaignName.trim() || selectedCampaign
    setIsSaving(true)
    try {
      await updateCampaign(selectedCampaign, name, agentText, sessionText)
      toast({
        title: "Success",
        description: `Saved campaign "${name}"`,
      })
      refetch()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save campaign",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteCampaign = async (module: string) => {
    if (!confirm(`Delete campaign "${module}"?`)) return

    try {
      await deleteCampaign(module)
      toast({
        title: "Success",
        description: `Deleted campaign "${module}"`,
      })
      refetch()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete campaign",
        variant: "destructive",
      })
    }
  }

  const handleUploadPrompt = async (which: 'agent' | 'session', file: File) => {
    try {
      const result = await uploadPrompts(which, file)
      if (which === 'agent') {
        setAgentText(result.text || '')
      } else {
        setSessionText(result.text || '')
      }
      toast({
        title: "Success",
        description: `Uploaded ${which} prompt`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to upload prompt",
        variant: "destructive",
      })
    }
  }

  const handleSeedSupabase = async () => {
    setIsSeeding(true)
    try {
      const result = await seedSupabase()
      if (result.errors && result.errors.length > 0) {
        toast({
          title: "Partial Success",
          description: `Seeded ${result.count || 0} campaigns with some errors`,
        })
      } else {
        toast({
          title: "Success",
          description: `Seeded ${result.count || 0} campaigns to Supabase`,
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to seed Supabase",
        variant: "destructive",
      })
    } finally {
      setIsSeeding(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Campaigns Manager</CardTitle>
          <CardDescription>
            Create and manage campaign prompts for different use cases
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="editor" className="space-y-6">
            <TabsList>
              <TabsTrigger value="editor">Campaign Editor</TabsTrigger>
              <TabsTrigger value="list">Campaign List</TabsTrigger>
            </TabsList>

            <TabsContent value="editor" className="space-y-6">
              {/* Create New Campaign */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Create New Campaign</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="space-y-2">
                      <Label htmlFor="campaign-name">Campaign Name</Label>
                      <Input
                        id="campaign-name"
                        placeholder="e.g., My Product Campaign"
                        value={campaignName}
                        onChange={(e) => setCampaignName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="campaign-module">Module (optional)</Label>
                      <Input
                        id="campaign-module"
                        placeholder="e.g., my-product"
                        value={campaignModule}
                        onChange={(e) => setCampaignModule(e.target.value)}
                      />
                    </div>
                  </div>
                  <Button onClick={handleCreateCampaign} disabled={isCreating}>
                    {isCreating ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin mr-2" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-2" />
                        Create Campaign
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Edit Existing Campaign */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Edit Existing Campaign</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 mb-6">
                    <Select value={selectedCampaign || undefined} onValueChange={setSelectedCampaign}>
                      <SelectTrigger className="w-64">
                        <SelectValue placeholder="Select campaign..." />
                      </SelectTrigger>
                      <SelectContent>
                        {custom
                          .filter(campaign => !!campaign.module && String(campaign.module).trim() !== '')
                          .map(campaign => (
                            <SelectItem key={campaign.module} value={campaign.module}>
                              {campaign.name} ({campaign.module})
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <Button onClick={handleLoadCampaign}>Load Selected</Button>
                    <Button onClick={handleSaveCampaign} disabled={isSaving}>
                      {isSaving ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin mr-2" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Save Changes
                        </>
                      )}
                    </Button>
                    
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="agent-text">Agent Instructions</Label>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Upload className="w-4 h-4 mr-2" />
                              Upload
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Upload Agent Instructions</DialogTitle>
                              <DialogDescription>
                                Upload a text file containing agent instructions
                              </DialogDescription>
                            </DialogHeader>
                            <Input
                              type="file"
                              accept=".txt,.md"
                              onChange={(e) => {
                                const file = e.target.files?.[0]
                                if (file) handleUploadPrompt('agent', file)
                              }}
                            />
                          </DialogContent>
                        </Dialog>
                      </div>
                      <Textarea
                        id="agent-text"
                        rows={12}
                        placeholder="Paste or write agent instructions..."
                        value={agentText}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setAgentText(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="session-text">Session Instructions</Label>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Upload className="w-4 h-4 mr-2" />
                              Upload
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Upload Session Instructions</DialogTitle>
                              <DialogDescription>
                                Upload a text file containing session script
                              </DialogDescription>
                            </DialogHeader>
                            <Input
                              type="file"
                              accept=".txt,.md"
                              onChange={(e) => {
                                const file = e.target.files?.[0]
                                if (file) handleUploadPrompt('session', file)
                              }}
                            />
                          </DialogContent>
                        </Dialog>
                      </div>
                      <Textarea
                        id="session-text"
                        rows={12}
                        placeholder="Paste or write session script..."
                        value={sessionText}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setSessionText(e.target.value)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="list" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Built-in Campaigns</CardTitle>
                    <CardDescription>System-provided campaign templates</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <div className="text-center py-4 text-muted-foreground">Loading...</div>
                    ) : builtin.length === 0 ? (
                      <div className="text-center py-4 text-muted-foreground">No built-in campaigns</div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Module</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {builtin.map((campaign) => (
                            <TableRow key={campaign.module}>
                              <TableCell>{campaign.name}</TableCell>
                              <TableCell className="font-mono text-sm">{campaign.module}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Custom Campaigns</CardTitle>
                    <CardDescription>User-created campaign templates</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <div className="text-center py-4 text-muted-foreground">Loading...</div>
                    ) : custom.length === 0 ? (
                      <div className="text-center py-4 text-muted-foreground">No custom campaigns</div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Module</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {custom.map((campaign) => (
                            <TableRow key={campaign.module}>
                              <TableCell>{campaign.name}</TableCell>
                              <TableCell className="font-mono text-sm">{campaign.module}</TableCell>
                              <TableCell>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleDeleteCampaign(campaign.module)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}