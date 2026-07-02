![Deployer banner](assets/banner.png)

# deployer | Self-hosted preview & ephemeral environments

**deployer** is a self-hosted platform for **preview environments**, **ephemeral environments**, and **review apps** — temporary, isolated deploys you spin up per **branch** or **pull request** on infrastructure you control.

Open a PR, trigger a GitHub Action, and get a live **deploy preview** URL. No Vercel lock-in, no per-seat SaaS. One VPS (or bare metal), nginx, PM2, and a dashboard to manage what is running.

Also useful if you search for: **feature-branch environments**, **dynamic environments**, **on-demand test environments**, **PR preview deployments**, or a lightweight **self-hosted alternative** to hosted preview/review-app services.

Each branch gets its own checkout, PM2 process, and nginx route (`/{branch-slug}/`). The dashboard shows active, waiting, paused, and failed instances; a global **slot limit** queues excess deploys until a preview is torn down. Teardown on PR close is supported via workflow.

Self-host on a single machine — no Kubernetes required today.

> **Coming soon:** runtime backends for **Docker** and **Kubernetes**, so preview environments can run as containers or in a cluster — in addition to the current PM2 + nginx model on a single host.

## Quick start

Install the CLI (clones to `~/deployer`, adds `deployer` to `~/.local/bin`):

```bash
curl -fsSL https://raw.githubusercontent.com/numnes/deployer/main/scripts/install.sh | bash
```

Make sure `~/.local/bin` is on your `PATH`, then:

```bash
deployer setup    # Postgres + Redis + web (Docker) + API (PM2)
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

## Setup in a project

After the deployer stack is running, wire each application repository once.

### 1. Generate workflows and `deployer.yaml`

From your **app repo** root:

```bash
deployer project init
```

This copies:

- `.github/workflows/deploy-preview.yml` — deploy on PR open/update
- `.github/workflows/teardown-preview.yml` — remove preview on PR close
- `deployer.yaml` — build commands and PM2 entrypoint for your stack

The command detects `gitUrl` and `slug` when possible, asks for anything missing, embeds the project slug in the workflow files, and prints a **registration JSON** block:

```json
{
  "slug": "my-app",
  "gitUrl": "https://github.com/org/my-app.git",
  "serverUrl": "https://preview.example.com"
}
```

`serverUrl` is optional in the JSON (omit it if you will set the Public URL later in the dashboard).

Useful options:

```bash
deployer project init ../my-app              # target another directory
deployer project init --branches main,develop   # PR target branches
deployer project init --force                   # overwrite existing files
```

Non-interactive (e.g. scripts or CI — still prompts for Public URL unless `DEPLOYER_PROJECT_SERVER_URL` is set):

```bash
DEPLOYER_PROJECT_SLUG=my-app \
DEPLOYER_PROJECT_GIT_URL=https://github.com/org/my-app.git \
DEPLOYER_PROJECT_SERVER_URL=https://preview.example.com \
deployer project init
```

### 2. Register the project in the dashboard

1. Copy the JSON printed by `deployer project init`
2. Open **Projects → Add project → Import registration JSON**
3. Paste the JSON and click **Create from JSON** (or **Apply to form** to review first)
4. Set the **Public URL** if you already know the domain where previews will be served (see [Configure nginx](#configure-nginx) below)

### 3. Create an API key

In the dashboard: **Users → API Keys** → create a key and save the value (shown once).

### 4. Configure GitHub secrets

In the **app repo** on GitHub: **Settings → Secrets and variables → Actions**

| Secret             | Value                                                                                    |
| ------------------ | ---------------------------------------------------------------------------------------- |
| `DEPLOYER_API_URL` | Public URL of your deployer API (no trailing slash), e.g. `https://deployer.example.com` |
| `DEPLOYER_API_KEY` | API key from step 3                                                                      |

The project slug is already set in the workflow files — no extra GitHub variable is required.

### 5. Adjust `deployer.yaml` and commit

Edit `deployer.yaml` for your build (install, build, start command / PM2 target). Then commit and push `.github/workflows/` and `deployer.yaml`.

Opening or updating a PR against a configured branch triggers a deploy; closing the PR runs teardown (if you kept the teardown workflow).

More detail: dashboard **Setup → GitHub Actions** and **Setup → Secrets**.

## Configure nginx

Preview URLs are served by **nginx on the deployer host**. The core writes one `*.location` file per branch under the locations directory (default `~/deployer/locations`). Each file proxies `/{branch-slug}/` to the instance’s local port.

**You need a separate nginx `server` block (or equivalent site config) for every domain or subdomain used as a project’s public URL.** If two projects use different hosts — e.g. `preview.app-a.example.com` and `preview.app-b.example.com` — configure nginx for **each** host and point the matching **Public URL** in the dashboard to that host.

### Per domain / subdomain

1. **Pick the hostname** for the project (e.g. `preview.myapp.example.com`).
2. **Add or update a site** in nginx (`sites-available` / `sites-enabled`, or your distro’s layout).
3. **Include deployer locations** inside the `server { }` block for that hostname:

   ```nginx
   include /home/you/deployer/locations/*.location;
   ```

   Or use the helper (read-only — prints the full file for you to paste):

   ```bash
   deployer setup nginx
   deployer setup nginx -f /etc/nginx/sites-enabled/mysite.conf   # skip picker
   deployer setup nginx -s /etc/nginx/sites-available             # custom directory
   ```

   It lists configs in `sites-enabled` (or the directory you pass), shows the file with the `include` line added, and tells you to replace the file contents manually (e.g. `sudo nano …`), then run `sudo nginx -t && sudo nginx -s reload`.

4. In the dashboard, set the project **Public URL** to that host (e.g. `https://preview.myapp.example.com`). Branch previews are at `{Public URL}/{branch-slug}/`.

5. After deploys, the core reloads nginx when location files change. After **editing site configs by hand**, test and reload:

   ```bash
   sudo nginx -t && sudo nginx -s reload
   ```

Verify from the dashboard: **Setup → Nginx** (directory, `nginx -t`, process check).

## Dashboard

After `deployer setup`, open the web UI (port shown in `deployer status`, often **3001**).

| Area                    | What you can do                                                                                                                                                                       |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Dashboard**           | Host CPU / memory / disk, instance counts by status (click a status to open **Instances** filtered), active slot usage chart, recent activity                                         |
| **Projects**            | List projects, **Add project** (manual form or import registration JSON), open **Settings** per project                                                                               |
| **Projects → Settings** | Set **Public URL** (nginx domain for that project), **Teardown all instances** (pause active), **Restart all instances**, **Delete project** (destroys all instances and the project) |
| **Instances**           | List all previews; filter by project/branch search and status; open a row for logs and pause/restart/destroy                                                                          |
| **Settings**            | Global **max active instances** — excess deploys stay `waiting` until a slot frees up                                                                                                 |
| **Setup**               | Guides for GitHub Actions, secrets, and nginx                                                                                                                                         |
| **Users → API Keys**    | Create keys used by GitHub Actions (`DEPLOYER_API_KEY`)                                                                                                                               |

Instance status cards on the home dashboard link to `/instances?status=…` with the filter applied.

## Documentation

| Topic             | Where                                                                            |
| ----------------- | -------------------------------------------------------------------------------- |
| Dashboard         | [Dashboard](#dashboard)                                                          |
| Project setup     | [Setup in a project](#setup-in-a-project) · `deployer project init`              |
| nginx on the host | [Configure nginx](#configure-nginx) · `deployer setup nginx` · **Setup → Nginx** |
| GitHub Actions    | Dashboard **Setup → GitHub Actions**                                             |
| Secrets           | Dashboard **Setup → Secrets** (or [Setup in a project](#setup-in-a-project))     |
| App config        | `examples/deployer.yaml` in each project repo                                    |
| API reference     | http://localhost:3000/docs after `deployer setup`                                |

### GitHub secrets (in your app repo)

| Name               | Description                       |
| ------------------ | --------------------------------- |
| `DEPLOYER_API_URL` | Base URL of your deployer API     |
| `DEPLOYER_API_KEY` | API key from **Users → API Keys** |

The project slug is embedded in the workflow files when you run `deployer project init` (no GitHub variable needed).

## What you get

Ephemeral **preview URLs** for code review and QA before merge:

- **One URL per branch / PR** — e.g. `https://preview.example.com/feature-xyz/`
- **Environment queue** — when the active slot limit is reached, new deploys stay `waiting` until a preview is paused or destroyed
- **Pause / resume / redeploy** — per instance in the dashboard, or **Restart all instances** on a project  
- **Teardown on PR close** — optional workflow removes the instance automatically  
- **Bulk teardown** — **Projects → Settings → Teardown all instances** pauses every active instance for a project  
- **Delete project** — removes the project and destroys all its instances (PM2, nginx, database)

### Instance states

Preview / ephemeral environment lifecycle:

| Status      | Meaning                                    |
| ----------- | ------------------------------------------ |
| `active`    | Running on the host (PM2 + nginx) — live review app |
| `waiting`   | Registered, waiting for a free slot (queued preview) |
| `deploying` | Deploy job in progress                     |
| `paused`    | Stopped on the host, still in the database |
| `error`     | Last deploy or activate failed             |

## Architecture (short)

Self-hosted **preview environment controller** on a single host — no Kubernetes required:

- **`core/`** — Bash scripts: clone, build, PM2, nginx locations, pause, destroy  
- **`api/`** — NestJS API, Postgres, BullMQ/Redis job queue (deploy / teardown webhooks)  
- **`web/`** — Next.js dashboard (instances, projects, setup guides)  

Deploy is triggered with `POST /deploy` (API key), typically from GitHub Actions on pull request open/update. The API queues or runs the core script; closing the PR can call `POST /deploy/destroy` for automatic cleanup.

**Roadmap:** Docker and Kubernetes runtimes for preview instances (coming soon). Today, deploys target the host directly via PM2.

## Configuration

Main file: `api/.env` — **generated automatically** on `deployer setup` with Postgres/Redis/API/web ports, a random `JWT_SECRET`, and `DEPLOYER_ALLOW_REGISTER=false`. Connection ports are picked from free local ports when defaults (3000, 3001, 5432, 6480) are in use. Re-running `setup` updates connection settings but keeps an existing `JWT_SECRET`.

| Variable                    | Purpose                                                               |
| --------------------------- | --------------------------------------------------------------------- |
| `PORT`                      | API listen port (default 3000)                                        |
| `DATABASE_URL`              | Postgres (`postgresql://postgres:deployer@localhost:<port>/deployer`) |
| `REDIS_HOST` / `REDIS_PORT` | Redis for BullMQ                                                      |
| `CORS_ORIGIN`               | Web UI URL allowed by the API                                         |
| `DEPLOYER_WORK_ROOT`        | Where branch checkouts live on disk                                   |
| `DEPLOYER_CORE_DIR`         | Path to `core/`                                                       |
| `DEPLOYER_LOCATIONS_DIR`    | nginx `*.location` files (default `~/deployer/locations`)             |
| `JWT_SECRET`                | Auth tokens (auto-generated on first setup)                           |
| `DEPLOYER_ALLOW_REGISTER`   | Public sign-up (`false` by default after setup)                       |
| `TYPEORM_SYNC`              | `true` for dev schema sync                                            |

Skip or automate admin user creation:

```bash
DEPLOYER_SKIP_SEED_USER=1 deployer setup          # never prompt
DEPLOYER_SEED_EMAIL=you@example.com DEPLOYER_SEED_PASSWORD=yourpassword deployer setup
```

On restart, if users already exist you are asked whether to reset a password or add another user; press **N** to keep the current accounts.

## CLI reference

### Stack commands

| Command                            | Description                                                                   |
| ---------------------------------- | ----------------------------------------------------------------------------- |
| `deployer setup`                   | Start Postgres, Redis, web (Docker) and API (PM2); creates/updates `api/.env` |
| `deployer up`, `deployer start`    | Same as `deployer setup`                                                      |
| `deployer down`, `deployer stop`   | Stop API and containers (asks for confirmation)                               |
| `deployer restart`                 | `down` then `setup` (asks for confirmation)                                   |
| `deployer status`                  | Show ports, Docker containers, and PM2 API process                            |
| `deployer logs api`                | Follow API logs (PM2)                                                         |
| `deployer logs web`                | Follow web container logs                                                     |
| `deployer update`, `deployer pull` | `git pull` in the install dir + refresh CLI symlink                           |
| `deployer root`, `deployer path`   | Print install directory                                                       |
| `deployer help`                    | Show command summary                                                          |

Options for `down` / `restart`: `-y`, `--yes`, or `DEPLOYER_YES=1` to skip confirmation.

### Project commands

| Command                        | Description                                                                |
| ------------------------------ | -------------------------------------------------------------------------- |
| `deployer project init`        | Copy workflows + `deployer.yaml` into an app repo; print registration JSON |
| `deployer project init --help` | Options: `PATH`, `-f`/`--force`, `--branches`                              |

### nginx helper

| Command                       | Description                                                                    |
| ----------------------------- | ------------------------------------------------------------------------------ |
| `deployer setup nginx`        | List `sites-enabled`, print config with `include …/*.location;` (manual paste) |
| `deployer setup nginx --help` | Options: `-f`/`--file`, `-s`/`--sites-dir`                                     |

### Examples

```bash
deployer setup
deployer status
deployer logs api
deployer project init
deployer project init ../my-app --branches main,develop --force
deployer setup nginx
deployer setup nginx -f /etc/nginx/sites-enabled/preview.example.com
deployer update
```

### Install & runtime env vars

| Variable                      | Purpose                                                                  |
| ----------------------------- | ------------------------------------------------------------------------ |
| `DEPLOYER_INSTALL_DIR`        | Clone destination for `install.sh` (default `~/deployer`)                |
| `DEPLOYER_REPO_URL`           | Git URL for `install.sh`                                                 |
| `DEPLOYER_BIN_DIR`            | Where to link the `deployer` executable (default `~/.local/bin`)         |
| `DEPLOYER_ROOT`               | Override install directory for the CLI                                   |
| `DEPLOYER_YES`                | Skip confirmation on `down` / `restart`                                  |
| `DEPLOYER_PROJECT_SLUG`       | Non-interactive slug for `project init`                                  |
| `DEPLOYER_PROJECT_GIT_URL`    | Non-interactive git URL for `project init`                               |
| `DEPLOYER_PROJECT_SERVER_URL` | Optional Public URL for `project init`                                   |
| `NGINX_SITES_ENABLED`         | Default directory for `setup nginx` (default `/etc/nginx/sites-enabled`) |

## License

Licensed under the [Apache License, Version 2.0](LICENSE).

Built for teams who want simple, self-hosted preview environments.
