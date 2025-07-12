import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { X } from "lucide-react";

interface OnboardMatchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMatchCreated?: () => void;
}

interface Job {
  id: string;
  title: string;
  company: string;
  location?: string;
}

interface Candidate {
  id: string;
  name: string;
  email: string;
  current_position?: string;
  company?: string;
}

const OnboardMatchDialog: React.FC<OnboardMatchDialogProps> = ({ open, onOpenChange, onMatchCreated }) => {
  const [jobOption, setJobOption] = useState<'existing' | 'new'>('existing');
  const [candidateOption, setCandidateOption] = useState<'existing' | 'new'>('existing');
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>('');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // New job form
  const [newJob, setNewJob] = useState({
    title: '',
    company: '',
    location: '',
    description: ''
  });
  
  // New candidate form
  const [newCandidate, setNewCandidate] = useState({
    name: '',
    email: '',
    current_position: '',
    company: '',
    phone: ''
  });
  
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchJobs();
      fetchCandidates();
    }
  }, [open]);

  const fetchJobs = async () => {
    try {
      // External job integration disabled
      setJobs([]);
    } catch (error) {
      console.error('Error fetching jobs:', error);
    }
  };

  const fetchCandidates = async () => {
    try {
      // Only fetch candidates that have been matched
      const { data, error } = await supabase
        .from('candidates')
        .select(`
          id, 
          name, 
          email, 
          current_position, 
          company,
          candidate_responses!inner(status)
        `)
        .eq('candidate_responses.status', 'matched')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setCandidates(data || []);
    } catch (error) {
      console.error('Error fetching matched candidates:', error);
    }
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      // Validate that either existing options are selected or we're creating new ones
      if (jobOption === 'existing' && !selectedJobId) {
        toast({
          title: "Error",
          description: "Please select a job or choose to add a new one",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      if (candidateOption === 'existing' && !selectedCandidateId) {
        toast({
          title: "Error", 
          description: "Please select a candidate or choose to add a new one",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }
      let jobId = selectedJobId;
      let candidateId = selectedCandidateId;

      // Handle job creation/selection
      if (jobOption === 'new') {
        if (!newJob.title || !newJob.company) {
          toast({
            title: "Error",
            description: "Please fill in all required job fields",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }

        const { data: jobData, error: jobError } = await supabase
          .from('crawled_jobs')
          .insert([{
            title: newJob.title,
            company: newJob.company,
            location: newJob.location,
            description: newJob.description,
            source: 'manual',
            url: 'manual-entry'
          }])
          .select()
          .single();

        if (jobError) throw jobError;
        jobId = jobData.id;
      } else {
        // For existing external jobs, we need to create/find the corresponding crawled_jobs entry
        const selectedJob = jobs.find(j => j.id === selectedJobId);
        if (!selectedJob) {
          toast({
            title: "Error",
            description: "Selected job not found",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }

        // Check if this external job already exists in crawled_jobs
        const { data: existingJob, error: findError } = await supabase
          .from('crawled_jobs')
          .select('id')
          .eq('source', 'external')
          .eq('url', `external-${selectedJobId}`)
          .single();

        if (findError && findError.code !== 'PGRST116') { // PGRST116 is "not found" error
          throw findError;
        }

        if (existingJob) {
          jobId = existingJob.id;
        } else {
          // Create new crawled_jobs entry for this external job
          const { data: jobData, error: jobError } = await supabase
            .from('crawled_jobs')
            .insert([{
              title: selectedJob.title,
              company: selectedJob.company,
              location: selectedJob.location || '',
              description: `External job: ${selectedJob.title}`,
              source: 'external',
              url: `external-${selectedJobId}`
            }])
            .select()
            .single();

          if (jobError) throw jobError;
          jobId = jobData.id;
        }
      }

      // Create new candidate if needed
      if (candidateOption === 'new') {
        if (!newCandidate.name || !newCandidate.email) {
          toast({
            title: "Error",
            description: "Please fill in all required candidate fields",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }

        // Check if candidate with this email already exists
        const { data: existingCandidate } = await supabase
          .from('candidates')
          .select('id, email')
          .eq('email', newCandidate.email)
          .single();

        if (existingCandidate) {
          toast({
            title: "Error",
            description: `A candidate with email ${newCandidate.email} already exists. Please use a different email or select the existing candidate.`,
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }

        const { data: candidateData, error: candidateError } = await supabase
          .from('candidates')
          .insert([{
            name: newCandidate.name,
            email: newCandidate.email,
            current_position: newCandidate.current_position,
            company: newCandidate.company,
            phone: newCandidate.phone,
            source_platform: 'manual'
          }])
          .select()
          .single();

        if (candidateError) {
          console.error('Candidate creation error:', candidateError);
          throw candidateError;
        }
        candidateId = candidateData.id;
      }

      // Create the match/response record
      if (jobId && candidateId) {
        const { error: responseError } = await supabase
          .from('candidate_responses')
          .insert([{
            candidate_id: candidateId,
            job_id: jobId,
            response_type: 'manual_match',
            status: 'matched',
            message: 'Manual match created through matching interface'
          }]);

        if (responseError) throw responseError;

        toast({
          title: "Success",
          description: "Successfully matched candidate to job and sent notification email",
        });

        // Send onboarding email to candidate
        try {
          const candidateData = candidateOption === 'new' ? newCandidate : candidates.find(c => c.id === candidateId);
          const jobData = jobOption === 'new' ? newJob : jobs.find(j => j.id === jobId);
          
          if (candidateData && jobData) {
            await supabase.functions.invoke('send-onboarding-email', {
              body: {
                candidateName: candidateData.name,
                candidateEmail: candidateData.email,
                jobTitle: jobData.title,
                companyName: jobData.company,
                location: jobData.location
              }
            });
          }
        } catch (emailError) {
          console.error('Failed to send onboarding email:', emailError);
          // Don't fail the whole process if email fails
        }

        // Call the callback to refresh matches
        console.log('Match created successfully, calling onMatchCreated callback');
        if (onMatchCreated) {
          await onMatchCreated();
          console.log('onMatchCreated callback completed');
        }

        // Reset form and close dialog
        resetForm();
        onOpenChange(false);
      }
    } catch (error: any) {
      console.error('Error creating match:', error);
      
      let errorMessage = "Failed to create match";
      
      // Handle specific database constraint errors
      if (error?.code === '23505') {
        if (error.message.includes('candidates_email_key')) {
          errorMessage = "A candidate with this email already exists. Please use a different email or select the existing candidate.";
        } else if (error.message.includes('candidate_responses')) {
          errorMessage = "A match between this candidate and job already exists.";
        }
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setJobOption('existing');
    setCandidateOption('existing');
    setSelectedJobId('');
    setSelectedCandidateId('');
    setNewJob({ title: '', company: '', location: '', description: '' });
    setNewCandidate({ name: '', email: '', current_position: '', company: '', phone: '' });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-slate-800 border-slate-700 text-white">
        <DialogHeader>
          <DialogTitle className="text-white">Onboard your new match</DialogTitle>
          <p className="text-slate-400">Select or create a job and either choose an existing candidate or add a new one.</p>
        </DialogHeader>

        <div className="space-y-6">
          {/* Job Selection */}
          <div>
            <Label className="text-white mb-3 block">Choose Job Option</Label>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <Button
                type="button"
                variant={jobOption === 'existing' ? 'default' : 'outline'}
                className={jobOption === 'existing' ? 'bg-secondary-pink hover:bg-secondary-pink/80' : 'border-slate-600 text-slate-300 hover:bg-slate-700'}
                onClick={() => setJobOption('existing')}
              >
                Existing Job
              </Button>
              <Button
                type="button"
                variant={jobOption === 'new' ? 'default' : 'outline'}
                className={jobOption === 'new' ? 'bg-secondary-pink hover:bg-secondary-pink/80' : 'border-slate-600 text-slate-300 hover:bg-slate-700'}
                onClick={() => setJobOption('new')}
              >
                Add New Job
              </Button>
            </div>

            {jobOption === 'existing' ? (
              <Select value={selectedJobId} onValueChange={setSelectedJobId}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="Choose a job position" />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  {jobs.map((job) => (
                    <SelectItem key={job.id} value={job.id} className="text-white hover:bg-slate-600">
                      {job.title} - {job.company} {job.location && `(${job.location})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-white">Job Title *</Label>
                    <Input
                      value={newJob.title}
                      onChange={(e) => setNewJob({ ...newJob, title: e.target.value })}
                      className="bg-slate-700 border-slate-600 text-white"
                      placeholder="e.g. Senior Developer"
                    />
                  </div>
                  <div>
                    <Label className="text-white">Company *</Label>
                    <Input
                      value={newJob.company}
                      onChange={(e) => setNewJob({ ...newJob, company: e.target.value })}
                      className="bg-slate-700 border-slate-600 text-white"
                      placeholder="e.g. Tech Corp"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-white">Location</Label>
                  <Input
                    value={newJob.location}
                    onChange={(e) => setNewJob({ ...newJob, location: e.target.value })}
                    className="bg-slate-700 border-slate-600 text-white"
                    placeholder="e.g. Amsterdam, Netherlands"
                  />
                </div>
                <div>
                  <Label className="text-white">Description</Label>
                  <Textarea
                    value={newJob.description}
                    onChange={(e) => setNewJob({ ...newJob, description: e.target.value })}
                    className="bg-slate-700 border-slate-600 text-white"
                    placeholder="Job description..."
                    rows={3}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Candidate Selection */}
          <div>
            <Label className="text-white mb-3 block">Choose Candidate Option</Label>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <Button
                type="button"
                variant={candidateOption === 'existing' ? 'default' : 'outline'}
                className={candidateOption === 'existing' ? 'bg-secondary-pink hover:bg-secondary-pink/80' : 'border-slate-600 text-slate-300 hover:bg-slate-700'}
                onClick={() => setCandidateOption('existing')}
              >
                Existing Candidate
              </Button>
              <Button
                type="button"
                variant={candidateOption === 'new' ? 'default' : 'outline'}
                className={candidateOption === 'new' ? 'bg-secondary-pink hover:bg-secondary-pink/80' : 'border-slate-600 text-slate-300 hover:bg-slate-700'}
                onClick={() => setCandidateOption('new')}
              >
                Add New Candidate
              </Button>
            </div>

            {candidateOption === 'existing' ? (
              <Select value={selectedCandidateId} onValueChange={setSelectedCandidateId}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="Choose an existing candidate" />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  {candidates.map((candidate) => (
                    <SelectItem key={candidate.id} value={candidate.id} className="text-white hover:bg-slate-600">
                      {candidate.name} - {candidate.email} {candidate.current_position && `(${candidate.current_position})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-white">Full Name *</Label>
                    <Input
                      value={newCandidate.name}
                      onChange={(e) => setNewCandidate({ ...newCandidate, name: e.target.value })}
                      className="bg-slate-700 border-slate-600 text-white"
                      placeholder="e.g. John Doe"
                    />
                  </div>
                  <div>
                    <Label className="text-white">Email *</Label>
                    <Input
                      value={newCandidate.email}
                      onChange={(e) => setNewCandidate({ ...newCandidate, email: e.target.value })}
                      className="bg-slate-700 border-slate-600 text-white"
                      placeholder="e.g. john@example.com"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-white">Current Position</Label>
                    <Input
                      value={newCandidate.current_position}
                      onChange={(e) => setNewCandidate({ ...newCandidate, current_position: e.target.value })}
                      className="bg-slate-700 border-slate-600 text-white"
                      placeholder="e.g. Software Engineer"
                    />
                  </div>
                  <div>
                    <Label className="text-white">Company</Label>
                    <Input
                      value={newCandidate.company}
                      onChange={(e) => setNewCandidate({ ...newCandidate, company: e.target.value })}
                      className="bg-slate-700 border-slate-600 text-white"
                      placeholder="e.g. Current Corp"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-white">Phone</Label>
                  <Input
                    value={newCandidate.phone}
                    onChange={(e) => setNewCandidate({ ...newCandidate, phone: e.target.value })}
                    className="bg-slate-700 border-slate-600 text-white"
                    placeholder="e.g. +31 6 1234 5678"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            disabled={isLoading || (jobOption === 'existing' && !selectedJobId) || (candidateOption === 'existing' && !selectedCandidateId)}
            className="w-full bg-secondary-pink hover:bg-secondary-pink/80 text-white"
          >
            {isLoading ? 'Creating Match...' : 'Match candidate with job'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OnboardMatchDialog;