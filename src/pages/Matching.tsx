import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bot, Users, Briefcase, TrendingUp, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/Layout";
import OnboardMatchDialog from "@/components/matching/OnboardMatchDialog";

const Matching = () => {
  const [stats, setStats] = useState({
    candidates: 0,
    openPositions: 0,
    matches: 0
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showMatchDialog, setShowMatchDialog] = useState(false);
  const { toast } = useToast();

  const fetchMatchingData = async () => {
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

      const openPositions = jobsData?.jobs?.filter((job: any) => job.state === 'published').length || 0;

      setStats({
        candidates: candidatesCount || 0,
        openPositions,
        matches: 0 // AI matches would be calculated based on actual matching algorithm
      });
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

  const generateMatches = async () => {
    setIsLoading(true);
    try {
      // This would call an AI matching service
      toast({
        title: "AI Matching",
        description: "AI matching functionality coming soon",
      });
    } catch (error) {
      console.error('Error generating matches:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMatchingData();
  }, []);

  return (
    <Layout>
      <div className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">AI-Powered Matching</h1>
          <p className="text-slate-300">Match candidates to jobs using artificial intelligence</p>
        </div>

        <div className="flex items-center justify-between mb-6">
          <div></div>
          <Button 
            onClick={() => setShowMatchDialog(true)}
            className="bg-secondary-pink hover:bg-secondary-pink/80"
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Match
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-6">
          <Card className="bg-primary-blue border-primary-blue">
            <CardHeader>
              <CardTitle className="flex items-center text-white">
                <Users className="mr-2 h-5 w-5 text-secondary-pink" />
                Candidates
              </CardTitle>
              <CardDescription className="text-slate-400">Active candidates available for matching</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats.candidates}</div>
              <p className="text-xs text-slate-400">Total candidates</p>
            </CardContent>
          </Card>

          <Card className="bg-primary-blue border-primary-blue">
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

          <Card className="bg-primary-blue border-primary-blue">
            <CardHeader>
              <CardTitle className="flex items-center text-white">
                <Bot className="mr-2 h-5 w-5 text-secondary-pink" />
                AI Matches
              </CardTitle>
              <CardDescription className="text-slate-400">Generated matches this week</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats.matches}</div>
              <p className="text-xs text-slate-400">Matches generated</p>
            </CardContent>
          </Card>
        </div>

      </div>

      <OnboardMatchDialog
        open={showMatchDialog}
        onOpenChange={setShowMatchDialog}
      />
    </Layout>
  );
};

export default Matching;