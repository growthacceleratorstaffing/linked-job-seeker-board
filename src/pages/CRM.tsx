
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CandidatesList } from "@/components/crm/CandidatesList";
import { ResponsesList } from "@/components/crm/ResponsesList";
import { CRMStats } from "@/components/crm/CRMStats";

const CRM = () => {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">CRM Dashboard</h1>
          <p className="text-muted-foreground">
            Manage candidates and track their responses to job advertisements
          </p>
        </div>
      </div>

      <CRMStats />

      <Tabs defaultValue="candidates" className="space-y-4">
        <TabsList>
          <TabsTrigger value="candidates">Candidates</TabsTrigger>
          <TabsTrigger value="responses">Responses</TabsTrigger>
        </TabsList>
        
        <TabsContent value="candidates" className="space-y-4">
          <Card>
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
          <Card>
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
  );
};

export default CRM;
