// Character collection operations
import { createCRUDOperations } from '../database.js';
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

export const characterCrud = createCRUDOperations(() => getDb(), 'characters', 'Character', {
  name: 'New Character',
  description: '',
  actor: '',
  notes: '',
  scenes: [],
  projects: null
}, { useTimestamps: true });

// Get characters sorted by name, optionally filtered by project
export async function getCharacters(projectId = null) {
  const db = await getDb();
  let characters;
  
  if (projectId) {
    characters = await db.characters.find({ selector: { projects: projectId } }).exec();
  } else {
    characters = await characterCrud.getAll();
  }
  
  return characters.sort((a, b) => a.name.localeCompare(b.name));
}

// Get characters as observable (reactive), optionally filtered by project
export async function getCharacters$(projectId = null) {
  const db = await getDb();
  let observable;

  if (projectId) {
    observable = db.characters.find({ selector: { projects: projectId } }).$;
  } else {
    observable = await characterCrud.getAll$();
  }

  return observable.pipe(
    map((characters) => characters.sort((a, b) => a.name.localeCompare(b.name))),
  );
}
