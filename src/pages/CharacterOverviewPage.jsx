import { useState, useEffect } from 'react'
import { Card, Button, Spinner } from 'flowbite-react'
import { Link } from 'react-router-dom'
import { getCharacters, addCharacter } from '../services/database'

function CharacterOverviewPage() {
  const [characters, setCharacters] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        const charactersData = await getCharacters()
        setCharacters(charactersData)
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
          {characters.map((character) => (
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

                  <div className="text-xs text-gray-500 border-t pt-3">
                    <p>Created: {new Date(character.createdAt).toLocaleDateString('nl-NL')}</p>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

export default CharacterOverviewPage