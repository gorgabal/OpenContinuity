// Scene collection operations
import { createCRUDOperations } from '../database.js';
import { map } from 'rxjs/operators';

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
  required: ['id', 'sceneNumber', 'createdAt', 'updatedAt'],
};

// This will be set by database.js after initialization
let getDb = null;

export function initSceneOperations(getDatabaseFn) {
  getDb = getDatabaseFn;
}

export const sceneCrud = createCRUDOperations(() => getDb(), 'scenes', 'Scene', {
  sceneNumber: 1,
  shootingDay: null,
  location: '',
  characters: [],
  costumes: [],
  projects: null
}, { useTimestamps: true });

// Get all scenes sorted by scene number
// If projectId is provided, filter by project
export async function getScenes(projectId = null) {
  const db = await getDb();
  let scenes;
  if (projectId) {
    scenes = await db.scenes.find({ selector: { projects: projectId } }).exec();
  } else {
    scenes = await sceneCrud.getAll();
  }
  return scenes.sort((a, b) => a.sceneNumber - b.sceneNumber);
}

// Get all scenes as observable (reactive)
// If projectId is provided, filter by project
export async function getScenes$(projectId = null) {
  const db = await getDb();
  let observable;
  if (projectId) {
    observable = db.scenes.find({ selector: { projects: projectId } }).$;
  } else {
    observable = await sceneCrud.getAll$();
  }
  // Transform the observable to sort by scene number
  return observable.pipe(
    map(scenes => scenes.sort((a, b) => a.sceneNumber - b.sceneNumber))
  );
}

// Get scenes by shooting day
export async function getScenesByShootingDay(shootingDayId) {
  const scenes = await sceneCrud.findByQuery({ shootingDay: shootingDayId });
  return scenes.sort((a, b) => a.sceneNumber - b.sceneNumber);
}
