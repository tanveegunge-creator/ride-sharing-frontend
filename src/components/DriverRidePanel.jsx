import { useCallback, useEffect, useState } from "react";

import {
  startRide,
  endRide,
  getRideBookings,
  confirmPayment,
} from "../api/client";
import { getCurrentUserId } from "../utils/auth";

const CLOSED = ["completed", "stopped_early"];

const STATUS_LABEL = {
  available: "Open for booking",
  Full: "Full",
  ongoing: "In progress",
  completed: "Completed",
  stopped_early: "Ended early",
};

export default function DriverRidePanel({ ride, places = [], onChange }) {
  const driverId = getCurrentUserId();

  const [r, setR] = useState(ride);
  const [bookings, setBookings] = useState([]);
  const [stopId, setStopId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    setR(ride);
  }, [ride]);

  const closed = CLOSED.includes(r.status);
  const started = r.status === "ongoing";
  const approved = bookings.filter((b) => b.status === "approved");
  const anyUnpaid = approved.some((b) => b.payment_status !== "paid");

  const loadBookings = useCallback(() => {
    getRideBookings(r.ride_id, driverId)
      .then((res) => setBookings(res.data))
      .catch(() => {});
  }, [r.ride_id, driverId]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings, r.status]);

  // After the ride ends, keep checking for payments until everyone has paid.
  useEffect(() => {
    if (!closed || !anyUnpaid) return;
    const t = setInterval(loadBookings, 6000);
    return () => clearInterval(t);
  }, [closed, anyUnpaid, loadBookings]);

  const run = async (fn, okMsg) => {
    setBusy(true);
    setError("");
    setNote("");
    try {
      const res = await fn();
      setR(res.data);
      setNote(okMsg);
      if (onChange) onChange();
      loadBookings();
    } catch (err) {
      const d = err.response?.data?.detail;
      setError(typeof d === "string" ? d : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  const handleStart = () =>
    run(() => startRide(r.ride_id, driverId), "Ride started. Safe driving!");

  const handleEnd = () => {
    const early = stopId !== "";
    const stopName = places.find(
      (p) => String(p.place_id) === String(stopId)
    )?.place_name;

    const ok = window.confirm(
      early
        ? `End the ride early at ${stopName}? Passengers will only pay for the distance covered.`
        : "End the ride at the destination?"
    );
    if (!ok) return;

    run(
      () => endRide(r.ride_id, driverId, early ? Number(stopId) : null),
      early ? "Ride ended early. Fares adjusted." : "Ride completed."
    );
  };

  const handleConfirm = async (bookingId) => {
    setError("");
    try {
      await confirmPayment(bookingId, driverId);
      loadBookings();
    } catch (err) {
      const d = err.response?.data?.detail;
      setError(typeof d === "string" ? d : "Could not confirm payment.");
    }
  };

  const stopOptions = places.filter(
    (p) =>
      p.place_id !== r.source_place_id && p.place_id !== r.destination_place_id
  );

  const paymentLabel = (b) => {
    if (b.payment_status === "paid") return `Paid (${b.payment_method})`;
    if (b.payment_status === "awaiting_confirmation")
      return `Says paid by ${b.payment_method}`;
    return "Not paid yet";
  };

  return (
    <div className="panel">
      <div className="ride-meta">
        <span className={`chip status-${r.status}`}>
          {STATUS_LABEL[r.status] || r.status}
        </span>
        {r.vehicle_number && <span className="chip">🔖 {r.vehicle_number}</span>}
        {closed && r.final_price != null && (
          <span className="chip">Final fare ₹{r.final_price}</span>
        )}
      </div>

      {!closed && !started && (
        <button
          type="button"
          className="btn"
          disabled={busy}
          onClick={handleStart}
        >
          ▶ Start ride
        </button>
      )}

      {started && (
        <div className="end-box">
          <div className="field">
            <label>Where is the ride ending?</label>
            <select value={stopId} onChange={(e) => setStopId(e.target.value)}>
              <option value="">At the destination (complete ride)</option>
              {stopOptions.map((p) => (
                <option key={p.place_id} value={p.place_id}>
                  Stop early at {p.place_name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            className="btn btn-danger"
            disabled={busy}
            onClick={handleEnd}
          >
            ■ End ride
          </button>
        </div>
      )}

      {error && <p className="msg-error">{error}</p>}
      {note && <p className="msg-success">{note}</p>}

      {approved.length > 0 && (
        <ul className="passenger-list">
          {approved.map((b) => (
            <li key={b.booking_id}>
              <span>
                <strong>{b.passenger_name}</strong> · {b.seats_booked} seat
                {b.seats_booked === 1 ? "" : "s"}
                {b.passenger_phone && (
                  <>
                    {" "}
                    · <a href={`tel:${b.passenger_phone}`}>{b.passenger_phone}</a>
                  </>
                )}
                <br />
                <span className="card-meta">
                  ₹{closed ? b.final_fare : b.fare_share}
                  {closed && ` · ${paymentLabel(b)}`}
                </span>
              </span>

              {closed && b.payment_status !== "paid" && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => handleConfirm(b.booking_id)}
                >
                  ✓ {b.payment_method === "online" ? "Online" : "Cash"} received
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}