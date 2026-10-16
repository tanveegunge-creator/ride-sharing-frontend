import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useState } from "react";
import { pin, COLORS, TILES } from "../utils/mapIcons";

function FitBounds({ points }) {
  const map = useMap();
  useEffect(() => {
    if (points.length >= 2) {
      map.fitBounds(L.latLngBounds(points), { padding: [40, 40] });
    } else if (points.length === 1) {
      map.setView(points[0], 13);
    }
  }, [points, map]);
  return null;
}

/**
 * Props: sourcePlace, destinationPlace  ({ place_name, latitude, longitude })
 */
export default function RouteMap({ sourcePlace, destinationPlace }) {
  const sLat = sourcePlace?.latitude;
  const sLng = sourcePlace?.longitude;
  const eLat = destinationPlace?.latitude;
  const eLng = destinationPlace?.longitude;

  const start = sLat != null && sLng != null ? [Number(sLat), Number(sLng)] : null;
  const end = eLat != null && eLng != null ? [Number(eLat), Number(eLng)] : null;

  const points = useMemo(
    () => [start, end].filter(Boolean),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sLat, sLng, eLat, eLng]
  );

  const [road, setRoad] = useState(null); // { coords, km, min }

  useEffect(() => {
    setRoad(null);
    if (!start || !end) return;
    const ctrl = new AbortController();
    const url =
      `https://router.project-osrm.org/route/v1/driving/` +
      `${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson`;
    fetch(url, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((d) => {
        const r0 = d.routes && d.routes[0];
        if (r0) {
          setRoad({
            coords: r0.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
            km: r0.distance / 1000,
            min: r0.duration / 60,
          });
        }
      })
      .catch(() => {}); // fall back to the straight line
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sLat, sLng, eLat, eLng]);

  return (
    <div>
      {road && (
        <div className="pick-summary">
          <span className="pick-chip">🛣️ <strong>{road.km.toFixed(1)} km</strong></span>
          <span className="pick-chip">⏱️ <strong>~{Math.round(road.min)} min</strong></span>
        </div>
      )}
      <MapContainer
        center={[18.5204, 73.8567]}
        zoom={12}
        style={{ height: 350, width: "100%", borderRadius: 12 }}
      >
        <TileLayer {...TILES} />
        <FitBounds points={points} />
        {start && (
          <Marker position={start} icon={pin(COLORS.from)}>
            <Popup>From: {sourcePlace.place_name}</Popup>
          </Marker>
        )}
        {end && (
          <Marker position={end} icon={pin(COLORS.to)}>
            <Popup>To: {destinationPlace.place_name}</Popup>
          </Marker>
        )}
        {start && end && (
          <Polyline
            positions={road ? road.coords : [start, end]}
            pathOptions={{ color: COLORS.idle, weight: 5, dashArray: road ? null : "8 10" }}
          />
        )}
      </MapContainer>
    </div>
  );
}