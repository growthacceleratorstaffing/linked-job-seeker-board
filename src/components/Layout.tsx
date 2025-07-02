import React from 'react';
import AppSidebar from './AppSidebar';
import WorkflowHeader from './WorkflowHeader';

interface LayoutProps {
  children: React.ReactNode;
  showWorkflow?: boolean;
}

const Layout: React.FC<LayoutProps> = ({ children, showWorkflow = true }) => {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <AppSidebar />
      <div className="flex-1 flex flex-col">
        {showWorkflow && <WorkflowHeader />}
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;