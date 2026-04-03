import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { 
  PermissionStatus, 
  requestAllPermissions, 
  checkPermissionStatus 
} from '@/lib/permissions';

export const usePermissions = () => {
  const [permissions, setPermissions] = useState<PermissionStatus>({
    location: 'prompt',
    notifications: 'prompt'
  });
  const [isRequesting, setIsRequesting] = useState(false);
  const [hasRequested, setHasRequested] = useState(false);

  useEffect(() => {
    const initializePermissions = async () => {
      // Check if we've already requested permissions this session
      const alreadyRequested = sessionStorage.getItem('permissions_requested');
      
      if (alreadyRequested) {
        // Just check current status
        if (Capacitor.isNativePlatform()) {
          const status = await checkPermissionStatus();
          setPermissions(status);
        } else {
          // Check web notification status
          const notifPerm = 'Notification' in window ? Notification.permission : 'default';
          setPermissions({
            location: 'granted',
            notifications: notifPerm === 'granted' ? 'granted' : notifPerm === 'denied' ? 'denied' : 'prompt',
          });
        }
        setHasRequested(true);
        return;
      }

      // Request permissions on first load
      setIsRequesting(true);
      
      try {
        const status = await requestAllPermissions();
        setPermissions(status);
        sessionStorage.setItem('permissions_requested', 'true');
      } catch (error) {
        console.error('Error requesting permissions:', error);
      } finally {
        setIsRequesting(false);
        setHasRequested(true);
      }
    };

    initializePermissions();
  }, []);

  const requestPermissions = async () => {
    setIsRequesting(true);
    try {
      const status = await requestAllPermissions();
      setPermissions(status);
      return status;
    } finally {
      setIsRequesting(false);
    }
  };

  return {
    permissions,
    isRequesting,
    hasRequested,
    requestPermissions,
    isNative: Capacitor.isNativePlatform()
  };
};
