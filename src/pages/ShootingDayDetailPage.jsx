import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Card, Button, Spinner, TextInput, Label, Select, Modal } from 'flowbite-react'
import { getShootingDayById, updateShootingDay, getScenesByShootingDay, getCostumes, getScenes, updateScene, getCharacters } from '../services/database'

function ShootingDayDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  
  const [shootingDay, setShootingDay] = useState(null)
  const [assignedScenes, setAssignedScenes] = useState([])
  const [characters, setCharacters] = useState([])
  const [costumes, setCostumes] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [showAddSceneModal, setShowAddSceneModal] = useState(false)
  
  const [editData, setEditData] = useState({
    date: '',
    location: '',
    status: 'Gepland'
  })

  // Track available scenes for assignment
  const [availableScenes, setAvailableScenes] = useState([])

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        const [shootingDayData, assignedScenesData, allScenesData, charactersData, costumesData] = await Promise.all([
          getShootingDayById(id),
          getScenesByShootingDay(id),
          getScenes(),
          getCharacters(),
          getCostumes()
        ])
        
        if (!shootingDayData) {
          setError('Shooting day not found')
          return
        }
        
        setShootingDay(shootingDayData)
        setAssignedScenes(assignedScenesData)
        setCharacters(charactersData)
        setCostumes(costumesData)
        
        // Initialize edit data
        setEditData({
          date: shootingDayData.date || '',
          location: shootingDayData.location || '',
          status: shootingDayData.status || 'Gepland'
        })
        
        // Set available scenes (scenes not assigned to this shooting day)
        const unassignedScenes = allScenesData.filter(scene => 
          !assignedScenesData.some(assignedScene => assignedScene.id === scene.id)
        )
        setAvailableScenes(unassignedScenes)
        
      } catch (err) {
        console.error('Error loading shooting day:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    if (id) {
      loadData()
    }
  }, [id])

  const handleSave = async () => {
    try {
      setSaving(true)
      setError(null)
      
      // Update shooting day details
      await updateShootingDay(id, editData)
      
      // Refresh shooting day data
      const updatedShootingDay = await getShootingDayById(id)
      setShootingDay(updatedShootingDay)
      
      setIsEditing(false)
      
    } catch (err) {
      console.error('Error saving shooting day:', err)
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    // Reset edit data to original values
    setEditData({
      date: shootingDay.date || '',
      location: shootingDay.location || '',
      status: shootingDay.status || 'Gepland'
    })
    setIsEditing(false)
    setError(null)
  }

  const handleAssignScene = async (sceneId) => {
    try {
      await updateScene(sceneId, { shootingDay: id })
      
      // Refresh data
      const [updatedAssignedScenes, allScenesData] = await Promise.all([
        getScenesByShootingDay(id),
        getScenes()
      ])
      
      setAssignedScenes(updatedAssignedScenes)
      
      // Update available scenes
      const unassignedScenes = allScenesData.filter(scene => 
        !updatedAssignedScenes.some(assignedScene => assignedScene.id === scene.id)
      )
      setAvailableScenes(unassignedScenes)
      
      setShowAddSceneModal(false)
    } catch (err) {
      console.error('Error assigning scene:', err)
      setError(err.message)
    }
  }

  const handleUnassignScene = async (sceneId) => {
    try {
      await updateScene(sceneId, { shootingDay: null })
      
      // Refresh data
      const [updatedAssignedScenes, allScenesData] = await Promise.all([
        getScenesByShootingDay(id),
        getScenes()
      ])
      
      setAssignedScenes(updatedAssignedScenes)
      
      // Update available scenes
      const unassignedScenes = allScenesData.filter(scene => 
        !updatedAssignedScenes.some(assignedScene => assignedScene.id === scene.id)
      )
      setAvailableScenes(unassignedScenes)
    } catch (err) {
      console.error('Error unassigning scene:', err)
      setError(err.message)
    }
  }

  // Get unique character IDs from assigned scenes
  const getUniqueCharacterIds = () => {
    const allCharacterIds = assignedScenes
      .flatMap(scene => scene.characters || [])
      .filter(id => id)
    
    return [...new Set(allCharacterIds)]
  }

  if (loading) {
    return (
      <div className="p-4">
        <div className="flex justify-center items-center h-64">
          <Spinner size="xl" />
          <span className="ml-2 text-lg">Loading shooting day...</span>
        </div>
      </div>
    )
  }

  if (error && !shootingDay) {
    return (
      <div className="p-4">
        <Card>
          <div className="text-center py-8">
            <p className="text-red-500 text-lg mb-4">{error}</p>
            <Link to="/scene-overview">
              <Button>Back to Overview</Button>
            </Link>
          </div>
        </Card>
      </div>
    )
  }

  if (!shootingDay) {
    return (
      <div className="p-4">
        <Card>
          <div className="text-center py-8">
            <p className="text-gray-500 text-lg mb-4">Shooting day not found</p>
            <Link to="/scene-overview">
              <Button>Back to Overview</Button>
            </Link>
          </div>
        </Card>
      </div>
    )
  }

  const uniqueCharacterIds = getUniqueCharacterIds()

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">
            Shooting Day: {new Date(shootingDay.date).toLocaleDateString('nl-NL')}
          </h1>
          <p className="text-gray-600 mt-2">
            Location: {shootingDay.location || 'Not specified'} • Status: {shootingDay.status}
          </p>
        </div>
        <div className="space-y-1">
          {!isEditing ? (
            <>
              <Button className="w-full" onClick={() => setIsEditing(true)}>
                Edit
              </Button>
              <Button className="w-full" color="gray" onClick={() => navigate('/scene-overview')}>
                Back
              </Button>
            </>
          ) : (
            <>
              <Button className="w-full" onClick={handleSave} disabled={saving}>
                {saving ? <Spinner size="sm" className="mr-2" /> : null}
                Save
              </Button>
              <Button className="w-full" color="gray" onClick={handleCancel} disabled={saving}>
                Cancel
              </Button>
            </>
          )}
        </div>
      </div>

      {error && shootingDay && (
        <div className="mb-4 p-4 bg-red-100 border border-red-300 text-red-700 rounded">
          {error}
        </div>
      )}

      {/* Shooting Day Details */}
      <Card className="mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Shooting Day Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <Label htmlFor="date" value="Date" />
            {isEditing ? (
              <TextInput
                id="date"
                type="date"
                value={editData.date}
                onChange={(e) => setEditData({ ...editData, date: e.target.value })}
              />
            ) : (
              <p className="mt-1 text-lg font-semibold">
                {new Date(shootingDay.date).toLocaleDateString('nl-NL')}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="location" value="Location" />
            {isEditing ? (
              <TextInput
                id="location"
                value={editData.location}
                onChange={(e) => setEditData({ ...editData, location: e.target.value })}
                placeholder="e.g. Studio A, City Center"
              />
            ) : (
              <p className="mt-1">{shootingDay.location || 'Not specified'}</p>
            )}
          </div>

          <div>
            <Label htmlFor="status" value="Status" />
            {isEditing ? (
              <Select
                id="status"
                value={editData.status}
                onChange={(e) => setEditData({ ...editData, status: e.target.value })}
              >
                <option value="Gepland">Gepland</option>
                <option value="Bevestigd">Bevestigd</option>
                <option value="In afwachting">In afwachting</option>
                <option value="Afgerond">Afgerond</option>
                <option value="Geannuleerd">Geannuleerd</option>
              </Select>
            ) : (
              <p className="mt-1">{shootingDay.status}</p>
            )}
          </div>
        </div>
      </Card>



      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left column - Assigned Scenes */}
        <div className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Assigned Scenes ({assignedScenes.length})</h2>
            {isEditing && (
              <Button onClick={() => setShowAddSceneModal(true)}>Add Scene</Button>
            )}
          </div>
          
          {assignedScenes.length === 0 ? (
            <Card>
              <p className="text-gray-500 text-center py-8">
                No scenes assigned to this shooting day.
                {!isEditing && ' Click Edit to manage scenes.'}
              </p>
            </Card>
          ) : (
            assignedScenes.map((scene) => (
              <Card key={scene.id} className="hover:bg-gray-50 transition-colors">
                <div className="flex flex-row">
                  {/* Scene number box */}
                  <Link to={`/scene/${scene.id}`} className="flex">
                    <div className="bg-gray-300 p-6 flex items-center justify-center min-w-[100px]">
                      <span className="text-4xl font-bold">{scene.sceneNumber}</span>
                    </div>
                  </Link>

                  {/* Scene details */}
                  <Link to={`/scene/${scene.id}`} className="p-4 flex-grow">
                    <ul className="space-y-1">
                      {scene.location && (
                        <li className="text-gray-700">Locatie: {scene.location}</li>
                      )}
                      {scene.characters && scene.characters.length > 0 && (
                        <li className="text-gray-700">
                          Personages: {scene.characters.map(charId => {
                            const character = characters.find(c => c.id === charId)
                            return character ? character.name : null
                          }).filter(name => name).join(', ')}
                        </li>
                      )}
                      {scene.costumes && scene.costumes.length > 0 && (
                        <li className="text-gray-700">
                          Kostuums: {scene.costumes.map(costId => {
                            const costume = costumes.find(c => c.id === costId)
                            return costume ? costume.name : null
                          }).filter(name => name).join(', ')}
                        </li>
                      )}
                    </ul>
                  </Link>

                  {/* Remove button */}
                  {isEditing && (
                    <div className="p-4 flex items-center">
                      <Button 
                        size="sm" 
                        color="failure" 
                        onClick={() => handleUnassignScene(scene.id)}
                      >
                        Remove
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Right column - Characters & Costumes */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold mb-4">Characters & Costumes</h2>
          
          {uniqueCharacterIds.length === 0 ? (
            <Card>
              <p className="text-gray-500 text-center py-8">
                No characters found in assigned scenes.
              </p>
            </Card>
          ) : (
            uniqueCharacterIds.map((characterId) => {
              const character = characters.find(c => c.id === characterId)
              if (!character) return null
              
              const characterCostumes = costumes.filter(costume => 
                costume.character === character.id
              )
              
              return (
                <Card key={characterId}>
                  <Link to={`/characters/${character.id}`}>
                    <h3 className="text-lg font-bold mb-4 hover:text-blue-600 transition-colors cursor-pointer">
                      {character.name}
                    </h3>
                  </Link>
                  
                  {characterCostumes.length === 0 ? (
                    <p className="text-gray-500">No costumes found for this character.</p>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {characterCostumes.map((costume) => {
                        // Get the last uploaded photo for preview
                        const lastPhoto = costume.photos && costume.photos.length > 0
                          ? costume.photos[costume.photos.length - 1]
                          : null;
                        
                        return (
                          <Link key={costume.id} to={`/costumes/${costume.id}`}>
                            <div className="hover:opacity-75 transition-opacity">
                              {lastPhoto ? (
                                <img 
                                  src={lastPhoto.data}
                                  alt={costume.name}
                                  className="w-full h-auto rounded-lg shadow-md"
                                />
                              ) : (
                                <img 
                                  src="https://placehold.co/150x200"
                                  alt={costume.name}
                                  className="w-full h-auto rounded-lg shadow-md"
                                />
                              )}
                              <p className="text-sm text-center mt-2 font-medium">
                                {costume.name}
                              </p>
                            </div>
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </Card>
              )
            })
          )}
        </div>
      </div>

      {/* Add Scene Modal */}
      <Modal show={showAddSceneModal} onClose={() => setShowAddSceneModal(false)}>
        <Modal.Header>Add Scene to Shooting Day</Modal.Header>
        <Modal.Body>
          <div className="space-y-4">
            {availableScenes.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No available scenes to assign.
              </p>
            ) : (
              <div className="grid gap-3 max-h-96 overflow-y-auto">
                {availableScenes.map((scene) => (
                  <Card key={scene.id} className="hover:bg-gray-50 transition-colors">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-semibold">Scene {scene.sceneNumber}</h4>
                        {scene.location && (
                          <p className="text-sm text-gray-600">Location: {scene.location}</p>
                        )}
                        {scene.characters && scene.characters.length > 0 && (
                          <p className="text-sm text-gray-600">
                            Characters: {scene.characters.map(charId => {
                              const character = characters.find(c => c.id === charId)
                              return character ? character.name : null
                            }).filter(name => name).join(', ')}
                          </p>
                        )}
                      </div>
                      <Button 
                        size="sm" 
                        onClick={() => handleAssignScene(scene.id)}
                      >
                        Assign
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button color="gray" onClick={() => setShowAddSceneModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Metadata */}
      <div className="mt-8 text-sm text-gray-500 border-t pt-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <span className="font-medium">Created:</span> {new Date(shootingDay.createdAt).toLocaleString('nl-NL')}
          </div>
          <div>
            <span className="font-medium">Last updated:</span> {new Date(shootingDay.updatedAt).toLocaleString('nl-NL')}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ShootingDayDetailPage