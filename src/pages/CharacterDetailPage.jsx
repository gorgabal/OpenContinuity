import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Card,
  Button,
  Spinner,
  TextInput,
  Label,
  Textarea,
  Modal,
} from 'flowbite-react';
import {
  characterCrud,
  getCostumesByCharacterId,
  assignCostumeToCharacter,
  unassignCostumeFromCharacter,
  getCostumes,
  costumeCrud,
  getPhotosByCostume,
  getPhotoWithFile,
} from '../services/db/database';
import { useProject } from '../contexts/ProjectContext.jsx';

function CharacterDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentProjectId } = useProject();

  const [character, setCharacter] = useState(null);
  const [costumes, setCostumes] = useState([]);
  const [availableCostumes, setAvailableCostumes] = useState([]);
  //TODO: remove photoPreviewMap, load from rxdb directly. This seems like needless abstraction. 
  const [photoPreviewMap, setPhotoPreviewMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showAddCostumeModal, setShowAddCostumeModal] = useState(false);

  const [editData, setEditData] = useState({
    name: '',
    description: '',
    actor: '',
    notes: '',
  });

  useEffect(() => {
    if (!id) return;

    setLoading(true);
    let subscription;

    const setupSubscription = async () => {
      try {
        // Subscribe to reactive query - this will auto-update when data changes
        const character$ = await characterCrud.getById$(id);

        subscription = character$.subscribe(characterData => {
          if (!characterData) {
            setError('Character not found');
            setLoading(false);
            return;
          }

          setCharacter(characterData);
          setError(null);
          setLoading(false);
        });

        // Load costumes filtered by current project
        if (currentProjectId) {
          const [characterCostumes, allCostumes] = await Promise.all([
            getCostumesByCharacterId(id),
            getCostumes(currentProjectId),
          ]);

          setCostumes(characterCostumes);

          const unassignedCostumes = allCostumes.filter(
            costume => !costume.character || costume.character === null,
          );
          setAvailableCostumes(unassignedCostumes);

          // Load photo previews for all costumes (both assigned and available)
          const allCostumesToLoad = [
            ...characterCostumes,
            ...unassignedCostumes,
          ];
          const photoMap = {};
          for (const costume of allCostumesToLoad) {
            try {
              const photos = await getPhotosByCostume(costume.id);
              if (photos.length > 0) {
                const lastPhotoId = photos[0].id;
                const photoWithFile = await getPhotoWithFile(lastPhotoId);
                if (photoWithFile && photoWithFile.imageBlob) {
                  photoMap[costume.id] = photoWithFile.imageBlob;
                }
              }
            } catch (err) {
              console.error(
                `Failed to load photos for costume ${costume.id}:`,
                err,
              );
            }
          }
          setPhotoPreviewMap(photoMap);
        } else {
          setCostumes([]);
          setAvailableCostumes([]);
          setPhotoPreviewMap({});
        }
      } catch (err) {
        console.error('Error loading character:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    setupSubscription();

    // Cleanup subscription on unmount
    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [id, currentProjectId]);

  // Sync editData with character when NOT editing
  useEffect(() => {
    if (character && !isEditing) {
      setEditData(prev => {
        const newData = {
          name: character.name || '',
          description: character.description || '',
          actor: character.actor || '',
          notes: character.notes || '',
        };

        // Only update if data actually changed
        if (JSON.stringify(prev) !== JSON.stringify(newData)) {
          return newData;
        }
        return prev;
      });
    }
  }, [character, isEditing]);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      const updatedData = {
        ...editData,
        updatedAt: Date.now(),
      };

      await characterCrud.update(id, updatedData);

      // Update local state immediately - don't wait for subscription
      setCharacter(prev => ({
        ...prev,
        ...updatedData,
      }));

      setIsEditing(false);
    } catch (err) {
      console.error('Error saving character:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    // Reset edit data to original values
    setEditData({
      name: character.name || '',
      description: character.description || '',
      actor: character.actor || '',
      notes: character.notes || '',
    });
    setIsEditing(false);
    setError(null);
  };

  const handleDelete = async () => {
    if (
      window.confirm(
        `Are you sure you want to delete the character "${character.name}"?`,
      )
    ) {
      try {
        await characterCrud.delete(id);
        navigate('/characters');
      } catch (err) {
        console.error('Error deleting character:', err);
        setError(err.message);
      }
    }
  };

  const handleAssignCostume = async costumeId => {
    try {
      await assignCostumeToCharacter(costumeId, id);

      // Refresh costume data
      const [updatedCostumes, allCostumes] = await Promise.all([
        getCostumesByCharacterId(id),
        costumeCrud.getAll(),
      ]);

      setCostumes(updatedCostumes);
      setAvailableCostumes(
        allCostumes.filter(
          costume => !costume.character || costume.character === null,
        ),
      );
      setShowAddCostumeModal(false);
    } catch (err) {
      console.error('Error assigning costume:', err);
      setError(err.message);
    }
  };

  const handleUnassignCostume = async costumeId => {
    try {
      await unassignCostumeFromCharacter(costumeId);

      // Refresh costume data
      const [updatedCostumes, allCostumes] = await Promise.all([
        getCostumesByCharacterId(id),
        costumeCrud.getAll(),
      ]);

      setCostumes(updatedCostumes);
      setAvailableCostumes(
        allCostumes.filter(
          costume => !costume.character || costume.character === null,
        ),
      );
    } catch (err) {
      console.error('Error unassigning costume:', err);
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="p-4">
        <div className="flex justify-center items-center h-64">
          <Spinner size="xl" />
          <span className="ml-2 text-lg">Loading character...</span>
        </div>
      </div>
    );
  }

  if (error && !character) {
    return (
      <div className="p-4">
        <Card>
          <div className="text-center py-8">
            <p className="text-red-500 text-lg mb-4">{error}</p>
            <Link to="/characters">
              <Button>Back to Characters</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  if (!character) {
    return (
      <div className="p-4">
        <Card>
          <div className="text-center py-8">
            <p className="text-gray-500 text-lg mb-4">Character not found</p>
            <Link to="/characters">
              <Button>Back to Characters</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{character.name}</h1>
          {character.actor && (
            <p className="text-gray-600 mt-2">Played by: {character.actor}</p>
          )}
        </div>
        <div className="space-y-1">
          {!isEditing ? (
            <>
              <Button className="w-full" onClick={() => setIsEditing(true)}>
                Edit
              </Button>
              <Button className="w-full" color="failure" onClick={handleDelete}>
                Delete
              </Button>
              <Button
                className="w-full"
                color="gray"
                onClick={() => navigate('/characters')}
              >
                Back
              </Button>
            </>
          ) : (
            <>
              <Button className="w-full" onClick={handleSave} disabled={saving}>
                {saving ? <Spinner size="sm" className="mr-2" /> : null}
                Save
              </Button>
              <Button
                className="w-full"
                color="gray"
                onClick={handleCancel}
                disabled={saving}
              >
                Cancel
              </Button>
            </>
          )}
        </div>
      </div>

      {error && character && (
        <div className="mb-4 p-4 bg-red-100 border border-red-300 text-red-700 rounded">
          {error}
        </div>
      )}

      <Card>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label htmlFor="name" value="Character Name" />
            {isEditing ? (
              <TextInput
                id="name"
                value={editData.name}
                onChange={e =>
                  setEditData({ ...editData, name: e.target.value })
                }
                placeholder="Character name"
              />
            ) : (
              <p className="mt-1 text-lg font-semibold">{character.name}</p>
            )}
          </div>

          <div>
            <Label htmlFor="actor" value="Actor" />
            {isEditing ? (
              <TextInput
                id="actor"
                value={editData.actor}
                onChange={e =>
                  setEditData({ ...editData, actor: e.target.value })
                }
                placeholder="Actor name"
              />
            ) : (
              <p className="mt-1">{character.actor || 'Not specified'}</p>
            )}
          </div>
        </div>

        <div className="mt-6">
          <Label htmlFor="description" value="Description" />
          {isEditing ? (
            <Textarea
              id="description"
              value={editData.description}
              onChange={e =>
                setEditData({ ...editData, description: e.target.value })
              }
              placeholder="Character description..."
              rows={4}
            />
          ) : (
            <p className="mt-1">
              {character.description || 'No description provided'}
            </p>
          )}
        </div>

        <div className="mt-6">
          <Label htmlFor="notes" value="Notes" />
          {isEditing ? (
            <Textarea
              id="notes"
              value={editData.notes}
              onChange={e =>
                setEditData({ ...editData, notes: e.target.value })
              }
              placeholder="Additional notes about the character..."
              rows={4}
            />
          ) : (
            <p className="mt-1">{character.notes || 'No notes'}</p>
          )}
        </div>
      </Card>

      {/* Costumes Section */}
      <Card className="mt-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Costumes ({costumes.length})</h2>
          <Button onClick={() => setShowAddCostumeModal(true)}>
            Assign Costume
          </Button>
        </div>

        {costumes.length === 0 ? (
          <div className="text-gray-500 text-center py-8">
            No costumes assigned to this character.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {costumes.map(costume => {
              // Get photo preview from map
              const photoPreview = photoPreviewMap[costume.id];

              return (
                <Card key={costume.id} className="relative">
                  <Link to={`/costumes/${costume.id}`}>
                    {photoPreview ? (
                      <img
                        src={photoPreview}
                        alt={costume.name}
                        className="w-full h-48 object-cover rounded"
                      />
                    ) : (
                      <img
                        src="https://placehold.co/400x300"
                        alt={costume.name}
                        className="w-full h-48 object-cover rounded"
                      />
                    )}
                    <h3 className="font-semibold mt-2">{costume.name}</h3>
                    {costume.scene && (
                      <p className="text-sm text-gray-600">
                        Scene: {costume.scene}
                      </p>
                    )}
                  </Link>
                  <Button
                    size="sm"
                    color="failure"
                    className="mt-2"
                    onClick={() => handleUnassignCostume(costume.id)}
                  >
                    Unassign
                  </Button>
                </Card>
              );
            })}
          </div>
        )}
      </Card>

      {/* Add Costume Modal */}
      <Modal
        show={showAddCostumeModal}
        onClose={() => setShowAddCostumeModal(false)}
      >
        <Modal.Header>Assign Costume to {character?.name}</Modal.Header>
        <Modal.Body>
          <div className="space-y-4">
            {availableCostumes.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No available costumes to assign.
              </p>
            ) : (
              <div className="grid gap-3 max-h-96 overflow-y-auto">
                {availableCostumes.map(costume => {
                  // Get photo preview from map
                  const photoPreview = photoPreviewMap[costume.id];

                  return (
                    <Card
                      key={costume.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center space-x-4">
                        {photoPreview ? (
                          <img
                            src={photoPreview}
                            alt={costume.name}
                            className="w-16 h-20 object-cover rounded"
                          />
                        ) : (
                          <img
                            src="https://placehold.co/150x200"
                            alt={costume.name}
                            className="w-16 h-20 object-cover rounded"
                          />
                        )}
                        <div className="flex-1">
                          <h4 className="font-semibold">{costume.name}</h4>
                          {costume.scene && (
                            <p className="text-sm text-gray-600">
                              Scene: {costume.scene}
                            </p>
                          )}
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleAssignCostume(costume.id)}
                        >
                          Assign
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button color="gray" onClick={() => setShowAddCostumeModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default CharacterDetailPage;
