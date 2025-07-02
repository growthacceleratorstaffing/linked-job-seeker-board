import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, Users, Briefcase, TrendingUp, Settings, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalCandidates: 0,
    activeJobs: 0,
    applications: 0,
    interviews: 0
  });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      // Fetch candidates count
      const { count: candidatesCount } = await supabase
        .from('candidates')
        .select('*', { count: 'exact', head: true });

      // Fetch jobs data
      const { data: jobsData } = await supabase.functions.invoke('workable-integration', {
        body: { action: 'sync_jobs' }
      });

      const activeJobs = jobsData?.jobs?.filter((job: any) => job.state === 'published').length || 0;
      const totalApplications = candidatesCount || 0;
      const interviews = 0; // Could be enhanced with interview data

      setStats({
        totalCandidates: candidatesCount || 0,
        activeJobs,
        applications: totalApplications,
        interviews
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

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
            Workable Dashboard
          </h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            Overview of your recruitment metrics and activities
          </p>
        </header>
        
        <div className="flex items-center justify-between mb-6">
          <div></div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              className="border-secondary-pink text-secondary-pink hover:bg-secondary-pink hover:text-white"
            >
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Button>
            <Button 
              onClick={fetchDashboardData}
              disabled={isLoading}
              className="bg-secondary-pink hover:bg-secondary-pink/80"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Sync Data
            </Button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-white">Total Candidates</CardTitle>
              <Users className="h-4 w-4 text-secondary-pink" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats.totalCandidates}</div>
              <p className="text-xs text-slate-400">Synced from Workable</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-white">Active Jobs</CardTitle>
              <Briefcase className="h-4 w-4 text-secondary-pink" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats.activeJobs}</div>
              <p className="text-xs text-slate-400">Currently published</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-white">Applications</CardTitle>
              <TrendingUp className="h-4 w-4 text-secondary-pink" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats.applications}</div>
              <p className="text-xs text-slate-400">Total candidates</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-white">Interviews</CardTitle>
              <BarChart3 className="h-4 w-4 text-secondary-pink" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats.interviews}</div>
              <p className="text-xs text-slate-400">Scheduled</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2 mb-6">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Recent Activity</CardTitle>
              <CardDescription className="text-slate-400">Latest updates from your Workable account</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-slate-400">
                <BarChart3 className="mx-auto h-8 w-8 mb-2 text-secondary-pink" />
                <p>Activity tracking coming soon</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Pipeline Overview</CardTitle>
              <CardDescription className="text-slate-400">Candidates by interview stage</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-slate-400">
                <TrendingUp className="mx-auto h-8 w-8 mb-2 text-secondary-pink" />
                <p>Pipeline visualization coming soon</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Workable Integration Status</CardTitle>
            <CardDescription className="text-slate-400">Your Workable connection is active</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12 text-slate-400">
              <Settings className="mx-auto h-12 w-12 mb-4 text-secondary-pink" />
              <h3 className="text-lg font-semibold mb-2 text-white">Workable Connected</h3>
              <p className="mb-4">growthacceleratorstaffing.workable.com</p>
              <Button className="bg-secondary-pink hover:bg-secondary-pink/80">
                <Settings className="mr-2 h-4 w-4" />
                Manage Integration
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;