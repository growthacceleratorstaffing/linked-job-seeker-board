import { createClient } from "npm:@supabase/supabase-js@2";

// Public XML job feed used as the "Job Source URL" for LinkedIn Recruiter job wrapping.
const esc = (s: unknown) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

Deno.serve(async () => {
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: jobs } = await db
    .from("jobs")
    .select("id,title,company_name,location_name,work_type_name,category_name,job_description,created_at")
    .order("created_at", { ascending: false })
    .limit(500);

  const items = (jobs || []).map((j) => `  <job>
    <partnerJobId><![CDATA[${j.id}]]></partnerJobId>
    <company><![CDATA[${j.company_name || "Growth Accelerator"}]]></company>
    <title><![CDATA[${j.title}]]></title>
    <description><![CDATA[${j.job_description || j.title}]]></description>
    <applyUrl><![CDATA[https://jobs.growthaccelerator.nl/job-board?job=${j.id}]]></applyUrl>
    <location><![CDATA[${j.location_name || ""}]]></location>
    <jobtype><![CDATA[${esc(j.work_type_name || "")}]]></jobtype>
    <industryCodes><![CDATA[${esc(j.category_name || "")}]]></industryCodes>
    <listDate>${new Date(j.created_at).toISOString()}</listDate>
  </job>`).join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<source>\n  <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>\n  <publisherUrl>https://jobs.growthaccelerator.nl</publisherUrl>\n  <publisher>Growth Accelerator</publisher>\n${items}\n</source>`;
  return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8", "Access-Control-Allow-Origin": "*" } });
});
