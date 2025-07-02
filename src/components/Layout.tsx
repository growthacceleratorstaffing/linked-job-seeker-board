import React from 'react';
import AppSidebar from './AppSidebar';
import WorkflowHeader from './WorkflowHeader';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="flex min-h-screen bg-primary-blue">
      <AppSidebar />
      <div className="flex-1 flex flex-col bg-primary-blue text-white">
        <WorkflowHeader />
        <main className="flex-1 bg-primary-blue">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;