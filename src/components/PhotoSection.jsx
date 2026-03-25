import PropTypes from 'prop-types';
import { useState } from 'react';
import { Card, Spinner, Button, Modal } from 'flowbite-react';
import { useProject } from '../contexts/ProjectContext.jsx';
import { addPhotoWithFile, updatePhoto, deletePhotoWithFile, triggerSync } from '../services/db/database.js';

export default function PhotoSection({
  title,
  photos,
  isLoading,
  entityType,
  entityId,
  onError,
}) {
  const { currentProjectId } = useProject();
  const [isEditMode, setIsEditMode] = useState(false);
  const [isAddingPhoto, setIsAddingPhoto] = useState(false);
  const [isDeletingPhoto, setIsDeletingPhoto] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  const handleAddPhoto = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';

    input.onchange = async e => {
      const file = e.target.files?.[0];
      if (!file) return;

      try {
        setIsAddingPhoto(true);
        const newPhoto = await addPhotoWithFile(file, currentProjectId);
        await updatePhoto(newPhoto.id, { [entityType]: entityId });
        triggerSync('photos');
      } catch (err) {
        console.error('Failed to add photo:', err);
        if (onError) {
          onError('Failed to add photo: ' + err.message);
        }
      } finally {
        setIsAddingPhoto(false);
      }
    };

    input.click();
  };

  const handleDeletePhoto = async photoId => {
    if (!window.confirm('Are you sure you want to delete this photo?')) return;

    try {
      setIsDeletingPhoto(true);
      await deletePhotoWithFile(photoId);
      triggerSync('photos');
    } catch (err) {
      console.error('Failed to delete photo:', err);
      if (onError) {
        onError('Failed to delete photo: ' + err.message);
      }
    } finally {
      setIsDeletingPhoto(false);
    }
  };

  const handlePhotoClick = photo => {
    setSelectedPhoto(photo);
  };

  const handleClosePhotoViewer = () => {
    setSelectedPhoto(null);
  };

  return (
    <Card>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">
          {title} ({photos.length})
        </h2>
        <div className="flex gap-2">
          <Button
            color="gray"
            onClick={() => setIsEditMode(!isEditMode)}
            disabled={isLoading || isAddingPhoto || isDeletingPhoto}
          >
            {isEditMode ? 'Done' : 'Edit'}
          </Button>
          <Button
            onClick={handleAddPhoto}
            disabled={isLoading || isAddingPhoto || isDeletingPhoto}
          >
            {isAddingPhoto ? 'Loading...' : 'Add Photo'}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8">
          <Spinner size="lg" />
        </div>
      ) : photos.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p className="mb-2">No photos yet.</p>
          <p className="text-sm">Click Add Photo to get started.</p>
        </div>
      ) : (
         <div className="flex flex-wrap gap-4">
           {photos.map(photo => (
             <div key={photo.id} className="relative group">
               <img
                 src={photo.imageBlob}
                 alt={photo.localFilename}
                 className="w-48 h-48 object-cover rounded-lg cursor-pointer"
                 onClick={() => handlePhotoClick(photo)}
               />
               {isEditMode && (
                <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center">
                  <Button
                    color="failure"
                    size="sm"
                    onClick={() => handleDeletePhoto(photo.id)}
                    disabled={isDeletingPhoto}
                  >
                    Delete
                  </Button>
                </div>
              )}
              <p className="text-xs text-gray-600 mt-1 truncate">
                {photo.localFilename}
              </p>
            </div>
          ))}
         </div>
       )}

      {selectedPhoto && (
        <Modal
          show={true}
          onClose={handleClosePhotoViewer}
          size="fullscreen"
        >
          <Modal.Body
            className="flex items-center justify-center bg-black min-h-screen cursor-pointer"
            onClick={handleClosePhotoViewer}
          >
            <button
              onClick={handleClosePhotoViewer}
              className="absolute top-4 right-4 text-white text-4xl hover:text-gray-300 z-10"
              title="Close"
            >
              ×
            </button>
            <img
              src={selectedPhoto.imageBlob}
              alt={selectedPhoto.localFilename}
              className="h-screen w-full object-contain"
            />
          </Modal.Body>
        </Modal>
      )}
    </Card>
  );
}

PhotoSection.propTypes = {
  title: PropTypes.string.isRequired,
  photos: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      imageBlob: PropTypes.string.isRequired,
      localFilename: PropTypes.string.isRequired,
    }),
  ).isRequired,
  isLoading: PropTypes.bool.isRequired,
  entityType: PropTypes.string.isRequired,
  entityId: PropTypes.string.isRequired,
  onError: PropTypes.func,
};
