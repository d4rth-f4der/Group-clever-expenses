# Group Clever Expenses

Simple Express + MongoDB app to manage shared group expenses.
(Configured to deploy on Render.com)

## Quick start

1. Install Node.js LTS and MongoDB (or have a hosted Mongo URI).
2. Copy `.env.example` to `.env` and fill values.
3. Install deps and run:

```bash
npm install
npm start
```

App will listen on `PORT` from env or `3000`.

## Environment variables

See `.env.example` for the full list. Required:

- `MONGO_URI` – MongoDB connection string
- `JWT_SECRET` – secret for JWT signing

Optional:

- `CORS_ORIGIN` – allowed origin for CORS; if empty, CORS is open to all origins

## Security

- Helmet is enabled in `server.js`.
- Content Security Policy (CSP) is configured to support Google Fonts.

## Local assets

Flatpickr is served locally from `node_modules` via `/vendor/flatpickr` (see `server.js`).

## Scripts

- `npm start` – start server

## Project structure

- `server.js` – Express server
- `db/` – Mongo connection helpers
- `models/` – Mongoose models
- `routes/` – API routes
- `public/` – static assets (CSS/JS)
- `views/` – main `index.html`
- `middleware/` – auth middleware
- `utils/` – helpers
