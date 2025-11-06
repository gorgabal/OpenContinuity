import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Card, Button, Spinner, TextInput, Label, Select, Modal } from 'flowbite-react'
import { getSceneById, getShootingDayById, getShootingDays, updateScene, getCharacters, getCostumes } from '../services/database'

function SceneDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [scene, setScene] = useState(null)
  const [shootingDay, setShootingDay] = useState(null)
  const [shootingDays, setShootingDays] = useState([])
  const [characters, setCharacters] = useState([])
  const [costumes, setCostumes] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [showCharacterModal, setShowCharacterModal] = useState(false)
  const [showCostumeModal, setShowCostumeModal] = useState(false)

  const [editData, setEditData] = useState({
    sceneNumber: '',
    shootingDay: '',
    location: '',
    characters: [],
    costumes: []
  })

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        const [sceneData, shootingDaysData, charactersData, costumesData] = await Promise.all([
          getSceneById(id),
          getShootingDays(),
          getCharacters(),
          getCostumes()
        ])

        if (!sceneData) {
          setError('Scene not found')
          return
        }

        setScene(sceneData)
        setShootingDays(shootingDaysData)
        setCharacters(charactersData)
        setCostumes(costumesData)

        // Initialize edit data
        setEditData({
          sceneNumber: sceneData.sceneNumber || '',
          shootingDay: sceneData.shootingDay || '',
          location: sceneData.location || '',
          characters: sceneData.characters || [],
          costumes: sceneData.costumes || []
        })

        // Load shooting day if scene has one assigned
        if (sceneData.shootingDay) {
          const shootingDayData = await getShootingDayById(sceneData.shootingDay)
          setShootingDay(shootingDayData)
        }

      } catch (err) {
        console.error('Error loading scene:', err)
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

      const updateData = {
        ...editData,
        sceneNumber: parseInt(editData.sceneNumber) || 1
      }

      await updateScene(id, updateData)

      // Refresh scene data
      const updatedScene = await getSceneById(id)
      setScene(updatedScene)

      // Update shooting day if changed
      if (updatedScene.shootingDay) {
        const shootingDayData = await getShootingDayById(updatedScene.shootingDay)
        setShootingDay(shootingDayData)
      } else {
        setShootingDay(null)
      }

      setIsEditing(false)

    } catch (err) {
      console.error('Error saving scene:', err)
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    // Reset edit data to original values
    setEditData({
      sceneNumber: scene.sceneNumber || '',
      shootingDay: scene.shootingDay || '',
      location: scene.location || '',
      characters: scene.characters || [],
      costumes: scene.costumes || []
    })
    setIsEditing(false)
    setError(null)
  }

  const handleCharacterToggle = (characterId) => {
    setEditData(prev => ({
      ...prev,
      characters: prev.characters.includes(characterId)
        ? prev.characters.filter(id => id !== characterId)
        : [...prev.characters, characterId]
    }))
  }

  const handleCostumeToggle = (costumeId) => {
    setEditData(prev => ({
      ...prev,
      costumes: prev.costumes.includes(costumeId)
        ? prev.costumes.filter(id => id !== costumeId)
        : [...prev.costumes, costumeId]
    }))
  }

  if (loading) {
    return (
      <div className="p-4">
        <div className="flex justify-center items-center h-64">
          <Spinner size="xl" />
          <span className="ml-2 text-lg">Loading scene...</span>
        </div>
      </div>
    )
  }

  if (error && !scene) {
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

  if (!scene) {
    return (
      <div className="p-4">
        <Card>
          <div className="text-center py-8">
            <p className="text-gray-500 text-lg mb-4">Scene not found</p>
            <Link to="/scene-overview">
              <Button>Back to Overview</Button>
            </Link>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Scene {scene.sceneNumber}</h1>
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
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Spinner size="sm" className="mr-2" /> : null}
                Save
              </Button>
              <Button color="gray" onClick={handleCancel} disabled={saving}>
                Cancel
              </Button>
            </>
          )}
        </div>
      </div>

      {error && scene && (
        <div className="mb-4 p-4 bg-red-100 border border-red-300 text-red-700 rounded">
          {error}
        </div>
      )}

      <Card>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="sceneNumber" value="Scene Number" />
              {isEditing ? (
                <TextInput
                  id="sceneNumber"
                  type="number"
                  value={editData.sceneNumber}
                  onChange={(e) => setEditData({ ...editData, sceneNumber: e.target.value })}
                  min="1"
                />
              ) : (
                <p className="mt-1 text-lg font-semibold">{scene.sceneNumber}</p>
              )}
            </div>

            <div>
              <Label htmlFor="shootingDay" value="Shooting Day" />
              {isEditing ? (
                <Select
                  id="shootingDay"
                  value={editData.shootingDay}
                  onChange={(e) => setEditData({ ...editData, shootingDay: e.target.value })}
                >
                  <option value="">No shooting day assigned</option>
                  {shootingDays.map(day => (
                    <option key={day.id} value={day.id}>
                      {new Date(day.date).toLocaleDateString('nl-NL')}
                    </option>
                  ))}
                </Select>
              ) : (
                <p className="mt-1">
                  {shootingDay
                    ? `${new Date(shootingDay.date).toLocaleDateString('nl-NL')}`
                    : 'Not assigned'
                  }
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
                  placeholder="e.g. Café De Kroeg, Office, Train Station"
                />
              ) : (
                <p className="mt-1">{scene.location || 'Not specified'}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <Label value="Characters" />
              <div className="mt-2">
                {editData.characters.length === 0 ? (
                  <p className="text-gray-500 mb-2">No characters selected</p>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-2">
                    {editData.characters.map(charId => {
                      const character = characters.find(c => c.id === charId)
                      return character ? (
                        <Card key={charId} className="relative">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-sm">{character.name}</span>
                            {isEditing && (
                              <Button
                                size="xs"
                                color="failure"
                                onClick={() => handleCharacterToggle(charId)}
                              >
                                Remove
                              </Button>
                            )}
                          </div>
                        </Card>
                      ) : null
                    })}
                  </div>
                )}
                {isEditing && (
                  <Button size="sm" onClick={() => setShowCharacterModal(true)}>
                    {editData.characters.length === 0 ? 'Add Characters' : 'Add More Characters'}
                  </Button>
                )}
              </div>
            </div>

            <div className="md:col-span-2">
              <Label value="Costumes" />
              <div className="mt-2">
                {editData.costumes.length === 0 ? (
                  <p className="text-gray-500 mb-2">No costumes selected</p>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-2">
                    {editData.costumes.map(costId => {
                      const costume = costumes.find(c => c.id === costId)
                      return costume ? (
                        <Card key={costId} className="relative">
                          <img
                            src={costume.image || 'https://placehold.co/150x200'}
                            alt={costume.name}
                            className="w-full h-32 object-cover rounded mb-2"
                          />
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-sm">{costume.name}</span>
                            {isEditing && (
                              <Button
                                size="xs"
                                color="failure"
                                onClick={() => handleCostumeToggle(costId)}
                              >
                                Remove
                              </Button>
                            )}
                          </div>
                        </Card>
                      ) : null
                    })}
                  </div>
                )}
                {isEditing && (
                  <Button
                    size="sm"
                    onClick={() => setShowCostumeModal(true)}
                    disabled={editData.characters.length === 0}
                  >
                    {editData.costumes.length === 0 ? 'Add Costumes' : 'Add More Costumes'}
                  </Button>
                )}
                {isEditing && editData.characters.length === 0 && (
                  <p className="text-sm text-gray-500 mt-1">Select characters first to add costumes</p>
                )}
              </div>
            </div>

          </div>

          <div className="text-sm text-gray-500 border-t pt-4">
            <p>Created: {new Date(scene.createdAt).toLocaleString('nl-NL')}</p>
            <p>Last updated: {new Date(scene.updatedAt).toLocaleString('nl-NL')}</p>
          </div>
        </div>
      </Card>

      {/* Character Selection Modal */}
      <Modal show={showCharacterModal} onClose={() => setShowCharacterModal(false)}>
        <Modal.Header>Select Characters for Scene {scene.sceneNumber}</Modal.Header>
        <Modal.Body>
          <div className="space-y-4">
            {characters.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No characters available. Create characters first.
              </p>
            ) : (
              <div className="grid gap-3 max-h-96 overflow-y-auto">
                {characters
                  .filter(character => !editData.characters.includes(character.id))
                  .map((character) => (
                    <Card key={character.id} className="hover:bg-gray-50 transition-colors">
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-semibold">{character.name}</h4>
                          {character.actor && (
                            <p className="text-sm text-gray-600">Actor: {character.actor}</p>
                          )}
                        </div>
                        <Button
                          size="sm"
                          onClick={() => {
                            handleCharacterToggle(character.id)
                            setShowCharacterModal(false)
                          }}
                        >
                          Add
                        </Button>
                      </div>
                    </Card>
                  ))}
              </div>
            )}
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button color="gray" onClick={() => setShowCharacterModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Costume Selection Modal */}
      <Modal show={showCostumeModal} onClose={() => setShowCostumeModal(false)}>
        <Modal.Header>Select Costumes for Scene {scene.sceneNumber}</Modal.Header>
        <Modal.Body>
          <div className="space-y-4">
            {(() => {
              // Filter costumes: only show costumes assigned to selected characters
              const availableCostumes = costumes.filter(costume => {
                // Check if costume is assigned to any of the selected characters
                const isAssignedToSelectedCharacter = editData.characters.some(charId =>
                  costume.character === charId
                )
                // Check if costume is not already selected
                const isNotAlreadySelected = !editData.costumes.includes(costume.id)

                return isAssignedToSelectedCharacter && isNotAlreadySelected
              })

              if (availableCostumes.length === 0) {
                return (
                  <p className="text-gray-500 text-center py-8">
                    No costumes available for the selected characters.
                  </p>
                )
              }

              return (
                <div className="grid gap-3 max-h-96 overflow-y-auto">
                  {availableCostumes.map((costume) => {
                    const costumeCharacter = characters.find(c => c.id === costume.character)
                    return (
                      <Card key={costume.id} className="hover:bg-gray-50 transition-colors">
                        <div className="flex items-center space-x-4">
                          <img
                            src={costume.image || 'https://placehold.co/150x200'}
                            alt={costume.name}
                            className="w-20 h-24 object-cover rounded"
                          />
                          <div className="flex-1">
                            <h4 className="font-semibold">{costume.name}</h4>
                            {costumeCharacter && (
                              <p className="text-sm text-gray-600">Character: {costumeCharacter.name}</p>
                            )}
                          </div>
                          <Button
                            size="sm"
                            onClick={() => {
                              handleCostumeToggle(costume.id)
                              setShowCostumeModal(false)
                            }}
                          >
                            Add
                          </Button>
                        </div>
                      </Card>
                    )
                  })}
                </div>
              )
            })()}
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button color="gray" onClick={() => setShowCostumeModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  )
}

export default SceneDetailPage
