export interface ContactWithCustomFields {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  notes: string | null;
  customFields: string | null;
}

export interface ParsedContact extends ContactWithCustomFields {
  parsedCustomFields: Record<string, string>;
  fullName: string;
}

export interface MessageWithContact {
  id: string;
  createdAt: Date;
  contactId: string;
  channel: string;
  direction: string;
  content: string;
  subject: string | null;
  externalId: string | null;
  status: string | null;
  sentAt: Date | null;
}

export interface ImportPreviewRow {
  [key: string]: string;
}

export interface ColumnMapping {
  excelColumn: string;
  crmField: string | "custom" | "skip";
  customFieldName?: string;
}

export const CRM_FIELDS = [
  { value: "firstName", label: "Vorname" },
  { value: "lastName", label: "Nachname" },
  { value: "email", label: "E-Mail" },
  { value: "phone", label: "Telefon/WhatsApp" },
  { value: "company", label: "Unternehmen" },
  { value: "notes", label: "Notizen" },
  { value: "custom", label: "Benutzerdefiniertes Feld" },
  { value: "skip", label: "Überspringen" },
] as const;

export type CrmFieldValue = (typeof CRM_FIELDS)[number]["value"];

export interface CampaignWithContacts {
  id: string;
  createdAt: Date;
  name: string;
  channel: string;
  template: string;
  subject: string | null;
  status: string;
  contacts: Array<{
    id: string;
    status: string;
    sentAt: Date | null;
    contact: {
      id: string;
      firstName: string | null;
      lastName: string | null;
      email: string | null;
      phone: string | null;
    };
  }>;
}
