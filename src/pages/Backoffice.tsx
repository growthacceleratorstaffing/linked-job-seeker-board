import { useEffect, useState } from 'react';
import { Building2, Check, ExternalLink, Landmark, Plus, Unplug, WalletCards } from 'lucide-react';
import Layout from '@/components/Layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const financialTools = [
  { name: 'Exact Online', key: 'exact online', description: 'Accounting, invoicing, payroll and project administration.', icon: Landmark, fields: ['Client ID', 'Client Secret', 'Redirect URI'] },
  { name: 'AFAS', key: 'afas', description: 'Finance, payroll and HR administration for Dutch organisations.', icon: Building2, fields: ['Environment ID', 'App Connector Token'] },
  { name: 'Deel', key: 'deel', description: 'Global payroll, contractor management and compliance.', icon: WalletCards, fields: ['API Token'] },
  { name: 'Nmbrs', key: 'nmbrs', description: 'Payroll and HR administration for accountants and employers.', icon: Building2, fields: ['API Token', 'Debtor Number'] },
  { name: 'Twinfield', key: 'twinfield', description: 'Cloud accounting and financial reporting.', icon: Landmark, fields: ['Client ID', 'Client Secret'] },
  { name: 'Visma', key: 'visma', description: 'Finance, payroll and workforce management.', icon: WalletCards, fields: ['Client ID', 'Client Secret', 'Tenant ID'] },
];

const Backoffice = () => {
  const [connected, setConnected] = useState<Record<string, boolean>>({});
  const [selected, setSelected] = useState<(typeof financialTools)[number] | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data } = await supabase.from('integration_settings').select('integration_type,is_enabled').eq('user_id', user.id).eq('is_enabled', true);
      setConnected(Object.fromEntries((data || []).map((row) => [row.integration_type, true])));
    });
  }, []);

  const save = async () => {
    if (!selected || selected.fields.some((field) => !values[field])) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = user ? await supabase.from('integration_settings').upsert({
      user_id: user.id,
      integration_type: selected.key,
      is_enabled: true,
      settings: values,
    }, { onConflict: 'user_id,integration_type' }) : { error: new Error('Please sign in again.') };
    setSaving(false);
    if (error) return toast({ title: 'Connection failed', description: error.message, variant: 'destructive' });
    setConnected((current) => ({ ...current, [selected.key]: true }));
    toast({ title: `${selected.name} connected` });
    setSelected(null);
    setValues({});
  };

  const disconnect = async (key: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from('integration_settings').update({ is_enabled: false }).eq('user_id', user.id).eq('integration_type', key);
    if (error) return toast({ title: 'Could not disconnect', description: error.message, variant: 'destructive' });
    setConnected((current) => ({ ...current, [key]: false }));
  };

  return (
    <Layout>
      <div className="container mx-auto space-y-6 p-6">
        <div>
          <h1 className="text-3xl font-bold text-primary-foreground">Financial software</h1>
          <p className="mt-2 text-primary-foreground/70">Connect payroll, accounting and contractor administration.</p>
        </div>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {financialTools.map((tool) => {
            const Icon = tool.icon;
            const isConnected = connected[tool.key];
            return (
              <Card key={tool.key} className="border-primary-foreground/20 bg-primary-blue text-primary-foreground">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <Icon className="h-8 w-8 text-secondary-pink" />
                    <Badge variant={isConnected ? 'default' : 'secondary'}>{isConnected ? 'Connected' : 'Available'}</Badge>
                  </div>
                  <CardTitle>{tool.name}</CardTitle>
                  <CardDescription className="text-primary-foreground/70">{tool.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  {isConnected ? (
                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1 border-secondary-pink text-secondary-pink"><ExternalLink className="mr-2 h-4 w-4" />Manage</Button>
                      <Button variant="outline" size="icon" onClick={() => disconnect(tool.key)} aria-label={`Disconnect ${tool.name}`}><Unplug className="h-4 w-4" /></Button>
                    </div>
                  ) : (
                    <Button className="w-full bg-secondary-pink text-primary-foreground hover:bg-secondary-pink/90" onClick={() => setSelected(tool)}><Plus className="mr-2 h-4 w-4" />Connect</Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Connect {selected?.name}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {selected?.fields.map((field) => (
              <div key={field} className="space-y-2">
                <Label htmlFor={field}>{field}</Label>
                <Input id={field} type={field.toLowerCase().includes('secret') || field.toLowerCase().includes('token') ? 'password' : 'text'} value={values[field] || ''} onChange={(event) => setValues((current) => ({ ...current, [field]: event.target.value }))} />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)}>Cancel</Button>
            <Button onClick={save} disabled={saving || Boolean(selected?.fields.some((field) => !values[field]))} className="bg-secondary-pink text-primary-foreground hover:bg-secondary-pink/90">
              <Check className="mr-2 h-4 w-4" />{saving ? 'Connecting…' : 'Connect'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default Backoffice;