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

const popularCRMs = [
  {
    name: "HubSpot",
    description: "Comprehensive CRM and marketing platform",
    logo: "🔶",
    status: "available",
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
    fields: [
      { name: "username", label: "Username", type: "text", placeholder: "user@company.com" },
      { name: "password", label: "Password", type: "password", placeholder: "Password" },
      { name: "security_token", label: "Security Token", type: "password", placeholder: "ABC123..." }
    ]
  },
  {
    name: "LinkedIn Sales Navigator",
    description: "Professional networking and sales tool",
    logo: "💼",
    status: "available",
    fields: [
      { name: "access_token", label: "Access Token", type: "password", placeholder: "AQV..." }
    ]
  },
  {
    name: "Apollo",
    description: "Sales intelligence and engagement platform",
    logo: "🚀",
    status: "available",
    fields: [
      { name: "api_key", label: "API Key", type: "password", placeholder: "api_key_..." }
    ]
  },
  {
    name: "Pipedrive",
    description: "Sales-focused CRM software",
    logo: "📊",
    status: "available",
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
    fields: [
      { name: "client_id", label: "Client ID", type: "text", placeholder: "1000.ABC123..." },
      { name: "client_secret", label: "Client Secret", type: "password", placeholder: "abc123..." },
      { name: "refresh_token", label: "Refresh Token", type: "password", placeholder: "1000.abc123..." }
    ]
  }
];

const Integrations = () => {
  const [customWebhook, setCustomWebhook] = useState("");
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
      const { data, error } = await supabase
        .from('integration_settings')
        .select('integration_type, is_enabled')
        .eq('is_enabled', true);
      
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
      const { error } = await supabase
        .from('integration_settings')
        .update({ is_enabled: false })
        .eq('integration_type', crmName.toLowerCase());

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
      // Store integration settings
      const { error } = await supabase
        .from('integration_settings')
        .upsert({
          integration_type: selectedCRM.name.toLowerCase(),
          is_enabled: true,
          settings: connectionForm,
        });

      if (error) throw error;

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
    } catch (error) {
      console.error('Error connecting CRM:', error);
      toast({
        title: "Connection Failed",
        description: "Failed to connect integration. Please check your credentials and try again.",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSaveWebhook = () => {
    if (!customWebhook) {
      toast({
        title: "Error",
        description: "Please enter a webhook URL",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Webhook Saved",
      description: "Your custom webhook has been configured successfully.",
    });
  };

  return (
    <Layout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Integrations</h1>
            <p className="text-muted-foreground mt-2">
              Connect your CRM and sync candidate data seamlessly
            </p>
          </div>
        </div>

        <Tabs defaultValue="crm" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="crm">CRM Integrations</TabsTrigger>
            <TabsTrigger value="custom">Custom Webhooks</TabsTrigger>
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
                      {isConnected ? (
                        <Button 
                          onClick={() => handleDisconnectCRM(crm.name)}
                          className="w-full bg-white/10 text-white border-white/20 hover:bg-white/20"
                          variant="outline"
                        >
                          <Unplug className="h-4 w-4 mr-2" />
                          Disconnect
                        </Button>
                      ) : (
                        <Button 
                          onClick={() => handleConnectCRM(crm)}
                          className="w-full bg-white/10 text-white border-white/20 hover:bg-white/20"
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
                  What you get when you connect your CRM
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
                <CardTitle className="text-white">Custom Webhook Integration</CardTitle>
                <CardDescription className="text-white/80">
                  Connect any CRM or system using webhooks for real-time data sync
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
                  <p className="text-sm text-white/70">
                    We'll send candidate data to this endpoint when changes occur
                  </p>
                </div>
                <Button onClick={handleSaveWebhook}>
                  Save Webhook Configuration
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-primary-blue border-white/20 text-white" style={{ backgroundColor: 'hsl(var(--primary-blue))' }}>
              <CardHeader>
                <CardTitle className="text-white">Webhook Documentation</CardTitle>
                <CardDescription className="text-white/80">
                  Learn how to set up custom integrations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="border rounded p-4 bg-white/5 border-white/20">
                    <h4 className="font-medium mb-2 text-white">Payload Structure</h4>
                    <pre className="text-sm bg-black/20 p-2 rounded border border-white/10 overflow-x-auto text-white/90">
{`{
  "event": "candidate.updated",
  "candidate": {
    "id": "123",
    "name": "John Doe",
    "email": "john@example.com",
    "status": "interviewed",
    "job_id": "456"
  },
  "timestamp": "2024-01-15T10:30:00Z"
}`}
                    </pre>
                  </div>
                  <div className="flex items-center space-x-2">
                    <ExternalLink className="h-4 w-4 text-white/70" />
                    <a href="#" className="text-white hover:text-white/80 hover:underline">
                      View full API documentation
                    </a>
                  </div>
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
                Enter your {selectedCRM?.name} credentials to connect your CRM
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
              >
                Cancel
              </Button>
              <Button 
                onClick={handleFormSubmit}
                disabled={isConnecting}
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