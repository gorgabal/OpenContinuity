import { useParams } from 'react-router-dom'
import { Card, List, Textarea } from 'flowbite-react'

function CostumeDetailPage() {
  const { id } = useParams()

  // This would come from your data source based on the id
  const costume = {
    id: id,
    title: "TITEL TITEL TITEL",
    image: "https://placehold.co/600x400",
    notes: "SPACE FOR NOTES",
    links: {
      scenes: ["Scene 1", "Scene 2"],
      shootingDays: ["Day 1", "Day 2"],
      characters: ["Character 1", "Character 2"]
    }
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">{costume.title}</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Left column - Photos */}
        {/* TODO: zorg dat er meerdere foto's kunnen worden toegevoegd */}
        <div className="md:col-span-2 space-y-4">
          <Card>
            <img 
              src={costume.image} 
              alt={costume.title}
              className="w-full h-auto"
            />
            <p className="text-gray-500">FOTO's. (misschien kan de layout hiervan anders?)</p>
          </Card>
        </div>

        {/* Right column - Notes and Links */}
        <div className="space-y-4">
          {/* Notes section */}
          <Card>
            <h2 className="text-xl font-bold mb-2">SPACE FOR NOTES</h2>
            <Textarea 
              placeholder="Add your notes here..."
              rows={4}
              defaultValue={costume.notes}
            />
          </Card>

          {/* Links section */}
          <Card>
            <h2 className="text-xl font-bold mb-2">Link list</h2>
            <p className="text-gray-500 mb-2">TODO: Waar moet dit naartoe linken?</p>
            <List>
              <List.Item>
                <span className="font-medium">Scenes:</span>
                {costume.links.scenes.join(", ")}
              </List.Item>
              <List.Item>
                <span className="font-medium">Verhaaldagen:</span>
                {costume.links.shootingDays.join(", ")}
              </List.Item>
              <List.Item>
                <span className="font-medium">Personages:</span>
                {costume.links.characters.join(", ")}
              </List.Item>
            </List>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default CostumeDetailPage 