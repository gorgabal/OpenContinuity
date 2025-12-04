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
    time: {
      type: 'string',
      default: '',
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
      type: 'string',
      format: 'date-time',
    },
    updatedAt: {
      type: 'string',
      format: 'date-time',
    },
  },
  required: ['id', 'sceneNumber', 'createdAt', 'updatedAt'],
};

export function createSceneOperations(getDb) {
  const crud = createCRUDOperations(getDb, 'scenes', 'Scene', {
    sceneNumber: 1,
    shootingDay: null,
    location: '',
    characters: [],
    time: '',
    costumes: []
  });

  return {
    // Re-export CRUD operations
    addScene: crud.add,
    getSceneById: crud.getById,
    updateScene: crud.update,

    // Get all scenes sorted by scene number
    getScenes: async () => {
      const scenes = await crud.getAll();
      return scenes.sort((a, b) => a.sceneNumber - b.sceneNumber);
    },

    // Get scenes by shooting day
    getScenesByShootingDay: async (shootingDayId) => {
      const scenes = await crud.findByQuery({ shootingDay: shootingDayId });
      return scenes.sort((a, b) => a.sceneNumber - b.sceneNumber);
    }
  };
}
