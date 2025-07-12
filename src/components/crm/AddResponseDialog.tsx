
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface AddResponseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const AddResponseDialog = ({ open, onOpenChange, onSuccess }: AddResponseDialogProps) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    candidate_id: "",
    job_id: "",
    response_type: "application",
    message: "",
    source: ""
  });

  const { data: candidates } = useQuery({
    queryKey: ["candidates-for-response"],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from("candidates")
        .select("id, name, email")
        .eq("user_id", user.id)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: open && !!user?.id
  });

  const { data: jobs } = useQuery({
    queryKey: ["jobs-for-response"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crawled_jobs")
        .select("id, title, company")
        .eq("is_active", true)
        .order("title");
      if (error) throw error;
      return data;
    },
    enabled: open
  });

  const addResponseMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase
        .from("candidate_responses")
        .insert([{
          candidate_id: data.candidate_id,
          job_id: data.job_id,
          response_type: data.response_type,
          message: data.message || null,
          source: data.source || null
        }]);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Response added successfully");
      setFormData({
        candidate_id: "",
        job_id: "",
        response_type: "application",
        message: "",
        source: ""
      });
      onOpenChange(false);
      onSuccess();
    },
    onError: (error: any) => {
      toast.error(`Failed to add response: ${error.message}`);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.candidate_id || !formData.job_id) {
      toast.error("Candidate and job are required");
      return;
    }
    addResponseMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Add Candidate Response</DialogTitle>
          <DialogDescription>
            Record a new response from a candidate to a job advertisement.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="candidate">Candidate *</Label>
              <Select value={formData.candidate_id} onValueChange={(value) => 
                setFormData(prev => ({ ...prev, candidate_id: value }))
              }>
                <SelectTrigger>
                  <SelectValue placeholder="Select a candidate" />
                </SelectTrigger>
                <SelectContent>
                  {candidates?.map(candidate => (
                    <SelectItem key={candidate.id} value={candidate.id}>
                      {candidate.name} ({candidate.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="job">Job *</Label>
              <Select value={formData.job_id} onValueChange={(value) => 
                setFormData(prev => ({ ...prev, job_id: value }))
              }>
                <SelectTrigger>
                  <SelectValue placeholder="Select a job" />
                </SelectTrigger>
                <SelectContent>
                  {jobs?.map(job => (
                    <SelectItem key={job.id} value={job.id}>
                      {job.title} - {job.company}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="response_type">Response Type</Label>
              <Select value={formData.response_type} onValueChange={(value) => 
                setFormData(prev => ({ ...prev, response_type: value }))
              }>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="application">Application</SelectItem>
                  <SelectItem value="inquiry">Inquiry</SelectItem>
                  <SelectItem value="follow-up">Follow-up</SelectItem>
                  <SelectItem value="interview-request">Interview Request</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="source">Source</Label>
              <Input
                id="source"
                value={formData.source}
                onChange={(e) => setFormData(prev => ({ ...prev, source: e.target.value }))}
                placeholder="e.g., email, website, linkedin"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                value={formData.message}
                onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                placeholder="Additional notes or message content..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={addResponseMutation.isPending}>
              {addResponseMutation.isPending ? "Adding..." : "Add Response"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
