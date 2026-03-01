import { useState, useEffect } from 'react';
import {
  getPhotoWithFile,
  getPhotosByProject$,
} from '../services/db/database.js';

export function usePhotoPreviews(projectId) {
  const [photoPreviewMap, setPhotoPreviewMap] = useState({});

  useEffect(() => {
    let photoSubscription;

    const setupPhotoSubscription = async () => {
      if (!projectId) {
        setPhotoPreviewMap({});
        return;
      }

      const photos$ = await getPhotosByProject$(projectId);
      photoSubscription = photos$.subscribe(async photos => {
        const previewMap = {};

        // Group photos by costumeId, keep track of counts
        const photosByCostume = {};
        photos.forEach(photo => {
          if (photo.costumes) {
            if (!photosByCostume[photo.costumes]) {
              photosByCostume[photo.costumes] = [];
            }
            photosByCostume[photo.costumes].push(photo);
          }
        });

        // Load blob for latest photo of each costume
        for (const [costumeId, costumePhotos] of Object.entries(
          photosByCostume,
        )) {
          const latestPhoto = costumePhotos[0];
          try {
            const photoWithFile = await getPhotoWithFile(latestPhoto.id);
            if (photoWithFile && photoWithFile.imageBlob) {
              previewMap[costumeId] = {
                blob: photoWithFile.imageBlob,
                count: costumePhotos.length,
              };
            }
          } catch (err) {
            console.error(
              `Failed to load photo for costume ${costumeId}:`,
              err,
            );
          }
        }

        setPhotoPreviewMap(previewMap);
      });
    };

    setupPhotoSubscription();

    return () => {
      if (photoSubscription) {
        photoSubscription.unsubscribe();
      }
    };
  }, [projectId]);

  return photoPreviewMap;
}
