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
  User,
  Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useWorkablePermissions } from '@/hooks/useWorkablePermissions';
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
  const { permissions, role } = useWorkablePermissions();
  const [userProfile, setUserProfile] = useState<{ email: string; role: string } | null>(null);

  useEffect(() => {
    const fetchUserProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserProfile({
          email: user.email || '',
          role: role || 'user'
        });
      }
    };

    fetchUserProfile();
  }, [role]);

  const navigationItems = [
    { path: '/', label: 'Home', icon: Home },
    { path: '/dashboard', label: 'Dashboard', icon: BarChart3 },
  ];

  const vacancyItems = [
    { path: '/post-jobs', label: 'Vacancies', icon: Briefcase, permission: 'jobs' },
    { path: '/jobs', label: 'Job Posting', icon: FileText, permission: 'jobs' },
  ];

  const staffingItems = [
    { path: '/candidates', label: 'Candidates', icon: Users, permission: 'candidates' },
    { path: '/matching', label: 'Matching', icon: ArrowRightLeft, permission: 'reviewer' },
    { path: '/onboarding', label: 'Preboarding', icon: CheckSquare, permission: 'simple' },
  ];

  const crmItems = [
    { path: '/integrations', label: 'Integrations', icon: Settings },
    { path: '/linkedin', label: 'LinkedIn', icon: ({ className }: { className?: string }) => (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
      </svg>
    ) },
    { path: '/data', label: 'Data', icon: Users },
  ];

  const contractingItems = [
    { path: 'https://mijn.cootje.com/recruiter/kandidaten/b50e2506-9644-40be-8e87-08b2046ca3ee?view=Vacatures&tab=Koppelen', label: 'Onboarding', icon: FileText, external: true, permission: 'simple' },
    { path: 'https://mijn.cootje.com/urenregistraties', label: 'Backoffice', icon: FileText, external: true, permission: 'admin' },
  ];

  // Filter navigation items based on permissions - show all sections if permissions loading fails
  const filteredVacancyItems = vacancyItems.filter(item => 
    !item.permission || permissions[item.permission as keyof typeof permissions] || Object.keys(permissions).length === 0
  );
  const filteredStaffingItems = staffingItems.filter(item => 
    !item.permission || permissions[item.permission as keyof typeof permissions] || Object.keys(permissions).length === 0
  );
  const filteredCrmItems = crmItems;
  const filteredContractingItems = contractingItems.filter(item => 
    !item.permission || permissions[item.permission as keyof typeof permissions] || Object.keys(permissions).length === 0
  );

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

        {/* Jobs Section - Only show if user has job permissions */}
        {filteredVacancyItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-secondary-pink text-sm font-bold uppercase tracking-wider">
              JOBS
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {filteredVacancyItems.map((item) => (
                  <NavItem key={item.path} {...item} />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Staffing Section - Only show if user has staffing permissions */}
        {filteredStaffingItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-secondary-pink text-sm font-bold uppercase tracking-wider">
              STAFFING
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {filteredStaffingItems.map((item) => (
                  <NavItem key={item.path} {...item} />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* CRM Section */}
        {filteredCrmItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-secondary-pink text-sm font-bold uppercase tracking-wider">
              CRM/ATS
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {filteredCrmItems.map((item) => (
                  <NavItem key={item.path} {...item} />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Contracting Section - Only show if user has contracting permissions */}
        {filteredContractingItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-secondary-pink text-sm font-bold uppercase tracking-wider">
              CONTRACTING
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {filteredContractingItems.map((item) => (
                  <NavItem key={item.path} {...item} />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-white/10 bg-primary-blue">
        {/* User Profile Section */}
        {userProfile && state === "expanded" && (
          <div className="mb-4 p-3 rounded-lg bg-white/5">
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-white" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">{userProfile.email}</p>
                <p className="text-xs text-slate-400">{userProfile.role === 'simple' ? 'member' : userProfile.role}</p>
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