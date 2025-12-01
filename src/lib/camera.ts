import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

export interface PhotoData {
  dataUrl: string;
  format: string;
}

// Take photo from camera
export const takePhoto = async (): Promise<PhotoData | null> => {
  try {
    const permission = await Camera.checkPermissions();
    
    if (permission.camera !== 'granted') {
      const request = await Camera.requestPermissions({ permissions: ['camera'] });
      if (request.camera !== 'granted') {
        throw new Error('Camera permission denied');
      }
    }

    const image = await Camera.getPhoto({
      quality: 80,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Camera
    });

    if (!image.dataUrl) {
      throw new Error('No image data received');
    }

    return {
      dataUrl: image.dataUrl,
      format: image.format
    };
  } catch (error) {
    console.error('Error taking photo:', error);
    return null;
  }
};

// Pick photo from gallery
export const pickPhoto = async (): Promise<PhotoData | null> => {
  try {
    const permission = await Camera.checkPermissions();
    
    if (permission.photos !== 'granted') {
      const request = await Camera.requestPermissions({ permissions: ['photos'] });
      if (request.photos !== 'granted') {
        throw new Error('Photos permission denied');
      }
    }

    const image = await Camera.getPhoto({
      quality: 80,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Photos
    });

    if (!image.dataUrl) {
      throw new Error('No image data received');
    }

    return {
      dataUrl: image.dataUrl,
      format: image.format
    };
  } catch (error) {
    console.error('Error picking photo:', error);
    return null;
  }
};
