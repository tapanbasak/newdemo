# Prompt Catch Up (Next.js)

## Development

```bash
npm run dev
```

Open `http://localhost:3000`.

## Build

```bash
npm run build
npm run start
```

## MongoDB setup seed

This project includes a setup/seed script that creates the MongoDB database collections and indexes.

1. Configure environment (example):

```env
MONGODB_URI=mongodb://127.0.0.1:27017
MONGODB_DB=prompt_catchup
```

2. Run Mongo setup:

```bash
npm run seed:mongodb
```

This command creates (if missing) these collections:
- `agents`
- `groups`
- `scoreboards`
- `prompts`
- `shared_prompts`
- `upvotes`
- `comments`

It also upserts initial seed data into:
- `agents` and `groups` from `lib/data.ts`
- `scoreboards` from `lib/data.ts`
- `prompts` from `public/assets/prompt-catalog-sample.json`
