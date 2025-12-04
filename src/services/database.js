import { addRxPlugin, createRxDatabase } from 'rxdb/plugins/core';
import { RxDBDevModePlugin } from 'rxdb/plugins/dev-mode';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import { wrappedValidateAjvStorage } from 'rxdb/plugins/validate-ajv';
import { RxDBUpdatePlugin } from 'rxdb/plugins/update';
import { RxDBAttachmentsPlugin } from 'rxdb/plugins/attachments';
import { replicateAppwrite } from 'rxdb/plugins/replication-appwrite';
import { Client } from 'appwrite';

// Import schemas and collection operations
import { costumeSchema, createCostumeOperations } from './db/collections/costumes.js';
import { characterSchema, createCharacterOperations } from './db/collections/characters.js';
import { sceneSchema, createSceneOperations } from './db/collections/scenes.js';
import { shootingDaySchema, createShootingDayOperations } from './db/collections/shootingDays.js';

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

// Initialize collection operations
const costumeOps = createCostumeOperations(getDatabase);
const characterOps = createCharacterOperations(getDatabase);
const sceneOps = createSceneOperations(getDatabase);
const shootingDayOps = createShootingDayOperations(getDatabase);

// Re-export all costume operations
export const {
  addCostume,
  getCostumes,
  getCostumeById,
  getCostumeById$,
  getCostumes$,
  updateCostume,
  deleteCostume,
  getCostumeWithCharacter,
  getCostumesWithCharacters,
  addPhotoToCostume,
  getPhotoUrl,
  removePhotoFromCostume,
  getAllPhotosForCostume,
  getCostumesByCharacterId,
  assignCostumeToCharacter,
  unassignCostumeFromCharacter
} = costumeOps;

// Re-export all character operations
export const {
  addCharacter,
  getCharacters,
  getCharacterById,
  updateCharacter,
  deleteCharacter
} = characterOps;

// Re-export all scene operations
export const {
  addScene,
  getScenes,
  getSceneById,
  updateScene,
  getScenesByShootingDay
} = sceneOps;

// Re-export all shooting day operations
export const {
  addShootingDay,
  getShootingDays,
  getShootingDayById,
  updateShootingDay,
  ensureDefaultShootingDay
} = shootingDayOps;
