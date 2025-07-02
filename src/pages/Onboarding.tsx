import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserCheck, CheckCircle, Clock, Users, Plus } from "lucide-react";

const Onboarding = () => {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Employee Onboarding</h1>
          <p className="text-muted-foreground">Manage new hire onboarding workflows and progress</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Onboarding
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Onboardings</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">New hires this month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">This quarter</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">Currently active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Time</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0d</div>
            <p className="text-xs text-muted-foreground">To completion</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <UserCheck className="mr-2 h-5 w-5" />
            Onboarding Workflows
          </CardTitle>
          <CardDescription>Track new employee onboarding progress</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="text-center py-12 text-muted-foreground">
              <UserCheck className="mx-auto h-12 w-12 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Active Onboardings</h3>
              <p>Start onboarding new employees when they're hired through Workable</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Onboarding Templates</CardTitle>
          <CardDescription>Pre-configured workflows for different roles</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="border rounded-lg p-4 space-y-2">
              <h4 className="font-semibold">General Employee</h4>
              <p className="text-sm text-muted-foreground">Standard onboarding process</p>
              <Badge variant="outline">5 steps</Badge>
            </div>
            <div className="border rounded-lg p-4 space-y-2">
              <h4 className="font-semibold">Technical Role</h4>
              <p className="text-sm text-muted-foreground">IT setup and technical training</p>
              <Badge variant="outline">8 steps</Badge>
            </div>
            <div className="border rounded-lg p-4 space-y-2">
              <h4 className="font-semibold">Management</h4>
              <p className="text-sm text-muted-foreground">Leadership-specific onboarding</p>
              <Badge variant="outline">6 steps</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Onboarding;