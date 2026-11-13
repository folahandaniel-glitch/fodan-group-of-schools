/** SMS provider adapter (Termii, a Nigerian bulk-SMS gateway). Without TERMII_API_KEY messages stay "queued" and nothing is sent. */
export const smsConfigured = (): boolean => !!process.env.TERMII_API_KEY && !!process.env.SMS_SENDER_ID;

/** 0803 123 4567, +234 803 123 4567 and 2348031234567 all become 2348031234567. Returns "" if it cannot be a phone number. */
export function normalisePhone(raw: string): string {
  const d = raw.replace(/[^\d+]/g, "").replace(/^\+/, "");
  if (/^234\d{10}$/.test(d)) return d;
  if (/^0\d{10}$/.test(d)) return "234" + d.slice(1);
  if (/^\d{10}$/.test(d)) return "234" + d;
  return /^\d{11,14}$/.test(d) ? d : "";
}

export async function sendSms(to: string, body: string): Promise<{ status: "sent" | "failed" | "queued"; ref?: string; error?: string }> {
  if (!smsConfigured()) return { status: "queued" };
  try {
    const r = await fetch("https://api.ng.termii.com/api/sms/send", {
      method: "POST", headers: { "Content-Type": "application/json" }, signal: AbortSignal.timeout(15000),
      body: JSON.stringify({ to, from: process.env.SMS_SENDER_ID, sms: body, type: "plain", channel: "generic", api_key: process.env.TERMII_API_KEY }),
    });
    const j = (await r.json().catch(() => ({}))) as { message_id?: string; message?: string };
    if (r.ok && j.message_id) return { status: "sent", ref: j.message_id };
    return { status: "failed", error: String(j.message ?? `Provider answered ${r.status}`).slice(0, 200) };
  } catch (e) {
    return { status: "failed", error: String((e as Error).message).slice(0, 200) };
  }
}
