import { addRxPlugin, createRxDatabase } from 'rxdb/plugins/core';
import { RxDBDevModePlugin } from 'rxdb/plugins/dev-mode';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import { wrappedValidateAjvStorage } from 'rxdb/plugins/validate-ajv';
import { RxDBUpdatePlugin } from 'rxdb/plugins/update';

let database = null;

const costumeSchema = {
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
      default: '',
    },
    character: {
      type: 'string',
      default: '',
    },
    scene: {
      type: 'string',
      default: '',
    },
    image: {
      type: 'string',
      default: 'https://placehold.co/400x300',
    },
    notes: {
      type: 'string',
      default: '',
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
  required: ['id', 'createdAt', 'updatedAt'],
};

export async function initDatabase() {
  if (database) {
    return database;
  }

  // Add plugins
  addRxPlugin(RxDBDevModePlugin);
  addRxPlugin(RxDBUpdatePlugin);

  // Create database
  database = await createRxDatabase({
    name: 'opencontinuity',
    storage: wrappedValidateAjvStorage({
      storage: getRxStorageDexie(),
    }),
    ignoreDuplicate: true, // FIXME: this should be set to false in production
  });

  // Add collections
  await database.addCollections({
    costumes: {
      schema: costumeSchema,
    },
  });

  return database;
}

export async function getDatabase() {
  if (!database) {
    await initDatabase();
  }
  return database;
}

// Costume-specific functions
export async function addCostume(costumeData = {}) {
  const db = await getDatabase();
  const now = new Date().toISOString();

  const costume = {
    id: `costume_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, //fixme: this is a weird appreach to randomness.
    name: costumeData.name || 'New Costume',
    character: costumeData.character || '',
    scene: costumeData.scene || '',
    image: costumeData.image || 'https://placehold.co/400x300',
    notes: costumeData.notes || '',
    createdAt: now,
    updatedAt: now,
    ...costumeData,
  };

  return await db.costumes.insert(costume);
}

export async function getCostumes() {
  const db = await getDatabase();
  return await db.costumes.find().exec();
}

export async function getCostumeById(id) {
  const db = await getDatabase();
  return await db.costumes.findOne(id).exec();
}

export async function updateCostume(id, updateData) {
  const db = await getDatabase();
  const costume = await db.costumes.findOne(id).exec();

  if (costume) {
    return await costume.update({
      $set: {
        ...updateData,
        updatedAt: new Date().toISOString(),
      },
    });
  }

  throw new Error(`Costume with id ${id} not found`);
}

export async function deleteCostume(id) {
  const db = await getDatabase();
  const costume = await db.costumes.findOne(id).exec();

  if (costume) {
    return await costume.remove();
  }

  throw new Error(`Costume with id ${id} not found`);
}

// Observable functions for reactive updates
export async function getCostumes$() {
  const db = await getDatabase();
  return db.costumes.find().$;
}

export async function getCostumeById$(id) {
  const db = await getDatabase();
  return db.costumes.findOne(id).$;
}
