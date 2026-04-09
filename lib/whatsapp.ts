const GRAPH_API_BASE = "https://graph.facebook.com/v19.0";

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

function getConfig() {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

  if (!phoneNumberId || !accessToken) {
    throw new Error(
      "WhatsApp nicht konfiguriert. Bitte WHATSAPP_PHONE_NUMBER_ID und WHATSAPP_ACCESS_TOKEN setzen."
    );
  }

  return { phoneNumberId, accessToken };
}

export async function sendWhatsAppTextMessage(
  to: string,
  text: string
): Promise<{ messageId: string }> {
  const { phoneNumberId, accessToken } = getConfig();

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
    throw new Error(
      `WhatsApp API Fehler: ${error.error?.message || response.statusText}`
    );
  }

  const data = await response.json();
  return { messageId: data.messages?.[0]?.id || "" };
}

export async function sendWhatsAppTemplate(
  msg: WhatsAppTemplateMessage
): Promise<{ messageId: string }> {
  const { phoneNumberId, accessToken } = getConfig();

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

export function isWhatsAppConfigured(): boolean {
  return !!(
    process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_ACCESS_TOKEN
  );
}
