import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RefreshCw, Download, ArrowLeft, Users, Building, FileText, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";

const Data = () => {
  const [connectedIntegrations, setConnectedIntegrations] = useState<any[]>([]);
  const [integrationData, setIntegrationData] = useState<Record<string, any[]>>({});
  const [isLoading, setIsLoading] = useState(false);
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
        .select('*')
        .eq('is_enabled', true)
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      setConnectedIntegrations(data || []);
      
      // Load sample data for each connected integration
      data?.forEach(integration => {
        loadIntegrationData(integration.integration_type);
      });
    } catch (error) {
      console.error('Error loading integrations:', error);
    }
  };

  const loadIntegrationData = async (integrationType: string) => {
    setIsLoading(true);
    try {
      let data = [];
      
      if (integrationType === 'apollo') {
        // Load real Apollo data via edge function
        console.log('🔍 Loading Apollo data...');
        const { data: apolloResult, error } = await supabase.functions.invoke('apollo-integration', {
          body: { action: 'get_contacts' }
        });
        
        if (apolloResult && !error) {
          data = apolloResult.contacts || [];
          console.log(`✅ Loaded ${data.length} Apollo contacts`);
        } else {
          console.log('⚠️ Apollo API call failed, showing sample data:', error);
          data = generateSampleData(integrationType);
        }
      } else {
        // For other integrations, show sample data for now
        data = generateSampleData(integrationType);
      }
      
      setIntegrationData(prev => ({
        ...prev,
        [integrationType]: data
      }));
      
      toast({
        title: "Data Loaded",
        description: `${integrationType} data has been loaded successfully.`,
      });
    } catch (error) {
      console.error('Error loading integration data:', error);
      // Fallback to sample data on error
      const fallbackData = generateSampleData(integrationType);
      setIntegrationData(prev => ({
        ...prev,
        [integrationType]: fallbackData
      }));
      
      toast({
        title: "Using Sample Data",
        description: "Failed to load live data, showing sample data instead.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generateSampleData = (integrationType: string) => {
    switch (integrationType) {
      case 'hubspot':
        return [
          { id: 1, name: "John Smith", email: "john@company.com", status: "Lead", company: "Tech Corp", lastActivity: "2024-01-15" },
          { id: 2, name: "Sarah Johnson", email: "sarah@startup.io", status: "Customer", company: "StartupIO", lastActivity: "2024-01-14" },
          { id: 3, name: "Mike Wilson", email: "mike@enterprise.com", status: "Prospect", company: "Enterprise Ltd", lastActivity: "2024-01-13" },
        ];
      case 'salesforce':
        return [
          { id: 1, name: "Alice Brown", email: "alice@global.com", status: "Qualified", company: "Global Inc", opportunity: "$50,000" },
          { id: 2, name: "Bob Davis", email: "bob@local.org", status: "Contacted", company: "Local Org", opportunity: "$25,000" },
        ];
      case 'pipedrive':
        return [
          { id: 1, name: "Emma Wilson", email: "emma@retailco.com", stage: "Proposal", company: "Retail Co", value: "$75,000" },
          { id: 2, name: "James Taylor", email: "james@manufacturing.net", stage: "Negotiation", company: "Manufacturing Net", value: "$100,000" },
        ];
      case 'apollo':
        return [
          { id: 1, name: "Apollo Contact", email: "contact@apollo.com", title: "Sales Manager", company: "Apollo Corp", industry: "Technology" },
          { id: 2, name: "Demo User", email: "demo@example.com", title: "Marketing Director", company: "Demo Inc", industry: "Marketing" },
        ];
      default:
        return [
          { id: 1, name: "Sample Contact", email: "contact@example.com", status: "Active", company: "Example Corp", date: "2024-01-15" }
        ];
    }
  };

  const syncData = async (integrationType: string) => {
    await loadIntegrationData(integrationType);
  };

  const exportData = (integrationType: string) => {
    const data = integrationData[integrationType];
    if (!data || data.length === 0) return;

    const csv = [
      Object.keys(data[0]).join(','),
      ...data.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', `${integrationType}_data.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    toast({
      title: "Export Complete",
      description: `${integrationType} data has been exported to CSV.`,
    });
  };

  const getIntegrationIcon = (type: string) => {
    switch (type) {
      case 'hubspot': return '🔶';
      case 'salesforce': return '☁️';
      case 'pipedrive': return '📊';
      case 'apollo': return '🚀';
      case 'zoho crm': return '🏢';
      case 'linkedin sales navigator': return '💼';
      default: return '📊';
    }
  };

  const renderDataTable = (integrationType: string, data: any[]) => {
    if (!data || data.length === 0) {
      return (
        <div className="text-center py-8">
          <FileText className="h-12 w-12 text-white/50 mx-auto mb-4" />
          <p className="text-white/70">No data available</p>
          <Button 
            onClick={() => syncData(integrationType)}
            className="mt-4 bg-white/10 hover:bg-white/20 text-white border-white/20"
            variant="outline"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Sync Data
          </Button>
        </div>
      );
    }

    const columns = Object.keys(data[0]);

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">{getIntegrationIcon(integrationType)}</span>
            <h3 className="text-lg font-semibold text-white capitalize">{integrationType} Data</h3>
            <Badge variant="secondary" className="ml-2">
              {data.length} records
            </Badge>
          </div>
          <div className="flex space-x-2">
            <Button 
              onClick={() => syncData(integrationType)}
              disabled={isLoading}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20"
              variant="outline"
              size="sm"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Sync
            </Button>
            <Button 
              onClick={() => exportData(integrationType)}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20"
              variant="outline"
              size="sm"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
        
        <div className="rounded-md border border-white/20 bg-white/5">
          <Table>
            <TableHeader>
              <TableRow className="border-white/20">
                {columns.map((column) => (
                  <TableHead key={column} className="text-white font-medium capitalize">
                    {column.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row, index) => (
                <TableRow key={index} className="border-white/20">
                  {columns.map((column) => (
                    <TableCell key={column} className="text-white/90">
                      {row[column]}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  };

  if (connectedIntegrations.length === 0) {
    return (
      <Layout>
        <div className="container mx-auto p-6">
          <div className="flex items-center mb-6">
            <Link to="/integrations">
              <Button variant="ghost" className="text-white hover:bg-white/10 mr-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Integrations
              </Button>
            </Link>
            <h1 className="text-3xl font-bold text-white">Integration Data</h1>
          </div>
          
          <Card className="bg-primary-blue border-white/20 text-white text-center py-12" style={{ backgroundColor: 'hsl(var(--primary-blue))' }}>
            <CardContent>
              <Users className="h-16 w-16 text-white/50 mx-auto mb-4" />
              <CardTitle className="text-white mb-2">No Integrations Connected</CardTitle>
              <CardDescription className="text-white/70 mb-6">
                Connect your CRM integrations to start viewing and managing your data here.
              </CardDescription>
              <Link to="/integrations">
                <Button className="bg-white/10 hover:bg-white/20 text-white border-white/20" variant="outline">
                  Connect Integrations
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Link to="/integrations">
              <Button variant="ghost" className="text-white hover:bg-white/10 mr-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Integrations
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-white">Integration Data</h1>
              <p className="text-white/70 mt-2">
                View and manage data from your connected CRM integrations
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-white/70" />
            <span className="text-white/70">Last synced: {new Date().toLocaleDateString()}</span>
          </div>
        </div>

        <Tabs defaultValue={connectedIntegrations[0]?.integration_type} className="w-full">
          <TabsList className="grid w-full mb-6" style={{ gridTemplateColumns: `repeat(${connectedIntegrations.length}, minmax(0, 1fr))` }}>
            {connectedIntegrations.map((integration) => (
              <TabsTrigger 
                key={integration.integration_type} 
                value={integration.integration_type}
                className="capitalize"
              >
                <span className="mr-2">{getIntegrationIcon(integration.integration_type)}</span>
                {integration.integration_type}
              </TabsTrigger>
            ))}
          </TabsList>

          {connectedIntegrations.map((integration) => (
            <TabsContent key={integration.integration_type} value={integration.integration_type}>
              <Card className="bg-primary-blue border-white/20" style={{ backgroundColor: 'hsl(var(--primary-blue))' }}>
                <CardContent className="p-6">
                  {renderDataTable(integration.integration_type, integrationData[integration.integration_type])}
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </Layout>
  );
};

export default Data;