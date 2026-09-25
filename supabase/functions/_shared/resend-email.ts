// Shared helper: send email through the Resend connection gateway.
const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";

export interface SendEmailArgs {
  from: string;
  to: string | string[];
  subject: string;
  html: string;
  reply_to?: string;
}

export async function sendResendEmail(
  email: SendEmailArgs,
): Promise<{ ok: boolean; error?: string }> {
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  const connectionKey = Deno.env.get("RESEND_API_KEY");
  if (!lovableKey || !connectionKey) {
    return { ok: false, error: "Resend connection is not configured (missing gateway credentials)" };
  }

  let response: Response;
  try {
    response = await fetch(`${GATEWAY_URL}/emails`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": connectionKey,
      },
      body: JSON.stringify(email),
    });
  } catch (e) {
    console.error("Resend gateway request threw:", e);
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }

  const bodyText = await response.text();
  if (!response.ok) {
    console.error(`Resend gateway request failed [${response.status}]: ${bodyText}`);
    return { ok: false, error: `Resend request failed (${response.status}): ${bodyText}` };
  }

  try {
    const parsed = JSON.parse(bodyText);
    if (parsed?.error) {
      return { ok: false, error: parsed.error.message || JSON.stringify(parsed.error) };
    }
  } catch {
    // Non-JSON 2xx body — treat as success.
  }
  return { ok: true };
}
