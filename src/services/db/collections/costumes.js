// Costume collection operations
import { createCRUDOperations, generateUUID, getTimestamps, getWithPopulated } from '../utils.js';

export const costumeSchema = {
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

export function createCostumeOperations(getDb) {
  const crud = createCRUDOperations(getDb, 'costumes', 'Costume', {
    name: 'New Costume',
    character: null,
    scenes: [],
    notes: ''
  });

  return {
    // Re-export CRUD operations
    addCostume: crud.add,
    getCostumes: crud.getAll,
    getCostumeById: crud.getById,
    getCostumeById$: crud.getById$,
    getCostumes$: crud.getAll$,
    updateCostume: crud.update,
    deleteCostume: crud.delete,

    // Helper function to get costume with populated character reference
    getCostumeWithCharacter: async (id) => {
      const db = await getDb();
      return await getWithPopulated(db, 'costumes', id, ['character']);
    },

    // Helper function to get all costumes with populated character references
    getCostumesWithCharacters: async () => {
      const costumes = await crud.getAll();
      return await Promise.all(
        costumes.map(async (costume) => {
          if (costume.character) {
            await costume.populate('character');
          }
          return costume;
        })
      );
    },

    // Photo-related functions
    addPhotoToCostume: async (costumeId, photoFile) => {
      const db = await getDb();
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
        $set: getTimestamps(false)
      });

      return { id: photoId, filename: photoFile.name, createdAt: new Date().toISOString() };
    },

    getPhotoUrl: async (costumeId, photoId) => {
      const db = await getDb();
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

      return url;
    },

    removePhotoFromCostume: async (costumeId, photoId) => {
      const db = await getDb();
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
        $set: getTimestamps(false)
      });
    },

    // Get all photos for a costume
    getAllPhotosForCostume: async (costumeId) => {
      const db = await getDb();
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
    },

    // Get costumes by character ID
    getCostumesByCharacterId: async (characterId) => {
      const costumes = await crud.findByQuery({ character: characterId });
      // Populate character reference for each costume
      return await Promise.all(
        costumes.map(async (costume) => {
          await costume.populate('character');
          return costume;
        })
      );
    },

    // Assign costume to character
    assignCostumeToCharacter: async (costumeId, characterId) => {
      const db = await getDb();

      // Verify character exists
      const character = await db.characters.findOne(characterId).exec();
      if (!character) {
        throw new Error(`Character with id ${characterId} not found`);
      }

      return await crud.update(costumeId, { character: characterId });
    },

    // Unassign costume from character
    unassignCostumeFromCharacter: async (costumeId) => {
      return await crud.update(costumeId, { character: null });
    }
  };
}
