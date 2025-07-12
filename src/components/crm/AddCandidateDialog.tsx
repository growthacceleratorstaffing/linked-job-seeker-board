
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface AddCandidateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const AddCandidateDialog = ({ open, onOpenChange, onSuccess }: AddCandidateDialogProps) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    location: "",
    current_position: "",
    company: "",
    skills: ""
  });

  // Return early if no user
  if (!user) {
    return null;
  }

  const addCandidateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      // First, add to local database
      const candidateData = {
        name: data.name,
        email: data.email,
        phone: data.phone || null,
        location: data.location || null,
        current_position: data.current_position || null,
        company: data.company || null,
        skills: data.skills ? data.skills.split(',').map(s => s.trim()).filter(s => s) : [],
        source_platform: 'manual',
        profile_completeness_score: calculateCompletenessScore(data),
        interview_stage: 'pending' as const,
        user_id: user.id // Associate with logged-in user
      };

      const { data: insertResult, error } = await supabase
        .from("candidates")
        .insert(candidateData)
        .select()
        .single();
      
      if (error) throw error;

      // Attempt to sync with external platforms (don't fail if this doesn't work)
      try {
        await syncWithExternalPlatforms(candidateData);
      } catch (syncError) {
        console.warn('External sync failed but candidate was added locally:', syncError);
      }

      return insertResult;
    },
    onSuccess: (data) => {
      toast.success("Candidate added successfully! 🎉", {
        description: "The candidate is now visible in your candidate list."
      });
      setFormData({ 
        name: "", 
        email: "", 
        phone: "", 
        location: "", 
        current_position: "", 
        company: "", 
        skills: "" 
      });
      onOpenChange(false);
      onSuccess();
    },
    onError: (error: any) => {
      toast.error(`Failed to add candidate: ${error.message}`);
    }
  });

  const calculateCompletenessScore = (data: typeof formData) => {
    let score = 0;
    if (data.name) score += 20;
    if (data.email) score += 20;
    if (data.phone) score += 15;
    if (data.current_position) score += 15;
    if (data.company) score += 10;
    if (data.location) score += 10;
    if (data.skills) score += 10;
    return Math.min(score, 100);
  };

  const syncWithExternalPlatforms = async (candidateData: any) => {
    const syncPromises = [];

    // Try to sync with integration

    // Try to sync with external platforms
    syncPromises.push(
      supabase.functions.invoke('workable-integration', {
        body: { 
          action: 'create_candidate',
          candidateData: candidateData
        }
      }).catch(error => {
        console.warn('External platform sync failed:', error);
        return { success: false, platform: 'External Platform 2', error };
      })
    );

    // Wait for all sync attempts (but don't fail if they don't work)
    const results = await Promise.allSettled(syncPromises);
    
    // Log results for debugging
    results.forEach((result, index) => {
      const platform = index === 0 ? 'External Platform 1' : 'External Platform 2';
      if (result.status === 'fulfilled') {
        console.log(`${platform} sync result:`, result.value);
      } else {
        console.warn(`${platform} sync rejected:`, result.reason);
      }
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email) {
      toast.error("Name and email are required");
      return;
    }
    addCandidateMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Candidate</DialogTitle>
          <DialogDescription>
            Add a new candidate to your database. They will appear immediately in your candidate list.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4 max-h-96 overflow-y-auto">
            <div className="grid gap-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="John Doe"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="john.doe@example.com"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="+1 (555) 123-4567"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                placeholder="Amsterdam, Netherlands"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="current_position">Current Position</Label>
              <Input
                id="current_position"
                value={formData.current_position}
                onChange={(e) => setFormData(prev => ({ ...prev, current_position: e.target.value }))}
                placeholder="Senior Software Engineer"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="company">Company</Label>
              <Input
                id="company"
                value={formData.company}
                onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                placeholder="Tech Corp"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="skills">Skills</Label>
              <Input
                id="skills"
                value={formData.skills}
                onChange={(e) => setFormData(prev => ({ ...prev, skills: e.target.value }))}
                placeholder="React, TypeScript, Node.js (comma separated)"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={addCandidateMutation.isPending}>
              {addCandidateMutation.isPending ? "Adding..." : "Add Candidate"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
