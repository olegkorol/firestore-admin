import { assertEquals } from "@std/assert";
import { FirestoreAdminClient } from "./mod.ts";

Deno.env.set(
  "FIREBASE_SERVICE_ACCOUNT",
  JSON.stringify({
    project_id: "test-project",
    client_email: "test@example.com",
    private_key: "test-private-key",
  }),
);

Deno.test("FirestoreAdminClient initialization", () => {
  const client = new FirestoreAdminClient();
  assertEquals(typeof client, "object");
});

// Deno.test('getDocument method', async () => {
//   const client = new FirestoreAdminClient()
//   const mockDocument = { name: 'Test Document' }

//   // Mock the fetch function
//   globalThis.fetch = async () => {
//     return {
//       json: async () => ({ fields: { name: { stringValue: 'Test Document' } } })
//     } as Response
//   }

//   const result = await client.getDocument('test-collection/test-document')
//   assertEquals(result, mockDocument)
// })

// Deno.test('getDocumentsInCollection method', async () => {
//   const client = new FirestoreAdminClient()
//   const mockDocuments = [{ name: 'Document 1' }, { name: 'Document 2' }]

//   // Mock the fetch function
//   globalThis.fetch = async () => {
//     return {
//       json: async () => ({
//         documents: [
//           { fields: { name: { stringValue: 'Document 1' } } },
//           { fields: { name: { stringValue: 'Document 2' } } }
//         ]
//       })
//     } as Response
//   }

//   const result = await client.getDocumentsInCollection('test-collection')
//   assertEquals(result, mockDocuments)
// })

// Deno.test('updateDocument method', async () => {
//   const client = new FirestoreAdminClient()
//   const mockUpdateData = { name: 'Updated Document' }

//   // Mock the fetch function
//   globalThis.fetch = async () => {
//     return {
//       json: async () => ({ fields: { name: { stringValue: 'Updated Document' } } })
//     } as Response
//   }

//   const result = await client.updateDocument('test-collection/test-document', mockUpdateData)
//   assertEquals(result.fields.name.stringValue, mockUpdateData.name)
// })
