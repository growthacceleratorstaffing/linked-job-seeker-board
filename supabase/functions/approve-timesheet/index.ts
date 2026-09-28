import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { PDFDocument, StandardFonts, rgb } from "npm:pdf-lib@1.17.1";
import { sendResendEmail } from "../_shared/resend-email.ts";

const ADMIN_EMAIL = "bart@startupaccelerator.nl";
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const esc = (s: unknown) => String(s ?? "").replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]!));
const eur = (n: number) => `EUR ${n.toFixed(2)}`;

async function sha256(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function buildPdf(d: {
  number: string; date: string; freelancer: string; company?: string | null; vat?: string | null; kvk?: string | null; iban?: string | null;
  client: string; period: string; lines: { date: string; hours: number; project?: string | null }[]; hours: number; rate: number;
  subtotal: number; vatRate: number; vatAmount: number; total: number;
}) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let y = 790;
  const t = (s: string, x: number, size = 10, f = font) => page.drawText(s.slice(0, 90), { x, y, size, font: f, color: rgb(0.1, 0.1, 0.2) });
  t("SELF-BILLING INVOICE", 50, 18, bold); y -= 18;
  t("Invoice issued by the recipient on behalf of the supplier (self-billing)", 50, 8); y -= 30;
  t(`Invoice number: ${d.number}`, 50, 10, bold); t(`Date: ${d.date}`, 380); y -= 14;
  t(`Period: ${d.period}`, 50); y -= 30;
  t("Supplier (freelancer)", 50, 10, bold); t("Customer", 320, 10, bold); y -= 14;
  t(d.company || d.freelancer, 50); t("Growth Accelerator Staffing", 320); y -= 12;
  t(d.freelancer, 50); t(`Client assignment: ${d.client}`, 320); y -= 12;
  if (d.kvk) { t(`KvK: ${d.kvk}`, 50); y -= 12; }
  if (d.vat) { t(`VAT: ${d.vat}`, 50); y -= 12; }
  if (d.iban) { t(`IBAN: ${d.iban}`, 50); y -= 12; }
  y -= 20;
  t("Date", 50, 10, bold); t("Project", 150, 10, bold); t("Hours", 400, 10, bold); t("Amount", 480, 10, bold); y -= 6;
  page.drawLine({ start: { x: 50, y }, end: { x: 545, y }, thickness: 0.5 }); y -= 14;
  for (const l of d.lines) {
    if (y < 140) break;
    t(l.date, 50); t(String(l.project ?? "-"), 150); t(l.hours.toFixed(2), 400); t(eur(l.hours * d.rate), 480); y -= 13;
  }
  y -= 10; page.drawLine({ start: { x: 300, y }, end: { x: 545, y }, thickness: 0.5 }); y -= 16;
  t(`${d.hours.toFixed(2)} h x ${eur(d.rate)}`, 300); t(eur(d.subtotal), 480); y -= 14;
  t(`VAT ${d.vatRate}%`, 300); t(eur(d.vatAmount), 480); y -= 14;
  t("Total", 300, 11, bold); t(eur(d.total), 480, 11, bold); y -= 40;
  if (d.vatRate === 0) { t("VAT reverse-charged / exempt.", 50, 8); y -= 12; }
  t("Hours approved by the client's hiring manager. Payment to the supplier's account above.", 50, 8);
  return await pdf.save();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const token = typeof body?.token === "string" && /^[0-9a-f-]{72}$/i.test(body.token) ? body.token : null;
    const action = body?.action;
    if (!token || !["view", "approve", "reject"].includes(action)) return json({ error: "Invalid request" }, 400);
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: ts } = await admin.from("timesheets").select("*").eq("approval_token_hash", await sha256(token)).maybeSingle();
    if (!ts) return json({ error: "This approval link is not valid." }, 404);
    if (ts.status !== "pending") return json({ error: `These hours were already ${ts.status}.`, status: ts.status }, 409);
    if (ts.approval_token_expires_at && new Date(ts.approval_token_expires_at) < new Date()) return json({ error: "This approval link has expired." }, 410);

    const { data: entries } = await admin.from("time_entries").select("entry_date,start_time,end_time,break_minutes,hours,project").eq("timesheet_id", ts.id).order("entry_date");
    const { data: emp } = await admin.from("employees").select("full_name,email,hourly_rate,client_company,created_by").eq("user_id", ts.user_id).maybeSingle();
    const { data: placement } = ts.placement_id ? await admin.from("local_placements").select("*").eq("id", ts.placement_id).maybeSingle() : { data: null };
    let attachmentUrl: string | null = null;
    if (ts.attachment_path) attachmentUrl = (await admin.storage.from("timesheets").createSignedUrl(ts.attachment_path, 3600)).data?.signedUrl ?? null;

    if (action === "view") {
      return json({ freelancer: emp?.full_name, client: placement?.company_name || emp?.client_company, period_start: ts.period_start, period_end: ts.period_end, total_hours: ts.total_hours, entries, attachmentUrl, approver_name: ts.approver_name });
    }

    const note = typeof body?.note === "string" ? body.note.slice(0, 1000) : null;
    const now = new Date().toISOString();
    const from = Deno.env.get("RESEND_FROM_EMAIL") || "Growth Accelerator <onboarding@growthacceleratorstaffing.nl>";

    if (action === "reject") {
      await admin.from("timesheets").update({ status: "rejected", rejected_at: now, decision_note: note, approval_token_hash: null }).eq("id", ts.id);
      await admin.from("time_entries").update({ status: "draft", timesheet_id: null, submitted_at: null }).eq("timesheet_id", ts.id);
      const to = [ADMIN_EMAIL, emp?.email].filter(Boolean) as string[];
      await sendResendEmail({ from, to, subject: `Hours rejected: ${emp?.full_name} (${ts.period_start} – ${ts.period_end})`, html: `<p>${esc(ts.approver_name || ts.approver_email)} rejected ${Number(ts.total_hours).toFixed(2)} hours.</p><p>Note: ${esc(note || "-")}</p>` });
      return json({ success: true, status: "rejected" });
    }

    // approve
    await admin.from("timesheets").update({ status: "approved", approved_at: now, decision_note: note, approval_token_hash: null }).eq("id", ts.id);
    await admin.from("time_entries").update({ status: "approved", approved_at: now }).eq("timesheet_id", ts.id);

    const hours = Number(ts.total_hours);
    const rate = Number(placement?.buy_rate ?? emp?.hourly_rate ?? 0);
    const vatRate = Number(placement?.vat_rate ?? 21);
    const subtotal = Math.round(hours * rate * 100) / 100;
    const vatAmount = Math.round(subtotal * vatRate) / 100;
    const total = Math.round((subtotal + vatAmount) * 100) / 100;

    const { data: inv, error: invErr } = await admin.from("invoices").insert({ timesheet_id: ts.id, user_id: ts.user_id, placement_id: ts.placement_id, hours, rate, subtotal, vat_rate: vatRate, vat_amount: vatAmount, total }).select().single();
    let pdfPath: string | null = null;
    if (!invErr && inv) {
      const bytes = await buildPdf({
        number: inv.invoice_number, date: now.slice(0, 10), freelancer: emp?.full_name || "Freelancer", company: placement?.freelancer_company,
        vat: placement?.freelancer_vat_number, kvk: placement?.freelancer_kvk, iban: placement?.freelancer_iban,
        client: placement?.company_name || emp?.client_company || "-", period: `${ts.period_start} – ${ts.period_end}`,
        lines: (entries ?? []).map((e) => ({ date: e.entry_date, hours: Number(e.hours), project: e.project })), hours, rate, subtotal, vatRate, vatAmount, total,
      });
      pdfPath = `${ts.user_id}/${inv.invoice_number}.pdf`;
      const up = await admin.storage.from("invoices").upload(pdfPath, bytes, { contentType: "application/pdf", upsert: true });
      if (!up.error) await admin.from("invoices").update({ pdf_path: pdfPath }).eq("id", inv.id); else pdfPath = null;
    }

    // Auto-push to backoffice (custom webhook of the staff account that created the employee)
    let push = "not_configured";
    if (emp?.created_by) {
      const { data: settings } = await admin.from("integration_settings").select("integration_type,settings").eq("user_id", emp.created_by).eq("is_enabled", true);
      for (const row of settings ?? []) {
        const s = (row.settings ?? {}) as Record<string, string>;
        if (row.integration_type === "backoffice custom" && s["Webhook URL"]) {
          try {
            const url = new URL(s["Webhook URL"]);
            if (url.protocol !== "https:") throw new Error("https required");
            const pdfUrl = pdfPath ? (await admin.storage.from("invoices").createSignedUrl(pdfPath, 7 * 24 * 3600)).data?.signedUrl : null;
            const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${s["API Key"] ?? ""}` }, body: JSON.stringify({ event: "timesheet.approved", employee: { name: emp.full_name, email: emp.email }, timesheet: { id: ts.id, period_start: ts.period_start, period_end: ts.period_end, hours, entries }, invoice: inv ? { number: inv.invoice_number, rate, subtotal, vat_rate: vatRate, vat_amount: vatAmount, total, pdf_url: pdfUrl } : null, approved_by: ts.approver_email, approved_at: now }) });
            push = res.ok ? "pushed" : `failed (HTTP ${res.status})`;
          } catch (e) { push = `failed (${e instanceof Error ? e.message : "error"})`; }
        } else if (push === "not_configured" && row.integration_type !== "backoffice custom") push = "provider_requires_authorization";
      }
    }
    await admin.from("timesheets").update({ backoffice_push_status: push }).eq("id", ts.id);

    const rows = (entries ?? []).map((e) => `<tr><td>${e.entry_date}</td><td>${Number(e.hours).toFixed(2)}</td><td>${esc(e.project)}</td></tr>`).join("");
    await sendResendEmail({
      from, to: [ADMIN_EMAIL, emp?.email].filter(Boolean) as string[],
      subject: `Hours approved: ${emp?.full_name} (${hours.toFixed(2)} h) – invoice ${inv?.invoice_number ?? ""}`,
      html: `<h2>Hours approved</h2><p>Approved by ${esc(ts.approver_name || "")} (${esc(ts.approver_email)}) · ${ts.period_start} – ${ts.period_end} · <b>${hours.toFixed(2)} h</b></p>
        <table border="1" cellpadding="6" style="border-collapse:collapse"><tr><th>Date</th><th>Hours</th><th>Project</th></tr>${rows}</table>
        <p>Self-billing invoice ${esc(inv?.invoice_number)}: ${eur(total)} incl. VAT. Download it in the app.</p><p>Backoffice push: ${esc(push)}</p>`,
    });
    return json({ success: true, status: "approved", invoice: inv?.invoice_number });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
