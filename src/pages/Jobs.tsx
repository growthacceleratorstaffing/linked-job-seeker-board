import Layout from "@/components/Layout";
import { useNavigate } from "react-router-dom";
import { VacancyGenerator } from "@/components/VacancyGenerator";

const Jobs = () => {
  const navigate = useNavigate();
  return (
    <Layout>
      <div className="min-h-screen bg-primary-blue text-white">
        <div className="container mx-auto px-6 py-8 space-y-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Create Vacancies</h1>
            <p className="text-slate-300">Generate compelling job descriptions with AI. New postings appear under Vacancies.</p>
          </div>
          <VacancyGenerator onJobPublished={() => navigate('/post-jobs')} />
        </div>
      </div>
    </Layout>
  );
};

export default Jobs;
