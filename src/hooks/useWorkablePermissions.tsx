import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

interface WorkablePermissions {
  admin: boolean;
  simple: boolean;
  reviewer: boolean;
  candidates: boolean;
  jobs: boolean;
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
          role: null
        };
      }

      const role = workableUser.workable_role;

      // Check permissions based on role hierarchy
      const permissions = {
        admin: role === 'admin',
        simple: ['admin', 'simple'].includes(role),
        reviewer: ['admin', 'simple', 'reviewer'].includes(role),
        candidates: ['admin', 'simple'].includes(role),
        jobs: ['admin', 'simple', 'reviewer'].includes(role),
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