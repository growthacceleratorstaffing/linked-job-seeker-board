import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserCheck, Users, Calendar, CheckCircle } from "lucide-react";

const Onboarding = () => {
  return (
    <div className="min-h-screen bg-primary-blue text-white">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-12">
          <div className="mb-6">
            <img 
              src="/lovable-uploads/b75d59b1-dda0-4ae9-aa70-24966bdd42d5.png" 
              alt="Growth Accelerator Logo" 
              className="mx-auto h-16 w-16 object-contain"
            />
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-4 text-secondary-pink">
            Employee Onboarding
          </h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            Streamline new employee onboarding workflow
          </p>
        </header>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-white">Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">10</div>
              <p className="text-xs text-slate-400">All onboarding</p>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center text-white">
              <Users className="mr-2 h-5 w-5 text-secondary-pink" />
              Onboarding Pipeline
            </CardTitle>
            <CardDescription className="text-slate-400">
              New employee onboarding workflow management
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12 text-slate-400">
              <UserCheck className="mx-auto h-12 w-12 mb-4 text-secondary-pink" />
              <h3 className="text-lg font-semibold mb-2 text-white">No Active Onboarding</h3>
              <p className="mb-4">Start onboarding process for new hires</p>
              <Button className="bg-secondary-pink hover:bg-secondary-pink/80">
                <UserCheck className="mr-2 h-4 w-4" />
                Begin Onboarding
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Onboarding;