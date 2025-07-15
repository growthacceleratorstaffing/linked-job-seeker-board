import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface WorkableCandidate {
  id: string;
  name: string;
  firstname: string;
  lastname: string;
  email: string;
  phone: string;
  stage: string;
  job: {
    id: string;
    title: string;
    shortcode?: string;
  };
  created_at: string;
  updated_at: string;
}

export const useWorkableCandidates = () => {
  return useQuery({
    queryKey: ['workable-candidates'],
    queryFn: async (): Promise<WorkableCandidate[]> => {
      const { data, error } = await supabase.functions.invoke('workable-candidates');
      
      if (error) {
        console.error('Error fetching Workable candidates:', error);
        throw new Error('Failed to fetch candidates from Workable');
      }
      
      return data || [];
    },
    refetchInterval: 20 * 60 * 1000,
    staleTime: 15 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 1,
    retryDelay: 120000,
  });
};