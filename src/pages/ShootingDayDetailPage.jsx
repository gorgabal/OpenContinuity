import { Card } from 'flowbite-react'
import { useParams } from 'react-router-dom'
import { Link } from 'react-router-dom'

function ShootingDayPage() {
  const { id } = useParams()

  // This would come from your data source
  const shootingDay = {
    id: id,
    date: "2024-03-20",
    scenes: [
      {
        id: 1,
        sceneNumber: 1,
        details: [
          "details over scene",
        ]
      },
      {
        id: 2,
        sceneNumber: 2,
        details: [
          "details over scene",
        ]
      },
      {
        id: 3,
        sceneNumber: 3,
        details: [
          "details over scene",
          "details over scene",
          "details over scene"
        ]
      }
    ],
    characters: [
      {
        id: 1,
        name: "TITEL PERSONAGE",
        costumes: [
          {
            id: 1,
            image: "https://placehold.co/150x200"
          },
          {
            id: 2,
            image: "https://placehold.co/150x200"
          },
          {
            id: 3,
            image: "https://placehold.co/150x200"
          }
        ]
      }
    ]
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Draaidag 1: {new Date(shootingDay.date).toLocaleDateString('nl-NL')}</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left column - Scenes */}
        <div className="space-y-4">
          {shootingDay.scenes.map((scene) => (
            <Link key={scene.id} to={`/scenes/${scene.id}`}>
              <Card className="flex flex-row hover:bg-gray-50 transition-colors">
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
                  </ul>
                </div>
              </Card>
            </Link>
          ))}
        </div>

        {/* Right column - Characters */}
        <div>
          <h2 className="text-xl font-bold mb-4">Personages</h2>
          <h2 className="text-xl font-bold mb-4">This list will be filtered based on the scenes that are selected</h2>
          
          {shootingDay.characters.map((character) => (
            <Card key={character.id} className="mb-4">
              <h3 className="text-lg font-bold mb-4">{character.name}</h3>
              
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {character.costumes.map((costume) => (
                  <Link key={costume.id} to={`/costumes/${costume.id}`}>
                    <div className="hover:opacity-75 transition-opacity">
                      <img 
                        src={costume.image} 
                        alt={costume.title}
                        className="w-full h-auto rounded-lg shadow-md"
                      />
                    </div>
                  </Link>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

export default ShootingDayPage 