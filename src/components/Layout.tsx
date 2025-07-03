import React from 'react';
import AppSidebar from './AppSidebar';
import WorkflowHeader from './WorkflowHeader';
import { CopilotTrigger } from './CopilotTrigger';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="flex min-h-screen bg-primary-blue">
      {/* Sidebar - hidden on mobile, shown on desktop */}
      <div className="hidden lg:block">
        <AppSidebar />
      </div>
      
      <div className="flex-1 flex flex-col bg-primary-blue text-white min-w-0">
        <WorkflowHeader />
        <main className="flex-1 bg-primary-blue relative p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
      
      {/* Global AI Copilot - positioned responsively */}
      <CopilotTrigger />
    </div>
  );
};

export default Layout;