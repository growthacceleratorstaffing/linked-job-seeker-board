
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AddResponseDialog } from "./AddResponseDialog";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

type CandidateResponse = {
  id: string;
  candidate_id: string;
  job_id: string;
  response_type: string;
  message: string | null;
  status: string;
  source: string | null;
  responded_at: string;
  candidates: {
    name: string;
    email: string;
  };
  crawled_jobs: {
    title: string;
    company: string;
  };
};

const statusOptions = [
  { value: "new", label: "New", variant: "default" as const },
  { value: "contacted", label: "Contacted", variant: "secondary" as const },
  { value: "interviewed", label: "Interviewed", variant: "outline" as const },
  { value: "hired", label: "Hired", variant: "default" as const },
  { value: "rejected", label: "Rejected", variant: "destructive" as const }
];

export const ResponsesList = () => {
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const queryClient = useQueryClient();

  // Return early if no user
  if (!user) {
    return <div className="text-center p-4">Please log in to view responses.</div>;
  }

  const { data: responses, isLoading } = useQuery({
    queryKey: ["candidate-responses", statusFilter, user.id],
    queryFn: async () => {
      // First get user's candidates
      const { data: userCandidates, error: candidatesError } = await supabase
        .from("candidates")
        .select("id")
        .eq("user_id", user.id);
      
      if (candidatesError) throw candidatesError;
      
      if (!userCandidates || userCandidates.length === 0) {
        return [];
      }
      
      const candidateIds = userCandidates.map(c => c.id);
      
      // Then get responses for those candidates only
      let query = supabase
        .from("candidate_responses")
        .select(`
          *,
          candidates (name, email),
          crawled_jobs (title, company)
        `)
        .in("candidate_id", candidateIds)
        .order("responded_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as CandidateResponse[];
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("candidate_responses")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["candidate-responses"] });
      queryClient.invalidateQueries({ queryKey: ["crm-stats"] });
      toast.success("Status updated successfully");
    },
    onError: (error: any) => {
      toast.error(`Failed to update status: ${error.message}`);
    }
  });

  const getStatusBadge = (status: string) => {
    const statusOption = statusOptions.find(option => option.value === status);
    return (
      <Badge variant={statusOption?.variant || "default"}>
        {statusOption?.label || status}
      </Badge>
    );
  };

  if (isLoading) {
    return <div className="flex justify-center p-4">Loading responses...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {statusOptions.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={() => setShowAddDialog(true)}>
          Add Response
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Candidate</TableHead>
              <TableHead>Job</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {responses?.map((response) => (
              <TableRow key={response.id}>
                <TableCell>
                  <div>
                    <div className="font-medium">{response.candidates.name}</div>
                    <div className="text-sm text-muted-foreground">{response.candidates.email}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <div>
                    <div className="font-medium">{response.crawled_jobs.title}</div>
                    <div className="text-sm text-muted-foreground">{response.crawled_jobs.company}</div>
                  </div>
                </TableCell>
                <TableCell className="capitalize">{response.response_type}</TableCell>
                <TableCell>{getStatusBadge(response.status)}</TableCell>
                <TableCell className="capitalize">{response.source || "—"}</TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(response.responded_at).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <Select
                    value={response.status}
                    onValueChange={(status) => updateStatusMutation.mutate({ id: response.id, status })}
                  >
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AddResponseDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["candidate-responses"] });
          queryClient.invalidateQueries({ queryKey: ["crm-stats"] });
        }}
      />
    </div>
  );
};
