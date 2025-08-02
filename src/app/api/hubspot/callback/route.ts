import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");

  if (!code) {
    return NextResponse.json({ error: "Missing authorization code" }, { status: 400 });
  }

  try {
    const response = await fetch("https://voiceton-api.onrender.com/hubspot/callback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("Backend error:", result);
      return NextResponse.json({ error: "Erreur lors de la connexion à HubSpot", details: result }, { status: 500 });
    }

    // Redirection vers page de succès (ou afficher message simple)
    return NextResponse.redirect("https://voiceton.fr?hubspot=success");
  } catch (error) {
    console.error("Erreur réseau :", error);
    return NextResponse.json({ error: "Erreur de communication avec le backend" }, { status: 500 });
  }
}
