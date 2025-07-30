export default function SetupGuide() {
    return (
      <main className="min-h-screen p-8 max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Setup Guide – VoiceTon</h1>
        <ol className="list-decimal pl-6 space-y-4 text-lg">
          <li>Click “Connect with HubSpot” on the homepage to authorize VoiceTon.</li>
          <li>Grant access to the requested scopes (contacts and CRM objects).</li>
          <li>Once connected, you’ll be redirected to the voice interface to record your input.</li>
          <li>Record a short message with contact info (e.g. name, company, email).</li>
          <li>Review and correct the extracted data.</li>
          <li>Click “Send to HubSpot” to create or update the contact.</li>
        </ol>
      </main>
    );
  }
  