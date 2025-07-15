import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";

interface CandidatesFiltersProps {
  searchTerm: string;
  selectedStatus: string;
  selectedJob: string;
  uniqueStages: string[];
  uniqueJobs: { id: string; title: string; }[];
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onJobChange: (value: string) => void;
}

const CandidatesFilters = ({
  searchTerm,
  selectedStatus,
  selectedJob,
  uniqueStages,
  uniqueJobs,
  onSearchChange,
  onStatusChange,
  onJobChange,
}: CandidatesFiltersProps) => {
  return (
    <div className="flex gap-4 mb-6">
      <div className="flex-1">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Search candidates by name, email, or job title..." 
            className="pl-10 bg-slate-800 border-slate-700 text-white placeholder:text-slate-400"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      </div>
      
      <Select value={selectedStatus} onValueChange={onStatusChange}>
        <SelectTrigger className="w-48 bg-slate-800 border-slate-700 text-white">
          <SelectValue placeholder="Filter by status" />
        </SelectTrigger>
        <SelectContent className="bg-slate-800 border-slate-700">
          <SelectItem value="all" className="text-white">All Statuses</SelectItem>
          {uniqueStages.map((stage) => (
            <SelectItem key={stage} value={stage} className="text-white">
              {stage.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={selectedJob} onValueChange={onJobChange}>
        <SelectTrigger className="w-64 bg-slate-800 border-slate-700 text-white">
          <SelectValue placeholder="Filter by job" />
        </SelectTrigger>
        <SelectContent className="bg-slate-800 border-slate-700">
          <SelectItem value="all" className="text-white">All Jobs</SelectItem>
          {uniqueJobs.map((job) => (
            <SelectItem key={job.id} value={job.id} className="text-white">
              {job.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default CandidatesFilters;