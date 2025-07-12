import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, MapPin, Calendar, Building, Search, Briefcase, RefreshCw } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/Layout";

// ============= TYPES =============
export interface JobListing {
  id: string;
  title: string;
  company: string;
  location: string;
  salary?: string;
  description: string;
  type: "full-time" | "part-time" | "contract" | "remote";
  postedDate: string;
  url: string;
  source: string;
}

export interface SearchFilters {
  location: string;
  jobType: string;
  salaryMin: string;
  remote: boolean;
  datePosted: string;
}

interface CrawledJob {
  id: string;
  title: string;
  company: string;
  location: string | null;
  salary: string | null;
  description: string | null;
  job_type: string | null;
  posted_date: string | null;
  url: string;
  source: string;
  crawled_at: string;
}

// ============= HOOKS =============
const useJobSearch = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<SearchFilters>({
    location: "",
    jobType: "",
    salaryMin: "",
    remote: false,
    datePosted: "",
  });

  const { data: jobs = [], isLoading, error, refetch } = useQuery({
    queryKey: ['jobs', searchQuery, filters],
    queryFn: async (): Promise<JobListing[]> => {
      let query = supabase
        .from('crawled_jobs')
        .select('*')
        .eq('is_active', true)
        .order('posted_date', { ascending: false });

      // Apply search query filter
      if (searchQuery.trim()) {
        query = query.or(`title.ilike.%${searchQuery}%,company.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
      }

      // Apply location filter
      if (filters.location.trim()) {
        query = query.ilike('location', `%${filters.location}%`);
      }

      // Apply job type filter
      if (filters.jobType && filters.jobType !== '') {
        query = query.eq('job_type', filters.jobType);
      }

      // Apply remote filter
      if (filters.remote) {
        query = query.or('job_type.eq.remote,location.ilike.%remote%');
      }

      // Apply date filter
      if (filters.datePosted) {
        const daysAgo = parseInt(filters.datePosted);
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysAgo);
        query = query.gte('posted_date', cutoffDate.toISOString());
      }

      const { data, error } = await query.limit(100);

      if (error) {
        console.error('Error fetching jobs:', error);
        throw error;
      }

      // Transform crawled jobs to JobListing format
      const transformedJobs = (data as CrawledJob[]).map(job => ({
        id: job.id,
        title: job.title,
        company: job.company,
        location: job.location || 'Unknown',
        salary: job.salary,
        description: job.description || '',
        type: (job.job_type as JobListing['type']) || 'full-time',
        postedDate: job.posted_date || job.crawled_at,
        url: job.url,
        source: job.source,
      }));

      // Filter out unwanted job listings by title
      const unwantedTitles = [
        'bart@growthaccelerator.nl',
        'midden-nederland',
        'zuid-holland',
        'zuid-nederland',
        'noord-holland',
        'oost-nederland',
        'vacatures',
        'data & ai vacatures',
        'data ai vacature overzicht',
        'github platform engineer'
      ];

      const filteredJobs = transformedJobs.filter(job => {
        const titleLower = job.title.toLowerCase().trim();
        
        // Check if the title contains any of the unwanted terms
        return !unwantedTitles.some(unwantedTitle => 
          titleLower.includes(unwantedTitle.toLowerCase())
        );
      });

      return filteredJobs;
    },
    enabled: true,
  });

  const crawlJobs = async () => {
    try {
      console.log('Starting job crawl...');
      const { data, error } = await supabase.functions.invoke('crawl-jobs');
      
      if (error) {
        console.error('Error crawling jobs:', error);
        throw error;
      }
      
      console.log('Crawl completed:', data);
      
      // Refetch the jobs after crawling
      await refetch();
      
      return data;
    } catch (error) {
      console.error('Failed to crawl jobs:', error);
      throw error;
    }
  };

  return {
    jobs,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    filters,
    setFilters,
    crawlJobs,
    totalResults: jobs.length,
  };
};

// ============= COMPONENTS =============

// Search Stats Component
interface SearchStatsProps {
  query: string;
  totalResults: number;
  isLoading: boolean;
}

const SearchStats = ({ query, totalResults, isLoading }: SearchStatsProps) => {
  return (
    <Card className="mb-6 bg-primary-blue border border-white/20">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5 text-slate-400" />
            <span className="text-sm text-slate-300">
              {query ? `Search results for "${query}"` : "All available positions"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-secondary-pink" />
            <span className="font-medium text-white">
              {isLoading ? "Loading..." : `${totalResults} jobs found`}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Job Application Form Component
interface JobApplicationFormProps {
  job: JobListing | null;
  isOpen: boolean;
  onClose: () => void;
}

const JobApplicationForm = ({ job, isOpen, onClose }: JobApplicationFormProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: {
      street: "",
      city: "",
      state: "",
      postalCode: "",
      countryCode: "NL"
    },
    currentEmployer: "",
    currentPosition: "",
    experience: "",
    education: "",
    availableDate: "",
    coverLetter: ""
  });

  const handleInputChange = (field: string, value: any) => {
    if (field.includes('.')) {
      const [section, subField] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [section]: {
          ...prev[section as keyof typeof prev] as any,
          [subField]: value
        }
      }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!job) return;

    setLoading(true);

    try {
      // Store application in database
      const { error } = await supabase
        .from('candidate_responses')
        .insert({
          candidate_id: crypto.randomUUID(), // Generate temp ID for non-registered users
          job_id: job.id,
          message: formData.coverLetter,
          response_type: 'application',
          source: 'career_portal',
          status: 'new'
        });

      if (error) throw error;

      toast({
        title: "Application Submitted",
        description: `Your application for ${job.title} has been submitted successfully!`,
      });
      
      onClose();
      
      // Reset form
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        address: {
          street: "",
          city: "",
          state: "",
          postalCode: "",
          countryCode: "NL"
        },
        currentEmployer: "",
        currentPosition: "",
        experience: "",
        education: "",
        availableDate: "",
        coverLetter: ""
      });
    } catch (error) {
      console.error('Application error:', error);
      toast({
        title: "Application Failed",
        description: "There was an error submitting your application. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (!job) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-primary-blue border border-white/20">
        <DialogHeader>
          <DialogTitle className="text-white">Apply for {job.title}</DialogTitle>
          <DialogDescription className="text-slate-300">
            {job.company} • {job.location}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Information */}
          <Card className="bg-slate-800 border-slate-600">
            <CardHeader>
              <CardTitle className="text-lg text-white">Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName" className="text-slate-300">First Name *</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange("firstName", e.target.value)}
                    required
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
                <div>
                  <Label htmlFor="lastName" className="text-slate-300">Last Name *</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange("lastName", e.target.value)}
                    required
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="email" className="text-slate-300">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  required
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
              
              <div>
                <Label htmlFor="phone" className="text-slate-300">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
            </CardContent>
          </Card>

          {/* Cover Letter */}
          <Card className="bg-slate-800 border-slate-600">
            <CardHeader>
              <CardTitle className="text-lg text-white">Cover Letter</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.coverLetter}
                onChange={(e) => handleInputChange("coverLetter", e.target.value)}
                placeholder="Tell us why you're interested in this position..."
                rows={6}
                className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
              />
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={onClose} className="border-slate-600 text-slate-300">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="bg-secondary-pink hover:bg-secondary-pink/80">
              {loading ? "Submitting..." : "Submit Application"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// Job List Component
interface JobListProps {
  jobs: JobListing[];
  isLoading: boolean;
  onApply: (job: JobListing) => void;
}

const JobList = ({ jobs, isLoading, onApply }: JobListProps) => {
  if (isLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse bg-primary-blue border border-white/20">
            <CardHeader>
              <div className="h-4 bg-slate-600 rounded w-3/4"></div>
              <div className="h-3 bg-slate-600 rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="h-3 bg-slate-600 rounded"></div>
                <div className="h-3 bg-slate-600 rounded w-4/5"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-300 text-lg">No jobs found matching your criteria.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {jobs.map((job) => (
        <Card key={job.id} className="hover:shadow-lg transition-shadow bg-primary-blue border border-white/20">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <CardTitle className="text-lg line-clamp-2 text-white">{job.title}</CardTitle>
                <CardDescription className="flex items-center gap-1 mt-1 text-slate-300">
                  <Building className="h-4 w-4" />
                  {job.company}
                </CardDescription>
              </div>
              <Badge variant="secondary" className="ml-2 bg-secondary-pink/20 text-secondary-pink border-secondary-pink">
                {job.type}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <MapPin className="h-4 w-4" />
                {job.location}
              </div>
              {job.salary && (
                <div className="text-sm font-medium text-secondary-pink">
                  {job.salary}
                </div>
              )}
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Calendar className="h-4 w-4" />
                {new Date(job.postedDate).toLocaleDateString()}
              </div>
            </div>
            
            {job.description && (
              <p className="text-sm text-slate-400 line-clamp-3">
                {job.description}
              </p>
            )}
            
            <div className="flex justify-between items-center">
              <Badge variant="outline" className="text-xs border-slate-600 text-slate-400">
                {job.source}
              </Badge>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => onApply(job)} className="bg-secondary-pink hover:bg-secondary-pink/80">
                  Apply Now
                </Button>
                <Button size="sm" variant="outline" asChild className="border-slate-600 text-slate-300 hover:bg-slate-700">
                  <a href={job.url} target="_blank" rel="noopener noreferrer">
                    View Job
                    <ExternalLink className="h-4 w-4 ml-1" />
                  </a>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

// Crawl Jobs Button Component
interface CrawlJobsButtonProps {
  onCrawl: () => Promise<any>;
}

const CrawlJobsButton = ({ onCrawl }: CrawlJobsButtonProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleCrawl = async () => {
    setIsLoading(true);
    try {
      await onCrawl();
      toast({
        title: "Success",
        description: "Jobs crawled successfully! The list will update shortly.",
      });
    } catch (error) {
      console.error("Crawl error:", error);
      toast({
        title: "Error",
        description: "Failed to crawl jobs. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleCrawl}
      disabled={isLoading}
      className="bg-secondary-pink hover:bg-secondary-pink/80"
    >
      {isLoading ? (
        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <RefreshCw className="h-4 w-4 mr-2" />
      )}
      {isLoading ? "Crawling Jobs..." : "Refresh Jobs"}
    </Button>
  );
};

// ============= MAIN COMPONENT =============
const JobBoard = () => {
  const {
    jobs,
    isLoading,
    searchQuery,
    setSearchQuery,
    filters,
    setFilters,
    crawlJobs,
    totalResults,
  } = useJobSearch();

  const [selectedJob, setSelectedJob] = useState<JobListing | null>(null);
  const [showApplicationForm, setShowApplicationForm] = useState(false);

  const handleApplyClick = (job: JobListing) => {
    setSelectedJob(job);
    setShowApplicationForm(true);
  };

  const handleCloseForm = () => {
    setShowApplicationForm(false);
    setSelectedJob(null);
  };

  return (
    <Layout>
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="text-center space-y-6 mb-8">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight text-white">
              Job Board
            </h1>
            <p className="text-xl text-slate-300">
              Discover exciting career opportunities with top companies
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="max-w-md mx-auto mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search jobs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-600 rounded-md bg-slate-800 text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-secondary-pink focus:border-transparent"
            />
          </div>
        </div>

        {/* Filters */}
        <div className="max-w-4xl mx-auto mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="location" className="text-slate-300">Location</Label>
              <Input
                id="location"
                placeholder="Enter location"
                value={filters.location}
                onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))}
                className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-400"
              />
            </div>
            <div>
              <Label htmlFor="jobType" className="text-slate-300">Job Type</Label>
              <select
                id="jobType"
                value={filters.jobType}
                onChange={(e) => setFilters(prev => ({ ...prev, jobType: e.target.value }))}
                className="w-full p-2 border border-slate-600 rounded-md bg-slate-800 text-white"
              >
                <option value="">All Types</option>
                <option value="full-time">Full Time</option>
                <option value="part-time">Part Time</option>
                <option value="contract">Contract</option>
                <option value="remote">Remote</option>
              </select>
            </div>
            <div>
              <Label htmlFor="datePosted" className="text-slate-300">Date Posted</Label>
              <select
                id="datePosted"
                value={filters.datePosted}
                onChange={(e) => setFilters(prev => ({ ...prev, datePosted: e.target.value }))}
                className="w-full p-2 border border-slate-600 rounded-md bg-slate-800 text-white"
              >
                <option value="">Any Time</option>
                <option value="1">Past 24 hours</option>
                <option value="7">Past week</option>
                <option value="30">Past month</option>
              </select>
            </div>
            <div className="flex items-end">
              <label className="flex items-center space-x-2 text-slate-300">
                <input
                  type="checkbox"
                  checked={filters.remote}
                  onChange={(e) => setFilters(prev => ({ ...prev, remote: e.target.checked }))}
                  className="rounded border-slate-600"
                />
                <span>Remote only</span>
              </label>
            </div>
          </div>
        </div>

        {/* Refresh Button */}
        <div className="flex justify-center mb-6">
          <CrawlJobsButton onCrawl={crawlJobs} />
        </div>
        
        {/* Search Stats */}
        <SearchStats 
          query={searchQuery}
          totalResults={totalResults}
          isLoading={isLoading}
        />
        
        {/* Job List */}
        <JobList 
          jobs={jobs}
          isLoading={isLoading}
          onApply={handleApplyClick}
        />

        {/* Application Form */}
        <JobApplicationForm
          job={selectedJob}
          isOpen={showApplicationForm}
          onClose={handleCloseForm}
        />
      </div>
    </Layout>
  );
};

export default JobBoard;