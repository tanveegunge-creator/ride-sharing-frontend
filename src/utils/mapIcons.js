import L from "leaflet";

export const COLORS = { from: "#4caf6d", to: "#e8624a", idle: "#e8a33d" };

export const pin = (color) =>
  L.divIcon({
    className: "pin-wrap",
    html: `<span class="pin" style="--c:${color}"></span>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -12],
  });

export const carIcon = L.divIcon({
  className: "pin-wrap",
  html: `<span class="car">🚗</span>`,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
  popupAnchor: [0, -16],
});

export const TILES = {
  url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
  subdomains: "abcd",
  attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
};