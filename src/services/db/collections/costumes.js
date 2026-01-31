// Costume collection operations
import { createCRUDOperations, getWithPopulated } from '../utils.js';
import { replicateAppwrite } from 'rxdb/plugins/replication-appwrite';

export const costumeSchema = {
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
      default: '',
    },
    character: {
      type: ['string', 'null'],
      ref: 'characters',
      default: null,
    },
    scenes: {
      type: 'array',
      ref: 'scenes',
      items: {
        type: 'string'
      },
      default: []
    },
    photos: {
      type: 'array',
      ref: 'photos',
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
    notes: {
      type: 'string',
      default: '',
    },
    createdAt: {
      type: 'number',
    },
    updatedAt: {
      type: 'number',
    },
  },
  required: ['id', 'createdAt', 'updatedAt'],
};

// This will be set by database.js after initialization
let getDb = null;

export function initCostumeOperations(getDatabaseFn) {
  getDb = getDatabaseFn;
}

export const costumeCrud = createCRUDOperations(() => getDb(), 'costumes', 'Costume', {
  name: 'New Costume',
  character: null,
  scenes: [],
  photos: [],
  projects: null,
  notes: ''
}, { useTimestamps: true });

// Get costumes by project ID
export async function getCostumesByProject(projectId) {
  const db = await getDb();
  return await db.costumes.find({ selector: { projects: projectId } }).exec();
}

// Get costumes by project as observable
export async function getCostumesByProject$(projectId) {
  const db = await getDb();
  return db.costumes.find({ selector: { projects: projectId } }).$;
}

// Helper function to get costume with populated character reference
export async function getCostumeWithCharacter(id) {
  const db = await getDb();
  return await getWithPopulated(db, 'costumes', id, ['character']);
}

// Helper function to get all costumes with populated character references
export async function getCostumesWithCharacters() {
  const costumes = await costumeCrud.getAll();
  return await Promise.all(
    costumes.map(async (costume) => {
      if (costume.character) {
        await costume.populate('character');
      }
      return costume;
    })
  );
}

// Get costumes by character ID
export async function getCostumesByCharacterId(characterId) {
  const costumes = await costumeCrud.findByQuery({ character: characterId });
  // Populate character reference for each costume
  return await Promise.all(
    costumes.map(async (costume) => {
      await costume.populate('character');
      return costume;
    })
  );
}

// Assign costume to character
export async function assignCostumeToCharacter(costumeId, characterId) {
  const db = await getDb();

  // Verify character exists
  const character = await db.characters.findOne(characterId).exec();
  if (!character) {
    throw new Error(`Character with id ${characterId} not found`);
  }

  return await costumeCrud.update(costumeId, { character: characterId });
}

// Unassign costume from character
export async function unassignCostumeFromCharacter(costumeId) {
  return await costumeCrud.update(costumeId, { character: null });
}

// Replication configuration
export function createCostumeReplication(collection, client, databaseId) {
  const replicationState = replicateAppwrite({
    replicationIdentifier: 'Costume-replication',
    client,
    databaseId,
    collectionId: 'costumes',
    deletedField: 'deleted',
    collection,
    waitForLeadership: true, // Only leader tab syncs (prevents duplicate requests)
    live: false, // Disable realtime subscriptions, use polling instead
    pull: {
      batchSize: 10,
      modifier: (doc) => {
        console.log('[Costumes Pull Modifier] Input doc from Appwrite:', doc);

        // Add timestamps if missing (coming from Appwrite)
        const now = Date.now();

        // Handle Appwrite relationships - extract IDs if nested objects, otherwise keep as-is
        const character = typeof doc.character === 'object' && doc.character !== null
          ? doc.character.$id || null
          : doc.character;

        const scenes = Array.isArray(doc.scenes) && doc.scenes.length > 0 && typeof doc.scenes[0] === 'object'
          ? doc.scenes.map(s => s.$id || s)
          : (doc.scenes || []);

        const photos = Array.isArray(doc.photos) && doc.photos.length > 0 && typeof doc.photos[0] === 'object'
          ? doc.photos.map(p => p.$id || p)
          : (doc.photos || []);

        const projects = typeof doc.projects === 'object' && doc.projects !== null
          ? doc.projects.$id || null
          : doc.projects;

        const result = {
          ...doc,
          character,
          scenes,
          photos,
          projects,
          createdAt: (doc.createdAt !== null && doc.createdAt !== undefined) ? doc.createdAt : now,
          updatedAt: (doc.updatedAt !== null && doc.updatedAt !== undefined) ? doc.updatedAt : now,
        };

        console.log('[Costumes Pull Modifier] Output to RxDB:', result);
        return result;
      }
    },
    push: {
      batchSize: 10,
      modifier: (doc) => {
        console.log('[Costumes Push Modifier] Input doc:', doc);

        const now = Date.now();

        // Explicitly only send fields that Appwrite expects
        const cleanDoc = {
          id: doc.id,
          name: doc.name || '',
          character: doc.character || null,
          scenes: doc.scenes || [],
          photos: doc.photos || [],
          projects: doc.projects || null,
          notes: doc.notes || '',
          createdAt: (doc.createdAt !== null && doc.createdAt !== undefined) ? doc.createdAt : now,
          updatedAt: (doc.updatedAt !== null && doc.updatedAt !== undefined) ? doc.updatedAt : now,
        };

        console.log('[Costumes Push Modifier] Output cleanDoc:', cleanDoc);
        return cleanDoc;
      }
    },
  });

  return replicationState;
}
