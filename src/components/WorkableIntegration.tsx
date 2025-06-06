
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Briefcase, Upload, RefreshCw, ExternalLink, CheckCircle } from "lucide-react";
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

interface WorkableIntegrationProps {
  generatedVacancy?: string;
}

export const WorkableIntegration: React.FC<WorkableIntegrationProps> = ({ generatedVacancy }) => {
  const [workableJobs, setWorkableJobs] = useState<WorkableJob[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
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

  const publishToWorkable = async () => {
    if (!generatedVacancy) {
      toast({
        title: "No vacancy to publish",
        description: "Please generate a vacancy first before publishing to Workable.",
        variant: "destructive",
      });
      return;
    }

    setIsPublishing(true);
    try {
      // Parse the generated vacancy to extract job details
      const jobData = parseVacancyText(generatedVacancy);
      
      const { data, error } = await supabase.functions.invoke('workable-integration', {
        body: { 
          action: 'publish_job',
          jobData
        }
      });

      if (error) throw error;

      toast({
        title: "Job published to Workable! 🎉",
        description: "Your vacancy has been successfully created in Workable.",
      });

      // Refresh the jobs list
      await syncJobs();

    } catch (error) {
      console.error('Error publishing to Workable:', error);
      toast({
        title: "Publishing failed",
        description: error instanceof Error ? error.message : "Failed to publish job to Workable.",
        variant: "destructive",
      });
    } finally {
      setIsPublishing(false);
    }
  };

  const parseVacancyText = (text: string) => {
    const lines = text.split('\n');
    let title = 'Untitled Position';
    let description = text;
    
    // Try to extract title from common patterns
    const titlePatterns = [
      /^#\s*(.+)$/m,
      /^Job Title:\s*(.+)$/m,
      /^Position:\s*(.+)$/m,
      /^Role:\s*(.+)$/m,
    ];
    
    for (const pattern of titlePatterns) {
      const match = text.match(pattern);
      if (match) {
        title = match[1].trim();
        break;
      }
    }
    
    return {
      title,
      description,
      employment_type: 'full_time',
      remote: text.toLowerCase().includes('remote'),
      department: 'General',
    };
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
            Workable Integration
          </div>
          <div className="flex gap-2">
            {generatedVacancy && (
              <Button
                onClick={publishToWorkable}
                disabled={isPublishing}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isPublishing ? (
                  <>
                    <Upload className="w-4 h-4 mr-2 animate-spin" />
                    Publishing...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Publish to Workable
                  </>
                )}
              </Button>
            )}
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
                  Sync Jobs
                </>
              )}
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {workableJobs.length > 0 ? (
          <div className="space-y-4">
            <p className="text-slate-300 text-sm">
              {workableJobs.length} published jobs in your Workable account:
            </p>
            <div className="grid gap-3 max-h-60 overflow-y-auto">
              {workableJobs.map((job) => (
                <div
                  key={job.id}
                  className="bg-slate-900 border border-slate-600 rounded-lg p-4 hover:border-blue-400 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="text-white font-medium text-sm mb-1">
                        {job.title}
                      </h4>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="text-xs border-green-400 text-green-400">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          {job.state}
                        </Badge>
                        <span className="text-slate-400 text-xs">
                          {new Date(job.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      asChild
                      className="text-blue-400 hover:text-blue-300 p-1"
                    >
                      <a href={job.url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <Briefcase className="w-12 h-12 text-slate-500 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">
              No published jobs found. Click "Sync Jobs" to refresh or publish your first vacancy!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
