# Firestore Admin Client for Deno

This is a simple Firestore Admin Client implemented for Deno. It provides an easy-to-use interface for interacting with Firestore databases using the Google Cloud Firestore API.

## Features

- Authentication using Google Service Account
- Automatic token refresh
- CRUD operations on Firestore documents
- Support for querying collections
- Conversion between Firestore document format and JSON

## Prerequisites

- Deno installed on your system
- A Google Cloud project with Firestore enabled
- A service account JSON key file with the necessary permissions

## Setup

1. Set the `FIREBASE_SERVICE_ACCOUNT` environment variable with the contents of your service account JSON key file.

2. Install `@koiztech/firestore-admin` as a dependency:

```bash
deno add @koiztech/firestore-admin
```

3. Import `FirestoreAdminClient` in your Deno script and initialise it:

```typescript
import { FirestoreAdminClient } from '@koiztech/firestore-admin'

const firestore = new FirestoreAdminClient()
```

## Usage

`firestore-admin` will take care of parsing the data to/from JSON when fetching/updating documents.

### Fetch all documents in a collection

```typescript
const collection = await firestore.getDocumentsInCollection('my-collection')
```

### Fetch a document

```typescript
const document = await firestore.getDocument('my-collection/my-document')
```

### Update a document

```typescript
await firestore.updateDocument('my-collection/my-document', {
  name: 'John Doe'
})

// ...or with specific update fields

await firestore.updateDocument('my-collection/my-document', {
  name: 'John Doe',
  age: 30 // this field will not be updated
  address: {
    city: 'Dubai',
    country: 'United Arab Emirates' // this field will not be updated
  }
}, ['name', 'address.city'])
```
