import { addRxPlugin, createRxDatabase } from 'rxdb/plugins/core';
import { RxDBDevModePlugin } from 'rxdb/plugins/dev-mode';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import { wrappedValidateAjvStorage } from 'rxdb/plugins/validate-ajv';
import { RxDBUpdatePlugin } from 'rxdb/plugins/update';
import { RxDBAttachmentsPlugin } from 'rxdb/plugins/attachments';

let database = null;
let initPromise = null;

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

const shootingDaySchema = {
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
    status: {
      type: 'string',
      default: 'Gepland',
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
  required: ['id', 'date', 'createdAt', 'updatedAt'],
};

const sceneSchema = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: {
      type: 'string',
      maxLength: 100,
    },
    sceneNumber: {
      type: 'integer',
    },
    shootingDayId: {
      type: 'string',
      default: '',
    },
    location: {
      type: 'string',
      default: '',
    },
    characters: {
      type: 'string',
      default: '',
    },
    time: {
      type: 'string',
      default: '',
    },
    costume: {
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
  required: ['id', 'sceneNumber', 'createdAt', 'updatedAt'],
};

export async function initDatabase() {
  if (database) {
    return database;
  }

  // If initialization is already in progress, wait for it
  if (initPromise) {
    return await initPromise;
  }

  // Start initialization
  initPromise = (async () => {
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
      shootingdays: {
        schema: shootingDaySchema,
      },
      scenes: {
        schema: sceneSchema,
      },
    });

    return database;
  })();

  return await initPromise;
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

// Shooting Day functions
export async function addShootingDay(shootingDayData = {}) {
  const db = await getDatabase();
  const now = new Date().toISOString();

  const shootingDay = {
    id: generateUUID(),
    date: shootingDayData.date || new Date().toISOString().split('T')[0],
    location: shootingDayData.location || '',
    status: shootingDayData.status || 'Gepland',
    createdAt: now,
    updatedAt: now,
    ...shootingDayData,
  };

  return await db.shootingdays.insert(shootingDay);
}

export async function getShootingDays() {
  const db = await getDatabase();
  return await db.shootingdays.find().exec();
}

export async function getShootingDayById(id) {
  const db = await getDatabase();
  return await db.shootingdays.findOne(id).exec();
}

// Scene functions
export async function addScene(sceneData = {}) {
  const db = await getDatabase();
  const now = new Date().toISOString();

  const scene = {
    id: generateUUID(),
    sceneNumber: sceneData.sceneNumber || 1,
    shootingDayId: sceneData.shootingDayId || '',
    location: sceneData.location || '',
    characters: sceneData.characters || '',
    time: sceneData.time || '',
    costume: sceneData.costume || '',
    createdAt: now,
    updatedAt: now,
    ...sceneData,
  };

  return await db.scenes.insert(scene);
}

export async function getScenes() {
  const db = await getDatabase();
  const scenes = await db.scenes.find().exec();
  return scenes.sort((a, b) => a.sceneNumber - b.sceneNumber);
}

export async function getSceneById(id) {
  const db = await getDatabase();
  return await db.scenes.findOne(id).exec();
}

export async function updateScene(id, updateData) {
  const db = await getDatabase();
  const scene = await db.scenes.findOne(id).exec();

  if (scene) {
    return await scene.update({
      $set: {
        ...updateData,
        updatedAt: new Date().toISOString(),
      },
    });
  }

  throw new Error(`Scene with id ${id} not found`);
}

// Sample data seeding function
export async function seedSampleData() {
  const db = await getDatabase();
  
  // Check if data already exists
  const existingShootingDays = await db.shootingdays.find().exec();
  const existingScenes = await db.scenes.find().exec();
  
  if (existingShootingDays.length > 0 || existingScenes.length > 0) {
    console.log('Sample data already exists, skipping seed');
    return;
  }

  try {
    console.log('Seeding sample data...');
    
    // Create sample shooting days
    const shootingDay1 = await addShootingDay({
      date: '2024-03-20',
      location: 'Centrum',
      status: 'Gepland'
    });

    const shootingDay2 = await addShootingDay({
      date: '2024-03-21',
      location: 'Kantoorpand',
      status: 'In afwachting'
    });

    const shootingDay3 = await addShootingDay({
      date: '2024-03-22',
      location: 'Station',
      status: 'Bevestigd'
    });

    // Create sample scenes
    await addScene({
      sceneNumber: 1,
      shootingDayId: shootingDay1.id,
      location: 'Café De Kroeg',
      characters: 'John, Maria',
      time: 'Avond',
      costume: ''
    });

    await addScene({
      sceneNumber: 2,
      shootingDayId: shootingDay1.id,
      location: 'Stadspark',
      characters: 'Maria, Peter',
      time: 'Middag',
      costume: ''
    });

    await addScene({
      sceneNumber: 3,
      shootingDayId: shootingDay2.id,
      location: 'Kantoor',
      characters: 'John, Boss',
      time: 'Ochtend',
      costume: ''
    });

    await addScene({
      sceneNumber: 14,
      shootingDayId: shootingDay3.id,
      location: 'Treinstation',
      characters: 'Maria',
      time: 'Spits',
      costume: 'Reisoutfit'
    });

    console.log('Sample data seeded successfully');
  } catch (error) {
    console.error('Error seeding sample data:', error);
  }
}

// Create a default shooting day if none exist
export async function ensureDefaultShootingDay() {
  const db = await getDatabase();
  const existingShootingDays = await db.shootingdays.find().exec();
  
  if (existingShootingDays.length === 0) {
    return await addShootingDay({
      date: new Date().toISOString().split('T')[0],
      location: 'Not specified',
      status: 'Gepland'
    });
  }
  
  return existingShootingDays[0];
}
