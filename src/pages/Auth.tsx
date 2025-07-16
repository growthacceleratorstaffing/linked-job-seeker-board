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
  const [resetEmail, setResetEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isValidatingEmail, setIsValidatingEmail] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [error, setError] = useState('');
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const [activeTab, setActiveTab] = useState('signin');
  const navigate = useNavigate();
  const { toast } = useToast();

  // Check if user is already logged in or handle password reset
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate('/');
      }
    };
    checkUser();

    // Listen for auth state changes (including password reset)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsPasswordRecovery(true);
        setActiveTab('reset');
        toast({
          title: "Password reset link verified! 🔐",
          description: "Please enter your new password below.",
        });
      } else if (event === 'SIGNED_IN' && session) {
        navigate('/');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, toast]);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingPassword(true);
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      setIsUpdatingPassword(false);
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      setIsUpdatingPassword(false);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      toast({
        title: "Password updated successfully! 🎉",
        description: "You can now sign in with your new password.",
      });

      // Reset form and state
      setNewPassword('');
      setConfirmPassword('');
      setIsPasswordRecovery(false);
      setActiveTab('signin');
      
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const validateEmail = async (emailToCheck: string) => {
    if (!emailToCheck) return false;
    
    setIsValidatingEmail(true);
    try {
      const { data, error } = await supabase.functions.invoke('validate-workable-email', {
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
      
      const { data, error } = await supabase.auth.signUp({
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

      // Check if user needs email confirmation
      if (data.user && !data.session) {
        toast({
          title: "Please check your email! 📧",
          description: "We sent you a confirmation link. Click it to activate your account, then you can sign in.",
        });
      } else {
        toast({
          title: "Account created successfully! 🎉",
          description: "You can now sign in with your credentials.",
        });
      }

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

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsResettingPassword(true);
    setError('');

    try {
      console.log('🚀 Sending password reset email for:', resetEmail);
      
      // Use Supabase's built-in password reset method directly
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/auth`,
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Password reset email sent! 📧",
        description: "Check your email (including spam folder) for instructions to reset your password.",
      });

      // Clear the form
      setResetEmail('');
      
    } catch (error: any) {
      console.error('❌ Password reset failed:', error);
      const errorMessage = error.message || 'Failed to send password reset email. Please try again.';
      setError(errorMessage);
      toast({
        title: "Error sending reset email",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsResettingPassword(false);
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
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              <TabsList className="grid w-full grid-cols-3 bg-slate-700">
                <TabsTrigger value="signin" className="text-slate-300 data-[state=active]:text-white data-[state=active]:bg-slate-600">
                  Sign In
                </TabsTrigger>
                <TabsTrigger value="signup" className="text-slate-300 data-[state=active]:text-white data-[state=active]:bg-slate-600">
                  Sign Up
                </TabsTrigger>
                <TabsTrigger value="reset" className="text-slate-300 data-[state=active]:text-white data-[state=active]:bg-slate-600">
                  Reset
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

              <TabsContent value="reset" className="space-y-4">
                {!isPasswordRecovery ? (
                  <form onSubmit={handleForgotPassword} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="reset-email" className="text-slate-300">Email Address</Label>
                      <Input
                        id="reset-email"
                        type="email"
                        placeholder="Enter your email address"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        required
                        className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                      />
                      <p className="text-xs text-slate-400">
                        We'll send you a link to reset your password
                      </p>
                    </div>
                    <Button
                      type="submit"
                      className="w-full bg-gradient-to-r from-secondary-pink to-primary-blue hover:from-secondary-pink/80 hover:to-primary-blue/80"
                      disabled={isResettingPassword}
                    >
                      {isResettingPassword ? (
                        <div className="flex items-center space-x-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Sending reset email...</span>
                        </div>
                      ) : (
                        'Send Reset Email'
                      )}
                    </Button>
                  </form>
                ) : (
                  <form onSubmit={handleUpdatePassword} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="new-password" className="text-slate-300">New Password</Label>
                      <Input
                        id="new-password"
                        type="password"
                        placeholder="Enter your new password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        minLength={6}
                        className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirm-password" className="text-slate-300">Confirm New Password</Label>
                      <Input
                        id="confirm-password"
                        type="password"
                        placeholder="Confirm your new password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        minLength={6}
                        className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                      />
                      <p className="text-xs text-slate-400">
                        Password must be at least 6 characters
                      </p>
                    </div>
                    <Button
                      type="submit"
                      className="w-full bg-gradient-to-r from-secondary-pink to-primary-blue hover:from-secondary-pink/80 hover:to-primary-blue/80"
                      disabled={isUpdatingPassword}
                    >
                      {isUpdatingPassword ? (
                        <div className="flex items-center space-x-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Updating password...</span>
                        </div>
                      ) : (
                        'Update Password'
                      )}
                    </Button>
                  </form>
                )}
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