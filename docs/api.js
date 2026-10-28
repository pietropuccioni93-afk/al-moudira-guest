// Data layer. Views only use window.API; swap the adapter for stage 2 (Cloudbeds).
(function () {
  const C = window.APP_CONFIG;

  // storage + dates
  const store = {
    get(k, d) { try { const v = localStorage.getItem("am_" + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem("am_" + k, JSON.stringify(v)); } catch (e) { /* private mode */ } },
    del(k) { try { localStorage.removeItem("am_" + k); } catch (e) { } }
  };

  // YYYY-MM-DD in Cairo
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

  // change listeners
  const listeners = new Set();
  function emit() { listeners.forEach((fn) => { try { fn(); } catch (e) { console.error(e); } }); }

  // stage 1: whatsapp handoff, nothing stored server side
  function whatsappAdapter() {
    function open(text) {
      const url = "https://wa.me/" + C.whatsappNumber + "?text=" + encodeURIComponent(text);
      const w = window.open(url, "_blank", "noopener");
      if (!w) location.href = url; // popup blocked
    }
    function header(s) { return [s.guest.first + " " + s.guest.last, s.room ? "Room " + s.room : null].filter(Boolean).join(" · "); }
    return {
      mode: "whatsapp",
      async restore() {
        const s = store.get("session", null);
        if (!s) return null;
        // expire after 21 days
        if (!s.at || Date.now() - s.at > 21 * 86400000) { store.del("session"); store.del("requests"); return null; }
        return Object.assign({ bookings: [], bill: null, guests: 2 }, s);
      },
      async signIn(creds) {
        if (!creds.name) throw new Error("Please tell us your name.");
        const parts = creds.name.trim().split(/\s+/);
        const s = { guest: { first: parts[0], last: parts.slice(1).join(" ") }, room: (creds.room || "").trim(), arrival: null, departure: null, at: Date.now() };
        store.set("session", s);
        return this.restore();
      },
      async signOut() { store.del("session"); store.del("requests"); },
      async sendRequest(req, session) {
        const dept = C.departments[req.dept] || C.departments.frontoffice;
        const lines = ["[" + dept.tag + "] " + req.title, header(session)];
        if (req.summary) lines.push(req.summary);
        if (req.total) lines.push(/^(\d|from )/i.test(req.total) ? "Total " + req.total : req.total);
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

  // stage 2: /api -> Cloudbeds (key stays server side)
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
      poll = setInterval(emit, 20000);
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

  const adapters = { whatsapp: whatsappAdapter, live: liveAdapter };
  window.API = (adapters[C.mode] || whatsappAdapter)();
  window.API.onUpdate = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
})();
