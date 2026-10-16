import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { getPlaces, createRide } from "../api/client";
import { getCurrentUserId, isLoggedIn } from "../utils/auth";

import MapPlacePicker from "../components/MapPlacePicker";
import RouteMap from "../components/RouteMap";

export default function CreateRide() {
  const navigate = useNavigate();

  const [places, setPlaces] = useState([]);

  const [fromPlaceId, setFromPlaceId] = useState("");
  const [toPlaceId, setToPlaceId] = useState("");

  const [form, setForm] = useState({
    departure_time: "",
    vehicle_type: "car",
    total_seats: 4,
    vehicle_number: "",
    upi_id: "",
  });

  const [error, setError] = useState("");
  const [createdRide, setCreatedRide] = useState(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoggedIn()) {
      navigate("/login");
      return;
    }

    getPlaces()
      .then((res) => setPlaces(res.data))
      .catch(() => setError("Could not load places. Is the backend running?"))
      .finally(() => setLoading(false));
  }, [navigate]);

  const sourcePlace = places.find(
    (p) => String(p.place_id) === String(fromPlaceId)
  );

  const destinationPlace = places.find(
    (p) => String(p.place_id) === String(toPlaceId)
  );

  const placeName = (id) =>
    places.find((p) => String(p.place_id) === String(id))?.place_name || "";

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setCreatedRide(null);

    const driverId = getCurrentUserId();

    if (!driverId) {
      setError("Could not identify your account — please log in again.");
      return;
    }

    if (!fromPlaceId || !toPlaceId) {
      setError("Select both source and destination from the map.");
      return;
    }

    if (String(fromPlaceId) === String(toPlaceId)) {
      setError("Source and destination can't be the same place.");
      return;
    }

    if (!form.departure_time) {
      setError("Pick a departure time.");
      return;
    }

    if (!form.vehicle_number.trim()) {
      setError("Enter your vehicle number so passengers can recognise it.");
      return;
    }

    if (form.upi_id.trim() && !form.upi_id.includes("@")) {
      setError("UPI ID should look like name@bank.");
      return;
    }

    setSubmitting(true);

    try {
      const res = await createRide({
        driver_id: driverId,
        source_place_id: parseInt(fromPlaceId, 10),
        destination_place_id: parseInt(toPlaceId, 10),
        departure_time: form.departure_time,
        vehicle_type: form.vehicle_type,
        total_seats: form.total_seats,
        vehicle_number: form.vehicle_number.trim(),
        upi_id: form.upi_id.trim() || null,
      });

      setCreatedRide(res.data);
    } catch (err) {
      const detail = err.response?.data?.detail;

      setError(typeof detail === "string" ? detail : "Could not create ride.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="page">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="page page-wide">
      <h2>Offer a ride</h2>

      <p className="hint">
        Select your starting point and destination directly from the map.
      </p>

      <MapPlacePicker
        places={places}
        fromId={fromPlaceId === "" ? null : Number(fromPlaceId)}
        toId={toPlaceId === "" ? null : Number(toPlaceId)}
        onChange={({ fromId, toId }) => {
          setFromPlaceId(fromId ?? "");
          setToPlaceId(toId ?? "");
        }}
      />

      {sourcePlace && destinationPlace && (
        <div style={{ marginTop: "1.5rem" }}>
          <h3>Route</h3>

          <p className="card-meta">
            {sourcePlace.place_name} → {destinationPlace.place_name}
          </p>

          <RouteMap
            sourcePlace={sourcePlace}
            destinationPlace={destinationPlace}
          />
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ marginTop: "1.5rem" }}>
        <div className="field">
          <label>Departure time</label>

          <input
            type="datetime-local"
            name="departure_time"
            value={form.departure_time}
            onChange={(e) =>
              setForm({ ...form, departure_time: e.target.value })
            }
          />
        </div>

        <div className="field">
          <label>Vehicle type</label>

          <select
            name="vehicle_type"
            value={form.vehicle_type}
            onChange={(e) =>
              setForm({ ...form, vehicle_type: e.target.value })
            }
          >
            <option value="auto">Auto (3-seater)</option>
            <option value="car">Car (4-5 seater)</option>
            <option value="bus">Bus (6+ seater)</option>
          </select>
        </div>

        <div className="field">
          <label>Vehicle number</label>

          <input
            type="text"
            name="vehicle_number"
            placeholder="e.g. MH12 AB 1234"
            value={form.vehicle_number}
            onChange={(e) =>
              setForm({ ...form, vehicle_number: e.target.value.toUpperCase() })
            }
          />
        </div>

        <div className="field">
          <label>Total seats</label>

          <input
            type="number"
            name="total_seats"
            min="1"
            value={form.total_seats}
            onChange={(e) =>
              setForm({
                ...form,
                total_seats: parseInt(e.target.value, 10) || "",
              })
            }
          />
        </div>

        <div className="field">
          <label>Your UPI ID (optional, for online payments)</label>

          <input
            type="text"
            name="upi_id"
            placeholder="e.g. yourname@okbank"
            value={form.upi_id}
            onChange={(e) => setForm({ ...form, upi_id: e.target.value })}
          />
        </div>
        <p className="hint">
          Without a UPI ID, passengers can only pay you in cash. Passengers
          see your name, vehicle number and phone once their booking is
          approved.
        </p>

        {error && <p className="msg-error">{error}</p>}

        <button type="submit" className="btn" disabled={submitting}>
          {submitting ? "Creating..." : "Create Ride"}
        </button>
      </form>

      {createdRide && (
        <div className="card" style={{ marginTop: "1.8rem" }}>
          <h3>Ride created</h3>

          <div className="route">
            <div className="route-line">
              <div className="route-dot" />
              <div className="route-connector" />
              <div className="route-dot end" />
            </div>

            <div className="route-places">
              <span>{placeName(fromPlaceId)}</span>
              <span>{placeName(toPlaceId)}</span>
            </div>
          </div>

          <p className="card-meta">
            {createdRide.vehicle_type} · {createdRide.vehicle_number} ·{" "}
            {createdRide.available_seats}/{createdRide.total_seats} seats ·{" "}
            {createdRide.status}
          </p>

          <p className="card-price">₹{createdRide.price}</p>
        </div>
      )}
    </div>
  );
}