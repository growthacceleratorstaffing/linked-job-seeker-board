
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

export const WorkableSyncButton = () => {
  const [isSyncing, setIsSyncing] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const syncCandidates = async () => {
    setIsSyncing(true);
    try {
      console.log('Starting Workable candidate sync...');
      
      const { data, error } = await supabase.functions.invoke('workable-integration', {
        body: { action: 'sync_candidates' }
      });

      if (error) throw error;

      console.log('Sync result:', data);
      
      toast({
        title: "Sync completed successfully! 🎉",
        description: `Synced ${data.syncedCandidates} candidates from ${data.jobsProcessed} jobs`,
      });

      // Refresh the candidates list
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
      queryClient.invalidateQueries({ queryKey: ["crm-stats"] });
      queryClient.invalidateQueries({ queryKey: ["integration-sync-stats"] });

    } catch (error) {
      console.error('Error syncing candidates:', error);
      toast({
        title: "Sync failed",
        description: error instanceof Error ? error.message : "Failed to sync candidates from Workable.",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Button
      onClick={syncCandidates}
      disabled={isSyncing}
      variant="outline"
      size="sm"
    >
      {isSyncing ? (
        <>
          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          Syncing...
        </>
      ) : (
        <>
          <Users className="h-4 w-4 mr-2" />
          Sync Candidates
        </>
      )}
    </Button>
  );
};
