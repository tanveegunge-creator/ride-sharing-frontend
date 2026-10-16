import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getBookings,
  getBookingApprovals,
  getRides,
  getPlaces,
  approveBooking,
  rejectBooking,
} from "../api/client";
import { getCurrentUserId, isLoggedIn } from "../utils/auth";

export default function Approvals() {
  const navigate = useNavigate();

  const [pendingForMe, setPendingForMe] = useState([]);
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const placeName = (id) => places.find((p) => p.place_id === id)?.place_name || `Place ${id}`;

  const loadPendingApprovals = async () => {
    setLoading(true);
    setError("");
    const myUserId = getCurrentUserId();
    if (!myUserId) {
      setError("Could not identify your account — please log in again.");
      setLoading(false);
      return;
    }

    try {
      const [bookingsRes, ridesRes, placesRes] = await Promise.all([
        getBookings(),
        getRides(),
        getPlaces(),
      ]);
      const allBookings = bookingsRes.data;
      const allRides = ridesRes.data;
      setPlaces(placesRes.data);

      const myApprovedBookings = allBookings.filter(
        (b) => b.passenger_id === myUserId && b.status === "approved"
      );
      const myRideIds = new Set(myApprovedBookings.map((b) => b.ride_id));
      const candidatePending = allBookings.filter(
        (b) => b.status === "pending" && myRideIds.has(b.ride_id)
      );

      const results = [];
      for (const pendingBooking of candidatePending) {
        const approvalsRes = await getBookingApprovals(pendingBooking.booking_id);
        const myApproval = approvalsRes.data.find((a) =>
          myApprovedBookings.some(
            (mb) => mb.booking_id === a.approver_booking_id && a.decision === "pending"
          )
        );
        if (myApproval) {
          const ride = allRides.find((r) => r.ride_id === pendingBooking.ride_id);
          results.push({ booking: pendingBooking, myApproverBookingId: myApproval.approver_booking_id, ride });
        }
      }
      setPendingForMe(results);
    } catch {
      setError("Could not load approvals. Is the backend running?");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isLoggedIn()) {
      navigate("/login");
      return;
    }
    loadPendingApprovals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  const handleDecision = async (bookingId, myApproverBookingId, decision) => {
    setMessage("");
    setError("");
    try {
      if (decision === "approved") {
        await approveBooking(bookingId, myApproverBookingId);
        setMessage("Approved — the fare has been re-split among everyone on the ride.");
      } else {
        await rejectBooking(bookingId, myApproverBookingId);
        setMessage("Rejected — the request was declined and their seat was released.");
      }
      loadPendingApprovals();
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Could not record your decision.");
    }
  };

  if (loading) return <div className="page"><p>Loading...</p></div>;

  return (
    <div className="page page-wide">
      <h2>Approvals</h2>
      <p className="page-lead">Requests from people who want to join a ride you're already on.</p>

      {error && <p className="msg-error">{error}</p>}
      {message && <p className="msg-success">{message}</p>}

      {pendingForMe.length === 0 ? (
        <p className="empty-state">Nothing waiting on your approval right now.</p>
      ) : (
        pendingForMe.map(({ booking, myApproverBookingId, ride }) => (
          <div key={booking.booking_id} className="card">
            <p>
              <strong>Passenger #{booking.passenger_id}</strong> wants to join your ride
              {ride && <> — {placeName(ride.source_place_id)} to {placeName(ride.destination_place_id)}</>}
            </p>
            <p className="card-meta">{booking.seats_booked} seat(s) requested</p>

            <div className="btn-row">
              <button onClick={() => handleDecision(booking.booking_id, myApproverBookingId, "approved")} className="btn">
                Approve
              </button>
              <button onClick={() => handleDecision(booking.booking_id, myApproverBookingId, "rejected")} className="btn-danger" style={{ borderRadius: 6, padding: "0.6rem 1.1rem" }}>
                Reject
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}