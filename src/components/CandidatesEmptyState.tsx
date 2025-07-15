import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, RefreshCw } from "lucide-react";

interface CandidatesEmptyStateProps {
  hasCandidates: boolean;
  onRefresh: () => void;
}

const CandidatesEmptyState = ({ hasCandidates, onRefresh }: CandidatesEmptyStateProps) => {
  return (
    <Card className="bg-slate-800 border-slate-600">
      <CardContent className="pt-6">
        <div className="text-center py-8">
          <Users className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">
            {hasCandidates ? "No candidates match your filters" : "No candidates found"}
          </h3>
          <p className="text-slate-400 mb-4">
            {hasCandidates 
              ? "Try adjusting your search criteria or filters to see more candidates."
              : "It looks like there are no candidates in your Workable account yet."
            }
          </p>
          <Button 
            onClick={onRefresh}
            variant="outline"
            className="border-secondary-pink text-secondary-pink hover:bg-secondary-pink hover:text-white"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default CandidatesEmptyState;