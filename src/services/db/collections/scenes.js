// Scene collection operations
import { createCRUDOperations } from '../utils.js';
import { replicateAppwrite } from 'rxdb/plugins/replication-appwrite';

export const sceneSchema = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: {
      type: 'string',
      maxLength: 100,
    },
    sceneNumber: {
      type: 'integer',
    },
    shootingDay: {
      type: ['string', 'null'],
      ref: 'shootingdays',
      default: null,
    },
    location: {
      type: 'string',
      default: '',
    },
    characters: {
      type: 'array',
      ref: 'characters',
      items: {
        type: 'string'
      },
      default: []
    },
    costumes: {
      type: 'array',
      ref: 'costumes',
      items: {
        type: 'string'
      },
      default: []
    },
    createdAt: {
      type: 'number',
    },
    updatedAt: {
      type: 'number',
    },
  },
  required: ['id', 'sceneNumber', 'createdAt', 'updatedAt'],
};

// This will be set by database.js after initialization
let getDb = null;

export function initSceneOperations(getDatabaseFn) {
  getDb = getDatabaseFn;
}

const crud = createCRUDOperations(() => getDb(), 'scenes', 'Scene', {
  sceneNumber: 1,
  shootingDay: null,
  location: '',
  characters: [],
  costumes: []
}, { useTimestamps: true });

// Export CRUD operations directly
export const addScene = crud.add;
export const getSceneById = crud.getById;
export const updateScene = crud.update;

// Get all scenes sorted by scene number
export async function getScenes() {
  const scenes = await crud.getAll();
  return scenes.sort((a, b) => a.sceneNumber - b.sceneNumber);
}

// Get scenes by shooting day
export async function getScenesByShootingDay(shootingDayId) {
  const scenes = await crud.findByQuery({ shootingDay: shootingDayId });
  return scenes.sort((a, b) => a.sceneNumber - b.sceneNumber);
}

// Replication configuration
export function createSceneReplication(collection, client, databaseId) {
  const replicationState = replicateAppwrite({
    replicationIdentifier: 'Scene-replication',
    client,
    databaseId,
    collectionId: 'scenes',
    deletedField: 'deleted',
    collection,
    waitForLeadership: true, // Only leader tab syncs (prevents duplicate requests)
    pull: {
      batchSize: 10,
      modifier: (doc) => {
        // Add timestamps if missing (coming from Appwrite)
        const now = Date.now();

        // Handle Appwrite relationships - extract IDs if nested objects, otherwise keep as-is
        const shootingDay = typeof doc.shootingDay === 'object' && doc.shootingDay !== null
          ? doc.shootingDay.$id || null
          : doc.shootingDay;

        const characters = Array.isArray(doc.characters) && doc.characters.length > 0 && typeof doc.characters[0] === 'object'
          ? doc.characters.map(c => c.$id || c)
          : (doc.characters || []);

        const costumes = Array.isArray(doc.costumes) && doc.costumes.length > 0 && typeof doc.costumes[0] === 'object'
          ? doc.costumes.map(c => c.$id || c)
          : (doc.costumes || []);

        return {
          ...doc,
          shootingDay,
          characters,
          costumes,
          createdAt: (doc.createdAt !== null && doc.createdAt !== undefined) ? doc.createdAt : now,
          updatedAt: (doc.updatedAt !== null && doc.updatedAt !== undefined) ? doc.updatedAt : now,
        };
      }
    },
    push: {
      batchSize: 10,
      modifier: (doc) => {
        console.log('[Scenes Push Modifier] Input doc:', doc);

        // Add timestamps if missing or null (going to Appwrite)
        const now = Date.now();

        // Explicitly only send fields that Appwrite expects
        // This filters out RxDB internal fields like _deleted, _rev, _meta
        const cleanDoc = {
          id: doc.id,
          sceneNumber: doc.sceneNumber,
          shootingDay: doc.shootingDay || null,
          location: doc.location || '',
          characters: doc.characters || [],
          costumes: doc.costumes || [],
          createdAt: (doc.createdAt !== null && doc.createdAt !== undefined) ? doc.createdAt : now,
          updatedAt: (doc.updatedAt !== null && doc.updatedAt !== undefined) ? doc.updatedAt : now,
        };

        console.log('[Scenes Push Modifier] Output cleanDoc:', cleanDoc);
        return cleanDoc;
      }
    },
  });

  // Monitor replication errors
  replicationState.error$.subscribe(error => {
    console.error('[Scenes Sync] Replication error:', error);
    if (error.parameters) {
      console.error('[Scenes Sync] Error parameters:', JSON.stringify(error.parameters, null, 2));
    }
  });

  return replicationState;
}
