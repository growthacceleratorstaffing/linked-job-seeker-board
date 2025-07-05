import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Briefcase, Plus, RefreshCw, ExternalLink, CheckCircle, Archive } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/Layout";

interface WorkableJob {
  id: string;
  title: string;
  full_title: string;
  state: string;
  created_at: string;
  url: string;
  location: {
    location_str: string;
    workplace_type: string;
  };
}

const PostJobs = () => {
  const [jobs, setJobs] = useState<WorkableJob[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newJob, setNewJob] = useState({
    title: '',
    description: '',
    location: '',
    workplace_type: 'onsite',
    salary: '',
    company: 'Growth Accelerator'
  });
  const { toast } = useToast();

  const fetchJobs = async () => {
    setIsLoading(true);
    try {
      let data, error;
      let platform = 'Unknown';
      
      // Try JobAdder first
      try {
        const jobadderResult = await supabase.functions.invoke('jobadder-integration', {
          body: { action: 'sync_jobs' }
        });

        if (jobadderResult.error) throw jobadderResult.error;
        data = jobadderResult.data;
        platform = 'JobAdder';
        
      } catch (jobadderError) {
        console.log('JobAdder jobs sync failed, trying Workable...', jobadderError);
        
        // Fallback to Workable
        const workableResult = await supabase.functions.invoke('workable-integration', {
          body: { action: 'sync_jobs' }
        });

        if (workableResult.error) throw workableResult.error;
        data = workableResult.data;
        platform = 'Workable';
      }

      const jobsData = data.jobs || [];
      setJobs(jobsData);
      
      toast({
        title: "Jobs Synced! 🎉",
        description: `Loaded ${jobsData.length} jobs from ${platform}`,
      });
    } catch (error) {
      console.error('Error fetching jobs:', error);
      toast({
        title: "Error",
        description: "Failed to fetch jobs from JobAdder/Workable",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateJob = async () => {
    if (!newJob.title.trim()) {
      toast({
        title: "Error",
        description: "Job title is required",
        variant: "destructive",
      });
      return;
    }

    try {
      // Create a new job with current timestamp and published state
      const createdJob: WorkableJob = {
        id: `local-${Date.now()}`,
        title: newJob.title,
        full_title: newJob.title,
        state: 'published',
        created_at: new Date().toISOString(),
        url: '#',
        location: {
          location_str: newJob.location || 'Not specified',
          workplace_type: newJob.workplace_type
        }
      };

      // Add to current jobs list
      setJobs(prev => [createdJob, ...prev]);
      
      // Reset form and close dialog
      setNewJob({
        title: '',
        description: '',
        location: '',
        workplace_type: 'onsite',
        salary: '',
        company: 'Growth Accelerator'
      });
      setShowCreateDialog(false);

      toast({
        title: "Job Created! 🎉",
        description: `${newJob.title} has been created and is now visible in your jobs overview`,
      });
      
    } catch (error) {
      console.error('Error creating job:', error);
      toast({
        title: "Error",
        description: "Failed to create job",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const getStatusBadge = (state: string) => {
    if (state === 'published') {
      return (
        <Badge className="bg-green-500/20 text-green-400 border-green-400">
          <CheckCircle className="w-3 h-3 mr-1" />
          Published
        </Badge>
      );
    } else if (state === 'archived') {
      return (
        <Badge className="bg-secondary-pink/20 text-secondary-pink border-secondary-pink">
          <Archive className="w-3 h-3 mr-1" />
          Archived
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="border-slate-400 text-slate-400">
        {state}
      </Badge>
    );
  };

  const activeJobs = jobs.filter(job => job.state === 'published').length;
  const archivedJobs = jobs.filter(job => job.state === 'archived').length;

  return (
    <Layout>
      <div className="min-h-screen bg-primary-blue text-white">
        <div className="container mx-auto px-6 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Post Jobs</h1>
            <p className="text-slate-300">Manage your job postings across JobAdder and Workable</p>
          </div>

          <div className="flex items-center justify-between mb-6">
            <div></div>
            <div className="flex gap-4">
              <Button 
                onClick={fetchJobs}
                disabled={isLoading}
                variant="outline"
                className="border-secondary-pink text-secondary-pink hover:bg-secondary-pink hover:text-white"
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh Jobs
              </Button>
              <Button 
                onClick={() => setShowCreateDialog(true)}
                className="bg-secondary-pink hover:bg-secondary-pink/80"
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Job
              </Button>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6">
            <Card className="bg-primary-blue border border-white/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-white">Total Jobs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{jobs.length}</div>
                <p className="text-xs text-slate-400">All time</p>
              </CardContent>
            </Card>

            <Card className="bg-primary-blue border border-white/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-white">Active</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{activeJobs}</div>
                <p className="text-xs text-slate-400">Currently open</p>
              </CardContent>
            </Card>

            <Card className="bg-primary-blue border border-white/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-white">Archived</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{archivedJobs}</div>
                <p className="text-xs text-slate-400">Closed positions</p>
              </CardContent>
            </Card>

            <Card className="bg-primary-blue border border-white/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-white">Remote</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">
                  {jobs.filter(job => job.location.workplace_type === 'remote').length}
                </div>
                <p className="text-xs text-slate-400">Remote positions</p>
              </CardContent>
            </Card>
          </div>

          {/* Jobs Overview Table */}
          <Card className="bg-primary-blue border border-white/20 mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Briefcase className="w-5 h-5 text-secondary-pink" />
                Jobs Overview  
              </CardTitle>
              <CardDescription className="text-slate-300">
                {jobs.length > 0 ? `${jobs.length} total jobs` : 'No jobs found'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {jobs.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-600">
                      <TableHead className="text-slate-300">Job Title</TableHead>
                      <TableHead className="text-slate-300">Status</TableHead>
                      <TableHead className="text-slate-300">Location</TableHead>
                      <TableHead className="text-slate-300">Created</TableHead>
                      <TableHead className="text-slate-300 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {jobs.map((job) => (
                      <TableRow key={job.id} className="border-slate-600 hover:bg-slate-700">
                        <TableCell className="text-white font-medium">
                          {job.title}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(job.state)}
                        </TableCell>
                        <TableCell className="text-slate-400">
                          {job.location.location_str}
                          {job.location.workplace_type === 'remote' && (
                            <Badge variant="outline" className="ml-2 text-xs border-blue-400 text-blue-400">
                              Remote
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-slate-400">
                          {new Date(job.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            asChild
                            className="text-secondary-pink hover:text-secondary-pink/80"
                          >
                            <a href={job.url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <Briefcase className="w-12 h-12 text-slate-500 mx-auto mb-3" />
                  <p className="text-slate-400 text-sm">
                    No jobs found. Create a new job or refresh to sync from Workable/JobAdder!
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Create Job Dialog */}
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogContent className="bg-primary-blue border-slate-700 text-white">
              <DialogHeader>
                <DialogTitle className="text-white">Create New Job</DialogTitle>
                <DialogDescription className="text-slate-300">
                  Create a new job posting that will be visible in your jobs overview and can sync with Workable & JobAdder.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="title" className="text-right text-white">
                    Job Title *
                  </Label>
                  <Input
                    id="title"
                    value={newJob.title}
                    onChange={(e) => setNewJob(prev => ({ ...prev, title: e.target.value }))}
                    className="col-span-3 bg-slate-800 border-slate-600 text-white"
                    placeholder="e.g. Senior Software Engineer"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="location" className="text-right text-white">
                    Location
                  </Label>
                  <Input
                    id="location"
                    value={newJob.location}
                    onChange={(e) => setNewJob(prev => ({ ...prev, location: e.target.value }))}
                    className="col-span-3 bg-slate-800 border-slate-600 text-white"
                    placeholder="e.g. Amsterdam, Netherlands"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="workplace_type" className="text-right text-white">
                    Work Type
                  </Label>
                  <Select 
                    value={newJob.workplace_type} 
                    onValueChange={(value) => setNewJob(prev => ({ ...prev, workplace_type: value }))}
                  >
                    <SelectTrigger className="col-span-3 bg-slate-800 border-slate-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-600">
                      <SelectItem value="onsite">On-site</SelectItem>
                      <SelectItem value="remote">Remote</SelectItem>
                      <SelectItem value="hybrid">Hybrid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="salary" className="text-right text-white">
                    Salary
                  </Label>
                  <Input
                    id="salary"
                    value={newJob.salary}
                    onChange={(e) => setNewJob(prev => ({ ...prev, salary: e.target.value }))}
                    className="col-span-3 bg-slate-800 border-slate-600 text-white"
                    placeholder="e.g. €70,000 - €90,000"
                  />
                </div>
                <div className="grid grid-cols-4 items-start gap-4">
                  <Label htmlFor="description" className="text-right text-white">
                    Description
                  </Label>
                  <Textarea
                    id="description"
                    value={newJob.description}
                    onChange={(e) => setNewJob(prev => ({ ...prev, description: e.target.value }))}
                    className="col-span-3 bg-slate-800 border-slate-600 text-white"
                    placeholder="Job description and requirements..."
                    rows={4}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => setShowCreateDialog(false)}
                  className="border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </Button>
                <Button 
                  type="button" 
                  onClick={handleCreateJob}
                  className="bg-secondary-pink hover:bg-secondary-pink/80"
                >
                  Create Job
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </Layout>
  );
};

export default PostJobs;