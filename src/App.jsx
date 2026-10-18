import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import Signup from "./pages/Signup";
import Login from "./pages/Login";
import BookRide from "./pages/BookRide";
import CreateRide from "./pages/CreateRide";
import Approvals from "./pages/Approvals";
import MyBookings from "./pages/MyBookings";
import MyRides from "./pages/MyRides";
import { useAuthStatus, logout } from "./utils/auth";

function Navbar() {
  const loggedIn = useAuthStatus();
  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">
        <span className="route-dot" style={{ display: "inline-block" }} />
        Ride Sharing
      </Link>
      <div className="navbar-links">
        {loggedIn ? (
          <>
            <Link to="/book">Find a ride</Link>
            <Link to="/create-ride">Offer a ride</Link>
            <Link to="/approvals">Approvals</Link>
            <Link to="/my-bookings">My Bookings</Link>
            <Link to="/my-rides">My Rides</Link>
            <button
              className="btn-secondary"
              style={{ borderRadius: 6, padding: "0.4rem 0.8rem", cursor: "pointer" }}
              onClick={() => {
                logout();
                window.location.href = "/login";
              }}
            >
              Log out
            </button>
          </>
        ) : (
          <>
            <Link to="/signup">Sign up</Link>
            <Link to="/login">Log in</Link>
          </>
        )}
      </div>
    </nav>
  );
}

function Home() {
  const loggedIn = useAuthStatus();
  return (
    <div className="page">
      <h1>Get where you're going, split the way there.</h1>
      <p className="page-lead">
        {loggedIn
          ? "Find a ride, offer one, or check on your current bookings from the menu above."
          : "Sign up as a driver to offer rides, or a passenger to book a seat on one."}
      </p>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/login" element={<Login />} />
          <Route path="/book" element={<BookRide />} />
          <Route path="/create-ride" element={<CreateRide />} />
          <Route path="/approvals" element={<Approvals />} />
          <Route path="/my-bookings" element={<MyBookings />} />
          <Route path="/my-rides" element={<MyRides />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
