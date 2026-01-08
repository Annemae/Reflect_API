// api/server/v1/chat/completions.js
import "dotenv/config";
import ModelClient, { isUnexpected } from "@azure-rest/ai-inference";
import { AzureKeyCredential } from "@azure/core-auth";

const allowedOrigins = [
  "http://localhost:5173",
  "https://reflect-direct-retrospective.web.app"
];

export default async function handler(req, res) {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");

  if (req.method === "OPTIONS") {
    return res.status(204).end(); // preflight
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

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

    return res.status(200).json({ content });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}
