import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bot, Users, Briefcase } from "lucide-react";

const Matching = () => {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">AI-Powered Matching</h1>
          <p className="text-muted-foreground">Match candidates to jobs using artificial intelligence</p>
        </div>
        <Button>
          <Bot className="mr-2 h-4 w-4" />
          Generate Matches
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="mr-2 h-5 w-5" />
              Candidates
            </CardTitle>
            <CardDescription>Active candidates available for matching</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">Total candidates</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Briefcase className="mr-2 h-5 w-5" />
              Open Positions
            </CardTitle>
            <CardDescription>Jobs waiting for candidates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">Open positions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Bot className="mr-2 h-5 w-5" />
              AI Matches
            </CardTitle>
            <CardDescription>Generated matches this week</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">Matches generated</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Matching Interface</CardTitle>
          <CardDescription>AI-powered candidate-job matching interface will be displayed here</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <Bot className="mx-auto h-12 w-12 mb-4" />
            <h3 className="text-lg font-semibold mb-2">AI Matching Engine</h3>
            <p>Configure Workable integration to start matching candidates to jobs</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Matching;