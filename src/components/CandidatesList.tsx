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
    switch (stage?.toLowerCase()) {
      case 'applied': return 'bg-blue-500/20 text-blue-400 border-blue-400';
      case 'phone_screen': return 'bg-yellow-500/20 text-yellow-400 border-yellow-400';
      case 'interview': return 'bg-purple-500/20 text-purple-400 border-purple-400';
      case 'offer': return 'bg-green-500/20 text-green-400 border-green-400';
      case 'hired': return 'bg-emerald-500/20 text-emerald-400 border-emerald-400';
      case 'rejected': return 'bg-red-500/20 text-red-400 border-red-400';
      case 'withdrawn': return 'bg-gray-500/20 text-gray-400 border-gray-400';
      case 'pending': return 'bg-orange-500/20 text-orange-400 border-orange-400';
      case 'sourced': return 'bg-cyan-500/20 text-cyan-400 border-cyan-400';
      case 'in_progress': return 'bg-indigo-500/20 text-indigo-400 border-indigo-400';
      case 'completed': return 'bg-teal-500/20 text-teal-400 border-teal-400';
      case 'passed': return 'bg-lime-500/20 text-lime-400 border-lime-400';
      case 'failed': return 'bg-rose-500/20 text-rose-400 border-rose-400';
      default: return 'bg-slate-500/20 text-slate-400 border-slate-400';
    }
  };

  return (
    <Card className="bg-primary-blue border border-white/20 overflow-hidden">
      <CardContent className="p-0 bg-primary-blue">
        <div className="bg-primary-blue">
          <Table className="bg-transparent">
            <TableHeader className="bg-primary-blue">
              <TableRow className="border-white/20 hover:bg-white/5">
                <TableHead className="text-slate-300">Candidate</TableHead>
                <TableHead className="text-slate-300">Contact</TableHead>
                <TableHead className="text-slate-300">Job</TableHead>
                <TableHead className="text-slate-300">Stage</TableHead>
                <TableHead className="text-slate-300">Applied</TableHead>
                <TableHead className="text-slate-300">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="bg-primary-blue">
              {candidates.map((candidate) => (
                <TableRow key={candidate.id} className="border-white/20 hover:bg-white/5 bg-primary-blue">
                  <TableCell className="bg-primary-blue">
                    <div className="font-medium text-white">{candidate.name}</div>
                    <div className="text-sm text-slate-400">ID: {candidate.id}</div>
                  </TableCell>
                  <TableCell className="bg-primary-blue">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 text-sm text-slate-300">
                        <Mail className="h-3 w-3" />
                        {candidate.email}
                      </div>
                      {candidate.phone && (
                        <div className="flex items-center gap-2 text-sm text-slate-400">
                          <Phone className="h-3 w-3" />
                          {candidate.phone}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="bg-primary-blue">
                    <div className="text-sm text-white font-medium">
                      {candidate.job.title}
                    </div>
                    <div className="text-xs text-slate-400">
                      #{candidate.job.shortcode || 'unknown'}
                    </div>
                  </TableCell>
                  <TableCell className="bg-primary-blue">
                    <Badge
                      variant="outline"
                      className={`text-xs border ${getStageColor(candidate.stage)}`}
                    >
                      {candidate.stage.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </Badge>
                  </TableCell>
                  <TableCell className="bg-primary-blue">
                    <div className="text-sm text-slate-300">
                      {new Date(candidate.created_at).toLocaleDateString()}
                    </div>
                    <div className="text-xs text-slate-400">
                      {new Date(candidate.created_at).toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </div>
                  </TableCell>
                  <TableCell className="bg-primary-blue">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onJobClick(candidate.job.id)}
                      className="text-secondary-pink hover:text-secondary-pink/80 hover:bg-white/10"
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      View Job
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default CandidatesList;