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

export async function getDatabase() {
  if (!database) {
    await initDatabase();
  }
  return database;
}

// Re-export all collection operations
export * from './db/collections/costumes.js';
export * from './db/collections/characters.js';
export * from './db/collections/scenes.js';
export * from './db/collections/shootingDays.js';
