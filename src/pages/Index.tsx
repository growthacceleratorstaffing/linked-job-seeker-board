
import { useEffect, useState } from "react";
import { VacancyGenerator } from "@/components/VacancyGenerator";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Error signing out",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Signed out successfully",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-secondary-blue text-white flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-secondary-blue text-white">
        <div className="container mx-auto px-4 py-8">
          <header className="text-center mb-12">
            <div className="mb-6">
              <img 
                src="/lovable-uploads/b75d59b1-dda0-4ae9-aa70-24966bdd42d5.png" 
                alt="Growth Accelerator Logo" 
                className="mx-auto h-24 w-24 object-contain"
              />
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-white to-[#EB3D6A] bg-clip-text text-transparent">
              Growth Accelerator Jobs
            </h1>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto mb-8">
              Create compelling job descriptions with the power of AI. Sign in to get started.
            </p>
            <div className="flex gap-4 justify-center">
              <Button 
                onClick={() => window.location.href = '/auth'}
                className="bg-[#EB3D6A] hover:bg-[#EB3D6A]/80 text-white px-8 py-3 text-lg"
              >
                Sign In
              </Button>
              <Button 
                onClick={() => window.location.href = '/auth?mode=signup'}
                variant="outline"
                className="border-[#EB3D6A] text-[#EB3D6A] hover:bg-[#EB3D6A] hover:text-white px-8 py-3 text-lg"
              >
                Sign Up
              </Button>
            </div>
          </header>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary-blue text-white">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-12 relative">
          <div className="absolute top-0 right-0">
            <Button
              onClick={handleSignOut}
              variant="ghost"
              className="text-white hover:bg-white/10"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
          <div className="mb-6">
            <img 
              src="/lovable-uploads/b75d59b1-dda0-4ae9-aa70-24966bdd42d5.png" 
              alt="Growth Accelerator Logo" 
              className="mx-auto h-16 w-16 object-contain"
            />
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-white to-[#EB3D6A] bg-clip-text text-transparent">
            Growth Accelerator Jobs
          </h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            Create compelling job descriptions with the power of AI. Simply enter your requirements and let our generator craft the perfect vacancy text.
          </p>
        </header>
        
        <VacancyGenerator />
      </div>
    </div>
  );
};

export default Index;
