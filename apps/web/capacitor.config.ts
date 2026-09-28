import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  // Development identifier; confirm ownership before store registration.
  appId: 'com.frostyoon.dayjoin',
  appName: 'Dayjoin',
  webDir: 'dist',
  // Match the web bundle's Vite 8 browser baseline.
  android: { minWebViewVersion: 111 },
  server: { errorPath: 'app-load-error.html' },
};

export default config;
