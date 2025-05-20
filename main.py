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

load_dotenv()
openai.api_key = os.getenv("OPENAI_API_KEY")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # À restreindre en production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

TOKENS_FILE = "tokens.json"

def save_tokens_for_client(client_id, tokens):
    try:
        with open(TOKENS_FILE, "r") as f:
            all_tokens = json.load(f)
    except FileNotFoundError:
        all_tokens = {}
    all_tokens[client_id] = tokens
    with open(TOKENS_FILE, "w") as f:
        json.dump(all_tokens, f)

def get_token_for_client(client_id):
    try:
        with open(TOKENS_FILE, "r") as f:
            all_tokens = json.load(f)
        return all_tokens.get(client_id)
    except:
        return None

@app.post("/transcribe/")
async def transcribe_audio(file: UploadFile = File(...)):
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as temp_audio:
            temp_audio.write(await file.read())
            temp_audio_path = temp_audio.name

        with open(temp_audio_path, "rb") as audio_file:
            transcript_response = openai.Audio.transcribe(
                model="whisper-1",
                file=audio_file,
                language="fr"
            )

        transcription_text = transcript_response["text"]

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

        try:
            structured_dict = json.loads(structured_data)
        except json.JSONDecodeError:
            structured_dict = {}

        return JSONResponse(content={
            "transcription": transcription_text,
            "données_structurées": structured_dict
        })

    except Exception as e:
        return JSONResponse(content={"error": str(e)}, status_code=500)

@app.post("/send-to-hubspot/{client_id}")
def send_to_hubspot(client_id: str, data: dict):
    tokens = get_token_for_client(client_id)
    if not tokens:
        return JSONResponse(status_code=400, content={"error": "Token introuvable pour ce client"})

    leads = data.get("leads", [])
    if not isinstance(leads, list):
        return JSONResponse(status_code=400, content={"error": "Le format attendu est une liste de leads."})

    access_token = tokens["access_token"]
    url = "https://api.hubapi.com/crm/v3/objects/contacts"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }

    results = []
    for lead in leads:
        properties = {}
        if lead.get("prénom"): properties["firstname"] = lead["prénom"]
        if lead.get("nom"): properties["lastname"] = lead["nom"]
        if lead.get("email"): properties["email"] = lead["email"]
        if lead.get("téléphone"): properties["phone"] = lead["téléphone"]
        if lead.get("poste"): properties["jobtitle"] = lead["poste"]
        if lead.get("entreprise"): properties["company"] = lead["entreprise"]

        payload = {"properties": properties}
        response = requests.post(url, headers=headers, json=payload)

        if response.status_code == 201:
            results.append({"lead": lead, "status": "success"})
        else:
            results.append({
                "lead": lead,
                "status": "error",
                "details": response.text
            })

    return JSONResponse(content={"results": results})

@app.get("/hubspot/auth")
def auth_hubspot():
    client_id = os.getenv("HUBSPOT_CLIENT_ID")
    redirect_uri = os.getenv("HUBSPOT_REDIRECT_URI")
    scope = "crm.objects.contacts.write crm.objects.contacts.read oauth"
    state = str(uuid4())
    url = (
        f"https://app.hubspot.com/oauth/authorize"
        f"?client_id={client_id}"
        f"&redirect_uri={redirect_uri}"
        f"&scope={scope}"
        f"&state={state}"
    )
    return RedirectResponse(url)

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
    tokens = response.json()

    client_id_generated = str(uuid4())
    save_tokens_for_client(client_id_generated, tokens)

    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
    return RedirectResponse(f"{frontend_url}?client_id={client_id_generated}")
    