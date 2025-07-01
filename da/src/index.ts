import "dotenv/config";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { sha256 } from "hono/utils/crypto";

const app = new Hono();

const mockDocuments = [
  {
    id: "1",
    title: "Mock Document 1",
    content: "This is the content of mock document 1.",
  },
  {
    id: "2",
    title: "Mock Document 2",
    content: "This is the content of mock document 2.",
  },
  {
    id: "3",
    title: "Mock Document 3",
    content: "This is the content of mock document 3.",
  },
];

app.get("/", (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      ${head}
      <title>DA Server</title>
    </head>
    <body>
      <h1>DA Server</h1>
      <p>Welcome to the DA Server. Click the button below to start the signing process.</p>
      <a href="/sign" class="button">Start Signing</a>
    </body>
    </html>
  `);
});

app.get("/sign", async (c) => {
  // POST request to AGP to start signing process
  const agpUrl = process.env.AGP_URL || "http://localhost:3001";
  const response = await fetch(`${agpUrl}/start-signing`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      apiKey:
        process.env.AGP_API_KEY ||
        (() => {
          throw new Error("AGP_API_KEY is not set");
        })(),
      manifest: mockDocuments.map((doc) => ({
        id: doc.id,
        title: doc.title,
        hash: sha256(doc.content),
        url: `${process.env.BASE_URL}/documents/${doc.id}`,
      })),
    }),
  });

  if (!response.ok) {
    return c.text("Failed to start signing process", 500);
  }
  const data = await response.json();
  return c.html(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      ${head}
      <title>DA Sign</title>
    </head>
    <body>
      <h1>DA Sign</h1>
      <p>Signing process started. AGP session ID: ${data.sessionId}</p>
      <!-- <iframe src="${agpUrl}/iframe?sessionId=${data.sessionId}" style="width: 100%; height: 600px; border: none;"></iframe> -->
      <script src="${agpUrl}/sdk.js"></script>
      <script>
        agp.initIframe("${data.sessionId}");
      </script>
    </body>
    </html>
  `);
});

app.get("/documents/:id", (c) => {
  const docId = c.req.param("id");
  const document = mockDocuments.find((doc) => doc.id === docId);
  console.log(`DA: Fetching document with ID: ${docId}`);
  if (!document) {
    return c.text("Document not found", 404);
  }
  return c.text(document.content, 200, {
    "Content-Type": "text/plain",
  });
});

app.get("/webhook", (c) => {
  const sessionId = c.req.query("sessionId");
  if (!sessionId) {
    return c.text("Missing session ID", 400);
  }

  console.log(`DA: Webhook received for session ID: ${sessionId}`);

  return c.text(`ok`, 200);
});

const head = `
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          font-family: "Comic Sans MS", "Comic Sans", cursive;
          background-color: #f4f4f4;
          color: #333;
          text-align: center;
          padding: 50px;
        }
        h1 {
          color: #007bff;
        }
        p {
          color: #555;
        }
        button, .button {
          padding: 10px 20px;
          background-color: #007bff;
          font-family: "Comic Sans MS", "Comic Sans", cursive;
          font-size: 16px;
          color: white;
          text-decoration: none;
          border-radius: 5px;
        }
        </style>`;

serve(
  {
    fetch: app.fetch,
    port: 3002,
  },
  (info) => {
    console.log(`DA Server is running on http://localhost:${info.port}`);
  }
);
