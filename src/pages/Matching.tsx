import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Users, Briefcase, User, Building2, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useWorkablePermissions } from "@/hooks/useWorkablePermissions";
import Layout from "@/components/Layout";

interface Match {
  id: string;
  candidate_name: string;
  candidate_email: string;
  job_title: string;
  company: string;
  status: string;
  response_type: string;
  created_at: string;
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

const Matching = () => {
  const [stats, setStats] = useState({
    candidates: 0,
    openPositions: 0,
    matches: 0
  });
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [jobOption, setJobOption] = useState<'existing' | 'new'>('existing');
  const [candidateOption, setCandidateOption] = useState<'existing' | 'new'>('existing');
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>('');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  
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

  const { permissions } = useWorkablePermissions();
  const { toast } = useToast();

  const fetchMatches = async () => {
    try {
      console.log('Fetching matches...');
      const { data: matchesData, error } = await supabase
        .from('candidate_responses')
        .select(`
          id,
          status,
          response_type,
          created_at,
          candidates (
            name,
            email
          ),
          crawled_jobs (
            title,
            company
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching matches:', error);
        throw error;
      }

      const formattedMatches = matchesData?.map((match: any) => ({
        id: match.id,
        candidate_name: match.candidates?.name || 'Unknown',
        candidate_email: match.candidates?.email || 'Unknown',
        job_title: match.crawled_jobs?.title || 'Unknown',
        company: match.crawled_jobs?.company || 'Unknown',
        status: match.status,
        response_type: match.response_type,
        created_at: match.created_at
      })) || [];

      console.log('Fetched matches:', formattedMatches.length);
      setMatches(formattedMatches);
    } catch (error) {
      console.error('Error fetching matches:', error);
    }
  };

  const fetchJobs = async () => {
    try {
      // Fetch jobs directly from Workable
      const { data, error } = await supabase.functions.invoke('workable-integration', {
        body: { action: 'sync_jobs' }
      });
      
      if (error) throw error;
      
      // Transform Workable jobs to match our interface
      const workableJobs = (data?.jobs || []).map((job: any) => ({
        id: job.id,
        title: job.title,
        company: job.department?.name || 'Unknown Company',
        location: job.location?.city || job.location?.region || 'Remote'
      }));
      
      setJobs(workableJobs);
    } catch (error) {
      console.error('Error fetching jobs from Workable:', error);
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

  const fetchMatchingData = async () => {
    setIsLoading(true);
    try {
      // Fetch candidates count (includes manually added candidates)
      const { count: candidatesCount } = await supabase
        .from('candidates')
        .select('*', { count: 'exact', head: true });

      // Fetch matches count
      const { count: matchesCount } = await supabase
        .from('candidate_responses')
        .select('*', { count: 'exact', head: true });

      // Fetch Workable jobs data
      const { data: jobsData } = await supabase.functions.invoke('workable-integration', {
        body: { action: 'sync_jobs' }
      });

      const workableJobs = jobsData?.jobs?.filter((job: any) => job.state === 'published').length || 0;

      // Fetch app-posted jobs count
      const { count: appJobsCount } = await supabase
        .from('jobs')
        .select('*', { count: 'exact', head: true });

      const totalOpenPositions = workableJobs + (appJobsCount || 0);

      setStats({
        candidates: candidatesCount || 0,
        openPositions: totalOpenPositions,
        matches: matchesCount || 0
      });

      // Fetch matches for display
      await fetchMatches();
      await fetchJobs();
      await fetchCandidates();
    } catch (error) {
      console.error('Error fetching matching data:', error);
      toast({
        title: "Error",
        description: "Failed to load matching data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateMatch = async () => {
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
        // For existing Workable jobs, we need to create/find the corresponding crawled_jobs entry
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

        // Check if this Workable job already exists in crawled_jobs
        const { data: existingJob, error: findError } = await supabase
          .from('crawled_jobs')
          .select('id')
          .eq('source', 'workable')
          .eq('url', `workable-${selectedJobId}`)
          .single();

        if (findError && findError.code !== 'PGRST116') { // PGRST116 is "not found" error
          throw findError;
        }

        if (existingJob) {
          jobId = existingJob.id;
        } else {
          // Create new crawled_jobs entry for this Workable job
          const { data: jobData, error: jobError } = await supabase
            .from('crawled_jobs')
            .insert([{
              title: selectedJob.title,
              company: selectedJob.company,
              location: selectedJob.location || '',
              description: `Workable job: ${selectedJob.title}`,
              source: 'workable',
              url: `workable-${selectedJobId}`
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

        // Reset form and refresh data
        resetForm();
        await fetchMatchingData();
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

  useEffect(() => {
    fetchMatchingData();
  }, []);

  return (
    <Layout>
      <div className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Matching Module</h1>
          <p className="text-slate-300">Match candidates to jobs</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2 max-w-4xl mx-auto mb-8">
          <Card className="bg-primary-blue border border-white/20">
            <CardHeader>
              <CardTitle className="flex items-center text-white">
                <Users className="mr-2 h-5 w-5 text-secondary-pink" />
                Matches
              </CardTitle>
              <CardDescription className="text-slate-400">Successful candidate-job matches</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats.matches}</div>
              <p className="text-xs text-slate-400">Total matches</p>
            </CardContent>
          </Card>

          <Card className="bg-primary-blue border border-white/20">
            <CardHeader>
              <CardTitle className="flex items-center text-white">
                <Briefcase className="mr-2 h-5 w-5 text-secondary-pink" />
                Open Positions
              </CardTitle>
              <CardDescription className="text-slate-400">Jobs waiting for candidates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats.openPositions}</div>
              <p className="text-xs text-slate-400">Open positions</p>
            </CardContent>
          </Card>
        </div>

        {/* Create Match Section */}
        {permissions.create_matches ? (
          <div className="mb-8">
            <Card className="bg-primary-blue border border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Create New Match</CardTitle>
                <CardDescription className="text-slate-400">Select or create a job and either choose an existing candidate or add a new one.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
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
                  onClick={handleCreateMatch}
                  disabled={isLoading || (jobOption === 'existing' && !selectedJobId) || (candidateOption === 'existing' && !selectedCandidateId)}
                  className="w-full bg-secondary-pink hover:bg-secondary-pink/80 text-white"
                >
                  {isLoading ? 'Creating Match...' : 'Match candidate with job'}
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="mb-8">
            <Card className="bg-primary-blue border border-white/20">
              <CardContent className="p-6 text-center">
                <h3 className="text-xl font-semibold text-white mb-2">Create New Match</h3>
                <p className="text-slate-400 mb-4">Creating matches requires admin permissions</p>
                <Button 
                  disabled
                  className="bg-slate-600 text-slate-400 cursor-not-allowed"
                  size="lg"
                >
                  <Lock className="mr-2 h-5 w-5" />
                  Admin Only
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Recent Matches Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-4">Recent Matches</h2>
          {matches.length === 0 ? (
            <Card className="bg-primary-blue border border-white/20">
              <CardContent className="p-6 text-center">
                <p className="text-slate-400">No matches created yet. Create your first match above!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {matches.map((match) => (
                <Card key={match.id} className="bg-primary-blue border border-white/20">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4 text-secondary-pink" />
                          <div>
                            <p className="font-medium text-white">{match.candidate_name}</p>
                            <p className="text-sm text-slate-400">{match.candidate_email}</p>
                          </div>
                        </div>
                        <div className="text-slate-400">→</div>
                        <div className="flex items-center space-x-2">
                          <Building2 className="h-4 w-4 text-secondary-pink" />
                          <div>
                            <p className="font-medium text-white">{match.job_title}</p>
                            <p className="text-sm text-slate-400">{match.company}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Badge 
                          variant={match.status === 'matched' ? 'default' : 'secondary'}
                          className={match.status === 'matched' ? 'bg-secondary-pink' : ''}
                        >
                          {match.status}
                        </Badge>
                        <p className="text-xs text-slate-400">
                          {new Date(match.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

      </div>
    </Layout>
  );
};

export default Matching;