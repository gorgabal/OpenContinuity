// Costume collection operations
import { createCRUDOperations } from '../database.js';
import { getWithPopulated } from '../utils.js';

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
        type: 'string',
      },
      default: [],
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

export const costumeCrud = createCRUDOperations(
  () => getDb(),
  'costumes',
  'Costume',
  {
    name: 'New Costume',
    character: null,
    scenes: [],
    projects: null,
    notes: '',
  },
  { useTimestamps: true },
);

// Get costumes, optionally filtered by project ID
export async function getCostumes(projectId = null) {
  const db = await getDb();
  const selector = projectId ? { projects: projectId } : {};
  return await db.costumes.find({ selector }).exec();
}

// Get costumes as observable, optionally filtered by project ID
export async function getCostumes$(projectId = null) {
  const db = await getDb();
  const selector = projectId ? { projects: projectId } : {};
  return db.costumes.find({ selector }).$;
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
    costumes.map(async costume => {
      if (costume.character) {
        await costume.populate('character');
      }
      return costume;
    }),
  );
}

// Get costumes by character ID
export async function getCostumesByCharacterId(characterId) {
  const costumes = await costumeCrud.findByQuery({ character: characterId });
  // Populate character reference for each costume
  return await Promise.all(
    costumes.map(async costume => {
      await costume.populate('character');
      return costume;
    }),
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
