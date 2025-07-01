import { serve } from "@hono/node-server";
import { Hono } from "hono";

const app = new Hono();

const head = `
      <style>
        body {
          font-family: "Comic Sans MS", "Comic Sans", cursive;
          background-color: #1e1e1e;
          color: #e0e0e0;
          text-align: center;
          padding: 50px;
        }
        h1 {
          color: #bb86fc;
        }
        p {
          color: #03dac6;
        }
        button {
          padding: 10px 20px;
          background-color: #6200ea;
          color: white;
          border: none;
          border-radius: 5px;
          cursor: pointer;
        }
      </style>`;

app.get("/", (c) => {
  return c.text("Hello AGP!");
});

app.get("/iframe", (c) => {
  const sessionId = c.req.query("sessionId");
  if (!sessionId) {
    return c.text("Missing session ID", 400);
  }

  return c.html(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      ${head}
      <title>AGP Iframe</title>
    </head>
    <body>
      <h1>AGP Iframe</h1>
      <p>This is a mock AGP iframe.</p>
      <p>Session ID: ${sessionId}</p>
      <button onclick="startSigning()">Start Signing</button>
    </body>
    </html>
  `);
});

app.post("/start-signing", async (c) => {
  // Mocking the signing process
  const { apiKey } = await c.req.json();
  if (!apiKey || apiKey !== (process.env.AGP_API_KEY || "mock-api-key")) {
    return c.text("Invalid API key", 401);
  }

  // Mocking the signing process
  const sessionId = "mock-session-id";
  return c.json({ sessionId });
});

serve(
  {
    fetch: app.fetch,
    port: 3001,
  },
  (info) => {
    console.log(`AGP Server is running on http://localhost:${info.port}`);
  }
);
