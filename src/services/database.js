import { addRxPlugin, createRxDatabase } from 'rxdb/plugins/core';
import { RxDBDevModePlugin } from 'rxdb/plugins/dev-mode';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import { wrappedValidateAjvStorage } from 'rxdb/plugins/validate-ajv';
import { RxDBUpdatePlugin } from 'rxdb/plugins/update';
import { RxDBAttachmentsPlugin } from 'rxdb/plugins/attachments';

let database = null;

// UUID fallback for non-secure contexts
function generateUUID() {
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
    photos: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          filename: { type: 'string' },
          data: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
        },
        required: ['id', 'filename', 'data', 'createdAt']
      },
      default: []
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
  addRxPlugin(RxDBAttachmentsPlugin);

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
    id: generateUUID(),
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

// Photo-related functions
export async function addPhotoToCostume(costumeId, photoFile) {
  const db = await getDatabase();
  const costume = await db.costumes.findOne(costumeId).exec();
  
  if (!costume) {
    throw new Error(`Costume with id ${costumeId} not found`);
  }

  // Convert file to base64
  const base64Data = await new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(photoFile);
  });

  // Create photo object
  const photoId = generateUUID();
  const filename = `photo_${Date.now()}.jpg`;
  const newPhoto = {
    id: photoId,
    filename: filename,
    data: base64Data,
    createdAt: new Date().toISOString()
  };

  // Update the photos array
  const currentPhotos = costume.photos || [];
  await costume.update({
    $set: {
      photos: [...currentPhotos, newPhoto],
      updatedAt: new Date().toISOString()
    }
  });

  return newPhoto;
}

export async function getPhotoUrl(costumeId, photoId) {
  const db = await getDatabase();
  const costume = await db.costumes.findOne(costumeId).exec();
  
  if (!costume) {
    throw new Error(`Costume with id ${costumeId} not found`);
  }

  const photo = (costume.photos || []).find(p => p.id === photoId);
  if (!photo) {
    throw new Error(`Photo with id ${photoId} not found`);
  }

  // Return the base64 data URL directly
  return photo.data;
}

export async function removePhotoFromCostume(costumeId, photoId) {
  const db = await getDatabase();
  const costume = await db.costumes.findOne(costumeId).exec();
  
  if (!costume) {
    throw new Error(`Costume with id ${costumeId} not found`);
  }

  // Remove from photos array
  const updatedPhotos = (costume.photos || []).filter(photo => photo.id !== photoId);
  
  await costume.update({
    $set: {
      photos: updatedPhotos,
      updatedAt: new Date().toISOString()
    }
  });
}
