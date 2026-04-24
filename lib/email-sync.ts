import { prisma } from "@/lib/prisma";

// ─── Token refresh helpers ────────────────────────────────────────────────────

async function refreshGoogleToken(refreshToken: string): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id:     process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type:    "refresh_token",
    }),
  });
  if (!res.ok) throw new Error(`Google token refresh failed: ${await res.text()}`);
  const data = await res.json() as { access_token: string; expires_in: number };

  const expiresAt = new Date(Date.now() + data.expires_in * 1000);
  const integration = await prisma.integration.findUnique({ where: { type: "google" } });
  const cfg = integration?.config ? JSON.parse(integration.config) : {};
  await prisma.integration.update({
    where: { type: "google" },
    data: {
      accessToken: data.access_token,
      expiresAt,
      config: JSON.stringify({ ...cfg, refreshToken }),
    },
  });
  return data.access_token;
}

async function refreshOutlookToken(refreshToken: string): Promise<string> {
  const tenant = process.env.OUTLOOK_TENANT_ID || "common";
  const res = await fetch(
    `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id:     process.env.OUTLOOK_CLIENT_ID!,
        client_secret: process.env.OUTLOOK_CLIENT_SECRET!,
        refresh_token: refreshToken,
        grant_type:    "refresh_token",
        scope:         "Mail.Send Mail.Read User.Read offline_access",
      }),
    }
  );
  if (!res.ok) throw new Error(`Outlook token refresh failed: ${await res.text()}`);
  const data = await res.json() as { access_token: string; refresh_token?: string; expires_in: number };

  const expiresAt = new Date(Date.now() + data.expires_in * 1000);
  const integration = await prisma.integration.findUnique({ where: { type: "outlook" } });
  const cfg = integration?.config ? JSON.parse(integration.config) : {};
  await prisma.integration.update({
    where: { type: "outlook" },
    data: {
      accessToken: data.access_token,
      expiresAt,
      config: JSON.stringify({
        ...cfg,
        refreshToken: data.refresh_token ?? refreshToken,
      }),
    },
  });
  return data.access_token;
}

// ─── Gmail inbox sync ─────────────────────────────────────────────────────────

export async function syncGmailInbox(): Promise<number> {
  const integration = await prisma.integration.findUnique({ where: { type: "google" } });
  if (!integration?.accessToken) return 0;

  const cfg = integration.config ? JSON.parse(integration.config) as {
    refreshToken?: string;
    email?: string;
    lastSyncAt?: string;
  } : {};

  // Get a valid access token
  let accessToken = integration.accessToken;
  const isExpired  = integration.expiresAt && integration.expiresAt < new Date();
  if (isExpired && cfg.refreshToken) {
    try {
      accessToken = await refreshGoogleToken(cfg.refreshToken);
    } catch (e) {
      console.error("[email-sync] Gmail token refresh failed:", e);
      return 0;
    }
  }

  // Build query: messages received after lastSyncAt (or last 30 days)
  const since   = cfg.lastSyncAt
    ? Math.floor(new Date(cfg.lastSyncAt).getTime() / 1000)
    : Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000);
  const ownEmail = cfg.email || "";
  const query    = `in:inbox after:${since}`;

  const listRes = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=50`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!listRes.ok) {
    console.error("[email-sync] Gmail list failed:", await listRes.text());
    return 0;
  }

  const listData = await listRes.json() as { messages?: { id: string }[] };
  const messages = listData.messages || [];

  let saved = 0;
  const now  = new Date().toISOString();

  for (const { id } of messages) {
    // Skip if already stored
    const exists = await prisma.message.findFirst({ where: { externalId: id, channel: "email" } });
    if (exists) continue;

    // Fetch full message
    const msgRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!msgRes.ok) continue;

    const msg = await msgRes.json() as {
      id: string;
      internalDate: string;
      payload: {
        headers: { name: string; value: string }[];
        body?: { data?: string };
        parts?: { mimeType: string; body?: { data?: string } }[];
      };
    };

    const headers = msg.payload.headers;
    const fromHdr  = headers.find(h => h.name.toLowerCase() === "from")?.value || "";
    const subj     = headers.find(h => h.name.toLowerCase() === "subject")?.value || "(kein Betreff)";
    const dateMsec = parseInt(msg.internalDate, 10);
    const sentAt   = new Date(dateMsec);

    // Extract sender email
    const senderEmail = (fromHdr.match(/<(.+?)>/) || fromHdr.match(/(\S+@\S+)/))?.[1]
      || fromHdr.trim();

    // Skip our own outbound messages
    if (ownEmail && senderEmail.toLowerCase() === ownEmail.toLowerCase()) continue;

    // Match sender to a contact
    const contact = await prisma.contact.findFirst({
      where: { email: { equals: senderEmail, mode: "insensitive" } },
    });
    if (!contact) continue;

    // Extract plain-text body
    let body = "";
    if (msg.payload.body?.data) {
      body = Buffer.from(msg.payload.body.data, "base64url").toString("utf-8");
    } else if (msg.payload.parts) {
      const textPart = msg.payload.parts.find(p => p.mimeType === "text/plain");
      if (textPart?.body?.data) {
        body = Buffer.from(textPart.body.data, "base64url").toString("utf-8");
      }
    }

    await prisma.message.create({
      data: {
        contactId:  contact.id,
        channel:    "email",
        direction:  "inbound",
        content:    body.trim() || "(keine Textinhalt)",
        subject:    subj,
        externalId: id,
        status:     "delivered",
        sentAt,
      },
    });
    saved++;
  }

  // Update lastSyncAt
  await prisma.integration.update({
    where: { type: "google" },
    data: { config: JSON.stringify({ ...cfg, lastSyncAt: now }) },
  });

  return saved;
}

// ─── Outlook inbox sync ───────────────────────────────────────────────────────

export async function syncOutlookInbox(): Promise<number> {
  const integration = await prisma.integration.findUnique({ where: { type: "outlook" } });
  if (!integration?.accessToken) return 0;

  const cfg = integration.config ? JSON.parse(integration.config) as {
    refreshToken?: string;
    email?: string;
    lastSyncAt?: string;
  } : {};

  // Get a valid access token
  let accessToken = integration.accessToken;
  const isExpired  = integration.expiresAt && integration.expiresAt < new Date();
  if (isExpired && cfg.refreshToken) {
    try {
      accessToken = await refreshOutlookToken(cfg.refreshToken);
    } catch (e) {
      console.error("[email-sync] Outlook token refresh failed:", e);
      return 0;
    }
  }

  const ownEmail  = cfg.email || "";
  const sinceDate = cfg.lastSyncAt
    ? new Date(cfg.lastSyncAt).toISOString()
    : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const now = new Date().toISOString();

  // Fetch inbox messages received after sinceDate
  const filter = `receivedDateTime ge ${sinceDate}`;
  const url    = `https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages?$filter=${encodeURIComponent(filter)}&$top=50&$orderby=receivedDateTime desc&$select=id,subject,from,receivedDateTime,body`;

  const listRes = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}`, Prefer: 'outlook.body-content-type="text"' },
  });

  if (!listRes.ok) {
    console.error("[email-sync] Outlook list failed:", await listRes.text());
    return 0;
  }

  const listData = await listRes.json() as {
    value?: {
      id: string;
      subject: string;
      receivedDateTime: string;
      from: { emailAddress: { address: string } };
      body: { content: string };
    }[];
  };

  const messages = listData.value || [];
  let saved = 0;

  for (const msg of messages) {
    // Skip if already stored
    const exists = await prisma.message.findFirst({ where: { externalId: msg.id, channel: "email" } });
    if (exists) continue;

    const senderEmail = msg.from?.emailAddress?.address || "";

    // Skip our own outbound messages
    if (ownEmail && senderEmail.toLowerCase() === ownEmail.toLowerCase()) continue;

    // Match sender to a contact
    const contact = await prisma.contact.findFirst({
      where: { email: { equals: senderEmail, mode: "insensitive" } },
    });
    if (!contact) continue;

    await prisma.message.create({
      data: {
        contactId:  contact.id,
        channel:    "email",
        direction:  "inbound",
        content:    msg.body?.content?.trim() || "(keine Textinhalt)",
        subject:    msg.subject || "(kein Betreff)",
        externalId: msg.id,
        status:     "delivered",
        sentAt:     new Date(msg.receivedDateTime),
      },
    });
    saved++;
  }

  // Update lastSyncAt
  await prisma.integration.update({
    where: { type: "outlook" },
    data: { config: JSON.stringify({ ...cfg, lastSyncAt: now }) },
  });

  return saved;
}
