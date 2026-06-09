import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface FilterRule {
  field: "age" | "company" | "hasPhone" | "hasEmail";
  operator: "lt" | "gt" | "between" | "eq" | "contains" | "is";
  value: string | number;
  value2?: number;
}

function calcAge(birthday: Date): number {
  const today = new Date();
  let age = today.getFullYear() - birthday.getFullYear();
  const m = today.getMonth() - birthday.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthday.getDate())) age--;
  return age;
}

function matchesRule(contact: { birthday: Date | null; company: string | null; phone: string | null; email: string | null }, rule: FilterRule): boolean {
  switch (rule.field) {
    case "age": {
      if (!contact.birthday) return false;
      const age = calcAge(contact.birthday);
      if (rule.operator === "lt") return age < Number(rule.value);
      if (rule.operator === "gt") return age > Number(rule.value);
      if (rule.operator === "between") return age >= Number(rule.value) && age <= Number(rule.value2 ?? rule.value);
      if (rule.operator === "eq") return age === Number(rule.value);
      return false;
    }
    case "company": {
      if (!contact.company) return false;
      const cmp = contact.company.toLowerCase();
      const val = String(rule.value).toLowerCase();
      if (rule.operator === "contains") return cmp.includes(val);
      if (rule.operator === "eq") return cmp === val;
      return false;
    }
    case "hasPhone": {
      const has = !!contact.phone;
      return rule.operator === "is" ? has === (rule.value === true || rule.value === "true") : false;
    }
    case "hasEmail": {
      const has = !!contact.email;
      return rule.operator === "is" ? has === (rule.value === true || rule.value === "true") : false;
    }
    default:
      return false;
  }
}

// POST: apply filter rules to find & add matching contacts
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();

    // Accept rules from body (preview mode) or load from group
    let rules: FilterRule[] = body.rules;

    if (!rules) {
      const group = await prisma.contactGroup.findUnique({ where: { id: params.id } });
      if (!group?.filter) return NextResponse.json({ added: 0, matched: 0 });
      rules = JSON.parse(group.filter);
    }

    if (!rules || rules.length === 0) {
      return NextResponse.json({ added: 0, matched: 0 });
    }

    // Fetch all contacts with the fields we need for filtering
    const contacts = await prisma.contact.findMany({
      select: { id: true, birthday: true, company: true, phone: true, email: true },
    });

    // Filter contacts that match ALL rules
    const matching = contacts.filter((c) =>
      rules.every((rule) => matchesRule(c, rule))
    );

    const preview = body.preview === true;
    if (preview) {
      return NextResponse.json({ matched: matching.length });
    }

    if (matching.length === 0) {
      return NextResponse.json({ added: 0, matched: 0 });
    }

    // Also save rules to group
    await prisma.contactGroup.update({
      where: { id: params.id },
      data: { filter: JSON.stringify(rules) },
    });

    // Add matching contacts to group (skip duplicates)
    await prisma.contactsOnGroup.createMany({
      data: matching.map((c) => ({
        contactId: c.id,
        groupId: params.id,
        addedBy: "filter",
      })),
      skipDuplicates: true,
    });

    return NextResponse.json({ added: matching.length, matched: matching.length });
  } catch (error) {
    console.error("POST /api/groups/[id]/apply error:", error);
    return NextResponse.json({ error: "Fehler beim Anwenden" }, { status: 500 });
  }
}
