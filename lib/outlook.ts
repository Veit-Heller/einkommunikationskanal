const GRAPH_API_BASE = "https://graph.microsoft.com/v1.0";

export interface OutlookEmail {
  subject: string;
  body: string;
  to: string[];
  cc?: string[];
}

export interface GraphMessage {
  id: string;
  subject: string;
  bodyPreview: string;
  body: {
    contentType: string;
    content: string;
  };
  from: {
    emailAddress: {
      address: string;
      name: string;
    };
  };
  toRecipients: Array<{
    emailAddress: {
      address: string;
      name: string;
    };
  }>;
  receivedDateTime: string;
  sentDateTime: string;
  isRead: boolean;
}

export interface TokenData {
  accessToken: string;
  refreshToken?: string;
  expiresAt: Date;
}

function getAuthConfig() {
  const clientId = process.env.OUTLOOK_CLIENT_ID;
  const clientSecret = process.env.OUTLOOK_CLIENT_SECRET;
  const tenantId = process.env.OUTLOOK_TENANT_ID || "common";
  const redirectUri = process.env.OUTLOOK_REDIRECT_URI;

  if (!clientId || !clientSecret) {
    throw new Error(
      "Outlook nicht konfiguriert. Bitte OUTLOOK_CLIENT_ID und OUTLOOK_CLIENT_SECRET setzen."
    );
  }

  return { clientId, clientSecret, tenantId, redirectUri };
}

export function getOutlookAuthUrl(): string {
  const { clientId, tenantId, redirectUri } = getAuthConfig();
  const scopes = [
    "https://graph.microsoft.com/Mail.Read",
    "https://graph.microsoft.com/Mail.Send",
    "https://graph.microsoft.com/User.Read",
    "offline_access",
  ].join(" ");

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri || "",
    scope: scopes,
    response_mode: "query",
  });

  return `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?${params}`;
}

export async function exchangeCodeForToken(
  code: string
): Promise<TokenData> {
  const { clientId, clientSecret, tenantId, redirectUri } = getAuthConfig();

  const response = await fetch(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri || "",
        grant_type: "authorization_code",
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Token-Austausch fehlgeschlagen: ${error.error_description}`);
  }

  const data = await response.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: new Date(Date.now() + data.expires_in * 1000),
  };
}

export async function refreshAccessToken(
  refreshToken: string
): Promise<TokenData> {
  const { clientId, clientSecret, tenantId } = getAuthConfig();

  const response = await fetch(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
        scope: "https://graph.microsoft.com/Mail.Read https://graph.microsoft.com/Mail.Send offline_access",
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Token-Erneuerung fehlgeschlagen: ${error.error_description}`);
  }

  const data = await response.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || refreshToken,
    expiresAt: new Date(Date.now() + data.expires_in * 1000),
  };
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
        body: {
          contentType: "HTML",
          content: email.body,
        },
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

export async function listMessages(
  accessToken: string,
  filter?: string,
  top = 50
): Promise<GraphMessage[]> {
  const params = new URLSearchParams({
    $top: String(top),
    $orderby: "receivedDateTime desc",
    $select:
      "id,subject,bodyPreview,body,from,toRecipients,receivedDateTime,sentDateTime,isRead",
  });

  if (filter) {
    params.set("$filter", filter);
  }

  const response = await fetch(
    `${GRAPH_API_BASE}/me/messages?${params}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(
      `Nachrichten laden fehlgeschlagen: ${error.error?.message || response.statusText}`
    );
  }

  const data = await response.json();
  return data.value || [];
}

export async function getMessagesByEmail(
  accessToken: string,
  emailAddress: string
): Promise<GraphMessage[]> {
  const filter = `from/emailAddress/address eq '${emailAddress}' or toRecipients/any(r: r/emailAddress/address eq '${emailAddress}')`;
  return listMessages(accessToken, filter);
}

export function isOutlookConfigured(): boolean {
  return !!(process.env.OUTLOOK_CLIENT_ID && process.env.OUTLOOK_CLIENT_SECRET);
}
