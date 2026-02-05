// Shooting Day collection operations
import { createCRUDOperations } from '../database.js';
import { replicateAppwrite } from 'rxdb/plugins/replication-appwrite';

export const shootingDaySchema = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: {
      type: 'string',
      maxLength: 100,
    },
    date: {
      type: 'string',
      format: 'date',
    },
    location: {
      type: 'string',
      default: '',
    },
    name: {
      type: 'string',
      default: '',
    },
    notes: {
      type: 'string',
      default: '',
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
  required: ['id', 'date', 'createdAt', 'updatedAt'],
};

// This will be set by database.js after initialization
let getDb = null;

export function initShootingDayOperations(getDatabaseFn) {
  getDb = getDatabaseFn;
}

export const shootingDayCrud = createCRUDOperations(() => getDb(), 'shootingday', 'Shooting day', {
  date: new Date().toISOString().split('T')[0],
  location: '',
  name: '',
  notes: '',
  projects: null
}, { useTimestamps: true });

// Create a default shooting day if none exist
export async function ensureDefaultShootingDay() {
  const db = await getDb();
  const existingShootingDays = await db.shootingday.find().exec();

  if (existingShootingDays.length === 0) {
    return await shootingDayCrud.add({
      date: new Date().toISOString().split('T')[0],
      location: 'Not specified'
    });
  }

  return existingShootingDays[0];
}

// Get shooting days (optionally filtered by project ID)
export async function getShootingDays(projectId = null) {
  const db = await getDb();
  if (projectId) {
    return await db.shootingday.find({ selector: { projects: projectId } }).exec();
  }
  return await shootingDayCrud.getAll();
}

// Get shooting days as observable (optionally filtered by project ID)
export async function getShootingDays$(projectId = null) {
  const db = await getDb();
  if (projectId) {
    return db.shootingday.find({ selector: { projects: projectId } }).$;
  }
  return await shootingDayCrud.getAll$();
}

// Replication configuration
export function createShootingDayReplication(collection, client, databaseId) {
  const replicationState = replicateAppwrite({
    replicationIdentifier: 'ShootingDay-replication',
    client,
    databaseId,
    collectionId: 'shootingday',
    deletedField: 'deleted',
    collection,
    waitForLeadership: true, // Only leader tab syncs (prevents duplicate requests)
    live: false, // Disable realtime subscriptions, use polling instead
    pull: {
      batchSize: 10,
      modifier: (doc) => {
        // Add timestamps if missing (coming from Appwrite)
        const now = Date.now();

        // Normalize date to YYYY-MM-DD format (remove time portion if present)
        let normalizedDate = doc.date;
        if (normalizedDate && normalizedDate.includes('T')) {
          normalizedDate = normalizedDate.split('T')[0];
        }

        // Handle Appwrite relationships - extract IDs if nested objects, otherwise keep as-is
        const projects = typeof doc.projects === 'object' && doc.projects !== null
          ? doc.projects.$id || null
          : doc.projects;

        return {
          ...doc,
          date: normalizedDate,
          name: doc.name || '',
          notes: doc.notes || '',
          projects,
          createdAt: (doc.createdAt !== null && doc.createdAt !== undefined) ? doc.createdAt : now,
          updatedAt: (doc.updatedAt !== null && doc.updatedAt !== undefined) ? doc.updatedAt : now,
        };
      }
    },
    push: {
      batchSize: 10,
      modifier: (doc) => {
        console.log('[ShootingDays Push Modifier] Input doc:', doc);

        // Add timestamps if missing or null (going to Appwrite)
        const now = Date.now();

        // Normalize date to YYYY-MM-DD format (remove time portion if present)
        let normalizedDate = doc.date;
        if (normalizedDate && normalizedDate.includes('T')) {
          normalizedDate = normalizedDate.split('T')[0];
        }

        // Explicitly only send fields that Appwrite expects
        // This filters out RxDB internal fields like _deleted, _rev, _meta
        const cleanDoc = {
          id: doc.id,
          date: normalizedDate,
          location: doc.location || '',
          name: doc.name || '',
          notes: doc.notes || '',
          projects: doc.projects || null,
          createdAt: (doc.createdAt !== null && doc.createdAt !== undefined) ? doc.createdAt : now,
          updatedAt: (doc.updatedAt !== null && doc.updatedAt !== undefined) ? doc.updatedAt : now,
        };

        console.log('[ShootingDays Push Modifier] Output cleanDoc:', cleanDoc);
        return cleanDoc;
      }
    },
  });

  // Monitor replication errors
  replicationState.error$.subscribe(error => {
    console.error('[ShootingDays Sync] Replication error:', error);
    if (error.parameters) {
      console.error('[ShootingDays Sync] Error parameters:', JSON.stringify(error.parameters, null, 2));
    }
  });

  return replicationState;
}
