import { useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowRightLeft,
  BarChart3,
  Briefcase,
  CheckSquare,
  FileText,
  Home,
  Settings,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWorkablePermissions } from '@/hooks/useWorkablePermissions';

const groups = [
  {
    label: 'MAIN',
    items: [
      { path: '/', label: 'Home', icon: Home },
      { path: '/dashboard', label: 'Dashboard', icon: BarChart3 },
    ],
  },
  {
    label: 'JOBS',
    items: [
      { path: '/jobs', label: 'Job Posting', icon: FileText, permission: 'jobs' },
      { path: '/post-jobs', label: 'Vacancies', icon: Briefcase, permission: 'jobs' },
      { path: '/advertising', label: 'Advertising', icon: BarChart3, permission: 'jobs' },
    ],
  },
  {
    label: 'STAFFING',
    items: [
      { path: '/candidates', label: 'Candidates', icon: Users, permission: 'candidates' },
      { path: '/matching', label: 'Matching', icon: ArrowRightLeft, permission: 'reviewer' },
      { path: '/onboarding', label: 'Onboarding', icon: CheckSquare, permission: 'simple' },
    ],
  },
  {
    label: 'CRM/ATS',
    items: [
      { path: '/integrations', label: 'Integrations', icon: Settings },
      { path: '/data', label: 'Data', icon: Users },
    ],
  },
  {
    label: 'CONTRACTING',
    items: [{ path: '/backoffice', label: 'Backoffice', icon: FileText }],
  },
];

const WorkflowHeader = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { permissions } = useWorkablePermissions();
  const hasLoadedPermissions = Object.keys(permissions).length > 0;

  const visibleGroups = groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) =>
        !item.permission || !hasLoadedPermissions || permissions[item.permission as keyof typeof permissions]
      ),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <div className="border-b border-border bg-primary-blue">
      <div className="mx-auto max-w-[1500px] px-4 py-5 sm:px-6">
        <div className="mb-5 text-center">
          <h1 className="text-2xl font-bold text-primary-foreground sm:text-3xl">Growth Accelerator Staffing</h1>
          <p className="mt-1 font-medium text-secondary-pink">Attract. Match. Onboard. Hire.</p>
        </div>

        <div className="overflow-x-auto pb-2">
          <div className="flex min-w-max items-stretch justify-center">
            {visibleGroups.map((group, groupIndex) => (
              <div key={group.label} className="flex items-stretch">
                {groupIndex > 0 && <div className="mx-5 w-px self-stretch bg-secondary-pink" />}
                <section aria-label={group.label}>
                  <p className="mb-2 text-center text-xs font-bold uppercase text-secondary-pink">{group.label}</p>
                  <div className="flex gap-2">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const active = location.pathname === item.path;
                      return (
                        <Button
                          key={item.path}
                          variant="ghost"
                          onClick={() => navigate(item.path)}
                          className={`h-auto min-w-20 flex-col gap-1 px-3 py-2 text-xs ${
                            active
                              ? 'bg-secondary-pink text-primary-foreground hover:bg-secondary-pink/90'
                              : 'text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground'
                          }`}
                        >
                          <Icon className="h-5 w-5" />
                          <span>{item.label}</span>
                        </Button>
                      );
                    })}
                  </div>
                </section>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkflowHeader;