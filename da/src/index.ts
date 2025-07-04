import "dotenv/config";
import { serve } from "@hono/node-server";
import { Hono, type Context } from "hono";
import { sha256 } from "hono/utils/crypto";

const app = new Hono();

app.use("*", secureHeadersMiddleware());

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

// Signing page
app.get("/sign", async (c) => {
  // POST request to AGP to start signing process
  const agpUrl =
    process.env.AGP_URL ||
    (() => {
      throw new Error("AGP_URL is not set");
    })();

  // Create a new session with documents
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
      manifest: mockDocuments.map((doc, i) => ({
        id: doc.id,
        title: doc.title,
        hash: sha256(doc.content),
        ...(i % 2 == 0
          ? { url: `${process.env.BASE_URL}/documents/${doc.id}` }
          : { content: doc.content }),
      })),
    }),
  });

  if (!response.ok) {
    return c.text("Failed to start signing process", 500);
  }

  // Generate Content Security Policy
  // TODO replace with sha256 hashes of the documents?
  const scriptNonceInitIframe = Math.random().toString(36).substring(2, 15);
  const scriptNonceSdk = Math.random().toString(36).substring(2, 15);
  // c.header(
  //   "Content-Security-Policy",
  //   `default-src 'none'; script-src-elem 'nonce-${scriptNonceInitIframe}' 'nonce-${scriptNonceSdk}' 'sha256-bsEIDKWTI9z6t5IxKutxYdqL7bsmQfjIC0krSTqXng0=' 'sha256-5sm/hmmVH0VcGQrInWolR45+2sNfLbwwYahwnBdM48s=' 'sha256-Xomuaoc0SiD1FLNoZHQhKAmCKbqPxaCXScBsmrAW3Lc='; style-src 'sha256-Lrdk/twgnY5dzHPh8L8M/nMwQAxF/Muwk1j0oSRQMZU='; frame-src ${agpUrl} listen;`
  // );
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
      <script src="${agpUrl}/sdk.js" nonce=${scriptNonceSdk}></script>
      <script nonce="${scriptNonceInitIframe}">
        agp.initIframe("${data.sessionId}");
      </script>
      <ul>
      </ul>
      <script>
       window.addEventListener("message", (event) => {
          console.log("DA: Message received from AGPXXX:", event);
          if (event.origin !== "${agpUrl}") return;
          if (event.data.type === "documentSigned") {
            const signedDocument = event.data.signedDocument;
            const li = document.createElement("li");
            li.textContent = "Document signed: " + signedDocument;
            document.querySelector("ul").appendChild(li);
          }
        });
      </script>
    </body>
    </html>
  `);
});

// Endpoint to access documents
app.get("/documents/:id", (c) => {
  const docId = c.req.param("id");
  const document = mockDocuments.find((doc) => doc.id === docId);
  console.log(`DA: Fetching document with ID: ${docId}`);
  if (!document) {
    return c.text("Document not found", 404);
  }
  c.header("Access-Control-Allow-Origin", c.req.header("Origin"));
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

function secureHeadersMiddleware() {
  return (c: Context, next: () => Promise<void>) => {
    // c.header(
    //   "Content-Security-Policy",
    //   "default-src 'self'; script-src 'self'; script-src-elem 'sha256-bsEIDKWTI9z6t5IxKutxYdqL7bsmQfjIC0krSTqXng0=' 'sha256-5sm/hmmVH0VcGQrInWolR45+2sNfLbwwYahwnBdM48s='; style-src 'sha256-Lrdk/twgnY5dzHPh8L8M/nMwQAxF/Muwk1j0oSRQMZU=';"
    // );
    // c.header("X-Content-Type-Options", "nosniff");
    // c.header("X-Frame-Options", "DENY");
    // c.header("X-XSS-Protection", "1; mode=block");
    // c.header("Referrer-Policy", "no-referrer");
    return next();
  };
}

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
  {
    id: "4",
    title: "Mock Document 4",
    content: "This is the content of mock document 4.",
  },
  {
    id: "5",
    title: "Mock Document 5",
    content: "This is the content of mock document 5.",
  },
  {
    id: "6",
    title: "Mock Document 6",
    content: "This is the content of mock document 6.",
  },
];

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
