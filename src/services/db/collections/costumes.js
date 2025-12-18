// Costume collection operations
import { createCRUDOperations, generateUUID, getTimestamps, getWithPopulated } from '../utils.js';
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

const crud = createCRUDOperations(() => getDb(), 'costumes', 'Costume', {
  name: 'New Costume',
  character: null,
  scenes: [],
  projects: null,
  notes: ''
}, { useTimestamps: true });

// Export CRUD operations directly
export const addCostume = crud.add;
export const getCostumes = crud.getAll;
export const getCostumeById = crud.getById;
export const getCostumeById$ = crud.getById$;
export const getCostumes$ = crud.getAll$;
export const updateCostume = crud.update;
export const deleteCostume = crud.delete;

// Helper function to get costume with populated character reference
export async function getCostumeWithCharacter(id) {
  const db = await getDb();
  return await getWithPopulated(db, 'costumes', id, ['character']);
}

// Helper function to get all costumes with populated character references
export async function getCostumesWithCharacters() {
  const costumes = await crud.getAll();
  return await Promise.all(
    costumes.map(async (costume) => {
      if (costume.character) {
        await costume.populate('character');
      }
      return costume;
    })
  );
}

// Photo-related functions
export async function addPhotoToCostume(costumeId, photoFile) {
  throw new Error('Photo functionality not yet implemented. RxDB attachments are incompatible with Appwrite replication and need to be replaced with an alternative solution.');
}

export async function getPhotoUrl(costumeId, photoId) {
  throw new Error('Photo functionality not yet implemented. RxDB attachments are incompatible with Appwrite replication and need to be replaced with an alternative solution.');
}

export async function removePhotoFromCostume(costumeId, photoId) {
  throw new Error('Photo functionality not yet implemented. RxDB attachments are incompatible with Appwrite replication and need to be replaced with an alternative solution.');
}

// Get all photos for a costume
export async function getAllPhotosForCostume(costumeId) {
  throw new Error('Photo functionality not yet implemented. RxDB attachments are incompatible with Appwrite replication and need to be replaced with an alternative solution.');
}

// Get costumes by character ID
export async function getCostumesByCharacterId(characterId) {
  const costumes = await crud.findByQuery({ character: characterId });
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

  return await crud.update(costumeId, { character: characterId });
}

// Unassign costume from character
export async function unassignCostumeFromCharacter(costumeId) {
  return await crud.update(costumeId, { character: null });
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

  // Monitor replication errors
  replicationState.error$.subscribe(error => {
    console.error('[Costumes Sync] Replication error:', error);
    if (error.parameters) {
      console.error('[Costumes Sync] Error parameters:', JSON.stringify(error.parameters, null, 2));
    }
  });

  return replicationState;
}
