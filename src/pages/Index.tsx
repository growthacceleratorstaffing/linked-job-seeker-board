import React from 'react';
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AppSidebar from "@/components/AppSidebar";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen bg-primary-blue">
      <AppSidebar />
      <div className="flex-1 flex flex-col items-center justify-center text-white">
        <div className="text-center">
          <div className="mb-8">
            <img 
              src="/lovable-uploads/b75d59b1-dda0-4ae9-aa70-24966bdd42d5.png" 
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
    </div>
  );
};

export default Index;