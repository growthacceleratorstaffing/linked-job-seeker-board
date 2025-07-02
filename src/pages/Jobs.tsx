import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Briefcase, Search, Filter, Plus, RefreshCw, ExternalLink, CheckCircle, Archive } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
      const { data, error } = await supabase.functions.invoke('workable-integration', {
        body: { action: 'sync_jobs' }
      });

      if (error) throw error;

      const jobsData = data.jobs || [];
      setJobs(jobsData);
      setFilteredJobs(jobsData);
    } catch (error) {
      console.error('Error fetching jobs:', error);
      toast({
        title: "Error",
        description: "Failed to fetch jobs from Workable",
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
    <div className="min-h-screen bg-primary-blue text-white">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-12">
          <div className="mb-6">
            <img 
              src="/lovable-uploads/b75d59b1-dda0-4ae9-aa70-24966bdd42d5.png" 
              alt="Growth Accelerator Logo" 
              className="mx-auto h-16 w-16 object-contain"
            />
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-4 text-secondary-pink">
            Jobs
          </h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            Manage job postings and requirements
          </p>
        </header>

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
                className="pl-10 bg-slate-800 border-slate-700 text-white placeholder:text-slate-400"
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
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-white">Total Jobs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{jobs.length}</div>
              <p className="text-xs text-slate-400">All time</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-white">Active</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{activeJobs}</div>
              <p className="text-xs text-slate-400">Currently open</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-white">Archived</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{archivedJobs}</div>
              <p className="text-xs text-slate-400">Closed positions</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
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

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center text-white">
              <Briefcase className="mr-2 h-5 w-5 text-secondary-pink" />
              Job Listings
            </CardTitle>
            <CardDescription className="text-slate-400">
              {filteredJobs.length} of {jobs.length} jobs from growthacceleratorstaffing.workable.com
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredJobs.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-600">
                    <TableHead className="text-slate-300">Job Title</TableHead>
                    <TableHead className="text-slate-300">Location</TableHead>
                    <TableHead className="text-slate-300">Status</TableHead>
                    <TableHead className="text-slate-300">Created</TableHead>
                    <TableHead className="text-slate-300 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredJobs.map((job) => (
                    <TableRow key={job.id} className="border-slate-600 hover:bg-slate-700">
                      <TableCell className="text-white font-medium">
                        {job.title}
                      </TableCell>
                      <TableCell className="text-slate-400">
                        {job.location.location_str}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(job.state)}
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
              <div className="text-center py-12 text-slate-400">
                <Briefcase className="mx-auto h-12 w-12 mb-4 text-secondary-pink" />
                <h3 className="text-lg font-semibold mb-2 text-white">
                  {searchTerm ? 'No matching jobs found' : 'No jobs found'}
                </h3>
                <p>
                  {searchTerm 
                    ? 'Try adjusting your search criteria' 
                    : 'Click "Refresh" to sync your latest jobs!'
                  }
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Jobs;