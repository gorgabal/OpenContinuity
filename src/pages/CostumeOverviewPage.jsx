import { useState, useEffect } from 'react';
import { Card, Button, Spinner } from 'flowbite-react';
import { Link } from 'react-router-dom';
import {
  getDatabase,
  getCostumes,
  getCostumes$,
  costumeCrud,
  getCharacters,
  getPhotoWithFile,
  getPhotosByCostume,
} from '../services/db/database.js';
import { useProject } from '../contexts/ProjectContext.jsx';

function CostumeOverviewPage() {
  const { currentProjectId } = useProject();
  const [costumes, setCostumes] = useState([]);
  const [characters, setCharacters] = useState([]);
  const [photoPreviewMap, setPhotoPreviewMap] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let subscription;

    const setup = async () => {
      try {
        setIsLoading(true);

        await getDatabase();

        // Only load data if we have a current project
        if (currentProjectId) {
          // Get initial costumes and characters for current project
          const initialCostumes = await getCostumes(currentProjectId);
          const allCharacters = await getCharacters(currentProjectId);
          setCostumes(initialCostumes);
          setCharacters(allCharacters);

          // Subscribe to costume changes for reactive updates
          const costumes$ = await getCostumes$(currentProjectId);
          subscription = costumes$.subscribe(updatedCostumes => {
            setCostumes(updatedCostumes);
          });
        } else {
          // No project selected yet
          setCostumes([]);
          setCharacters([]);
        }

        setError(null);
      } catch (err) {
        console.error('Failed to setup costumes:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    setup();

    // Cleanup subscription on unmount
    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [currentProjectId]);

  // Load photo previews for costumes
  useEffect(() => {
    const loadPhotoPreviews = async () => {
      // Load all photo previews concurrently
      const previews = await Promise.all(
        costumes.map(async costume => {
          try {
            const photos = await getPhotosByCostume(costume.id);
            if (photos.length > 0) {
              const latestPhoto = photos[0]; // Already sorted by createdAt desc
              const photoData = await getPhotoWithFile(latestPhoto.id);
              if (photoData && photoData.imageBlob) {
                return {
                  costumeId: costume.id,
                  blob: photoData.imageBlob,
                  count: photos.length,
                };
              }
            }
          } catch (err) {
            console.error(
              `Failed to load photos for costume ${costume.id}:`,
              err,
            );
          }
          return null;
        }),
      );

      // Update state with loaded previews (only add new ones, don't overwrite existing)
      setPhotoPreviewMap(prev => {
        const updated = { ...prev };
        previews.forEach(preview => {
          if (preview && !updated[preview.costumeId]) {
            updated[preview.costumeId] = {
              blob: preview.blob,
              count: preview.count,
            };
          }
        });
        return updated;
      });
    };

    if (costumes.length > 0) {
      loadPhotoPreviews();
    }
  }, [costumes]);

  const handleAddCostume = async () => {
    if (!currentProjectId) {
      alert('Please select or create a project first');
      return;
    }

    try {
      await costumeCrud.add({
        name: 'New Costume',
        projects: currentProjectId,
      });
    } catch (err) {
      console.error('Failed to add costume:', err);
      setError(err.message);
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 flex justify-center items-center min-h-64">
        <Spinner size="xl" />
        <span className="ml-2">Loading costumes...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          Error loading costumes: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Costumes Overview</h1>
        <Button color="blue" onClick={handleAddCostume}>
          Add Costume
        </Button>
      </div>

      {costumes.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500 mb-4">
            No costumes found. Add your first costume!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {costumes.map(costume => {
            // Get photo preview by costume ID
            const photoPreview = photoPreviewMap[costume.id];
            const lastPhotoBlob = photoPreview?.blob;
            const photoCount = photoPreview?.count || 0;

            // Find the character name by ID
            const character =
              characters && characters.length > 0
                ? characters.find(c => c.id === costume.character)
                : null;
            const characterName = character ? character.name : 'Not assigned';

            return (
              <Link key={costume.id} to={`/costumes/${costume.id}`}>
                <Card className="hover:bg-gray-50 transition-colors cursor-pointer">
                  {lastPhotoBlob && (
                    <img
                      src={lastPhotoBlob}
                      alt={costume.name}
                      className="rounded-t-lg h-48 w-full object-cover"
                    />
                  )}
                  <h5 className="text-xl font-bold tracking-tight text-gray-900">
                    {costume.name || 'Untitled Costume'}
                  </h5>
                  <p className="font-normal text-gray-700">
                    Character: {characterName}
                  </p>
                  <p className="font-normal text-gray-700">
                    Scene: {costume.scene || 'Not assigned'}
                  </p>
                  {photoCount > 0 && (
                    <p className="font-normal text-gray-500 text-sm">
                      {photoCount} photo{photoCount !== 1 ? 's' : ''}
                    </p>
                  )}
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default CostumeOverviewPage;
