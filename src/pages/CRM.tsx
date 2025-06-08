
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CandidatesList } from "@/components/crm/CandidatesList";
import { ResponsesList } from "@/components/crm/ResponsesList";
import { CRMStats } from "@/components/crm/CRMStats";

const CRM = () => {
  return (
    <div className="min-h-screen bg-secondary-pink">
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">CRM Dashboard</h1>
            <p className="text-white/80">
              Manage candidates and track their responses to job advertisements
            </p>
          </div>
        </div>

        <CRMStats />

        <Tabs defaultValue="candidates" className="space-y-4">
          <TabsList className="bg-white/10 border-white/20">
            <TabsTrigger value="candidates" className="data-[state=active]:bg-white data-[state=active]:text-secondary-pink">Candidates</TabsTrigger>
            <TabsTrigger value="responses" className="data-[state=active]:bg-white data-[state=active]:text-secondary-pink">Responses</TabsTrigger>
          </TabsList>
          
          <TabsContent value="candidates" className="space-y-4">
            <Card className="bg-white">
              <CardHeader>
                <CardTitle>Candidates</CardTitle>
                <CardDescription>
                  All candidates who have applied or shown interest in job positions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CandidatesList />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="responses" className="space-y-4">
            <Card className="bg-white">
              <CardHeader>
                <CardTitle>Candidate Responses</CardTitle>
                <CardDescription>
                  Track all responses from candidates to job advertisements
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsesList />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default CRM;
