'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';

// Types des données structurées
type DonneesStructurees = {
  prénom?: string;
  nom?: string;
  poste?: string;
  entreprise?: string;
  email?: string;
  téléphone?: string;
};

export default function Home() {
  const [clientId, setClientId] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [transcription, setTranscription] = useState<string | null>(null);
  const [formData, setFormData] = useState<DonneesStructurees | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("client_id");
    if (id) {
      setClientId(id);
      localStorage.setItem("client_id", id);
    }
  }, []);

  const startRecording = async () => {
    setStatus("🎙️ Enregistrement en cours...");
    setRecording(true);
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    const chunks: Blob[] = [];

    recorder.ondataavailable = (e) => chunks.push(e.data);
    recorder.onstop = async () => {
      const blob = new Blob(chunks, { type: 'audio/webm' });
      const formDataToSend = new FormData();
      formDataToSend.append("file", blob, "audio.webm");

      setRecording(false);
      setLoading(true);
      setStatus("⏳ Transcription en cours...");

      try {
        const res = await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL}/transcribe/`,
          formDataToSend,
          {
            headers: { 'Content-Type': 'multipart/form-data' },
          }
        );

        setTranscription(res.data.transcription);
        setFormData(res.data.données_structurées);
        setStatus("✅ Transcription terminée");
      } catch (error) {
        setStatus("❌ Erreur lors de la transcription");
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    recorder.start();
    setMediaRecorder(recorder);
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
      setStatus("⏹️ Enregistrement arrêté, traitement en cours...");
    }
  };

  const handleInputChange = (key: string, value: string) => {
    if (formData) {
      setFormData({ ...formData, [key]: value });
    }
  };

  const envoyerHubspot = async () => {
    if (!clientId || !formData) return;

    setStatus("⏳ Envoi en cours...");

    try {
      const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/send-to-hubspot/${clientId}`, {
        leads: [formData],
      });

      if (res.data.erreurs && res.data.erreurs.length > 0) {
        setStatus(`❌ HubSpot a rejeté certaines données : ${JSON.stringify(res.data.erreurs[0])}`);
      } else {
        setStatus("✅ Données envoyées à HubSpot");
        setSent(true);
      }
    } catch (error) {
      setStatus("❌ Échec de l’envoi à HubSpot");
      console.error(error);
    }
  };

  const améliorerDonnées = async () => {
    if (!transcription) return;
    setLoading(true);
    setStatus("🔎 Analyse et amélioration des données...");
    try {
      const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/improve-data/`, {
        transcription: transcription,
      });
      setFormData(res.data.données_améliorées);
      setStatus("✅ Données améliorées par IA");
    } catch (error) {
      setStatus("❌ Échec de l’amélioration des données");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen p-8 bg-white text-gray-900 dark:bg-gray-900 dark:text-white transition-colors duration-300">
      {clientId ? (
        <div className="max-w-xl mx-auto space-y-6">
          <h1 className="text-3xl font-bold">VoiceTon 🎤</h1>
          <p className="text-sm text-gray-500 dark:text-gray-300">Client connecté : <strong>{clientId}</strong></p>

          <button
            onClick={recording ? stopRecording : startRecording}
            className={`w-full px-4 py-2 rounded text-white transition ${
              recording ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {recording ? "Stop" : "Start Recording"}
          </button>

          {status && <p className="text-sm p-2 bg-gray-100 dark:bg-gray-800 rounded">{status}</p>}

          {loading && (
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          )}

          {transcription && (
            <div>
              <h2 className="text-xl font-semibold">Transcription</h2>
              <p className="italic text-gray-700 dark:text-gray-300">{transcription}</p>
            </div>
          )}

          {formData && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Données extraites</h2>
              {(Object.entries(formData) as [string, string | undefined][]).map(([key, value]) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 capitalize mb-1">
                    {key}
                  </label>
                  <input
                    type="text"
                    value={value || ''}
                    onChange={(e) => handleInputChange(key, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-black dark:text-white focus:outline-none focus:ring focus:ring-blue-200"
                  />
                </div>
              ))}

              <div className="flex gap-2">
                <button
                  onClick={améliorerDonnées}
                  className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded"
                >
                  🔎 Améliorer les données
                </button>

                {!sent && (
                  <button
                    onClick={envoyerHubspot}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded"
                  >
                    Envoyer à HubSpot
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-10">
          <h1 className="text-2xl font-bold text-red-600">❌ Client ID manquant</h1>
          <p>Veuillez vous connecter via HubSpot pour accéder à l’application.</p>
        </div>
      )}
    </main>
  );
}