import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../services/api';
import { cameraService } from '../services/cameraService';

export function useCamera() {
  const [cameraStatus, setCameraStatus] = useState({
    is_running: false,
    is_active: false,
    camera_name: 'Disconnected',
    fps: 0,
    resolution: '0x0',
    is_external: false,
  });
  const [cameras, setCameras] = useState([]);
  const [browserCameras, setBrowserCameras] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState(null);
  const [selectedDeviceId, setSelectedDeviceId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const localVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const canvasRef = useRef(document.createElement('canvas'));

  const fetchStatus = useCallback(async () => {
    try {
      const data = await api.getCameraStatus();
      setCameraStatus(data);
    } catch (err) {
      console.warn('Failed to fetch camera status:', err);
    }
  }, []);

  const loadCameras = useCallback(async () => {
    try {
      const data = await api.getCameras();
      const backendCams = data.cameras || [];
      const bCams = await cameraService.enumerateBrowserCameras();
      setBrowserCameras(bCams);

      // Merge backend and browser camera options for comprehensive dropdown selection
      const merged = [...backendCams];
      bCams.forEach((bc, idx) => {
        merged.push({
          index: `browser_${bc.deviceId || idx}`,
          deviceId: bc.deviceId,
          name: `Browser: ${bc.label || ('Webcam ' + (idx + 1))}`,
          device_type: 'browser_stream',
          is_external: bc.isExternal,
          resolution: '640x360',
          is_default: false,
        });
      });
      setCameras(merged);

      if (data.active_camera) {
        setCameraStatus(data.active_camera);
      }
    } catch (err) {
      console.warn('Failed to load camera list:', err);
    }
  }, []);

  useEffect(() => {
    loadCameras();
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, [loadCameras, fetchStatus]);

  const startCamera = async () => {
    // Optimistically set running state immediately for zero-lag UI response
    setCameraStatus((prev) => ({ ...prev, is_running: true }));
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.startCamera();
      if (res?.camera) setCameraStatus(res.camera);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const stopCamera = async () => {
    // Optimistically set stopped state immediately to release webcam instantly with zero lag
    setCameraStatus((prev) => ({ ...prev, is_running: false, is_active: false, fps: 0 }));
    setIsLoading(true);
    try {
      const res = await api.stopCamera();
      if (res?.camera) setCameraStatus(res.camera);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const selectCamera = async (source, deviceType = 'usb_webcam', name = '', deviceId = null) => {
    setIsLoading(true);
    setError(null);
    try {
      if (deviceId) {
        setSelectedDeviceId(deviceId);
      } else if (String(source).startsWith('browser_')) {
        const found = cameras.find((c) => String(c.index) === String(source));
        if (found?.deviceId) setSelectedDeviceId(found.deviceId);
      } else {
        setSelectedDeviceId(null);
      }

      const res = await api.selectCamera(source, deviceType, name);
      setCameraStatus(res.camera);
      setSelectedCamera({ source, deviceType, name, deviceId });
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    cameraStatus,
    setCameraStatus,
    cameras,
    browserCameras,
    selectedCamera,
    selectedDeviceId,
    isLoading,
    error,
    startCamera,
    stopCamera,
    selectCamera,
    refreshCameras: loadCameras,
  };
}
