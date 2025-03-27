import { Card } from 'flowbite-react'
import { Link } from 'react-router-dom'

function CostumeOverviewPage() {
  // This would typically come from your data source/API
  const costumes = [
    { 
      id: 1, 
      name: "Red Dress", 
      character: "Alice", 
      scene: "Party Scene",
      image: "https://placehold.co/400x300"
    },
    { 
      id: 2, 
      name: "Police Uniform", 
      character: "Officer Bob", 
      scene: "Chase Scene",
      image: "https://placehold.co/400x300"
    },
    { 
      id: 3, 
      name: "Wedding Gown", 
      character: "Sarah", 
      scene: "Wedding Scene",
      image: "https://placehold.co/400x300"
    },
  ]

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Costumes Overview</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {costumes.map((costume) => (
          <Card key={costume.id}>
            <img 
              src={costume.image} 
              alt={costume.name}
              className="rounded-t-lg h-48 w-full object-cover"
            />
            <h5 className="text-xl font-bold tracking-tight text-gray-900">
              {costume.name}
            </h5>
            <p className="font-normal text-gray-700">
              Character: {costume.character}
            </p>
            <p className="font-normal text-gray-700">
              Scene: {costume.scene}
            </p>
            <Link 
              to={`/costumes/${costume.id}`}
              className="text-blue-600 hover:underline"
            >
              View Details →
            </Link>
          </Card>
        ))}
      </div>
    </div>
  )
}

export default CostumeOverviewPage 