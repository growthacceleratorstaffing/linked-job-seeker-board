import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Check, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';

const TimesheetApproval = () => {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const call = async (action: string) => {
    const { data: res, error: err } = await supabase.functions.invoke('approve-timesheet', { body: { token, action, note } });
    if (err) { let msg = err.message; try { msg = (await (err as any).context.json()).error || msg; } catch { /* ignore */ } throw new Error(msg); }
    if (res?.error) throw new Error(res.error);
    return res;
  };
  useEffect(() => { call('view').then(setData).catch((e) => setError(e.message)); }, []);
  const decide = async (action: 'approve' | 'reject') => {
    setBusy(true);
    try { const r = await call(action); setDone(action === 'approve' ? `Thank you — the hours are approved${r.invoice ? ` (invoice ${r.invoice})` : ''}.` : 'The hours were rejected and the freelancer has been notified.'); }
    catch (e) { setError(e instanceof Error ? e.message : String(e)); } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen bg-primary-blue text-primary-foreground flex items-center justify-center p-6">
      <Card className="w-full max-w-2xl bg-primary-blue border border-primary-foreground/20 text-primary-foreground">
        <CardHeader><CardTitle>Growth Accelerator Staffing — hours approval</CardTitle></CardHeader>
        <CardContent>
          {done ? <p className="text-lg">{done}</p> : error ? <p className="text-secondary-pink">{error}</p> : !data ? <Loader2 className="h-6 w-6 animate-spin" /> : <>
            <p className="mb-4"><b>{data.freelancer}</b> registered <b>{Number(data.total_hours).toFixed(2)} hours</b> for {data.client} ({data.period_start} – {data.period_end}).</p>
            <table className="w-full text-sm mb-4"><thead className="text-left text-primary-foreground/60"><tr><th>Date</th><th>Time</th><th>Break</th><th>Hours</th><th>Project</th></tr></thead>
              <tbody>{(data.entries || []).map((e: any, i: number) => <tr key={i} className="border-t border-primary-foreground/10"><td className="py-1">{e.entry_date}</td><td>{e.start_time?.slice(0, 5)}–{e.end_time?.slice(0, 5)}</td><td>{e.break_minutes}m</td><td>{Number(e.hours).toFixed(2)}</td><td>{e.project}</td></tr>)}</tbody></table>
            {data.attachmentUrl && <a href={data.attachmentUrl} target="_blank" rel="noopener noreferrer" className="text-secondary-pink underline">View signed timesheet</a>}
            <Textarea placeholder="Optional note" value={note} onChange={(e) => setNote(e.target.value)} className="my-4 text-foreground" />
            <div className="flex gap-3"><Button disabled={busy} onClick={() => decide('approve')} className="bg-secondary-pink hover:bg-secondary-pink/90 text-primary-foreground"><Check className="h-4 w-4 mr-1" />Approve hours</Button><Button disabled={busy} variant="outline" onClick={() => decide('reject')} className="bg-transparent border-primary-foreground/30"><X className="h-4 w-4 mr-1" />Reject</Button></div>
          </>}
        </CardContent>
      </Card>
    </div>
  );
};

export default TimesheetApproval;
