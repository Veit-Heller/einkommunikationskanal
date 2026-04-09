export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white py-12 px-6 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Datenschutzerklärung</h1>
      <p className="text-sm text-gray-500 mb-8">Stand: April 2026</p>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-3">1. Verantwortlicher</h2>
        <p className="text-gray-600">
          Verantwortlicher im Sinne der Datenschutz-Grundverordnung (DSGVO) ist der Betreiber dieser
          Anwendung (EinKommunikationsKanal), der für die Verarbeitung personenbezogener Daten
          zuständig ist.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-3">2. Erhobene Daten</h2>
        <p className="text-gray-600 mb-3">Diese Anwendung verarbeitet folgende personenbezogene Daten:</p>
        <ul className="list-disc pl-6 text-gray-600 space-y-1">
          <li>Name, E-Mail-Adresse, Telefonnummer von Kontakten</li>
          <li>Kommunikationsinhalte (WhatsApp-Nachrichten, E-Mails)</li>
          <li>Unternehmenszugehörigkeit und sonstige Kontaktinformationen</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-3">3. Zweck der Verarbeitung</h2>
        <p className="text-gray-600">
          Die Daten werden ausschließlich zur internen Kundenverwaltung (CRM) und zur Abwicklung
          der Geschäftskommunikation verwendet. Eine Weitergabe an Dritte findet nicht statt, außer
          dies ist zur Leistungserbringung technisch notwendig (z.B. Meta Platforms für WhatsApp,
          Microsoft für E-Mail).
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-3">4. Rechtsgrundlage</h2>
        <p className="text-gray-600">
          Die Verarbeitung erfolgt auf Grundlage von Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung)
          sowie Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an der Kundenpflege und
          Geschäftskommunikation).
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-3">5. Speicherdauer</h2>
        <p className="text-gray-600">
          Personenbezogene Daten werden nur so lange gespeichert, wie es für den jeweiligen Zweck
          erforderlich ist oder gesetzliche Aufbewahrungsfristen bestehen.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-3">6. Betroffenenrechte</h2>
        <p className="text-gray-600 mb-3">Sie haben das Recht auf:</p>
        <ul className="list-disc pl-6 text-gray-600 space-y-1">
          <li>Auskunft über gespeicherte Daten (Art. 15 DSGVO)</li>
          <li>Berichtigung unrichtiger Daten (Art. 16 DSGVO)</li>
          <li>Löschung der Daten (Art. 17 DSGVO)</li>
          <li>Einschränkung der Verarbeitung (Art. 18 DSGVO)</li>
          <li>Datenübertragbarkeit (Art. 20 DSGVO)</li>
          <li>Widerspruch gegen die Verarbeitung (Art. 21 DSGVO)</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-3">7. Drittanbieter</h2>
        <p className="text-gray-600">
          Diese Anwendung nutzt die WhatsApp Business API von Meta Platforms Ireland Ltd. sowie
          Microsoft Azure / Outlook für E-Mail-Kommunikation. Diese Dienste unterliegen den
          jeweiligen Datenschutzbestimmungen der Anbieter.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-3">8. Kontakt</h2>
        <p className="text-gray-600">
          Bei Fragen zum Datenschutz wenden Sie sich an den Betreiber dieser Anwendung.
        </p>
      </section>
    </div>
  );
}
