import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  RefreshCw, 
  ExternalLink, 
  CheckCircle, 
  XCircle, 
  Settings,
  User,
  AlertTriangle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

// Types and Interfaces
interface LinkedInProfile {
  id: string;
  firstName: string;
  lastName: string;
  profilePicture?: string;
}

interface LinkedInToken {
  id: string;
  access_token: string;
  refresh_token?: string;
  token_expires_at?: string;
  scope?: string;
  created_at: string;
  updated_at: string;
}

interface ConnectionStatus {
  connected: boolean;
  profile?: LinkedInProfile;
  token?: LinkedInToken;
  error?: string;
  scopes?: string[];
}

interface CredentialsStatus {
  clientId: boolean;
  clientSecret: boolean;
  accessToken: boolean;
}

// Main LinkedIn Integration Component
const LinkedInIntegration: React.FC = () => {
  const { toast } = useToast();
  
  // State management
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({ connected: false });
  const [credentialsStatus, setCredentialsStatus] = useState<CredentialsStatus>({
    clientId: false,
    clientSecret: false,
    accessToken: false
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isTesting, setIsTesting] = useState(false);
  
  // Initialize data on component mount
  useEffect(() => {
    console.log('LinkedIn component mounted, checking status...');
    checkConnectionStatus();
    checkCredentialsStatus();
  }, []);

  // Connection and authentication functions
  const checkConnectionStatus = async () => {
    console.log('Starting connection status check...');
    setIsLoading(true);
    try {
      // Check if user has LinkedIn tokens
      console.log('Checking for LinkedIn tokens...');
      const { data: tokenData, error: tokenError } = await supabase
        .from('linkedin_user_tokens')
        .select('*')
        .maybeSingle();

      console.log('Token query result:', { tokenData, tokenError });

      if (tokenError && tokenError.code !== 'PGRST116') {
        throw tokenError;
      }

      if (tokenData) {
        // Test connection with the token
        const { data: testData, error: testError } = await supabase.functions.invoke('linkedin-integration', {
          body: { action: 'testConnection' }
        });

        if (testError) {
          throw testError;
        }

        if (testData?.connected) {
          // Get profile information
          const { data: profileData, error: profileError } = await supabase.functions.invoke('linkedin-integration', {
            body: { action: 'getProfile' }
          });

          setConnectionStatus({
            connected: true,
            token: tokenData,
            profile: profileData?.profile,
            scopes: tokenData.scope?.split(' ') || []
          });
        } else {
          setConnectionStatus({
            connected: false,
            error: 'LinkedIn connection test failed'
          });
        }
      } else {
        setConnectionStatus({ connected: false });
      }
    } catch (error) {
      console.error('Error checking connection status:', error);
      setConnectionStatus({
        connected: false,
        error: error.message
      });
    } finally {
      setIsLoading(false);
    }
  };

  const checkCredentialsStatus = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('linkedin-integration', {
        body: { action: 'getCredentialsStatus' }
      });

      if (error) throw error;

      setCredentialsStatus(data);
    } catch (error) {
      console.error('Error checking credentials status:', error);
    }
  };

  const connectToLinkedIn = async () => {
    try {
      // Start OAuth flow
      const redirectUrl = `${window.location.origin}/linkedin-callback`;
      
      const { data, error } = await supabase.functions.invoke('linkedin-oauth', {
        body: { 
          action: 'getAuthUrl',
          redirectUrl: redirectUrl,
          scopes: ['openid', 'profile', 'email', 'w_ads_reporting', 'rw_ads']
        }
      });

      if (error) throw error;

      if (data?.authUrl) {
        // Redirect to LinkedIn OAuth
        window.location.href = data.authUrl;
      }
    } catch (error) {
      console.error('Error starting LinkedIn OAuth:', error);
      toast({
        title: "Error",
        description: "Failed to start LinkedIn connection",
        variant: "destructive"
      });
    }
  };

  const testConnection = async () => {
    setIsTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke('linkedin-integration', {
        body: { action: 'testConnection' }
      });

      if (error) throw error;

      if (data?.connected) {
        toast({
          title: "Success",
          description: "LinkedIn connection is working properly",
        });
      } else {
        toast({
          title: "Connection Failed",
          description: "LinkedIn connection test failed",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error testing connection:', error);
      toast({
        title: "Error",
        description: "Failed to test LinkedIn connection",
        variant: "destructive"
      });
    } finally {
      setIsTesting(false);
    }
  };

  const refreshConnection = async () => {
    try {
      setIsLoading(true);

      const { data, error } = await supabase.functions.invoke('linkedin-integration', {
        body: { action: 'refreshToken' }
      });

      if (error) throw error;

      await checkConnectionStatus();

      toast({
        title: "Success",
        description: "LinkedIn connection refreshed successfully"
      });
    } catch (error) {
      console.error('Error refreshing connection:', error);
      toast({
        title: "Error",
        description: "Failed to refresh LinkedIn connection",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Utility functions
  const getTokenExpiryStatus = () => {
    if (!connectionStatus.token?.token_expires_at) return 'unknown';
    
    const expiryDate = new Date(connectionStatus.token.token_expires_at);
    const now = new Date();
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry < 0) return 'expired';
    if (daysUntilExpiry < 7) return 'warning';
    return 'good';
  };

  // Render loading state
  if (isLoading && !connectionStatus.connected) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading LinkedIn integration...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-blue-800 p-6">
      <div className="container mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="flex items-center gap-3">
            <svg className="h-8 w-8 text-blue-400" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
            </svg>
            <h1 className="text-3xl font-bold text-white">LinkedIn Integration</h1>
            {connectionStatus.connected && (
              <Badge variant="secondary" className="bg-green-500/20 text-green-300 border-green-500/30">
                ✓ Connected
              </Badge>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* API Configuration */}
          <Card className="bg-blue-900/30 border-blue-700/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white">API Configuration</CardTitle>
              <CardDescription className="text-blue-200">
                Your LinkedIn API credentials are securely stored in Supabase secrets
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-blue-800/30 border border-blue-600/30">
                  <div className="flex items-center gap-3">
                    <Settings className="h-5 w-5 text-blue-300" />
                    <span className="text-white font-medium">Client ID</span>
                  </div>
                  <Badge variant={credentialsStatus.clientId ? "default" : "destructive"}>
                    {credentialsStatus.clientId ? "Configured" : "Not Set"}
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-blue-800/30 border border-blue-600/30">
                  <div className="flex items-center gap-3">
                    <Settings className="h-5 w-5 text-blue-300" />
                    <span className="text-white font-medium">Client Secret</span>
                  </div>
                  <Badge variant={credentialsStatus.clientSecret ? "default" : "destructive"}>
                    {credentialsStatus.clientSecret ? "Configured" : "Not Set"}
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-blue-800/30 border border-blue-600/30">
                  <div className="flex items-center gap-3">
                    <Settings className="h-5 w-5 text-blue-300" />
                    <span className="text-white font-medium">Access Token</span>
                  </div>
                  <Badge variant={connectionStatus.connected ? "default" : "destructive"}>
                    {connectionStatus.connected ? "Configured" : "Not Set"}
                  </Badge>
                </div>
              </div>

              <div className="mt-6 p-4 rounded-lg bg-blue-800/20 border border-blue-600/20">
                <p className="text-blue-200 text-sm mb-4">
                  LinkedIn access tokens expire after 60 days. If you experience connection issues, reconnect your account.
                </p>
                <div className="flex gap-3">
                  <Button 
                    onClick={testConnection} 
                    variant="outline" 
                    size="sm"
                    disabled={!connectionStatus.connected || isTesting}
                    className="border-blue-500 text-blue-200 hover:bg-blue-700/50"
                  >
                    {isTesting ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <ExternalLink className="h-4 w-4 mr-2" />
                    )}
                    Test Connection
                  </Button>
                  <Button 
                    onClick={refreshConnection} 
                    variant="outline" 
                    size="sm"
                    className="border-blue-500 text-blue-200 hover:bg-blue-700/50"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Reconnect LinkedIn Account
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Connection Status */}
          <Card className="bg-blue-900/30 border-blue-700/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white">Connection Status</CardTitle>
              <CardDescription className="text-blue-200">
                Your LinkedIn profile information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {connectionStatus.connected ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center">
                      <svg className="h-8 w-8 text-blue-200" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-white">
                        {connectionStatus.profile?.firstName} {connectionStatus.profile?.lastName}
                      </h3>
                      <p className="text-blue-200">
                        LinkedIn ID: {connectionStatus.profile?.id}
                      </p>
                    </div>
                  </div>

                  <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
                    ✓ API Connection Active
                  </Badge>

                  {/* Token Status */}
                  {connectionStatus.token && (
                    <div className="mt-4 p-4 rounded-lg bg-blue-800/20 border border-blue-600/20">
                      <div className="grid grid-cols-1 gap-3 text-sm">
                        <div>
                          <p className="font-medium text-white">Token Status</p>
                          <div className="flex items-center gap-2 mt-1">
                            {getTokenExpiryStatus() === 'good' && <Badge className="bg-green-500/20 text-green-300 border-green-500/30">Valid</Badge>}
                            {getTokenExpiryStatus() === 'warning' && <Badge variant="destructive">Expires Soon</Badge>}
                            {getTokenExpiryStatus() === 'expired' && <Badge variant="destructive">Expired</Badge>}
                          </div>
                        </div>
                        <div>
                          <p className="font-medium text-white">Expires</p>
                          <p className="text-blue-200 mt-1">
                            {connectionStatus.token.token_expires_at 
                              ? new Date(connectionStatus.token.token_expires_at).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })
                              : 'Never'
                            }
                          </p>
                        </div>
                        <div>
                          <p className="font-medium text-white">Scopes</p>
                          <p className="text-blue-200 mt-1">
                            {connectionStatus.scopes?.join(', ') || 'No scopes'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <XCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">Not Connected</h3>
                  <p className="text-blue-200 mb-6">
                    Connect your LinkedIn account to access advertising features
                  </p>
                  <Button 
                    onClick={connectToLinkedIn}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Connect LinkedIn
                  </Button>
                </div>
              )}

              {/* Connection Error */}
              {connectionStatus.error && (
                <Alert className="border-red-500/50 bg-red-500/10">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-red-200">
                    {connectionStatus.error}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default LinkedInIntegration;