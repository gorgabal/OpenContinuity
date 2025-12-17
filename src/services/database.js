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

  const charactersReplicationState = replicateAppwrite({
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
        console.log('[Characters Push Modifier] Before:', { createdAt: doc.createdAt, updatedAt: doc.updatedAt });
        console.log('[Characters Push Modifier] After:', { createdAt: modified.createdAt, updatedAt: modified.updatedAt });
        return modified;
      }
    },
  });

  // Monitor replication errors for characters
  charactersReplicationState.error$.subscribe(error => {
    console.error('[Characters Sync] Replication error:', error);
    if (error.parameters) {
      console.error('[Characters Sync] Error parameters:', JSON.stringify(error.parameters, null, 2));
    }
  });

  const costumesReplicationState = replicateAppwrite({
    replicationIdentifier: 'Costume-replication',
    client,
    databaseId: import.meta.env.VITE_APPWRITE_DATABASE_ID,
    collectionId: 'costumes',
    deletedField: 'deleted',
    collection: db.costumes,
    waitForLeadership: true, // Only leader tab syncs (prevents duplicate requests)
    pull: {
      batchSize: 10,
      modifier: (doc) => {
        // Add timestamps if missing (coming from Appwrite)
        const now = Date.now();

        // Handle Appwrite relationships - extract IDs if nested objects, otherwise keep as-is
        const character = typeof doc.character === 'object' && doc.character !== null
          ? doc.character.$id || null
          : doc.character;

        const scenes = Array.isArray(doc.scenes) && doc.scenes.length > 0 && typeof doc.scenes[0] === 'object'
          ? doc.scenes.map(s => s.$id || s)
          : doc.scenes;

        const projects = typeof doc.projects === 'object' && doc.projects !== null
          ? doc.projects.$id || null
          : doc.projects;

        // Convert Appwrite attachments JSON string back to RxDB _attachments object
        let _attachments = {};
        if (doc.attachments && typeof doc.attachments === 'string') {
          try {
            _attachments = JSON.parse(doc.attachments);
          } catch (e) {
            console.warn('[Costumes Pull] Failed to parse attachments JSON:', e);
            _attachments = {};
          }
        }

        // Remove the Appwrite attachments field and use the converted _attachments
        const { attachments, ...docWithoutAttachments } = doc;

        return {
          ...docWithoutAttachments,
          character,
          scenes,
          projects,
          _attachments,
          createdAt: (doc.createdAt !== null && doc.createdAt !== undefined) ? doc.createdAt : now,
          updatedAt: (doc.updatedAt !== null && doc.updatedAt !== undefined) ? doc.updatedAt : now,
        };
      }
    },
    push: {
      batchSize: 10,
      modifier: (doc) => {
        debugger;
        console.log('[Costumes Push Modifier] Input doc:', doc);

        // Add timestamps if missing or null (going to Appwrite)
        const now = Date.now();

        // Convert RxDB _attachments object to JSON string for Appwrite
        let attachments = '';
        if (doc._attachments && typeof doc._attachments === 'object') {
          try {
            attachments = JSON.stringify(doc._attachments);
          } catch (e) {
            console.warn('[Costumes Push] Failed to stringify _attachments:', e);
            attachments = '{}';
          }
        }

        // Explicitly only send fields that Appwrite expects
        // This filters out RxDB internal fields like _deleted, _rev, _meta, _attachments
        const cleanDoc = {
          id: doc.id,
          name: doc.name || '',
          character: doc.character || null,
          scenes: doc.scenes || [],
          projects: doc.projects || null,
          notes: doc.notes || '',
          attachments: attachments,
          createdAt: (doc.createdAt !== null && doc.createdAt !== undefined) ? doc.createdAt : now,
          updatedAt: (doc.updatedAt !== null && doc.updatedAt !== undefined) ? doc.updatedAt : now,
        };

        console.log('[Costumes Push Modifier] Output cleanDoc:', cleanDoc);
        return cleanDoc;
      }
    },

  });

  // Monitor replication errors for costumes
  costumesReplicationState.error$.subscribe(error => {
    console.error('[Costumes Sync] Replication error:', error);
    if (error.parameters) {
      console.error('[Costumes Sync] Error parameters:', JSON.stringify(error.parameters, null, 2));
    }
  });

  // Explicitly start replication to ensure it's running
  await charactersReplicationState.start();
  await costumesReplicationState.start();

  return {
    characters: charactersReplicationState,
    costumes: costumesReplicationState
  };
}
