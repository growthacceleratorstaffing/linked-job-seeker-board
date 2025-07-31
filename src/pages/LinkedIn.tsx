// Complete LinkedIn Integration System for Lovable
// This file contains all the components, types, and API implementation needed

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { 
  RefreshCw, 
  ExternalLink, 
  CheckCircle, 
  XCircle, 
  User, 
  Download,
  Upload,
  Settings,
  Link,
  Users,
  BarChart3,
  AlertTriangle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

// Types and Interfaces
interface LinkedInProfile {
  id: string;
  firstName: string;
  lastName: string;
  profilePicture?: string;
  headline?: string;
  vanityName?: string;
  industry?: string;
  location?: string;
}

interface LinkedInLead {
  id: string;
  linkedin_lead_id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  company?: string;
  job_title?: string;
  form_name?: string;
  linkedin_campaign_id?: string;
  submitted_at?: string;
  lead_data?: any;
}

interface LinkedInToken {
  id: string;
  access_token: string;
  refresh_token?: string;
  token_expires_at?: string;
  scope?: string;
  created_at: string;
  updated_at: string;
}

interface ConnectionStatus {
  connected: boolean;
  profile?: LinkedInProfile;
  token?: LinkedInToken;
  error?: string;
  scopes?: string[];
}

// Main LinkedIn Integration Component
const LinkedInIntegration: React.FC = () => {
  const { toast } = useToast();
  
  // State management
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({ connected: false });
  const [leads, setLeads] = useState<LinkedInLead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  
  // Settings state
  const [autoSync, setAutoSync] = useState(false);
  const [syncFrequency, setSyncFrequency] = useState(24);
  const [webhookUrl, setWebhookUrl] = useState("");
  
  // Search and filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCampaign, setSelectedCampaign] = useState("");

  // Initialize data on component mount
  useEffect(() => {
    checkConnectionStatus();
    fetchLeads();
    loadSettings();
  }, []);

  // Connection and authentication functions
  const checkConnectionStatus = async () => {
    setIsLoading(true);
    try {
      // Check if user has LinkedIn tokens - using any for now since table doesn't exist in types
      const { data: tokenData, error: tokenError } = await (supabase as any)
        .from('linkedin_user_tokens')
        .select('*')
        .single();

      if (tokenError && tokenError.code !== 'PGRST116') {
        throw tokenError;
      }

      if (tokenData) {
        // Test connection with the token
        const { data: testData, error: testError } = await supabase.functions.invoke('linkedin-lead-sync', {
          body: { action: 'testConnection' }
        });

        if (testError) {
          throw testError;
        }

        if (testData?.connected) {
          // Get profile information
          const { data: profileData, error: profileError } = await supabase.functions.invoke('linkedin-lead-sync', {
            body: { action: 'getProfile' }
          });

          setConnectionStatus({
            connected: true,
            token: tokenData,
            profile: profileData?.profile,
            scopes: tokenData.scope?.split(' ') || []
          });
        } else {
          setConnectionStatus({
            connected: false,
            error: 'LinkedIn connection test failed'
          });
        }
      } else {
        setConnectionStatus({ connected: false });
      }
    } catch (error) {
      console.error('Error checking connection status:', error);
      setConnectionStatus({
        connected: false,
        error: error.message
      });
    } finally {
      setIsLoading(false);
    }
  };

  const connectToLinkedIn = async () => {
    try {
      // Start OAuth flow
      const redirectUrl = `${window.location.origin}/linkedin-callback`;
      
      const { data, error } = await supabase.functions.invoke('linkedin-oauth', {
        body: { 
          action: 'getAuthUrl',
          redirectUrl: redirectUrl,
          scopes: ['openid', 'profile', 'email', 'w_ads_reporting', 'rw_ads']
        }
      });

      if (error) throw error;

      if (data?.authUrl) {
        // Redirect to LinkedIn OAuth
        window.location.href = data.authUrl;
      }
    } catch (error) {
      console.error('Error starting LinkedIn OAuth:', error);
      toast({
        title: "Error",
        description: "Failed to start LinkedIn connection",
        variant: "destructive"
      });
    }
  };

  const disconnectFromLinkedIn = async () => {
    try {
      // Delete tokens from database - using any for now since table doesn't exist in types
      const { error } = await (supabase as any)
        .from('linkedin_user_tokens')
        .delete()
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id);

      if (error) throw error;

      setConnectionStatus({ connected: false });
      setLeads([]);

      toast({
        title: "Success",
        description: "Disconnected from LinkedIn successfully"
      });
    } catch (error) {
      console.error('Error disconnecting from LinkedIn:', error);
      toast({
        title: "Error",
        description: "Failed to disconnect from LinkedIn",
        variant: "destructive"
      });
    }
  };

  const refreshConnection = async () => {
    try {
      setIsLoading(true);

      const { data, error } = await supabase.functions.invoke('linkedin-lead-sync', {
        body: { action: 'refreshToken' }
      });

      if (error) throw error;

      await checkConnectionStatus();

      toast({
        title: "Success",
        description: "LinkedIn connection refreshed successfully"
      });
    } catch (error) {
      console.error('Error refreshing connection:', error);
      toast({
        title: "Error",
        description: "Failed to refresh LinkedIn connection",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Lead management functions
  const fetchLeads = async () => {
    try {
      // Using any for now since table doesn't exist in types
      const { data, error } = await (supabase as any)
        .from('linkedin_leads')
        .select('*')
        .order('submitted_at', { ascending: false });

      if (error) throw error;
      setLeads(data || []);
    } catch (error) {
      console.error('Error fetching leads:', error);
    }
  };

  const syncLeads = async () => {
    if (!connectionStatus.connected) {
      toast({
        title: "Error",
        description: "Please connect to LinkedIn first",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsSyncing(true);
      setSyncProgress(10);

      const { data, error } = await supabase.functions.invoke('linkedin-lead-sync', {
        body: { action: 'syncLeads' }
      });

      setSyncProgress(50);

      if (error) throw error;

      setSyncProgress(80);

      // Refresh leads data
      await fetchLeads();

      setSyncProgress(100);

      toast({
        title: "Success",
        description: `Synced ${data?.leadsCount || 0} leads from LinkedIn`
      });
    } catch (error) {
      console.error('Error syncing leads:', error);
      toast({
        title: "Error",
        description: "Failed to sync leads from LinkedIn",
        variant: "destructive"
      });
    } finally {
      setIsSyncing(false);
      setSyncProgress(0);
    }
  };

  const exportLeads = async () => {
    try {
      const csvContent = [
        ['Name', 'Email', 'Phone', 'Company', 'Job Title', 'Form', 'Campaign', 'Submitted Date'].join(','),
        ...leads.map(lead => [
          `"${lead.first_name || ''} ${lead.last_name || ''}"`,
          `"${lead.email || ''}"`,
          `"${lead.phone || ''}"`,
          `"${lead.company || ''}"`,
          `"${lead.job_title || ''}"`,
          `"${lead.form_name || ''}"`,
          `"${lead.linkedin_campaign_id || ''}"`,
          `"${lead.submitted_at ? new Date(lead.submitted_at).toLocaleDateString() : ''}"`
        ].join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `linkedin-leads-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "Leads exported successfully"
      });
    } catch (error) {
      console.error('Error exporting leads:', error);
      toast({
        title: "Error",
        description: "Failed to export leads",
        variant: "destructive"
      });
    }
  };

  // Settings functions
  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('integration_settings')
        .select('*')
        .eq('integration_type', 'linkedin')
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setAutoSync(data.is_enabled || false);
        setSyncFrequency(data.sync_frequency_hours || 24);
        setWebhookUrl((data.settings as any)?.webhook_url || '');
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const saveSettings = async () => {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('User not authenticated');

      const settingsData = {
        user_id: user.id,
        integration_type: 'linkedin',
        is_enabled: autoSync,
        sync_frequency_hours: syncFrequency,
        settings: {
          webhook_url: webhookUrl
        }
      };

      const { error } = await supabase
        .from('integration_settings')
        .upsert(settingsData, {
          onConflict: 'user_id,integration_type'
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Settings saved successfully"
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive"
      });
    }
  };

  // Utility functions
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTokenExpiryStatus = () => {
    if (!connectionStatus.token?.token_expires_at) return 'unknown';
    
    const expiryDate = new Date(connectionStatus.token.token_expires_at);
    const now = new Date();
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry < 0) return 'expired';
    if (daysUntilExpiry < 7) return 'warning';
    return 'good';
  };

  // Filter functions
  const filteredLeads = leads.filter(lead => {
    const matchesSearch = !searchTerm || 
      `${lead.first_name} ${lead.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.company?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCampaign = !selectedCampaign || lead.linkedin_campaign_id === selectedCampaign;
    
    return matchesSearch && matchesCampaign;
  });

  const uniqueCampaigns = [...new Set(leads.map(lead => lead.linkedin_campaign_id).filter(Boolean))];

  // Render loading state
  if (isLoading && !connectionStatus.connected) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading LinkedIn integration...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">LinkedIn Integration</h1>
          <p className="text-muted-foreground">Connect and manage your LinkedIn advertising data</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={checkConnectionStatus} variant="outline" disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Connection Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link className="h-5 w-5" />
            LinkedIn Connection Status
          </CardTitle>
          <CardDescription>
            Manage your LinkedIn integration and authentication
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {connectionStatus.connected ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="font-medium">Connected to LinkedIn</p>
                    {connectionStatus.profile && (
                      <p className="text-sm text-muted-foreground">
                        {connectionStatus.profile.firstName} {connectionStatus.profile.lastName}
                        {connectionStatus.profile.headline && ` • ${connectionStatus.profile.headline}`}
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-red-500" />
                  <div>
                    <p className="font-medium">Not connected to LinkedIn</p>
                    <p className="text-sm text-muted-foreground">
                      Connect your LinkedIn account to access advertising features
                    </p>
                  </div>
                </>
              )}
            </div>
            
            <div className="flex gap-2">
              {connectionStatus.connected ? (
                <>
                  <Button onClick={refreshConnection} variant="outline" size="sm">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                  <Button onClick={disconnectFromLinkedIn} variant="destructive" size="sm">
                    Disconnect
                  </Button>
                </>
              ) : (
                <Button onClick={connectToLinkedIn}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Connect LinkedIn
                </Button>
              )}
            </div>
          </div>

          {/* Token Status */}
          {connectionStatus.connected && connectionStatus.token && (
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="font-medium">Token Status</p>
                  <div className="flex items-center gap-2 mt-1">
                    {getTokenExpiryStatus() === 'good' && <Badge variant="default">Valid</Badge>}
                    {getTokenExpiryStatus() === 'warning' && <Badge variant="destructive">Expires Soon</Badge>}
                    {getTokenExpiryStatus() === 'expired' && <Badge variant="destructive">Expired</Badge>}
                  </div>
                </div>
                <div>
                  <p className="font-medium">Expires</p>
                  <p className="text-muted-foreground mt-1">
                    {connectionStatus.token.token_expires_at 
                      ? formatDate(connectionStatus.token.token_expires_at)
                      : 'Never'
                    }
                  </p>
                </div>
                <div>
                  <p className="font-medium">Scopes</p>
                  <p className="text-muted-foreground mt-1">
                    {connectionStatus.scopes?.join(', ') || 'No scopes'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Connection Error */}
          {connectionStatus.error && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {connectionStatus.error}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs defaultValue="leads" className="space-y-4">
        <TabsList>
          <TabsTrigger value="leads">Lead Management</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Leads Tab */}
        <TabsContent value="leads" className="space-y-4">
          {/* Sync Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Lead Synchronization
              </CardTitle>
              <CardDescription>
                Sync leads from your LinkedIn advertising campaigns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Button 
                    onClick={syncLeads} 
                    disabled={!connectionStatus.connected || isSyncing}
                  >
                    {isSyncing ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4 mr-2" />
                    )}
                    {isSyncing ? 'Syncing...' : 'Sync Leads'}
                  </Button>
                  
                  <Button 
                    onClick={exportLeads} 
                    variant="outline"
                    disabled={leads.length === 0}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                </div>
                
                <div className="text-sm text-muted-foreground">
                  {leads.length} leads total
                </div>
              </div>

              {/* Sync Progress */}
              {isSyncing && (
                <div className="mt-4">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span>Syncing leads...</span>
                    <span>{syncProgress}%</span>
                  </div>
                  <Progress value={syncProgress} />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Leads Table */}
          <Card>
            <CardHeader>
              <CardTitle>LinkedIn Leads</CardTitle>
              <CardDescription>
                Leads captured from your LinkedIn advertising campaigns
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="flex gap-4 mb-4">
                <div className="flex-1">
                  <Input
                    placeholder="Search leads..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="w-48">
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    value={selectedCampaign}
                    onChange={(e) => setSelectedCampaign(e.target.value)}
                  >
                    <option value="">All campaigns</option>
                    {uniqueCampaigns.map(campaign => (
                      <option key={campaign} value={campaign}>
                        {campaign}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Leads Table */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Job Title</TableHead>
                    <TableHead>Form</TableHead>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Submitted</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLeads.map((lead) => (
                    <TableRow key={lead.id}>
                      <TableCell className="font-medium">
                        {lead.first_name} {lead.last_name}
                      </TableCell>
                      <TableCell>{lead.email || 'N/A'}</TableCell>
                      <TableCell>{lead.company || 'N/A'}</TableCell>
                      <TableCell>{lead.job_title || 'N/A'}</TableCell>
                      <TableCell>{lead.form_name || 'N/A'}</TableCell>
                      <TableCell>{lead.linkedin_campaign_id || 'N/A'}</TableCell>
                      <TableCell>
                        {lead.submitted_at ? formatDate(lead.submitted_at) : 'N/A'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {filteredLeads.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  {leads.length === 0 
                    ? "No leads found. Sync from LinkedIn to get started."
                    : "No leads match your search criteria."
                  }
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Integration Settings
              </CardTitle>
              <CardDescription>
                Configure your LinkedIn integration preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Auto Sync Settings */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="auto-sync">Automatic Lead Sync</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically sync leads from LinkedIn at regular intervals
                    </p>
                  </div>
                  <Switch
                    id="auto-sync"
                    checked={autoSync}
                    onCheckedChange={setAutoSync}
                  />
                </div>

                {autoSync && (
                  <div>
                    <Label htmlFor="sync-frequency">Sync Frequency (hours)</Label>
                    <Input
                      id="sync-frequency"
                      type="number"
                      min="1"
                      max="168"
                      value={syncFrequency}
                      onChange={(e) => setSyncFrequency(parseInt(e.target.value))}
                      className="mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      How often to automatically sync leads (1-168 hours)
                    </p>
                  </div>
                )}
              </div>

              {/* Webhook Settings */}
              <div className="space-y-2">
                <Label htmlFor="webhook-url">Webhook URL (Optional)</Label>
                <Input
                  id="webhook-url"
                  type="url"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://your-app.com/webhook/linkedin"
                />
                <p className="text-xs text-muted-foreground">
                  Receive real-time notifications when new leads are captured
                </p>
              </div>

              {/* Save Button */}
              <Button onClick={saveSettings}>
                Save Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{leads.length}</div>
                <p className="text-xs text-muted-foreground">
                  All time
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">This Month</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {leads.filter(lead => {
                    if (!lead.submitted_at) return false;
                    const leadDate = new Date(lead.submitted_at);
                    const now = new Date();
                    return leadDate.getMonth() === now.getMonth() && 
                           leadDate.getFullYear() === now.getFullYear();
                  }).length}
                </div>
                <p className="text-xs text-muted-foreground">
                  New leads this month
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Campaigns</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{uniqueCampaigns.length}</div>
                <p className="text-xs text-muted-foreground">
                  With captured leads
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Lead Sources */}
          <Card>
            <CardHeader>
              <CardTitle>Lead Sources</CardTitle>
              <CardDescription>
                Breakdown of leads by form and campaign
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Form Name</TableHead>
                    <TableHead>Campaign ID</TableHead>
                    <TableHead>Lead Count</TableHead>
                    <TableHead>Latest Lead</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(
                    leads.reduce((acc, lead) => {
                      const key = `${lead.form_name || 'Unknown'}-${lead.linkedin_campaign_id || 'Unknown'}`;
                      if (!acc[key]) {
                        acc[key] = {
                          formName: lead.form_name || 'Unknown',
                          campaignId: lead.linkedin_campaign_id || 'Unknown',
                          count: 0,
                          latestDate: lead.submitted_at
                        };
                      }
                      acc[key].count++;
                      if (lead.submitted_at && (!acc[key].latestDate || lead.submitted_at > acc[key].latestDate)) {
                        acc[key].latestDate = lead.submitted_at;
                      }
                      return acc;
                    }, {} as any)
                  ).map(([key, stats]: [string, any]) => (
                    <TableRow key={key}>
                      <TableCell>{stats.formName}</TableCell>
                      <TableCell>{stats.campaignId}</TableCell>
                      <TableCell>{stats.count}</TableCell>
                      <TableCell>
                        {stats.latestDate ? formatDate(stats.latestDate) : 'N/A'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LinkedInIntegration;