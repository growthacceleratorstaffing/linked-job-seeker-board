import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight, Plus, Trash2, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Entry {
  id: string; user_id: string; entry_date: string; start_time: string | null; end_time: string | null;
  break_minutes: number; hours: number; project: string | null; description: string | null; status: string;
}
interface Employee { user_id: string; full_name: string; email: string; client_company: string | null }

const db = supabase as any;
const iso = (d: Date) => d.toISOString().slice(0, 10);
const startOfWeek = (d: Date) => { const x = new Date(d); const day = (x.getDay() + 6) % 7; x.setDate(x.getDate() - day); x.setHours(12); return x; };
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const calcHours = (s: string, e: string, brk: number) => {
  if (!s || !e) return 0;
  const [sh, sm] = s.split(':').map(Number); const [eh, em] = e.split(':').map(Number);
  return Math.max(0, Math.round(((eh * 60 + em - sh * 60 - sm - brk) / 60) * 100) / 100);
};

export const HoursRegistration: React.FC<{ allEmployees?: boolean }> = ({ allEmployees }) => {
  const { toast } = useToast();
  const [week, setWeek] = useState(startOfWeek(new Date()));
  const [entries, setEntries] = useState<Entry[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filter, setFilter] = useState('all');
  const [userId, setUserId] = useState<string | null>(null);
  const [form, setForm] = useState({ entry_date: iso(new Date()), start_time: '09:00', end_time: '17:30', break_minutes: 30, project: '', description: '' });

  const weekEnd = useMemo(() => { const e = new Date(week); e.setDate(e.getDate() + 6); return e; }, [week]);

  const [monthly, setMonthly] = useState<{ key: string; label: string; hours: number }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [unsubmitted, setUnsubmitted] = useState(0);

  const load = async () => {
    let q = db.from('time_entries').select('*').gte('entry_date', iso(week)).lte('entry_date', iso(weekEnd)).order('entry_date');
    if (allEmployees && filter !== 'all') q = q.eq('user_id', filter);
    const { data, error } = await q;
    if (error) toast({ title: 'Could not load hours', description: error.message, variant: 'destructive' });
    setEntries(data || []);
    loadMonthly();
  };

  const loadMonthly = async () => {
    const from = new Date(); from.setMonth(from.getMonth() - 11); from.setDate(1);
    let q = db.from('time_entries').select('entry_date,hours,submitted_at,user_id').gte('entry_date', iso(from));
    if (allEmployees && filter !== 'all') q = q.eq('user_id', filter);
    if (!allEmployees && userId) q = q.eq('user_id', userId);
    const { data } = await q;
    const months: { key: string; label: string; hours: number }[] = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(from); d.setMonth(from.getMonth() + i);
      months.push({ key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, label: d.toLocaleDateString('nl-NL', { month: 'short', year: '2-digit' }), hours: 0 });
    }
    (data || []).forEach((e: any) => { const m = months.find((x) => x.key === e.entry_date.slice(0, 7)); if (m) m.hours += Number(e.hours); });
    setMonthly(months.reverse());
    setUnsubmitted((data || []).filter((e: any) => !e.submitted_at && e.user_id === userId).length);
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
    if (allEmployees) db.from('employees').select('user_id,full_name,email,client_company').order('full_name').then(({ data }: any) => setEmployees(data || []));
  }, [allEmployees]);
  useEffect(() => { load(); }, [week, filter, userId]);

  const add = async () => {
    if (!userId) return;
    if (form.entry_date > iso(new Date())) { toast({ title: 'Date in the future', description: 'You can only register hours for today or earlier.', variant: 'destructive' }); return; }
    const hours = calcHours(form.start_time, form.end_time, Number(form.break_minutes));
    if (hours <= 0) { toast({ title: 'Check your times', description: 'End time must be after start time.', variant: 'destructive' }); return; }
    const { error } = await db.from('time_entries').insert({ ...form, break_minutes: Number(form.break_minutes), hours, user_id: userId, status: 'draft' });
    if (error) { toast({ title: 'Could not save', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Hours saved', description: `${hours} hours on ${form.entry_date}` });
    setForm({ ...form, description: '' });
    const target = startOfWeek(new Date(form.entry_date));
    if (iso(target) !== iso(week)) setWeek(target); else load();
  };
  const submit = async () => {
    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke('submit-hours', { body: {} });
    setSubmitting(false);
    let msg = data?.error || error?.message;
    if (error) { try { msg = JSON.parse(await (error as any).context.text()).error; } catch { /* keep */ } }
    if (error || data?.error) { toast({ title: 'Could not submit', description: msg, variant: 'destructive' }); return; }
    toast({ title: 'Hours submitted', description: `${data.count} entries (${Number(data.total).toFixed(2)} h) sent to the admin.` });
    load();
  };
  const remove = async (id: string) => { await db.from('time_entries').delete().eq('id', id); load(); };
  const approve = async (id: string) => { await db.from('time_entries').update({ status: 'approved' }).eq('id', id); load(); };

  const nameOf = (uid: string) => employees.find((e) => e.user_id === uid)?.full_name || (uid === userId ? 'Me' : '—');
  const total = entries.reduce((s, e) => s + Number(e.hours), 0);
  const perDay = DAYS.map((_, i) => { const d = new Date(week); d.setDate(d.getDate() + i); const k = iso(d); return { k, d, h: entries.filter((e) => e.entry_date === k).reduce((s, e) => s + Number(e.hours), 0) }; });
  const shift = (n: number) => { const w = new Date(week); w.setDate(w.getDate() + n * 7); setWeek(w); };
  const field = 'bg-white/10 border-white/20 text-white';
  const maxMonth = Math.max(1, ...monthly.map((m) => m.hours));

  return (
    <div className="space-y-6">
      <Card className="bg-white/5 border-white/20 text-white">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Hours per month</CardTitle>
            <CardDescription className="text-white/70">
              Last 12 months · total <b className="text-white">{monthly.reduce((s, m) => s + m.hours, 0).toFixed(2)} hours</b>
            </CardDescription>
          </div>
          <Button onClick={submit} disabled={submitting || unsubmitted === 0} className="bg-pink-600 hover:bg-pink-700 text-white">
            <Send className="h-4 w-4 mr-1" /> {submitting ? 'Submitting…' : `Submit my hours${unsubmitted ? ` (${unsubmitted})` : ''}`}
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-2">
            {monthly.map((m) => (
              <div key={m.key} className="rounded-lg border border-white/15 bg-white/5 p-2 text-center">
                <div className="h-16 flex items-end justify-center">
                  <div className="w-4 rounded-t bg-pink-500" style={{ height: `${(m.hours / maxMonth) * 100}%` }} />
                </div>
                <div className="text-xs text-white/60 mt-1">{m.label}</div>
                <div className="text-sm font-semibold">{m.hours ? m.hours.toFixed(1) : '–'}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white/5 border-white/20 text-white">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Week of {week.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long' })} – {weekEnd.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })}</CardTitle>
            <CardDescription className="text-white/70">Total this week: <b className="text-white">{total.toFixed(2)} hours</b></CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {allEmployees && (
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className={`w-52 ${field}`}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Everyone</SelectItem>
                  {employees.map((e) => <SelectItem key={e.user_id} value={e.user_id}>{e.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            <Button size="icon" onClick={() => shift(-1)} className="bg-pink-600 hover:bg-pink-700 text-white"><ChevronLeft className="h-4 w-4" /></Button>
            <Button size="sm" onClick={() => setWeek(startOfWeek(new Date()))} className="bg-pink-600 hover:bg-pink-700 text-white">This week</Button>
            <Button size="icon" onClick={() => shift(1)} className="bg-pink-600 hover:bg-pink-700 text-white"><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2">
            {perDay.map((p, i) => (
              <div key={p.k} className="rounded-lg border border-white/15 bg-white/5 p-3 text-center">
                <div className="text-xs text-white/60">{DAYS[i]} {p.d.getDate()}</div>
                <div className="text-lg font-semibold">{p.h ? p.h.toFixed(2) : '–'}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {true && (
        <Card className="bg-white/5 border-white/20 text-white">
          <CardHeader><CardTitle>Register hours</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-6 gap-3 items-end">
            <div className="space-y-1"><Label>Date</Label><Input type="date" className={field} value={form.entry_date} onChange={(e) => setForm({ ...form, entry_date: e.target.value })} /></div>
            <div className="space-y-1"><Label>Start</Label><Input type="time" className={field} value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} /></div>
            <div className="space-y-1"><Label>End</Label><Input type="time" className={field} value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} /></div>
            <div className="space-y-1"><Label>Break (min)</Label><Input type="number" min={0} className={field} value={form.break_minutes} onChange={(e) => setForm({ ...form, break_minutes: Number(e.target.value) })} /></div>
            <div className="space-y-1 col-span-2"><Label>Client / project</Label><Input className={field} value={form.project} onChange={(e) => setForm({ ...form, project: e.target.value })} placeholder="e.g. Client BV" /></div>
            <div className="space-y-1 col-span-2 md:col-span-5"><Label>Description</Label><Input className={field} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What did you work on?" /></div>
            <Button onClick={add} className="bg-pink-600 hover:bg-pink-700 text-white"><Plus className="h-4 w-4 mr-1" /> Add ({calcHours(form.start_time, form.end_time, form.break_minutes)} h)</Button>
          </CardContent>
        </Card>
      )}

      <Card className="bg-white/5 border-white/20 text-white">
        <CardHeader><CardTitle>Entries</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          {entries.length === 0 ? <p className="text-white/60 text-sm">No hours registered this week.</p> : (
            <table className="w-full text-sm">
              <thead className="text-white/60 text-left">
                <tr>{allEmployees && <th className="py-2">Employee</th>}<th>Date</th><th>Time</th><th>Break</th><th>Hours</th><th>Project</th><th>Description</th><th>Status</th><th></th></tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id} className="border-t border-white/10">
                    {allEmployees && <td className="py-2">{nameOf(e.user_id)}</td>}
                    <td className="py-2">{new Date(e.entry_date).toLocaleDateString('nl-NL')}</td>
                    <td>{e.start_time?.slice(0, 5)}–{e.end_time?.slice(0, 5)}</td>
                    <td>{e.break_minutes}m</td>
                    <td className="font-semibold">{Number(e.hours).toFixed(2)}</td>
                    <td>{e.project}</td>
                    <td className="max-w-xs truncate">{e.description}</td>
                    <td><span className={`px-2 py-0.5 rounded-full text-xs ${e.status === 'approved' ? 'bg-green-500/20 text-green-300' : 'bg-yellow-500/20 text-yellow-200'}`}>{e.status}</span></td>
                    <td className="text-right whitespace-nowrap">
                      {allEmployees && e.status !== 'approved' && <Button size="sm" variant="ghost" onClick={() => approve(e.id)} className="text-green-300 hover:bg-white/10"><Check className="h-4 w-4" /></Button>}
                      {(allEmployees || e.status !== 'approved') && <Button size="sm" variant="ghost" onClick={() => remove(e.id)} className="text-pink-300 hover:bg-white/10"><Trash2 className="h-4 w-4" /></Button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default HoursRegistration;
