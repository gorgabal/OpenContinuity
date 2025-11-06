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
  attachments: {}, // Enable attachments for storing photos
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
  let costume = await db.costumes.findOne(costumeId).exec();

  if (!costume) {
    throw new Error(`Costume with id ${costumeId} not found`);
  }

  // Generate unique photo ID
  const photoId = generateUUID();
  
  // Store photo as RxDB attachment (works offline)
  await costume.putAttachment({
    id: photoId,
    data: photoFile,
    type: photoFile.type || 'image/jpeg'
  });

  // Re-fetch the document to get the latest version with the attachment
  costume = await db.costumes.findOne(costumeId).exec();

  // Update costume's updatedAt timestamp
  await costume.update({
    $set: {
      updatedAt: new Date().toISOString()
    }
  });

  // TODO: Supabase Integration
  // When online, queue this photo for upload to Supabase Storage
  // await queuePhotoForSync(costumeId, photoId, photoFile.name);

  return { id: photoId, filename: photoFile.name, createdAt: new Date().toISOString() };
}

export async function getPhotoUrl(costumeId, photoId) {
  const db = await getDatabase();
  const costume = await db.costumes.findOne(costumeId).exec();

  if (!costume) {
    throw new Error(`Costume with id ${costumeId} not found`);
  }

  // Get attachment from RxDB
  const attachment = costume.getAttachment(photoId);
  if (!attachment) {
    throw new Error(`Photo with id ${photoId} not found`);
  }

  // Get the blob data and create an object URL
  const blob = await attachment.getData();
  const url = URL.createObjectURL(blob);

  // TODO: Supabase Integration
  // If online and synced to cloud, could optionally fetch from Supabase Storage CDN
  // const cloudUrl = await getCloudPhotoUrl(costumeId, photoId);
  // return cloudUrl || url;

  return url;
}

export async function removePhotoFromCostume(costumeId, photoId) {
  const db = await getDatabase();
  const costume = await db.costumes.findOne(costumeId).exec();

  if (!costume) {
    throw new Error(`Costume with id ${costumeId} not found`);
  }

  // Get attachment to verify it exists
  const attachment = costume.getAttachment(photoId);
  if (!attachment) {
    throw new Error(`Photo with id ${photoId} not found`);
  }

  // Remove attachment from RxDB
  await attachment.remove();

  // Update costume's updatedAt timestamp
  await costume.update({
    $set: {
      updatedAt: new Date().toISOString()
    }
  });

  // TODO: Supabase Integration
  // When online, also delete from Supabase Storage
  // await deletePhotoFromCloud(costumeId, photoId);
}

// Get all photos for a costume
export async function getAllPhotosForCostume(costumeId) {
  const db = await getDatabase();
  const costume = await db.costumes.findOne(costumeId).exec();

  if (!costume) {
    throw new Error(`Costume with id ${costumeId} not found`);
  }

  // Get all attachments for this costume
  const attachments = costume.allAttachments();
  
  // Map attachments to photo metadata
  const photos = await Promise.all(
    attachments.map(async (attachment) => {
      const data = await attachment.getData();
      return {
        id: attachment.id,
        type: attachment.type,
        length: attachment.length,
        digest: attachment.digest,
        // Create blob URL for display
        url: URL.createObjectURL(data)
      };
    })
  );

  return photos;
}

// Character functions
export async function addCharacter(characterData = {}) {
  const db = await getDatabase();
  const now = new Date().toISOString();

  const character = {
    id: generateUUID(),
    createdAt: now,
    updatedAt: now,
    name: characterData.name || 'New Character',
    description: characterData.description || '',
    actor: characterData.actor || '',
    notes: characterData.notes || '',
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
    createdAt: now,
    updatedAt: now,
    date: shootingDayData.date || new Date().toISOString().split('T')[0],
    location: shootingDayData.location || '',
    status: shootingDayData.status || 'Gepland',
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

// ============================================================================
// Supabase Integration Placeholders
// ============================================================================
// TODO: Implement these functions when setting up Supabase Storage

/**
 * Queue a photo for upload to Supabase Storage
 * This should be called after successfully storing a photo as an RxDB attachment
 * 
 * @param {string} costumeId - The costume ID
 * @param {string} photoId - The photo/attachment ID
 * @param {string} filename - Original filename
 */
export async function queuePhotoForSync(costumeId, photoId, filename) {
  // TODO: Implementation needed
  // 1. Store sync queue entry in a local table/collection
  // 2. Track sync status (pending, uploading, synced, failed)
  // 3. Trigger background sync if online
  console.log(`[Supabase] Photo queued for sync: ${photoId} from costume ${costumeId}`);
}

/**
 * Sync all pending photos to Supabase Storage
 * This should run in the background when the app comes online
 */
export async function syncPhotosToCloud() {
  // TODO: Implementation needed
  // 1. Check if online
  // 2. Get all photos with sync status = 'pending'
  // 3. For each photo:
  //    a. Get attachment data from RxDB
  //    b. Upload to Supabase Storage bucket
  //    c. Store metadata in Supabase 'costume_photos' table
  //    d. Update sync status to 'synced'
  // 4. Handle errors and retry logic
  console.log('[Supabase] Syncing photos to cloud...');
}

/**
 * Get photo URL from Supabase Storage (when online)
 * 
 * @param {string} costumeId - The costume ID
 * @param {string} photoId - The photo ID
 * @returns {Promise<string|null>} Cloud URL or null if not synced
 */
export async function getCloudPhotoUrl(costumeId, photoId) {
  // TODO: Implementation needed
  // 1. Check if photo is synced to cloud
  // 2. If synced, return Supabase Storage public URL or signed URL
  // 3. If not synced, return null (fallback to local attachment)
  console.log(`[Supabase] Getting cloud URL for photo ${photoId}`);
  return null;
}

/**
 * Delete photo from Supabase Storage
 * 
 * @param {string} costumeId - The costume ID
 * @param {string} photoId - The photo ID
 */
export async function deletePhotoFromCloud(costumeId, photoId) {
  // TODO: Implementation needed
  // 1. Check if photo exists in cloud
  // 2. Delete from Supabase Storage bucket
  // 3. Delete metadata from 'costume_photos' table
  // 4. Handle errors gracefully (photo may not exist in cloud yet)
  console.log(`[Supabase] Deleting photo ${photoId} from cloud`);
}

/**
 * Download photos from cloud to local device
 * Useful for syncing photos to a new device or after reinstalling
 * 
 * @param {string} costumeId - The costume ID
 */
export async function downloadPhotosFromCloud(costumeId) {
  // TODO: Implementation needed
  // 1. Query 'costume_photos' table for all photos of this costume
  // 2. For each photo not in local RxDB attachments:
  //    a. Download from Supabase Storage
  //    b. Store as RxDB attachment
  //    c. Mark as synced
  console.log(`[Supabase] Downloading photos for costume ${costumeId}`);
}
