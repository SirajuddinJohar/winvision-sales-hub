import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.e5a3604e579f4d31a0d94e6a3d85c573',
  appName: 'winvision-sales-hub',
  webDir: 'dist',
  server: {
    url: 'https://e5a3604e-579f-4d31-a0d9-4e6a3d85c573.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    }
  }
};

export default config;
