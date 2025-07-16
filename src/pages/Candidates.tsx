import { useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCandidatesFiltering } from "../hooks/useCandidatesFiltering";
import { usePagination } from "../hooks/usePagination";
import { useAccessibleCandidates } from "../hooks/useAccessibleCandidates";
import CandidatesHeader from "../components/CandidatesHeader";
import CandidatesFilters from "../components/CandidatesFilters";
import CandidatesLoadingState from "../components/CandidatesLoadingState";
import CandidatesEmptyState from "../components/CandidatesEmptyState";
import CandidatesErrorState from "../components/CandidatesErrorState";
import CandidatesPagination from "../components/CandidatesPagination";
import CandidatesList from "../components/CandidatesList";
import Layout from "@/components/Layout";

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
  const [currentPage, setCurrentPage] = useState(1);
  const navigate = useNavigate();

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
    updated_at: dbCandidate.updated_at || dbCandidate.created_at
  });

  const { data: allCandidates = [], isLoading, error, refetch } = useQuery({
    queryKey: ['workable-integration-candidates'],
    queryFn: async (): Promise<WorkableCandidate[]> => {
      console.log('Fetching all candidates from Workable...');
      
      try {
        // Use the same working approach as other pages
        const { data, error: integrationError } = await supabase.functions.invoke('workable-integration-enhanced', {
          body: { 
            action: 'load_all_candidates_enhanced',
            includeEnrichment: true,
            exportFormat: 'json'
          }
        });
        
        if (integrationError) {
          console.error('Workable integration error:', integrationError);
          throw integrationError;
        }
        
        if (data?.candidates && Array.isArray(data.candidates)) {
          console.log('Successfully fetched candidates from Workable integration:', data.candidates.length);
          return data.candidates.map((candidate: any) => ({
            id: candidate.id || candidate.workable_candidate_id,
            name: candidate.name,
            firstname: candidate.name?.split(' ')[0] || '',
            lastname: candidate.name?.split(' ').slice(1).join(' ') || '',
            email: candidate.email,
            phone: candidate.phone || '',
            stage: candidate.stage || candidate.interview_stage || 'applied',
            job: {
              id: candidate.job?.id || 'unknown',
              title: candidate.job?.title || candidate.current_position || 'Unknown Position',
              shortcode: candidate.job?.shortcode || 'unknown'
            },
            created_at: candidate.created_at,
            updated_at: candidate.updated_at || candidate.created_at
          }));
        }
        
        // If integration doesn't work, get from database without restrictive filtering
        console.log('Integration returned no candidates, trying database...');
        const { data: dbCandidates, error: dbError } = await supabase
          .from('candidates')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (dbError) throw dbError;
        
        console.log('Using database candidates:', dbCandidates?.length || 0);
        return (dbCandidates || []).map(transformDbCandidate);
        
      } catch (error) {
        console.error('Failed to fetch candidates:', error);
        throw new Error('Failed to fetch candidates from Workable');
      }
    },
    refetchInterval: 10 * 60 * 1000, // 10 minutes
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: 1,
    retryDelay: 10000,
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
  const accessibleCandidates = allCandidates;
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

  const handleJobClick = useCallback((jobId: string) => navigate("/post-jobs"), [navigate]);
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
                <CandidatesList candidates={paginatedCandidates} onJobClick={handleJobClick} />
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