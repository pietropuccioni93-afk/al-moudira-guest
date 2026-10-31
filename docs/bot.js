// House Book assistant. Runs on the phone only: matches the guest's question
// against content.js and answers from it. Nothing is sent anywhere.
// Anything it can't answer goes to the front office on WhatsApp.
(function () {
  const H = window.HOUSE_BOOK, C = window.APP_CONFIG;

  // ---- text matching
  const STOP = new Set("a an the and or of to in on at for by with from is are be do does can could would will i im me my we us our you your it its this that what whats when where which who how there here please hi any some about get have has like want need tell know".split(" "));

  // other words guests use -> the word we index on (includes a few FR / IT / DE / ES)
  const SYN = {
    breakfasts: "breakfast", brekkie: "breakfast", "petit dejeuner": "breakfast", colazione: "breakfast", fruhstuck: "breakfast", fruehstueck: "breakfast", desayuno: "breakfast",
    diner: "dinner", cena: "dinner", abendessen: "dinner", supper: "dinner",
    dejeuner: "lunch", pranzo: "lunch", mittagessen: "lunch", almuerzo: "lunch",
    "wi fi": "wifi", wlan: "wifi", internet: "wifi", password: "wifi", network: "wifi",
    swim: "pool", swimming: "pool", piscine: "pool", piscina: "pool", schwimmbad: "pool",
    fitness: "gym", workout: "gym", exercise: "gym", palestra: "gym",
    massaggio: "massage", masaje: "massage", treatment: "spa", treatments: "spa", hammam: "spa", wellness: "spa",
    towel: "towels", serviette: "towels", asciugamano: "towels", handtuch: "towels", toalla: "towels",
    checkout: "check out", "check-out": "check out", leave: "check out", leaving: "check out", depart: "check out", departure: "check out", partenza: "check out",
    checkin: "check in", "check-in": "check in", arrive: "check in", arrival: "check in",
    doctor: "doctor", medecin: "doctor", medico: "doctor", arzt: "doctor", sick: "doctor", ill: "doctor", fever: "doctor", pain: "doctor", headache: "doctor", vomiting: "doctor", diarrhea: "doctor", diarrhoea: "doctor", stomach: "doctor", dizzy: "doctor", bleeding: "doctor", unwell: "doctor", hurt: "doctor", injured: "doctor", pharmacy: "doctor", medicine: "doctor",
    restaurant: "eat", restaurants: "eat", food: "eat", hungry: "eat", meal: "eat", ristorante: "eat",
    airport: "airport", flight: "airport", aeroporto: "airport", aeroport: "airport", flughafen: "airport",
    taxi: "car", driver: "car", transfer: "car", pickup: "car",
    kid: "children", kids: "children", child: "children", bambini: "children", enfants: "children", kinder: "children",
    boat: "nile", sail: "felucca", sailing: "felucca",
    temple: "temples", tour: "excursion", tours: "excursion", trip: "excursion", sightseeing: "excursion", excursions: "excursion",
    pizza: "pizza", pizzas: "pizza", "hot air balloon": "balloon", "hot air": "balloon", ballon: "balloon", mongolfiera: "balloon",
    vegan: "diet", vegetarian: "diet", vegetarien: "diet", gluten: "diet", allergy: "diet", allergic: "diet", allergies: "diet", halal: "diet", kosher: "diet", lactose: "diet", nut: "diet", nuts: "diet", celiac: "diet", coeliac: "diet", intolerance: "diet",
    cancel: "change", cancellation: "change", reschedule: "change", modify: "change", postpone: "change", "move my": "change", "move our": "change", "move the": "change",
    ac: "air conditioning", aircon: "air conditioning", "too hot": "air conditioning", "too cold": "air conditioning", "hot water": "water", heating: "air conditioning",
    privata: "private", privee: "private", privat: "private", privado: "private", chek: "check", cheque: "check",
    bulb: "lights", light: "lights", electricity: "power", shower: "water", toilet: "water", leak: "water",
    shopping: "souq", market: "souq", souk: "souq", bazaar: "souq", souvenir: "souq", souvenirs: "souq",
    bday: "birthday", anniversary: "celebration", birthday: "celebration", honeymoon: "celebration",
    bike: "cycling", bicycle: "cycling", horse: "horses", riding: "horses", "horse ride": "horses", "horseback": "horses",
    tonight: "evening", night: "evening", "should we do": "things to do", "should i do": "things to do",
    safe: "safety", dangerous: "safety", danger: "safety",
    cost: "price", costs: "price", much: "price", expensive: "price", prices: "price",
  };

  function norm(s) {
    return (" " + String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9:]+/g, " ") + " ").replace(/\s+/g, " ");
  }
  function stem(w) { return w.length > 4 && w.endsWith("s") && !w.endsWith("ss") ? w.slice(0, -1) : w; }
  function prep(s) {
    let t = norm(s);
    for (const k of Object.keys(SYN)) if (k.includes(" ") || k.includes("-")) t = t.split(" " + norm(k).trim() + " ").join(" " + SYN[k] + " ");
    return t.trim().split(" ").filter(Boolean).map((w) => SYN[w] || w).join(" ").split(" ").map(stem);
  }
  function edits(a, b) { // edit distance with swaps (towles -> towels), capped
    if (Math.abs(a.length - b.length) > 2) return 3;
    const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
    for (let j = 1; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
    return d[a.length][b.length];
  }
  // typo fix: an unknown word becomes the closest word we know (never these everyday words)
  const COMMON = new Set("wife husband partner friend friends son daughter baby mother father mum dad family people person guest guests night nights week weeks time hour hours minute minutes tomorrow yesterday morning afternoon tonight dog dogs cat pet pets smoke smoking weather rain wind sun cash card cards money euro euros dollar dollars pound visa amex currency exchange atm tip tips table tables mastercard bag bags luggage please thanks love good great nice open opens close closes closed late early now soon later fine okay sure ready wait name names photo photos picture sell buy gift gifts life wine beer drink drinks bar coffee tea milk ice sugar salt bread rice fish meat chicken lamb beef fruit cake".split(" "));
  let VOCAB = null;
  function fix(words) {
    return words.map((w) => {
      if (w.length < 5 || VOCAB.has(w) || STOP.has(w) || COMMON.has(w) || /\d/.test(w)) return w;
      const max = w.length >= 10 ? 2 : 1; let best = null, bd = max + 1;
      for (const v of VOCAB) { if (v.length < 4) continue; const d = edits(w, v); if (d < bd) { best = v; bd = d; } }
      return best || w;
    });
  }
  function score(all, words, keys) {
    const joined = " " + all.join(" ") + " ";
    let s = 0;
    for (const [key, w] of keys) {
      const k = prep(key);
      if (!k.length) continue;
      if (k.length > 1) { if (joined.includes(" " + k.join(" ") + " ")) s += w * 1.5; continue; }
      if (words.includes(k[0])) s += w;
    }
    return s;
  }
  const nameKeys = (name, w) => prep(name).filter((x) => !STOP.has(x) && x.length > 2).map((x) => [x, w]);
  // two words of a name side by side ("farm kitchen", "pool pavilion") count much more than one
  const pairKeys = (name) => { const t = prep(name).filter((x) => !STOP.has(x)); return t.slice(1).map((x, i) => [t[i] + " " + x, 3]); };

  // ---- helpers to write answers from the House Book
  const usd = (n) => n + " USD";
  const exps = Object.fromEntries(H.experiences.map((e) => [e.id, e]));
  const practical = Object.fromEntries(H.practical);
  const hasPrice = (s) => /\d/.test(s || "") && /USD/.test(s || "");
  function expLine(e) {
    const bits = [e.text, [e.meta, e.label].filter(Boolean).join(". ")];
    if (e.times && e.times.length) bits.push((e.times.length === 1 ? "At " : "Times: ") + e.times.join(", "));
    if (e.terms) bits.push(e.terms);
    let t = e.name + ". " + bits.filter(Boolean).map((b) => b.replace(/\.$/, "")).join(". ") + ".";
    if (hasPrice(e.label)) t += " " + H.taxNote;
    return t;
  }
  const verb = (e) => ({ reserve: "Reserve", join: "Join", arrange: "Arrange", ask: "Ask" })[e.action] || "Reserve";
  const expAnswer = (e) => ({ text: expLine(e), actions: [{ label: verb(e), act: "reserve", id: e.id }] });
  const list = (arr) => arr.map((x) => "· " + x).join("\n");
  const weekdayAtHouse = () => ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(new Intl.DateTimeFormat("en-GB", { timeZone: C.timeZone, weekday: "short" }).format(new Date()));

  // ---- what the assistant knows. Each answer: id, short label (shown as a button), keys [phrase, weight], answer(words, ctx)
  const T = [], BY = {};
  const add = (id, label, keys, answer) => { const t = { id, label, keys, answer }; T.push(t); BY[id] = t; };

  add("breakfast", "Breakfast times", [["breakfast", 3]], (w) => {
    const incl = ["included", "include", "free", "complimentary", "extra", "price", "pay"].some((x) => w.includes(x));
    return { text: "Breakfast is " + practical["Breakfast"] + ", under the trees at " + exps["dining-room"].name + "." + (incl ? " Whether it is included depends on your booking: the front office can confirm." : ""), wa: incl, actions: [{ label: "Reserve a table", act: "reserve", id: "dining-room" }] };
  });
  add("restaurants", "Our restaurants", [["dinner", 2], ["eat", 2], ["lunch", 2], ["hungry", 1], ["table", 2]], (w) => {
    const din = H.experiences.filter((e) => e.cat === "dining");
    const lunchOnly = w.includes("lunch") && !w.includes("dinner");
    const pick = lunchOnly ? din.filter((e) => /lunch/i.test(e.label + e.meta)) : din;
    return { text: (lunchOnly ? "For lunch:\n" : "Our restaurants:\n") + list(pick.map((e) => e.name + ": " + e.meta)) + "\n\nIn room dining is " + practical["In room dining"] + ".", actions: [{ label: "Reserve a table", href: "#/discover/dining" }] };
  });
  add("roomservice", "In room dining", [["room service", 3], ["in room dining", 3], ["menu", 1.5], ["order", 1.5], ["deliver", 1.5]], () => {
    const r = H.roomService.restaurants[0];
    return { text: r.name + ": " + r.line + " (" + practical["In room dining"] + ")\n\n" + list(r.items.map((i) => i.name + ": " + (i.label || i.price) + " USD")) + "\n\n" + H.taxNote, actions: [{ label: "Order", href: "#/room/dining/" + r.id }] };
  });
  add("diet", "Allergies and diets", [["diet", 4]], () => ({ text: "Tell us of any allergy or diet and the kitchen will confirm what they can prepare. The front office will pass it on.", wa: true }));
  add("private", "Private dining", [["private", 2.5], ["private dinner", 3], ["private dining", 3], ["event", 2], ["wedding", 2.5], ["group", 1.5], ["party", 2]], () => ({ text: H.privateDining.intro + "\n\nPlaces include " + H.privateDining.venues.slice(0, 5).map((v) => v.name).join(", ") + ", and more.", actions: [{ label: "Private dining", href: "#/discover/dining" }] }));
  add("spa", "The spa", [["spa", 3], ["massage", 2.5]], () => ({ text: "The spa is open " + practical["The spa"] + ".\n\n" + list(H.experiences.filter((e) => e.cat === "wellness" && e.action === "reserve").map((e) => e.name + ": " + e.meta + ", " + e.label)) + "\n\n" + H.taxNote, actions: [{ label: "See the spa", href: "#/discover/wellness" }] }));
  add("pool", "The pool", [["pool", 3]], () => ({ text: "The pool is open " + practical["The pool"] + ". " + exps["pool-pavilion"].name + " serves lunch by the water, " + exps["pool-pavilion"].meta + ".", actions: [{ label: "Reserve lunch", act: "reserve", id: "pool-pavilion" }] }));
  add("gym", "The gym", [["gym", 3]], () => ({ text: "The gym is open " + practical["The gym"] + "." }));
  add("today", "What's on today", [["what can we do", 3], ["what can i do", 3], ["what to do", 3], ["things to do", 3], ["activities", 2.5], ["activity", 2.5], ["programme", 3], ["program", 3], ["schedule", 2], ["today", 1], ["recommend", 2.5], ["suggest", 2.5], ["bored", 2]], () => {
    const wd = weekdayAtHouse();
    const today = H.daily.filter((d) => !d.weekdays || d.weekdays.includes(wd));
    return { text: "Today at the house:\n" + list(today.map((d) => d.time + "  " + d.name + " (" + d.sub.toLowerCase() + ")")) + "\n\nBefore sunset, " + exps["felucca"].name.toLowerCase() + " leaves at " + exps["felucca"].times[0] + ". For more, see Discover.", actions: [{ label: "Discover", href: "#/discover/all" }] };
  });
  add("evening", "This evening", [["evening", 2]], () => ({ text: "For this evening:\n" + list(H.experiences.filter((e) => e.cat === "evenings").map((e) => e.name + ": " + e.label)) + "\n\nDinner is " + practical["Dinner"] + ".", actions: [{ label: "See Evenings", href: "#/discover/evenings" }] }));
  add("excursions", "Excursions in Luxor", [["excursion", 2.5], ["temples", 2.5], ["valley of the kings", 3], ["sightseeing", 2.5], ["guide", 2], ["luxor", 1.5]], () => ({ text: "From the house, with your guide:\n" + list(H.experiences.filter((e) => e.cat === "luxor").map((e) => e.name + ": " + e.label + (e.meta ? ", " + e.meta : ""))) + "\n\n" + H.taxNote, actions: [{ label: "See Luxor", href: "#/discover/luxor" }] }));
  add("children", "For children", [["children", 3], ["family", 1.5]], () => expAnswer(exps["little-explorers"]));
  add("airport", "Cars and the airport", [["airport", 3], ["car", 2]], () => {
    const A = H.lastDay.airportCar;
    return { text: "A car to the airport is " + usd(A.price) + ". " + A.sub + ".\n\nCars to meet you on arrival:\n" + list(H.arrival.cars.filter((c) => c.price).map((c) => c.name + ": " + usd(c.price))) + "\n\n" + H.taxNote, actions: [{ label: "Reserve the airport car", act: "simple", kind: "airport" }] };
  });
  add("shuttle", "Shuttle to the souq", [["shuttle", 3], ["souq", 3], ["bus", 1.5]], () => ({ text: "The shuttle to the souq leaves at " + practical["Shuttle to the souq"] + "." }));
  add("safety", "Advice on Luxor", [["safety", 4]], () => ({ text: "The front office knows Luxor well and can advise you. A person replies on WhatsApp, at any hour.", wa: true }));
  add("housekeeping", "Housekeeping", [["towels", 3.5], ["pillow", 3], ["blanket", 3], ["laundry", 3], ["turndown", 3], ["housekeeping", 3], ["clean", 2], ["cleaning", 2], ["room", 0.5]], (w) => {
    const hk = H.housekeeping.filter((h) => !h.note);
    const hit = hk.find((h) => prep(h.name).some((x) => w.includes(x)) || (h.sub && prep(h.sub).some((x) => w.includes(x) && !STOP.has(x) && x.length > 3)));
    return { text: (hit ? hit.name + (hit.sub ? ": " + hit.sub.toLowerCase() : "") + ". " : list(hk.map((h) => h.name + (h.sub ? ": " + h.sub.toLowerCase() : ""))) + "\n\n") + "Housekeeping is one tap away in Room.", actions: [{ label: "Housekeeping", href: "#/room/care" }] };
  });
  add("repairs", "Something not working", [["air conditioning", 3], ["power", 2.5], ["lights", 2.5], ["water", 2], ["broken", 2.5], ["not working", 3], ["repair", 3], ["fix", 2]], () => ({ text: "Sorry about that. Tell us in Room and someone will come.", actions: [{ label: "Report it", href: "#/room/care" }] }));
  add("doctor", "Doctors and emergencies", [["doctor", 3], ["clinic", 3], ["hospital", 3], ["emergency", 4], ["police", 3], ["ambulance", 4], ["urgent", 3], ["help", 0.8]], () => ({
    text: "If it is urgent, dial 0 for reception at any hour, or 123 for an ambulance.\n\n" + list(H.addresses.map((a) => a.name + ": " + a.value)),
    actions: H.addresses.filter((a) => a.tel).slice(0, 2).map((a) => ({ label: "Call " + a.name.replace(/^The /, ""), tel: a.tel })).concat([{ label: "All numbers", href: "#/house/addresses" }]) }));
  add("checkout", "Check out and late check out", [["check out", 3], ["late check out", 2], ["late", 1]], () => {
    const L = H.lastDay.lateCheckOut;
    return { text: "Check out is at " + H.house.checkOut + ". You can stay until " + L.time + " for " + usd(L.price) + " (" + L.sub.toLowerCase() + "). " + H.taxNote, actions: [{ label: "Request late check out", act: "simple", kind: "late" }] };
  });
  add("checkin", "Check in", [["check in", 3], ["early", 1]], () => ({ text: "Check in is from " + H.house.checkIn + ". If you arrive earlier, let the front office know and they will do what they can.", wa: true }));
  add("wifi", "The wifi", [["wifi", 3]], () => ({ text: "The wifi network is " + practical["Wifi"].replace(", no password", "") + ", with no password." }));
  add("reception", "Reception", [["reception", 2.5], ["front desk", 2.5], ["concierge", 2], ["phone", 1.5], ["call", 1], ["dial", 1.5]], () => ({ text: "Reception is open " + practical["Reception"] + ". From outside, reception is on WhatsApp at " + H.house.whatsappDisplay + "." }));
  add("weather", "The weather today", [["weather", 3], ["temperature", 3], ["hot", 2], ["cold", 2], ["warm", 2], ["rain", 3], ["forecast", 3], ["sunny", 2], ["wind", 2], ["sunrise", 2.5], ["sunset", 2.5], ["degrees", 2.5], ["jacket", 2], ["meteo", 3], ["wetter", 3]], (w, ctx) => {
    const now = [ctx.temp ? "It is " + ctx.temp + " at the house right now." : "", ctx.rise ? "Sunrise is at " + ctx.rise + " and sunset at " + ctx.set + "." : ""].filter(Boolean).join(" ");
    const ahead = ["rain", "forecast", "tomorrow", "week", "later"].some((x) => w.includes(x));
    return { text: (now || "I don't have the weather just now.") + (ahead ? " I only have the weather right now, not a forecast. The front office can tell you more." : ""), wa: ahead };
  });
  add("change", "Change or cancel a booking", [["change", 3.5]], () => ({ text: "To change or cancel something you have booked, message the front office and they will sort it out.", wa: true }));
  add("map", "The farm map", [["map", 3], ["directions", 2]], () => ({ text: "The farm map shows the house, the workshops and the animals, with a numbered key.", actions: [{ label: "Open the map", href: "#/house/map" }] }));
  add("contact", "Address and contact", [["address", 3], ["email", 2.5], ["contact", 2]], () => ({ text: H.house.address + "\nEmail: " + H.house.email + "\nWhatsApp: " + H.house.whatsappDisplay }));
  add("directory", "The Guest Directory", [["guide book", 2], ["directory", 3], ["information", 1.5], ["brochure", 2]], () => ({ text: "The Guest Directory has everything about the house.", actions: [{ label: "Open the Guest Directory", href: "#/doc/guest-directory" }] }));

  // every experience, by its own name
  const EXTRA = { felucca: [["felucca", 3], ["nile", 1.5], ["watch the sunset", 2.5], ["see the sunset", 2.5]], balloon: [["balloon", 3], ["sunrise", 1.5]], "west-bank": [["valley of the kings", 2], ["hatshepsut", 3], ["west bank", 2.5]], karnak: [["karnak", 2], ["luxor temple", 3], ["east bank", 2.5]], "karnak-night": [["sound and light", 3], ["show", 1.5]], "il-forno": [["pizza", 3], ["forno", 3]], "dining-room": [["courtyard", 3], ["ottoman", 3]], khan: [["khan", 3]], "pool-pavilion": [["pavilion", 3]], mfk: [["kitchen", 1.5]], "stable-rides": [["horses", 3]], "cycling-tour": [["cycling", 3]], carriage: [["carriage", 3]], celebration: [["celebration", 3], ["cake", 2.5]], "set-nefru": [["dahabiya", 3], ["cruise", 2.5]], yoga: [["yoga", 3]], pottery: [["pottery", 3]], tailoring: [["tailor", 3], ["suit", 2], ["shirt", 2]], "nile-sunset": [["picnic", 2.5], ["private sunset", 3], ["watch the sunset", 2.5], ["see the sunset", 2.5]], "classic-car": [["classic car", 3], ["village", 2]], "farm-tour": [["farm", 1.5], ["farm tour", 3], ["animals", 2], ["workshop", 2]], "signature-massage": [["signature", 2]], "little-explorers": [["children", 1]] };
  for (const e of H.experiences) add("x:" + e.id, e.name, nameKeys(e.name, 1.2).concat(pairKeys(e.name), EXTRA[e.id] || []), () => expAnswer(e));

  // topics a guest can tap, each with its questions
  const TOPICS = [
    { id: "dining", label: "Dining", items: ["breakfast", "restaurants", "x:mfk", "x:khan", "x:il-forno", "x:pool-pavilion", "x:dining-room", "roomservice", "private", "diet"] },
    { id: "spa", label: "Spa and wellness", items: ["spa", "x:signature-massage", "x:nile-package", "x:nervous-system", "x:yoga", "x:primal-moves", "pool", "gym"] },
    { id: "todo", label: "Things to do", items: ["today", "evening", "x:balloon", "x:felucca", "x:nile-sunset", "x:west-bank", "x:karnak", "x:karnak-night", "x:farm-tour", "children", "x:celebration"] },
    { id: "around", label: "Getting around", items: ["airport", "shuttle", "x:classic-car", "excursions", "safety"] },
    { id: "room", label: "Your room", items: ["housekeeping", "roomservice", "repairs", "wifi", "checkout"] },
    { id: "health", label: "Health and safety", items: ["doctor", "diet", "safety"] },
    { id: "practical", label: "Practical", items: ["checkin", "checkout", "wifi", "reception", "weather", "change", "contact", "directory", "map"] },
  ];

  // small talk and honesty about being a bot
  const IDENTITY = ["are you a bot", "speak to someone", "talk to someone", "speak to a", "talk to a", "speak with", "manager", "are you human", "are you real", "a person", "a robot", "an ai", "real person", "human", "bot", "robot"];
  const SMALL = [
    [["thank", "thanks", "thank you", "grazie", "merci", "danke", "gracias", "shukran", "cheers"], "You're welcome. Enjoy your stay."],
    [["hello", "hey", "hi", "hiya", "good morning", "good afternoon", "good evening", "ciao", "bonjour", "hallo", "hola", "salam"], "Hello. Tap a topic below, or ask me about the house, for example breakfast times or what is on today."],
  ];
  const has = (raw, keys) => keys.some((k) => raw.includes(" " + norm(k).trim() + " "));
  const opt = (t) => ({ id: t.id, label: t.label });

  function byId(id, ctx) {
    const t = BY[id]; if (!t) return null;
    return Object.assign({ type: "answer", id, label: t.label }, t.answer([], ctx || {}));
  }

  // ---- wanting to book: "I'd like to go riding at nine", "table for two at 8 tomorrow"
  const BOOK = / (book|booking|reserve|reservation|would like|we d like|i d like|id like|want to|wanna|like to|can we|could we|can i|could i|arrange|sign (me|us) up|tomorrow|tonight|this evening|this afternoon|at \d|\d ?(am|pm)|at (one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)) /;
  const NUM = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12 };
  function wantedTime(raw, times) {
    // "at 8", "at nine", "at 19:30", "5pm", "9 am": a number alone ("for two") is not a time
    const m = raw.match(/ at (\d{1,2}|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)(?:[: ](\d{2}))? ?(am|pm|o clock)? /) || raw.match(/ (\d{1,2})(?:[: ](\d{2}))? ?(am|pm) /) || raw.match(/ (\d{1,2})[: ](\d{2}) /);
    if (!m || !times) return null;
    let h = NUM[m[1]] || +m[1]; const min = m[2] || "00";
    if (h > 23) return null;
    const ap = m[3];
    const cands = ap === "pm" && h < 12 ? [h + 12] : ap === "am" ? [h % 12] : h <= 12 ? [h, h + 12] : [h];
    return cands.map((x) => String(x).padStart(2, "0") + ":" + min).find((t) => times.includes(t)) || null;
  }
  function wantedGuests(raw) {
    const m = raw.match(/ (?:for|of|we are|there are|party of) (\d{1,2}|one|two|three|four|five|six|seven|eight|nine|ten)(?: of us| people| persons| guests| adults)? /);
    const n = m ? NUM[m[1]] || +m[1] : 0;
    return n >= 1 && n <= 20 ? n : 0;
  }
  function bookAnswer(e, q, raw) {
    const time = wantedTime(raw, e.times), guests = wantedGuests(raw), day = / tomorrow /.test(raw) ? "tomorrow" : "";
    const v = verb(e);
    const nm = /^(The|A) /.test(e.name) ? e.name.replace(/^(The|A) /, (x) => x.toLowerCase()) : e.name.split(" ").slice(1).every((x) => x === x.toLowerCase()) ? e.name[0].toLowerCase() + e.name.slice(1) : e.name;
    let text = "Happy to arrange " + nm + ". Tap " + v + (e.action === "ask" ? " and your request, with what you wrote, goes to the front office" : " to choose the day" + (e.times ? " and time" : "") + ", and your request goes to the front office") + ". They will confirm.";
    if (e.times && / (at \d|\d ?(am|pm)|at (one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)) /.test(raw) && !time) text += " The times offered are " + e.times.join(", ") + ".";
    return { type: "answer", id: "x:" + e.id, label: e.name, booking: true, text, actions: [{ label: v, act: "reserve", id: e.id, note: q, time, guests, day }] };
  }

  // typed question -> a sure answer (with "Not this?" options), a short choice, or "I don't know"
  function ask(q, ctx) {
    ctx = ctx || {};
    const raw = norm(q);
    if (!VOCAB) { VOCAB = new Set(); T.forEach((t) => t.keys.forEach(([k]) => prep(k).forEach((x) => VOCAB.add(x)))); H.map.key.forEach((k) => prep(k).forEach((x) => VOCAB.add(x))); }
    const all = fix(prep(q)), words = all.filter((w) => !STOP.has(w));
    const none = { type: "none", text: H.bot.fallback, wa: true };
    if (has(raw, IDENTITY)) return { type: "answer", id: "bot", text: "I'm an automated assistant, not a person. I answer from the House Book. For a person, tap Message the front office: someone replies on WhatsApp, at any hour.", wa: true };
    // things the House Book doesn't cover: say so rather than answer something nearby
    if (/ (dress code|what to wear|dog|dogs|pet|pets|smoking|smoke|lost|stolen|left my|forgot my|forgotten|hairdresser|barber|kids menu|children s menu|child menu) /.test(raw)) return none;
    // a message that is only a greeting or a thank you
    for (const [keys, text] of SMALL) { let rest = raw; keys.forEach((k) => { rest = rest.split(" " + norm(k).trim() + " ").join(" "); }); if (rest !== raw && !prep(rest).filter(Boolean).some((x) => !STOP.has(x) && !["there", "again", "much", "very", "so", "all", "everyone"].includes(x))) return { type: "answer", id: "small", text }; }
    if (words.includes("diet")) return Object.assign({ type: "answer", id: "diet" }, BY.diet.answer(words, ctx));
    if (words.includes("change")) return Object.assign({ type: "answer", id: "change" }, BY.change.answer(words, ctx));
    // "where is the pottery" -> its number on the farm map
    if (/ (where|find|directions|located|location) /.test(raw)) {
      const i = H.map.key.findIndex((k) => nameKeys(k, 1).some(([x]) => words.includes(x)));
      if (i >= 0) return { type: "answer", id: "map", text: H.map.key[i] + " is number " + (i + 1) + " on the farm map.", actions: [{ label: "Open the map", href: "#/house/map" }] };
    }
    const ranked = T.map((t) => ({ t, s: score(all, words, t.keys) })).filter((r) => r.s > 0).sort((a, b) => b.s - a.s);
    const top = ranked[0], next = ranked[1];
    // a guest who wants to book gets the booking, not the description again
    if (BOOK.test(raw)) {
      const sure = top && top.s >= 2 && top.t.id.startsWith("x:") && !(next && next.s >= 1.5 && top.s - next.s < 1);
      const last = ctx.lastId && ctx.lastId.startsWith("x:") ? ctx.lastId : null;
      // follow-up on what we were just talking about ("can we do 9am?")
      const follow = last && !sure;
      const id = follow ? last : sure ? top.t.id : null;
      if (id) return bookAnswer(exps[id.slice(2)], q, raw);
    }
    if (!top || top.s < 2) {
      for (const [keys, text] of SMALL) if (has(raw, keys)) return { type: "answer", id: "small", text };
      // a weak hint is still worth offering, but never as an answer
      const weak = ranked.filter((r) => r.s >= 1).slice(0, 3);
      return weak.length ? { type: "choices", text: "I'm not sure what you mean. Is it one of these?", options: weak.map((r) => opt(r.t)), wa: true } : none;
    }
    // close call between two different things: ask, don't guess
    if (next && next.s >= 1.5 && top.s - next.s < 1) {
      return { type: "choices", text: "Which of these do you mean?", options: ranked.filter((r) => r.s >= 1).slice(0, 3).map((r) => opt(r.t)), wa: true, score: top.s };
    }
    const a = Object.assign({ type: "answer", id: top.t.id, label: top.t.label, score: top.s }, top.t.answer(words, ctx));
    a.alts = ranked.slice(1).filter((r) => r.s >= 1.5).slice(0, 2).map((r) => opt(r.t));
    return a;
  }

  // kept for older callers and tests: plain answer text, matched = null when it doesn't know
  function answer(q, ctx) { const r = ask(q, ctx); return Object.assign({ matched: r.type === "none" ? null : r.type === "choices" ? "choices" : r.id }, r); }

  window.BOT = { ask, byId, answer, topics: TOPICS.map((t) => ({ id: t.id, label: t.label, options: t.items.filter((i) => BY[i]).map((i) => opt(BY[i])) })), _prep: prep };
})();
