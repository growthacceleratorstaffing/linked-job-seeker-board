import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import PortalLayout from '@/components/PortalLayout';
import HoursRegistration from '@/components/HoursRegistration';
import TimesheetRequests from '@/components/TimesheetRequests';

const PortalHours = () => (
  <PortalLayout>
    <Link to="/portal" className="inline-flex items-center text-primary-foreground/70 hover:text-primary-foreground mb-4"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Link>
    <h1 className="text-3xl font-bold mb-6">Hourly registration</h1>
    <HoursRegistration />
    <TimesheetRequests />
  </PortalLayout>
);

export default PortalHours;
