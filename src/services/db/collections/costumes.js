// Costume collection operations
import { createCRUDOperations, generateUUID, getTimestamps, getWithPopulated } from '../utils.js';

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
