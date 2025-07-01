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
import { Search, Mail, Phone, ExternalLink, Users, MapPin, Building, Calendar } from "lucide-react";
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
  const candidatesPerPage = 10; // Reduced for better pagination
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
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  }, [totalPages]);

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
    return <div className="flex justify-center p-4 text-white">Loading candidates...</div>;
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
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex gap-4 items-center">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search candidates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white"
            />
          </div>
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="px-3 py-2 border rounded-md text-sm bg-white"
          >
            <option value="all">All Sources</option>
            <option value="manual">Manual</option>
            <option value="linkedin">LinkedIn</option>
            <option value="workable">Workable</option>
          </select>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => setShowAddDialog(true)}
            className="bg-secondary-pink hover:bg-secondary-pink/90 text-white"
          >
            <Users className="h-4 w-4 mr-2" />
            Add Candidate
          </Button>
        </div>
      </div>

      <IntegrationSyncPanel />

      {candidates && candidates.length > 0 ? (
        <div className="rounded-md border bg-white shadow-sm">
          <div className="p-4 border-b bg-gray-50">
            <p className="text-sm text-muted-foreground">
              Showing {candidates.length} of {totalCount} candidate{totalCount !== 1 ? 's' : ''}
              {searchTerm && ` matching "${searchTerm}"`}
              {sourceFilter !== "all" && ` from ${sourceFilter}`}
              {totalPages > 1 && ` (Page ${currentPage} of ${totalPages})`}
            </p>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/50">
                <TableHead className="font-semibold w-[200px]">Name</TableHead>
                <TableHead className="font-semibold w-[120px]">Position</TableHead>
                <TableHead className="font-semibold w-[200px]">Email</TableHead>
                <TableHead className="font-semibold w-[120px]">Phone</TableHead>
                <TableHead className="font-semibold w-[100px]">Location</TableHead>
                <TableHead className="font-semibold w-[80px]">Source</TableHead>
                <TableHead className="font-semibold w-[100px]">Score</TableHead>
                <TableHead className="font-semibold w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {candidates.map((candidate) => (
                <TableRow key={candidate.id} className="hover:bg-gray-50/50">
                  <TableCell className="w-[200px]">
                    <div className="flex items-center gap-3">
                      {candidate.profile_picture_url && (
                        <img
                          src={candidate.profile_picture_url}
                          alt={candidate.name}
                          className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                          loading="lazy"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-gray-900 truncate">{candidate.name}</div>
                        {candidate.location && (
                          <div className="text-xs text-gray-500 truncate flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {candidate.location}
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="w-[120px]">
                    <div className="space-y-1">
                      {candidate.current_position && (
                        <div className="font-medium text-gray-900 text-sm truncate">
                          {candidate.current_position}
                        </div>
                      )}
                      {candidate.company && (
                        <div className="text-xs text-gray-600 truncate flex items-center gap-1">
                          <Building className="h-3 w-3" />
                          {candidate.company}
                        </div>
                      )}
                      {candidate.experience_years && (
                        <div className="text-xs text-gray-500 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {candidate.experience_years}y
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="w-[200px]">
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-3 w-3 text-gray-400 flex-shrink-0" />
                      <span className="text-gray-700 truncate">{candidate.email}</span>
                    </div>
                  </TableCell>
                  <TableCell className="w-[120px]">
                    {candidate.phone ? (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-3 w-3 text-gray-400 flex-shrink-0" />
                        <span className="text-gray-700 truncate">{candidate.phone}</span>
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </TableCell>
                  <TableCell className="w-[100px]">
                    {candidate.location ? (
                      <span className="text-sm text-gray-700 truncate block">{candidate.location}</span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </TableCell>
                  <TableCell className="w-[80px]">
                    <Badge 
                      variant="secondary" 
                      className={`${getSourceBadgeColor(candidate.source_platform)} text-xs`}
                    >
                      {candidate.source_platform || 'manual'}
                    </Badge>
                  </TableCell>
                  <TableCell className="w-[100px]">
                    <div className="flex items-center gap-2">
                      <div className={`text-sm font-medium ${getCompletenessColor(candidate.profile_completeness_score)}`}>
                        {candidate.profile_completeness_score || 0}%
                      </div>
                      {(responseCounts?.[candidate.id] || 0) > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {responseCounts[candidate.id]}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="w-[100px]">
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedCandidate(candidate)}
                        className="h-8 px-2 text-xs bg-secondary-pink hover:bg-secondary-pink/90 text-white"
                      >
                        View
                      </Button>
                      {candidate.linkedin_profile_url && (
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                          className="h-8 px-2 text-xs bg-secondary-pink hover:bg-secondary-pink/90 text-white"
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
            <div className="p-4 border-t bg-gray-50">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={() => handlePageChange(currentPage - 1)}
                      className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer hover:bg-secondary-pink/10 hover:text-secondary-pink"}
                    />
                  </PaginationItem>

                  {getPaginationRange().map((page, index) => (
                    <PaginationItem key={index}>
                      {page === '...' ? (
                        <span className="px-3 py-2 text-sm text-muted-foreground">...</span>
                      ) : (
                        <PaginationLink
                          onClick={() => handlePageChange(page as number)}
                          isActive={currentPage === page}
                          className="cursor-pointer hover:bg-secondary-pink/10 hover:text-secondary-pink data-[selected=true]:bg-secondary-pink data-[selected=true]:text-white"
                        >
                          {page}
                        </PaginationLink>
                      )}
                    </PaginationItem>
                  ))}

                  <PaginationItem>
                    <PaginationNext 
                      onClick={() => handlePageChange(currentPage + 1)}
                      className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer hover:bg-secondary-pink/10 hover:text-secondary-pink"}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-md border bg-white p-8 text-center shadow-sm">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No candidates found</h3>
          <p className="text-muted-foreground mb-4">
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
