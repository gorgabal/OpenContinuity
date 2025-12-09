// Character collection operations
import { createCRUDOperations } from '../utils.js';
import { map } from 'rxjs/operators';

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
  scenes: []
}, { useTimestamps: false });

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
