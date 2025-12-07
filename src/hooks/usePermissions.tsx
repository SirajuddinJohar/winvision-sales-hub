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
      // Only request on native platforms
      if (!Capacitor.isNativePlatform()) {
        return;
      }

      // Check if we've already requested permissions this session
      const alreadyRequested = sessionStorage.getItem('permissions_requested');
      
      if (alreadyRequested) {
        // Just check current status
        const status = await checkPermissionStatus();
        setPermissions(status);
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
