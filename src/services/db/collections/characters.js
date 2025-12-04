// Character collection operations
import { createCRUDOperations } from '../utils.js';

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
    createdAt: {
      type: 'string',
      format: 'date-time',
    },
    updatedAt: {
      type: 'string',
      format: 'date-time',
    },
  },
  required: ['id', 'name', 'createdAt', 'updatedAt'],
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
  notes: ''
});

// Export CRUD operations directly
export const addCharacter = crud.add;
export const getCharacterById = crud.getById;
export const updateCharacter = crud.update;
export const deleteCharacter = crud.delete;

// Get all characters sorted by name
export async function getCharacters() {
  const characters = await crud.getAll();
  return characters.sort((a, b) => a.name.localeCompare(b.name));
}
