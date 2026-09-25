import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import PortalLayout from '@/components/PortalLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useEmployee } from '@/hooks/useEmployee';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Placeholder staffing-agency (uitzendovereenkomst) template until the real contract is supplied.
const contractSections = (e: any) => [
  ['1. Parties', `Growth Accelerator B.V. ("the Agency") and ${e.full_name} ("the Temporary Worker") agree to this temporary employment contract (uitzendovereenkomst) as referred to in article 7:690 of the Dutch Civil Code.`],
  ['2. Assignment', `The Temporary Worker will be placed at ${e.client_company || '[client company]'} ("the Hirer") in the position of ${e.job_title || '[position]'}, starting on ${e.start_date ? new Date(e.start_date).toLocaleDateString('nl-NL') : '[start date]'}. The Hirer directs and supervises the work; the Agency remains the employer.`],
  ['3. Duration', 'This contract contains an agency clause: it ends automatically when the Hirer ends the assignment, unless agreed otherwise in writing. The first 26 working weeks fall under phase A of the ABU collective labour agreement.'],
  ['4. Working hours and pay', `Working hours follow the Hirer's schedule. The gross hourly wage is € ${e.hourly_rate ?? '[rate]'}, plus holiday allowance (8%) and holiday hours as described in the ABU CAO. Pay is based on hours registered and approved in the backoffice.`],
  ['5. Registering hours', 'The Temporary Worker registers worked hours weekly in the Growth Accelerator backoffice, no later than Monday 12:00 for the previous week. Hours are approved by the Hirer before payment.'],
  ['6. Illness', 'The Temporary Worker reports illness before 09:00 on the first day to both the Agency and the Hirer.'],
  ['7. Confidentiality', 'The Temporary Worker keeps all confidential information of the Agency and the Hirer secret, during and after the assignment.'],
  ['8. Applicable CAO', 'The ABU collective labour agreement for temporary workers applies, as well as the Agency\'s staff regulations.'],
];

const PortalOnboarding = () => {
  const { employee, reload } = useEmployee();
  const { toast } = useToast();
  const [signature, setSignature] = useState('');
  const [agree, setAgree] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!employee) return null;
  const signed = !!employee.contract_signed_at;

  const sign = async () => {
    setSaving(true);
    const { error } = await (supabase as any).from('employees')
      .update({ contract_signed_at: new Date().toISOString(), contract_signature: signature.trim() })
      .eq('user_id', employee.user_id);
    setSaving(false);
    if (error) { toast({ title: 'Could not sign', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Contract signed', description: 'Thank you! You can now register your hours.' });
    reload();
  };

  return (
    <PortalLayout>
      <Link to="/portal" className="inline-flex items-center text-white/70 hover:text-white mb-4"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Link>
      <h1 className="text-3xl font-bold mb-6">Onboarding — your contract</h1>
      <div className="rounded-2xl bg-white/5 border border-white/20 p-8 space-y-5">
        <h2 className="text-xl font-semibold">Temporary Employment Contract (Uitzendovereenkomst)</h2>
        {contractSections(employee).map(([h, t]) => (
          <div key={h}><h3 className="font-semibold">{h}</h3><p className="text-white/80 text-sm mt-1">{t}</p></div>
        ))}
        <div className="border-t border-white/10 pt-5">
          {signed ? (
            <p className="flex items-center gap-2 text-green-300"><CheckCircle className="h-5 w-5" /> Signed by {employee.contract_signature} on {new Date(employee.contract_signed_at!).toLocaleString('nl-NL')}</p>
          ) : (
            <div className="space-y-3 max-w-md">
              <label className="flex items-center gap-2 text-sm"><Checkbox checked={agree} onCheckedChange={(v) => setAgree(!!v)} /> I have read and agree to this contract</label>
              <Input placeholder="Type your full name to sign" value={signature} onChange={(e) => setSignature(e.target.value)} className="bg-white/10 border-white/20 text-white" />
              <Button disabled={!agree || signature.trim().length < 3 || saving} onClick={sign} className="bg-pink-600 hover:bg-pink-700 text-white">Sign contract</Button>
            </div>
          )}
        </div>
      </div>
    </PortalLayout>
  );
};

export default PortalOnboarding;
