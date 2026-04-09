import { prisma } from "@/lib/prisma";
import CampaignForm from "@/components/CampaignForm";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function NewCampaignPage() {
  const contacts = await prisma.contact.findMany({
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  return (
    <div className="p-6 max-w-screen-xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/campaigns"
          className="p-2 rounded-lg hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Neue Kampagne</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Erstellen Sie eine Massen-Nachricht für Ihre Kontakte
          </p>
        </div>
      </div>

      <CampaignForm contacts={contacts} />
    </div>
  );
}
