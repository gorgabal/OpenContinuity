import PropTypes from 'prop-types';
import { useState } from 'react';
import { Card, Spinner, Button } from 'flowbite-react';

export default function PhotoSection({
  title,
  photos,
  isLoading,
  onPhotoClick,
  onPhotoAdd,
  onPhotoDelete,
}) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [isAddingPhoto, setIsAddingPhoto] = useState(false);
  const [isDeletingPhoto, setIsDeletingPhoto] = useState(false);

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
        await onPhotoAdd(file);
      } catch (err) {
        console.error('Failed to add photo:', err);
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
      await onPhotoDelete(photoId);
    } catch (err) {
      console.error('Failed to delete photo:', err);
    } finally {
      setIsDeletingPhoto(false);
    }
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
                onClick={() => onPhotoClick(photo)}
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
  onPhotoClick: PropTypes.func.isRequired,
  onPhotoAdd: PropTypes.func.isRequired,
  onPhotoDelete: PropTypes.func.isRequired,
};
