import { Geolocation } from '@capacitor/geolocation';

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

// Get current location
export const getCurrentLocation = async (): Promise<LocationData | null> => {
  try {
    console.log('Checking location permissions...');
    const permission = await Geolocation.checkPermissions();
    console.log('Permission status:', permission);
    
    if (permission.location !== 'granted') {
      console.log('Requesting location permissions...');
      const request = await Geolocation.requestPermissions();
      console.log('Permission request result:', request);
      
      if (request.location !== 'granted') {
        throw new Error('Location permission denied by user');
      }
    }

    console.log('Getting current position...');
    const position = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 15000, // Increased timeout to 15 seconds
      maximumAge: 0
    });

    console.log('Position obtained:', position);
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      timestamp: position.timestamp
    };
  } catch (error: any) {
    console.error('Error getting location:', error);
    console.error('Error details:', {
      message: error?.message,
      code: error?.code,
      name: error?.name
    });
    throw error; // Re-throw to let the caller handle it
  }
};

// Calculate distance between two points (Haversine formula)
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Format location for display
export const formatLocation = (location: LocationData): string => {
  return `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`;
};
