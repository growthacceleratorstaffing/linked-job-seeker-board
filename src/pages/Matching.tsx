import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Briefcase, Plus, User, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/Layout";
import OnboardMatchDialog from "@/components/matching/OnboardMatchDialog";

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

const Matching = () => {
  const [stats, setStats] = useState({
    candidates: 0,
    openPositions: 0,
    matches: 0
  });
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showMatchDialog, setShowMatchDialog] = useState(false);
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

  const fetchMatchingData = async () => {
    setIsLoading(true);
    try {
      // Fetch candidates count
      const { count: candidatesCount } = await supabase
        .from('candidates')
        .select('*', { count: 'exact', head: true });

      // Fetch matches count
      const { count: matchesCount } = await supabase
        .from('candidate_responses')
        .select('*', { count: 'exact', head: true });

      // Fetch jobs data
      const { data: jobsData } = await supabase.functions.invoke('workable-integration', {
        body: { action: 'sync_jobs' }
      });

      const openPositions = jobsData?.jobs?.filter((job: any) => job.state === 'published').length || 0;

      setStats({
        candidates: candidatesCount || 0,
        openPositions,
        matches: matchesCount || 0
      });

      // Fetch matches for display
      await fetchMatches();
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
          <h1 className="text-3xl font-bold text-white mb-2">Matching Module</h1>
          <p className="text-slate-300">Match candidates to jobs</p>
        </div>

        <div className="flex items-center justify-between mb-6">
          <div></div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2 max-w-4xl mx-auto mb-6">
          <Card className="bg-primary-blue border border-white/20">
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
        <div className="mb-8">
          <Card className="bg-primary-blue border border-white/20">
            <CardContent className="p-6 text-center">
              <h3 className="text-xl font-semibold text-white mb-2">Ready to Create a Match?</h3>
              <p className="text-slate-400 mb-4">Connect the right candidate with the perfect job opportunity</p>
              <Button 
                onClick={() => setShowMatchDialog(true)}
                className="bg-secondary-pink hover:bg-secondary-pink/80 text-white"
                size="lg"
              >
                <Plus className="mr-2 h-5 w-5" />
                Create New Match
              </Button>
            </CardContent>
          </Card>
        </div>

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

      <OnboardMatchDialog
        open={showMatchDialog}
        onOpenChange={setShowMatchDialog}
        onMatchCreated={fetchMatches}
      />
    </Layout>
  );
};

export default Matching;