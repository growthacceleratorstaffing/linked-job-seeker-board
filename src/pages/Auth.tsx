import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Building, Users, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isValidatingEmail, setIsValidatingEmail] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { toast } = useToast();

  // Check if user is already logged in
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate('/');
      }
    };
    checkUser();
  }, [navigate]);

  const validateEmail = async (emailToCheck: string) => {
    if (!emailToCheck) return false;
    
    setIsValidatingEmail(true);
    try {
      const { data, error } = await supabase.functions.invoke('validate-jobadder-email', {
        body: { email: emailToCheck }
      });

      if (error) throw error;
      
      if (!data.isValid) {
        setError(data.message);
        return false;
      }
      
      return true;
    } catch (error: any) {
      setError('Failed to validate email. Please try again.');
      return false;
    } finally {
      setIsValidatingEmail(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // First validate if email is allowed
      const isValidEmail = await validateEmail(email);
      if (!isValidEmail) {
        setIsLoading(false);
        return;
      }

      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName
          }
        }
      });

      if (error) throw error;

      toast({
        title: "Account created successfully! 🎉",
        description: "Please check your email to confirm your account, then you can sign in.",
      });

      // Clear the form
      setEmail('');
      setPassword('');
      setFullName('');
      
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      toast({
        title: "Welcome back! 🎉",
        description: "You have been signed in successfully.",
      });

      navigate('/');
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-primary-blue flex items-center justify-center px-4 sm:px-6 lg:px-8 py-8">
      <div className="w-full max-w-md space-y-6">
        {/* Logo and Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center mb-6">
            <img 
              src="/lovable-uploads/76da95f6-805f-4f3e-91e8-f4ddc51657ad.png" 
              alt="Growth Accelerator Logo" 
              className="h-12 w-12 sm:h-16 sm:w-16 object-contain"
            />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Growth Accelerator</h1>
          <p className="text-sm sm:text-base text-slate-300">Access your staffing platform</p>
        </div>

        <Card className="bg-slate-800 border-slate-600">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl sm:text-2xl font-bold text-center text-white">Welcome</CardTitle>
            <CardDescription className="text-center text-slate-300">
              Sign in to your account or create a new one
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin" className="space-y-4">
              <TabsList className="grid w-full grid-cols-2 bg-slate-700">
                <TabsTrigger value="signin" className="text-slate-300 data-[state=active]:text-white data-[state=active]:bg-slate-600">
                  Sign In
                </TabsTrigger>
                <TabsTrigger value="signup" className="text-slate-300 data-[state=active]:text-white data-[state=active]:bg-slate-600">
                  Sign Up
                </TabsTrigger>
              </TabsList>

              {error && (
                <Alert className="bg-red-900/20 border-red-500 text-red-400">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <TabsContent value="signin" className="space-y-4">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email" className="text-slate-300">Email</Label>
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password" className="text-slate-300">Password</Label>
                    <Input
                      id="signin-password"
                      type="password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-secondary-pink to-primary-blue hover:from-secondary-pink/80 hover:to-primary-blue/80"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <div className="flex items-center space-x-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Signing in...</span>
                      </div>
                    ) : (
                      'Sign In'
                    )}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="space-y-4">
                <div className="bg-gradient-to-r from-secondary-pink/20 to-primary-blue/20 p-4 rounded-lg border border-slate-600">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-gradient-to-r from-secondary-pink to-primary-blue rounded-full flex items-center justify-center">
                        <Users className="w-4 h-4 text-white" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-white font-medium">JobAdder Employee Access</h3>
                      <p className="text-slate-300 text-sm">
                        Only employees registered in JobAdder can create accounts. Your access permissions are based on your JobAdder profile.
                      </p>
                      <div className="flex items-center space-x-2 text-xs text-slate-400">
                        <CheckCircle className="w-3 h-3" />
                        <span>Auto-linked to JobAdder profile</span>
                      </div>
                      <div className="flex items-center space-x-2 text-xs text-slate-400">
                        <CheckCircle className="w-3 h-3" />
                        <span>Assigned job permissions</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* JobAdder OAuth Button */}
                <Button
                  onClick={async () => {
                    try {
                      const { data, error } = await supabase.functions.invoke('jobadder-oauth', {
                        body: { 
                          action: 'get_auth_url',
                          redirectUri: window.location.origin
                        }
                      });

                      if (error) throw error;

                      if (data?.authUrl) {
                        window.location.href = data.authUrl;
                      } else {
                        throw new Error('Failed to get JobAdder authorization URL');
                      }
                    } catch (error: any) {
                      setError(error.message || 'Failed to initiate JobAdder authentication');
                    }
                  }}
                  className="w-full bg-gradient-to-r from-secondary-pink to-primary-blue hover:from-secondary-pink/80 hover:to-primary-blue/80 mb-4"
                >
                  <Building className="mr-2 h-4 w-4" />
                  Connect with JobAdder
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-slate-600" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-slate-800 px-2 text-slate-400">Or create account manually</span>
                  </div>
                </div>

                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name" className="text-slate-300">Full Name</Label>
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="Enter your full name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email" className="text-slate-300">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password" className="text-slate-300">Password</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="Create a password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                    />
                    <p className="text-xs text-slate-400">Must be at least 6 characters</p>
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-secondary-pink to-primary-blue hover:from-secondary-pink/80 hover:to-primary-blue/80"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <div className="flex items-center space-x-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Creating account...</span>
                      </div>
                    ) : (
                      'Create Account'
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <div className="text-center space-y-2">
          <p className="text-xs text-slate-400">
            By signing up, you agree to our terms of service and privacy policy.
          </p>
          <div className="flex flex-col sm:flex-row justify-center space-y-1 sm:space-y-0 sm:space-x-4">
            <button
              onClick={() => navigate('/terms-of-service')}
              className="text-xs text-slate-400 hover:text-white underline"
            >
              Terms of Service
            </button>
            <button
              onClick={() => navigate('/privacy-policy')}
              className="text-xs text-slate-400 hover:text-white underline"
            >
              Privacy Policy
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;