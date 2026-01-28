// Photo collection operations
import { createCRUDOperations, generateUUID } from '../utils.js';
import { map } from 'rxjs/operators';
import { replicateAppwrite } from 'rxdb/plugins/replication-appwrite';
import { compressPhoto } from '../../photoCompression.js';
import { Client, Storage } from 'appwrite';

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
    syncStatus: {
      type: 'string',
      enum: ['pending', 'uploading', 'synced', 'error'],
      default: 'pending',
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

const crud = createCRUDOperations(
  () => getDb(),
  'photos',
  'Photo',
  {
    localFilename: '',
    bucketUrl: null,
    syncStatus: 'pending',
  },
  { useTimestamps: true },
);

// Export CRUD operations directly
export const addPhoto = crud.add;
export const getPhotoById = crud.getById;
export const getPhotoById$ = crud.getById$;
export const updatePhoto = crud.update;
export const deletePhoto = crud.delete;

// Helper to convert File/Blob to base64 string
async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Generate a unique filename from UUID
function generatePhotoFilename(originalFilename, uuid) {
  const extension = originalFilename.split('.').pop()?.toLowerCase() || 'jpg';
  return `${uuid}.${extension}`;
}

// Helper to download photo from Appwrite Storage
// TODO: maybe safe it as rxdb attachments instead?
async function downloadPhotoFromAppwrite(photoId, bucketUrl) {
  debugger;
  // Check if user is authenticated
  const authFlag = localStorage.getItem('appwrite_authenticated');
  if (authFlag !== 'true') {
    throw new Error('User not authenticated - cannot download from Appwrite');
  }

  // Check if online
  if (!navigator.onLine) {
    throw new Error('Offline - cannot download from Appwrite');
  }

  console.log('[Photo Download] Downloading:', photoId);

  try {
    // Get storage client
    const client = new Client()
      .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT)
      .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID);
    const storage = new Storage(client);
    const bucketId = import.meta.env.VITE_APPWRITE_STORAGE_BUCKET_ID;

    // Get the file URL if not provided
    const fileUrl =
      bucketUrl || storage.getFileView(bucketId, photoId).toString();

    console.log('[Photo Download] Fetching from URL:', fileUrl);

    // Fetch the file as a blob
    // The fetch will include the Appwrite session cookie automatically
    const response = await fetch(fileUrl, {
      credentials: 'include', // Ensure cookies are sent
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const blob = await response.blob();

    // Convert blob to base64
    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

    console.log(
      '[Photo Download] Success:',
      photoId,
      `${(blob.size / 1024).toFixed(1)}KB`,
    );

    return base64;
  } catch (err) {
    console.error('[Photo Download] Failed:', photoId, err);
    throw err;
  }
}

// Add photo with file - stores metadata in photos collection and file in photofiles collection
export async function addPhotoWithFile(file) {
  const db = await getDb();

  // Compress the image first
  const compressedFile = await compressPhoto(file);

  // Convert compressed file to base64
  const imageBlob = await fileToBase64(compressedFile);

  // Generate UUID upfront so we can use it for both ID and filename
  const photoId = generateUUID();
  const filename = generatePhotoFilename(file.name, photoId);

  // Create photo metadata
  const photoMetadata = {
    id: photoId,
    localFilename: filename,
    bucketUrl: null,
    syncStatus: 'pending',
  };

  // Add photo metadata
  const photo = await addPhoto(photoMetadata);

  // Add photo file with same ID - clean up metadata on failure
  try {
    await db.photofiles.insert({
      id: photo.id,
      imageBlob,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  } catch (err) {
    // Clean up orphaned photo metadata
    await deletePhoto(photo.id);
    throw err;
  }

  return photo;
}

// Get photo with its file data
// If local blob is missing but photo is synced, download from Appwrite
export async function getPhotoWithFile(photoId) {
  const db = await getDb();
  const photo = await getPhotoById(photoId);

  if (!photo) {
    return null;
  }

  let photoFile = await db.photofiles.findOne(photoId).exec();

  // If local file is missing but photo has a bucketUrl, download from Appwrite
  if (!photoFile && photo.bucketUrl && photo.syncStatus === 'synced') {
    console.log(
      '[Photos] Local blob missing, downloading from Appwrite:',
      photoId,
    );

    try {
      const imageBlob = await downloadPhotoFromAppwrite(
        photoId,
        photo.bucketUrl,
      );

      // Store downloaded blob in local database
      await db.photofiles.insert({
        id: photoId,
        imageBlob,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      console.log('[Photos] Downloaded and stored locally:', photoId);

      // Refetch the photo file
      photoFile = await db.photofiles.findOne(photoId).exec();
    } catch (err) {
      console.error('[Photos] Failed to download from Appwrite:', photoId, err);
      // Continue and return null imageBlob
    }
  }

  return {
    ...photo,
    imageBlob: photoFile ? photoFile.imageBlob : null,
  };
}

// Delete photo and its file
export async function deletePhotoWithFile(photoId) {
  const db = await getDb();

  // Delete photo file first
  const photoFile = await db.photofiles.findOne(photoId).exec();
  if (photoFile) {
    await photoFile.remove();
  }

  // Delete photo metadata
  return await deletePhoto(photoId);
}

// Get all photos sorted by creation date (newest first)
export async function getPhotos() {
  const photos = await crud.getAll();
  return photos.sort((a, b) => b.createdAt - a.createdAt);
}

// Get all photos as observable (reactive)
export async function getPhotos$() {
  const observable = await crud.getAll$();
  return observable.pipe(
    map(photos => photos.sort((a, b) => b.createdAt - a.createdAt)),
  );
}

// Get photos pending upload (for sync controller)
export async function getPendingPhotos() {
  const db = await getDb();
  const photos = await db.photos
    .find({
      selector: {
        syncStatus: { $in: ['pending', 'error'] },
      },
    })
    .exec();
  return photos;
}

// Get photos pending upload as observable
export async function getPendingPhotos$() {
  const db = await getDb();
  return db.photos.find({
    selector: {
      syncStatus: { $in: ['pending', 'error'] },
    },
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
      modifier: doc => {
        const now = Date.now();

        // Only include fields that match our schema - don't spread doc
        return {
          id: doc.id,
          localFilename: doc.localFilename,
          bucketUrl: doc.bucketUrl || null,
          syncStatus: doc.syncStatus || 'synced', // Assume synced if coming from Appwrite
          createdAt:
            doc.createdAt !== null && doc.createdAt !== undefined
              ? doc.createdAt
              : now,
          updatedAt:
            doc.updatedAt !== null && doc.updatedAt !== undefined
              ? doc.updatedAt
              : now,
          _deleted: doc._deleted || false, // Required for RxDB replication
        };
      },
    },
    push: {
      batchSize: 10,
      modifier: doc => {
        const now = Date.now();

        // Only send fields that Appwrite expects
        const cleanDoc = {
          id: doc.id,
          localFilename: doc.localFilename,
          bucketUrl: doc.bucketUrl || null,
          syncStatus: doc.syncStatus || 'pending',
          createdAt:
            doc.createdAt !== null && doc.createdAt !== undefined
              ? doc.createdAt
              : now,
          updatedAt:
            doc.updatedAt !== null && doc.updatedAt !== undefined
              ? doc.updatedAt
              : now,
        };

        return cleanDoc;
      },
    },
  });

  // Monitor replication events
  replicationState.error$.subscribe(error => {
    console.error('[Photos Sync] Replication error:', error);
    if (error.parameters) {
      console.error(
        '[Photos Sync] Error parameters:',
        JSON.stringify(error.parameters, null, 2),
      );
    }
  });

  return replicationState;
}
