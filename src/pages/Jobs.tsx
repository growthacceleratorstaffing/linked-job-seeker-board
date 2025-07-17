import React, { useState, useEffect } from 'react';
import Layout from "@/components/Layout";
import { VacancyGenerator } from "@/components/VacancyGenerator";
import { JobsOverview } from "@/components/JobsOverview";

const Jobs = () => {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleJobPublished = () => {
    // Trigger refresh of jobs list
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <Layout>
      <div className="min-h-screen bg-primary-blue text-white">
        <div className="container mx-auto px-6 py-8 space-y-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Vacancies</h1>
            <p className="text-slate-300">Create compelling job descriptions with AI and manage your job postings</p>
          </div>

          <VacancyGenerator onJobPublished={handleJobPublished} />
          
          <JobsOverview refreshTrigger={refreshTrigger} />
        </div>
      </div>
    </Layout>
  );
};

export default Jobs;