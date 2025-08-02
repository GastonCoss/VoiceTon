import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.post("/hubspot/callback", async (req, res) => {
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({ error: "Missing code" });
  }

  try {
    const response = await fetch("https://api.hubapi.com/oauth/v1/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: process.env.HUBSPOT_CLIENT_ID,
        client_secret: process.env.HUBSPOT_CLIENT_SECRET,
        redirect_uri: "https://voiceton.fr/api/hubspot/callback",
        code,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("HubSpot token exchange failed:", data);
      return res.status(500).json({ error: "HubSpot token exchange failed", details: data });
    }

    return res.status(200).json({ success: true, token: data });
  } catch (err) {
    console.error("Server error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/", (req, res) => {
  res.send("✅ VoiceTon backend is running");
});

app.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT}`);
});
