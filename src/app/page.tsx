'use client';

import { useState, useRef } from 'react';
import axios from 'axios';

export default function Home() {
  const [recording, setRecording] = useState(false);
  const [countdown, setCountdown] = useState(20);
  const [transcription, setTranscription] = useState(null);
  const [formData, setFormData] = useState(null);
  const [clientId, setClientId] = useState('');
  const [status, setStatus] = useState(null);
  const [sent, setSent] = useState(false);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const countdownIntervalRef = useRef(null);

  const startRecording = async () => {
    setRecording(true);
    setCountdown(20);
    audioChunksRef.current = [];

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream);
    mediaRecorderRef.current = mediaRecorder;

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunksRef.current.push(event.data);
      }
    };

    mediaRecorder.onstop = async () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      const formData = new FormData();
      formData.append('file', audioBlob, 'recording.webm');

      try {
        const response = await axios.post('https://voiceton-api.onrender.com/transcribe/', formData);
        setTranscription(response.data.transcription);
        setFormData(response.data.données_structurées);
        setStatus('Transcription terminée');
      } catch (error) {
        console.error(error);
        setStatus('Erreur lors de la transcription');
      }
    };

    mediaRecorder.start();
    countdownIntervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownIntervalRef.current);
          mediaRecorder.stop();
          setRecording(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const sendToHubspot = async () => {
    if (!clientId || !formData) return;

    try {
      await axios.post(`https://voiceton-api.onrender.com/send-to-hubspot/${clientId}`, formData);
      setSent(true);
      setStatus('Données envoyées à HubSpot');
    } catch (error) {
      console.error(error);
      setStatus('Erreur lors de l\'envoi à HubSpot');
    }
  };

  const connectHubspot = () => {
    window.location.href = 'https://voiceton-api.onrender.com/hubspot/auth';
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-6 bg-white text-black">
      <h1 className="text-3xl font-bold mb-6">VoiceTon</h1>

      {!recording && (
        <button onClick={startRecording} className="mb-4 px-6 py-2 bg-blue-500 text-black font-semibold rounded shadow">
          🎙️ Démarrer
        </button>
      )}

      {recording && <p className="mb-4 text-black">Enregistrement en cours... {countdown}s restantes</p>}

      <input
        type="text"
        placeholder="Collez ici votre client_id"
        value={clientId}
        onChange={(e) => setClientId(e.target.value)}
        className="mb-4 px-4 py-2 border rounded w-80 text-black"
      />

      <button onClick={connectHubspot} className="mb-4 px-6 py-2 bg-orange-400 text-black font-semibold rounded shadow">
        🔗 Connecter HubSpot
      </button>

      {formData && (
        <div className="mb-4 w-full max-w-md">
          <h2 className="text-lg font-bold mb-2">Champs préremplis :</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-black">
            {JSON.stringify(formData, null, 2)}
          </pre>
        </div>
      )}

      {formData && (
        <button onClick={sendToHubspot} className="px-6 py-2 bg-green-500 text-black font-semibold rounded shadow">
          📤 Envoyer à HubSpot
        </button>
      )}

      {status && <p className="mt-4 text-black font-medium">{status}</p>}
      {sent && <p className="mt-2 text-green-600 font-bold">✅ Contact enregistré avec succès</p>}
    </main>
  );
}
