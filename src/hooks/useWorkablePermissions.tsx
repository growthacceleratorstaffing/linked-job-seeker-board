import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

interface WorkablePermissions {
  admin: boolean;
  simple: boolean;
  reviewer: boolean;
  candidates: boolean;
  jobs: boolean;
  create_matches: boolean;
  publish_jobs: boolean;
  role: string | null;
}

export const useWorkablePermissions = () => {
  const { user } = useAuth();

  const { data: permissions = {
    admin: false,
    simple: false,
    reviewer: false,
    candidates: false,
    jobs: false,
    create_matches: false,
    publish_jobs: false,
    role: null
  }, isLoading } = useQuery({
    queryKey: ["workable-permissions", user?.id],
    queryFn: async (): Promise<WorkablePermissions> => {
      if (!user?.id) {
        return {
          admin: false,
          simple: false,
          reviewer: false,
          candidates: false,
          jobs: false,
          create_matches: false,
          publish_jobs: false,
          role: null
        };
      }

      // Get user's Workable role
      const { data: workableUser } = await supabase
        .from('workable_users')
        .select('workable_role')
        .eq('user_id', user.id)
        .single();

      if (!workableUser) {
        return {
          admin: false,
          simple: false,
          reviewer: false,
          candidates: false,
          jobs: false,
          create_matches: false,
          publish_jobs: false,
          role: null
        };
      }

      const role = workableUser.workable_role;

      // Check permissions based on role hierarchy following Workable's standard permissions
      // Standard members (simple) have access to publish jobs, create matches, and view assigned jobs/candidates
      // Hiring managers have more access than simple but less than admin
      const permissions = {
        admin: role === 'admin',
        simple: ['admin', 'simple', 'hiring_manager'].includes(role),
        reviewer: ['admin', 'simple', 'reviewer', 'hiring_manager'].includes(role),
        candidates: ['admin', 'hiring_manager'].includes(role), // Hiring managers can see candidates for their jobs
        jobs: ['admin', 'simple', 'reviewer', 'hiring_manager'].includes(role), // All roles can see assigned jobs
        create_matches: ['admin', 'simple', 'hiring_manager'].includes(role), // Members can create matches too
        publish_jobs: ['admin', 'simple', 'hiring_manager'].includes(role), // Members can publish jobs (Workable standard)
        role
      };

      return permissions;
    },
    enabled: !!user?.id,
  });

  return {
    permissions,
    isLoading,
    hasPermission: (permission: keyof Omit<WorkablePermissions, 'role'>) => 
      permissions[permission] || false,
    role: permissions.role
  };
};