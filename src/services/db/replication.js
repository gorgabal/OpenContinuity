// Centralized replication factory for Appwrite sync
// Derives relationship handling from RxDB schemas automatically
import { replicateAppwrite } from 'rxdb/plugins/replication-appwrite';

/**
 * Extract $id from an Appwrite relationship object.
 * Appwrite returns relationships as objects like { $id: "abc", ... }
 * but RxDB needs just the ID string.
 *
 * @param {any} value - A value that may be an Appwrite object or primitive
 * @returns {string|null} - The extracted ID string, or null if invalid
 */
export function extractAppwriteId(value) {
  if (typeof value === 'object' && value !== null && '$id' in value) {
    return value.$id;
  }
  if (typeof value === 'string') {
    return value;
  }
  return null;
}

/**
 * Extract $id from each item in an array of Appwrite relationship objects.
 *
 * @param {any[]} arr - Array that may contain Appwrite objects or primitives
 * @returns {(string|null)[]} - Array of extracted IDs, with null for invalid items
 */
export function extractAppwriteIdArray(arr) {
  // TODO: Review this behavior - returning [] for non-array inputs is defensive
  // for Appwrite sync but could hide data quality issues. Consider returning
  // null instead and handling it at the schema/validation level.
  if (!Array.isArray(arr)) return [];

  return arr.map(item => extractAppwriteId(item));
}

/**
 * Derive relationship fields from an RxDB schema.
 * Looks for properties with `ref` set to identify relationships.
 *
 * @param {object} schema - RxDB JSON schema
 * @returns {{ single: string[], array: string[] }} - Fields grouped by relationship type
 */
export function getRefFieldsFromSchema(schema) {
  const refFields = { single: [], array: [] };

  for (const [field, config] of Object.entries(schema.properties || {})) {
    if (config.ref) {
      if (config.type === 'array') {
        refFields.array.push(field);
      } else {
        refFields.single.push(field);
      }
    }
  }

  return refFields;
}

/**
 * Get all valid field names from schema (excluding RxDB internals).
 *
 * @param {object} schema - RxDB JSON schema
 * @returns {string[]} - Array of field names
 */
function getSchemaFields(schema) {
  return Object.keys(schema.properties || {});
}

/**
 * Create a pull modifier that handles Appwrite relationships.
 * Extracts $id from relationship objects and ensures timestamps exist.
 *
 * @param {object} refFields - Result from getRefFieldsFromSchema
 * @param {function} [customModifier] - Optional custom modifier to apply after
 * @returns {function} - Pull modifier function
 */
export function createDefaultPullModifier(refFields, customModifier = null) {
  return doc => {
    const now = Date.now();
    const result = { ...doc };

    // Extract IDs from single relationships
    for (const field of refFields.single) {
      result[field] = extractAppwriteId(doc[field]);
    }

    // Extract IDs from array relationships
    for (const field of refFields.array) {
      result[field] = extractAppwriteIdArray(doc[field]);
    }

    // Ensure timestamps exist
    if (doc.createdAt !== null && doc.createdAt !== undefined) {
      result.createdAt = doc.createdAt;
    } else {
      console.error(
        `[Sync] Missing createdAt for doc ${doc.id}, using current time. This may indicate an Appwrite issue.`,
      );
      result.createdAt = now;
    }
    if (doc.updatedAt !== null && doc.updatedAt !== undefined) {
      result.updatedAt = doc.updatedAt;
    } else {
      console.error(
        `[Sync] Missing updatedAt for doc ${doc.id}, using current time. This may indicate an Appwrite issue.`,
      );
      result.updatedAt = now;
    }

    // Apply custom modifier if provided
    if (customModifier) {
      return customModifier(result);
    }

    return result;
  };
}

/**
 * Create a push modifier that filters to schema fields only.
 * This removes RxDB internal fields (_deleted, _rev, _meta) before sending to Appwrite.
 *
 * @param {object} schema - RxDB JSON schema
 * @param {function} [customModifier] - Optional custom modifier to apply after
 * @returns {function} - Push modifier function
 */
export function createDefaultPushModifier(schema, customModifier = null) {
  const schemaFields = getSchemaFields(schema);

  return doc => {
    const now = Date.now();
    const cleanDoc = {};

    // Only include fields defined in schema
    for (const field of schemaFields) {
      if (field in doc) {
        cleanDoc[field] = doc[field];
      }
    }

    // Ensure timestamps exist
    cleanDoc.createdAt =
      doc.createdAt !== null && doc.createdAt !== undefined
        ? doc.createdAt
        : now;
    cleanDoc.updatedAt =
      doc.updatedAt !== null && doc.updatedAt !== undefined
        ? doc.updatedAt
        : now;

    // Apply custom modifier if provided
    if (customModifier) {
      return customModifier(cleanDoc);
    }

    return cleanDoc;
  };
}

/**
 * Create an Appwrite replication state for a collection.
 * Automatically derives relationship handling from the collection's schema.
 *
 * @param {object} collection - RxDB collection
 * @param {object} client - Appwrite client
 * @param {string} databaseId - Appwrite database ID
 * @param {object} [config] - Optional configuration overrides
 * @param {string} [config.entityName] - Name for replication identifier (defaults to collection name)
 * @param {string} [config.collectionId] - Appwrite collection ID (defaults to collection name)
 * @param {number} [config.retryTime] - Retry interval in ms
 * @param {function} [config.pullModifier] - Custom pull modifier (receives doc after default processing)
 * @param {function} [config.pushModifier] - Custom push modifier (receives doc after default processing)
 * @returns {object} - RxDB replication state
 */
export function createAppwriteReplication(
  collection,
  client,
  databaseId,
  config = {},
) {
  const collectionName = collection.name;
  const schema = collection.schema.jsonSchema;
  const refFields = getRefFieldsFromSchema(schema);

  const {
    entityName = collectionName.charAt(0).toUpperCase() +
      collectionName.slice(1),
    collectionId = collectionName,
    retryTime,
    pullModifier: customPullModifier,
    pushModifier: customPushModifier,
  } = config;

  // Build replication config
  const replicationConfig = {
    replicationIdentifier: `${entityName}-replication`,
    client,
    databaseId,
    collectionId,
    deletedField: 'deleted',
    collection,
    waitForLeadership: true,
    live: true,
    pull: {
      batchSize: 10,
      modifier: createDefaultPullModifier(refFields, customPullModifier),
    },
    push: {
      batchSize: 10,
      modifier: createDefaultPushModifier(schema, customPushModifier),
    },
  };

  // Add optional retryTime
  // FIXME: this shouldn't be configurable, make a good default one. Investigate.
  if (retryTime !== undefined) {
    replicationConfig.retryTime = retryTime;
  }

  const replicationState = replicateAppwrite(replicationConfig);

  // Monitor replication errors
  replicationState.error$.subscribe(error => {
    console.error(`[${entityName} Sync] Replication error:`, error);
    if (error.parameters) {
      console.error(
        `[${entityName} Sync] Error parameters:`,
        JSON.stringify(error.parameters, null, 2),
      );
    }
  });

  return replicationState;
}
