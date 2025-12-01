import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useOfflineSync } from '@/hooks/useOfflineSync';

export const OfflineBanner = () => {
  const { isOnline, isSyncing, pendingCount, syncPendingData } = useOfflineSync();

  if (isOnline && pendingCount === 0) {
    return null;
  }

  return (
    <div className={`fixed top-0 left-0 right-0 z-50 px-4 py-2 text-sm text-center ${
      isOnline ? 'bg-primary text-primary-foreground' : 'bg-destructive text-destructive-foreground'
    }`}>
      <div className="flex items-center justify-center gap-2">
        {isOnline ? (
          <>
            <Wifi className="h-4 w-4" />
            <span>Online</span>
            {pendingCount > 0 && (
              <>
                <span>• {pendingCount} items pending sync</span>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={syncPendingData}
                  disabled={isSyncing}
                  className="ml-2 h-6"
                >
                  {isSyncing ? (
                    <RefreshCw className="h-3 w-3 animate-spin" />
                  ) : (
                    'Sync Now'
                  )}
                </Button>
              </>
            )}
          </>
        ) : (
          <>
            <WifiOff className="h-4 w-4" />
            <span>Offline Mode</span>
            {pendingCount > 0 && (
              <span>• {pendingCount} items will sync when online</span>
            )}
          </>
        )}
      </div>
    </div>
  );
};
