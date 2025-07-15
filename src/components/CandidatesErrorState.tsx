import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface CandidatesErrorStateProps {
  error: Error;
  onRetry: () => void;
}

const CandidatesErrorState = ({ error, onRetry }: CandidatesErrorStateProps) => {
  return (
    <Card className="bg-slate-800 border-slate-600">
      <CardContent className="pt-6">
        <div className="text-center py-8">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">
            Failed to load candidates
          </h3>
          <p className="text-slate-400 mb-4">
            {error.message || "There was an error loading candidates from Workable."}
          </p>
          <Button 
            onClick={onRetry}
            variant="outline"
            className="border-secondary-pink text-secondary-pink hover:bg-secondary-pink hover:text-white"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default CandidatesErrorState;