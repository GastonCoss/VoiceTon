from fastapi import FastAPI, UploadFile, File
import openai
import os
from dotenv import load_dotenv
from fastapi.responses import JSONResponse
import json
import requests
import re
from time import time

# Charger les variables d’environnement
load_dotenv(dotenv_path="/Users/gastonc/Desktop/VoiceTon/.env")

openai.api_key = os.getenv("OPENAI_API_KEY")

app = FastAPI()

def est_telephone_valide(chaine):
    return re.fullmatch(r"[\d\s\-\+()]+", chaine.strip()) is not None

@app.get("/")
def read_root():
    return {"message": "Voice2CRM API is running 🚀"}

@app.post("/transcribe/")
async def transcribe_audio(file: UploadFile = File(...)):
    try:
        audio_bytes = await file.read()

        with open("temp.wav", "wb") as f:
            f.write(audio_bytes)

        with open("temp.wav", "rb") as audio_file:
            transcript = openai.Audio.transcribe(model="whisper-1", file=audio_file)

        prompt = f"""
Voici une transcription vocale d'un contact rencontré sur un salon professionnel :
\"\"\"{transcript["text"]}\"\"\"

Peux-tu me retourner un JSON structuré avec les champs suivants (ou null si absent) :
- prénom
- nom
- poste
- entreprise
- email
- téléphone

Réponds uniquement avec un objet JSON valide. Aucun texte autour.
"""

        chat_response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": prompt}]
        )

        structured_data = chat_response["choices"][0]["message"]["content"]
        print("🧠 Réponse GPT brute :", structured_data)

        match = re.search(r"\{.*\}", structured_data, re.DOTALL)
        if not match:
            raise ValueError("La réponse GPT ne contient pas un JSON valide.")

        json_text = match.group().strip()
        try:
            contact_data = json.loads(json_text)
            print("✅ JSON parsé avec succès :", contact_data)
        except json.JSONDecodeError as e:
            raise ValueError(f"Erreur de parsing JSON : {e} \nTexte reçu : {json_text}")

        hubspot_properties = {}
        mapping = {
            "firstname": "prénom",
            "lastname": "nom",
            "email": "email",
            "phone": "téléphone",
            "company": "entreprise",
            "jobtitle": "poste"
        }

        for hubspot_field, gpt_field in mapping.items():
            valeur = contact_data.get(gpt_field)
            if isinstance(valeur, str) and valeur.strip():
                if hubspot_field == "phone" and not est_telephone_valide(valeur):
                    print("⚠️ Téléphone ignoré (invalide) :", valeur)
                    continue
                hubspot_properties[hubspot_field] = valeur.strip()

        # Générer un email unique si manquant
        if "email" not in hubspot_properties:
            timestamp = int(time())
            generated_email = f"{hubspot_properties.get('firstname', 'contact').lower()}.{hubspot_properties.get('lastname', 'inconnu').lower()}+{timestamp}@gmail.com"
            hubspot_properties["email"] = generated_email
            print("📧 Email généré :", generated_email)

        # Ajouter un téléphone fictif si aucun valide
        if "phone" not in hubspot_properties:
            hubspot_properties["phone"] = "+33601020304"
            print("📱 Téléphone fictif ajouté :", hubspot_properties["phone"])

        if "lastname" not in hubspot_properties:
            raise ValueError("HubSpot requiert un 'lastname' pour créer un contact.")

        print("📦 Données envoyées à HubSpot :", hubspot_properties)
        print("🔐 Clé API utilisée :", os.getenv("HUBSPOT_API_KEY"))

        hubspot_contact = {
            "properties": hubspot_properties
        }

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {os.getenv('HUBSPOT_API_KEY')}"
        }

        response = requests.post(
            url="https://api.hubapi.com/crm/v3/objects/contacts",
            headers=headers,
            data=json.dumps(hubspot_contact)
        )

        hubspot_result = response.json()

        return {
            "transcription": transcript["text"],
            "données_structurées": contact_data,
            "hubspot": hubspot_result
        }

    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})
