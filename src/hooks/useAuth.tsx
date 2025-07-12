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
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);
        
        // Automatically sync roles when user signs in
        if (event === 'SIGNED_IN' && session?.user?.email) {
          setTimeout(() => {
            syncRole(session.user.email);
          }, 0);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
      
      // Also sync for existing sessions on page load
      if (session?.user?.email) {
        setTimeout(() => {
          syncRole(session.user.email);
        }, 1000); // Small delay to ensure user is fully loaded
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const syncRole = async (email: string) => {
    try {
      console.log(`🔄 Auto-syncing role for ${email}...`);
      
      const result = await supabase.functions.invoke('integration', {
        body: { 
          action: 'sync_single_user',
          email: email 
        }
      });

      if (result.error) {
        console.log('⚠️ Sync failed:', result.error);
        return;
      }
      
      const syncData = result.data;
      if (syncData.success) {
        console.log(`✅ Auto-synced ${email}: ${syncData.user?.role} role with ${syncData.user?.assigned_jobs || 0} jobs`);
      }
    } catch (error) {
      console.log('⚠️ Background sync failed:', error);
      // Silent fail - don't disrupt user experience
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, isLoading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};