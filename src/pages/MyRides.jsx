import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getRides, getBookings, getPlaces } from "../api/client";
import { getCurrentUserId, isLoggedIn } from "../utils/auth";
import ShareLocationToggle from "../components/ShareLocationToggle";
import RideMap from "../components/RideMap";
import DriverRidePanel from "../components/DriverRidePanel";

export default function MyRides() {
  const navigate = useNavigate();

  const [myRides, setMyRides] = useState([]);
  const [bookingsByRide, setBookingsByRide] = useState({});
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const placeName = (id) => places.find((p) => p.place_id === id)?.place_name || `Place ${id}`;
  const placeObj = (id) => places.find((p) => p.place_id === id) || null;

  const load = useCallback(() => {
    const myUserId = getCurrentUserId();
    if (!myUserId) {
      setError("Could not identify your account — please log in again.");
      setLoading(false);
      return Promise.resolve();
    }

    return Promise.all([getRides(), getBookings(), getPlaces()])
      .then(([ridesRes, bookingsRes, placesRes]) => {
        const mine = ridesRes.data.filter((r) => r.driver_id === myUserId);
        setMyRides(mine);
        setPlaces(placesRes.data);

        const grouped = {};
        for (const ride of mine) {
          grouped[ride.ride_id] = bookingsRes.data.filter((b) => b.ride_id === ride.ride_id);
        }
        setBookingsByRide(grouped);
        setError("");
      })
      .catch(() => setError("Could not load your rides. Is the backend running?"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!isLoggedIn()) {
      navigate("/login");
      return;
    }
    load();
  }, [navigate, load]);

  // Quiet refresh so new booking requests / status changes show up.
  useEffect(() => {
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, [load]);

  if (loading) return <div className="page"><p>Loading...</p></div>;

  return (
    <div className="page page-wide">
      <h2>My rides</h2>

      {error && <p className="msg-error">{error}</p>}

      {myRides.length === 0 ? (
        <p className="empty-state">You haven't created any rides yet.</p>
      ) : (
        myRides.map((ride) => {
          // Approved passengers are listed (with names + payments) inside DriverRidePanel;
          // here we only list requests that are still waiting or didn't go through.
          const others = (bookingsByRide[ride.ride_id] || []).filter(
            (b) => b.status !== "approved"
          );
          const closed = ride.status === "completed" || ride.status === "stopped_early";
          const ongoing = ride.status === "ongoing";

          return (
            <div key={ride.ride_id} className="card">
              <div className="route">
                <div className="route-line">
                  <div className="route-dot" />
                  <div className="route-connector" />
                  <div className="route-dot end" />
                </div>
                <div className="route-places">
                  <span>{placeName(ride.source_place_id)}</span>
                  <span>{placeName(ride.destination_place_id)}
                    <span className="sub">{new Date(ride.departure_time).toLocaleString()} · {ride.vehicle_type}</span>
                  </span>
                </div>
              </div>

              <p className="card-meta">
                {ride.total_seats - ride.available_seats}/{ride.total_seats} seats filled
                {ride.vehicle_number ? ` · ${ride.vehicle_number}` : ""}
              </p>
              <p className="card-price">
                ₹{closed && ride.final_price != null ? ride.final_price : ride.price}
                <span className="card-price-sub">
                  {ride.status === "stopped_early" ? "final fare (ended early)" : "total fare"}
                </span>
              </p>

              {/* Start / End ride, passenger list, payment confirmation */}
              <DriverRidePanel ride={ride} places={places} onChange={load} />

              {others.length > 0 && (
                <ul className="passenger-list">
                  {others.map((b) => (
                    <li key={b.booking_id}>
                      <span>Passenger #{b.passenger_id} · {b.seats_booked} seat(s)</span>
                      <span className={`status ${b.status}`}>
                        <span className="status-dot" />
                        {b.status}
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              {/* Location sharing only makes sense while the ride is in progress */}
              {ongoing && <ShareLocationToggle rideId={ride.ride_id} />}
              {!closed && (
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