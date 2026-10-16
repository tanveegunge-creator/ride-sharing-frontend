import { useCallback, useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

import { getBooking, payBooking, getPaymentInfo } from "../api/client";
import { getCurrentUserId } from "../utils/auth";

const CLOSED = ["completed", "stopped_early"];

export default function BookingDriverAndPayment({ booking }) {
  const passengerId = getCurrentUserId();

  const [b, setB] = useState(booking);
  const [info, setInfo] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setB(booking);
  }, [booking]);

  const closed = CLOSED.includes(b.ride_status);
  const approved = b.status === "approved";
  const paid = b.payment_status === "paid";
  const amount = b.final_fare ?? b.fare_share;

  const refresh = useCallback(() => {
    getBooking(b.booking_id)
      .then((res) => setB(res.data))
      .catch(() => {});
  }, [b.booking_id]);

  // Keep ride status / payment status fresh until everything is settled.
  useEffect(() => {
    if (!approved || paid) return;
    const t = setInterval(refresh, 8000);
    return () => clearInterval(t);
  }, [approved, paid, refresh]);

  // Fetch the UPI link when the passenger has chosen online payment.
  useEffect(() => {
    if (closed && approved && !paid && b.payment_method === "online") {
      getPaymentInfo(b.booking_id, passengerId)
        .then((res) => setInfo(res.data))
        .catch((err) => {
          const d = err.response?.data?.detail;
          setError(typeof d === "string" ? d : "Could not load payment details.");
        });
    }
  }, [closed, approved, paid, b.payment_method, b.booking_id, passengerId]);

  const choose = async (method) => {
    setBusy(true);
    setError("");
    try {
      const res = await payBooking(b.booking_id, passengerId, method);
      setB(res.data);
      if (method === "cash") setInfo(null);
    } catch (err) {
      const d = err.response?.data?.detail;
      setError(typeof d === "string" ? d : "Could not save your choice.");
    } finally {
      setBusy(false);
    }
  };

  if (!approved) return null;

  return (
    <div className="panel">
      <div className="driver-card">
        <div>
          <div className="panel-label">Driver</div>
          <strong>{b.driver_name || "—"}</strong>
        </div>
        <div>
          <div className="panel-label">Vehicle number</div>
          <strong>{b.vehicle_number || "—"}</strong>
        </div>
        <div>
          <div className="panel-label">Contact</div>
          {b.driver_phone ? (
            <a href={`tel:${b.driver_phone}`}>📞 {b.driver_phone}</a>
          ) : (
            <strong>—</strong>
          )}
        </div>
      </div>

      {b.ride_status === "ongoing" && (
        <p className="msg-success">● Your ride is in progress.</p>
      )}

      {b.ride_status === "stopped_early" && (
        <p className="msg-error" style={{ color: "var(--warning)" }}>
          The driver ended this ride early. Your fare has been adjusted to the
          distance actually covered.
        </p>
      )}

      {closed && (
        <div className="pay-box">
          <h3>Payment</h3>
          <p>
            Amount due: <span className="card-price">₹{amount}</span>
          </p>

          {paid ? (
            <p className="msg-success">
              ✓ Paid by {b.payment_method} — thank you!
            </p>
          ) : (
            <>
              <div className="pay-options">
                <button
                  type="button"
                  className={`btn ${b.payment_method === "cash" ? "" : "btn-secondary"}`}
                  disabled={busy}
                  onClick={() => choose("cash")}
                >
                  💵 Cash
                </button>
                <button
                  type="button"
                  className={`btn ${b.payment_method === "online" ? "" : "btn-secondary"}`}
                  disabled={busy}
                  onClick={() => choose("online")}
                >
                  📱 Online (UPI)
                </button>
              </div>

              {b.payment_method === "cash" && (
                <p className="hint">
                  Hand ₹{amount} to the driver. They'll mark it received.
                </p>
              )}

              {b.payment_method === "online" && info && (
                <div className="qr-box">
                  <div className="qr-frame">
                    <QRCodeSVG value={info.upi_link} size={190} />
                  </div>
                  <div>
                    <p>
                      Scan with any UPI app to pay{" "}
                      <strong>₹{info.amount}</strong> to{" "}
                      <strong>{info.payee_name}</strong>
                    </p>
                    <p className="hint">{info.upi_id}</p>
                    <a className="btn btn-secondary" href={info.upi_link}>
                      Open UPI app
                    </a>
                  </div>
                </div>
              )}

              {b.payment_method && (
                <p className="hint">
                  Waiting for the driver to confirm the payment…
                </p>
              )}
            </>
          )}

          {error && <p className="msg-error">{error}</p>}
        </div>
      )}
    </div>
  );
}
