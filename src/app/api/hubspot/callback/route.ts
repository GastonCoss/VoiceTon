import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const hubspotResponse = await fetch('https://api.hubapi.com/crm/v3/objects/contacts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.HUBSPOT_API_KEY}`,
      },
      body: JSON.stringify({
        properties: {
          firstname: body.prénom,
          lastname: body.nom,
          email: body.email,
          phone: body.téléphone,
          company: body.entreprise,
          jobtitle: body.poste,
        },
      }),
    });

    const data = await hubspotResponse.json();

    if (!hubspotResponse.ok) {
      console.error('Erreur HubSpot :', data);
      return NextResponse.json({ error: 'Erreur côté HubSpot', details: data }, { status: 500 });
    }

    return NextResponse.json({ success: true, contact: data });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    console.error('Erreur API :', err.message);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
