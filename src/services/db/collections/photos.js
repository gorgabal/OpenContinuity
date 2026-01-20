// Photo collection operations
import { createCRUDOperations } from '../utils.js';
import { map } from 'rxjs/operators';
import { replicateAppwrite } from 'rxdb/plugins/replication-appwrite';

export const photoSchema = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: {
      type: 'string',
      maxLength: 100,
    },
    localFilename: {
      type: 'string',
    },
    bucketUrl: {
      type: ['string', 'null'],
      default: null,
    },
    deleted: {
      type: 'boolean',
      default: false,
    },
    syncStatus: {
      type: 'string',
      enum: ['pending', 'uploading', 'synced', 'error'],
      default: 'pending',
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
  required: ['id', 'localFilename', 'createdAt', 'updatedAt'],
};

// This will be set by database.js after initialization
let getDb = null;

export function initPhotoOperations(getDatabaseFn) {
  getDb = getDatabaseFn;
}

const crud = createCRUDOperations(() => getDb(), 'photos', 'Photo', {
  localFilename: '',
  bucketUrl: null,
  deleted: false,
  syncStatus: 'pending',
  projects: null,
}, { useTimestamps: true });

// Export CRUD operations directly
export const addPhoto = crud.add;
export const getPhotoById = crud.getById;
export const getPhotoById$ = crud.getById$;
export const updatePhoto = crud.update;
export const deletePhoto = crud.delete;

// Get all photos sorted by creation date (newest first)
export async function getPhotos() {
  const photos = await crud.getAll();
  return photos.sort((a, b) => b.createdAt - a.createdAt);
}

// Get all photos as observable (reactive)
export async function getPhotos$() {
  const observable = await crud.getAll$();
  return observable.pipe(
    map(photos => photos.sort((a, b) => b.createdAt - a.createdAt))
  );
}

// Get photos by project ID
export async function getPhotosByProject(projectId) {
  const db = await getDb();
  const photos = await db.photos.find({ selector: { projects: projectId, deleted: false } }).exec();
  return photos.sort((a, b) => b.createdAt - a.createdAt);
}

// Get photos by project as observable
export async function getPhotosByProject$(projectId) {
  const db = await getDb();
  const observable = db.photos.find({ selector: { projects: projectId, deleted: false } }).$;
  return observable.pipe(
    map(photos => photos.sort((a, b) => b.createdAt - a.createdAt))
  );
}

// Get photos pending upload (for sync controller)
export async function getPendingPhotos() {
  const db = await getDb();
  const photos = await db.photos.find({ 
    selector: { 
      syncStatus: { $in: ['pending', 'error'] },
      deleted: false 
    } 
  }).exec();
  return photos;
}

// Get photos pending upload as observable
export async function getPendingPhotos$() {
  const db = await getDb();
  return db.photos.find({ 
    selector: { 
      syncStatus: { $in: ['pending', 'error'] },
      deleted: false 
    } 
  }).$;
}

// Update photo sync status
export async function updatePhotoSyncStatus(id, syncStatus, bucketUrl = null) {
  const db = await getDb();
  const doc = await db.photos.findOne(id).exec();
  if (!doc) {
    throw new Error(`Photo with id ${id} not found`);
  }

  const updateData = { syncStatus, updatedAt: Date.now() };
  if (bucketUrl !== null) updateData.bucketUrl = bucketUrl;

  return await doc.update({ $set: updateData });
}

// Soft delete a photo (marks as deleted for sync)
export async function softDeletePhoto(id) {
  const db = await getDb();
  const doc = await db.photos.findOne(id).exec();
  if (!doc) {
    throw new Error(`Photo with id ${id} not found`);
  }
  return await doc.update({ 
    $set: { 
      deleted: true, 
      updatedAt: Date.now() 
    } 
  });
}

// Replication configuration
export function createPhotoReplication(collection, client, databaseId) {
  const replicationState = replicateAppwrite({
    replicationIdentifier: 'Photo-replication',
    client,
    databaseId,
    collectionId: 'photos',
    deletedField: 'deleted',
    collection,
    waitForLeadership: true,
    retryTime: 3000,
    live: false,
    pull: {
      batchSize: 10,
      modifier: (doc) => {
        const now = Date.now();

        // Handle Appwrite relationships - extract IDs if nested objects
        const projects = typeof doc.projects === 'object' && doc.projects !== null
          ? doc.projects.$id || null
          : doc.projects;

        return {
          ...doc,
          projects,
          deleted: doc.deleted || false,
          syncStatus: doc.syncStatus || 'synced', // Assume synced if coming from Appwrite
          createdAt: (doc.createdAt !== null && doc.createdAt !== undefined) ? doc.createdAt : now,
          updatedAt: (doc.updatedAt !== null && doc.updatedAt !== undefined) ? doc.updatedAt : now,
        };
      }
    },
    push: {
      batchSize: 10,
      modifier: (doc) => {
        const now = Date.now();

        // Only send fields that Appwrite expects
        const cleanDoc = {
          id: doc.id,
          localFilename: doc.localFilename,
          bucketUrl: doc.bucketUrl || null,
          deleted: doc.deleted || false,
          syncStatus: doc.syncStatus || 'pending',
          projects: doc.projects || null,
          createdAt: (doc.createdAt !== null && doc.createdAt !== undefined) ? doc.createdAt : now,
          updatedAt: (doc.updatedAt !== null && doc.updatedAt !== undefined) ? doc.updatedAt : now,
        };

        console.log('[Photos Push Modifier] Before:', { id: doc.id, syncStatus: doc.syncStatus });
        console.log('[Photos Push Modifier] After:', { id: cleanDoc.id, syncStatus: cleanDoc.syncStatus });
        return cleanDoc;
      }
    },
  });

  // Monitor replication errors
  replicationState.error$.subscribe(error => {
    console.error('[Photos Sync] Replication error:', error);
    if (error.parameters) {
      console.error('[Photos Sync] Error parameters:', JSON.stringify(error.parameters, null, 2));
    }
  });

  return replicationState;
}
