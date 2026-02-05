import { addRxPlugin, createRxDatabase } from 'rxdb/plugins/core';
import { RxDBDevModePlugin } from 'rxdb/plugins/dev-mode';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import { wrappedValidateAjvStorage } from 'rxdb/plugins/validate-ajv';
import { RxDBUpdatePlugin } from 'rxdb/plugins/update';
import { RxDBAttachmentsPlugin } from 'rxdb/plugins/attachments';
import { Client } from 'appwrite';
import { generateUUID, getTimestamps } from './utils.js';

// Import schemas and replication functions
import { costumeSchema, initCostumeOperations, createCostumeReplication } from './collections/costumes.js';
import { characterSchema, initCharacterOperations, createCharacterReplication } from './collections/characters.js';
import { sceneSchema, initSceneOperations, createSceneReplication } from './collections/scenes.js';
import { shootingDaySchema, initShootingDayOperations, createShootingDayReplication } from './collections/shootingDays.js';
import { projectSchema, initProjectOperations, createProjectReplication } from './collections/projects.js';
import { photoSchema, initPhotoOperations, createPhotoReplication } from './collections/photos.js';
import { photoFileSchema, initPhotoFileOperations } from './collections/photoFiles.js';
import { createConflictHandler } from './conflictHandler.js';

let database = null;
let initPromise = null;
let replicationStates = null;

// Function to clear and reset database (called on logout)
export async function clearDatabase() {
  if (database) {
    await database.remove();
    database = null;
    initPromise = null;
  }
  // Also reset sync state
  syncState.started = false;
  syncState.promise = null;
  replicationStates = null;
}

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
    // Request persistent storage to prevent automatic eviction
    if (navigator.storage && navigator.storage.persist) {
      const isPersisted = await navigator.storage.persist();
      if (isPersisted) {
        console.log('Persistent storage granted - data will not be automatically evicted');
      } else {
        console.warn('Persistent storage denied - data may be evicted during storage pressure');
      }
    }

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
    });

    // Define collections to add
    const collectionsToAdd = {
      projects: {
        schema: projectSchema,
        conflictHandler: createConflictHandler(),
      },
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
      photos: {
        schema: photoSchema,
        conflictHandler: createConflictHandler(),
      },
      photofiles: {
        schema: photoFileSchema,
        // No conflict handler - this is local-only, not synced
      },
    };

    // Only add collections that don't already exist
    const collectionsToCreate = {};
    for (const [collectionName, collectionConfig] of Object.entries(collectionsToAdd)) {
      if (!database.collections[collectionName]) {
        collectionsToCreate[collectionName] = collectionConfig;
      }
    }

    // Add missing collections
    if (Object.keys(collectionsToCreate).length > 0) {
      await database.addCollections(collectionsToCreate);
    }

    // Initialize collection operations with database getter
    initProjectOperations(getDatabase);
    initCostumeOperations(getDatabase);
    initCharacterOperations(getDatabase);
    initSceneOperations(getDatabase);
    initShootingDayOperations(getDatabase);
    initPhotoOperations(getDatabase);
    initPhotoFileOperations(getDatabase);

    return database;
  })();

  return await initPromise;
}

let syncState = { started: false, promise: null };

export async function getDatabase() {
  if (!database) {
    await initDatabase();
  }

  return database;
}

// Separate function to start sync - should be called after database is ready
export async function startDatabaseSync() {
  if (syncState.started) {
    return syncState.promise;
  }

  syncState.started = true;
  syncState.promise = DatabaseSyncAppwrite().catch(err => {
    console.error('Failed to start Appwrite sync:', err);
  });

  return syncState.promise;
}

// Re-export all collection operations
export * from './collections/projects.js';
export * from './collections/costumes.js';
export * from './collections/characters.js';
export * from './collections/scenes.js';
export * from './collections/shootingDays.js';
export * from './collections/photos.js';
export * from './collections/photoFiles.js';

export async function DatabaseSyncAppwrite() {
  const db = await getDatabase();

  const client = new Client()
    .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT)
    .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID);

  const databaseId = import.meta.env.VITE_APPWRITE_DATABASE_ID;

  // Create replication states using collection-specific configurations
  const projectsReplicationState = createProjectReplication(
    db.projects,
    client,
    databaseId
  );

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

  const photosReplicationState = createPhotoReplication(
    db.photos,
    client,
    databaseId
  );

  // Explicitly start replication to ensure it's running
  await projectsReplicationState.start();
  await charactersReplicationState.start();
  await costumesReplicationState.start();
  await scenesReplicationState.start();
  await shootingDaysReplicationState.start();
  await photosReplicationState.start();

  // Check if we have existing projects in local DB
  const existingProjectsCount = await db.projects.count().exec();

  if (existingProjectsCount === 0) {
    // Local DB is empty - wait for initial sync to prevent duplicate default projects
    // Use a timeout to avoid hanging forever if offline
    console.log('Local DB is empty, waiting for initial projects sync from Appwrite...');

    const timeoutPromise = new Promise((resolve) => {
      setTimeout(() => {
        console.warn('Initial sync timeout - proceeding anyway (may be offline)');
        resolve('timeout');
      }, 5000); // 5 second timeout
    });

    const syncResult = await Promise.race([
      projectsReplicationState.awaitInitialReplication().then(() => 'completed'),
      timeoutPromise
    ]);

    if (syncResult === 'completed') {
      console.log('Initial projects sync completed');
    }
  } else {
    console.log(`Found ${existingProjectsCount} projects in local DB, skipping initial sync wait (offline support)`);
  }

  // Store replication states globally for manual sync access
  replicationStates = {
    projects: projectsReplicationState,
    characters: charactersReplicationState,
    costumes: costumesReplicationState,
    scenes: scenesReplicationState,
    shootingdays: shootingDaysReplicationState,
    photos: photosReplicationState,
  };

  // Set up manual polling every 30 seconds
  const syncInterval = setInterval(() => {
    projectsReplicationState.reSync();
    charactersReplicationState.reSync();
    costumesReplicationState.reSync();
    scenesReplicationState.reSync();
    shootingDaysReplicationState.reSync();
    photosReplicationState.reSync();
  }, 30000); // 30 seconds

  // Start background photo sync to Appwrite Storage
  // Use dynamic import to avoid circular dependency
  let photoSyncCleanup = null;
  import('../photoUpload.js').then(({ startPhotoSync }) => {
    photoSyncCleanup = startPhotoSync();
  }).catch(err => {
    console.error('Failed to start photo sync:', err);
  });

  // Clean up interval when database is destroyed or page unloads
  window.addEventListener('beforeunload', () => {
    clearInterval(syncInterval);
    if (photoSyncCleanup) {
      photoSyncCleanup();
    }
  });

  return {
    ...replicationStates,
    syncInterval // Return interval ID so it can be cleared if needed
  };
}

// Function to manually trigger sync for a specific collection
export function triggerSync(collectionName) {
  if (!replicationStates) {
    console.warn('Replication not initialized yet, cannot trigger sync');
    return;
  }

  const replicationState = replicationStates[collectionName];
  if (replicationState) {
    console.log(`Triggering immediate sync for ${collectionName}`);
    replicationState.reSync();
  } else {
    console.warn(`No replication state found for collection: ${collectionName}`);
  }
}

// Generic CRUD factory function
export function createCRUDOperations(getDb, collectionName, entityName, defaultData = {}, options = {}) {
  const { useTimestamps = true } = options;

  return {
    add: async (data = {}) => {
      const db = await getDb();
      const document = {
        id: generateUUID(),
        ...defaultData,
        ...data,
        ...(useTimestamps ? getTimestamps(true) : {}),
      };
      const result = await db[collectionName].insert(document);

      // Trigger immediate sync to Appwrite
      triggerSync(collectionName);

      return result;
    },

    getAll: async () => {
      const db = await getDb();
      return await db[collectionName].find().exec();
    },

    getById: async (id) => {
      const db = await getDb();
      return await db[collectionName].findOne(id).exec();
    },

    getById$: async (id) => {
      const db = await getDb();
      return db[collectionName].findOne(id).$;
    },

    getAll$: async () => {
      const db = await getDb();
      return db[collectionName].find().$;
    },

    update: async (id, updateData) => {
      const db = await getDb();
      const doc = await db[collectionName].findOne(id).exec();
      if (!doc) {
        throw new Error(`${entityName} with id ${id} not found`);
      }

      // Remove null and undefined values to let defaults or required validation handle them
      const cleanedData = {};
      Object.keys(updateData).forEach(key => {
        if (updateData[key] !== null && updateData[key] !== undefined) {
          cleanedData[key] = updateData[key];
        }
      });

      const result = await doc.update({
        $set: { ...cleanedData, ...(useTimestamps ? getTimestamps(false) : {}) }
      });

      // Trigger immediate sync to Appwrite
      triggerSync(collectionName);

      return result;
    },

    delete: async (id) => {
      const db = await getDb();
      const doc = await db[collectionName].findOne(id).exec();
      if (!doc) {
        throw new Error(`${entityName} with id ${id} not found`);
      }
      const result = await doc.remove();

      // Trigger immediate sync to Appwrite
      triggerSync(collectionName);

      return result;
    },

    findByQuery: async (selector) => {
      const db = await getDb();
      return await db[collectionName].find({ selector }).exec();
    }
  };
}
