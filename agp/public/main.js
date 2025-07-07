async function startSigning(sessionId, documentsManifest) {
  console.log("AGP: manifest", documentsManifest);
  if (documentsManifest.length > 0) {
    const client = await AutogramSDK.CombinedClient.init();
    console.log("AGP: Autogram SDK initialized");

    for (const doc of documentsManifest) {
      console.log("AGP: Starting signing for document:", doc);
      let contentPromise = Promise.resolve(doc.content);
      if (doc.url) {
        // If the document has a URL, fetch it
        contentPromise = fetch(doc.url)
          .then((response) => {
            if (!response.ok) {
              throw new Error("Network response was not ok");
            }
            return response.text();
          })
          .then((fetchedContent) => {
            console.log("AGP: Fetched document content:", fetchedContent);
            return fetchedContent;
          });
      }
      const content = await contentPromise;

      const signedObject = await client.sign(
        {
          content,
          filename: "hello.txt",
        },
        {
          level: "XAdES_BASELINE_B",
          container: "ASiC_E",
        },
        "text/plain",
        false
      );

      // const signedDocument = "=== SIGNED === " + content + " === SIGNED ==="; // Mock signing process
      const signedDocument = signedObject.content;

      // Send to server
      fetch("/document-signed", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sessionId: sessionId, signedDocument }),
      }).then((response) => {
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }
        console.log("AGP: Signed document sent to server");
      });

      // Send to parent window
      window.parent.postMessage(
        {
          type: "documentSigned",
          sessionId: "${sessionId}",
          signedDocument,
        },
        "*"
      );
    }
  }
}
