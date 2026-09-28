import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { openInvoice } from '@/components/TimesheetRequests';

const db = supabase as any;

const InvoicesList = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  useEffect(() => {
    db.from('invoices').select('*').order('created_at', { ascending: false }).limit(100).then(({ data }: any) => setRows(data || []));
    db.from('employees').select('user_id,full_name').then(({ data }: any) => setNames(Object.fromEntries((data || []).map((e: any) => [e.user_id, e.full_name]))));
  }, []);
  return (
    <Card className="mt-8 bg-primary-blue border border-primary-foreground/20 text-primary-foreground">
      <CardHeader><CardTitle>Self-billing invoices</CardTitle><CardDescription className="text-primary-foreground/60">Created automatically when a hiring manager approves hours.</CardDescription></CardHeader>
      <CardContent className="overflow-x-auto">
        {rows.length === 0 ? <p className="text-primary-foreground/60 text-sm">No invoices yet.</p> :
          <table className="w-full text-sm"><thead className="text-left text-primary-foreground/60"><tr><th className="py-2">Number</th><th>Freelancer</th><th>Hours</th><th>Rate</th><th>Total incl. VAT</th><th>Date</th><th></th></tr></thead>
            <tbody>{rows.map((r) => <tr key={r.id} className="border-t border-primary-foreground/10"><td className="py-2">{r.invoice_number}</td><td>{names[r.user_id] || '—'}</td><td>{Number(r.hours).toFixed(2)}</td><td>€{Number(r.rate).toFixed(2)}</td><td>€{Number(r.total).toFixed(2)}</td><td>{r.created_at.slice(0, 10)}</td><td>{r.pdf_path && <Button size="sm" variant="outline" onClick={() => openInvoice(r.pdf_path)} className="border-primary-foreground/30 bg-transparent"><Download className="h-4 w-4 mr-1" />PDF</Button>}</td></tr>)}</tbody></table>}
      </CardContent>
    </Card>
  );
};

export default InvoicesList;
