import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useEmployee } from '@/hooks/useEmployee';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** 'staff' = regular app (default), 'employee' = onboarded worker portal */
  audience?: 'staff' | 'employee';
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, audience = 'staff' }) => {
  const { user, isLoading } = useAuth();
  const { employee, loading } = useEmployee();

  if (isLoading || (user && loading)) {
    return (
      <div className="min-h-screen bg-primary-blue flex items-center justify-center">
        <div className="flex items-center space-x-3 text-white">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="text-lg">Loading...</span>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  if (audience === 'staff' && employee) return <Navigate to="/portal" replace />;
  if (audience === 'employee' && !employee) return <Navigate to="/" replace />;

  return <>{children}</>;
};

export default ProtectedRoute;
