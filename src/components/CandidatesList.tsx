import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Mail, Phone, ExternalLink } from "lucide-react";

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

interface CandidatesListProps {
  candidates: WorkableCandidate[];
  onJobClick: (jobId: string) => void;
}

const CandidatesList = ({ candidates, onJobClick }: CandidatesListProps) => {
  const getStageColor = (stage: string) => {
    switch (stage.toLowerCase()) {
      case 'sourced': return 'bg-purple-500/20 text-purple-400 border-purple-400';
      case 'applied': return 'bg-blue-500/20 text-blue-400 border-blue-400';
      case 'phone_screen': return 'bg-cyan-500/20 text-cyan-400 border-cyan-400';
      case 'interview': return 'bg-orange-500/20 text-orange-400 border-orange-400';
      case 'offer': return 'bg-emerald-500/20 text-emerald-400 border-emerald-400';
      case 'hired': return 'bg-green-600/20 text-green-600 border-green-600';
      case 'rejected': return 'bg-red-600/20 text-red-600 border-red-600';
      case 'withdrawn': return 'bg-gray-500/20 text-gray-400 border-gray-400';
      default: return 'bg-slate-500/20 text-slate-400 border-slate-400';
    }
  };

  return (
    <Card className="bg-slate-800 border-slate-600">
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-600">
              <TableHead className="text-slate-300">Candidate</TableHead>
              <TableHead className="text-slate-300">Contact</TableHead>
              <TableHead className="text-slate-300">Job</TableHead>
              <TableHead className="text-slate-300">Stage</TableHead>
              <TableHead className="text-slate-300">Applied</TableHead>
              <TableHead className="text-slate-300">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {candidates.map((candidate) => (
              <TableRow key={candidate.id} className="border-slate-600 hover:bg-slate-700/50">
                <TableCell>
                  <div className="font-medium text-white">{candidate.name}</div>
                  <div className="text-sm text-slate-400">ID: {candidate.id}</div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 text-sm text-slate-300">
                      <Mail className="h-3 w-3" />
                      {candidate.email}
                    </div>
                    {candidate.phone && (
                      <div className="flex items-center gap-2 text-sm text-slate-300">
                        <Phone className="h-3 w-3" />
                        {candidate.phone}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Button
                    variant="link"
                    className="h-auto p-0 text-secondary-pink hover:text-secondary-pink/80"
                    onClick={() => onJobClick(candidate.job.shortcode || candidate.job.id)}
                  >
                    {candidate.job.title}
                  </Button>
                  {candidate.job.shortcode && (
                    <div className="text-xs text-slate-400">#{candidate.job.shortcode}</div>
                  )}
                </TableCell>
                <TableCell>
                  <Badge className={`${getStageColor(candidate.stage)} border`}>
                    {candidate.stage.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="text-sm text-slate-300">
                    {new Date(candidate.created_at).toLocaleDateString()}
                  </div>
                  <div className="text-xs text-slate-400">
                    {new Date(candidate.created_at).toLocaleTimeString()}
                  </div>
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-slate-300 hover:text-white hover:bg-slate-700"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default CandidatesList;