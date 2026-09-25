import { createClient } from "npm:@supabase/supabase-js@2";
import { sendResendEmail } from "../_shared/resend-email.ts";
const APP_URL = Deno.env.get("APP_URL") || "https://growthaccelerator.lovable.app";

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

    // Email the login details to the new employee
    const loginUrl = `${APP_URL}/auth`;
    const mailErr = (await sendResendEmail({
      from: Deno.env.get("RESEND_FROM_EMAIL") || "Growth Accelerator <onboarding@resend.dev>",
      to: [email],
      reply_to: "bart@startupaccelerator.nl",
      subject: "Your Growth Accelerator backoffice account is ready",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #2563eb; text-align: center;">Welcome to Growth Accelerator, ${full_name}!</h1>
          <div style="background-color: #f8fafc; padding: 30px; border-radius: 8px; margin: 20px 0;">
            <p>Your backoffice account has been created. You can sign in with the details below:</p>
            <div style="background-color: white; padding: 20px; border-radius: 6px; border-left: 4px solid #ec4899;">
              <p><strong>Login page:</strong> <a href="${loginUrl}">${loginUrl}</a></p>
              <p><strong>Email:</strong> ${email}</p>
              <p><strong>Temporary password:</strong> ${password}</p>
            </div>
            <p style="margin-top: 20px;">After signing in you can view your onboarding and register your hours in the backoffice. We recommend changing your password after your first login.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${loginUrl}" style="background-color: #ec4899; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Sign in to your account</a>
            </div>
          </div>
          <div style="text-align: center; padding: 20px; color: #64748b; font-size: 12px;">
            <p>Best regards,<br>The Growth Accelerator Team</p>
          </div>
        </div>
      `,
    });
    if (mailErr) {
      console.error("Resend rejected account email:", mailErr);
      return json({ success: true, email, password, user_id: userId, email_sent: false, email_error: mailErr });
    }

    return json({ success: true, email, password, user_id: userId, email_sent: true });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
