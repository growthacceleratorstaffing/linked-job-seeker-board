import { useState } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Settings, Check, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const popularCRMs = [
  {
    name: "HubSpot",
    description: "Comprehensive CRM and marketing platform",
    logo: "🔶",
    status: "available"
  },
  {
    name: "Salesforce",
    description: "World's leading CRM platform",
    logo: "☁️",
    status: "available"
  },
  {
    name: "LinkedIn Sales Navigator",
    description: "Professional networking and sales tool",
    logo: "💼",
    status: "available"
  },
  {
    name: "Apollo",
    description: "Sales intelligence and engagement platform",
    logo: "🚀",
    status: "available"
  },
  {
    name: "Pipedrive",
    description: "Sales-focused CRM software",
    logo: "📊",
    status: "available"
  },
  {
    name: "Zoho CRM",
    description: "Complete customer relationship management",
    logo: "🏢",
    status: "available"
  }
];

const Integrations = () => {
  const [customWebhook, setCustomWebhook] = useState("");
  const { toast } = useToast();

  const handleConnectCRM = (crmName: string) => {
    toast({
      title: "Integration Setup",
      description: `${crmName} integration will be available soon. Contact support for early access.`,
    });
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
              {popularCRMs.map((crm) => (
                <Card key={crm.name} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{crm.logo}</span>
                        <div>
                          <CardTitle className="text-lg">{crm.name}</CardTitle>
                          <Badge variant="secondary" className="mt-1">
                            {crm.status}
                          </Badge>
                        </div>
                      </div>
                      <Settings className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="mb-4">
                      {crm.description}
                    </CardDescription>
                    <Button 
                      onClick={() => handleConnectCRM(crm.name)}
                      className="w-full"
                      variant="outline"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Connect {crm.name}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Integration Benefits</CardTitle>
                <CardDescription>
                  What you get when you connect your CRM
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-start space-x-3">
                    <Check className="h-5 w-5 text-green-500 mt-0.5" />
                    <div>
                      <h4 className="font-medium">Automatic Sync</h4>
                      <p className="text-sm text-muted-foreground">
                        Candidate data syncs automatically between platforms
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <Check className="h-5 w-5 text-green-500 mt-0.5" />
                    <div>
                      <h4 className="font-medium">Unified Pipeline</h4>
                      <p className="text-sm text-muted-foreground">
                        Manage your entire recruitment pipeline in one place
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <Check className="h-5 w-5 text-green-500 mt-0.5" />
                    <div>
                      <h4 className="font-medium">Real-time Updates</h4>
                      <p className="text-sm text-muted-foreground">
                        Get instant notifications on candidate status changes
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <Check className="h-5 w-5 text-green-500 mt-0.5" />
                    <div>
                      <h4 className="font-medium">Advanced Analytics</h4>
                      <p className="text-sm text-muted-foreground">
                        Track performance across all connected platforms
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="custom" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Custom Webhook Integration</CardTitle>
                <CardDescription>
                  Connect any CRM or system using webhooks for real-time data sync
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="webhook-url">Webhook URL</Label>
                  <Input
                    id="webhook-url"
                    placeholder="https://your-crm.com/webhook/endpoint"
                    value={customWebhook}
                    onChange={(e) => setCustomWebhook(e.target.value)}
                  />
                  <p className="text-sm text-muted-foreground">
                    We'll send candidate data to this endpoint when changes occur
                  </p>
                </div>
                <Button onClick={handleSaveWebhook}>
                  Save Webhook Configuration
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Webhook Documentation</CardTitle>
                <CardDescription>
                  Learn how to set up custom integrations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="border rounded p-4 bg-muted/50">
                    <h4 className="font-medium mb-2">Payload Structure</h4>
                    <pre className="text-sm bg-background p-2 rounded border overflow-x-auto">
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
                    <ExternalLink className="h-4 w-4" />
                    <a href="#" className="text-primary hover:underline">
                      View full API documentation
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Integrations;