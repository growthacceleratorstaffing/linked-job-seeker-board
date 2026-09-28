import { Link } from 'react-router-dom';
import { Clock, Landmark } from 'lucide-react';
import PortalLayout from '@/components/PortalLayout';
import { useEmployee } from '@/hooks/useEmployee';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const PortalHome = () => {
  const { employee } = useEmployee();
  const tiles = [
    { to: '/portal/hours', title: 'Hourly registration', desc: 'Register your hours and request confirmation from your client.', icon: Clock },
    { to: '/portal/backoffice', title: 'Backoffice', desc: 'Open the backoffice connected to your assignment.', icon: Landmark },
  ];
  return (
    <PortalLayout>
      <div className="py-10 text-center">
        <h1 className="text-4xl font-bold">Welcome{employee ? `, ${employee.full_name.split(' ')[0]}` : ''}!</h1>
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        {tiles.map(({ to, title, desc, icon: Icon }) => (
          <Link key={to} to={to}>
            <Card className="h-full border-primary-foreground/20 bg-primary-blue text-primary-foreground transition hover:border-secondary-pink">
              <CardHeader><Icon className="h-8 w-8 text-secondary-pink mb-2" /><CardTitle>{title}</CardTitle><CardDescription className="text-primary-foreground/70">{desc}</CardDescription></CardHeader>
              <CardContent />
            </Card>
          </Link>
        ))}
      </div>
    </PortalLayout>
  );
};

export default PortalHome;
