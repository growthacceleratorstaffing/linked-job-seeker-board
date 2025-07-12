import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Linkedin, DollarSign, Calendar, Target, Briefcase, Megaphone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";

const JobAdvertising = () => {
  const { toast } = useToast();

  // Job Posting Form Data
  const [jobFormData, setJobFormData] = useState({
    jobTitle: "",
    jobDescription: "",
    city: "",
    jobFunction: "",
    employmentType: "FULL_TIME",
    workplaceType: "REMOTE",
    duration: ""
  });

  // Advertisement Form Data
  const [adFormData, setAdFormData] = useState({
    jobTitle: "",
    jobDescription: "",
    budget: "",
    duration: "",
    targetAudience: "",
    campaignName: ""
  });

  const [isCreatingJob, setIsCreatingJob] = useState(false);
  const [isCreatingAd, setIsCreatingAd] = useState(false);

  const handleJobInputChange = (field: string, value: string) => {
    setJobFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAdInputChange = (field: string, value: string) => {
    setAdFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCreateJob = async () => {
    console.log('Starting LinkedIn job creation...');
    console.log('Form data:', jobFormData);
    
    if (!jobFormData.jobTitle || !jobFormData.jobDescription) {
      toast({
        title: "Missing Information",
        description: "Please fill in job title and description",
        variant: "destructive"
      });
      return;
    }

    setIsCreatingJob(true);
    console.log('Invoking LinkedIn integration function...');
    
    try {
      const { data, error } = await supabase.functions.invoke('linkedin-integration', {
        body: {
          action: 'linkedin_job_advertisement',
          type: 'job-posting',
          jobTitle: jobFormData.jobTitle,
          jobDescription: jobFormData.jobDescription,
          city: jobFormData.city,
          jobFunction: jobFormData.jobFunction,
          employmentType: jobFormData.employmentType,
          workplaceType: jobFormData.workplaceType,
          duration: parseInt(jobFormData.duration) || 30
        }
      });

      if (error) throw error;

      console.log('Function response:', data);
      console.log('LinkedIn job creation successful!');
      
      toast({
        title: data.linkedinError ? "Job Created with LinkedIn Issue" : "Job Created Successfully!",
        description: data.message,
        variant: data.linkedinError ? "destructive" : "default"
      });

      // Reset form
      setJobFormData({
        jobTitle: "",
        jobDescription: "",
        city: "",
        jobFunction: "",
        employmentType: "FULL_TIME",
        workplaceType: "REMOTE",
        duration: ""
      });

    } catch (error) {
      console.error('Error creating LinkedIn job:', error);
      toast({
        title: "Error",
        description: "Failed to create job posting. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsCreatingJob(false);
    }
  };

  const handleCreateAdvertisement = async () => {
    if (!adFormData.jobTitle || !adFormData.budget || !adFormData.duration) {
      toast({
        title: "Missing Information",
        description: "Please fill in job title, budget, and duration",
        variant: "destructive"
      });
      return;
    }

    setIsCreatingAd(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('linkedin-integration', {
        body: {
          action: 'linkedin_job_advertisement',
          type: 'sponsored-content',
          jobTitle: adFormData.jobTitle,
          jobDescription: adFormData.jobDescription,
          budget: parseFloat(adFormData.budget),
          duration: parseInt(adFormData.duration),
          targetAudience: adFormData.targetAudience,
          campaignName: adFormData.campaignName || adFormData.jobTitle
        }
      });

      if (error) throw error;

      toast({
        title: "Advertisement Created",
        description: "Your LinkedIn job advertisement has been created successfully!"
      });

      // Reset form
      setAdFormData({
        jobTitle: "",
        jobDescription: "",
        budget: "",
        duration: "",
        targetAudience: "",
        campaignName: ""
      });

    } catch (error) {
      console.error('Error creating LinkedIn advertisement:', error);
      toast({
        title: "Error",
        description: "Failed to create LinkedIn advertisement. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsCreatingAd(false);
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-primary-blue text-white">
        <div className="container mx-auto px-6 py-8 space-y-6">
          <div className="flex items-center gap-3 mb-6">
            <Briefcase className="h-8 w-8 text-secondary-pink" />
            <div>
              <h1 className="text-3xl font-bold text-white">Job Advertising</h1>
              <p className="text-slate-300">Create jobs for your career page and LinkedIn advertisements</p>
            </div>
          </div>

          <Tabs defaultValue="job-posting" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-slate-700">
              <TabsTrigger value="job-posting" className="flex items-center gap-2 data-[state=active]:bg-secondary-pink">
                <Briefcase className="h-4 w-4" />
                Job Posting
              </TabsTrigger>
              <TabsTrigger value="advertisement" className="flex items-center gap-2 data-[state=active]:bg-secondary-pink">
                <Megaphone className="h-4 w-4" />
                Sponsored Ads
              </TabsTrigger>
            </TabsList>

            {/* Job Posting Tab */}
            <TabsContent value="job-posting">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <Card className="bg-primary-blue border border-white/20">
                    <CardHeader>
                      <CardTitle className="text-white">Create Career Page Job & LinkedIn Job Posting</CardTitle>
                      <CardDescription className="text-slate-300">
                        Add job openings to your career page and automatically post them as jobs on LinkedIn's job board
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="jobTitle" className="text-white">Job Title *</Label>
                          <Input
                            id="jobTitle"
                            placeholder="e.g. Senior Software Engineer"
                            value={jobFormData.jobTitle}
                            onChange={(e) => handleJobInputChange("jobTitle", e.target.value)}
                            className="bg-slate-700 border-slate-600 text-white"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="city" className="text-white">City</Label>
                          <Input
                            id="city"
                            placeholder="e.g. San Francisco (leave empty for Remote)"
                            value={jobFormData.city}
                            onChange={(e) => handleJobInputChange("city", e.target.value)}
                            className="bg-slate-700 border-slate-600 text-white"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="jobDescription" className="text-white">Job Description *</Label>
                        <Textarea
                          id="jobDescription"
                          placeholder="Describe the role, requirements, and benefits..."
                          rows={4}
                          value={jobFormData.jobDescription}
                          onChange={(e) => handleJobInputChange("jobDescription", e.target.value)}
                          className="bg-slate-700 border-slate-600 text-white"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="jobFunction" className="text-white">Job Function</Label>
                          <Select onValueChange={(value) => handleJobInputChange("jobFunction", value)}>
                            <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                              <SelectValue placeholder="Select job function" />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-700 border-slate-600">
                              <SelectItem value="eng">Engineering</SelectItem>
                              <SelectItem value="mkt">Marketing</SelectItem>
                              <SelectItem value="sal">Sales</SelectItem>
                              <SelectItem value="fin">Finance</SelectItem>
                              <SelectItem value="hr">Human Resources</SelectItem>
                              <SelectItem value="ops">Operations</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="employmentType" className="text-white">Employment Type</Label>
                          <Select onValueChange={(value) => handleJobInputChange("employmentType", value)}>
                            <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                              <SelectValue placeholder="Full-time" />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-700 border-slate-600">
                              <SelectItem value="FULL_TIME">Full-time</SelectItem>
                              <SelectItem value="PART_TIME">Part-time</SelectItem>
                              <SelectItem value="CONTRACT">Contract</SelectItem>
                              <SelectItem value="TEMPORARY">Temporary</SelectItem>
                              <SelectItem value="INTERNSHIP">Internship</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="workplaceType" className="text-white">Workplace Type</Label>
                          <Select onValueChange={(value) => handleJobInputChange("workplaceType", value)}>
                            <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                              <SelectValue placeholder="Remote" />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-700 border-slate-600">
                              <SelectItem value="REMOTE">Remote</SelectItem>
                              <SelectItem value="ON_SITE">On-site</SelectItem>
                              <SelectItem value="HYBRID">Hybrid</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="duration" className="text-white">Duration (Days)</Label>
                          <Select onValueChange={(value) => handleJobInputChange("duration", value)}>
                            <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                              <SelectValue placeholder="30 days (default)" />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-700 border-slate-600">
                              <SelectItem value="7">7 days</SelectItem>
                              <SelectItem value="14">14 days</SelectItem>
                              <SelectItem value="30">30 days</SelectItem>
                              <SelectItem value="60">60 days</SelectItem>
                              <SelectItem value="90">90 days</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <Button 
                        onClick={handleCreateJob}
                        disabled={isCreatingJob}
                        className="w-full bg-secondary-pink hover:bg-secondary-pink/80"
                      >
                        {isCreatingJob ? "Creating Job & LinkedIn Posting..." : "Create Job & Post to LinkedIn"}
                      </Button>
                    </CardContent>
                  </Card>
                </div>

                {/* Job Posting Info Panel */}
                <div className="space-y-4">
                  <Card className="bg-primary-blue border border-white/20">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-white">
                        <Target className="h-5 w-5 text-secondary-pink" />
                        Career Page Benefits
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm text-slate-300">
                      <div className="flex items-start gap-2">
                        <div className="w-2 h-2 bg-green-400 rounded-full mt-1.5"></div>
                        <div>
                          <strong className="text-white">Career Page:</strong> Job posted directly to your website
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="w-2 h-2 bg-blue-400 rounded-full mt-1.5"></div>
                        <div>
                          <strong className="text-white">LinkedIn Job Board:</strong> Official job posting on LinkedIn's job board
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="w-2 h-2 bg-secondary-pink rounded-full mt-1.5"></div>
                        <div>
                          <strong className="text-white">Professional Reach:</strong> Candidates can apply directly through LinkedIn
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="w-2 h-2 bg-secondary-pink rounded-full mt-1.5"></div>
                        <div>
                          <strong className="text-white">Dual Visibility:</strong> Maximum exposure across both platforms
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-primary-blue border border-white/20">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-white">
                        <DollarSign className="h-5 w-5 text-secondary-pink" />
                        Job Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm text-slate-300">
                      <div>
                        <strong className="text-white">Job Function:</strong> Helps categorize the role
                      </div>
                      <div>
                        <strong className="text-white">Employment Type:</strong> Full-time, Part-time, Contract, etc.
                      </div>
                      <div>
                        <strong className="text-white">Workplace Type:</strong> Remote, On-site, or Hybrid
                      </div>
                      <div>
                        <strong className="text-white">Location:</strong> Leave empty for Remote positions
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            {/* Advertisement Tab */}
            <TabsContent value="advertisement">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <Card className="bg-primary-blue border border-white/20">
                    <CardHeader>
                      <CardTitle className="text-white">Create LinkedIn Sponsored Content</CardTitle>
                      <CardDescription className="text-slate-300">
                        Create paid advertisements to promote your job openings - Paid
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="adJobTitle" className="text-white">Job Title *</Label>
                          <Input
                            id="adJobTitle"
                            placeholder="e.g. Senior Software Engineer"
                            value={adFormData.jobTitle}
                            onChange={(e) => handleAdInputChange("jobTitle", e.target.value)}
                            className="bg-slate-700 border-slate-600 text-white"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="campaignName" className="text-white">Campaign Name</Label>
                          <Input
                            id="campaignName"
                            placeholder="Leave empty to use job title"
                            value={adFormData.campaignName}
                            onChange={(e) => handleAdInputChange("campaignName", e.target.value)}
                            className="bg-slate-700 border-slate-600 text-white"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="adJobDescription" className="text-white">Job Description</Label>
                        <Textarea
                          id="adJobDescription"
                          placeholder="Describe the role for the advertisement..."
                          rows={4}
                          value={adFormData.jobDescription}
                          onChange={(e) => handleAdInputChange("jobDescription", e.target.value)}
                          className="bg-slate-700 border-slate-600 text-white"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="budget" className="text-white">Budget (USD) *</Label>
                          <Input
                            id="budget"
                            type="number"
                            placeholder="e.g. 500"
                            value={adFormData.budget}
                            onChange={(e) => handleAdInputChange("budget", e.target.value)}
                            className="bg-slate-700 border-slate-600 text-white"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="adDuration" className="text-white">Duration (Days) *</Label>
                          <Select onValueChange={(value) => handleAdInputChange("duration", value)}>
                            <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                              <SelectValue placeholder="Select duration" />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-700 border-slate-600">
                              <SelectItem value="7">7 days</SelectItem>
                              <SelectItem value="14">14 days</SelectItem>
                              <SelectItem value="30">30 days</SelectItem>
                              <SelectItem value="60">60 days</SelectItem>
                              <SelectItem value="90">90 days</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="targetAudience" className="text-white">Target Audience</Label>
                        <Input
                          id="targetAudience"
                          placeholder="e.g. Software Engineers, Product Managers"
                          value={adFormData.targetAudience}
                          onChange={(e) => handleAdInputChange("targetAudience", e.target.value)}
                          className="bg-slate-700 border-slate-600 text-white"
                        />
                      </div>

                      <Button 
                        onClick={handleCreateAdvertisement}
                        disabled={isCreatingAd}
                        className="w-full bg-secondary-pink hover:bg-secondary-pink/80"
                      >
                        {isCreatingAd ? "Creating LinkedIn Advertisement..." : "Create LinkedIn Advertisement"}
                      </Button>
                    </CardContent>
                  </Card>
                </div>

                {/* Advertisement Info Panel */}
                <div className="space-y-4">
                  <Card className="bg-primary-blue border border-white/20">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-white">
                        <Linkedin className="h-5 w-5 text-secondary-pink" />
                        LinkedIn Advertising Benefits
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm text-slate-300">
                      <div className="flex items-start gap-2">
                        <div className="w-2 h-2 bg-blue-400 rounded-full mt-1.5"></div>
                        <div>
                          <strong className="text-white">Targeted Reach:</strong> Reach specific professionals by skills, experience, and location
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="w-2 h-2 bg-green-400 rounded-full mt-1.5"></div>
                        <div>
                          <strong className="text-white">Premium Visibility:</strong> Your job appears prominently in LinkedIn feeds
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="w-2 h-2 bg-secondary-pink rounded-full mt-1.5"></div>
                        <div>
                          <strong className="text-white">Performance Tracking:</strong> Detailed analytics on impressions, clicks, and applications
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="w-2 h-2 bg-orange-400 rounded-full mt-1.5"></div>
                        <div>
                          <strong className="text-white">Faster Hiring:</strong> Reach passive candidates who might not be actively job searching
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-primary-blue border border-white/20">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-white">
                        <Calendar className="h-5 w-5 text-secondary-pink" />
                        Pricing & Budget Tips
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm text-slate-300">
                      <div>
                        <strong className="text-white">Daily Budget:</strong> Budget is divided evenly across campaign duration
                      </div>
                      <div>
                        <strong className="text-white">Minimum Budget:</strong> LinkedIn typically requires $10+ per day
                      </div>
                      <div>
                        <strong className="text-white">Recommended:</strong> $300-500 for 30 days for good reach
                      </div>
                      <div>
                        <strong className="text-white">Cost Model:</strong> CPM (Cost Per Mille) - you pay per 1000 impressions
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
};

export default JobAdvertising;