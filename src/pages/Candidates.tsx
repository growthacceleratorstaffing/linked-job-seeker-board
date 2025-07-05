import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, Search, Filter, Plus, RefreshCw, Mail, Phone, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/Layout";

interface Candidate {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  location: string | null;
  current_position: string | null;
  company: string | null;
  source_platform: string | null;
  profile_completeness_score: number | null;
  interview_stage: string | null;
  created_at: string;
}

const Candidates = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [candidatesPerPage] = useState(50);
  const [isBulkLoading, setIsBulkLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch candidates with React Query
  const { data: candidatesData, isLoading } = useQuery({
    queryKey: ["all-candidates", searchTerm, currentPage],
    queryFn: async () => {
      console.log('Fetching candidates with search:', searchTerm, 'page:', currentPage);
      
      let query = supabase
        .from("candidates")
        .select("*", { count: 'exact' })
        .order("created_at", { ascending: false });

      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,company.ilike.%${searchTerm}%,current_position.ilike.%${searchTerm}%`);
      }

      const from = (currentPage - 1) * candidatesPerPage;
      const to = from + candidatesPerPage - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;
      if (error) throw error;
      
      return { candidates: data as Candidate[], totalCount: count || 0 };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const candidates = candidatesData?.candidates || [];
  const totalCount = candidatesData?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / candidatesPerPage);

  // Auto-sync candidates when component mounts if no candidates exist
  useEffect(() => {
    const autoSyncCandidates = async () => {
      try {
        // Check if we have candidates first
        const { count } = await supabase
          .from("candidates")
          .select("*", { count: 'exact', head: true });

        // Only bulk load if we have significantly fewer candidates than expected (~1600)
        if ((count || 0) < 1500) {
          console.log('Auto-loading all candidates from JobAdder/Workable...');
          setIsBulkLoading(true);
          
          let data, error;
          let platform = 'Unknown';
          
          // Try JobAdder first
          try {
            const jobadderResult = await supabase.functions.invoke('jobadder-integration', {
              body: { action: 'load_all_candidates' }
            });
            
            if (jobadderResult.error) throw jobadderResult.error;
            data = jobadderResult.data;
            platform = 'JobAdder';
            
          } catch (jobadderError) {
            console.log('JobAdder auto-sync failed, trying Workable...', jobadderError);
            
            // Fallback to Workable
            const workableResult = await supabase.functions.invoke('workable-integration', {
              body: { action: 'load_all_candidates' }
            });

            if (workableResult.error) throw workableResult.error;
            data = workableResult.data;
            platform = 'Workable';
          }

          if (data && data.success) {
            console.log('Auto bulk load completed:', data);
            toast({
              title: "All candidates loaded! 🎉",
              description: `Successfully loaded ${data.syncedCandidates} out of ${data.totalCandidates} candidates from ${platform}`,
            });
            
            // Invalidate queries to refresh the UI
            queryClient.invalidateQueries({ queryKey: ["all-candidates"] });
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

  const syncAllCandidates = async () => {
    setIsBulkLoading(true);
    try {
      console.log('Starting candidate sync from JobAdder/Workable...');
      
      let data, error;
      let platform = 'Unknown';
      
      // Try JobAdder first
      try {
        const jobadderResult = await supabase.functions.invoke('jobadder-integration', {
          body: { action: 'load_all_candidates' }
        });
        
        if (jobadderResult.error) throw jobadderResult.error;
        data = jobadderResult.data;
        platform = 'JobAdder';
        
      } catch (jobadderError) {
        console.log('JobAdder sync failed, trying Workable...', jobadderError);
        
        // Fallback to Workable
        const workableResult = await supabase.functions.invoke('workable-integration', {
          body: { action: 'load_all_candidates' }
        });

        if (workableResult.error) throw workableResult.error;
        data = workableResult.data;
        platform = 'Workable';
      }

      if (data?.error) {
        console.error('Function returned error:', data.error);
        throw new Error(data.error);
      }

      console.log('Sync completed successfully:', data);
      
      toast({
        title: "Sync completed! 🎉",
        description: `Successfully loaded ${data.syncedCandidates} out of ${data.totalCandidates} candidates from ${platform}`,
      });

      // Refresh the candidates list
      queryClient.invalidateQueries({ queryKey: ["all-candidates"] });
    } catch (error) {
      console.error('Error syncing candidates:', error);
      
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to sync candidates from JobAdder/Workable';
        
      toast({
        title: "Sync failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsBulkLoading(false);
    }
  };

  // Reset to first page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const getSourceBadge = (source: string | null) => {
    if (source === 'workable') {
      return <Badge className="bg-blue-500/20 text-blue-400 border-blue-400">Workable</Badge>;
    } else if (source === 'jobadder') {
      return <Badge className="bg-green-500/20 text-green-400 border-green-400">JobAdder</Badge>;
    } else if (source === 'manual') {
      return <Badge className="bg-secondary-pink/20 text-secondary-pink border-secondary-pink">Manual</Badge>;
    }
    return <Badge variant="outline">Unknown</Badge>;
  };

  const activeCandidates = candidates.filter(c => c.interview_stage === 'pending' || c.interview_stage === 'in_progress').length;
  const workableCandidates = candidates.filter(c => c.source_platform === 'workable').length;
  const jobadderCandidates = candidates.filter(c => c.source_platform === 'jobadder').length;

  return (
    <Layout>
      <div className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Candidates</h1>
          <p className="text-slate-300">Manage and track all candidates</p>
        </div>

        <div className="flex items-center justify-between mb-6">
          <div></div>
          <div className="flex gap-2">
            <Button 
              onClick={syncAllCandidates}
              disabled={isBulkLoading}
              variant="outline"
              className="border-secondary-pink text-secondary-pink hover:bg-secondary-pink hover:text-white"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isBulkLoading ? 'animate-spin' : ''}`} />
              Sync All Candidates
            </Button>
            <Button className="bg-secondary-pink hover:bg-secondary-pink/80">
              <Plus className="mr-2 h-4 w-4" />
              Add Candidate
            </Button>
          </div>
        </div>

        <div className="flex gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Search candidates..." 
                className="pl-10 bg-slate-800 border-slate-700 text-white placeholder:text-slate-400"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <Button 
            variant="outline"
            className="border-secondary-pink text-secondary-pink hover:bg-secondary-pink hover:text-white"
          >
            <Filter className="mr-2 h-4 w-4" />
            Filters
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6">
          <Card className="bg-primary-blue border border-white/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-white">Total Candidates</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{totalCount}</div>
              <p className="text-xs text-slate-400">All time</p>
            </CardContent>
          </Card>

          <Card className="bg-primary-blue border border-white/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-white">Active</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{activeCandidates}</div>
              <p className="text-xs text-slate-400">In process</p>
            </CardContent>
          </Card>

          <Card className="bg-primary-blue border border-white/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-white">From Integrations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{workableCandidates + jobadderCandidates}</div>
              <p className="text-xs text-slate-400">JobAdder + Workable</p>
            </CardContent>
          </Card>

          <Card className="bg-primary-blue border border-white/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-white">This Month</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {candidates.filter(c => 
                  new Date(c.created_at).getMonth() === new Date().getMonth()
                ).length}
              </div>
              <p className="text-xs text-slate-400">New candidates</p>
            </CardContent>
          </Card>
        </div>

        {/* Loading Status */}
        {isBulkLoading && (
          <div className="mb-8">
            <Card className="bg-slate-800 border-slate-600">
              <CardContent className="pt-6">
                <div className="flex items-center justify-center gap-3">
                  <Loader2 className="w-5 h-5 animate-spin text-secondary-pink" />
                  <p className="text-white">Loading all candidates from JobAdder/Workable...</p>
                </div>
                <p className="text-xs text-slate-400 text-center mt-2">
                  This may take a few minutes to complete. Please wait...
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        <Card className="bg-primary-blue border border-white/20">
          <CardHeader>
            <CardTitle className="flex items-center text-white">
              <Users className="mr-2 h-5 w-5 text-secondary-pink" />
              Candidate List
            </CardTitle>
            <CardDescription className="text-slate-400">
              {totalCount} candidates from JobAdder and Workable integrations
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center p-4 text-white">Loading candidates...</div>
            ) : candidates.length > 0 ? (
              <>
                <div className="mb-4 flex items-center justify-between">
                  <div className="text-sm text-slate-400">
                    Showing {((currentPage - 1) * candidatesPerPage) + 1} to {Math.min(currentPage * candidatesPerPage, totalCount)} of {totalCount} candidates
                    {totalPages > 1 && ` (Page ${currentPage} of ${totalPages})`}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => goToPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="border-slate-600 text-slate-400 hover:bg-slate-700"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-slate-400">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => goToPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="border-slate-600 text-slate-400 hover:bg-slate-700"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-600">
                      <TableHead className="text-slate-300">Name</TableHead>
                      <TableHead className="text-slate-300">Contact</TableHead>
                      <TableHead className="text-slate-300">Position</TableHead>
                      <TableHead className="text-slate-300">Source</TableHead>
                      <TableHead className="text-slate-300">Score</TableHead>
                      <TableHead className="text-slate-300">Added</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {candidates.map((candidate) => (
                    <TableRow key={candidate.id} className="border-slate-600 hover:bg-slate-700">
                      <TableCell className="text-white font-medium">
                        <div>
                          <div>{candidate.name}</div>
                          {candidate.company && (
                            <div className="text-sm text-slate-400">{candidate.company}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-400">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Mail className="w-3 h-3" />
                            <span className="text-xs">{candidate.email}</span>
                          </div>
                          {candidate.phone && (
                            <div className="flex items-center gap-2">
                              <Phone className="w-3 h-3" />
                              <span className="text-xs">{candidate.phone}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-400">
                        {candidate.current_position || 'Not specified'}
                      </TableCell>
                      <TableCell>
                        {getSourceBadge(candidate.source_platform)}
                      </TableCell>
                      <TableCell className="text-slate-400">
                        {candidate.profile_completeness_score || 0}%
                      </TableCell>
                      <TableCell className="text-slate-400">
                        {new Date(candidate.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                </Table>
              </>
            ) : (
              <div className="text-center py-12 text-slate-400">
                <Users className="mx-auto h-12 w-12 mb-4 text-secondary-pink" />
                <h3 className="text-lg font-semibold mb-2 text-white">
                  {searchTerm ? 'No matching candidates found' : 'No candidates yet'}
                </h3>
                <p>
                  {searchTerm 
                    ? "Try adjusting your search criteria" 
                    : "Click \"Sync All Candidates\" to import from JobAdder/Workable or add them manually"
                  }
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Candidates;