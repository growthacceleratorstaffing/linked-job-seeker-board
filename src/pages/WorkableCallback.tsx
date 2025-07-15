import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const WorkableCallback = () => {
  const [searchParams] = useSearchParams();
  const [isProcessing, setIsProcessing] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const error = searchParams.get('error');

      if (error) {
        setError(`Authorization failed: ${error}`);
        setIsProcessing(false);
        return;
      }

      if (!code) {
        setError('Authorization code missing');
        setIsProcessing(false);
        return;
      }

      try {
        console.log('Processing Workable OAuth callback with code:', code);
        
        // Use the existing workable-integration function instead
        const { data, error: exchangeError } = await supabase.functions.invoke('workable-integration', {
          body: { 
            action: 'oauth_callback',
            code: code,
            redirectUri: `${window.location.origin}/auth/workable/callback`
          }
        });

        if (exchangeError) {
          console.error('Exchange error:', exchangeError);
          throw exchangeError;
        }

        if (data?.success) {
          setSuccess(true);
          toast({
            title: "Workable Account Linked! 🎉",
            description: "Your Workable account has been successfully connected. You can now access candidates.",
          });

          // Redirect to candidates page after 2 seconds
          setTimeout(() => {
            navigate('/candidates');
          }, 2000);
        } else {
          throw new Error(data?.error || 'Failed to link Workable account');
        }

      } catch (error: any) {
        console.error('Callback processing error:', error);
        setError(error.message || 'Failed to process authorization');
      } finally {
        setIsProcessing(false);
      }
    };

    handleCallback();
  }, [searchParams, navigate, toast]);

  return (
    <div className="min-h-screen bg-primary-blue flex items-center justify-center px-4 sm:px-6 lg:px-8 py-8">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center mb-6">
            <img 
              src="/lovable-uploads/76da95f6-805f-4f3e-91e8-f4ddc51657ad.png" 
              alt="Growth Accelerator Logo" 
              className="h-12 w-12 sm:h-16 sm:w-16 object-contain"
            />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Workable Integration</h1>
        </div>

        <Card className="bg-slate-800 border-slate-600">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl sm:text-2xl font-bold text-center text-white">
              {isProcessing ? 'Processing...' : success ? 'Success!' : 'Error'}
            </CardTitle>
            <CardDescription className="text-center text-slate-300">
              {isProcessing ? 'Connecting your Workable account' : 
               success ? 'Your account has been linked' : 
               'Something went wrong'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isProcessing && (
              <div className="flex items-center justify-center space-x-2 py-4">
                <Loader2 className="w-6 h-6 animate-spin text-secondary-pink" />
                <span className="text-slate-300">Linking your Workable account...</span>
              </div>
            )}

            {success && (
              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  <CheckCircle className="w-12 h-12 text-green-400" />
                </div>
                <p className="text-slate-300">
                  Your Workable account has been successfully connected. 
                  You can now create an account with your Workable email.
                </p>
                <p className="text-sm text-slate-400">
                  Redirecting to sign up page...
                </p>
              </div>
            )}

            {error && (
              <>
                <Alert className="bg-red-900/20 border-red-500 text-red-400">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
                <div className="text-center">
                  <Button
                    onClick={() => navigate('/auth')}
                    className="bg-gradient-to-r from-secondary-pink to-primary-blue hover:from-secondary-pink/80 hover:to-primary-blue/80"
                  >
                    Back to Login
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default WorkableCallback;