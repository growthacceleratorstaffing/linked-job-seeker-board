import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, Users, Briefcase, TrendingUp, RefreshCw, Clock, CheckCircle, UserCheck, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/Layout";

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalCandidates: 0,
    activeJobs: 0,
    newApplications: 0,
    activeInterviews: 0,
    completedOnboarding: 0,
    pendingMatches: 0
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [pipelineData, setPipelineData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      // Fetch candidates count
      const { count: candidatesCount } = await supabase
        .from('candidates')
        .select('*', { count: 'exact', head: true });

      // Fetch recent candidates for activity
      const { data: recentCandidates } = await supabase
        .from('candidates')
        .select('name, created_at, source_platform')
        .order('created_at', { ascending: false })
        .limit(5);

      // Fetch candidates by interview stage for pipeline
      const { data: pipelineStages } = await supabase
        .from('candidates')
        .select('interview_stage')
        .not('interview_stage', 'is', null);

      // Process pipeline data
      const stageCount = pipelineStages?.reduce((acc: any, candidate) => {
        const stage = candidate.interview_stage || 'pending';
        acc[stage] = (acc[stage] || 0) + 1;
        return acc;
      }, {}) || {};

      // Fetch responses count
      const { count: responsesCount } = await supabase
        .from('candidate_responses')
        .select('*', { count: 'exact', head: true });

      // Fetch interview count
      const { count: interviewsCount } = await supabase
        .from('candidate_interviews')
        .select('*', { count: 'exact', head: true })
        .eq('stage', 'in_progress');

      setStats({
        totalCandidates: candidatesCount || 0,
        activeJobs: 12, // Placeholder - could fetch from integration
        newApplications: responsesCount || 0,
        activeInterviews: interviewsCount || 0,
        completedOnboarding: stageCount.completed || 0,
        pendingMatches: stageCount.pending || 0
      });

      setRecentActivity(recentCandidates || []);
      setPipelineData([
        { stage: 'Pending', count: stageCount.pending || 0, color: 'bg-yellow-500' },
        { stage: 'In Progress', count: stageCount.in_progress || 0, color: 'bg-blue-500' },
        { stage: 'Completed', count: stageCount.completed || 0, color: 'bg-green-500' },
        { stage: 'Passed', count: stageCount.passed || 0, color: 'bg-emerald-500' },
        { stage: 'Failed', count: stageCount.failed || 0, color: 'bg-red-500' }
      ]);

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
    <Layout>
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Dashboard Overview
            </h1>
            <p className="text-slate-300">
              Track your recruitment pipeline and key metrics
            </p>
          </div>
            <Button 
              onClick={fetchDashboardData}
              disabled={isLoading}
              variant="outline"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh Data
            </Button>
          </div>

          {/* Key Metrics */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
            <Card className="bg-primary-blue border border-white/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-white">Total Candidates</CardTitle>
                <Users className="h-4 w-4 text-secondary-pink" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{stats.totalCandidates}</div>
                <p className="text-xs text-slate-400">In your database</p>
              </CardContent>
            </Card>

            <Card className="bg-primary-blue border border-white/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-white">Active Jobs</CardTitle>
                <Briefcase className="h-4 w-4 text-secondary-pink" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{stats.activeJobs}</div>
                <p className="text-xs text-slate-400">Currently open positions</p>
              </CardContent>
            </Card>

            <Card className="bg-primary-blue border border-white/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-white">New Applications</CardTitle>
                <TrendingUp className="h-4 w-4 text-secondary-pink" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{stats.newApplications}</div>
                <p className="text-xs text-slate-400">Candidate responses</p>
              </CardContent>
            </Card>

            <Card className="bg-primary-blue border border-white/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-white">Active Interviews</CardTitle>
                <Clock className="h-4 w-4 text-secondary-pink" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{stats.activeInterviews}</div>
                <p className="text-xs text-slate-400">In progress</p>
              </CardContent>
            </Card>

            <Card className="bg-primary-blue border border-white/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-white">Pending Matches</CardTitle>
                <UserCheck className="h-4 w-4 text-secondary-pink" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{stats.pendingMatches}</div>
                <p className="text-xs text-slate-400">Awaiting review</p>
              </CardContent>
            </Card>

            <Card className="bg-primary-blue border border-white/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-white">Completed Onboarding</CardTitle>
                <CheckCircle className="h-4 w-4 text-secondary-pink" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{stats.completedOnboarding}</div>
                <p className="text-xs text-slate-400">Ready to hire</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Recent Activity */}
            <Card className="bg-primary-blue border border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Recent Activity</CardTitle>
                <CardDescription className="text-slate-400">Latest candidate additions and updates</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentActivity.length > 0 ? (
                    recentActivity.map((activity, index) => (
                      <div key={index} className="flex items-center space-x-3">
                        <div className="w-2 h-2 bg-secondary-pink rounded-full"></div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-white">{activity.name}</p>
                          <p className="text-xs text-slate-400">
                            Added from {activity.source_platform || 'manual'} • {new Date(activity.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4 text-slate-400">
                      <BarChart3 className="mx-auto h-8 w-8 mb-2" />
                      <p>No recent activity</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Pipeline Overview */}
            <Card className="bg-primary-blue border border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Pipeline Overview</CardTitle>
                <CardDescription className="text-slate-400">Candidates by interview stage</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {pipelineData.map((stage, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${stage.color}`}></div>
                        <span className="text-sm font-medium text-white">{stage.stage}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-bold text-white">{stage.count}</span>
                        <ArrowRight className="h-3 w-3 text-slate-400" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;