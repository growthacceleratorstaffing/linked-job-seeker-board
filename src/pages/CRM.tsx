
import { CandidatesList } from "@/components/crm/CandidatesList";

const CRM = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            CRM Dashboard
          </h1>
          <p className="text-gray-600">
            Manage your candidates and track their responses
          </p>
        </header>
        
        <CandidatesList />
      </div>
    </div>
  );
};

export default CRM;
