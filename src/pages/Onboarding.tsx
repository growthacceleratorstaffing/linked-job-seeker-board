import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { UserCheck, Users, Calendar, CheckCircle, Mail, Loader2, FileText, UserPlus, PenTool, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/Layout";

interface Candidate {
  id: string;
  name: string;
  email: string;
  current_position?: string;
  company?: string;
}

interface OnboardingStep {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  color: string;
  completed: boolean;
}

interface OnboardingProgress {
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  currentStep: number;
  steps: OnboardingStep[];
  startedAt: string;
}

const Onboarding = () => {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [onboardingProgress, setOnboardingProgress] = useState<OnboardingProgress[]>([]);
  const { toast } = useToast();

  const createInitialSteps = (): OnboardingStep[] => [
    {
      id: 'welcome-email',
      name: 'Welcome Email',
      description: 'Send welcome email to new hire',
      icon: Mail,
      color: 'text-blue-400',
      completed: false
    },
    {
      id: 'create-account',
      name: 'Create Account',
      description: 'Set up company accounts and credentials',
      icon: UserPlus,
      color: 'text-green-400',
      completed: false
    },
    {
      id: 'sign-contract',
      name: 'Sign Contract',
      description: 'Complete employment contract signing',
      icon: PenTool,
      color: 'text-orange-400',
      completed: false
    },
    {
      id: 'team-introduction',
      name: 'Team Introduction',
      description: 'Introduce to team members and schedule meetings',
      icon: Users,
      color: 'text-secondary-pink',
      completed: false
    }
  ];

  const STEP_COLUMNS = ['welcome_email_at', 'account_created_at', 'contract_signed_at', 'team_intro_at'] as const;
  const db = supabase as any;

  // Only candidates that were selected (matched) on the Matching page
  const fetchCandidates = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('candidate_responses')
        .select('candidate_id, status, candidates ( id, name, email, current_position, company )')
        .eq('status', 'matched')
        .order('created_at', { ascending: false });
      if (error) throw error;
      const seen = new Set<string>();
      const list: Candidate[] = [];
      (data || []).forEach((r: any) => {
        if (r.candidates && !seen.has(r.candidates.id)) { seen.add(r.candidates.id); list.push(r.candidates); }
      });
      setCandidates(list);
    } catch (error) {
      console.error('Error fetching matched candidates:', error);
      toast({ title: "Error", description: "Failed to fetch matched candidates", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const loadProgress = async () => {
    const { data, error } = await db.from('onboarding_progress').select('*').order('created_at', { ascending: false });
    if (error) { console.error(error); return; }
    const ids = (data || []).map((r: any) => r.candidate_id);
    const { data: emps } = ids.length
      ? await db.from('employees').select('candidate_id, contract_signed_at').in('candidate_id', ids)
      : { data: [] };
    setOnboardingProgress((data || []).map((r: any) => {
      const signed = r.contract_signed_at || emps?.find((e: any) => e.candidate_id === r.candidate_id)?.contract_signed_at;
      const row = { ...r, contract_signed_at: signed };
      const steps = createInitialSteps().map((s, i) => ({ ...s, completed: !!row[STEP_COLUMNS[i]] }));
      const firstOpen = steps.findIndex((s) => !s.completed);
      return {
        candidateId: r.candidate_id, candidateName: r.candidate_name, candidateEmail: r.candidate_email,
        currentStep: firstOpen === -1 ? steps.length - 1 : firstOpen, steps, startedAt: r.created_at,
        dates: STEP_COLUMNS.map((c) => row[c] as string | null),
      } as OnboardingProgress & { dates: (string | null)[] };
    }));
  };

  useEffect(() => {
    fetchCandidates();
    loadProgress();
  }, []);

  const handleBeginOnboarding = async () => {
    if (!selectedCandidateId) {
      toast({
        title: "Please select a candidate",
        description: "You must select a candidate before beginning onboarding",
        variant: "destructive",
      });
      return;
    }

    const selectedCandidate = candidates.find(c => c.id === selectedCandidateId);
    if (!selectedCandidate) {
      toast({
        title: "Candidate not found",
        description: "The selected candidate could not be found",
        variant: "destructive",
      });
      return;
    }

    // Check if candidate already has onboarding in progress
    const existingProgress = onboardingProgress.find(p => p.candidateId === selectedCandidateId);
    if (existingProgress) {
      toast({
        title: "Onboarding Already Started",
        description: `${selectedCandidate.name} already has an onboarding process in progress`,
        variant: "destructive",
      });
      return;
    }

    setIsSendingEmail(true);
    try {
      console.log('Sending email to:', selectedCandidate.email);
      
      const { data, error } = await supabase.functions.invoke('send-onboarding-email', {
        body: {
          candidateId: selectedCandidate.id,
          candidateName: selectedCandidate.name,
          candidateEmail: selectedCandidate.email,
          jobTitle: selectedCandidate.current_position,
          companyName: 'Growth Accelerator'
        }
      });

      console.log('Email response:', { data, error });

      if (error) throw error;

      if (data?.success) {
        const { error: saveErr } = await db.from('onboarding_progress').upsert({
          candidate_id: selectedCandidate.id,
          candidate_name: selectedCandidate.name,
          candidate_email: selectedCandidate.email,
          job_title: selectedCandidate.current_position || null,
          welcome_email_at: new Date().toISOString(),
        }, { onConflict: 'candidate_id' });
        if (saveErr) throw saveErr;
        await loadProgress();
        
        toast({
          title: "Onboarding Started! 📧",
          description: `Welcome email sent to ${selectedCandidate.name}. Onboarding pipeline initiated.`,
        });
        
        // Reset selection after successful send
        setSelectedCandidateId('');
      } else {
        throw new Error(data?.error || 'Failed to send email');
      }
    } catch (error) {
      console.error('Error sending onboarding email:', error);
      toast({
        title: "Failed to Send Email",
        description: error instanceof Error ? error.message : "Failed to send onboarding email",
        variant: "destructive",
      });
    } finally {
      setIsSendingEmail(false);
    }
  };

  const [accountFor, setAccountFor] = useState<OnboardingProgress | null>(null);
  const [accountForm, setAccountForm] = useState({ job_title: '', client_company: '', hourly_rate: '', start_date: '' });
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [createdLogin, setCreatedLogin] = useState<{ email: string; password: string } | null>(null);

  const createAccount = async () => {
    if (!accountFor) return;
    setCreatingAccount(true);
    const { data, error } = await supabase.functions.invoke('create-employee-account', {
      body: { full_name: accountFor.candidateName, email: accountFor.candidateEmail, candidate_id: accountFor.candidateId, ...accountForm },
    });
    setCreatingAccount(false);
    if (error || data?.error) {
      let msg = data?.error || error?.message;
      try { msg = JSON.parse(await (error as any).context.text()).error; } catch { /* keep */ }
      toast({ title: 'Could not create account', description: msg, variant: 'destructive' });
      return;
    }
    setCreatedLogin({ email: data.email, password: data.password });
    completeStep(accountFor.candidateId, 1);
  };

  const completeStep = async (candidateId: string, stepIndex: number) => {
    const { error } = await db.from('onboarding_progress')
      .update({ [STEP_COLUMNS[stepIndex]]: new Date().toISOString() })
      .eq('candidate_id', candidateId);
    if (error) { toast({ title: 'Could not save step', description: error.message, variant: 'destructive' }); return; }
    const candidateName = onboardingProgress.find(p => p.candidateId === candidateId)?.candidateName;
    toast({ title: "Step Completed! ✅", description: `${createInitialSteps()[stepIndex].name} completed for ${candidateName}` });
    loadProgress();
  };

  const selectedCandidate = candidates.find(c => c.id === selectedCandidateId);

  return (
    <Layout>
      <div className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Employee Onboarding</h1>
          <p className="text-slate-300">Send welcome emails and manage new employee onboarding workflow</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6">
          <Card className="bg-primary-blue border border-white/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-white">Total Matches</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{candidates.length}</div>
              <p className="text-xs text-slate-400">Selected at Matching, available for onboarding</p>
            </CardContent>
          </Card>
        </div>

        {/* Candidate Selection Card */}
        <Card className="bg-primary-blue border border-white/20 mb-6">
          <CardHeader>
            <CardTitle className="flex items-center text-white">
              <Mail className="mr-2 h-5 w-5 text-secondary-pink" />
              Send Onboarding Email
            </CardTitle>
            <CardDescription className="text-slate-400">
              Select a candidate to send them a welcome email and begin the onboarding process
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="candidate-select" className="text-white">Choose Candidate</Label>
              <Select value={selectedCandidateId} onValueChange={setSelectedCandidateId}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder={isLoading ? "Loading candidates..." : candidates.length === 0 ? "No matched candidates yet — match someone on the Matching page first" : "Select a matched candidate"} />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  {candidates.map((candidate) => (
                    <SelectItem key={candidate.id} value={candidate.id} className="text-white hover:bg-slate-600">
                      <div className="flex flex-col">
                        <span className="font-medium">{candidate.name}</span>
                        <span className="text-sm text-slate-400">{candidate.email}</span>
                        {candidate.current_position && (
                          <span className="text-xs text-slate-500">{candidate.current_position}</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedCandidate && (
              <div className="bg-slate-700 p-4 rounded-lg">
                <h4 className="text-white font-medium mb-2">Selected Candidate:</h4>
                <div className="space-y-1 text-sm">
                  <p className="text-white"><strong>Name:</strong> {selectedCandidate.name}</p>
                  <p className="text-slate-300"><strong>Email:</strong> {selectedCandidate.email}</p>
                  {selectedCandidate.current_position && (
                    <p className="text-slate-300"><strong>Position:</strong> {selectedCandidate.current_position}</p>
                  )}
                  {selectedCandidate.company && (
                    <p className="text-slate-300"><strong>Current Company:</strong> {selectedCandidate.company}</p>
                  )}
                </div>
              </div>
            )}

            <Button 
              onClick={handleBeginOnboarding}
              disabled={!selectedCandidateId || isSendingEmail || isLoading}
              className="w-full bg-secondary-pink hover:bg-secondary-pink/80 text-white"
            >
              {isSendingEmail ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending Welcome Email...
                </>
              ) : (
                <>
                  <UserCheck className="mr-2 h-4 w-4" />
                  Begin Onboarding
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Onboarding Pipeline Card */}
        <Card className="bg-primary-blue border border-white/20">
          <CardHeader>
            <CardTitle className="flex items-center text-white">
              <Users className="mr-2 h-5 w-5 text-secondary-pink" />
              Onboarding Pipeline
            </CardTitle>
            <CardDescription className="text-slate-400">
              Track and manage the onboarding process for new employees
            </CardDescription>
          </CardHeader>
          <CardContent>
            {onboardingProgress.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <Calendar className="mx-auto h-12 w-12 mb-4 text-secondary-pink" />
                <h3 className="text-lg font-semibold mb-2 text-white">Ready to Start Onboarding</h3>
                <p className="mb-6">Select a candidate above to begin their onboarding journey through our 4-step process</p>
                
                {/* Preview of Onboarding Steps */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
                  {createInitialSteps().map((step, index) => {
                    const IconComponent = step.icon;
                    return (
                      <div key={step.id} className="bg-slate-700 p-4 rounded-lg relative">
                        <IconComponent className={`w-6 h-6 ${step.color} mb-2`} />
                        <h4 className="text-white text-sm font-medium mb-1">{step.name}</h4>
                        <p className="text-xs text-slate-400">{step.description}</p>
                        <div className="absolute top-2 right-2 bg-slate-600 text-slate-400 text-xs px-2 py-1 rounded-full">
                          {index + 1}
                        </div>
                        {index < 3 && (
                          <ArrowRight className="absolute -right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500 hidden lg:block" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <h3 className="text-xl font-semibold text-white mb-2">People who received the onboarding email</h3>
                <div className="overflow-x-auto rounded-lg border border-white/15">
                  <table className="w-full text-sm text-white">
                    <thead className="bg-white/5 text-left text-slate-300">
                      <tr>
                        <th className="p-3">Name</th><th className="p-3">Email</th>
                        {createInitialSteps().map((s) => <th key={s.id} className="p-3">{s.name}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {onboardingProgress.map((p: any) => (
                        <tr key={p.candidateId} className="border-t border-white/10">
                          <td className="p-3 font-medium">{p.candidateName}</td>
                          <td className="p-3 text-slate-300">{p.candidateEmail}</td>
                          {p.steps.map((s: OnboardingStep, i: number) => (
                            <td key={s.id} className="p-3">
                              {s.completed ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-green-500/20 px-2 py-0.5 text-xs text-green-300">
                                  <CheckCircle className="h-3 w-3" />{p.dates?.[i] ? new Date(p.dates[i]).toLocaleDateString('nl-NL') : 'Done'}
                                </span>
                              ) : (
                                <span className="rounded-full bg-yellow-500/20 px-2 py-0.5 text-xs text-yellow-200">Pending</span>
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <h3 className="text-xl font-semibold text-white mb-4 pt-4">Active Onboarding Processes</h3>
                
                {onboardingProgress.map((progress) => {
                  const completedSteps = progress.steps.filter(step => step.completed).length;
                  const progressPercentage = (completedSteps / progress.steps.length) * 100;
                  
                  return (
                    <Card key={progress.candidateId} className="bg-slate-700 border-slate-600">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h4 className="text-lg font-semibold text-white">{progress.candidateName}</h4>
                            <p className="text-sm text-slate-400">{progress.candidateEmail}</p>
                            <p className="text-xs text-slate-500">Started: {new Date(progress.startedAt).toLocaleDateString()}</p>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-white">{completedSteps}/{progress.steps.length}</div>
                            <p className="text-xs text-slate-400">Steps Completed</p>
                          </div>
                        </div>
                        
                        <div className="mb-4">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-white">Progress</span>
                            <span className="text-sm text-slate-400">{Math.round(progressPercentage)}%</span>
                          </div>
                          <Progress value={progressPercentage} className="h-2" />
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                          {progress.steps.map((step, index) => {
                            const IconComponent = step.icon;
                            const isCurrentStep = index === progress.currentStep && !step.completed;
                            
                            return (
                              <div 
                                key={step.id} 
                                className={`p-3 rounded-lg border-2 transition-all ${
                                  step.completed 
                                    ? 'bg-green-500/10 border-green-500/30' 
                                    : isCurrentStep 
                                    ? 'bg-secondary-pink/10 border-secondary-pink/30' 
                                    : 'bg-slate-600 border-slate-500'
                                }`}
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <IconComponent className={`w-5 h-5 ${
                                    step.completed ? 'text-green-400' : step.color
                                  }`} />
                                  {step.completed && (
                                    <CheckCircle className="w-4 h-4 text-green-400" />
                                  )}
                                </div>
                                <h5 className="text-sm font-medium text-white mb-1">{step.name}</h5>
                                <p className="text-xs text-slate-400 mb-2">{step.description}</p>
                                
                                {!step.completed && isCurrentStep && (
                                  <Button
                                    size="sm"
                                    onClick={() => step.id === 'create-account'
                                      ? (setAccountFor(progress), setCreatedLogin(null))
                                      : completeStep(progress.candidateId, index)}
                                    className="w-full bg-secondary-pink hover:bg-secondary-pink/80 text-white text-xs"
                                  >
                                    {step.id === 'create-account' ? 'Create Account' : 'Mark Complete'}
                                  </Button>
                                )}
                                
                                {step.completed && (
                                  <div className="text-xs text-green-400 font-medium">✓ Completed</div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={!!accountFor} onOpenChange={(o) => !o && setAccountFor(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create backoffice account</DialogTitle>
              <DialogDescription>
                {accountFor?.candidateName} ({accountFor?.candidateEmail}) gets their own login with only Onboarding and Backoffice.
              </DialogDescription>
            </DialogHeader>
            {createdLogin ? (
              <div className="space-y-2 text-sm">
                <p>Account ready. Share these login details with the new hire:</p>
                <div className="rounded bg-muted p-3 font-mono">
                  <div>Email: {createdLogin.email}</div>
                  <div>Password: {createdLogin.password}</div>
                  <div>Login: {window.location.origin}/auth</div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1 col-span-2"><Label>Position</Label><Input value={accountForm.job_title} onChange={(e) => setAccountForm({ ...accountForm, job_title: e.target.value })} /></div>
                <div className="space-y-1 col-span-2"><Label>Client company</Label><Input value={accountForm.client_company} onChange={(e) => setAccountForm({ ...accountForm, client_company: e.target.value })} /></div>
                <div className="space-y-1"><Label>Hourly wage (€)</Label><Input type="number" value={accountForm.hourly_rate} onChange={(e) => setAccountForm({ ...accountForm, hourly_rate: e.target.value })} /></div>
                <div className="space-y-1"><Label>Start date</Label><Input type="date" value={accountForm.start_date} onChange={(e) => setAccountForm({ ...accountForm, start_date: e.target.value })} /></div>
              </div>
            )}
            <DialogFooter>
              {createdLogin ? (
                <Button onClick={() => setAccountFor(null)} className="bg-pink-600 hover:bg-pink-700 text-white">Done</Button>
              ) : (
                <Button onClick={createAccount} disabled={creatingAccount} className="bg-pink-600 hover:bg-pink-700 text-white">
                  {creatingAccount && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create account
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default Onboarding;