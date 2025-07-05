import React from 'react';
import AppSidebar from './AppSidebar';
import WorkflowHeader from './WorkflowHeader';
import { CopilotTrigger } from './CopilotTrigger';
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from '@/components/ui/sidebar';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-primary-blue">
        <AppSidebar />
        <SidebarInset className="flex-1 flex flex-col bg-primary-blue text-white min-w-0">
          <header className="flex h-16 shrink-0 items-center gap-2 border-b border-white/10 px-4">
            <SidebarTrigger className="text-white hover:bg-white/10" />
            <div className="flex-1">
              <WorkflowHeader />
            </div>
          </header>
          <main className="flex-1 bg-primary-blue relative p-4 md:p-6 lg:p-8">
            {children}
          </main>
        </SidebarInset>
        
        {/* Global AI Copilot - positioned responsively */}
        <CopilotTrigger />
      </div>
    </SidebarProvider>
  );
};

export default Layout;