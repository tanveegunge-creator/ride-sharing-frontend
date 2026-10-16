// RideMap.jsx — shows source/destination place markers plus the driver's
// live position for a ride. Used on both MyRides.jsx (driver) and
// MyBookings.jsx (passenger, once approved).
//
// SETUP (one-time): npm install leaflet react-leaflet

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import { useRideTracking } from "../hooks/useRideTracking";

// Vite doesn't auto-bundle Leaflet's default marker images, so without
// this fix markers render as broken image icons.
const placeIcon = L.icon({ iconUrl: markerIcon, shadowUrl: markerShadow, iconAnchor: [12, 41] });
const driverIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconAnchor: [12, 41],
  className: "driver-marker", // hook for CSS if you want to recolor it later
});

export default function RideMap({ rideId, sourcePlace, destinationPlace }) {
  const { location, connected } = useRideTracking(rideId);

  const sourceHasCoords = sourcePlace?.latitude != null && sourcePlace?.longitude != null;
  const destHasCoords = destinationPlace?.latitude != null && destinationPlace?.longitude != null;

  if (!sourceHasCoords && !destHasCoords && !location) {
    return (
      <p className="card-meta" style={{ marginTop: "0.6rem" }}>
        No map data yet — neither place has coordinates set, and the driver hasn't
        shared a location.
      </p>
    );
  }

  // Center on whatever we actually have: live driver location first,
  // falling back to source, then destination.
  const center = location
    ? [location.latitude, location.longitude]
    : sourceHasCoords
    ? [sourcePlace.latitude, sourcePlace.longitude]
    : [destinationPlace.latitude, destinationPlace.longitude];

  return (
    <div style={{ marginTop: "0.8rem" }}>
      <MapContainer
        center={center}
        zoom={13}
        style={{ height: "320px", width: "100%", borderRadius: 8 }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />

        {sourceHasCoords && (
          <Marker position={[sourcePlace.latitude, sourcePlace.longitude]} icon={placeIcon}>
            <Popup>Pickup: {sourcePlace.place_name}</Popup>
          </Marker>
        )}

        {destHasCoords && (
          <Marker position={[destinationPlace.latitude, destinationPlace.longitude]} icon={placeIcon}>
            <Popup>Drop-off: {destinationPlace.place_name}</Popup>
          </Marker>
        )}

        {location && (
          <Marker position={[location.latitude, location.longitude]} icon={driverIcon}>
            <Popup>Driver's current location</Popup>
          </Marker>
        )}
      </MapContainer>

      <p className="card-meta" style={{ marginTop: "0.4rem" }}>
        {location
          ? connected
            ? "Live — updating in real time"
            : "Showing last known location (reconnecting…)"
          : "Waiting for the driver to start sharing their location."}
      </p>
    </div>
  );
}
