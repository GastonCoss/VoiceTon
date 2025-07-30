'use client';
import React, { useState } from "react";

export default function VoiceTonUI() {
  const [connected, setConnected] = useState(false);
  const [recording, setRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resultsReady, setResultsReady] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const handleConnect = () => setConnected(true);

  const startRecording = () => {
    setRecording(true);
    setConfirmed(false);
    setResultsReady(false);
  };

  const stopRecording = () => {
    setRecording(false);
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setResultsReady(true);
    }, 2000); // Simule la transcription
  };

  const handleSend = () => {
    setResultsReady(false);
    setConfirmed(true);
  };

  return (
    <div className="flex items-center justify-center min-h-screen px-4 bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white">
      <div className="w-full max-w-xl space-y-6 bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">

        <div className="text-center">
          <h1 className="text-3xl font-bold mb-1">🎙️ VoiceTon</h1>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Add contacts to HubSpot using your voice
          </p>
        </div>

        {/* Connect to HubSpot */}
        {!connected && (
          <div className="text-center">
            <button
              onClick={handleConnect}
              className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-xl font-semibold"
            >
              Connect to HubSpot
            </button>
          </div>
        )}

        {/* Voice recorder */}
        {connected && !resultsReady && !loading && (
          <div className="text-center space-y-4">
            <div className="text-sm text-gray-500">
              {recording ? "Recording..." : "Ready to record"}
            </div>
            {!recording && (
              <button
                onClick={startRecording}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-xl font-semibold"
              >
                Start Recording
              </button>
            )}
            {recording && (
              <>
                <button
                  onClick={stopRecording}
                  className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-xl font-semibold"
                >
                  Stop
                </button>
                <div className="animate-pulse mt-2 text-green-500 font-bold">
                  Recording...
                </div>
              </>
            )}
          </div>
        )}

        {/* Loader */}
        {loading && (
          <div className="text-center">
            <p className="text-blue-500 font-semibold">Transcribing voice...</p>
          </div>
        )}

        {/* Results */}
        {resultsReady && (
          <div>
            <h2 className="text-lg font-semibold mb-2">Extracted Contact</h2>
            <div className="space-y-2">
              <div>
                <strong>Name:</strong> John Doe
              </div>
              <div>
                <strong>Email:</strong> john@example.com
              </div>
              <div>
                <strong>Company:</strong> ACME Inc.
              </div>
              <div>
                <strong>Phone:</strong> +33 6 12 34 56 78
              </div>
            </div>
            <button
              onClick={handleSend}
              className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl font-semibold w-full"
            >
              Send to HubSpot
            </button>
          </div>
        )}

        {/* Confirmation */}
        {confirmed && (
          <div className="text-center text-green-600 font-bold">
            ✅ Contact successfully added to HubSpot!
          </div>
        )}
      </div>
    </div>
  );
}
