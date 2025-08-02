import Link from "next/link";
import VoiceTonUI from "@/components/VoiceTonUI";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
      <h1 className="text-4xl font-bold mb-4">VoiceTon – Convert voice to CRM</h1>
      <p className="text-lg mb-6 max-w-xl">
        VoiceTon lets you capture leads by voice and push them directly into HubSpot – fast, easy, and accurate.
      </p>

      {/* ✅ Lien OAuth corrigé sans "contacts" */}
      <a
        href="https://app.hubspot.com/oauth/authorize?client_id=c65190d1-8aa0-4a0c-bbef-4881c1969c18&scope=crm.objects.contacts.write%20crm.objects.contacts.read&redirect_uri=https://voiceton.fr/api/hubspot/callback"
        target="_blank"
        className="bg-black text-white px-6 py-3 rounded-lg text-lg mb-4 hover:opacity-80"
      >
        Connect with HubSpot
      </a>

      {/* 👉 Interface principale */}
      <VoiceTonUI />

      <div className="flex gap-4 text-sm mt-10">
        <Link href="/setup-guide">Setup Guide</Link>
        <Link href="/privacy">Privacy</Link>
        <Link href="/terms">Terms</Link>
        <Link href="/support">Support</Link>
      </div>
    </main>
  );
}
