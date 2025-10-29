import { Card, Button } from 'flowbite-react'
import { Link } from 'react-router-dom'
import { useScenes } from '../hooks/useScenes'

function SceneOverviewPage() {
  const { scenes, shootingDays, loading, error, createScene } = useScenes()

  const handleAddScene = async () => {
    try {
      // Find the next scene number
      const maxSceneNumber = scenes.length > 0 
        ? Math.max(...scenes.map(scene => scene.sceneNumber))
        : 0
      
      await createScene({
        sceneNumber: maxSceneNumber + 1,
        shootingDayId: '',
        location: '',
        characters: '',
        time: '',
        costume: ''
      })
    } catch (error) {
      alert('Error creating scene: ' + error.message)
    }
  }

  if (loading) {
    return (
      <div className="p-4">
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">Loading...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="text-red-500 text-center">
          Error loading data: {error}
        </div>
      </div>
    )
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
            scenes.map((scene) => {
              const shootingDay = shootingDays.find(day => day.id === scene.shootingDayId)

              return (
                <Link key={scene.id} to={`/scene/${scene.id}`}>
                  <Card className="hover:bg-gray-50 transition-colors">
                    <div className="flex flex-row">
                      {/* Scene number box */}
                      <div className="bg-gray-300 p-6 flex items-center justify-center min-w-[100px]">
                        <span className="text-4xl font-bold">{scene.sceneNumber}</span>
                      </div>

                      {/* Scene details */}
                      <div className="p-4 flex-grow">
                        <ul className="space-y-1">
                          {scene.location && (
                            <li className="text-gray-700">Locatie: {scene.location}</li>
                          )}
                          {scene.characters && (
                            <li className="text-gray-700">Personages: {scene.characters}</li>
                          )}
                          {scene.time && (
                            <li className="text-gray-700">Tijd: {scene.time}</li>
                          )}
                          {scene.costume && (
                            <li className="text-gray-700">Kostuum: {scene.costume}</li>
                          )}
                          {shootingDay && (
                            <li className="text-gray-700 mt-2">
                              Draaidag: {new Date(shootingDay.date).toLocaleDateString('nl-NL')}
                            </li>
                          )}
                        </ul>
                      </div>
                    </div>
                  </Card>
                </Link>
              )
            })
          )}
        </div>

        {/* Right column - Shooting Days */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold mb-4">Draaidagen</h2>

          {shootingDays.length === 0 ? (
            <Card>
              <p className="text-gray-500 text-center py-8">
                No shooting days found.
              </p>
            </Card>
          ) : (
            shootingDays.map((day) => {
              const dayScenes = scenes
                .filter(scene => scene.shootingDayId === day.id)
                .sort((a, b) => a.sceneNumber - b.sceneNumber)

              return (
                <div key={day.id}>
                  <Link to={`/shootingday/${day.id}`}>
                    <Card className="hover:bg-gray-50 transition-colors">
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="font-bold">{new Date(day.date).toLocaleDateString('nl-NL')}</h3>
                        <span className="text-sm text-gray-500">{day.status}</span>
                      </div>
                      <p className="text-gray-700">Locatie: {day.location}</p>
                      <p className="text-gray-700">
                        Scenes: {dayScenes.length > 0 ? dayScenes.map(scene => scene.sceneNumber).join(', ') : 'No scenes'}
                      </p>
                    </Card>
                  </Link>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

export default SceneOverviewPage