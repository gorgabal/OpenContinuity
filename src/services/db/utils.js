// Shared database utilities
import { triggerSync } from './database.js';

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
