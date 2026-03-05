# Config Console (Next.js)

Next.js app with two routes:

- **`/`** – Landing page with links to both consoles
- **`/app-rule`** – App Rule Service Config Console (submit and manage application configuration)
- **`/psg`** – PSG Domain Whitelisting (ingress origin whitelisting for Platform Security Gateway)

## Tech stack

- **Next.js** 16.1.x (App Router)
- **React** 19.2.x

## Run locally

```bash
cd nextjs
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Use the landing page to go to **App Rule** or **PSG**, or open `/app-rule` and `/psg` directly.

## Build

```bash
npm run build
npm run start
```

## Original mockups

The behaviour and layout match the static HTML mockups in this folder:

- `index.html` → `/app-rule`
- `psg_config.html` → `/psg`

Styles are shared via `app/globals.css` (copied from `styles.css`).
