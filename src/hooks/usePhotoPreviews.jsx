import { useState, useCallback, useEffect, useRef } from 'react';
import {
  getPhotosByEntity$,
  getPhotoWithFile,
} from '../services/db/database.js';

export function usePhotoPreviews(projectId) {
  const [photoBlobs, setPhotoBlobs] = useState({});
  const [loadingCostumes, setLoadingCostumes] = useState(new Set());
  const subscriptionsRef = useRef([]);

  useEffect(() => {
    setPhotoBlobs({});
    subscriptionsRef.current.forEach(sub => sub.unsubscribe());
    subscriptionsRef.current = [];
  }, [projectId]);

  useEffect(() => {
    return () => {
      subscriptionsRef.current.forEach(sub => sub.unsubscribe());
    };
  }, []);

  const loadCostumePhoto = useCallback(
    async costumeId => {
      if (!costumeId || loadingCostumes.has(costumeId)) {
        return;
      }

      setLoadingCostumes(prev => new Set([...prev, costumeId]));

      try {
        const photos$ = await getPhotosByEntity$('costumes', costumeId);
        const subscription = photos$.subscribe(async photos => {
          if (photos.length === 0) {
            setPhotoBlobs(prev => ({ ...prev, [costumeId]: null }));
            return;
          }

          const latestPhotoId = photos[0].id;
          const photoWithFile = await getPhotoWithFile(latestPhotoId);
          setPhotoBlobs(prev => ({
            ...prev,
            [costumeId]: photoWithFile?.imageBlob ?? null,
          }));
        });

        subscriptionsRef.current.push(subscription);
      } catch (err) {
        console.error(`Failed to load photo for costume ${costumeId}:`, err);
      } finally {
        setLoadingCostumes(prev => {
          const newSet = new Set(prev);
          newSet.delete(costumeId);
          return newSet;
        });
      }
    },
    [loadingCostumes],
  );

  return { photoBlobs, loadCostumePhoto };
}
