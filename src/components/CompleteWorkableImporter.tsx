import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, Download, Users, Database } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface ImportStats {
  total_candidates: number;
  pages_processed: number;
  api_endpoint: string;
  data_quality: {
    with_email: number;
    with_phone: number;
    with_resume: number;
    with_linkedin: number;
    with_skills: number;
    with_applications: number;
  };
  status_breakdown: {
    active: number;
    archived: number;
    hired: number;
    rejected: number;
  };
  percentages: {
    email_coverage: number;
    phone_coverage: number;
    resume_coverage: number;
    linkedin_coverage: number;
    skills_coverage: number;
    active_candidates: number;
  };
}

interface ImportResult {
  success: boolean;
  message: string;
  totalCandidates: number;
  syncedCandidates: number;
  errorCount: number;
  errors: string[];
  stats: ImportStats;
}

export const CompleteWorkableImporter: React.FC = () => {
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [progress, setProgress] = useState(0);

  const startCompleteImport = async () => {
    setIsImporting(true);
    setImportResult(null);
    setProgress(0);

    try {
      toast.info('Starting complete Workable candidate import...');

      // Start progress simulation
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 1, 95));
      }, 1000);

      const { data, error } = await supabase.functions.invoke('workable-importer-complete');

      clearInterval(progressInterval);
      setProgress(100);

      if (error) {
        throw new Error(error.message || 'Import failed');
      }

      const result = data as ImportResult;
      setImportResult(result);

      if (result.success) {
        toast.success(`Import completed! ${result.syncedCandidates} candidates synced.`);
      } else {
        toast.error('Import completed with errors. Check results for details.');
      }

    } catch (error) {
      console.error('Import error:', error);
      toast.error(`Import failed: ${error.message}`);
      setImportResult({
        success: false,
        message: `Import failed: ${error.message}`,
        totalCandidates: 0,
        syncedCandidates: 0,
        errorCount: 1,
        errors: [error.message],
        stats: {} as ImportStats
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Complete Workable API Importer
          </CardTitle>
          <CardDescription>
            Import all candidates from Workable with comprehensive API coverage including
            resumes, LinkedIn profiles, skills, applications, and detailed metadata.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-primary" />
              <span>Rate Limited (300/min)</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <span>All States</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-primary" />
              <span>Full Profiles</span>
            </div>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-primary" />
              <span>Error Handling</span>
            </div>
          </div>

          {isImporting && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Import Progress</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="w-full" />
              <p className="text-sm text-muted-foreground">
                Importing candidates with rate limiting (200ms delays)...
              </p>
            </div>
          )}

          <Button 
            onClick={startCompleteImport} 
            disabled={isImporting}
            className="w-full"
            size="lg"
          >
            {isImporting ? 'Importing...' : 'Start Complete Import'}
          </Button>
        </CardContent>
      </Card>

      {importResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {importResult.success ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-500" />
              )}
              Import Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {importResult.totalCandidates}
                </div>
                <div className="text-sm text-muted-foreground">Total Found</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {importResult.syncedCandidates}
                </div>
                <div className="text-sm text-muted-foreground">Synced</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {importResult.errorCount}
                </div>
                <div className="text-sm text-muted-foreground">Errors</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {importResult.stats?.pages_processed || 0}
                </div>
                <div className="text-sm text-muted-foreground">Pages</div>
              </div>
            </div>

            {importResult.stats && (
              <>
                <div className="space-y-2">
                  <h4 className="font-semibold">Data Quality Coverage</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    <div className="flex justify-between">
                      <span>Email:</span>
                      <Badge variant="secondary">
                        {importResult.stats.percentages.email_coverage}%
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Phone:</span>
                      <Badge variant="secondary">
                        {importResult.stats.percentages.phone_coverage}%
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Resume:</span>
                      <Badge variant="secondary">
                        {importResult.stats.percentages.resume_coverage}%
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>LinkedIn:</span>
                      <Badge variant="secondary">
                        {importResult.stats.percentages.linkedin_coverage}%
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Skills:</span>
                      <Badge variant="secondary">
                        {importResult.stats.percentages.skills_coverage}%
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Active:</span>
                      <Badge variant="secondary">
                        {importResult.stats.percentages.active_candidates}%
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold">Status Breakdown</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <div className="flex justify-between">
                      <span>Active:</span>
                      <Badge variant="default">
                        {importResult.stats.status_breakdown.active}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Archived:</span>
                      <Badge variant="secondary">
                        {importResult.stats.status_breakdown.archived}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Hired:</span>
                      <Badge variant="default">
                        {importResult.stats.status_breakdown.hired}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Rejected:</span>
                      <Badge variant="destructive">
                        {importResult.stats.status_breakdown.rejected}
                      </Badge>
                    </div>
                  </div>
                </div>
              </>
            )}

            <div className="text-sm text-muted-foreground">
              {importResult.message}
            </div>

            {importResult.errors && importResult.errors.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-red-600">Errors</h4>
                <div className="max-h-32 overflow-y-auto text-sm text-red-600">
                  {importResult.errors.slice(0, 5).map((error, index) => (
                    <div key={index}>• {error}</div>
                  ))}
                  {importResult.errors.length > 5 && (
                    <div>... and {importResult.errors.length - 5} more errors</div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};