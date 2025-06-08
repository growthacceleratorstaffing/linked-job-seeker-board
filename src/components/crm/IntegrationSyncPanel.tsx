
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";

export const IntegrationSyncPanel = () => {
  const { data: syncStats } = useQuery({
    queryKey: ["integration-sync-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("integration_sync_logs")
        .select("integration_type, status, created_at")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;

      const stats = {
        linkedin: { success: 0, failed: 0, pending: 0, lastSync: null as string | null },
        workable: { success: 0, failed: 0, pending: 0, lastSync: null as string | null }
      };

      data?.forEach(log => {
        const type = log.integration_type as 'linkedin' | 'workable';
        if (stats[type]) {
          stats[type][log.status as 'success' | 'failed' | 'pending']++;
          if (!stats[type].lastSync) {
            stats[type].lastSync = log.created_at;
          }
        }
      });

      return stats;
    }
  });

  const { data: integrationSettings } = useQuery({
    queryKey: ["integration-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("integration_settings")
        .select("*");

      if (error) throw error;
      return data;
    }
  });

  const getStatusIcon = (success: number, failed: number, pending: number) => {
    if (pending > 0) return <Clock className="h-4 w-4 text-yellow-500" />;
    if (failed > 0) return <XCircle className="h-4 w-4 text-red-500" />;
    if (success > 0) return <CheckCircle className="h-4 w-4 text-green-500" />;
    return <AlertCircle className="h-4 w-4 text-gray-400" />;
  };

  const getStatusBadge = (success: number, failed: number, pending: number) => {
    if (pending > 0) return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Syncing</Badge>;
    if (failed > 0) return <Badge variant="destructive">Issues</Badge>;
    if (success > 0) return <Badge variant="secondary" className="bg-green-100 text-green-800">Active</Badge>;
    return <Badge variant="outline">Inactive</Badge>;
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-base">
            <div className="flex items-center gap-2">
              {syncStats && getStatusIcon(
                syncStats.linkedin.success,
                syncStats.linkedin.failed,
                syncStats.linkedin.pending
              )}
              LinkedIn Integration
            </div>
            {syncStats && getStatusBadge(
              syncStats.linkedin.success,
              syncStats.linkedin.failed,
              syncStats.linkedin.pending
            )}
          </CardTitle>
          <CardDescription>
            {integrationSettings?.find(s => s.integration_type === 'linkedin')?.is_enabled 
              ? 'LinkedIn integration is enabled' 
              : 'LinkedIn integration is disabled'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm space-y-1">
            {syncStats?.linkedin.lastSync && (
              <div>Last sync: {new Date(syncStats.linkedin.lastSync).toLocaleDateString()}</div>
            )}
            <div>Success: {syncStats?.linkedin.success || 0} | Failed: {syncStats?.linkedin.failed || 0}</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-base">
            <div className="flex items-center gap-2">
              {syncStats && getStatusIcon(
                syncStats.workable.success,
                syncStats.workable.failed,
                syncStats.workable.pending
              )}
              Workable Integration
            </div>
            {syncStats && getStatusBadge(
              syncStats.workable.success,
              syncStats.workable.failed,
              syncStats.workable.pending
            )}
          </CardTitle>
          <CardDescription>
            {integrationSettings?.find(s => s.integration_type === 'workable')?.is_enabled 
              ? 'Workable integration is enabled' 
              : 'Workable integration is disabled'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm space-y-1">
            {syncStats?.workable.lastSync && (
              <div>Last sync: {new Date(syncStats.workable.lastSync).toLocaleDateString()}</div>
            )}
            <div>Success: {syncStats?.workable.success || 0} | Failed: {syncStats?.workable.failed || 0}</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
