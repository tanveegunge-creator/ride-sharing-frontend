import { useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

// Default Leaflet marker icon (required for Vite)
L.Marker.prototype.options.icon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

// Default map center: Pune
const PUNE_CENTER = [18.5204, 73.8567];

// Colors for source and destination pins
const COLORS = {
  from: "#4caf6d",
  to: "#e8624a",
  idle: "#e8a33d",
};

// Create a colored marker pin
const pin = (color) =>
  L.divIcon({
    className: "pin-wrap",
    html: `<span class="pin" style="--c:${color}"></span>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -12],
  });

// Convert coordinates safely to numbers
function getCoordinates(place) {
  const latitude = Number(place.latitude);
  const longitude = Number(place.longitude);

  if (
    place.latitude === null ||
    place.latitude === undefined ||
    place.longitude === null ||
    place.longitude === undefined ||
    place.latitude === "" ||
    place.longitude === "" ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null;
  }

  return [latitude, longitude];
}

// Automatically fit the map around places with valid coordinates
function FitToPlaces({ places }) {
  const map = useMap();

  useEffect(() => {
    const validCoordinates = places
      .map((place) => getCoordinates(place))
      .filter((coordinates) => coordinates !== null);

    if (validCoordinates.length === 1) {
      map.setView(validCoordinates[0], 13);
    } else if (validCoordinates.length > 1) {
      const bounds = L.latLngBounds(validCoordinates);
      map.fitBounds(bounds, { padding: [30, 30], maxZoom: 14 });
    }
  }, [places, map]);

  return null;
}

/*
  Props:
  places: array from GET /places/
  fromId: selected source place_id
  toId: selected destination place_id
  onChange: callback receiving { fromId, toId }

  Click logic:
  1. First click selects From.
  2. Second click selects To.
  3. Third click starts a new selection.
*/

function MapPlacePicker({
  places = [],
  fromId = null,
  toId = null,
  onChange,
}) {
  // Keep only places with valid coordinates
  const validPlaces = places.filter(
    (place) => getCoordinates(place) !== null
  );

  // Handle a marker click
  function handleMarkerClick(placeId) {
    if (typeof onChange !== "function") {
      return;
    }

    const selectedFrom = fromId == null ? null : String(fromId);
    const selectedTo = toId == null ? null : String(toId);
    const clickedId = String(placeId);

    // First click, or third click: start a new selection
    if (
      selectedFrom === null ||
      (selectedFrom !== null && selectedTo !== null)
    ) {
      onChange({
        fromId: placeId,
        toId: null,
      });
      return;
    }

    // Do not allow the same place as both From and To
    if (clickedId === selectedFrom) {
      return;
    }

    // Second click selects the destination
    onChange({
      fromId: fromId,
      toId: placeId,
    });
  }

  return (
    <div className="map-place-picker">
      <MapContainer
        center={PUNE_CENTER}
        zoom={12}
        style={{
          height: "400px",
          width: "100%",
          borderRadius: "12px",
        }}
        scrollWheelZoom={true}
      >
        


<MapContainer
  center={PUNE_CENTER}
  zoom={12}
  style={{ height: "520px", width: "100%" }}
>
  <TileLayer
    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
    attribution="&copy; OpenStreetMap contributors"
  />

  {/* Keep your existing markers and route here */}
</MapContainer>



        <FitToPlaces places={validPlaces} />

        {validPlaces.map((place) => {
          const coordinates = getCoordinates(place);

          const isFrom =
            fromId != null &&
            String(place.place_id) === String(fromId);

          const isTo =
            toId != null &&
            String(place.place_id) === String(toId);

          let markerColor = COLORS.idle;

          if (isFrom) {
            markerColor = COLORS.from;
          } else if (isTo) {
            markerColor = COLORS.to;
          }

          return (
            <Marker
              key={place.place_id}
              position={coordinates}
              icon={pin(markerColor)}
              eventHandlers={{
                click: () => handleMarkerClick(place.place_id),
              }}
            >
              <Popup>
                <strong>{place.place_name}</strong>
                <br />
                {isFrom
                  ? "Selected: From"
                  : isTo
                  ? "Selected: To"
                  : "Click to select this place"}
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {validPlaces.length === 0 && (
        <p>
          No places with valid map coordinates are available.
          Please add latitude and longitude values to your places.
        </p>
      )}

      <p style={{ marginTop: "10px", fontSize: "14px" }}>
        <span style={{ color: COLORS.from }}>●</span> From
        {"  "}
        <span style={{ color: COLORS.to }}>●</span> To
        {"  "}
        <span style={{ color: COLORS.idle }}>●</span> Unselected
      </p>
    </div>
  );
}

export default MapPlacePicker;
