import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Users, Briefcase, Bot, UserCheck, BarChart3, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";

const Index = () => {
  const navigate = useNavigate();

  const workflowSteps = [
    {
      title: "Dashboard",
      description: "Monitor your recruitment metrics and KPIs",
      icon: BarChart3,
      path: "/dashboard",
      color: "bg-blue-500"
    },
    {
      title: "Jobs",
      description: "Manage job postings and requirements",
      icon: Briefcase,
      path: "/jobs",
      color: "bg-green-500"
    },
    {
      title: "Candidates",
      description: "Browse and manage candidate profiles",
      icon: Users,
      path: "/candidates",
      color: "bg-purple-500"
    },
    {
      title: "AI Matching",
      description: "Match candidates to jobs with AI",
      icon: Bot,
      path: "/matching",
      color: "bg-orange-500"
    },
    {
      title: "Onboarding",
      description: "Streamline new employee onboarding",
      icon: UserCheck,
      path: "/onboarding",
      color: "bg-pink-500"
    },
    {
      title: "Back Office",
      description: "Admin tools and system management",
      icon: FileText,
      path: "/backoffice",
      color: "bg-gray-500"
    }
  ];

  return (
    <Layout showWorkflow={false}>
      <div className="container mx-auto px-6 py-8">
        <header className="text-center mb-12">
          <div className="mb-6">
            <img 
              src="/lovable-uploads/b75d59b1-dda0-4ae9-aa70-24966bdd42d5.png" 
              alt="Growth Accelerator Logo" 
              className="mx-auto h-16 w-16 object-contain"
            />
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-4 text-primary">
            Growth Accelerator
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Streamline your recruitment workflow with AI-powered candidate matching, automated onboarding, and comprehensive analytics.
          </p>
          <Button 
            onClick={() => navigate("/dashboard")}
            size="lg"
            className="bg-secondary-pink hover:bg-secondary-pink/80"
          >
            Get Started
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </header>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-12">
          {workflowSteps.map((step, index) => {
            const Icon = step.icon;
            return (
              <Card key={index} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate(step.path)}>
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${step.color} text-white`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <CardTitle className="text-lg">{step.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="mb-4">
                    {step.description}
                  </CardDescription>
                  <Button variant="outline" size="sm" className="w-full">
                    Go to {step.title}
                    <ArrowRight className="ml-2 h-3 w-3" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </Layout>
  );
};

export default Index;