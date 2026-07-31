# Configuration

Main file: `api/.env` — **generated automatically** on `deployer setup` with Postgres/Redis/API/web ports, a random `JWT_SECRET`, `DEPLOYER_SETUP_KEY`, and `DEPLOYER_CLUSTER_SECRET`. Connection ports are picked from free local ports when defaults (3000, 3001, 5432, 6480) are in use. Re-running `setup` updates connection settings but **keeps** existing `JWT_SECRET`, `DEPLOYER_SETUP_KEY`, and `DEPLOYER_CLUSTER_SECRET`.

## Public URLs (`deployer.env`)

For a reverse proxy / path-based host (one domain for UI + API), create **`deployer.env`** at the install root. It survives `deployer restart` / `deployer setup` (unlike editing `CORS_ORIGIN` alone in `api/.env`, which used to be rewritten to localhost).

```bash
cp deployer.env.example deployer.env
# edit DEPLOYER_PUBLIC_WEB_URL and DEPLOYER_PUBLIC_API_URL
deployer restart
```

| Variable                        | Purpose                                                                 |
| ------------------------------- | ----------------------------------------------------------------------- |
| `DEPLOYER_PUBLIC_WEB_URL`       | Dashboard Origin → written as `CORS_ORIGIN` in `api/.env`               |
| `DEPLOYER_PUBLIC_API_URL`       | Baked into the web image as `NEXT_PUBLIC_API_URL` (rebuild on restart)  |
| `DEPLOYER_PUBLIC_WEB_BASE_PATH` | Optional Next `basePath` when the UI is not at `/` (e.g. `/deployer`) |
| `DEPLOYER_API_PORT`             | Pin API host port (skip auto-pick; fail if busy)                        |
| `DEPLOYER_WEB_PORT`             | Pin dashboard publish port                                              |
| `DEPLOYER_POSTGRES_PORT`        | Pin Postgres publish port                                               |
| `DEPLOYER_REDIS_PORT`           | Pin Redis publish port                                                  |

Example (UI at `/`, API under `/api/` on the same host, stable local ports for nginx):

```bash
DEPLOYER_PUBLIC_WEB_URL=https://deployer.example.com
DEPLOYER_PUBLIC_API_URL=https://deployer.example.com/api
DEPLOYER_API_PORT=3002
DEPLOYER_WEB_PORT=3001
```

If `deployer.env` is absent, defaults stay on `http://localhost:<ports>` and ports are auto-picked when defaults are busy. A non-local `CORS_ORIGIN` already present in `api/.env` is also preserved when `DEPLOYER_PUBLIC_WEB_URL` is unset.

| Variable                    | Purpose                                                                                             |
| --------------------------- | --------------------------------------------------------------------------------------------------- |
| `PORT`                      | API listen port (default 3000)                                                                      |
| `DATABASE_URL`              | Postgres (`postgresql://postgres:deployer@localhost:<port>/deployer`)                               |
| `REDIS_HOST` / `REDIS_PORT` | Redis for BullMQ                                                                                    |
| `CORS_ORIGIN`               | Web UI Origin allowed by the API (from `DEPLOYER_PUBLIC_WEB_URL` or localhost)                      |
| `DEPLOYER_WORK_ROOT`        | Where branch checkouts live on disk                                                                 |
| `DEPLOYER_CORE_DIR`         | Path to `core/`                                                                                     |
| `DEPLOYER_LOCATIONS_DIR`    | nginx `*.location` files (default `~/deployer/locations`)                                           |
| `JWT_SECRET`                | Auth tokens (auto-generated on first setup)                                                         |
| `DEPLOYER_SETUP_KEY`        | Root-only key for privileged bootstrap endpoints (auto-generated)                                   |
| `DEPLOYER_CLUSTER_SECRET`   | Encrypts connected-node cluster keys in Postgres (auto-generated; must stay stable across restarts) |
| `TYPEORM_SYNC`              | `true` for dev schema sync                                                                          |

## Privileged endpoints (setup key)

`POST /auth/register` and `GET /users` are not public. They require either a
valid dashboard JWT or the root-only **setup key** sent in the
`X-Deployer-Setup-Key` header. The key lives only on the root machine in
`api/.env` (`DEPLOYER_SETUP_KEY`), so these endpoints stay safe even when the
API is publicly exposed. `POST /auth/register` accepts **only** the setup key;
`GET /users` accepts the JWT (dashboard) or the setup key (setup script).

The setup script (`seed-default-user.js`) uses these endpoints with the setup key
instead of connecting to Postgres directly.

Skip or automate admin user creation:

```bash
DEPLOYER_SKIP_SEED_USER=1 deployer setup          # never prompt
DEPLOYER_SEED_EMAIL=you@example.com DEPLOYER_SEED_PASSWORD=yourpassword deployer setup
```

On restart, if users already exist you are asked whether to reset a password or add another user; press **N** to keep the current accounts.

[← Back to README](../README.md)
