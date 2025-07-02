import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserCheck, Users, Calendar, CheckCircle } from "lucide-react";
import Layout from "@/components/Layout";

const Onboarding = () => {
  return (
    <Layout>
      <div className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Employee Onboarding</h1>
          <p className="text-gray-600">Streamline new employee onboarding workflow</p>
        </div>

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
    </Layout>
  );
};

export default Onboarding;