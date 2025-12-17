// Scene collection operations
import { createCRUDOperations } from '../utils.js';

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

const crud = createCRUDOperations(() => getDb(), 'scenes', 'Scene', {
  sceneNumber: 1,
  shootingDay: null,
  location: '',
  characters: [],
  costumes: []
}, { useTimestamps: true });

// Export CRUD operations directly
export const addScene = crud.add;
export const getSceneById = crud.getById;
export const updateScene = crud.update;

// Get all scenes sorted by scene number
export async function getScenes() {
  const scenes = await crud.getAll();
  return scenes.sort((a, b) => a.sceneNumber - b.sceneNumber);
}

// Get scenes by shooting day
export async function getScenesByShootingDay(shootingDayId) {
  const scenes = await crud.findByQuery({ shootingDay: shootingDayId });
  return scenes.sort((a, b) => a.sceneNumber - b.sceneNumber);
}
