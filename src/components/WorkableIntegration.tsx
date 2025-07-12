import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Briefcase, Upload, ExternalLink, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

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
  const [isPublishing, setIsPublishing] = useState(false);
  const { toast } = useToast();

  // Query for integration settings to show auto-sync status
  const { data: integrationSettings } = useQuery({
    queryKey: ["workable-integration-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("integration_settings")
        .select("*")
        .eq("integration_type", "workable")
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    }
  });

  // Query for recent sync logs to show sync status
  const { data: recentSyncLog } = useQuery({
    queryKey: ["workable-recent-sync"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("integration_sync_logs")
        .select("*")
        .eq("integration_type", "workable")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    refetchInterval: 30000 // Refetch every 30 seconds
  });

  const loadJobs = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('workable-integration', {
        body: { action: 'sync_jobs' }
      });

      if (error) throw error;
      setWorkableJobs(data.jobs || []);
    } catch (error) {
      console.error('Error loading jobs:', error);
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

      await loadJobs();

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

  const getSyncStatusInfo = () => {
    if (!recentSyncLog) {
      return { status: 'unknown', message: 'No sync data available', icon: AlertCircle, color: 'text-gray-400' };
    }

    switch (recentSyncLog.status) {
      case 'success':
        return { 
          status: 'success', 
          message: `Last synced: ${new Date(recentSyncLog.completed_at || recentSyncLog.created_at).toLocaleString()}`,
          icon: CheckCircle,
          color: 'text-green-600'
        };
      case 'in_progress':
      case 'pending':
        return { 
          status: 'syncing', 
          message: 'Auto-sync in progress...',
          icon: Clock,
          color: 'text-blue-600'
        };
      case 'failed':
        return { 
          status: 'error', 
          message: `Sync failed: ${recentSyncLog.error_message || 'Unknown error'}`,
          icon: AlertCircle,
          color: 'text-red-600'
        };
      default:
        return { 
          status: 'unknown', 
          message: 'Unknown sync status',
          icon: AlertCircle,
          color: 'text-gray-400'
        };
    }
  };

  const getNextSyncTime = () => {
    if (!integrationSettings?.last_sync_at || !integrationSettings?.sync_frequency_hours) {
      return 'Next sync: Soon';
    }

    const lastSync = new Date(integrationSettings.last_sync_at);
    const nextSync = new Date(lastSync.getTime() + (integrationSettings.sync_frequency_hours * 60 * 60 * 1000));
    
    if (nextSync > new Date()) {
      return `Next sync: ${nextSync.toLocaleString()}`;
    } else {
      return 'Next sync: Scheduled soon';
    }
  };

  useEffect(() => {
    loadJobs();
  }, []);

  const syncInfo = getSyncStatusInfo();
  const StatusIcon = syncInfo.icon;

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
                    Publish Job
                  </>
                )}
              </Button>
            )}
          </div>
        </CardTitle>
        
        <div className="bg-slate-900 rounded-lg p-3 mt-3">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <StatusIcon className={`w-4 h-4 ${syncInfo.color}`} />
              <span className="text-slate-300">Auto-sync Status:</span>
              <span className={syncInfo.color}>{syncInfo.message}</span>
            </div>
            {integrationSettings?.is_enabled && (
              <Badge variant="outline" className="text-green-400 border-green-400">
                Auto-sync enabled
              </Badge>
            )}
          </div>
          {integrationSettings?.is_enabled && (
            <div className="text-xs text-slate-400 mt-1">
              Sync frequency: Every {integrationSettings.sync_frequency_hours || 2} hours • {getNextSyncTime()}
            </div>
          )}
        </div>
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
              No published jobs found. Auto-sync will update this automatically, or publish your first vacancy!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
