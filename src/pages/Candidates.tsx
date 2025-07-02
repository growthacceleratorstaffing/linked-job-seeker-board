import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, Search, Filter, Plus, RefreshCw, Mail, Phone, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/Layout";

interface Candidate {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  location: string | null;
  current_position: string | null;
  company: string | null;
  source_platform: string | null;
  profile_completeness_score: number | null;
  interview_stage: string | null;
  created_at: string;
}

const Candidates = () => {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [filteredCandidates, setFilteredCandidates] = useState<Candidate[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [candidatesPerPage] = useState(50);
  const { toast } = useToast();

  const fetchCandidates = async () => {
    setIsLoading(true);
    try {
      // Fetch all candidates without pagination limits
      let allCandidates: Candidate[] = [];
      let from = 0;
      const batchSize = 1000; // Fetch in batches to handle large datasets

      while (true) {
        const { data, error, count } = await supabase
          .from('candidates')
          .select('*', { count: 'exact' })
          .order('created_at', { ascending: false })
          .range(from, from + batchSize - 1);

        if (error) throw error;

        if (data && data.length > 0) {
          allCandidates = [...allCandidates, ...data];
          from += batchSize;
          
          // If we got less than the batch size, we've reached the end
          if (data.length < batchSize) break;
        } else {
          break;
        }
      }

      console.log(`Loaded ${allCandidates.length} candidates from database`);
      setCandidates(allCandidates);
      setFilteredCandidates(allCandidates);
      
      toast({
        title: "Candidates loaded",
        description: `Successfully loaded ${allCandidates.length} candidates`,
      });
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

  const syncWorkableCandidates = async () => {
    setIsLoading(true);
    try {
      console.log('Starting Workable candidate sync...');
      
      const { data, error } = await supabase.functions.invoke('workable-integration', {
        body: { action: 'sync_candidates' }
      });

      console.log('Sync response:', { data, error });

      if (error) {
        console.error('Sync error details:', error);
        throw error;
      }

      if (data?.error) {
        console.error('Function returned error:', data.error);
        throw new Error(data.error);
      }

      console.log('Sync completed successfully:', data);
      
      toast({
        title: "Sync completed",
        description: data?.message || `Synced ${data?.syncedCandidates || 0} candidates from Workable`,
      });

      // Refresh the local candidates list
      await fetchCandidates();
    } catch (error) {
      console.error('Error syncing candidates:', error);
      
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to sync candidates from Workable';
        
      toast({
        title: "Sync failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCandidates();
  }, []);

  useEffect(() => {
    const filtered = candidates.filter(candidate =>
      candidate.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      candidate.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (candidate.company && candidate.company.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    setFilteredCandidates(filtered);
    setCurrentPage(1); // Reset to first page when filtering
  }, [searchTerm, candidates]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredCandidates.length / candidatesPerPage);
  const startIndex = (currentPage - 1) * candidatesPerPage;
  const endIndex = startIndex + candidatesPerPage;
  const paginatedCandidates = filteredCandidates.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const getSourceBadge = (source: string | null) => {
    if (source === 'workable') {
      return <Badge className="bg-blue-500/20 text-blue-400 border-blue-400">Workable</Badge>;
    } else if (source === 'manual') {
      return <Badge className="bg-secondary-pink/20 text-secondary-pink border-secondary-pink">Manual</Badge>;
    }
    return <Badge variant="outline">Unknown</Badge>;
  };

  const activeCandidates = candidates.filter(c => c.interview_stage === 'pending' || c.interview_stage === 'in_progress').length;
  const workableCandidates = candidates.filter(c => c.source_platform === 'workable').length;

  return (
    <Layout>
      <div className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Candidates</h1>
          <p className="text-slate-300">Manage and track all candidates</p>
        </div>

        <div className="flex items-center justify-between mb-6">
          <div></div>
          <div className="flex gap-2">
            <Button 
              onClick={syncWorkableCandidates}
              disabled={isLoading}
              variant="outline"
              className="border-secondary-pink text-secondary-pink hover:bg-secondary-pink hover:text-white"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Sync Workable
            </Button>
            <Button className="bg-secondary-pink hover:bg-secondary-pink/80">
              <Plus className="mr-2 h-4 w-4" />
              Add Candidate
            </Button>
          </div>
        </div>

        <div className="flex gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Search candidates..." 
                className="pl-10 bg-slate-800 border-slate-700 text-white placeholder:text-slate-400"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <Button 
            variant="outline"
            className="border-secondary-pink text-secondary-pink hover:bg-secondary-pink hover:text-white"
          >
            <Filter className="mr-2 h-4 w-4" />
            Filters
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-white">Total Candidates</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{candidates.length}</div>
              <p className="text-xs text-slate-400">All time</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-white">Active</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{activeCandidates}</div>
              <p className="text-xs text-slate-400">In process</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-white">From Workable</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{workableCandidates}</div>
              <p className="text-xs text-slate-400">Synced</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-white">This Month</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {candidates.filter(c => 
                  new Date(c.created_at).getMonth() === new Date().getMonth()
                ).length}
              </div>
              <p className="text-xs text-slate-400">New candidates</p>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center text-white">
              <Users className="mr-2 h-5 w-5 text-secondary-pink" />
              Candidate List
            </CardTitle>
            <CardDescription className="text-slate-400">
              {filteredCandidates.length} of {candidates.length} candidates from growthacceleratorstaffing.workable.com
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredCandidates.length > 0 ? (
              <>
                <div className="mb-4 flex items-center justify-between">
                  <div className="text-sm text-slate-400">
                    Showing {startIndex + 1}-{Math.min(endIndex, filteredCandidates.length)} of {filteredCandidates.length} candidates
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => goToPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="border-slate-600 text-slate-400 hover:bg-slate-700"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-slate-400">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => goToPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="border-slate-600 text-slate-400 hover:bg-slate-700"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-600">
                      <TableHead className="text-slate-300">Name</TableHead>
                      <TableHead className="text-slate-300">Contact</TableHead>
                      <TableHead className="text-slate-300">Position</TableHead>
                      <TableHead className="text-slate-300">Source</TableHead>
                      <TableHead className="text-slate-300">Score</TableHead>
                      <TableHead className="text-slate-300">Added</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedCandidates.map((candidate) => (
                    <TableRow key={candidate.id} className="border-slate-600 hover:bg-slate-700">
                      <TableCell className="text-white font-medium">
                        <div>
                          <div>{candidate.name}</div>
                          {candidate.company && (
                            <div className="text-sm text-slate-400">{candidate.company}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-400">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Mail className="w-3 h-3" />
                            <span className="text-xs">{candidate.email}</span>
                          </div>
                          {candidate.phone && (
                            <div className="flex items-center gap-2">
                              <Phone className="w-3 h-3" />
                              <span className="text-xs">{candidate.phone}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-400">
                        {candidate.current_position || 'Not specified'}
                      </TableCell>
                      <TableCell>
                        {getSourceBadge(candidate.source_platform)}
                      </TableCell>
                      <TableCell className="text-slate-400">
                        {candidate.profile_completeness_score || 0}%
                      </TableCell>
                      <TableCell className="text-slate-400">
                        {new Date(candidate.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                </Table>
              </>
            ) : (
              <div className="text-center py-12 text-slate-400">
                <Users className="mx-auto h-12 w-12 mb-4 text-secondary-pink" />
                <h3 className="text-lg font-semibold mb-2 text-white">
                  {searchTerm ? 'No matching candidates found' : 'No candidates yet'}
                </h3>
                <p>
                  {searchTerm 
                    ? 'Try adjusting your search criteria' 
                    : 'Click "Sync Workable" to import candidates or add them manually'
                  }
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Candidates;