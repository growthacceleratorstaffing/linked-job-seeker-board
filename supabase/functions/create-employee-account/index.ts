import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

function tempPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const a = crypto.getRandomValues(new Uint8Array(12));
  return Array.from(a, (n) => chars[n % chars.length]).join("") + "!7";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const token = (req.headers.get("Authorization") || "").replace("Bearer ", "");
    const { data: { user: caller } } = await admin.auth.getUser(token);
    if (!caller) return json({ error: "Not signed in" }, 401);
    const { data: callerEmp } = await admin.from("employees").select("id").eq("user_id", caller.id).maybeSingle();
    if (callerEmp) return json({ error: "Not allowed" }, 403);

    const body = await req.json();
    const email = String(body.email || "").trim().toLowerCase();
    const full_name = String(body.full_name || "").trim();
    if (!email.includes("@") || !full_name) return json({ error: "Name and email are required" }, 400);

    const password = tempPassword();
    let userId: string | undefined;
    const { data: created, error } = await admin.auth.admin.createUser({
      email, password, email_confirm: true, user_metadata: { full_name, account_type: "employee" },
    });
    if (error) {
      // Existing user: look up and reset password
      const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
      const existing = list?.users.find((u) => u.email?.toLowerCase() === email);
      if (!existing) return json({ error: error.message }, 400);
      userId = existing.id;
      await admin.auth.admin.updateUserById(userId, { password });
    } else userId = created.user.id;

    const { error: empErr } = await admin.from("employees").upsert({
      user_id: userId, full_name, email,
      candidate_id: body.candidate_id || null,
      job_title: body.job_title || null,
      client_company: body.client_company || null,
      hourly_rate: body.hourly_rate ? Number(body.hourly_rate) : null,
      start_date: body.start_date || null,
      created_by: caller.id,
    }, { onConflict: "user_id" });
    if (empErr) return json({ error: empErr.message }, 400);

    return json({ success: true, email, password, user_id: userId });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
