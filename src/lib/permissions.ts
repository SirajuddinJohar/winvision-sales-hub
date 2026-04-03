import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import { PushNotifications } from '@capacitor/push-notifications';

export interface PermissionStatus {
  location: 'granted' | 'denied' | 'prompt';
  notifications: 'granted' | 'denied' | 'prompt';
}

export const requestLocationPermission = async (): Promise<boolean> => {
  if (!Capacitor.isNativePlatform()) {
    // Web fallback - request browser geolocation permission
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
      });
      return true;
    } catch {
      return false;
    }
  }

  try {
    const status = await Geolocation.checkPermissions();
    
    if (status.location === 'granted') {
      return true;
    }

    if (status.location === 'denied') {
      console.log('Location permission denied');
      return false;
    }

    // Request permission
    const result = await Geolocation.requestPermissions();
    return result.location === 'granted';
  } catch (error) {
    console.error('Error requesting location permission:', error);
    return false;
  }
};

export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!Capacitor.isNativePlatform()) {
    // Web fallback
    if ('Notification' in window) {
      const result = await Notification.requestPermission();
      return result === 'granted';
    }
    return false;
  }

  try {
    const status = await PushNotifications.checkPermissions();
    
    if (status.receive === 'granted') {
      return true;
    }

    if (status.receive === 'denied') {
      console.log('Notification permission denied');
      return false;
    }

    // Request permission
    const result = await PushNotifications.requestPermissions();
    
    if (result.receive === 'granted') {
      // Register for push notifications
      await PushNotifications.register();
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return false;
  }
};

export const requestAllPermissions = async (): Promise<PermissionStatus> => {
  const [locationGranted, notificationsGranted] = await Promise.all([
    requestLocationPermission(),
    requestNotificationPermission()
  ]);

  return {
    location: locationGranted ? 'granted' : 'denied',
    notifications: notificationsGranted ? 'granted' : 'denied'
  };
};

export const checkPermissionStatus = async (): Promise<PermissionStatus> => {
  if (!Capacitor.isNativePlatform()) {
    const notifPerm = 'Notification' in window ? Notification.permission : 'default';
    return {
      location: navigator.geolocation ? 'prompt' : 'denied',
      notifications: notifPerm === 'granted' ? 'granted' : notifPerm === 'denied' ? 'denied' : 'prompt',
    };
  }

  try {
    const [locationStatus, notificationStatus] = await Promise.all([
      Geolocation.checkPermissions(),
      PushNotifications.checkPermissions()
    ]);

    return {
      location: locationStatus.location as 'granted' | 'denied' | 'prompt',
      notifications: notificationStatus.receive as 'granted' | 'denied' | 'prompt'
    };
  } catch (error) {
    console.error('Error checking permissions:', error);
    return {
      location: 'prompt',
      notifications: 'prompt'
    };
  }
};
