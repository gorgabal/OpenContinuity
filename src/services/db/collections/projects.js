// Project collection operations
import { createCRUDOperations } from '../database.js';

export const projectSchema = {
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
    ownerId: {
      type: 'string',
    },
    createdAt: {
      type: 'number',
    },
    updatedAt: {
      type: 'number',
    },
  },
  required: ['id', 'name', 'ownerId', 'createdAt', 'updatedAt'],
};

// This will be set by database.js after initialization
let getDb = null;

export function initProjectOperations(getDatabaseFn) {
  getDb = getDatabaseFn;
}

const crud = createCRUDOperations(() => getDb(), 'projects', 'Project', {
  name: 'New Project',
  description: '',
  ownerId: '' // Will be set when creating project
}, { useTimestamps: true });

// Export CRUD operations directly
export const addProject = crud.add;
export const getProjects = crud.getAll;
export const getProjectById = crud.getById;
export const getProjectById$ = crud.getById$;
export const getProjects$ = crud.getAll$;
export const updateProject = crud.update;
export const deleteProject = crud.delete;
