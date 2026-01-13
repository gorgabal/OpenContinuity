/**
 * Offline-first conflict handler for RxDB replication
 *
 * Prefers local changes if they're newer than remote data,
 * maintaining offline-first behavior without network dependency.
 */
export function createConflictHandler() {
  return {
    /**
     * Checks if two document states are equal
     */
    isEqual(documentA, documentB) {
      // Compare documents based on deleted status and timestamp
      // Never return true if timestamps differ
      const isEqual =
        documentA.id === documentB.id &&
        documentA.updatedAt === documentB.updatedAt &&
        documentA._deleted === documentB._deleted;

      return isEqual;
    },

    /**
     * Resolves conflicts between local and remote document states
     */
    resolve(input) {
      const local = input.newDocumentState;
      const remote = input.realMasterState;

      // Deletion always wins (offline-first) - honor from either side
      if (local._deleted || local.deleted) return local;
      if (remote._deleted || remote.deleted) return remote;

      // Compare timestamps for non-deletion conflicts
      if (local.updatedAt && remote.updatedAt) {
        const localTime = typeof local.updatedAt === 'number' 
          ? local.updatedAt 
          : new Date(local.updatedAt).getTime();
        const remoteTime = typeof remote.updatedAt === 'number'
          ? remote.updatedAt
          : new Date(remote.updatedAt).getTime();

        // Prefer newer version
        if (localTime > remoteTime) {
          return local; // Local is newer, keep it
        } else if (remoteTime > localTime) {
          return remote; // Remote is newer, accept it
        }
      }

      // If no timestamps or equal, prefer local (offline-first)
      // This ensures user's changes are never lost
      return local;
    }
  };
}
