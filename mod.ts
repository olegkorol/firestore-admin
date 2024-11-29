// deno-lint-ignore-file no-explicit-any
import * as googleAuth from "google-auth-library";

/**
 * Enum representing the available Firestore query operators
 */
export enum FirestoreOperator {
  LESS_THAN = "LESS_THAN",
  LESS_THAN_OR_EQUAL = "LESS_THAN_OR_EQUAL",
  GREATER_THAN = "GREATER_THAN",
  GREATER_THAN_OR_EQUAL = "GREATER_THAN_OR_EQUAL",
  EQUAL = "EQUAL",
  NOT_EQUAL = "NOT_EQUAL",
  ARRAY_CONTAINS = "ARRAY_CONTAINS",
  IN = "IN",
  ARRAY_CONTAINS_ANY = "ARRAY_CONTAINS_ANY",
  NOT_IN = "NOT_IN",
  IS_NAN = "IS_NAN",
  IS_NULL = "IS_NULL",
  IS_NOT_NAN = "IS_NOT_NAN",
  IS_NOT_NULL = "IS_NOT_NULL",
}

/**
 * Firestore Admin Client for interacting with Google Cloud Firestore in Deno.
 *
 * Handles authentication via service account credentials and provides methods for CRUD operations.
 * Requires FIREBASE_SERVICE_ACCOUNT environment variable to be set with service account JSON.
 *
 * @example
 * ```ts
 * const firestore = new FirestoreAdminClient();
 * ```
 */
export class FirestoreAdminClient {
  private FIREBASE_SERVICE_ACCOUNT: any;
  private GCP_PROJECT_NAME: string;
  private AUTH_SCOPES: string[];
  private firestoreBaseUrl: string;
  private jwtClient: googleAuth.JWT;
  private accessToken: string | null | undefined;
  private tokenExpiry: number;

  constructor() {
    const serviceAccountJson = Deno.env.get("FIREBASE_SERVICE_ACCOUNT");
    if (!serviceAccountJson) {
      throw new Error(
        "FIREBASE_SERVICE_ACCOUNT environment variable is not set",
      );
    }

    this.FIREBASE_SERVICE_ACCOUNT = JSON.parse(serviceAccountJson);
    this.GCP_PROJECT_NAME = this.FIREBASE_SERVICE_ACCOUNT.project_id;
    this.AUTH_SCOPES = ["https://www.googleapis.com/auth/cloud-platform"];
    this.firestoreBaseUrl =
      `https://content-firestore.googleapis.com/v1/projects/${this.GCP_PROJECT_NAME}/databases/(default)/documents`;
    this.jwtClient = new googleAuth.JWT(
      this.FIREBASE_SERVICE_ACCOUNT.client_email,
      undefined,
      this.FIREBASE_SERVICE_ACCOUNT.private_key,
      this.AUTH_SCOPES,
      undefined,
    );
    this.accessToken = null;
    this.tokenExpiry = 0;
  }

  /**
   * Refreshes the access token if expired or not present
   * @private
   * @see https://firebase.google.com/docs/projects/provisioning/configure-oauth#auth
   */
  private async refreshAccessToken(): Promise<void> {
    const now = Date.now();
    if (!this.accessToken || now >= this.tokenExpiry) {
      const tokens = await this.jwtClient.authorize();
      this.accessToken = tokens.access_token;
      this.tokenExpiry = now + (tokens.expiry_date || 3600) * 1000; // Default to 1 hour if expiry_date is not provided by Google
    }
  }

  /**
   * Gets authorization headers for API requests
   * @private
   * @returns Headers object with authorization token
   */
  private async getHeaders(): Promise<Record<string, string>> {
    await this.refreshAccessToken();
    return {
      "accept": "*/*",
      "authorization": `Bearer ${this.accessToken}`,
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "sec-gpc": "1",
    };
  }

  /**
   * Creates a new document in Firestore
   * @param path - The path to the collection where document will be created
   * @param data - The document data to create
   * @returns The created document data with _id and _path fields
   * @example
   * ```ts
   * const document = await firestore.createDocument("my-collection", {
   *   name: "John Doe",
   * });
   * ```
   */
  async createDocument(path: string, data: object): Promise<any> {
    const body = this.jsonToDocument(data);
    const headers = await this.getHeaders();
    const response = await fetch(`${this.firestoreBaseUrl}/${path}`, {
      "headers": headers,
      "body": JSON.stringify(body),
      "method": "POST",
    });
    const responseData: any = await response.json();
    if (responseData?.error) {
      this.errorHandler(responseData.error, "createDocument");
    }
    const jsonDocument = this.documentToJson(responseData.fields);
    return {
      _id: responseData.name.split(`/`).pop(),
      _path: responseData.name.split("documents/")[1],
      ...jsonDocument,
    };
  }

  /**
   * Lists all documents in a collection
   * @param path - The path to the collection
   * @returns Array of document IDs in the collection
   * @example
   * ```ts
   * const documents = await firestore.listDocumentsInCollection("my-collection");
   * ```
   */
  async listDocumentsInCollection(path: string): Promise<string[]> {
    const headers = await this.getHeaders();
    const response = await fetch(`${this.firestoreBaseUrl}/${path}`, {
      "headers": headers,
      "body": null,
      "method": "GET",
    });
    const data: any = await response.json();
    if (data?.error) this.errorHandler(data.error, "listDocumentsInCollection");
    data.documents =
      data.documents?.map((doc: any) => doc.name.split(`${path}/`).pop()) ?? [];
    return data.documents;
  }

  /**
   * Fetches a single document by path
   * @param path - The full path to the document
   * @returns The document data
   * @example
   * ```ts
   * const document = await firestore.getDocument("my-collection/my-document");
   * ```
   */
  async getDocument(path: string): Promise<any> {
    const headers = await this.getHeaders();
    const response = await fetch(`${this.firestoreBaseUrl}/${path}`, {
      "headers": headers,
      "body": null,
      "method": "GET",
    });
    const data: any = await response.json();
    if (data?.error) this.errorHandler(data.error, "getDocument");
    console.log(this.documentToJson(data.fields));
    return this.documentToJson(data.fields);
  }

  /**
   * Fetches all documents in a collection with optional query parameters
   * @param path - The path to the collection
   * @param options - Query options including filters, ordering, limits and offsets
   * @returns Array of document data
   * @example
   * ```ts
   * // Simple case:
   * const documents = await firestore.getDocumentsInCollection("my-collection");
   *
   * // More complex cases:
   *
   * // Import the FirestoreOperator enum
   * import { FirestoreOperator } from "@koiztech/firestore-admin";
   *
   * // use some filters:
   * const documents = await firestore.getDocumentsInCollection("my-collection", {
   *   where: {
   *     filters: [
   *       ["name", FirestoreOperator.EQUAL, "John Doe"],
   *     ],
   *   },
   * });
   *
   * // use filters, sorting and limiting:
   * const documents = await firestore.getDocumentsInCollection("my-collection", {
   *   where: {
   *     filters: [
   *       ["name", FirestoreOperator.EQUAL, "Ivan Petrov"],
   *       ["age", FirestoreOperator.GREATER_THAN, 20],
   *       ["address.city", FirestoreOperator.EQUAL, "Moscow"], // example of a nested field
   *     ],
   *   },
   *   orderBy: [{ field: "createdAt", direction: "DESCENDING" }], // you can sort the results
   *   limit: 3, // you can limit the number of results
   * });
   * ```
   */
  async getDocumentsInCollection(path: string, options?: {
    where?: {
      filters: [string, FirestoreOperator, any][];
      operator?: "AND" | "OR";
    };
    orderBy?: { field: string; direction?: "ASCENDING" | "DESCENDING" }[];
    limit?: number;
    offset?: number;
  }): Promise<any> {
    const headers = await this.getHeaders();

    if (options) {
      const structuredQuery: any = {
        from: [{ collectionId: path, allDescendants: false }],
      };

      if (options.where) {
        structuredQuery.where = {
          compositeFilter: {
            op: "AND",
            filters: options.where.filters.map(([field, op, value]) => ({
              fieldFilter: {
                field: { fieldPath: field },
                op,
                value: this.encodeValue(value),
              },
            })),
          },
        };
      }

      if (options.orderBy) {
        structuredQuery.orderBy = options.orderBy.map((
          { field, direction = "ASCENDING" },
        ) => ({
          field: { fieldPath: field },
          direction,
        }));
      }

      if (options.limit !== undefined) {
        structuredQuery.limit = { value: options.limit };
      }

      if (options.offset !== undefined) {
        structuredQuery.offset = options.offset;
      }

      const response = await fetch(
        `${this.firestoreBaseUrl}:runQuery`,
        {
          headers,
          method: "POST",
          body: JSON.stringify({ structuredQuery }),
        },
      );
      const data: any = await response.json();

      if (data?.error || data?.[0]?.error) {
        this.errorHandler(
          data.error ?? data?.[0]?.error,
          `${this.firestoreBaseUrl}/${path}:runQuery`,
        );
        console.log({
          extendedDetails: data.error?.details ?? data?.[0]?.error?.details,
        });
        return [];
      }

      // If the query yields no results, it will return: [ { readTime: string } ]
      if (data.length == 1 && !data[0].document) {
        return [];
      }

      return data.map((doc: any) => {
        const docId = doc.document?.name.split(`/`).pop() ?? "unknown";
        console.log({ docId });
        const documentFields = doc.document?.fields || {};
        return { ...this.documentToJson(documentFields), _id: docId };
      });
    } else {
      const response = await fetch(`${this.firestoreBaseUrl}/${path}`, {
        headers,
        method: "GET",
      });
      const data: any = await response.json();

      if (data?.error) {
        this.errorHandler(data.error, "listDocumentsInCollection");
      }

      return data.documents.map((doc: any) => {
        const docId = doc.name.split(`/`).pop() ?? "unknown";
        const documentFields = doc.fields || {};
        return { ...this.documentToJson(documentFields), _id: docId };
      });
    }
  }

  /**
   * Updates a document
   * @param path - The path to the document
   * @param data - The data to update
   * @param updateFields - Optional array of field paths to update
   * @returns The updated document data with _id and _path fields
   * @example
   * ```ts
   * await firestore.updateDocument('my-collection/my-document', {
   *   name: 'John Doe'
   * })
   *
   * // ...or with specific update fields
   *
   * await firestore.updateDocument('my-collection/my-document', {
   *   name: 'John Doe',
   *   age: 30, // this field will not be updated
   *   address: {
   *     city: 'Dubai',
   *     country: 'United Arab Emirates' // this field will not be updated
   *   }
   * }, ['name', 'address.city']) // you can use nested fields as well
   * ```
   */
  async updateDocument(
    path: string,
    data: any,
    updateFields?: string[],
  ): Promise<any> {
    const body = this.jsonToDocument(data);
    let url = `${this.firestoreBaseUrl}/${path}`;

    if (updateFields && updateFields.length > 0) {
      url = url.concat(
        `?updateMask.fieldPaths=${
          updateFields.join("&updateMask.fieldPaths=")
        }`,
      );
    }

    console.log("> Updating document:\n", url);

    const headers = await this.getHeaders();
    const response = await fetch(`${url}`, {
      "headers": headers,
      "body": JSON.stringify(body),
      "method": "PATCH",
    });
    const responseData: any = await response.json();
    if (responseData?.error) {
      this.errorHandler(responseData.error, "updateDocument");
    }
    const jsonDocument = this.documentToJson(responseData.fields);
    return {
      _id: responseData.name.split(`/`).pop(),
      _path: responseData.name.split("documents/")[1],
      ...jsonDocument,
    };
  }

  /**
   * Converts Firestore document format to JSON
   * @private
   * @param fields - The Firestore document fields
   * @returns Plain JavaScript object
   */
  private documentToJson(fields: any): any {
    if (!fields) {
      return {};
    }
    const result: any = {};
    for (const f in fields) {
      const key = f,
        value = fields[f],
        isDocumentType = [
          "stringValue",
          "booleanValue",
          "doubleValue",
          "integerValue",
          "timestampValue",
          "mapValue",
          "arrayValue",
          "nullValue",
        ].find((t) => t === key);
      if (isDocumentType) {
        const item = [
          "stringValue",
          "booleanValue",
          "doubleValue",
          "integerValue",
          "timestampValue",
          "nullValue",
        ]
          .find((t) => t === key);
        if (item) {
          return value;
        } else if ("mapValue" == key) {
          return this.documentToJson(value.fields || {});
        } else if ("arrayValue" == key) {
          const list = value.values;
          return !list ? list?.map((l: any) => this.documentToJson(l)) : [];
        }
      } else {
        result[key] = this.documentToJson(value);
      }
    }
    return result;
  }

  /**
   * Encodes JavaScript values to Firestore value types
   * @private
   * @param value - The value to encode
   * @returns Firestore value representation
   */
  private encodeValue(value: any): any {
    if (typeof value === "string") {
      return { stringValue: value };
    } else if (typeof value === "number") {
      if (Number.isInteger(value)) {
        return { integerValue: value };
      } else {
        return { doubleValue: value };
      }
    } else if (typeof value === "boolean") {
      return { booleanValue: value };
    } else if (value === null) {
      return { nullValue: "NULL_VALUE" };
    } else if (Array.isArray(value)) {
      return { arrayValue: { values: value.map((v) => this.encodeValue(v)) } };
    } else {
      throw new Error(`Unsupported value type: ${typeof value}`);
    }
  }

  /**
   * Converts JSON to Firestore document format
   * @private
   * @param json - Plain JavaScript object
   * @returns Firestore document representation
   */
  private jsonToDocument(json: any): { fields: any } {
    const data: any = { fields: {} };
    Object.keys(json).forEach((key) => {
      let value = json[key];
      let type;
      if (typeof value === "string") {
        type = "stringValue";
      } else if (typeof value === "number") {
        if (Number.isInteger(value)) {
          type = "integerValue";
          if (isNaN(value)) value = 0; // catch NaN
        } else {
          type = "doubleValue";
          if (isNaN(value)) value = 0.00; // catch NaN
        }
      } else if (value instanceof Date) {
        type = "timestampValue";
        value = value.toJSON();
      } else if (typeof value === "boolean") {
        type = "booleanValue";
      } else if (value === null || value === undefined) {
        type = "nullValue";
      } else if (Array.isArray(value)) {
        type = "arrayValue";
        value = {
          values: value.map((v) => {
            const val = this.jsonToDocument({ value: v }).fields.value;
            return val;
          }),
        };
      } else if (typeof value === "object") {
        type = "mapValue";
        value = { fields: this.jsonToDocument(value).fields };
      } else {
        throw new Error(`Unsupported type for value: ${value}`);
      }
      data.fields[key] = { [type]: value };
    });
    return data;
  }

  /**
   * Handles errors from Firestore API calls
   * @private
   * @param error - The error object from Firestore
   * @param call - The name of the function that encountered the error
   */
  private errorHandler(error: any, call: any): void {
    console.error(
      "*-*".repeat(20),
      "\ncall:",
      call,
      "\nerrorCode:",
      error.code,
      "\nerrorMessage:",
      `${error.message}\n`,
      "*-*".repeat(20),
    );
  }
}
