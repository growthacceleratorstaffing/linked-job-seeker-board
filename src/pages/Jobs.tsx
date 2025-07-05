import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Briefcase, Search, Filter, Plus, RefreshCw, ExternalLink, CheckCircle, Archive } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/Layout";
import { VacancyGenerator } from "@/components/VacancyGenerator";

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

const Jobs = () => {
  const [jobs, setJobs] = useState<WorkableJob[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<WorkableJob[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
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
      setFilteredJobs(jobsData);
      
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

  useEffect(() => {
    fetchJobs();
  }, []);

  useEffect(() => {
    const filtered = jobs.filter(job =>
      job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.location.location_str.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredJobs(filtered);
  }, [searchTerm, jobs]);

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
            <h1 className="text-3xl font-bold text-white mb-2">Jobs Overview and vacancy generator</h1>
            <p className="text-slate-300">Create compelling job descriptions with AI and manage job postings</p>
          </div>

          <VacancyGenerator />


        <div className="flex items-center justify-between mb-6">
          <div></div>
          <Button className="bg-secondary-pink hover:bg-secondary-pink/80">
            <Plus className="mr-2 h-4 w-4" />
            Create Job
          </Button>
        </div>

        <div className="flex gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
               <Input 
                placeholder="Search jobs..." 
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <Button 
            variant="outline"
            className="border-secondary-pink text-secondary-pink hover:bg-secondary-pink hover:text-white"
          >
            <Filter className="mr-2 h-4 w-4" />
            Filters
          </Button>
          <Button 
            onClick={fetchJobs}
            disabled={isLoading}
            variant="outline"
            className="border-secondary-pink text-secondary-pink hover:bg-secondary-pink hover:text-white"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
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
        </div>
      </div>
    </Layout>
  );
};

export default Jobs;