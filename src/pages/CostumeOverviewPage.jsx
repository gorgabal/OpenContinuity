import { Card, Button } from 'flowbite-react';
import { Link } from 'react-router-dom';

/*
Should contain the following:
  - list of scenes
  - Name of character
  - Image of costume
*/

function CostumeOverviewPage() {
  // This would typically come from your data source/API
  const costumes = [
    {
      id: 1,
      name: 'Red Dress',
      character: 'Alice',
      scene: 'Party Scene',
      image: 'https://placehold.co/400x300',
    },
    {
      id: 2,
      name: 'Police Uniform',
      character: 'Officer Bob',
      scene: 'Chase Scene',
      image: 'https://placehold.co/400x300',
    },
    {
      id: 3,
      name: 'Wedding Gown',
      character: 'Sarah',
      scene: 'Wedding Scene',
      image: 'https://placehold.co/400x300',
    },
  ];

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Costumes Overview</h1>
        <Button color="blue">Add Costume</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {costumes.map(costume => (
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
            <p className="font-normal text-gray-700">Scene: {costume.scene}</p>
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
  );
}

export default CostumeOverviewPage;
