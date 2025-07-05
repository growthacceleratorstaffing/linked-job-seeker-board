import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const JobAdderCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Processing JobAdder authentication...');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');

        // Check for OAuth errors first
        if (error) {
          throw new Error(`JobAdder OAuth error: ${error}`);
        }

        if (!code) {
          throw new Error('Authorization code not received from JobAdder');
        }

        setMessage('Exchanging authorization code for access token...');

        // Get current session to ensure user is authenticated
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session) {
          throw new Error('You must be logged in to complete JobAdder authentication');
        }

        // Exchange the authorization code for access token
        const { data, error: exchangeError } = await supabase.functions.invoke('jobadder-oauth', {
          body: {
            action: 'exchange_code',
            code: code,
            state: state,
            redirectUri: `${window.location.origin}/auth/jobadder/callback`
          },
          headers: {
            Authorization: `Bearer ${session.access_token}`
          }
        });

        if (exchangeError) {
          throw new Error(exchangeError.message || 'Failed to exchange authorization code');
        }

        if (!data?.success) {
          throw new Error(data?.error || 'Token exchange failed');
        }

        setStatus('success');
        setMessage('JobAdder authentication successful!');

        toast({
          title: "JobAdder Connected! 🎉",
          description: "Your JobAdder account has been successfully connected.",
        });

        // Redirect to dashboard after successful authentication
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);

      } catch (error: any) {
        console.error('JobAdder callback error:', error);
        
        setStatus('error');
        setMessage(error.message || 'Failed to complete JobAdder authentication');

        toast({
          title: "Authentication Failed",
          description: error.message || 'Failed to complete JobAdder authentication',
          variant: "destructive",
        });

        // Redirect back to auth page after error
        setTimeout(() => {
          navigate('/auth');
        }, 3000);
      }
    };

    handleCallback();
  }, [searchParams, navigate, toast]);

  const getIcon = () => {
    switch (status) {
      case 'processing':
        return <Loader2 className="w-8 h-8 animate-spin text-secondary-pink" />;
      case 'success':
        return <CheckCircle className="w-8 h-8 text-green-400" />;
      case 'error':
        return <XCircle className="w-8 h-8 text-red-400" />;
      default:
        return <Loader2 className="w-8 h-8 animate-spin text-secondary-pink" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'success':
        return 'text-green-400';
      case 'error':
        return 'text-red-400';
      default:
        return 'text-slate-300';
    }
  };

  return (
    <div className="min-h-screen bg-primary-blue flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="text-center">
          <div className="flex items-center justify-center mb-6">
            <img 
              src="/lovable-uploads/76da95f6-805f-4f3e-91e8-f4ddc51657ad.png" 
              alt="Growth Accelerator Logo" 
              className="h-12 w-12 sm:h-16 sm:w-16 object-contain"
            />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">JobAdder Integration</h1>
        </div>

        {/* Status Card */}
        <div className="bg-slate-800 border border-slate-600 rounded-lg p-8">
          <div className="flex flex-col items-center space-y-4">
            {getIcon()}
            
            <div className="text-center space-y-2">
              <h2 className="text-xl font-semibold text-white">
                {status === 'processing' && 'Processing...'}
                {status === 'success' && 'Success!'}
                {status === 'error' && 'Error'}
              </h2>
              
              <p className={`text-sm ${getStatusColor()}`}>
                {message}
              </p>
            </div>

            {status === 'processing' && (
              <div className="text-xs text-slate-400 text-center">
                <p>Please wait while we complete the authentication process.</p>
                <p className="mt-1">This may take a few moments...</p>
              </div>
            )}

            {status === 'success' && (
              <div className="text-xs text-slate-400 text-center">
                <p>Redirecting to dashboard...</p>
              </div>
            )}

            {status === 'error' && (
              <div className="text-xs text-slate-400 text-center">
                <p>Redirecting back to login...</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center">
          <p className="text-xs text-slate-400">
            Growth Accelerator - JobAdder Integration
          </p>
        </div>
      </div>
    </div>
  );
};

export default JobAdderCallback;