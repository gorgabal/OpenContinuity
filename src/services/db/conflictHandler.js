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
      // Compare documents based on content and timestamp
      // Never return true if timestamps differ
      const isEqual =
        documentA.id === documentB.id &&
        documentA.name === documentB.name &&
        documentA.updatedAt === documentB.updatedAt &&
        documentA.description === documentB.description &&
        documentA.actor === documentB.actor &&
        documentA.notes === documentB.notes;

      console.log('[Conflict] isEqual check:', {
        docA_id: documentA.id,
        docA_name: documentA.name,
        docA_updated: documentA.updatedAt,
        docB_id: documentB.id,
        docB_name: documentB.name,
        docB_updated: documentB.updatedAt,
        result: isEqual
      });
      return isEqual;
    },

    /**
     * Resolves conflicts between local and remote document states
     */
    resolve(input) {
      const local = input.newDocumentState;
      const remote = input.realMasterState;

      console.log('[Conflict] Resolving conflict:', {
        local_id: local.id,
        local_name: local.name,
        local_updated: local.updatedAt,
        local_deleted: local._deleted || local.deleted,
        remote_id: remote.id,
        remote_name: remote.name,
        remote_updated: remote.updatedAt,
        remote_deleted: remote._deleted || remote.deleted
      });

      // If either side is deleted, prefer deletion (check both _deleted and deleted)
      if (local._deleted || local.deleted || remote._deleted || remote.deleted) {
        console.log('[Conflict] Resolution: remote wins (deletion)');
        return remote; // Let remote deletion state win
      }

      // Compare timestamps if available
      if (local.updatedAt && remote.updatedAt) {
        const localTime = new Date(local.updatedAt).getTime();
        const remoteTime = new Date(remote.updatedAt).getTime();

        // Prefer newer version
        if (localTime > remoteTime) {
          console.log('[Conflict] Resolution: local wins (newer timestamp)');
          return local; // Local is newer, keep it
        } else if (remoteTime > localTime) {
          console.log('[Conflict] Resolution: remote wins (newer timestamp)');
          return remote; // Remote is newer, accept it
        }
      }

      // If no timestamps or equal, prefer local (offline-first)
      // This ensures user's changes are never lost
      console.log('[Conflict] Resolution: local wins (default/no timestamps)');
      return local;
    }
  };
}
