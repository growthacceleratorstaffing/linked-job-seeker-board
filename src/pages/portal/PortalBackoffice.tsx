import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import PortalLayout from '@/components/PortalLayout';
import HoursRegistration from '@/components/HoursRegistration';

const PortalBackoffice = () => (
  <PortalLayout>
    <Link to="/portal" className="inline-flex items-center text-white/70 hover:text-white mb-4"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Link>
    <h1 className="text-3xl font-bold mb-6">Backoffice — hour registration</h1>
    <HoursRegistration />
  </PortalLayout>
);

export default PortalBackoffice;
