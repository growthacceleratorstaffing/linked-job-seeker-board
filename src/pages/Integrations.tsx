import { useEffect, useState } from 'react';
import { Check, ExternalLink, Plus, Settings, Unplug } from 'lucide-react';
import { Link } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

type Category = 'ats' | 'recruitment' | 'enrichment';
type Field = { name: string; label: string; type: string; placeholder: string };
type Integration = { name: string; description: string; logo: string; category: Category; fields: Field[]; link?: string };

const field = (name: string, label: string, type = 'password', placeholder = 'Enter credential'): Field => ({ name, label, type, placeholder });

const integrations: Integration[] = [
  { name: 'Workable', description: 'Recruiting software for jobs, candidates and hiring teams.', logo: '⚡', category: 'ats', fields: [field('subdomain', 'Subdomain', 'text', 'yourcompany'), field('api_token', 'API Token')] },
  { name: 'JazzHR', description: 'Applicant tracking for growing recruitment teams.', logo: '🎵', category: 'ats', fields: [field('api_key', 'API Key'), field('username', 'Username', 'text', 'you@company.com')] },
  { name: 'JobAdder', description: 'Recruitment management for agencies and in-house teams.', logo: '➕', category: 'ats', fields: [field('client_id', 'Client ID', 'text'), field('client_secret', 'Client Secret')] },
  { name: 'Greenhouse', description: 'Structured hiring and applicant tracking.', logo: '🌱', category: 'ats', fields: [field('api_key', 'Harvest API Key')] },
  { name: 'Lever', description: 'Talent acquisition and applicant tracking.', logo: '🎚️', category: 'ats', fields: [field('api_key', 'API Key')] },
  { name: 'Recruitee', description: 'Collaborative hiring software from Tellent.', logo: '🧲', category: 'ats', fields: [field('company_id', 'Company ID', 'text'), field('api_token', 'API Token')] },
  { name: 'Teamtailor', description: 'Employer branding and applicant tracking.', logo: '🧵', category: 'ats', fields: [field('api_key', 'API Key')] },
  { name: 'SmartRecruiters', description: 'Enterprise talent acquisition suite.', logo: '🧠', category: 'ats', fields: [field('api_key', 'API Key')] },
  { name: 'Bullhorn', description: 'ATS platform for staffing agencies.', logo: '🐂', category: 'ats', fields: [field('client_id', 'Client ID', 'text'), field('client_secret', 'Client Secret'), field('username', 'API Username', 'text'), field('password', 'API Password')] },
  { name: 'Personio', description: 'HR and recruitment platform for European teams.', logo: '👥', category: 'ats', fields: [field('client_id', 'Client ID', 'text'), field('client_secret', 'Client Secret')] },
  { name: 'Breezy HR', description: 'Visual recruiting pipelines and candidate management.', logo: '🌬️', category: 'ats', fields: [field('api_key', 'API Key')] },
  { name: 'Ashby', description: 'Recruiting operations and applicant tracking.', logo: '◼️', category: 'ats', fields: [field('api_key', 'API Key')] },
  { name: 'LinkedIn Recruiter', description: 'Recruiter projects, candidates, InMails and notes.', logo: '💼', category: 'recruitment', fields: [], link: '/linkedin' },
  { name: 'Apollo', description: 'Contact and company data enrichment with CRM write-back.', logo: '🚀', category: 'enrichment', fields: [field('api_key', 'API Key')] },
  { name: 'Clearbit by HubSpot', description: 'Enrich company and contact records with firmographic data.', logo: '🔶', category: 'enrichment', fields: [field('api_key', 'API Key')] },
  { name: 'Lusha', description: 'Verified business contact and company information.', logo: '🔍', category: 'enrichment', fields: [field('api_key', 'API Key')] },
  { name: 'Cognism', description: 'Compliant B2B contact and intent data.', logo: '🧩', category: 'enrichment', fields: [field('api_key', 'API Key')] },
  { name: 'ZoomInfo', description: 'Company intelligence and professional contact data.', logo: '🔎', category: 'enrichment', fields: [field('api_key', 'API Key')] },
  { name: 'Clay', description: 'Automated enrichment workflows across multiple data sources.', logo: '🟤', category: 'enrichment', fields: [field('api_key', 'API Key')] },
];

const Integrations = () => {
  const [selected, setSelected] = useState<Integration | null>(null);
  const [connectionForm, setConnectionForm] = useState<Record<string, string>>({});
  const [connected, setConnected] = useState<Record<string, boolean>>({});
  const [connecting, setConnecting] = useState(false);
  const [customWebhook, setCustomWebhook] = useState('');
  const [customApiKey, setCustomApiKey] = useState('');
  const { toast } = useToast();

  const keyFor = (name: string) => name.toLowerCase();

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const [{ data, error }, { data: linkedInToken }] = await Promise.all([
        supabase.from('integration_settings').select('integration_type,is_enabled,settings').eq('user_id', user.id),
        supabase.from('linkedin_user_tokens').select('id').eq('user_id', user.id).maybeSingle(),
      ]);
      if (error) return;
      const connectionState = Object.fromEntries((data || []).filter((row) => row.is_enabled).map((row) => [row.integration_type, true]));
      if (linkedInToken) connectionState['linkedin recruiter'] = true;
      setConnected(connectionState);
      const custom = (data || []).find((row) => row.integration_type === 'custom');
      const settings = (custom?.settings || {}) as Record<string, string>;
      setCustomWebhook(settings.webhook_url || '');
      setCustomApiKey(settings.api_key || '');
    });
  }, []);

  const connect = async () => {
    if (!selected) return;
    const missing = selected.fields.filter((item) => !connectionForm[item.name]);
    if (missing.length) return toast({ title: 'Missing information', description: `Enter ${missing.map((item) => item.label).join(', ')}.`, variant: 'destructive' });
    setConnecting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Please sign in again.');
      const integrationType = keyFor(selected.name);
      const { error } = await supabase.from('integration_settings').upsert({ user_id: user.id, integration_type: integrationType, is_enabled: true, settings: { ...connectionForm, category: selected.category } }, { onConflict: 'user_id,integration_type' });
      if (error) throw error;
      const testFunction: Record<string, string> = { apollo: 'apollo-integration', jazzhr: 'jazzhr-integration' };
      if (testFunction[integrationType]) {
        const { data, error: testError } = await supabase.functions.invoke(testFunction[integrationType], { body: { action: 'test_connection' } });
        if (testError || data?.error) {
          await supabase.from('integration_settings').update({ is_enabled: false }).eq('user_id', user.id).eq('integration_type', integrationType);
          throw new Error(data?.error || testError?.message);
        }
      }
      setConnected((current) => ({ ...current, [integrationType]: true }));
      toast({ title: `${selected.name} connected` });
      setSelected(null);
      setConnectionForm({});
    } catch (error) {
      toast({ title: 'Connection failed', description: error instanceof Error ? error.message : 'Check the credentials and try again.', variant: 'destructive' });
    } finally {
      setConnecting(false);
    }
  };

  const disconnect = async (name: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const key = keyFor(name);
    const { error } = await supabase.from('integration_settings').update({ is_enabled: false }).eq('user_id', user.id).eq('integration_type', key);
    if (error) return toast({ title: 'Could not disconnect', description: error.message, variant: 'destructive' });
    setConnected((current) => ({ ...current, [key]: false }));
  };

  const saveCustom = async () => {
    if (!customWebhook.startsWith('https://')) return toast({ title: 'Invalid webhook', description: 'Enter an HTTPS webhook URL.', variant: 'destructive' });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from('integration_settings').upsert({ user_id: user.id, integration_type: 'custom', is_enabled: true, settings: { webhook_url: customWebhook, api_key: customApiKey } }, { onConflict: 'user_id,integration_type' });
    toast(error ? { title: 'Could not save', description: error.message, variant: 'destructive' } : { title: 'Custom integration saved' });
  };

  const cards = (category: Category) => (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {integrations.filter((item) => item.category === category).map((item) => {
        const isConnected = connected[keyFor(item.name)];
        return (
          <Card key={item.name} className="border-primary-foreground/20 bg-primary-blue text-primary-foreground">
            <CardHeader>
              <div className="flex items-start justify-between"><span className="text-3xl">{item.logo}</span><Badge variant={isConnected ? 'default' : 'secondary'}>{isConnected ? 'Connected' : 'Available'}</Badge></div>
              <CardTitle>{item.name}</CardTitle>
              <CardDescription className="text-primary-foreground/70">{item.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {item.link ? (
                <Link to={item.link}><Button className="w-full bg-secondary-pink text-primary-foreground hover:bg-secondary-pink/90"><ExternalLink className="mr-2 h-4 w-4" />{isConnected ? 'Open LinkedIn Recruiter' : 'Connect LinkedIn Recruiter'}</Button></Link>
              ) : isConnected ? (
                <><Link to={`/data?source=${encodeURIComponent(keyFor(item.name))}`}><Button className="w-full bg-secondary-pink text-primary-foreground hover:bg-secondary-pink/90"><ExternalLink className="mr-2 h-4 w-4" />Open data</Button></Link><Button variant="outline" className="w-full border-secondary-pink text-secondary-pink" onClick={() => disconnect(item.name)}><Unplug className="mr-2 h-4 w-4" />Disconnect</Button></>
              ) : (
                <Button variant="outline" className="w-full border-secondary-pink text-secondary-pink" onClick={() => { setSelected(item); setConnectionForm({}); }}><Plus className="mr-2 h-4 w-4" />Connect</Button>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );

  return (
    <Layout>
      <div className="container mx-auto space-y-6 p-6">
        <div className="flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-3xl font-bold">Integrations</h1><p className="mt-2 text-primary-foreground/70">Connect recruitment and enrichment systems.</p></div><Link to="/data"><Button className="bg-secondary-pink text-primary-foreground hover:bg-secondary-pink/90">View integration data</Button></Link></div>
        <Tabs defaultValue="ats">
          <TabsList className="grid h-auto w-full grid-cols-2 bg-transparent p-0 md:grid-cols-4">
            {['ats', 'recruitment', 'enrichment', 'custom'].map((tab, index) => <TabsTrigger key={tab} value={tab} className={`rounded-none border-b-2 border-primary-foreground/20 py-3 capitalize data-[state=active]:border-secondary-pink data-[state=active]:text-secondary-pink ${index > 0 ? 'border-l border-l-secondary-pink' : ''}`}>{tab === 'enrichment' ? 'Data Enrichment' : tab === 'ats' ? 'ATS' : tab === 'custom' ? 'Custom Integration' : 'Recruitment'}</TabsTrigger>)}
          </TabsList>
          <TabsContent value="ats" className="mt-6">{cards('ats')}</TabsContent>
          <TabsContent value="recruitment" className="mt-6">{cards('recruitment')}</TabsContent>
          <TabsContent value="enrichment" className="mt-6 space-y-5"><div className="flex items-start gap-3 text-sm text-primary-foreground/70"><Check className="mt-0.5 h-4 w-4 text-secondary-pink" /><p>Enrichment updates can write verified contact details back to Growth Accelerator records. Apollo write-back is active; other providers require their live API connection before data is changed.</p></div>{cards('enrichment')}</TabsContent>
          <TabsContent value="custom" className="mt-6"><Card className="border-primary-foreground/20 bg-primary-blue text-primary-foreground"><CardHeader><CardTitle>Custom Integration</CardTitle><CardDescription className="text-primary-foreground/70">Send staffing events to your own HTTPS endpoint.</CardDescription></CardHeader><CardContent className="space-y-4"><div className="space-y-2"><Label htmlFor="webhook">Webhook URL</Label><Input id="webhook" value={customWebhook} onChange={(event) => setCustomWebhook(event.target.value)} placeholder="https://your-system.com/webhook" /></div><div className="space-y-2"><Label htmlFor="custom-key">API Key</Label><Input id="custom-key" type="password" value={customApiKey} onChange={(event) => setCustomApiKey(event.target.value)} /></div><Button onClick={saveCustom} className="bg-secondary-pink text-primary-foreground hover:bg-secondary-pink/90">Save Custom Integration</Button></CardContent></Card></TabsContent>
        </Tabs>
      </div>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent><DialogHeader><DialogTitle>Connect {selected?.name}</DialogTitle><DialogDescription>Enter the credentials supplied by {selected?.name}.</DialogDescription></DialogHeader><div className="space-y-4">{selected?.fields.map((item) => <div key={item.name} className="space-y-2"><Label htmlFor={item.name}>{item.label}</Label><Input id={item.name} type={item.type} placeholder={item.placeholder} value={connectionForm[item.name] || ''} onChange={(event) => setConnectionForm((current) => ({ ...current, [item.name]: event.target.value }))} /></div>)}</div><DialogFooter><Button variant="outline" onClick={() => setSelected(null)}>Cancel</Button><Button onClick={connect} disabled={connecting} className="bg-secondary-pink text-primary-foreground hover:bg-secondary-pink/90"><Settings className="mr-2 h-4 w-4" />{connecting ? 'Connecting…' : 'Connect'}</Button></DialogFooter></DialogContent>
      </Dialog>
    </Layout>
  );
};

export default Integrations;