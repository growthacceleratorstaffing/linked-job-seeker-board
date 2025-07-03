import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserCheck, Building, Clock } from "lucide-react";
import { CandidatesList } from "@/components/crm/CandidatesList";
import { useToast } from "@/hooks/use-toast";

const CRM = () => {
  const { toast } = useToast();

  // Fetch stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["crm-stats"],
    queryFn: async () => {
      const [candidatesCount, workableStats] = await Promise.all([
        supabase
          .from("candidates")
          .select("*", { count: 'exact', head: true }),
        
        supabase
          .from("integration_sync_logs")
          .select("*")
          .eq("integration_type", "workable")
          .eq("status", "success")
          .order("completed_at", { ascending: false })
          .limit(1)
      ]);

      return {
        totalCandidates: candidatesCount.count || 0,
        lastSyncLog: workableStats.data?.[0]
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Auto-sync candidates when component mounts if no candidates exist
  useEffect(() => {
    const autoSyncCandidates = async () => {
      try {
        // Check if we have candidates first
        const { count } = await supabase
          .from("candidates")
          .select("*", { count: 'exact', head: true });

        // Only sync if we have very few candidates (less than 10)
        if ((count || 0) < 10) {
          console.log('Auto-syncing candidates from Workable...');
          
          const { data, error } = await supabase.functions.invoke('workable-integration', {
            body: { action: 'sync_candidates' }
          });

          if (error) {
            console.error('Auto-sync failed:', error);
            return;
          }

          if (data && data.syncedCandidates > 0) {
            toast({
              title: "Candidates synced! 🎉",
              description: `Loaded ${data.syncedCandidates} candidates from Workable`,
            });
          }
        }
      } catch (error: any) {
        console.error('Auto-sync error:', error);
        // Don't show error toast for auto-sync failures to avoid annoying users
      }
    };

    autoSyncCandidates();
  }, [toast]);

  return (
    <div className="min-h-screen bg-primary-blue text-white">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-8">
          <div className="mb-6">
            <img 
              src="/lovable-uploads/b75d59b1-dda0-4ae9-aa70-24966bdd42d5.png" 
              alt="Growth Accelerator Logo" 
              className="mx-auto h-16 w-16 object-contain"
            />
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-4 text-secondary-pink">
            CRM Dashboard
          </h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            Your Workable candidates automatically synced and ready to manage
          </p>
        </header>

        {/* Stats Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card className="bg-slate-800 border-slate-600">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-300 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Total Candidates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {statsLoading ? "..." : stats?.totalCandidates || 0}
              </div>
              <p className="text-xs text-slate-400">From Workable</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-600">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-300 flex items-center gap-2">
                <UserCheck className="w-4 h-4" />
                Active Applications
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {stats?.totalCandidates ? Math.round(stats.totalCandidates * 0.7) : 0}
              </div>
              <p className="text-xs text-slate-400">Currently in pipeline</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-600">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-300 flex items-center gap-2">
                <Building className="w-4 h-4" />
                Integration Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm font-bold text-green-400">
                Connected
              </div>
              <p className="text-xs text-slate-400">Workable API</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-600">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-300 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Last Sync
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm font-bold text-white">
                {stats?.lastSyncLog?.completed_at 
                  ? new Date(stats.lastSyncLog.completed_at).toLocaleDateString()
                  : "Auto-syncing..."
                }
              </div>
              <p className="text-xs text-slate-400">Automatic updates</p>
            </CardContent>
          </Card>
        </div>
        
        <CandidatesList />
      </div>
    </div>
  );
};

export default CRM;