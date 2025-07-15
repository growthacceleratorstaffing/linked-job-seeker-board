import { useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useWorkableCandidates } from "../hooks/useWorkableCandidates";
import { useWorkableJobs } from "../hooks/useWorkableJobs";
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

const CANDIDATES_PER_PAGE = 50;

const Candidates = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedJob, setSelectedJob] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const navigate = useNavigate();

  const { data: allCandidates = [], isLoading, error, refetch } = useWorkableCandidates();
  const { data: allJobs = [] } = useWorkableJobs();

  const { accessibleCandidates, availableJobs } = useAccessibleCandidates(allCandidates, allJobs);

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

  const handleJobClick = useCallback((jobId: string) => navigate("/jobs"), [navigate]);
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
        <div className="container mx-auto px-6 py-8">
          <div className="space-y-6">
            <CandidatesHeader candidateCount={accessibleCandidates.length} isLoading={isLoading} onRefresh={refetch} />
            <CandidatesErrorState error={error} onRetry={refetch} />
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
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
    </Layout>
  );
};

export default function CandidatesPageWithBoundary() {
  return <Candidates />;
}