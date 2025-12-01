import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  checkNetworkStatus, 
  getPendingSyncQueue, 
  removeFromSyncQueue,
  initNetworkListener 
} from '@/lib/offline';
import { toast } from 'sonner';

export const useOfflineSync = () => {
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    // Check initial network status
    checkNetworkStatus().then(setIsOnline);

    // Update pending count
    updatePendingCount();

    // Listen for network changes
    initNetworkListener((status) => {
      setIsOnline(status);
      if (status) {
        // Auto-sync when coming online
        syncPendingData();
      }
    });
  }, []);

  const updatePendingCount = async () => {
    const queue = await getPendingSyncQueue();
    setPendingCount(queue.length);
  };

  const syncPendingData = async () => {
    if (isSyncing) return;
    
    setIsSyncing(true);
    try {
      const queue = await getPendingSyncQueue();
      
      for (const item of queue) {
        try {
          // Sync based on type
          switch (item.type) {
            case 'daily_working':
              await supabase.from('daily_working').insert(item.data);
              break;
            case 'expense':
              await supabase.from('expenses').insert(item.data);
              break;
            case 'order':
              await supabase.from('orders').insert(item.data);
              break;
          }
          
          // Remove from queue after successful sync
          await removeFromSyncQueue(item.id);
        } catch (error) {
          console.error(`Error syncing ${item.type}:`, error);
        }
      }
      
      await updatePendingCount();
      toast.success('Offline data synced successfully');
    } catch (error) {
      console.error('Error syncing pending data:', error);
      toast.error('Failed to sync offline data');
    } finally {
      setIsSyncing(false);
    }
  };

  return {
    isOnline,
    isSyncing,
    pendingCount,
    syncPendingData,
    updatePendingCount
  };
};
