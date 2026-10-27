# Al Moudira guest web app

A website for guests staying at Al Moudira, opened from the QR card in the room or
the link at guest.moudira.com. Nothing to download. It works
on any phone browser and can be added to the home screen with the Al Moudira icon.

Design: Matilda Fender. Build: Pietro Puccioni, with KIT. October 2026.

---

## 1. What is built

| Area | Status |
|---|---|
| Sign in: name and room (Stage 1); personal link or booking number and surname (Stage 2) | Working |
| Today: the day in time order, daily programme, one suggestion, sunrise and sunset, temperature, leaving time, late check out, the bill | Working |
| Today before arrival: arrival time, car, allergies, "these fill first" | Working |
| Today on the last day: late check out, airport car, bill to breakfast, a word, a return | Working |
| Discover: 24 experiences in five filters, from the House Book, with Reserve, Join or Ask | Working |
| Reserve sheet: day, time, guests, note, total, terms | Working |
| Requests: every request opens WhatsApp to reception, tagged for the department; Today lists what was sent | Working |
| Room: in room dining with a running order; housekeeping and repairs in one tap | Working |
| Ask: a message to the front office on WhatsApp, quick requests | Working |
| Al Moudira: the Farm booklet map (full screen, pinch zoom) with its key, the Guest Directory, practical information, useful addresses with tap to call, photographs, press | Working (team to come) |
| Documents in context: The Farm booklet in Farm, the Guest Directory under Al Moudira; menus and brochures appear where they belong once their files are added (`content.js` > `documents`, `placements`) | Working |
| Light only (the logo is dark ink), large text, screen readers, reduced motion, phone and desktop | Working |
| Works offline once opened (service worker), home screen icon (manifest) | Working on the live site |
| Server: Cloudbeds sign in, stay, bill, requests on the booking | **Scaffold, not yet run** (see 4) |

Everything a guest reads (texts, prices, hours, photos) lives in one file,
`docs/content.js`: the House Book. Tab names and departments are in `docs/config.js`.

## 2. Modes

`docs/config.js` > `mode`:

- **`whatsapp`** (Stage 1, live for guests): no booking lookup and **no guest data stored** on any server. The guest types their name and room; every request opens WhatsApp to reception (+20 122 3251 307), already written and tagged for the department, after a short note: "WhatsApp will open with your request written. Press Send, and we will confirm." The phone forgets the guest three weeks after sign in.
- **`live`** (Stage 2): sign in, the stay and the bill come from Cloudbeds through `/api`; every request is recorded on the booking.
- The demo with a sample guest (Eleanor, AM 48210) was removed for launch. It is kept in the history: `git checkout 37c3d61`.

## 3. Hosting and address (recommendation)

**Cloudflare Pages, at `guest.moudira.com`, in an account owned by the hotel.**

- Static site plus small server functions in the same project; free plan is enough for one hotel.
- Fast in Egypt and abroad (global network), HTTPS included.
- The subdomain can point to Cloudflare without moving moudira.com away from Wix:
  1. Cloudflare dashboard > Workers & Pages > Create > Pages > upload or connect this folder. Output folder: `docs`.
  2. In the project: Custom domains > Set up a domain > `guest.moudira.com`. Do this first, or the address shows an error.
  3. In Wix: Domains > Domain Actions next to moudira.com > Manage DNS Records > CNAME (Aliases) > + Add Record. Host name `guest`, value `<project>.pages.dev`. Save. Can take up to 48 hours.
  4. If moudira.com is connected to Wix "via pointing", add the same CNAME at the domain's registrar instead.
- The hotel owns the domain, the Cloudflare account, the Cloudbeds key and this code.

Sources: Wix, "Connecting a Subdomain to an External Resource"; Cloudflare Pages, "Custom domains" (a subdomain does not need to be a Cloudflare zone).

## 4. Cloudbeds connection (Stage 2)

Code: `functions/api/[[path]].js`. Written against the Cloudbeds API reference (v1.3). **Not yet tested against the hotel's account**; lines marked `VERIFY` need a real response.

| Need | Cloudbeds endpoint | Notes |
|---|---|---|
| Sign in with booking number and surname | `GET getReservations?lastName=&checkOutFrom=` | Filters on the primary guest's surname. Then match the booking number. |
| The stay: dates, room, guests, balance | `GET getReservation?reservationID=` | Docs confirm balance is returned; itemised folio endpoint to confirm. |
| Record every request on the booking | `POST postReservationNote` | `reservationID`, `reservationNote`. Shows in Cloudbeds where reception already works. |
| New booking → send the personal link | Webhook `reservation/created` via `postWebhook` | Our server makes a signed link per booking. |
| Authentication | Property API key, header `x-api-key` | Cloudbeds > Account > Apps & Marketplace > API Credentials > + New Credentials > API Key > Create. Shown once. Must be used at least once every 30 days or it expires. |

The key stays on the server. The phone only gets a signed, HttpOnly cookie that
expires at the end of the departure day.

## 5. Guest data and security

- Stage 1 stores nothing on a server. Stage 2 stores only requests and messages, per booking, and deletes them 30 days after departure (KV expiry).
- No card details, ever; everything is charged to the room.
- The personal link is signed (HMAC) and works only until departure; everyone in the room can use it, as Florian asked.
- Guest text is escaped on screen and trimmed on the server.
- To agree with KIT: consent wording on the sign in screen, the privacy notice link, and where data may be stored (Cloudflare KV region).

## 6. Open questions for KIT and Ahmed

1. Can the Cloudbeds confirmation email carry the personal link (a custom field or tag), or should Whistle send it?
2. Which number is printed on the confirmation email, Cloudbeds `reservationID` or another reference? (Sign in matches it.)
3. Which endpoint gives the itemised bill (folio) for "Your bill"?
4. How does each department receive requests: WhatsApp Business, Teams, email, or a small staff page? The server has a `/api/staff/request` endpoint ready for a staff "Confirm" button.
5. Where do chat replies come from: Whistle, WhatsApp Business or HubSpot?
6. Who opens the Cloudflare account in the hotel's name, and who holds the keys.

## 7. To do before guests use it

- [ ] Thomas: check departments against "Who Confirms What" (`config.js`)
- [ ] Matilda: final texts and prices in `content.js`; photographs for Pottery, Tailoring, Karnak by night; brochures
- [ ] Florian: which team members may be named; yes to the tab names
- [x] Prices: shown excluding service and taxes, with that line under every total (decided 27 Oct). Late check out until 18:00.
- [ ] KIT: hosting account, DNS record, Cloudbeds key, answers to section 6
- [ ] Test on iPhone and Android over the hotel wifi

## 8. Live on GitHub Pages

Repository **Settings** > **Pages**: Source **Deploy from a branch**, branch **main**, folder **/docs**. Every push to `main` redeploys in about a minute.

Address `guest.moudira.com`: first **Settings** > **Pages** > **Custom domain** > `guest.moudira.com` > **Save** (this claims the name, so nobody else can). Then in Wix, a CNAME record: host `guest`, value `pietropuccioni93-afk.github.io`. When the DNS check turns green, tick **Enforce HTTPS** (the certificate can take up to 24 hours).

## 9. Files

```
docs/              the website (open docs/index.html, or serve the folder)
  index.html       page shell
  config.js        mode, WhatsApp number, tab names, departments
  content.js       the House Book: all texts, prices, photos
  api.js           data layer: WhatsApp (Stage 1), live (Stage 2)
  app.js           the screens
  styles.css       Matilda's design (colours, type, spacing)
  sw.js            offline cache
  manifest.webmanifest, icons/, img/
functions/api/     server (Cloudflare Pages Functions), Stage 2
```

Run locally: `cd docs && python3 -m http.server 8000`, then open http://localhost:8000.
