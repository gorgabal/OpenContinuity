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
import { createConflictHandler } from './db/conflictHandler.js';

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
        conflictHandler: createConflictHandler(),
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
    waitForLeadership: true, // Only leader tab syncs (prevents duplicate requests)
    pull: {
      batchSize: 10,
      modifier: (doc) => {
        // Add timestamps if missing (coming from Appwrite)
        const now = Date.now();
        return {
          ...doc,
          createdAt: (doc.createdAt !== null && doc.createdAt !== undefined) ? doc.createdAt : now,
          updatedAt: (doc.updatedAt !== null && doc.updatedAt !== undefined) ? doc.updatedAt : now,
        };
      }
    },
    push: {
      batchSize: 10,
      modifier: (doc) => {
        // Add timestamps if missing or null (going to Appwrite)
        const now = Date.now();
        const modified = {
          ...doc,
          createdAt: (doc.createdAt !== null && doc.createdAt !== undefined) ? doc.createdAt : now,
          updatedAt: (doc.updatedAt !== null && doc.updatedAt !== undefined) ? doc.updatedAt : now,
        };
        console.log('[Push Modifier] Before:', { createdAt: doc.createdAt, updatedAt: doc.updatedAt });
        console.log('[Push Modifier] After:', { createdAt: modified.createdAt, updatedAt: modified.updatedAt });
        return modified;
      }
    },
  });

  // Monitor replication errors
  replicationState.error$.subscribe(error => {
    console.error('[Sync] Replication error:', error);
    if (error.parameters) {
      console.error('[Sync] Error parameters:', JSON.stringify(error.parameters, null, 2));
    }
  });

  // Explicitly start replication to ensure it's running
  await replicationState.start();

  return replicationState;
}
