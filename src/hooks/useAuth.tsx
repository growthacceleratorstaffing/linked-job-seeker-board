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
        
        // Automatically sync Workable roles when user signs in
        // Temporarily disabled to fix app responsiveness
        /*
        if (event === 'SIGNED_IN' && session?.user?.email) {
          setTimeout(() => {
            syncWorkableRole(session.user.email);
          }, 0);
        }
        
        // Also sync on session recovery/refresh
        if (event === 'TOKEN_REFRESHED' && session?.user?.email) {
          setTimeout(() => {
            syncWorkableRole(session.user.email);
          }, 0);
        }
        */
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('🔍 Checking existing session...', session?.user?.email || 'No session');
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
      
      // Also sync for existing sessions on page load
      // Temporarily disabled to fix app responsiveness
      /*
      if (session?.user?.email) {
        setTimeout(() => {
          syncWorkableRole(session.user.email);
        }, 1000); // Small delay to ensure user is fully loaded
      }
      */
    });

    return () => subscription.unsubscribe();
  }, []);

  const syncWorkableRole = async (email: string) => {
    try {
      console.log(`🔄 Auto-syncing Workable role for ${email}...`);
      
      // Use the debug function to get detailed information
      const result = await supabase.functions.invoke('debug-workable-sync', {
        body: { email: email }
      });

      if (result.error) {
        console.log('⚠️ Workable debug sync failed:', result.error);
        return;
      }
      
      const syncData = result.data;
      if (syncData.success) {
        console.log(`✅ DEBUG: Auto-synced ${email}:`);
        console.log(`   Member:`, syncData.debug.member);
        console.log(`   Jobs:`, syncData.debug.jobs);
        console.log(`   Debug Log:`, syncData.debug.debug_log);
      } else {
        console.log('⚠️ Workable debug sync returned no data for:', email);
      }
    } catch (error) {
      console.log('⚠️ Background Workable debug sync failed:', error);
      // Silent fail - don't disrupt user experience
    }
  };

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