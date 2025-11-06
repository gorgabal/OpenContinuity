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
      type: ['string', 'null'],
      ref: 'characters',
    },
    scenes: {
      type: 'array',
      ref: 'scenes',
      items: {
        type: 'string'
      },
      default: []
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

const characterSchema = {
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
    },
    description: {
      type: 'string',
      default: '',
    },
    actor: {
      type: 'string',
      default: '',
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
  required: ['id', 'name', 'createdAt', 'updatedAt'],
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
    shootingDay: {
      type: ['string', 'null'],
      ref: 'shootingdays',
      default: null,
    },
    location: {
      type: 'string',
      default: '',
    },
    characters: {
      type: 'array',
      ref: 'characters',
      items: {
        type: 'string'
      },
      default: []
    },
    time: {
      type: 'string',
      default: '',
    },
    costumes: {
      type: 'array',
      ref: 'costumes',
      items: {
        type: 'string'
      },
      default: []
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
      characters: {
        schema: characterSchema,
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
    character: costumeData.character || null,
    scenes: costumeData.scenes || [],
    image: costumeData.image || 'https://placehold.co/400x300',
    photos: costumeData.photos || [],
    notes: costumeData.notes || '',
    createdAt: now,
    updatedAt: now,
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

// Helper function to get costume with populated character reference
export async function getCostumeWithCharacter(id) {
  const db = await getDatabase();
  const costume = await db.costumes.findOne(id).exec();
  
  if (!costume) {
    return null;
  }
  
  // Populate the character reference
  if (costume.character) {
    await costume.populate('character');
  }
  
  return costume;
}

// Helper function to get all costumes with populated character references
export async function getCostumesWithCharacters() {
  const db = await getDatabase();
  const costumes = await db.costumes.find().exec();
  
  // Populate character reference for each costume
  return await Promise.all(
    costumes.map(async (costume) => {
      if (costume.character) {
        await costume.populate('character');
      }
      return costume;
    })
  );
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

// Character functions
export async function addCharacter(characterData = {}) {
  const db = await getDatabase();
  const now = new Date().toISOString();

  const character = {
    id: generateUUID(),
    name: characterData.name || 'New Character',
    description: characterData.description || '',
    actor: characterData.actor || '',
    notes: characterData.notes || '',
    createdAt: now,
    updatedAt: now,
    ...characterData,
  };

  return await db.characters.insert(character);
}

export async function getCharacters() {
  const db = await getDatabase();
  const characters = await db.characters.find().exec();
  return characters.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getCharacterById(id) {
  const db = await getDatabase();
  return await db.characters.findOne(id).exec();
}

export async function updateCharacter(id, updateData) {
  const db = await getDatabase();
  const character = await db.characters.findOne(id).exec();

  if (character) {
    return await character.update({
      $set: {
        ...updateData,
        updatedAt: new Date().toISOString(),
      },
    });
  }

  throw new Error(`Character with id ${id} not found`);
}

export async function deleteCharacter(id) {
  const db = await getDatabase();
  const character = await db.characters.findOne(id).exec();

  if (character) {
    return await character.remove();
  }

  throw new Error(`Character with id ${id} not found`);
}

// Character-Costume relationship functions
export async function getCostumesByCharacterId(characterId) {
  const db = await getDatabase();
  const costumes = await db.costumes.find({
    selector: {
      character: characterId
    }
  }).exec();
  
  // Populate character reference for each costume
  return await Promise.all(
    costumes.map(async (costume) => {
      await costume.populate('character');
      return costume;
    })
  );
}

export async function assignCostumeToCharacter(costumeId, characterId) {
  const db = await getDatabase();
  
  // Verify character exists
  const character = await db.characters.findOne(characterId).exec();
  if (!character) {
    throw new Error(`Character with id ${characterId} not found`);
  }
  
  const costume = await db.costumes.findOne(costumeId).exec();
  if (!costume) {
    throw new Error(`Costume with id ${costumeId} not found`);
  }

  return await costume.update({
    $set: {
      character: characterId,
      updatedAt: new Date().toISOString(),
    },
  });
}

export async function unassignCostumeFromCharacter(costumeId) {
  const db = await getDatabase();
  const costume = await db.costumes.findOne(costumeId).exec();

  if (!costume) {
    throw new Error(`Costume with id ${costumeId} not found`);
  }

  return await costume.update({
    $set: {
      character: null,
      updatedAt: new Date().toISOString(),
    },
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

export async function updateShootingDay(id, updateData) {
  const db = await getDatabase();
  const shootingDay = await db.shootingdays.findOne(id).exec();

  if (shootingDay) {
    return await shootingDay.update({
      $set: {
        ...updateData,
        updatedAt: new Date().toISOString(),
      },
    });
  }

  throw new Error(`Shooting day with id ${id} not found`);
}

// Scene functions
export async function addScene(sceneData = {}) {
  const db = await getDatabase();
  const now = new Date().toISOString();

  const scene = {
    id: generateUUID(),
    sceneNumber: sceneData.sceneNumber || 1,
    shootingDay: sceneData.shootingDay || null,
    location: sceneData.location || '',
    characters: sceneData.characters || [],
    time: sceneData.time || '',
    costumes: sceneData.costumes || [],
    createdAt: now,
    updatedAt: now,
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

export async function getScenesByShootingDay(shootingDayId) {
  const db = await getDatabase();
  const scenes = await db.scenes.find({
    selector: {
      shootingDay: shootingDayId
    }
  }).exec();
  return scenes.sort((a, b) => a.sceneNumber - b.sceneNumber);
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
