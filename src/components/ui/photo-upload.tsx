import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Camera, Image as ImageIcon, X } from 'lucide-react';
import { toast } from 'sonner';

interface PhotoUploadProps {
  value?: string;
  onChange: (photoUrl: string | null) => void;
  label?: string;
}

export const PhotoUpload = ({ value, onChange, label = "Photo" }: PhotoUploadProps) => {
  const [loading, setLoading] = useState(false);

  const handleTakePhoto = async () => {
    try {
      setLoading(true);
      const { takePhoto } = await import('@/lib/camera');
      const photo = await takePhoto();
      
      if (photo) {
        onChange(photo.dataUrl);
        toast.success('Photo captured successfully');
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      toast.error('Failed to capture photo');
    } finally {
      setLoading(false);
    }
  };

  const handlePickPhoto = async () => {
    try {
      setLoading(true);
      const { pickPhoto } = await import('@/lib/camera');
      const photo = await pickPhoto();
      
      if (photo) {
        onChange(photo.dataUrl);
        toast.success('Photo selected successfully');
      }
    } catch (error) {
      console.error('Error picking photo:', error);
      toast.error('Failed to select photo');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = () => {
    onChange(null);
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      
      {value ? (
        <Card className="relative p-4">
          <img 
            src={value} 
            alt="Preview" 
            className="w-full h-48 object-cover rounded-md"
          />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2"
            onClick={handleRemove}
          >
            <X className="h-4 w-4" />
          </Button>
        </Card>
      ) : (
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleTakePhoto}
            disabled={loading}
            className="flex-1"
          >
            <Camera className="mr-2 h-4 w-4" />
            Take Photo
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handlePickPhoto}
            disabled={loading}
            className="flex-1"
          >
            <ImageIcon className="mr-2 h-4 w-4" />
            Choose Photo
          </Button>
        </div>
      )}
    </div>
  );
};
