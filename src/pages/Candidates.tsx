import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Search, Filter, Plus, RefreshCw, Mail, Phone, ChevronLeft, ChevronRight, Loader2, Lock, Edit } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useWorkablePermissions } from "@/hooks/useWorkablePermissions";
import { useAuth } from "@/hooks/useAuth";
import Layout from "@/components/Layout";
import { AddCandidateDialog } from "@/components/crm/AddCandidateDialog";
import type { Database } from "@/integrations/supabase/types";

type InterviewStage = Database["public"]["Enums"]["interview_stage"];

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
  interview_stage: InterviewStage | null;
  created_at: string;
}

const Candidates = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [candidatesPerPage] = useState(50);
  const [isBulkLoading, setIsBulkLoading] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [activeTab, setActiveTab] = useState('applicants');
  const { permissions } = useWorkablePermissions();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch candidates with React Query
  const { data: candidatesData, isLoading } = useQuery({
    queryKey: ["all-candidates", searchTerm, currentPage, activeTab, user?.id],
    queryFn: async () => {
      console.log('Fetching candidates with search:', searchTerm, 'page:', currentPage, 'tab:', activeTab);
      
      // For standard members, get their assigned jobs first
      let assignedJobIds: string[] = [];
      if (!permissions.admin && user?.id) {
        const { data: workableUser } = await supabase
          .from('workable_users')
          .select('assigned_jobs')
          .eq('user_id', user.id)
          .single();
          
        assignedJobIds = workableUser?.assigned_jobs || [];
        
        // If no assigned jobs, return empty result
        if (assignedJobIds.length === 0) {
          return { candidates: [], totalCount: 0 };
        }
      }
      
      let query = supabase
        .from("candidates")
        .select("*", { count: 'exact' })
        .order("last_synced_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });

      // Filter by tab - Applicants vs Talent Pool (FINAL CORRECT VERSION)
      if (activeTab === 'applicants') {
        // Applicants shows advanced stage candidates (101 candidates)
        query = query.in('interview_stage', ['phone_screen', 'interview', 'pending', 'in_progress', 'completed', 'offer', 'passed', 'hired', 'failed', 'rejected', 'withdrawn']);
      } else {
        // Talent Pool shows early stage candidates (1 candidate)
        query = query.in('interview_stage', ['sourced', 'applied']);
      }

      // For standard members, filter candidates by job responses to assigned jobs
      if (!permissions.admin && assignedJobIds.length > 0) {
        // Get candidate IDs that have responses to assigned jobs
        const { data: responses } = await supabase
          .from('candidate_responses')
          .select('candidate_id')
          .in('job_id', assignedJobIds);
          
        const candidateIds = responses?.map(r => r.candidate_id) || [];
        
        if (candidateIds.length === 0) {
          return { candidates: [], totalCount: 0 };
        }
        
        query = query.in('id', candidateIds);
      }

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
    enabled: !!user, // Only run when user is available
  });

  const candidates = candidatesData?.candidates || [];
  const totalCount = candidatesData?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / candidatesPerPage);

  // Update stage mutation
  const updateStageMutation = useMutation({
    mutationFn: async ({ candidateId, newStage }: { candidateId: string, newStage: InterviewStage }) => {
      const { error } = await supabase
        .from('candidates')
        .update({ interview_stage: newStage })
        .eq('id', candidateId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-candidates"] });
      queryClient.invalidateQueries({ queryKey: ["applicants-count"] });
      queryClient.invalidateQueries({ queryKey: ["talent-pool-count"] });
      toast({
        title: "Stage updated",
        description: "Candidate stage has been updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

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
          console.log('Auto-loading all candidates from Workable...');
          setIsBulkLoading(true);
          
          // Load from Workable
          const workableResult = await supabase.functions.invoke('workable-integration', {
            body: { action: 'load_all_candidates' }
          });
          
          if (workableResult.error) throw workableResult.error;
          const data = workableResult.data;
          const platform = 'Workable';

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
      console.log('Starting candidate sync from Workable...');
      
      // Load from Workable
      const workableResult = await supabase.functions.invoke('workable-integration', {
        body: { action: 'load_all_candidates' }
      });

      if (workableResult.error) throw workableResult.error;
      const data = workableResult.data;
      const platform = 'Workable';

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
      queryClient.invalidateQueries({ queryKey: ["applicants-count"] });
      queryClient.invalidateQueries({ queryKey: ["talent-pool-count"] });
    } catch (error) {
      console.error('Error syncing candidates:', error);
      
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to sync candidates from Workable';
        
      toast({
        title: "Sync failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsBulkLoading(false);
    }
  };

  // Reset to first page when search changes or tab changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, activeTab]);

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const getSourceBadge = (source: string | null) => {
    if (source === 'workable') {
      return <Badge className="bg-blue-500/20 text-blue-400 border-blue-400">Workable</Badge>;
    } else if (source === 'manual') {
      return <Badge className="bg-secondary-pink/20 text-secondary-pink border-secondary-pink">Manual</Badge>;
    }
    return <Badge variant="outline">Unknown</Badge>;
  };

  // Get counts for both tabs (FINAL CORRECT VERSION)
  const { data: applicantsCount } = useQuery({
    queryKey: ["applicants-count", user?.id],
    queryFn: async () => {
      let query = supabase
        .from("candidates")
        .select("*", { count: 'exact', head: true })
        .in('interview_stage', ['phone_screen', 'interview', 'pending', 'in_progress', 'completed', 'offer', 'passed', 'hired', 'failed', 'rejected', 'withdrawn']);
      
      const { count } = await query;
      return count || 0;
    },
    enabled: !!user,
  });

  const { data: talentPoolCount } = useQuery({
    queryKey: ["talent-pool-count", user?.id],
    queryFn: async () => {
      let query = supabase
        .from("candidates")
        .select("*", { count: 'exact', head: true })
        .in('interview_stage', ['sourced', 'applied']);
      
      const { count } = await query;
      return count || 0;
    },
    enabled: !!user,
  });

  const activeCandidates = candidates.filter(c => c.interview_stage === 'pending' || c.interview_stage === 'in_progress').length;
  const workableCandidates = candidates.filter(c => c.source_platform === 'workable').length;

  
  // Force refresh of count queries to show corrected numbers
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ["applicants-count"] });
    queryClient.invalidateQueries({ queryKey: ["talent-pool-count"] });
  }, [queryClient]);

  const getStageColor = (stage: InterviewStage | null) => {
    switch (stage) {
      case 'sourced': return 'bg-purple-500/20 text-purple-400 border-purple-400';
      case 'applied': return 'bg-blue-500/20 text-blue-400 border-blue-400';
      case 'phone_screen': return 'bg-cyan-500/20 text-cyan-400 border-cyan-400';
      case 'interview': return 'bg-orange-500/20 text-orange-400 border-orange-400';
      case 'pending': return 'bg-yellow-500/20 text-yellow-400 border-yellow-400';
      case 'in_progress': return 'bg-blue-600/20 text-blue-600 border-blue-600';
      case 'completed': return 'bg-green-500/20 text-green-400 border-green-400';
      case 'offer': return 'bg-emerald-500/20 text-emerald-400 border-emerald-400';
      case 'passed': return 'bg-emerald-600/20 text-emerald-600 border-emerald-600';
      case 'hired': return 'bg-green-600/20 text-green-600 border-green-600';
      case 'failed': return 'bg-red-500/20 text-red-400 border-red-400';
      case 'rejected': return 'bg-red-600/20 text-red-600 border-red-600';
      case 'withdrawn': return 'bg-gray-500/20 text-gray-400 border-gray-400';
      default: return 'bg-slate-500/20 text-slate-400 border-slate-400';
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Applications & Talent Pool</h1>
          <p className="text-slate-300">Manage job applications and talent pipeline</p>
        </div>

        <div className="flex items-center justify-between mb-6">
          <div></div>
          <div className="flex gap-2">
            {permissions.admin && (
              <Button 
                onClick={syncAllCandidates}
                disabled={isBulkLoading}
                variant="outline"
                className="border-secondary-pink text-secondary-pink hover:bg-secondary-pink hover:text-white"
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${isBulkLoading ? 'animate-spin' : ''}`} />
                Sync All Candidates
              </Button>
            )}
            {permissions.admin ? (
              <Button 
                onClick={() => setShowAddDialog(true)}
                className="bg-secondary-pink hover:bg-secondary-pink/80"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Candidate
              </Button>
            ) : (
              <Button 
                disabled
                className="bg-slate-600 text-slate-400 cursor-not-allowed"
              >
                <Lock className="mr-2 h-4 w-4" />
                Admin Only
              </Button>
            )}
          </div>
        </div>

        <div className="flex gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Search by candidate name, job title, or company..." 
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
              <div className="text-2xl font-bold text-white">{(applicantsCount || 0) + (talentPoolCount || 0)}</div>
              <p className="text-xs text-slate-400">All time</p>
            </CardContent>
          </Card>

          <Card className="bg-primary-blue border border-white/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-white">Active Applications</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{applicantsCount || 0}</div>
              <p className="text-xs text-slate-400">In hiring process</p>
            </CardContent>
          </Card>

          <Card className="bg-primary-blue border border-white/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-white">Talent Pool</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{talentPoolCount || 0}</div>
              <p className="text-xs text-slate-400">Available candidates</p>
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
                  <p className="text-white">Loading all candidates from Workable...</p>
                </div>
                <p className="text-xs text-slate-400 text-center mt-2">
                  This may take a few minutes to complete. Please wait...
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList className="bg-slate-800 border-slate-600">
            <TabsTrigger 
              value="applicants" 
              className="data-[state=active]:bg-secondary-pink data-[state=active]:text-white"
            >
              Applicants ({applicantsCount || 0})
            </TabsTrigger>
            <TabsTrigger 
              value="talent-pool"
              className="data-[state=active]:bg-blue-500 data-[state=active]:text-white"
            >
              Talent Pool ({talentPoolCount || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="applicants">
            <Card className="bg-primary-blue border border-white/20">
              <CardContent className="pt-6">
                {isLoading ? (
                  <div className="flex justify-center p-4 text-white">Loading applicants...</div>
                ) : candidates.length > 0 ? (
                  <>
                    <div className="mb-4 flex items-center justify-between">
                      <div className="text-sm text-slate-400">
                        Showing {((currentPage - 1) * candidatesPerPage) + 1} to {Math.min(currentPage * candidatesPerPage, totalCount)} of {totalCount} applicants
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
                          <TableHead className="text-slate-300">Current Stage</TableHead>
                          <TableHead className="text-slate-300">Source</TableHead>
                          <TableHead className="text-slate-300">Added</TableHead>
                          {permissions.admin && <TableHead className="text-slate-300">Update Stage</TableHead>}
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
                            <Badge className={getStageColor(candidate.interview_stage)}>
                              {candidate.interview_stage || 'Unknown'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {getSourceBadge(candidate.source_platform)}
                          </TableCell>
                          <TableCell className="text-slate-400">
                            {new Date(candidate.created_at).toLocaleDateString()}
                          </TableCell>
                          {permissions.admin && (
                            <TableCell>
                              <Select
                                value={candidate.interview_stage || 'pending'}
                                onValueChange={(value) => updateStageMutation.mutate({ candidateId: candidate.id, newStage: value as InterviewStage })}
                              >
                                <SelectTrigger className="w-32 bg-slate-800 border-slate-600">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="sourced">Sourced</SelectItem>
                                  <SelectItem value="applied">Applied</SelectItem>
                                  <SelectItem value="phone_screen">Phone Screen</SelectItem>
                                  <SelectItem value="interview">Interview</SelectItem>
                                  <SelectItem value="pending">Pending</SelectItem>
                                  <SelectItem value="in_progress">In Progress</SelectItem>
                                  <SelectItem value="completed">Completed</SelectItem>
                                  <SelectItem value="offer">Offer</SelectItem>
                                  <SelectItem value="passed">Passed</SelectItem>
                                  <SelectItem value="hired">Hired</SelectItem>
                                  <SelectItem value="failed">Failed</SelectItem>
                                  <SelectItem value="rejected">Rejected</SelectItem>
                                  <SelectItem value="withdrawn">Withdrawn</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                          )}
                        </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </>
                ) : (
                  <div className="text-center py-8 text-slate-400">
                    No applicants found
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="talent-pool">
            <Card className="bg-primary-blue border border-white/20">
              <CardContent className="pt-6">
                {isLoading ? (
                  <div className="flex justify-center p-4 text-white">Loading talent pool...</div>
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
                          <TableHead className="text-slate-300">Status</TableHead>
                          <TableHead className="text-slate-300">Source</TableHead>
                          <TableHead className="text-slate-300">Added</TableHead>
                          {permissions.admin && <TableHead className="text-slate-300">Actions</TableHead>}
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
                            <Badge className="bg-blue-500/20 text-blue-400 border-blue-400">
                              Available for opportunities
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {getSourceBadge(candidate.source_platform)}
                          </TableCell>
                          <TableCell className="text-slate-400">
                            {new Date(candidate.created_at).toLocaleDateString()}
                          </TableCell>
                          {permissions.admin && (
                            <TableCell>
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-secondary-pink text-secondary-pink hover:bg-secondary-pink hover:text-white"
                                onClick={() => updateStageMutation.mutate({ candidateId: candidate.id, newStage: 'sourced' })}
                              >
                                <Edit className="w-3 h-3 mr-1" />
                                Move to Applicants
                              </Button>
                            </TableCell>
                          )}
                        </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </>
                ) : (
                  <div className="text-center py-8 text-slate-400">
                    No candidates in talent pool
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Add Candidate Dialog */}
        <AddCandidateDialog 
          open={showAddDialog}
          onOpenChange={setShowAddDialog}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["all-candidates"] });
            queryClient.invalidateQueries({ queryKey: ["applicants-count"] });
            queryClient.invalidateQueries({ queryKey: ["talent-pool-count"] });
          }}
        />
      </div>
    </Layout>
  );
};

export default Candidates;