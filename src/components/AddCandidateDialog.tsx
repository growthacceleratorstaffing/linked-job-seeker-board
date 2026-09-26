import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { extractCvText } from "@/lib/cvText";

const empty = { name: "", email: "", phone: "", jobId: "", position: "", company: "", location: "", linkedin: "", skills: "", experience: "" };

const AddCandidateDialog = ({ onCreated }: { onCreated: () => void }) => {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const { data: jobs = [] } = useQuery({
    queryKey: ["add-candidate-jobs"],
    enabled: open,
    queryFn: async () => (await supabase.from("jobs").select("id,title,company_name").order("title")).data ?? [],
  });
  const set = (key: keyof typeof empty) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({ ...form, [key]: e.target.value });

  const submit = async () => {
    if (!form.name.trim() || !/^\S+@\S+\.\S+$/.test(form.email) || !form.jobId) {
      toast({ title: "Missing details", description: "Name, a valid email and a linked job are required.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      let resume_url: string | null = null;
      let resume_text: string | null = null;
      if (file) {
        const path = `${crypto.randomUUID()}-${file.name.replace(/[^\w.-]/g, "_")}`;
        const { error } = await supabase.storage.from("candidate-cvs").upload(path, file);
        if (error) throw error;
        resume_url = `candidate-cvs/${path}`;
        resume_text = (await extractCvText(file)) || null;
      }
      const job = jobs.find((j) => j.id === form.jobId);
      const { error } = await supabase.from("candidates").insert({
        name: form.name.trim(), email: form.email.trim(), phone: form.phone || null,
        linked_job_id: form.jobId, current_position: form.position || job?.title || null,
        company: form.company || null, location: form.location || null,
        linkedin_profile_url: form.linkedin || null,
        skills: form.skills ? form.skills.split(",").map((s) => s.trim()).filter(Boolean) : null,
        experience_years: form.experience ? Number(form.experience) : null,
        resume_url, resume_text, source_platform: "growth accelerator", interview_stage: "applied", user_id: user?.id,
      });
      if (error) throw error;
      toast({ title: "Candidate added", description: `${form.name} is linked to ${job?.title ?? "the job"}.` });
      setForm(empty); setFile(null); setOpen(false); onCreated();
    } catch (error) {
      toast({ title: "Could not add candidate", description: error instanceof Error ? error.message : "Please try again.", variant: "destructive" });
    } finally { setSaving(false); }
  };

  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild><Button className="bg-secondary-pink text-primary-foreground hover:bg-secondary-pink/80"><UserPlus className="mr-2 h-4 w-4" />Add candidate</Button></DialogTrigger>
    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
      <DialogHeader><DialogTitle>Add candidate</DialogTitle></DialogHeader>
      <div className="grid gap-3">
        <div className="grid gap-1"><Label>Full name *</Label><Input value={form.name} onChange={set("name")} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1"><Label>Email *</Label><Input type="email" value={form.email} onChange={set("email")} /></div>
          <div className="grid gap-1"><Label>Phone</Label><Input value={form.phone} onChange={set("phone")} /></div>
        </div>
        <div className="grid gap-1"><Label>Linked job *</Label>
          <Select value={form.jobId} onValueChange={(jobId) => setForm({ ...form, jobId })}>
            <SelectTrigger><SelectValue placeholder={jobs.length ? "Choose a vacancy" : "No vacancies yet"} /></SelectTrigger>
            <SelectContent>{jobs.map((j) => <SelectItem key={j.id} value={j.id}>{j.title}{j.company_name ? ` — ${j.company_name}` : ""}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1"><Label>Current position</Label><Input value={form.position} onChange={set("position")} /></div>
          <div className="grid gap-1"><Label>Company</Label><Input value={form.company} onChange={set("company")} /></div>
          <div className="grid gap-1"><Label>Location</Label><Input value={form.location} onChange={set("location")} /></div>
          <div className="grid gap-1"><Label>Years of experience</Label><Input type="number" min={0} value={form.experience} onChange={set("experience")} /></div>
        </div>
        <div className="grid gap-1"><Label>LinkedIn profile URL</Label><Input placeholder="https://www.linkedin.com/in/…" value={form.linkedin} onChange={set("linkedin")} /></div>
        <div className="grid gap-1"><Label>Skills (comma separated)</Label><Textarea rows={2} value={form.skills} onChange={set("skills")} /></div>
        <div className="grid gap-1"><Label>CV (PDF, DOCX or TXT)</Label><Input type="file" accept=".pdf,.docx,.txt" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></div>
      </div>
      <DialogFooter><Button onClick={submit} disabled={saving} className="bg-secondary-pink text-primary-foreground hover:bg-secondary-pink/80">{saving ? "Saving…" : "Add candidate"}</Button></DialogFooter>
    </DialogContent>
  </Dialog>;
};

export default AddCandidateDialog;
