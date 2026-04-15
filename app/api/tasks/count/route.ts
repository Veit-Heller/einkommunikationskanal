import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const now = new Date();
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const count = await prisma.followUp.count({
      where: {
        completed: false,
        dueDate: { lte: endOfToday },
      },
    });

    return NextResponse.json({ count });
  } catch (error) {
    console.error("GET /api/tasks/count error:", error);
    return NextResponse.json({ count: 0 });
  }
}
