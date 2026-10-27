/*
 * Al Moudira guest web app: settings.
 *
 * mode
 *   "demo"      Sample guest and data, nothing leaves the phone. For showing the app.
 *   "whatsapp"  Stage 1. No guest data is stored. Guests type their name and room;
 *               every request opens WhatsApp to reception, tagged for the department.
 *   "live"      Stage 2. Sign in and stay data come from Cloudbeds through /api
 *               (see functions/api). Requests are recorded on the booking.
 */
window.APP_CONFIG = {
  mode: "demo",   // set to "whatsapp" for launch on guest.moudira.com

  // Reception WhatsApp, international format without + or spaces (+20 122 3251 307)
  whatsappNumber: "201223251307",

  // The house
  timeZone: "Africa/Cairo",
  latitude: 25.7268,   // Al Moudira, Luxor West Bank (approximate)
  longitude: 32.6044,
  currency: "USD",

  apiBase: "/api",

  // Live temperature from Open-Meteo (free, no key). Set to false to hide it.
  showTemperature: true,

  // Tab names. Change here only; the rest of the app follows.
  tabs: {
    today: "Today",
    discover: "Discover",
    room: "Room",
    ask: "Ask",
    house: "Al Moudira"
  },

  /*
   * Who confirms what. Each request is tagged with one of these departments.
   * To align with Thomas's "Who Confirms What" before launch.
   */
  departments: {
    frontoffice: { name: "Front office", tag: "FRONT OFFICE" },
    concierge:   { name: "Concierge", tag: "CONCIERGE" },
    restaurants: { name: "Restaurants", tag: "RESTAURANTS" },
    spa:         { name: "Spa", tag: "SPA" },
    farm:        { name: "Farm and workshops", tag: "FARM" },
    dining:      { name: "In room dining", tag: "ROOM SERVICE" },
    housekeeping:{ name: "Housekeeping", tag: "HOUSEKEEPING" },
    maintenance: { name: "Maintenance", tag: "MAINTENANCE" },
    transport:   { name: "Transport", tag: "TRANSPORT" }
  }
};

/* Preview another mode without changing the file: add ?mode=demo or ?mode=whatsapp to the address.
 * The choice is remembered on that phone until ?mode=default. */
(function () {
  try {
    const q = new URLSearchParams(location.search).get("mode");
    if (q === "default") localStorage.removeItem("am_mode");
    else if (q === "demo" || q === "whatsapp") localStorage.setItem("am_mode", q);
    const m = localStorage.getItem("am_mode");
    if (m === "demo" || m === "whatsapp") window.APP_CONFIG.mode = m;
  } catch (e) { /* private mode: keep the default */ }
})();
