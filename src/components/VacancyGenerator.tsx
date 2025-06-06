import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Wand2, Copy, Download, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CopilotTrigger } from './CopilotTrigger';
import { WorkableIntegration } from './WorkableIntegration';

export const VacancyGenerator = () => {
  const [prompt, setPrompt] = useState('');
  const [generatedVacancy, setGeneratedVacancy] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
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

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedVacancy);
    toast({
      title: "Copied to clipboard!",
      description: "The vacancy text has been copied to your clipboard.",
    });
  };

  const downloadAsText = () => {
    const element = document.createElement('a');
    const file = new Blob([generatedVacancy], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = 'vacancy.txt';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    
    toast({
      title: "Download started!",
      description: "The vacancy text file is being downloaded.",
    });
  };

  const handleCopilotVacancy = (vacancy: string) => {
    setGeneratedVacancy(vacancy);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 relative">
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Sparkles className="w-5 h-5 text-pink-400" />
            Create Your Vacancy with AI
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="prompt" className="text-slate-200 text-sm font-medium">
              Describe the position you want to create a vacancy for
            </Label>
            <Textarea
              id="prompt"
              placeholder="e.g., Senior React Developer for a fintech startup, remote work, 5+ years experience, TypeScript expertise..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="mt-2 bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 focus:border-pink-400 focus:ring-pink-400"
              rows={4}
            />
          </div>
          
          <Button 
            onClick={generateVacancy}
            disabled={isGenerating}
            className="w-full bg-pink-600 hover:bg-pink-700 text-white font-medium py-3"
          >
            {isGenerating ? (
              <>
                <Wand2 className="w-4 h-4 mr-2 animate-spin" />
                Generating with AI...
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4 mr-2" />
                Generate Vacancy with AI
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {generatedVacancy && (
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-white">
              <span>AI-Generated Vacancy</span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyToClipboard}
                  className="border-pink-400 text-pink-400 hover:bg-pink-400 hover:text-white"
                >
                  <Copy className="w-4 h-4 mr-1" />
                  Copy
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadAsText}
                  className="border-pink-400 text-pink-400 hover:bg-pink-400 hover:text-white"
                >
                  <Download className="w-4 h-4 mr-1" />
                  Download
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-slate-900 border border-slate-600 rounded-lg p-6">
              <div className="whitespace-pre-wrap text-slate-200 text-sm leading-relaxed">
                {generatedVacancy}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Workable Integration */}
      <WorkableIntegration generatedVacancy={generatedVacancy} />

      {/* AI Copilot Trigger */}
      <CopilotTrigger onVacancyGenerated={handleCopilotVacancy} />
    </div>
  );
};
