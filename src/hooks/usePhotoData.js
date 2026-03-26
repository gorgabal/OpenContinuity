import { useState, useEffect } from 'react';
import { switchMap } from 'rxjs';
import {
  getPhotosByEntity$,
  getPhotoWithFile,
} from '../services/db/database.js';

export function usePhotoData(entityType, entityId) {
  const [photos, setPhotos] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!entityId) return;

    let subscription;

    const loadPhotos = async () => {
      try {
        setIsLoading(true);
        const photos$ = await getPhotosByEntity$(entityType, entityId);
        subscription = photos$
          .pipe(
            switchMap(async photos => {
              const photosWithData = await Promise.all(
                photos.map(async photo => {
                  const photoWithFile = await getPhotoWithFile(photo.id);
                  return photoWithFile;
                }),
              );

              return photosWithData.filter(p => p !== null && p.imageBlob);
            }),
          )
          .subscribe({
            next: filteredPhotos => { setPhotos(filteredPhotos); setIsLoading(false); },
            error: err => { console.error('Photo subscription error:', err); setIsLoading(false); },
          });
      } catch (err) {
        console.error('Failed to load photos:', err);
        setIsLoading(false);
      }
    };

    loadPhotos();

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [entityId, entityType]);

  return { photos, isLoading };
}
