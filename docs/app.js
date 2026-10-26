/* Al Moudira guest web app. Screens and navigation. */
(function () {
  const C = window.APP_CONFIG;
  const HB = window.HOUSE_BOOK;
  const API = window.API;
  const U = window.U;
  const app = document.getElementById("app");

  const S = {               // app state, in memory
    session: null,
    requests: [],
    messages: [],
    cart: {},               // room service: id -> qty
    temp: null,
    arrival: { time: "", car: "sedan", allergies: "" },
    askDraft: "",
    sheet: null,            // the open sheet's state
    lastTab: "today"
  };

  /* ---------------- helpers ---------------- */
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const money = (n) => (Math.round(n * 100) / 100).toLocaleString("en-US", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 }) + " USD";
  const ymdDate = (ymd) => new Date(ymd + "T12:00:00Z");
  const fmtDay = (ymd, o) => new Intl.DateTimeFormat("en-GB", Object.assign({ timeZone: "UTC" }, o)).format(ymdDate(ymd));
  const fmtClock = (d) => new Intl.DateTimeFormat("en-GB", { timeZone: C.timeZone, hour: "2-digit", minute: "2-digit", hour12: false }).format(d);
  const houseHour = () => Number(new Intl.DateTimeFormat("en-GB", { timeZone: C.timeZone, hour: "2-digit", hour12: false }).format(new Date()));
  const weekday = (ymd) => ymdDate(ymd).getUTCDay();
  const ymdOf = (d) => new Intl.DateTimeFormat("en-CA", { timeZone: C.timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
  const exp = (id) => HB.experiences.find((e) => e.id === id);
  const dept = (id) => C.departments[id] || C.departments.frontoffice;
  const chev = '<svg class="chev" viewBox="0 0 8 13" aria-hidden="true"><path d="M1.5 1.5l5 5-5 5" fill="none" stroke="#b5b5b5" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const LOADED = new Set(); // photos already shown once: no second fade on re-render
  window.__imgIn = (el) => { LOADED.add(el.getAttribute("src")); el.classList.add("ld"); };
  const img = (f, alt, cls) => {
    if (!f) return `<div class="ph${cls ? " " + cls : ""}">Photograph to come</div>`;
    const src = "img/" + esc(f), done = LOADED.has(src);
    return `<span class="iw${cls ? " " + cls : ""}"><img src="${src}" alt="${esc(alt || "")}" loading="lazy" decoding="async"${done ? ' class="ld" style="transition:none"' : ""} onload="__imgIn(this)" onerror="__imgIn(this)"></span>`;
  };

  function dayLabel(ymd) {
    const t = U.houseDate(0);
    if (ymd === t) return "Today";
    if (ymd === U.addDays(t, 1)) return "Tomorrow";
    return fmtDay(ymd, { weekday: "short", day: "numeric" });
  }
  function phase(s) {
    if (!s || !s.arrival) return "during";
    const t = U.houseDate(0);
    if (t < s.arrival) return "before";
    if (t > s.departure) return "ended";
    if (t === s.departure) return "last";
    return "during";
  }
  function greeting() { const h = houseHour(); return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening"; }
  function toast(msg) {
    const t = document.createElement("div"); t.className = "toast"; t.setAttribute("role", "status"); t.textContent = msg;
    document.body.appendChild(t); setTimeout(() => t.remove(), 2600);
  }

  /* Sunrise and sunset (NOAA sunrise equation), shown in the house's time zone */
  function sunTimes(ymd) {
    const rad = Math.PI / 180, lat = C.latitude, lon = C.longitude;
    const [y, m, d] = ymd.split("-").map(Number);
    const J = Date.UTC(y, m - 1, d, 12) / 86400000 + 2440587.5;
    const n = Math.round(J - 2451545.0 + 0.0008);
    const Js = n - lon / 360;
    const M = (357.5291 + 0.98560028 * Js) % 360;
    const Cc = 1.9148 * Math.sin(M * rad) + 0.02 * Math.sin(2 * M * rad) + 0.0003 * Math.sin(3 * M * rad);
    const L = (M + Cc + 180 + 102.9372) % 360;
    const Jt = 2451545.0 + Js + 0.0053 * Math.sin(M * rad) - 0.0069 * Math.sin(2 * L * rad);
    const dec = Math.asin(Math.sin(L * rad) * Math.sin(23.4397 * rad));
    const cw = (Math.sin(-0.833 * rad) - Math.sin(lat * rad) * Math.sin(dec)) / (Math.cos(lat * rad) * Math.cos(dec));
    const w = Math.acos(Math.max(-1, Math.min(1, cw))) / rad;
    const toDate = (j) => new Date((j - 2440587.5) * 86400000);
    return { rise: toDate(Jt - w / 360), set: toDate(Jt + w / 360) };
  }
  window.__sunTimes = sunTimes; // for testing

  async function loadTemp() {
    if (!C.showTemperature || S.temp) return;
    const cached = U.store.get("temp", null);
    if (cached && Date.now() - cached.at < 3600000) { S.temp = cached.v; return; }
    try {
      const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${C.latitude}&longitude=${C.longitude}&current=temperature_2m`);
      const j = await r.json();
      if (j && j.current && typeof j.current.temperature_2m === "number") { S.temp = Math.round(j.current.temperature_2m) + "°"; U.store.set("temp", { v: S.temp, at: Date.now() }); render(true); }
    } catch (e) { /* offline or blocked: hide it */ }
  }

  /* ---------------- icons ---------------- */
  const ICON = {
    today: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8"/>',
    discover: '<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>',
    room: '<path d="M3 18V7M3 13h18v5M21 13a3 3 0 0 0-3-3h-7v3M6.5 11.5a1.5 1.5 0 1 0 0-.01"/>',
    ask: '<path d="M4 5h16v11H9l-5 4z"/>',
    house: '<path d="M5 21V10a7 7 0 0 1 14 0v11M3 21h18M10 21v-6a2 2 0 0 1 4 0v6"/>'
  };
  function tabbar(active) {
    const t = [["today", "#/today"], ["discover", "#/discover/eat"], ["room", "#/room/dining"], ["ask", "#/ask"], ["house", "#/house"]];
    return `<nav class="tabbar" aria-label="Main">${t.map(([k, href]) =>
      `<a href="${href}"${k === active ? ' aria-current="page"' : ""}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[k]}</svg><span>${esc(C.tabs[k])}</span></a>`).join("")}</nav>`;
  }

  /* ---------------- requests shown on the day ---------------- */
  function dayItems(ymd) {
    const s = S.session;
    const booked = (s.bookings || []).filter((b) => b.date === ymd).map((b) => ({ time: b.time, name: b.name, sub: b.sub, expId: b.expId }));
    const req = S.requests.filter((r) => r.date === ymd && r.kind === "reserve").map((r) => ({
      time: r.time || "", name: r.title, sub: r.guests ? `${r.guests} ${r.guests === 1 ? "guest" : "guests"}` : "",
      status: r.status, href: "#/request/" + r.id, expId: r.expId
    }));
    return booked.concat(req).sort((a, b) => (a.time || "99").localeCompare(b.time || "99"));
  }
  function itemRow(i) {
    const st = i.status ? `<span class="status ${i.status === "confirmed" ? "confirmed" : ""}" style="margin-top:6px"><span class="dot"></span>${i.status === "confirmed" ? "Confirmed" : "Awaiting confirmation"}</span>` : "";
    const inner = `<span class="t">${esc(i.time || "")}</span><span><span class="n">${esc(i.name)}</span>${i.sub ? `<span class="s">${esc(i.sub)}</span>` : ""}${st}</span>`;
    const past = i.past ? " past" : "";
    return i.href ? `<a class="item${past}" href="${i.href}">${inner}</a>` : `<div class="item${past}">${inner}</div>`;
  }
  function statusLabel(r) {
    if (r.via === "WhatsApp") return "Sent on WhatsApp";
    return r.status === "confirmed" ? "Confirmed" : r.status === "declined" ? "Not possible, we will write" : "Awaiting confirmation";
  }

  /* =========================================================
   * SCREENS
   * ========================================================= */
  const V = {};

  V.signin = () => {
    const wa = API.mode === "whatsapp";
    return `<div class="screen no-tabs" style="padding-top:0;padding-left:0;padding-right:0">
      ${img("w_arch_salon.jpg", "A salon at Al Moudira", "hero")}
      <div style="padding:22px 24px 0">
        <img src="img/logo.png" alt="Hotel Al Moudira, Luxor" style="width:64px">
        <h1 style="margin-top:14px">Welcome</h1>
        ${wa
          ? `<p class="lede">Tell us who you are, and we will know where to find you.</p>
             <form data-form="signin-wa">
               <label class="f">Your name<input class="input" name="name" autocomplete="name" required></label>
               <label class="f">Your room<input class="input" name="room" placeholder="If you have arrived"></label>
               <div class="err" id="err" role="alert"></div>
               <button class="btn" style="margin-top:26px">Continue</button>
             </form>`
          : `<p class="lede">Your link is in your confirmation email. Or enter:</p>
             <form data-form="signin">
               <label class="f">Booking number<input class="input" name="booking" placeholder="AM 00000" autocomplete="off" autocapitalize="characters" required></label>
               <label class="f">Surname<input class="input" name="surname" placeholder="As on your booking" autocomplete="family-name" required></label>
               <div class="err" id="err" role="alert"></div>
               <button class="btn" style="margin-top:26px">Continue</button>
             </form>
             ${API.mode === "demo" ? `<p class="note" style="text-align:center">Demo: <a href="#/email" style="text-decoration:underline">open the confirmation email</a>, or use AM 48210 and Hart.</p>` : ""}`}
      </div></div>`;
  };

  V.email = () => `<div class="screen no-tabs">
      <div class="kicker">Your inbox</div>
      <div style="margin-top:12px;border:0.5px solid var(--line);border-radius:14px;overflow:hidden">
        <div style="padding:14px 16px;border-bottom:0.5px solid var(--line)"><b style="font-size:15px">Al Moudira</b><div class="small">Your stay is confirmed</div></div>
        <div style="padding:18px 16px 22px">
          ${img("w_facade.jpg", "Al Moudira", "mail")}
          <img src="img/logo_wordmark.png" alt="Hotel Al Moudira, Luxor" style="width:150px;margin-top:20px">
          <p class="serif" style="font-size:18px;line-height:1.6;margin:18px 0 0">Dear Eleanor,</p>
          <p class="serif" style="font-size:18px;line-height:1.6;margin:10px 0 0">Your stay is confirmed. Your own page is ready: tell us when you arrive, and reserve what you would like before you come.</p>
          <button class="btn" data-act="open-link" style="margin-top:22px">Open your stay</button>
          <p class="small" style="margin-top:12px;font-size:13px">Opens for everyone in your room, until you leave. Booking AM 48210.</p>
        </div>
      </div>
      <p class="note">This is how the link arrives in the Cloudbeds confirmation email.</p>
    </div>`;

  V.splash = () => {
    const s = S.session;
    const range = s.arrival ? `${fmtDay(s.arrival, { day: "numeric" })} to ${fmtDay(s.departure, { day: "numeric", month: "long" })}` : "";
    setTimeout(() => { if (location.hash === "#/welcome") location.replace("#/today"); }, 1700);
    return `<div class="splash"><img class="logo" src="img/logo.png" alt="Hotel Al Moudira, Luxor">
      <h1 style="font-size:26px;margin-top:34px">Welcome to your stay</h1>
      <div class="small" style="margin-top:8px">${esc(s.guest.first)}${range ? " · " + esc(range) : ""}</div></div>`;
  };

  V.ended = () => `<div class="splash"><img class="logo" src="img/logo.png" alt="Hotel Al Moudira, Luxor">
      <h1 style="font-size:26px;margin-top:34px">Thank you for staying with us</h1>
      <p class="lede">Your page closed when you left. We hope to welcome you back.</p>
      <a class="btn" style="margin-top:24px;max-width:320px" href="mailto:${esc(HB.house.email)}?subject=${encodeURIComponent("A return to Al Moudira")}">Plan your return</a></div>`;

  /* ---------- Today ---------- */
  V.today = () => {
    const s = S.session, p = phase(s);
    if (p === "ended") return V.ended();
    if (p === "before") return V.arrival();
    if (p === "last") return V.lastDay();
    const t = U.houseDate(0), tm = U.addDays(t, 1);
    const sun = sunTimes(t);
    const SG = HB.suggestions, now = nowHM();
    // never suggest what the guest has already booked during the stay
    const bookedToday = new Set((s.bookings || []).map((b) => b.expId).concat(S.requests.filter((r) => r.kind === "reserve").map((r) => r.expId)).filter(Boolean));
    const sug = (now < SG.until ? SG.beforeSunset : SG.evening).find((x) => !bookedToday.has(x.id)) || null;
    const se = sug && exp(sug.id);
    const fade = (list) => list.map((i) => Object.assign({}, i, { past: !!i.time && i.time < now }));
    const daily = HB.daily.filter((d) => !d.weekdays || d.weekdays.includes(weekday(t)));
    const today = dayItems(t), tomorrow = dayItems(tm);
    const late = HB.lastDay.lateCheckOut;
    const open = S.requests.filter((r) => r.status === "sent").length;
    return `<div class="screen">
      <div class="kicker" style="margin-top:10px">${esc(fmtDay(t, { weekday: "long", day: "numeric", month: "long" }))}</div>
      <h1>${greeting()}, ${esc(s.guest.first)}</h1>
      <div class="sun"><span>Sunrise ${fmtClock(sun.rise)}</span><span>Sunset ${fmtClock(sun.set)}</span>${S.temp ? `<span>${esc(S.temp)}</span>` : ""}</div>
      ${se ? `<button class="card" data-act="reserve" data-id="${se.id}">${img(sug.img || se.img, se.name)}
        <div class="in"><div class="kicker">${esc(sug.kicker)}</div><div class="title">${esc(se.name)}</div><div class="line">${esc(sug.line)}</div></div></button>` : ""}
      <h2 class="section">Your day</h2>
      ${today.length ? fade(today).map(itemRow).join("") : `<div class="item"><span class="s" style="margin:0">Nothing booked yet. <a href="#/discover/eat" style="text-decoration:underline">Discover</a> what the house offers.</span></div>`}
      <h2 class="section">Daily at the house</h2>
      ${fade(daily).map(itemRow).join("")}
      ${tomorrow.length ? `<h2 class="section">Tomorrow</h2>${tomorrow.map(itemRow).join("")}` : ""}
      <h2 class="section">Your stay</h2>
      <div class="row"><span class="grow">${s.departure ? "Leaving" : "Check out"}</span><span class="val">${s.departure ? esc(fmtDay(s.departure, { weekday: "long", day: "numeric" })) + ", " : ""}${esc(HB.house.checkOut)}</span></div>
      <button class="row" data-act="simple" data-kind="late"><span class="grow">Late check out</span><span class="val">Until 19:00 · ${money(late.price)}</span>${chev}</button>
      ${s.bill ? `<a class="row" href="#/bill"><span class="grow">Your bill</span><span class="val">${money(s.bill.total)}</span>${chev}</a>` : ""}
      <a class="row" href="#/requests"><span class="grow">Your requests</span><span class="val">${open ? open + " awaiting" : S.requests.length || "None yet"}</span>${chev}</a>
    </div>`;
  };

  V.arrival = () => {
    const s = S.session, A = S.arrival;
    const sent = U.store.get("arrivalSent", false);
    return `<div class="screen">
      <div class="kicker" style="margin-top:10px">${esc(fmtDay(s.arrival, { weekday: "long", day: "numeric", month: "long" }))} · ${s.guests} guests</div>
      <h1>Before you arrive</h1>
      ${sent ? `<p class="lede">Thank you. The house has your arrival, and will meet you.</p>` : ""}
      <label class="f">When do you arrive?<input class="input" data-bind="arrival.time" value="${esc(A.time)}" placeholder="Flight or train, and the time"></label>
      <h2 class="section" style="margin-top:30px">A car to meet you</h2>
      <div role="radiogroup" aria-label="A car to meet you">${HB.arrival.cars.map((c) =>
        `<button class="radio" role="radio" aria-checked="${A.car === c.id}" data-act="car" data-id="${c.id}"><span class="o"></span><span class="grow" style="flex:1">${esc(c.name)}</span>${c.price ? `<span class="val small">${money(c.price)}</span>` : ""}</button>`).join("")}</div>
      <label class="f">Allergies and preferences<textarea class="input" data-bind="arrival.allergies" placeholder="Anything the kitchen and the house should know">${esc(A.allergies)}</textarea></label>
      <h2 class="section">Reserve now, these fill first</h2>
      ${HB.arrival.fillFirst.map((f) => `<div class="row" style="gap:14px">${img(f.img, "", "thumb")}<span class="grow"><span class="serif" style="font-size:18px;line-height:1.3;display:block">${esc(f.name)}</span>${f.price ? `<span class="sub" style="color:var(--ink);font-weight:500">${esc(f.price)}</span>` : ""}<span class="sub">${esc(f.sub)}</span></span><button class="pill soft" data-act="reserve" data-id="${f.id}" style="height:36px;padding:0 14px">Reserve</button></div>`).join("")}
      <button class="btn" data-act="send-arrival" style="margin-top:30px">${sent ? "Send an update" : "Send to the house"}</button>
      ${S.session.bookings && S.session.bookings.length ? "" : `<p class="note">You can change anything here until you arrive.</p>`}
    </div>`;
  };

  V.lastDay = () => {
    const s = S.session, L = HB.lastDay;
    return `<div class="screen">
      <div class="kicker" style="margin-top:10px">${esc(fmtDay(s.departure, { weekday: "long", day: "numeric", month: "long" }))}</div>
      <h1>Your last day</h1>
      <h2 class="section">Leaving</h2>
      <div class="row"><span class="grow">Check out</span><span class="val">${esc(HB.house.checkOut)}</span></div>
      <button class="row" data-act="simple" data-kind="late"><span class="grow">${esc(L.lateCheckOut.name)}<span class="sub">${esc(L.lateCheckOut.sub)}</span></span><span class="val">${money(L.lateCheckOut.price)}</span>${chev}</button>
      <button class="row" data-act="simple" data-kind="airport"><span class="grow">${esc(L.airportCar.name)}<span class="sub">${esc(L.airportCar.sub)}</span></span><span class="val">${money(L.airportCar.price)}</span>${chev}</button>
      ${s.bill ? `<h2 class="section">Your bill</h2>
      <a class="row" href="#/bill"><span class="grow">Your stay so far</span><span class="val">${money(s.bill.total)}</span>${chev}</a>
      <button class="btn soft" data-act="simple" data-kind="bill" style="margin-top:16px">Bring my bill to breakfast</button>` : ""}
      <div class="card" style="padding:22px 20px"><div class="title" style="margin:0;font-size:22px">Thank you for staying with us, ${esc(s.guest.first)}.</div>
        <div class="line">One word on your stay helps us more than you know.</div>
        <button class="btn" data-act="simple" data-kind="word" style="margin-top:16px;background:var(--bg);color:var(--ink);border-radius:22px">Leave us a word</button>
        <a class="btn" href="mailto:${esc(HB.house.email)}?subject=${encodeURIComponent("A return to Al Moudira, booking " + (s.booking || ""))}" style="margin-top:10px;border-radius:22px">Plan your return</a></div>
    </div>`;
  };

  /* ---------- Discover ---------- */
  V.discover = (r) => {
    const cat = HB.filters.some((f) => f.id === r.arg) ? r.arg : "eat";
    const list = HB.experiences.filter((e) => e.cat === cat);
    const btn = (e) => e.action === "join" ? "Join" : e.action === "ask" ? "Ask" : "Reserve";
    return `<div class="screen">
      <h1 style="margin-top:10px">Discover</h1>
      <div class="chips" role="tablist" aria-label="Filter">${HB.filters.map((f) => `<a class="chip" href="#/discover/${f.id}"${f.id === cat ? ' aria-current="page"' : ""}>${esc(f.name)}</a>`).join("")}</div>
      ${list.map((e) => `<article class="offer">${img(e.img, e.name)}
        <h2 class="name" style="font-weight:400;margin-bottom:0">${esc(e.name)}</h2>
        <div class="text">${esc(e.text)}</div>
        <div class="foot"><span class="l"><b>${esc(e.label)}</b>${esc(e.meta)}</span>
          <button class="pill soft" data-act="reserve" data-id="${e.id}" aria-label="${btn(e)}: ${esc(e.name)}">${btn(e)}</button></div></article>`).join("")}
      <p class="note">${esc(HB.priceNote)}</p>
    </div>`;
  };

  /* ---------- Request received ---------- */
  V.request = (r) => {
    const q = S.requests.find((x) => x.id === r.arg);
    if (!q) return `<div class="screen"><h1>Request</h1><p class="lede">We could not find this request.</p></div>`;
    const ok = q.status === "confirmed";
    const wa = q.via === "WhatsApp";
    const d = dept(q.dept).name.toLowerCase();
    const fresh = S.justSent === q.id && !ok;
    return `<div class="screen">
      <div class="done-mark" aria-hidden="true"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path${fresh ? ' class="tick"' : ""} d="M5 12.5l4.5 4.5L19 7.5"/></svg></div>
      <h1 class="${fresh ? "after-tick" : ""}" style="text-align:center;font-size:26px;margin-top:18px">${ok ? "Confirmed" : "Request sent"}</h1>
      <p class="lede" style="text-align:center;margin-top:8px">${wa ? "Sent to reception on WhatsApp. They will reply to you there."
        : ok ? `Confirmed by ${q.confirmedBy ? "the " + esc(q.confirmedBy.toLowerCase()) + " team" : "the house"}. We look forward to it.`
        : `Our ${esc(d)} team will confirm ${q.kind === "reserve" ? "it" : "this"} here, and by email.`}</p>
      ${wa ? "" : `<div class="progress" aria-label="Progress"><span class="on">Sent</span><span class="bar"></span><span class="${ok ? "on" : ""}">Confirmed</span><span class="bar"></span><span>Enjoyed</span></div>`}
      <div style="margin-top:22px;border-top:0.5px solid var(--line)">
        <div class="row"><span class="grow">${esc(q.title)}</span><span class="val">${esc(q.date ? dayLabel(q.date) : "")}${q.time ? " · " + esc(q.time) : ""}</span></div>
        ${q.summary && q.kind !== "reserve" ? `<div class="row"><span class="grow small" style="color:var(--body)">${esc(q.summary)}</span></div>` : ""}
        ${q.guests || q.total ? `<div class="row"><span class="grow">${q.guests ? `${q.guests} ${q.guests === 1 ? "guest" : "guests"}` : ""}</span><span class="val">${esc(q.total || "")}</span></div>` : ""}
        ${q.note ? `<div class="row"><span class="grow small" style="color:var(--body)">“${esc(q.note)}”</span></div>` : ""}
      </div>
      <a class="btn soft" href="#/${S.lastTab === "discover" ? "discover/eat" : S.lastTab === "room" ? "room/dining" : S.lastTab}" style="margin-top:28px">Done</a>
      <a class="btn" href="#/requests" style="margin-top:10px;background:none;color:var(--ink);height:44px;font-weight:500">All your requests</a>
    </div>`;
  };

  V.requests = () => `<div class="screen">
      <a href="#/today" class="small" style="display:inline-block;margin-top:6px">‹ ${esc(C.tabs.today)}</a>
      <h1>Your requests</h1>
      ${S.requests.length ? S.requests.map((q) => `<a class="row" href="#/request/${q.id}"><span class="grow">${esc(q.title)}<span class="sub">${esc([q.date ? dayLabel(q.date) : "", q.time].filter(Boolean).join(" · "))}${q.date || q.time ? " · " : ""}${esc(dept(q.dept).name)}</span></span><span class="status ${q.status === "confirmed" ? "confirmed" : ""}"><span class="dot"></span>${statusLabel(q)}</span>${chev}</a>`).join("")
        : `<p class="lede">Nothing yet. Everything you reserve or ask for appears here, with its status.</p>`}
    </div>`;

  /* ---------- Bill ---------- */
  V.bill = () => {
    const b = S.session.bill;
    if (!b) return `<div class="screen"><h1>Your bill</h1><p class="lede">Ask at reception, or dial 0.</p></div>`;
    return `<div class="screen">
      <a href="#/today" class="small" style="display:inline-block;margin-top:6px">‹ ${esc(C.tabs.today)}</a>
      <div class="kicker" style="margin-top:18px">Your bill</div>
      <h1>${money(b.total)}</h1>
      <div style="margin-top:18px;border-top:0.5px solid var(--line)">${b.lines.map(([n, v]) => `<div class="row"><span class="grow">${esc(n)}</span><span class="val">${money(v)}</span></div>`).join("")}</div>
      <p class="note">${API.mode === "demo" ? "Sample bill. " : ""}Updated from the hotel's system as you go. Restaurant charges include service and taxes once posted.</p>
      <button class="btn soft" data-act="simple" data-kind="bill" style="margin-top:22px">Bring my bill to breakfast</button>
      <a class="btn" href="#/ask" style="margin-top:10px;background:none;color:var(--ink);height:44px;font-weight:500">A question about your bill</a>
    </div>`;
  };

  /* ---------- Room ---------- */
  V.room = (r) => {
    const care = r.arg === "care";
    const seg = `<div class="seg" role="tablist"><a href="#/room/dining"${care ? "" : ' aria-current="page"'}>Dining</a><a href="#/room/care"${care ? ' aria-current="page"' : ""}>Housekeeping</a></div>`;
    if (care) {
      const done = (id) => S.requests.some((q) => q.itemId === id && q.date === U.houseDate(0));
      const tile = (t, kind) => `<button class="tile${done(t.id) ? " done" : ""}" data-act="care" data-kind="${kind}" data-id="${t.id}"><b>${esc(t.name)}</b>${done(t.id) ? "<span>Requested</span>" : t.sub ? `<span>${esc(t.sub)}</span>` : ""}</button>`;
      return `<div class="screen"><h1 style="margin-top:10px">${esc(C.tabs.room)}</h1>${seg}
        <h2 class="section" style="margin-top:26px">Housekeeping</h2><div class="tiles">${HB.housekeeping.map((t) => tile(t, "housekeeping")).join("")}</div>
        <h2 class="section">Something to fix</h2><div class="tiles">${HB.repairs.map((t) => tile(t, "maintenance")).join("")}</div>
        <p class="note">One tap sends it to the team. You will see it here when it is on its way.</p></div>`;
    }
    const n = Object.values(S.cart).reduce((a, b) => a + b, 0);
    const total = HB.menu.items.reduce((a, i) => a + (S.cart[i.id] || 0) * i.price, 0);
    const from = HB.menu.items.some((i) => S.cart[i.id] && i.label);
    return `<div class="screen"><h1 style="margin-top:10px">${esc(C.tabs.room)}</h1>${seg}
      <p class="small" style="margin-top:16px">${esc(HB.menu.intro)}</p>
      <h2 class="section" style="margin-top:22px">In room dining</h2>
      ${HB.menu.items.map((i) => { const q = S.cart[i.id] || 0; return `<div class="menu-row"><span class="grow">${esc(i.name)}</span><span class="p">${esc(i.label || (i.price % 1 ? i.price.toFixed(2) : String(i.price)))}</span>
        <span class="qty">${q ? `<button class="round" data-act="qty" data-id="${i.id}" data-d="-1" aria-label="One fewer ${esc(i.name)}">−</button><span class="round on" aria-label="${q} in your order">${q}</span>` : ""}<button class="round" data-act="qty" data-id="${i.id}" data-d="1" aria-label="Add ${esc(i.name)}">+</button></span></div>`; }).join("")}
      <p class="note" style="font-size:13px">${esc(HB.menu.note)}</p>
      ${n ? `<div class="orderbar"><button class="btn" data-act="order"><span>Order ${n} ${n === 1 ? "item" : "items"}</span><span>${from ? "from " : ""}${money(total)}</span></button></div>` : ""}
    </div>`;
  };

  /* ---------- Ask ---------- */
  V.ask = () => {
    const wa = API.mode === "whatsapp";
    const msgs = S.messages;
    return `<div class="screen" style="padding-bottom:calc(var(--tabbar) + var(--safe-b) + 8px)">
      <h1 style="margin-top:10px">${esc(C.tabs.ask)}</h1>
      <p class="small" style="margin-top:8px">${esc(HB.house.replyPromise)}</p>
      ${wa ? `<p class="lede">Your message opens WhatsApp, straight to reception.</p>` : `<div class="thread" aria-live="polite">${msgs.map((m, i) => {
        const showWhen = i === 0 || m.at - msgs[i - 1].at > 1800000;
        return `${showWhen ? `<div class="when">${esc(dayLabel(ymdOf(new Date(m.at))))} ${fmtClock(new Date(m.at))}</div>` : ""}<div class="bubble ${m.from === "guest" ? "me" : "them"}">${m.from !== "guest" && m.who ? `<span class="who">${esc(m.who)}</span>` : ""}${esc(m.welcome ? `${greeting()}, ${S.session.guest.first}. ${HB.house.welcome}` : m.text)}</div>`;
      }).join("")}</div>`}
      <div class="composer">
        <div class="chips" style="margin-top:0">${HB.askChips.map((c) => `<button class="chip" data-act="chip" data-text="${esc(c)}">${esc(c)}</button>`).join("")}</div>
        <form data-form="ask"><label class="sr" for="msg">Message</label><input id="msg" class="input" data-bind="askDraft" value="${esc(S.askDraft)}" placeholder="Message" autocomplete="off" enterkeyhint="send">
        <button class="send" aria-label="Send"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5M5.5 11.5L12 5l6.5 6.5"/></svg></button></form>
      </div></div>`;
  };

  /* ---------- Al Moudira ---------- */
  const MAP = `<svg viewBox="0 0 350 250" width="100%" role="img" aria-label="A sketch map of Al Moudira: the hotel, the farm, the workshops" class="map">
<g fill="none" stroke="#b9a98d" stroke-width="1" stroke-dasharray="3 4"><path d="M120 120 C160 128 190 150 230 170"/><path d="M120 120 C150 90 190 70 238 62"/><path d="M230 170 C250 150 262 120 270 100"/></g>
<g fill="#fffdf8" stroke="#8b7a5e" stroke-width="1.2"><rect x="40" y="80" width="96" height="78" rx="4"/><rect x="58" y="96" width="24" height="20"/><rect x="92" y="96" width="30" height="46"/><rect x="58" y="124" width="24" height="18"/><rect x="206" y="150" width="58" height="38" rx="4"/><rect x="214" y="40" width="62" height="40" rx="4"/><circle cx="292" cy="112" r="16"/></g>
<g fill="#cfdedd" stroke="#8b7a5e" stroke-width="1"><rect x="150" y="100" width="34" height="18" rx="3"/></g>
<g fill="#8fa070" opacity="0.55"><circle cx="30" cy="60" r="5"/><circle cx="160" cy="60" r="5"/><circle cx="180" cy="200" r="5"/><circle cx="310" cy="190" r="5"/><circle cx="320" cy="60" r="5"/><circle cx="196" cy="94" r="4"/></g>
<g font-family="-apple-system, Inter, Arial, sans-serif" font-size="10.5" fill="#5a4e3a"><text x="44" y="174">The hotel and courtyards</text><text x="146" y="134">Pool</text><text x="206" y="204">Workshops</text><text x="214" y="96">Farm Kitchen</text><text x="276" y="142">Stable</text></g>
<g font-family="Vollkorn, Georgia, serif" font-size="14" fill="#5a4e3a" font-style="italic"><text x="246" y="232">the farm</text></g></svg>`;

  V.house = () => `<div class="screen">
      <h1 style="margin-top:10px">${esc(C.tabs.house)}</h1>
      ${MAP}
      <div style="margin-top:10px">
      <a class="row" href="#/house/practical"><span class="grow">Practical information<span class="sub">Hours, wifi, the clinic, getting around</span></span>${chev}</a>
      <a class="row" href="#/house/addresses"><span class="grow">Useful addresses<span class="sub">Hospitals, police, the clinic</span></span>${chev}</a>
      ${HB.team.length ? `<a class="row" href="#/house/team"><span class="grow">The team<span class="sub">Who looks after you</span></span>${chev}</a>` : ""}
      <a class="row" href="#/house/photos"><span class="grow">Press, photographs, brochures<span class="sub">${esc(HB.distinctions)}</span></span>${chev}</a>
      <a class="row" href="#/requests"><span class="grow">Your requests</span>${chev}</a>
      ${API.mode === "demo" ? `<a class="row" href="#/demo"><span class="grow">Demo settings<span class="sub">Before arrival, during the stay, the last day</span></span>${chev}</a>` : ""}
      <button class="row" data-act="signout"><span class="grow" style="color:var(--muted)">Sign out on this phone</span></button></div>
    </div>`;

  const back = `<a href="#/house" class="small" style="display:inline-flex;align-items:center;gap:4px;margin-top:6px">‹ ${esc(C.tabs.house)}</a>`;
  V.practical = () => `<div class="screen">${back}<h1>Practical information</h1><div style="margin-top:18px;border-top:0.5px solid var(--line)">
      ${HB.practical.map(([k, v]) => `<div class="row"><span class="grow">${esc(k)}</span><span class="val">${esc(v)}</span></div>`).join("")}</div>
      <p class="note">For anything at any hour, dial 0, or <a style="text-decoration:underline" href="https://wa.me/${C.whatsappNumber}">WhatsApp ${esc(HB.house.whatsappDisplay)}</a>.</p></div>`;
  V.addresses = () => `<div class="screen">${back}<h1>Useful addresses</h1><div style="margin-top:18px;border-top:0.5px solid var(--line)">
      ${HB.addresses.map((a) => a.tel ? `<a class="row" href="tel:${esc(a.tel)}"><span class="grow">${esc(a.name)}</span><span class="val" style="color:var(--ink)">${esc(a.value)}</span></a>` : `<div class="row"><span class="grow">${esc(a.name)}</span><span class="val">${esc(a.value)}</span></div>`).join("")}</div>
      <p class="note">${esc(HB.addressesNote)}</p></div>`;
  V.team = () => `<div class="screen">${back}<h1>The team</h1>
      ${HB.team.length ? HB.team.map((m) => `<div class="row"><span class="grow">${esc(m.name)}<span class="sub">${esc(m.role)}</span></span></div>`).join("")
        : `<p class="lede">${esc(HB.teamNote)}</p>`}</div>`;
  V.photos = () => `<div class="screen">${back}<h1>Photographs</h1>
      <div class="photos">${HB.photos.map((p, i) => img(p, "", i === 0 ? "wide" : "")).join("")}</div>
      <h2 class="section">Press</h2>
      ${HB.press.map((p) => `<div class="row"><span class="grow">${esc(p.name)}</span></div>`).join("")}
      <h2 class="section">Brochures</h2>
      ${HB.brochures.length ? HB.brochures.map((b) => `<a class="row" href="${esc(b.url)}" target="_blank" rel="noopener"><span class="grow">${esc(b.name)}</span>${chev}</a>`).join("") : `<p class="small" style="margin-top:12px">To come.</p>`}
      <p class="note">${esc(HB.distinctions)}.</p></div>`;

  V.demo = () => {
    const p = API.getPhase ? API.getPhase() : "during";
    const opt = (id, n, sub) => `<button class="radio" role="radio" aria-checked="${p === id}" data-act="phase" data-id="${id}" data-name="${n}"><span class="o"></span><span style="flex:1">${n}<span class="sub">${sub}</span></span></button>`;
    return `<div class="screen">${back}<h1>Demo settings</h1>
      <p class="lede">A sample guest, Eleanor, so the app can be shown before it is connected. Nothing here leaves this phone.</p>
      <h2 class="section">The moment of the stay</h2>
      <div role="radiogroup">${opt("before", "Before arrival", "Arrival time, the car, what fills first")}${opt("during", "During the stay", "Today, the suggestion, the bill")}${opt("last", "The last day", "Late check out, the bill, a farewell")}</div>
      <a class="btn soft" href="#/email" style="margin-top:26px" data-act="signout-to-email">Show the confirmation email</a>
      <button class="btn soft" data-act="reset" style="margin-top:10px">Start the demo again</button></div>`;
  };

  /* =========================================================
   * SHEETS
   * ========================================================= */
  const nowHM = () => fmtClock(new Date());
  function timesFor(e, date) {
    if (!e.times) return null;
    return date === U.houseDate(0) ? e.times.filter((t) => t > nowHM()) : e.times;
  }
  function stayDays(e) {
    const s = S.session, t = U.houseDate(0);
    let start = s.arrival && s.arrival > t ? s.arrival : t;
    if (e && start === t && (e.fromTomorrow || (e.times && !timesFor(e, t).length))) start = U.addDays(t, 1);
    const end = s.departure || U.addDays(t, 5);
    const out = [];
    for (let d = start; d <= end && out.length < 7; d = U.addDays(d, 1)) out.push(d);
    return out.length ? out : [t];
  }
  function priceFor(e, guests) {
    const p = e.pricing || { type: "none" };
    if (p.type === "free") return "With our compliments";
    if (p.type === "perGuest") return money(p.amount * guests) + ", to your room";
    if (p.type === "flat") return guests <= p.cap ? money(p.amount) + ", to your room" : "Price confirmed by the house";
    if (p.type === "from") return "From " + money(p.amount) + ", confirmed by the house";
    return e.dept === "restaurants" ? "No charge to reserve" : "Confirmed by the house";
  }

  function openSheet(state) { S.sheet = state; drawSheet(true); }
  function closeSheet() {
    const sh = document.querySelector(".sheet"), sc = document.querySelector(".scrim");
    S.sheet = null;
    if (sh) { sh.classList.remove("on"); sc.classList.remove("on"); setTimeout(() => { sh.remove(); sc.remove(); }, 280); }
  }
  function drawSheet(first) {
    let sh = document.querySelector(".sheet"), sc = document.querySelector(".scrim");
    if (!sh) {
      sc = document.createElement("div"); sc.className = "scrim"; sc.dataset.act = "close";
      sh = document.createElement("div"); sh.className = "sheet"; sh.setAttribute("role", "dialog"); sh.setAttribute("aria-modal", "true");
      document.body.append(sc, sh);
    }
    const st = S.sheet;
    sh.setAttribute("aria-label", st.title);
    sh.innerHTML = `<div class="grabber"></div><button class="close" data-act="close" aria-label="Close"><svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></button>` + (st.type === "exp" ? sheetExp(st) : sheetSimple(st));
    if (first) requestAnimationFrame(() => { sc.classList.add("on"); sh.classList.add("on"); const f = sh.querySelector("h2"); if (f) { f.tabIndex = -1; f.focus({ preventScroll: true }); } });
  }
  function sheetExp(st) {
    const e = exp(st.id), days = stayDays(e);
    const ask = e.action === "ask", join = e.action === "join";
    const times = timesFor(e, st.date);
    if (times && (!st.time || !times.includes(st.time))) st.time = times[0] || null; // first sensible time
    const gl = e.guestsLabel || "Guests";
    return `<h2 style="padding-right:40px">${esc(e.name)}</h2><p class="small" style="margin:6px 0 0">${esc(e.sheetLine || [e.label, e.meta].filter(Boolean).join(" · "))}</p>
      ${ask ? "" : `<div class="lbl">Day</div><div class="chips wrap">${days.map((d) => `<button class="chip" aria-pressed="${st.date === d}" data-act="s-date" data-v="${d}">${esc(dayLabel(d))}</button>`).join("")}</div>
      ${times ? `<div class="lbl">Time</div><div class="chips wrap">${times.map((t) => `<button class="chip" aria-pressed="${st.time === t}" data-act="s-time" data-v="${t}">${t}</button>`).join("")}</div>` : ""}
      <div class="stepper" style="margin-top:14px"><span>${gl}</span><span class="qty"><button class="round" data-act="s-g" data-d="-1" aria-label="Fewer">−</button><span style="min-width:22px;text-align:center" aria-live="polite">${st.guests}</span><button class="round" data-act="s-g" data-d="1" aria-label="More">+</button></span></div>`}
      <label class="f">${ask ? "Tell us what you have in mind" : esc(e.notePrompt || "Anything we should know")}<textarea class="input" data-bind="sheet.note" style="min-height:64px" placeholder="${ask ? "Dates, how many, any question" : "Optional"}">${esc(st.note || "")}</textarea></label>
      ${ask ? "" : e.pricing.type === "none" && e.dept === "restaurants" ? `<p class="small" style="text-align:center;font-size:13px;margin:22px 0 -8px">No charge to reserve</p>` : `<div class="total"><span>${join ? "" : "Total"}</span><span>${esc(priceFor(e, st.guests))}</span></div>`}
      ${e.terms ? `<p class="small" style="margin:4px 0 0;font-size:13px">${esc(e.terms)}</p>` : ""}
      <button class="btn" data-act="s-send" style="margin-top:20px"${!ask && e.times && !st.time ? " disabled" : ""}>${ask ? "Send" : join ? "Join" : "Reserve"}</button>
      ${!ask && e.times && !st.time ? `<p class="small" style="text-align:center;font-size:13px;margin:8px 0 0">Choose a time</p>` : ""}`;
  }
  const SIMPLE = {
    late: () => ({ title: HB.lastDay.lateCheckOut.name, line: HB.lastDay.lateCheckOut.sub, price: money(HB.lastDay.lateCheckOut.price) + ", to your room", dept: "frontoffice", cta: "Request late check out", date: S.session.departure }),
    airport: () => ({ title: HB.lastDay.airportCar.name, line: HB.lastDay.airportCar.sub, price: money(HB.lastDay.airportCar.price) + ", to your room", dept: "transport", cta: "Reserve the car", date: S.session.departure, field: "Your flight, and the time" }),
    bill: () => ({ title: "Bring my bill to breakfast", line: "We will bring your bill to your table, to settle at leisure.", dept: "frontoffice", cta: "Yes, please", date: S.session.departure }),
    word: () => ({ title: "Leave us a word", line: "Read by the team, and by the owner.", dept: "frontoffice", cta: "Send", field: "Your word on your stay", required: true }),
    other: () => ({ title: "Something else", line: "Tell us what needs attention, and we will come.", dept: "maintenance", cta: "Send", field: "What needs attention", required: true, date: U.houseDate(0) })
  };
  function sheetSimple(st) {
    return `<h2>${esc(st.title)}</h2><p class="small" style="margin:6px 0 0">${esc(st.line || "")}</p>
      ${st.field ? `<label class="f">${esc(st.field)}<textarea class="input" data-bind="sheet.note" style="min-height:70px">${esc(st.note || "")}</textarea></label>` : ""}
      ${st.price ? `<div class="total"><span>Total</span><span>${esc(st.price)}</span></div>` : ""}
      <button class="btn" data-act="s-simple" style="margin-top:20px"${st.required && !(st.note || "").trim() ? " disabled" : ""}>${esc(st.cta)}</button>`;
  }

  async function send(req) {
    try {
      const r = await API.sendRequest(req, S.session);
      S.justSent = r.id;
      S.requests = await API.listRequests();
      closeSheet();
      return r;
    } catch (e) { toast(e.message || "Could not send. Please dial 0."); return null; }
  }

  /* =========================================================
   * EVENTS
   * ========================================================= */
  document.addEventListener("click", async (ev) => {
    const el = ev.target.closest("[data-act]");
    if (!el) return;
    const a = el.dataset.act, id = el.dataset.id;
    if (el.tagName === "A" && a !== "signout-to-email") return;
    if (el.tagName !== "A") ev.preventDefault();
    const st = S.sheet;

    switch (a) {
      case "close": closeSheet(); break;
      case "reserve": {
        const e = exp(id); if (!e) return;
        const days = stayDays(e);
        openSheet({ type: "exp", id, title: e.name, date: days[0], time: null, guests: Math.min(S.session.guests || 2, e.guestsLabel ? 1 : 10), note: "" });
        break;
      }
      case "s-date": st.date = el.dataset.v; drawSheet(); break;
      case "s-time": st.time = el.dataset.v; drawSheet(); break;
      case "s-g": st.guests = Math.max(1, Math.min(20, st.guests + Number(el.dataset.d))); drawSheet(); break;
      case "s-send": {
        const e = exp(st.id);
        const ask = e.action === "ask";
        const r = await send({
          kind: ask ? "ask" : "reserve", expId: e.id, title: e.name, dept: e.dept,
          date: ask ? null : st.date, time: ask ? null : st.time, guests: ask ? null : st.guests,
          summary: ask ? "" : [dayLabel(st.date), st.time, st.guests + " " + (e.guestsLabel || "guests").toLowerCase()].filter(Boolean).join(" · "),
          total: ask ? "" : priceFor(e, st.guests), note: (st.note || "").trim()
        });
        if (r) location.hash = "#/request/" + r.id;
        break;
      }
      case "simple": openSheet(Object.assign({ type: "simple", kind: el.dataset.kind, note: "" }, SIMPLE[el.dataset.kind]())); break;
      case "s-simple": {
        const r = await send({ kind: st.kind, title: st.title, dept: st.dept, date: st.date || null, summary: st.line, total: st.price || "", note: (st.note || "").trim() });
        if (r) location.hash = "#/request/" + r.id;
        break;
      }
      case "care": {
        if (id === "other") { openSheet(Object.assign({ type: "simple", kind: "repair", note: "" }, SIMPLE.other())); break; }
        const list = el.dataset.kind === "housekeeping" ? HB.housekeeping : HB.repairs;
        const t = list.find((x) => x.id === id);
        if (S.requests.some((q) => q.itemId === id && q.date === U.houseDate(0))) { toast("Already on its way"); break; }
        const r = await send({ kind: el.dataset.kind, itemId: id, title: t.name, dept: el.dataset.kind, date: U.houseDate(0), summary: el.dataset.kind === "maintenance" ? "Something to fix" : "Housekeeping" });
        if (r) { toast(t.name + ": sent to " + dept(el.dataset.kind).name.toLowerCase()); render(true); }
        break;
      }
      case "qty": S.cart[id] = Math.max(0, (S.cart[id] || 0) + Number(el.dataset.d)); if (!S.cart[id]) delete S.cart[id]; render(true); break;
      case "order": {
        const items = HB.menu.items.filter((i) => S.cart[i.id]);
        const total = items.reduce((a, i) => a + S.cart[i.id] * i.price, 0);
        const r = await send({ kind: "dining", title: "In room dining", dept: "dining", date: U.houseDate(0), time: fmtClock(new Date()),
          summary: items.map((i) => S.cart[i.id] + " × " + i.name).join(", "), total: (items.some((i) => i.label) ? "from " : "") + money(total) + ", to your room" });
        if (r) { S.cart = {}; location.hash = "#/request/" + r.id; }
        break;
      }
      case "chip": S.askDraft = el.dataset.text + ": "; render(true); const m = document.getElementById("msg"); if (m) { m.focus(); m.setSelectionRange(m.value.length, m.value.length); } break;
      case "car": S.arrival.car = id; render(true); break;
      case "send-arrival": {
        const A = S.arrival, car = HB.arrival.cars.find((c) => c.id === A.car);
        const r = await send({ kind: "arrival", title: "Arrival details", dept: "frontoffice", date: S.session.arrival,
          summary: [A.time ? "Arriving: " + A.time : "Arrival time to follow", "Car: " + car.name + (car.price ? " (" + money(car.price) + ")" : ""), A.allergies ? "Allergies and preferences: " + A.allergies : null].filter(Boolean).join(" · ") });
        if (r) { U.store.set("arrivalSent", true); location.hash = "#/request/" + r.id; }
        break;
      }
      case "phase": API.setPhase(id); S.session = await API.restore(); toast("Showing: " + el.dataset.name.toLowerCase()); render(true); break;
      case "reset": await API.reset(); S.session = null; S.requests = []; S.messages = []; S.cart = {}; location.hash = "#/signin"; render(); break;
      case "signout-to-email": await API.signOut(); S.session = null; break;
      case "signout": await API.signOut(); S.session = null; S.requests = []; location.hash = "#/signin"; render(); break;
      case "open-link": { // demo: the personal link in the email
        S.session = await API.signIn({ token: "demo" }); await refresh(); location.hash = "#/welcome"; break;
      }
    }
  });

  document.addEventListener("input", (ev) => {
    const b = ev.target.dataset.bind; if (!b) return;
    const [o, k] = b.split(".");
    if (k) { if (o === "sheet" && S.sheet) { S.sheet.note = ev.target.value; const btn = document.querySelector('.sheet [data-act="s-simple"]'); if (btn && S.sheet.required) btn.disabled = !ev.target.value.trim(); } else S[o][k] = ev.target.value; }
    else S[o] = ev.target.value;
  });

  document.addEventListener("submit", async (ev) => {
    const f = ev.target.dataset.form; if (!f) return;
    ev.preventDefault();
    const fd = new FormData(ev.target), err = document.getElementById("err");
    try {
      if (f === "signin") S.session = await API.signIn({ booking: fd.get("booking"), surname: fd.get("surname") });
      if (f === "signin-wa") S.session = await API.signIn({ name: fd.get("name"), room: fd.get("room") });
      if (f === "signin" || f === "signin-wa") { await refresh(); location.hash = "#/welcome"; }
      if (f === "ask") {
        const text = (S.askDraft || "").trim(); if (!text) return;
        S.askDraft = "";
        await API.sendMessage(text, S.session);
        S.messages = await API.listMessages();
        render(true); scrollEnd();
      }
    } catch (e) { if (err) err.textContent = e.message; else toast(e.message); }
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && S.sheet) closeSheet(); });

  function scrollEnd() { window.scrollTo({ top: document.body.scrollHeight }); }

  /* =========================================================
   * ROUTER
   * ========================================================= */
  function route() {
    const h = (location.hash || "#/today").slice(2).split("/");
    const r = { name: h[0] || "today", arg: h[1] || null };
    if (r.name === "house" && r.arg) r.name = r.arg;
    if (r.name === "welcome") r.name = "splash";
    return r;
  }
  const TAB_OF = { today: "today", arrival: "today", bill: "today", requests: "today", discover: "discover", room: "room", ask: "ask", house: "house", practical: "house", addresses: "house", team: "house", photos: "house", demo: "house" };
  const PUBLIC = ["signin", "email"];

  let lastRoute = "";
  function render(keepScroll) {
    const r = route();
    if (!S.session && !PUBLIC.includes(r.name)) { if (location.hash !== "#/signin") { location.replace("#/signin"); return; } }
    if (S.session && r.name === "signin") { location.replace("#/today"); return; }
    const view = V[r.name] || V.today;
    // keep the focused field and caret through a re-render
    const a = document.activeElement, bind = a && a.dataset && a.dataset.bind, pos = bind && a.selectionStart;
    const tab = r.name === "request" ? S.lastTab : TAB_OF[r.name];
    if (tab && r.name !== "request") S.lastTab = tab;
    const html = view(r);
    const ended = S.session && phase(S.session) === "ended";
    app.innerHTML = html + (S.session && tab && !ended ? tabbar(tab) : "") +
      (API.mode === "demo" && S.session && r.name !== "splash" && r.name !== "demo" ? `<a class="demo" href="#/demo" style="display:flex;align-items:center">Demo</a>` : "");
    if (bind) { const n = app.querySelector(`[data-bind="${bind}"]`); if (n) { n.focus({ preventScroll: true }); try { n.setSelectionRange(pos, pos); } catch (e) { } } }
    const key = r.name + "/" + r.arg;
    if (!keepScroll && key !== lastRoute) window.scrollTo(0, 0);
    if (r.name === "ask" && key !== lastRoute) setTimeout(scrollEnd, 0);
    // opening screen fades into Today
    if (lastRoute.startsWith("splash") && r.name !== "splash") {
      app.classList.remove("enter"); void app.offsetWidth; app.classList.add("enter");
      setTimeout(() => app.classList.remove("enter"), 600);
    }
    setupTopbar(r.name);
    lastRoute = key;
    document.title = (r.name === "today" ? "" : (C.tabs[tab] || "") + " · ") + "Al Moudira";
  }

  /* Large title shrinks into a slim bar when the guest scrolls */
  const NO_BAR = ["splash", "signin", "email", "request"];
  let barTitle = null;
  function setupTopbar(name) {
    let bar = document.querySelector(".topbar");
    const h1 = app.querySelector(".screen h1");
    if (!bar) { bar = document.createElement("div"); bar.className = "topbar"; bar.setAttribute("aria-hidden", "true"); document.body.appendChild(bar); }
    barTitle = NO_BAR.includes(name) || !h1 ? null : h1;
    if (barTitle) { barTitle.classList.add("big"); bar.textContent = name === "today" ? C.tabs.today : barTitle.textContent.trim(); }
    onScroll();
  }
  function onScroll() {
    const bar = document.querySelector(".topbar");
    if (!bar) return;
    if (!barTitle || !barTitle.isConnected) { bar.classList.remove("on"); return; }
    const end = barTitle.offsetTop + barTitle.offsetHeight - 44;
    const y = window.scrollY;
    const start = Math.max(0, end - 40), span = Math.max(10, end - start);
    const k = Math.max(0, Math.min(1, (y - start) / span));
    barTitle.style.opacity = String(1 - k);
    bar.classList.toggle("on", k >= 1);
  }
  window.addEventListener("scroll", onScroll, { passive: true });

  async function refresh() {
    try { S.requests = await API.listRequests(); } catch (e) { }
    try {
      S.messages = (await API.listMessages()).map((m) => m.who === "Guest Relations" ? Object.assign({}, m, { who: "The front office" }, /^Good morning, \w+\. Write to us/.test(m.text || "") ? { welcome: true } : {}) : m);
    } catch (e) { }
  }

  window.addEventListener("hashchange", () => { if (S.sheet) closeSheet(); render(); });
  API.onUpdate(async () => { await refresh(); if (!S.sheet) render(true); });

  async function boot() {
    const params = new URLSearchParams(location.search);
    const t = params.get("t");
    if (t) {
      try { S.session = await API.signIn({ token: t }); history.replaceState(null, "", location.pathname + "#/welcome"); }
      catch (e) { history.replaceState(null, "", location.pathname + "#/signin"); }
    } else {
      S.session = await API.restore();
    }
    await refresh();
    render();
    loadTemp();
    if ("serviceWorker" in navigator && window.top === window && location.protocol === "https:" && C.mode !== "demo") {
      navigator.serviceWorker.register("sw.js").catch(() => {});
    }
  }
  boot();
})();
