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

export function createCharacterOperations(getDb) {
  const crud = createCRUDOperations(getDb, 'characters', 'Character', {
    name: 'New Character',
    description: '',
    actor: '',
    notes: ''
  });

  return {
    // Re-export CRUD operations
    addCharacter: crud.add,
    getCharacterById: crud.getById,
    updateCharacter: crud.update,
    deleteCharacter: crud.delete,

    // Get all characters sorted by name
    getCharacters: async () => {
      const characters = await crud.getAll();
      return characters.sort((a, b) => a.name.localeCompare(b.name));
    }
  };
}
