import { addRxPlugin, createRxDatabase } from 'rxdb/plugins/core';
import { RxDBDevModePlugin } from 'rxdb/plugins/dev-mode';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import { wrappedValidateAjvStorage } from 'rxdb/plugins/validate-ajv';
import { RxDBUpdatePlugin } from 'rxdb/plugins/update';
import { RxDBAttachmentsPlugin } from 'rxdb/plugins/attachments';
import { replicateAppwrite } from 'rxdb/plugins/replication-appwrite';
import { Client } from 'appwrite';

// Import schemas
import { costumeSchema, initCostumeOperations } from './db/collections/costumes.js';
import { characterSchema, initCharacterOperations } from './db/collections/characters.js';
import { sceneSchema, initSceneOperations } from './db/collections/scenes.js';
import { shootingDaySchema, initShootingDayOperations } from './db/collections/shootingDays.js';

let database = null;
let initPromise = null;

export async function initDatabase() {
  if (database) {
    return database;
  }

  // If initialization is already in progress, wait for it
  if (initPromise) {
    return await initPromise;
  }

  // Start initialization
  initPromise = (async () => {
    // Add plugins
    addRxPlugin(RxDBDevModePlugin);
    addRxPlugin(RxDBUpdatePlugin);
    addRxPlugin(RxDBAttachmentsPlugin);

    // Create database
    database = await createRxDatabase({
      name: 'opencontinuity',
      storage: wrappedValidateAjvStorage({
        storage: getRxStorageDexie(),
      }),
      ignoreDuplicate: true, // FIXME: this should be set to false in production
    });

    // Add collections
    await database.addCollections({
      costumes: {
        schema: costumeSchema,
      },
      shootingdays: {
        schema: shootingDaySchema,
      },
      scenes: {
        schema: sceneSchema,
      },
      characters: {
        schema: characterSchema,
      },
    });

    // Initialize collection operations with database getter
    initCostumeOperations(getDatabase);
    initCharacterOperations(getDatabase);
    initSceneOperations(getDatabase);
    initShootingDayOperations(getDatabase);

    return database;
  })();

  return await initPromise;
}

let syncStarted = false;

export async function getDatabase() {
  if (!database) {
    await initDatabase();
  }

  // Start sync automatically on first database access
  if (!syncStarted) {
    syncStarted = true;
    DatabaseSyncAppwrite().catch(err => {
      console.error('Failed to start Appwrite sync:', err);
    });
  }

  return database;
}

// Re-export all collection operations
export * from './db/collections/costumes.js';
export * from './db/collections/characters.js';
export * from './db/collections/scenes.js';
export * from './db/collections/shootingDays.js';

export async function DatabaseSyncAppwrite() {
  const db = await getDatabase();

  const client = new Client()
    .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT)
    .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID);

  const replicationState = replicateAppwrite({
    replicationIdentifier: 'Character-replication',
    client,
    databaseId: import.meta.env.VITE_APPWRITE_DATABASE_ID,
    collectionId: 'characters',
    deletedField: 'deleted',
    collection: db.characters,
    pull: {
      batchSize: 10,
      modifier: (doc) => {
        // Handle null/undefined fields
        if (doc.notes === null || doc.notes === undefined) {
          doc.notes = '';
        }
        if (doc.description === null || doc.description === undefined) {
          doc.description = '';
        }
        if (doc.actor === null || doc.actor === undefined) {
          doc.actor = '';
        }
        if (doc.scenes === null || doc.scenes === undefined) {
          doc.scenes = [];
        }

        // Remove Appwrite system fields that aren't in our schema
        delete doc.$id;
        delete doc.$createdAt;
        delete doc.$updatedAt;
        delete doc.$permissions;
        delete doc.$databaseId;
        delete doc.$collectionId;
        delete doc.createdAt;
        delete doc.updatedAt;

        return doc;
      },
    },
    push: {
      batchSize: 10,
      modifier: (doc) => {
        // Convert null fields to empty strings to match schema
        const cleanDoc = { ...doc };
        if (cleanDoc.notes === null || cleanDoc.notes === undefined) {
          cleanDoc.notes = '';
        }
        if (cleanDoc.description === null || cleanDoc.description === undefined) {
          cleanDoc.description = '';
        }
        if (cleanDoc.actor === null || cleanDoc.actor === undefined) {
          cleanDoc.actor = '';
        }

        return cleanDoc;
      },
    },
  });

  // Add error handler
  replicationState.error$.subscribe(error => {
    console.error('[Sync] Replication error:', error);
  });

  // Wait for initial sync
  await replicationState.awaitInitialReplication();

  // Set up periodic re-sync every 60 seconds to catch any missed changes
  setInterval(() => {
    replicationState.reSync();
  }, 60000);

  return replicationState;
}
