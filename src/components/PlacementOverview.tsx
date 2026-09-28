import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CalendarPlus, Pencil, Plus } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const db = supabase as any;
type Placement = Record<string, any>;
const EMPTY: Placement = { candidate_name: '', candidate_email: '', company_name: '', job_title: '', project: '', start_date: new Date().toISOString().slice(0, 10), end_date: '', buy_rate: '', sell_rate: '', vat_rate: 21, hiring_manager_name: '', hiring_manager_email: '', employee_user_id: '', freelancer_company: '', freelancer_kvk: '', freelancer_vat_number: '', freelancer_iban: '' };
const daysLeft = (d?: string | null) => d ? Math.ceil((new Date(d).getTime() - Date.now()) / 86400000) : null;
const eur = (n: number) => `€${n.toFixed(2)}`;

const PlacementOverview = () => {
  const { toast } = useToast();
  const [rows, setRows] = useState<Placement[]>([]);
  const [employees, setEmployees] = useState<{ user_id: string; full_name: string; email: string }[]>([]);
  const [edit, setEdit] = useState<Placement | null>(null);

  const load = async () => {
    const { data, error } = await db.from('local_placements').select('*').order('end_date', { ascending: true, nullsFirst: false });
    if (error) toast({ title: 'Could not load placements', description: error.message, variant: 'destructive' });
    setRows(data || []);
  };
  useEffect(() => { load(); db.from('employees').select('user_id,full_name,email').order('full_name').then(({ data }: any) => setEmployees(data || [])); }, []);

  const active = rows.filter((r) => !r.end_date || daysLeft(r.end_date)! >= 0);
  const radar = active.filter((r) => { const d = daysLeft(r.end_date); return d !== null && d <= 90; });
  const totals = useMemo(() => active.reduce((a, r) => ({ margin: a.margin + (Number(r.sell_rate || 0) - Number(r.buy_rate || 0)) }), { margin: 0 }), [active]);

  const save = async () => {
    if (!edit) return;
    if (!edit.candidate_name || !edit.company_name || !edit.job_title || !edit.start_date) { toast({ title: 'Freelancer, client, role and start date are required', variant: 'destructive' }); return; }
    const emp = employees.find((e) => e.user_id === edit.employee_user_id);
    const payload: Placement = { ...edit, candidate_email: edit.candidate_email || emp?.email || '', candidate_id: edit.candidate_id || edit.employee_user_id || crypto.randomUUID(), job_id: edit.job_id || crypto.randomUUID(), end_date: edit.end_date || null, buy_rate: edit.buy_rate === '' ? null : Number(edit.buy_rate), sell_rate: edit.sell_rate === '' ? null : Number(edit.sell_rate), vat_rate: Number(edit.vat_rate ?? 21), employee_user_id: edit.employee_user_id || null, salary_currency: 'EUR', salary_rate_per: 'hour' };
    delete payload.created_at; delete payload.updated_at;
    const { error } = payload.id ? await db.from('local_placements').update(payload).eq('id', payload.id) : await db.from('local_placements').insert(payload);
    if (error) { toast({ title: 'Could not save placement', description: error.message, variant: 'destructive' }); return; }
    setEdit(null); load();
  };
  const extend = async (r: Placement) => {
    const base = r.end_date ? new Date(r.end_date) : new Date(); base.setMonth(base.getMonth() + 3);
    await db.from('local_placements').update({ end_date: base.toISOString().slice(0, 10) }).eq('id', r.id); load();
    toast({ title: 'Placement extended by 3 months' });
  };

  const field = (k: string, label: string, type = 'text') => <div className="space-y-1"><Label>{label}</Label><Input type={type} value={edit?.[k] ?? ''} onChange={(e) => setEdit({ ...edit!, [k]: e.target.value })} /></div>;
  const tone = (d: number) => d <= 30 ? 'bg-destructive text-destructive-foreground' : d <= 60 ? 'bg-secondary-pink text-primary-foreground' : 'bg-primary-foreground/20 text-primary-foreground';

  return (
    <div className="grid gap-6 lg:grid-cols-3 mb-8">
      <Card className="lg:col-span-2 bg-primary-blue border border-primary-foreground/20 text-primary-foreground">
        <CardHeader className="flex flex-row items-start justify-between">
          <div><CardTitle>Placement Overview</CardTitle><CardDescription className="text-primary-foreground/60">{active.length} active · total margin {eur(totals.margin)}/h</CardDescription></div>
          <Button size="sm" onClick={() => setEdit({ ...EMPTY })} className="bg-secondary-pink hover:bg-secondary-pink/90 text-primary-foreground"><Plus className="h-4 w-4 mr-1" />Placement</Button>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {active.length === 0 ? <p className="py-6 text-center text-primary-foreground/60">No active placements yet.</p> :
            <table className="w-full text-sm"><thead className="text-primary-foreground/60 text-left"><tr><th className="py-2">Freelancer</th><th>Client / project</th><th>Period</th><th>Buy</th><th>Sell</th><th>Margin</th><th></th></tr></thead>
              <tbody>{active.map((r) => { const m = Number(r.sell_rate || 0) - Number(r.buy_rate || 0); const pct = r.sell_rate ? Math.round((m / Number(r.sell_rate)) * 100) : 0; return (
                <tr key={r.id} className="border-t border-primary-foreground/10"><td className="py-2 font-medium">{r.candidate_name}</td><td>{r.company_name}<div className="text-xs text-primary-foreground/60">{r.project || r.job_title}</div></td><td className="text-xs">{r.start_date} → {r.end_date || 'open'}</td><td>{r.buy_rate != null ? eur(Number(r.buy_rate)) : '—'}</td><td>{r.sell_rate != null ? eur(Number(r.sell_rate)) : '—'}</td><td>{r.sell_rate ? `${eur(m)} (${pct}%)` : '—'}</td><td><Button size="icon" variant="ghost" onClick={() => setEdit({ ...r, buy_rate: r.buy_rate ?? '', sell_rate: r.sell_rate ?? '', end_date: r.end_date ?? '' })} className="hover:bg-primary-foreground/10"><Pencil className="h-4 w-4" /></Button></td></tr>); })}</tbody></table>}
        </CardContent>
      </Card>
      <Card className="bg-primary-blue border border-primary-foreground/20 text-primary-foreground">
        <CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-secondary-pink" />Expiry radar</CardTitle><CardDescription className="text-primary-foreground/60">Placements ending within 90 days</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          {radar.length === 0 ? <p className="text-primary-foreground/60 text-sm">Nothing ends in the next 90 days.</p> : radar.map((r) => { const d = daysLeft(r.end_date)!; return (
            <div key={r.id} className="flex items-center justify-between gap-2"><div><p className="font-medium text-sm">{r.candidate_name}</p><p className="text-xs text-primary-foreground/60">{r.company_name} · {r.end_date}</p></div><div className="flex items-center gap-2"><Badge className={tone(d)}>{d}d</Badge><Button size="sm" variant="outline" onClick={() => extend(r)} className="border-primary-foreground/30 bg-transparent"><CalendarPlus className="h-4 w-4 mr-1" />Extend</Button></div></div>); })}
        </CardContent>
      </Card>

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{edit?.id ? 'Edit placement' : 'New placement'}</DialogTitle></DialogHeader>
          {edit && <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1 col-span-2"><Label>Onboarded person (portal account)</Label>
              <Select value={edit.employee_user_id || 'none'} onValueChange={(v) => { const e = employees.find((x) => x.user_id === v); setEdit({ ...edit, employee_user_id: v === 'none' ? '' : v, candidate_name: e?.full_name || edit.candidate_name, candidate_email: e?.email || edit.candidate_email }); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="none">Not linked</SelectItem>{employees.map((e) => <SelectItem key={e.user_id} value={e.user_id}>{e.full_name}</SelectItem>)}</SelectContent>
              </Select></div>
            {field('candidate_name', 'Freelancer name')}{field('candidate_email', 'Freelancer email', 'email')}
            {field('company_name', 'Client')}{field('job_title', 'Role')}
            {field('project', 'Project')}{field('start_date', 'Start date', 'date')}
            {field('end_date', 'End date', 'date')}{field('vat_rate', 'VAT % (0 = reverse charge)', 'number')}
            {field('buy_rate', 'Buy rate (€/h)', 'number')}{field('sell_rate', 'Sell rate (€/h)', 'number')}
            {field('hiring_manager_name', 'Hiring manager name')}{field('hiring_manager_email', 'Hiring manager email', 'email')}
            {field('freelancer_company', 'Freelancer company')}{field('freelancer_kvk', 'KvK number')}
            {field('freelancer_vat_number', 'VAT number')}{field('freelancer_iban', 'IBAN')}
          </div>}
          <DialogFooter><Button variant="outline" onClick={() => setEdit(null)}>Cancel</Button><Button onClick={save} className="bg-secondary-pink hover:bg-secondary-pink/90 text-primary-foreground">Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PlacementOverview;
