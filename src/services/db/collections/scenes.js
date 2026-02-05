// Scene collection operations
import { createCRUDOperations } from '../database.js';
import { map } from 'rxjs/operators';
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
    projects: {
      type: ['string', 'null'],
      ref: 'projects',
      default: null,
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

export const sceneCrud = createCRUDOperations(() => getDb(), 'scenes', 'Scene', {
  sceneNumber: 1,
  shootingDay: null,
  location: '',
  characters: [],
  costumes: [],
  projects: null
}, { useTimestamps: true });

// Get all scenes sorted by scene number
export async function getScenes() {
  const scenes = await sceneCrud.getAll();
  return scenes.sort((a, b) => a.sceneNumber - b.sceneNumber);
}

// Get all scenes as observable (reactive)
export async function getScenes$() {
  const observable = await sceneCrud.getAll$();
  // Transform the observable to sort by scene number
  return observable.pipe(
    map(scenes => scenes.sort((a, b) => a.sceneNumber - b.sceneNumber))
  );
}

// Get scenes by shooting day
export async function getScenesByShootingDay(shootingDayId) {
  const scenes = await sceneCrud.findByQuery({ shootingDay: shootingDayId });
  return scenes.sort((a, b) => a.sceneNumber - b.sceneNumber);
}

// Get scenes by project ID
export async function getScenesByProject(projectId) {
  const db = await getDb();
  const scenes = await db.scenes.find({ selector: { projects: projectId } }).exec();
  return scenes.sort((a, b) => a.sceneNumber - b.sceneNumber);
}

// Get scenes by project as observable
export async function getScenesByProject$(projectId) {
  const db = await getDb();
  const observable = db.scenes.find({ selector: { projects: projectId } }).$;
  return observable.pipe(
    map(scenes => scenes.sort((a, b) => a.sceneNumber - b.sceneNumber))
  );
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
    live: false, // Disable realtime subscriptions, use polling instead
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

        const projects = typeof doc.projects === 'object' && doc.projects !== null
          ? doc.projects.$id || null
          : doc.projects;

        return {
          ...doc,
          shootingDay,
          characters,
          costumes,
          projects,
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
          projects: doc.projects || null,
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
