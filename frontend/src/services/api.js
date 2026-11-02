const isDev = typeof window !== 'undefined' && (window.location.port === '5173' || window.location.port === '3000');
const customApi = typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL;
const BASE_URL = isDev ? `http://${window.location.hostname}:8000/api` : (customApi || '/api');

export async function fetchJson(endpoint, options = {}) {
  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || `Request failed with status ${res.status}`);
    }
    return await res.json();
  } catch (error) {
    console.error(`API Error [${endpoint}]:`, error);
    throw error;
  }
}

export const api = {
  // Cameras
  getCameras: () => fetchJson('/cameras'),
  selectCamera: (source, deviceType, deviceName) =>
    fetchJson('/cameras/select', {
      method: 'POST',
      body: JSON.stringify({ source, device_type: deviceType, device_name: deviceName }),
    }),
  startCamera: () => fetchJson('/cameras/start', { method: 'POST' }),
  stopCamera: () => fetchJson('/cameras/stop', { method: 'POST' }),
  getCameraStatus: () => fetchJson('/cameras/status'),

  // Faces & Persons
  getRegisteredFaces: (search = '', limit = 50, offset = 0) =>
    fetchJson(`/faces/registered?search=${encodeURIComponent(search)}&limit=${limit}&offset=${offset}`),
  getPersonDetails: (personId) => fetchJson(`/faces/${personId}`),
  deletePerson: (personId) => fetchJson(`/faces/${personId}`, { method: 'DELETE' }),
  updateConsent: (personId, consentStatus) =>
    fetchJson(`/faces/${personId}/consent`, {
      method: 'POST',
      body: JSON.stringify({ consent_status: consentStatus }),
    }),
  checkExisting: (imageBase64) =>
    fetchJson('/faces/check-existing', {
      method: 'POST',
      body: JSON.stringify({ image_base64: imageBase64 }),
    }),

  // Expressions
  getCurrentExpressions: () => fetchJson('/expressions/current'),
  getExpressionStatistics: () => fetchJson('/expressions/statistics'),
  getExpressionHistory: (limit = 30) => fetchJson(`/expressions/history?limit=${limit}`),

  // Analytics
  getOverview: () => fetchJson('/analytics/overview'),
  getRegistrations: (days = 7) => fetchJson(`/analytics/registrations?days=${days}`),
  getRecognitionStats: () => fetchJson('/analytics/recognition'),
  getExpressionDistribution: () => fetchJson('/analytics/expressions'),
  getVerificationEvents: (limit = 25) => fetchJson(`/analytics/verification-events?limit=${limit}`),
};
