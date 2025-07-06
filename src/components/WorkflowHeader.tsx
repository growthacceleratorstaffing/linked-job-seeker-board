import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  BarChart3, 
  Briefcase, 
  Users, 
  ArrowRightLeft, 
  CheckSquare, 
  FileText 
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const WorkflowHeader = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const workflowSteps = [
    { path: '/dashboard', label: 'Dashboard', icon: BarChart3 },
    { path: '/post-jobs', label: 'Jobs', icon: Briefcase },
    { path: '/candidates', label: 'Candidates', icon: Users },
    { path: '/matching', label: 'Match', icon: ArrowRightLeft },
    { path: 'https://mijn.cootje.com', label: 'Hire', icon: FileText, external: true },
    { path: '/onboarding', label: 'Onboard', icon: CheckSquare },
  ];

  const getCurrentStepIndex = () => {
    return workflowSteps.findIndex(step => step.path === location.pathname);
  };

  const getNextStep = () => {
    const currentIndex = getCurrentStepIndex();
    if (currentIndex >= 0 && currentIndex < workflowSteps.length - 1) {
      return workflowSteps[currentIndex + 1];
    }
    return null;
  };

  const handleStepClick = (path: string, external?: boolean) => {
    if (external) {
      window.open(path, '_blank');
    } else {
      navigate(path);
    }
  };

  const WorkflowStep = ({ step, index, isActive }: { 
    step: any; 
    index: number; 
    isActive: boolean;
  }) => {
    const Icon = step.icon;
    
    return (
      <div className="flex flex-col items-center">
        <Button
          onClick={() => handleStepClick(step.path, step.external)}
          variant="ghost"
          className={`rounded-full w-12 h-12 sm:w-16 sm:h-16 p-0 border-2 transition-all ${
            isActive 
              ? 'border-secondary-pink bg-secondary-pink/10 text-secondary-pink' 
              : 'border-white/30 text-white hover:border-white/50 hover:bg-white/10'
          }`}
        >
          <Icon size={20} className="sm:w-6 sm:h-6" />
        </Button>
        
        <div className="mt-2 sm:mt-3 text-center">
          <h3 className="text-white font-medium text-xs sm:text-sm">{step.label}</h3>
          <Button
            onClick={() => handleStepClick(step.path, step.external)}
            variant="ghost"
            size="sm"
            className={`mt-1 text-xs h-5 sm:h-6 px-2 sm:px-3 ${
              isActive 
                ? 'bg-secondary-pink text-white' 
                : 'text-white/70 hover:text-white hover:bg-white/10'
            }`}
          >
            {isActive ? 'Current' : 'Go to'}
          </Button>
        </div>
        
        {/* Connection line - hidden on mobile */}
        {index < workflowSteps.length - 1 && (
          <div className="hidden lg:block absolute top-6 sm:top-8 left-full w-16 sm:w-24 h-0.5 bg-white/20 transform -translate-y-1/2" />
        )}
      </div>
    );
  };

  return (
    <div className="bg-primary-blue border-b border-white/10">
      <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-8">
        <div className="text-center mb-4 sm:mb-8">
          <h1 className="text-xl sm:text-3xl font-bold text-white mb-1 sm:mb-2">
            Growth Accelerator Staffing Platform
          </h1>
          <p className="text-secondary-pink text-sm sm:text-lg font-medium">
            Attract. Match. Hire. Onboard.
          </p>
        </div>
        
        {/* Desktop View */}
        <div className="hidden lg:flex justify-center items-center space-x-16 xl:space-x-24 relative">
          {workflowSteps.map((step, index) => (
            <div key={step.path} className="relative">
              <WorkflowStep 
                step={step} 
                index={index}
                isActive={location.pathname === step.path}
              />
            </div>
          ))}
        </div>

        {/* Mobile/Tablet View - Horizontal Scroll */}
        <div className="lg:hidden overflow-x-auto pb-4">
          <div className="flex space-x-8 min-w-max px-4">
            {workflowSteps.map((step, index) => (
              <div key={step.path} className="flex-shrink-0">
                <WorkflowStep 
                  step={step} 
                  index={index}
                  isActive={location.pathname === step.path}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkflowHeader;
