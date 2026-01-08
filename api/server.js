// api/server.js
import "dotenv/config";
import ModelClient, { isUnexpected } from "@azure-rest/ai-inference";
import { AzureKeyCredential } from "@azure/core-auth";

// Allowed origins for dev + production
const allowedOrigins = [
  "http://localhost:5173",   // your local dev
  "https://reflect-direct-retrospective.web.app"
];

// This tells Vercel to run this as an Edge Function
export const config = {
  runtime: "edge"
};

export default async function handler(req) {
  const origin = req.headers.get("origin");

  // Create headers object for CORS
  const headers = new Headers();
  if (allowedOrigins.includes(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
  }
  headers.set("Access-Control-Allow-Methods", "POST,OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type,Authorization");

  // Preflight OPTIONS request
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  // Only allow POST for actual request
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers
    });
  }

  try {
    const body = await req.json();
    const { messages } = body;

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "Invalid messages" }), {
        status: 400,
        headers
      });
    }

    const token = process.env.GITHUB_TOKEN;
    const endpoint = "https://models.github.ai/inference";
    const client = ModelClient(endpoint, new AzureKeyCredential(token));

    const response = await client.path("/chat/completions").post({
      body: { model: "gpt-4o-mini", messages, temperature: 1, top_p: 1 }
    });

    if (isUnexpected(response)) {
      return new Response(JSON.stringify({ error: response.body.error }), {
        status: 500,
        headers
      });
    }

    const content = response.body.choices?.[0]?.message?.content;
    if (!content) {
      return new Response(JSON.stringify({ error: "No content returned" }), {
        status: 500,
        headers
      });
    }

    return new Response(JSON.stringify({ content }), { status: 200, headers });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers
    });
  }
}
