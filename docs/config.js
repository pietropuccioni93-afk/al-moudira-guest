// Settings
// mode: "whatsapp" (stage 1, requests go to reception on WhatsApp)
//       "live"     (stage 2, Cloudbeds via /api, see functions/)
window.APP_CONFIG = {
  mode: "whatsapp",

  // reception, no + or spaces
  whatsappNumber: "201223251307",

  timeZone: "Africa/Cairo",
  latitude: 25.7268,   // approx
  longitude: 32.6044,
  currency: "USD",

  apiBase: "/api",

  // Open-Meteo, no key needed
  showTemperature: true,

  // tab labels
  tabs: {
    today: "Today",
    discover: "Discover",
    room: "Room",
    ask: "Ask",
    house: "Al Moudira"
  },

  // departments + WhatsApp tags (check against Who Confirms What)
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
