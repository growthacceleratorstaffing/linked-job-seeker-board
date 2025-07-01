
import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { AddCandidateDialog } from "./AddCandidateDialog";
import { CandidateProfileCard } from "./CandidateProfileCard";
import { IntegrationSyncPanel } from "./IntegrationSyncPanel";
import { Search, Mail, Phone, ExternalLink, Users } from "lucide-react";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/useDebounce";

type Candidate = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  linkedin_profile_url: string | null;
  linkedin_id: string | null;
  workable_candidate_id: string | null;
  profile_picture_url: string | null;
  location: string | null;
  current_position: string | null;
  company: string | null;
  skills: any[] | null;
  experience_years: number | null;
  source_platform: string | null;
  last_synced_at: string | null;
  profile_completeness_score: number | null;
  created_at: string;
};

export const CandidatesList = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const candidatesPerPage = 25;
  const queryClient = useQueryClient();

  // Debounce search term to reduce API calls
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  // Memoize query key to prevent unnecessary re-renders
  const queryKey = useMemo(() => 
    ["candidates", debouncedSearchTerm, sourceFilter, currentPage],
    [debouncedSearchTerm, sourceFilter, currentPage]
  );

  const { data: candidatesData, isLoading, error } = useQuery({
    queryKey,
    queryFn: async () => {
      console.log('Fetching candidates with search:', debouncedSearchTerm, 'filter:', sourceFilter, 'page:', currentPage);
      
      let query = supabase
        .from("candidates")
        .select("*", { count: 'exact' })
        .order("created_at", { ascending: false });

      if (debouncedSearchTerm) {
        query = query.or(`name.ilike.%${debouncedSearchTerm}%,email.ilike.%${debouncedSearchTerm}%,company.ilike.%${debouncedSearchTerm}%,current_position.ilike.%${debouncedSearchTerm}%`);
      }

      if (sourceFilter !== "all") {
        query = query.eq("source_platform", sourceFilter);
      }

      const from = (currentPage - 1) * candidatesPerPage;
      const to = from + candidatesPerPage - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;
      if (error) {
        console.error('Error fetching candidates:', error);
        throw error;
      }
      
      console.log('Fetched candidates:', data?.length, 'candidates, total:', count);
      return { candidates: data as Candidate[], totalCount: count || 0 };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  const candidates = candidatesData?.candidates || [];
  const totalCount = candidatesData?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / candidatesPerPage);

  // Reset to first page when search or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, sourceFilter]);

  // Optimize response counts query with longer cache time
  const { data: responseCounts } = useQuery({
    queryKey: ["candidate-response-counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("candidate_responses")
        .select("candidate_id");
      
      if (error) throw error;
      
      const counts: Record<string, number> = {};
      data?.forEach(response => {
        counts[response.candidate_id] = (counts[response.candidate_id] || 0) + 1;
      });
      
      return counts;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
  });

  // Optimize real-time subscription with cleanup
  useEffect(() => {
    const channel = supabase
      .channel('candidates-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'candidates'
        },
        (payload) => {
          console.log('Candidate updated:', payload);
          queryClient.invalidateQueries({ queryKey: ["candidates"] });
          
          if (payload.eventType === 'INSERT') {
            toast.success(`New candidate added: ${(payload.new as any).name}`);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'integration_sync_logs'
        },
        (payload) => {
          const newData = payload.new as any;
          if (newData?.integration_type === 'workable' && newData?.status === 'success') {
            console.log('Workable sync completed');
            queryClient.invalidateQueries({ queryKey: ["candidates"] });
            queryClient.invalidateQueries({ queryKey: ["crm-stats"] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const enrichCandidateMutation = useMutation({
    mutationFn: async (candidateId: string) => {
      const { data, error } = await supabase.functions.invoke('linkedin-integration', {
        body: { 
          action: 'enrich_candidate',
          candidateData: { candidateId }
        }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Candidate profile enriched");
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
    },
    onError: (error: any) => {
      toast.error(`Failed to enrich candidate: ${error.message}`);
    }
  });

  // Memoize utility functions to prevent re-renders
  const getSourceBadgeColor = useCallback((source: string | null) => {
    switch (source) {
      case 'linkedin': return 'bg-blue-100 text-blue-800';
      case 'workable': return 'bg-green-100 text-green-800';
      case 'manual': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }, []);

  const getCompletenessColor = useCallback((score: number | null) => {
    if (!score) return 'text-gray-400';
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const getPaginationRange = useCallback(() => {
    const delta = 2;
    const range = [];
    const rangeWithDots = [];

    for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
      range.push(i);
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, '...');
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push('...', totalPages);
    } else if (totalPages > 1) {
      rangeWithDots.push(totalPages);
    }

    return rangeWithDots.filter((item, index, arr) => arr.indexOf(item) === index);
  }, [currentPage, totalPages]);

  if (isLoading) {
    return <div className="flex justify-center p-4">Loading candidates...</div>;
  }

  if (error) {
    console.error('Candidates query error:', error);
    return (
      <div className="flex flex-col justify-center items-center p-8 space-y-4">
        <div className="text-red-500">Error loading candidates: {(error as any).message}</div>
        <Button onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex gap-4 items-center">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search candidates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-slate-800 border-slate-700 text-white placeholder:text-slate-400"
            />
          </div>
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="px-3 py-2 border rounded-md text-sm bg-slate-800 border-slate-700 text-white"
          >
            <option value="all">All Sources</option>
            <option value="manual">Manual</option>
            <option value="linkedin">LinkedIn</option>
            <option value="workable">Workable</option>
          </select>
        </div>
        <div className="flex gap-2">
          <Button className="bg-secondary-pink hover:bg-secondary-pink/90 text-white">
            <Users className="h-4 w-4 mr-2" />
            Add Candidate
          </Button>
        </div>
      </div>

      <IntegrationSyncPanel />

      {candidates && candidates.length > 0 ? (
        <div className="rounded-lg border border-slate-700 bg-slate-800/50 backdrop-blur">
          <div className="p-4 border-b border-slate-700">
            <p className="text-sm text-slate-300">
              Showing {candidates.length} of {totalCount} candidate{totalCount !== 1 ? 's' : ''}
              {searchTerm && ` matching "${searchTerm}"`}
              {sourceFilter !== "all" && ` from ${sourceFilter}`}
              {totalPages > 1 && ` (Page ${currentPage} of ${totalPages})`}
            </p>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="border-slate-700 hover:bg-slate-700/50">
                <TableHead className="w-[300px] text-slate-300">Candidate</TableHead>
                <TableHead className="w-[250px] text-slate-300">Contact</TableHead>
                <TableHead className="w-[120px] text-slate-300">Source</TableHead>
                <TableHead className="w-[100px] text-slate-300">Score</TableHead>
                <TableHead className="w-[120px] text-slate-300">Responses</TableHead>
                <TableHead className="w-[120px] text-slate-300">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {candidates.map((candidate) => (
                <TableRow key={candidate.id} className="border-slate-700 hover:bg-slate-700/30">
                  <TableCell className="w-[300px]">
                    <div className="flex items-center gap-3">
                      {candidate.profile_picture_url ? (
                        <img
                          src={candidate.profile_picture_url}
                          alt={candidate.name}
                          className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-medium text-white">
                            {candidate.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="font-medium truncate text-white">{candidate.name}</div>
                        {candidate.current_position && (
                          <div className="text-sm text-slate-400 truncate">
                            {candidate.current_position}
                            {candidate.company && ` at ${candidate.company}`}
                          </div>
                        )}
                        {candidate.location && (
                          <div className="text-xs text-slate-500 truncate">{candidate.location}</div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="w-[250px]">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm text-slate-300">
                        <Mail className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{candidate.email}</span>
                      </div>
                      {candidate.phone && (
                        <div className="flex items-center gap-2 text-sm text-slate-400">
                          <Phone className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{candidate.phone}</span>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="w-[120px]">
                    <Badge 
                      variant="secondary" 
                      className={`${getSourceBadgeColor(candidate.source_platform)} text-xs`}
                    >
                      {candidate.source_platform || 'manual'}
                    </Badge>
                  </TableCell>
                  <TableCell className="w-[100px]">
                    <div className={`text-sm font-medium ${getCompletenessColor(candidate.profile_completeness_score)}`}>
                      {candidate.profile_completeness_score || 0}%
                    </div>
                  </TableCell>
                  <TableCell className="w-[120px]">
                    <Badge variant="secondary" className="text-xs bg-slate-700 text-slate-300">
                      {responseCounts?.[candidate.id] || 0} responses
                    </Badge>
                  </TableCell>
                  <TableCell className="w-[120px]">
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedCandidate(candidate)}
                        className="text-xs px-2 text-slate-300 hover:text-white hover:bg-slate-700"
                      >
                        View
                      </Button>
                      {candidate.linkedin_profile_url && (
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                          className="px-2 text-slate-300 hover:text-white hover:bg-slate-700"
                        >
                          <a
                            href={candidate.linkedin_profile_url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <div className="p-4 border-t border-slate-700">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                      className={`${currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer hover:bg-slate-700"} text-slate-300`}
                    />
                  </PaginationItem>

                  {getPaginationRange().map((page, index) => (
                    <PaginationItem key={index}>
                      {page === '...' ? (
                        <span className="px-3 py-2 text-sm text-slate-400">...</span>
                      ) : (
                        <PaginationLink
                          onClick={() => handlePageChange(page as number)}
                          isActive={currentPage === page}
                          className={`cursor-pointer ${currentPage === page ? 'bg-secondary-pink text-white' : 'text-slate-300 hover:bg-slate-700 hover:text-white'}`}
                        >
                          {page}
                        </PaginationLink>
                      )}
                    </PaginationItem>
                  ))}

                  <PaginationItem>
                    <PaginationNext 
                      onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                      className={`${currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer hover:bg-slate-700"} text-slate-300`}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-slate-700 bg-slate-800/50 backdrop-blur p-8 text-center">
          <Users className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2 text-white">No candidates found</h3>
          <p className="text-slate-400 mb-4">
            {searchTerm || sourceFilter !== "all" 
              ? "Try adjusting your search or filters" 
              : "Get started by adding candidates manually"}
          </p>
          <div className="flex gap-2 justify-center">
            <Button 
              onClick={() => setShowAddDialog(true)}
              className="bg-secondary-pink hover:bg-secondary-pink/90 text-white"
            >
              <Users className="h-4 w-4 mr-2" />
              Add Candidate
            </Button>
          </div>
        </div>
      )}

      <AddCandidateDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["candidates"] });
          queryClient.invalidateQueries({ queryKey: ["crm-stats"] });
        }}
      />

      {selectedCandidate && (
        <CandidateProfileCard
          candidate={selectedCandidate}
          open={!!selectedCandidate}
          onOpenChange={(open) => !open && setSelectedCandidate(null)}
          onEnrich={() => enrichCandidateMutation.mutate(selectedCandidate.id)}
          isEnriching={enrichCandidateMutation.isPending}
        />
      )}
    </div>
  );
};
