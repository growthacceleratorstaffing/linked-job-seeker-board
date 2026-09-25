import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface EmployeeRecord {
  id: string; user_id: string; full_name: string; email: string; job_title: string | null;
  client_company: string | null; hourly_rate: number | null; start_date: string | null;
  contract_signed_at: string | null; contract_signature: string | null;
}

export const useEmployee = () => {
  const { user, isLoading: authLoading } = useAuth();
  const [employee, setEmployee] = useState<EmployeeRecord | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    if (!user) { setEmployee(null); setLoading(false); return; }
    const { data } = await (supabase as any).from('employees').select('*').eq('user_id', user.id).maybeSingle();
    setEmployee(data);
    setLoading(false);
  };

  useEffect(() => { if (!authLoading) reload(); }, [user?.id, authLoading]);
  return { employee, loading: loading || authLoading, reload };
};
