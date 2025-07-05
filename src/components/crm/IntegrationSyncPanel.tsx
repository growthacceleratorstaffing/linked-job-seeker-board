
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Clock, CheckCircle, XCircle, AlertCircle, Zap } from "lucide-react";

export const IntegrationSyncPanel = () => {
  const { data: syncStats } = useQuery({
    queryKey: ["integration-sync-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("integration_sync_logs")
        .select("integration_type, status, created_at, completed_at")
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
          if (log.status === 'in_progress') {
            stats[type].pending++;
          } else {
            stats[type][log.status as 'success' | 'failed']++;
          }
          if (!stats[type].lastSync && log.completed_at) {
            stats[type].lastSync = log.completed_at;
          }
        }
      });

      return stats;
    },
    refetchInterval: 5000 // Refetch every 5 seconds to update status in real-time
  });

  const { data: integrationSettings } = useQuery({
    queryKey: ["integration-settings"],
    queryFn: async () => {
      console.log('Fetching integration settings...');
      
      // First try to get existing settings
      const { data: existingSettings, error } = await supabase
        .from("integration_settings")
        .select("*");

      if (error) {
        console.error('Error fetching integration settings:', error);
        throw error;
      }

      console.log('Existing integration settings:', existingSettings);

      // Check what's missing and create defaults
      const linkedinSettings = existingSettings?.find(s => s.integration_type === 'linkedin');
      const workableSettings = existingSettings?.find(s => s.integration_type === 'workable');

      const settingsToCreate = [];

      if (!linkedinSettings) {
        settingsToCreate.push({
          integration_type: 'linkedin',
          is_enabled: true,
          sync_frequency_hours: 24,
          settings: { auto_sync_enabled: true }
        });
      }

      if (!workableSettings) {
        settingsToCreate.push({
          integration_type: 'workable',
          is_enabled: true,
          sync_frequency_hours: 2,
          settings: { auto_sync_enabled: true, sync_jobs: true, sync_candidates: true }
        });
      }

      if (settingsToCreate.length > 0) {
        console.log('Creating missing integration settings:', settingsToCreate);
        const { error: insertError } = await supabase
          .from("integration_settings")
          .insert(settingsToCreate);

        if (insertError) {
          console.error('Error creating integration settings:', insertError);
        }
      }

      // Fetch updated settings
      const { data: updatedSettings, error: updateError } = await supabase
        .from("integration_settings")
        .select("*");

      if (updateError) {
        console.error('Error fetching updated settings:', updateError);
        throw updateError;
      }
      
      console.log('Final integration settings:', updatedSettings);
      return updatedSettings;
    }
  });

  return (
    <div className="grid gap-4 md:grid-cols-1">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Integration Status</CardTitle>
          <CardDescription>
            Real-time sync status for integrated platforms
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                {syncStats && (
                  syncStats.linkedin.pending > 0 ? 
                    <Clock className="h-4 w-4 text-yellow-500 animate-pulse" /> :
                    <CheckCircle className="h-4 w-4 text-green-500" />
                )}
                <div>
                  <div className="font-medium">LinkedIn Integration</div>
                  <div className="text-sm text-muted-foreground">
                    {syncStats?.linkedin.lastSync ? 
                      `Last sync: ${new Date(syncStats.linkedin.lastSync).toLocaleDateString()}` :
                      'No sync data'
                    }
                  </div>
                </div>
              </div>
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                <Zap className="h-3 w-3 mr-1" />
                Auto-Enabled
              </Badge>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                {syncStats && (
                  syncStats.workable.pending > 0 ? 
                    <Clock className="h-4 w-4 text-yellow-500 animate-pulse" /> :
                    <CheckCircle className="h-4 w-4 text-green-500" />
                )}
                <div>
                  <div className="font-medium">External Platform Integration</div>
                  <div className="text-sm text-muted-foreground">
                    {syncStats?.workable.lastSync ? 
                      `Last sync: ${new Date(syncStats.workable.lastSync).toLocaleDateString()}` :
                      'No sync data'
                    } • Syncs every 2 hours
                  </div>
                  {syncStats && (
                    <div className="text-xs text-muted-foreground">
                      Success: {syncStats.workable.success} | Failed: {syncStats.workable.failed}
                    </div>
                  )}
                </div>
              </div>
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                <Zap className="h-3 w-3 mr-1" />
                Auto-Enabled
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
