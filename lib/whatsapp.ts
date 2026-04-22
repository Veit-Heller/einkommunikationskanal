import { prisma } from "@/lib/prisma";

const GRAPH_API_BASE = "https://graph.facebook.com/v25.0";

export interface WhatsAppTextMessage {
  to: string;
  text: string;
}

export interface WhatsAppTemplateMessage {
  to: string;
  templateName: string;
  languageCode: string;
  components?: WhatsAppTemplateComponent[];
}

export interface WhatsAppTemplateComponent {
  type: "body" | "header" | "button";
  parameters: WhatsAppTemplateParameter[];
}

export interface WhatsAppTemplateParameter {
  type: "text" | "image" | "document";
  text?: string;
}

export interface WhatsAppWebhookPayload {
  object: string;
  entry: WhatsAppEntry[];
}

export interface WhatsAppEntry {
  id: string;
  changes: WhatsAppChange[];
}

export interface WhatsAppChange {
  value: WhatsAppValue;
  field: string;
}

export interface WhatsAppValue {
  messaging_product: string;
  metadata: {
    display_phone_number: string;
    phone_number_id: string;
  };
  contacts?: Array<{
    profile: { name: string };
    wa_id: string;
  }>;
  messages?: WhatsAppIncomingMessage[];
  statuses?: WhatsAppStatus[];
}

export interface WhatsAppIncomingMessage {
  from: string;
  id: string;
  timestamp: string;
  type: string;
  text?: { body: string };
  image?: { id: string; mime_type: string; sha256: string; caption?: string };
  document?: { filename: string; id: string; mime_type: string };
}

export interface WhatsAppStatus {
  id: string;
  status: "sent" | "delivered" | "read" | "failed";
  timestamp: string;
  recipient_id: string;
}

/** Liest WhatsApp-Konfiguration: zuerst Env-Vars, dann DB-Fallback. */
async function getConfig(): Promise<{ phoneNumberId: string; accessToken: string }> {
  // DB hat immer Vorrang (OAuth-Token), Env-Vars nur als Fallback
  let phoneNumberId: string | undefined;
  let accessToken:   string | undefined;

  try {
    const row = await prisma.integration.findUnique({ where: { type: "whatsapp" } });
    if (row) {
      accessToken   = row.accessToken   ?? undefined;
      const cfg     = row.config ? JSON.parse(row.config) as { phoneNumberId?: string } : {};
      phoneNumberId = cfg.phoneNumberId ?? undefined;
    }
  } catch { /* ignorieren */ }

  // Env-Vars als Fallback wenn DB leer
  phoneNumberId = phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID;
  accessToken   = accessToken   || process.env.WHATSAPP_ACCESS_TOKEN;

  if (!phoneNumberId || !accessToken) {
    throw new Error(
      "WhatsApp nicht konfiguriert. Bitte unter Einstellungen → WhatsApp konfigurieren."
    );
  }

  return { phoneNumberId, accessToken };
}

export async function sendWhatsAppTextMessage(
  to: string,
  text: string
): Promise<{ messageId: string }> {
  const { phoneNumberId, accessToken } = await getConfig();

  const response = await fetch(
    `${GRAPH_API_BASE}/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "text",
        text: { body: text },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    console.error("WhatsApp API error:", JSON.stringify(error));
    console.error("WhatsApp phoneNumberId used:", phoneNumberId);
    throw new Error(
      `WhatsApp API Fehler: ${error.error?.message || response.statusText} (Code: ${error.error?.code ?? "?"})`
    );
  }

  const data = await response.json();
  return { messageId: data.messages?.[0]?.id || "" };
}

export async function sendWhatsAppTemplate(
  msg: WhatsAppTemplateMessage
): Promise<{ messageId: string }> {
  const { phoneNumberId, accessToken } = await getConfig();

  const response = await fetch(
    `${GRAPH_API_BASE}/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: msg.to,
        type: "template",
        template: {
          name: msg.templateName,
          language: { code: msg.languageCode },
          components: msg.components || [],
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(
      `WhatsApp Template Fehler: ${error.error?.message || response.statusText}`
    );
  }

  const data = await response.json();
  return { messageId: data.messages?.[0]?.id || "" };
}

export function parseWhatsAppWebhook(payload: WhatsAppWebhookPayload): Array<{
  from: string;
  messageId: string;
  timestamp: Date;
  content: string;
  type: string;
}> {
  const messages: Array<{
    from: string;
    messageId: string;
    timestamp: Date;
    content: string;
    type: string;
  }> = [];

  for (const entry of payload.entry || []) {
    for (const change of entry.changes || []) {
      if (change.field !== "messages") continue;

      for (const msg of change.value.messages || []) {
        let content = "";

        if (msg.type === "text" && msg.text) {
          content = msg.text.body;
        } else if (msg.type === "image") {
          content = "[Bild empfangen]";
        } else if (msg.type === "document") {
          content = `[Dokument: ${msg.document?.filename || "unbekannt"}]`;
        } else {
          content = `[${msg.type} Nachricht]`;
        }

        messages.push({
          from: msg.from,
          messageId: msg.id,
          timestamp: new Date(parseInt(msg.timestamp) * 1000),
          content,
          type: msg.type,
        });
      }
    }
  }

  return messages;
}

export async function sendWhatsAppDocument(
  to: string,
  documentUrl: string,
  filename: string,
  caption?: string
): Promise<string> {
  const { phoneNumberId, accessToken } = await getConfig();

  const res = await fetch(
    `${GRAPH_API_BASE}/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "document",
        document: {
          link: documentUrl,
          filename,
          ...(caption ? { caption } : {}),
        },
      }),
    }
  );

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error?.message || "WhatsApp document send failed");
  }
  return data.messages?.[0]?.id ?? "";
}

/** Sync-Check nur auf Basis von Env-Vars (für schnelle Guards in nicht-async Kontexten). */
export function isWhatsAppConfiguredSync(): boolean {
  return !!(process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_ACCESS_TOKEN);
}

/** Vollständiger Check: Env-Vars ODER DB-Konfiguration vorhanden. */
export async function isWhatsAppConfigured(): Promise<boolean> {
  if (isWhatsAppConfiguredSync()) return true;
  try {
    const row = await prisma.integration.findUnique({ where: { type: "whatsapp" } });
    if (!row?.accessToken) return false;
    const cfg = row.config ? JSON.parse(row.config) as { phoneNumberId?: string } : {};
    return !!(row.accessToken && cfg.phoneNumberId);
  } catch { return false; }
}

export interface WhatsAppTemplate {
  id: string;
  name: string;
  status: string; // "APPROVED" | "PENDING" | "REJECTED"
  language: string;
  category: string;
  components: WhatsAppTemplateComponent_Meta[];
}

export interface WhatsAppTemplateComponent_Meta {
  type: string; // "HEADER" | "BODY" | "FOOTER" | "BUTTONS"
  text?: string;
  format?: string;
  buttons?: Array<{ type: string; text: string; url?: string }>;
}

export async function getWhatsAppTemplates(): Promise<WhatsAppTemplate[]> {
  const businessAccountId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

  if (!businessAccountId || !accessToken) {
    throw new Error("WhatsApp nicht konfiguriert");
  }

  const res = await fetch(
    `${GRAPH_API_BASE}/${businessAccountId}/message_templates?fields=id,name,status,language,category,components&limit=50`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || "Fehler beim Laden der Templates");
  }

  const data = await res.json();
  return data.data || [];
}

export async function sendWhatsAppTemplateMessage(
  to: string,
  templateName: string,
  languageCode: string,
  bodyVariables: string[] = []
): Promise<{ messageId: string }> {
  const { phoneNumberId, accessToken } = await getConfig();
  const phoneForApi = to.replace(/^\+/, "");

  const components = bodyVariables.length > 0 ? [
    {
      type: "body",
      parameters: bodyVariables.map(v => ({ type: "text", text: v })),
    },
  ] : [];

  const response = await fetch(
    `${GRAPH_API_BASE}/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: phoneForApi,
        type: "template",
        template: {
          name: templateName,
          language: { code: languageCode },
          components,
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`WhatsApp Template Fehler: ${error.error?.message || response.statusText}`);
  }

  const data = await response.json();
  return { messageId: data.messages?.[0]?.id || "" };
}
