import { useState, useEffect } from 'react';
import { Card, Button, Spinner } from 'flowbite-react';
import { Link } from 'react-router-dom';
import {
  initDatabase,
  getCostumes,
  getCostumes$,
  addCostume,
  getCharacters,
} from '../services/database.js';

/*
Should contain the following:
  - list of scenes
  - Name of character
  - Image of costume
*/

function CostumeOverviewPage() {
  const [costumes, setCostumes] = useState([]);
  const [characters, setCharacters] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let subscription;

    const setup = async () => {
      try {
        setIsLoading(true);

        // Initialize database
        await initDatabase();

        // Get initial costumes and characters
        const initialCostumes = await getCostumes();
        const allCharacters = await getCharacters();
        setCostumes(initialCostumes);
        setCharacters(allCharacters);

        // Subscribe to costume changes for reactive updates
        const costumes$ = await getCostumes$();
        subscription = costumes$.subscribe(updatedCostumes => {
          setCostumes(updatedCostumes);
        });

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
  }, []);

  const handleAddCostume = async () => {
    try {
      await addCostume({
        name: 'New Costume',
        character: null,
        scene: '',
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
            // Get the last uploaded photo for preview
            const lastPhoto = costume.photos && costume.photos.length > 0
              ? costume.photos[costume.photos.length - 1]
              : null;

            // Find the character name by ID
            const character = characters && characters.length > 0 
              ? characters.find(c => c.id === costume.character)
              : null;
            const characterName = character ? character.name : 'Not assigned';

            return (
              <Link key={costume.id} to={`/costumes/${costume.id}`}>
                <Card className="hover:bg-gray-50 transition-colors cursor-pointer">
                  {lastPhoto && (
                    <img
                      src={lastPhoto.data}
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
                  {costume.photos && costume.photos.length > 0 && (
                    <p className="font-normal text-gray-500 text-sm">
                      {costume.photos.length} photo{costume.photos.length !== 1 ? 's' : ''}
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
