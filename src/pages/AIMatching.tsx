import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, UserRoundSearch } from "lucide-react";
import Layout from "@/components/Layout";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { rankCandidates, type MatchCandidate, type MatchJob } from "@/lib/candidateMatching";

const AIMatching = () => {
  const [jobId, setJobId] = useState("");
  const { data = { jobs: [], candidates: [] }, isLoading } = useQuery({
    queryKey: ["ai-matching-data"],
    queryFn: async () => {
      const [jobsResult, candidatesResult] = await Promise.all([
        supabase.from("jobs").select("id,title,company_name,location_name,job_description,skill_tags,work_type_name").order("created_at", { ascending: false }),
        supabase.from("candidates").select("id,name,email,current_position,company,location,experience_years,skills,profile_completeness_score,source_platform").limit(1000),
      ]);
      if (jobsResult.error) throw jobsResult.error;
      if (candidatesResult.error) throw candidatesResult.error;
      return { jobs: (jobsResult.data ?? []) as MatchJob[], candidates: (candidatesResult.data ?? []) as MatchCandidate[] };
    },
  });
  const selectedJob = data.jobs.find((job) => job.id === jobId);
  const matches = useMemo(() => selectedJob ? rankCandidates(selectedJob, data.candidates) : [], [selectedJob, data.candidates]);

  return <Layout><div className="container mx-auto space-y-6 px-6 py-8">
    <div><h1 className="flex items-center gap-3 text-3xl font-bold text-primary-foreground"><Sparkles className="text-secondary-pink" />AI Matching</h1><p className="mt-2 text-primary-foreground/70">Choose a vacancy to rank the ten strongest candidates.</p></div>
    <div className="max-w-xl"><Select value={jobId} onValueChange={setJobId}><SelectTrigger className="border-primary-foreground/20 bg-primary-blue text-primary-foreground"><SelectValue placeholder={isLoading ? "Loading vacancies…" : "Choose a vacancy"} /></SelectTrigger><SelectContent>{data.jobs.map((job) => <SelectItem key={job.id} value={job.id}>{job.title} — {job.company_name || "Growth Accelerator"}</SelectItem>)}</SelectContent></Select></div>
    {!selectedJob ? <Card className="border-primary-foreground/20 bg-primary-blue"><CardContent className="py-12 text-center text-primary-foreground/60"><UserRoundSearch className="mx-auto mb-3 h-10 w-10" />Select a vacancy to see recommendations.</CardContent></Card> : <div className="space-y-3">{matches.map((candidate, index) => <Card key={candidate.id} className="border-primary-foreground/20 bg-primary-blue text-primary-foreground"><CardHeader className="pb-3"><div className="flex items-start justify-between gap-4"><div><CardTitle className="text-lg">{index + 1}. {candidate.name}</CardTitle><p className="mt-1 text-sm text-primary-foreground/65">{candidate.current_position || "Position not provided"} · {candidate.source_platform || "Growth Accelerator"}</p></div><Badge className="bg-secondary-pink text-primary-foreground">{candidate.score}% match</Badge></div></CardHeader><CardContent><ul className="list-disc space-y-1 pl-5 text-sm text-primary-foreground/75">{candidate.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul></CardContent></Card>)}</div>}
  </div></Layout>;
};

export default AIMatching;