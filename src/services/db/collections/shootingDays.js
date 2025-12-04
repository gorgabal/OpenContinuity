// Shooting Day collection operations
import { createCRUDOperations } from '../utils.js';

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

export function createShootingDayOperations(getDb) {
  const crud = createCRUDOperations(getDb, 'shootingdays', 'Shooting day', {
    date: new Date().toISOString().split('T')[0],
    location: '',
    status: 'Gepland'
  });

  return {
    // Re-export CRUD operations
    addShootingDay: crud.add,
    getShootingDays: crud.getAll,
    getShootingDayById: crud.getById,
    updateShootingDay: crud.update,

    // Create a default shooting day if none exist
    ensureDefaultShootingDay: async () => {
      const db = await getDb();
      const existingShootingDays = await db.shootingdays.find().exec();

      if (existingShootingDays.length === 0) {
        return await crud.add({
          date: new Date().toISOString().split('T')[0],
          location: 'Not specified',
          status: 'Gepland'
        });
      }

      return existingShootingDays[0];
    }
  };
}
