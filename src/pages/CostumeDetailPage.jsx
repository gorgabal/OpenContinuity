import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, List, Textarea, Spinner } from 'flowbite-react';
import {
  initDatabase,
  getCostumeById,
  getCostumeById$,
  updateCostume,
} from '../services/database.js';

function CostumeDetailPage() {
  const { id } = useParams();
  const [costume, setCostume] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState('');

  useEffect(() => {
    if (!id) return;

    let subscription;

    const setup = async () => {
      try {
        setIsLoading(true);

        // Initialize database
        await initDatabase();

        // Get initial costume
        const initialCostume = await getCostumeById(id);
        setCostume(initialCostume);

        // Subscribe to costume changes for reactive updates
        const costume$ = await getCostumeById$(id);
        subscription = costume$.subscribe(updatedCostume => {
          setCostume(updatedCostume);
        });

        setError(null);
      } catch (err) {
        console.error('Failed to setup costume:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    setup();

    // Cleanup subscription on unmount or id change
    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [id]);

  // Sync titleValue with costume.name when costume changes
  useEffect(() => {
    if (costume?.name) {
      setTitleValue(costume.name);
    }
  }, [costume?.name]);

  const handleTitleSave = async () => {
    try {
      await updateCostume(id, { name: titleValue });
      setIsEditingTitle(false);
    } catch (err) {
      console.error('Failed to update title:', err);
      setError(err.message);
    }
  };

  const handleNotesChange = async event => {
    const newNotes = event.target.value;
    try {
      await updateCostume(id, { notes: newNotes });
    } catch (err) {
      console.error('Failed to update notes:', err);
      setError(err.message);
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 flex justify-center items-center min-h-64">
        <Spinner size="xl" />
        <span className="ml-2">Loading costume...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          Error loading costume: {error}
        </div>
      </div>
    );
  }

  if (!costume) {
    return (
      <div className="p-4">
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
          Costume not found
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      {isEditingTitle ? (
        <div className="flex items-center gap-2 mb-4">
          <input
            type="text"
            value={titleValue}
            onChange={(e) => setTitleValue(e.target.value)}
            onBlur={handleTitleSave}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleTitleSave();
              if (e.key === 'Escape') {
                setTitleValue(costume.name || '');
                setIsEditingTitle(false);
              }
            }}
            className="text-2xl font-bold bg-transparent border-b-2 border-blue-500 focus:outline-none flex-1"
            autoFocus
          />
        </div>
      ) : (
        <h1
          className="text-2xl font-bold mb-4 cursor-pointer hover:text-blue-600 transition-colors"
          onClick={() => setIsEditingTitle(true)}
          title="Click to edit"
        >
          {costume.name || 'Untitled Costume'}
        </h1>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Left column - Photos */}
        {/* TODO: zorg dat er meerdere foto's kunnen worden toegevoegd */}
        <div className="md:col-span-2 space-y-4">
          <Card>
            <img
              src={costume.image}
              alt={costume.name}
              className="w-full h-auto"
            />
            <p className="text-gray-500">
              FOTO&apos;s. (misschien kan de layout hiervan anders?)
            </p>
          </Card>
        </div>

        {/* Right column - Notes and Links */}
        <div className="space-y-4">
          {/* Notes section */}
          <Card>
            <h2 className="text-xl font-bold mb-2">Notes</h2>
            <Textarea
              placeholder="Add your notes here..."
              rows={4}
              value={costume.notes || ''}
              onChange={handleNotesChange}
            />
          </Card>

          {/* Details section */}
          <Card>
            <h2 className="text-xl font-bold mb-2">Details</h2>
            <List>
              <List.Item>
                <span className="font-medium">Character:</span>
                {costume.character || 'Not assigned'}
              </List.Item>
              <List.Item>
                <span className="font-medium">Scene:</span>
                {costume.scene || 'Not assigned'}
              </List.Item>
              <List.Item>
                <span className="font-medium">Created:</span>
                {costume.createdAt
                  ? new Date(costume.createdAt).toLocaleDateString()
                  : 'Unknown'}
              </List.Item>
              <List.Item>
                <span className="font-medium">Last Updated:</span>
                {costume.updatedAt
                  ? new Date(costume.updatedAt).toLocaleDateString()
                  : 'Unknown'}
              </List.Item>
            </List>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default CostumeDetailPage;
