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
        conflictHandler: createConflictHandler(),
      },
      shootingdays: {
        schema: shootingDaySchema,
        conflictHandler: createConflictHandler(),
      },
      scenes: {
        schema: sceneSchema,
        conflictHandler: createConflictHandler(),
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

  console.log('[Sync] Setting up Appwrite replication...');

  const replicationState = replicateAppwrite({
    replicationIdentifier: 'Character-replication',
    client,
    databaseId: import.meta.env.VITE_APPWRITE_DATABASE_ID,
    collectionId: 'characters',
    deletedField: 'deleted',
    collection: db.characters,
    live: true,
    retryTime: 5000,
    waitForLeadership: false, // Allow replication in all tabs
    autoStart: true, // Explicitly enable auto-start
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

        // Map Appwrite system timestamps to RxDB-compatible field names
        if (doc.$updatedAt) {
          doc.updatedAt = doc.$updatedAt;
          delete doc.$updatedAt;
        }
        if (doc.$createdAt) {
          doc.createdAt = doc.$createdAt;
          delete doc.$createdAt;
        }

        // Remove other Appwrite system fields that aren't in our schema
        delete doc.$id;
        delete doc.$permissions;
        delete doc.$databaseId;
        delete doc.$collectionId;

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

  // Monitor replication errors
  replicationState.error$.subscribe(error => {
    console.error('[Sync] Replication error:', error);
    if (error.parameters) {
      console.error('[Sync] Error parameters:', JSON.stringify(error.parameters, null, 2));
    }
  });

  // Monitor push attempts and success
  replicationState.sent$.subscribe(data => {
    console.log('[Sync] ✅ Push successful:', data.documents.length, 'document(s)');
    data.documents.forEach(doc => {
      console.log('[Sync]   - Pushed:', doc.id, doc.name);
    });
  });

  // Monitor pull success
  replicationState.received$.subscribe(data => {
    console.log('[Sync] ⬇️  Pull received:', data.documents.length, 'document(s)');
  });

  // Monitor active state
  replicationState.active$.subscribe(active => {
    console.log('[Sync] Replication active:', active);
  });

  // Monitor when replication is canceled
  replicationState.canceled$.subscribe(canceled => {
    if (canceled) {
      console.warn('[Sync] Replication canceled!');
    }
  });

  // Wait for initial sync
  console.log('[Sync] Waiting for initial replication...');
  try {
    await replicationState.awaitInitialReplication();
    console.log('[Sync] ✅ Initial replication complete!');
  } catch (error) {
    console.error('[Sync] ❌ Initial replication failed:', error);
    // Continue anyway - live replication might still work
  }

  // Explicitly start replication to ensure it's running
  console.log('[Sync] Starting replication...');
  await replicationState.start();
  console.log('[Sync] Replication started!');

  // Set up periodic re-sync every 60 seconds to catch any missed changes
  setInterval(() => {
    console.log('[Sync] Running periodic reSync...');
    replicationState.reSync();
  }, 60000);

  return replicationState;
}
