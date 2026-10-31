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
    cancel: "change", cancellation: "change", reschedule: "change", modify: "change", move: "change", postpone: "change",
    ac: "air conditioning", aircon: "air conditioning", "too hot": "air conditioning", "too cold": "air conditioning", "hot water": "water", heating: "air conditioning",
    privata: "private", privee: "private", privat: "private", privado: "private", chek: "check", cheque: "check",
    bulb: "lights", light: "lights", electricity: "power", shower: "water", toilet: "water", leak: "water",
    shopping: "souq", market: "souq", souk: "souq", bazaar: "souq", souvenir: "souq", souvenirs: "souq",
    bday: "birthday", anniversary: "celebration", birthday: "celebration", honeymoon: "celebration",
    bike: "cycling", bicycle: "cycling", horse: "horses", riding: "horses", "horse ride": "horses", "horseback": "horses",
    tonight: "evening", night: "evening", "should we do": "things to do", "should i do": "things to do", "can we do": "things to do", "can i do": "things to do",
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
  const COMMON = new Set("wife husband partner friend friends son daughter baby mother father mum dad family people person guest guests night nights week weeks time hour hours minute minutes tomorrow yesterday morning afternoon tonight dog dogs cat pet pets smoke smoking weather rain wind sun cash card cards money euro euros dollar dollars pound visa amex currency exchange atm tip tips mastercard bag bags luggage please thanks love good great nice open opens close closes closed late early now soon later fine okay sure ready wait name names photo photos picture sell buy gift gifts life wine beer drink drinks bar coffee tea milk ice sugar salt bread rice fish meat chicken lamb beef fruit cake".split(" "));
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

  // ---- what the assistant knows. keys: [phrase, weight]
  const T = [];
  const add = (keys, answer) => T.push({ keys, answer });

  add([["breakfast", 3]], (w) => {
    const incl = ["included", "include", "free", "complimentary", "extra", "price", "pay"].some((x) => w.includes(x));
    return { text: "Breakfast is " + practical["Breakfast"] + ", under the trees at " + exps["dining-room"].name + "." + (incl ? " Whether it is included depends on your booking: the front office can confirm." : ""), wa: incl, actions: [{ label: "See the restaurants", href: "#/discover/dining" }] };
  });
  add([["dinner", 2], ["eat", 1.5], ["lunch", 2], ["hungry", 1]], (w) => {
    const din = H.experiences.filter((e) => e.cat === "dining");
    const lunchOnly = w.includes("lunch") && !w.includes("dinner");
    const pick = lunchOnly ? din.filter((e) => /lunch/i.test(e.label + e.meta)) : din;
    return { text: (lunchOnly ? "For lunch:\n" : "Our restaurants:\n") + list(pick.map((e) => e.name + ": " + e.meta)) + "\n\nIn room dining is " + practical["In room dining"] + ".", actions: [{ label: "Reserve a table", href: "#/discover/dining" }] };
  });
  add([["wifi", 3]], () => ({ text: "The wifi network is " + practical["Wifi"].replace(", no password", "") + ", with no password." }));
  add([["pool", 3]], () => ({ text: "The pool is open " + practical["The pool"] + ". " + exps["pool-pavilion"].name + " serves lunch by the water, " + exps["pool-pavilion"].meta + ".", actions: [{ label: "Reserve lunch", act: "reserve", id: "pool-pavilion" }] }));
  add([["gym", 3]], () => ({ text: "The gym is open " + practical["The gym"] + "." }));
  add([["reception", 2.5], ["front desk", 2.5], ["concierge", 2], ["phone", 1.5], ["call", 1], ["dial", 1.5]], () => ({ text: "Reception is open " + practical["Reception"] + ". From outside, reception is on WhatsApp at " + H.house.whatsappDisplay + "." }));
  add([["spa", 3], ["massage", 2.5]], () => ({ text: "The spa is open " + practical["The spa"] + ".\n\n" + list(H.experiences.filter((e) => e.cat === "wellness" && e.action === "reserve").map((e) => e.name + ": " + e.meta + ", " + e.label)) + "\n\n" + H.taxNote, actions: [{ label: "See the spa", href: "#/discover/wellness" }] }));
  add([["shuttle", 3], ["souq", 3], ["bus", 1.5]], () => ({ text: "The shuttle to the souq leaves at " + practical["Shuttle to the souq"] + "." }));
  add([["check out", 3], ["late check out", 2], ["late", 1]], () => {
    const L = H.lastDay.lateCheckOut;
    return { text: "Check out is at " + H.house.checkOut + ". You can stay until " + L.time + " for " + usd(L.price) + " (" + L.sub.toLowerCase() + "). " + H.taxNote, actions: [{ label: "Request late check out", act: "simple", kind: "late" }] };
  });
  add([["check in", 3], ["early", 1]], () => ({ text: "Check in is from " + H.house.checkIn + ". If you arrive earlier, let the front office know and they will do what they can.", wa: true }));
  add([["airport", 3], ["car", 2]], () => {
    const A = H.lastDay.airportCar;
    return { text: "A car to the airport is " + usd(A.price) + ". " + A.sub + ".\n\nCars to meet you:\n" + list(H.arrival.cars.filter((c) => c.price).map((c) => c.name + ": " + usd(c.price))) + "\n\n" + H.taxNote, actions: [{ label: "Reserve the airport car", act: "simple", kind: "airport" }] };
  });
  add([["doctor", 3], ["clinic", 3], ["hospital", 3], ["emergency", 4], ["police", 3], ["ambulance", 4], ["urgent", 3], ["help", 0.8]], () => ({
    text: "If it is urgent, dial 0 for reception at any hour, or 123 for an ambulance.\n\n" + list(H.addresses.map((a) => a.name + ": " + a.value)),
    actions: H.addresses.filter((a) => a.tel).slice(0, 2).map((a) => ({ label: "Call " + a.name.replace(/^The /, ""), tel: a.tel })).concat([{ label: "All numbers", href: "#/house/addresses" }]) }));
  add([["towels", 3.5], ["pillow", 3], ["blanket", 3], ["laundry", 3], ["turndown", 3], ["housekeeping", 3], ["clean", 2], ["cleaning", 2], ["room", 0.5]], (w) => {
    const hk = H.housekeeping.filter((h) => !h.note);
    const hit = hk.find((h) => prep(h.name).some((x) => w.includes(x)) || (h.sub && prep(h.sub).some((x) => w.includes(x) && !STOP.has(x) && x.length > 3)));
    return { text: (hit ? hit.name + (hit.sub ? ": " + hit.sub.toLowerCase() : "") + ". " : "") + "Housekeeping is one tap away in Room.", actions: [{ label: "Housekeeping", href: "#/room/care" }] };
  });
  add([["air conditioning", 3], ["power", 2.5], ["lights", 2.5], ["water", 2], ["broken", 2.5], ["not working", 3], ["repair", 3], ["fix", 2]], () => ({ text: "Sorry about that. Tell us in Room and someone will come.", actions: [{ label: "Report it", href: "#/room/care" }] }));
  add([["room service", 3], ["in room dining", 3], ["menu", 1.5], ["order", 1.5], ["deliver", 1.5]], () => {
    const r = H.roomService.restaurants[0];
    return { text: r.name + ": " + r.line + " (" + practical["In room dining"] + ")\n\n" + list(r.items.map((i) => i.name + ": " + (i.label || i.price) + " USD")) + "\n\n" + H.taxNote, actions: [{ label: "Order", href: "#/room/dining/" + r.id }] };
  });
  add([["private", 2.5], ["private dinner", 3], ["private dining", 3], ["event", 2], ["wedding", 2.5], ["group", 1.5], ["party", 2]], () => ({ text: H.privateDining.intro + "\n\nPlaces include " + H.privateDining.venues.slice(0, 5).map((v) => v.name).join(", ") + ", and more.", actions: [{ label: "Private dining", href: "#/discover/dining" }] }));
  add([["what to do", 3], ["things to do", 3], ["activities", 2.5], ["activity", 2.5], ["programme", 3], ["program", 3], ["schedule", 2], ["today", 1], ["recommend", 2.5], ["suggest", 2.5], ["bored", 2]], () => {
    const wd = weekdayAtHouse();
    const today = H.daily.filter((d) => !d.weekdays || d.weekdays.includes(wd));
    return { text: "Today at the house:\n" + list(today.map((d) => d.time + "  " + d.name + " (" + d.sub.toLowerCase() + ")")) + "\n\nBefore sunset, " + exps["felucca"].name.toLowerCase() + " leaves at " + exps["felucca"].times[0] + ". For more, see Discover.", actions: [{ label: "Discover", href: "#/discover/all" }] };
  });
  add([["excursion", 2.5], ["temples", 2.5], ["valley of the kings", 3], ["sightseeing", 2.5], ["guide", 2], ["luxor", 1.5]], () => ({ text: "From the house, with your guide:\n" + list(H.experiences.filter((e) => e.cat === "luxor").map((e) => e.name + ": " + e.label + (e.meta ? ", " + e.meta : ""))) + "\n\n" + H.taxNote, actions: [{ label: "See Luxor", href: "#/discover/luxor" }] }));
  add([["evening", 2]], () => ({ text: "For this evening:\n" + list(H.experiences.filter((e) => e.cat === "evenings").map((e) => e.name + ": " + e.label)) + "\n\nDinner is " + practical["Dinner"] + ".", actions: [{ label: "See Evenings", href: "#/discover/evenings" }] }));
  add([["children", 3], ["family", 1.5]], () => expAnswer(exps["little-explorers"]));
  add([["map", 3], ["where", 1], ["find", 0.8], ["directions", 2]], (w) => {
    const i = H.map.key.findIndex((k) => nameKeys(k, 1).some(([x]) => w.includes(x)));
    return { text: i >= 0 ? H.map.key[i] + " is number " + (i + 1) + " on the farm map." : "The farm map shows the house, the workshops and the animals, with a numbered key.", actions: [{ label: "Open the map", href: "#/house/map" }] };
  });
  add([["address", 3], ["email", 2.5], ["contact", 2]], () => ({ text: H.house.address + "\nEmail: " + H.house.email + "\nWhatsApp: " + H.house.whatsappDisplay }));
  add([["guide book", 2], ["directory", 3], ["information", 1.5], ["brochure", 2]], () => ({ text: "The Guest Directory has everything about the house.", actions: [{ label: "Open the Guest Directory", href: "#/doc/guest-directory" }] }));
  add([["price", 0.3], ["book", 0.3], ["reserve", 0.3]], () => ({ text: "Tell me what you would like, for example the balloon, a massage or a table tonight. You can also browse Discover and reserve from there.", actions: [{ label: "Discover", href: "#/discover/all" }] }));

  add([["safety", 4]], () => ({ text: "The front office knows Luxor well and can advise you. A person replies on WhatsApp, at any hour.", wa: true }));
  add([["diet", 4]], () => ({ text: "Tell us of any allergy or diet and the kitchen will confirm what they can prepare. The front office will pass it on.", wa: true }));
  add([["change", 3.5]], () => ({ text: "To change or cancel something you have booked, message the front office and they will sort it out.", wa: true }));

  // every experience, by its own name
  for (const e of H.experiences) {
    const extra = { felucca: [["felucca", 3], ["nile", 1.5]], balloon: [["balloon", 3], ["sunrise", 1.5]], "west-bank": [["valley of the kings", 2], ["hatshepsut", 3], ["west bank", 2.5]], karnak: [["karnak", 2], ["luxor temple", 3], ["east bank", 2.5]], "karnak-night": [["sound and light", 3], ["show", 1.5]], "il-forno": [["pizza", 3]], "stable-rides": [["horses", 3]], "cycling-tour": [["cycling", 3]], carriage: [["carriage", 3]], celebration: [["celebration", 3], ["cake", 2.5]], "set-nefru": [["dahabiya", 3], ["cruise", 2.5]], yoga: [["yoga", 3]], pottery: [["pottery", 3]], tailoring: [["tailor", 3], ["suit", 2], ["shirt", 2]], "nile-sunset": [["picnic", 2.5], ["private sunset", 3]], "classic-car": [["classic car", 3], ["village", 2]], "farm-tour": [["farm", 1.5], ["farm tour", 3], ["animals", 2], ["workshop", 2]], "signature-massage": [["signature", 2]] }[e.id] || [];
    add(nameKeys(e.name, 1.2).concat(extra), () => expAnswer(e));
  }

  // small talk and honesty about being a bot
  const SMALL = [
    [["are you a bot", "speak to someone", "talk to someone", "speak to a", "talk to a", "speak with", "manager", "are you human", "are you real", "a person", "a robot", "an ai", "real person", "human", "bot", "robot"], () => ({ text: "I'm an automated assistant, not a person. I answer from the House Book. For a person, tap Message the front office: someone replies on WhatsApp, at any hour.", wa: true })],
    [["thank", "thanks", "thank you", "grazie", "merci", "danke", "gracias", "shukran", "cheers"], () => ({ text: "You're welcome. Enjoy your stay." })],
    [["hello", "hey", "good morning", "good afternoon", "good evening", "ciao", "bonjour", "hallo", "hola", "salam"], () => ({ text: "Hello. Ask me about the house, for example breakfast times, the wifi or what is on today." })],
  ];

  function answer(q) {
    const raw = norm(q);
    if (!VOCAB) { VOCAB = new Set(); T.forEach((t) => t.keys.forEach(([k]) => prep(k).forEach((x) => VOCAB.add(x)))); H.map.key.forEach((k) => prep(k).forEach((x) => VOCAB.add(x))); }
    const all = fix(prep(q)), words = all.filter((w) => !STOP.has(w));
    // things the House Book doesn't cover: say so rather than answer something nearby
    if (/ (dress code|what to wear|dog|dogs|pet|pets|smoking|smoke|lost|stolen|lost and found|hairdresser|barber) /.test(raw)) return { matched: null, text: H.bot.fallback, wa: true };
    if (words.includes("change")) return Object.assign({ matched: "change" }, T.find((t) => t.keys[0][0] === "change").answer(words));
    for (const [keys, fn] of SMALL.slice(0, 1)) if (keys.some((k) => raw.includes(" " + norm(k).trim() + " "))) return Object.assign({ matched: "bot" }, fn());
    // "where is the pottery" -> its number on the farm map
    if (/ (where|find|directions|located|location) /.test(raw)) {
      const i = H.map.key.findIndex((k) => nameKeys(k, 1).some(([x]) => words.includes(x)));
      if (i >= 0) return { matched: "map", text: H.map.key[i] + " is number " + (i + 1) + " on the farm map.", actions: [{ label: "Open the map", href: "#/house/map" }] };
    }
    let best = null;
    T.forEach((t, i) => { const s = score(all, words, t.keys); if (!best || s > best.s) best = { s, i }; });
    if (best && best.s >= 1) {
      const a = T[best.i].answer(words);
      return Object.assign({ matched: best.i, score: best.s }, a);
    }
    for (const [keys, fn] of SMALL.slice(1)) if (keys.some((k) => raw.includes(" " + norm(k).trim() + " "))) return Object.assign({ matched: "small" }, fn());
    return { matched: null, text: H.bot.fallback, wa: true };
  }

  window.BOT = { answer, _prep: prep };
})();
