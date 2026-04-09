const GMAIL_API_BASE = "https://gmail.googleapis.com/gmail/v1";

export interface GmailEmail {
  subject: string;
  body: string;
  to: string[];
  cc?: string[];
}

export interface TokenData {
  accessToken: string;
  refreshToken?: string;
  expiresAt: Date;
}

function getAuthConfig() {
  const clientId = process.env.GMAIL_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET;
  const redirectUri = process.env.GMAIL_REDIRECT_URI;

  if (!clientId || !clientSecret) {
    throw new Error(
      "Gmail nicht konfiguriert. Bitte GMAIL_CLIENT_ID und GMAIL_CLIENT_SECRET setzen."
    );
  }

  return { clientId, clientSecret, redirectUri };
}

export function getGmailAuthUrl(): string {
  const { clientId, redirectUri } = getAuthConfig();

  const scopes = [
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/userinfo.email",
  ].join(" ");

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri || "",
    response_type: "code",
    scope: scopes,
    access_type: "offline",
    prompt: "consent",
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export async function exchangeCodeForToken(code: string): Promise<TokenData> {
  const { clientId, clientSecret, redirectUri } = getAuthConfig();

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri || "",
      grant_type: "authorization_code",
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Token-Austausch fehlgeschlagen: ${error.error_description || error.error}`);
  }

  const data = await response.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: new Date(Date.now() + data.expires_in * 1000),
  };
}

export async function refreshAccessToken(refreshToken: string): Promise<TokenData> {
  const { clientId, clientSecret } = getAuthConfig();

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Token-Erneuerung fehlgeschlagen: ${error.error_description || error.error}`);
  }

  const data = await response.json();
  return {
    accessToken: data.access_token,
    refreshToken: refreshToken, // Google only sends new refresh_token on first auth
    expiresAt: new Date(Date.now() + data.expires_in * 1000),
  };
}

// Build RFC 2822 email and base64url encode it for the Gmail API
function buildRawEmail(email: GmailEmail): string {
  const to = email.to.join(", ");
  const cc = email.cc?.join(", ");

  const lines = [
    `To: ${to}`,
    cc ? `Cc: ${cc}` : null,
    `Subject: ${email.subject}`,
    "MIME-Version: 1.0",
    'Content-Type: text/html; charset="UTF-8"',
    "",
    email.body,
  ].filter((l) => l !== null);

  const raw = lines.join("\r\n");
  // base64url encode
  return Buffer.from(raw)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export async function sendEmail(accessToken: string, email: GmailEmail): Promise<void> {
  const response = await fetch(`${GMAIL_API_BASE}/users/me/messages/send`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ raw: buildRawEmail(email) }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(
      `E-Mail senden fehlgeschlagen: ${error.error?.message || response.statusText}`
    );
  }
}

export async function getMessagesForEmail(
  accessToken: string,
  emailAddress: string
): Promise<Array<{ id: string; subject: string; snippet: string; date: string; from: string }>> {
  // Search for messages from/to the email address
  const query = encodeURIComponent(`from:${emailAddress} OR to:${emailAddress}`);
  const listRes = await fetch(
    `${GMAIL_API_BASE}/users/me/messages?q=${query}&maxResults=50`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!listRes.ok) return [];

  const listData = await listRes.json();
  const messages = listData.messages || [];

  // Fetch details for each message (limit to 20 for performance)
  const details = await Promise.all(
    messages.slice(0, 20).map(async (m: { id: string }) => {
      const res = await fetch(
        `${GMAIL_API_BASE}/users/me/messages/${m.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (!res.ok) return null;
      const data = await res.json();
      const headers = data.payload?.headers || [];
      const get = (name: string) =>
        headers.find((h: { name: string; value: string }) => h.name === name)?.value || "";

      return {
        id: data.id,
        subject: get("Subject"),
        snippet: data.snippet || "",
        date: get("Date"),
        from: get("From"),
      };
    })
  );

  return details.filter(Boolean) as Array<{
    id: string;
    subject: string;
    snippet: string;
    date: string;
    from: string;
  }>;
}

export function isGmailConfigured(): boolean {
  return !!(process.env.GMAIL_CLIENT_ID && process.env.GMAIL_CLIENT_SECRET);
}
