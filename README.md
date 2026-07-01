![Deployer banner](assets/banner.png)

# deployer | Preview environments by branch

**deployer** is a self-hosted tool to spin up **isolated preview environments for every branch** on your own server. Connect a GitHub Action, open a pull request, and get a live URL — without juggling servers by hand.

Each branch gets its own checkout, PM2 process, and nginx route (`/{branch-slug}/`). A web dashboard shows what's running, what's waiting in queue, and what's paused. You set a global limit on active instances; everything else waits until a slot opens.

Self-host it on a single machine. No SaaS signup required.

## Quick start

Install the CLI (clones to `~/deployer`, adds `deployer` to `~/.local/bin`):

```bash
curl -fsSL https://raw.githubusercontent.com/numnes/deployer/main/scripts/install.sh | bash
```

Make sure `~/.local/bin` is on your `PATH`, then:

```bash
deployer setup    # Postgres + Redis + front (Docker) + API (PM2)
deployer status   # check services
```

- **Dashboard:** http://localhost:3001 (or the port shown after `deployer setup`)  
- **API / Swagger:** http://localhost:3000/docs (API port may differ if 3000 is busy)  

On first setup you'll be prompted for an admin email and password.

```bash
deployer down       # stop everything (asks for confirmation)
deployer down -y    # skip confirmation
deployer help       # all commands
```

## Documentation

| Topic | Where |
|-------|--------|
| GitHub Actions | `deployer project init` in your app repo, or copy from dashboard **Setup → GitHub Actions** |
| Secrets & variables | Dashboard → **Setup → Secrets** (or see below) |
| nginx on the host | `core/bin/setup-nginx.sh <domain>` + **Setup → Nginx** in the UI |
| App config | `examples/deployer.yaml` in each project repo |
| API reference | http://localhost:3000/docs after `deployer setup` |

### GitHub secrets (in your app repo)

| Name | Description |
|------|-------------|
| `DEPLOYER_API_URL` | Base URL of your deployer API |
| `DEPLOYER_API_KEY` | API key from **Users → API Keys** |
| `DEPLOYER_PROJECT_SLUG` (variable) | Project slug registered in deployer |

## What you get

- **One URL per branch** — e.g. `https://preview.example.com/feature-xyz/`
- **Queue when full** — excess deploys stay registered as `waiting` until you pause or remove an instance
- **Pause / resume / redeploy** — from the dashboard, without losing the database record
- **Teardown on PR close** — optional workflow removes the instance automatically

### Instance states

| Status | Meaning |
|--------|---------|
| `active` | Running on the host (PM2 + nginx) |
| `waiting` | Registered, waiting for a free slot |
| `deploying` | Deploy job in progress |
| `paused` | Stopped on the host, still in the database |
| `error` | Last deploy or activate failed |

## Architecture (short)

- **`core/`** — Bash scripts: clone, build, PM2, nginx locations, pause, destroy  
- **`server/`** — NestJS API, Postgres, BullMQ/Redis job queue  
- **`front/`** — Next.js dashboard (instances, projects, setup guides)  

Deploy is triggered with `POST /deploy` (API key). The API either runs the core script or queues the instance.

## Configuration

Main file: `server/.env` — **generated automatically** on `deployer setup` with Postgres/Redis/API/front ports, a random `JWT_SECRET`, and `DEPLOYER_ALLOW_REGISTER=false`. Connection ports are picked from free local ports when defaults (3000, 3001, 5432, 6480) are in use. Re-running `setup` updates connection settings but keeps an existing `JWT_SECRET`.

| Variable | Purpose |
|----------|---------|
| `PORT` | API listen port (default 3000) |
| `DATABASE_URL` | Postgres (`postgresql://postgres:deployer@localhost:<port>/deployer`) |
| `REDIS_HOST` / `REDIS_PORT` | Redis for BullMQ |
| `CORS_ORIGIN` | Front URL allowed by the API |
| `DEPLOYER_WORK_ROOT` | Where branch checkouts live on disk |
| `DEPLOYER_CORE_DIR` | Path to `core/` |
| `JWT_SECRET` | Auth tokens (auto-generated on first setup) |
| `DEPLOYER_ALLOW_REGISTER` | Public sign-up (`false` by default after setup) |
| `TYPEORM_SYNC` | `true` for dev schema sync |

Skip or automate admin user creation:

```bash
DEPLOYER_SKIP_SEED_USER=1 deployer setup
DEPLOYER_SEED_EMAIL=you@example.com DEPLOYER_SEED_PASSWORD=yourpassword deployer setup
```

## CLI reference

```bash
deployer setup          # start stack
deployer down           # stop stack (confirmation)
deployer restart        # down + setup
deployer status         # Docker + PM2
deployer logs api       # API logs
deployer logs front     # front container logs
deployer project init   # copy workflows + deployer.yaml into an app repo
deployer project init ../my-app --branches main,develop
deployer update         # git pull install dir + refresh CLI in PATH
```

Installer env vars: `DEPLOYER_INSTALL_DIR`, `DEPLOYER_REPO_URL`.

## License

See repository license file when added. Built for teams who want simple, self-hosted preview environments.
