// Photo upload service for Appwrite Storage
// FIXME: upload works, download not yet
import { Client, Storage } from 'appwrite';
import { getDatabase } from './database.js';
import {
  getPendingPhotos,
  updatePhotoSyncStatus,
} from './db/collections/photos.js';
import { base64ToFile } from './photoCompression.js';

// Appwrite client and storage instances
let client = null;
let storage = null;

/**
 * Initialize the Appwrite client for storage operations.
 * Uses the same configuration as the database sync.
 */
function getStorageClient() {
  if (!client) {
    client = new Client()
      .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT)
      .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID);
  }
  if (!storage) {
    storage = new Storage(client);
  }
  return { client, storage };
}

/**
 * Get the storage bucket ID from environment.
 */
function getBucketId() {
  return import.meta.env.VITE_APPWRITE_STORAGE_BUCKET_ID;
}

/**
 * Upload a single photo to Appwrite Storage.
 *
 * @param {string} photoId - The photo ID from the local database
 * @returns {Promise<string>} - The Appwrite file URL
 */
export async function uploadPhotoToAppwrite(photoId) {
  const { storage } = getStorageClient();
  const bucketId = getBucketId();
  const db = await getDatabase();

  // Get photo metadata
  const photoDoc = await db.photos.findOne(photoId).exec();
  if (!photoDoc) {
    throw new Error(`Photo with id ${photoId} not found`);
  }

  // Get photo file data
  const photoFileDoc = await db.photofiles.findOne(photoId).exec();
  if (!photoFileDoc || !photoFileDoc.imageBlob) {
    throw new Error(`Photo file data for ${photoId} not found`);
  }

  // Convert base64 back to File
  const file = base64ToFile(photoFileDoc.imageBlob, photoDoc.localFilename);

  console.log(
    '[Photo Upload] Uploading:',
    photoDoc.localFilename,
    `${(file.size / 1024).toFixed(1)}KB`,
  );

  // Update status to uploading
  await updatePhotoSyncStatus(photoId, 'uploading');

  try {
    // Upload to Appwrite Storage using the photo ID as the file ID
    // This ensures we can easily reference the file later
    console.log('[Photo Upload] Calling storage.createFile with:', {
      bucketId,
      photoId,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
    });

    const result = await storage.createFile(bucketId, photoId, file);

    console.log('[Photo Upload] Upload result:', result);

    // Get the file view URL
    const fileUrl = storage.getFileView(bucketId, result.$id).toString();

    // Update photo metadata with bucket URL and synced status
    await updatePhotoSyncStatus(photoId, 'synced', fileUrl);

    console.log('[Photo Upload] Success:', photoDoc.localFilename, fileUrl);

    return fileUrl;
  } catch (err) {
    console.error('[Photo Upload] Failed:', photoDoc.localFilename, err);
    console.error('[Photo Upload] Error details:', {
      message: err.message,
      code: err.code,
      type: err.type,
      response: err.response,
    });

    // Check if file already exists (409 conflict)
    if (err.code === 409) {
      // File already exists, get the existing URL
      const fileUrl = storage.getFileView(bucketId, photoId).toString();
      await updatePhotoSyncStatus(photoId, 'synced', fileUrl);
      console.log('[Photo Upload] File already exists, marked as synced');
      return fileUrl;
    }

    // Update status to error
    await updatePhotoSyncStatus(photoId, 'error');
    throw err;
  }
}

/**
 * Sync all pending photos to Appwrite Storage.
 * Uploads photos sequentially to avoid overwhelming the network.
 *
 * @returns {Promise<{uploaded: number, failed: number}>} - Upload statistics
 */
export async function syncPendingPhotos() {
  // Check if online
  if (!navigator.onLine) {
    console.log('[Photo Sync] Offline, skipping photo sync');
    return { uploaded: 0, failed: 0, skipped: true };
  }

  // Check if user is authenticated (localStorage flag set by AuthContext)
  const authFlag = localStorage.getItem('appwrite_authenticated');
  if (authFlag !== 'true') {
    console.log('[Photo Sync] Not authenticated, skipping photo sync');
    return { uploaded: 0, failed: 0, skipped: true };
  }

  const pendingPhotos = await getPendingPhotos();

  if (pendingPhotos.length === 0) {
    return { uploaded: 0, failed: 0, skipped: false };
  }

  console.log(`[Photo Sync] Found ${pendingPhotos.length} pending photos`);

  let uploaded = 0;
  let failed = 0;

  // Upload photos sequentially
  for (const photo of pendingPhotos) {
    try {
      await uploadPhotoToAppwrite(photo.id);
      uploaded++;
    } catch (err) {
      console.error('[Photo Sync] Failed to upload photo:', photo.id, err);
      failed++;
    }
  }

  console.log(`[Photo Sync] Complete: ${uploaded} uploaded, ${failed} failed`);

  return { uploaded, failed, skipped: false };
}

// Track if sync is currently running to prevent concurrent syncs
let isSyncing = false;

/**
 * Start the background photo sync process.
 * Runs every 30 seconds and also triggers when coming back online.
 *
 * @returns {Function} - Cleanup function to stop the sync
 */
export function startPhotoSync() {
  console.log('[Photo Sync] Starting background photo sync');

  // Sync function that prevents concurrent runs
  const runSync = async () => {
    if (isSyncing) {
      console.log('[Photo Sync] Sync already in progress, skipping');
      return;
    }

    isSyncing = true;
    try {
      await syncPendingPhotos();
    } finally {
      isSyncing = false;
    }
  };

  // Run initial sync
  runSync();

  // Set up interval (every 30 seconds)
  const intervalId = setInterval(runSync, 30000);

  // Listen for online event to sync immediately when connection restored
  const onlineHandler = () => {
    console.log('[Photo Sync] Back online, triggering sync');
    runSync();
  };
  window.addEventListener('online', onlineHandler);

  // Return cleanup function
  return () => {
    console.log('[Photo Sync] Stopping background photo sync');
    clearInterval(intervalId);
    window.removeEventListener('online', onlineHandler);
  };
}

/**
 * Manually trigger a photo sync.
 * Useful for immediate upload after taking a photo.
 */
export async function triggerPhotoSync() {
  if (isSyncing) {
    console.log('[Photo Sync] Sync already in progress');
    return;
  }

  isSyncing = true;
  try {
    return await syncPendingPhotos();
  } finally {
    isSyncing = false;
  }
}
