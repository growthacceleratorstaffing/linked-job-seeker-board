import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log(`🔄 Auth state change: ${event}`, session?.user?.email || 'No user');
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);
        
        // Simple success logging - no complex Workable sync for now
        if (event === 'SIGNED_IN' && session?.user?.email) {
          console.log(`✅ User signed in successfully: ${session.user.email}`);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('🔍 Checking existing session...', session?.user?.email || 'No session');
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
      
      // Just log existing session - no complex sync
      if (session?.user?.email) {
        console.log(`✅ Existing session found: ${session.user.email}`);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    console.log('🚪 Signing out...');
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('❌ Error signing out:', error);
    } else {
      console.log('✅ Signed out successfully');
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, isLoading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};