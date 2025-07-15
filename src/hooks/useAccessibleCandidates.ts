import { useMemo } from "react";
import { useWorkablePermissions } from "./useWorkablePermissions";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

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

interface WorkableJob {
  id: string;
  title: string;
  shortcode: string;
  state: string;
}

export const useAccessibleCandidates = (
  allCandidates: WorkableCandidate[],
  allJobs: WorkableJob[]
) => {
  const { permissions } = useWorkablePermissions();
  const { user } = useAuth();

  // Get assigned jobs for non-admin users
  const { data: assignedJobs = [] } = useQuery({
    queryKey: ["assigned-jobs", user?.id],
    queryFn: async (): Promise<string[]> => {
      if (!user?.id || permissions.admin) return [];
      
      const { data: workableUser } = await supabase
        .from('workable_users')
        .select('assigned_jobs')
        .eq('user_id', user.id)
        .single();
        
      return workableUser?.assigned_jobs || [];
    },
    enabled: !!user?.id && !permissions.admin,
  });

  return useMemo(() => {
    // If user is admin, return all candidates and jobs
    if (permissions.admin) {
      return {
        accessibleCandidates: allCandidates,
        availableJobs: allJobs,
      };
    }

    // For non-admin users, filter by assigned jobs
    const assignedJobShortcodes = assignedJobs || [];
    
    const accessibleCandidates = allCandidates.filter(candidate => 
      assignedJobShortcodes.includes(candidate.job.shortcode || '')
    );

    const availableJobs = allJobs.filter(job => 
      assignedJobShortcodes.includes(job.shortcode)
    );

    return {
      accessibleCandidates,
      availableJobs,
    };
  }, [allCandidates, allJobs, permissions.admin, assignedJobs]);
};