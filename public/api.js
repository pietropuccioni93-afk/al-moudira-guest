/*
 * The data layer. The screens only talk to window.API, so moving from the demo
 * to WhatsApp (stage 1) to Cloudbeds (stage 2) changes this file's adapter,
 * not the screens.
 */
(function () {
  const C = window.APP_CONFIG;

  /* ---------- small shared helpers ---------- */
  const store = {
    get(k, d) { try { const v = localStorage.getItem("am_" + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem("am_" + k, JSON.stringify(v)); } catch (e) { /* private mode */ } },
    del(k) { try { localStorage.removeItem("am_" + k); } catch (e) { } }
  };

  // Today's date at the house, as YYYY-MM-DD
  function houseDate(offsetDays) {
    const d = new Date(Date.now() + (offsetDays || 0) * 86400000);
    return new Intl.DateTimeFormat("en-CA", { timeZone: C.timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
  }
  function addDays(ymd, n) {
    const [y, m, d] = ymd.split("-").map(Number);
    const t = new Date(Date.UTC(y, m - 1, d + n));
    return t.toISOString().slice(0, 10);
  }
  function uid() { return "r" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

  window.U = { store, houseDate, addDays, uid };

  /* ---------- listeners (status changes, new messages) ---------- */
  const listeners = new Set();
  function emit() { listeners.forEach((fn) => { try { fn(); } catch (e) { console.error(e); } }); }

  /* =========================================================
   * DEMO: a sample guest, nothing leaves the phone.
   * ========================================================= */
  function demoAdapter() {
    function buildStay(phase) {
      const today = houseDate(0);
      let arrival, departure;
      if (phase === "before") { arrival = addDays(today, 2); departure = addDays(today, 7); }
      else if (phase === "last") { arrival = addDays(today, -4); departure = today; }
      else { arrival = addDays(today, -2); departure = addDays(today, 3); }
      const t1 = addDays(today, 1);
      return {
        guest: { first: "Eleanor", last: "Hart" },
        booking: "AM 48210",
        room: "Fountain Suite 12",
        guests: 2,
        arrival, departure,
        bookings: phase === "before" ? [] : [
          { date: today, time: "13:00", name: "Lunch at the Farm Kitchen", sub: "A table for two" },
          { date: t1, time: "05:10", name: "The balloon at sunrise", sub: "Your car leaves reception" },
          { date: t1, time: "19:30", name: "Dinner at Khan Al Moudira", sub: "A table for two" }
        ],
        bill: phase === "before" ? { total: 0, lines: [] } : {
          total: phase === "last" ? 1284.5 : 412.5,
          lines: phase === "last"
            ? [["Fountain Suite, 4 nights", 980], ["The balloon at sunrise", 280], ["In room dining", 24.5]]
            : [["Lunch at the Farm Kitchen", 96], ["Signature massage, two", 220], ["The Pool Pavilion", 72], ["In room dining", 24.5]]
        }
      };
    }
    const DEMO_DELAY = 6000; // a person "confirms" after a few seconds

    function scheduleConfirm(r) {
      setTimeout(() => {
        const list = store.get("requests", []);
        const x = list.find((i) => i.id === r.id);
        if (x && x.status === "sent") {
          x.status = "confirmed";
          x.confirmedBy = (C.departments[x.dept] || {}).name || "The house";
          x.confirmedAt = Date.now();
          store.set("requests", list);
          emit();
        }
      }, DEMO_DELAY);
    }

    return {
      mode: "demo",
      async restore() {
        const s = store.get("session", null);
        if (!s) return null;
        return Object.assign(buildStay(store.get("demoPhase", "during")), { demo: true });
      },
      async signIn(creds) {
        if (creds.token || creds.booking) {
          const ok = creds.token || (creds.booking.replace(/\s/g, "").toUpperCase() === "AM48210" && /^hart$/i.test(creds.surname.trim()));
          if (!ok) throw new Error("We could not find that booking. Please check the number and the surname as on your booking. For the demo: AM 48210, Hart.");
          store.set("session", { at: Date.now() });
          return this.restore();
        }
        throw new Error("Missing details");
      },
      async signOut() { store.del("session"); },
      setPhase(p) { store.set("demoPhase", p); },
      getPhase() { return store.get("demoPhase", "during"); },
      async reset() { ["session", "requests", "messages", "demoPhase", "arrivalSent"].forEach(store.del); },
      async sendRequest(req) {
        const r = Object.assign({ id: uid(), status: "sent", at: Date.now() }, req);
        const list = store.get("requests", []); list.unshift(r); store.set("requests", list);
        scheduleConfirm(r); emit();
        return r;
      },
      async listRequests() { return store.get("requests", []); },
      async getRequest(id) { return store.get("requests", []).find((r) => r.id === id) || null; },
      async listMessages() {
        return store.get("messages", [
          { from: "house", who: "Guest Relations", text: "Good morning, Eleanor. Write to us here at any hour, about anything at all.", at: Date.now() - 3600000 }
        ]);
      },
      async sendMessage(text) {
        const list = await this.listMessages();
        list.push({ from: "guest", text, at: Date.now() });
        store.set("messages", list); emit();
        setTimeout(async () => {
          const l = await this.listMessages();
          l.push({ from: "house", who: "Guest Relations", text: "Thank you, Eleanor. With pleasure, we will confirm here in a moment.", at: Date.now(), demo: true });
          store.set("messages", l); emit();
        }, 2500);
      }
    };
  }

  /* =========================================================
   * STAGE 1: WhatsApp to reception. No guest data is stored
   * anywhere but the guest's own phone.
   * ========================================================= */
  function whatsappAdapter() {
    function open(text) {
      const url = "https://wa.me/" + C.whatsappNumber + "?text=" + encodeURIComponent(text);
      const w = window.open(url, "_blank", "noopener");
      if (!w) location.href = url; // pop-up blocked: open WhatsApp in this tab
    }
    function header(s) { return [s.guest.first + " " + s.guest.last, s.room ? "Room " + s.room : null].filter(Boolean).join(" · "); }
    return {
      mode: "whatsapp",
      async restore() {
        const s = store.get("session", null);
        if (!s) return null;
        return Object.assign({ bookings: [], bill: null, guests: 2 }, s);
      },
      async signIn(creds) {
        if (!creds.name) throw new Error("Please tell us your name.");
        const parts = creds.name.trim().split(/\s+/);
        const s = { guest: { first: parts[0], last: parts.slice(1).join(" ") }, room: (creds.room || "").trim(), arrival: null, departure: null };
        store.set("session", s);
        return this.restore();
      },
      async signOut() { store.del("session"); store.del("requests"); },
      async sendRequest(req, session) {
        const dept = C.departments[req.dept] || C.departments.frontoffice;
        const lines = ["[" + dept.tag + "] " + req.title, header(session)];
        if (req.summary) lines.push(req.summary);
        if (req.total) lines.push("Total " + req.total);
        if (req.note) lines.push("Note: " + req.note);
        open(lines.join("\n"));
        const r = Object.assign({ id: uid(), status: "sent", at: Date.now(), via: "WhatsApp" }, req);
        const list = store.get("requests", []); list.unshift(r); store.set("requests", list); emit();
        return r;
      },
      async listRequests() { return store.get("requests", []); },
      async getRequest(id) { return store.get("requests", []).find((r) => r.id === id) || null; },
      async listMessages() { return []; },
      async sendMessage(text, session) { open("[FRONT OFFICE] " + header(session) + "\n" + text); }
    };
  }

  /* =========================================================
   * STAGE 2: live, through /api (functions/api), which talks to
   * Cloudbeds with the hotel's key. The key never reaches the phone.
   * ========================================================= */
  function liveAdapter() {
    async function call(path, opts) {
      const res = await fetch(C.apiBase + path, Object.assign({ credentials: "include", headers: { "Content-Type": "application/json" } }, opts || {}));
      if (res.status === 401) { const e = new Error("signed-out"); e.code = 401; throw e; }
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Something went wrong. Please try again, or dial 0.");
      return body;
    }
    let poll = null;
    function startPolling() {
      if (poll) return;
      poll = setInterval(emit, 20000); // refresh statuses and messages every 20 s
    }
    return {
      mode: "live",
      async restore() { try { const s = await call("/stay"); startPolling(); return s; } catch (e) { return null; } },
      async signIn(creds) { await call("/session", { method: "POST", body: JSON.stringify(creds) }); return this.restore(); },
      async signOut() { await call("/session", { method: "DELETE" }).catch(() => {}); },
      async sendRequest(req) { const r = await call("/requests", { method: "POST", body: JSON.stringify(req) }); emit(); return r; },
      async listRequests() { return (await call("/requests")).requests || []; },
      async getRequest(id) { return (await this.listRequests()).find((r) => r.id === id) || null; },
      async listMessages() { return (await call("/messages")).messages || []; },
      async sendMessage(text) { await call("/messages", { method: "POST", body: JSON.stringify({ text }) }); emit(); }
    };
  }

  const adapters = { demo: demoAdapter, whatsapp: whatsappAdapter, live: liveAdapter };
  window.API = (adapters[C.mode] || demoAdapter)();
  window.API.onUpdate = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
})();
