import React from 'react';
import Layout from "@/components/Layout";
import { VacancyGenerator } from "@/components/VacancyGenerator";

const Jobs = () => {
  return (
    <Layout>
      <div className="min-h-screen bg-primary-blue text-white">
        <div className="container mx-auto px-6 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Job Posting Generator</h1>
            <p className="text-slate-300">Create compelling job descriptions with AI</p>
          </div>

          <VacancyGenerator />
        </div>
      </div>
    </Layout>
  );
};

export default Jobs;