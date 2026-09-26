import { useEffect, useState } from 'react';
import { ExternalLink, Loader2 } from 'lucide-react';
import PortalLayout from '@/components/PortalLayout';
import { useEmployee } from '@/hooks/useEmployee';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';

type Provider = { name: string; url: string };

const PortalHome = () => {
  const { employee } = useEmployee();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [sync, setSync] = useState<{ provider: string; status: string; message?: string }[]>([]);
  useEffect(() => { supabase.functions.invoke('employee-backoffice', { body: { action: 'sync' } }).then(({ data }) => { const available = data?.providers || []; setProviders(available); setLoading(false); setSync(data?.sync || []); if (available.length === 1 && !(data?.sync || []).some((s: any) => s.status === 'failed')) window.location.assign(available[0].url); }); }, []);
  return (
    <PortalLayout>
      <div className="py-10 text-center">
        <h1 className="text-4xl font-bold">Welcome to the backoffice{employee ? `, ${employee.full_name.split(' ')[0]}` : ''}!</h1>
        <p className="text-white/70 mt-3">Open the Backoffice connected to your assignment.</p>
      </div>
      {sync.length > 0 && <div className="mb-6 space-y-1 text-center text-sm">{sync.map((s) => <p key={s.provider} className={s.status === 'synced' ? 'text-primary-foreground/80' : 'text-secondary-pink'}>{s.provider}: {s.status === 'synced' ? 'your details were synced automatically' : s.message}</p>)}</div>}
      {loading ? <div className="flex justify-center py-12"><Loader2 className="h-7 w-7 animate-spin text-secondary-pink" /></div> : providers.length ? <div className="grid gap-5 md:grid-cols-2">{providers.map((provider) => <Card key={provider.name} className="border-primary-foreground/20 bg-primary-blue text-primary-foreground"><CardHeader><CardTitle>{provider.name}</CardTitle><CardDescription className="text-primary-foreground/70">Your connected payroll and administration environment.</CardDescription></CardHeader><CardContent><Button asChild className="w-full bg-secondary-pink text-primary-foreground hover:bg-secondary-pink/90"><a href={provider.url}>Open {provider.name}<ExternalLink className="ml-2 h-4 w-4" /></a></Button></CardContent></Card>)}</div> : <Card className="border-primary-foreground/20 bg-primary-blue text-primary-foreground"><CardContent className="py-10 text-center"><p className="font-medium">No Backoffice provider has been connected for your assignment yet.</p><p className="mt-2 text-sm text-primary-foreground/65">Please contact your Growth Accelerator administrator.</p></CardContent></Card>}
    </PortalLayout>
  );
};

export default PortalHome;
