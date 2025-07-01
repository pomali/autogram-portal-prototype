This repository is monorepo for prototype of signature portal `agp` and driving application `da`.

# AGP

comprises of server component, javascript SDK, and iframe that will be embedded in the driving application

for now - mock the signing process ( sign(doc: Document) => SignedDocument ), mock the webhook ( onSignatureCompleted(callback: (signedDocument: SignedDocument) => void) ), mock the API key ( apiKey: string ) and manifest of files to be signed ( manifest: File[] ).

# DA

is a server side web application that will start AGP session, show embedded iframe of AGP and will wait for the signature to be completed.

# Flow

1. User opens DA
2. DA starts AGP session by sending manifest of files to be signed
3. DA shows AGP iframe using javascript SDK with session id
4. AGP iframe downloads documents to be signed
5. User signs the documents in AGP iframe
6. AGP sends webhook to DA when signature is completed
7. AGP iframe sends signed documents to DA client side

# Considerations

- To create AGP session, DA has to send API key and manifest of files to be signed.
- Ensure that the AGP iframe is responsive and works well on different screen sizes.
- Sending files should be done using enumerable-like API, so that not everything is loaded at once.


# Inspiration

It could be similar to [Stripe Embedded form Checkout](https://docs.stripe.com/checkout/embedded/quickstart) or [Docusign Embedded Signing](https://developers.docusign.com/docs/esign-rest-api/esign101/concepts/embedding/embedded-signing/)
