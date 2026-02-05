// PhotoFiles collection operations - LOCAL ONLY (not synced to Appwrite)
// Stores actual image blobs in IndexedDB
import { createCRUDOperations } from '../database.js';

export const photoFileSchema = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: {
      type: 'string',
      maxLength: 100,
    },
    imageBlob: {
      type: 'string',
    },
    createdAt: {
      type: 'number',
    },
    updatedAt: {
      type: 'number',
    },
  },
  required: ['id', 'imageBlob', 'createdAt', 'updatedAt'],
};

// This will be set by database.js after initialization
let getDb = null;

export function initPhotoFileOperations(getDatabaseFn) {
  getDb = getDatabaseFn;
}

const crud = createCRUDOperations(() => getDb(), 'photofiles', 'PhotoFile', {
  imageBlob: '',
}, { useTimestamps: true });

// Export CRUD operations directly
export const addPhotoFile = crud.add;
export const getPhotoFileById = crud.getById;
export const updatePhotoFile = crud.update;
export const deletePhotoFile = crud.delete;

// Get photo file by photo ID (same as photofiles ID)
export async function getPhotoFile(photoId) {
  return await getPhotoFileById(photoId);
}

// Delete photo file when photo is deleted
export async function removePhotoFile(photoId) {
  return await deletePhotoFile(photoId);
}
