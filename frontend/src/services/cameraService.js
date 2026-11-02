import { api } from './api';

export const cameraService = {
  async enumerateBrowserCameras() {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        return [];
      }
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices
        .filter((d) => d.kind === 'videoinput')
        .map((d, index) => {
          const isBuiltIn = /built-in|integrated|facetime|internal/i.test(d.label);
          return {
            deviceId: d.deviceId,
            label: d.label || `Camera ${index + 1}`,
            isExternal: !isBuiltIn,
            index,
          };
        });
    } catch (err) {
      console.warn('Failed to enumerate browser cameras:', err);
      return [];
    }
  },

  async requestCameraStream(deviceId = null) {
    const constraints = {
      video: deviceId
        ? { deviceId: { exact: deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } }
        : {
            facingMode: 'user',
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
      audio: false,
    };
    return await navigator.mediaDevices.getUserMedia(constraints);
  },
};
