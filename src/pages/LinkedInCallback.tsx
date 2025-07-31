import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const LinkedInCallback: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const error = searchParams.get('error');
      const state = searchParams.get('state');

      if (error) {
        toast({
          title: "LinkedIn Connection Failed",
          description: error,
          variant: "destructive"
        });
        navigate('/linkedin');
        return;
      }

      if (!code) {
        toast({
          title: "Error",
          description: "No authorization code received",
          variant: "destructive"
        });
        navigate('/linkedin');
        return;
      }

      try {
        const redirectUrl = `${window.location.origin}/linkedin-callback`;
        
        const { data, error: exchangeError } = await supabase.functions.invoke('linkedin-oauth', {
          body: { 
            action: 'exchangeCode',
            code,
            redirectUrl
          }
        });

        if (exchangeError) throw exchangeError;

        toast({
          title: "Success",
          description: "LinkedIn connected successfully!"
        });

        navigate('/linkedin');
      } catch (error) {
        console.error('Error exchanging code:', error);
        toast({
          title: "Connection Failed",
          description: "Failed to complete LinkedIn connection",
          variant: "destructive"
        });
        navigate('/linkedin');
      }
    };

    handleCallback();
  }, [searchParams, navigate, toast]);

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Connecting to LinkedIn...</h2>
          <p className="text-muted-foreground">Please wait while we complete your connection.</p>
        </div>
      </div>
    </div>
  );
};

export default LinkedInCallback;