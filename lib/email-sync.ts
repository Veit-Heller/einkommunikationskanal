import { prisma } from "@/lib/prisma";

// ─── Token refresh helpers ────────────────────────────────────────────────────

export async function getValidGoogleToken(): Promise<{
  token: string;
  cfg: Record<string, string>;
  ownEmail: string;
} | null> {
  const integration = await prisma.integration.findUnique({ where: { type: "google" } });
  if (!integration?.accessToken) return null;

  const cfg = integration.config
    ? (JSON.parse(integration.config) as Record<string, string>)
    : {};

  let accessToken = integration.accessToken;
  const isExpired = integration.expiresAt && integration.expiresAt < new Date();

  if (isExpired && cfg.refreshToken) {
    try {
      const res = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id:     process.env.GOOGLE_CLIENT_ID!,
          client_secret: process.env.GOOGLE_CLIENT_SECRET!,
          refresh_token: cfg.refreshToken,
          grant_type:    "refresh_token",
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json() as { access_token: string; expires_in: number };
      const expiresAt = new Date(Date.now() + data.expires_in * 1000);
      await prisma.integration.update({
        where: { type: "google" },
        data: {
          accessToken: data.access_token,
          expiresAt,
          config: JSON.stringify({ ...cfg }),
        },
      });
      accessToken = data.access_token;
    } catch (e) {
      console.error("[email-sync] Google token refresh failed:", e);
      return null;
    }
  }

  return { token: accessToken, cfg, ownEmail: cfg.email || "" };
}

export async function getValidOutlookToken(): Promise<{
  token: string;
  cfg: Record<string, string>;
  ownEmail: string;
} | null> {
  const integration = await prisma.integration.findUnique({ where: { type: "outlook" } });
  if (!integration?.accessToken) return null;

  const cfg = integration.config
    ? (JSON.parse(integration.config) as Record<string, string>)
    : {};

  let accessToken = integration.accessToken;
  const isExpired = integration.expiresAt && integration.expiresAt < new Date();

  if (isExpired && cfg.refreshToken) {
    try {
      const tenant = process.env.OUTLOOK_TENANT_ID || "common";
      const res = await fetch(
        `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id:     process.env.OUTLOOK_CLIENT_ID!,
            client_secret: process.env.OUTLOOK_CLIENT_SECRET!,
            refresh_token: cfg.refreshToken,
            grant_type:    "refresh_token",
            scope:         "Mail.Send Mail.Read User.Read offline_access",
          }),
        }
      );
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json() as { access_token: string; refresh_token?: string; expires_in: number };
      const expiresAt = new Date(Date.now() + data.expires_in * 1000);
      const newCfg = { ...cfg, refreshToken: data.refresh_token ?? cfg.refreshToken };
      await prisma.integration.update({
        where: { type: "outlook" },
        data: { accessToken: data.access_token, expiresAt, config: JSON.stringify(newCfg) },
      });
      accessToken = data.access_token;
    } catch (e) {
      console.error("[email-sync] Outlook token refresh failed:", e);
      return null;
    }
  }

  return { token: accessToken, cfg, ownEmail: cfg.email || "" };
}

// ─── Single message processors ────────────────────────────────────────────────

export async function saveGmailMessage(
  id: string,
  accessToken: string,
  ownEmail: string
): Promise<boolean> {
  const exists = await prisma.message.findFirst({ where: { externalId: id, channel: "email" } });
  if (exists) return false;

  const msgRes = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!msgRes.ok) return false;

  const msg = await msgRes.json() as {
    id: string;
    internalDate: string;
    payload: {
      headers: { name: string; value: string }[];
      body?: { data?: string };
      parts?: { mimeType: string; body?: { data?: string } }[];
    };
  };

  const headers   = msg.payload.headers;
  const fromHdr   = headers.find(h => h.name.toLowerCase() === "from")?.value || "";
  const subj      = headers.find(h => h.name.toLowerCase() === "subject")?.value || "(kein Betreff)";
  const sentAt    = new Date(parseInt(msg.internalDate, 10));

  const senderEmail = (fromHdr.match(/<(.+?)>/) || fromHdr.match(/(\S+@\S+)/))?.[1] || fromHdr.trim();
  if (ownEmail && senderEmail.toLowerCase() === ownEmail.toLowerCase()) return false;

  const contact = await prisma.contact.findFirst({
    where: { email: { equals: senderEmail, mode: "insensitive" } },
  });
  if (!contact) return false;

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
      content:    body.trim() || "(kein Textinhalt)",
      subject:    subj,
      externalId: id,
      status:     "delivered",
      sentAt,
    },
  });
  return true;
}

export async function saveOutlookMessage(
  id: string,
  accessToken: string,
  ownEmail: string
): Promise<boolean> {
  const exists = await prisma.message.findFirst({ where: { externalId: id, channel: "email" } });
  if (exists) return false;

  const msgRes = await fetch(
    `https://graph.microsoft.com/v1.0/me/messages/${id}?$select=id,subject,from,receivedDateTime,body`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Prefer: 'outlook.body-content-type="text"',
      },
    }
  );
  if (!msgRes.ok) return false;

  const msg = await msgRes.json() as {
    id: string;
    subject: string;
    receivedDateTime: string;
    from: { emailAddress: { address: string } };
    body: { content: string };
  };

  const senderEmail = msg.from?.emailAddress?.address || "";
  if (ownEmail && senderEmail.toLowerCase() === ownEmail.toLowerCase()) return false;

  const contact = await prisma.contact.findFirst({
    where: { email: { equals: senderEmail, mode: "insensitive" } },
  });
  if (!contact) return false;

  await prisma.message.create({
    data: {
      contactId:  contact.id,
      channel:    "email",
      direction:  "inbound",
      content:    msg.body?.content?.trim() || "(kein Textinhalt)",
      subject:    msg.subject || "(kein Betreff)",
      externalId: id,
      status:     "delivered",
      sentAt:     new Date(msg.receivedDateTime),
    },
  });
  return true;
}

// ─── Gmail inbox sync (cron fallback) ────────────────────────────────────────

export async function syncGmailInbox(): Promise<number> {
  const auth = await getValidGoogleToken();
  if (!auth) return 0;
  const { token: accessToken, cfg, ownEmail } = auth;

  const since = cfg.lastSyncAt
    ? Math.floor(new Date(cfg.lastSyncAt).getTime() / 1000)
    : Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000);

  const listRes = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(`in:inbox after:${since}`)}&maxResults=50`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!listRes.ok) {
    console.error("[email-sync] Gmail list failed:", await listRes.text());
    return 0;
  }

  const listData = await listRes.json() as { messages?: { id: string }[] };
  const messages = listData.messages || [];
  let saved = 0;

  for (const { id } of messages) {
    if (await saveGmailMessage(id, accessToken, ownEmail)) saved++;
  }

  const now = new Date().toISOString();
  const integration = await prisma.integration.findUnique({ where: { type: "google" } });
  const freshCfg = integration?.config ? JSON.parse(integration.config) : cfg;
  await prisma.integration.update({
    where: { type: "google" },
    data: { config: JSON.stringify({ ...freshCfg, lastSyncAt: now }) },
  });

  return saved;
}

// ─── Outlook inbox sync (cron fallback) ──────────────────────────────────────

export async function syncOutlookInbox(): Promise<number> {
  const auth = await getValidOutlookToken();
  if (!auth) return 0;
  const { token: accessToken, cfg, ownEmail } = auth;

  const sinceDate = cfg.lastSyncAt
    ? new Date(cfg.lastSyncAt).toISOString()
    : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const filter = `receivedDateTime ge ${sinceDate}`;
  const url    = `https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages?$filter=${encodeURIComponent(filter)}&$top=50&$orderby=receivedDateTime desc&$select=id,subject,from,receivedDateTime,body`;

  const listRes = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}`, Prefer: 'outlook.body-content-type="text"' },
  });
  if (!listRes.ok) {
    console.error("[email-sync] Outlook list failed:", await listRes.text());
    return 0;
  }

  const listData = await listRes.json() as { value?: { id: string }[] };
  let saved = 0;

  for (const { id } of listData.value || []) {
    if (await saveOutlookMessage(id, accessToken, ownEmail)) saved++;
  }

  const now = new Date().toISOString();
  const integration = await prisma.integration.findUnique({ where: { type: "outlook" } });
  const freshCfg = integration?.config ? JSON.parse(integration.config) : cfg;
  await prisma.integration.update({
    where: { type: "outlook" },
    data: { config: JSON.stringify({ ...freshCfg, lastSyncAt: now }) },
  });

  return saved;
}
