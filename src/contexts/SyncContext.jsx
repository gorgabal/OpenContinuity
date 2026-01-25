import { createContext, useContext, useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { getSyncActivity$ } from '../services/database.js';

const SyncContext = createContext();

// Sync status enum
export const SYNC_STATUS = {
  OFFLINE: 'offline',
  SYNCING: 'syncing',
  SYNCED: 'synced',
};

// Minimum time to show syncing status (in ms)
const MIN_SYNCING_DISPLAY_TIME = 1000;

export function SyncProvider({ children }) {
  const [syncStatus, setSyncStatus] = useState(SYNC_STATUS.SYNCED);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Track when syncing started and pending status changes
  const syncingStartTime = useRef(null);
  const pendingStatusTimeout = useRef(null);

  // Helper to set syncing status with minimum display time
  const startSyncing = () => {
    if (!isOnline) return;

    // Clear any pending "back to synced" timeout
    if (pendingStatusTimeout.current) {
      clearTimeout(pendingStatusTimeout.current);
      pendingStatusTimeout.current = null;
    }

    // Record when syncing started (if not already syncing)
    if (syncingStartTime.current === null) {
      syncingStartTime.current = Date.now();
    }

    setSyncStatus(SYNC_STATUS.SYNCING);

    // Schedule transition back to synced after minimum display time
    pendingStatusTimeout.current = setTimeout(() => {
      syncingStartTime.current = null;
      pendingStatusTimeout.current = null;
      setSyncStatus(isOnline ? SYNC_STATUS.SYNCED : SYNC_STATUS.OFFLINE);
    }, MIN_SYNCING_DISPLAY_TIME);
  };

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setSyncStatus(SYNC_STATUS.SYNCED);
    };
    const handleOffline = () => {
      setIsOnline(false);
      setSyncStatus(SYNC_STATUS.OFFLINE);
      // Clear any pending timeout
      if (pendingStatusTimeout.current) {
        clearTimeout(pendingStatusTimeout.current);
        pendingStatusTimeout.current = null;
      }
      syncingStartTime.current = null;
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Subscribe to sync activity
  useEffect(() => {
    const subscription = getSyncActivity$().subscribe(() => {
      startSyncing();
    });

    return () => {
      subscription.unsubscribe();
      if (pendingStatusTimeout.current) {
        clearTimeout(pendingStatusTimeout.current);
      }
    };
  }, [isOnline]);

  // Update status when online status changes
  useEffect(() => {
    if (!isOnline) {
      setSyncStatus(SYNC_STATUS.OFFLINE);
    } else if (syncStatus === SYNC_STATUS.OFFLINE) {
      setSyncStatus(SYNC_STATUS.SYNCED);
    }
  }, [isOnline]);

  const value = {
    syncStatus,
    isOnline,
    startSyncing, // Expose this so components can trigger sync indicator
  };

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

SyncProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export function useSync() {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error('useSync must be used within a SyncProvider');
  }
  return context;
}
