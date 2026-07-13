![Deployer banner](assets/banner.png)

# deployer | Self-hosted preview & ephemeral environments

**deployer** is a self-hosted platform for **preview environments**, **ephemeral environments**, and **review apps** — temporary, isolated deploys you spin up per **branch** or **pull request** on infrastructure you control.

Open a PR, trigger a GitHub Action, and get a live **deploy preview** URL. No Vercel lock-in, no per-seat SaaS. One VPS (or bare metal), nginx, PM2, and a dashboard to manage what is running.

Also useful if you search for: **feature-branch environments**, **dynamic environments**, **on-demand test environments**, **PR preview deployments**, or a lightweight **self-hosted alternative** to hosted preview/review-app services.

Each branch gets its own checkout, PM2 process, and nginx route (`/{project-slug}-{branch-slug}/`). The dashboard shows active, waiting, paused, and failed instances; a global **slot limit** queues excess deploys until a preview is torn down. Teardown on PR close is supported via workflow.

Self-host on a single machine — or aggregate several deployer hosts from one dashboard via **cluster** credentials.

> **Coming soon:** **Kubernetes** as a runtime backend for preview instances. **Docker** is already supported per project (`deployer project init`); PM2 remains the default on the host.

## Quick start

### Prerequisites

Install these on the machine that will run deployer (the `install.sh` script checks **git**, **Node.js**, and **Docker**):

| Dependency                          | Used for                                                                                | Install                                                                                                                 |
| ----------------------------------- | --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **Git**                             | Clone deployer and app repos                                                            | [git-scm.com/downloads](https://git-scm.com/downloads)                                                                  |
| **Node.js** (LTS recommended, v18+) | API build, CLI helpers                                                                  | [nodejs.org/en/download](https://nodejs.org/en/download) · [nvm](https://github.com/nvm-sh/nvm)                         |
| **Docker** + **Compose**            | Postgres, Redis, and web UI containers                                                  | [docs.docker.com/get-docker](https://docs.docker.com/get-docker/)                                                       |
| **PM2**                             | Runs the deployer API locally; also runs preview instances on the host (default runner) | [pm2.keymetrics.io — Quick start](https://pm2.keymetrics.io/docs/usage/quick-start/) (`npm install -g pm2`)             |
| **nginx**                           | Reverse proxy for preview URLs (`/{project-slug}-{branch-slug}/`)                       | [nginx.org/en/download](https://nginx.org/en/download.html) · [Ubuntu/Debian](https://nginx.org/en/linux_packages.html) |

If PM2 is not installed globally, `deployer setup` falls back to `npx pm2` for the API only. For production preview deploys with the **PM2 runner**, install PM2 on the host.

nginx is required to serve preview URLs to browsers, but not to start the deployer stack itself. See [Configure nginx](docs/nginx.md).

### Install and start

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
4. Set the **Public URL** if you already know the domain where previews will be served (see [Configure nginx](docs/nginx.md))

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

## Documentation

| Topic             | Guide |
| ----------------- | ----- |
| Dashboard         | [docs/dashboard.md](docs/dashboard.md) |
| Instances & lifetime | [docs/instances.md](docs/instances.md) |
| Cluster (multi-machine) | [docs/cluster.md](docs/cluster.md) |
| Configure nginx   | [docs/nginx.md](docs/nginx.md) |
| Architecture      | [docs/architecture.md](docs/architecture.md) |
| Configuration     | [docs/configuration.md](docs/configuration.md) |
| CLI reference     | [docs/cli.md](docs/cli.md) |
| App config        | `examples/deployer.yaml` in each project repo |
| API reference     | http://localhost:3000/docs after `deployer setup` |

## License

Licensed under the [Apache License, Version 2.0](LICENSE).

Built for teams who want simple, self-hosted preview environments.
