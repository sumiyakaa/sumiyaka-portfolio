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
  budget: string;
  deadline: string;
  message: string;
}

export async function sendContactMail({
  name,
  email,
  budget,
  deadline,
  message,
}: ContactMailParams) {
  const to = process.env.CONTACT_EMAIL_TO;
  if (!to) throw new Error("CONTACT_EMAIL_TO is not set");

  const { data, error } = await getResend().emails.send({
    from: "AKASHIKI Contact <onboarding@resend.dev>",
    to,
    replyTo: email,
    subject: `【お問い合わせ】${name}`,
    text: [
      `氏名: ${name}`,
      `メールアドレス: ${email}`,
      `ご予算: ${budget || "未選択"}`,
      `ご希望納期: ${deadline || "未選択"}`,
      ``,
      `--- ご相談内容 ---`,
      message,
    ].join("\n"),
  });

  if (error) throw error;
  return data;
}
