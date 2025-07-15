import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface WorkableJob {
  id: string;
  title: string;
  shortcode: string;
  state: string;
}

export const useWorkableJobs = () => {
  return useQuery({
    queryKey: ['workable-jobs'],
    queryFn: async (): Promise<WorkableJob[]> => {
      const { data, error } = await supabase.functions.invoke('workable-jobs');
      
      if (error) {
        console.error('Error fetching Workable jobs:', error);
        throw new Error('Failed to fetch jobs from Workable');
      }
      
      return data || [];
    },
    refetchInterval: 30 * 60 * 1000,
    staleTime: 25 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 1,
    retryDelay: 120000,
  });
};