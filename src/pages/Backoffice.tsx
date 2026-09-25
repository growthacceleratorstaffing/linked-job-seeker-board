import Layout from '@/components/Layout';
import HoursRegistration from '@/components/HoursRegistration';

const Backoffice = () => (
  <Layout>
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold text-white">Backoffice — hour registration</h1>
      <p className="text-white/70 mt-2 mb-6">Hours registered by everyone who has been onboarded. Approve or remove entries.</p>
      <HoursRegistration allEmployees />
    </div>
  </Layout>
);

export default Backoffice;
