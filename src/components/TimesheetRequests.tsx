import { useEffect, useState } from 'react';
import { Download, FileUp, Send } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const db = supabase as any;
const iso = (d: Date) => d.toISOString().slice(0, 10);

export const openInvoice = async (path: string) => {
  const { data } = await supabase.storage.from('invoices').createSignedUrl(path, 600);
  if (data?.signedUrl) window.open(data.signedUrl, '_blank', 'noopener');
};

const TimesheetRequests = () => {
  const { toast } = useToast();
  const now = new Date();
  const [form, setForm] = useState({ period_start: iso(new Date(now.getFullYear(), now.getMonth(), 1, 12)), period_end: iso(now), approver_name: '', approver_email: '' });
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [sheets, setSheets] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const [{ data: ts }, { data: inv }, { data: pl }] = await Promise.all([
      db.from('timesheets').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
      db.from('invoices').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
      db.from('local_placements').select('hiring_manager_name,hiring_manager_email').eq('employee_user_id', user.id).order('start_date', { ascending: false }).limit(1).maybeSingle(),
    ]);
    setSheets(ts || []); setInvoices(inv || []);
    if (pl) setForm((f) => ({ ...f, approver_name: f.approver_name || pl.hiring_manager_name || '', approver_email: f.approver_email || pl.hiring_manager_email || '' }));
  };
  useEffect(() => { load(); }, []);

  const request = async () => {
    setBusy(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not signed in');
      let attachment_path: string | null = null;
      if (file) {
        const path = `${user.id}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
        const { error } = await supabase.storage.from('timesheets').upload(path, file);
        if (error) throw error;
        attachment_path = path;
      }
      const { data, error } = await supabase.functions.invoke('request-hours-approval', { body: { ...form, attachment_path, origin: window.location.origin } });
      if (error || data?.error) throw new Error(data?.error || (error as any)?.context?.statusText || error?.message);
      toast({ title: 'Confirmation requested', description: data.emailError ? `Saved, but the email failed: ${data.emailError}` : `An overview was emailed to ${form.approver_email}.` });
      setFile(null); load();
    } catch (e) {
      toast({ title: 'Could not request confirmation', description: e instanceof Error ? e.message : String(e), variant: 'destructive' });
    } finally { setBusy(false); }
  };

  const tone = (s: string) => s === 'approved' ? 'bg-secondary-pink text-primary-foreground' : s === 'rejected' ? 'bg-destructive text-destructive-foreground' : 'bg-primary-foreground/20 text-primary-foreground';

  return (
    <div className="grid gap-6 lg:grid-cols-2 mt-6">
      <Card className="bg-primary-blue border border-primary-foreground/20 text-primary-foreground">
        <CardHeader><CardTitle>Request confirmation</CardTitle><CardDescription className="text-primary-foreground/60">Send your hours to the client's hiring manager for one-click approval. Optionally attach the client's signed timesheet.</CardDescription></CardHeader>
        <CardContent className="grid grid-cols-2 gap-3">
          <div className="space-y-1"><Label>From</Label><Input type="date" value={form.period_start} onChange={(e) => setForm({ ...form, period_start: e.target.value })} /></div>
          <div className="space-y-1"><Label>To</Label><Input type="date" value={form.period_end} onChange={(e) => setForm({ ...form, period_end: e.target.value })} /></div>
          <div className="space-y-1"><Label>Hiring manager</Label><Input value={form.approver_name} onChange={(e) => setForm({ ...form, approver_name: e.target.value })} /></div>
          <div className="space-y-1"><Label>Hiring manager email</Label><Input type="email" value={form.approver_email} onChange={(e) => setForm({ ...form, approver_email: e.target.value })} /></div>
          <div className="space-y-1 col-span-2"><Label className="flex items-center gap-1"><FileUp className="h-4 w-4" />Signed timesheet (PDF or photo, optional)</Label><Input type="file" accept=".pdf,image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} /></div>
          <Button onClick={request} disabled={busy} className="col-span-2 bg-secondary-pink hover:bg-secondary-pink/90 text-primary-foreground"><Send className="h-4 w-4 mr-1" />{busy ? 'Sending…' : 'Request confirmation'}</Button>
        </CardContent>
      </Card>
      <Card className="bg-primary-blue border border-primary-foreground/20 text-primary-foreground">
        <CardHeader><CardTitle>Timesheets & invoices</CardTitle><CardDescription className="text-primary-foreground/60">Approved hours create a self-billing invoice automatically.</CardDescription></CardHeader>
        <CardContent className="space-y-3 text-sm">
          {sheets.length === 0 && <p className="text-primary-foreground/60">No timesheets yet.</p>}
          {sheets.map((s) => { const inv = invoices.find((i) => i.timesheet_id === s.id); return (
            <div key={s.id} className="flex items-center justify-between gap-2 border-b border-primary-foreground/10 pb-2">
              <div><p className="font-medium">{s.period_start} – {s.period_end} · {Number(s.total_hours).toFixed(2)} h</p><p className="text-xs text-primary-foreground/60">{s.approver_email}{s.decision_note ? ` · "${s.decision_note}"` : ''}</p></div>
              <div className="flex items-center gap-2"><Badge className={tone(s.status)}>{s.status}</Badge>{inv?.pdf_path && <Button size="sm" variant="outline" onClick={() => openInvoice(inv.pdf_path)} className="border-primary-foreground/30 bg-transparent"><Download className="h-4 w-4 mr-1" />{inv.invoice_number}</Button>}</div>
            </div>); })}
        </CardContent>
      </Card>
    </div>
  );
};

export default TimesheetRequests;
