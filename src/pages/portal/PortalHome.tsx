import { Link } from 'react-router-dom';
import { FileSignature, Clock } from 'lucide-react';
import PortalLayout from '@/components/PortalLayout';
import { useEmployee } from '@/hooks/useEmployee';

const PortalHome = () => {
  const { employee } = useEmployee();
  const tiles = [
    { to: '/portal/onboarding', title: 'Onboarding', text: employee?.contract_signed_at ? 'Your contract is signed — view it any time.' : 'Read and sign your employment contract.', icon: FileSignature },
    { to: '/portal/backoffice', title: 'Backoffice', text: 'Register your worked hours per day and week.', icon: Clock },
  ];
  return (
    <PortalLayout>
      <div className="py-10 text-center">
        <h1 className="text-4xl font-bold">Welcome to the backoffice{employee ? `, ${employee.full_name.split(' ')[0]}` : ''}!</h1>
        <p className="text-white/70 mt-3">Everything for your assignment with Growth Accelerator in one place.</p>
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        {tiles.map(({ to, title, text, icon: Icon }) => (
          <Link key={to} to={to} className="group rounded-2xl border border-white/20 bg-white/5 p-8 hover:border-secondary-pink hover:bg-white/10 transition">
            <Icon className="h-10 w-10 text-secondary-pink mb-4" />
            <h2 className="text-2xl font-semibold">{title}</h2>
            <p className="text-white/70 mt-2">{text}</p>
          </Link>
        ))}
      </div>
    </PortalLayout>
  );
};

export default PortalHome;
