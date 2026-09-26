import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const PortalAuth = () => {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [error, setError] = useState(""); const [loading, setLoading] = useState(false);
  useEffect(() => { if (user) navigate("/portal", { replace: true }); }, [user, navigate]);
  if (!authLoading && user) return <Navigate to="/portal" replace />;
  const signIn = async (event: React.FormEvent) => { event.preventDefault(); setLoading(true); setError(""); const { error: signInError } = await supabase.auth.signInWithPassword({ email, password }); if (signInError) setError("The email or password is incorrect."); else navigate("/portal", { replace: true }); setLoading(false); };
  return <div className="flex min-h-screen items-center justify-center bg-primary-blue p-4 text-primary-foreground"><Card className="w-full max-w-md border-primary-foreground/20 bg-primary-blue text-primary-foreground"><CardHeader className="text-center"><img src="/lovable-uploads/76da95f6-805f-4f3e-91e8-f4ddc51657ad.png" alt="Growth Accelerator" className="mx-auto mb-4 h-14 w-14 object-contain" /><CardTitle className="text-2xl">Backoffice login</CardTitle><CardDescription className="text-primary-foreground/65">Sign in with the account details you received by email.</CardDescription></CardHeader><CardContent><form className="space-y-4" onSubmit={signIn}><div className="space-y-2"><Label htmlFor="portal-email">Email</Label><Input id="portal-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></div><div className="space-y-2"><Label htmlFor="portal-password">Password</Label><Input id="portal-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required /></div>{error && <p className="text-sm text-destructive">{error}</p>}<Button type="submit" disabled={loading || authLoading} className="w-full bg-secondary-pink text-primary-foreground hover:bg-secondary-pink/90">{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Sign in</Button></form></CardContent></Card></div>;
};

export default PortalAuth;