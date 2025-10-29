import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Card, Button, Spinner, TextInput, Label, Select } from 'flowbite-react'
import { getSceneById, getShootingDayById, getShootingDays, updateScene } from '../services/database'

function SceneDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [scene, setScene] = useState(null)
  const [shootingDay, setShootingDay] = useState(null)
  const [shootingDays, setShootingDays] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [isEditing, setIsEditing] = useState(false)

  const [editData, setEditData] = useState({
    sceneNumber: '',
    shootingDayId: '',
    location: '',
    characters: '',
    costume: ''
  })

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        const [sceneData, shootingDaysData] = await Promise.all([
          getSceneById(id),
          getShootingDays()
        ])

        if (!sceneData) {
          setError('Scene not found')
          return
        }

        setScene(sceneData)
        setShootingDays(shootingDaysData)

        // Initialize edit data
        setEditData({
          sceneNumber: sceneData.sceneNumber || '',
          shootingDayId: sceneData.shootingDayId || '',
          location: sceneData.location || '',
          characters: sceneData.characters || '',
          costume: sceneData.costume || ''
        })

        // Load shooting day if scene has one assigned
        if (sceneData.shootingDayId) {
          const shootingDayData = await getShootingDayById(sceneData.shootingDayId)
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
      if (updatedScene.shootingDayId) {
        const shootingDayData = await getShootingDayById(updatedScene.shootingDayId)
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
      shootingDayId: scene.shootingDayId || '',
      location: scene.location || '',
      characters: scene.characters || '',
      costume: scene.costume || ''
    })
    setIsEditing(false)
    setError(null)
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
          {shootingDay && (
            <p className="text-gray-600 mt-2">
              Shooting Day: {new Date(shootingDay.date).toLocaleDateString('nl-NL')} - {shootingDay.location}
            </p>
          )}
        </div>
        <div className="space-x-2">
          {!isEditing ? (
            <>
              <Button onClick={() => setIsEditing(true)}>
                Edit
              </Button>
              <Button color="gray" onClick={() => navigate('/scene-overview')}>
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
                  value={editData.shootingDayId}
                  onChange={(e) => setEditData({ ...editData, shootingDayId: e.target.value })}
                >
                  <option value="">No shooting day assigned</option>
                  {shootingDays.map(day => (
                    <option key={day.id} value={day.id}>
                      {new Date(day.date).toLocaleDateString('nl-NL')} - {day.location}
                    </option>
                  ))}
                </Select>
              ) : (
                <p className="mt-1">
                  {shootingDay
                    ? `${new Date(shootingDay.date).toLocaleDateString('nl-NL')} - ${shootingDay.location}`
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

            <div>
              <Label htmlFor="characters" value="Characters" />
              {isEditing ? (
                <TextInput
                  id="characters"
                  value={editData.characters}
                  onChange={(e) => setEditData({ ...editData, characters: e.target.value })}
                  placeholder="e.g. John, Maria, Peter"
                />
              ) : (
                <p className="mt-1">{scene.characters || 'Not specified'}</p>
              )}
            </div>

            <div>
              <Label htmlFor="costume" value="Costume/Outfit" />
              {isEditing ? (
                <TextInput
                  id="costume"
                  value={editData.costume}
                  onChange={(e) => setEditData({ ...editData, costume: e.target.value })}
                  placeholder="e.g. Travel outfit, Formal wear"
                />
              ) : (
                <p className="mt-1">{scene.costume || 'Not specified'}</p>
              )}
            </div>

          </div>

          <div className="text-sm text-gray-500 border-t pt-4">
            <p>Created: {new Date(scene.createdAt).toLocaleString('nl-NL')}</p>
            <p>Last updated: {new Date(scene.updatedAt).toLocaleString('nl-NL')}</p>
          </div>
        </div>
      </Card>
    </div>
  )
}

export default SceneDetailPage
