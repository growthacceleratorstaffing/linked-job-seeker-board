import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCandidatesFiltering } from "../hooks/useCandidatesFiltering";
import { usePagination } from "../hooks/usePagination";
import CandidatesHeader from "../components/CandidatesHeader";
import CandidatesFilters from "../components/CandidatesFilters";
import CandidatesLoadingState from "../components/CandidatesLoadingState";
import CandidatesEmptyState from "../components/CandidatesEmptyState";
import CandidatesErrorState from "../components/CandidatesErrorState";
import CandidatesPagination from "../components/CandidatesPagination";
import CandidatesList from "../components/CandidatesList";
import Layout from "@/components/Layout";
import EditCandidateDialog from "@/components/EditCandidateDialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface WorkableCandidate {
  id: string;
  name: string;
  firstname: string;
  lastname: string;
  email: string;
  phone: string;
  stage: string;
  job: {
    id: string;
    title: string;
    shortcode?: string;
  };
  created_at: string;
  updated_at: string;
  source_platform?: string | null;
  resume_url?: string | null;
}

interface WorkableJob {
  id: string;
  title: string;
  shortcode: string;
  state: string;
}

const CANDIDATES_PER_PAGE = 50;

const Candidates = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedJob, setSelectedJob] = useState<string>("all");
  const [selectedSource, setSelectedSource] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [editing, setEditing] = useState<WorkableCandidate | null>(null);

  // Transform database candidate to match WorkableCandidate interface
  const transformDbCandidate = (dbCandidate: any): WorkableCandidate => ({
    id: dbCandidate.id,
    name: dbCandidate.name,
    firstname: dbCandidate.name.split(' ')[0] || '',
    lastname: dbCandidate.name.split(' ').slice(1).join(' ') || '',
    email: dbCandidate.email,
    phone: dbCandidate.phone || '',
    stage: dbCandidate.interview_stage || 'applied',
    job: {
      id: 'unknown',
      title: dbCandidate.current_position || 'Unknown Position',
      shortcode: 'unknown'
    },
    created_at: dbCandidate.created_at,
    updated_at: dbCandidate.updated_at || dbCandidate.created_at,
    source_platform: dbCandidate.source_platform || 'growth accelerator',
    resume_url: dbCandidate.resume_url || null,
  });

  const { data: allCandidates = [], isLoading, error, refetch } = useQuery({
    queryKey: ['workable-candidates'],
    queryFn: async (): Promise<WorkableCandidate[]> => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const [{ data: dbCandidates, error: dbError }, settingsResult] = await Promise.all([
          supabase.from('candidates').select('*').order('created_at', { ascending: false }),
          user ? supabase.from('integration_settings').select('integration_type').eq('user_id', user.id).eq('is_enabled', true) : Promise.resolve({ data: [] }),
        ]);
        if (dbError) throw dbError;
        const merged = (dbCandidates || []).map(transformDbCandidate);
        const enabled = new Set((settingsResult.data || []).map((row) => row.integration_type));
        const loaders: Promise<WorkableCandidate[]>[] = [];
        if (enabled.has('workable')) loaders.push(supabase.functions.invoke('workable-candidates').then(({ data }) => Array.isArray(data) ? data.map((candidate: any) => ({
            id: candidate.id,
            name: candidate.name,
            firstname: candidate.firstname || candidate.name?.split(' ')[0] || '',
            lastname: candidate.lastname || candidate.name?.split(' ').slice(1).join(' ') || '',
            email: candidate.email,
            phone: candidate.phone || '',
            stage: candidate.stage || 'applied',
            job: {
              id: candidate.job?.id || 'unknown',
              title: candidate.job?.title || 'Unknown Position',
              shortcode: candidate.job?.shortcode || 'unknown'
            },
            created_at: candidate.created_at,
            updated_at: candidate.updated_at || candidate.created_at,
            source_platform: 'workable', resume_url: candidate.resume_url || null,
          })) : []));
        if (enabled.has('apollo')) loaders.push(supabase.functions.invoke('apollo-integration', { body: { action: 'get_contacts' } }).then(({ data }) => (data?.contacts || []).map((candidate: any) => ({ id: `apollo-${candidate.id}`, name: [candidate.first_name, candidate.last_name].filter(Boolean).join(' ') || candidate.email, firstname: candidate.first_name || '', lastname: candidate.last_name || '', email: candidate.email || '', phone: candidate.phone || '', stage: 'sourced', job: { id: 'unknown', title: candidate.title || 'Unknown Position', shortcode: 'unknown' }, created_at: candidate.created_at || new Date().toISOString(), updated_at: candidate.updated_at || candidate.created_at || new Date().toISOString(), source_platform: 'apollo', resume_url: candidate.resume_url || null }))));
        if (enabled.has('jazzhr')) loaders.push(supabase.functions.invoke('jazzhr-integration', { body: { action: 'get_candidates' } }).then(({ data }) => (data?.candidates || []).map((candidate: any) => ({ id: `jazzhr-${candidate.id}`, name: candidate.name, firstname: candidate.name?.split(' ')[0] || '', lastname: candidate.name?.split(' ').slice(1).join(' ') || '', email: candidate.email || '', phone: candidate.phone || '', stage: candidate.status || 'applied', job: { id: 'unknown', title: candidate.job_title || 'Unknown Position', shortcode: 'unknown' }, created_at: candidate.applied_date || new Date().toISOString(), updated_at: candidate.applied_date || new Date().toISOString(), source_platform: 'jazzhr', resume_url: candidate.resume_url || null }))));
        const external = (await Promise.allSettled(loaders)).flatMap((result) => result.status === 'fulfilled' ? result.value : []);
        const seen = new Set(merged.map((candidate) => candidate.email.toLowerCase()).filter(Boolean));
        external.forEach((candidate) => { const key = candidate.email.toLowerCase(); if (!key || !seen.has(key)) { merged.push(candidate); if (key) seen.add(key); } });
        return merged;
      } catch (error) {
        console.error('Failed to fetch candidates:', error);
        
        // Final fallback to database
        try {
          const { data: dbCandidates, error: dbError } = await supabase
            .from('candidates')
            .select('*')
            .order('created_at', { ascending: false });
          
          if (dbError) throw dbError;
          return (dbCandidates || []).map(transformDbCandidate);
        } catch (dbError) {
          throw new Error('Failed to fetch candidates from both Workable and database');
        }
      }
    },
    refetchInterval: 15 * 60 * 1000, // 15 minutes
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: 2,
    retryDelay: 5000, // 5 seconds
  });

  const { data: allJobs = [] } = useQuery({
    queryKey: ['workable-jobs'],
    queryFn: async (): Promise<WorkableJob[]> => {
      try {
        const { data, error } = await supabase.functions.invoke('workable-jobs');
        if (error) throw error;
        return data || [];
      } catch (error) {
        console.error('Error fetching jobs:', error);
        return [];
      }
    },
    refetchInterval: 30 * 60 * 1000,
    staleTime: 25 * 60 * 1000,
    retry: 1,
  });

  // For debugging - don't filter candidates by permissions to see all Workable candidates
  const sourceLabel = (source?: string | null) => {
    if (!source || source === 'manual' || source === 'growth accelerator') return 'Growth Accelerator';
    return source.split(/[\s_-]+/).map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };
  const sourceOptions = useMemo(
    () => [...new Set(allCandidates.map((candidate) => sourceLabel(candidate.source_platform)))].sort((a, b) => a === 'Growth Accelerator' ? -1 : b === 'Growth Accelerator' ? 1 : a.localeCompare(b)),
    [allCandidates]
  );
  const accessibleCandidates = selectedSource === 'all'
    ? allCandidates
    : allCandidates.filter((candidate) => sourceLabel(candidate.source_platform) === selectedSource);
  const availableJobs = allJobs;

  const filteredCandidates = useCandidatesFiltering(
    accessibleCandidates,
    searchTerm,
    selectedStatus,
    selectedJob
  );

  const {
    paginatedItems: paginatedCandidates,
    totalPages,
    hasNextPage,
    hasPreviousPage,
  } = usePagination(filteredCandidates, CANDIDATES_PER_PAGE, currentPage);

  const uniqueStages = useMemo(
    () => [...new Set(accessibleCandidates.map((c) => c.stage).filter(Boolean))],
    [accessibleCandidates]
  );

  const uniqueJobs = useMemo(() => {
    return (availableJobs || [])
      .filter((job) => job.shortcode)
      .map((job) => ({
        id: job.shortcode,
        title: job.title + (job.state === "archived" ? " (Archived)" : job.state === "draft" ? " (Draft)" : ""),
      }));
  }, [availableJobs]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };
  const handleStatusChange = (value: string) => {
    setSelectedStatus(value);
    setCurrentPage(1);
  };
  const handleJobChange = (value: string) => {
    setSelectedJob(value);
    setCurrentPage(1);
  };

  if (error) {
    return (
      <Layout>
        <div className="min-h-screen bg-primary-blue text-white">
          <div className="container mx-auto px-6 py-8">
            <div className="space-y-6">
              <CandidatesHeader candidateCount={accessibleCandidates.length} isLoading={isLoading} onRefresh={refetch} />
              <CandidatesErrorState error={error} onRetry={refetch} />
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-primary-blue text-white">
        <div className="container mx-auto px-6 py-8">
          <div className="space-y-6">
            <CandidatesHeader candidateCount={accessibleCandidates.length} isLoading={isLoading} onRefresh={refetch} />
            <CandidatesFilters
              searchTerm={searchTerm}
              selectedStatus={selectedStatus}
              selectedJob={selectedJob}
              uniqueStages={uniqueStages}
              uniqueJobs={uniqueJobs}
              onSearchChange={handleSearchChange}
              onStatusChange={handleStatusChange}
              onJobChange={handleJobChange}
            />
            <div className="max-w-sm space-y-2">
              <Label htmlFor="candidate-source" className="text-primary-foreground">Candidate source</Label>
              <Select value={selectedSource} onValueChange={(value) => { setSelectedSource(value); setCurrentPage(1); }}>
                <SelectTrigger id="candidate-source" className="border-primary-foreground/20 bg-primary-blue text-primary-foreground">
                  <SelectValue placeholder="All sources" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All candidates</SelectItem>
                  {sourceOptions.map((source) => <SelectItem key={source} value={source}>{source}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {isLoading ? (
              <CandidatesLoadingState />
            ) : accessibleCandidates.length === 0 ? (
              <CandidatesEmptyState hasCandidates={false} onRefresh={refetch} />
            ) : filteredCandidates.length === 0 ? (
              <CandidatesEmptyState hasCandidates={true} onRefresh={refetch} />
            ) : (
              <>
                <div className="flex justify-between items-center text-sm text-gray-600 mb-4">
                  <span className="text-slate-300">
                    Showing {(currentPage - 1) * CANDIDATES_PER_PAGE + 1}-
                    {Math.min(currentPage * CANDIDATES_PER_PAGE, filteredCandidates.length)} of {filteredCandidates.length} candidates
                    (Page {currentPage} of {totalPages})
                  </span>
                </div>
                <CandidatesList candidates={paginatedCandidates} onEdit={setEditing} />
                <EditCandidateDialog candidate={editing} onClose={() => setEditing(null)} onSaved={() => refetch()} />
                {totalPages > 1 && (
                  <CandidatesPagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    hasNextPage={hasNextPage}
                    hasPreviousPage={hasPreviousPage}
                    handlePageChange={handlePageChange}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default function CandidatesPageWithBoundary() {
  return <Candidates />;
}