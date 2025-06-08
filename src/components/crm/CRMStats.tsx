
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Users, MessageSquare, Clock } from "lucide-react";

export const CRMStats = () => {
  const { data: stats } = useQuery({
    queryKey: ["crm-stats"],
    queryFn: async () => {
      const [candidatesResult, responsesResult, newResponsesResult] = await Promise.all([
        supabase.from("candidates").select("id", { count: "exact" }),
        supabase.from("candidate_responses").select("id", { count: "exact" }),
        supabase.from("candidate_responses").select("id", { count: "exact" }).eq("status", "new")
      ]);

      return {
        totalCandidates: candidatesResult.count || 0,
        totalResponses: responsesResult.count || 0,
        newResponses: newResponsesResult.count || 0
      };
    }
  });

  const statCards = [
    {
      title: "Total Candidates",
      value: stats?.totalCandidates || 0,
      icon: Users,
      description: "All registered candidates"
    },
    {
      title: "Total Responses",
      value: stats?.totalResponses || 0,
      icon: MessageSquare,
      description: "All candidate responses"
    },
    {
      title: "New Responses",
      value: stats?.newResponses || 0,
      icon: Clock,
      description: "Pending review"
    }
  ];

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {statCards.map((stat) => (
        <Card key={stat.title} className="bg-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            <stat.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            <p className="text-xs text-muted-foreground">{stat.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
