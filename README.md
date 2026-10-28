# al-moudira-guest

Guest web app for Hotel Al Moudira, Luxor. Plain HTML/CSS/JS, no framework,
no build step. Installable as a PWA. Design by Matilda Fender.

Live: https://pietropuccioni93-afk.github.io/al-moudira-guest/ (guest.moudira.com once DNS is set)

## Run locally

```
cd docs && python3 -m http.server 8000
```

then open http://localhost:8000.

## Structure

```
docs/                 static site, served by GitHub Pages (main, /docs)
  index.html
  config.js           mode, WhatsApp number, tab labels, departments
  content.js          all guest-facing content (texts, prices, photos)
  api.js              data layer: whatsapp adapter (stage 1), live adapter (stage 2)
  app.js              views, sheets, hash router
  styles.css
  sw.js               offline cache
  img/ files/ icons/  photos, booklets (page images + pdf), app icons
functions/api/        stage 2 backend (Cloudflare Pages Functions), not deployed
```

Content changes only touch `content.js`. Departments and tags are in `config.js`.

## Stage 1 (live): WhatsApp mode

- Guest enters name and room. Nothing is sent to a server.
- Every request opens `wa.me/<reception>` with a pre-filled message tagged by department,
  e.g. `[HOUSEKEEPING] Fresh towels`. The guest presses Send in WhatsApp.
- Session and request history are kept in `localStorage` on the guest's phone only,
  and expire 21 days after sign in.

## Security / data

- Static hosting on GitHub Pages over HTTPS. No server, database, API or keys in stage 1.
- No cookies, no login, no analytics or tracking.
- External requests: Google Fonts, and Open-Meteo for the temperature (hotel coordinates only,
  no guest data).
- All guest-entered text is escaped before rendering.

## Stage 2 (planned): Cloudbeds

`functions/api/[[path]].js` is a scaffold written against the Cloudbeds API v1.3 and not yet
tested on the hotel's account (see `VERIFY` comments). Switch with `mode: "live"` in `config.js`.

| Need | Endpoint |
|---|---|
| Sign in (booking no. + surname) | `GET getReservations?lastName=&checkOutFrom=` |
| Stay, room, balance | `GET getReservation?reservationID=` |
| Log requests on the booking | `POST postReservationNote` |
| Send the guest link on new bookings | webhook `reservation/created` via `postWebhook` |

The API key stays server side. The phone gets a signed HttpOnly cookie valid until the end of
the departure day. Requests are stored in KV and deleted 30 days after departure.

Open points: which reference is printed on the confirmation email, which endpoint gives the
itemised folio, how departments get notified, where chat replies come from.

## TODO

- Lines/prices for stable rides and the cycling tour
- Private dining lines and capacities, room service menus (Thomas)
- Brochures from Randa
- Test on iPhone and Android on the hotel wifi
