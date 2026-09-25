import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { sendResendEmail } from "../_shared/resend-email.ts";

const ADMIN_EMAIL = "bart@startupaccelerator.nl";
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const esc = (s: unknown) => String(s ?? "").replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]!));

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
    const { data: isEmp } = await supabase.rpc("is_employee", { _user_id: user.id });
    if (isEmp) return json({ error: "Only staff can approve hours" }, 403);

    const body = await req.json().catch(() => ({}));
    const userId = typeof body?.user_id === "string" && /^[0-9a-f-]{36}$/i.test(body.user_id) ? body.user_id : null;

    let q = supabase.from("time_entries").select("*").neq("status", "approved").order("entry_date");
    if (userId) q = q.eq("user_id", userId);
    const { data: entries, error } = await q;
    if (error) return json({ error: error.message }, 400);
    if (!entries?.length) return json({ error: "There are no hours waiting for approval" }, 400);

    const { data: emps } = await supabase.from("employees").select("user_id, full_name, email");
    const nameOf = (id: string) => emps?.find((e) => e.user_id === id)?.full_name || id;

    const byPerson = new Map<string, typeof entries>();
    entries.forEach((e) => byPerson.set(e.user_id, [...(byPerson.get(e.user_id) || []), e]));
    const total = entries.reduce((s, e) => s + Number(e.hours), 0);

    const sections = [...byPerson.entries()].map(([uid, list]) => {
      const sum = list.reduce((s, e) => s + Number(e.hours), 0);
      const rows = list.map((e) =>
        `<tr><td>${e.entry_date}</td><td>${esc(e.start_time?.slice(0, 5))}–${esc(e.end_time?.slice(0, 5))}</td><td>${e.break_minutes}m</td><td><b>${Number(e.hours).toFixed(2)}</b></td><td>${esc(e.project)}</td></tr>`).join("");
      return `<h3>${esc(nameOf(uid))} — ${sum.toFixed(2)} h</h3>
        <table border="1" cellpadding="6" style="border-collapse:collapse"><tr><th>Date</th><th>Time</th><th>Break</th><th>Hours</th><th>Project</th></tr>${rows}</table>`;
    }).join("");

    const now = new Date().toISOString();
    const { error: upErr } = await supabase.from("time_entries")
      .update({ status: "approved", approved_at: now }).in("id", entries.map((e) => e.id));
    if (upErr) return json({ error: upErr.message }, 400);

    const mailErr = (await sendResendEmail({
      from: Deno.env.get("RESEND_FROM_EMAIL") || "Growth Accelerator <onboarding@resend.dev>",
      to: [ADMIN_EMAIL],
      subject: `Approved hours overview (${total.toFixed(2)} h)`,
      html: `<h2>Approved hours overview</h2><p>Approved by ${esc(user.email)} · ${entries.length} entries · <b>${total.toFixed(2)} hours</b></p>${sections}`,
    })).error ?? null;
    return json({ success: true, count: entries.length, total, emailError: mailErr });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
