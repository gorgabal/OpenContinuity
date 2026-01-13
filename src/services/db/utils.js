// Shared database utilities
import { triggerSync } from '../database.js';

// UUID fallback for non-secure contexts
export function generateUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback UUID generation for non-secure contexts
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Utility: Get timestamps for create/update operations
export const getTimestamps = (isNew = true) => {
  const now = Date.now();
  return isNew ? { createdAt: now, updatedAt: now } : { updatedAt: now };
};

// Utility: Get document with populated reference fields
export async function getWithPopulated(db, collectionName, id, refFields = []) {
  const doc = await db[collectionName].findOne(id).exec();
  if (doc && refFields.length > 0) {
    await Promise.all(refFields.map(field => {
      if (doc[field]) {
        return doc.populate(field);
      }
    }));
  }
  return doc;
}

// Generic CRUD factory function
export function createCRUDOperations(getDb, collectionName, entityName, defaultData = {}, options = {}) {
  const { useTimestamps = true } = options;

  return {
    add: async (data = {}) => {
      const db = await getDb();
      const document = {
        id: generateUUID(),
        ...defaultData,
        ...data,
        ...(useTimestamps ? getTimestamps(true) : {}),
      };
      const result = await db[collectionName].insert(document);

      // Trigger immediate sync to Appwrite
      triggerSync(collectionName);

      return result;
    },

    getAll: async () => {
      const db = await getDb();
      return await db[collectionName].find().exec();
    },

    getById: async (id) => {
      const db = await getDb();
      return await db[collectionName].findOne(id).exec();
    },

    getById$: async (id) => {
      const db = await getDb();
      return db[collectionName].findOne(id).$;
    },

    getAll$: async () => {
      const db = await getDb();
      return db[collectionName].find().$;
    },

    update: async (id, updateData) => {
      const db = await getDb();
      const doc = await db[collectionName].findOne(id).exec();
      if (!doc) {
        throw new Error(`${entityName} with id ${id} not found`);
      }

      // Remove null and undefined values to let defaults or required validation handle them
      const cleanedData = {};
      Object.keys(updateData).forEach(key => {
        if (updateData[key] !== null && updateData[key] !== undefined) {
          cleanedData[key] = updateData[key];
        }
      });

      const result = await doc.update({
        $set: { ...cleanedData, ...(useTimestamps ? getTimestamps(false) : {}) }
      });

      // Trigger immediate sync to Appwrite
      triggerSync(collectionName);

      return result;
    },

    delete: async (id) => {
      const db = await getDb();
      const doc = await db[collectionName].findOne(id).exec();
      if (!doc) {
        throw new Error(`${entityName} with id ${id} not found`);
      }
      const result = await doc.remove();

      // Trigger immediate sync to Appwrite
      triggerSync(collectionName);

      return result;
    },

    findByQuery: async (selector) => {
      const db = await getDb();
      return await db[collectionName].find({ selector }).exec();
    }
  };
}
