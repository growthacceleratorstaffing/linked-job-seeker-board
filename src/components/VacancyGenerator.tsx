import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Wand2, Copy, Download, Sparkles, Upload, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { EmploymentDetailsForm, EmploymentDetails } from './EmploymentDetailsForm';

export const VacancyGenerator = () => {
  const [prompt, setPrompt] = useState('');
  const [generatedVacancy, setGeneratedVacancy] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [employmentDetails, setEmploymentDetails] = useState<EmploymentDetails>({
    jobTitle: '',
    employmentType: 'full_time',
    department: '',
    jobCode: '',
    officeLocation: '',
    workplace: 'on_site',
  });
  const { toast } = useToast();

  const generateVacancy = async () => {
    if (!prompt.trim()) {
      toast({
        title: "Please enter a prompt",
        description: "Describe the job position you want to create a vacancy for.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    
    try {
      console.log('Calling Azure OpenAI through Supabase edge function...');
      
      const { data, error } = await supabase.functions.invoke('generate-vacancy', {
        body: { prompt: prompt.trim() }
      });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message || 'Failed to generate vacancy');
      }

      if (!data || !data.generatedVacancy) {
        throw new Error('No vacancy content received from AI');
      }

      setGeneratedVacancy(data.generatedVacancy);
      
      toast({
        title: "Vacancy generated successfully!",
        description: "Your AI-powered job description is ready.",
      });

    } catch (error) {
      console.error('Error generating vacancy:', error);
      toast({
        title: "Generation failed",
        description: error instanceof Error ? error.message : "Failed to generate vacancy. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const publishToWorkable = async () => {
    // Validate required fields
    if (!employmentDetails.jobTitle.trim()) {
      toast({
        title: "Job title required",
        description: "Please enter a job title before publishing.",
        variant: "destructive",
      });
      return;
    }

    if (!employmentDetails.officeLocation.trim()) {
      toast({
        title: "Office location required",
        description: "Please enter an office location before publishing.",
        variant: "destructive",
      });
      return;
    }

    const description = generatedVacancy.trim() || 'Job description to be added.';

    setIsPublishing(true);
    try {
      const jobData = {
        title: employmentDetails.jobTitle,
        description: description,
        employment_type: employmentDetails.employmentType,
        department: employmentDetails.department || 'General',
        remote: employmentDetails.workplace === 'remote',
        location: employmentDetails.officeLocation,
        job_code: employmentDetails.jobCode,
        workplace: employmentDetails.workplace,
      };
      
      const { data, error } = await supabase.functions.invoke('workable-integration', {
        body: { 
          action: 'publish_job',
          jobData
        }
      });

      if (error) throw error;

      toast({
        title: "Job created as draft! 📝",
        description: data.message || "Your vacancy has been created in Workable.",
      });

    } catch (error) {
      console.error('Error publishing to Workable:', error);
      toast({
        title: "Publishing failed",
        description: error instanceof Error ? error.message : "Failed to publish job to Workable.",
        variant: "destructive",
      });
    } finally {
      setIsPublishing(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedVacancy);
    toast({
      title: "Copied to clipboard!",
      description: "The vacancy text has been copied to your clipboard.",
    });
  };

  const toggleEditMode = () => {
    setIsEditing(!isEditing);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 relative">
      <Card className="bg-primary-blue border border-white/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Sparkles className="w-5 h-5 text-secondary-pink" />
            Create Your Vacancy with AI, or write it yourself
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label htmlFor="prompt" className="text-slate-200 text-base font-medium">
              Describe the position you want to create a vacancy for
            </Label>
            <Textarea
              id="prompt"
              placeholder="e.g., Senior React Developer for a fintech startup, remote work, 5+ years experience, TypeScript expertise..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="mt-3 bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 focus:border-secondary-pink focus:ring-secondary-pink text-base"
              rows={6}
            />
          </div>
          
          {/* Generated Vacancy Display */}
          {generatedVacancy && (
            <div className="mt-8">
              <div className="flex items-center justify-between mb-4">
                <Label className="text-slate-200 text-base font-medium">
                  Generated Job Description
                </Label>
                <div className="flex gap-2">
                  <Button
                    onClick={toggleEditMode}
                    size="sm"
                    className="bg-secondary-pink hover:bg-secondary-pink/80 text-white"
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    {isEditing ? 'View' : 'Edit'}
                  </Button>
                  <Button
                    size="sm"
                    onClick={copyToClipboard}
                    className="bg-secondary-pink hover:bg-secondary-pink/80 text-white"
                  >
                    <Copy className="w-4 h-4 mr-1" />
                    Copy
                  </Button>
                </div>
              </div>
              
              {isEditing ? (
                <Textarea
                  value={generatedVacancy}
                  onChange={(e) => setGeneratedVacancy(e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 focus:border-secondary-pink focus:ring-secondary-pink min-h-[400px] text-base"
                />
              ) : (
                <div className="bg-slate-700 border border-slate-600 rounded-lg p-8">
                  <div className="whitespace-pre-wrap text-slate-200 text-base leading-relaxed">
                    {generatedVacancy}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Action Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6">
            <Button 
              onClick={generateVacancy}
              disabled={isGenerating}
              className="w-full bg-secondary-pink hover:bg-secondary-pink/80 text-white font-medium py-4 text-base"
            >
              {isGenerating ? (
                <>
                  <Wand2 className="w-5 h-5 mr-2 animate-spin" />
                  Generating with AI...
                </>
              ) : (
                <>
                  <Wand2 className="w-5 h-5 mr-2" />
                  Generate with AI
                </>
              )}
            </Button>
            
            <Button
              onClick={publishToWorkable}
              disabled={isPublishing}
              className="w-full bg-secondary-pink hover:bg-secondary-pink/80 text-white font-medium py-4 text-base"
            >
              {isPublishing ? (
                <>
                  <Upload className="w-5 h-5 mr-2 animate-spin" />
                  Publishing...
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5 mr-2" />
                  Publish Job
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Employment Details Form */}
      <EmploymentDetailsForm 
        details={employmentDetails} 
        onChange={setEmploymentDetails} 
      />

    </div>
  );
};

export default VacancyGenerator;
