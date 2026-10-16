import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  getRideLocation,
  updateRideLocation,
  WS_BASE_URL,
} from "../api/client";

export function useRideTracking(rideId) {
  const [location, setLocation] =
    useState(null);

  const [locationHistory, setLocationHistory] =
    useState([]);

  const [connected, setConnected] =
    useState(false);

  const socketRef = useRef(null);

  useEffect(() => {
    if (!rideId) return;

    let cancelled = false;

    setLocation(null);
    setLocationHistory([]);

    // Initial REST location
    getRideLocation(rideId)
      .then((res) => {
        if (cancelled) return;

        const data = res.data;

        setLocation(data);

        setLocationHistory([
          {
            latitude: Number(data.latitude),
            longitude: Number(data.longitude),
          },
        ]);
      })
      .catch(() => {});

    // WebSocket
    const ws = new WebSocket(
      `${WS_BASE_URL}/rides/ws/${rideId}/track`
    );

    socketRef.current = ws;

    ws.onopen = () => {
      if (!cancelled) {
        setConnected(true);
      }
    };

    ws.onclose = () => {
      if (!cancelled) {
        setConnected(false);
      }
    };

    ws.onerror = (err) => {
      console.error(
        "Tracking socket error:",
        err
      );
    };

    ws.onmessage = (event) => {
      if (cancelled) return;

      try {
        const data = JSON.parse(event.data);

        setLocation(data);

        setLocationHistory((previous) => {
          const nextPoint = {
            latitude: Number(data.latitude),
            longitude: Number(data.longitude),
          };

          // Don't add exactly identical consecutive points
          if (previous.length > 0) {
            const last =
              previous[previous.length - 1];

            if (
              last.latitude ===
                nextPoint.latitude &&
              last.longitude ===
                nextPoint.longitude
            ) {
              return previous;
            }
          }

          return [
            ...previous,
            nextPoint,
          ];
        });
      } catch (err) {
        console.error(
          "Invalid tracking data:",
          err
        );
      }
    };

    return () => {
      cancelled = true;

      setConnected(false);

      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [rideId]);

  return {
    location,
    locationHistory,
    connected,
  };
}


// Driver uses this to send GPS location
export function pushRideLocation(
  rideId,
  latitude,
  longitude
) {
  return updateRideLocation(
    rideId,
    latitude,
    longitude
  ).catch((err) => {
    console.error(
      "Failed to push location:",
      err
    );
  });
}