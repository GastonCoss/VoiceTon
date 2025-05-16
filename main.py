from fastapi import FastAPI, UploadFile, File, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse
import openai
import os
from dotenv import load_dotenv
import tempfile
import json
import requests
from uuid import uuid4

# Chargement des variables d'environnement
load_dotenv()
openai.api_key = os.getenv("OPENAI_API_KEY")

app = FastAPI()

# Middleware CORS pour le frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # À restreindre en prod
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 🔊 Transcription vocale avec Whisper + extraction IA
@app.post("/transcribe/")
async def transcribe_audio(file: UploadFile = File(...)):
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as temp_audio:
            temp_audio.write(await file.read())
            temp_audio_path = temp_audio.name

        print("✅ Audio reçu :", temp_audio_path)
        print("📦 Taille du fichier :", os.path.getsize(temp_audio_path), "octets")

        with open(temp_audio_path, "rb") as audio_file:
            transcript_response = openai.Audio.transcribe(
                model="whisper-1",
                file=audio_file,
                language="fr"
            )

        transcription_text = transcript_response["text"]
        print("🔊 Transcription :", transcription_text)

        prompt = (
            f"Voici une transcription vocale : \"{transcription_text}\"\n"
            f"Extrait les éléments suivants en JSON : prénom, nom, poste, entreprise, email, téléphone.\n"
            f"Format attendu : {{ \"prénom\": ..., \"nom\": ..., \"poste\": ..., \"entreprise\": ..., \"email\": ..., \"téléphone\": ... }}"
        )

        completion = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2
        )

        structured_data = completion.choices[0].message.content
        print("🧠 Données structurées :", structured_data)

        try:
            structured_dict = json.loads(structured_data)
        except json.JSONDecodeError:
            structured_dict = {}

        return JSONResponse(content={
            "transcription": transcription_text,
            "données_structurées": structured_dict
        })

    except Exception as e:
        print("❌ Erreur:", str(e))
        return JSONResponse(content={"error": str(e)}, status_code=500)

# 🚀 Envoi des données à HubSpot via clé API (temporaire)
@app.post("/send-to-hubspot")
async def send_to_hubspot(data: dict):
    print("🚀 [BACKEND] Envoi à HubSpot :", data)

    api_key = os.getenv("HUBSPOT_API_KEY")
    if not api_key:
        return JSONResponse(content={"error": "HubSpot API key not set"}, status_code=500)

    url = "https://api.hubapi.com/crm/v3/objects/contacts"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

    properties = {}

    if data.get("prénom"): properties["firstname"] = data["prénom"]
    if data.get("nom"): properties["lastname"] = data["nom"]
    if data.get("email"): properties["email"] = data["email"]
    if data.get("téléphone"): properties["phone"] = data["téléphone"]
    if data.get("poste"): properties["jobtitle"] = data["poste"]
    if data.get("entreprise"): properties["company"] = data["entreprise"]

    payload = {"properties": properties}
    print("📦 Payload envoyé à HubSpot :", json.dumps(payload, indent=2, ensure_ascii=False))

    response = requests.post(url, headers=headers, json=payload)

    print("📡 Status code HubSpot :", response.status_code)
    print("📨 Réponse HubSpot brute :", response.text)

    if response.status_code == 201:
        return {"message": "Contact ajouté avec succès"}
    else:
        try:
            return JSONResponse(content={
                "error": "Erreur HubSpot",
                "details": response.json()
            }, status_code=500)
        except:
            return JSONResponse(content={
                "error": "Erreur HubSpot",
                "details": response.text
            }, status_code=500)

# 🔐 Route OAuth : redirection vers HubSpot
@app.get("/hubspot/auth")
def auth_hubspot():
    client_id = os.getenv("HUBSPOT_CLIENT_ID")
    redirect_uri = os.getenv("HUBSPOT_REDIRECT_URI")
    scope = "crm.objects.contacts.write"
    url = (
        f"https://app.hubspot.com/oauth/authorize"
        f"?client_id={client_id}"
        f"&redirect_uri={redirect_uri}"
        f"&scope={scope}"
        f"&state=voiceton"
    )
    return RedirectResponse(url)

# 🔐 Callback OAuth : échange le code contre un token
@app.get("/hubspot/callback")
def hubspot_callback(request: Request):
    code = request.query_params.get("code")
    if not code:
        return JSONResponse(status_code=400, content={"error": "Missing code"})

    token_url = "https://api.hubapi.com/oauth/v1/token"
    client_id = os.getenv("HUBSPOT_CLIENT_ID")
    client_secret = os.getenv("HUBSPOT_CLIENT_SECRET")
    redirect_uri = os.getenv("HUBSPOT_REDIRECT_URI")

    data = {
        "grant_type": "authorization_code",
        "client_id": client_id,
        "client_secret": client_secret,
        "redirect_uri": redirect_uri,
        "code": code
    }

    headers = {"Content-Type": "application/x-www-form-urlencoded"}
    response = requests.post(token_url, data=data, headers=headers)

    return response.json()
