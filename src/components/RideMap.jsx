import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import { useRideTracking } from "../hooks/useRideTracking";
import { pin, carIcon, COLORS, TILES } from "../utils/mapIcons";

function FollowDriver({ lat, lng }) {
  const map = useMap();
  useEffect(() => {
    if (lat != null && lng != null) {
      map.panTo([lat, lng], { animate: true });
    }
  }, [lat, lng, map]);
  return null;
}

export default function RideMap({ rideId, sourcePlace, destinationPlace }) {
  const { location, locationHistory, connected } = useRideTracking(rideId);

  const sourceHasCoords = sourcePlace?.latitude != null && sourcePlace?.longitude != null;
  const destHasCoords =
    destinationPlace?.latitude != null && destinationPlace?.longitude != null;

  if (!sourceHasCoords && !destHasCoords && !location) {
    return (
      <p className="card-meta" style={{ marginTop: "0.6rem" }}>
        No map data available.
      </p>
    );
  }

  const driverPos = location
    ? [Number(location.latitude), Number(location.longitude)]
    : null;

  const center =
    driverPos ||
    (sourceHasCoords
      ? [Number(sourcePlace.latitude), Number(sourcePlace.longitude)]
      : [Number(destinationPlace.latitude), Number(destinationPlace.longitude)]);

  return (
    <div style={{ marginTop: "0.8rem" }}>
      <MapContainer
        center={center}
        zoom={13}
        style={{ height: "420px", width: "100%", borderRadius: 12 }}
      >
        <TileLayer {...TILES} />

        {sourceHasCoords && (
          <Marker
            position={[Number(sourcePlace.latitude), Number(sourcePlace.longitude)]}
            icon={pin(COLORS.from)}
          >
            <Popup><strong>Pickup</strong><br />{sourcePlace.place_name}</Popup>
          </Marker>
        )}

        {destHasCoords && (
          <Marker
            position={[Number(destinationPlace.latitude), Number(destinationPlace.longitude)]}
            icon={pin(COLORS.to)}
          >
            <Popup><strong>Drop-off</strong><br />{destinationPlace.place_name}</Popup>
          </Marker>
        )}

        {locationHistory.length > 1 && (
          <Polyline
            positions={locationHistory.map((p) => [Number(p.latitude), Number(p.longitude)])}
            pathOptions={{ color: COLORS.idle, weight: 5 }}
          />
        )}

        {driverPos && (
          <Marker position={driverPos} icon={carIcon}>
            <Popup><strong>Driver's current location</strong></Popup>
          </Marker>
        )}

        {driverPos && <FollowDriver lat={driverPos[0]} lng={driverPos[1]} />}
      </MapContainer>

      <p className="card-meta" style={{ marginTop: "0.4rem" }}>
        {location
          ? connected
            ? "● Live — driver location updating in real time"
            : "Showing last known location — reconnecting..."
          : "Waiting for the driver to start sharing their location."}
      </p>

      {locationHistory.length > 1 && (
        <p className="card-meta">Tracked points: {locationHistory.length}</p>
      )}
    </div>
  );
}