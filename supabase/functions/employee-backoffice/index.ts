import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.10";

const headers = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info", "Content-Type": "application/json" };
const allowedProviders: Record<string, { name: string; url: string }> = { "exact online": { name: "Exact Online", url: "https://start.exactonline.nl" }, afas: { name: "AFAS", url: "https://www.afasonline.nl" }, deel: { name: "Deel", url: "https://app.deel.com" }, nmbrs: { name: "Nmbrs", url: "https://login.nmbrs.com" }, twinfield: { name: "Twinfield", url: "https://login.twinfield.com" }, visma: { name: "Visma", url: "https://connect.visma.com" } };
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  const authorization = req.headers.get("Authorization");
  if (!authorization) return new Response(JSON.stringify({ error: "Please sign in." }), { status: 401, headers });
  const admin = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
  const { data: { user } } = await admin.auth.getUser(authorization.replace(/^Bearer\s+/i, ""));
  if (!user) return new Response(JSON.stringify({ error: "Please sign in." }), { status: 401, headers });
  const { data: employee } = await admin.from("employees").select("id,full_name,email,job_title,client_company,hourly_rate,start_date,contract_signed_at,created_by").eq("user_id", user.id).maybeSingle();
  if (!employee) return new Response(JSON.stringify({ error: "Employee access is required." }), { status: 403, headers });
  const { data } = employee.created_by ? await admin.from("integration_settings").select("integration_type,settings").eq("user_id", employee.created_by).eq("is_enabled", true) : { data: [] };
  const providers = (data ?? []).map((row) => allowedProviders[row.integration_type]).filter(Boolean);
  const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
  const sync: { provider: string; status: "synced" | "not_supported" | "failed"; message?: string }[] = [];
  if (body?.action === "sync") {
    const { created_by: _owner, ...record } = employee;
    for (const row of data ?? []) {
      const settings = (row.settings ?? {}) as Record<string, string>;
      if (row.integration_type === "backoffice custom" && settings["Webhook URL"]) {
        try {
          const url = new URL(settings["Webhook URL"]);
          if (url.protocol !== "https:") throw new Error("Webhook URL must use https.");
          const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${settings["API Key"] ?? ""}` }, body: JSON.stringify({ event: "employee.sync", employee: record, synced_at: new Date().toISOString() }) });
          sync.push({ provider: "Custom Integration", status: res.ok ? "synced" : "failed", message: res.ok ? undefined : `HTTP ${res.status}` });
        } catch (e) { sync.push({ provider: "Custom Integration", status: "failed", message: e instanceof Error ? e.message : "Request failed" }); }
      } else if (allowedProviders[row.integration_type]) {
        sync.push({ provider: allowedProviders[row.integration_type].name, status: "not_supported", message: "Direct sync needs the provider's API authorization." });
      }
    }
    await admin.from("integration_sync_logs").insert({ integration_type: "backoffice", sync_type: "employee_sync", status: sync.some((s) => s.status === "failed") ? "error" : "success", synced_data: { employee_id: employee.id, results: sync } });
  }
  return new Response(JSON.stringify({ providers, sync }), { headers });
});