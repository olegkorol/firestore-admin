# Firestore Admin Client for Deno

This is a simple Firestore Admin Client implemented for Deno. It provides an
easy-to-use interface for interacting with Firestore databases using the Google
Cloud Firestore API.

## Features

- Authentication using Google Service Account
- Automatic token refresh
- CRUD operations on Firestore documents
- Support for querying collections
- Conversion between Firestore document format and JSON

## Prerequisites

- Deno installed on your system
- A Google Cloud project with Firestore enabled
- A service account JSON file with the necessary permissions

## Setup

1. Set the `FIREBASE_SERVICE_ACCOUNT` environment variable with the contents of
   your service account JSON file.

You can set this environment variable in a `.env` file (do not forget to add the
`--env` flag when running your script):

```text
# .env

FIREBASE_SERVICE_ACCOUNT='{
  "type": "service_account",
  "project_id": "XXX",
  "private_key_id": "XXX",
  "private_key": "XXX",
  "client_email": "XXX@XXX.iam.gserviceaccount.com",
  "client_id": "XXX",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/XXX.iam.gserviceaccount.com",
  "universe_domain": "googleapis.com"
}'
```

2. Install `@koiztech/firestore-admin` as a dependency:

```bash
deno add jsr:@koiztech/firestore-admin
```

3. Import `FirestoreAdminClient` in your Deno script and initialise it:

```typescript
import { FirestoreAdminClient } from "@koiztech/firestore-admin";

const firestore = new FirestoreAdminClient();
```

## Usage

`firestore-admin` will take care of parsing the data to/from JSON when
fetching/updating documents.

### Create a document

```typescript
const document = await firestore.createDocument("my-collection", {
  name: "John Doe",
});
```

### List all documents in a collection

```typescript
const documents = await firestore.listDocumentsInCollection("my-collection");

// documents = ['document1', 'document2']
```

### Fetch all documents in a collection

Note: The fetched documents will have an additional `_id` field, which is the document ID.

```typescript
const collection = await firestore.getDocumentsInCollection("my-collection");
```

### Fetch all documents in a collection with a filter

Note: The fetched documents will have an additional `_id` field, which is the document ID.

```typescript
// Import the FirestoreOperator enum
import { FirestoreOperator } from "@koiztech/firestore-admin";

// e.g.
const documents = await firestore.getDocumentsInCollection("my-collection", {
  where: {
    filters: [
      ["name", FirestoreOperator.EQUAL, "John Doe"],
    ],
  },
});

// e.g.
const document = await firestore.getDocument("my-collection", {
  where: {
    filters: [
      ["name", FirestoreOperator.IN, ["John Doe", "Max Mustermann"]],
    ],
  },
});

// e.g.
const documents = await firestore.getDocumentsInCollection("my-collection", {
  where: {
    filters: [
      ["name", FirestoreOperator.EQUAL, "Ivan Petrov"],
      ["age", FirestoreOperator.GREATER_THAN, 20],
      ["address.city", FirestoreOperator.EQUAL, "Moscow"], // example of a nested field
    ],
    orderBy: [{ field: "createdAt", direction: "DESCENDING" }], // you can sort the results
    limit: 3, // you can limit the number of results
  },
});
```

### Fetch a specific document

```typescript
const document = await firestore.getDocument("my-collection/my-document");
```

### Update a document

```typescript
await firestore.updateDocument("my-collection/my-document", {
  name: "John Doe"
})

// ...or with specific update fields

await firestore.updateDocument("my-collection/my-document", {
  name: "John Doe",
  age: 30, // this field will not be updated
  address: {
    city: "Dubai",
    country: "United Arab Emirates", // this field will not be updated
  },
}, ["name", "address.city"]); // you can use nested fields as well
```
