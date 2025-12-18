import { addRxPlugin, createRxDatabase } from 'rxdb/plugins/core';
import { RxDBDevModePlugin } from 'rxdb/plugins/dev-mode';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import { wrappedValidateAjvStorage } from 'rxdb/plugins/validate-ajv';
import { RxDBUpdatePlugin } from 'rxdb/plugins/update';
import { RxDBAttachmentsPlugin } from 'rxdb/plugins/attachments';
import { Client } from 'appwrite';

// Import schemas and replication functions
import { costumeSchema, initCostumeOperations, createCostumeReplication } from './db/collections/costumes.js';
import { characterSchema, initCharacterOperations, createCharacterReplication } from './db/collections/characters.js';
import { sceneSchema, initSceneOperations, createSceneReplication } from './db/collections/scenes.js';
import { shootingDaySchema, initShootingDayOperations, createShootingDayReplication } from './db/collections/shootingDays.js';
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
      shootingday: {
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

  const databaseId = import.meta.env.VITE_APPWRITE_DATABASE_ID;

  // Create replication states using collection-specific configurations
  const charactersReplicationState = createCharacterReplication(
    db.characters,
    client,
    databaseId
  );

  const costumesReplicationState = createCostumeReplication(
    db.costumes,
    client,
    databaseId
  );

  const scenesReplicationState = createSceneReplication(
    db.scenes,
    client,
    databaseId
  );

  const shootingDaysReplicationState = createShootingDayReplication(
    db.shootingday,
    client,
    databaseId
  );

  // Explicitly start replication to ensure it's running
  await charactersReplicationState.start();
  await costumesReplicationState.start();
  await scenesReplicationState.start();
  await shootingDaysReplicationState.start();

  // Set up manual polling every 30 seconds
  const syncInterval = setInterval(() => {
    charactersReplicationState.reSync();
    costumesReplicationState.reSync();
    scenesReplicationState.reSync();
    shootingDaysReplicationState.reSync();
  }, 30000); // 30 seconds

  // Clean up interval when database is destroyed or page unloads
  window.addEventListener('beforeunload', () => {
    clearInterval(syncInterval);
  });

  return {
    characters: charactersReplicationState,
    costumes: costumesReplicationState,
    scenes: scenesReplicationState,
    shootingdays: shootingDaysReplicationState,
    syncInterval // Return interval ID so it can be cleared if needed
  };
}
