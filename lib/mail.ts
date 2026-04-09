import { Resend } from "resend";

let resend: Resend | null = null;

function getResend(): Resend {
  if (!resend) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

interface ContactMailParams {
  name: string;
  email: string;
  type: string;
  message: string;
}

export async function sendContactMail({
  name,
  email,
  type,
  message,
}: ContactMailParams) {
  const to = process.env.CONTACT_EMAIL_TO;
  if (!to) throw new Error("CONTACT_EMAIL_TO is not set");

  const { data, error } = await getResend().emails.send({
    from: "AKASHIKI Contact <onboarding@resend.dev>",
    to,
    replyTo: email,
    subject: `【お問い合わせ】${type} — ${name}`,
    text: [
      `氏名: ${name}`,
      `メールアドレス: ${email}`,
      `お問い合わせ種別: ${type}`,
      ``,
      `--- 本文 ---`,
      message,
    ].join("\n"),
  });

  if (error) throw error;
  return data;
}
