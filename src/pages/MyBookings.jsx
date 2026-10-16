import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getBookings, getRides, getPlaces } from "../api/client";
import { getCurrentUserId, isLoggedIn } from "../utils/auth";
import RideMap from "../components/RideMap";
import BookingDriverAndPayment from "../components/BookingDriverAndPayment";

export default function MyBookings() {
  const navigate = useNavigate();

  const [myBookings, setMyBookings] = useState([]);
  const [rides, setRides] = useState([]);
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const placeName = (id) => places.find((p) => p.place_id === id)?.place_name || `Place ${id}`;
  const placeObj = (id) => places.find((p) => p.place_id === id) || null;
  const rideFor = (rideId) => rides.find((r) => r.ride_id === rideId);

  const load = useCallback(() => {
    const myUserId = getCurrentUserId();
    if (!myUserId) {
      setError("Could not identify your account — please log in again.");
      setLoading(false);
      return Promise.resolve();
    }

    return Promise.all([getBookings(), getRides(), getPlaces()])
      .then(([bookingsRes, ridesRes, placesRes]) => {
        setMyBookings(bookingsRes.data.filter((b) => b.passenger_id === myUserId));
        setRides(ridesRes.data);
        setPlaces(placesRes.data);
        setError("");
      })
      .catch(() => setError("Could not load your bookings. Is the backend running?"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!isLoggedIn()) {
      navigate("/login");
      return;
    }
    load();
  }, [navigate, load]);

  // Quiet refresh so approvals, ride start/end and payments show up.
  useEffect(() => {
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, [load]);

  if (loading) return <div className="page"><p>Loading...</p></div>;

  return (
    <div className="page page-wide">
      <h2>My bookings</h2>

      {error && <p className="msg-error">{error}</p>}

      {myBookings.length === 0 ? (
        <p className="empty-state">You haven't booked any rides yet.</p>
      ) : (
        myBookings.map((booking) => {
          const ride = rideFor(booking.ride_id);
          const closed = ride && (ride.status === "completed" || ride.status === "stopped_early");

          return (
            <div key={booking.booking_id} className="card">
              {ride ? (
                <div className="route">
                  <div className="route-line">
                    <div className="route-dot" />
                    <div className="route-connector" />
                    <div className="route-dot end" />
                  </div>
                  <div className="route-places">
                    <span>{placeName(ride.source_place_id)}</span>
                    <span>{placeName(ride.destination_place_id)}
                      <span className="sub">
                        {new Date(ride.departure_time).toLocaleString()} · {ride.vehicle_type}
                      </span>
                    </span>
                  </div>
                </div>
              ) : (
                <h3>Ride #{booking.ride_id}</h3>
              )}

              <p className="card-meta">Seats booked: {booking.seats_booked}</p>

              <p>
                <span className={`status ${booking.status}`}>
                  <span className="status-dot" />
                  {booking.status}
                </span>
              </p>

              {booking.status === "approved" && !closed && booking.fare_share != null && (
                <p className="card-price">
                  ₹{booking.fare_share}
                  <span className="card-price-sub">your share of the fare</span>
                </p>
              )}
              {booking.status === "pending" && (
                <p className="card-meta" style={{ color: "var(--warning)" }}>
                  Waiting on approval from existing passengers.
                </p>
              )}
              {booking.status === "rejected" && (
                <p className="msg-error">This request was declined.</p>
              )}
              {booking.status === "cancelled" && (
                <p className="card-meta">
                  This request was cancelled because the ride started before it was approved.
                </p>
              )}

              {/* Driver name / vehicle number / phone + payment (cash or online QR) */}
              <BookingDriverAndPayment booking={booking} />

              {booking.status === "approved" && ride && !closed && (
                <RideMap
                  rideId={ride.ride_id}
                  sourcePlace={placeObj(ride.source_place_id)}
                  destinationPlace={placeObj(ride.destination_place_id)}
                />
              )}
            </div>
          );
        })
      )}
    </div>
  );
}