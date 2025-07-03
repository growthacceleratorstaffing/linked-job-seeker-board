import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { UserCheck, Users, Calendar, CheckCircle, Mail, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/Layout";

interface Candidate {
  id: string;
  name: string;
  email: string;
  current_position?: string;
  company?: string;
}

const Onboarding = () => {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const { toast } = useToast();

  const fetchCandidates = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('candidates')
        .select('id, name, email, current_position, company')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setCandidates(data || []);
    } catch (error) {
      console.error('Error fetching candidates:', error);
      toast({
        title: "Error",
        description: "Failed to fetch candidates",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCandidates();
  }, []);

  const handleBeginOnboarding = async () => {
    if (!selectedCandidateId) {
      toast({
        title: "Please select a candidate",
        description: "You must select a candidate before beginning onboarding",
        variant: "destructive",
      });
      return;
    }

    const selectedCandidate = candidates.find(c => c.id === selectedCandidateId);
    if (!selectedCandidate) {
      toast({
        title: "Candidate not found",
        description: "The selected candidate could not be found",
        variant: "destructive",
      });
      return;
    }

    setIsSendingEmail(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-onboarding-email', {
        body: {
          candidateId: selectedCandidate.id,
          candidateName: selectedCandidate.name,
          candidateEmail: selectedCandidate.email,
          jobTitle: selectedCandidate.current_position,
          companyName: 'Growth Accelerator'
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: "Onboarding Email Sent! 📧",
          description: `Welcome email sent successfully to ${selectedCandidate.name}`,
        });
        
        // Reset selection after successful send
        setSelectedCandidateId('');
      } else {
        throw new Error(data?.error || 'Failed to send email');
      }
    } catch (error) {
      console.error('Error sending onboarding email:', error);
      toast({
        title: "Failed to Send Email",
        description: error instanceof Error ? error.message : "Failed to send onboarding email",
        variant: "destructive",
      });
    } finally {
      setIsSendingEmail(false);
    }
  };

  const selectedCandidate = candidates.find(c => c.id === selectedCandidateId);

  return (
    <Layout>
      <div className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Employee Onboarding</h1>
          <p className="text-slate-300">Send welcome emails and manage new employee onboarding workflow</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6">
          <Card className="bg-white border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-foreground">Total Candidates</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{candidates.length}</div>
              <p className="text-xs text-muted-foreground">Available for onboarding</p>
            </CardContent>
          </Card>
        </div>

        {/* Candidate Selection Card */}
        <Card className="bg-white border-border mb-6">
          <CardHeader>
            <CardTitle className="flex items-center text-foreground">
              <Mail className="mr-2 h-5 w-5 text-secondary-pink" />
              Send Onboarding Email
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Select a candidate to send them a welcome email and begin the onboarding process
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="candidate-select" className="text-foreground">Choose Candidate</Label>
              <Select value={selectedCandidateId} onValueChange={setSelectedCandidateId}>
                <SelectTrigger className="bg-background border-border text-foreground">
                  <SelectValue placeholder={isLoading ? "Loading candidates..." : "Select a candidate for onboarding"} />
                </SelectTrigger>
                <SelectContent className="bg-background border-border">
                  {candidates.map((candidate) => (
                    <SelectItem key={candidate.id} value={candidate.id} className="text-foreground hover:bg-accent">
                      <div className="flex flex-col">
                        <span className="font-medium">{candidate.name}</span>
                        <span className="text-sm text-muted-foreground">{candidate.email}</span>
                        {candidate.current_position && (
                          <span className="text-xs text-muted-foreground">{candidate.current_position}</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedCandidate && (
              <div className="bg-accent p-4 rounded-lg">
                <h4 className="text-foreground font-medium mb-2">Selected Candidate:</h4>
                <div className="space-y-1 text-sm">
                  <p className="text-foreground"><strong>Name:</strong> {selectedCandidate.name}</p>
                  <p className="text-muted-foreground"><strong>Email:</strong> {selectedCandidate.email}</p>
                  {selectedCandidate.current_position && (
                    <p className="text-muted-foreground"><strong>Position:</strong> {selectedCandidate.current_position}</p>
                  )}
                  {selectedCandidate.company && (
                    <p className="text-muted-foreground"><strong>Current Company:</strong> {selectedCandidate.company}</p>
                  )}
                </div>
              </div>
            )}

            <Button 
              onClick={handleBeginOnboarding}
              disabled={!selectedCandidateId || isSendingEmail || isLoading}
              className="w-full bg-secondary-pink hover:bg-secondary-pink/80 text-white"
            >
              {isSendingEmail ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending Welcome Email...
                </>
              ) : (
                <>
                  <UserCheck className="mr-2 h-4 w-4" />
                  Begin Onboarding
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Onboarding Pipeline Card */}
        <Card className="bg-white border-border">
          <CardHeader>
            <CardTitle className="flex items-center text-foreground">
              <Users className="mr-2 h-5 w-5 text-secondary-pink" />
              Onboarding Pipeline
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Track and manage the onboarding process for new employees
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12 text-muted-foreground">
              <Calendar className="mx-auto h-12 w-12 mb-4 text-secondary-pink" />
              <h3 className="text-lg font-semibold mb-2 text-foreground">Onboarding Process Ready</h3>
              <p className="mb-4">Select a candidate above to send them a welcome email and start their onboarding journey</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
                <div className="bg-accent p-4 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-green-400 mb-2" />
                  <h4 className="text-foreground text-sm font-medium">Welcome Email</h4>
                  <p className="text-xs text-muted-foreground">Automated welcome message</p>
                </div>
                <div className="bg-accent p-4 rounded-lg">
                  <Users className="w-6 h-6 text-blue-400 mb-2" />
                  <h4 className="text-foreground text-sm font-medium">Team Introduction</h4>
                  <p className="text-xs text-muted-foreground">Meet the team</p>
                </div>
                <div className="bg-accent p-4 rounded-lg">
                  <Calendar className="w-6 h-6 text-purple-400 mb-2" />
                  <h4 className="text-foreground text-sm font-medium">Schedule Setup</h4>
                  <p className="text-xs text-muted-foreground">First day planning</p>
                </div>
                <div className="bg-accent p-4 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-secondary-pink mb-2" />
                  <h4 className="text-foreground text-sm font-medium">Documentation</h4>
                  <p className="text-xs text-muted-foreground">Complete paperwork</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Onboarding;