import React from 'react';
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";

const Index = () => {
  const navigate = useNavigate();

  return (
    <Layout>
      <div className="flex-1 flex items-center justify-center text-white pt-24">
        <div className="text-center">
          <div className="mb-8">
            <img 
              src="/lovable-uploads/76da95f6-805f-4f3e-91e8-f4ddc51657ad.png" 
              alt="Growth Accelerator Logo" 
              className="mx-auto h-24 w-24 object-contain mb-8"
            />
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold mb-6 text-white">
            Growth Accelerator Staffing Platform
          </h1>
          
          <p className="text-xl text-slate-300 mb-12">
            Attract. Match. Hire. Onboard.
          </p>
          
          <Button 
            onClick={() => navigate("/dashboard")}
            size="lg"
            className="bg-secondary-pink hover:bg-secondary-pink/80 text-white px-8 py-4 text-lg"
          >
            Enter Workspace
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </div>
    </Layout>
  );
};

export default Index;