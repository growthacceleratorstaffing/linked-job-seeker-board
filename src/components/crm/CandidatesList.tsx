import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AddCandidateDialog } from "./AddCandidateDialog";
import { CandidateProfileCard } from "./CandidateProfileCard";
import { IntegrationSyncPanel } from "./IntegrationSyncPanel";
import { Search, Mail, Phone, ExternalLink, Users } from "lucide-react";
import { toast } from "sonner";

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
  const queryClient = useQueryClient();

  const { data: candidates, isLoading } = useQuery({
    queryKey: ["candidates", searchTerm, sourceFilter],
    queryFn: async () => {
      let query = supabase
        .from("candidates")
        .select("*")
        .order("created_at", { ascending: false });

      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,company.ilike.%${searchTerm}%,current_position.ilike.%${searchTerm}%`);
      }

      if (sourceFilter !== "all") {
        query = query.eq("source_platform", sourceFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Candidate[];
    }
  });

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
    }
  });

  // Set up real-time subscription for candidate updates
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
            toast.success(`New candidate added: ${payload.new.name}`);
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
          if (payload.new.integration_type === 'workable' && payload.new.status === 'success') {
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

  const syncWorkableCandidatesMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('workable-integration', {
        body: { action: 'sync_candidates' }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Synced ${data.syncedCandidates} candidates from Workable`);
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
      queryClient.invalidateQueries({ queryKey: ["crm-stats"] });
    },
    onError: (error: any) => {
      toast.error(`Failed to sync candidates: ${error.message}`);
    }
  });

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

  const getSourceBadgeColor = (source: string | null) => {
    switch (source) {
      case 'linkedin': return 'bg-blue-100 text-blue-800';
      case 'workable': return 'bg-green-100 text-green-800';
      case 'manual': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCompletenessColor = (score: number | null) => {
    if (!score) return 'text-gray-400';
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (isLoading) {
    return <div className="flex justify-center p-4">Loading candidates...</div>;
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
              className="pl-10"
            />
          </div>
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="px-3 py-2 border rounded-md text-sm"
          >
            <option value="all">All Sources</option>
            <option value="manual">Manual</option>
            <option value="linkedin">LinkedIn</option>
            <option value="workable">Workable</option>
          </select>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowAddDialog(true)}>
            <Users className="h-4 w-4 mr-2" />
            Add Candidate
          </Button>
        </div>
      </div>

      <IntegrationSyncPanel />

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Candidate</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Profile Score</TableHead>
              <TableHead>Responses</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {candidates?.map((candidate) => (
              <TableRow key={candidate.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    {candidate.profile_picture_url && (
                      <img
                        src={candidate.profile_picture_url}
                        alt={candidate.name}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    )}
                    <div>
                      <div className="font-medium">{candidate.name}</div>
                      {candidate.current_position && (
                        <div className="text-sm text-muted-foreground">
                          {candidate.current_position}
                          {candidate.company && ` at ${candidate.company}`}
                        </div>
                      )}
                      {candidate.location && (
                        <div className="text-xs text-muted-foreground">{candidate.location}</div>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-3 w-3" />
                      {candidate.email}
                    </div>
                    {candidate.phone && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        {candidate.phone}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge 
                    variant="secondary" 
                    className={getSourceBadgeColor(candidate.source_platform)}
                  >
                    {candidate.source_platform || 'manual'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className={`text-sm font-medium ${getCompletenessColor(candidate.profile_completeness_score)}`}>
                    {candidate.profile_completeness_score || 0}%
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">
                    {responseCounts?.[candidate.id] || 0} responses
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedCandidate(candidate)}
                    >
                      View
                    </Button>
                    {candidate.linkedin_profile_url && (
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
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
