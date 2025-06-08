
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AddCandidateDialog } from "./AddCandidateDialog";
import { Search, Mail, Phone } from "lucide-react";
import { toast } from "sonner";

type Candidate = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  created_at: string;
};

export const CandidatesList = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const queryClient = useQueryClient();

  const { data: candidates, isLoading } = useQuery({
    queryKey: ["candidates", searchTerm],
    queryFn: async () => {
      let query = supabase
        .from("candidates")
        .select("*")
        .order("created_at", { ascending: false });

      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Candidate[];
    }
  });

  const { data: responseCounts } = useQuery({
    queryKey: ["candidate-response-counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("candidate_responses")
        .select("candidate_id");
      
      if (error) throw error;
      
      const counts: Record<string, number> = {};
      data?.forEach(response => {
        counts[response.candidate_id] = (counts[response.candidate_id] || 0) + 1;
      });
      
      return counts;
    }
  });

  if (isLoading) {
    return <div className="flex justify-center p-4">Loading candidates...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search candidates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          Add Candidate
        </Button>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Responses</TableHead>
              <TableHead>Added</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {candidates?.map((candidate) => (
              <TableRow key={candidate.id}>
                <TableCell className="font-medium">{candidate.name}</TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-3 w-3" />
                      {candidate.email}
                    </div>
                    {candidate.phone && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        {candidate.phone}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">
                    {responseCounts?.[candidate.id] || 0} responses
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(candidate.created_at).toLocaleDateString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AddCandidateDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["candidates"] });
          queryClient.invalidateQueries({ queryKey: ["crm-stats"] });
        }}
      />
    </div>
  );
};
