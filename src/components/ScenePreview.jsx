import PropTypes from 'prop-types';
import { Card, Button } from 'flowbite-react';
import { Link } from 'react-router-dom';
import { useEffect } from 'react';
import { usePhotoPreviews } from '../hooks/usePhotoPreviews.jsx';
import { useProject } from '../contexts/ProjectContext.jsx';

export default function ScenePreview({
  scene,
  characters,
  costumes,
  shootingDays,
  isEditable = false,
  onRemove = null,
  showShootingDay = false,
  showPhotoStrip = false,
  compact = false,
  onAction = null,
  actionLabel = 'Action',
}) {
  const { currentProjectId } = useProject();
  const { photoBlobs, loadEntityPhoto } = usePhotoPreviews(
    currentProjectId,
    'scenes',
  );

  useEffect(() => {
    if (scene.id && !photoBlobs[scene.id]) {
      loadEntityPhoto(scene.id);
    }
  }, [scene.id, photoBlobs, loadEntityPhoto]);

  const shootingDay = shootingDays?.find(day => day.id === scene.shootingDay);
  const photoUrls = photoBlobs[scene.id] || [];

  if (compact) {
    return (
      <Card className="hover:bg-gray-50 transition-colors">
        <div className="flex justify-between items-center">
          <div>
            <h4 className="font-semibold">Scene {scene.sceneNumber}</h4>
            {scene.location && (
              <p className="text-sm text-gray-600">
                Location: {scene.location}
              </p>
            )}
            {scene.characters && scene.characters.length > 0 && (
              <p className="text-sm text-gray-600">
                Characters:{' '}
                {scene.characters
                  .map(charId => {
                    const character = characters?.find(c => c.id === charId);
                    return character ? character.name : null;
                  })
                  .filter(name => name)
                  .join(', ')}
              </p>
            )}
          </div>
          {onAction && (
            <Button size="sm" onClick={() => onAction(scene.id)}>
              {actionLabel}
            </Button>
          )}
        </div>
      </Card>
    );
  }

  return (
    <Card className="hover:bg-gray-50 transition-colors">
      <div className="flex flex-row">
        {/* Scene number box */}
        <Link to={`/scene/${scene.id}`} className="flex">
          <div className="bg-gray-300 p-6 flex items-center justify-center min-w-[100px]">
            <span className="text-4xl font-bold">{scene.sceneNumber}</span>
          </div>
        </Link>

        {/* Scene details */}
        <Link to={`/scene/${scene.id}`} className="p-4 flex-grow">
          <ul className="space-y-1">
            {scene.location && (
              <li className="text-gray-700">Locatie: {scene.location}</li>
            )}
            {scene.characters && scene.characters.length > 0 && (
              <li className="text-gray-700">
                Personages:{' '}
                {scene.characters
                  .map(charId => {
                    const character = characters?.find(c => c.id === charId);
                    return character ? character.name : null;
                  })
                  .filter(name => name)
                  .join(', ')}
              </li>
            )}
            {scene.costumes && scene.costumes.length > 0 && (
              <li className="text-gray-700">
                Kostuums:{' '}
                {scene.costumes
                  .map(costId => {
                    const costume = costumes?.find(c => c.id === costId);
                    return costume ? costume.name : null;
                  })
                  .filter(name => name)
                  .join(', ')}
              </li>
            )}
            {showShootingDay && shootingDay && (
              <li className="text-gray-700 mt-2">
                Draaidag:{' '}
                {shootingDay.name ||
                  new Date(shootingDay.date).toLocaleDateString('nl-NL')}
              </li>
            )}
          </ul>
        </Link>

        {/* Photo strip */}
        {showPhotoStrip && photoUrls.length > 0 && (
          <div className="flex gap-1 p-2 min-w-[120px] overflow-hidden">
            {photoUrls.slice(0, 4).map((url, idx) => (
              <img
                key={idx}
                src={url}
                alt={`Scene ${scene.sceneNumber} photo ${idx + 1}`}
                className={`
                  w-full min-w-[80px] max-h-20 object-contain rounded
                  ${idx === 3 ? 'hidden lg:block' : ''}
                  ${idx === 2 ? 'hidden md:block' : ''}
                  ${idx === 1 ? 'hidden sm:block' : ''}
                `}
              />
            ))}
          </div>
        )}

        {/* Remove button */}
        {isEditable && onRemove && (
          <div className="p-4 flex items-center">
            <Button
              size="sm"
              color="failure"
              onClick={() => onRemove(scene.id)}
            >
              Remove
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}

ScenePreview.propTypes = {
  scene: PropTypes.shape({
    id: PropTypes.string.isRequired,
    sceneNumber: PropTypes.number.isRequired,
    location: PropTypes.string,
    characters: PropTypes.arrayOf(PropTypes.string),
    costumes: PropTypes.arrayOf(PropTypes.string),
    shootingDay: PropTypes.string,
  }).isRequired,
  characters: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
    }),
  ),
  costumes: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
    }),
  ),
  shootingDays: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string,
      date: PropTypes.string.isRequired,
    }),
  ),
  isEditable: PropTypes.bool,
  onRemove: PropTypes.func,
  showShootingDay: PropTypes.bool,
  showPhotoStrip: PropTypes.bool,
  compact: PropTypes.bool,
  onAction: PropTypes.func,
  actionLabel: PropTypes.string,
};
