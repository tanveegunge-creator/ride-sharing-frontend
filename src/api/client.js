import axios from "axios";

// Your FastAPI backend's base URL.
//const BASE_URL =
 // import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
const BASE_URL = "https://ride-sharing-t930.onrender.com";

const client = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// ================= AUTH =================
export const login = (email, password) =>
  client.post("/auth/login", { email, password });

// ================= USERS =================
export const createUser = (user) =>
  // user: { name, email, password, phone, role: "driver" | "passenger" }
  client.post("/users/", user);

// ================= PLACES =================
export const getPlaces = () => client.get("/places/");

export const createPlace = (place) =>
  // place: { place_name }
  client.post("/places/", place);

// ================= ROADS =================
export const getRoads = () => client.get("/roads/");

export const createRoad = (road) =>
  // road: { source_place_id, destination_place_id, distance }
  client.post("/roads/", road);

export const getShortestPath = (sourceId, destinationId) =>
  client.get("/roads/shortest-path/", {
    params: { source_id: sourceId, destination_id: destinationId },
  });

// ================= RIDES =================
export const getRides = () => client.get("/rides/");

export const getRide = (rideId) => client.get(`/rides/${rideId}`);

export const createRide = (ride) =>
  // ride: { driver_id, source_place_id, destination_place_id, departure_time, vehicle_type, total_seats }
  // NOTE: price is NOT sent — the backend calculates it from distance x rate.
  client.post("/rides/", ride);

// ================= BOOKINGS =================
export const getBookings = () => client.get("/bookings/");

export const getBooking = (bookingId) => client.get(`/bookings/${bookingId}`);

export const createBooking = (booking) =>
  // booking: { ride_id, passenger_id, seats_booked }
  client.post("/bookings/", booking);

export const getBookingApprovals = (bookingId) =>
  client.get(`/bookings/${bookingId}/approvals`);

export const approveBooking = (bookingId, approverBookingId) =>
  // Current backend version takes approver_booking_id in the body.
  // If/when you switch to the JWT-authenticated version, this call
  // simplifies to client.post(`/bookings/${bookingId}/approve`) with
  // an Authorization header instead — no body needed.
  client.post(`/bookings/${bookingId}/approve`, {
    approver_booking_id: approverBookingId,
  });

export const rejectBooking = (bookingId, approverBookingId) =>
  client.post(`/bookings/${bookingId}/reject`, {
    approver_booking_id: approverBookingId,
  });

// ================= PLACES: coordinates =================
export const updatePlaceLocation = (placeId, latitude, longitude) =>
  client.patch(`/places/${placeId}/location`, { latitude, longitude });

// ================= LIVE RIDE TRACKING =================
export const updateRideLocation = (rideId, latitude, longitude) =>
  client.put(`/rides/${rideId}/location`, { latitude, longitude });

export const getRideLocation = (rideId) =>
  client.get(`/rides/${rideId}/location`);

// Backend base URL as a ws(s):// URL, derived from BASE_URL so you don't
// have to keep a second env var in sync with it.
export const WS_BASE_URL = BASE_URL.replace(/^http/, "ws");

// ================= RIDE LIFECYCLE =================
export const startRide = (rideId, driverId) =>
  client.post(`/rides/${rideId}/start`, { driver_id: driverId });

export const endRide = (rideId, driverId, stoppedPlaceId = null) =>
  client.post(`/rides/${rideId}/end`, {
    driver_id: driverId,
    stopped_place_id: stoppedPlaceId,
  });

export const getRideBookings = (rideId, driverId) =>
  client.get(`/rides/${rideId}/bookings`, { params: { driver_id: driverId } });

// ================= PAYMENTS =================
export const payBooking = (bookingId, passengerId, method) =>
  client.post(`/bookings/${bookingId}/pay`, { passenger_id: passengerId, method });

export const getPaymentInfo = (bookingId, passengerId) =>
  client.get(`/bookings/${bookingId}/payment-info`, {
    params: { passenger_id: passengerId },
  });

export const confirmPayment = (bookingId, driverId) =>
  client.post(`/bookings/${bookingId}/confirm-payment`, { driver_id: driverId });

export default client;
