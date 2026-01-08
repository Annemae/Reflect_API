import express from "express";
import cors from "cors";
import "dotenv/config";

import ModelClient, { isUnexpected } from "@azure-rest/ai-inference";
import { AzureKeyCredential } from "@azure/core-auth";

const app = express();
app.use(cors({
  origin: "*",
  methods: ["POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"]
}));
app.options("*", cors());
app.use(express.json());

const token = process.env.GITHUB_TOKEN;
const endpoint = "https://models.github.ai/inference";
const client = ModelClient(endpoint, new AzureKeyCredential(token));

app.post("/v1/chat/completions", async (req, res) => {
  try {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Missing or invalid 'messages' in request body" });
    }

    const response = await client.path("/chat/completions").post({
      body: {
        model: "gpt-4o-mini",
        messages,
        temperature: 1,
        top_p: 1
      }
    });

    if (isUnexpected(response)) {
      return res.status(500).json({ error: response.body.error });
    }

    const content = response.body.choices?.[0]?.message?.content;
    if (!content) {
      return res.status(500).json({ error: "No content returned from LLM" });
    }

    res.json({ content });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default app;
