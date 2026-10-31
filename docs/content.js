// All guest-facing content (texts, prices in USD, photos). Source: House Book, Oct 2026.
//
// experience: id, cat (dining|wellness|farm|luxor|evenings), name, text, img (or null),
//   label, meta, action (reserve|join|arrange|ask), dept (see config.js),
//   pricing: none | flat {amount, cap} | perGuest {amount} | from {amount} | free,
//   times?, terms?, doc? (id from `documents`)
window.HOUSE_BOOK = {
  house: {
    name: "Al Moudira",
    whatsappDisplay: "+20 122 3251 307",
    email: "reservations@moudira.com",
    address: "Al Moudira Hotel, Luxor West Bank, Hager El Dabayah 85836, Egypt",
    checkIn: "15:00",
    checkOut: "12:00",
    replyPromise: "The front office replies at any hour. Always a person.",
    welcome: "Write to us here at any hour, about anything at all."
  },

  filters: [
    { id: "dining", name: "Dining" },
    { id: "wellness", name: "Wellness" },
    { id: "farm", name: "Farm" },
    { id: "luxor", name: "Luxor" },
    { id: "evenings", name: "Evenings" }
  ],

  experiences: [
    // Dining
    { id: "mfk", cat: "dining", name: "Moudira Farm Kitchen", img: "w_farm_kitchen.jpg",
      text: "Our chef cooks over a wood fire, from what was picked that day.",
      label: "Few tables", meta: "Lunch, and dinner from 18:00",
      action: "reserve", dept: "restaurants", pricing: { type: "none" },
      times: ["13:00", "13:30", "18:00", "19:00", "19:30", "20:30"] },
    { id: "dining-room", cat: "dining", name: "The Ottoman Hall and Courtyard", img: "w_ottoman.jpg",
      text: "Breakfast under the trees, dinner by candlelight in the Courtyard.",
      label: "Breakfast and dinner", meta: "06:00 to 10:30 · 18:00 to 22:30",
      action: "reserve", dept: "restaurants", pricing: { type: "none" },
      times: ["19:00", "19:30", "20:00", "20:30", "21:00"] },
    { id: "khan", cat: "dining", name: "Khan Al Moudira", img: "w_plates.jpg",
      text: "Egyptian and Lebanese, inside or among the palms.",
      label: "Lunch and dinner", meta: "12:00 to 22:00",
      action: "reserve", dept: "restaurants", pricing: { type: "none" },
      times: ["12:30", "13:30", "19:00", "19:30", "20:00", "21:00"] },
    { id: "il-forno", cat: "dining", name: "Il Forno", img: null,
      text: "Neapolitan-style pizzas from the wood-fired oven, with vegetables from the farm. Pizza is also brought to the pool.",
      label: "Lunch and dinner", meta: "12:00 to 21:00, April to November; 12:00 to 16:00, December to March",
      action: "reserve", dept: "restaurants", pricing: { type: "none" },
      times: ["12:30", "13:30", "18:30", "19:30", "20:00"] },
    { id: "pool-pavilion", cat: "dining", name: "The Pool Pavilion", img: "w_pool_pergola.jpg",
      text: "A Mediterranean lunch by the water.",
      label: "Lunch", meta: "12:00 to 17:00",
      action: "reserve", dept: "restaurants", pricing: { type: "none" },
      times: ["12:30", "13:00", "13:30", "14:00", "15:00"] },

    // Wellness
    { id: "signature-massage", cat: "wellness", name: "Signature massage", img: "w_massage.jpg",
      text: "The spa's own massage, by therapists from Kerala.",
      label: "110 USD", meta: "60 minutes",
      action: "reserve", dept: "spa", pricing: { type: "perGuest", amount: 110 },
      times: ["10:00", "12:00", "15:00", "17:00", "18:30"] },
    { id: "nile-package", cat: "wellness", name: "The Nile Package", img: "w_marble.jpg",
      text: "Head massage, body scrub, hammam and foot massage.",
      label: "165 USD", meta: "120 minutes",
      action: "reserve", dept: "spa", pricing: { type: "perGuest", amount: 165 },
      times: ["10:00", "14:00", "16:30"] },
    { id: "nervous-system", cat: "wellness", name: "Nervous system regulation", img: "w_calm_room.jpg",
      text: "Massage, sound and craniosacral, for calm and sleep.",
      label: "210 USD", meta: "90 minutes",
      action: "reserve", dept: "spa", pricing: { type: "perGuest", amount: 210 },
      times: ["11:00", "16:00", "18:00"] },
    { id: "yoga", cat: "wellness", name: "Yoga in the garden", img: "w_garden.jpg",
      text: "Daily, in the garden.",
      label: "With our compliments", meta: "15:00",
      action: "join", dept: "spa", pricing: { type: "free" } },
    { id: "primal-moves", cat: "wellness", name: "Primal Moves", img: "w_pool_garden.jpg",
      text: "Movement by the pool, Monday to Friday.",
      label: "With our compliments", meta: "17:00",
      action: "join", dept: "spa", pricing: { type: "free" } },

    // Farm
    { id: "farm-tour", cat: "farm", name: "The farm and workshop tour", img: "w_farm_walk.jpg",
      text: "The fields, the animals and the makers at work.",
      label: "With our compliments", meta: "Daily, 09:30 · 90 minutes",
      action: "join", dept: "farm", pricing: { type: "free" } },
    { id: "pottery", cat: "farm", name: "Pottery", img: "w_pottery.jpg",
      text: "At the wheel one day, painted the next.",
      label: "Watch freely", meta: "Make your own piece over two days",
      action: "ask", dept: "farm", pricing: { type: "none" } },
    { id: "carriage", cat: "farm", name: "The horse and carriage", img: "w_farm_animals.jpg",
      text: "Our own carriage through the farm, up to four.",
      label: "150 USD", meta: "1.5 hours",
      action: "reserve", dept: "farm", pricing: { type: "flat", amount: 150, cap: 4 },
      times: ["08:00", "10:00", "16:00"] },
    { id: "stable-rides", cat: "farm", name: "Stable rides", img: null,
      text: "Horses from the house stable, for a ride through the farm.",   // TODO: line, duration, price
      label: "On request", meta: "Tell us when you would like to ride",
      action: "ask", dept: "farm", pricing: { type: "none" } },
    { id: "little-explorers", cat: "farm", name: "Little Explorers", img: "w_farm_ostrich.jpg",
      text: "The animals, pottery, paper or pizza, for children.",
      label: "From 25 USD a child", meta: "Crafts 70, a pizza class 25",
      action: "reserve", dept: "farm", pricing: { type: "from", amount: 25 },
      guestsLabel: "Children" },
    { id: "tailoring", cat: "farm", name: "The tailoring atelier", img: null,
      text: "Our master tailor cuts shirts and suits in Egyptian cotton and linen.",
      label: "Shirt from 100 USD", meta: "09:30 to 18:00",
      action: "reserve", dept: "farm", pricing: { type: "from", amount: 100 },
      times: ["10:00", "12:00", "15:00", "17:00"] },

    // Luxor
    { id: "balloon", cat: "luxor", name: "The balloon at sunrise", img: "w_dawn_fields.jpg",
      text: "Forty five minutes over the West Bank, back for breakfast.",
      label: "280 USD for two", meta: "About 2.5 hours",
      action: "reserve", dept: "concierge", pricing: { type: "flat", amount: 280, cap: 2 },
      sheetLine: "Pickup about 05:10, confirmed the evening before",
      terms: "Free to change until 16:00 the day before. We will ask for a passport copy for each guest.",
      fromTomorrow: true },
    { id: "west-bank", cat: "luxor", name: "The West Bank", img: "west_bank_temple.jpg",
      text: "Hatshepsut, the Valley of the Kings, Medinet Habu, with your guide.",
      label: "260 USD for two", meta: "4 to 5 hours, tickets extra",
      action: "arrange", dept: "concierge", pricing: { type: "flat", amount: 260, cap: 2 },
      times: ["07:00", "08:00", "14:00"] },
    { id: "karnak", cat: "luxor", name: "Karnak and Luxor Temple", img: "karnak_columns.jpg",
      text: "The great temples of the East Bank, with your guide.",
      label: "250 USD for two", meta: "4 to 5 hours, tickets extra",
      action: "arrange", dept: "concierge", pricing: { type: "flat", amount: 250, cap: 2 },
      times: ["07:00", "08:00", "14:00"] },
    { id: "felucca", cat: "luxor", name: "A felucca at sunset", img: "w_felucca.jpg",
      text: "An hour under sail, leaving before dusk.",
      label: "130 USD for two", meta: "1 hour",
      action: "reserve", dept: "concierge", pricing: { type: "flat", amount: 130, cap: 2 },
      sheetLine: "Leaves at 16:45, an hour on the Nile", times: ["16:45"] },
    { id: "classic-car", cat: "luxor", name: "The village, by classic car", img: "w_classic_car.jpg",
      text: "Two unhurried hours of local life, with a driver.",
      label: "From 200 USD", meta: "2 hours",
      action: "arrange", dept: "transport", pricing: { type: "from", amount: 200 },
      times: ["09:00", "15:00"] },
    { id: "cycling-tour", cat: "luxor", name: "The cycling tour", img: null,
      text: "By mountain bike to the Valley of the Kings.",               // TODO: line, duration, price
      label: "On request", meta: "Tell us your day",
      action: "ask", dept: "concierge", pricing: { type: "none" } },

    // Evenings
    { id: "nile-sunset", cat: "evenings", name: "A private sunset on the Nile", img: "w_nile_deck.jpg",
      text: "An hour on the river at 17:30, a picnic and a waiter.",
      label: "200 USD for two", meta: "1 hour",
      action: "arrange", dept: "concierge", pricing: { type: "flat", amount: 200, cap: 2 }, times: ["17:30"] },
    { id: "celebration", cat: "evenings", name: "A celebration", img: "w_dessert.jpg",
      text: "A cake and the room dressed for a birthday or anniversary.",
      label: "With our compliments", meta: "A day's notice",
      action: "arrange", dept: "frontoffice", pricing: { type: "free" },
      notePrompt: "Whose celebration, and what we should write" },
    { id: "set-nefru", cat: "evenings", name: "Set Nefru", img: "w_dahabiya_dusk.jpg",
      text: "Our own dahabiya, restored, for up to eight guests.",
      label: "On request", meta: "Three to eight days on the Nile",
      action: "ask", dept: "concierge", pricing: { type: "none" } },
    { id: "karnak-night", cat: "evenings", name: "Karnak by night", img: null,
      text: "The sound and light show, with transfer.",
      label: "90 USD for up to three", meta: "About 3 hours",
      action: "arrange", dept: "concierge", pricing: { type: "flat", amount: 90, cap: 3 } }
  ],

  // private dining venues (TODO: lines + capacities from Thomas)
  privateDining: {
    intro: "A table anywhere at the house, for two or for fifty. Venue from 150 USD.",
    venues: [
      { id: "pd-pool-pavilion", name: "The Pool Pavilion" },
      { id: "pd-shahrazade", name: "Shahrazade" },
      { id: "pd-winter-garden", name: "The Winter Garden" },
      { id: "pd-farm-tent", name: "The Farm Tent" },
      { id: "pd-event-hall", name: "The Event Hall" },
      { id: "pd-winter-terrace", name: "The Winter Terrace" },
      { id: "pd-garden-patio", name: "The Garden Patio" },
      { id: "pd-khan-rooftop", name: "The Khan Al Moudira Rooftop" },
      { id: "pd-gazebo", name: "The Gazebo" },
      { id: "pd-ottoman-hall", name: "The Ottoman Hall and Courtyard" },
      { id: "pd-conference-room", name: "The Conference Room" },
      { id: "pd-villa-zeina", name: "Dinner in Villa Zeina" },
      { id: "pd-villa-nubia", name: "Dinner in Villa Nubia" },
      { id: "pd-villa-casbah", name: "Dinner in Villa Casbah" },
      { id: "pd-beit-al-fananeen", name: "Dinner in Beit Al Fananeen" },
      { id: "pd-owners-loft", name: "Dinner in the Owners' Loft" },
      { id: "pd-louxor-loft", name: "Dinner in the Louxor Loft" }
    ]
    // optional per venue: line, capacity
  },

  // documents: files/<id>/p01.jpg... + files/<id>.pdf; ratio = page w/h
  documents: {
    "the-farm": { name: "The Farm", line: "Our booklet, to read before or after the walk", pages: 12, ratio: 1400 / 1120, cover: "files/the-farm/p01.jpg" },
    "guest-directory": { name: "The Guest Directory", line: "The guide to the house", pages: 21, ratio: 1100 / 1557, cover: "files/guest-directory/p01.jpg" }
    // TODO: menus, spa, excursions etc. from Randa
  },
  // where documents show up
  placements: {
    farmTop: "the-farm",
    house: "guest-directory",
    privateDining: null,
    menus: {},                      // restaurant id -> doc id
    sections: { wellness: [], luxor: [], evenings: [] }
  },

  // farm map + key (from the Farm booklet)
  map: {
    img: "farm_map.jpg", ratio: 1584 / 1605,
    key: ["Reception", "The tailor", "Bookbinding", "The pottery", "The paper studio", "Weaving and kilim", "Upholstery", "Antiques",
          "The animals", "The artisans' row", "The dovecotes", "The poultry", "Khayamiya", "The Stable", "Moudira Farm Kitchen"]
  },

  priceNote: "Prices in US dollars, excluding service and taxes, charged to your room.",
  taxNote: "Excluding service and taxes.",

  // daily programme; weekdays 0 = Sun
  daily: [
    { time: "09:30", name: "The farm walk", sub: "From reception" },
    { time: "15:00", name: "Yoga in the garden", sub: "Join as you are" },
    { time: "17:00", name: "Primal Moves", sub: "By the pool, Monday to Friday", weekdays: [1, 2, 3, 4, 5] }
  ],

  // Today suggestion: before `until` -> beforeSunset, after -> evening (skips booked ones)
  suggestions: {
    until: "16:45",
    beforeSunset: [
      { id: "felucca", kicker: "Before sunset", line: "Leaves at 16:45, an hour on the Nile. 130 USD for two." },
      { id: "nile-sunset", kicker: "Before sunset", line: "A private hour on the river at 17:30, with a picnic. 200 USD for two." }
    ],
    evening: [
      { id: "mfk", kicker: "For this evening", line: "Our chef cooks over a wood fire, from what was picked that day. Few tables." },
      { id: "khan", kicker: "For this evening", line: "Egyptian and Lebanese, inside or among the palms, until 22:00." },
      { id: "dining-room", kicker: "For this evening", line: "Dinner by candlelight in the Courtyard, 18:00 to 22:30." }
    ]
  },

  arrival: {
    cars: [
      { id: "sedan", name: "Sedan, up to 2", price: 50 },
      { id: "minivan", name: "Minivan, up to 6", price: 75 },
      { id: "classic", name: "Classic car", price: 120 },
      { id: "none", name: "No car, thank you", price: 0 }
    ],
    fillFirst: [
      { id: "balloon", name: "The balloon at sunrise", sub: "About 2.5 hours", price: "280 USD for two", img: "w_dawn_fields.jpg" },
      { id: "signature-massage", name: "An evening at the spa", sub: "Best reserved a day ahead", price: "From 110 USD", img: "w_massage.jpg" },
      { id: "mfk", name: "Dinner at the Farm Kitchen", sub: "Few tables", price: "", img: "w_farm_kitchen.jpg" }
    ]
  },

  lastDay: {
    lateCheckOut: { name: "Stay until 18:00", time: "18:00", sub: "The pool, the spa and your room", price: 80 },
    airportCar: { name: "A car to the airport", sub: "We suggest leaving 3 hours before an international flight", price: 50 }
  },

  // room service menus (TODO: Thomas to confirm which restaurants deliver)
  roomService: {
    note: "US dollars, excluding service and taxes. Tell us of any allergy and the kitchen will confirm.",
    restaurants: [
      { id: "in-room", name: "In room dining", line: "At any hour, in about 20 minutes.",
        items: [
      { id: "egyptian-meal", name: "The daily Egyptian meal", price: 21 },
      { id: "soup", name: "Soup of the day", price: 7 },
      { id: "pasta", name: "Pasta", price: 13, label: "13 to 14.50" },
      { id: "burger", name: "The Moudira beef burger", price: 21.5 },
      { id: "falafel", name: "Falafel sandwich", price: 15 },
      { id: "sweets", name: "Oriental sweets", price: 8.5 }
    ] }
    ]
  },

  housekeeping: [
    { id: "towels", name: "Fresh towels" },
    { id: "pillow", name: "Pillow or blanket", sub: "From the pillow menu" },
    { id: "laundry", name: "Laundry", sub: "In by 10:00, back today" },
    { id: "turndown", name: "Turndown", sub: "18:00 to 21:00" },
    { id: "hk-other", name: "Other request", sub: "A short note", note: true }
  ],
  repairs: [
    { id: "ac", name: "Air conditioning" },
    { id: "power", name: "Lights and power" },
    { id: "water", name: "Water" },
    { id: "other", name: "Something else", sub: "A short note", note: true }
  ],

  askChips: ["A table tonight", "A car", "Late check out", "The spa"],
  // the automated assistant on Ask (bot.js)
  bot: {
    who: "Assistant · automated",
    note: "Automatic answers from the hotel's own information. The front office replies on WhatsApp at any hour, always a person.",
    intro: "Hello {name}. I'm the Al Moudira assistant, an automated helper, not a person. Tap a topic, or type a question. For anything else, a person at the front office replies on WhatsApp.",
    fallback: "I'm not sure about that one, and I'd rather not guess. The front office can help: a person replies on WhatsApp, at any hour."
  },

  practical: [
    ["Reception", "24 hours · dial 0"],
    ["Breakfast", "06:00 to 10:30"],
    ["Dinner", "18:00 to 22:30"],
    ["In room dining", "24 hours · dial 5"],
    ["The spa", "09:00 to 20:00 · dial 3"],
    ["The pool", "07:00 to sunset"],
    ["The gym", "24 hours"],
    ["Wifi", "Al Moudira, no password"],
    ["Shuttle to the souq", "09:30 and 15:30"],
    ["Check out", "12:00"]
  ],
  practicalNote: "For anything at any hour, dial 0, or WhatsApp +20 122 3251 307.",

  addresses: [
    { name: "The clinic", value: "09:00 to 17:00 · dial 303" },
    { name: "Luxor International Hospital", value: "+20 95 227 7194", tel: "+20952277194" },
    { name: "El Karnak International Hospital", value: "+20 95 237 2025", tel: "+20952372025" },
    { name: "Luxor Medical Center", value: "+20 95 228 4092", tel: "+20952284092" },
    { name: "Tourist police", value: "126", tel: "126" },
    { name: "Ambulance", value: "123", tel: "123" }
  ],
  addressesNote: "In urgent need, at any hour, dial 0. A doctor can come to your room outside clinic hours.",

  team: [],   // hidden until Florian confirms names
  teamNote: "Al Moudira is run by a team from the villages around it. You will meet them by name here soon.",

  photos: ["w_facade.jpg", "w_pool_pergola.jpg", "w_dining_room.jpg", "w_library.jpg", "w_suite.jpg",
           "w_arch_court.jpg", "w_garden_table.jpg", "w_felucca.jpg", "w_harvest.jpg"],

  // press (egyptbeyond.com/press)
  press: [
    { name: "Financial Times, How To Spend It", url: "https://www.moudira.com/_files/ugd/2ad5ec_b3c9f0b125714c8b9f180529d7f9e5dd.pdf" },
    { name: "The Telegraph", url: "https://www.telegraph.co.uk/travel/destinations/africa/egypt/hotels/al-moudira-hotel/" },
    { name: "Vogue", url: "https://www.vogue.com/slideshow/melissa-morris-egypt-vacation-diary" },
    { name: "Condé Nast Traveller" },
    { name: "Condé Nast Traveller Middle East", url: "https://www.cntravellerme.com/story/cruising-the-nile-on-one-of-the-last-remaining-dahabiyas" },
    { name: "AD Italia", url: "https://www.ad-italia.it/gallery/al-moudira-hotel-nilo-luxor-egitto-turismo/" },
    { name: "The World of Interiors", url: "https://www.moudira.com/_files/ugd/2ad5ec_1cc55518ae2d4e64b82de17c52877c99.pdf" },
    { name: "Emirates Woman" },
    { name: "Near + Far" },
    { name: "Cabana" },
    { name: "Yolo" },
    { name: "SBLS" }
  ],
  distinctions: "Relais & Châteaux, two MICHELIN Keys",
  brochures: []
};
