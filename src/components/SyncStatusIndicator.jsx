import { useSync, SYNC_STATUS } from '../contexts/SyncContext.jsx';

function SyncStatusIndicator() {
  const { syncStatus } = useSync();

  const statusConfig = {
    [SYNC_STATUS.OFFLINE]: {
      label: 'Offline',
      bgColor: 'bg-red-100',
      textColor: 'text-red-700',
      dotColor: 'bg-red-500',
    },
    [SYNC_STATUS.SYNCING]: {
      label: 'Syncing',
      bgColor: 'bg-yellow-100',
      textColor: 'text-yellow-700',
      dotColor: 'bg-yellow-500',
    },
    [SYNC_STATUS.SYNCED]: {
      label: 'Synced',
      bgColor: 'bg-green-100',
      textColor: 'text-green-700',
      dotColor: 'bg-green-500',
    },
  };

  const config = statusConfig[syncStatus] || statusConfig[SYNC_STATUS.OFFLINE];

  return (
    <div
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.bgColor} ${config.textColor}`}
    >
      <span
        className={`w-2 h-2 rounded-full ${config.dotColor} ${
          syncStatus === SYNC_STATUS.SYNCING ? 'animate-pulse' : ''
        }`}
      />
      <span>{config.label}</span>
    </div>
  );
}

export default SyncStatusIndicator;
