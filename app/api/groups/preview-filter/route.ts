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
    case "hasPhone": return !!contact.phone === (String(rule.value) === "true");
    case "hasEmail": return !!contact.email === (String(rule.value) === "true");
    default: return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { rules } = await request.json() as { rules: FilterRule[] };
    if (!rules?.length) return NextResponse.json({ matched: 0 });

    const contacts = await prisma.contact.findMany({
      select: { id: true, birthday: true, company: true, phone: true, email: true },
    });

    const matched = contacts.filter((c) => rules.every((r) => matchesRule(c, r))).length;
    return NextResponse.json({ matched });
  } catch (error) {
    console.error("POST /api/groups/preview-filter error:", error);
    return NextResponse.json({ matched: 0 });
  }
}
