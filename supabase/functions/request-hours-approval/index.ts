import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { sendResendEmail } from "../_shared/resend-email.ts";

const APP_URL = "https://app.growthacceleratorstaffing.nl";
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const esc = (s: unknown) => String(s ?? "").replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]!));
const isDate = (s: unknown) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
const isEmail = (s: unknown) => typeof s === "string" && /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/.test(s);

async function sha256(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "Not signed in" }, 401);
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: { user } } = await admin.auth.getUser(auth.replace(/^Bearer\s+/i, ""));
    if (!user) return json({ error: "Not signed in" }, 401);

    const body = await req.json().catch(() => ({}));
    const { period_start, period_end, approver_email, approver_name, attachment_path, origin } = body ?? {};
    if (!isDate(period_start) || !isDate(period_end) || period_start > period_end) return json({ error: "Choose a valid period" }, 400);
    if (!isEmail(approver_email)) return json({ error: "Enter a valid hiring manager email" }, 400);
    const name = typeof approver_name === "string" ? approver_name.slice(0, 120) : "";
    if (attachment_path != null && (typeof attachment_path !== "string" || !attachment_path.startsWith(`${user.id}/`))) return json({ error: "Invalid attachment" }, 400);

    const { data: entries, error } = await admin.from("time_entries").select("*")
      .eq("user_id", user.id).gte("entry_date", period_start).lte("entry_date", period_end)
      .neq("status", "approved").is("timesheet_id", null).order("entry_date");
    if (error) return json({ error: error.message }, 400);
    if (!entries?.length) return json({ error: "No open hours in this period" }, 400);

    const { data: emp } = await admin.from("employees").select("full_name,client_company").eq("user_id", user.id).maybeSingle();
    const { data: placement } = await admin.from("local_placements").select("id,company_name,job_title,project")
      .eq("employee_user_id", user.id).order("start_date", { ascending: false }).limit(1).maybeSingle();
    const total = entries.reduce((s, e) => s + Number(e.hours), 0);
    const token = crypto.randomUUID() + crypto.randomUUID();
    const expires = new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString();

    const { data: ts, error: tsErr } = await admin.from("timesheets").insert({
      user_id: user.id, placement_id: placement?.id ?? null, period_start, period_end, total_hours: total,
      status: "pending", attachment_path: attachment_path ?? null, approver_email, approver_name: name,
      approval_token_hash: await sha256(token), approval_token_expires_at: expires, requested_at: new Date().toISOString(),
    }).select().single();
    if (tsErr) return json({ error: tsErr.message }, 400);
    await admin.from("time_entries").update({ timesheet_id: ts.id, status: "submitted", submitted_at: new Date().toISOString() }).in("id", entries.map((e) => e.id));

    let base = APP_URL;
    if (typeof origin === "string" && /^https:\/\/[a-z0-9.-]+$/i.test(origin) && (origin.endsWith(".lovable.app") || origin.endsWith(".lovableproject.com") || origin.endsWith("growthacceleratorstaffing.nl") || origin.endsWith("growthaccelerator.nl"))) base = origin;
    const link = `${base}/timesheet-approval?token=${token}`;
    const person = emp?.full_name || user.email;
    const rows = entries.map((e) => `<tr><td>${e.entry_date}</td><td>${esc(e.start_time?.slice(0, 5))}–${esc(e.end_time?.slice(0, 5))}</td><td>${e.break_minutes}m</td><td><b>${Number(e.hours).toFixed(2)}</b></td><td>${esc(e.project)}</td></tr>`).join("");
    const mail = await sendResendEmail({
      from: Deno.env.get("RESEND_FROM_EMAIL") || "Growth Accelerator <onboarding@growthacceleratorstaffing.nl>",
      to: [approver_email], reply_to: user.email,
      subject: `Please confirm hours of ${person} (${period_start} – ${period_end})`,
      html: `<p>Hello ${esc(name)},</p><p>${esc(person)} registered <b>${total.toFixed(2)} hours</b> for ${esc(placement?.company_name || emp?.client_company || "your company")} between ${period_start} and ${period_end}.</p>
        <table border="1" cellpadding="6" style="border-collapse:collapse"><tr><th>Date</th><th>Time</th><th>Break</th><th>Hours</th><th>Project</th></tr>${rows}</table>
        <p style="margin-top:20px"><a href="${link}" style="background:#e6007e;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none">Review &amp; approve hours</a></p>
        <p style="color:#666;font-size:12px">This link is valid for 14 days and can be used once.</p>`,
    });
    if (!mail.ok) return json({ success: true, timesheet_id: ts.id, emailError: mail.error });
    return json({ success: true, timesheet_id: ts.id, count: entries.length, total });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
