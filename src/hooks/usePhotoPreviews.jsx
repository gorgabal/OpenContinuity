import { useState, useCallback, useEffect, useRef } from 'react';
import { switchMap } from 'rxjs';
import {
  getPhotosByEntity$,
  getPhotoWithFile,
} from '../services/db/database.js';

export function usePhotoPreviews(projectId, entityType) {
  const [photoBlobs, setPhotoBlobs] = useState({});
  const [loadingEntities, setLoadingEntities] = useState(new Set());
  const subscriptionsRef = useRef({});

  useEffect(() => {
    setPhotoBlobs({});
    Object.values(subscriptionsRef.current).forEach(sub => sub.unsubscribe());
    subscriptionsRef.current = {};
  }, [projectId]);

  useEffect(() => {
    return () => {
      Object.values(subscriptionsRef.current).forEach(sub => sub.unsubscribe());
    };
  }, []);

  const loadEntityPhoto = useCallback(
    async entityId => {
      if (!entityId || loadingEntities.has(entityId)) {
        return;
      }

      setLoadingEntities(prev => new Set([...prev, entityId]));

      try {
        const photos$ = await getPhotosByEntity$(entityType, entityId);
        const subscription = photos$
          .pipe(
            switchMap(async photos => {
              if (photos.length === 0) {
                return [];
              }

              const recentPhotos = photos.slice(0, 4);
              const photoPromises = recentPhotos.map(async photo => {
                const photoWithFile = await getPhotoWithFile(photo.id);
                return photoWithFile?.imageBlob ?? null;
              });
              const results = await Promise.all(photoPromises);
              return results.filter(blob => blob !== null);
            }),
          )
          .subscribe({
            next: photoUrls => {
              setPhotoBlobs(prev => ({
                ...prev,
                [entityId]: photoUrls,
              }));
            },
            error: err => {
              console.error(`Photo preview subscription error for ${entityId}:`, err);
            },
          });

        subscriptionsRef.current[entityId] = subscription;
      } catch (err) {
        console.error(`Failed to load photo for entity ${entityId}:`, err);
      } finally {
        setLoadingEntities(prev => {
          const newSet = new Set(prev);
          newSet.delete(entityId);
          return newSet;
        });
      }
    },
    [loadingEntities, entityType],
  );

  return { photoBlobs, loadEntityPhoto };
}
