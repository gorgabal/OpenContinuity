// Character collection operations
import { createCRUDOperations } from '../utils.js';
import { map } from 'rxjs/operators';
import { replicateAppwrite } from 'rxdb/plugins/replication-appwrite';

export const characterSchema = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: {
      type: 'string',
      maxLength: 100,
    },
    name: {
      type: 'string',
    },
    description: {
      type: 'string',
      default: '',
    },
    actor: {
      type: 'string',
      default: '',
    },
    notes: {
      type: 'string',
      default: '',
    },
    scenes: {
      type: 'array',
      default: [],
      items: {
        type: 'string',
      },
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
  required: ['id', 'name'],
};

// This will be set by database.js after initialization
let getDb = null;

export function initCharacterOperations(getDatabaseFn) {
  getDb = getDatabaseFn;
}

const crud = createCRUDOperations(() => getDb(), 'characters', 'Character', {
  name: 'New Character',
  description: '',
  actor: '',
  notes: '',
  scenes: [],
  projects: null
}, { useTimestamps: true });

// Export CRUD operations directly
export const addCharacter = crud.add;
export const getCharacterById = crud.getById;
export const getCharacterById$ = crud.getById$;
export const updateCharacter = crud.update;
export const deleteCharacter = crud.delete;

// Get all characters sorted by name
export async function getCharacters() {
  const characters = await crud.getAll();
  return characters.sort((a, b) => a.name.localeCompare(b.name));
}

// Get all characters as observable (reactive)
export async function getCharacters$() {
  const observable = await crud.getAll$();
  // Transform the observable to sort by name
  return observable.pipe(
    map(characters => characters.sort((a, b) => a.name.localeCompare(b.name)))
  );
}

// Get characters by project ID
export async function getCharactersByProject(projectId) {
  const db = await getDb();
  const characters = await db.characters.find({ selector: { projects: projectId } }).exec();
  return characters.sort((a, b) => a.name.localeCompare(b.name));
}

// Get characters by project as observable
export async function getCharactersByProject$(projectId) {
  const db = await getDb();
  const observable = db.characters.find({ selector: { projects: projectId } }).$;
  return observable.pipe(
    map(characters => characters.sort((a, b) => a.name.localeCompare(b.name)))
  );
}

// Replication configuration
export function createCharacterReplication(collection, client, databaseId) {
  const replicationState = replicateAppwrite({
    replicationIdentifier: 'Character-replication',
    client,
    databaseId,
    collectionId: 'characters',
    deletedField: 'deleted',
    collection,
    waitForLeadership: true, // Only leader tab syncs (prevents duplicate requests)
    retryTime: 3000, // Retry every 3 seconds instead of default 5 seconds
    live: false, // Disable realtime subscriptions, use polling instead
    pull: {
      batchSize: 10,
      modifier: (doc) => {
        // Add timestamps if missing (coming from Appwrite)
        const now = Date.now();

        // Handle Appwrite relationships - extract IDs if nested objects, otherwise keep as-is
        const projects = typeof doc.projects === 'object' && doc.projects !== null
          ? doc.projects.$id || null
          : doc.projects;

        return {
          ...doc,
          projects,
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

        // Explicitly only send fields that Appwrite expects
        // This filters out RxDB internal fields like _deleted, _rev, _meta
        const cleanDoc = {
          id: doc.id,
          name: doc.name,
          description: doc.description || '',
          actor: doc.actor || '',
          notes: doc.notes || '',
          scenes: doc.scenes || [],
          projects: doc.projects || null,
          createdAt: (doc.createdAt !== null && doc.createdAt !== undefined) ? doc.createdAt : now,
          updatedAt: (doc.updatedAt !== null && doc.updatedAt !== undefined) ? doc.updatedAt : now,
        };

        console.log('[Characters Push Modifier] Before:', { createdAt: doc.createdAt, updatedAt: doc.updatedAt });
        console.log('[Characters Push Modifier] After:', { createdAt: cleanDoc.createdAt, updatedAt: cleanDoc.updatedAt });
        return cleanDoc;
      }
    },
  });

  // Monitor replication errors
  replicationState.error$.subscribe(error => {
    console.error('[Characters Sync] Replication error:', error);
    if (error.parameters) {
      console.error('[Characters Sync] Error parameters:', JSON.stringify(error.parameters, null, 2));
    }
  });

  return replicationState;
}
