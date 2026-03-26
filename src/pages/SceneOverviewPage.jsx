import { useState, useEffect } from 'react';
import { Card, Button } from 'flowbite-react';
import { Link } from 'react-router-dom';
import {
  sceneCrud,
  shootingDayCrud,
  getScenes$,
  getShootingDays$,
  getCharacters$,
  getCostumes$,
  getDatabase,
} from '../services/db/database';
import { useProject } from '../contexts/ProjectContext.jsx';
import ScenePreview from '../components/ScenePreview.jsx';

function SceneOverviewPage() {
  const { currentProjectId } = useProject();
  const [scenes, setScenes] = useState([]);
  const [shootingDays, setShootingDays] = useState([]);
  const [characters, setCharacters] = useState([]);
  const [costumes, setCostumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const subscriptions = [];

    const loadData = async () => {
      try {
        setLoading(true);

        await getDatabase();

        if (currentProjectId) {
          const scenesObservable = await getScenes$(currentProjectId);
          const scenesSub = scenesObservable.subscribe(scenesData => {
            setScenes(scenesData);
            setLoading(false);
          });
          subscriptions.push(scenesSub);

          const shootingDaysObservable =
            await getShootingDays$(currentProjectId);
          const shootingDaysSub = shootingDaysObservable.subscribe(
            shootingDaysData => {
              setShootingDays(shootingDaysData);
            },
          );
          subscriptions.push(shootingDaysSub);

          const charactersObservable = await getCharacters$(currentProjectId);
          const charactersSub = charactersObservable.subscribe(
            charactersData => {
              setCharacters(charactersData);
            },
          );
          subscriptions.push(charactersSub);

          const costumesObservable = await getCostumes$(currentProjectId);
          const costumesSub = costumesObservable.subscribe(costumesData => {
            setCostumes(costumesData);
          });
          subscriptions.push(costumesSub);
        } else {
          setScenes([]);
          setShootingDays([]);
          setCharacters([]);
          setCostumes([]);
          setLoading(false);
        }
      } catch (err) {
        console.error('Error loading data:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    loadData();

    return () => {
      subscriptions.forEach(sub => sub.unsubscribe());
    };
  }, [currentProjectId]);

  const handleAddShootingDay = async () => {
    if (!currentProjectId) {
      alert('Please select or create a project first');
      return;
    }

    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateString = tomorrow.toISOString().split('T')[0];

      await shootingDayCrud.add({
        date: dateString,
        location: '',
        projects: currentProjectId,
      });
      // No need to manually refresh - the subscription will handle it
    } catch (error) {
      alert('Error creating shooting day: ' + error.message);
    }
  };

  const handleAddScene = async () => {
    if (!currentProjectId) {
      alert('Please select or create a project first');
      return;
    }

    try {
      // Find the next scene number
      const maxSceneNumber =
        scenes.length > 0
          ? Math.max(...scenes.map(scene => scene.sceneNumber))
          : 0;

      await sceneCrud.add({
        sceneNumber: maxSceneNumber + 1,
        shootingDay: null,
        location: '',
        characters: [],
        costumes: [],
        projects: currentProjectId,
      });
      // No need to manually refresh - the subscription will handle it
    } catch (error) {
      alert('Error creating scene: ' + error.message);
    }
  };

  if (loading) {
    return (
      <div className="p-4">
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">Loading...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="text-red-500 text-center">
          Error loading data: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">SCENE OVERZICHT</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left column - Scenes */}
        <div className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Scenes</h2>
            <Button onClick={handleAddScene}>Add Scene</Button>
          </div>

          {scenes.length === 0 ? (
            <Card>
              <p className="text-gray-500 text-center py-8">
                No scenes found. Click Add Scene to create your first scene.
              </p>
            </Card>
          ) : (
            scenes.map(scene => (
              <Link key={scene.id} to={`/scene/${scene.id}`}>
                <ScenePreview
                  scene={scene}
                  characters={characters}
                  costumes={costumes}
                  shootingDays={shootingDays}
                  showShootingDay={true}
                  showPhotoStrip={true}
                />
              </Link>
            ))
          )}
        </div>

        {/* Right column - Shooting Days */}
        <div className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Draaidagen</h2>
            <Button onClick={handleAddShootingDay}>Add Shooting Day</Button>
          </div>

          {shootingDays.length === 0 ? (
            <Card>
              <p className="text-gray-500 text-center py-8">
                No shooting days found.
              </p>
            </Card>
          ) : (
            shootingDays.map(day => {
              const dayScenes = scenes
                .filter(scene => scene.shootingDay === day.id)
                .sort((a, b) => a.sceneNumber - b.sceneNumber);

              return (
                <div key={day.id}>
                  <Link to={`/shootingday/${day.id}`}>
                    <Card className="hover:bg-gray-50 transition-colors">
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="font-bold">
                          {day.name ||
                            new Date(day.date).toLocaleDateString('nl-NL')}
                        </h3>
                        <span className="text-sm text-gray-500">
                          {day.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">
                        {new Date(day.date).toLocaleDateString('nl-NL')}
                      </p>
                      <p className="text-gray-700">Locatie: {day.location}</p>
                      <p className="text-gray-700">
                        Scenes:{' '}
                        {dayScenes.length > 0
                          ? dayScenes.map(scene => scene.sceneNumber).join(', ')
                          : 'No scenes'}
                      </p>
                    </Card>
                  </Link>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export default SceneOverviewPage;
