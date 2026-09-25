import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// Recruiter System Connect (RSC) endpoints. Access requires LinkedIn to enable RSC for your Recruiter contract.
const RECRUITER_SOURCES = [
  { key: "contracts", label: "Recruiter contracts", path: "/v2/hireContracts?q=viewer" },
  { key: "projects", label: "Projects", path: "/v2/talentProjects?q=viewer" },
  { key: "candidates", label: "Pipeline candidates", path: "/v2/atsCandidateProfiles?q=viewer" },
  { key: "inmails", label: "InMail history", path: "/v2/recruiterInMails?q=viewer" },
  { key: "notes", label: "Notes", path: "/v2/recruiterNotes?q=viewer" },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const jwt = (req.headers.get("Authorization") || "").replace("Bearer ", "");
    const { data: { user } } = await admin.auth.getUser(jwt);
    if (!user) return json({ error: "Not signed in" }, 401);

    const { action } = await req.json();
    const { data: tok } = await admin.from("linkedin_user_tokens").select("access_token").eq("user_id", user.id).maybeSingle();
    const accessToken = tok?.access_token || Deno.env.get("LINKEDIN_ACCESS_TOKEN");
    if (!accessToken) return json({ connected: false, error: "No LinkedIn access token yet" });

    const li = (path: string) =>
      fetch(`https://api.linkedin.com${path}`, {
        headers: { Authorization: `Bearer ${accessToken}`, "X-Restli-Protocol-Version": "2.0.0", "LinkedIn-Version": "202409" },
      });

    const me = await li("/v2/userinfo");
    const profile = me.ok ? await me.json() : null;

    if (action === "status") {
      // Check whether the Recruiter contract is reachable
      const c = await li(RECRUITER_SOURCES[0].path);
      const body = await c.text();
      return json({
        connected: !!profile,
        profile,
        recruiterAccess: c.ok,
        recruiterMessage: c.ok ? null : `LinkedIn answered ${c.status}: ${body.slice(0, 300)}`,
      });
    }

    if (action === "import") {
      const results: Record<string, unknown> = {};
      let imported = 0;
      for (const src of RECRUITER_SOURCES) {
        const r = await li(src.path);
        const text = await r.text();
        if (!r.ok) { results[src.key] = { label: src.label, ok: false, status: r.status, message: text.slice(0, 300) }; continue; }
        let data: any = {};
        try { data = JSON.parse(text); } catch { /* ignore */ }
        const elements: any[] = data.elements || [];
        results[src.key] = { label: src.label, ok: true, count: elements.length };
        if (src.key === "candidates") {
          for (const el of elements) {
            const name = [el.firstName, el.lastName].filter(Boolean).join(" ") || el.name || "LinkedIn candidate";
            await admin.from("contacts").insert({
              user_id: user.id, name, email: el.email || null, title: el.headline || null,
              company: el.currentCompany || null, linkedin_url: el.profileUrl || null,
              source: "linkedin_recruiter", notes: JSON.stringify(el).slice(0, 5000),
            });
            imported++;
          }
        }
      }
      await admin.from("integration_sync_logs").insert({
        integration_type: "linkedin", sync_type: "recruiter_import", status: "success",
        synced_data: results, completed_at: new Date().toISOString(),
      });
      return json({ success: true, imported, results });
    }
    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
