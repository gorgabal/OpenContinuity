import { useState, useEffect } from 'react';
import { switchMap } from 'rxjs';
import { useParams, Link } from 'react-router-dom';
import {
  Card,
  List,
  Textarea,
  Spinner,
  Button,
  Modal,
  Label,
  Select,
  Checkbox,
} from 'flowbite-react';
import {
  initDatabase,
  costumeCrud,
  characterCrud,
  sceneCrud,
  getCharacters,
  getScenes,
  addPhotoWithFile,
  getPhotoWithFile,
  getPhotosByEntity$,
  updatePhoto,
  deletePhotoWithFile,
  triggerSync,
} from '../services/db/database.js';
import { useProject } from '../contexts/ProjectContext.jsx';

function CostumeDetailPage() {
  const { id } = useParams();
  const { currentProjectId } = useProject();
  const [costume, setCostume] = useState(null);
  const [character, setCharacter] = useState(null);
  const [assignedScenes, setAssignedScenes] = useState([]);
  const [allCharacters, setAllCharacters] = useState([]);
  const [allScenes, setAllScenes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState('');
  const [photos, setPhotos] = useState([]);
  const [isLoadingPhotos, setIsLoadingPhotos] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);

  // Edit dialog state
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editCharacterId, setEditCharacterId] = useState('');
  const [editSceneIds, setEditSceneIds] = useState([]);

  useEffect(() => {
    if (!id) return;

    let subscription;

    const setup = async () => {
      try {
        setIsLoading(true);

        // Initialize database
        await initDatabase();

        // Get initial costume
        const initialCostume = await costumeCrud.getById(id);
        setCostume(initialCostume);

        // Get all characters and scenes for dropdowns (filtered by current project)
        if (currentProjectId) {
          const characters = await getCharacters(currentProjectId);
          const scenes = await getScenes(currentProjectId);
          setAllCharacters(characters);
          setAllScenes(scenes);
        } else {
          setAllCharacters([]);
          setAllScenes([]);
        }

        // Get character if costume has one assigned
        if (
          initialCostume &&
          initialCostume.character &&
          initialCostume.character !== null
        ) {
          const characterData = await characterCrud.getById(
            initialCostume.character,
          );
          setCharacter(characterData);
        } else {
          setCharacter(null);
        }

        // Get scenes if costume has any assigned
        if (
          initialCostume &&
          initialCostume.scenes &&
          initialCostume.scenes.length > 0
        ) {
          const sceneDataPromises = initialCostume.scenes.map(sceneId =>
            sceneCrud.getById(sceneId),
          );
          const scenesData = await Promise.all(sceneDataPromises);
          setAssignedScenes(scenesData.filter(s => s !== null));
        } else {
          setAssignedScenes([]);
        }

        // Subscribe to costume changes for reactive updates
        const costume$ = await costumeCrud.getById$(id);
        subscription = costume$.subscribe(updatedCostume => {
          setCostume(updatedCostume);
        });

        setError(null);
      } catch (err) {
        console.error('Failed to setup costume:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    setup();

    // Cleanup subscription on unmount or id change
    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [id, currentProjectId]);

  // Sync titleValue with costume.name when costume changes
  useEffect(() => {
    if (costume?.name) {
      setTitleValue(costume.name);
    }
  }, [costume?.name]);

  // Load photos for the current costume
  useEffect(() => {
    let subscription;

    const loadPhotos = async () => {
      if (isLoading) return;
      if (!id) return;

      try {
        setIsLoadingPhotos(true);

        // Subscribe to photos by costume ID for reactive updates
        // TODO: this seems to load the photo's in memory. But it is already in memory through rxdb. fix this by loading it directly into RXDB
        const photos$ = await getPhotosByEntity$('costumes', id);
        subscription = photos$
          .pipe(
            switchMap(async photos => {
              const photosWithData = await Promise.all(
                photos.map(async photo => {
                  const photoWithFile = await getPhotoWithFile(photo.id);
                  return photoWithFile;
                }),
              );

              return photosWithData.filter(
                p => p !== null && p.imageBlob !== null,
              );
            }),
          )
          .subscribe(filteredPhotos => {
            setPhotos(filteredPhotos);
            setIsLoadingPhotos(false);
          });
      } catch (err) {
        console.error('Failed to load photos:', err);
        setIsLoadingPhotos(false);
      }
    };

    loadPhotos();

    // Cleanup subscription on unmount or id change
    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [id, isLoading]);

  const handleTitleSave = async () => {
    try {
      await costumeCrud.update(id, { name: titleValue });
      setIsEditingTitle(false);
    } catch (err) {
      console.error('Failed to update title:', err);
      setError(err.message);
    }
  };

  const handleTakePhoto = () => {
    // Create a file input
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment'; // Use camera if available

    input.onchange = async e => {
      const file = e.target.files?.[0];
      if (!file) return;

      try {
        setIsLoadingPhotos(true);
        const newPhoto = await addPhotoWithFile(file, currentProjectId);
        console.log('[Photo Upload] Created photo:', newPhoto.id);

        await updatePhoto(newPhoto.id, { costumes: id });
        console.log('[Photo Upload] Updated photo with costume ID');

        triggerSync('photos');
        console.log('[Photo Upload] Triggered manual sync');
      } catch (err) {
        console.error('Failed to add photo:', err);
        setError('Failed to add photo: ' + err.message);
      } finally {
        setIsLoadingPhotos(false);
      }
    };

    input.click();
  };

  const handleDeletePhoto = async photoId => {
    if (!window.confirm('Are you sure you want to delete this photo?')) return;

    try {
      setIsLoadingPhotos(true);
      // Delete the photo file and metadata
      await deletePhotoWithFile(photoId);

      // Trigger sync for photos
      triggerSync('photos');
    } catch (err) {
      console.error('Failed to delete photo:', err);
      setError('Failed to delete photo: ' + err.message);
    } finally {
      setIsLoadingPhotos(false);
    }
  };

  const handleNotesChange = async event => {
    const newNotes = event.target.value;
    try {
      await costumeCrud.incrementalPatch(id, { notes: newNotes });
    } catch (err) {
      console.error('Failed to update notes:', err);
      setError(err.message);
    }
  };

  const handleOpenEditDialog = () => {
    setEditCharacterId(costume.character || null);
    setEditSceneIds(costume.scenes || []);
    setIsEditDialogOpen(true);
  };

  const handleSceneToggle = sceneId => {
    setEditSceneIds(prev => {
      if (prev.includes(sceneId)) {
        return prev.filter(id => id !== sceneId);
      } else {
        return [...prev, sceneId];
      }
    });
  };

  const handleSaveAssignments = async () => {
    try {
      await costumeCrud.update(id, {
        character: editCharacterId || null,
        scenes: editSceneIds,
      });

      // Update the character display
      if (editCharacterId && editCharacterId !== null) {
        const characterData = await characterCrud.getById(editCharacterId);
        setCharacter(characterData);
      } else {
        setCharacter(null);
      }

      // Update the scenes display
      if (editSceneIds.length > 0) {
        const sceneDataPromises = editSceneIds.map(sceneId =>
          sceneCrud.getById(sceneId),
        );
        const scenesData = await Promise.all(sceneDataPromises);
        setAssignedScenes(scenesData.filter(s => s !== null));
      } else {
        setAssignedScenes([]);
      }

      setIsEditDialogOpen(false);
    } catch (err) {
      console.error('Failed to update assignments:', err);
      setError(err.message);
    }
  };

  const handlePhotoClick = photo => {
    setSelectedPhoto(photo);
  };

  const handleClosePhotoViewer = () => {
    setSelectedPhoto(null);
  };

  if (isLoading) {
    return (
      <div className="p-4 flex justify-center items-center min-h-64">
        <Spinner size="xl" />
        <span className="ml-2">Loading costume...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          Error loading costume: {error}
        </div>
      </div>
    );
  }

  if (!costume) {
    return (
      <div className="p-4">
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
          Costume not found
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      {isEditingTitle ? (
        <div className="flex items-center gap-2 mb-4">
          <input
            type="text"
            value={titleValue}
            onChange={e => setTitleValue(e.target.value)}
            onBlur={handleTitleSave}
            onKeyDown={e => {
              if (e.key === 'Enter') handleTitleSave();
              if (e.key === 'Escape') {
                setTitleValue(costume.name || '');
                setIsEditingTitle(false);
              }
            }}
            className="text-2xl font-bold bg-transparent border-b-2 border-blue-500 focus:outline-none flex-1"
            autoFocus
          />
        </div>
      ) : (
        <h1
          className="text-left text-2xl font-bold mb-4 cursor-pointer hover:text-blue-600 transition-colors"
          onClick={() => setIsEditingTitle(true)}
          title="Click to edit"
        >
          {costume.name || 'Untitled Costume'}
        </h1>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Left column - Photos */}
        <div className="md:col-span-2 space-y-4">
          <Card>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Photos</h2>
              <div className="flex gap-2">
                <Button
                  color="gray"
                  onClick={() => setIsEditMode(!isEditMode)}
                  disabled={isLoadingPhotos}
                >
                  {isEditMode ? 'Done' : 'Edit'}
                </Button>
                <Button onClick={handleTakePhoto} disabled={isLoadingPhotos}>
                  {isLoadingPhotos ? 'Loading...' : 'Add Photo'}
                </Button>
              </div>
            </div>

            {isLoadingPhotos ? (
              <div className="text-center py-8">
                <Spinner size="lg" />
              </div>
            ) : photos.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p className="mb-2">No photos yet.</p>
                <p className="text-sm">Click Add Photo to get started.</p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-4">
                {photos.map(photo => (
                  <div key={photo.id} className="relative group">
                    <img
                      src={photo.imageBlob}
                      alt={photo.localFilename}
                      className="w-48 h-48 object-cover rounded-lg cursor-pointer"
                      onClick={() => handlePhotoClick(photo)}
                    />
                    {isEditMode && (
                      <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center">
                        <Button
                          color="failure"
                          size="sm"
                          onClick={() => handleDeletePhoto(photo.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    )}
                    <p className="text-xs text-gray-600 mt-1 truncate">
                      {photo.localFilename}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Right column - Notes and Links */}
        <div className="space-y-4">
          {/* Notes section */}
          <Card>
            <h2 className="text-xl font-bold mb-2">Notes</h2>
            <Textarea
              placeholder="Add your notes here..."
              rows={4}
              value={costume.notes || ''}
              onChange={handleNotesChange}
            />
          </Card>

          {/* Details section */}
          <Card>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Details</h2>
              <Button size="sm" onClick={handleOpenEditDialog}>
                Edit
              </Button>
            </div>

            <List unstyled>
              <List.Item>
                <div>
                  <span className="font-medium">Character: </span>
                  {character ? (
                    <Link
                      to={`/characters/${character.id}`}
                      className="text-blue-600 hover:underline"
                    >
                      {character.name}
                    </Link>
                  ) : (
                    <span className="text-gray-500">Not assigned</span>
                  )}
                </div>
              </List.Item>
              <List.Item>
                <div>
                  <span className="font-medium">Scenes: </span>
                  {assignedScenes.length > 0 ? (
                    <div className="inline">
                      {assignedScenes.map((scn, index) => (
                        <span key={scn.id}>
                          <Link
                            to={`/scene/${scn.id}`}
                            className="text-blue-600 hover:underline"
                          >
                            Scene {scn.sceneNumber}
                          </Link>
                          {index < assignedScenes.length - 1 ? ', ' : ''}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-gray-500">Not assigned</span>
                  )}
                </div>
              </List.Item>
              <List.Item>
                <span className="font-medium">Created: </span>
                {costume.createdAt
                  ? new Date(costume.createdAt).toLocaleDateString()
                  : 'Unknown'}
              </List.Item>
              <List.Item>
                <span className="font-medium">Last Updated: </span>
                {costume.updatedAt
                  ? new Date(costume.updatedAt).toLocaleDateString()
                  : 'Unknown'}
              </List.Item>
            </List>
          </Card>
        </div>
      </div>

      {/* Edit Assignments Modal */}
      <Modal show={isEditDialogOpen} onClose={() => setIsEditDialogOpen(false)}>
        <Modal.Header>Edit Assignments</Modal.Header>
        <Modal.Body>
          <div className="space-y-6">
            {/* Character Selection */}
            <div>
              <Label htmlFor="character-select" className="mb-2 block">
                Character
              </Label>
              <Select
                id="character-select"
                value={editCharacterId || ''}
                onChange={e => setEditCharacterId(e.target.value || null)}
              >
                <option value="">Not assigned</option>
                {allCharacters.map(char => (
                  <option key={char.id} value={char.id}>
                    {char.name}
                  </option>
                ))}
              </Select>
            </div>

            {/* Scenes Multi-Select */}
            <div>
              <Label className="mb-2 block">Scenes</Label>
              <div className="space-y-2 max-h-64 overflow-y-auto border rounded p-2">
                {allScenes.length === 0 ? (
                  <p className="text-gray-500 text-sm">No scenes available</p>
                ) : (
                  allScenes.map(scn => (
                    <div key={scn.id} className="flex items-center">
                      <Checkbox
                        id={`scene-${scn.id}`}
                        checked={editSceneIds.includes(scn.id)}
                        onChange={() => handleSceneToggle(scn.id)}
                      />
                      <Label htmlFor={`scene-${scn.id}`} className="ml-2">
                        Scene {scn.sceneNumber}
                        {scn.location && ` - ${scn.location}`}
                      </Label>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button onClick={handleSaveAssignments}>Save</Button>
          <Button color="gray" onClick={() => setIsEditDialogOpen(false)}>
            Cancel
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Full-Screen Photo Viewer */}
      {selectedPhoto && (
        <Modal show={true} onClose={handleClosePhotoViewer} size="fullscreen">
          <Modal.Body
            className="flex items-center justify-center bg-black min-h-screen cursor-pointer"
            onClick={handleClosePhotoViewer}
          >
            <button
              onClick={handleClosePhotoViewer}
              className="absolute top-4 right-4 text-white text-4xl hover:text-gray-300 z-10"
              title="Close"
            >
              ×
            </button>
            <img
              src={selectedPhoto.imageBlob}
              alt={selectedPhoto.localFilename}
              className="h-screen w-full object-contain"
            />
          </Modal.Body>
        </Modal>
      )}
    </div>
  );
}

export default CostumeDetailPage;
