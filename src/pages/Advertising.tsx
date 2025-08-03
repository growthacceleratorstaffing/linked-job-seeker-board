// Complete LinkedIn Advertising System for Lovable
// This file contains all the components, types, and API implementation needed

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RefreshCw, Plus, Eye, Play, Pause, Download, BarChart3 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import AppSidebar from "@/components/AppSidebar";

// Types and Interfaces
interface Campaign {
  id: string;
  name: string;
  status: string;
  campaign_type?: string;
  objective_type?: string;
  budget_amount?: number;
  budget_currency?: string;
  start_date?: string;
  end_date?: string;
  impressions?: number;
  clicks?: number;
  spend?: number;
  conversions?: number;
  linkedin_campaign_id: string;
}

interface Creative {
  id: string;
  title: string;
  description?: string;
  status?: string;
  click_uri?: string;
  account_id: string;
  creative_data?: any;
}

interface JobPosting {
  id: string;
  title: string;
  company_name?: string;
  location_name?: string;
  job_description?: string;
}

interface AdAccount {
  id: string;
  name: string;
  type?: string;
  status?: string;
  currency?: string;
  linkedin_account_id: string;
}

// Main Advertising Component
const Advertising: React.FC = () => {
  const { toast } = useToast();
  
  // State management
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [adAccounts, setAdAccounts] = useState<AdAccount[]>([]);
  const [creatives, setCreatives] = useState<Creative[]>([]);
  const [jobPostings, setJobPostings] = useState<JobPosting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLinkedInConnected, setIsLinkedInConnected] = useState(false);
  
  // Creative form state
  const [creativeName, setCreativeName] = useState("");
  const [creativeDescription, setCreativeDescription] = useState("");
  const [creativeUrl, setCreativeUrl] = useState("");
  const [selectedJobForCreative, setSelectedJobForCreative] = useState("");
  const [selectedAccountForCreative, setSelectedAccountForCreative] = useState("");
  
  // Campaign form state
  const [campaignName, setCampaignName] = useState("");
  const [campaignType, setCampaignType] = useState("");
  const [selectedCreative, setSelectedCreative] = useState("");
  const [selectedAccount, setSelectedAccount] = useState("");
  const [selectedCampaignGroup, setSelectedCampaignGroup] = useState("");
  const [budget, setBudget] = useState("");
  const [bidAmount, setBidAmount] = useState("");
  const [costType, setCostType] = useState("CPC");
  const [objective, setObjective] = useState("BRAND_AWARENESS");
  const [endDate, setEndDate] = useState("");
  
  // Search and filter state
  const [searchTerm, setSearchTerm] = useState("");

  // Initialize data on component mount
  useEffect(() => {
    fetchAdvertisingData();
    checkLinkedInConnection();
  }, []);

  // Data fetching functions
  const fetchAdvertisingData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        fetchAdAccounts(),
        fetchCampaigns(),
        fetchCreatives(),
        fetchJobPostings()
      ]);
    } catch (error) {
      console.error('Error fetching advertising data:', error);
      toast({
        title: "Error",
        description: "Failed to load advertising data",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAdAccounts = async () => {
    try {
      console.log('Fetching ad accounts from LinkedIn API...');
      
      // First, call the LinkedIn API to fetch and store accounts
      const { data: accountsData, error: accountsError } = await supabase.functions.invoke('linkedin-advertising-api', {
        body: { action: 'getAdAccounts' }
      });

      console.log('LinkedIn API response:', { accountsData, accountsError });

      if (accountsError) {
        console.error('LinkedIn API error:', accountsError);
        throw accountsError;
      }

      // Then fetch the stored accounts from the database
      const { data: dbAccounts, error: dbError } = await supabase
        .from('linkedin_ad_accounts')
        .select('*')
        .order('created_at', { ascending: false });

      console.log('Database accounts:', { dbAccounts, dbError });

      if (dbError) {
        console.error('Database error:', dbError);
        throw dbError;
      }

      setAdAccounts(dbAccounts || []);
      console.log(`Loaded ${dbAccounts?.length || 0} ad accounts`);
      
      if (dbAccounts && dbAccounts.length > 0) {
        toast({
          title: "Success",
          description: `Loaded ${dbAccounts.length} ad account(s)`,
        });
      }
    } catch (error) {
      console.error('Error fetching ad accounts:', error);
      toast({
        title: "Error",
        description: `Failed to load ad accounts: ${error.message}`,
        variant: "destructive"
      });
    }
  };

  const fetchCampaigns = async () => {
    try {
      const { data, error } = await supabase
        .from('linkedin_campaigns')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCampaigns(data || []);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    }
  };

  const fetchCreatives = async () => {
    try {
      const { data, error } = await supabase
        .from('linkedin_creatives')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCreatives(data || []);
    } catch (error) {
      console.error('Error fetching creatives:', error);
    }
  };

  const fetchJobPostings = async () => {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setJobPostings(data || []);
    } catch (error) {
      console.error('Error fetching job postings:', error);
    }
  };

  const checkLinkedInConnection = async () => {
    try {
      // First test credentials
      const { data: credentialsData, error: credentialsError } = await supabase.functions.invoke('linkedin-advertising-api', {
        body: { action: 'testCredentials' }
      });

      console.log('Credentials test:', { credentialsData, credentialsError });

      if (credentialsError) {
        console.error('Credentials test error:', credentialsError);
        setIsLinkedInConnected(false);
        return;
      }

      // Now test the actual connection
      const { data, error } = await supabase.functions.invoke('linkedin-advertising-api', {
        body: { action: 'testConnection' }
      });

      console.log('Connection test:', { data, error });

      if (error) throw error;
      setIsLinkedInConnected(data?.connected || false);
    } catch (error) {
      console.error('Error checking LinkedIn connection:', error);
      setIsLinkedInConnected(false);
    }
  };

  // Creative management functions
  const handleCreateCreative = async () => {
    if (!creativeName || !selectedAccountForCreative) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsLoading(true);

      const creativeData = selectedJobForCreative 
        ? { 
            name: creativeName,
            description: creativeDescription,
            clickUri: creativeUrl,
            accountId: selectedAccountForCreative,
            jobId: selectedJobForCreative
          }
        : {
            name: creativeName,
            description: creativeDescription,
            clickUri: creativeUrl,
            accountId: selectedAccountForCreative
          };

      const { data, error } = await supabase.functions.invoke('linkedin-advertising-api', {
        body: { 
          action: 'createCreative',
          ...creativeData
        }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Creative created successfully!"
      });

      // Reset form
      setCreativeName("");
      setCreativeDescription("");
      setCreativeUrl("");
      setSelectedJobForCreative("");
      setSelectedAccountForCreative("");

      // Refresh data
      await fetchCreatives();
    } catch (error) {
      console.error('Error creating creative:', error);
      toast({
        title: "Error",
        description: "Failed to create creative",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Campaign management functions
  const handleCreateCampaign = async () => {
    const creativeRequiredTypes = ['SPONSORED_UPDATES', 'TEXT_ADS', 'DYNAMIC_ADS'];
    const isCreativeRequired = creativeRequiredTypes.includes(campaignType);
    
    if (!campaignName || !campaignType || !budget || !selectedAccount || !selectedCampaignGroup) {
      toast({
        title: "Error",
        description: "Please fill in all required fields (Campaign Name, Type, Account, Campaign Group, and Budget)",
        variant: "destructive"
      });
      return;
    }
    
    if (isCreativeRequired && !selectedCreative) {
      toast({
        title: "Error",
        description: `Creative is required for ${campaignType} campaigns. Please select a creative or create one first.`,
        variant: "destructive"
      });
      return;
    }

    try {
      setIsLoading(true);
      
      const selectedAccountData = adAccounts.find(acc => acc.id.toString() === selectedAccount);
      const accountCurrency = selectedAccountData?.currency || 'USD';
      
      const campaignPayload: any = { 
        action: 'createCampaign',
        name: campaignName,
        type: campaignType,
        account: selectedAccount,
        campaignGroup: selectedCampaignGroup,
        budget: parseFloat(budget),
        bidAmount: parseFloat(bidAmount) || 5.00,
        costType,
        objective,
        currency: accountCurrency,
        endDate: endDate || null
      };
      
      if (selectedCreative) {
        campaignPayload.creative = selectedCreative;
      }
      
      const { data, error } = await supabase.functions.invoke('linkedin-advertising-api', {
        body: campaignPayload
      });
      
      if (error) throw error;

      toast({
        title: "Success",
        description: "Campaign created successfully!"
      });

      // Reset form
      setCampaignName("");
      setCampaignType("");
      setSelectedCreative("");
      setSelectedAccount("");
      setSelectedCampaignGroup("");
      setBudget("");
      setBidAmount("");
      setCostType("CPC");
      setObjective("BRAND_AWARENESS");
      setEndDate("");

      // Refresh campaigns
      await fetchCampaigns();
    } catch (error) {
      console.error('Error creating campaign:', error);
      toast({
        title: "Error",
        description: "Failed to create campaign",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCampaignAction = async (campaignId: string, action: 'pause' | 'activate') => {
    try {
      const { data, error } = await supabase.functions.invoke('linkedin-advertising-api', {
        body: { 
          action: 'updateCampaign',
          campaignId,
          updateData: { status: action === 'pause' ? 'PAUSED' : 'ACTIVE' }
        }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Campaign ${action}d successfully!`
      });

      await fetchCampaigns();
    } catch (error) {
      console.error(`Error ${action}ing campaign:`, error);
      toast({
        title: "Error",
        description: `Failed to ${action} campaign`,
        variant: "destructive"
      });
    }
  };

  const handleRefresh = async () => {
    await fetchAdvertisingData();
    toast({
      title: "Refreshed",
      description: "Data refreshed successfully"
    });
  };

  // Utility functions
  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const calculateCTR = (clicks: number, impressions: number) => {
    if (impressions === 0) return '0.00%';
    return ((clicks / impressions) * 100).toFixed(2) + '%';
  };

  const calculateCPC = (spend: number, clicks: number) => {
    if (clicks === 0) return '$0.00';
    return formatCurrency(spend / clicks);
  };

  // Filter functions
  const filteredCampaigns = campaigns.filter(campaign =>
    campaign.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredCreatives = creatives.filter(creative =>
    creative.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Render loading state
  if (isLoading && campaigns.length === 0) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-primary-blue">
          <AppSidebar />
          <main className="flex-1 p-6">
            <div className="container mx-auto">
              <div className="flex items-center gap-4 mb-8">
                <SidebarTrigger className="text-white" />
                <div className="flex items-center justify-center h-64">
                  <RefreshCw className="h-8 w-8 animate-spin text-white" />
                  <span className="ml-2 text-white">Loading advertising data...</span>
                </div>
              </div>
            </div>
          </main>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-primary-blue">
        <AppSidebar />
        <main className="flex-1 p-6">
          <div className="container mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
              <SidebarTrigger className="text-white" />
              <div className="flex justify-between items-center w-full">
                <div>
                  <h1 className="text-3xl font-bold text-white">LinkedIn Advertising</h1>
                  <p className="text-blue-200">Manage your LinkedIn advertising campaigns and creatives</p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleRefresh} variant="outline" disabled={isLoading} className="border-pink-500 text-pink-200 hover:bg-pink-700/50 bg-pink-900/20">
                    <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>
              </div>
            </div>

            {/* LinkedIn Connection Status */}
            {!isLinkedInConnected && (
              <Alert className="bg-blue-900/30 border-blue-700/50">
                <AlertDescription className="text-blue-200">
                  LinkedIn is not connected. Please connect your LinkedIn account to manage advertising campaigns.
                </AlertDescription>
              </Alert>
            )}

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="bg-blue-900/30 border-blue-700/50 backdrop-blur-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-white">Total Campaigns</CardTitle>
                  <BarChart3 className="h-4 w-4 text-blue-300" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">{campaigns.length}</div>
                  <p className="text-xs text-blue-200">
                    {campaigns.filter(c => c.status === 'ACTIVE').length} active
                  </p>
                </CardContent>
              </Card>
              
              <Card className="bg-blue-900/30 border-blue-700/50 backdrop-blur-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-white">Total Spend</CardTitle>
                  <BarChart3 className="h-4 w-4 text-blue-300" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">
                    {formatCurrency(campaigns.reduce((sum, c) => sum + (c.spend || 0), 0))}
                  </div>
                  <p className="text-xs text-blue-200">This month</p>
                </CardContent>
              </Card>
              
              <Card className="bg-blue-900/30 border-blue-700/50 backdrop-blur-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-white">Total Impressions</CardTitle>
                  <BarChart3 className="h-4 w-4 text-blue-300" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">
                    {campaigns.reduce((sum, c) => sum + (c.impressions || 0), 0).toLocaleString()}
                  </div>
                  <p className="text-xs text-blue-200">This month</p>
                </CardContent>
              </Card>
              
              <Card className="bg-blue-900/30 border-blue-700/50 backdrop-blur-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-white">Total Clicks</CardTitle>
                  <BarChart3 className="h-4 w-4 text-blue-300" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">
                    {campaigns.reduce((sum, c) => sum + (c.clicks || 0), 0).toLocaleString()}
                  </div>
                  <p className="text-xs text-blue-200">This month</p>
                </CardContent>
              </Card>
            </div>

            {/* Main Content */}
            <Tabs defaultValue="accounts" className="space-y-4">
              <TabsList className="bg-blue-900/30 border-blue-700/50">
                <TabsTrigger value="accounts" className="text-blue-200 data-[state=active]:bg-blue-700/50 data-[state=active]:text-white">Ad Accounts</TabsTrigger>
                <TabsTrigger value="creatives" className="text-blue-200 data-[state=active]:bg-blue-700/50 data-[state=active]:text-white">Creatives</TabsTrigger>
                <TabsTrigger value="campaigns" className="text-blue-200 data-[state=active]:bg-blue-700/50 data-[state=active]:text-white">Campaigns</TabsTrigger>
              </TabsList>

              {/* Ad Accounts Tab */}
              <TabsContent value="accounts" className="space-y-4">
                <Card className="bg-blue-900/30 border-blue-700/50 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-white">LinkedIn Ad Accounts</CardTitle>
                    <CardDescription className="text-blue-200">
                      Manage your LinkedIn advertising accounts
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow className="border-blue-700/50">
                          <TableHead className="text-blue-200">Name</TableHead>
                          <TableHead className="text-blue-200">Type</TableHead>
                          <TableHead className="text-blue-200">Status</TableHead>
                          <TableHead className="text-blue-200">Currency</TableHead>
                          <TableHead className="text-blue-200">LinkedIn ID</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {adAccounts.map((account) => (
                          <TableRow key={account.id} className="border-blue-700/50">
                            <TableCell className="font-medium text-white">{account.name}</TableCell>
                            <TableCell className="text-blue-200">{account.type || 'N/A'}</TableCell>
                            <TableCell>
                              <Badge className={getStatusColor(account.status || 'unknown')}>
                                {account.status || 'Unknown'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-blue-200">{account.currency}</TableCell>
                            <TableCell className="text-blue-200">{account.linkedin_account_id}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Creatives Tab */}
              <TabsContent value="creatives" className="space-y-4">
                {/* Create Creative Form */}
                <Card className="bg-blue-900/30 border-blue-700/50 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-white">Step 1: Create Advertisement Creative</CardTitle>
                    <CardDescription className="text-blue-200">
                      Create compelling ad creatives for your LinkedIn campaigns
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="creativeName" className="text-white">Creative Name *</Label>
                        <Input
                          id="creativeName"
                          value={creativeName}
                          onChange={(e) => setCreativeName(e.target.value)}
                          placeholder="Enter creative name"
                          className="bg-blue-800/30 border-blue-600/30 text-white placeholder:text-blue-300"
                        />
                      </div>

                      <div>
                        <Label htmlFor="selectedAccountForCreative" className="text-white">Ad Account *</Label>
                        <Select value={selectedAccountForCreative} onValueChange={setSelectedAccountForCreative}>
                          <SelectTrigger className="bg-blue-800/30 border-blue-600/30 text-white">
                            <SelectValue placeholder="Select ad account" />
                          </SelectTrigger>
                          <SelectContent>
                            {adAccounts.map((account) => (
                              <SelectItem key={account.id} value={account.id.toString()}>
                                {account.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="creativeDescription" className="text-white">Description</Label>
                      <Textarea
                        id="creativeDescription"
                        value={creativeDescription}
                        onChange={(e) => setCreativeDescription(e.target.value)}
                        placeholder="Enter creative description"
                        rows={3}
                        className="bg-blue-800/30 border-blue-600/30 text-white placeholder:text-blue-300"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="creativeUrl" className="text-white">Landing Page URL</Label>
                        <Input
                          id="creativeUrl"
                          value={creativeUrl}
                          onChange={(e) => setCreativeUrl(e.target.value)}
                          placeholder="https://example.com"
                          className="bg-blue-800/30 border-blue-600/30 text-white placeholder:text-blue-300"
                        />
                      </div>

                      <div>
                        <Label htmlFor="selectedJobForCreative" className="text-white">Job Posting (Optional)</Label>
                        <Select value={selectedJobForCreative} onValueChange={setSelectedJobForCreative}>
                          <SelectTrigger className="bg-blue-800/30 border-blue-600/30 text-white">
                            <SelectValue placeholder="Select job posting" />
                          </SelectTrigger>
                          <SelectContent>
                            {jobPostings.map((job) => (
                              <SelectItem key={job.id} value={job.id}>
                                {job.title} - {job.company_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <Button onClick={handleCreateCreative} disabled={isLoading} className="bg-blue-600 hover:bg-blue-700 text-white">
                      <Plus className="h-4 w-4 mr-2" />
                      Create Creative
                    </Button>
                  </CardContent>
                </Card>

                {/* Creatives List */}
                <Card className="bg-blue-900/30 border-blue-700/50 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-white">Existing Creatives</CardTitle>
                    <CardDescription className="text-blue-200">
                      Manage your existing advertisement creatives
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-4">
                      <Input
                        placeholder="Search creatives..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="bg-blue-800/30 border-blue-600/30 text-white placeholder:text-blue-300"
                      />
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow className="border-blue-700/50">
                          <TableHead className="text-blue-200">Title</TableHead>
                          <TableHead className="text-blue-200">Description</TableHead>
                          <TableHead className="text-blue-200">Status</TableHead>
                          <TableHead className="text-blue-200">Account</TableHead>
                          <TableHead className="text-blue-200">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredCreatives.map((creative) => (
                          <TableRow key={creative.id} className="border-blue-700/50">
                            <TableCell className="font-medium text-white">{creative.title}</TableCell>
                            <TableCell className="text-blue-200">{creative.description || 'N/A'}</TableCell>
                            <TableCell>
                              <Badge className={getStatusColor(creative.status || 'active')}>
                                {creative.status || 'Active'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-blue-200">{creative.account_id}</TableCell>
                            <TableCell>
                              <Button variant="ghost" size="sm" className="text-blue-200 hover:bg-blue-700/50">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Campaigns Tab */}
              <TabsContent value="campaigns" className="space-y-4">
                {/* Create Campaign Form */}
                <Card className="bg-blue-900/30 border-blue-700/50 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-white">Step 2: Create LinkedIn Campaign</CardTitle>
                    <CardDescription className="text-blue-200">
                      Create and launch your LinkedIn advertising campaigns
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="campaignName" className="text-white">Campaign Name *</Label>
                        <Input
                          id="campaignName"
                          value={campaignName}
                          onChange={(e) => setCampaignName(e.target.value)}
                          placeholder="Enter campaign name"
                          className="bg-blue-800/30 border-blue-600/30 text-white placeholder:text-blue-300"
                        />
                      </div>

                      <div>
                        <Label htmlFor="campaignType" className="text-white">Campaign Type *</Label>
                        <Select value={campaignType} onValueChange={setCampaignType}>
                          <SelectTrigger className="bg-blue-800/30 border-blue-600/30 text-white">
                            <SelectValue placeholder="Select campaign type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="SPONSORED_UPDATES">Sponsored Content</SelectItem>
                            <SelectItem value="TEXT_ADS">Text Ads</SelectItem>
                            <SelectItem value="DYNAMIC_ADS">Dynamic Ads</SelectItem>
                            <SelectItem value="JOB_POSTINGS">Job Postings</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="selectedAccount" className="text-white">Ad Account *</Label>
                        <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                          <SelectTrigger className="bg-blue-800/30 border-blue-600/30 text-white">
                            <SelectValue placeholder="Select ad account" />
                          </SelectTrigger>
                          <SelectContent>
                            {adAccounts.map((account) => (
                              <SelectItem key={account.id} value={account.id.toString()}>
                                {account.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="selectedCampaignGroup" className="text-white">Campaign Group *</Label>
                        <Select value={selectedCampaignGroup} onValueChange={setSelectedCampaignGroup}>
                          <SelectTrigger className="bg-blue-800/30 border-blue-600/30 text-white">
                            <SelectValue placeholder="Select campaign group" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="default">Default Campaign Group</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="selectedCreative" className="text-white">
                          Advertisement Creative {(['SPONSORED_UPDATES', 'TEXT_ADS', 'DYNAMIC_ADS'].includes(campaignType)) ? '*' : '(Optional)'}
                        </Label>
                        <Select value={selectedCreative} onValueChange={setSelectedCreative}>
                          <SelectTrigger className="bg-blue-800/30 border-blue-600/30 text-white">
                            <SelectValue placeholder={
                              (['SPONSORED_UPDATES', 'TEXT_ADS', 'DYNAMIC_ADS'].includes(campaignType)) 
                                ? "Select creative (required for this campaign type)" 
                                : "Select creative (optional for some campaign types)"
                            } />
                          </SelectTrigger>
                          <SelectContent>
                            {creatives.map((creative) => (
                              <SelectItem key={creative.id} value={creative.id}>
                                {creative.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-blue-300 mt-1">
                          {(['SPONSORED_UPDATES', 'TEXT_ADS', 'DYNAMIC_ADS'].includes(campaignType)) 
                            ? "Creative is required for this campaign type. Create one in Step 1 if needed."
                            : "For some campaign types like job postings, creatives are automatically generated"
                          }
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="budget" className="text-white">Budget *</Label>
                        <Input
                          id="budget"
                          type="number"
                          value={budget}
                          onChange={(e) => setBudget(e.target.value)}
                          placeholder="1000"
                          className="bg-blue-800/30 border-blue-600/30 text-white placeholder:text-blue-300"
                        />
                      </div>

                      <div>
                        <Label htmlFor="bidAmount" className="text-white">Bid Amount</Label>
                        <Input
                          id="bidAmount"
                          type="number"
                          step="0.01"
                          value={bidAmount}
                          onChange={(e) => setBidAmount(e.target.value)}
                          placeholder="5.00"
                          className="bg-blue-800/30 border-blue-600/30 text-white placeholder:text-blue-300"
                        />
                      </div>

                      <div>
                        <Label htmlFor="costType" className="text-white">Cost Type</Label>
                        <Select value={costType} onValueChange={setCostType}>
                          <SelectTrigger className="bg-blue-800/30 border-blue-600/30 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="CPC">Cost Per Click</SelectItem>
                            <SelectItem value="CPM">Cost Per Mille</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="objective" className="text-white">Campaign Objective</Label>
                        <Select value={objective} onValueChange={setObjective}>
                          <SelectTrigger className="bg-blue-800/30 border-blue-600/30 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="BRAND_AWARENESS">Brand Awareness</SelectItem>
                            <SelectItem value="WEBSITE_CONVERSIONS">Website Conversions</SelectItem>
                            <SelectItem value="LEAD_GENERATION">Lead Generation</SelectItem>
                            <SelectItem value="WEBSITE_VISITS">Website Visits</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="endDate" className="text-white">End Date (Optional)</Label>
                        <Input
                          id="endDate"
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="bg-blue-800/30 border-blue-600/30 text-white"
                        />
                      </div>
                    </div>

                    <Button onClick={handleCreateCampaign} disabled={isLoading} className="bg-blue-600 hover:bg-blue-700 text-white">
                      <Plus className="h-4 w-4 mr-2" />
                      Create Campaign
                    </Button>
                  </CardContent>
                </Card>

                {/* Campaigns List */}
                <Card className="bg-blue-900/30 border-blue-700/50 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-white">Existing Campaigns</CardTitle>
                    <CardDescription className="text-blue-200">
                      Monitor and manage your LinkedIn advertising campaigns
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-4">
                      <Input
                        placeholder="Search campaigns..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="bg-blue-800/30 border-blue-600/30 text-white placeholder:text-blue-300"
                      />
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow className="border-blue-700/50">
                          <TableHead className="text-blue-200">Name</TableHead>
                          <TableHead className="text-blue-200">Type</TableHead>
                          <TableHead className="text-blue-200">Status</TableHead>
                          <TableHead className="text-blue-200">Budget</TableHead>
                          <TableHead className="text-blue-200">Spend</TableHead>
                          <TableHead className="text-blue-200">Impressions</TableHead>
                          <TableHead className="text-blue-200">Clicks</TableHead>
                          <TableHead className="text-blue-200">CTR</TableHead>
                          <TableHead className="text-blue-200">CPC</TableHead>
                          <TableHead className="text-blue-200">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredCampaigns.map((campaign) => (
                          <TableRow key={campaign.id} className="border-blue-700/50">
                            <TableCell className="font-medium text-white">{campaign.name}</TableCell>
                            <TableCell className="text-blue-200">{campaign.campaign_type || 'N/A'}</TableCell>
                            <TableCell>
                              <Badge className={getStatusColor(campaign.status)}>
                                {campaign.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-blue-200">
                              {formatCurrency(campaign.budget_amount || 0, campaign.budget_currency)}
                            </TableCell>
                            <TableCell className="text-blue-200">{formatCurrency(campaign.spend || 0)}</TableCell>
                            <TableCell className="text-blue-200">{(campaign.impressions || 0).toLocaleString()}</TableCell>
                            <TableCell className="text-blue-200">{(campaign.clicks || 0).toLocaleString()}</TableCell>
                            <TableCell className="text-blue-200">{calculateCTR(campaign.clicks || 0, campaign.impressions || 0)}</TableCell>
                            <TableCell className="text-blue-200">{calculateCPC(campaign.spend || 0, campaign.clicks || 0)}</TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleCampaignAction(campaign.linkedin_campaign_id, 
                                    campaign.status === 'ACTIVE' ? 'pause' : 'activate')}
                                  className="text-blue-200 hover:bg-blue-700/50"
                                >
                                  {campaign.status === 'ACTIVE' ? 
                                    <Pause className="h-4 w-4" /> : 
                                    <Play className="h-4 w-4" />
                                  }
                                </Button>
                                <Button variant="ghost" size="sm" className="text-blue-200 hover:bg-blue-700/50">
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </div>
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
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Advertising;