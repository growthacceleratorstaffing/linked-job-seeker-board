import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Briefcase, RefreshCw, ExternalLink, CheckCircle, Archive } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface WorkableJob {
  id: string;
  title: string;
  full_title: string;
  description: string;
  state: string;
  created_at: string;
  url: string;
  application_url: string;
}

interface JobsOverviewProps {
  refreshTrigger?: number;
}

export const JobsOverview: React.FC<JobsOverviewProps> = ({ refreshTrigger }) => {
  const [workableJobs, setWorkableJobs] = useState<WorkableJob[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const { toast } = useToast();

  const syncJobs = async () => {
    setIsSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('workable-integration', {
        body: { action: 'sync_jobs' }
      });

      if (error) throw error;

      setWorkableJobs(data.jobs || []);
      
    } catch (error) {
      console.error('Error syncing jobs:', error);
      toast({
        title: "Sync failed",
        description: error instanceof Error ? error.message : "Failed to sync jobs from Workable.",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    syncJobs();
  }, [refreshTrigger]);

  const getStatusBadge = (state: string) => {
    if (state === 'published') {
      return (
        <Badge variant="outline" className="border-green-400 text-green-400">
          <CheckCircle className="w-3 h-3 mr-1" />
          Published
        </Badge>
      );
    } else if (state === 'archived') {
      return (
        <Badge variant="outline" className="border-secondary-pink text-secondary-pink">
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

  return (
    <Card className="bg-primary-blue border-slate-700">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-secondary-pink" />
            Jobs Overview
          </div>
          <Button
            onClick={syncJobs}
            disabled={isSyncing}
            variant="outline"
            size="sm"
            className="border-secondary-pink text-secondary-pink hover:bg-secondary-pink hover:text-white"
          >
            {isSyncing ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </>
            )}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {workableJobs.length > 0 ? (
          <div className="space-y-4">
            <p className="text-slate-300 text-sm">
              {workableJobs.length} total jobs in your Workable account
            </p>
            <Table>
              <TableHeader>
                <TableRow className="border-slate-600">
                  <TableHead className="text-slate-300">Job Title</TableHead>
                  <TableHead className="text-slate-300">Status</TableHead>
                  <TableHead className="text-slate-300">Created</TableHead>
                  <TableHead className="text-slate-300 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workableJobs.map((job) => (
                  <TableRow key={job.id} className="border-slate-600 hover:bg-slate-700">
                    <TableCell className="text-white font-medium">
                      {job.title}
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
          </div>
        ) : (
          <div className="text-center py-8">
            <Briefcase className="w-12 h-12 text-slate-500 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">
              No jobs found. Click "Refresh" to sync your latest jobs!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
