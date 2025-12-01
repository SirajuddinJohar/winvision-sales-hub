import localforage from 'localforage';
import { Network } from '@capacitor/network';

// Initialize offline storage
const offlineStore = localforage.createInstance({
  name: 'winvision-offline',
  storeName: 'data'
});

const pendingSync = localforage.createInstance({
  name: 'winvision-offline',
  storeName: 'pending-sync'
});

export interface OfflineData {
  id: string;
  type: 'daily_working' | 'expense' | 'order';
  data: any;
  timestamp: number;
  synced: boolean;
}

// Check network status
export const checkNetworkStatus = async (): Promise<boolean> => {
  try {
    const status = await Network.getStatus();
    return status.connected;
  } catch (error) {
    console.error('Error checking network:', error);
    return navigator.onLine;
  }
};

// Save data for offline use
export const saveOfflineData = async (key: string, data: any): Promise<void> => {
  try {
    await offlineStore.setItem(key, {
      data,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Error saving offline data:', error);
    throw error;
  }
};

// Get offline data
export const getOfflineData = async (key: string): Promise<any> => {
  try {
    const item = await offlineStore.getItem(key);
    return item ? (item as any).data : null;
  } catch (error) {
    console.error('Error getting offline data:', error);
    return null;
  }
};

// Queue data for sync
export const queueForSync = async (data: OfflineData): Promise<void> => {
  try {
    const queue = await getPendingSyncQueue();
    queue.push(data);
    await pendingSync.setItem('queue', queue);
  } catch (error) {
    console.error('Error queuing for sync:', error);
    throw error;
  }
};

// Get pending sync queue
export const getPendingSyncQueue = async (): Promise<OfflineData[]> => {
  try {
    const queue = await pendingSync.getItem('queue');
    return (queue as OfflineData[]) || [];
  } catch (error) {
    console.error('Error getting sync queue:', error);
    return [];
  }
};

// Remove from sync queue
export const removeFromSyncQueue = async (id: string): Promise<void> => {
  try {
    const queue = await getPendingSyncQueue();
    const filtered = queue.filter(item => item.id !== id);
    await pendingSync.setItem('queue', filtered);
  } catch (error) {
    console.error('Error removing from sync queue:', error);
  }
};

// Clear all offline data
export const clearOfflineData = async (): Promise<void> => {
  try {
    await offlineStore.clear();
  } catch (error) {
    console.error('Error clearing offline data:', error);
  }
};

// Listen for network changes
export const initNetworkListener = (callback: (isOnline: boolean) => void): void => {
  Network.addListener('networkStatusChange', status => {
    callback(status.connected);
  });
};
