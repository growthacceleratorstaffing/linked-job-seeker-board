import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { sendResendEmail } from "../_shared/resend-email.ts";

const ADMIN_EMAIL = "bart@startupaccelerator.nl";
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "Not signed in" }, 401);
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: { user } } = await supabase.auth.getUser(auth.replace("Bearer ", ""));
    if (!user) return json({ error: "Not signed in" }, 401);

    const { data: entries, error } = await supabase
      .from("time_entries").select("*").eq("user_id", user.id).is("submitted_at", null).order("entry_date");
    if (error) return json({ error: error.message }, 400);
    if (!entries?.length) return json({ error: "No new hours to submit" }, 400);

    const { data: emp } = await supabase.from("employees").select("full_name").eq("user_id", user.id).maybeSingle();
    const name = emp?.full_name || user.email;
    const total = entries.reduce((s, e) => s + Number(e.hours), 0);
    const esc = (s: unknown) => String(s ?? "").replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]!));
    const rows = entries.map((e) =>
      `<tr><td>${e.entry_date}</td><td>${esc(e.start_time?.slice(0, 5))}–${esc(e.end_time?.slice(0, 5))}</td><td>${e.break_minutes}m</td><td><b>${Number(e.hours).toFixed(2)}</b></td><td>${esc(e.project)}</td><td>${esc(e.description)}</td></tr>`
    ).join("");

    const mailErr = (await sendResendEmail({
      from: Deno.env.get("RESEND_FROM_EMAIL") || "Growth Accelerator <onboarding@resend.dev>",
      to: [ADMIN_EMAIL],
      reply_to: user.email,
      subject: `Hours submitted by ${name} (${total.toFixed(2)} h)`,
      html: `<h2>Hours submitted by ${esc(name)}</h2><p>${esc(user.email)} — ${entries.length} entries, <b>${total.toFixed(2)} hours</b></p>
        <table border="1" cellpadding="6" style="border-collapse:collapse"><tr><th>Date</th><th>Time</th><th>Break</th><th>Hours</th><th>Project</th><th>Description</th></tr>${rows}</table>`,
    })).error ?? null;
    if (mailErr) return json({ error: `Email failed: ${mailErr}` }, 400);

    const now = new Date().toISOString();
    await supabase.from("time_entries").update({ submitted_at: now, status: "submitted" })
      .in("id", entries.map((e) => e.id));
    return json({ success: true, count: entries.length, total });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
