import { Card } from 'flowbite-react'
import { Link } from 'react-router-dom'

function SceneOverviewPage() {
  const scenes = [
    {
      id: 1,
      sceneNumber: 1,
      shootingDayId: 1,  // Reference to the shooting day
      details: [
        "Locatie: Café De Kroeg",
        "Personages: John, Maria",
        "Tijd: Avond",
      ]
    },
    {
      id: 2,
      sceneNumber: 2,
      shootingDayId: 1,
      details: [
        "Locatie: Stadspark",
        "Personages: Maria, Peter",
        "Tijd: Middag",
      ]
    },
    {
      id: 3,
      sceneNumber: 3,
      shootingDayId: 2,
      details: [
        "Locatie: Kantoor",
        "Personages: John, Boss",
        "Tijd: Ochtend",
      ]
    },
    {
      id: 4,
      sceneNumber: 14,
      shootingDayId: 3,
      details: [
        "Locatie: Treinstation",
        "Personages: Maria",
        "Tijd: Spits",
        "Kostuum: Reisoutfit"
      ]
    }
  ]

  const shootingDays = [
    {
      id: 1,
      date: "2024-03-20",
      location: "Centrum",
      status: "Gepland"
    },
    {
      id: 2,
      date: "2024-03-21",
      location: "Kantoorpand",
      status: "In afwachting"
    },
    {
      id: 3,
      date: "2024-03-22",
      location: "Station",
      status: "Bevestigd"
    }
  ]

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">SCENE OVERZICHT</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left column - Scenes */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold mb-4">Scenes</h2>
          
          {scenes.map((scene) => {
            const shootingDay = shootingDays.find(day => day.id === scene.shootingDayId);
            
            return (
              <Card key={scene.id} className="">
                <div className="flex flex-row">
                  {/* Scene number box */}
                  <div className="bg-gray-300 p-6 flex items-center justify-center min-w-[100px]">
                    <span className="text-4xl font-bold">{scene.sceneNumber}</span>
                  </div>
                  
                  {/* Scene details */}
                  <div className="p-4 flex-grow">
                    <ul className="space-y-1">
                      {scene.details.map((detail, index) => (
                        <li key={index} className="text-gray-700">{detail}</li>
                      ))}
                      <li className="text-gray-700 mt-2">
                        Draaidag: {new Date(shootingDay.date).toLocaleDateString('nl-NL')}
                      </li>
                    </ul>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Right column - Shooting Days */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold mb-4">Draaidagen</h2>
          
          {shootingDays.map((day) => {
            const dayScenes = scenes.filter(scene => scene.shootingDayId === day.id);
            
            return (
              <div>
              <Link key={day.id} to={`/shootingday/${day.id}`}>
                <Card className="hover:bg-gray-50 transition-colors">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-bold">{new Date(day.date).toLocaleDateString('nl-NL')}</h3>
                    <span className="text-sm text-gray-500">{day.status}</span>
                  </div>
                  <p className="text-gray-700">Locatie: {day.location}</p>
                  <p className="text-gray-700">
                    Scenes: {dayScenes.map(scene => scene.id).join(', ')}
                  </p>
                </Card>
              </Link>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  )
}

export default SceneOverviewPage 