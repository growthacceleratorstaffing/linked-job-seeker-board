import React, { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { 
  Home, 
  BarChart3, 
  Briefcase, 
  Users, 
  ArrowRightLeft, 
  CheckSquare, 
  FileText, 
  LogOut,
  User
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';

const AppSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { state } = useSidebar();
  const [userProfile, setUserProfile] = useState<{ email: string; role: string } | null>(null);

  useEffect(() => {
    const fetchUserProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // For now, set role as admin - this would typically come from a profiles table
        setUserProfile({
          email: user.email || '',
          role: 'admin'
        });
      }
    };

    fetchUserProfile();
  }, []);

  const navigationItems = [
    { path: '/', label: 'Home', icon: Home },
    { path: '/dashboard', label: 'Dashboard', icon: BarChart3 },
  ];

  const vacancyItems = [
    { path: '/jobs', label: 'Job Posting', icon: FileText },
    { path: '/post-jobs', label: 'Vacancies', icon: Briefcase },
  ];

  const staffingItems = [
    { path: '/candidates', label: 'Candidates', icon: Users },
    { path: '/matching', label: 'Matching', icon: ArrowRightLeft },
    { path: '/onboarding', label: 'Preboarding', icon: CheckSquare },
  ];

  const contractingItems = [
    { path: 'https://mijn.cootje.com/personen/aanmaken', label: 'Backoffice', icon: FileText, external: true },
    { path: 'https://mijn.cootje.com/recruiter/kandidaten/b50e2506-9644-40be-8e87-08b2046ca3ee?view=Vacatures&tab=Koppelen', label: 'Onboarding', icon: FileText, external: true },
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
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={!external && isActivePath(path)}>
        {external ? (
          <a href={path} target="_blank" rel="noopener noreferrer">
            <Icon />
            <span>{label}</span>
          </a>
        ) : (
          <NavLink to={path}>
            <Icon />
            <span>{label}</span>
          </NavLink>
        )}
      </SidebarMenuButton>
    </SidebarMenuItem>
  );

  return (
    <Sidebar className="bg-primary-blue border-r border-white/20" style={{ backgroundColor: 'hsl(var(--primary-blue))' }}>
      <SidebarHeader className="p-6 border-b border-white/10 bg-primary-blue">
        <div className="flex items-center gap-3">
          <img 
            src="/lovable-uploads/76da95f6-805f-4f3e-91e8-f4ddc51657ad.png" 
            alt="Growth Accelerator Logo" 
            className="h-8 w-8 sm:h-10 sm:w-10 object-contain"
          />
          {state === "expanded" && (
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-white">Growth</h1>
              <h2 className="text-lg sm:text-xl font-bold text-white">Accelerator</h2>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="text-white bg-primary-blue">
        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <NavItem key={item.path} {...item} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Jobs Section */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-secondary-pink text-sm font-bold uppercase tracking-wider">
            JOBS
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {vacancyItems.map((item) => (
                <NavItem key={item.path} {...item} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Staffing Section */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-secondary-pink text-sm font-bold uppercase tracking-wider">
            STAFFING
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {staffingItems.map((item) => (
                <NavItem key={item.path} {...item} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Contracting Section */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-secondary-pink text-sm font-bold uppercase tracking-wider">
            CONTRACTING
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {contractingItems.map((item) => (
                <NavItem key={item.path} {...item} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-white/10 bg-primary-blue">
        {/* User Profile Section */}
        {userProfile && state === "expanded" && (
          <div className="mb-4 p-3 rounded-lg bg-white/5">
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-white" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">{userProfile.email}</p>
                <p className="text-xs text-slate-400">{userProfile.role}</p>
              </div>
            </div>
          </div>
        )}
        
        <Button 
          variant="ghost" 
          className="w-full justify-start text-white hover:bg-white/10"
          onClick={handleLogout}
        >
          <LogOut className="mr-3" />
          {state === "expanded" && <span>Sign Out</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
};

export default AppSidebar;
