// Project collection operations
import { createCRUDOperations } from '../database.js';
import { replicateAppwrite } from 'rxdb/plugins/replication-appwrite';

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

// Replication configuration
export function createProjectReplication(collection, client, databaseId) {
  const replicationState = replicateAppwrite({
    replicationIdentifier: 'Project-replication',
    client,
    databaseId,
    collectionId: 'projects',
    deletedField: 'deleted',
    collection,
    waitForLeadership: true,
    live: false,
    pull: {
      batchSize: 10,
      modifier: (doc) => {
        const now = Date.now();

        // Handle Appwrite relationships - extract ID if nested object, otherwise keep as-is
        const ownerId = typeof doc.ownerId === 'object' && doc.ownerId !== null
          ? doc.ownerId.$id || doc.ownerId
          : doc.ownerId;

        return {
          ...doc,
          ownerId,
          createdAt: (doc.createdAt !== null && doc.createdAt !== undefined) ? doc.createdAt : now,
          updatedAt: (doc.updatedAt !== null && doc.updatedAt !== undefined) ? doc.updatedAt : now,
        };
      }
    },
    push: {
      batchSize: 10,
      modifier: (doc) => {
        const now = Date.now();
        const cleanDoc = {
          id: doc.id,
          name: doc.name || '',
          description: doc.description || '',
          ownerId: doc.ownerId,
          createdAt: (doc.createdAt !== null && doc.createdAt !== undefined) ? doc.createdAt : now,
          updatedAt: (doc.updatedAt !== null && doc.updatedAt !== undefined) ? doc.updatedAt : now,
        };
        return cleanDoc;
      }
    },
  });

  // Monitor replication errors
  replicationState.error$.subscribe(error => {
    console.error('[Projects Sync] Replication error:', error);
    if (error.parameters) {
      console.error('[Projects Sync] Error parameters:', JSON.stringify(error.parameters, null, 2));
    }
  });

  return replicationState;
}
