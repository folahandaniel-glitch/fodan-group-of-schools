// Optional outbound channels. Everything reports an honest status; nothing is faked when unconfigured.
export async function sendMail(to: string, subject: string, text: string, replyTo?: string): Promise<string> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM;
  if (!key || !from) return "not_configured";
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [to], subject, text, ...(replyTo ? { reply_to: replyTo } : {}) }),
    });
    return r.ok ? "sent" : `failed_${r.status}`;
  } catch {
    return "failed_network";
  }
}

export async function sendWhatsApp(toNumber: string, message: string): Promise<string> {
  const url = process.env.WHATSAPP_API_URL;
  const tok = process.env.WHATSAPP_API_TOKEN;
  if (!url || !tok) return "not_configured";
  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${tok}`, "Content-Type": "application/json" },
      body: JSON.stringify({ to: toNumber, message }),
    });
    return r.ok ? "sent" : `failed_${r.status}`;
  } catch {
    return "failed_network";
  }
}
