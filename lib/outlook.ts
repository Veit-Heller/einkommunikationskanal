const GRAPH_API_BASE = "https://graph.microsoft.com/v1.0";

export interface OutlookEmail {
  subject: string;
  body: string;
  to: string[];
  cc?: string[];
}

export async function sendEmail(
  accessToken: string,
  email: OutlookEmail
): Promise<void> {
  const response = await fetch(`${GRAPH_API_BASE}/me/sendMail`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      message: {
        subject: email.subject,
        body: { contentType: "HTML", content: email.body },
        toRecipients: email.to.map((addr) => ({
          emailAddress: { address: addr },
        })),
        ccRecipients: (email.cc || []).map((addr) => ({
          emailAddress: { address: addr },
        })),
      },
      saveToSentItems: true,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(
      `E-Mail senden fehlgeschlagen: ${error.error?.message || response.statusText}`
    );
  }
}

export function isOutlookConfigured(): boolean {
  return !!(process.env.OUTLOOK_CLIENT_ID && process.env.OUTLOOK_CLIENT_SECRET);
}
