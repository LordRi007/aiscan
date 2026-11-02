import { useState, useCallback } from 'react';

export function useFaceTracking() {
  const [faces, setFaces] = useState([]);
  const [events, setEvents] = useState([]);
  const [counts, setCounts] = useState({
    totalDetected: 0,
    registeredMatches: 0,
    newFaces: 0,
    pendingVerification: 0,
  });

  const updateFacesFromTelemetry = useCallback((faceList, telemetry) => {
    setFaces(faceList || []);
    if (telemetry) {
      setCounts({
        totalDetected: telemetry.faces_detected || 0,
        registeredMatches: telemetry.registered_matches || 0,
        newFaces: telemetry.new_faces || 0,
        pendingVerification: telemetry.pending_verification || 0,
      });
    }

    // Check for new registration occurrences
    (faceList || []).forEach((face) => {
      if (face.verification_status === 'NEW_REGISTERED') {
        setEvents((prev) => {
          const exists = prev.some((e) => e.trackId === face.track_id && e.personId === face.person_id);
          if (!exists) {
            return [
              {
                id: Date.now() + Math.random(),
                trackId: face.track_id,
                personId: face.person_id,
                name: face.person_name,
                expression: face.expression,
                time: new Date().toLocaleTimeString(),
                type: 'registration_success',
              },
              ...prev.slice(0, 49),
            ];
          }
          return prev;
        });
      }
    });
  }, []);

  const addEvent = useCallback((event) => {
    setEvents((prev) => [
      {
        id: Date.now() + Math.random(),
        time: new Date().toLocaleTimeString(),
        ...event,
      },
      ...prev.slice(0, 49),
    ]);
  }, []);

  return {
    faces,
    events,
    counts,
    updateFacesFromTelemetry,
    addEvent,
  };
}
