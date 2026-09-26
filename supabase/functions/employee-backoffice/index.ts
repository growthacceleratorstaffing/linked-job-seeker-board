import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.10";

const headers = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type", "Content-Type": "application/json" };
const allowedProviders: Record<string, { name: string; url: string }> = { "exact online": { name: "Exact Online", url: "https://start.exactonline.nl" }, afas: { name: "AFAS", url: "https://www.afasonline.nl" }, deel: { name: "Deel", url: "https://app.deel.com" }, nmbrs: { name: "Nmbrs", url: "https://login.nmbrs.com" }, twinfield: { name: "Twinfield", url: "https://login.twinfield.com" }, visma: { name: "Visma", url: "https://connect.visma.com" } };
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  const authorization = req.headers.get("Authorization");
  if (!authorization) return new Response(JSON.stringify({ error: "Please sign in." }), { status: 401, headers });
  const admin = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
  const { data: { user } } = await admin.auth.getUser(authorization.replace(/^Bearer\s+/i, ""));
  if (!user) return new Response(JSON.stringify({ error: "Please sign in." }), { status: 401, headers });
  const { data: employee } = await admin.from("employees").select("created_by").eq("user_id", user.id).maybeSingle();
  if (!employee) return new Response(JSON.stringify({ error: "Employee access is required." }), { status: 403, headers });
  const { data } = employee.created_by ? await admin.from("integration_settings").select("integration_type").eq("user_id", employee.created_by).eq("is_enabled", true) : { data: [] };
  const providers = (data ?? []).map((row) => allowedProviders[row.integration_type]).filter(Boolean);
  return new Response(JSON.stringify({ providers }), { headers });
});