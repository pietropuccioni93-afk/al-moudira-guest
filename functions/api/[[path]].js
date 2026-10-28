/*
 * Stage 2 backend (Cloudflare Pages Functions). Not deployed yet.
 * Written against the Cloudbeds API docs (v1.3), untested against the real
 * account, so check everything marked VERIFY.
 *
 * Environment (Cloudflare dashboard > Pages project > Settings):
 *   CLOUDBEDS_API_KEY   secret, property-level key (Cloudbeds > Apps & Marketplace > API Credentials)
 *   CLOUDBEDS_PROPERTY  property ID
 *   SESSION_SECRET      secret, long random string (signs links and cookies)
 *   STAFF_KEY           secret, for the staff confirm endpoint
 *   REQUESTS            KV namespace binding (requests and messages)
 *
 * Routes
 *   POST   /api/session            { booking, surname } or { token }   sign in
 *   DELETE /api/session                                                sign out
 *   GET    /api/stay                                                   the stay, bill, bookings
 *   GET    /api/requests  |  POST /api/requests                        guest requests
 *   GET    /api/messages  |  POST /api/messages                        chat with the front office
 *   POST   /api/staff/request      { id, rid, status } + X-Staff-Key   a person confirms
 *   POST   /api/staff/link         { reservationID } + X-Staff-Key     make a personal link
 */

const CB = "https://api.cloudbeds.com/api/v1.3";
const enc = new TextEncoder();

// HMAC signing for links + session cookie
async function hmac(secret, data) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
async function sign(env, payload) {
  const body = btoa(JSON.stringify(payload)).replace(/=+$/, "");
  return body + "." + (await hmac(env.SESSION_SECRET, body));
}
async function verify(env, token) {
  if (!token || !token.includes(".")) return null;
  const [body, sig] = token.split(".");
  if ((await hmac(env.SESSION_SECRET, body)) !== sig) return null;
  const p = JSON.parse(atob(body));
  if (p.exp && Date.now() > p.exp) return null;
  return p;
}

// Cloudbeds
async function cloudbeds(env, method, path, params) {
  const url = new URL(CB + "/" + path);
  const init = { method, headers: { "x-api-key": env.CLOUDBEDS_API_KEY } };
  const all = Object.assign({ propertyID: env.CLOUDBEDS_PROPERTY }, params || {});
  if (method === "GET") Object.entries(all).forEach(([k, v]) => v != null && url.searchParams.set(k, v));
  else { init.body = new URLSearchParams(all); init.headers["Content-Type"] = "application/x-www-form-urlencoded"; }
  const res = await fetch(url, init);
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) throw new Error("Cloudbeds " + path + ": " + (json.message || res.status));
  return json;
}

// lookup by booking number + surname (getReservations filters on lastName)
async function findReservation(env, booking, surname) {
  const id = String(booking || "").replace(/\s/g, "");
  const today = new Date().toISOString().slice(0, 10);
  const r = await cloudbeds(env, "GET", "getReservations", { lastName: surname.trim(), checkOutFrom: today });
  // VERIFY: which field holds the number printed on the confirmation email
  // (reservationID, or the third-party/source id). The fallback compares both.
  const hit = (r.data || []).find((x) => [x.reservationID, x.sourceReservationID, x.thirdPartyIdentifier].filter(Boolean)
    .some((v) => String(v).replace(/\s/g, "").toUpperCase() === id.toUpperCase()));
  if (!hit) return null;
  if (!["confirmed", "checked_in"].includes(hit.status)) return null;
  return hit.reservationID;
}

// VERIFY: field names in the getReservation response.
function mapStay(d) {
  const guests = d.guestList ? Object.values(d.guestList) : [];
  const main = guests.find((g) => g.isMainGuest) || guests[0] || {};
  const rooms = d.assigned || [];
  return {
    guest: { first: main.guestFirstName || (d.guestName || "").split(" ")[0], last: main.guestLastName || "" },
    booking: d.reservationID,
    room: rooms[0] ? rooms[0].roomName : null,
    guests: rooms.reduce((a, r) => a + Number(r.adults || 0) + Number(r.children || 0), 0) || guests.length || 1,
    arrival: d.startDate,
    departure: d.endDate,
    bill: { total: Number(d.balance || 0), lines: [] } // itemised lines: VERIFY which endpoint returns the folio
  };
}

// helpers
const json = (body, status, headers) => new Response(JSON.stringify(body), { status: status || 200, headers: Object.assign({ "Content-Type": "application/json", "Cache-Control": "no-store" }, headers || {}) });
function cookie(req, name) { const m = (req.headers.get("Cookie") || "").match(new RegExp("(?:^|; )" + name + "=([^;]+)")); return m ? m[1] : null; }
async function session(env, req) { return verify(env, cookie(req, "am_s")); }
function sessionCookie(token, expMs) {
  return `am_s=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Expires=${new Date(expMs).toUTCString()}`;
}
const uid = () => "r" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const clean = (s, n) => String(s || "").replace(/[\u0000-\u001f]/g, " ").slice(0, n || 500);

async function listKV(env, key) { return JSON.parse((await env.REQUESTS.get(key)) || "[]"); }
async function putKV(env, key, list, expMs) {
  // TTL: 30 days after departure
  await env.REQUESTS.put(key, JSON.stringify(list), { expiration: Math.floor((expMs + 30 * 86400000) / 1000) });
}

// routes
export async function onRequest({ request: req, env, params }) {
  const path = "/" + [].concat(params.path || []).join("/");
  const m = req.method;
  try {
    if (path === "/session" && m === "POST") {
      const b = await req.json();
      let rid = null;
      if (b.token) { const p = await verify(env, b.token); rid = p && p.rid; }
      else if (b.booking && b.surname) rid = await findReservation(env, b.booking, b.surname);
      if (!rid) return json({ error: "We could not find that booking. Please check the number and the surname, or dial 0." }, 404);
      const d = (await cloudbeds(env, "GET", "getReservation", { reservationID: rid })).data;
      const stay = mapStay(d);
      const exp = Date.parse(stay.departure + "T23:59:59+02:00"); // end of departure day
      const tok = await sign(env, { rid, exp });
      return json({ ok: true }, 200, { "Set-Cookie": sessionCookie(tok, exp) });
    }
    if (path === "/session" && m === "DELETE") return json({ ok: true }, 200, { "Set-Cookie": "am_s=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax" });

    if (path.startsWith("/staff/")) {
      if (req.headers.get("X-Staff-Key") !== env.STAFF_KEY) return json({ error: "forbidden" }, 403);
      const b = await req.json();
      if (path === "/staff/link") {
        const d = (await cloudbeds(env, "GET", "getReservation", { reservationID: b.reservationID })).data;
        const exp = Date.parse(mapStay(d).departure + "T23:59:59+02:00");
        return json({ link: new URL(req.url).origin + "/?t=" + (await sign(env, { rid: b.reservationID, exp })) });
      }
      if (path === "/staff/request") {
        const list = await listKV(env, "req:" + b.rid);
        const r = list.find((x) => x.id === b.id);
        if (!r) return json({ error: "not found" }, 404);
        r.status = b.status === "declined" ? "declined" : "confirmed";
        r.confirmedBy = clean(b.by, 60) || null;
        r.confirmedAt = Date.now();
        await putKV(env, "req:" + b.rid, list, Date.now());
        return json({ ok: true });
      }
    }

    const s = await session(env, req);
    if (!s) return json({ error: "signed-out" }, 401);

    if (path === "/stay" && m === "GET") {
      const d = (await cloudbeds(env, "GET", "getReservation", { reservationID: s.rid })).data;
      const stay = mapStay(d);
      const reqs = await listKV(env, "req:" + s.rid);
      stay.bookings = reqs.filter((r) => r.kind === "reserve" && r.status === "confirmed").map((r) => ({ date: r.date, time: r.time, name: r.title, sub: r.summary }));
      return json(stay);
    }

    if (path === "/requests") {
      const key = "req:" + s.rid;
      if (m === "GET") return json({ requests: await listKV(env, key) });
      if (m === "POST") {
        const b = await req.json();
        const r = {
          id: uid(), status: "sent", at: Date.now(),
          kind: clean(b.kind, 20), dept: clean(b.dept, 20), title: clean(b.title, 120), itemId: clean(b.itemId, 40) || undefined,
          date: clean(b.date, 10) || null, time: clean(b.time, 5) || null, guests: Number(b.guests) || null,
          summary: clean(b.summary, 500), total: clean(b.total, 80), note: clean(b.note, 1000)
        };
        const list = await listKV(env, key); list.unshift(r); await putKV(env, key, list, s.exp);
        // write it on the reservation in Cloudbeds
        await cloudbeds(env, "POST", "postReservationNote", {
          reservationID: s.rid,
          reservationNote: `[APP][${r.dept.toUpperCase()}] ${r.title}. ${r.summary}${r.total ? ". " + r.total : ""}${r.note ? ". Note: " + r.note : ""} (ref ${r.id})`
        });
        // TODO (KIT): notify the department (WhatsApp Business, Teams or email per "Who Confirms What")
        return json(r);
      }
    }

    if (path === "/messages") {
      const key = "msg:" + s.rid;
      if (m === "GET") return json({ messages: await listKV(env, key) });
      if (m === "POST") {
        const b = await req.json();
        const list = await listKV(env, key);
        list.push({ from: "guest", text: clean(b.text, 2000), at: Date.now() });
        await putKV(env, key, list, s.exp);
        // TODO (KIT): deliver to the front office inbox (Whistle, WhatsApp Business or HubSpot) and bring replies back here
        return json({ ok: true });
      }
    }
    return json({ error: "not found" }, 404);
  } catch (e) {
    console.error(e);
    return json({ error: "Something went wrong on our side. Please dial 0." }, 500);
  }
}
