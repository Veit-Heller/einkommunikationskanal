import nodemailer from "nodemailer";

export interface GmailEmail {
  subject: string;
  body: string;
  to: string[];
}

export async function sendEmail(email: GmailEmail): Promise<void> {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASSWORD;

  if (!user || !pass) {
    throw new Error(
      "Gmail nicht konfiguriert. Bitte EMAIL_USER und EMAIL_PASSWORD in Vercel setzen."
    );
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });

  await transporter.sendMail({
    from: user,
    to: email.to.join(", "),
    subject: email.subject,
    html: email.body,
  });
}

export function isGmailConfigured(): boolean {
  return !!(process.env.EMAIL_USER && process.env.EMAIL_PASSWORD);
}
