import React, { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Loader2, Download, Link2, ShieldCheck, Users, FolderKanban, MessageSquare, StickyNote, Briefcase } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const sourceIcons: Record<string, React.ElementType> = {
  contracts: Briefcase, projects: FolderKanban, candidates: Users, inmails: MessageSquare, notes: StickyNote,
};

const LinkedIn: React.FC = () => {
  const { toast } = useToast();
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<Record<string, any> | null>(null);

  const loadStatus = async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke('linkedin-recruiter', { body: { action: 'status' } });
    if (error) toast({ title: 'Could not check LinkedIn', description: error.message, variant: 'destructive' });
    setStatus(data);
    setLoading(false);
    return data;
  };

  const runImport = async () => {
    setImporting(true);
    const { data, error } = await supabase.functions.invoke('linkedin-recruiter', { body: { action: 'import' } });
    setImporting(false);
    if (error) { toast({ title: 'Import failed', description: error.message, variant: 'destructive' }); return; }
    setResults(data.results);
    toast({ title: 'Recruiter import finished', description: `${data.imported} candidates imported — also visible under Data → LinkedIn Recruiter.` });
  };

  useEffect(() => {
    loadStatus().then((d) => { if (d?.connected && d?.recruiterAccess) runImport(); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const connect = () => {
    // Opened in a new tab: LinkedIn refuses to load inside the preview frame (that caused the blank page).
    window.open('https://www.linkedin.com/login-cap', '_blank', 'noopener,noreferrer');
  };

  const connected = !!status?.connected;
  const recruiter = !!status?.recruiterAccess;

  return (
    <Layout>
      <div className="container mx-auto p-6 space-y-6 max-w-5xl">
        <div>
          <h1 className="text-3xl font-bold text-white">LinkedIn Recruiter</h1>
          <p className="text-white/70 mt-2">Connect a LinkedIn Recruiter seat to import your projects, pipeline candidates, InMails and notes. Regular LinkedIn accounts can't sync this data.</p>
        </div>

        <Card className="bg-white/5 border-white/20 text-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Link2 className="h-5 w-5 text-secondary-pink" /> Connection</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="flex items-center gap-2 text-white/70"><Loader2 className="h-4 w-4 animate-spin" /> Checking connection…</div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg border border-white/15 bg-white/5">
                  <div className="flex items-center gap-2 font-medium">
                    {connected ? <CheckCircle className="h-4 w-4 text-green-400" /> : <XCircle className="h-4 w-4 text-red-400" />}
                    LinkedIn account
                  </div>
                  <p className="text-sm text-white/70 mt-1">{connected ? `Signed in as ${status.profile?.name || status.profile?.email}` : 'Not connected'}</p>
                </div>
                <div className="p-4 rounded-lg border border-white/15 bg-white/5">
                  <div className="flex items-center gap-2 font-medium">
                    {recruiter ? <CheckCircle className="h-4 w-4 text-green-400" /> : <XCircle className="h-4 w-4 text-red-400" />}
                    Recruiter access
                  </div>
                  <p className="text-sm text-white/70 mt-1">{recruiter ? 'Recruiter contract found' : 'No Recruiter data access yet'}</p>
                </div>
              </div>
            )}
            <div className="flex flex-wrap gap-3">
              <Button onClick={connect} className="bg-pink-600 hover:bg-pink-700 text-white">{connected ? 'Reconnect LinkedIn Recruiter' : 'Connect LinkedIn Recruiter'}</Button>
              <Button onClick={runImport} disabled={!connected || importing} className="bg-pink-600 hover:bg-pink-700 text-white">
                {importing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />} Import all Recruiter data
              </Button>
            </div>
          </CardContent>
        </Card>

        {connected && !recruiter && !loading && (
          <Card className="bg-white/5 border-yellow-500/40 text-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-yellow-400" /> Turn on Recruiter data access</CardTitle>
              <CardDescription className="text-white/70">LinkedIn only shares Recruiter data after your admin enables Recruiter System Connect for this app.</CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="list-decimal pl-5 space-y-2 text-sm text-white/85">
                <li>Log into LinkedIn Recruiter as a contract admin.</li>
                <li>Open <b>Product settings</b> → <b>Recruiter System Connect</b>.</li>
                <li>Choose <b>Growth Accelerator</b> (your LinkedIn app) as your ATS partner and turn it on.</li>
                <li>Come back here and click <b>Import all Recruiter data</b>.</li>
              </ol>
              {status?.recruiterMessage && <p className="text-xs text-white/50 mt-4 break-all">{status.recruiterMessage}</p>}
            </CardContent>
          </Card>
        )}

        {results && (
          <Card className="bg-white/5 border-white/20 text-white">
            <CardHeader><CardTitle>Last import</CardTitle></CardHeader>
            <CardContent className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Object.entries(results).map(([key, r]) => {
                const Icon = sourceIcons[key] || Users;
                return (
                  <div key={key} className="p-4 rounded-lg border border-white/15 bg-white/5">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 font-medium"><Icon className="h-4 w-4 text-secondary-pink" />{r.label}</span>
                      <Badge variant={r.ok ? 'default' : 'secondary'}>{r.ok ? r.count : 'No access'}</Badge>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default LinkedIn;
