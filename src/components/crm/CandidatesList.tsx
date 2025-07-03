

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
  const [currentPage, setCurrentPage] = useState(1);
  const candidatesPerPage = 100;
  const queryClient = useQueryClient();

  // Debounce search term to reduce API calls
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  // Memoize query key to prevent unnecessary re-renders
  const queryKey = useMemo(() => 
    ["candidates", debouncedSearchTerm, currentPage],
    [debouncedSearchTerm, currentPage]
  );

  const { data: candidatesData, isLoading, error } = useQuery({
    queryKey,
    queryFn: async () => {
      console.log('Fetching candidates with search:', debouncedSearchTerm, 'page:', currentPage);
      
      let query = supabase
        .from("candidates")
        .select("*", { count: 'exact' })
        .order("created_at", { ascending: false });

      if (debouncedSearchTerm) {
        query = query.or(`name.ilike.%${debouncedSearchTerm}%,email.ilike.%${debouncedSearchTerm}%,company.ilike.%${debouncedSearchTerm}%,current_position.ilike.%${debouncedSearchTerm}%`);
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

  // Reset to first page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm]);

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

      {candidates && candidates.length > 0 ? (
        <div className="rounded-md border bg-primary-blue border-slate-700 shadow-sm">
          <div className="p-4 border-b border-slate-600 bg-primary-blue">
            <p className="text-sm text-slate-300">
              Showing {candidates.length} of {totalCount} candidate{totalCount !== 1 ? 's' : ''}
              {searchTerm && ` matching "${searchTerm}"`}
              {totalPages > 1 && ` (Page ${currentPage} of ${totalPages})`}
            </p>
          </div>
          <div className="overflow-x-auto">
            <Table>
            <TableHeader>
              <TableRow className="border-slate-600">
                <TableHead className="font-semibold w-[220px] text-slate-300">Name</TableHead>
                <TableHead className="font-semibold w-[200px] text-slate-300">Email</TableHead>
                <TableHead className="font-semibold w-[130px] text-slate-300">Phone</TableHead>
                <TableHead className="font-semibold w-[120px] text-slate-300">Position</TableHead>
                <TableHead className="font-semibold w-[120px] text-slate-300">Location</TableHead>
                <TableHead className="font-semibold w-[80px] text-slate-300">Source</TableHead>
                <TableHead className="font-semibold w-[80px] text-slate-300">Score</TableHead>
                <TableHead className="font-semibold w-[100px] text-slate-300">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {candidates.map((candidate) => (
                <TableRow key={candidate.id} className="hover:bg-slate-700 border-slate-600">
                  <TableCell className="w-[220px]">
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
                        <div className="font-medium text-white text-base leading-tight">
                          {candidate.name}
                        </div>
                        {candidate.location && (
                          <div className="text-xs text-slate-400 truncate flex items-center gap-1 mt-1">
                            <MapPin className="h-3 w-3" />
                            {candidate.location}
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="w-[200px]">
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-3 w-3 text-slate-400 flex-shrink-0" />
                      <span className="text-white truncate">{candidate.email}</span>
                    </div>
                  </TableCell>
                  <TableCell className="w-[130px]">
                    {candidate.phone ? (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-3 w-3 text-slate-400 flex-shrink-0" />
                        <span className="text-white truncate">{candidate.phone}</span>
                      </div>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </TableCell>
                  <TableCell className="w-[120px]">
                    <div className="space-y-1">
                      {candidate.current_position && (
                        <div className="font-medium text-white text-xs truncate">
                          {candidate.current_position}
                        </div>
                      )}
                      {candidate.company && (
                        <div className="text-xs text-slate-400 truncate flex items-center gap-1">
                          <Building className="h-3 w-3" />
                          {candidate.company}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="w-[120px]">
                    {candidate.location ? (
                      <span className="text-sm text-white truncate block">{candidate.location}</span>
                    ) : (
                      <span className="text-slate-400">-</span>
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
                  <TableCell className="w-[80px]">
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
          </div>

          {totalPages > 1 && (
            <div className="p-4 border-t border-slate-600 bg-primary-blue">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={() => handlePageChange(currentPage - 1)}
                      className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer hover:bg-secondary-pink/10 hover:text-secondary-pink text-white"}
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
                          className="cursor-pointer hover:bg-secondary-pink/10 hover:text-secondary-pink data-[selected=true]:bg-secondary-pink data-[selected=true]:text-white text-white"
                        >
                          {page}
                        </PaginationLink>
                      )}
                    </PaginationItem>
                  ))}

                  <PaginationItem>
                    <PaginationNext 
                      onClick={() => handlePageChange(currentPage + 1)}
                      className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer hover:bg-secondary-pink/10 hover:text-secondary-pink text-white"}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-md border bg-primary-blue border-slate-700 p-8 text-center shadow-sm">
          <Users className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2 text-white">No candidates found</h3>
          <p className="text-slate-400 mb-4">
            {searchTerm ? "Try adjusting your search" : "Get started by adding candidates manually"}
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

