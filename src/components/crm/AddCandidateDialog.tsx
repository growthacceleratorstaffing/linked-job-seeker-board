
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface AddCandidateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const AddCandidateDialog = ({ open, onOpenChange, onSuccess }: AddCandidateDialogProps) => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: ""
  });

  const addCandidateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase
        .from("candidates")
        .insert([{
          name: data.name,
          email: data.email,
          phone: data.phone || null
        }]);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Candidate added successfully");
      setFormData({ name: "", email: "", phone: "" });
      onOpenChange(false);
      onSuccess();
    },
    onError: (error: any) => {
      toast.error(`Failed to add candidate: ${error.message}`);
    }
  });

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
            Add a new candidate to the CRM system.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Full name"
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
                placeholder="email@example.com"
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
