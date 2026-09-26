import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RefreshCw, Download, ArrowLeft, Users, FileText, Calendar } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { Checkbox } from "@/components/ui/checkbox";
import { UserCheck } from "lucide-react";

const Data = () => {
  const [connectedIntegrations, setConnectedIntegrations] = useState<any[]>([]);
  const [integrationData, setIntegrationData] = useState<Record<string, any[]>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<string | undefined>(searchParams.get('source') || undefined);
  const [editing, setEditing] = useState<{ type: string; index: number; row: Record<string, any> } | null>(null);
  const [saving, setSaving] = useState(false);
  const [selectedRows, setSelectedRows] = useState<Record<string, number[]>>({});
  const navigate = useNavigate();

  const toggleRow = (type: string, index: number) => setSelectedRows(prev => {
    const cur = prev[type] || [];
    return { ...prev, [type]: cur.includes(index) ? cur.filter(i => i !== index) : [...cur, index] };
  });

  const matchSelected = async (type: string) => {
    const rows = (selectedRows[type] || []).map(i => integrationData[type]?.[i]).filter(Boolean);
    if (rows.length === 0) {
      toast({ title: "Select a candidate", description: "Tick one or more candidates in the list first." });
      return;
    }
    try {
      const ids: string[] = [];
      for (const r of rows) {
        if (type === 'growth accelerator') { ids.push(r.id); continue; }
        const name = r.name || [r.first_name, r.last_name].filter(Boolean).join(' ') || r.email || 'Unknown';
        const email = String(r.email || '').trim().toLowerCase();
        if (!email) throw new Error(`${name} has no email address and can't be matched.`);
        const { data: existing } = await supabase.from('candidates').select('id').eq('email', email).maybeSingle();
        if (existing) { ids.push(existing.id); continue; }
        const { data: created, error } = await supabase.from('candidates').insert({
          name, email, phone: r.phone || null,
          current_position: r.title || r.job_title || r.current_position || null,
          company: typeof r.company === 'string' ? r.company : (r.organization_name || null),
          location: r.location || null,
          linkedin_profile_url: r.linkedin_url || r.linkedin_profile_url || null,
          source_platform: type,
        } as any).select('id').single();
        if (error) throw error;
        ids.push(created.id);
      }
      navigate(`/matching?candidate=${ids[0]}`);
    } catch (e: any) {
      toast({ title: "Could not prepare match", description: e.message, variant: "destructive" });
    }
  };
  const { toast } = useToast();

  const APOLLO_EDITABLE = ['first_name', 'last_name', 'email', 'title', 'company', 'company_website', 'phone', 'linkedin_url', 'twitter_url'];
  const isFieldEditable = (type: string, key: string) =>
    key !== 'id' && (
      type === 'growth accelerator' ||
      type === 'linkedin recruiter' ||
      (type === 'apollo' && APOLLO_EDITABLE.includes(key))
    );

  const saveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      if (editing.type === 'apollo') {
        const fields: Record<string, string> = {};
        APOLLO_EDITABLE.forEach(k => { if (k in editing.row) fields[k] = String(editing.row[k] ?? ''); });
        const { data: res, error } = await supabase.functions.invoke('apollo-integration', {
          body: { action: 'update_contact', id: editing.row.id, fields },
        });
        if (error || res?.error) throw new Error(res?.error || error?.message);
        const email = String(editing.row.email || '').trim().toLowerCase();
        if (email) {
          const name = [editing.row.first_name, editing.row.last_name].filter(Boolean).join(' ') || email;
          const { error: localError } = await supabase.from('candidates').update({
            name,
            phone: editing.row.phone || null,
            current_position: editing.row.title || null,
            company: editing.row.company || null,
            linkedin_profile_url: editing.row.linkedin_url || null,
          } as any).eq('email', email);
          if (localError) throw localError;
        }
      } else if (editing.type === 'growth accelerator') {
        const { id, created_at, ...fields } = editing.row;
        const { error } = await supabase.from('candidates').update(fields as any).eq('id', id);
        if (error) throw error;
      } else if (editing.type === 'linkedin recruiter') {
        const { id, created_at, ...fields } = editing.row;
        const { error } = await supabase.from('contacts').update(fields as any).eq('id', id);
        if (error) throw error;
      }
      setIntegrationData(prev => {
        const list = [...(prev[editing.type] || [])];
        list[editing.index] = editing.row;
        return { ...prev, [editing.type]: list };
      });
      toast({ title: "Saved", description: editing.type === 'apollo' ? "Contact updated in Apollo and Growth Accelerator." : "Record updated." });
      setEditing(null);
    } catch (e: any) {
      toast({ title: "Could not save", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

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
      
      const external = (data || []).filter(i =>
        !['custom', 'linkedin', 'linkedin recruiter', 'exact online', 'afas', 'deel', 'nmbrs', 'twinfield', 'visma'].includes(i.integration_type)
      );
      const hasLinkedInRecruiter = (data || []).some(i => ['linkedin', 'linkedin recruiter'].includes(i.integration_type));
      const allIntegrations = [
        { integration_type: 'growth accelerator' },
        ...external,
        ...(hasLinkedInRecruiter ? [{ integration_type: 'linkedin recruiter' }] : []),
      ];
      setActiveTab(prev => prev || allIntegrations[0]?.integration_type);
      
      console.log('🔍 Found integrations:', allIntegrations.map(i => i.integration_type));
      setConnectedIntegrations(allIntegrations);
      
      // Load data for each connected integration
      allIntegrations.forEach(integration => {
        console.log(`📊 Loading data for ${integration.integration_type}...`);
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
      
      if (integrationType === 'growth accelerator') {
        const { data: rows, error } = await supabase.from('candidates')
          .select('name,email,phone,current_position,company,location,interview_stage,linkedin_profile_url,source_platform,created_at,id')
          .order('created_at', { ascending: false });
        if (error) toast({ title: "Could not load candidates", description: error.message, variant: "destructive" });
        data = rows || [];
      } else if (integrationType === 'linkedin recruiter') {
        const { data: rows, error } = await supabase.from('contacts')
          .select('name,email,phone,title,company,location,linkedin_url,status,notes,created_at,id')
          .eq('source', 'linkedin_recruiter').order('created_at', { ascending: false });
        if (error) toast({ title: "LinkedIn data problem", description: error.message, variant: "destructive" });
        data = rows || [];
      } else if (integrationType === 'apollo') {
        // Load real Apollo data via edge function
        console.log('🚀 Calling Apollo integration edge function...');
        
        const { data: apolloResult, error } = await supabase.functions.invoke('apollo-integration', {
          body: { action: 'get_contacts' }
        });
        
        console.log('🔍 Apollo function response:', { apolloResult, error });
        
        if (apolloResult?.error) {
          toast({ title: "Apollo connection problem", description: apolloResult.error, variant: "destructive" });
          data = [];
        } else if (apolloResult && !error) {
          data = apolloResult.contacts || [];
          console.log(`✅ Successfully loaded ${data.length} Apollo contacts`);
        } else {
          console.error('❌ Apollo API call failed:', error);
          toast({ title: "Apollo connection problem", description: "Could not load Apollo contacts.", variant: "destructive" });
          data = [];
        }
      } else if (integrationType === 'jazzhr') {
        // Load JazzHR data via edge function
        console.log('🎵 Calling JazzHR integration edge function...');
        
        const { data: jazzhrResult, error } = await supabase.functions.invoke('jazzhr-integration', {
          body: { action: 'get_candidates' }
        });
        
        console.log('🔍 JazzHR function response:', { jazzhrResult, error });
        
        if (jazzhrResult?.error) {
          toast({ title: "JazzHR connection problem", description: jazzhrResult.error, variant: "destructive" });
          data = [];
        } else if (jazzhrResult && !error) {
          data = jazzhrResult.candidates || [];
          console.log(`✅ Successfully loaded ${data.length} JazzHR candidates`);
        } else {
          console.error('❌ JazzHR API call failed:', error);
          toast({ title: "JazzHR connection problem", description: "Could not load JazzHR data.", variant: "destructive" });
          data = [];
        }
      } else if (integrationType === 'jobadder') {
        // Load JobAdder data via edge function
        console.log('➕ Calling JobAdder integration edge function...');
        
        const { data: jobadderResult, error } = await supabase.functions.invoke('jobadder-integration', {
          body: { action: 'get_candidates' }
        });
        
        console.log('🔍 JobAdder function response:', { jobadderResult, error });
        
        if (jobadderResult && !error) {
          data = jobadderResult.candidates || [];
          console.log(`✅ Successfully loaded ${data.length} JobAdder candidates`);
        } else {
          console.error('❌ JobAdder API call failed:', error);
          toast({ title: "JobAdder connection problem", description: "Could not load live JobAdder data.", variant: "destructive" });
          data = [];
        }
      } else if (integrationType === 'workable') {
        // Load Workable data using existing candidates function
        console.log('⚡ Calling Workable candidates function...');
        
        const { data: workableResult, error } = await supabase.functions.invoke('workable-candidates');
        
        console.log('🔍 Workable function response:', { workableResult, error });
        
        if (workableResult && !error) {
          // Transform Workable data to consistent format
          data = (Array.isArray(workableResult) ? workableResult : []).map((candidate: any) => ({
            id: candidate.id,
            name: candidate.name || 'Unknown',
            email: candidate.email || 'No email',
            phone: candidate.phone || 'No phone',
            status: candidate.stage || 'Unknown',
            job_title: candidate.job?.title || 'No job title',
            applied_date: candidate.created_at || null,
            source: 'Workable'
          }));
          console.log(`✅ Successfully loaded ${data.length} Workable candidates`);
        } else {
          console.error('❌ Workable API call failed:', error);
          toast({ title: "Workable connection problem", description: "Could not load live Workable data.", variant: "destructive" });
          data = [];
        }
      } else {
        data = [];
        toast({
          title: `${integrationType} data is not available yet`,
          description: "The connection is saved, but live importing has not been configured for this provider.",
          variant: "destructive",
        });
      }
      
      setIntegrationData(prev => ({
        ...prev,
        [integrationType]: data
      }));
      
      toast({
        title: "Data Loaded",
        description: `${integrationType} data has been loaded successfully (${data.length} records).`,
      });
    } catch (error) {
      console.error('❌ Critical error loading integration data:', error);
      setIntegrationData(prev => ({
        ...prev,
        [integrationType]: []
      }));
      
      toast({
        title: "Error Loading Data",
        description: "Failed to load live data. No sample records were shown.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
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
      case 'linkedin recruiter': return '💼';
      case 'growth accelerator': return '🚀';
      case 'jazzhr': return '🎵';
      case 'jobadder': return '➕';
      case 'workable': return '⚡';
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
            className="mt-4 bg-pink-900/20 hover:bg-pink-700/50 text-pink-200 border-pink-500"
            variant="outline"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Sync Data
          </Button>
        </div>
      );
    }

    const allColumns = Object.keys(data[0]);
    const columns = allColumns.filter(col => col !== 'id').concat(allColumns.filter(col => col === 'id'));

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
              className="bg-pink-900/20 hover:bg-pink-700/50 text-pink-200 border-pink-500"
              variant="outline"
              size="sm"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Sync
            </Button>
            <Button
              onClick={() => matchSelected(integrationType)}
              className="bg-pink-600 hover:bg-pink-700 text-white"
              size="sm"
            >
              <UserCheck className="h-4 w-4 mr-2" />
              Match{(selectedRows[integrationType]?.length ?? 0) > 0 ? ` (${selectedRows[integrationType].length})` : ''}
            </Button>
            <Button 
              onClick={() => exportData(integrationType)}
              className="bg-pink-900/20 hover:bg-pink-700/50 text-pink-200 border-pink-500"
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
                <TableHead className="w-10" />
                {columns.map((column) => (
                  <TableHead key={column} className="text-white font-medium capitalize">
                    {column.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row, index) => (
                <TableRow
                  key={index}
                  className="border-white/20 cursor-pointer hover:bg-white/10"
                  onClick={() => { setEditing({ type: integrationType, index, row: { ...row } }); }}
                >
                  <TableCell
                    className="w-10 cursor-pointer"
                    onClick={(e) => { e.stopPropagation(); toggleRow(integrationType, index); }}
                  >
                    <Checkbox
                      aria-label="Select for matching"
                      className="h-5 w-5 border-2 border-white/80 data-[state=checked]:bg-secondary-pink data-[state=checked]:border-secondary-pink pointer-events-none"
                      checked={(selectedRows[integrationType] || []).includes(index)}
                    />
                  </TableCell>
                  {columns.map((column) => (
                    <TableCell key={column} className="text-white/90 whitespace-nowrap">
                      {String(row[column] ?? '')}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <p className="text-white/60 text-sm">Click a row to edit it. Tick candidates and press Match to match them to a job.</p>
      </div>
    );
  };

  if (connectedIntegrations.length === 0) {
    return (
      <Layout>
        <div className="container mx-auto p-6">
          <div className="flex items-center mb-6">
            <Link to="/integrations">
              <Button variant="ghost" className="text-pink-200 hover:bg-pink-700/50 mr-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Integrations
              </Button>
            </Link>
            <h1 className="text-3xl font-bold text-white">CRM/ATS Data</h1>
          </div>
          
          <Card className="bg-primary-blue border-white/20 text-white text-center py-12" style={{ backgroundColor: 'hsl(var(--primary-blue))' }}>
            <CardContent>
              <Users className="h-16 w-16 text-white/50 mx-auto mb-4" />
              <CardTitle className="text-white mb-2">No Integrations Connected</CardTitle>
              <CardDescription className="text-white/70 mb-6">
                Connect your CRM and ATS integrations like Apollo, HubSpot, Workable, or JazzHR to start viewing and managing your data here.
              </CardDescription>
              <Link to="/integrations">
                <Button className="bg-pink-900/20 hover:bg-pink-700/50 text-pink-200 border-pink-500" variant="outline">
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
              <Button variant="ghost" className="text-pink-200 hover:bg-pink-700/50 mr-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Integrations
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-white">CRM/ATS Data</h1>
              <p className="text-white/70 mt-2">
                View and manage data from your connected CRM and ATS integrations
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-white/70" />
            <span className="text-white/70">Last synced: {new Date().toLocaleDateString()}</span>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full mb-6 h-auto bg-transparent gap-4 p-0" style={{ gridTemplateColumns: `repeat(${connectedIntegrations.length}, minmax(0, 1fr))` }}>
            {connectedIntegrations.map((integration) => (
              <TabsTrigger 
                key={integration.integration_type} 
                value={integration.integration_type}
                className="capitalize h-auto p-4 rounded-lg border border-white/20 bg-white/5 text-white data-[state=active]:bg-pink-900/30 data-[state=active]:border-pink-500 data-[state=active]:text-pink-200 hover:bg-white/10 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <span className="text-3xl">{getIntegrationIcon(integration.integration_type)}</span>
                  <div className="text-left">
                    <div className="font-semibold">{integration.integration_type}</div>
                    <div className="text-xs opacity-70 normal-case">
                      {integrationData[integration.integration_type]?.length ?? 0} records
                    </div>
                  </div>
                </div>
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
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit record</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Object.keys(editing.row).map((key) => {
                const editable = isFieldEditable(editing.type, key);
                return (
                  <div key={key} className="space-y-1">
                    <Label className="capitalize">{key.replace(/_/g, ' ')}{!editable && ' (read-only)'}</Label>
                    <Input
                      value={String(editing.row[key] ?? '')}
                      disabled={!editable}
                      onChange={(e) => setEditing({ ...editing, row: { ...editing.row, [key]: e.target.value } })}
                    />
                  </div>
                );
              })}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={saveEdit} disabled={saving} className="bg-pink-600 hover:bg-pink-700">
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default Data;