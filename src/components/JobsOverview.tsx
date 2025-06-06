
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Briefcase, RefreshCw, ExternalLink, CheckCircle } from "lucide-react";
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

export const JobsOverview: React.FC = () => {
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
      
      toast({
        title: "Jobs synced successfully!",
        description: `Found ${data.total} published jobs in Workable.`,
      });

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
  }, []);

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-blue-400" />
            Jobs Overview
          </div>
          <Button
            onClick={syncJobs}
            disabled={isSyncing}
            variant="outline"
            size="sm"
            className="border-blue-400 text-blue-400 hover:bg-blue-400 hover:text-white"
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
              {workableJobs.length} published jobs in your Workable account
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
                      <Badge variant="outline" className="border-green-400 text-green-400">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        {job.state}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-400">
                      {new Date(job.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        asChild
                        className="text-blue-400 hover:text-blue-300"
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
              No published jobs found. Click "Refresh" to sync your latest jobs!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
