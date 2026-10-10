"use server";
import { redirect } from "next/navigation";
import { sql } from "@/lib/db";
import { getSchool, getSetting } from "@/lib/settings";
import { audit, clean, clientIp, rateLimit } from "@/lib/security";
import { validEmail } from "@/lib/logic/password";
import { sendMail, sendWhatsApp } from "@/lib/mail";

const CATEGORIES = ["General", "Admissions", "Academics", "Parents", "Results", "Technical", "Complaint", "Other"];
const NOTIFY_EMAIL = "folahandaniel@gmail.com";

export async function submitContact(_prev: unknown, fd: FormData): Promise<{ ok?: boolean; error?: string }> {
  if (clean(fd.get("website"))) return { ok: true }; // honeypot
  const ip = await clientIp();
  if (!(await rateLimit(`contact:${ip}`, 5, 3600))) return { error: "Too many messages from this device. Please try again later." };
  const name = clean(fd.get("name"), 120);
  const email = clean(fd.get("email"), 200);
  const phone = clean(fd.get("phone"), 40);
  const subject = clean(fd.get("subject"), 160);
  const message = clean(fd.get("message"), 4000);
  const cat = clean(fd.get("category"), 40);
  const category = CATEGORIES.includes(cat) ? cat : "General";
  if (name.length < 2) return { error: "Please enter your name." };
  if (!validEmail(email)) return { error: "Please enter a valid email address." };
  if (subject.length < 3) return { error: "Please enter a subject." };
  if (message.length < 10) return { error: "Please write a longer message." };

  const school = await getSchool();
  const [row] = await sql`INSERT INTO contact_messages (school_id, name, email, phone, subject, message, category)
                          VALUES (${school.id}, ${name}, ${email}, ${phone || null}, ${subject}, ${message}, ${category}) RETURNING id`;
  const contact = await getSetting<{ whatsapp: string }>("contact");
  const body = `New website message (${category})\nFrom: ${name} <${email}> ${phone}\nSubject: ${subject}\n\n${message}`;
  const [emailStatus, waStatus] = await Promise.all([
    sendMail(NOTIFY_EMAIL, `[Fodan] ${subject}`, body, email),
    sendWhatsApp(contact?.whatsapp || "2348067578112", body.slice(0, 900)),
  ]);
  await sql`UPDATE contact_messages SET email_status = ${emailStatus}, whatsapp_status = ${waStatus} WHERE id = ${row.id}`;
  await audit({ schoolId: school.id, action: "comment.received", entity: "contact_message", entityId: row.id, actor: email });
  return { ok: true };
}

export async function goLogin() {
  redirect("/login");
}
