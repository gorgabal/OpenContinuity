// Shooting Day collection operations
import { createCRUDOperations } from '../database.js';

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
