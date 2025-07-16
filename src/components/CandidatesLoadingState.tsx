import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

const CandidatesLoadingState = () => {
  return (
    <Card className="bg-slate-800 border-slate-600">
      <CardContent className="pt-6">
        <div className="flex items-center justify-center gap-3 py-8">
          <Loader2 className="w-6 h-6 animate-spin text-secondary-pink" />
          <p className="text-white">Loading candidates...</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default CandidatesLoadingState;