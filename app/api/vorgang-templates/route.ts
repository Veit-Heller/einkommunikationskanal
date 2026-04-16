import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const DEFAULT_TEMPLATES = [
  {
    name: "Kfz-Schadensfall",
    category: "schaden",
    description: "Für die Schadensmeldung benötige ich folgende Unterlagen von Ihnen.",
    checklist: JSON.stringify([
      { label: "Fotos vom Schaden" },
      { label: "KFZ-Schein (Zulassungsbescheinigung Teil I)" },
      { label: "Führerschein" },
      { label: "Unfallbericht / Schadensschilderung" },
      { label: "Polizeibericht (falls vorhanden)" },
      { label: "Angaben zur gegnerischen Versicherung (falls vorhanden)" },
    ]),
    sortOrder: 1,
  },
  {
    name: "Neuvertrag Lebensversicherung",
    category: "neuvertrag",
    description: "Zur Beantragung Ihrer Lebensversicherung werden folgende Unterlagen benötigt.",
    checklist: JSON.stringify([
      { label: "Ausweiskopie (Vorder- und Rückseite)" },
      { label: "Gesundheitsfragen ausgefüllt und unterschrieben" },
      { label: "SEPA-Mandat" },
      { label: "Vorversicherungsnachweis (falls vorhanden)" },
    ]),
    sortOrder: 2,
  },
  {
    name: "Neuvertrag Haftpflicht",
    category: "neuvertrag",
    description: "Für den Abschluss Ihrer Haftpflichtversicherung benötige ich folgende Unterlagen.",
    checklist: JSON.stringify([
      { label: "Ausweiskopie" },
      { label: "SEPA-Mandat" },
      { label: "Vorversicherungsnachweis (falls vorhanden)" },
    ]),
    sortOrder: 3,
  },
  {
    name: "Berufsunfähigkeitsversicherung",
    category: "neuvertrag",
    description: "Für Ihre Berufsunfähigkeitsversicherung werden diese Unterlagen benötigt.",
    checklist: JSON.stringify([
      { label: "Ausweiskopie" },
      { label: "Gesundheitsfragen ausgefüllt und unterschrieben" },
      { label: "Einkommensnachweis (letzter Steuerbescheid)" },
      { label: "SEPA-Mandat" },
      { label: "Arztberichte (falls vorhanden)" },
    ]),
    sortOrder: 4,
  },
  {
    name: "Jahresgespräch",
    category: "service",
    description: "Im Rahmen unseres Jahresgesprächs würde ich gerne Ihre aktuellen Versicherungen überprüfen.",
    checklist: JSON.stringify([
      { label: "Aktuelle Versicherungspolicen" },
      { label: "Meldung von Änderungen (Adresse, Familienstand, Beruf)" },
      { label: "Fragen und Anliegen für das Gespräch" },
    ]),
    sortOrder: 5,
  },
  {
    name: "Hausrat- / Wohngebäudeversicherung",
    category: "neuvertrag",
    description: "Für Ihre Wohnversicherung benötige ich folgende Angaben und Unterlagen.",
    checklist: JSON.stringify([
      { label: "Wohnfläche in m²" },
      { label: "Fotos der Wohnung / des Hauses" },
      { label: "Vorversicherungsnachweis" },
      { label: "SEPA-Mandat" },
      { label: "Baujahr des Gebäudes" },
    ]),
    sortOrder: 6,
  },
];

async function seedDefaultTemplates() {
  const existingCount = await prisma.vorgangTemplate.count({
    where: { isDefault: true },
  });

  if (existingCount > 0) return;

  await prisma.vorgangTemplate.createMany({
    data: DEFAULT_TEMPLATES.map(t => ({ ...t, isDefault: true })),
    skipDuplicates: true,
  });
}

export async function GET() {
  try {
    await seedDefaultTemplates();

    const templates = await prisma.vorgangTemplate.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });

    return NextResponse.json({ templates });
  } catch (error) {
    console.error("GET /api/vorgang-templates error:", error);
    return NextResponse.json({ error: "Fehler beim Laden der Templates" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, category, description, checklist } = body;

    if (!name) {
      return NextResponse.json({ error: "Name ist erforderlich" }, { status: 400 });
    }

    const template = await prisma.vorgangTemplate.create({
      data: {
        name,
        category: category || "sonstiges",
        description: description || null,
        checklist: checklist ? JSON.stringify(checklist) : "[]",
        isDefault: false,
      },
    });

    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    console.error("POST /api/vorgang-templates error:", error);
    return NextResponse.json({ error: "Fehler beim Erstellen" }, { status: 500 });
  }
}
