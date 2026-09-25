import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Settings, Check, ExternalLink, Unplug } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";

const popularCRMs = [
  {
    name: "HubSpot",
    description: "Comprehensive CRM and marketing platform",
    logo: "🔶",
    status: "available",
    type: "crm",
    fields: [
      { name: "api_key", label: "API Key", type: "password", placeholder: "pat-na1-..." },
      { name: "portal_id", label: "Portal ID", type: "text", placeholder: "12345678" }
    ]
  },
  {
    name: "Salesforce",
    description: "World's leading CRM platform",
    logo: "☁️",
    status: "available",
    type: "crm",
    fields: [
      { name: "username", label: "Username", type: "text", placeholder: "user@company.com" },
      { name: "password", label: "Password", type: "password", placeholder: "Password" },
      { name: "security_token", label: "Security Token", type: "password", placeholder: "ABC123..." }
    ]
  },
  {
    name: "LinkedIn Recruiter",
    description: "Import projects, pipeline candidates, InMails and notes from your Recruiter seat",
    logo: "💼",
    status: "available",
    type: "ats",
    link: "/linkedin",
    fields: [] as { name: string; label: string; type: string; placeholder: string }[]
  },
  {
    name: "Apollo",
    description: "Sales intelligence and engagement platform",
    logo: "🚀",
    status: "available",
    type: "crm",
    fields: [
      { name: "api_key", label: "API Key", type: "password", placeholder: "api_key_..." }
    ]
  },
  {
    name: "Pipedrive",
    description: "Sales-focused CRM software",
    logo: "📊",
    status: "available",
    type: "crm",
    fields: [
      { name: "api_token", label: "API Token", type: "password", placeholder: "abc123..." },
      { name: "company_domain", label: "Company Domain", type: "text", placeholder: "yourcompany" }
    ]
  },
  {
    name: "Zoho CRM",
    description: "Complete customer relationship management",
    logo: "🏢",
    status: "available",
    type: "crm",
    fields: [
      { name: "client_id", label: "Client ID", type: "text", placeholder: "1000.ABC123..." },
      { name: "client_secret", label: "Client Secret", type: "password", placeholder: "abc123..." },
      { name: "refresh_token", label: "Refresh Token", type: "password", placeholder: "1000.abc123..." }
    ]
  },
  {
    name: "JazzHR",
    description: "Modern applicant tracking system for growing companies",
    logo: "🎵",
    status: "available",
    type: "ats",
    fields: [
      { name: "api_key", label: "API Key", type: "password", placeholder: "your_api_key..." },
      { name: "username", label: "Username", type: "text", placeholder: "your_username" }
    ]
  },
  {
    name: "JobAdder",
    description: "Cloud-based recruitment software for teams",
    logo: "➕",
    status: "available",
    type: "ats",
    fields: [
      { name: "client_id", label: "Client ID", type: "text", placeholder: "your_client_id..." },
      { name: "client_secret", label: "Client Secret", type: "password", placeholder: "your_client_secret..." },
      { name: "redirect_uri", label: "Redirect URI", type: "text", placeholder: "https://your-app.com/callback" }
    ]
  },
  {
    name: "Workable",
    description: "All-in-one recruiting software for modern teams",
    logo: "⚡",
    status: "connected",
    type: "ats",
    fields: [
      { name: "subdomain", label: "Subdomain", type: "text", placeholder: "yourcompany" },
      { name: "api_token", label: "API Token", type: "password", placeholder: "your_api_token..." }
    ]
  },
  // CRM systems
  { name: "Microsoft Dynamics 365", description: "Microsoft's CRM for sales and customer service", logo: "🪟", status: "available", type: "crm",
    fields: [{ name: "instance_url", label: "Instance URL", type: "text", placeholder: "https://yourorg.crm4.dynamics.com" }, { name: "client_id", label: "Client ID", type: "text", placeholder: "..." }, { name: "client_secret", label: "Client Secret", type: "password", placeholder: "..." }] },
  { name: "Monday CRM", description: "Flexible CRM built on monday.com work boards", logo: "📅", status: "available", type: "crm",
    fields: [{ name: "api_token", label: "API Token", type: "password", placeholder: "eyJhbGciOi..." }] },
  { name: "Freshsales", description: "Freshworks CRM with built-in phone and email", logo: "🍃", status: "available", type: "crm",
    fields: [{ name: "domain", label: "Domain", type: "text", placeholder: "yourcompany.myfreshworks.com" }, { name: "api_key", label: "API Key", type: "password", placeholder: "..." }] },
  { name: "Copper", description: "CRM designed for Google Workspace", logo: "🟠", status: "available", type: "crm",
    fields: [{ name: "api_key", label: "API Key", type: "password", placeholder: "..." }, { name: "email", label: "User Email", type: "text", placeholder: "you@company.com" }] },
  { name: "Close", description: "Sales CRM with calling and email sequences", logo: "📞", status: "available", type: "crm",
    fields: [{ name: "api_key", label: "API Key", type: "password", placeholder: "api_..." }] },
  { name: "Teamleader", description: "Popular Benelux CRM, invoicing and projects", logo: "🇧🇪", status: "available", type: "crm",
    fields: [{ name: "client_id", label: "Client ID", type: "text", placeholder: "..." }, { name: "client_secret", label: "Client Secret", type: "password", placeholder: "..." }] },
  // ATS systems
  { name: "Greenhouse", description: "Structured hiring ATS for growing companies", logo: "🌱", status: "available", type: "ats",
    fields: [{ name: "api_key", label: "Harvest API Key", type: "password", placeholder: "..." }] },
  { name: "Lever", description: "ATS and CRM combined for talent teams", logo: "🎚️", status: "available", type: "ats",
    fields: [{ name: "api_key", label: "API Key", type: "password", placeholder: "..." }] },
  { name: "Recruitee", description: "Collaborative hiring software (Tellent)", logo: "🧲", status: "available", type: "ats",
    fields: [{ name: "company_id", label: "Company ID", type: "text", placeholder: "12345" }, { name: "api_token", label: "API Token", type: "password", placeholder: "..." }] },
  { name: "Teamtailor", description: "Employer branding and ATS in one", logo: "🧵", status: "available", type: "ats",
    fields: [{ name: "api_key", label: "API Key", type: "password", placeholder: "..." }] },
  { name: "SmartRecruiters", description: "Enterprise talent acquisition suite", logo: "🧠", status: "available", type: "ats",
    fields: [{ name: "api_key", label: "API Key", type: "password", placeholder: "..." }] },
  { name: "Bullhorn", description: "Leading ATS and CRM for staffing agencies", logo: "🐂", status: "available", type: "ats",
    fields: [{ name: "client_id", label: "Client ID", type: "text", placeholder: "..." }, { name: "client_secret", label: "Client Secret", type: "password", placeholder: "..." }, { name: "username", label: "API Username", type: "text", placeholder: "..." }, { name: "password", label: "API Password", type: "password", placeholder: "..." }] },
  { name: "Personio", description: "HR and recruiting platform for European SMBs", logo: "👥", status: "available", type: "ats",
    fields: [{ name: "client_id", label: "Client ID", type: "text", placeholder: "..." }, { name: "client_secret", label: "Client Secret", type: "password", placeholder: "..." }] },
];

const Integrations = () => {
  const [customWebhook, setCustomWebhook] = useState("");
  const [customApiKey, setCustomApiKey] = useState("");

  useEffect(() => {
    supabase.from('integration_settings').select('settings').eq('integration_type', 'custom').maybeSingle()
      .then(({ data }) => {
        const s = (data?.settings || {}) as Record<string, string>;
        if (s.webhook_url) setCustomWebhook(s.webhook_url);
        if (s.api_key) setCustomApiKey(s.api_key);
      });
  }, []);
  const [selectedCRM, setSelectedCRM] = useState<typeof popularCRMs[0] | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionForm, setConnectionForm] = useState<Record<string, string>>({});
  const [connectedIntegrations, setConnectedIntegrations] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  useEffect(() => {
    loadConnectedIntegrations();
  }, []);

  const loadConnectedIntegrations = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('integration_settings')
        .select('integration_type, is_enabled')
        .eq('is_enabled', true)
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      const connected = data.reduce((acc, integration) => {
        acc[integration.integration_type] = true;
        return acc;
      }, {} as Record<string, boolean>);
      
      setConnectedIntegrations(connected);
    } catch (error) {
      console.error('Error loading integrations:', error);
    }
  };

  const handleConnectCRM = (crm: typeof popularCRMs[0]) => {
    setSelectedCRM(crm);
    setConnectionForm({});
  };

  const handleDisconnectCRM = async (crmName: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('integration_settings')
        .update({ is_enabled: false })
        .eq('integration_type', crmName.toLowerCase())
        .eq('user_id', user.id);

      if (error) throw error;

      setConnectedIntegrations(prev => ({
        ...prev,
        [crmName.toLowerCase()]: false
      }));

      toast({
        title: "Integration Disconnected",
        description: `${crmName} has been disconnected successfully.`,
      });
    } catch (error) {
      console.error('Error disconnecting CRM:', error);
      toast({
        title: "Error",
        description: "Failed to disconnect integration. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleFormSubmit = async () => {
    if (!selectedCRM) return;

    // Validate required fields
    const missingFields = selectedCRM.fields.filter(field => !connectionForm[field.name]);
    if (missingFields.length > 0) {
      toast({
        title: "Missing Information",
        description: `Please fill in: ${missingFields.map(f => f.label).join(', ')}`,
        variant: "destructive",
      });
      return;
    }

    setIsConnecting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please log in to connect integrations.",
          variant: "destructive",
        });
        return;
      }

      const integrationType = selectedCRM.name.toLowerCase();

      // Store integration settings (one row per user + integration)
      const { error } = await supabase
        .from('integration_settings')
        .upsert({
          integration_type: integrationType,
          is_enabled: true,
          settings: connectionForm,
          user_id: user.id,
        }, { onConflict: 'user_id,integration_type' });

      if (error) throw error;

      // Verify the key actually works where a test is available
      const testFn: Record<string, string> = {
        apollo: 'apollo-integration',
        jazzhr: 'jazzhr-integration',
      };
      if (testFn[integrationType]) {
        const { data: testData, error: testError } = await supabase.functions.invoke(testFn[integrationType], {
          body: { action: 'test_connection' },
        });
        let detail = testData?.error as string | undefined;
        if (testError) {
          try { detail = JSON.parse(await (testError as any).context.text()).error; } catch { detail = testError.message; }
        }
        if (detail) {
          await supabase.from('integration_settings')
            .update({ is_enabled: false })
            .eq('user_id', user.id).eq('integration_type', integrationType);
          throw new Error(detail);
        }
      }

      setConnectedIntegrations(prev => ({
        ...prev,
        [selectedCRM.name.toLowerCase()]: true
      }));

      toast({
        title: "Integration Connected",
        description: `${selectedCRM.name} has been connected successfully!`,
      });

      setSelectedCRM(null);
      setConnectionForm({});
    } catch (error: any) {
      console.error('Error connecting CRM:', error);
      toast({
        title: "Connection Failed",
        description: error?.message || "Failed to connect integration. Please check your credentials and try again.",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSaveWebhook = async () => {
    if (!customWebhook.startsWith("https://")) {
      toast({ title: "Error", description: "Please enter a webhook URL starting with https://", variant: "destructive" });
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from('integration_settings').upsert({
      integration_type: 'custom',
      is_enabled: true,
      settings: { webhook_url: customWebhook, api_key: customApiKey },
      user_id: user.id,
    }, { onConflict: 'user_id,integration_type' });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Custom Integration Saved", description: "Your webhook URL and API key have been saved." });
  };

  return (
    <Layout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Integrations</h1>
            <p className="text-muted-foreground mt-2">
              Connect your CRM and ATS systems to sync candidate data seamlessly
            </p>
          </div>
          <Link to="/data">
            <Button className="bg-pink-600 hover:bg-pink-700 text-white">
              View Integration Data
            </Button>
          </Link>
        </div>

        <Tabs defaultValue="crm" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="crm">CRM/ATS Integrations</TabsTrigger>
            <TabsTrigger value="custom">Custom Integration</TabsTrigger>
          </TabsList>

          <TabsContent value="crm" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {popularCRMs.map((crm) => {
                const isConnected = connectedIntegrations[crm.name.toLowerCase()];
                return (
                  <Card key={crm.name} className="hover:shadow-md transition-shadow bg-primary-blue border-white/20" style={{ backgroundColor: 'hsl(var(--primary-blue))' }}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <span className="text-2xl">{crm.logo}</span>
                          <div>
                            <CardTitle className="text-lg text-white">{crm.name}</CardTitle>
                            <Badge variant={isConnected ? "default" : "secondary"} className="mt-1">
                              {isConnected ? "Connected" : crm.status}
                            </Badge>
                          </div>
                        </div>
                        <Settings className="h-4 w-4 text-white/70" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="mb-4 text-white/80">
                        {crm.description}
                      </CardDescription>
                      {(crm as any).link ? (
                        <Link to={(crm as any).link}>
                          <Button className="w-full bg-pink-900/20 text-pink-200 border-pink-500 hover:bg-pink-700/50" variant="outline">
                            <Plus className="h-4 w-4 mr-2" />
                            Connect {crm.name}
                          </Button>
                        </Link>
                      ) : isConnected ? (
                        <div className="space-y-2">
                        <Link to={`/data?source=${encodeURIComponent(crm.name.toLowerCase())}`}>
                          <Button className="w-full bg-pink-600 hover:bg-pink-700 text-white">
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Open {crm.name} data
                          </Button>
                        </Link>
                        <Button 
                          onClick={() => handleDisconnectCRM(crm.name)}
                          className="w-full bg-pink-900/20 text-pink-200 border-pink-500 hover:bg-pink-700/50"
                          variant="outline"
                        >
                          <Unplug className="h-4 w-4 mr-2" />
                          Disconnect
                        </Button>
                        </div>
                      ) : (
                        <Button 
                          onClick={() => handleConnectCRM(crm)}
                          className="w-full bg-pink-900/20 text-pink-200 border-pink-500 hover:bg-pink-700/50"
                          variant="outline"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Connect {crm.name}
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <Card className="bg-primary-blue border-white/20 text-white" style={{ backgroundColor: 'hsl(var(--primary-blue))' }}>
              <CardHeader>
                <CardTitle className="text-white">Integration Benefits</CardTitle>
                <CardDescription className="text-white/80">
                  What you get when you connect your CRM/ATS systems
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-start space-x-3">
                    <Check className="h-5 w-5 text-green-400 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-white">Automatic Sync</h4>
                      <p className="text-sm text-white/70">
                        Candidate data syncs automatically between platforms
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <Check className="h-5 w-5 text-green-400 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-white">Unified Pipeline</h4>
                      <p className="text-sm text-white/70">
                        Manage your entire recruitment pipeline in one place
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <Check className="h-5 w-5 text-green-400 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-white">Real-time Updates</h4>
                      <p className="text-sm text-white/70">
                        Get instant notifications on candidate status changes
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <Check className="h-5 w-5 text-green-400 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-white">Advanced Analytics</h4>
                      <p className="text-sm text-white/70">
                        Track performance across all connected platforms
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="custom" className="space-y-6">
            <Card className="bg-primary-blue border-white/20 text-white" style={{ backgroundColor: 'hsl(var(--primary-blue))' }}>
              <CardHeader>
                <CardTitle className="text-white">Custom Integration</CardTitle>
                <CardDescription className="text-white/80">
                  Connect any CRM, ATS or internal system with a webhook URL and (optionally) an API key
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="webhook-url" className="text-white">Webhook URL</Label>
                  <Input
                    id="webhook-url"
                    placeholder="https://your-crm.com/webhook/endpoint"
                    value={customWebhook}
                    onChange={(e) => setCustomWebhook(e.target.value)}
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                  />
                  <p className="text-sm text-white/70">We send candidate data to this address whenever something changes.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="custom-api-key" className="text-white">API Key</Label>
                  <Input
                    id="custom-api-key"
                    type="password"
                    placeholder="Your system's API key"
                    value={customApiKey}
                    onChange={(e) => setCustomApiKey(e.target.value)}
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                  />
                  <p className="text-sm text-white/70">Sent with every request so your system knows the data comes from us.</p>
                </div>
                <Button onClick={handleSaveWebhook} className="bg-pink-600 hover:bg-pink-700 text-white">
                  Save Custom Integration
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-primary-blue border-white/20 text-white" style={{ backgroundColor: 'hsl(var(--primary-blue))' }}>
              <CardHeader>
                <CardTitle className="text-white">Webhook Documentation</CardTitle>
                <CardDescription className="text-white/80">Everything your developer needs to receive our data</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 text-sm text-white/85">
                <div>
                  <h4 className="font-medium mb-1 text-white">1. How we send it</h4>
                  <p>An HTTPS <code className="bg-black/30 px-1 rounded">POST</code> request with a JSON body to your Webhook URL.</p>
                </div>
                <div>
                  <h4 className="font-medium mb-1 text-white">2. Headers</h4>
                  <pre className="bg-black/20 p-2 rounded border border-white/10 overflow-x-auto">{`Content-Type: application/json
Authorization: Bearer <your API key>
X-GA-Event: candidate.updated`}</pre>
                </div>
                <div>
                  <h4 className="font-medium mb-1 text-white">3. Events</h4>
                  <ul className="list-disc pl-5 space-y-1">
                    <li><code>candidate.created</code> — a new candidate was added</li>
                    <li><code>candidate.updated</code> — candidate details or status changed</li>
                    <li><code>job.created</code> / <code>job.updated</code> — a vacancy was added or changed</li>
                    <li><code>placement.created</code> — a candidate was placed / onboarded</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-1 text-white">4. Example body</h4>
                  <pre className="bg-black/20 p-2 rounded border border-white/10 overflow-x-auto">{`{
  "event": "candidate.updated",
  "candidate": {
    "id": "123",
    "name": "John Doe",
    "email": "john@example.com",
    "status": "interviewed",
    "job_id": "456"
  },
  "timestamp": "2026-01-15T10:30:00Z"
}`}</pre>
                </div>
                <div>
                  <h4 className="font-medium mb-1 text-white">5. Your response</h4>
                  <p>Reply with any <code>2xx</code> status within 10 seconds. Other responses are retried up to 3 times (after 1, 5 and 30 minutes).</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* CRM Connection Dialog */}
        <Dialog open={!!selectedCRM} onOpenChange={() => setSelectedCRM(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Connect {selectedCRM?.name}</DialogTitle>
              <DialogDescription>
                Enter your {selectedCRM?.name} credentials to connect your {selectedCRM?.type?.toUpperCase() || 'CRM/ATS'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {selectedCRM?.fields.map((field) => (
                <div key={field.name} className="space-y-2">
                  <Label htmlFor={field.name}>{field.label}</Label>
                  <Input
                    id={field.name}
                    type={field.type}
                    placeholder={field.placeholder}
                    value={connectionForm[field.name] || ""}
                    onChange={(e) => setConnectionForm(prev => ({
                      ...prev,
                      [field.name]: e.target.value
                    }))}
                  />
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setSelectedCRM(null)}
                disabled={isConnecting}
                className="border-pink-500 text-pink-200 hover:bg-pink-700/50 bg-pink-900/20"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleFormSubmit}
                disabled={isConnecting}
                className="bg-pink-600 hover:bg-pink-700 text-white"
              >
                {isConnecting ? "Connecting..." : "Connect"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default Integrations;