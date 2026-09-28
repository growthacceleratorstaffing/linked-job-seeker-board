export type MatchCandidate = { id: string; name: string; email: string; current_position?: string | null; company?: string | null; location?: string | null; experience_years?: number | null; skills?: unknown; profile_completeness_score?: number | null; source_platform?: string | null; resume_text?: string | null; linkedin_profile_url?: string | null; linkedin_headline?: string | null; available_from?: string | null; target_rate?: number | null; availability_status?: string | null };
export type MatchJob = { id: string; title: string; company_name?: string | null; location_name?: string | null; job_description?: string | null; skill_tags?: string[] | null; work_type_name?: string | null; salary_rate_high?: number | null };
export type CandidateMatch = MatchCandidate & { score: number; reasons: string[] };

const words = (value: unknown) => String(value ?? "").toLowerCase().match(/[a-z0-9+#.]{2,}/g) ?? [];
const skills = (value: unknown) => Array.isArray(value) ? value.map(String) : words(value);

export function rankCandidates(job: MatchJob, candidates: MatchCandidate[]): CandidateMatch[] {
  const jobSkills = new Set(skills(job.skill_tags));
  const jobTerms = new Set(words(`${job.title} ${job.job_description ?? ""}`));
  const jobLocation = String(job.location_name ?? "").toLowerCase();
  return candidates.map((candidate) => {
    let score = 0;
    const reasons: string[] = [];
    const candidateSkills = skills(candidate.skills);
    const sharedSkills = candidateSkills.filter((skill) => jobSkills.has(skill.toLowerCase()) || jobTerms.has(skill.toLowerCase()));
    if (sharedSkills.length) { score += Math.min(45, sharedSkills.length * 9); reasons.push(`Skills: ${sharedSkills.slice(0, 4).join(", ")}`); }
    const titleOverlap = words(candidate.current_position).filter((term) => jobTerms.has(term)).length;
    if (titleOverlap) { score += Math.min(25, titleOverlap * 8); reasons.push("Current role aligns with the vacancy"); }
    const profileTerms = new Set(words(`${candidate.current_position ?? ""} ${candidate.company ?? ""} ${candidateSkills.join(" ")}`));
    const termOverlap = [...jobTerms].filter((term) => profileTerms.has(term)).length;
    if (termOverlap) { score += Math.min(15, termOverlap * 2); reasons.push("Profile terminology overlaps with the job"); }
    if (candidate.experience_years) { score += Math.min(7, candidate.experience_years); reasons.push(`${candidate.experience_years} years of experience`); }
    if (jobLocation && candidate.location && jobLocation.includes(candidate.location.toLowerCase())) { score += 5; reasons.push("Location matches"); }
    const cvTerms = new Set(words(candidate.resume_text));
    const cvOverlap = [...jobTerms, ...jobSkills].filter((term) => cvTerms.has(String(term).toLowerCase()));
    if (cvOverlap.length) { score += Math.min(20, cvOverlap.length * 2); reasons.push(`CV mentions: ${[...new Set(cvOverlap)].slice(0, 4).join(", ")}`); }
    const linkedinTerms = new Set(words(`${candidate.linkedin_headline ?? ""} ${String(candidate.linkedin_profile_url ?? "").split("/in/")[1] ?? ""}`.replace(/[-_]/g, " ")));
    const linkedinOverlap = [...jobTerms].filter((term) => linkedinTerms.has(term)).length;
    if (linkedinOverlap) { score += Math.min(10, linkedinOverlap * 3); reasons.push("LinkedIn profile headline aligns with the job"); }
    if (candidate.linkedin_profile_url) { score += 2; reasons.push("LinkedIn profile available"); }
    score += Math.round(Math.min(3, (candidate.profile_completeness_score ?? 0) * 0.03));
    const avail = availabilityScore(candidate, job);
    score += avail.points; reasons.push(...avail.reasons);
    if (!reasons.length) reasons.push("Limited profile information available");
    return { ...candidate, score: Math.max(0, Math.min(100, score)), reasons };
  }).sort((a, b) => b.score - a.score || a.name.localeCompare(b.name)).slice(0, 10);
}

export const AVAILABILITY_LABELS: Record<string, string> = { available: "Available", available_soon: "Available soon", on_assignment: "On assignment", not_available: "Not available" };

/** Availability & rate prioritisation, shared with the assistant. */
export function availabilityScore(candidate: Pick<MatchCandidate, "available_from" | "target_rate" | "availability_status">, job: Pick<MatchJob, "salary_rate_high">) {
  let points = 0; const reasons: string[] = [];
  const status = candidate.availability_status ?? "available";
  if (status === "available") { points += 8; reasons.push("Available now"); }
  else if (status === "available_soon") { points += 4; reasons.push("Available soon"); }
  else if (status === "on_assignment") { points -= 10; reasons.push("Currently on assignment"); }
  else if (status === "not_available") { points -= 25; reasons.push("Not available"); }
  if (candidate.available_from) {
    const days = (new Date(candidate.available_from).getTime() - Date.now()) / 86400000;
    if (days <= 30) { points += 5; reasons.push(`Available from ${candidate.available_from}`); } else points -= 3;
  }
  if (candidate.target_rate && job.salary_rate_high) {
    if (Number(candidate.target_rate) <= Number(job.salary_rate_high)) { points += 5; reasons.push(`Rate €${candidate.target_rate} fits budget`); }
    else { points -= 5; reasons.push(`Rate €${candidate.target_rate} above budget`); }
  }
  return { points, reasons };
}
