# Environment Variables Reference

All environment variables are loaded from `.env` at the project root (Docker Compose injects them into each service). Copy `.env.example` to `.env` to get started.

Variables marked **required** will cause the backend to fail fast on startup if missing (validated via zod in `src/config/env.ts`).

---

## Backend

### Database

| Variable | Required | Example | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | ✅ | `postgresql://perxli:secret@db:5432/perxli` | Full Prisma connection string |
| `DB_NAME` | ✅ | `perxli` | PostgreSQL database name (used by Docker `db` service) |
| `DB_USER` | ✅ | `perxli` | PostgreSQL username |
| `DB_PASSWORD` | ✅ | `changeme` | PostgreSQL password |

### Auth / JWT

| Variable | Required | Example | Description |
|----------|----------|---------|-------------|
| `JWT_PRIVATE_KEY` | ✅ | `-----BEGIN RSA...` | RS256 private key for signing access tokens. Use PEM format, base64-encoded for Docker env. |
| `JWT_PUBLIC_KEY` | ✅ | `-----BEGIN PUBLIC...` | RS256 public key for verifying tokens |
| `REFRESH_TOKEN_SECRET` | ✅ | `a-long-random-string` | HMAC secret for signing refresh token hashes |
| `ACCESS_TOKEN_EXPIRY` | — | `15m` | Access token TTL (default: `15m`) |
| `REFRESH_TOKEN_EXPIRY` | — | `7d` | Refresh token TTL (default: `7d`) |
| `SHARE_LINK_DEFAULT_TTL_DAYS` | — | `60` | Default expiry for public client-side share links |

Generate an RS256 keypair:
```bash
# Private key
openssl genrsa -out private.pem 2048
# Public key
openssl rsa -in private.pem -pubout -out public.pem
# Base64 encode for .env
base64 -w 0 private.pem
base64 -w 0 public.pem
```

### App

| Variable | Required | Example | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | ✅ | `development` / `production` | Affects logging, error verbosity, cookie security, integration stub vs. real |
| `PORT` | — | `3000` | Express listen port (default: `3000`) |
| `FRONTEND_URL` | ✅ | `http://localhost:5173` | Allowed CORS origin (creative side) |
| `PUBLIC_BASE_URL` | ✅ | `https://perxli.com` | Used to build share link URLs sent to clients |
| `LOG_LEVEL` | — | `info` | Pino log level: `trace`, `debug`, `info`, `warn`, `error` |
| `DEFAULT_TIMEZONE` | — | `Africa/Nairobi` | Display timezone (storage is always UTC) |

### File Storage

| Variable | Required | Example | Description |
|----------|----------|---------|-------------|
| `STORAGE_DRIVER` | ✅ | `local` / `s3` | `local` writes to a Docker volume; `s3` for production |
| `STORAGE_LOCAL_PATH` | If `local` | `/data/uploads` | Mount point for local dev uploads |
| `S3_BUCKET` | If `s3` | `perxli-prod-uploads` | S3 bucket for logos, signatures, rendered documents |
| `S3_REGION` | If `s3` | `eu-west-1` | S3 region |
| `S3_ACCESS_KEY_ID` | If `s3` | — | S3 access key |
| `S3_SECRET_ACCESS_KEY` | If `s3` | — | S3 secret |

### Rate Limiting

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `RATE_LIMIT_WINDOW_MS` | — | `900000` | Window in ms (default: 15 min) |
| `RATE_LIMIT_MAX` | — | `100` | Max requests per window per IP |
| `AUTH_RATE_LIMIT_MAX` | — | `5` | Max auth attempts per 15 min per IP |
| `SHARE_LINK_RATE_LIMIT_MAX` | — | `60` | Max requests per minute per IP on `GET /api/v1/share/:token` |

### Integrations (Phase 2+)

#### AI Provider (Phase 2)

| Variable | Required | Description |
|----------|----------|-------------|
| `AI_PROVIDER` | Phase 2 | `anthropic` / `openai` / `stub` — `stub` is the default in dev |
| `AI_PROVIDER_API_KEY` | If not `stub` | API key for the configured provider |
| `AI_PROVIDER_MODEL` | — | Model identifier (e.g., `claude-opus-4-7`) |

#### M-Pesa Daraja (Phase 3)

| Variable | Required | Description |
|----------|----------|-------------|
| `MPESA_ENV` | Phase 3 | `sandbox` or `production` |
| `MPESA_CONSUMER_KEY` | Phase 3 | Safaricom Daraja API consumer key |
| `MPESA_CONSUMER_SECRET` | Phase 3 | Safaricom Daraja API consumer secret |
| `MPESA_SHORTCODE` | Phase 3 | Paybill or till number |
| `MPESA_PASSKEY` | Phase 3 | Daraja passkey for STK Push |
| `MPESA_CALLBACK_URL` | Phase 3 | Public HTTPS URL Daraja calls back to — must reach `/api/v1/mpesa/callback` |
| `MPESA_ALLOWED_IPS` | Phase 3 | Comma-separated Safaricom callback IP allowlist |

#### WhatsApp Cloud API (Phase 3)

| Variable | Required | Description |
|----------|----------|-------------|
| `WHATSAPP_TOKEN` | Phase 3 | Meta Cloud API access token |
| `WHATSAPP_PHONE_NUMBER_ID` | Phase 3 | Sender phone number ID |
| `WHATSAPP_VERIFY_TOKEN` | Phase 3 | Webhook verify token |
| `WHATSAPP_TEMPLATE_SHARE_LINK` | Phase 3 | Approved template name for sending share links |
| `WHATSAPP_TEMPLATE_PAYMENT_RECEIVED` | Phase 3 | Approved template name for payment confirmation |
| `WHATSAPP_TEMPLATE_REMINDER` | Phase 3 | Approved template name for AI reminder |

#### Email Fallback (Phase 3)

| Variable | Required | Description |
|----------|----------|-------------|
| `EMAIL_PROVIDER` | Phase 3 | `sendgrid` / `ses` |
| `SENDGRID_API_KEY` | If `sendgrid` | SendGrid API key |
| `AWS_SES_REGION` | If `ses` | AWS SES region |
| `EMAIL_FROM` | Phase 3 | e.g. `no-reply@perxli.com` |

#### eTIMS (Phase 4 — backend only at launch)

| Variable | Required | Description |
|----------|----------|-------------|
| `ETIMS_BASE_URL` | Phase 4 | eTIMS submission endpoint |
| `ETIMS_CLIENT_ID` | Phase 4 | eTIMS API credentials |
| `ETIMS_CLIENT_SECRET` | Phase 4 | eTIMS API secret |
| `FEATURE_ETIMS_SUBMISSION` | Phase 4 | `true` / `false` — leave `false` at launch (payloads generated and stored only) |

#### Job Queue (Phase 4)

| Variable | Required | Description |
|----------|----------|-------------|
| `REDIS_URL` | Phase 4 | `redis://redis:6379` — for BullMQ |

---

## Frontend (Vite)

Vite only exposes variables prefixed with `VITE_` to the browser bundle.

| Variable | Required | Example | Description |
|----------|----------|---------|-------------|
| `VITE_API_URL` | ✅ | `http://localhost:3000` | Backend API base URL |
| `VITE_APP_NAME` | — | `Perxli` | App display name |
| `VITE_PUBLIC_BASE_URL` | ✅ | `http://localhost:5173` | Used to build share-link URLs shown in copy-to-clipboard UI |
| `VITE_ENV` | — | `development` | Used for Sentry or analytics scoping |

---

## `.env.example`

```dotenv
# ─── Database ──────────────────────────────────────────────────
DB_NAME=perxli
DB_USER=perxli
DB_PASSWORD=changeme_local
DATABASE_URL=postgresql://perxli:changeme_local@db:5432/perxli

# ─── JWT / Auth ────────────────────────────────────────────────
# Generate with: openssl genrsa -out private.pem 2048 && base64 -w 0 private.pem
JWT_PRIVATE_KEY=REPLACE_WITH_BASE64_ENCODED_PRIVATE_KEY
JWT_PUBLIC_KEY=REPLACE_WITH_BASE64_ENCODED_PUBLIC_KEY
REFRESH_TOKEN_SECRET=replace_with_a_long_random_string_min_32_chars
ACCESS_TOKEN_EXPIRY=15m
REFRESH_TOKEN_EXPIRY=7d
SHARE_LINK_DEFAULT_TTL_DAYS=60

# ─── App ───────────────────────────────────────────────────────
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:5173
PUBLIC_BASE_URL=http://localhost:5173
LOG_LEVEL=debug
DEFAULT_TIMEZONE=Africa/Nairobi

# ─── Storage ───────────────────────────────────────────────────
STORAGE_DRIVER=local
STORAGE_LOCAL_PATH=/data/uploads

# ─── Frontend ──────────────────────────────────────────────────
VITE_API_URL=http://localhost:3000
VITE_APP_NAME=Perxli
VITE_PUBLIC_BASE_URL=http://localhost:5173

# ─── Phase 2: AI document generation ───────────────────────────
AI_PROVIDER=stub
# AI_PROVIDER_API_KEY=
# AI_PROVIDER_MODEL=claude-opus-4-7

# ─── Phase 3: M-Pesa Daraja (leave blank until Phase 3) ────────
# MPESA_ENV=sandbox
# MPESA_CONSUMER_KEY=
# MPESA_CONSUMER_SECRET=
# MPESA_SHORTCODE=
# MPESA_PASSKEY=
# MPESA_CALLBACK_URL=https://your-tunnel.example.com/api/v1/mpesa/callback
# MPESA_ALLOWED_IPS=

# ─── Phase 3: WhatsApp Cloud API ───────────────────────────────
# WHATSAPP_TOKEN=
# WHATSAPP_PHONE_NUMBER_ID=
# WHATSAPP_VERIFY_TOKEN=
# WHATSAPP_TEMPLATE_SHARE_LINK=
# WHATSAPP_TEMPLATE_PAYMENT_RECEIVED=
# WHATSAPP_TEMPLATE_REMINDER=

# ─── Phase 3: Email fallback ───────────────────────────────────
# EMAIL_PROVIDER=sendgrid
# SENDGRID_API_KEY=
# EMAIL_FROM=no-reply@perxli.com

# ─── Phase 4: eTIMS (hidden from users at launch) ──────────────
# ETIMS_BASE_URL=
# ETIMS_CLIENT_ID=
# ETIMS_CLIENT_SECRET=
# FEATURE_ETIMS_SUBMISSION=false

# ─── Phase 4: Job queue ────────────────────────────────────────
# REDIS_URL=redis://redis:6379
```

---

## Security Notes

- Never commit `.env` to git. It is in `.gitignore`.
- In production, inject secrets via your cloud provider's secrets manager (AWS Secrets Manager, Fly.io secrets, etc.) — not via `.env` files in the container.
- Rotate `REFRESH_TOKEN_SECRET` and JWT keys if they are ever exposed. Rotation invalidates all active sessions — users will need to log in again.
- M-Pesa Daraja credentials and WhatsApp tokens must be rotated immediately if exposed — both can be used to send messages or initiate transactions on Perxli's behalf.
- AI provider keys should be rate-limited at the provider level — a leaked key without a rate cap can run up significant bills before detection.
