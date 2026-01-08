import express from "express";
import "dotenv/config";
import ModelClient, { isUnexpected } from "@azure-rest/ai-inference";
import { AzureKeyCredential } from "@azure/core-auth";

const app = express();
app.use(express.json());

// Preflight & CORS handling
app.options("/v1/chat/completions", (req, res) => {
  const allowedOrigins = [
    "http://localhost:5173,
    "https://reflect-direct-retrospective.web.app"
  ];
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.status(204).end(); // Must end response for preflight
});

app.post("/v1/chat/completions", async (req, res) => {
  // Add CORS headers here too for actual POST
  const allowedOrigins = [
    "http://localhost:5174",
    "https://reflect-direct-retrospective.web.app"
  ];
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  try {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Invalid messages" });
    }

    const token = process.env.GITHUB_TOKEN;
    const endpoint = "https://models.github.ai/inference";
    const client = ModelClient(endpoint, new AzureKeyCredential(token));

    const response = await client.path("/chat/completions").post({
      body: { model: "gpt-4o-mini", messages, temperature: 1, top_p: 1 }
    });

    if (isUnexpected(response)) {
      return res.status(500).json({ error: response.body.error });
    }

    const content = response.body.choices?.[0]?.message?.content;
    if (!content) return res.status(500).json({ error: "No content returned" });

    res.json({ content });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default app;
