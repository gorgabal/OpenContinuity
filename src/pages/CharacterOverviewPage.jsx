import { useState, useEffect } from 'react'
import { Card, Button, Spinner } from 'flowbite-react'
import { Link } from 'react-router-dom'
import { getCharacters, addCharacter, getCostumes } from '../services/database'

function CharacterOverviewPage() {
  const [characters, setCharacters] = useState([])
  const [costumes, setCostumes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        const [charactersData, costumesData] = await Promise.all([
          getCharacters(),
          getCostumes()
        ])
        setCharacters(charactersData)
        setCostumes(costumesData)
      } catch (err) {
        console.error('Error loading characters:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const handleAddCharacter = async () => {
    try {
      await addCharacter({
        name: 'New Character',
        description: '',
        actor: '',
        notes: ''
      })
      
      // Refresh the character list
      const updatedCharacters = await getCharacters()
      setCharacters(updatedCharacters)
    } catch (error) {
      alert('Error creating character: ' + error.message)
    }
  }

  if (loading) {
    return (
      <div className="p-4">
        <div className="flex justify-center items-center h-64">
          <Spinner size="xl" />
          <span className="ml-2 text-lg">Loading characters...</span>
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
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">CHARACTER OVERVIEW</h1>
        <Button onClick={handleAddCharacter}>Add Character</Button>
      </div>

      {characters.length === 0 ? (
        <Card>
          <p className="text-gray-500 text-center py-8">
            No characters found. Click Add Character to create your first character.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {characters.map((character) => {
            // Get costumes for this character
            const characterCostumes = costumes.filter(costume => 
              costume.character === character.id
            )
            
            return (
              <Link key={character.id} to={`/characters/${character.id}`}>
                <Card className="hover:bg-gray-50 transition-colors">
                  <div className="space-y-4">
                    <h2 className="text-xl font-bold text-gray-900">{character.name}</h2>
                    
                    {character.actor && (
                      <div>
                        <span className="text-sm font-medium text-gray-600">Actor: </span>
                        <span className="text-sm text-gray-700">{character.actor}</span>
                      </div>
                    )}

                    {character.description && (
                      <div>
                        <span className="text-sm font-medium text-gray-600">Description: </span>
                        <p className="text-sm text-gray-700 mt-1">{character.description}</p>
                      </div>
                    )}

                    {/* Costume Preview Grid */}
                    {characterCostumes.length > 0 && (
                      <div>
                        <span className="text-sm font-medium text-gray-600 block mb-2">
                          Costumes ({characterCostumes.length}):
                        </span>
                        <div className="grid grid-cols-3 gap-2">
                          {characterCostumes.slice(0, 6).map((costume) => {
                            // Get the last uploaded photo for preview
                            const lastPhoto = costume.photos && costume.photos.length > 0
                              ? costume.photos[costume.photos.length - 1]
                              : null;
                            
                            return (
                              <div key={costume.id} className="aspect-square">
                                <img 
                                  src={lastPhoto ? lastPhoto.data : 'https://placehold.co/100x100'}
                                  alt={costume.name}
                                  className="w-full h-full object-cover rounded"
                                />
                              </div>
                            )
                          })}
                        </div>
                        {characterCostumes.length > 6 && (
                          <p className="text-xs text-gray-500 mt-1">
                            +{characterCostumes.length - 6} more
                          </p>
                        )}
                      </div>
                    )}

                    <div className="text-xs text-gray-500 border-t pt-3">
                      <p>Created: {new Date(character.createdAt).toLocaleDateString('nl-NL')}</p>
                    </div>
                  </div>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default CharacterOverviewPage