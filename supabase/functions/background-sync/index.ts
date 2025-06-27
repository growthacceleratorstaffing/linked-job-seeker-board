
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.10";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

    console.log('Background sync triggered');

    // Check for pending sync logs with a more efficient query
    const { data: pendingSyncs, error: syncError } = await supabase
      .from('integration_sync_logs')
      .select('id, integration_type, sync_type, status, synced_data')
      .eq('integration_type', 'workable')
      .eq('sync_type', 'auto_sync_jobs_and_candidates')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    if (syncError) {
      if (syncError.code === 'PGRST116') {
        console.log('No pending syncs found');
        return new Response(
          JSON.stringify({ message: 'No pending syncs' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      console.error('Error checking sync logs:', syncError);
      throw syncError;
    }

    // Update sync log to in_progress immediately
    const { error: updateError } = await supabase
      .from('integration_sync_logs')
      .update({ 
        status: 'in_progress',
        synced_data: { ...pendingSyncs.synced_data, started_at: new Date().toISOString() }
      })
      .eq('id', pendingSyncs.id);

    if (updateError) {
      console.error('Error updating sync status:', updateError);
      throw updateError;
    }

    // Use Promise.allSettled for better error handling and faster execution
    const [jobsResult, candidatesResult] = await Promise.allSettled([
      supabase.functions.invoke('workable-integration', {
        body: { action: 'sync_jobs' }
      }),
      supabase.functions.invoke('workable-integration', {
        body: { action: 'sync_candidates' }
      })
    ]);

    let jobsSynced = 0;
    let candidatesSynced = 0;
    let hasErrors = false;
    let errorMessages: string[] = [];

    // Process jobs sync result
    if (jobsResult.status === 'fulfilled' && !jobsResult.value.error) {
      jobsSynced = jobsResult.value.data?.total || 0;
      console.log('Job sync completed successfully');
    } else {
      hasErrors = true;
      const error = jobsResult.status === 'rejected' ? jobsResult.reason : jobsResult.value.error;
      errorMessages.push(`Job sync failed: ${error?.message || 'Unknown error'}`);
      console.error('Job sync failed:', error);
    }

    // Process candidates sync result
    if (candidatesResult.status === 'fulfilled' && !candidatesResult.value.error) {
      candidatesSynced = candidatesResult.value.data?.syncedCandidates || 0;
      console.log('Candidate sync completed successfully');
    } else {
      hasErrors = true;
      const error = candidatesResult.status === 'rejected' ? candidatesResult.reason : candidatesResult.value.error;
      errorMessages.push(`Candidate sync failed: ${error?.message || 'Unknown error'}`);
      console.error('Candidate sync failed:', error);
    }

    // Update sync log with final status
    const finalStatus = hasErrors ? (jobsSynced > 0 || candidatesSynced > 0 ? 'completed_with_warnings' : 'failed') : 'success';
    
    await supabase
      .from('integration_sync_logs')
      .update({ 
        status: finalStatus,
        completed_at: new Date().toISOString(),
        error_message: errorMessages.length > 0 ? errorMessages.join('; ') : null,
        synced_data: {
          ...pendingSyncs.synced_data,
          completed_at: new Date().toISOString(),
          jobs_synced: jobsSynced,
          candidates_synced: candidatesSynced,
          errors: errorMessages
        }
      })
      .eq('id', pendingSyncs.id);

    // Only update integration settings if sync was successful
    if (!hasErrors) {
      await supabase
        .from('integration_settings')
        .update({ last_sync_at: new Date().toISOString() })
        .eq('integration_type', 'workable');
    }

    return new Response(
      JSON.stringify({ 
        success: !hasErrors,
        message: hasErrors ? 'Sync completed with errors' : 'Automatic sync completed successfully',
        jobsSynced,
        candidatesSynced,
        errors: errorMessages.length > 0 ? errorMessages : undefined
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in background sync:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Background sync failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
