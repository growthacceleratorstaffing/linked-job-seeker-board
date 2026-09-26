import { Navigate } from 'react-router-dom';
import { Clock3, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';

const AccessPending = () => {
  const { user, signOut } = useAuth();
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <main className="flex min-h-screen items-center justify-center bg-primary-blue p-6">
      <Card className="w-full max-w-lg border-primary-foreground/20 bg-primary-blue text-primary-foreground">
        <CardHeader className="text-center">
          <Clock3 className="mx-auto h-10 w-10 text-secondary-pink" />
          <CardTitle className="text-2xl">Access pending</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5 text-center">
          <p className="text-primary-foreground/75">
            Your account is active, but it has not been assigned staff or onboarding access yet.
          </p>
          <Button variant="outline" onClick={signOut} className="border-secondary-pink text-secondary-pink">
            <LogOut className="mr-2 h-4 w-4" /> Sign out
          </Button>
        </CardContent>
      </Card>
    </main>
  );
};

export default AccessPending;