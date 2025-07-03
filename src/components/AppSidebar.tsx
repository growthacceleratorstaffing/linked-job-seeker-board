import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { 
  Home, 
  BarChart3, 
  Briefcase, 
  Users, 
  ArrowRightLeft, 
  CheckSquare, 
  FileText, 
  LogOut 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const AppSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

  const navigationItems = [
    { path: '/', label: 'Home', icon: Home },
  ];

  const staffingItems = [
    { path: '/dashboard', label: 'Dashboard', icon: BarChart3 },
    { path: '/jobs', label: 'Jobs', icon: Briefcase },
    { path: '/candidates', label: 'Candidates', icon: Users },
    { path: '/matching', label: 'Matching', icon: ArrowRightLeft },
    { path: '/onboarding', label: 'Onboarding', icon: CheckSquare },
  ];

  const contractingItems = [
    { path: 'https://mijn.cootje.com', label: 'Backoffice', icon: FileText, external: true },
  ];

  const isActivePath = (path: string) => {
    return location.pathname === path;
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      toast({
        title: "Logged out successfully",
        description: "You have been signed out of your account.",
      });
      
      navigate('/auth');
    } catch (error) {
      console.error('Error logging out:', error);
      toast({
        title: "Error",
        description: "Failed to log out. Please try again.",
        variant: "destructive",
      });
    }
  };

  const NavItem = ({ path, label, icon: Icon, external }: { path: string; label: string; icon: React.ElementType; external?: boolean }) => (
    external ? (
      <a href={path} target="_blank" rel="noopener noreferrer" className="block">
        <div className="flex items-center gap-3 px-4 py-3 text-white hover:bg-white/10 transition-colors">
          <Icon size={20} />
          <span className="font-medium">{label}</span>
        </div>
      </a>
    ) : (
      <NavLink to={path} className="block">
        <div className={`flex items-center gap-3 px-4 py-3 text-white hover:bg-white/10 transition-colors ${
          isActivePath(path) ? 'bg-white/20 border-r-2 border-secondary-pink' : ''
        }`}>
          <Icon size={20} />
          <span className="font-medium">{label}</span>
        </div>
      </NavLink>
    )
  );

  return (
    <div className="w-64 h-screen bg-primary-blue text-white flex flex-col">
      {/* Logo Section */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <img 
            src="/lovable-uploads/76da95f6-805f-4f3e-91e8-f4ddc51657ad.png" 
            alt="Growth Accelerator Logo" 
            className="h-10 w-10 object-contain"
          />
          <div>
            <h1 className="text-xl font-bold text-white">Growth</h1>
            <h2 className="text-xl font-bold text-white">Accelerator</h2>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 py-4">
        {/* Main Navigation */}
        <div className="mb-6">
          {navigationItems.map((item) => (
            <NavItem key={item.path} {...item} />
          ))}
        </div>

        {/* Staffing Section */}
        <div className="mb-6">
          <div className="px-4 py-2">
            <h3 className="text-secondary-pink text-sm font-bold uppercase tracking-wider">STAFFING</h3>
          </div>
          {staffingItems.map((item) => (
            <NavItem key={item.path} {...item} />
          ))}
        </div>

        {/* Contracting Section */}
        <div className="mb-6">
          <div className="px-4 py-2">
            <h3 className="text-secondary-pink text-sm font-bold uppercase tracking-wider">CONTRACTING</h3>
          </div>
          {contractingItems.map((item) => (
            <NavItem key={item.path} {...item} />
          ))}
        </div>

        {/* Logout Button */}
        <div className="px-4">
          <Button 
            variant="ghost" 
            className="w-full justify-start text-white hover:bg-white/10"
            onClick={handleLogout}
          >
            <LogOut size={20} className="mr-3" />
            Logout
          </Button>
        </div>
      </div>

      {/* Empty bottom section with just the horizontal line */}
      <div className="border-t border-white/10 p-4">
      </div>
    </div>
  );
};

export default AppSidebar;