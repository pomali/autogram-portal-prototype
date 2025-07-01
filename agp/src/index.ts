import "dotenv/config";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import sqlite3 from "sqlite3";

const app = new Hono();

const db = new sqlite3.Database(":memory:", (err) => {
  if (err) {
    console.error("Error opening database:", err.message);
  } else {
    console.log("Connected to the in-memory SQLite database.");
    db.serialize(() => {
      db.run(
        "CREATE TABLE documents (id TEXT PRIMARY KEY, sessionId TEXT, nth INTEGER, title TEXT, content TEXT, url TEXT, FOREIGN KEY(sessionId) REFERENCES sessions(id))"
      );
      db.run("CREATE TABLE sessions (id TEXT PRIMARY KEY, apiKey TEXT)");
      console.log("Tables created successfully.");
    });
  }
});

app.get("/", (c) => {
  return c.text("Hello AGP!");
});

app.get("/iframe", async (c) => {
  const sessionId = c.req.query("sessionId");
  if (!sessionId) {
    return c.text("Missing session ID", 400);
  }

  type Doc = {
    id: string;
    title: string;
    content: string;
    url: string;
  };
  // Validate session ID
  const documents: Array<Doc> = await new Promise((resolve) => {
    db.all<Doc>(
      "SELECT documents.id, documents.title, documents.content, documents.url FROM sessions JOIN documents ON sessions.id = documents.sessionId WHERE sessions.id = ? ORDER BY documents.nth",
      [sessionId],
      (err, rows) => {
        if (err) {
          console.error("Error querying sessions:", err.message);
          resolve([]);
        } else {
          resolve(rows);
        }
      }
    );
  });
  if (!documents) {
    return c.text("Invalid session ID", 401);
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
      <script>
      const documentsManifest = ${JSON.stringify(
        documents.map((doc) => ({
          id: doc.id,
          title: doc.title,
          content: doc.content,
          url: doc.url,
        }))
      )}
        function startSigning() {
          console.log("AGP: manifest", documentsManifest);
          for (const doc of documentsManifest) {
            console.log('AGP: Starting signing for document:', doc);
            let contentPromise = Promise.resolve(doc.content);
            if (doc.url) {
              // If the document has a URL, fetch it
              contentPromise = fetch(doc.url)
                .then(response => {
                  if (!response.ok) {
                    throw new Error('Network response was not ok');
                  }
                  return response.text();
                })
                .then(fetchedContent => {
                  console.log('AGP: Fetched document content:', fetchedContent);
                  return fetchedContent;
                });
            }
            contentPromise.then((content) => {
              const signedDocument = "=== SIGNED === " + content + " === SIGNED ==="; // Mock signing process
              // Send to server
              fetch('/document-signed', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ sessionId: '${sessionId}', signedDocument }),
              })
              .then(response => {
                if (!response.ok) {
                  throw new Error('Network response was not ok');
                }
                console.log('AGP: Signed document sent to server');
              });
              // Send to parent window
              window.parent.postMessage({ type: 'documentSigned', sessionId: '${sessionId}', signedDocument }, '*');
            }).catch(error => {
              console.error('AGP: Error signing document:', error);
            });
          }
        }
      </script>
      <button onclick="startSigning()">Start Signing</button>
    </body>
    </html>
  `);
});

app.post("/start-signing", async (c) => {
  // Mocking the signing process
  const { apiKey, manifest } = await c.req.json();
  if (
    !apiKey ||
    apiKey !==
      (process.env.AGP_API_KEY ||
        (() => {
          throw new Error("AGP_API_KEY is not set");
        })())
  ) {
    return c.text("Invalid API key", 401);
  }

  // Create a new session
  const sessionId = Math.random().toString(36).substring(2, 15);
  await new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run(
        "INSERT INTO sessions (id, apiKey) VALUES (?, ?)",
        [sessionId, apiKey],
        (err) => {
          if (err) {
            console.error("Error inserting session:", err.message);
            reject(err);
          } else {
            console.log(`Session created with ID: ${sessionId}`);
            resolve(true);
          }
        }
      );
      const stmt = db.prepare(
        "INSERT INTO documents (id, sessionId, nth, title, content, url) VALUES (?, ?, ?, ?, ?, ?)"
      );

      manifest.forEach(
        (
          doc: { id: string; title: string; content: string; url: string },
          index: number
        ) => {
          stmt.run(
            doc.id,
            sessionId,
            index, // Using nth instead of order
            doc.title,
            doc.content,
            doc.url
          );
        }
      );
      stmt.finalize((err) => {
        if (err) {
          console.error("Error finalizing statement:", err.message);
          reject(err);
        } else {
          console.log("Documents inserted successfully.");
          resolve(true);
        }
      });
    });
  });

  return c.json({ sessionId });
});

app.post("/document-signed", async (c) => {
  const { sessionId, signedDocument } = await c.req.json();
  if (!sessionId) {
    return c.text("Missing session ID", 400);
  }
  // Here you would handle the signed document logic
  console.log(`AGP: Document signed for session ID: ${sessionId}`);
  console.log(`AGP: Signed Document: ${signedDocument}`);
  return c.text("ok", 200);
});

app.post("/signing-complete", async (c) => {
  const { sessionId } = await c.req.json();
  if (!sessionId) {
    return c.text("Missing session ID", 400);
  }

  // Here you would handle the completion of the signing process
  console.log(`AGP: Signing process completed for session ID: ${sessionId}`);
  return c.text("ok", 200);
});

app.get("/sdk.js", (c) => {
  return c.text(
    `
    (function() {
      window.agp = {
        initIframe: function(sessionId) {
          const iframe = document.createElement('iframe');
          iframe.src = \`${process.env.BASE_URL}/iframe?sessionId=\${sessionId}\`;
          iframe.style.width = '100%';
          iframe.style.height = '600px';
          iframe.style.border = 'none';
          // iframe.sandbox = 'allow-scripts allow-same-origin';

          window.addEventListener('message', function(event) {
          console.log('AGP: Message received from AGP Iframe:', event.data, event.origin);
            if (event.origin !== window.location.origin) {
              return;
            }
            console.log('AGP: Message received from AGP Iframe:', event.data);
          });
          document.body.appendChild(iframe);
        },
      };
    })();
  `,
    200,
    {
      "Content-Type": "application/javascript",
    }
  );
});

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
        button, .button {
          padding: 10px 20px;
          background-color: #6200ea;
          color: white;
          font-family: "Comic Sans MS", "Comic Sans", cursive;
          font-size: 16px;
          text-decoration: none;
          border-radius: 5px;
        }
      </style>`;

serve(
  {
    fetch: app.fetch,
    port: 3001,
  },
  (info) => {
    console.log(`AGP Server is running on http://localhost:${info.port}`);
  }
);
