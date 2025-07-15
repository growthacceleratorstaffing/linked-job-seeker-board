import { useMemo } from "react";

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

export const useCandidatesFiltering = (
  candidates: WorkableCandidate[],
  searchTerm: string,
  selectedStatus: string,
  selectedJob: string
) => {
  return useMemo(() => {
    return candidates.filter((candidate) => {
      const matchesSearch = !searchTerm || 
        candidate.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        candidate.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        candidate.job.title.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = selectedStatus === "all" || candidate.stage === selectedStatus;

      const matchesJob = selectedJob === "all" || candidate.job.shortcode === selectedJob;

      return matchesSearch && matchesStatus && matchesJob;
    });
  }, [candidates, searchTerm, selectedStatus, selectedJob]);
};