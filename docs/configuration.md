# Configuration

Main file: `api/.env` — **generated automatically** on `deployer setup` with Postgres/Redis/API/web ports, a random `JWT_SECRET`, `DEPLOYER_SETUP_KEY`, and `DEPLOYER_CLUSTER_SECRET`. Connection ports are picked from free local ports when defaults (3000, 3001, 5432, 6480) are in use. Re-running `setup` updates connection settings but **keeps** existing `JWT_SECRET`, `DEPLOYER_SETUP_KEY`, and `DEPLOYER_CLUSTER_SECRET`.

| Variable                    | Purpose                                                                                             |
| --------------------------- | --------------------------------------------------------------------------------------------------- |
| `PORT`                      | API listen port (default 3000)                                                                      |
| `DATABASE_URL`              | Postgres (`postgresql://postgres:deployer@localhost:<port>/deployer`)                               |
| `REDIS_HOST` / `REDIS_PORT` | Redis for BullMQ                                                                                    |
| `CORS_ORIGIN`               | Web UI URL allowed by the API                                                                       |
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
