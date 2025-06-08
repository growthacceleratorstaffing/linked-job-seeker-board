
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

    // Check for pending sync logs
    const { data: pendingSyncs, error: syncError } = await supabase
      .from('integration_sync_logs')
      .select('*')
      .eq('integration_type', 'workable')
      .eq('sync_type', 'auto_sync_jobs_and_candidates')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(1);

    if (syncError) {
      console.error('Error checking sync logs:', syncError);
      throw syncError;
    }

    if (!pendingSyncs || pendingSyncs.length === 0) {
      console.log('No pending syncs found');
      return new Response(
        JSON.stringify({ message: 'No pending syncs' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const syncLog = pendingSyncs[0];

    // Update sync log to in_progress
    await supabase
      .from('integration_sync_logs')
      .update({ 
        status: 'in_progress',
        synced_data: { ...syncLog.synced_data, started_at: new Date().toISOString() }
      })
      .eq('id', syncLog.id);

    try {
      // Sync jobs first
      console.log('Starting job sync...');
      const jobsResponse = await supabase.functions.invoke('workable-integration', {
        body: { action: 'sync_jobs' }
      });

      if (jobsResponse.error) {
        throw new Error(`Job sync failed: ${jobsResponse.error.message}`);
      }

      console.log('Job sync completed');

      // Then sync candidates
      console.log('Starting candidate sync...');
      const candidatesResponse = await supabase.functions.invoke('workable-integration', {
        body: { action: 'sync_candidates' }
      });

      if (candidatesResponse.error) {
        throw new Error(`Candidate sync failed: ${candidatesResponse.error.message}`);
      }

      console.log('Candidate sync completed');

      // Update sync log to success
      await supabase
        .from('integration_sync_logs')
        .update({ 
          status: 'success',
          completed_at: new Date().toISOString(),
          synced_data: {
            ...syncLog.synced_data,
            completed_at: new Date().toISOString(),
            jobs_synced: jobsResponse.data?.total || 0,
            candidates_synced: candidatesResponse.data?.syncedCandidates || 0
          }
        })
        .eq('id', syncLog.id);

      // Update integration settings last sync time
      await supabase
        .from('integration_settings')
        .update({ last_sync_at: new Date().toISOString() })
        .eq('integration_type', 'workable');

      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Automatic sync completed successfully',
          jobsSynced: jobsResponse.data?.total || 0,
          candidatesSynced: candidatesResponse.data?.syncedCandidates || 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (error) {
      console.error('Sync failed:', error);
      
      // Update sync log to failed
      await supabase
        .from('integration_sync_logs')
        .update({ 
          status: 'failed',
          completed_at: new Date().toISOString(),
          error_message: error.message,
          synced_data: {
            ...syncLog.synced_data,
            failed_at: new Date().toISOString(),
            error: error.message
          }
        })
        .eq('id', syncLog.id);

      throw error;
    }

  } catch (error) {
    console.error('Error in background sync:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Background sync failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
