/**
 * lib/automation-templates.ts
 * Default WhatsApp/email message templates.
 * Kept in a separate file so client components can import them
 * without pulling in Node.js-only dependencies (nodemailer, fs, etc.).
 */

export const DEFAULT_TEMPLATES = {
  portalLink: [
    "Hallo {{vorname}},",
    "",
    "für *{{titel}}* habe ich einen sicheren Upload-Link für Sie eingerichtet.",
    "",
    "Bitte laden Sie die benötigten Unterlagen hier hoch:",
    "{{portalLink}}",
    "",
    "Bei Fragen stehe ich jederzeit zur Verfügung.",
    "",
    "{{maklername}}",
  ].join("\n"),

  reminder: [
    "Hallo {{vorname}},",
    "",
    "ich wollte kurz nachhaken — haben Sie die Unterlagen für *{{titel}}* griffbereit?",
    "",
    "Ihr Upload-Link:",
    "{{portalLink}}",
    "",
    "{{maklername}}",
  ].join("\n"),

  partial: [
    "Hallo {{vorname}},",
    "",
    "vielen Dank — wir haben {{uploadedCount}} Datei(en) für *{{titel}}* erhalten.",
    "",
    "Noch fehlende Unterlagen:",
    "{{missingList}}",
    "",
    "Bitte reichen Sie diese über denselben Link nach.",
    "",
    "{{maklername}}",
  ].join("\n"),

  completion: [
    "Hallo {{vorname}},",
    "",
    "vielen Dank! Ich habe alle Unterlagen zu *{{titel}}* erhalten und kümmere mich darum.",
    "",
    "Bei Fragen melden Sie sich gerne.",
    "",
    "Bis bald,",
    "{{maklername}}",
  ].join("\n"),
};

export type TemplateKey = keyof typeof DEFAULT_TEMPLATES;
