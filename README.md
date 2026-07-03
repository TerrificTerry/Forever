# Spirit Archive

Spirit Archive is a private, single-user personal intelligence system: diary, self-authored questions, appearance tracking, investment decisions, stock lessons, game reflection, source materials, and AI-assisted memory in one mobile-friendly archive.

There is no registration, social layer, public file directory, or browser-side API key. The diary and private-data areas have separate secondary locks.

## What is included

- Single-user setup and login with bcrypt password hashes and HTTP-only database sessions
- 30-minute secondary unlock sessions for Diary, Data Feed, and My AI
- Searchable CRUD flows for every record module
- Authenticated JPEG, PNG, WebP, TXT, Markdown, JSON, CSV, and PDF uploads
- Server-side PDF/text extraction with useful parse errors
- AI diary summaries, question generation/follow-up, stock evaluation, game-style review, source summaries, and archive Q&A
- Optional stock providers with manual price checks as the permanent fallback
- Markdown/JSON diary export and complete JSON archive export
- PostgreSQL/Prisma, Docker Compose, Caddy HTTPS, and persistent volumes
- Crawler blocking through `robots.txt`, response headers, and metadata

## First run with Docker (recommended)

1. Copy the environment template:

   ```bash
   cp .env.example .env
   ```

2. Generate two long random secrets and edit `.env`:

   ```bash
   openssl rand -base64 48
   openssl rand -base64 32
   ```

   Put the first value in `AUTH_SECRET` and the second in `SETUP_TOKEN`. Also set a strong `POSTGRES_PASSWORD`. The setup defaults (`ADMIN_INITIAL_PASSWORD` and the two secondary password variables) may remain blank; the setup screen asks for them.

3. Start the database and app:

   ```bash
   docker compose up --build -d
   ```

4. Open `http://localhost:3000/setup`. Enter the `SETUP_TOKEN`, your email, your main password, a diary password, and a private-data password. Each password must have at least eight characters.

After the first account exists, `/setup` permanently redirects to login. Remove setup-default passwords from `.env` if you used them.

## Run directly for development

You need Node.js 20+ and PostgreSQL 16+. In `.env`, use a database URL reachable from the host, usually:

```env
DATABASE_URL="postgresql://spirit_user:your_password@localhost:5432/spirit_archive"
```

Then run:

```bash
npm install
npx prisma db push
npm run dev
```

## AI configuration

All AI requests originate on the server. Add these values to `.env` and restart the app:

```env
OPENAI_API_KEY="your-key"
OPENAI_BASE_URL="https://api.openai.com/v1"
OPENAI_MODEL="gpt-4.1-mini"
```

An OpenAI-compatible provider can be used by changing the base URL and model. The Settings page only reports whether the key is configured; it never returns the key to the browser. Without a key, ordinary record keeping and exports continue to work.

## Stock data configuration

Manual mode is the default and needs no key:

```env
STOCK_API_PROVIDER="manual"
```

Supported keyed modes are `alpha_vantage`, `finnhub`, and `twelve_data`. Set the provider and its matching variable:

```env
STOCK_API_PROVIDER="finnhub"
FINNHUB_API_KEY="your-key"
```

If a service fails or a key is absent, records and manual later-price checks still work. The authenticated performance endpoint is `/api/stocks/{record-id}/performance`.

## Deploy to a VPS with HTTPS

A small Linux VPS in Hong Kong, Singapore, Japan, or US West is a practical choice when access from China and overseas both matter. Provider routing still varies, so test the actual IP before committing long-term.

1. Install Docker Engine and the Compose plugin.
2. Point an A/AAAA DNS record for your domain to the VPS.
3. Clone/copy this project and create a production `.env`.
4. Set:

   ```env
   NODE_ENV="production"
   APP_URL="https://archive.example.com"
   DOMAIN="archive.example.com"
   ```

5. Allow inbound TCP 80/443 and UDP 443 in the VPS firewall.
6. Start the app, database, and Caddy profile:

   ```bash
   docker compose --profile production up --build -d
   ```

Caddy obtains and renews Let's Encrypt certificates automatically. The application port is bound only to localhost; public traffic reaches it through Caddy.

## Backup

Back up the database, uploads, and `.env`. Store the environment file separately and securely.

Database dump:

```bash
docker compose exec -T postgres pg_dump -U spirit_user spirit_archive > spirit-archive-backup.sql
```

Uploaded files:

```bash
tar -czf spirit-archive-uploads.tar.gz uploads/
```

For automated backups, run both commands from a nightly cron job, encrypt the output, copy it off the VPS, and periodically test a restore.

## Restore

Start a clean PostgreSQL service, then restore the dump:

```bash
docker compose up -d postgres
docker compose exec -T postgres psql -U spirit_user -d spirit_archive < spirit-archive-backup.sql
```

Extract the uploads archive into the project so files return to `./uploads`, restore `.env`, and then start the app.

## Security notes

- Use unique main, diary, and private-data passwords.
- Keep `.env` out of version control and restrict it to the deployment user.
- Uploaded files use generated names, size/MIME checks, resolved-path checks, and authenticated delivery.
- The app does not expose `/uploads` as a public static directory.
- Backups contain highly sensitive information; encrypt them before remote storage.
- Keep the host OS, Docker, Node image, and dependencies patched.

## Useful commands

```bash
docker compose logs -f app
docker compose restart app
docker compose down
npm run build
npx prisma studio
```
