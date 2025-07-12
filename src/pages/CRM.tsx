import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserCheck, Building, Clock, Loader2 } from "lucide-react";
import { CandidatesList } from "@/components/crm/CandidatesList";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

const CRM = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isBulkLoading, setIsBulkLoading] = useState(false);

  // Redirect to login if not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-primary-blue text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl mb-4">Please log in to access the CRM</h1>
          <p className="text-slate-300">You need to be authenticated to view candidate data.</p>
        </div>
      </div>
    );
  }

  // Fetch stats with actual data quality calculation
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["crm-stats"],
    queryFn: async () => {
      const [candidatesCount, workableStats, allCandidatesData] = await Promise.all([
        supabase
          .from("candidates")
          .select("*", { count: 'exact', head: true })
          .eq("user_id", user.id),
        
        supabase
          .from("integration_sync_logs")
          .select("*")
          .eq("integration_type", "workable")
          .eq("status", "success")
          .order("completed_at", { ascending: false })
          .limit(1),
          
        // Fetch actual candidate data for quality analysis
        supabase
          .from("candidates")
          .select("name, email, phone, location, current_position, company, skills, workable_candidate_id, profile_picture_url, linkedin_profile_url")
          .eq("user_id", user.id)
      ]);

      // Calculate actual data quality metrics
      const candidates = allCandidatesData.data || [];
      const totalCandidates = candidates.length;
      
      let qualityMetrics = {
        withEmail: 0,
        withPhone: 0,
        withLocation: 0,
        withPosition: 0,
        withCompany: 0,
        withSkills: 0,
        withWorkableId: 0,
        withLinkedIn: 0,
        withPhoto: 0
      };
      
      candidates.forEach(candidate => {
        if (candidate.email && candidate.email.length > 5 && candidate.email !== '@integration.com') {
          qualityMetrics.withEmail++;
        }
        if (candidate.phone && candidate.phone.length > 5) {
          qualityMetrics.withPhone++;
        }
        if (candidate.location && candidate.location.length > 2) {
          qualityMetrics.withLocation++;
        }
        if (candidate.current_position && candidate.current_position.length > 2) {
          qualityMetrics.withPosition++;
        }
        if (candidate.company && candidate.company.length > 2) {
          qualityMetrics.withCompany++;
        }
        if (candidate.skills && Array.isArray(candidate.skills) && candidate.skills.length > 0) {
          qualityMetrics.withSkills++;
        }
        if (candidate.workable_candidate_id) {
          qualityMetrics.withWorkableId++;
        }
        if (candidate.linkedin_profile_url) {
          qualityMetrics.withLinkedIn++;
        }
        if (candidate.profile_picture_url) {
          qualityMetrics.withPhoto++;
        }
      });
      
      // Calculate percentages
      const percentages = totalCandidates > 0 ? {
        email: Math.round((qualityMetrics.withEmail / totalCandidates) * 100),
        phone: Math.round((qualityMetrics.withPhone / totalCandidates) * 100),
        location: Math.round((qualityMetrics.withLocation / totalCandidates) * 100),
        position: Math.round((qualityMetrics.withPosition / totalCandidates) * 100),
        company: Math.round((qualityMetrics.withCompany / totalCandidates) * 100),
        skills: Math.round((qualityMetrics.withSkills / totalCandidates) * 100),
        workableId: Math.round((qualityMetrics.withWorkableId / totalCandidates) * 100),
        linkedIn: Math.round((qualityMetrics.withLinkedIn / totalCandidates) * 100),
        photo: Math.round((qualityMetrics.withPhoto / totalCandidates) * 100)
      } : {
        email: 0, phone: 0, location: 0, position: 0, company: 0, 
        skills: 0, workableId: 0, linkedIn: 0, photo: 0
      };
      
      // Calculate overall data quality score (weighted average of key fields)
      const overallScore = totalCandidates > 0 ? Math.round(
        (percentages.email * 0.25) +      // Email is most important (25%)
        (percentages.phone * 0.15) +      // Phone is important (15%)
        (percentages.position * 0.15) +   // Position is important (15%) 
        (percentages.location * 0.10) +   // Location is helpful (10%)
        (percentages.company * 0.10) +    // Company is helpful (10%)
        (percentages.skills * 0.10) +     // Skills are helpful (10%)
        (percentages.workableId * 0.05) + // Integration ID for tracking (5%)
        (percentages.linkedIn * 0.05) +   // LinkedIn for sourcing (5%)
        (percentages.photo * 0.05)        // Photo for identification (5%)
      ) : 0;

      return {
        totalCandidates: candidatesCount.count || 0,
        lastSyncLog: workableStats.data?.[0],
        qualityMetrics,
        percentages,
        overallDataQuality: overallScore
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
          .select("*", { count: 'exact', head: true })
          .eq("user_id", user.id);

        // Only bulk load if we have significantly fewer candidates than expected (~1600)
        if ((count || 0) < 1500) {
          console.log('Auto-loading all candidates...');
          setIsBulkLoading(true);
          
          const { data, error } = await supabase.functions.invoke('workable-integration', {
            body: { action: 'load_all_candidates' }
          });

          if (error) {
            console.error('Auto bulk load failed:', error);
            toast({
              title: "Auto-load failed ❌",
              description: `Error: ${error.message}`,
              variant: "destructive",
            });
            return;
          }

          if (data && data.success) {
            if (data.backgroundTask) {
              console.log('Background candidate loading started:', data);
              toast({
                title: "Loading started! ⚡",
                description: "Candidates are being loaded in the background. This page will update automatically.",
              });
            } else {
              console.log('Auto bulk load completed:', data);
              toast({
                title: "All candidates loaded! 🎉",
                description: `Successfully loaded ${data.syncedCandidates} out of ${data.totalCandidates} candidates`,
              });
            }
            
            // Invalidate queries to refresh the UI
            queryClient.invalidateQueries({ queryKey: ["candidates"] });
            queryClient.invalidateQueries({ queryKey: ["crm-stats"] });
          }
        }
      } catch (error: any) {
        console.error('Auto bulk load error:', error);
        toast({
          title: "Auto-load failed ❌",
          description: `Unexpected error: ${error.message}`,
          variant: "destructive",
        });
      } finally {
        setIsBulkLoading(false);
      }
    };

    autoSyncCandidates();
  }, [toast, queryClient]);

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
            Your candidates automatically synced and ready to manage
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
              <p className="text-xs text-slate-400">Growth Accelerator Platform</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-600">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-300 flex items-center gap-2">
                <UserCheck className="w-4 h-4" />
                Data Quality Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-secondary-pink">
                {statsLoading ? "..." : (stats?.overallDataQuality || 0)}%
              </div>
              <p className="text-xs text-slate-400">Real-time data analysis</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-600">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-300 flex items-center gap-2">
                <Building className="w-4 h-4" />
                Platform Source
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm font-bold text-green-400">
                Data API v3
              </div>
              <p className="text-xs text-slate-400">Integrated System</p>
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
              <p className="text-xs text-slate-400">Supabase Edge Functions</p>
            </CardContent>
          </Card>
        </div>

        {/* Growth Accelerator Platform Statistics */}
        {stats?.totalCandidates > 0 && (
          <div className="mb-8">
            <Card className="bg-slate-800 border-slate-600">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  📊 Growth Accelerator Platform - Statistics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-slate-300">Data Quality Metrics</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-400">With Email:</span>
                        <span className="text-white">{stats.qualityMetrics?.withEmail || 0} ({stats.percentages?.email || 0}%)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">With Phone:</span>
                        <span className="text-white">{stats.qualityMetrics?.withPhone || 0} ({stats.percentages?.phone || 0}%)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">With Location:</span>
                        <span className="text-white">{stats.qualityMetrics?.withLocation || 0} ({stats.percentages?.location || 0}%)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">With Position:</span>
                        <span className="text-green-400">{stats.qualityMetrics?.withPosition || 0} ({stats.percentages?.position || 0}%)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">With Company:</span>
                        <span className="text-white">{stats.qualityMetrics?.withCompany || 0} ({stats.percentages?.company || 0}%)</span>
                      </div>
                       <div className="flex justify-between">
                         <span className="text-slate-400">System ID:</span>
                         <span className="text-blue-400">{stats.qualityMetrics?.withWorkableId || 0} ({stats.percentages?.workableId || 0}%)</span>
                       </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-slate-300">Platform Information</h4>
                     <div className="space-y-1 text-sm">
                     <div className="flex justify-between">
                       <span className="text-slate-400">Data Source:</span>
                       <span className="text-white">Integrated System</span>
                     </div>
                       <div className="flex justify-between">
                         <span className="text-slate-400">API Version:</span>
                         <span className="text-white">API v3</span>
                       </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Implementation:</span>
                        <span className="text-secondary-pink">Supabase Edge Functions</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Loaded at:</span>
                        <span className="text-white">{new Date().toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-slate-300">Additional Metrics</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-400">With Skills:</span>
                        <span className="text-white">{stats?.qualityMetrics?.withSkills || 0} ({stats?.percentages?.skills || 0}%)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">With LinkedIn:</span>
                        <span className="text-blue-400">{stats?.qualityMetrics?.withLinkedIn || 0} ({stats?.percentages?.linkedIn || 0}%)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">With Photo:</span>
                        <span className="text-white">{stats?.qualityMetrics?.withPhoto || 0} ({stats?.percentages?.photo || 0}%)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Overall Score:</span>
                        <span className="text-secondary-pink font-bold">{stats?.overallDataQuality || 0}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        
        {/* Loading Status */}
        {isBulkLoading && (
          <div className="mb-8">
            <Card className="bg-slate-800 border-slate-600">
              <CardContent className="pt-6">
                 <div className="flex items-center justify-center gap-3">
                   <Loader2 className="w-5 h-5 animate-spin text-secondary-pink" />
                   <p className="text-white">Loading all candidates...</p>
                 </div>
                 <p className="text-xs text-slate-400 text-center mt-2">
                   This may take a few minutes to complete. Please wait...
                 </p>
              </CardContent>
            </Card>
          </div>
        )}
        
        <CandidatesList />
      </div>
    </div>
  );
};

export default CRM;