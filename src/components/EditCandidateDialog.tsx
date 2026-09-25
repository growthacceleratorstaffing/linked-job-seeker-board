import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const STAGES = ["sourced", "applied", "phone_screen", "interview", "offer", "hired", "rejected", "withdrawn"];
const isUuid = (s: string) => /^[0-9a-f-]{36}$/i.test(s);

interface Props {
  candidate: { id: string; name: string; email: string; phone: string; stage: string; job: { title: string } } | null;
  onClose: () => void;
  onSaved: () => void;
}

const EditCandidateDialog = ({ candidate, onClose, onSaved }: Props) => {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", current_position: "", company: "", location: "", linkedin_profile_url: "", interview_stage: "applied" });

  useEffect(() => {
    if (!candidate) return;
    const base = { name: candidate.name || "", email: candidate.email || "", phone: candidate.phone || "", current_position: candidate.job?.title === "Unknown Position" ? "" : candidate.job?.title || "", company: "", location: "", linkedin_profile_url: "", interview_stage: STAGES.includes(candidate.stage) ? candidate.stage : "applied" };
    setForm(base);
    // Load the full saved record if it exists
    const q = isUuid(candidate.id)
      ? supabase.from("candidates").select("*").eq("id", candidate.id)
      : supabase.from("candidates").select("*").eq("email", candidate.email);
    q.maybeSingle().then(({ data }) => {
      if (data) setForm({
        name: data.name || "", email: data.email || "", phone: data.phone || "", current_position: data.current_position || "",
        company: data.company || "", location: data.location || "", linkedin_profile_url: data.linkedin_profile_url || "",
        interview_stage: (data.interview_stage as string) || base.interview_stage,
      });
    });
  }, [candidate]);

  const save = async () => {
    if (!candidate) return;
    if (!form.name.trim() || !form.email.trim()) { toast({ title: "Name and email are required", variant: "destructive" }); return; }
    setSaving(true);
    const payload: any = { ...form, name: form.name.trim(), email: form.email.trim() };
    let error;
    if (isUuid(candidate.id)) {
      ({ error } = await supabase.from("candidates").update(payload).eq("id", candidate.id));
    } else {
      const { data: existing } = await supabase.from("candidates").select("id").eq("email", candidate.email).maybeSingle();
      ({ error } = existing
        ? await supabase.from("candidates").update(payload).eq("id", existing.id)
        : await supabase.from("candidates").insert({ ...payload, workable_candidate_id: candidate.id, source_platform: "workable" }));
    }
    setSaving(false);
    if (error) { toast({ title: "Could not save", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Candidate saved", description: form.name });
    onSaved();
    onClose();
  };

  const f = (key: keyof typeof form, label: string, type = "text") => (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Input type={type} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
    </div>
  );

  return (
    <Dialog open={!!candidate} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit candidate</DialogTitle>
          <DialogDescription>Changes are saved in this app.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          {f("name", "Name")}
          {f("email", "Email", "email")}
          {f("phone", "Phone")}
          {f("current_position", "Position")}
          {f("company", "Company")}
          {f("location", "Location")}
          <div className="col-span-2">{f("linkedin_profile_url", "LinkedIn URL")}</div>
          <div className="space-y-1 col-span-2">
            <Label>Stage</Label>
            <Select value={form.interview_stage} onValueChange={(v) => setForm({ ...form, interview_stage: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{STAGES.map((s) => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={save} disabled={saving} className="bg-pink-600 hover:bg-pink-700 text-white">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditCandidateDialog;
