import { Button } from "@/components/ui/button";
import { RefreshCw, Users } from "lucide-react";

interface CandidatesHeaderProps {
  candidateCount: number;
  isLoading: boolean;
  onRefresh: () => void;
}

const CandidatesHeader = ({ candidateCount, isLoading, onRefresh }: CandidatesHeaderProps) => {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">
          <Users className="inline-block mr-3 h-8 w-8" />
          Candidates
        </h1>
        <p className="text-slate-300">
          Manage your talent pipeline ({candidateCount} candidates)
        </p>
      </div>
      <Button 
        onClick={onRefresh}
        disabled={isLoading}
        variant="outline"
        className="border-secondary-pink text-secondary-pink hover:bg-secondary-pink hover:text-white"
      >
        <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        Refresh
      </Button>
    </div>
  );
};

export default CandidatesHeader;