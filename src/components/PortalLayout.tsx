import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

const PortalLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-primary-blue text-white">
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <Link to="/portal" className="flex items-center gap-3">
          <img src="/lovable-uploads/76da95f6-805f-4f3e-91e8-f4ddc51657ad.png" alt="Growth Accelerator" className="h-9 w-9 object-contain" />
          <span className="font-bold text-lg">Growth Accelerator Backoffice</span>
        </Link>
        <Button variant="ghost" className="text-white hover:bg-white/10" onClick={async () => { await supabase.auth.signOut(); navigate('/auth'); }}>
          <LogOut className="h-4 w-4 mr-2" /> Sign out
        </Button>
      </header>
      <main className="container mx-auto max-w-5xl p-6">{children}</main>
    </div>
  );
};

export default PortalLayout;
